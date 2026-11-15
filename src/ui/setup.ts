// From the choices on the start screen to a game: which decks and cards are in play, how far the
// target can go, and the options handed to the rules. The rules themselves (the mix, the judging,
// the target) live in src/game/ and are only configured from here.

import type { Card, GameOptions, Pool } from '../game/index.ts'
import type { Settings } from './settings.ts'

export interface Deck {
  id: string
  name: string
  /** Decides which side of the mix slider the deck's cards fall on. */
  kind: Pool
  visibility: 'public' | 'private'
  cards: readonly Card[]
}

/** The smallest target the rules allow: the start card and one more. */
export const MIN_TARGET = 2

/** The mix slider moves in steps of this many percent. */
export const MIX_STEP = 10

export function isTicked(settings: Settings, deck: Deck): boolean {
  return !settings.unticked.includes(deck.id)
}

/** Ticks or unticks one deck. */
export function toggleDeck(settings: Settings, deck: Deck): Settings {
  const unticked = isTicked(settings, deck)
    ? [...settings.unticked, deck.id]
    : settings.unticked.filter((id) => id !== deck.id)
  return { ...settings, unticked }
}

/**
 * Which kinds the ticked decks hold, and so what the mix slider means: `both` when there are
 * history and personal decks to mix, the one kind when there is only one, `none` with nothing ticked.
 */
export function mixKind(decks: readonly Deck[], settings: Settings): Pool | 'both' | 'none' {
  const kinds = new Set(decks.filter((deck) => isTicked(settings, deck)).map((deck) => deck.kind))
  if (kinds.size === 2) return 'both'
  const [only] = kinds
  return only ?? 'none'
}

/**
 * The cards a game with these choices can draw: every card of every ticked deck, with its pool set
 * from its deck. The mix is not applied here. The rules draw by the share and, when one pile runs
 * out, go on with the other (SPEC, "Game rules"), so even at 0 % or 100 % every ticked card is in play.
 */
export function cardsInPlay(decks: readonly Deck[], settings: Settings): Card[] {
  return decks
    .filter((deck) => isTicked(settings, deck))
    .flatMap((deck) => deck.cards.map((card) => ({ ...card, pool: deck.kind })))
}

/** Whether a game can start with this many cards: the start card and at least one to draw. */
export function canPlay(cardCount: number): boolean {
  return cardCount >= MIN_TARGET
}

/** The target as it will be played: the chosen one, kept from 2 up to the number of cards in play. */
export function targetFor(settings: Settings, cardCount: number): number {
  return Math.max(MIN_TARGET, Math.min(settings.target, cardCount))
}

/** Whether the target can go one down (-1) or one up (+1) from where it is. */
export function canStepTarget(settings: Settings, cardCount: number, step: -1 | 1): boolean {
  if (!canPlay(cardCount)) return false
  const target = targetFor(settings, cardCount)
  return step < 0 ? target > MIN_TARGET : target < cardCount
}

/** Moves the target one down or up, from the target as it will be played, within the bounds. */
export function stepTarget(settings: Settings, cardCount: number, step: -1 | 1): Settings {
  if (!canStepTarget(settings, cardCount, step)) return settings
  return { ...settings, target: targetFor(settings, cardCount) + step }
}

/** The cards and options for `createGame`, or null when the choices leave too few cards to play. */
export function gameSetup(
  decks: readonly Deck[],
  settings: Settings,
  seed: number,
): { cards: Card[]; options: GameOptions } | null {
  const cards = cardsInPlay(decks, settings)
  if (!canPlay(cards.length)) return null
  return {
    cards,
    options: {
      seed,
      target: targetFor(settings, cards.length),
      precision: settings.precision,
      personalShare: settings.personalPercent / 100,
    },
  }
}
