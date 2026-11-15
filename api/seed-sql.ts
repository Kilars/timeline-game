// npm run api:seed-sql: writes the public fixture decks (public history only) as SQL, for loading
// into the hosted database:
//
//   npm run api:seed-sql > seed.sql
//   npx wrangler d1 execute tidslinje --remote --file seed.sql
//
// Private fixture decks are left out; real personal cards are added through the app, never here.

import { fixtureDecks } from '../src/fixtures/cards.ts'
import { seedDecks } from './src/seed.ts'
import { sqlDump } from './src/sql-dump.ts'

const db = sqlDump()
await seedDecks(db, fixtureDecks.filter((deck) => deck.visibility === 'public'))
process.stdout.write(db.text())
