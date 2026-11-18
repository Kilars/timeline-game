import { describe, expect, it } from 'vitest'
import {
  JULIAN,
  agreedDate,
  cardsFromRows,
  curate,
  milestoneCards,
  readDate,
  withDescriptions,
  withMilestones,
  parseDate,
  pickCards,
  revealsDate,
  withoutSameYearEnds,
  type Row,
} from './wikidata.ts'

const GREGORIAN = 'http://www.wikidata.org/entity/Q1985727'

function row(overrides: Partial<Row>): Row {
  return {
    item: 'http://www.wikidata.org/entity/Q48314',
    label: 'Slaget ved Waterloo',
    description: 'Napoleons siste nederlag',
    date: '1815-06-18T00:00:00Z',
    precision: 11,
    calendar: GREGORIAN,
    sitelinks: 95,
    type: 'Q178561',
    ...overrides,
  }
}

describe('parseDate', () => {
  it('keeps a Gregorian date as precise as it is', () => {
    expect(parseDate('1815-06-18T00:00:00Z', 11, GREGORIAN)).toEqual({ year: 1815, month: 6, day: 18 })
    expect(parseDate('1815-06-01T00:00:00Z', 10, GREGORIAN)).toEqual({ year: 1815, month: 6 })
    expect(parseDate('1943-01-01T00:00:00Z', 9, GREGORIAN)).toEqual({ year: 1943 })
  })

  it('turns astronomical years before 1 into years with no year 0', () => {
    expect(parseDate('-0489-09-07T00:00:00Z', 9, GREGORIAN)).toEqual({ year: -490 })
    expect(parseDate('0000-01-01T00:00:00Z', 9, GREGORIAN)).toEqual({ year: -1 })
    expect(parseDate('0001-01-01T00:00:00Z', 9, GREGORIAN)).toEqual({ year: 1 })
  })

  it('keeps only the year of a Julian date, and drops one the conversion may have moved', () => {
    expect(parseDate('1066-10-20T00:00:00Z', 11, JULIAN)).toEqual({ year: 1066 })
    expect(parseDate('1500-01-05T00:00:00Z', 11, JULIAN)).toBeNull()
    expect(parseDate('1500-01-01T00:00:00Z', 9, JULIAN)).toEqual({ year: 1500 })
  })

  it('drops decades, centuries and values it cannot read', () => {
    expect(parseDate('1810-01-01T00:00:00Z', 8, GREGORIAN)).toBeNull()
    expect(parseDate('not a date', 11, GREGORIAN)).toBeNull()
  })
})

describe('agreedDate', () => {
  it('keeps what the dates agree on', () => {
    expect(
      agreedDate([
        { year: -490, month: 9, day: 7 },
        { year: -490, month: 9, day: 5 },
      ]),
    ).toEqual({ year: -490, month: 9 })
    expect(
      agreedDate([
        { year: -490, month: 9 },
        { year: -490, month: 8 },
      ]),
    ).toEqual({ year: -490 })
    expect(agreedDate([{ year: 1, month: 2, day: 3 }])).toEqual({ year: 1, month: 2, day: 3 })
  })

  it('gives up when the years differ', () => {
    expect(agreedDate([{ year: 1066 }, { year: 1067 }])).toBeNull()
    expect(agreedDate([])).toBeNull()
  })
})

describe('revealsDate', () => {
  it('catches years, centuries and eras in a title', () => {
    expect(revealsDate('Presidentvalget i USA 2020')).toBe(true)
    expect(revealsDate('Jordskjelvet i 1755')).toBe(true)
    expect(revealsDate('Krisen på 1600-tallet')).toBe(true)
    expect(revealsDate('4. mai-bevegelsen')).toBe(true)
    expect(revealsDate('Slaget ved Waterloo')).toBe(false)
    expect(revealsDate('Wilsons 14 punkter')).toBe(false)
    expect(revealsDate('Apollo 11')).toBe(false)
  })
})

