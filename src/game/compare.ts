import type { Card, Precision } from './types.ts'

/**
 * Compares two cards at the judging precision: -1 when `a` is earlier, 1 when it is later, 0 for a tie.
 * When either card lacks that precision the comparison stops at the most precise level both have.
 * A null month or day (as a database row may carry) counts as absent.
 */
export function compareCards(a: Card, b: Card, precision: Precision): -1 | 0 | 1 {
  if (a.year !== b.year) return a.year < b.year ? -1 : 1
  if (precision === 'year' || a.month == null || b.month == null) return 0
  if (a.month !== b.month) return a.month < b.month ? -1 : 1
  if (precision === 'month' || a.day == null || b.day == null) return 0
  if (a.day !== b.day) return a.day < b.day ? -1 : 1
  return 0
}

/**
 * The gaps where `card` can be placed correctly on `timeline` (oldest first).
 * Gap 0 is before the first card, gap n is after the last of n cards.
 * A gap is correct when the card is not earlier than any card before it and not later than any card
 * after it. Every card on the timeline is checked, not only the two neighbours.
 */
export function correctGapsFor(
  timeline: readonly Card[],
  card: Card,
  precision: Precision,
): number[] {
  const order = timeline.map((other) => compareCards(card, other, precision))
  const gaps: number[] = []
  for (let gap = 0; gap <= timeline.length; gap++) {
    const before = order.slice(0, gap)
    const after = order.slice(gap)
    if (before.every((o) => o >= 0) && after.every((o) => o <= 0)) gaps.push(gap)
  }
  return gaps
}
