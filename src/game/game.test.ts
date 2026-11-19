import { describe, expect, test } from 'vitest'
import {
  DEFAULT_CONFIG,
  correctGaps,
  createGame,
  drawAnother,
  lockIn,
  nextTurn,
  placeCard,
  score,
} from './index.ts'
import type { Card, GameConfig, GameState } from './index.ts'
import { roll } from './rng.ts'
import {
  allCards,
  card,
  deck,
  deepFreeze,
  drawOrder,
  drawnCard,
  firstCorrectGap,
  play,
  riggedGame,
  wrongGap,
} from './test-helpers.ts'
import type { Strategy } from './test-helpers.ts'

const ids = (cards: readonly Card[]): string[] => cards.map((c) => c.id)
const timelineIds = (state: GameState): string[] => state.player.timeline.map((e) => e.card.id)
const pendingIds = (state: GameState): string[] =>
  state.player.timeline.filter((e) => !e.locked).map((e) => e.card.id)

/** Two cards a turn, with a miss on the second card of every third turn. */
const mixedStrategy: Strategy = {
  gap: (state) =>
    state.player.turnsUsed % 3 === 0 && pendingIds(state).length > 0
      ? wrongGap(state)
      : firstCorrectGap(state),
  push: (state) => pendingIds(state).length < 2,
}

const start = card('start', 1900)
const c1800 = card('c1800', 1800)
const c1850 = card('c1850', 1850)
const c1925 = card('c1925', 1925)
const c1950 = card('c1950', 1950)
const c2000 = card('c2000', 2000)

describe('start', () => {
  test('deals one locked start card and draws the first card of turn 1', () => {
    const cards = deck(10, 10)
    const game = createGame(cards, { seed: 1 })

    expect(game.phase).toBe('placing')
    expect(game.player.timeline).toHaveLength(1)
    expect(game.player.timeline[0]?.locked).toBe(true)
    expect(game.player.turnsUsed).toBe(1)
    expect(game.drawn).not.toBeNull()
    expect(game.miss).toBeNull()
    expect(game.discarded).toEqual([])
    expect(score(game)).toBeNull()
    // The start card and the drawn card have left the piles; nothing is lost or doubled.
    expect(game.piles.history.length + game.piles.personal.length).toBe(18)
    expect(ids(allCards(game)).sort()).toEqual(ids(cards).sort())
  })

  test('the start card counts toward the target', () => {
    const game = riggedGame(start, [c1950, c2000], { target: 2 })
    const placed = placeCard(game, 1)
    expect(placed.phase).toBe('won')
    expect(placed.player.timeline).toHaveLength(2)
  })

  test('uses the default settings when only the seed is given', () => {
    expect(DEFAULT_CONFIG).toEqual({ target: 10, precision: 'year', personalShare: 0.5 })
    expect(createGame(deck(5), { seed: 7 }).config).toEqual({
      target: 10,
      precision: 'year',
      personalShare: 0.5,
      seed: 7,
    })
    expect(createGame(deck(5), { seed: 7, target: undefined }).config.target).toBe(10)
  })

  test('keeps the settings it is given', () => {
    const config = { target: 4, precision: 'day', personalShare: 0.25, seed: -12 } as const
    expect(createGame(deck(5, 5), config).config).toEqual(config)
  })

  test('does not change the card list it is given', () => {
    const cards = deepFreeze(deck(10, 10))
    expect(() => createGame(cards, { seed: 1 })).not.toThrow()
  })
})