describe('cardsFromRows', () => {
  it('makes one card per item with a source, capitalised text and a date', () => {
    const cards = cardsFromRows([row({ label: 'angrepet på Pearl Harbor', description: 'japansk angrep' })])
    expect(cards).toEqual([
      {
        id: 'wd-Q48314',
        title: 'Angrepet på Pearl Harbor',
        reveal: 'Japansk angrep',
        year: 1815,
        month: 6,
        day: 18,
        source: 'https://www.wikidata.org/wiki/Q48314',
        sitelinks: 95,
        type: 'Q178561',
      },
    ])
  })

  it('keeps the Norwegian article title so page views can be looked up', () => {
    const [card] = cardsFromRows([row({ article: 'Slaget ved Waterloo' })])
    expect(card?.article).toBe('Slaget ved Waterloo')
  })

  it('merges several dates for an item and drops items whose dates disagree on the year', () => {
    const marathon = 'http://www.wikidata.org/entity/Q33356'
    const cards = cardsFromRows([
      row({ item: marathon, label: 'Slaget ved Marathon', date: '-0489-09-07T00:00:00Z' }),
      row({ item: marathon, label: 'Slaget ved Marathon', date: '-0489-09-05T00:00:00Z' }),
      row({ item: 'Q2', label: 'Uenig', date: '1000-01-01T00:00:00Z', precision: 9 }),
      row({ item: 'Q2', label: 'Uenig', date: '1001-01-01T00:00:00Z', precision: 9 }),
    ])
    expect(cards.map((c) => [c.id, c.year, c.month, c.day])).toEqual([['wd-Q33356', -490, 9, undefined]])
  })

  it('makes titles from a template, and a card per date property', () => {
    const ibsen = 'http://www.wikidata.org/entity/Q36661'
    const cards = cardsFromRows([
      row({
        item: ibsen,
        label: 'Henrik Ibsen',
        property: 'P569',
        template: '{} blir født',
        date: '1828-03-20T00:00:00Z',
      }),
      row({ item: ibsen, label: 'Henrik Ibsen', date: '1906-05-23T00:00:00Z' }),
    ])
    expect(cards.map((c) => [c.id, c.title, c.year])).toEqual([
      ['wd-Q36661-P569', 'Henrik Ibsen blir født', 1828],
      ['wd-Q36661', 'Henrik Ibsen', 1906],
    ])
  })

  it('drops titles that give the year away or are too long, and long or empty reveals', () => {
    const cards = cardsFromRows([
      row({ item: 'Q1', label: 'VM i fotball 1998' }),
      row({ item: 'Q2', label: 'x'.repeat(61) }),
      row({ item: 'Q3', label: 'Kort tittel', description: 'y'.repeat(201) }),
      row({ item: 'Q4', label: 'Samme', description: 'samme' }),
    ])
    expect(cards.map((c) => [c.id, c.reveal])).toEqual([
      ['wd-Q3', undefined],
      ['wd-Q4', undefined],
    ])
  })
})

describe('curate', () => {
  const card = (id: string, title: string, year = 1900) => ({ id, title, year, source: '', sitelinks: 1, type: 't' })

  it('renames and drops by id', () => {
    const cards = curate([card('a', 'A'), card('b', 'B'), card('c', 'C')], {
      titles: { a: 'Ny A' },
      drop: { b: 'dup' },
    })
    expect(cards.map((c) => c.title)).toEqual(['Ny A', 'C'])
  })

  it('leaves out shuttle flights named by code', () => {
    const cards = curate([card('wd-Q1-P619', 'STS-9 skytes opp', 1983), card('wd-Q2', 'Annet')], {
      titles: {},
      drop: {},
    })
    expect(cards.map((c) => c.id)).toEqual(['wd-Q2'])
  })

  it('replaces a wrong date as a whole, precision included', () => {
    const wrong = { ...card('a', 'A', 1919), month: 3, day: 2 }
    const [fixed] = curate([wrong, card('b', 'B', 1500)], { titles: {}, drop: {}, dates: { a: { year: 1920 } } })
    expect(fixed).toEqual({ id: 'a', title: 'A', year: 1920, source: '', sitelinks: 1, type: 't' })
    const [, other] = curate([wrong, card('b', 'B', 1500)], {
      titles: {},
      drop: {},
      dates: { a: { year: 1920, month: 1, day: 10 } },
    })
    expect(other?.year).toBe(1500)
  })

  it('keeps a shuttle flight whose title the curation changes', () => {
    const cards = curate([card('x', 'STS-51-L skytes opp')], { titles: { x: 'Challenger-ulykken' }, drop: {} })
    expect(cards.map((c) => c.title)).toEqual(['Challenger-ulykken'])
  })
})

