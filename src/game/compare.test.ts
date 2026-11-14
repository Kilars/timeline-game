import { describe, expect, test } from 'vitest'
import { compareCards, correctGapsFor } from './compare.ts'
import { card } from './test-helpers.ts'
import type { Precision } from './types.ts'

const precisions: Precision[] = ['year', 'month', 'day']

describe('compareCards', () => {
  test.each(precisions)('orders cards with different years under %s judging', (precision) => {
    expect(compareCards(card('a', 1814), card('b', 1905), precision)).toBe(-1)
    expect(compareCards(card('a', 1905), card('b', 1814), precision)).toBe(1)
    expect(compareCards(card('a', 1814, 5, 17), card('b', 1905, 6, 7), precision)).toBe(-1)
    // An earlier year wins even when its month and day are later.
    expect(compareCards(card('a', 1814, 12, 31), card('b', 1905, 1, 1), precision)).toBe(-1)
  })

  test.each(precisions)('orders years before year 1 under %s judging', (precision) => {
    expect(compareCards(card('a', -753), card('b', -44), precision)).toBe(-1)
    expect(compareCards(card('a', -44), card('b', -753), precision)).toBe(1)
    expect(compareCards(card('a', -44), card('b', 476), precision)).toBe(-1)
    expect(compareCards(card('a', -1), card('b', 1), precision)).toBe(-1)
    expect(compareCards(card('a', -44), card('b', -44), precision)).toBe(0)
  })

  test('months and days run forward inside a year before year 1', () => {
    expect(compareCards(card('a', -44, 3, 15), card('b', -44, 1, 1), 'day')).toBe(1)
    expect(compareCards(card('a', -44, 3, 15), card('b', -44, 3, 16), 'day')).toBe(-1)
  })

  test('year judging ignores month and day even when both cards have them', () => {
    expect(compareCards(card('a', 2000, 1, 1), card('b', 2000, 12, 31), 'year')).toBe(0)
    expect(compareCards(card('a', 2000, 12, 31), card('b', 2000, 1, 1), 'year')).toBe(0)
  })

  test('month judging compares months and ignores days', () => {
    expect(compareCards(card('a', 2000, 5, 30), card('b', 2000, 6, 1), 'month')).toBe(-1)
    expect(compareCards(card('a', 2000, 6, 1), card('b', 2000, 5, 30), 'month')).toBe(1)
    expect(compareCards(card('a', 2000, 6, 1), card('b', 2000, 6, 30), 'month')).toBe(0)
  })

  test('day judging compares the whole date', () => {
    expect(compareCards(card('a', 2000, 6, 15), card('b', 2000, 6, 16), 'day')).toBe(-1)
    expect(compareCards(card('a', 2000, 6, 16), card('b', 2000, 6, 15), 'day')).toBe(1)
    expect(compareCards(card('a', 2000, 5, 31), card('b', 2000, 6, 1), 'day')).toBe(-1)
    expect(compareCards(card('a', 2000, 6, 15), card('b', 2000, 6, 15), 'day')).toBe(0)
  })

  describe('a year-only card against a card with a full date', () => {
    const yearOnly = card('y', 2000)
    const fullDate = card('d', 2000, 6, 15)

    test.each(precisions)('ties in the same year under %s judging', (precision) => {
      expect(compareCards(yearOnly, fullDate, precision)).toBe(0)
      expect(compareCards(fullDate, yearOnly, precision)).toBe(0)
    })

    test.each(precisions)('is ordered by year under %s judging', (precision) => {
      expect(compareCards(card('y', 1999), fullDate, precision)).toBe(-1)
      expect(compareCards(fullDate, card('y', 1999), precision)).toBe(1)
      expect(compareCards(card('y', 2001), fullDate, precision)).toBe(1)
    })
  })

  describe('a month-only card against a card with a full date', () => {
    const fullDate = card('d', 2000, 6, 15)

    test('ties in the same month under day judging, which falls back to month', () => {
      expect(compareCards(card('m', 2000, 6), fullDate, 'day')).toBe(0)
      expect(compareCards(fullDate, card('m', 2000, 6), 'day')).toBe(0)
    })

    test('is ordered by month under month and day judging', () => {
      expect(compareCards(card('m', 2000, 5), fullDate, 'month')).toBe(-1)
      expect(compareCards(card('m', 2000, 5), fullDate, 'day')).toBe(-1)
      expect(compareCards(card('m', 2000, 7), fullDate, 'day')).toBe(1)
    })

    test('ties in the same year under year judging', () => {
      expect(compareCards(card('m', 2000, 5), fullDate, 'year')).toBe(0)
    })
  })

  test('a year-only card ties with a month-only card of the same year', () => {
    expect(compareCards(card('y', 2000), card('m', 2000, 6), 'month')).toBe(0)
    expect(compareCards(card('y', 2000), card('m', 2000, 6), 'day')).toBe(0)
  })
})