describe('place', () => {
  test('a correct placement stays on the timeline as pending', () => {
    const game = riggedGame(start, [c1950, c1800])
    const placed = placeCard(game, 1)

    expect(placed.phase).toBe('deciding')
    expect(placed.drawn).toBeNull()
    expect(placed.miss).toBeNull()
    expect(placed.player.timeline).toEqual([
      { card: start, locked: true },
      { card: c1950, locked: false },
    ])
    expect(placed.player.turnsUsed).toBe(1)
    // Nothing is drawn until the player decides.
    expect(placed.piles).toEqual(game.piles)
    expect(placed.rng).toBe(game.rng)
  })

  test('gap 0 is before the first card and gap n is after the last', () => {
    expect(timelineIds(placeCard(riggedGame(start, [c1800]), 0))).toEqual(['c1800', 'start'])
    expect(timelineIds(placeCard(riggedGame(start, [c1950]), 1))).toEqual(['start', 'c1950'])
    expect(placeCard(riggedGame(start, [c1800]), 1).phase).toBe('miss')
    expect(placeCard(riggedGame(start, [c1950]), 0).phase).toBe('miss')
  })

  test('pending cards are on the timeline and count as cards', () => {
    let game = riggedGame(start, [c1950, c1925, c2000])
    game = drawAnother(placeCard(game, 1))
    expect(timelineIds(game)).toEqual(['start', 'c1950'])
    expect(correctGaps(game)).toEqual([1])

    game = drawAnother(placeCard(game, 1))
    expect(timelineIds(game)).toEqual(['start', 'c1925', 'c1950'])
    expect(pendingIds(game)).toEqual(['c1925', 'c1950'])
    // Three cards on the timeline give gaps 0 to 3.
    expect(placeCard(game, 3).phase).toBe('deciding')
    expect(() => placeCard(game, 4)).toThrow()
  })

  test('a card placed on the wrong side of a pending card is a miss', () => {
    const game = drawAnother(placeCard(riggedGame(start, [c1950, c1925]), 1))
    expect(placeCard(game, 2).phase).toBe('miss')
  })

  test('a tie is correct on either side', () => {
    const game = riggedGame(start, [card('same', 1900), c2000])
    expect(correctGaps(game)).toEqual([0, 1])
    expect(timelineIds(placeCard(game, 0))).toEqual(['same', 'start'])
    expect(timelineIds(placeCard(game, 1))).toEqual(['start', 'same'])
    expect(placeCard(game, 0).phase).toBe('deciding')
    expect(placeCard(game, 1).phase).toBe('deciding')
  })

  test('year judging ignores month and day, so the same year is a tie', () => {
    const june = card('june', 2000, 6, 15)
    const game = riggedGame(june, [card('january', 2000, 1, 1), c1800])
    expect(placeCard(game, 1).phase).toBe('deciding')
    expect(placeCard(game, 0).phase).toBe('deciding')
  })

  test('day judging tells cards in the same year apart', () => {
    const june = card('june', 2000, 6, 15)
    const game = riggedGame(june, [card('january', 2000, 1, 1), c1800], { precision: 'day' })
    expect(correctGaps(game)).toEqual([0])
    expect(placeCard(game, 0).phase).toBe('deciding')
    expect(placeCard(game, 1).phase).toBe('miss')
  })

  test('month judging tells months apart but not days', () => {
    const june = card('june', 2000, 6, 15)
    const options = { precision: 'month' } as const
    expect(correctGaps(riggedGame(june, [card('may', 2000, 5, 30)], options))).toEqual([0])
    expect(correctGaps(riggedGame(june, [card('june1', 2000, 6, 1)], options))).toEqual([0, 1])
  })

  test.each(['year', 'month', 'day'] as const)(
    'a year-only card ties with a full date in the same year under %s judging',
    (precision) => {
      const fullDate = card('full', 2000, 6, 15)
      const yearOnly = card('year', 2000)
      expect(correctGaps(riggedGame(fullDate, [yearOnly], { precision }))).toEqual([0, 1])
      expect(correctGaps(riggedGame(yearOnly, [fullDate], { precision }))).toEqual([0, 1])
    },
  )

  test('years before year 1 are placed in order', () => {
    let game = riggedGame(card('rome', -753), [card('caesar', -44), card('marathon', -490)])
    expect(correctGaps(game)).toEqual([1])
    game = drawAnother(placeCard(game, 1))
    expect(correctGaps(game)).toEqual([1])
    expect(timelineIds(placeCard(game, 1))).toEqual(['rome', 'marathon', 'caesar'])
    expect(placeCard(game, 0).phase).toBe('miss')
    expect(placeCard(game, 2).phase).toBe('miss')
  })

  test('a placement is judged against every card, not only its neighbours', () => {
    // Under day judging a year-only card ties with both March and January of that year.
    const march = card('march', 2000, 3)
    const yearOnly = card('year', 2000)
    const january = card('january', 2000, 1)
    let game = riggedGame(yearOnly, [march, january, c1800], { precision: 'day' })
    game = drawAnother(placeCard(game, 0))
    expect(timelineIds(game)).toEqual(['march', 'year'])

    // After the year-only card, January's only neighbour is a tie. March is still before it.
    expect(correctGaps(game)).toEqual([0])
    const missed = placeCard(game, 2)
    expect(missed.phase).toBe('miss')
    expect(missed.miss?.correctGaps).toEqual([0])
    expect(placeCard(game, 0).phase).toBe('deciding')
  })
})