describe('withDescriptions', () => {
  const card = (id: string, reveal?: string) => ({
    id,
    title: id,
    year: 1900,
    source: '',
    sitelinks: 1,
    type: 't',
    ...(reveal ? { reveal } : {}),
  })

  it('sets descriptions by id, drops the reveal line, and reports the cards without one', () => {
    const { described, undescribed } = withDescriptions([card('a', 'Kort tekst'), card('b'), card('c')], {
      a: 'Lengre tekst.',
      c: 'Om c.',
    })
    expect(described).toEqual([
      { id: 'a', title: 'a', year: 1900, source: '', sitelinks: 1, type: 't', description: 'Lengre tekst.' },
      { id: 'c', title: 'c', year: 1900, source: '', sitelinks: 1, type: 't', description: 'Om c.' },
    ])
    expect(undescribed.map((c) => c.id)).toEqual(['b'])
  })

  it('keeps a description the card already has', () => {
    const { described } = withDescriptions([{ ...card('a'), description: 'Egen.' }], { a: 'Annen.' })
    expect(described[0]?.description).toBe('Egen.')
  })
})

describe('readDate', () => {
  it('reads a year, a month or a day, and years before 1', () => {
    expect(readDate('1969-07-20')).toEqual({ year: 1969, month: 7, day: 20 })
    expect(readDate('1937-05')).toEqual({ year: 1937, month: 5 })
    expect(readDate('79')).toEqual({ year: 79 })
    expect(readDate('-44-03-15')).toEqual({ year: -44, month: 3, day: 15 })
  })

  it('refuses anything else, and year 0', () => {
    expect(() => readDate('1969-7-20x')).toThrow()
    expect(() => readDate('ca. 1500')).toThrow()
    expect(() => readDate('0')).toThrow()
  })
})

describe('milestoneCards', () => {
  const milestone = { type: 'verk', title: 'T', description: 'D.', date: '1890' }

  it('makes a card with a Wikidata source and the article', () => {
    expect(milestoneCards([{ ...milestone, qid: 'Q1', property: 'P577', article: 'Sult' }])).toEqual([
      {
        id: 'wd-Q1-P577',
        title: 'T',
        description: 'D.',
        year: 1890,
        source: 'https://www.wikidata.org/wiki/Q1',
        sitelinks: 0,
        type: 'verk',
        article: 'Sult',
      },
    ])
  })

  it('numbers the second and later cards made from the same item', () => {
    const cards = milestoneCards([
      { ...milestone, qid: 'Q585' },
      { ...milestone, qid: 'Q585' },
      { ...milestone, qid: 'Q585', property: 'P571' },
      { ...milestone, qid: 'Q585' },
    ])
    expect(cards.map((c) => c.id)).toEqual(['wd-Q585', 'wd-Q585-2', 'wd-Q585-P571', 'wd-Q585-3'])
  })
})

describe('withMilestones', () => {
  const card = (id: string, title: string) => ({ id, title, year: 1900, source: '', sitelinks: 1, type: 't' })

  it('adds the hand-written cards, which win over a Wikidata card with the same id', () => {
    const cards = withMilestones([card('a', 'Fra Wikidata'), card('b', 'B')], [card('a', 'For hånd'), card('c', 'C')])
    expect(cards.map((c) => c.title)).toEqual(['B', 'For hånd', 'C'])
  })
})

describe('withoutSameYearEnds', () => {
  const card = (id: string, year: number) => ({ id, title: id, year, source: '', sitelinks: 1, type: 'Q198' })

  it('drops the end of a war that ended the year it began, and keeps the rest', () => {
    const cards = [
      card('wd-Q1-P580', 1967),
      card('wd-Q1-P582', 1967),
      card('wd-Q2-P580', 1939),
      card('wd-Q2-P582', 1945),
    ]
    expect(withoutSameYearEnds(cards).map((c) => c.id)).toEqual(['wd-Q1-P580', 'wd-Q2-P580', 'wd-Q2-P582'])
  })
})

describe('pickCards', () => {
  const card = (id: string, sitelinks: number, type = 'battle', title = id) => ({
    id,
    title,
    year: 1000,
    source: '',
    sitelinks,
    type,
  })

  it('takes the best known first, up to the count', () => {
    const picked = pickCards([card('a', 1), card('b', 3), card('c', 2)], 2, 10)
    expect(picked.map((c) => c.id)).toEqual(['b', 'c'])
  })

  it('ranks by Norwegian page views before the number of Wikipedias', () => {
    const picked = pickCards([card('a', 90), { ...card('b', 10), views: 500 }, { ...card('c', 50), views: 20 }], 3, 10)
    expect(picked.map((c) => c.id)).toEqual(['b', 'c', 'a'])
  })

  it('caps each type and skips repeated titles, keeping the better known', () => {
    const picked = pickCards(
      [card('a', 9), card('b', 8), card('c', 7), card('d', 6, 'treaty'), card('e', 5, 'treaty', 'A')],
      10,
      2,
    )
    expect(picked.map((c) => c.id)).toEqual(['a', 'b', 'd'])
  })
})
