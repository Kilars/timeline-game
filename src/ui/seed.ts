// Where a game's seed comes from: the address when it has `?seed=<integer>`, otherwise chance.
// Randomness lives here, in the UI layer. The rules in src/game/ only ever see the seed.

/** The seed in a query string such as "?seed=42", or null when there is none or it is not a whole number. */
export function seedFromSearch(search: string): number | null {
  const value = new URLSearchParams(search).get('seed')
  if (value === null || !/^-?\d+$/.test(value)) return null
  const seed = Number(value)
  return Number.isSafeInteger(seed) ? seed : null
}

/** A seed picked by chance: a whole number from 0 up to, but not including, 2^32. */
export function randomSeed(random: () => number = Math.random): number {
  return Math.floor(random() * 2 ** 32)
}

/** A new seed by chance that is not the one just played. */
export function nextSeed(previous: number, random: () => number = Math.random): number {
  const seed = randomSeed(random)
  return seed === previous ? (seed + 1) % 2 ** 32 : seed
}