describe('draw another', () => {
  test('draws the next card in the same turn and keeps the pending cards pending', () => {
    const game = drawAnother(placeCard(riggedGame(start, [c1950, c1800, c2000]), 1))

    expect(game.phase).toBe('placing')
    expect(game.drawn).toEqual(c1800)
    expect(game.player.turnsUsed).toBe(1)
    expect(pendingIds(game)).toEqual(['c1950'])
    expect(ids(game.piles.history)).toEqual(['c2000'])
  })
})

describe('lock in', () => {
  test('locks the pending cards, ends the turn and starts the next with a new card', () => {
    let game = riggedGame(start, [c1950, c1800, c2000, c1850])
    game = drawAnother(placeCard(game, 1))
    game = lockIn(placeCard(game, 0))

    expect(game.phase).toBe('placing')
    expect(game.player.timeline).toEqual([
      { card: c1800, locked: true },
      { card: start, locked: true },
      { card: c1950, locked: true },
    ])
    expect(game.player.turnsUsed).toBe(2)
    expect(game.drawn).toEqual(c2000)
  })

  test('locked cards survive a later miss', () => {
    let game = riggedGame(start, [c1950, c1800, c2000, c1850])
    game = lockIn(placeCard(game, 1))
    game = drawAnother(placeCard(game, 0))
    game = placeCard(game, 0)

    expect(game.phase).toBe('miss')
    expect(timelineIds(game)).toEqual(['start', 'c1950'])
    expect(game.miss?.lostCards).toEqual([c1800])
  })
})

describe('miss', () => {
  test('removes the missed card and every pending card, and keeps what a screen needs', () => {
    let game = riggedGame(start, [c1950, c1800, c1850, c2000])
    game = drawAnother(placeCard(game, 1))
    game = drawAnother(placeCard(game, 0))
    const before = game.player.timeline
    expect(timelineIds(game)).toEqual(['c1800', 'start', 'c1950'])

    const missed = placeCard(game, 0)

    expect(missed.phase).toBe('miss')
    expect(missed.drawn).toBeNull()
    expect(missed.player.timeline).toEqual([{ card: start, locked: true }])
    expect(missed.miss).toEqual({
      card: c1850,
      chosenGap: 0,
      correctGaps: [1],
      lostCards: [c1800, c1950],
      timeline: before,
    })
    expect(missed.discarded).toEqual([c1800, c1950, c1850])
    expect(correctGaps(missed)).toEqual([1])
  })

  test('a miss on the first card of a turn loses only that card', () => {
    const missed = placeCard(riggedGame(start, [c1950, c1800]), 0)
    expect(missed.miss?.lostCards).toEqual([])
    expect(missed.miss?.card).toEqual(c1950)
    expect(missed.discarded).toEqual([c1950])
    expect(timelineIds(missed)).toEqual(['start'])
  })

  test('the next turn starts only when the player asks for it', () => {
    const game = riggedGame(start, [c1950, c1800])
    const missed = placeCard(game, 0)
    // No card is drawn and the turn is not counted yet.
    expect(missed.drawn).toBeNull()
    expect(missed.piles).toEqual(game.piles)
    expect(missed.rng).toBe(game.rng)
    expect(missed.player.turnsUsed).toBe(1)

    const next = nextTurn(missed)
    expect(next.phase).toBe('placing')
    expect(next.drawn).toEqual(c1800)
    expect(next.miss).toBeNull()
    expect(next.player.turnsUsed).toBe(2)
    expect(next.discarded).toEqual([c1950])
  })

  test('lost cards are never drawn again and no card is drawn twice', () => {
    const cards = deck(30, 30)
    let placements = 0
    const { final, drawn, states } = play(createGame(cards, { seed: 11, target: 60 }), {
      // Every third placement is wrong on purpose.
      gap: (state) => (++placements % 3 === 0 ? wrongGap(state) : firstCorrectGap(state)),
      push: () => true,
    })

    expect(final.phase).toBe('exhausted')
    expect(final.discarded.length).toBeGreaterThan(10)
    expect(new Set(ids(drawn)).size).toBe(drawn.length)
    expect(drawn).toHaveLength(cards.length - 1)
    for (const state of states) {
      const lost = new Set(ids(state.discarded))
      expect(timelineIds(state).filter((id) => lost.has(id))).toEqual([])
      expect(state.drawn && lost.has(state.drawn.id)).toBeFalsy()
      expect(ids(allCards(state)).sort()).toEqual(ids(cards).sort())
    }
  })
})

