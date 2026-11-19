import { correctGapsFor } from './compare.ts'
import { roll, seedRng, shuffle } from './rng.ts'
import type { Card, GameConfig, GameState, Player, Pool, TimelineEntry } from './types.ts'

/** The settings a game uses when the caller does not give them. The seed has no default. */
export const DEFAULT_CONFIG = {
  target: 10,
  precision: 'year',
  personalShare: 0.5,
} as const satisfies Omit<GameConfig, 'seed'>

/** The seed is required; everything else falls back to `DEFAULT_CONFIG`. */
export type GameOptions = Partial<GameConfig> & Pick<GameConfig, 'seed'>

/**
 * Starts a game: shuffles the cards, deals the start card face up and locked, and draws the first
 * card of turn 1. The phase is `exhausted` when there is no card left to draw after the start card.
 */
export function createGame(cards: readonly Card[], options: GameOptions): GameState {
  const config: GameConfig = {
    target: options.target ?? DEFAULT_CONFIG.target,
    precision: options.precision ?? DEFAULT_CONFIG.precision,
    personalShare: options.personalShare ?? DEFAULT_CONFIG.personalShare,
    seed: options.seed,
  }
  checkConfig(config)
  checkCards(cards)

  // Sorted by id first, so the same seed gives the same game whatever order the cards arrive in.
  const sorted = [...cards].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  const history = shuffle(
    sorted.filter((card) => card.pool === 'history'),
    seedRng(config.seed),
  )
  const personal = shuffle(
    sorted.filter((card) => card.pool === 'personal'),
    history.rng,
  )
  const start = takeCard({ history: history.items, personal: personal.items }, personal.rng, config)
  if (!start.card) throw new Error('Cannot start a game without cards')

  return startTurn({
    config,
    phase: 'placing',
    player: { timeline: [{ card: start.card, locked: true }], turnsUsed: 0, mostInTurn: 0 },
    drawn: null,
    miss: null,
    piles: start.piles,
    discarded: [],
    rng: start.rng,
  })
}

/**
 * Places the drawn card in a gap. Gap 0 is before the first card, gap n is after the last of the
 * n cards on the timeline; pending cards count. A correct placement leaves the card on the timeline
 * as pending, or wins the game when the target is reached. A miss removes the card and every pending
 * card and records it in `state.miss`.
 */
export function placeCard(state: GameState, gap: number): GameState {
  if (state.phase !== 'placing' || !state.drawn) {
    throw new Error(`Cannot place a card in the "${state.phase}" phase: no card is drawn`)
  }
  const { timeline } = state.player
  if (!Number.isInteger(gap) || gap < 0 || gap > timeline.length) {
    throw new Error(`Gap ${gap} is out of range: expected a whole number from 0 to ${timeline.length}`)
  }
  const card = state.drawn
  const gaps = correctGaps(state)

  if (!gaps.includes(gap)) {
    const lostCards = timeline.filter((entry) => !entry.locked).map((entry) => entry.card)
    return {
      ...state,
      phase: 'miss',
      drawn: null,
      miss: { card, chosenGap: gap, correctGaps: gaps, lostCards, timeline },
      player: { ...state.player, timeline: timeline.filter((entry) => entry.locked) },
      discarded: [...state.discarded, ...lostCards, card],
    }
  }

  const placed: TimelineEntry[] = [
    ...timeline.slice(0, gap),
    { card, locked: false },
    ...timeline.slice(gap),
  ]
  if (placed.length >= state.config.target) {
    return { ...state, phase: 'won', drawn: null, player: secure(state.player, placed) }
  }
  return { ...state, phase: 'deciding', drawn: null, player: { ...state.player, timeline: placed } }
}

/**
 * After a correct placement: draws another card in the same turn. When no cards are left, the
 * pending cards lock and the phase becomes `exhausted`.
 */
export function drawAnother(state: GameState): GameState {
  if (state.phase !== 'deciding') {
    throw new Error(
      `Cannot draw another card in the "${state.phase}" phase: only after a correct placement`,
    )
  }
  return drawCard(state)
}

/** After a correct placement: locks the pending cards, ends the turn and starts the next one. */
export function lockIn(state: GameState): GameState {
  if (state.phase !== 'deciding') {
    throw new Error(`Cannot lock in in the "${state.phase}" phase: only after a correct placement`)
  }
  if (state.player.timeline.every((entry) => entry.locked)) {
    throw new Error('Cannot lock in: no cards are pending')
  }
  return startTurn({ ...state, player: secure(state.player, state.player.timeline) })
}

/** After a miss: starts the next turn. */
export function nextTurn(state: GameState): GameState {
  if (state.phase !== 'miss') {
    throw new Error(`Cannot start the next turn in the "${state.phase}" phase: only after a miss`)
  }
  return startTurn({ ...state, miss: null })
}

