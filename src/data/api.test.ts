import { describe, expect, it } from 'vitest'
import { ApiError, apiUrlFrom, fetchDecks, parseCards, parseDeckList } from './api.ts'

const base = 'http://api.test'

/** A stand-in for `fetch` that answers from a table of paths, and records what was asked for. */
function fakeFetch(routes: Record<string, unknown>, status: Record<string, number> = {}) {
  const asked: string[] = []
  const fetch = async (url: string) => {
    asked.push(url)
    const path = url.slice(base.length)
    const code = status[path] ?? (path in routes ? 200 : 404)
    const body = path in routes ? JSON.stringify(routes[path]) : '{"error":"not_found"}'
    return new Response(body, { status: code, headers: { 'Content-Type': 'application/json' } })
  }
  return { fetch, asked }
}

const historie = { id: 'historie', name: 'Historie', visibility: 'public', kind: 'history' }
const egne = { id: 'egne kort', name: 'Egne kort', visibility: 'public', kind: 'personal' }

describe('apiUrlFrom', () => {
  it('is null when no address is set, so the fixture decks are played', () => {
    expect(apiUrlFrom(undefined)).toBeNull()
    expect(apiUrlFrom('')).toBeNull()
    expect(apiUrlFrom('  ')).toBeNull()
  })

  it('drops a trailing slash', () => {
    expect(apiUrlFrom('http://localhost:8787/')).toBe('http://localhost:8787')
    expect(apiUrlFrom(' https://api.example/v1 ')).toBe('https://api.example/v1')
  })
})

describe('fetchDecks', () => {
  it('fetches the list, then the cards of every deck, and makes decks for the start screen', async () => {
    const { fetch, asked } = fakeFetch({
      '/decks': { decks: [historie, egne] },
      '/decks/historie/cards': { cards: [{ id: 'h-1', title: 'Slaget ved Marathon', year: -490 }] },
      '/decks/egne%20kort/cards': {
        cards: [{ id: 'p-1', title: 'Hytta blir kjøpt', reveal: 'Uten strøm.', year: 1978, month: 7 }],
      },
    })
    const decks = await fetchDecks(base, { fetch })
    expect(asked).toEqual([`${base}/decks`, `${base}/decks/historie/cards`, `${base}/decks/egne%20kort/cards`])
    expect(decks).toEqual([
      { ...historie, cards: [{ id: 'h-1', title: 'Slaget ved Marathon', year: -490, pool: 'history' }] },
      {
        ...egne,
        cards: [{ id: 'p-1', title: 'Hytta blir kjøpt', reveal: 'Uten strøm.', year: 1978, month: 7, pool: 'personal' }],
      },
    ])
  })

  it('leaves out a deck that is gone by the time its cards are asked for', async () => {
    const { fetch } = fakeFetch({ '/decks': { decks: [historie, egne] }, '/decks/historie/cards': { cards: [] } })
    const decks = await fetchDecks(base, { fetch })
    expect(decks.map((deck) => deck.id)).toEqual(['historie'])
  })

  it('throws ApiError when the API cannot be reached', async () => {
    const fetch = async () => {
      throw new TypeError('Failed to fetch')
    }
    await expect(fetchDecks(base, { fetch })).rejects.toBeInstanceOf(ApiError)
  })

  it('throws ApiError when the API answers with an error', async () => {
    const list = fakeFetch({ '/decks': {} }, { '/decks': 500 })
    await expect(fetchDecks(base, { fetch: list.fetch })).rejects.toThrow(/answered 500/)
    const cards = fakeFetch({ '/decks': { decks: [historie] }, '/decks/historie/cards': {} }, { '/decks/historie/cards': 503 })
    await expect(fetchDecks(base, { fetch: cards.fetch })).rejects.toBeInstanceOf(ApiError)
  })

  it('throws ApiError when the answer is not JSON', async () => {
    const fetch = async () => new Response('<html>', { status: 200 })
    await expect(fetchDecks(base, { fetch })).rejects.toThrow(/did not send JSON/)
  })

  it('passes the abort signal on', async () => {
    const controller = new AbortController()
    const seen: (AbortSignal | null | undefined)[] = []
    const fetch = async (_url: string, init?: RequestInit) => {
      seen.push(init?.signal)
      return new Response(JSON.stringify({ decks: [] }))
    }
    await fetchDecks(base, { fetch, signal: controller.signal })
    expect(seen).toEqual([controller.signal])
  })
})

