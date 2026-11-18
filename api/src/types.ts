// What the API sends. The client reads it in src/data/api.ts and checks it on the way in.

export type Visibility = 'public' | 'private'
export type Kind = 'history' | 'personal'

/** GET /decks: `{ decks: DeckJson[] }`. */
export interface DeckJson {
  id: string
  name: string
  visibility: Visibility
  kind: Kind
}

/**
 * GET /decks/:id/cards: `{ cards: CardJson[] }`. Fields with no value in the database are left out,
 * never sent as null: a card known only by its year has no `month` and no `day`.
 */
export interface CardJson {
  id: string
  title: string
  /** Shown with the title while placing, and kept after. Never gives the date away. */
  description?: string
  reveal?: string
  year: number
  month?: number
  day?: number
  source?: string
}
