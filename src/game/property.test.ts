import { expect, test } from 'vitest'
import { compareCards } from './compare.ts'
import { correctGaps, createGame, drawAnother, lockIn, nextTurn, placeCard, score } from './index.ts'
import type { Card, GameOptions, GameState, Precision } from './index.ts'
import { roll, seedRng } from './rng.ts'
import { allCards, card, drawnCard } from './test-helpers.ts'

const GAMES = 500

/** A source of random numbers for building test games, itself seeded so a failure can be replayed. */
function random(seed: number) {
  let rng = seedRng(seed)
  const next = (): number => {
    const step = roll(rng)
    rng = step.rng
    return step.value
  }
  const int = (min: number, max: number): number => min + Math.floor(next() * (max - min + 1))
  const pick = <T>(items: readonly [T, ...T[]]): T => items[int(0, items.length - 1)] ?? items[0]
  return { next, int, pick }
}

/**
 * A random deck and random settings. The dates sit close together and carry a mix of precisions, so
 * ties and comparisons that fall back to a coarser level are common.
 */
function randomGame(seed: number): { cards: Card[]; options: GameOptions } {
  const { next, int, pick } = random(seed)
  const cards = Array.from({ length: int(1, 40) }, (_, i) => {
    const year = int(-3, 3)
    const month = next() < 0.6 ? int(1, 3) : undefined
    const day = month !== undefined && next() < 0.6 ? int(1, 3) : undefined
    return card(`c${i}`, year, month, day, next() < 0.5 ? 'personal' : 'history')
  })
  const options: GameOptions = {
    seed: int(-1000, 1000),
    target: int(2, 15),
    precision: pick<Precision>(['year', 'month', 'day']),
    personalShare: pick([0, 0.25, 0.5, 0.75, 1, next()]),
  }
  return { cards, options }
}

/** True when no card on the timeline is later than a card that comes after it. */
function inOrder(cards: readonly Card[], precision: Precision): boolean {
  return cards.every((earlier, i) =>
    cards.slice(i + 1).every((later) => compareCards(earlier, later, precision) <= 0),
  )
}

/** The correct gaps worked out the slow way: put the card in each gap and check the whole line. */
function gapsByTrying(state: GameState): number[] {
  const line = state.player.timeline.map((entry) => entry.card)
  const drawn = drawnCard(state)
  const gaps: number[] = []
  for (let gap = 0; gap <= line.length; gap++) {
    const tried = [...line.slice(0, gap), drawn, ...line.slice(gap)]
    if (inOrder(tried, state.config.precision)) gaps.push(gap)
  }
  return gaps
}

/** What must hold in every state of every game. */
function checkState(state: GameState, cards: readonly Card[]): void {
  const { timeline } = state.player
  const everyId = allCards(state).map((c) => c.id)
  // Every card is in exactly one place: nothing is lost, doubled or drawn twice.
  expect([...everyId].sort()).toEqual(cards.map((c) => c.id).sort())
  expect(inOrder(timeline.map((entry) => entry.card), state.config.precision)).toBe(true)
  expect(timeline.length).toBeLessThanOrEqual(state.config.target)
  expect(state.drawn !== null).toBe(state.phase === 'placing')
  expect(state.miss !== null).toBe(state.phase === 'miss')
  if (state.phase !== 'placing' && state.phase !== 'deciding') {
    expect(timeline.every((entry) => entry.locked)).toBe(true)
  }
  if (state.phase === 'deciding') {
    expect(timeline.some((entry) => !entry.locked)).toBe(true)
  }
  // Locked cards are never lost, so the best turn is never more than the locked cards it added.
  const { mostInTurn, turnsUsed } = state.player
  expect(mostInTurn).toBeGreaterThanOrEqual(0)
  expect(mostInTurn).toBeLessThanOrEqual(timeline.filter((entry) => entry.locked).length - 1)
  if (state.phase === 'won') {
    expect(timeline).toHaveLength(state.config.target)
    expect(score(state)).toBe(turnsUsed)
    // The checks the records API makes on a claim (ADR 0010): a real game always passes them.
    expect(mostInTurn).toBeGreaterThanOrEqual(1)
    expect(mostInTurn).toBeLessThanOrEqual(state.config.target - 1)
    expect(state.config.target - 1).toBeLessThanOrEqual(turnsUsed * mostInTurn)
  } else {
    expect(timeline.length).toBeLessThan(state.config.target)
    expect(score(state)).toBeNull()
  }
  if (state.phase === 'exhausted') {
    expect(state.piles).toEqual({ history: [], personal: [] })
  }
}