describe('parseDeckList', () => {
  it('keeps id, name, kind and visibility and drops anything else', () => {
    expect(parseDeckList({ decks: [{ ...historie, extra: 1 }] })).toEqual([historie])
  })

  it('refuses what is not a deck list', () => {
    expect(() => parseDeckList(null)).toThrow(ApiError)
    expect(() => parseDeckList({ decks: {} })).toThrow(ApiError)
    expect(() => parseDeckList({ decks: [{ ...historie, id: '' }] })).toThrow(ApiError)
    expect(() => parseDeckList({ decks: [{ ...historie, kind: 'family' }] })).toThrow(/kind/)
    expect(() => parseDeckList({ decks: [{ ...historie, visibility: 'secret' }] })).toThrow(/visibility/)
  })
})

describe('parseCards', () => {
  it('makes a card known only by its year, with no month or day at all', () => {
    const [card] = parseCards({ cards: [{ id: 'a', title: 'A', year: -490 }] }, 'history')
    expect(card).toEqual({ id: 'a', title: 'A', year: -490, pool: 'history' })
  })

  it('turns a null month, day or reveal into an absent one, not a null one', () => {
    const [card] = parseCards(
      { cards: [{ id: 'a', title: 'A', reveal: null, year: 1972, month: null, day: null, source: null }] },
      'personal',
    )
    expect(card).toEqual({ id: 'a', title: 'A', year: 1972, pool: 'personal' })
    expect(card && Object.keys(card)).toEqual(['id', 'title', 'year', 'pool'])
  })

  it('keeps a month without a day, and a full date', () => {
    const cards = parseCards(
      {
        cards: [
          { id: 'ef', title: 'EF', year: 1972, month: 9, day: null },
          { id: 'c', title: 'C', reveal: 'Idus martii.', year: -44, month: 3, day: 15 },
        ],
      },
      'history',
    )
    expect(cards).toEqual([
      { id: 'ef', title: 'EF', year: 1972, month: 9, pool: 'history' },
      { id: 'c', title: 'C', reveal: 'Idus martii.', year: -44, month: 3, day: 15, pool: 'history' },
    ])
  })

  it('drops the source, which play does not need', () => {
    const [card] = parseCards({ cards: [{ id: 'a', title: 'A', year: 1, source: 'Q1' }] }, 'history')
    expect(card).not.toHaveProperty('source')
  })

  it('refuses what is not a card', () => {
    const bad = (card: object) => () => parseCards({ cards: [card] }, 'history')
    expect(() => parseCards({}, 'history')).toThrow(ApiError)
    expect(bad({ id: 'a', title: '', year: 1 })).toThrow(ApiError)
    expect(bad({ id: 'a', title: 'A', year: 1.5 })).toThrow(ApiError)
    expect(bad({ id: 'a', title: 'A', year: '1905' })).toThrow(ApiError)
    expect(bad({ id: 'a', title: 'A', year: 1, month: 13 })).toThrow(/month/)
    expect(bad({ id: 'a', title: 'A', year: 1, month: 2, day: 0 })).toThrow(/day/)
    expect(bad({ id: 'a', title: 'A', year: 1, day: 5 })).toThrow(/no month/)
    expect(bad({ id: 'a', title: 'A', year: 1, reveal: 5 })).toThrow(/reveal/)
  })
})