describe('correctGapsFor', () => {
  const timeline = [card('a', 1814), card('b', 1905), card('c', 1945)]

  test('an empty timeline has one gap and it is correct', () => {
    expect(correctGapsFor([], card('x', 1900), 'year')).toEqual([0])
  })

  test('gap 0 is before the first card and gap n is after the last of n cards', () => {
    expect(correctGapsFor(timeline, card('x', 1066), 'year')).toEqual([0])
    expect(correctGapsFor(timeline, card('x', 1850), 'year')).toEqual([1])
    expect(correctGapsFor(timeline, card('x', 1920), 'year')).toEqual([2])
    expect(correctGapsFor(timeline, card('x', 1969), 'year')).toEqual([3])
  })

  test('a tie is correct on either side of the other card', () => {
    expect(correctGapsFor(timeline, card('x', 1814), 'year')).toEqual([0, 1])
    expect(correctGapsFor(timeline, card('x', 1905), 'year')).toEqual([1, 2])
    expect(correctGapsFor(timeline, card('x', 1945), 'year')).toEqual([2, 3])
  })

  test('a tie with several equal cards is correct before, between and after them', () => {
    const equal = [card('a', 1900), card('b', 1950), card('c', 1950), card('d', 2000)]
    expect(correctGapsFor(equal, card('x', 1950), 'year')).toEqual([1, 2, 3])
  })

  test('works with years before year 1', () => {
    const ancient = [card('a', -753), card('b', -44), card('c', 476)]
    expect(correctGapsFor(ancient, card('x', -3000), 'year')).toEqual([0])
    expect(correctGapsFor(ancient, card('x', -490), 'year')).toEqual([1])
    expect(correctGapsFor(ancient, card('x', 1), 'year')).toEqual([2])
    expect(correctGapsFor(ancient, card('x', -44), 'year')).toEqual([1, 2])
  })

  test('the same cards give more correct gaps under coarser judging', () => {
    const year = [card('a', 2000, 3, 10), card('b', 2000, 3, 20), card('c', 2000, 9, 1)]
    const drawn = card('x', 2000, 3, 15)
    expect(correctGapsFor(year, drawn, 'day')).toEqual([1])
    expect(correctGapsFor(year, drawn, 'month')).toEqual([0, 1, 2])
    expect(correctGapsFor(year, drawn, 'year')).toEqual([0, 1, 2, 3])
  })

  test('judges against every card, not only the two neighbours', () => {
    // Under day judging the year-only card ties with both others, so it may stand after March.
    const mixed = [card('march', 2000, 3), card('year', 2000)]
    const january = card('january', 2000, 1)
    // After the year-only card the only neighbour is a tie, but March is then before January.
    expect(compareCards(january, card('year', 2000), 'day')).toBe(0)
    expect(correctGapsFor(mixed, january, 'day')).toEqual([0])

    // The mirror case: the only correct gap is the last one.
    const mirrored = [card('year', 2000), card('march', 2000, 3)]
    expect(correctGapsFor(mirrored, card('may', 2000, 5), 'day')).toEqual([2])
  })

  test('returns no gap for a timeline that is out of order around the card', () => {
    // Cannot happen in a game, where only correct placements stay on the timeline.
    expect(correctGapsFor([card('a', 2000), card('b', 1000)], card('x', 1500), 'year')).toEqual([])
  })
})

describe('null month or day', () => {
  test('counts as absent, so the comparison falls back to a tie', () => {
    const yearOnly = { ...card('a', 1990), month: null } as unknown as ReturnType<typeof card>
    const monthOnly = { ...card('b', 1990, 5), day: null } as unknown as ReturnType<typeof card>
    const precisions: Precision[] = ['year', 'month', 'day']
    for (const precision of precisions) {
      expect(compareCards(yearOnly, card('c', 1990, 3, 1), precision)).toBe(0)
      expect(compareCards(card('c', 1990, 3, 1), yearOnly, precision)).toBe(0)
    }
    expect(compareCards(monthOnly, card('d', 1990, 5, 20), 'day')).toBe(0)
    expect(compareCards(monthOnly, card('e', 1990, 6, 1), 'day')).toBe(-1)
  })
})
