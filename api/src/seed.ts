// Loads decks into a database: locally, the bundled fixture decks (fictional or public history
// only). Real personal cards never go in the repo, so they never come through here.

import type { Database, Statement } from './db.ts'
import type { Kind, Visibility } from './types.ts'

export interface SeedDeck {
  id: string
  name: string
  kind: Kind
  visibility: Visibility
  cards: readonly {
    id: string
    title: string
    description?: string
    reveal?: string
    year: number
    month?: number
    day?: number
    source?: string
  }[]
}

/**
 * Writes these decks, all or nothing. A deck that is already there gets the name, kind and
 * visibility given here, and its cards are replaced by these. Other decks are left alone.
 */
export async function seedDecks(db: Database, decks: readonly SeedDeck[]): Promise<void> {
  const statements: Statement[] = []
  for (const deck of decks) {
    statements.push(
      {
        sql: `INSERT INTO decks (id, name, visibility, kind) VALUES (?, ?, ?, ?)
              ON CONFLICT (id) DO UPDATE SET
                name = excluded.name, visibility = excluded.visibility, kind = excluded.kind`,
        params: [deck.id, deck.name, deck.visibility, deck.kind],
      },
      { sql: 'DELETE FROM cards WHERE deck_id = ?', params: [deck.id] },
      ...deck.cards.map((card) => ({
        sql: `INSERT INTO cards (id, deck_id, title, description, reveal, year, month, day, source)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [
          card.id,
          deck.id,
          card.title,
          card.description ?? null,
          card.reveal ?? null,
          card.year,
          card.month ?? null,
          card.day ?? null,
          card.source ?? null,
        ],
      })),
    )
  }
  await db.batch(statements)
}
