// The best score per target, kept on the device. Fewer turns is better.
// Storage can be missing, full or blocked (private windows, strict settings). Every access is
// wrapped, and a copy in memory keeps the best score alive for as long as the page is open.

export type ScoreStore = Pick<Storage, 'getItem' | 'setItem'>

export interface ScoreResult {
  /** The best score for this target, this game included. */
  best: number
  /** The best score before this game, or null when there was none. */
  previousBest: number | null
  isNewBest: boolean
}

export const STORAGE_KEY = 'tidslinje:rekord'

const memory = new Map<number, number>()

/** The browser's localStorage, or null when it cannot be reached. */
export function browserStore(): ScoreStore | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/** The best score for a target, or null when no game with that target has been won. */
export function readBest(store: ScoreStore | null, target: number): number | null {
  const stored = readAll(store)[String(target)]
  const remembered = memory.get(target)
  if (stored === undefined) return remembered ?? null
  return remembered === undefined ? stored : Math.min(stored, remembered)
}

/** Records a won game and says how it compares with the best score before it. */
export function recordScore(store: ScoreStore | null, target: number, turns: number): ScoreResult {
  const previousBest = readBest(store, target)
  const isNewBest = previousBest === null || turns < previousBest
  const best = isNewBest ? turns : previousBest
  if (isNewBest) {
    memory.set(target, turns)
    try {
      store?.setItem(STORAGE_KEY, JSON.stringify({ ...readAll(store), [String(target)]: turns }))
    } catch {
      // The copy in memory still holds the score.
    }
  }
  return { best, previousBest, isNewBest }
}

/** Forgets the copy in memory. For tests. */
export function forgetScores(): void {
  memory.clear()
}

/** Everything in storage that looks like a score: whole numbers of at least 1, keyed by target. */
function readAll(store: ScoreStore | null): Record<string, number> {
  const scores: Record<string, number> = {}
  try {
    const parsed: unknown = JSON.parse(store?.getItem(STORAGE_KEY) ?? 'null')
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return scores
    for (const [target, turns] of Object.entries(parsed)) {
      if (typeof turns === 'number' && Number.isInteger(turns) && turns >= 1) scores[target] = turns
    }
  } catch {
    // Unreadable or damaged storage counts as empty.
  }
  return scores
}
