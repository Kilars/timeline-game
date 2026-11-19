// The client's API reader (src/data/api.ts) against the real API over a seeded database: what the
// server sends is what the client reads, and the game gets the fixture decks back as they were.

import { afterEach, describe, expect, it } from 'vitest'
import { fetchDecks } from '../../src/data/api.ts'
import { fetchRecords, gameNumbers, postClaim } from '../../src/data/records.ts'
import { fixtureDecks } from '../../src/fixtures/cards.ts'
import { createGame, type Precision } from '../../src/game/index.ts'
import { roll, seedRng } from '../../src/game/rng.ts'
import { firstCorrectGap, play, wrongGap } from '../../src/game/test-helpers.ts'
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
    expect(marathon && Object.keys(marathon).sort()).toEqual(['description', 'id', 'pool', 'reveal', 'title', 'year'])
  })

  it('gives the same seeded game every time', async () => {
    const first = await decksFromApi()
    db?.close()
    const second = await decksFromApi()
    const game = (decks: typeof first) => createGame(decks.flatMap((deck) => deck.cards), { seed: 7 })
    expect(game(second)).toEqual(game(first))
  })
})

describe('the client claiming records', () => {
  it('has every won game accepted by the server, whatever its target, precision, pushes and misses', async () => {
    const seeded = await seededApp()
    db = seeded.db
    const base = 'http://api.test'
    const fetch = (url: string, init?: RequestInit) => Promise.resolve(seeded.app.request(url.slice(base.length), init))
    const cards = fixtureDecks.flatMap((deck) => deck.cards.map((card) => ({ ...card, pool: deck.kind })))

    let rng = seedRng(2026)
    const next = () => {
      const step = roll(rng)
      rng = step.rng
      return step.value
    }
    let won = 0
    for (let seed = 0; seed < 300; seed++) {
      const target = 2 + Math.floor(next() * Math.min(cards.length - 1, 30))
      const precision = (['year', 'month', 'day'] as const)[Math.floor(next() * 3)] as Precision
      const pushChance = next()
      const missChance = next() * 0.4
      const { final } = play(createGame(cards, { seed, target, precision, personalShare: next() }), {
        gap: (state) => {
          const pending = state.player.timeline.some((entry) => !entry.locked)
          return pending && next() < missChance ? wrongGapOrNot(state) : firstCorrectGap(state)
        },
        push: () => next() < pushChance,
      })
      if (final.phase !== 'won') continue
      won++
      const result = await postClaim(base, { ...gameNumbers(final), name: 'Testesen' }, { fetch })
      expect(result.records.fewestTurns).not.toBeNull()
    }
    expect(won).toBeGreaterThan(200)
  })

  it('reads the records the server keeps', async () => {
    const seeded = await seededApp()
    db = seeded.db
    const base = 'http://api.test'
    const fetch = (url: string, init?: RequestInit) => Promise.resolve(seeded.app.request(url.slice(base.length), init))
    await postClaim(base, { target: 10, precision: 'year', turns: 4, mostInTurn: 3, name: ' Testesen ' }, { fetch })
    expect(await fetchRecords(base, { target: 10, precision: 'year' }, { fetch })).toEqual({
      fewestTurns: { value: 4, name: 'Testesen' },
      mostInTurn: { value: 3, name: 'Testesen' },
    })
  })
})

/** A wrong gap for the drawn card, or a correct one when every gap is right. */
function wrongGapOrNot(state: Parameters<typeof wrongGap>[0]): number {
  try {
    return wrongGap(state)
  } catch {
    return firstCorrectGap(state)
  }
}
