// The history deck from Wikidata (T7, story O5): fetches dated events with Norwegian bokmål text,
// picks the best known, and writes them as SQL that replaces the cards of the "historie" deck.
//
// Candidates come from two places: events of chosen types (battles, treaties, wars and so on), and
// the most read articles on Norwegian Wikipedia the last two years that have a date (births, deaths,
// events). Only items with an article on Norwegian Wikipedia are used, and they are ranked by how
// often that article is read: well known here beats covered by many Wikipedias.
//
//   node api/history-import.ts                  fetch and write artifacts/history/ (git-ignored)
//   node api/history-import.ts --push           ... and load it into the hosted database (D1)
//   node api/history-import.ts --count 1500     another number of cards (default 1000)
//
// --push needs CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID, or `token` and `account` in .env.
// Loading replaces every card in the "historie" deck, edits made in the app included.
//
// Titles are Wikidata's bokmål labels and reveal lines its bokmål descriptions, as they are. An AI
// pass that rewrites and checks them is still to come (ADR 0006).

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { seedDecks } from './src/seed.ts'
import { sqlDump } from './src/sql-dump.ts'
import { cardsFromRows, pickCards, type Row } from './src/wikidata.ts'

const ENDPOINT = 'https://query.wikidata.org/sparql'
// Wikimedia asks scripts to say who they are.
const USER_AGENT = 'tidslinje-history-import/0.2 (https://github.com/Kilars/timeline-game)'
const NOWIKI = 'https://no.wikipedia.org/w/api.php'
const WRANGLER = 'wrangler@4.156.0'
const OUT = path.resolve('artifacts/history')

/**
 * Where cards come from. Each source is one query; one big query times out. `property` is the date:
 * P585 an event's own date, P577 publication, P571 founding, P619 launch. Other dates than P585 get
 * a title that says what happened.
 */
interface Source {
  type: string
  name: string
  property?: string
  template?: string
  minSitelinks: number
  /** Also take items of a subclass of the type (wars are civil wars, world wars and so on). */
  subclasses?: boolean
}

const events = (type: string, name: string): Source => ({ type, name, minSitelinks: 5 })

const SOURCES: Source[] = [
  events('Q178561', 'slag'),
  events('Q188055', 'beleiring'),
  events('Q2001676', 'militær offensiv'),
  events('Q2380335', 'luftangrep'),
  events('Q131569', 'traktat'),
  events('Q1072326', 'toppmøte'),
  events('Q3882219', 'attentat'),
  events('Q45382', 'statskupp'),
  events('Q10931', 'revolusjon'),
  events('Q273120', 'protest'),
  events('Q3199915', 'massakre'),
  events('Q2223653', 'terrorangrep'),
  events('Q7944', 'jordskjelv'),
  events('Q7692360', 'vulkanutbrudd'),
  events('Q8065', 'naturkatastrofe'),
  events('Q3839081', 'katastrofe'),
  events('Q168983', 'brann'),
  events('Q179057', 'eksplosjon'),
  events('Q744913', 'luftfartsulykke'),
  events('Q11822042', 'transportulykke'),
  events('Q210112', 'prøvesprengning'),
  events('Q861911', 'tale'),
  events('Q2334719', 'rettssak'),
  events('Q12890393', 'hendelse'),
  events('Q1190554', 'hendelse'),
  events('Q13418847', 'historisk hendelse'),
  events('Q1261499', 'sjøslag'),
  events('Q625298', 'fredsavtale'),
  events('Q645883', 'militær operasjon'),
  events('Q467011', 'invasjon'),
  events('Q124734', 'opprør'),
  events('Q124757', 'opptøyer'),
  events('Q511866', 'mytteri'),
  events('Q891854', 'bombing'),
  events('Q209715', 'kroning'),
  events('Q8068', 'flom'),
  events('Q8070', 'tsunami'),
  events('Q906512', 'forlis'),
  events('Q1078765', 'togulykke'),
  {
    type: 'Q484652',
    name: 'internasjonal organisasjon',
    property: 'P571',
    template: '{} blir grunnlagt',
    minSitelinks: 15,
  },
  { type: 'Q752783', name: 'bemannet romferd', property: 'P619', template: '{} skytes opp', minSitelinks: 30 },
  { type: 'Q198', name: 'krig', property: 'P580', template: '{} bryter ut', minSitelinks: 15, subclasses: true },
  { type: 'Q198', name: 'krig', property: 'P582', template: '{} tar slutt', minSitelinks: 15, subclasses: true },
]

/**
 * Dates looked up for the most read articles, with how the title is made. People must be covered by
 * many Wikipedias: the most read lists are full of people who were in the news lately, whose birth
 * year nobody knows.
 */
const POPULAR: { property: string; template?: string; humans?: boolean; minSitelinks: number }[] = [
  { property: 'P569', template: '{} blir født', humans: true, minSitelinks: 50 },
  { property: 'P570', template: '{} dør', humans: true, minSitelinks: 50 },
  { property: 'P585', minSitelinks: 0 },
]

