// Shared by the API tests: a fresh in-memory database with the schema, seeded on request.

import { fixtureDecks } from '../../src/fixtures/cards.ts'
import { createApp } from './app.ts'
import { openLocalDatabase } from './local.ts'
import { seedDecks, type SeedDeck } from './seed.ts'
import type { LocalDatabase } from './sqlite.ts'

export const testOrigin = 'http://127.0.0.1:4173'

/** A private deck that no response may mention. Its names are made up for the tests. */
export const secretDeck: SeedDeck = {
  id: 'hemmelig-stokk',
  name: 'Hemmelig stokk',
  kind: 'personal',
  visibility: 'private',
  cards: [{ id: 'hemmelig-1', title: 'Hemmelig hendelse', reveal: 'Skal aldri vises.', year: 2001 }],
}

/** An in-memory database with the schema, seeded with the fixture decks and `extra`. */
export async function seededDatabase(extra: readonly SeedDeck[] = []): Promise<LocalDatabase> {
  const db = await openLocalDatabase(':memory:')
  await seedDecks(db, [...fixtureDecks, ...extra])
  return db
}

/** The API over a seeded in-memory database. */
export async function seededApp(extra: readonly SeedDeck[] = []) {
  const db = await seededDatabase(extra)
  return { db, app: createApp({ db, origins: [testOrigin] }) }
}
