// Shared by the tests in this folder. Not part of the public API.

import { correctGaps, drawAnother, lockIn, nextTurn, placeCard } from './game.ts'
import type { Card, GameConfig, GameState, Pool } from './types.ts'

/** A card whose title is its id. */
export function card(
  id: string,
  year: number,
  month?: number,
  day?: number,
  pool: Pool = 'history',
): Card {
  const result: Card = { id, title: id, year, pool }
  if (month !== undefined) result.month = month
  if (day !== undefined) result.day = day
  return result
}

/** History cards h0, h1, ... and personal cards p0, p1, ..., every one with its own year. */
export function deck(history: number, personal = 0): Card[] {
  return [
    ...Array.from({ length: history }, (_, i) => card(`h${i}`, 1000 + i * 10)),
    ...Array.from({ length: personal }, (_, i) =>
      card(`p${i}`, 1005 + i * 10, undefined, undefined, 'personal'),
    ),
  ]
}

/**
 * A game at the start of turn 1 where the order of the cards is chosen by the test: `start` is the
 * start card and `draws` are drawn in the order given. Everything is in the history pool and the
 * personal share is 0, so the random rolls cannot change the order.
 */
export function riggedGame(
  start: Card,
  draws: readonly Card[],
  config: Partial<GameConfig> = {},
): GameState {
  const [first, ...rest] = draws
  if (!first) throw new Error('A rigged game needs at least one card to draw')
  return {
    config: { target: 10, precision: 'year', seed: 1, ...config, personalShare: 0 },
    phase: 'placing',
    player: { timeline: [{ card: start, locked: true }], turnsUsed: 1, mostInTurn: 0 },
    drawn: first,
    miss: null,
    piles: { history: rest, personal: [] },
    discarded: [],
    rng: 1,
  }
}

/** The drawn card. Fails when no card is drawn. */
export function drawnCard(state: GameState): Card {
  if (!state.drawn) throw new Error(`No card is drawn in the "${state.phase}" phase`)
  return state.drawn
}

/** The first gap that is wrong for the drawn card. Fails when every gap is correct. */
export function wrongGap(state: GameState): number {
  const correct = correctGaps(state)
  for (let gap = 0; gap <= state.player.timeline.length; gap++) {
    if (!correct.includes(gap)) return gap
  }
  throw new Error('Every gap is correct for the drawn card')
}

export interface Strategy {
  /** The gap to place the drawn card in. */
  gap: (state: GameState) => number
  /** After a correct placement: true to draw another card, false to lock in. */
  push: (state: GameState) => boolean
}

export const firstCorrectGap = (state: GameState): number => {
  const gap = correctGaps(state)[0]
  if (gap === undefined) throw new Error('The drawn card has no correct gap')
  return gap
}

/**
 * Plays until the game is won or exhausted. Returns the last state, every card drawn after the
 * start card in the order drawn, and every state the game went through.
 */
export function play(
  start: GameState,
  strategy: Strategy,
): { final: GameState; drawn: Card[]; states: GameState[] } {
  let state = start
  const drawn: Card[] = []
  const states: GameState[] = [start]
  for (let step = 0; step < 100_000; step++) {
    if (state.phase === 'won' || state.phase === 'exhausted') return { final: state, drawn, states }
    if (state.phase === 'placing') {
      drawn.push(drawnCard(state))
      state = placeCard(state, strategy.gap(state))
    } else if (state.phase === 'deciding') {
      state = strategy.push(state) ? drawAnother(state) : lockIn(state)
    } else {
      state = nextTurn(state)
    }
    states.push(state)
  }
  throw new Error('The game did not end')
}

/** The start card followed by every card drawn when the whole deck is played out. */
export function drawOrder(game: GameState): Card[] {
  const startCard = game.player.timeline[0]?.card
  if (!startCard) throw new Error('The game has no start card')
  return [startCard, ...play(game, { gap: firstCorrectGap, push: () => true }).drawn]
}

/** Freezes a value and everything inside it, so that a function that changes it throws. */
export function deepFreeze<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const inner of Object.values(value)) deepFreeze(inner)
  }
  return value
}

/** Every card the game holds, wherever it is: timeline, drawn, piles and discarded. */
export function allCards(state: GameState): Card[] {
  return [
    ...state.player.timeline.map((entry) => entry.card),
    ...(state.drawn ? [state.drawn] : []),
    ...state.piles.history,
    ...state.piles.personal,
    ...state.discarded,
  ]
}
