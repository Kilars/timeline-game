// The history deck from Wikidata (T7, story O5): fetches dated events with Norwegian bokmål text,
// picks the best known, and writes them as SQL that replaces the cards of the "historie" deck.
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
const USER_AGENT = 'tidslinje-history-import/0.1'
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
  { type: 'Q484652', name: 'internasjonal organisasjon', property: 'P571', template: '{} blir grunnlagt', minSitelinks: 15 },
  { type: 'Q752783', name: 'bemannet romferd', property: 'P619', template: '{} skytes opp', minSitelinks: 30 },
]

function query({ type, property = 'P585', minSitelinks }: Source): string {
  return `SELECT ?item ?label ?desc ?date ?prec ?cal ?links WHERE {
  ?item wdt:P31 wd:${type} .
  ?item wikibase:sitelinks ?links . FILTER(?links >= ${minSitelinks})
  ?item p:${property}/psv:${property} ?v .
  ?v wikibase:timeValue ?date ; wikibase:timePrecision ?prec ; wikibase:timeCalendarModel ?cal .
  ?item rdfs:label ?label . FILTER(lang(?label) = "nb")
  OPTIONAL { ?item schema:description ?desc . FILTER(lang(?desc) = "nb") }
}`
}

interface Binding {
  [name: string]: { value: string } | undefined
}

async function fetchSource(source: Source): Promise<Row[]> {
  const url = `${ENDPOINT}?${new URLSearchParams({ query: query(source) })}`
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { Accept: 'application/sparql-results+json', 'User-Agent': USER_AGENT },
        signal: AbortSignal.timeout(90_000),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const body = (await response.json()) as { results: { bindings: Binding[] } }
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
            type: source.type,
            ...(source.property ? { property: source.property } : {}),
            ...(source.template ? { template: source.template } : {}),
          },
        ]
      })
    } catch (error) {
      if (attempt >= 2) {
        console.warn(`  ${source.type} (${source.name}): skipped, ${String(error)}`)
        return []
      }
      await new Promise((resolve) => setTimeout(resolve, 5_000))
    }
  }
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
  return { ...process.env, CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: account, WRANGLER_SEND_METRICS: 'false', CI: '1' }
}

const count = option('--count', 1000)
const perType = option('--per-type', Math.ceil(count * 0.25))

const rows: Row[] = []
for (const source of SOURCES) {
  const found = await fetchSource(source)
  console.log(`  ${source.type} (${source.name}): ${found.length} rows`)
  rows.push(...found)
  // Be gentle with the public query service.
  await new Promise((resolve) => setTimeout(resolve, 1_000))
}

const candidates = cardsFromRows(rows)
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
    cards: cards.map(({ id, title, reveal, year, month, day, source }) => ({ id, title, reveal, year, month, day, source })),
  },
])
const sqlFile = path.join(OUT, 'history.sql')
await writeFile(sqlFile, db.text())
console.log(`Wrote ${path.relative(process.cwd(), OUT)}/cards.json and history.sql`)

if (process.argv.includes('--push')) {
  const result = spawnSync(
    'npx',
    ['-y', WRANGLER, 'd1', 'execute', 'tidslinje', '--remote', '--file', sqlFile],
    { stdio: 'inherit', env: cloudflareEnv() },
  )
  if (result.status !== 0) throw new Error('Loading into D1 failed')
  console.log(`Loaded ${cards.length} cards into the hosted "historie" deck`)
}
