// The records everyone shares (ADR 0010): the fewest turns to win and the most cards secured in one
// turn, one of each per target and judging precision. Anyone can claim one; a record is written
// only when the claim beats it, and a claim must be a game that could have been played.

import type { Database } from './db.ts'
import { normaliseName } from './names.ts'
import type { ClaimJson, ClaimResultJson, RecordJson, RecordsJson } from './types.ts'

export const MAX_TARGET = 10_000
export const MAX_TURNS = 10_000

const PRECISIONS = ['year', 'month', 'day'] as const
type Precision = (typeof PRECISIONS)[number]

/** Which records: the target and judging precision a game was played at. */
export interface RecordKey {
  target: number
  precision: Precision
}

type Kind = keyof RecordsJson

/** Each record's name in the database, and whether a higher value beats it. */
const KINDS: Record<Kind, { column: string; higherWins: boolean }> = {
  fewestTurns: { column: 'fewest_turns', higherWins: false },
  mostInTurn: { column: 'most_in_turn', higherWins: true },
}

/** The key from `?target=10&precision=year`, or null when either is missing or out of range. */
export function parseKey(target: string | undefined, precision: string | undefined): RecordKey | null {
  if (target === undefined || !/^[0-9]{1,5}$/.test(target)) return null
  const value = Number(target)
  if (!isPrecision(precision) || value < 2 || value > MAX_TARGET) return null
  return { target: value, precision }
}

/**
 * A claim as sent, checked: whole numbers in range that fit together, a known precision and a name
 * that `normaliseName` accepts. Null when anything is wrong. Fields that are not part of a claim are
 * ignored.
 */
export function parseClaim(body: unknown): ClaimJson | null {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return null
  const { target, precision, turns, mostInTurn, name } = body as Record<string, unknown>
  if (!isWholeIn(target, 2, MAX_TARGET) || !isPrecision(precision)) return null
  if (!isWholeIn(turns, 1, MAX_TURNS) || !isWholeIn(mostInTurn, 1, target - 1)) return null
  // Every card but the start card was secured in some turn, and no turn secured more than the best.
  if (target - 1 > turns * mostInTurn) return null
  const normalised = normaliseName(name)
  if (normalised === null) return null
  return { target, precision, turns, mostInTurn, name: normalised }
}

/** Both records at a target and precision. */
export async function readRecords(db: Database, key: RecordKey): Promise<RecordsJson> {
  const rows = await db.all<RecordJson & { kind: string }>(
    'SELECT kind, value, name FROM records WHERE target = ? AND precision = ?',
    [key.target, key.precision],
  )
  const find = (kind: Kind): RecordJson | null => {
    const row = rows.find((candidate) => candidate.kind === KINDS[kind].column)
    return row ? { value: row.value, name: row.name } : null
  }
  return { fewestTurns: find('fewestTurns'), mostInTurn: find('mostInTurn') }
}

/**
 * Writes the claim to each record it beats and says which it set. Each record is one conditional
 * statement, so a claim that arrives at the same moment as a better one cannot overwrite it, and a
 * tie never takes a record from its holder.
 */
export async function claimRecords(db: Database, claim: ClaimJson, now: Date): Promise<ClaimResultJson> {
  const values: Record<Kind, number> = { fewestTurns: claim.turns, mostInTurn: claim.mostInTurn }
  const set = { fewestTurns: false, mostInTurn: false }
  for (const kind of Object.keys(KINDS) as Kind[]) {
    const { column, higherWins } = KINDS[kind]
    // In the WHERE of an upsert, `excluded` is the claim and `records` the row already stored.
    const row = await db.first<{ kind: string }>(
      `INSERT INTO records (kind, target, precision, value, name, set_at) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT (kind, target, precision) DO UPDATE
         SET value = excluded.value, name = excluded.name, set_at = excluded.set_at
         WHERE excluded.value ${higherWins ? '>' : '<'} records.value
       RETURNING kind`,
      [column, claim.target, claim.precision, values[kind], claim.name, now.toISOString()],
    )
    set[kind] = row !== null
  }
  return { records: await readRecords(db, claim), set }
}

function isPrecision(value: unknown): value is Precision {
  return typeof value === 'string' && (PRECISIONS as readonly string[]).includes(value)
}

function isWholeIn(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
}
