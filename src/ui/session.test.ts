import { describe, expect, it } from 'vitest'
import { card, riggedGame } from '../game/test-helpers.ts'
import { fixtureCards } from '../fixtures/cards.ts'
import {
  canDrawMore,
  confirmGap,
  drawMore,
  lockPending,
  lockStep,
  pendingCount,
  selectGap,
  startNextTurn,
  startSession,
  timelineRows,
  type Row,
  type Session,
} from './session.ts'

/** Start card 1900, then the given cards are drawn in order. */
function session(...draws: ReturnType<typeof card>[]): Session {
  return {
    game: riggedGame(card('start', 1900), draws),
    selectedGap: null,
    lastPlacedId: null,
    justLocked: [],
  }
}

const place = (s: Session, gap: number): Session => confirmGap(selectGap(s, gap))

/** A short way to read rows in a test: "gap0", "card:start:last", "marker:x". */
function sketch(rows: Row[]): string[] {
  return rows.map((row) => {
    if (row.kind === 'gap') return `gap${row.gap}${row.chosen ? '*' : ''}`
    if (row.kind === 'marker') return `marker:${row.card.id}`
    const flags = [row.state, row.opened && 'opened', row.missed && 'missed'].filter(Boolean)
    return `card:${row.card.id}:${flags.join(':')}`
  })
}

describe('session', () => {
  it('starts a game on the fixture deck with nothing chosen', () => {
    const s = startSession(fixtureCards, 1)
    expect(s.game.phase).toBe('placing')
    expect(s.selectedGap).toBeNull()
    expect(startSession(fixtureCards, 1)).toEqual(s)
  })

  it('moves the chosen gap without placing anything', () => {
    const s = session(card('a', 1950), card('b', 1960))
    const chosen = selectGap(selectGap(s, 0), 1)
    expect(chosen.selectedGap).toBe(1)
    expect(chosen.game).toBe(s.game)
  })

  it('does not place a card before a gap is chosen', () => {
    const s = session(card('a', 1950), card('b', 1960))
    expect(confirmGap(s)).toBe(s)
  })

  it('remembers the card placed last after a correct placement', () => {
    const s = place(session(card('a', 1950), card('b', 1960)), 1)
    expect(s.game.phase).toBe('deciding')
    expect(s.lastPlacedId).toBe('a')
    expect(s.selectedGap).toBeNull()
    expect(pendingCount(s.game)).toBe(1)
  })

  it('remembers which cards a lock in locked, oldest first', () => {
    let s = place(session(card('a', 1950), card('b', 1850), card('c', 2000)), 1)
    s = place(drawMore(s), 0)
    s = lockPending(s)
    expect(s.justLocked).toEqual(['b', 'a'])
    expect(s.game.phase).toBe('placing')
    expect(pendingCount(s.game)).toBe(0)
  })

  it('forgets the last placed card when the next card is drawn', () => {
    const s = drawMore(place(session(card('a', 1950), card('b', 1960)), 1))
    expect(s.lastPlacedId).toBeNull()
  })

  it('knows when no cards are left to draw', () => {
    const s = place(session(card('a', 1950)), 1)
    expect(canDrawMore(s.game)).toBe(false)
    expect(canDrawMore(place(session(card('a', 1950), card('b', 1960)), 1).game)).toBe(true)
  })

  it('ignores a tap on a gap outside the placing phase', () => {
    const s = place(session(card('a', 1950), card('b', 1960)), 1)
    expect(selectGap(s, 0)).toBe(s)
  })
})

