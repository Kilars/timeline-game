import { afterEach, describe, expect, it } from 'vitest'
import { fixtureDecks } from '../../src/fixtures/cards.ts'
import { createApp } from './app.ts'
import { openLocalDatabase, serveLocal } from './local.ts'
import type { LocalDatabase } from './sqlite.ts'
import { secretDeck, seededApp, testOrigin } from './test-helpers.ts'
import type { CardJson, DeckJson } from './types.ts'

let db: LocalDatabase | undefined
afterEach(() => db?.close())

async function api(extra = [secretDeck]) {
  const seeded = await seededApp(extra)
  db = seeded.db
  return seeded.app
}

const historyDeck = fixtureDecks.find((deck) => deck.id === 'historie')
const familyDeck = fixtureDecks.find((deck) => deck.id === 'familien-testesen')
if (!historyDeck || !familyDeck) throw new Error('The fixture should have a history and a family deck')

describe('GET /decks', () => {
  it('lists the public decks with their id, name, visibility and kind', async () => {
    const response = await (await api()).request('/decks')
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toMatch(/^application\/json/)
    const body = (await response.json()) as { decks: DeckJson[] }
    expect(body).toEqual({
      decks: [{ id: 'historie', name: 'Historie', visibility: 'public', kind: 'history' }],
    })
  })

  it('never lists a private deck', async () => {
    const text = await (await (await api()).request('/decks')).text()
    for (const deck of [secretDeck, familyDeck]) {
      expect(text).not.toContain(deck.id)
      expect(text).not.toContain(deck.name)
    }
  })

  it('puts the history deck first and orders the rest by name', async () => {
    const app = await api([
      { id: 'b', name: 'Bananer', kind: 'personal', visibility: 'public', cards: [] },
      { id: 'a', name: 'Appelsiner', kind: 'personal', visibility: 'public', cards: [] },
    ])
    const body = (await (await app.request('/decks')).json()) as { decks: DeckJson[] }
    expect(body.decks.map((deck) => deck.id)).toEqual(['historie', 'a', 'b'])
  })

  it('lists nothing from an empty database', async () => {
    db = await openLocalDatabase(':memory:')
    const response = await createApp({ db, origins: [] }).request('/decks')
    expect(await response.json()).toEqual({ decks: [] })
  })
})

describe('GET /decks/:id/cards', () => {
  it('returns every card of a public deck, with the date as precisely as it is known', async () => {
    const response = await (await api()).request('/decks/historie/cards')
    expect(response.status).toBe(200)
    const { cards } = (await response.json()) as { cards: CardJson[] }
    const expected = historyDeck.cards
      .map((card) => {
        const sent: Record<string, unknown> = { ...card }
        delete sent.pool
        return sent
      })
      .sort((a, b) => String(a.id).localeCompare(String(b.id)))
    expect(cards).toEqual(expected)
  })

  it('leaves out a month and a day that are NULL in the database, instead of sending null', async () => {
    const response = await (await api()).request('/decks/historie/cards')
    const { cards } = (await response.json()) as { cards: Record<string, unknown>[] }
    const byId = new Map(cards.map((card) => [card.id, card]))
    // Marathon is known to the year, the EF vote to the month, Caesar to the day.
    expect(byId.get('h-marathon')).toEqual({
      id: 'h-marathon',
      title: 'Slaget ved Marathon',
      description: 'Athenske soldater møter en persisk invasjonshær på en slette nordøst for Athen.',
      reveal: 'Athenerne stanser den persiske hæren.',
      year: -490,
    })
    expect(Object.keys(byId.get('h-ef') ?? {})).not.toContain('day')
    expect(byId.get('h-ef')).toMatchObject({ year: 1972, month: 9 })
    expect(byId.get('h-caesar')).toMatchObject({ year: -44, month: 3, day: 15 })
    for (const card of cards) {
      for (const value of Object.values(card)) expect(value, String(card.id)).not.toBeNull()
    }
  })

  it('leaves out a description, a reveal and a source that are NULL, and sends those that are set', async () => {
    const app = await api([
      {
        id: 'k',
        name: 'Kilder',
        kind: 'history',
        visibility: 'public',
        cards: [
          { id: 'k-1', title: 'Uten noe', year: 1900 },
          { id: 'k-2', title: 'Med kilde', year: 1901, source: 'https://www.wikidata.org/wiki/Q1' },
          { id: 'k-3', title: 'Med beskrivelse', description: 'Hva kortet handler om.', year: 1902 },
        ],
      },
    ])
    const body = await (await app.request('/decks/k/cards')).json()
    expect(body).toEqual({
      cards: [
        { id: 'k-1', title: 'Uten noe', year: 1900 },
        { id: 'k-2', title: 'Med kilde', year: 1901, source: 'https://www.wikidata.org/wiki/Q1' },
        { id: 'k-3', title: 'Med beskrivelse', description: 'Hva kortet handler om.', year: 1902 },
      ],
    })
  })

  it('returns the cards in the same order every time', async () => {
    const app = await api()
    const first = await (await app.request('/decks/historie/cards')).text()
    const second = await (await app.request('/decks/historie/cards')).text()
    expect(second).toBe(first)
  })

  it('answers a private deck exactly as an unknown one: 404, and nothing from the deck', async () => {
    const app = await api()
    const unknown = await app.request('/decks/finnes-ikke/cards')
    expect(unknown.status).toBe(404)
    const unknownBody = await unknown.text()
    expect(JSON.parse(unknownBody)).toEqual({ error: 'not_found' })

    for (const deck of [secretDeck, familyDeck]) {
      const response = await app.request(`/decks/${deck.id}/cards`)
      expect(response.status, deck.id).toBe(404)
      const text = await response.text()
      expect(text, deck.id).toBe(unknownBody)
      for (const card of deck.cards) expect(text).not.toContain(card.title)
    }
  })
})

