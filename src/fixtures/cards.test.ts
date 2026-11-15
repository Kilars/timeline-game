import { describe, expect, it } from 'vitest'
import { createGame } from '../game/index.ts'
import { fixtureCards } from './cards.ts'

describe('the fixture deck', () => {
  const history = fixtureCards.filter((card) => card.pool === 'history')
  const personal = fixtureCards.filter((card) => card.pool === 'personal')

  it('has about 40 history cards and about 12 personal cards', () => {
    expect(history.length).toBeGreaterThanOrEqual(38)
    expect(history.length).toBeLessThanOrEqual(46)
    expect(personal.length).toBe(12)
  })

  it('is accepted by the rules', () => {
    expect(() => createGame(fixtureCards, { seed: 1 })).not.toThrow()
  })

  it('has unique ids and unique titles', () => {
    // The end-to-end helper finds a card on screen by its title.
    expect(new Set(fixtureCards.map((card) => card.id)).size).toBe(fixtureCards.length)
    expect(new Set(fixtureCards.map((card) => card.title)).size).toBe(fixtureCards.length)
  })

  it('keeps titles within 60 characters and gives every card a reveal line', () => {
    for (const card of fixtureCards) {
      expect(card.title.length, card.id).toBeLessThanOrEqual(60)
      expect(card.title.length, card.id).toBeGreaterThan(0)
      expect(card.reveal, card.id).toBeTruthy()
      expect(card.reveal, card.id).not.toContain('\n')
    }
  })

  it('has cards before year 1 and at least two pairs that share a year', () => {
    expect(history.filter((card) => card.year < 0).length).toBeGreaterThanOrEqual(3)
    const perYear = new Map<number, number>()
    for (const card of fixtureCards) perYear.set(card.year, (perYear.get(card.year) ?? 0) + 1)
    const sharedYears = [...perYear.values()].filter((count) => count >= 2)
    expect(sharedYears.length).toBeGreaterThanOrEqual(2)
  })

  it('uses only the obviously fictional Testesen family for personal cards', () => {
    for (const card of personal) expect(card.title, card.id).toContain('Testesen')
  })
})