test('a drawn card always has a correct gap, and playing only correct gaps ends in a win or exhaustion', () => {
  const outcomes = { won: 0, exhausted: 0 }
  let placements = 0

  for (let seed = 0; seed < GAMES; seed++) {
    const { cards, options } = randomGame(seed)
    const { next, int } = random(seed + 1_000_000)
    let state = createGame(cards, options)
    let turns = state.phase === 'placing' ? 1 : 0
    // The most cards secured in one turn, counted here the slow way.
    let best = 0
    const pendingNow = () => state.player.timeline.filter((entry) => !entry.locked).length
    checkState(state, cards)

    for (let step = 0; state.phase !== 'won' && state.phase !== 'exhausted'; step++) {
      expect(step).toBeLessThan(200)
      // Pending cards are secured by a win, a lock in, or the cards running out after a draw.
      const pending = pendingNow()
      if (state.phase === 'placing') {
        const gaps = correctGaps(state)
        expect(gaps.length).toBeGreaterThan(0)
        expect(gaps).toEqual(gapsByTrying(state))
        // The correct gaps are one unbroken run.
        expect(gaps).toEqual(gaps.map((_, i) => (gaps[0] ?? 0) + i))
        state = placeCard(state, gaps[int(0, gaps.length - 1)] ?? -1)
        placements++
        expect(['deciding', 'won']).toContain(state.phase)
      } else {
        expect(state.phase).toBe('deciding')
        state = next() < 0.5 ? drawAnother(state) : lockIn(state)
        if (state.phase === 'placing' && state.player.timeline.every((entry) => entry.locked)) turns++
      }
      if (state.phase === 'won') best = Math.max(best, pending + 1)
      else if (pending > 0 && pendingNow() === 0) best = Math.max(best, pending)
      expect(state.player.mostInTurn).toBe(best)
      checkState(state, cards)
    }

    expect(state.discarded).toEqual([])
    expect(state.player.turnsUsed).toBe(turns)
    if (state.phase === 'won') outcomes.won++
    else outcomes.exhausted++
  }

  // The random games reach both endings often enough to mean something.
  expect(outcomes.won + outcomes.exhausted).toBe(GAMES)
  expect(outcomes.won).toBeGreaterThan(GAMES / 10)
  expect(outcomes.exhausted).toBeGreaterThan(GAMES / 10)
  expect(placements).toBeGreaterThan(GAMES * 3)
})

test('playing random gaps, right or wrong, always ends in a win or exhaustion with every card accounted for', () => {
  const outcomes = { won: 0, exhausted: 0 }
  let misses = 0

  for (let seed = 0; seed < GAMES; seed++) {
    const { cards, options } = randomGame(seed)
    const { next, int } = random(seed + 2_000_000)
    let state = createGame(cards, options)
    let turns = state.phase === 'placing' ? 1 : 0
    const drawn: string[] = []
    checkState(state, cards)

    for (let step = 0; state.phase !== 'won' && state.phase !== 'exhausted'; step++) {
      expect(step).toBeLessThan(300)
      const before = state
      if (state.phase === 'placing') {
        drawn.push(drawnCard(state).id)
        const gaps = correctGaps(state)
        expect(gaps.length).toBeGreaterThan(0)
        const gap = int(0, state.player.timeline.length)
        state = placeCard(state, gap)
        if (gaps.includes(gap)) {
          expect(['deciding', 'won']).toContain(state.phase)
        } else {
          misses++
          const pending = before.player.timeline.filter((e) => !e.locked).map((e) => e.card)
          expect(state.phase).toBe('miss')
          expect(state.miss).toEqual({
            card: before.drawn,
            chosenGap: gap,
            correctGaps: gaps,
            lostCards: pending,
            timeline: before.player.timeline,
          })
          expect(state.player.timeline).toEqual(before.player.timeline.filter((e) => e.locked))
          expect(state.discarded).toEqual([...before.discarded, ...pending, before.drawn])
        }
      } else if (state.phase === 'deciding') {
        state = next() < 0.5 ? drawAnother(state) : lockIn(state)
        if (state.phase === 'placing' && state.player.timeline.every((entry) => entry.locked)) turns++
      } else {
        state = nextTurn(state)
        if (state.phase === 'placing') turns++
      }
      checkState(state, cards)
    }

    expect(new Set(drawn).size).toBe(drawn.length)
    expect(state.player.turnsUsed).toBe(turns)
    if (state.phase === 'won') outcomes.won++
    else outcomes.exhausted++
  }

  expect(outcomes.won + outcomes.exhausted).toBe(GAMES)
  expect(outcomes.won).toBeGreaterThan(GAMES / 20)
  expect(outcomes.exhausted).toBeGreaterThan(GAMES / 10)
  expect(misses).toBeGreaterThan(GAMES)
})
