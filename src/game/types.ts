/** Which kind of deck a card came from. The caller sets it from the card's deck. */
export type Pool = 'history' | 'personal'

/** How precisely two cards are compared when a placement is judged. */
export type Precision = 'year' | 'month' | 'day'

export interface Card {
  id: string
  /** Shown while the card is being placed. */
  title: string
  /** Shown with the date after the card is placed. */
  reveal?: string
  /** Signed integer. Negative years are before year 1. */
  year: number
  /** 1 to 12. */
  month?: number
  /** 1 to 31. Only allowed when `month` is set. */
  day?: number
  pool: Pool
}

export interface GameConfig {
  /** Number of cards on the timeline that wins the game. The start card counts. */
  target: number
  precision: Precision
  /** Chance from 0 to 1 that a draw comes from the personal pool. */
  personalShare: number
  /** Integer. The same seed, config and card list always give the same game. */
  seed: number
}

export type Phase =
  /** A card is drawn and waits for a gap. */
  | 'placing'
  /** The last placement was correct: draw another or lock in. */
  | 'deciding'
  /** The last placement was wrong. Waits for the player to start the next turn. */
  | 'miss'
  | 'won'
  /** No cards are left to draw. */
  | 'exhausted'

export interface TimelineEntry {
  card: Card
  /** False while the card is pending: placed this turn and not yet locked in. */
  locked: boolean
}

/** Everything that belongs to one player, kept together so a second player can be added later. */
export interface Player {
  /** Oldest first. Holds locked and pending cards. */
  timeline: TimelineEntry[]
  /** Turns started so far, counting the current one. This is the score when the game is won. */
  turnsUsed: number
}

/** What a UI needs to show a miss. */
export interface Miss {
  /** The card that was placed wrongly. */
  card: Card
  /** The gap the player chose. */
  chosenGap: number
  /** The gaps that would have been correct. Never empty. */
  correctGaps: number[]
  /** The pending cards lost with the missed card, oldest first. */
  lostCards: Card[]
  /** The timeline as it was when the card was placed. The gap indices refer to this. */
  timeline: TimelineEntry[]
}

/** Plain data: safe to copy, compare and pass through JSON. */
export interface GameState {
  config: GameConfig
  phase: Phase
  player: Player
  /** The card to place. Set only in the `placing` phase. */
  drawn: Card | null
  /** Set only in the `miss` phase. */
  miss: Miss | null
  /** Cards not yet drawn, already shuffled. The next draw from a pool is its first card. */
  piles: Record<Pool, Card[]>
  /** Cards lost to a miss, in the order they were lost. They are never drawn again. */
  discarded: Card[]
  /** State of the random generator. */
  rng: number
}
