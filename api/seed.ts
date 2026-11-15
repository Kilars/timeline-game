// npm run api:seed: loads the bundled fixture decks (src/fixtures/cards.ts) into the local
// database, creating it and its schema if needed. Run it again at any time; it replaces the
// fixture decks' cards and leaves other decks alone.
//
//   API_DB=path/to/file.sqlite npm run api:seed    another file than api/local.sqlite

import path from 'node:path'
import { fixtureDecks } from '../src/fixtures/cards.ts'
import { defaultDbPath, openLocalDatabase } from './src/local.ts'
import { seedDecks } from './src/seed.ts'

const file = process.env.API_DB || defaultDbPath
const db = await openLocalDatabase(file)
try {
  await seedDecks(db, fixtureDecks)
  const cards = fixtureDecks.reduce((sum, deck) => sum + deck.cards.length, 0)
  console.log(`Seeded ${fixtureDecks.length} decks and ${cards} cards into ${path.relative(process.cwd(), file)}`)
} finally {
  db.close()
}
