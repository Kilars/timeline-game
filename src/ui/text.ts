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
      ? 'Nytt personlig beste!'
      : `Nytt personlig beste! Det forrige var ${turnsText(result.previousBest)}.`
  }
  const behind = turns - result.best
  if (behind === 0) return 'Like bra som ditt beste.'
  return behind === 1 ? 'Én runde unna ditt beste.' : `${behind} runder unna ditt beste.`
}

/** A space that keeps "40" and "%" on one line. */
const NO_BREAK = '\u00a0'

/** What the mix slider is set to, for the ticked kinds of deck: "40 % personlige kort". */
export function mixText(kind: 'history' | 'personal' | 'both' | 'none', percent: number): string {
  if (kind === 'history') return 'Bare historie'
  if (kind === 'personal') return 'Bare personlige kort'
  return `${percent}${NO_BREAK}% personlige kort`
}

/** What a tie means at the judging precision. */
export function precisionNote(precision: 'year' | 'month' | 'day'): string {
  const unit = { year: 'år', month: 'måned', day: 'dag' }[precision]
  return `Kort fra samme ${unit} kan ligge i hvilken som helst rekkefølge.`
}

/** "1 kort", "6 kort". */
export function cardsText(cards: number): string {
  return `${cards} kort`
}

type RecordKind = 'fewestTurns' | 'mostInTurn'

/** The name of a record, as it stands on its own: "Færrest runder". */
export const RECORD_NAMES: Record<RecordKind, string> = {
  fewestTurns: 'Færrest runder',
  mostInTurn: 'Flest kort i én runde',
}

/** The name of a record inside a sentence: "færrest runder". */
function recordName(kind: RecordKind): string {
  return RECORD_NAMES[kind].toLowerCase()
}

/** A record's value with its unit: "3 runder", "6 kort". */
export function recordValueText(kind: RecordKind, value: number): string {
  return kind === 'fewestTurns' ? turnsText(value) : cardsText(value)
}

/** What the records are kept for: "10 kort · nøyaktighet år". */
export function recordKeyText(target: number, precision: 'year' | 'month' | 'day'): string {
  const unit = { year: 'år', month: 'måned', day: 'dag' }[precision]
  return `${target} kort · nøyaktighet ${unit}`
}

/** The game beat these records and can claim them. */
export function beatenText(beaten: readonly RecordKind[]): string {
  const [only] = beaten
  if (beaten.length === 1 && only) return `Ny rekord for alle: ${recordName(only)}!`
  return 'To nye rekorder for alle!'
}

/** After a save: which records are now the player's, and which someone else got first. */
export function savedText(won: readonly RecordKind[], lost: readonly RecordKind[]): string {
  if (lost.length === 0) return won.length === 1 ? 'Rekorden er din.' : 'Rekordene er dine.'
  const [kept] = won
  if (kept) return `Rekorden for ${recordName(kept)} er din. Noen rakk det før deg på den andre.`
  return lost.length === 1 ? 'Noen rakk det før deg. Rekorden står.' : 'Noen rakk det før deg. Rekordene står.'
}

/** The values a game claims, under what it beat: "Færrest runder: 6 · Flest kort i én runde: 2". */
export function claimedValuesText(values: readonly { kind: RecordKind; value: number }[]): string {
  return values.map(({ kind, value }) => `${RECORD_NAMES[kind]}: ${recordValueText(kind, value)}`).join(' · ')
}

/** A save that did not go through. */
export function saveFailedText(count: number, refused: boolean): string {
  if (refused) return 'Navnet ble ikke godtatt. Prøv et annet.'
  return count === 1 ? 'Fikk ikke lagret rekorden. Prøv igjen.' : 'Fikk ikke lagret rekordene. Prøv igjen.'
}

/** The game tied these records, and whether they can be beaten at all. */
export function tiedText(tied: readonly RecordKind[], atLimit: boolean): string {
  const [only] = tied
  const sentence =
    tied.length === 1 && only ? `Du tangerte rekorden for ${recordName(only)}.` : 'Du tangerte begge rekordene.'
  if (!atLimit) return `${sentence} Den som setter en rekord først, beholder den.`
  return `${sentence} ${tied.length === 1 ? 'Den' : 'De'} kan ikke slås.`
}