describe('win', () => {
  test('reaching the target in mid-turn wins at once and locks the pending cards', () => {
    let game = riggedGame(start, [c1950, c1800, c2000], { target: 3 })
    game = placeCard(game, 1)
    expect(game.phase).toBe('deciding')
    game = placeCard(drawAnother(game), 0)

    expect(game.phase).toBe('won')
    expect(game.drawn).toBeNull()
    expect(game.player.timeline).toEqual([
      { card: c1800, locked: true },
      { card: start, locked: true },
      { card: c1950, locked: true },
    ])
    // No card is drawn after the win.
    expect(ids(game.piles.history)).toEqual(['c2000'])
  })

  test('a win in the first turn scores 1', () => {
    let game = riggedGame(start, [c1950, c1800], { target: 3 })
    game = placeCard(drawAnother(placeCard(game, 1)), 0)
    expect(game.player.turnsUsed).toBe(1)
    expect(score(game)).toBe(1)
  })

  test('locked and pending cards are counted together', () => {
    let game = riggedGame(start, [c1950, c1800, c2000, c1850], { target: 4 })
    game = lockIn(placeCard(game, 1))
    game = drawAnother(placeCard(game, 0))
    expect(game.phase).toBe('placing')
    game = placeCard(game, 3)
    expect(game.phase).toBe('won')
    expect(score(game)).toBe(2)
  })

  test('the score is the number of turns used, missed turns included', () => {
    let game = riggedGame(start, [c1950, c1800, c2000, c1850, c1925], { target: 4 })
    game = lockIn(placeCard(game, 1)) // Turn 1: one card, locked in.
    game = nextTurn(placeCard(game, 2)) // Turn 2: 1800 after 1950 is a miss.
    game = drawAnother(placeCard(game, 2)) // Turn 3: 2000, then 1850.
    expect(score(game)).toBeNull()
    game = placeCard(game, 0)

    expect(game.phase).toBe('won')
    expect(timelineIds(game)).toEqual(['c1850', 'start', 'c1950', 'c2000'])
    expect(score(game)).toBe(3)
  })

  test('there is no score before the game is won', () => {
    const game = riggedGame(start, [c1950, c1800])
    expect(score(game)).toBeNull()
    expect(score(placeCard(game, 1))).toBeNull()
    expect(score(placeCard(game, 0))).toBeNull()
    expect(score(drawAnother(placeCard(drawAnother(placeCard(game, 1)), 0)))).toBeNull()
  })
})

