// Turning Wikidata query results into history cards (T7, ADR 0006). Pure functions; the fetching
// and loading are in api/history-import.ts.
//
// Dates from the query service need care:
// - Years before 1 come in astronomical numbering (year 0 is 1 BCE), while the game counts with no
//   year 0 (ADR 0005). "-0489" is 490 BCE.
// - Dates in the Julian calendar come converted to the Gregorian one (Hastings shows as 20 October,
//   not 14 October). Only their year is kept, and a date so early in January that the conversion may
//   have moved the year is dropped.
// - An item can have several dates. Kept only as precise as they agree.

export const JULIAN = 'http://www.wikidata.org/entity/Q1985786'

/** One row from the query: an item and one of its dates. */
export interface Row {
  item: string
  label: string
  description?: string
  /** `wikibase:timeValue`, such as "1815-06-18T00:00:00Z" or "-0489-09-07T00:00:00Z". */
  date: string
  /** `wikibase:timePrecision`: 9 year, 10 month, 11 day. */
  precision: number
  calendar: string
  /** How many Wikipedias have an article about it. */
  sitelinks: number
  /** The title of its article on Norwegian (bokmål) Wikipedia, when it has one. */
  article?: string
  /** The event type it was found under. */
  type: string
  /**
   * The date property, when it is not the event's own date (P585): P569 for a birth, P571 for a
   * founding and so on. The same item can then give more than one card.
   */
  property?: string
  /** How the title is made from the label, with `{}` for the label: "{} blir født". */
  template?: string
}

export interface HistoryDate {
  year: number
  month?: number
  day?: number
}

export interface HistoryCard extends HistoryDate {
  id: string
  title: string
  /** Shown on the card while it is placed. Never gives the date away. */
  description?: string
  reveal?: string
  source: string
  sitelinks: number
  type: string
  article?: string
  /** Views of its Norwegian Wikipedia article lately: how well known it is here. */
  views?: number
}

/** The longest title the editor allows. */
export const MAX_TITLE = 60
/** Longer descriptions are left out rather than cut. */
export const MAX_REVEAL = 200

/** One date as the game stores it, or null when it cannot be trusted at year precision. */
export function parseDate(value: string, precision: number, calendar: string): HistoryDate | null {
  const match = /^(-?)(\d+)-(\d\d)-(\d\d)T/.exec(value)
  if (!match || precision < 9) return null
  const astronomical = (match[1] ? -1 : 1) * Number(match[2])
  const year = astronomical <= 0 ? astronomical - 1 : astronomical
  const month = Number(match[3])
  const day = Number(match[4])
  if (calendar === JULIAN) {
    // Converted to Gregorian: the month and day are not the ones in the history books, and early
    // January may belong to the year before.
    if (precision >= 10 && month === 1 && day <= 14) return null
    return { year }
  }
  if (precision === 9) return { year }
  if (precision === 10) return { year, month }
  return { year, month, day }
}

/** What several dates for the same item agree on, or null when they do not agree on the year. */
export function agreedDate(dates: readonly HistoryDate[]): HistoryDate | null {
  const [first, ...rest] = dates
  if (!first) return null
  if (rest.some((date) => date.year !== first.year)) return null
  const sameMonth = rest.every((date) => date.month === first.month)
  const sameDay = sameMonth && rest.every((date) => date.day === first.day)
  if (!sameMonth || first.month === undefined) return { year: first.year }
  if (!sameDay || first.day === undefined) return { year: first.year, month: first.month }
  return { ...first }
}

const MONTHS = 'januar|februar|mars|april|mai|juni|juli|august|september|oktober|november|desember'

/**
 * A title that gives the date away: a number of three or four digits, a century or era, or a day
 * and month ("4. mai-bevegelsen").
 */
export function revealsDate(title: string): boolean {
  return /\d{3,4}|århundre|f\.\s?Kr|e\.\s?Kr/i.test(title) || new RegExp(`\\d{1,2}\\.\\s*(${MONTHS})`, 'i').test(title)
}

function capitalise(text: string): string {
  return text.charAt(0).toLocaleUpperCase('nb') + text.slice(1)
}

/** The cards the rows give: one per item, with dates checked and titles that hide the year. */
export function cardsFromRows(rows: readonly Row[]): HistoryCard[] {
  const byItem = new Map<string, Row[]>()
  for (const row of rows) {
    const key = `${row.item}|${row.property ?? ''}`
    byItem.set(key, [...(byItem.get(key) ?? []), row])
  }

  const cards: HistoryCard[] = []
  for (const itemRows of byItem.values()) {
    const [row] = itemRows
    if (!row) continue
    const item = row.item
    const dates = itemRows.map((r) => parseDate(r.date, r.precision, r.calendar))
    if (dates.some((date) => date === null)) continue
    const date = agreedDate(dates as HistoryDate[])
    if (!date) continue

    const label = row.label.trim()
    const title = capitalise(row.template ? row.template.replace('{}', label) : label)
    if (label.length === 0 || title.length > MAX_TITLE || revealsDate(title)) continue
    const description = row.description?.trim()
    const reveal =
      description && description.length <= MAX_REVEAL && description.toLowerCase() !== title.toLowerCase()
        ? capitalise(description)
        : undefined
    const qid = item.split('/').pop() ?? item
    cards.push({
      id: row.property ? `wd-${qid}-${row.property}` : `wd-${qid}`,
      title,
      ...(reveal ? { reveal } : {}),
      ...date,
      source: `https://www.wikidata.org/wiki/${qid}`,
      sitelinks: Math.max(...itemRows.map((r) => r.sitelinks)),
      type: row.type,
      ...(row.article ? { article: row.article } : {}),
    })
  }
  return cards
}

