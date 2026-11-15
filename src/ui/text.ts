// The sentences on screen that depend on a number. Norwegian bokmål.

import type { ScoreResult } from './bestScore.ts'

/** "1 runde", "6 runder". */
export function turnsText(turns: number): string {
  return turns === 1 ? '1 runde' : `${turns} runder`
}

/** What a miss on the next card would cost, shown while the player decides. */
export function riskText(pending: number): string {
  if (pending === 1) return 'Bommer du på neste kort, mister du det.'
  if (pending === 2) return 'Bommer du på neste kort, mister du begge.'
  return `Bommer du på neste kort, mister du alle ${pending}.`
}

/** What a miss did cost, naming the pending cards it took: "Du mistet A og B." */
export function lostText(lost: readonly string[]): string {
  if (lost.length === 0) return 'Du hadde ingen kort på spill.'
  return `Du mistet ${listText(lost)}.`
}

/** "A", "A og B", "A, B og C". */
export function listText(items: readonly string[]): string {
  if (items.length <= 1) return items.join('')
  return `${items.slice(0, -1).join(', ')} og ${items[items.length - 1]}`
}

/** The progress pips in words: "6 kort låst, 1 på spill, 3 igjen". */
export function progressText(locked: number, pending: number, target: number): string {
  const left = Math.max(0, target - locked - pending)
  if (left === 0 && pending === 0) return `Alle ${target} kort låst`
  const parts = [`${locked} kort låst`]
  if (pending > 0) parts.push(`${pending} på spill`)
  parts.push(`${left} igjen`)
  return parts.join(', ')
}

/** How a won game compares with the best score. */
export function resultNote(result: ScoreResult, turns: number): string {
  if (result.isNewBest) {
    return result.previousBest === null
      ? 'Ny rekord!'
      : `Ny rekord! Den forrige var ${turnsText(result.previousBest)}.`
  }
  const behind = turns - result.best
  if (behind === 0) return 'Like bra som rekorden din.'
  return behind === 1 ? 'Én runde unna rekorden din.' : `${behind} runder unna rekorden din.`
}
