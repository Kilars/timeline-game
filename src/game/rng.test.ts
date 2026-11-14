import { describe, expect, test } from 'vitest'
import { roll, seedRng, shuffle } from './rng.ts'

/** mulberry32 as it is usually published, with the state in a closure. */
function reference(seed: number): () => number {
  let a = seed
  return () => {
    let t = (a += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function rolls(seed: number, count: number): number[] {
  const values: number[] = []
  let rng = seedRng(seed)
  for (let i = 0; i < count; i++) {
    const step = roll(rng)
    values.push(step.value)
    rng = step.rng
  }
  return values
}

describe('roll', () => {
  test.each([0, 1, 42, 123456789, -7, 2 ** 31, 2 ** 32 - 1])(
    'gives the mulberry32 sequence for seed %d',
    (seed) => {
      const next = reference(seed)
      expect(rolls(seed, 1000)).toEqual(Array.from({ length: 1000 }, () => next()))
    },
  )

  test('gives numbers from 0 up to, not including, 1', () => {
    for (const value of rolls(7, 10_000)) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
    }
  })

  test('keeps its state as a whole number of 32 bits', () => {
    let rng = seedRng(-1)
    for (let i = 0; i < 1000; i++) {
      expect(Number.isInteger(rng)).toBe(true)
      expect(rng).toBeGreaterThanOrEqual(0)
      expect(rng).toBeLessThan(2 ** 32)
      rng = roll(rng).rng
    }
  })

  test('is a pure function of the state', () => {
    expect(roll(99)).toEqual(roll(99))
  })

  test('spreads its values evenly', () => {
    const values = rolls(3, 10_000)
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length
    expect(mean).toBeGreaterThan(0.48)
    expect(mean).toBeLessThan(0.52)
  })
})

describe('shuffle', () => {
  const items = Array.from({ length: 50 }, (_, i) => i)

  test('returns every item once and leaves the input alone', () => {
    const before = [...items]
    const result = shuffle(items, seedRng(5))
    expect(items).toEqual(before)
    expect(result.items).not.toBe(items)
    expect([...result.items].sort((a, b) => a - b)).toEqual(items)
    expect(result.items).not.toEqual(items)
  })

  test('gives the same order for the same state and another order for another state', () => {
    expect(shuffle(items, seedRng(5))).toEqual(shuffle(items, seedRng(5)))
    expect(shuffle(items, seedRng(5)).items).not.toEqual(shuffle(items, seedRng(6)).items)
  })

  test('returns the generator state after the shuffle', () => {
    // One roll for each item but the first.
    let rng = seedRng(5)
    for (let i = 0; i < items.length - 1; i++) rng = roll(rng).rng
    expect(shuffle(items, seedRng(5)).rng).toBe(rng)
  })

  test('handles empty and one-item lists', () => {
    expect(shuffle([], 5)).toEqual({ items: [], rng: 5 })
    expect(shuffle(['a'], 5)).toEqual({ items: ['a'], rng: 5 })
  })

  test('can put every item in every position', () => {
    const seen = new Set<string>()
    for (let seed = 0; seed < 200; seed++) seen.add(shuffle(['a', 'b', 'c'], seedRng(seed)).items.join(''))
    expect([...seen].sort()).toEqual(['abc', 'acb', 'bac', 'bca', 'cab', 'cba'])
  })
})