/**
 * The gaps where the drawn card can be placed correctly. Never empty. In the `miss` phase it returns
 * the gaps that would have been correct for the missed card, on the timeline in `state.miss`.
 */
export function correctGaps(state: GameState): number[] {
  if (state.phase === 'miss' && state.miss) return [...state.miss.correctGaps]
  if (state.phase !== 'placing' || !state.drawn) {
    throw new Error(`There are no correct gaps in the "${state.phase}" phase: no card is drawn`)
  }
  return correctGapsFor(
    state.player.timeline.map((entry) => entry.card),
    state.drawn,
    state.config.precision,
  )
}

/** The number of turns used, once the game is won. Null in every other phase. */
export function score(state: GameState): number | null {
  return state.phase === 'won' ? state.player.turnsUsed : null
}

/** Starts a new turn by drawing its first card. The turn is counted only when a card is drawn. */
function startTurn(state: GameState): GameState {
  const next = drawCard(state)
  if (next.phase !== 'placing') return next
  return { ...next, player: { ...next.player, turnsUsed: next.player.turnsUsed + 1 } }
}

/** Draws a card to place. With no cards left, locks the pending cards and ends the game. */
function drawCard(state: GameState): GameState {
  const { card, piles, rng } = takeCard(state.piles, state.rng, state.config)
  if (!card) {
    return { ...state, phase: 'exhausted', drawn: null, player: secure(state.player, state.player.timeline) }
  }
  return { ...state, phase: 'placing', drawn: card, piles, rng }
}

/**
 * Takes the next card: rolls against the personal share to pick a pool and falls back to the other
 * pool when the picked one is empty. Returns no card when both are empty.
 */
function takeCard(
  piles: Record<Pool, Card[]>,
  rng: number,
  config: GameConfig,
): { card: Card | null; piles: Record<Pool, Card[]>; rng: number } {
  if (piles.history.length === 0 && piles.personal.length === 0) return { card: null, piles, rng }
  const step = roll(rng)
  const picked: Pool = step.value < config.personalShare ? 'personal' : 'history'
  const other: Pool = picked === 'personal' ? 'history' : 'personal'
  const pool = piles[picked].length > 0 ? picked : other
  const [card, ...rest] = piles[pool]
  return { card: card ?? null, piles: { ...piles, [pool]: rest }, rng: step.rng }
}

/** Locks every pending card on `timeline` and counts them toward the player's best turn. */
function secure(player: Player, timeline: readonly TimelineEntry[]): Player {
  const pending = timeline.filter((entry) => !entry.locked).length
  return {
    ...player,
    timeline: timeline.map((entry) => (entry.locked ? entry : { ...entry, locked: true })),
    mostInTurn: Math.max(player.mostInTurn, pending),
  }
}

function checkConfig(config: GameConfig): void {
  if (!Number.isInteger(config.target) || config.target < 2) {
    throw new Error(`The target must be a whole number of at least 2, got ${config.target}`)
  }
  if (!['year', 'month', 'day'].includes(config.precision)) {
    throw new Error(`The precision must be "year", "month" or "day", got "${config.precision}"`)
  }
  if (!(config.personalShare >= 0 && config.personalShare <= 1)) {
    throw new Error(`The personal share must be from 0 to 1, got ${config.personalShare}`)
  }
  if (!Number.isInteger(config.seed)) {
    throw new Error(`The seed must be a whole number, got ${config.seed}`)
  }
}

function checkCards(cards: readonly Card[]): void {
  const ids = new Set<string>()
  for (const card of cards) {
    if (ids.has(card.id)) throw new Error(`Card id "${card.id}" appears more than once`)
    ids.add(card.id)
    if (card.pool !== 'history' && card.pool !== 'personal') {
      throw new Error(`Card "${card.id}" has pool "${String(card.pool)}", expected "history" or "personal"`)
    }
    if (!Number.isInteger(card.year)) {
      throw new Error(`Card "${card.id}" needs a whole number as year, got ${card.year}`)
    }
    if (card.month !== undefined && !isWholeNumberIn(card.month, 1, 12)) {
      throw new Error(`Card "${card.id}" has month ${card.month}, expected 1 to 12`)
    }
    if (card.day !== undefined && card.month === undefined) {
      throw new Error(`Card "${card.id}" has a day but no month`)
    }
    if (card.day !== undefined && !isWholeNumberIn(card.day, 1, 31)) {
      throw new Error(`Card "${card.id}" has day ${card.day}, expected 1 to 31`)
    }
  }
}

function isWholeNumberIn(value: number, min: number, max: number): boolean {
  return Number.isInteger(value) && value >= min && value <= max
}
