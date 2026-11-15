// Reading decks and cards. Until codes exist (T5) only public decks are read: a private deck is
// never listed, and its cards are never returned, as if it did not exist.

import type { Database } from './db.ts'
import type { CardJson, DeckJson } from './types.ts'

interface CardRow {
  id: string
  title: string
  reveal: string | null
  year: number
  month: number | null
  day: number | null
  source: string | null
}

/** The public decks, the history deck first, then by name. */
export function publicDecks(db: Database): Promise<DeckJson[]> {
  return db.all<DeckJson>(
    `SELECT id, name, visibility, kind FROM decks
     WHERE visibility = 'public'
     ORDER BY CASE kind WHEN 'history' THEN 0 ELSE 1 END, name, id`,
  )
}

/**
 * The cards of a public deck, in a fixed order so that a seeded game deals the same cards every
 * time. Null when there is no public deck with this id.
 */
export async function publicDeckCards(db: Database, deckId: string): Promise<CardJson[] | null> {
  const deck = await db.first<{ id: string }>(
    `SELECT id FROM decks WHERE id = ? AND visibility = 'public'`,
    [deckId],
  )
  if (!deck) return null
  const rows = await db.all<CardRow>(
    `SELECT id, title, reveal, year, month, day, source FROM cards WHERE deck_id = ? ORDER BY id`,
    [deckId],
  )
  return rows.map(cardJson)
}

/** A card row as it is sent: columns that are NULL are left out. */
export function cardJson(row: CardRow): CardJson {
  return {
    id: row.id,
    title: row.title,
    ...(row.reveal !== null && { reveal: row.reveal }),
    year: row.year,
    ...(row.month !== null && { month: row.month }),
    ...(row.day !== null && { day: row.day }),
    ...(row.source !== null && { source: row.source }),
  }
}
