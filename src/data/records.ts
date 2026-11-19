// The records everyone shares (ADR 0010), read from and claimed at the API (api/src/records.ts).
// What comes back is checked before it reaches the screen, as in api.ts.

import type { ClaimJson, ClaimResultJson, RecordJson, RecordsJson } from '../../api/src/types.ts'
import type { GameState, Precision } from '../game/index.ts'
import { ApiError, field, isObject, requestJson, type FetchOptions } from './api.ts'

export type { ClaimJson, RecordJson, RecordsJson }

export type RecordKind = keyof RecordsJson

export const RECORD_KINDS: readonly RecordKind[] = ['fewestTurns', 'mostInTurn']

/** The numbers a won game claims records with. */
export interface GameNumbers {
  target: number
  precision: Precision
  turns: number
  mostInTurn: number
}

/** How a game's number stands against a record. */
export type Standing = 'beaten' | 'tied' | 'behind'

/** The numbers of a game, for the records at its target and precision. */
export function gameNumbers(game: GameState): GameNumbers {
  return {
    target: game.config.target,
    precision: game.config.precision,
    turns: game.player.turnsUsed,
    mostInTurn: game.player.mostInTurn,
  }
}

/** The game's own value for a record. */
export function valueFor(kind: RecordKind, numbers: GameNumbers): number {
  return kind === 'fewestTurns' ? numbers.turns : numbers.mostInTurn
}

/** Whether a game beats, ties or is behind a record. A record nobody holds yet is beaten by any win. */
export function standing(kind: RecordKind, record: RecordJson | null, numbers: GameNumbers): Standing {
  if (record === null) return 'beaten'
  const mine = valueFor(kind, numbers)
  if (mine === record.value) return 'tied'
  const better = kind === 'fewestTurns' ? mine < record.value : mine > record.value
  return better ? 'beaten' : 'behind'
}

/** The records this game beats. */
export function beatenKinds(records: RecordsJson, numbers: GameNumbers): RecordKind[] {
  return RECORD_KINDS.filter((kind) => standing(kind, records[kind], numbers) === 'beaten')
}

/** True when nobody can beat this value: 1 turn, or every card but the start card in one turn. */
export function atLimit(kind: RecordKind, value: number, target: number): boolean {
  return kind === 'fewestTurns' ? value <= 1 : value >= target - 1
}

/** The records at a target and precision. Throws `ApiError` when they cannot be had. */
export async function fetchRecords(
  apiUrl: string,
  key: { target: number; precision: Precision },
  options: FetchOptions = {},
): Promise<RecordsJson> {
  const query = new URLSearchParams({ target: String(key.target), precision: key.precision })
  const json = await requestJson(`${apiUrl}/records?${query.toString()}`, options)
  return parseRecords(field(json, 'records'))
}

/** Claims the records a game beats. Throws `ApiError` when the claim cannot be sent or is refused. */
export async function postClaim(
  apiUrl: string,
  claim: ClaimJson,
  options: FetchOptions = {},
): Promise<ClaimResultJson> {
  const json = await requestJson(`${apiUrl}/records`, options, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(claim),
  })
  const set = field(json, 'set')
  const fewestTurns = field(set, 'fewestTurns')
  const mostInTurn = field(set, 'mostInTurn')
  if (typeof fewestTurns !== 'boolean' || typeof mostInTurn !== 'boolean') {
    throw new ApiError('The claim answer has no "set" flags')
  }
  return { records: parseRecords(field(json, 'records')), set: { fewestTurns, mostInTurn } }
}

/**
 * Whether the stored record is this claim's own: the same value and name. A save whose answer was
 * lost and is sent again is told that nothing was set; this tells it that the record is already its.
 */
export function holds(record: RecordJson | null, value: number, name: string): boolean {
  return record !== null && record.value === value && record.name === name
}

export function parseRecords(json: unknown): RecordsJson {
  if (!isObject(json)) throw new ApiError('The answer has no "records"')
  return {
    fewestTurns: parseRecord(field(json, 'fewestTurns'), 'fewestTurns'),
    mostInTurn: parseRecord(field(json, 'mostInTurn'), 'mostInTurn'),
  }
}

function parseRecord(json: unknown, kind: RecordKind): RecordJson | null {
  if (json === null) return null
  const value = field(json, 'value')
  const name = field(json, 'name')
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || typeof name !== 'string' || name === '') {
    throw new ApiError(`The ${kind} record is not a record: ${JSON.stringify(json)}`)
  }
  return { value, name }
}