describe('drawing', () => {
  const pools = (cards: readonly Card[]): string => cards.map((c) => c.pool[0]).join('')

  test('a personal share of 0 draws history first and personal cards only when history runs dry', () => {
    const order = drawOrder(createGame(deck(5, 5), { seed: 3, personalShare: 0, target: 99 }))
    expect(pools(order)).toBe('hhhhhppppp')
  })

  test('a personal share of 1 draws personal first and history only when personal runs dry', () => {
    const order = drawOrder(createGame(deck(5, 5), { seed: 3, personalShare: 1, target: 99 }))
    expect(pools(order)).toBe('ppppphhhhh')
  })

  test('falls back to the other pool when one runs dry', () => {
    const order = drawOrder(createGame(deck(3, 30), { seed: 8, personalShare: 0.5, target: 99 }))
    expect(order).toHaveLength(33)
    expect(new Set(ids(order)).size).toBe(33)
    // The last history card comes long before the end; the rest are personal.
    expect(pools(order).slice(-15)).toBe('p'.repeat(15))
  })

  test('works with only one pool, whatever the share', () => {
    expect(pools(drawOrder(createGame(deck(6), { seed: 1, personalShare: 1, target: 99 })))).toBe(
      'hhhhhh',
    )
    expect(pools(drawOrder(createGame(deck(0, 6), { seed: 1, personalShare: 0, target: 99 })))).toBe(
      'pppppp',
    )
  })

  test('a share in between mixes the pools in about that proportion', () => {
    const order = drawOrder(createGame(deck(300, 300), { seed: 5, personalShare: 0.3, target: 201 }))
    expect(order).toHaveLength(201)
    const personal = order.filter((c) => c.pool === 'personal').length / order.length
    expect(personal).toBeGreaterThan(0.22)
    expect(personal).toBeLessThan(0.38)
  })

  test('every draw is one roll against the personal share, taking the top card of that pile', () => {
    const personalShare = 0.4
    const { states } = play(createGame(deck(12, 12), { seed: 21, personalShare, target: 99 }), {
      gap: firstCorrectGap,
      push: (state) => state.player.timeline.length % 3 !== 0,
    })

    let draws = 0
    let fallbacks = 0
    for (let i = 1; i < states.length; i++) {
      const before = states[i - 1] as GameState
      const after = states[i] as GameState
      if (after.phase !== 'placing') {
        // Nothing is drawn, so the generator and the piles stand still.
        expect(after.rng).toBe(before.rng)
        expect(after.piles).toEqual(before.piles)
        continue
      }
      draws++
      const step = roll(before.rng)
      const rolled = step.value < personalShare ? 'personal' : 'history'
      const other = rolled === 'personal' ? 'history' : 'personal'
      const pool = before.piles[rolled].length > 0 ? rolled : other
      if (pool !== rolled) fallbacks++
      expect(after.rng).toBe(step.rng)
      expect(after.drawn).toEqual(before.piles[pool][0])
      expect(after.piles[pool]).toEqual(before.piles[pool].slice(1))
      expect(after.piles[pool === 'personal' ? 'history' : 'personal']).toEqual(
        before.piles[pool === 'personal' ? 'history' : 'personal'],
      )
    }
    expect(draws).toBe(22)
    expect(fallbacks).toBeGreaterThan(0)
  })

  test('the start card is also rolled against the personal share', () => {
    for (let seed = 0; seed < 20; seed++) {
      const history = createGame(deck(5, 5), { seed, personalShare: 0 })
      const personal = createGame(deck(5, 5), { seed, personalShare: 1 })
      expect(history.player.timeline[0]?.card.pool).toBe('history')
      expect(personal.player.timeline[0]?.card.pool).toBe('personal')
      expect(drawnCard(history).pool).toBe('history')
      expect(drawnCard(personal).pool).toBe('personal')
    }
  })

  test('the start card follows an in-between personal share', () => {
    let personal = 0
    const games = 2000
    for (let seed = 0; seed < games; seed++) {
      const game = createGame(deck(5, 5), { seed, personalShare: 0.3 })
      if (game.player.timeline[0]?.card.pool === 'personal') personal++
    }
    expect(personal / games).toBeGreaterThan(0.26)
    expect(personal / games).toBeLessThan(0.34)
  })

  test('the order of the card list does not change the game', () => {
    const cards = deck(12, 8)
    for (let seed = 0; seed < 20; seed++) {
      expect(createGame([...cards].reverse(), { seed })).toEqual(createGame(cards, { seed }))
    }
  })

  test('the piles are shuffled, not in the order of the card list', () => {
    const cards = deck(30)
    const order = ids(drawOrder(createGame(cards, { seed: 4, personalShare: 0, target: 99 })))
    expect(order).not.toEqual(ids(cards))
    expect([...order].sort()).toEqual(ids(cards).sort())
  })
})

