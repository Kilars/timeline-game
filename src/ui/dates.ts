// How dates are written on screen. A date is never shown more precisely than the judging precision,
// because a line judged by year may hold two cards from the same year in either order.

import type { Card, Precision } from '../game/index.ts'

const MONTHS = [
  'januar',
  'februar',
  'mars',
  'april',
  'mai',
  'juni',
  'juli',
  'august',
  'september',
  'oktober',
  'november',
  'desember',
] as const

const BEFORE_YEAR_ONE = 'f.Kr.'

export interface DateParts {
  /** The year without sign, for example "44". */
  year: string
  /** "f.Kr." for years before year 1, otherwise null. */
  era: string | null
  /** The day and month, or the month alone, when the precision asks for it and the card has it. */
  rest: string | null
}

/** The pieces of a card's date at the judging precision. */
export function dateParts(card: Card, precision: Precision): DateParts {
  const month = card.month == null ? undefined : MONTHS[card.month - 1]
  let rest: string | null = null
  if (precision !== 'year' && month) {
    rest = precision === 'day' && card.day != null ? `${card.day}. ${month}` : month
  }
  return {
    year: String(Math.abs(card.year)),
    era: card.year < 0 ? BEFORE_YEAR_ONE : null,
    rest,
  }
}

/** The year with its era: "1814" or "44 f.Kr.". */
export function yearText(card: Card): string {
  const { year, era } = dateParts(card, 'year')
  return era ? `${year} ${era}` : year
}

/** The whole date at the judging precision: "1814", "mai 1814", "17. mai 1814", "15. mars 44 f.Kr.". */
export function dateText(card: Card, precision: Precision): string {
  const { rest } = dateParts(card, precision)
  return rest ? `${rest} ${yearText(card)}` : yearText(card)
}

/** The date as the end of a sentence about when something happened: "i 1814", "i mai 1814", "17. mai 1814". */
export function whenText(card: Card, precision: Precision): string {
  const text = dateText(card, precision)
  return /^\d+\. /.test(text) ? text : `i ${text}`
}

/**
 * Where a gap is, in words: "før 1814", "mellom 1814 og 1905", "etter 1998".
 * Gap 0 is before the first card, gap n after the last of the n cards.
 */
export function gapText(cards: readonly Card[], gap: number, precision: Precision): string {
  const before = cards[gap - 1]
  const after = cards[gap]
  if (before && after) return `mellom ${dateText(before, precision)} og ${dateText(after, precision)}`
  if (after) return `før ${dateText(after, precision)}`
  if (before) return `etter ${dateText(before, precision)}`
  return 'først'
}

/** The same place in as few characters as possible: "før 1814", "1814–1905", "etter 1998". */
export function gapShortText(cards: readonly Card[], gap: number, precision: Precision): string {
  const before = cards[gap - 1]
  const after = cards[gap]
  if (before && after) return `${dateText(before, precision)}–${dateText(after, precision)}`
  return gapText(cards, gap, precision)
}
