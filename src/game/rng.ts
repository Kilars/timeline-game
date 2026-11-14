// Seeded random numbers: the mulberry32 generator and a Fisher-Yates shuffle.
// The generator's state is a single 32-bit integer, so it can live in the game state as plain data.

export interface Roll {
  /** A number from 0 (included) to 1 (excluded). */
  value: number
  /** The generator state to use for the next roll. */
  rng: number
}

/** Turns a seed into a generator state. */
export function seedRng(seed: number): number {
  return seed >>> 0
}

/** One step of mulberry32. */
export function roll(rng: number): Roll {
  const next = (rng + 0x6d2b79f5) >>> 0
  let t = Math.imul(next ^ (next >>> 15), next | 1)
  t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t
  return { value: ((t ^ (t >>> 14)) >>> 0) / 4294967296, rng: next }
}

/** Returns a shuffled copy of `items` and the generator state after the shuffle. */
export function shuffle<T>(items: readonly T[], rng: number): { items: T[]; rng: number } {
  const result = [...items]
  let state = rng
  for (let i = result.length - 1; i > 0; i--) {
    const step = roll(state)
    state = step.rng
    const j = Math.floor(step.value * (i + 1))
    const a = result[i] as T
    result[i] = result[j] as T
    result[j] = a
  }
  return { items: result, rng: state }
}
