import { describe, expect, it } from 'vitest'
import { nextSeed, randomSeed, seedFromSearch } from './seed.ts'

describe('seedFromSearch', () => {
  it('reads a whole number', () => {
    expect(seedFromSearch('?seed=42')).toBe(42)
    expect(seedFromSearch('?a=b&seed=0')).toBe(0)
    expect(seedFromSearch('?seed=-7')).toBe(-7)
  })

  it('gives null when there is no usable seed', () => {
    expect(seedFromSearch('')).toBeNull()
    expect(seedFromSearch('?seed=')).toBeNull()
    expect(seedFromSearch('?seed=abc')).toBeNull()
    expect(seedFromSearch('?seed=1.5')).toBeNull()
    expect(seedFromSearch('?seed=1e3')).toBeNull()
    expect(seedFromSearch('?seed=99999999999999999999')).toBeNull()
  })
})

describe('randomSeed', () => {
  it('gives a whole number from 0 up to 2^32', () => {
    expect(randomSeed(() => 0)).toBe(0)
    expect(randomSeed(() => 0.5)).toBe(2 ** 31)
    expect(randomSeed(() => 0.9999999999)).toBeLessThan(2 ** 32)
    expect(Number.isInteger(randomSeed())).toBe(true)
  })
})

describe('nextSeed', () => {
  it('never repeats the seed that was just played', () => {
    expect(nextSeed(2 ** 31, () => 0.5)).not.toBe(2 ** 31)
    expect(nextSeed(5, () => 0.5)).toBe(2 ** 31)
  })
})
