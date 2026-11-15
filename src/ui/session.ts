// What the game screen keeps on top of the rules: which gap is chosen, which card was placed last
// and which cards were just locked. Plain functions over plain data. The rules themselves live in
// src/game/ and are only called from here, never repeated.

import {
  createGame,
  drawAnother,
  type GameOptions,
  lockIn,
  nextTurn,
  placeCard,
  type Card,
  type GameState,
} from '../game/index.ts'
import { gapText } from './dates.ts'

export interface Session {
  game: GameState
  /** The gap the player has tapped but not confirmed. Only in the `placing` phase. */
  selectedGap: number | null
  /** The card placed correctly last. It is shown opened up while the player decides, or after a win. */
  lastPlacedId: string | null
  /** The cards locked by the last lock in, oldest first. */
  justLocked: readonly string[]
}

export function startSession(cards: readonly Card[], options: GameOptions): Session {
  return { game: createGame(cards, options), selectedGap: null, lastPlacedId: null, justLocked: [] }
}

/** Marks a gap. Tapping another gap moves the mark. Nothing is placed or revealed. */
export function selectGap(session: Session, gap: number): Session {
  if (session.game.phase !== 'placing') return session
  return { ...session, selectedGap: gap }
}

/** Places the drawn card in the chosen gap. Does nothing when no gap is chosen. */
export function confirmGap(session: Session): Session {
  const { game, selectedGap } = session
  if (game.phase !== 'placing' || selectedGap === null || !game.drawn) return session
  const next = placeCard(game, selectedGap)
  return {
    game: next,
    selectedGap: null,
    lastPlacedId: next.phase === 'deciding' || next.phase === 'won' ? game.drawn.id : null,
    justLocked: [],
  }
}

export function drawMore(session: Session): Session {
  return { game: drawAnother(session.game), selectedGap: null, lastPlacedId: null, justLocked: [] }
}

export function lockPending(session: Session): Session {
  const justLocked = session.game.player.timeline
    .filter((entry) => !entry.locked)
    .map((entry) => entry.card.id)
  return { game: lockIn(session.game), selectedGap: null, lastPlacedId: null, justLocked }
}

export function startNextTurn(session: Session): Session {
  return { game: nextTurn(session.game), selectedGap: null, lastPlacedId: null, justLocked: [] }
}

/** False when both piles are empty: drawing another card would only end the game. */
export function canDrawMore(game: GameState): boolean {
  return game.piles.history.length + game.piles.personal.length > 0
}

export function pendingCount(game: GameState): number {
  return game.player.timeline.filter((entry) => !entry.locked).length
}

export type CardState = 'last' | 'spill' | 'tapt'

export interface CardRow {
  kind: 'card'
  card: Card
  state: CardState
  /** The card placed correctly last: shown with its reveal line. */
  opened: boolean
  /** The card that was placed wrongly, shown where the player put it. */
  missed: boolean
  /** Pending cards lean left and right in turn. */
  tilt: 'a' | 'b'
  /** Position in the run of cards that were just locked, in delay steps. Null for every other card. */
  lockStep: number | null
}

export interface GapRow {
  kind: 'gap'
  gap: number
  chosen: boolean
  /** "før 1814", "mellom 1814 og 1905", "etter 1998". */
  text: string
}

export interface MarkerRow {
  kind: 'marker'
  /** The missed card. The marker stands where it belongs. */
  card: Card
}

export type Row = CardRow | GapRow | MarkerRow

/** The rows of the timeline, oldest first, for the phase the game is in. */
export function timelineRows(session: Session): Row[] {
  const { game } = session

  if (game.phase === 'miss' && game.miss) {
    const { miss } = game
    const markerGap = nearest(miss.correctGaps, miss.chosenGap)
    const rows: Row[] = []
    for (let gap = 0; gap <= miss.timeline.length; gap++) {
      if (gap === miss.chosenGap) {
        rows.push({ ...cardRow(miss.card, 'tapt'), missed: true })
      }
      if (gap === markerGap) rows.push({ kind: 'marker', card: miss.card })
      const entry = miss.timeline[gap]
      if (entry) rows.push(cardRow(entry.card, entry.locked ? 'last' : 'tapt'))
    }
    return rows
  }

  const cards = game.player.timeline.map((entry) => entry.card)
  const rows: Row[] = []
  let pending = 0
  game.player.timeline.forEach((entry, index) => {
    if (game.phase === 'placing') rows.push(gapRow(session, cards, index))
    const row = cardRow(entry.card, entry.locked ? 'last' : 'spill')
    if (!entry.locked) row.tilt = pending++ % 2 === 0 ? 'a' : 'b'
    row.opened = (game.phase === 'deciding' || game.phase === 'won') && entry.card.id === session.lastPlacedId
    const lockIndex = session.justLocked.indexOf(entry.card.id)
    if (lockIndex >= 0) row.lockStep = lockStep(lockIndex, session.justLocked.length)
    rows.push(row)
  })
  if (game.phase === 'placing') rows.push(gapRow(session, cards, cards.length))
  return rows
}

/**
 * How many delay steps card number `index` of `count` waits before it locks. One step a card, but
 * with more than four cards the steps shrink so that the last card starts within ten thirds of a
 * step (200 ms at 60 ms a step) after the first.
 */
export function lockStep(index: number, count: number): number {
  const longestWait = 10 / 3
  const step = count > 4 ? longestWait / (count - 1) : 1
  return index * step
}

function cardRow(card: Card, state: CardState): CardRow {
  return {
    kind: 'card',
    card,
    state,
    opened: false,
    missed: false,
    tilt: 'a',
    lockStep: null,
  }
}

function gapRow(session: Session, cards: readonly Card[], gap: number): GapRow {
  return {
    kind: 'gap',
    gap,
    chosen: session.selectedGap === gap,
    text: gapText(cards, gap, session.game.config.precision),
  }
}

/** The value in `values` closest to `target`. `values` is never empty for a miss. */
function nearest(values: readonly number[], target: number): number {
  return values.reduce((best, value) =>
    Math.abs(value - target) < Math.abs(best - target) ? value : best,
  )
}
