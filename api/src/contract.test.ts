// The client's API reader (src/data/api.ts) against the real API over a seeded database: what the
// server sends is what the client reads, and the game gets the fixture decks back as they were.

import { afterEach, describe, expect, it } from 'vitest'
import { fetchDecks } from '../../src/data/api.ts'
import { fixtureDecks } from '../../src/fixtures/cards.ts'
import { createGame } from '../../src/game/index.ts'
import type { LocalDatabase } from './sqlite.ts'
import { secretDeck, seededApp } from './test-helpers.ts'

let db: LocalDatabase | undefined
afterEach(() => db?.close())

async function decksFromApi() {
  const seeded = await seededApp([secretDeck])
  db = seeded.db
  const base = 'http://api.test'
  const fetch = (url: string, init?: RequestInit) => Promise.resolve(seeded.app.request(url.slice(base.length), init))
  return fetchDecks(base, { fetch })
}

describe('the client reading the API', () => {
  it('gets the public fixture deck back card for card, and no private deck', async () => {
    const decks = await decksFromApi()
    const history = fixtureDecks.find((deck) => deck.id === 'historie')
    expect(decks).toHaveLength(1)
    const [deck] = decks
    expect(deck).toMatchObject({ id: 'historie', name: 'Historie', kind: 'history', visibility: 'public' })
    const byId = (a: { id: string }, b: { id: string }) => a.id.localeCompare(b.id)
    expect([...(deck?.cards ?? [])].sort(byId)).toEqual([...(history?.cards ?? [])].sort(byId))
  })

  it('gives cards with no month or day key where the database has NULL', async () => {
    const [deck] = await decksFromApi()
    const marathon = deck?.cards.find((card) => card.id === 'h-marathon')
    expect(marathon && Object.keys(marathon).sort()).toEqual(['id', 'pool', 'reveal', 'title', 'year'])
  })

  it('gives the same seeded game every time', async () => {
    const first = await decksFromApi()
    db?.close()
    const second = await decksFromApi()
    const game = (decks: typeof first) => createGame(decks.flatMap((deck) => deck.cards), { seed: 7 })
    expect(game(second)).toEqual(game(first))
  })
})