/** How many months of most read lists to go through. */
const POPULAR_MONTHS = 24
/** Items per date query; larger batches run out of time on the query service. */
const POPULAR_BATCH = 150

const SELECT = `SELECT ?item ?label ?desc ?date ?prec ?cal ?links ?article WHERE {`

/** The part every query shares: the date, the bokmål text and the Norwegian article. */
function dated(property: string): string {
  return `?item wikibase:sitelinks ?links .
  ?item p:${property}/psv:${property} ?v .
  ?v wikibase:timeValue ?date ; wikibase:timePrecision ?prec ; wikibase:timeCalendarModel ?cal .
  ?item rdfs:label ?label . FILTER(lang(?label) = "nb")
  OPTIONAL { ?item schema:description ?desc . FILTER(lang(?desc) = "nb") }
  ?page schema:about ?item ; schema:isPartOf <https://no.wikipedia.org/> ; schema:name ?article .`
}

function query({ type, property = 'P585', minSitelinks, subclasses }: Source): string {
  return `${SELECT}
  ?item wdt:P31${subclasses ? '/wdt:P279?' : ''} wd:${type} .
  ${dated(property)}
  FILTER(?links >= ${minSitelinks})
}`
}

function popularQuery(items: readonly string[], property: string, humans: boolean, minSitelinks: number): string {
  return `${SELECT}
  VALUES ?item { ${items.map((qid) => `wd:${qid}`).join(' ')} }
  ${humans ? '?item wdt:P31 wd:Q5 .' : ''}
  ${dated(property)}
  FILTER(?links >= ${minSitelinks})
}`
}

interface Binding {
  [name: string]: { value: string } | undefined
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * GET a JSON resource, trying up to four times. When rate limited, waits as long as the server asks.
 * A body that does not parse counts as a failure: the query service cuts its answer off when a
 * query runs out of time.
 */
async function getJson<T>(url: string, accept = 'application/json'): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    let wait = 5_000 * attempt
    try {
      const response = await fetch(url, {
        headers: { Accept: accept, 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(90_000),
      })
      if (response.status === 429) wait = Math.max(wait, Number(response.headers.get('retry-after') ?? 30) * 1_000)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return (await response.json()) as T
    } catch (error) {
      if (attempt >= 4) throw error
      await sleep(wait)
    }
  }
}

/** Rows for a query, or none when it fails; `what` names it in the log. */
async function runQuery(
  sparql: string,
  what: string,
  meta: Pick<Row, 'type' | 'property' | 'template'>,
): Promise<Row[]> {
  let body: { results: { bindings: Binding[] } }
  try {
    body = await getJson(`${ENDPOINT}?${new URLSearchParams({ query: sparql })}`, 'application/sparql-results+json')
  } catch (error) {
    console.warn(`  ${what}: skipped, ${String(error)}`)
    return []
  }
  return body.results.bindings.flatMap((b) => {
    const item = b.item?.value
    const label = b.label?.value
    const date = b.date?.value
    if (!item || !label || !date) return []
    return [
      {
        item,
        label,
        description: b.desc?.value,
        date,
        precision: Number(b.prec?.value),
        calendar: b.cal?.value ?? '',
        sitelinks: Number(b.links?.value),
        type: meta.type,
        ...(meta.property ? { property: meta.property } : {}),
        ...(meta.template ? { template: meta.template } : {}),
        ...(b.article?.value ? { article: b.article.value } : {}),
      },
    ]
  })
}

interface PageQuery {
  continue?: Record<string, string>
  query?: {
    normalized?: { from: string; to: string }[]
    pages: {
      title: string
      missing?: boolean
      pageprops?: { wikibase_item?: string }
      pageviews?: Record<string, number | null>
    }[]
  }
}

/**
 * Norwegian Wikipedia's answer for some article titles, 50 at a time: their Wikidata item and how
 * often they were read the last 60 days. Keyed by the title as asked.
 */
const articleCache = new Map<string, { qid?: string; views: number }>()

async function articles(titles: readonly string[]): Promise<Map<string, { qid?: string; views: number }>> {
  const found = articleCache
  const todo = titles.filter((title) => !found.has(title))
  for (let i = 0; i < todo.length; i += 50) {
    const batch = todo.slice(i, i + 50)
    let next: Record<string, string> | undefined = {}
    while (next) {
      const params = new URLSearchParams({
        action: 'query',
        prop: 'pageprops|pageviews',
        ppprop: 'wikibase_item',
        titles: batch.join('|'),
        format: 'json',
        formatversion: '2',
        ...next,
      })
      const body: PageQuery = await getJson(`${NOWIKI}?${params}`)
      const asked = new Map((body.query?.normalized ?? []).map((n) => [n.to, n.from]))
      for (const page of body.query?.pages ?? []) {
        if (page.missing) continue
        const title = asked.get(page.title) ?? page.title
        const known = found.get(title) ?? { views: 0 }
        const qid = page.pageprops?.wikibase_item ?? known.qid
        const views = known.views + Object.values(page.pageviews ?? {}).reduce<number>((sum, n) => sum + (n ?? 0), 0)
        found.set(title, { ...(qid ? { qid } : {}), views })
      }
      next = body.continue
    }
    if (i % 1000 === 0 && i > 0) console.log(`  ${i} of ${todo.length} articles`)
  }
  return found
}