describe('best turn', () => {
  test('starts at 0: the start card is dealt, not won', () => {
    expect(createGame(deck(5), { seed: 1 }).player.mostInTurn).toBe(0)
  })

  test('counts the cards a lock in secures, and keeps the most', () => {
    let game = riggedGame(start, [c1950, c1800, c2000, c1850])
    game = lockIn(placeCard(drawAnother(placeCard(game, 1)), 0)) // Turn 1: two cards.
    expect(game.player.mostInTurn).toBe(2)
    game = lockIn(placeCard(game, 3)) // Turn 2: one card.
    expect(game.player.mostInTurn).toBe(2)
  })

  test('counts the cards pending when the game is won, the winning card included', () => {
    let game = riggedGame(start, [c1950, c1800, c2000, c1850, c1925], { target: 5 })
    game = lockIn(placeCard(game, 1)) // Turn 1: one card.
    game = drawAnother(placeCard(game, 0)) // Turn 2: 1800, 2000, then 1850 wins.
    game = drawAnother(placeCard(game, 3))
    game = placeCard(game, 1)
    expect(game.phase).toBe('won')
    expect(game.player.mostInTurn).toBe(3)
  })

  test('a miss secures nothing and leaves the best turn as it was', () => {
    let game = riggedGame(start, [c1950, c1800, c2000, c1850, c1925])
    game = lockIn(placeCard(game, 1)) // Turn 1: one card.
    game = drawAnother(placeCard(game, 0)) // Turn 2: 1800 and 2000 pending, then a miss.
    game = drawAnother(placeCard(game, 3))
    expect(pendingIds(game)).toHaveLength(2)
    game = placeCard(game, 0)
    expect(game.phase).toBe('miss')
    expect(game.player.mostInTurn).toBe(1)
  })

  test('counts the pending cards locked when the cards run out', () => {
    let game = riggedGame(start, [c1950, c1800])
    game = drawAnother(placeCard(drawAnother(placeCard(game, 1)), 0))
    expect(game.phase).toBe('exhausted')
    expect(game.player.mostInTurn).toBe(2)
  })
})

describe('exhausted', () => {
  test('drawing another with no cards left locks the pending cards and ends the game', () => {
    let game = riggedGame(start, [c1950, c1800])
    game = drawAnother(placeCard(game, 1))
    game = placeCard(game, 0)
    expect(pendingIds(game)).toEqual(['c1800', 'c1950'])

    game = drawAnother(game)
    expect(game.phase).toBe('exhausted')
    expect(game.drawn).toBeNull()
    expect(pendingIds(game)).toEqual([])
    expect(timelineIds(game)).toEqual(['c1800', 'start', 'c1950'])
    expect(game.player.turnsUsed).toBe(1)
    expect(score(game)).toBeNull()
  })

  test('locking in with no cards left ends the game without counting a new turn', () => {
    const game = lockIn(placeCard(riggedGame(start, [c1950]), 1))
    expect(game.phase).toBe('exhausted')
    expect(pendingIds(game)).toEqual([])
    expect(timelineIds(game)).toEqual(['start', 'c1950'])
    expect(game.player.turnsUsed).toBe(1)
  })

  test('starting the next turn after a miss with no cards left ends the game', () => {
    const missed = placeCard(riggedGame(start, [c1950]), 0)
    expect(missed.phase).toBe('miss')
    const game = nextTurn(missed)
    expect(game.phase).toBe('exhausted')
    expect(game.miss).toBeNull()
    expect(timelineIds(game)).toEqual(['start'])
    expect(game.player.turnsUsed).toBe(1)
    expect(game.discarded).toEqual([c1950])
  })

  test('a deck smaller than the target runs out', () => {
    const { final } = play(createGame(deck(2, 2), { seed: 2 }), {
      gap: firstCorrectGap,
      push: () => true,
    })
    expect(final.phase).toBe('exhausted')
    expect(final.player.timeline).toHaveLength(4)
    expect(final.player.timeline.every((entry) => entry.locked)).toBe(true)
    expect(final.piles).toEqual({ history: [], personal: [] })
  })

  test('a deck with exactly the target number of cards can still be won', () => {
    const { final } = play(createGame(deck(3, 2), { seed: 2, target: 5 }), {
      gap: firstCorrectGap,
      push: () => false,
    })
    expect(final.phase).toBe('won')
    expect(score(final)).toBe(4)
  })

  test('a deck of one card is exhausted from the start, with no turn used', () => {
    const game = createGame(deck(1), { seed: 1 })
    expect(game.phase).toBe('exhausted')
    expect(game.drawn).toBeNull()
    expect(game.player.turnsUsed).toBe(0)
    expect(game.player.timeline).toEqual([{ card: deck(1)[0], locked: true }])
  })
})

