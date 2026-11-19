import { describe, expect, it } from 'vitest'
import { ApiError } from './api.ts'
import {
  atLimit,
  beatenKinds,
  fetchRecords,
  holds,
  parseRecords,
  postClaim,
  standing,
  type GameNumbers,
} from './records.ts'

const base = 'http://api.test'
const numbers: GameNumbers = { target: 10, precision: 'year', turns: 4, mostInTurn: 3 }
const kari = (value: number) => ({ value, name: 'Kari' })

/** A stand-in for `fetch` that gives one answer and records what was sent. */
function fakeFetch(body: unknown, status = 200) {
  const sent: { url: string; init?: RequestInit }[] = []
  const fetch = async (url: string, init?: RequestInit) => {
    sent.push({ url, init })
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status })
  }
  return { fetch, sent }
}

describe('standing', () => {
  it('beats a record nobody holds', () => {
    expect(standing('fewestTurns', null, numbers)).toBe('beaten')
    expect(standing('mostInTurn', null, numbers)).toBe('beaten')
  })

  it('beats the fewest turns with fewer, and the most in a turn with more', () => {
    expect(standing('fewestTurns', kari(5), numbers)).toBe('beaten')
    expect(standing('fewestTurns', kari(4), numbers)).toBe('tied')
    expect(standing('fewestTurns', kari(3), numbers)).toBe('behind')
    expect(standing('mostInTurn', kari(2), numbers)).toBe('beaten')
    expect(standing('mostInTurn', kari(3), numbers)).toBe('tied')
    expect(standing('mostInTurn', kari(4), numbers)).toBe('behind')
  })

  it('lists the records a game beats', () => {
    expect(beatenKinds({ fewestTurns: null, mostInTurn: null }, numbers)).toEqual(['fewestTurns', 'mostInTurn'])
    expect(beatenKinds({ fewestTurns: kari(4), mostInTurn: kari(2) }, numbers)).toEqual(['mostInTurn'])
    expect(beatenKinds({ fewestTurns: kari(4), mostInTurn: kari(3) }, numbers)).toEqual([])
  })
})

describe('atLimit', () => {
  it('knows 1 turn and every card but the start card in one turn cannot be beaten', () => {
    expect(atLimit('fewestTurns', 1, 10)).toBe(true)
    expect(atLimit('fewestTurns', 2, 10)).toBe(false)
    expect(atLimit('mostInTurn', 9, 10)).toBe(true)
    expect(atLimit('mostInTurn', 8, 10)).toBe(false)
  })
})

describe('holds', () => {
  it('is true only for the same value and name', () => {
    expect(holds(kari(4), 4, 'Kari')).toBe(true)
    expect(holds(kari(4), 4, 'Ola')).toBe(false)
    expect(holds(kari(4), 3, 'Kari')).toBe(false)
    expect(holds(null, 4, 'Kari')).toBe(false)
  })
})

describe('fetchRecords', () => {
  it('asks for the records at a target and precision, and reads them', async () => {
    const { fetch, sent } = fakeFetch({ records: { fewestTurns: kari(4), mostInTurn: null } })
    const records = await fetchRecords(base, { target: 10, precision: 'day' }, { fetch })
    expect(sent.map((request) => request.url)).toEqual([`${base}/records?target=10&precision=day`])
    expect(records).toEqual({ fewestTurns: kari(4), mostInTurn: null })
  })

  it('throws ApiError for an error, a network failure or an answer that is not records', async () => {
    await expect(fetchRecords(base, numbers, fakeFetch({ error: 'bad_request' }, 400))).rejects.toThrow(ApiError)
    await expect(fetchRecords(base, numbers, fakeFetch('not json'))).rejects.toThrow(ApiError)
    await expect(fetchRecords(base, numbers, fakeFetch({ decks: [] }))).rejects.toThrow(ApiError)
    const failing = { fetch: () => Promise.reject(new TypeError('offline')) }
    await expect(fetchRecords(base, numbers, failing)).rejects.toThrow(ApiError)
  })
})

describe('postClaim', () => {
  it('sends the claim as JSON and reads which records it set', async () => {
    const answer = { records: { fewestTurns: kari(4), mostInTurn: kari(3) }, set: { fewestTurns: true, mostInTurn: false } }
    const { fetch, sent } = fakeFetch(answer)
    const claim = { ...numbers, name: 'Kari' }
    expect(await postClaim(base, claim, { fetch })).toEqual(answer)
    const [request] = sent
    expect(request?.url).toBe(`${base}/records`)
    expect(request?.init?.method).toBe('POST')
    expect(request?.init?.headers).toMatchObject({ 'Content-Type': 'application/json', Accept: 'application/json' })
    expect(JSON.parse(String(request?.init?.body))).toEqual(claim)
  })

  it('throws ApiError when the answer has no set flags or the claim is refused', async () => {
    const claim = { ...numbers, name: 'Kari' }
    const records = { fewestTurns: null, mostInTurn: null }
    await expect(postClaim(base, claim, fakeFetch({ records }))).rejects.toThrow(ApiError)
    await expect(postClaim(base, claim, fakeFetch({ error: 'bad_request' }, 400))).rejects.toThrow(ApiError)
  })
})

describe('parseRecords', () => {
  it('refuses records that are not whole numbers with a name', () => {
    for (const bad of [
      null,
      [],
      { fewestTurns: { value: 0, name: 'Kari' }, mostInTurn: null },
      { fewestTurns: { value: 2.5, name: 'Kari' }, mostInTurn: null },
      { fewestTurns: { value: 2, name: '' }, mostInTurn: null },
      { fewestTurns: { value: '2', name: 'Kari' }, mostInTurn: null },
      { fewestTurns: null },
    ]) {
      expect(() => parseRecords(bad), JSON.stringify(bad)).toThrow(ApiError)
    }
  })
})
