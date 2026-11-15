import { describe, expect, it } from 'vitest'
import { createGame, type Card } from '../game/index.ts'
import { card } from '../game/test-helpers.ts'
import { fixtureDecks } from '../fixtures/cards.ts'
import { DEFAULT_SETTINGS, type Settings } from './settings.ts'
import {
  canStepTarget,
  cardsInPlay,
  gameSetup,
  isTicked,
  mixKind,
  stepTarget,
  targetFor,
  toggleDeck,
  type Deck,
} from './setup.ts'

function deck(id: string, kind: Deck['kind'], count: number): Deck {
  // The pool is set wrong on purpose: the deck's kind decides.
  const cards: Card[] = Array.from({ length: count }, (_, index) => ({
    ...card(`${id}-${index}`, 1900 + index),
    pool: kind === 'history' ? 'personal' : 'history',
  }))
  return { id, name: id, kind, visibility: kind === 'history' ? 'public' : 'private', cards }
}

const history = deck('historie', 'history', 40)
const family = deck('familie', 'personal', 12)
const friends = deck('venner', 'personal', 5)
const decks = [history, family, friends]

const settings = (changes: Partial<Settings> = {}): Settings => ({ ...DEFAULT_SETTINGS, ...changes })
const ids = (cards: readonly Card[]) => new Set(cards.map((c) => c.id.split('-')[0]))

describe('deck ticks', () => {
  it('has every deck ticked by default, including one the device has not seen before', () => {
    for (const d of decks) expect(isTicked(settings(), d)).toBe(true)
  })

  it('unticks and ticks a deck again', () => {
    const off = toggleDeck(settings(), family)
    expect(off.unticked).toEqual(['familie'])
    expect(isTicked(off, family)).toBe(false)
    expect(isTicked(off, history)).toBe(true)
    expect(toggleDeck(off, family).unticked).toEqual([])
  })

  it('says which kinds the ticked decks hold', () => {
    expect(mixKind(decks, settings())).toBe('both')
    expect(mixKind(decks, settings({ unticked: ['familie', 'venner'] }))).toBe('history')
    expect(mixKind(decks, settings({ unticked: ['historie'] }))).toBe('personal')
    expect(mixKind(decks, settings({ unticked: ['historie', 'familie', 'venner'] }))).toBe('none')
    expect(mixKind([], settings())).toBe('none')
  })
})

describe('cards in play', () => {
  it('takes the cards of the ticked decks, with the pool set from the deck kind', () => {
    const cards = cardsInPlay(decks, settings({ unticked: ['venner'] }))
    expect(cards).toHaveLength(52)
    expect(ids(cards)).toEqual(new Set(['historie', 'familie']))
    for (const c of cards) expect(c.pool).toBe(c.id.startsWith('historie') ? 'history' : 'personal')
  })

  it('keeps every ticked card in play at any mix; the rules apply the share', () => {
    for (const personalPercent of [0, 10, 50, 90, 100]) {
      expect(cardsInPlay(decks, settings({ personalPercent }))).toHaveLength(57)
    }
  })

  it('ignores the mix when only one kind is ticked', () => {
    const onlyHistory = settings({ unticked: ['familie', 'venner'], personalPercent: 100 })
    expect(cardsInPlay(decks, onlyHistory)).toHaveLength(40)
    const onlyPersonal = settings({ unticked: ['historie'], personalPercent: 0 })
    expect(cardsInPlay(decks, onlyPersonal)).toHaveLength(17)
  })

  it('has no cards with nothing ticked', () => {
    expect(cardsInPlay(decks, settings({ unticked: ['historie', 'familie', 'venner'] }))).toEqual([])
  })
})

describe('target', () => {
  it('is the chosen target while there are cards enough', () => {
    expect(targetFor(settings(), 52)).toBe(10)
  })

  it('never goes above the cards in play or below 2', () => {
    expect(targetFor(settings({ target: 30 }), 17)).toBe(17)
    expect(targetFor(settings({ target: 10 }), 5)).toBe(5)
    expect(targetFor(settings({ target: 2 }), 0)).toBe(2)
  })

  it('steps down to 2 and up to the cards in play, and no further', () => {
    let s = settings({ target: 3 })
    s = stepTarget(s, 5, -1)
    expect(s.target).toBe(2)
    expect(canStepTarget(s, 5, -1)).toBe(false)
    expect(stepTarget(s, 5, -1)).toBe(s)

    s = settings({ target: 4 })
    s = stepTarget(s, 5, 1)
    expect(s.target).toBe(5)
    expect(canStepTarget(s, 5, 1)).toBe(false)
    expect(stepTarget(s, 5, 1)).toBe(s)
  })

  it('steps from the target as played when the chosen one is out of bounds', () => {
    // 20 chosen, only 12 cards: one down is 11, not 19.
    expect(stepTarget(settings({ target: 20 }), 12, -1).target).toBe(11)
    expect(canStepTarget(settings({ target: 20 }), 12, 1)).toBe(false)
  })

  it('cannot step with fewer than 2 cards', () => {
    expect(canStepTarget(settings(), 1, 1)).toBe(false)
    expect(canStepTarget(settings(), 1, -1)).toBe(false)
  })
})

describe('game setup', () => {
  it('hands the rules the cards, target, precision, share and seed', () => {
    const setup = gameSetup(decks, settings({ target: 12, precision: 'month', personalPercent: 30 }), 7)
    expect(setup?.cards).toHaveLength(57)
    expect(setup?.options).toEqual({ seed: 7, target: 12, precision: 'month', personalShare: 0.3 })
    const game = createGame(setup?.cards ?? [], setup?.options ?? { seed: 0 })
    expect(game.config).toEqual({ seed: 7, target: 12, precision: 'month', personalShare: 0.3 })
  })

  it('caps the target at the cards in play', () => {
    const setup = gameSetup(decks, settings({ unticked: ['historie', 'familie'], target: 10 }), 1)
    expect(setup?.options.target).toBe(5)
    expect(() => createGame(setup?.cards ?? [], setup?.options ?? { seed: 0 })).not.toThrow()
  })

  it('gives nothing to play when fewer than 2 cards are in play', () => {
    expect(gameSetup(decks, settings({ unticked: ['historie', 'familie', 'venner'] }), 1)).toBeNull()
    expect(gameSetup([deck('en', 'history', 1)], settings(), 1)).toBeNull()
  })

  it('plays the same game as before the start screen with the default settings', () => {
    const setup = gameSetup(fixtureDecks, DEFAULT_SETTINGS, 1)
    const all = fixtureDecks.flatMap((d) => d.cards)
    expect(createGame(setup?.cards ?? [], setup?.options ?? { seed: 0 })).toEqual(createGame(all, { seed: 1 }))
  })
})