describe('seed', () => {
  test('the same seed, settings and cards give the same game', () => {
    const first = play(createGame(deck(20, 20), { seed: 42 }), mixedStrategy)
    const second = play(createGame(deck(20, 20), { seed: 42 }), mixedStrategy)
    expect(second.states).toEqual(first.states)
    expect(first.states.length).toBeGreaterThan(10)
  })

  test('different seeds give different games', () => {
    const orders = new Set<string>()
    for (let seed = 1; seed <= 20; seed++) {
      orders.add(ids(drawOrder(createGame(deck(20, 20), { seed, target: 99 }))).join(','))
    }
    expect(orders.size).toBe(20)
  })

  test('negative and large seeds work', () => {
    for (const seed of [-1, 0, 2 ** 31, 2 ** 40]) {
      expect(createGame(deck(5, 5), { seed }).phase).toBe('placing')
    }
    expect(drawOrder(createGame(deck(20), { seed: -1, target: 99 }))).not.toEqual(
      drawOrder(createGame(deck(20), { seed: 1, target: 99 })),
    )
  })
})

describe('state', () => {
  test('is plain data that survives JSON in every phase', () => {
    const { states } = play(createGame(deck(15, 15), { seed: 9, target: 8 }), mixedStrategy)
    const phases = new Set(states.map((state) => state.phase))
    expect([...phases].sort()).toEqual(['deciding', 'miss', 'placing', 'won'])
    for (const state of states) {
      expect(JSON.parse(JSON.stringify(state))).toEqual(state)
    }
  })

  test('a game restored from JSON plays on exactly as the original', () => {
    const game = createGame(deck(15, 15), { seed: 9, target: 8 })
    const restored = JSON.parse(JSON.stringify(game)) as GameState
    expect(play(restored, mixedStrategy).states).toEqual(play(game, mixedStrategy).states)
  })

  test('transitions return a new state and never change the old one', () => {
    let state = deepFreeze(createGame(deck(15, 15), { seed: 9, target: 8 }))
    const seen = new Set<string>()
    for (let step = 0; step < 1000 && state.phase !== 'won' && state.phase !== 'exhausted'; step++) {
      seen.add(state.phase)
      const snapshot = JSON.stringify(state)
      const next: GameState =
        state.phase === 'placing'
          ? placeCard(state, mixedStrategy.gap(state))
          : state.phase === 'deciding'
            ? mixedStrategy.push(state)
              ? drawAnother(state)
              : lockIn(state)
            : nextTurn(state)
      expect(next).not.toBe(state)
      expect(JSON.stringify(state)).toBe(snapshot)
      state = deepFreeze(next)
    }
    expect(state.phase).toBe('won')
    expect([...seen].sort()).toEqual(['deciding', 'miss', 'placing'])
  })
})

describe('correctGaps', () => {
  test('returns the correct gaps for the drawn card', () => {
    expect(correctGaps(riggedGame(start, [c1950]))).toEqual([1])
    expect(correctGaps(riggedGame(start, [c1800]))).toEqual([0])
  })

  test('after a miss it returns the gaps that would have been correct', () => {
    const missed = placeCard(riggedGame(start, [c1950, c1800]), 0)
    expect(correctGaps(missed)).toEqual([1])
  })

  test('playing only the gaps it returns never misses', () => {
    const { states, final } = play(createGame(deck(20, 20), { seed: 6 }), {
      gap: firstCorrectGap,
      push: () => false,
    })
    expect(states.some((state) => state.phase === 'miss')).toBe(false)
    expect(final.phase).toBe('won')
    expect(score(final)).toBe(9)
  })
})