/** The most read articles on Norwegian Wikipedia, month by month, the last `months` months. */
async function mostRead(months: number): Promise<string[]> {
  const titles = new Set<string>()
  const now = new Date()
  for (let back = 1; back <= months; back++) {
    const month = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - back, 1))
    const yyyy = month.getUTCFullYear()
    const mm = String(month.getUTCMonth() + 1).padStart(2, '0')
    try {
      const body = await getJson<{ items: { articles: { article: string }[] }[] }>(
        `https://wikimedia.org/api/rest_v1/metrics/pageviews/top/no.wikipedia/all-access/${yyyy}/${mm}/all-days`,
      )
      for (const { article } of body.items[0]?.articles ?? []) {
        if (!article.includes(':') && article !== 'Forside') titles.add(article.replaceAll('_', ' '))
      }
    } catch (error) {
      console.warn(`  most read ${yyyy}-${mm}: skipped, ${String(error)}`)
    }
  }
  return [...titles]
}

function option(name: string, fallback: number): number {
  const index = process.argv.indexOf(name)
  if (index < 0) return fallback
  const value = Number(process.argv[index + 1])
  if (!Number.isInteger(value) || value < 1) throw new Error(`${name} needs a whole number`)
  return value
}

function cloudflareEnv(): NodeJS.ProcessEnv {
  if (existsSync('.env')) process.loadEnvFile('.env')
  const token = process.env.CLOUDFLARE_API_TOKEN ?? process.env.token
  const account = process.env.CLOUDFLARE_ACCOUNT_ID ?? process.env.account
  if (!token || !account) throw new Error('--push needs CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID')
  return {
    ...process.env,
    CLOUDFLARE_API_TOKEN: token,
    CLOUDFLARE_ACCOUNT_ID: account,
    WRANGLER_SEND_METRICS: 'false',
    CI: '1',
  }
}

const count = option('--count', 1000)
const perType = option('--per-type', Math.ceil(count * 0.15))

const rows: Row[] = []
for (const source of SOURCES) {
  const found = await runQuery(query(source), `${source.type} (${source.name})`, source)
  console.log(`  ${source.type} (${source.name}${source.property ? ` ${source.property}` : ''}): ${found.length} rows`)
  rows.push(...found)
  // Be gentle with the public query service.
  await sleep(1_000)
}

const popular = await mostRead(POPULAR_MONTHS)
const popularItems = [...new Set([...(await articles(popular)).values()].flatMap(({ qid }) => (qid ? [qid] : [])))]
console.log(`  most read: ${popular.length} articles, ${popularItems.length} with a Wikidata item`)
for (const { property, template, humans = false, minSitelinks } of POPULAR) {
  let found = 0
  for (let i = 0; i < popularItems.length; i += POPULAR_BATCH) {
    const batch = await runQuery(
      popularQuery(popularItems.slice(i, i + POPULAR_BATCH), property, humans, minSitelinks),
      `most read ${property}`,
      {
        type: `most read ${property}`,
        // An event's own date gives no template and keeps the plain item id.
        ...(template ? { property, template } : {}),
      },
    )
    rows.push(...batch)
    found += batch.length
    await sleep(1_000)
  }
  console.log(`  most read ${property}: ${found} rows`)
}

const candidates = withoutSameYearEnds(cardsFromRows(rows))
const views = await articles([...new Set(candidates.flatMap((card) => (card.article ? [card.article] : [])))])
for (const card of candidates) card.views = card.article ? (views.get(card.article)?.views ?? 0) : 0
const cards = pickCards(candidates, count, perType)
console.log(`${rows.length} rows, ${candidates.length} usable cards, ${cards.length} picked`)

await mkdir(OUT, { recursive: true })
await writeFile(path.join(OUT, 'cards.json'), `${JSON.stringify(cards, null, 2)}\n`)
const db = sqlDump()
await seedDecks(db, [
  {
    id: 'historie',
    name: 'Historie',
    kind: 'history',
    visibility: 'public',
    cards: cards.map(({ id, title, reveal, year, month, day, source }) => ({
      id,
      title,
      reveal,
      year,
      month,
      day,
      source,
    })),
  },
])
const sqlFile = path.join(OUT, 'history.sql')
await writeFile(sqlFile, db.text())
console.log(`Wrote ${path.relative(process.cwd(), OUT)}/cards.json and history.sql`)

if (process.argv.includes('--push')) {
  const result = spawnSync('npx', ['-y', WRANGLER, 'd1', 'execute', 'tidslinje', '--remote', '--file', sqlFile], {
    stdio: 'inherit',
    env: cloudflareEnv(),
  })
  if (result.status !== 0) throw new Error('Loading into D1 failed')
  console.log(`Loaded ${cards.length} cards into the hosted "historie" deck`)
}