/** Hand curation, by card id: clearer titles, cards to leave out and dates that Wikidata has wrong. */
export interface Curation {
  titles: Record<string, string>
  drop: Record<string, string>
  dates?: Record<string, HistoryDate>
}

/**
 * The cards with the curation applied, and without space shuttle flights named by code ("STS-9
 * skytes opp"), which play badly.
 */
export function curate(cards: readonly HistoryCard[], curation: Curation): HistoryCard[] {
  return cards.flatMap((card) => {
    if (curation.drop[card.id] !== undefined) return []
    const title = curation.titles[card.id] ?? card.title
    if (/^STS-/.test(title)) return []
    const date = curation.dates?.[card.id]
    if (!date) return [{ ...card, title }]
    const dated: HistoryCard = { ...card, title, ...date }
    if (date.month === undefined) delete dated.month
    if (date.day === undefined) delete dated.day
    return [dated]
  })
}

/**
 * The cards that have a description, with it set, and the cards left out for having none. A card
 * with a description loses its reveal line: Wikidata's short descriptions say less than ours.
 */
export function withDescriptions(
  cards: readonly HistoryCard[],
  descriptions: Readonly<Record<string, string>>,
): { described: HistoryCard[]; undescribed: HistoryCard[] } {
  const described: HistoryCard[] = []
  const undescribed: HistoryCard[] = []
  for (const card of cards) {
    const description = card.description ?? descriptions[card.id]
    if (!description) {
      undescribed.push(card)
      continue
    }
    const next: HistoryCard = { ...card, description }
    delete next.reveal
    described.push(next)
  }
  return { described, undescribed }
}

/**
 * A card written by hand: an invention, a work, an achievement or an event, checked against
 * Wikipedia and Wikidata.
 */
export interface Milestone {
  /** The Wikidata item. */
  qid: string
  /** The date property that was checked and agrees with `date`, when there is one. */
  property?: string
  /** "1969-07-20", "1969-07", "1969" or "-753" (753 BCE, no year 0). */
  date: string
  type: string
  title: string
  description: string
  /** The title of its article on Norwegian (bokmål) Wikipedia. */
  article?: string
}

/** A date written as "1969-07-20", "1969-07", "1969" or "-753". */
export function readDate(text: string): HistoryDate {
  const match = /^(-?\d+)(?:-(\d\d?))?(?:-(\d\d?))?$/.exec(text)
  if (!match) throw new Error(`Not a date: ${text}`)
  const year = Number(match[1])
  if (year === 0) throw new Error(`There is no year 0: ${text}`)
  return {
    year,
    ...(match[2] ? { month: Number(match[2]) } : {}),
    ...(match[3] ? { day: Number(match[3]) } : {}),
  }
}

/**
 * Hand-written cards as history cards. The id is `wd-QID-PROP` when a date property was checked,
 * else `wd-QID`, with "-2", "-3" and so on when an item gives more than one card.
 */
export function milestoneCards(milestones: readonly Milestone[]): HistoryCard[] {
  const used = new Set<string>()
  return milestones.map((m) => {
    const base = m.property ? `wd-${m.qid}-${m.property}` : `wd-${m.qid}`
    let id = base
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`
    used.add(id)
    return {
      id,
      title: m.title,
      description: m.description,
      ...readDate(m.date),
      source: `https://www.wikidata.org/wiki/${m.qid}`,
      sitelinks: 0,
      type: m.type,
      ...(m.article ? { article: m.article } : {}),
    }
  })
}

/**
 * The Wikidata cards and the hand-written ones together. A hand-written card wins over a Wikidata
 * card with the same id.
 */
export function withMilestones(cards: readonly HistoryCard[], milestones: readonly HistoryCard[]): HistoryCard[] {
  const ids = new Set(milestones.map((m) => m.id))
  return [...cards.filter((card) => !ids.has(card.id)), ...milestones]
}

/**
 * Cards without the end of a war that ended the year it began: the two cards would show the same
 * year, and the start says it all. Ends are the cards made from P582, starts from P580.
 */
export function withoutSameYearEnds(cards: readonly HistoryCard[]): HistoryCard[] {
  const starts = new Map(cards.filter((c) => c.id.endsWith('-P580')).map((c) => [c.id.slice(0, -5), c.year]))
  return cards.filter((c) => !(c.id.endsWith('-P582') && starts.get(c.id.slice(0, -5)) === c.year))
}

/**
 * The best known cards, at most `count`, with at most `perType` of one type so the deck is not all
 * battles. Best known means most read on Norwegian Wikipedia, then covered by the most Wikipedias.
 * Titles that two cards share are kept once, for the better known card, so a player never sees two
 * cards that look the same.
 */
export function pickCards(cards: readonly HistoryCard[], count: number, perType: number): HistoryCard[] {
  const sorted = [...cards].sort(
    (a, b) => (b.views ?? 0) - (a.views ?? 0) || b.sitelinks - a.sitelinks || a.id.localeCompare(b.id),
  )
  const titles = new Set<string>()
  const ids = new Set<string>()
  const perTypeCount = new Map<string, number>()
  const picked: HistoryCard[] = []
  for (const card of sorted) {
    if (picked.length >= count) break
    const key = card.title.toLocaleLowerCase('nb')
    if (titles.has(key) || ids.has(card.id)) continue
    // A title shared with a better known card is dropped even if that card was capped.
    titles.add(key)
    const used = perTypeCount.get(card.type) ?? 0
    if (used >= perType) continue
    perTypeCount.set(card.type, used + 1)
    ids.add(card.id)
    picked.push(card)
  }
  return picked
}