describe('invalid actions', () => {
  const placing = riggedGame(start, [c1950, c1800, c2000])
  const deciding = placeCard(placing, 1)
  const missed = placeCard(placing, 0)
  const won = placeCard(riggedGame(start, [c1950], { target: 2 }), 1)
  const exhausted = lockIn(placeCard(riggedGame(start, [c1950]), 1))

  test('the fixtures are in the phases their names say', () => {
    expect([placing, deciding, missed, won, exhausted].map((state) => state.phase)).toEqual([
      'placing',
      'deciding',
      'miss',
      'won',
      'exhausted',
    ])
  })

  test.each([
    ['deciding', deciding],
    ['miss', missed],
    ['won', won],
    ['exhausted', exhausted],
  ])('placing a card in the %s phase throws', (phase, state) => {
    expect(() => placeCard(state, 0)).toThrow(`Cannot place a card in the "${phase}" phase`)
  })

  test.each([-1, 2, 1.5, Number.NaN, Number.POSITIVE_INFINITY])(
    'placing in gap %d of a one-card timeline throws',
    (gap) => {
      expect(() => placeCard(placing, gap)).toThrow(/Gap .* is out of range.*from 0 to 1/)
    },
  )

  test.each([
    ['placing', placing],
    ['miss', missed],
    ['won', won],
    ['exhausted', exhausted],
  ])('drawing another in the %s phase throws', (phase, state) => {
    expect(() => drawAnother(state)).toThrow(`Cannot draw another card in the "${phase}" phase`)
  })

  test.each([
    ['placing', placing],
    ['miss', missed],
    ['won', won],
    ['exhausted', exhausted],
  ])('locking in in the %s phase throws', (phase, state) => {
    expect(() => lockIn(state)).toThrow(`Cannot lock in in the "${phase}" phase`)
  })

  test('locking in with nothing pending throws', () => {
    // A hand-made state: the rules never reach the deciding phase without a pending card.
    const nothingPending: GameState = {
      ...deciding,
      player: { ...deciding.player, timeline: [{ card: start, locked: true }] },
    }
    expect(() => lockIn(nothingPending)).toThrow('Cannot lock in: no cards are pending')
  })

  test.each([
    ['placing', placing],
    ['deciding', deciding],
    ['won', won],
    ['exhausted', exhausted],
  ])('starting the next turn in the %s phase throws', (phase, state) => {
    expect(() => nextTurn(state)).toThrow(`Cannot start the next turn in the "${phase}" phase`)
  })

  test.each([
    ['deciding', deciding],
    ['won', won],
    ['exhausted', exhausted],
  ])('asking for the correct gaps in the %s phase throws', (phase, state) => {
    expect(() => correctGaps(state)).toThrow(`There are no correct gaps in the "${phase}" phase`)
  })

  test('an invalid action leaves the state as it was', () => {
    const snapshot = JSON.stringify(deciding)
    expect(() => placeCard(deciding, 0)).toThrow()
    expect(JSON.stringify(deciding)).toBe(snapshot)
  })

  test('starting a game without cards throws', () => {
    expect(() => createGame([], { seed: 1 })).toThrow('Cannot start a game without cards')
  })

  const badOptions: [string, Partial<GameConfig>, string][] = [
    ['a target below 2', { target: 1 }, 'The target must be'],
    ['a target that is not a whole number', { target: 2.5 }, 'The target must be'],
    ['a personal share below 0', { personalShare: -0.1 }, 'The personal share must be'],
    ['a personal share above 1', { personalShare: 1.1 }, 'The personal share must be'],
    ['a personal share that is not a number', { personalShare: Number.NaN }, 'The personal share'],
    ['a seed that is not a whole number', { seed: 1.5 }, 'The seed must be'],
    ['a seed that is not a number', { seed: Number.NaN }, 'The seed must be'],
  ]
  test.each(badOptions)('starting a game with %s throws', (_name, options, message) => {
    expect(() => createGame(deck(5), { seed: 1, ...options })).toThrow(message)
  })

  test('starting a game with an unknown precision throws', () => {
    const options = JSON.parse('{"seed":1,"precision":"week"}') as { seed: number }
    expect(() => createGame(deck(5), options)).toThrow('The precision must be')
  })

  const badCards: [string, Card[], string][] = [
    ['two cards with the same id', [card('a', 1900), card('a', 1950)], 'appears more than once'],
    ['a year that is not a whole number', [card('a', 1900.5)], 'needs a whole number as year'],
    ['a day without a month', [card('a', 1900, undefined, 4)], 'has a day but no month'],
    ['month 0', [card('a', 1900, 0)], 'has month 0'],
    ['month 13', [card('a', 1900, 13)], 'has month 13'],
    ['day 0', [card('a', 1900, 1, 0)], 'has day 0'],
    ['day 32', [card('a', 1900, 1, 32)], 'has day 32'],
  ]
  test.each(badCards)('starting a game with %s throws', (_name, cards, message) => {
    expect(() => createGame([...cards, ...deck(5)], { seed: 1 })).toThrow(message)
  })

  test('starting a game with a card in an unknown pool throws', () => {
    const cards = JSON.parse('[{"id":"a","title":"a","year":1900,"pool":"sport"}]') as Card[]
    expect(() => createGame(cards, { seed: 1 })).toThrow('has pool "sport"')
  })
})
