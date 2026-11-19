import { afterEach, describe, expect, it } from 'vitest'
import { createApp } from './app.ts'
import { openLocalDatabase } from './local.ts'
import { normaliseName } from './names.ts'
import { parseClaim } from './records.ts'
import type { LocalDatabase } from './sqlite.ts'
import { testOrigin } from './test-helpers.ts'
import type { ClaimJson, ClaimResultJson, RecordsJson } from './types.ts'

let db: LocalDatabase | undefined
afterEach(() => {
  db?.close()
  db = undefined
})

const at = new Date('2026-11-19T12:00:00.000Z')

async function api() {
  db = await openLocalDatabase(':memory:')
  return createApp({ db, origins: [testOrigin], now: () => at.getTime() })
}

type App = Awaited<ReturnType<typeof api>>

const claim = (overrides: Partial<Record<keyof ClaimJson, unknown>> = {}) => ({
  target: 10,
  precision: 'year',
  turns: 4,
  mostInTurn: 3,
  name: 'Kari',
  ...overrides,
})

function post(app: App, body: unknown, headers: Record<string, string> = {}) {
  return app.request('/records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

async function claimed(app: App, body: unknown): Promise<ClaimResultJson> {
  const response = await post(app, body)
  expect(response.status).toBe(200)
  return (await response.json()) as ClaimResultJson
}

async function records(app: App, query = '?target=10&precision=year'): Promise<RecordsJson> {
  const response = await app.request(`/records${query}`)
  expect(response.status).toBe(200)
  return ((await response.json()) as { records: RecordsJson }).records
}

describe('GET /records', () => {
  it('has no records before any claim', async () => {
    expect(await records(await api())).toEqual({ fewestTurns: null, mostInTurn: null })
  })

  it('refuses a missing or bad target or precision', async () => {
    const app = await api()
    for (const query of [
      '',
      '?target=10',
      '?precision=year',
      '?target=1&precision=year',
      '?target=10001&precision=year',
      '?target=10.5&precision=year',
      '?target=-10&precision=year',
      '?target=1e1&precision=year',
      '?target=%2010&precision=year',
      '?target=10&precision=week',
      '?target=10&precision=YEAR',
    ]) {
      const response = await app.request(`/records${query}`)
      expect(response.status, query).toBe(400)
      expect(await response.json()).toEqual({ error: 'bad_request' })
    }
  })

  it('is never kept by a cache', async () => {
    const response = await (await api()).request('/records?target=10&precision=year')
    expect(response.headers.get('cache-control')).toBe('no-store')
  })
})

describe('POST /records', () => {
  it('sets both records with the first claim, and says so', async () => {
    const app = await api()
    expect(await claimed(app, claim())).toEqual({
      records: { fewestTurns: { value: 4, name: 'Kari' }, mostInTurn: { value: 3, name: 'Kari' } },
      set: { fewestTurns: true, mostInTurn: true },
    })
    expect(await records(app)).toEqual({
      fewestTurns: { value: 4, name: 'Kari' },
      mostInTurn: { value: 3, name: 'Kari' },
    })
  })

  it('stores when the record was set', async () => {
    const app = await api()
    await claimed(app, claim())
    const rows = await db?.all('SELECT kind, set_at FROM records ORDER BY kind')
    expect(rows).toEqual([
      { kind: 'fewest_turns', set_at: '2026-11-19T12:00:00.000Z' },
      { kind: 'most_in_turn', set_at: '2026-11-19T12:00:00.000Z' },
    ])
  })

  it('sets neither record with a worse claim', async () => {
    const app = await api()
    await claimed(app, claim())
    const result = await claimed(app, claim({ turns: 5, mostInTurn: 2, name: 'Ola' }))
    expect(result.set).toEqual({ fewestTurns: false, mostInTurn: false })
    expect(result.records).toEqual({
      fewestTurns: { value: 4, name: 'Kari' },
      mostInTurn: { value: 3, name: 'Kari' },
    })
  })

  it('never lets a tie take a record from its holder', async () => {
    const app = await api()
    await claimed(app, claim())
    const result = await claimed(app, claim({ name: 'Ola' }))
    expect(result.set).toEqual({ fewestTurns: false, mostInTurn: false })
    expect(result.records.fewestTurns?.name).toBe('Kari')
    expect(result.records.mostInTurn?.name).toBe('Kari')
  })

  it('sets only the record a claim beats', async () => {
    const app = await api()
    await claimed(app, claim())
    const fewer = await claimed(app, claim({ turns: 3, mostInTurn: 3, name: 'Ola' }))
    expect(fewer.set).toEqual({ fewestTurns: true, mostInTurn: false })
    expect(fewer.records).toEqual({
      fewestTurns: { value: 3, name: 'Ola' },
      mostInTurn: { value: 3, name: 'Kari' },
    })
    const more = await claimed(app, claim({ turns: 5, mostInTurn: 6, name: 'Per' }))
    expect(more.set).toEqual({ fewestTurns: false, mostInTurn: true })
    expect(more.records).toEqual({
      fewestTurns: { value: 3, name: 'Ola' },
      mostInTurn: { value: 6, name: 'Per' },
    })
  })

  it('keeps the records of each target and precision apart', async () => {
    const app = await api()
    await claimed(app, claim())
    const otherTarget = await claimed(app, claim({ target: 11, turns: 9, mostInTurn: 2, name: 'Ola' }))
    expect(otherTarget.set).toEqual({ fewestTurns: true, mostInTurn: true })
    const otherPrecision = await claimed(app, claim({ precision: 'day', turns: 9, mostInTurn: 2, name: 'Per' }))
    expect(otherPrecision.set).toEqual({ fewestTurns: true, mostInTurn: true })
    expect(await records(app)).toEqual({
      fewestTurns: { value: 4, name: 'Kari' },
      mostInTurn: { value: 3, name: 'Kari' },
    })
    expect((await records(app, '?target=11&precision=year')).fewestTurns).toEqual({ value: 9, name: 'Ola' })
    expect((await records(app, '?target=10&precision=day')).mostInTurn).toEqual({ value: 2, name: 'Per' })
    expect(await records(app, '?target=10&precision=month')).toEqual({ fewestTurns: null, mostInTurn: null })
  })

  it('lets two claims at once each take only what they beat', async () => {
    const app = await api()
    await claimed(app, claim({ turns: 9, mostInTurn: 1 }))
    const [a, b] = await Promise.all([
      claimed(app, claim({ turns: 5, mostInTurn: 2, name: 'Ola' })),
      claimed(app, claim({ turns: 3, mostInTurn: 3, name: 'Per' })),
    ])
    expect(a.records).toEqual(b.records)
    expect(await records(app)).toEqual({
      fewestTurns: { value: 3, name: 'Per' },
      mostInTurn: { value: 3, name: 'Per' },
    })
  })

  it('stores the name as it was normalised', async () => {
    const app = await api()
    const result = await claimed(app, claim({ name: '  Kari \t  Nordmann  ' }))
    expect(result.records.fewestTurns?.name).toBe('Kari Nordmann')
  })

  it('is never kept by a cache', async () => {
    const response = await post(await api(), claim())
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('refuses a claim that is not JSON', async () => {
    const app = await api()
    const response = await post(app, '{"target": 10,')
    expect(response.status).toBe(400)
    expect(await response.json()).toEqual({ error: 'bad_request' })
  })

  it('refuses a body that is not sent as JSON', async () => {
    const app = await api()
    for (const type of ['text/plain', 'application/x-www-form-urlencoded', 'application/jsonp']) {
      const response = await post(app, claim(), { 'Content-Type': type })
      expect(response.status, type).toBe(415)
    }
    expect(await records(app)).toEqual({ fewestTurns: null, mostInTurn: null })
  })

  it('accepts JSON with a charset', async () => {
    const response = await post(await api(), claim(), { 'Content-Type': 'application/json; charset=utf-8' })
    expect(response.status).toBe(200)
  })

  it('refuses a body over 1 KB', async () => {
    const app = await api()
    const response = await post(app, { ...claim(), padding: 'x'.repeat(1100) })
    expect(response.status).toBe(413)
    expect(await records(app)).toEqual({ fewestTurns: null, mostInTurn: null })
  })

  it('refuses an impossible or badly formed claim and stores nothing', async () => {
    const app = await api()
    const bad = [
      [],
      null,
      'claim',
      claim({ target: undefined }),
      claim({ target: 1 }),
      claim({ target: 10_001 }),
      claim({ target: '10' }),
      claim({ target: 10.5 }),
      claim({ precision: 'week' }),
      claim({ precision: undefined }),
      claim({ turns: 0 }),
      claim({ turns: 10_001 }),
      claim({ turns: 4.5 }),
      claim({ turns: '4' }),
      claim({ mostInTurn: 0 }),
      // Target 10: the start card is dealt, so at most 9 cards can be secured in one turn.
      claim({ mostInTurn: 10 }),
      claim({ mostInTurn: null }),
      // 9 cards cannot be secured in 2 turns of at most 4.
      claim({ turns: 2, mostInTurn: 4 }),
      claim({ turns: 1, mostInTurn: 8 }),
      claim({ name: undefined }),
      claim({ name: 42 }),
    ]
    for (const body of bad) {
      const response = await post(app, body)
      expect(response.status, JSON.stringify(body)).toBe(400)
    }
    expect(await records(app)).toEqual({ fewestTurns: null, mostInTurn: null })
  })

  it('accepts the claims at the limits', async () => {
    const app = await api()
    expect((await post(app, claim({ turns: 1, mostInTurn: 9 }))).status).toBe(200)
    expect((await post(app, claim({ target: 2, turns: 1, mostInTurn: 1 }))).status).toBe(200)
    expect((await post(app, claim({ target: 10_000, turns: 10_000, mostInTurn: 1 }))).status).toBe(200)
    expect((await post(app, claim({ turns: 3, mostInTurn: 3 }))).status).toBe(200)
  })

  it('ignores fields that are not part of a claim', async () => {
    const result = await claimed(await api(), { ...claim(), deck: 'hemmelig-stokk', set_at: '1999' })
    expect(result.set).toEqual({ fewestTurns: true, mostInTurn: true })
  })

  it('answers the CORS preflight for a claim from an allowed origin, and not from another', async () => {
    const app = await api()
    const preflight = (origin: string) =>
      app.request('/records', {
        method: 'OPTIONS',
        headers: {
          Origin: origin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'content-type',
        },
      })
    const allowed = await preflight(testOrigin)
    expect(allowed.status).toBe(204)
    expect(allowed.headers.get('access-control-allow-origin')).toBe(testOrigin)
    expect(allowed.headers.get('access-control-allow-methods')).toContain('POST')
    expect(allowed.headers.get('access-control-allow-headers')?.toLowerCase()).toContain('content-type')
    const other = await preflight('https://example.com')
    expect(other.headers.get('access-control-allow-origin')).toBeNull()
  })
})

describe('parseClaim', () => {
  it('gives back a good claim with the name normalised', () => {
    expect(parseClaim(claim({ name: ' Kari ' }))).toEqual({
      target: 10,
      precision: 'year',
      turns: 4,
      mostInTurn: 3,
      name: 'Kari',
    })
  })
})

describe('normaliseName', () => {
  it('trims and makes every run of white space one space', () => {
    expect(normaliseName('  Kari  \n Nord  mann ')).toBe('Kari Nord mann')
  })

  it('puts the name in normal form C', () => {
    // "e" followed by a combining acute accent becomes one "é".
    expect(normaliseName('René')).toBe('René')
  })

  it('counts code points, so 20 emoji fit and 21 do not', () => {
    expect(normaliseName('🦊'.repeat(20))).toBe('🦊'.repeat(20))
    expect(normaliseName('🦊'.repeat(21))).toBeNull()
    expect(normaliseName('a'.repeat(20))).toBe('a'.repeat(20))
    expect(normaliseName('a'.repeat(21))).toBeNull()
  })

  it('refuses a blank name', () => {
    for (const name of ['', ' ', '\t\n', ' ']) expect(normaliseName(name)).toBeNull()
  })

  it('refuses control, format and private-use characters', () => {
    for (const name of [
      'Kari\u0000',
      'Ka\u0007ri',
      'Ka\u200bri', // zero-width space
      'Ka\u200dri', // zero-width joiner
      '\u202eirak', // right-to-left override
      'Kari\u2066', // left-to-right isolate
      'Ka\ue000ri', // private use
      'Kari\ufeff', // byte order mark
    ]) {
      expect(normaliseName(name), JSON.stringify(name)).toBeNull()
    }
  })

  it('accepts letters from any script, digits, punctuation and emoji', () => {
    for (const name of ['Åse Ødegård', 'Søren-Kåre', 'Ольга', '李', 'Lars 2', "O'Brien", '🦊 Rev', '7', '🦊']) {
      expect(normaliseName(name)).toBe(name)
    }
  })

  it('accepts the joiners and variation selectors that emoji are made of', () => {
    for (const name of [
      'Kari 👩\u200d💻', // woman technologist: a zero-width joiner between two emoji
      '🏳\ufe0f\u200d🌈', // rainbow flag: a variation selector and a joiner
      '❤\ufe0f Lars', // red heart with its variation selector
      '👩\u{1f3fd}\u200d💻', // woman technologist with a skin tone
      'میخواهم', // Persian
    ]) {
      expect(normaliseName(name), JSON.stringify(name)).toBe(name)
    }
  })

  it('refuses a joiner that is not between two emoji', () => {
    for (const name of ['\u200d🦊', '🦊\u200d', '🦊 \u200d🦊', 'Ka\u200dri', 'Ka\u200cri', '🦊\u200d\u200d🦊']) {
      expect(normaliseName(name), JSON.stringify(name)).toBeNull()
    }
  })

  it('refuses a name that looks blank or has marks with nothing under them', () => {
    for (const name of [
      '\u3164', // Hangul filler
      'Ka\u3164ri',
      '\u2800', // Braille blank
      '...',
      '\u0301', // a combining acute accent alone
      '\u0301Kari',
      'a\u0301\u0302\u0303\u0304', // four marks piled on one letter
      'Ka\u034fri', // combining grapheme joiner
    ]) {
      expect(normaliseName(name), JSON.stringify(name)).toBeNull()
    }
    // Three marks on a letter is still a name, as in Vietnamese.
    expect(normaliseName('Nguyê\u0303n')).toBe('Nguyễn')
  })

  it('refuses what is not a string', () => {
    for (const name of [undefined, null, 1, ['Kari'], { name: 'Kari' }]) expect(normaliseName(name)).toBeNull()
  })
})
