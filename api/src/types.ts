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

/** A record and its holder (ADR 0010). */
export interface RecordJson {
  value: number
  name: string
}

/**
 * GET /records?target=&precision=: `{ records: RecordsJson }`. Null where no game at this target
 * and precision has set the record yet.
 */
export interface RecordsJson {
  /** The fewest turns used to win. */
  fewestTurns: RecordJson | null
  /** The most cards secured in one turn. */
  mostInTurn: RecordJson | null
}

/** POST /records: a won game's claim on the records it beats. */
export interface ClaimJson {
  target: number
  precision: 'year' | 'month' | 'day'
  turns: number
  mostInTurn: number
  name: string
}

/** The answer to POST /records: the records as they now stand, and which of them this claim set. */
export interface ClaimResultJson {
  records: RecordsJson
  set: { fewestTurns: boolean; mostInTurn: boolean }
}
