import { afterEach, describe, expect, it } from 'vitest'
import { fixtureDecks } from '../../src/fixtures/cards.ts'
import { openLocalDatabase, readMigrations } from './local.ts'
import { migrate } from './migrate.ts'
import { seedDecks } from './seed.ts'
import { openSqlite, type LocalDatabase } from './sqlite.ts'

let db: LocalDatabase
afterEach(() => db?.close())

const insertDeck = (id: string, visibility = 'public', kind = 'history') =>
  db.batch([
    { sql: 'INSERT INTO decks (id, name, visibility, kind) VALUES (?, ?, ?, ?)', params: [id, id, visibility, kind] },
  ])

const insertCard = (id: string, year: number, month: number | null, day: number | null) =>
  db.batch([
    {
      sql: 'INSERT INTO cards (id, deck_id, title, year, month, day) VALUES (?, ?, ?, ?, ?, ?)',
      params: [id, 'd', id, year, month, day],
    },
  ])

describe('the schema', () => {
  it('applies to an empty database and creates the tables', async () => {
    db = openSqlite(':memory:')
    expect(await migrate(db, readMigrations())).toEqual([
      '0001_init.sql',
      '0002_card_descriptions.sql',
      '0004_records.sql',
    ])
    const tables = await db.all<{ name: string }>(
      `SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name`,
    )
    expect(tables.map((table) => table.name)).toEqual([
      '_migrations',
      'cards',
      'code_decks',
      'codes',
      'decks',
      'records',
    ])
  })

  it('applies each file once', async () => {
    db = await openLocalDatabase(':memory:')
    expect(await migrate(db, readMigrations())).toEqual([])
  })

  it('applies files in name order', async () => {
    db = openSqlite(':memory:')
    const applied = await migrate(db, [
      { name: '0002_b.sql', sql: 'CREATE TABLE b (a_id INTEGER REFERENCES a (id))' },
      { name: '0001_a.sql', sql: 'CREATE TABLE a (id INTEGER PRIMARY KEY)' },
    ])
    expect(applied).toEqual(['0001_a.sql', '0002_b.sql'])
  })

  it('stores years before year 1 and dates known only to the year or month', async () => {
    db = await openLocalDatabase(':memory:')
    await insertDeck('d')
    await insertCard('marathon', -490, null, null)
    await insertCard('ef', 1972, 9, null)
    const rows = await db.all('SELECT id, year, month, day FROM cards ORDER BY year')
    expect(rows).toEqual([
      { id: 'marathon', year: -490, month: null, day: null },
      { id: 'ef', year: 1972, month: 9, day: null },
    ])
  })

  it('refuses a day without a month, a month out of range and an unknown visibility or kind', async () => {
    db = await openLocalDatabase(':memory:')
    await insertDeck('d')
    await expect(insertCard('a', 2000, null, 5)).rejects.toThrow()
    await expect(insertCard('b', 2000, 13, null)).rejects.toThrow()
    await expect(insertDeck('x', 'secret')).rejects.toThrow()
    await expect(insertDeck('y', 'public', 'family')).rejects.toThrow()
  })

  it('refuses a card in a deck that does not exist, and deletes a deck with its cards', async () => {
    db = await openLocalDatabase(':memory:')
    await expect(insertCard('a', 2000, null, null)).rejects.toThrow()
    await insertDeck('d')
    await insertCard('a', 2000, null, null)
    await db.batch([{ sql: 'DELETE FROM decks WHERE id = ?', params: ['d'] }])
    expect(await db.all('SELECT id FROM cards')).toEqual([])
  })

  it('has a codes table with a hash, a role and the decks a code opens', async () => {
    db = await openLocalDatabase(':memory:')
    await insertDeck('d', 'private', 'personal')
    await db.batch([
      { sql: `INSERT INTO codes (id, hash, role) VALUES (1, 'hash-1', 'play')` },
      { sql: `INSERT INTO codes (id, hash, role, all_decks) VALUES (2, 'hash-2', 'edit', 1)` },
      { sql: `INSERT INTO code_decks (code_id, deck_id) VALUES (1, 'd')` },
    ])
    await expect(
      db.batch([{ sql: `INSERT INTO codes (hash, role) VALUES ('hash-3', 'admin')` }]),
    ).rejects.toThrow()
    await expect(
      db.batch([{ sql: `INSERT INTO codes (hash, role) VALUES ('hash-1', 'play')` }]),
    ).rejects.toThrow()
    expect(await db.all('SELECT code_id, deck_id FROM code_decks')).toEqual([{ code_id: 1, deck_id: 'd' }])
  })
})

describe('the seed', () => {
  it('loads every fixture deck and card', async () => {
    db = await openLocalDatabase(':memory:')
    await seedDecks(db, fixtureDecks)
    const decks = await db.all('SELECT id, name, visibility, kind FROM decks ORDER BY id')
    expect(decks).toEqual(
      fixtureDecks
        .map(({ id, name, visibility, kind }) => ({ id, name, visibility, kind }))
        .sort((a, b) => a.id.localeCompare(b.id)),
    )
    const count = await db.first<{ n: number }>('SELECT count(*) AS n FROM cards')
    expect(count?.n).toBe(fixtureDecks.reduce((sum, deck) => sum + deck.cards.length, 0))
  })

  it('can run again without doubling anything, and leaves other decks alone', async () => {
    db = await openLocalDatabase(':memory:')
    await insertDeck('other')
    await seedDecks(db, fixtureDecks)
    await seedDecks(db, fixtureDecks)
    const count = await db.first<{ n: number }>('SELECT count(*) AS n FROM cards')
    expect(count?.n).toBe(fixtureDecks.reduce((sum, deck) => sum + deck.cards.length, 0))
    expect(await db.first('SELECT id FROM decks WHERE id = ?', ['other'])).toEqual({ id: 'other' })
  })

  it('writes nothing when one card is bad', async () => {
    db = await openLocalDatabase(':memory:')
    const bad = { id: 'bad', name: 'Bad', kind: 'history', visibility: 'public', cards: [{ id: 'x', title: '', year: 1 }] } as const
    await expect(seedDecks(db, [...fixtureDecks, bad])).rejects.toThrow()
    expect(await db.all('SELECT id FROM decks')).toEqual([])
  })
})
