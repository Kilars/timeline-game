// Reading decks from the API (api/), and checking what comes back before it reaches the game.
// The wire format is defined once, in api/src/types.ts.

import type { CardJson, DeckJson } from '../../api/src/types.ts'
import type { Card, Pool } from '../game/index.ts'
import type { Deck } from '../ui/setup.ts'

/** The API could not be reached, answered with an error, or sent something that is not a deck. */
export class ApiError extends Error {
  override name = 'ApiError'
  /** The HTTP status when the API answered with an error; undefined otherwise. */
  status?: number

  constructor(message: string, options?: ErrorOptions & { status?: number }) {
    super(message, options)
    this.status = options?.status
  }
}

type Fetch = (url: string, init?: RequestInit) => Promise<Response>

export interface FetchOptions {
  /** Stands in for the browser's `fetch`, for tests. */
  fetch?: Fetch
  signal?: AbortSignal
}

/**
 * The API address the client was built with (`VITE_API_URL`), without a trailing slash. Null when
 * none is set: the client then plays the bundled fixture decks.
 */
export function apiUrlFrom(value: string | undefined): string | null {
  const url = (value ?? '').trim().replace(/\/+$/, '')
  return url === '' ? null : url
}

/**
 * Every deck the API lists, each with all its cards. A deck that is gone by the time its cards are
 * asked for (404) is left out. Throws `ApiError` for anything else that goes wrong.
 */
export async function fetchDecks(apiUrl: string, options: FetchOptions = {}): Promise<Deck[]> {
  const list = parseDeckList(await getJson(`${apiUrl}/decks`, options))
  const decks = await Promise.all(
    list.map(async (deck) => {
      const json = await getJson(`${apiUrl}/decks/${encodeURIComponent(deck.id)}/cards`, options, true)
      return json === null ? null : { ...deck, cards: parseCards(json, deck.kind) }
    }),
  )
  return decks.filter((deck) => deck !== null)
}

/** GETs a URL and reads its JSON. Null for a 404 when `allowMissing` is set. */
function getJson(url: string, options: FetchOptions, allowMissing = false): Promise<unknown> {
  return requestJson(url, options, {}, allowMissing)
}

/**
 * Sends a request and reads the JSON it gets back. `init` gives the method, headers and body; JSON
 * is always asked for. Null for a 404 when `allowMissing` is set. Throws `ApiError` otherwise.
 */
export async function requestJson(
  url: string,
  options: FetchOptions,
  init: { method?: string; headers?: Record<string, string>; body?: string } = {},
  allowMissing = false,
): Promise<unknown> {
  const { fetch: fetchFn = (input, request) => fetch(input, request), signal } = options
  let response: Response
  try {
    response = await fetchFn(url, { ...init, signal, headers: { Accept: 'application/json', ...init.headers } })
  } catch (error) {
    throw new ApiError(`Could not reach ${url}`, { cause: error })
  }
  if (allowMissing && response.status === 404) return null
  if (!response.ok) throw new ApiError(`${url} answered ${response.status}`, { status: response.status })
  try {
    return await response.json()
  } catch (error) {
    throw new ApiError(`${url} did not send JSON`, { cause: error })
  }
}

/** The body of GET /decks, checked. */
export function parseDeckList(json: unknown): Omit<Deck, 'cards'>[] {
  const decks = field(json, 'decks')
  if (!Array.isArray(decks)) throw new ApiError('The deck list has no "decks" array')
  return decks.map((value: unknown): Omit<Deck, 'cards'> => {
    const deck = value as Partial<Record<keyof DeckJson, unknown>>
    if (!isObject(value) || !isText(deck.id) || typeof deck.name !== 'string') {
      throw new ApiError(`Not a deck: ${JSON.stringify(value)}`)
    }
    if (deck.kind !== 'history' && deck.kind !== 'personal') {
      throw new ApiError(`Deck ${deck.id} has an unknown kind`)
    }
    if (deck.visibility !== 'public' && deck.visibility !== 'private') {
      throw new ApiError(`Deck ${deck.id} has an unknown visibility`)
    }
    return { id: deck.id, name: deck.name, kind: deck.kind, visibility: deck.visibility }
  })
}

/**
 * The body of GET /decks/:id/cards, checked and made into cards for the rules, with the pool set
 * from the deck's kind. A month, day, description or reveal that is missing or null is left out of the card
 * (the rules read an absent month or day as "not known"). The source is not needed for play.
 */
export function parseCards(json: unknown, pool: Pool): Card[] {
  const cards = field(json, 'cards')
  if (!Array.isArray(cards)) throw new ApiError('The card list has no "cards" array')
  return cards.map((value: unknown): Card => {
    const card = value as Partial<Record<keyof CardJson, unknown>>
    if (!isObject(value) || !isText(card.id) || !isText(card.title) || !Number.isInteger(card.year)) {
      throw new ApiError(`Not a card: ${JSON.stringify(value)}`)
    }
    const result: Card = { id: card.id, title: card.title, year: card.year as number, pool }
    if (card.description !== undefined && card.description !== null) {
      if (typeof card.description !== 'string') throw new ApiError(`Card ${card.id} has a bad description`)
      result.description = card.description
    }
    if (card.reveal !== undefined && card.reveal !== null) {
      if (typeof card.reveal !== 'string') throw new ApiError(`Card ${card.id} has a bad reveal line`)
      result.reveal = card.reveal
    }
    const month = optionalPart(card.month, 12, card.id, 'month')
    const day = optionalPart(card.day, 31, card.id, 'day')
    if (day !== undefined && month === undefined) {
      throw new ApiError(`Card ${card.id} has a day but no month`)
    }
    if (month !== undefined) result.month = month
    if (day !== undefined) result.day = day
    return result
  })
}

/** A month or day: absent when missing or null, otherwise a whole number from 1 to `max`. */
function optionalPart(value: unknown, max: number, id: string, name: string): number | undefined {
  if (value === undefined || value === null) return undefined
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > max) {
    throw new ApiError(`Card ${id} has a bad ${name}`)
  }
  return value
}

/** A field of a JSON object, or undefined when `json` is not an object. */
export function field(json: unknown, name: string): unknown {
  return isObject(json) ? (json as Record<string, unknown>)[name] : undefined
}

export function isObject(value: unknown): value is object {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value !== ''
}
