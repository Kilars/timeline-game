// The hand-written text of the history deck: it must never give the date away, and titles must fit
// the editor's limit.

import { describe, expect, it } from 'vitest'
import { CURATION } from './history-curation.ts'
import { DESCRIPTIONS } from './history-descriptions.ts'
import { MILESTONES } from './history-milestones.ts'
import { MAX_TITLE, milestoneCards, revealsDate } from './wikidata.ts'

const cards = milestoneCards(MILESTONES)

describe('history deck text', () => {
  it('has descriptions that do not give the date away', () => {
    const texts = [...Object.values(DESCRIPTIONS), ...MILESTONES.map((m) => m.description)]
    expect(texts.filter((text) => text.trim().length === 0)).toEqual([])
    expect(texts.filter(revealsDate)).toEqual([])
  })

  it('has titles that do not give the date away and fit the limit', () => {
    const titles = [...Object.values(CURATION.titles), ...MILESTONES.map((m) => m.title)]
    expect(titles.filter(revealsDate)).toEqual([])
    expect(titles.filter((title) => title.length > MAX_TITLE)).toEqual([])
  })

  it('has hand-written cards with readable dates, unique ids and unique titles', () => {
    expect(new Set(cards.map((c) => c.id)).size).toBe(cards.length)
    const titles = cards.map((c) => c.title.toLocaleLowerCase('nb'))
    expect(titles.filter((title, i) => titles.indexOf(title) !== i)).toEqual([])
  })

  it('describes no card it also drops', () => {
    expect(Object.keys(DESCRIPTIONS).filter((id) => CURATION.drop[id] !== undefined)).toEqual([])
  })
})
