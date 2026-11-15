import { beforeEach, describe, expect, it } from 'vitest'
import { STORAGE_KEY, forgetScores, readBest, recordScore, type ScoreStore } from './bestScore.ts'

function fakeStore(initial: Record<string, string> = {}): ScoreStore & { data: Record<string, string> } {
  const data = { ...initial }
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value
    },
  }
}

const brokenStore: ScoreStore = {
  getItem: () => {
    throw new Error('storage is blocked')
  },
  setItem: () => {
    throw new Error('storage is blocked')
  },
}

beforeEach(() => forgetScores())

describe('best score', () => {
  it('has no best score before the first win', () => {
    expect(readBest(fakeStore(), 10)).toBeNull()
  })

  it('records the first win as a new best', () => {
    const store = fakeStore()
    expect(recordScore(store, 10, 6)).toEqual({ best: 6, previousBest: null, isNewBest: true })
    expect(readBest(store, 10)).toBe(6)
  })

  it('keeps the best when a later game uses more turns', () => {
    const store = fakeStore()
    recordScore(store, 10, 5)
    expect(recordScore(store, 10, 7)).toEqual({ best: 5, previousBest: 5, isNewBest: false })
    expect(readBest(store, 10)).toBe(5)
  })

  it('does not call an equal score a new best', () => {
    const store = fakeStore()
    recordScore(store, 10, 5)
    expect(recordScore(store, 10, 5)).toEqual({ best: 5, previousBest: 5, isNewBest: false })
  })

  it('replaces the best when a later game uses fewer turns', () => {
    const store = fakeStore()
    recordScore(store, 10, 5)
    expect(recordScore(store, 10, 3)).toEqual({ best: 3, previousBest: 5, isNewBest: true })
  })

  it('keeps one best score per target', () => {
    const store = fakeStore()
    recordScore(store, 10, 5)
    recordScore(store, 5, 2)
    expect(readBest(store, 10)).toBe(5)
    expect(readBest(store, 5)).toBe(2)
    expect(readBest(store, 20)).toBeNull()
  })

  it('survives a reload: a new page reads what the old one stored', () => {
    const store = fakeStore()
    recordScore(store, 10, 4)
    forgetScores()
    expect(readBest(store, 10)).toBe(4)
    expect(JSON.parse(store.data[STORAGE_KEY] ?? '')).toEqual({ '10': 4 })
  })

  it('works for as long as the page is open when storage throws', () => {
    expect(readBest(brokenStore, 10)).toBeNull()
    expect(recordScore(brokenStore, 10, 6)).toEqual({ best: 6, previousBest: null, isNewBest: true })
    expect(recordScore(brokenStore, 10, 8)).toEqual({ best: 6, previousBest: 6, isNewBest: false })
  })

  it('works when there is no storage at all', () => {
    expect(recordScore(null, 10, 6).isNewBest).toBe(true)
    expect(readBest(null, 10)).toBe(6)
  })

  it('ignores damaged or foreign values in storage', () => {
    expect(readBest(fakeStore({ [STORAGE_KEY]: 'not json' }), 10)).toBeNull()
    expect(readBest(fakeStore({ [STORAGE_KEY]: '[1,2]' }), 10)).toBeNull()
    expect(readBest(fakeStore({ [STORAGE_KEY]: '{"10":"3"}' }), 10)).toBeNull()
    expect(readBest(fakeStore({ [STORAGE_KEY]: '{"10":0}' }), 10)).toBeNull()
    expect(readBest(fakeStore({ [STORAGE_KEY]: '{"10":2.5,"5":3}' }), 5)).toBe(3)
  })

  it('keeps the other targets when damaged values sit next to good ones', () => {
    const store = fakeStore({ [STORAGE_KEY]: '{"5":3,"7":"x"}' })
    recordScore(store, 10, 6)
    expect(JSON.parse(store.data[STORAGE_KEY] ?? '')).toEqual({ '5': 3, '10': 6 })
  })
})
