import { describe, expect, it } from 'vitest'
import type { Card } from '../game/index.ts'
import { dateParts, dateText, gapShortText, gapText, whenText, yearText } from './dates.ts'

function card(year: number, month?: number, day?: number): Card {
  const result: Card = { id: `c${year}`, title: 'x', year, pool: 'history' }
  if (month !== undefined) result.month = month
  if (day !== undefined) result.day = day
  return result
}

describe('dateText', () => {
  const constitution = card(1814, 5, 17)

  it('shows only the year when judging by year', () => {
    expect(dateText(constitution, 'year')).toBe('1814')
  })

  it('adds the month when judging by month', () => {
    expect(dateText(constitution, 'month')).toBe('mai 1814')
  })

  it('adds the day when judging by day', () => {
    expect(dateText(constitution, 'day')).toBe('17. mai 1814')
  })

  it('shows what the card has when it is less precise than the judging', () => {
    expect(dateText(card(1969, 7), 'day')).toBe('juli 1969')
    expect(dateText(card(1349), 'day')).toBe('1349')
    expect(dateText(card(1349), 'month')).toBe('1349')
  })

  it('treats a null month or day from a database row as absent', () => {
    const row = { ...card(1905), month: null, day: null } as unknown as Card
    expect(dateText(row, 'day')).toBe('1905')
  })

  it('writes years before year 1 with f.Kr. and no minus sign', () => {
    expect(dateText(card(-44, 3, 15), 'year')).toBe('44 f.Kr.')
    expect(dateText(card(-44, 3, 15), 'day')).toBe('15. mars 44 f.Kr.')
    expect(yearText(card(-490))).toBe('490 f.Kr.')
  })

  it('names all twelve months', () => {
    const names = Array.from({ length: 12 }, (_, i) => dateText(card(2000, i + 1), 'month'))
    expect(names[0]).toBe('januar 2000')
    expect(names[11]).toBe('desember 2000')
    expect(new Set(names).size).toBe(12)
  })
})

describe('dateParts', () => {
  it('splits year, era and the rest', () => {
    expect(dateParts(card(-44, 3, 15), 'day')).toEqual({ year: '44', era: 'f.Kr.', rest: '15. mars' })
    expect(dateParts(card(2007, 6, 29), 'month')).toEqual({ year: '2007', era: null, rest: 'juni' })
    expect(dateParts(card(2007, 6, 29), 'year')).toEqual({ year: '2007', era: null, rest: null })
  })
})

describe('whenText', () => {
  it('says "i" before a year or a month, and nothing before a day', () => {
    expect(whenText(card(2007, 6, 29), 'year')).toBe('i 2007')
    expect(whenText(card(2007, 6, 29), 'month')).toBe('i juni 2007')
    expect(whenText(card(2007, 6, 29), 'day')).toBe('29. juni 2007')
    expect(whenText(card(-490), 'year')).toBe('i 490 f.Kr.')
  })
})

describe('gapText', () => {
  const line = [card(-44), card(1814, 5, 17), card(1905, 6, 7)]

  it('names the gap before the first card', () => {
    expect(gapText(line, 0, 'year')).toBe('før 44 f.Kr.')
  })

  it('names a gap between two cards', () => {
    expect(gapText(line, 2, 'year')).toBe('mellom 1814 og 1905')
    expect(gapText(line, 2, 'day')).toBe('mellom 17. mai 1814 og 7. juni 1905')
  })

  it('names the gap after the last card', () => {
    expect(gapText(line, 3, 'year')).toBe('etter 1905')
  })

  it('has a short form for the gap between two cards', () => {
    expect(gapShortText(line, 2, 'year')).toBe('1814–1905')
    expect(gapShortText(line, 0, 'year')).toBe('før 44 f.Kr.')
    expect(gapShortText(line, 3, 'year')).toBe('etter 1905')
  })
})