describe('the rest of the API', () => {
  it('answers an unknown path with 404', async () => {
    const response = await (await api()).request('/kort')
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: 'not_found' })
  })

  it('has no way to write: POST, PUT and DELETE are not found', async () => {
    const app = await api()
    for (const method of ['POST', 'PUT', 'DELETE']) {
      const response = await app.request('/decks', { method })
      expect(response.status, method).toBe(404)
    }
  })

  it('answers 500 without details when the database fails', async () => {
    db = await openLocalDatabase(':memory:')
    const app = createApp({ db, origins: [] })
    db.close()
    const quiet = console.error
    console.error = () => {}
    try {
      const response = await app.request('/decks')
      expect(response.status).toBe(500)
      expect(await response.json()).toEqual({ error: 'server_error' })
    } finally {
      console.error = quiet
      db = undefined
    }
  })
})

describe('CORS', () => {
  it('lets an allowed origin read the answer', async () => {
    const response = await (await api()).request('/decks', { headers: { Origin: testOrigin } })
    expect(response.headers.get('access-control-allow-origin')).toBe(testOrigin)
  })

  it('does not let another origin read it', async () => {
    const response = await (await api()).request('/decks', {
      headers: { Origin: 'https://example.com' },
    })
    expect(response.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('answers a preflight from an allowed origin, for GET only', async () => {
    const response = await (await api()).request('/decks', {
      method: 'OPTIONS',
      headers: { Origin: testOrigin, 'Access-Control-Request-Method': 'GET' },
    })
    expect(response.status).toBe(204)
    expect(response.headers.get('access-control-allow-origin')).toBe(testOrigin)
    expect(response.headers.get('access-control-allow-methods')).toBe('GET')
  })
})

describe('serving on this machine', () => {
  it('answers over HTTP and stops again', async () => {
    const seeded = await seededApp()
    db = seeded.db
    const server = await serveLocal({ db, port: 0, origins: [testOrigin] })
    try {
      const response = await fetch(`${server.url}/decks`, { headers: { Origin: testOrigin } })
      expect(response.status).toBe(200)
      expect(response.headers.get('access-control-allow-origin')).toBe(testOrigin)
      expect(((await response.json()) as { decks: DeckJson[] }).decks).toHaveLength(1)
    } finally {
      await server.close()
    }
  })
})