describe('timelineRows', () => {
  it('puts a gap before, between and after the cards while placing', () => {
    const s = session(card('a', 1950), card('b', 1960))
    expect(sketch(timelineRows(s))).toEqual(['gap0', 'card:start:last', 'gap1'])
    expect(sketch(timelineRows(selectGap(s, 1)))).toEqual(['gap0', 'card:start:last', 'gap1*'])
  })

  it('names each gap by the cards around it', () => {
    const s = drawMore(place(session(card('a', 1950), card('b', 1960)), 1))
    const texts = timelineRows(s).flatMap((row) => (row.kind === 'gap' ? [row.text] : []))
    expect(texts).toEqual(['før 1900', 'mellom 1900 og 1950', 'etter 1950'])
  })

  it('shows no gaps and opens the card placed last while deciding', () => {
    let s = place(session(card('a', 1950), card('b', 1960), card('c', 1970)), 1)
    expect(sketch(timelineRows(s))).toEqual(['card:start:last', 'card:a:spill:opened'])
    s = place(drawMore(s), 2)
    expect(sketch(timelineRows(s))).toEqual(['card:start:last', 'card:a:spill', 'card:b:spill:opened'])
  })

  it('leans pending cards left and right in turn', () => {
    let s = place(session(card('a', 1950), card('b', 1960), card('c', 1970)), 1)
    s = place(drawMore(s), 2)
    const tilts = timelineRows(s).flatMap((row) =>
      row.kind === 'card' && row.state === 'spill' ? [row.tilt] : [],
    )
    expect(tilts).toEqual(['a', 'b'])
  })

  it('shows a miss where it was put, the lost cards, and a marker where it belongs', () => {
    // Line: start 1900, a 1950 (pending). The card from 1800 is put last instead of first.
    let s = place(session(card('a', 1950), card('old', 1800), card('c', 1970)), 1)
    s = place(drawMore(s), 2)
    expect(s.game.phase).toBe('miss')
    expect(sketch(timelineRows(s))).toEqual([
      'marker:old',
      'card:start:last',
      'card:a:tapt',
      'card:old:tapt:missed',
    ])
  })

  it('puts the marker in the correct gap nearest to the chosen one when a tie gives several', () => {
    // Line: 1900 (start), 1900b. A third card from 1900 fits in all three gaps, so use 1950 first.
    let s = place(session(card('tie', 1900), card('late', 1950), card('early', 1800)), 0)
    s = lockPending(s)
    s = place(s, 2)
    s = lockPending(s)
    // Line is now tie 1900, start 1900, late 1950. A card from 1900 belongs in gap 0, 1 or 2.
    s = { ...s, game: { ...s.game, drawn: card('third', 1900) } }
    s = place(s, 3)
    expect(s.game.miss?.correctGaps).toEqual([0, 1, 2])
    expect(sketch(timelineRows(s))).toEqual([
      'card:tie:last',
      'card:start:last',
      'marker:third',
      'card:late:last',
      'card:third:tapt:missed',
    ])
  })

  it('goes back to gaps and locked cards on the next turn', () => {
    let s = place(session(card('a', 1950), card('old', 1800), card('c', 1970)), 1)
    s = place(drawMore(s), 2)
    s = startNextTurn(s)
    expect(sketch(timelineRows(s))).toEqual(['gap0', 'card:start:last', 'gap1'])
  })

  it('gives the cards that were just locked their place in the run', () => {
    let s = place(session(card('a', 1950), card('b', 1960), card('c', 1970)), 1)
    s = lockPending(place(drawMore(s), 2))
    const steps = timelineRows(s).flatMap((row) => (row.kind === 'card' ? [row.lockStep] : []))
    expect(steps).toEqual([null, 0, 1])
  })
})

describe('lockStep', () => {
  it('waits one step a card for up to four cards', () => {
    expect([0, 1, 2, 3].map((i) => lockStep(i, 4))).toEqual([0, 1, 2, 3])
  })

  it('shrinks the steps for more cards so the last one starts within ten thirds of a step', () => {
    expect(lockStep(0, 6)).toBe(0)
    expect(lockStep(5, 6)).toBeCloseTo(10 / 3)
    expect(lockStep(8, 9)).toBeCloseTo(10 / 3)
    expect(lockStep(1, 6)).toBeLessThan(1)
  })
})
