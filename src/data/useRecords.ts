import { useEffect, useState } from 'react'
import type { GameState } from '../game/index.ts'
import { ApiError } from './api.ts'
import {
  beatenKinds,
  fetchRecords,
  gameNumbers,
  holds,
  postClaim,
  valueFor,
  type RecordKind,
  type RecordsJson,
} from './records.ts'
import { API_TIMEOUT_MS } from './useDecks.ts'

/** What saving a claim has come to. */
export type ClaimState =
  | { status: 'idle' }
  | { status: 'saving' }
  /** `refused`: the server said no to the claim itself, most likely the name. Sending it again will not help. */
  | { status: 'failed'; refused: boolean }
  /** `won`: the records that are now this game's. `lost`: beaten here, but someone got there first. */
  | { status: 'saved'; won: RecordKind[]; lost: RecordKind[] }

export type RecordsState =
  /** No API, or no won game. */
  | { status: 'off' }
  | { status: 'loading' }
  | { status: 'failed' }
  | {
      status: 'ready'
      records: RecordsJson
      /** The records this game beat when they were fetched. */
      beaten: RecordKind[]
      /** Only a game of public history decks alone can set a record (ADR 0010). */
      eligible: boolean
      claim: ClaimState
    }

export type ReadyRecords = Extract<RecordsState, { status: 'ready' }>

/** True when the game beat a record it may set: the screen then asks for a name. */
export function canClaim(state: RecordsState): state is ReadyRecords {
  return state.status === 'ready' && state.eligible && state.beaten.length > 0
}

interface Fetched {
  game: GameState
  attempt: number
  outcome: { records: RecordsJson } | { failed: true }
}

interface Claimed {
  game: GameState
  state: ClaimState
  /** The records as the claim's answer gave them. */
  records?: RecordsJson
}

/**
 * The records at a won game's target and precision, fetched as soon as the game is won, and a way to
 * claim the ones it beats. `game` is the won game, or null; with no API address (null) it stays off.
 * `eligible` says whether the game's decks let it set a record (`recordsAllowed` in ui/setup.ts).
 */
export function useRecords(
  apiUrl: string | null,
  game: GameState | null,
  eligible: boolean,
): { state: RecordsState; claim: (name: string) => void; retry: () => void } {
  const [attempt, setAttempt] = useState(0)
  const [fetched, setFetched] = useState<Fetched | null>(null)
  const [claimed, setClaimed] = useState<Claimed | null>(null)
  const retry = () => setAttempt((count) => count + 1)
  const none = { claim: () => {}, retry }

  useEffect(() => {
    if (apiUrl === null || game === null) return
    let current = true
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS)
    const end = (outcome: Fetched['outcome']) => {
      if (current) setFetched({ game, attempt, outcome })
    }
    fetchRecords(apiUrl, game.config, { signal: controller.signal })
      .then((records) => end({ records }))
      .catch((error: unknown) => {
        // A fetch stopped because the game moved on is not a failure.
        if (!current) return
        console.warn('Could not fetch the records', error)
        end({ failed: true })
      })
      .finally(() => clearTimeout(timer))
    return () => {
      current = false
      clearTimeout(timer)
      controller.abort()
    }
  }, [apiUrl, game, attempt])

  if (apiUrl === null || game === null) return { state: { status: 'off' }, ...none }
  if (fetched === null || fetched.game !== game || fetched.attempt !== attempt) {
    return { state: { status: 'loading' }, ...none }
  }
  if ('failed' in fetched.outcome) return { state: { status: 'failed' }, ...none }

  const numbers = gameNumbers(game)
  const beaten = beatenKinds(fetched.outcome.records, numbers)
  const mine = claimed?.game === game ? claimed : null
  const claimState: ClaimState = mine?.state ?? { status: 'idle' }

  function claim(name: string) {
    if (apiUrl === null || game === null || !eligible || beaten.length === 0) return
    if (claimState.status === 'saving' || claimState.status === 'saved') return
    const saving = game
    setClaimed({ game: saving, state: { status: 'saving' } })
    // A save that hangs counts as failed, so "Lagre" can be tapped again.
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS)
    postClaim(apiUrl, { ...numbers, name }, { signal: controller.signal })
      .then(({ records, set }) => {
        // A save sent again after its answer was lost finds the record already its own.
        const won = beaten.filter((kind) => set[kind] || holds(records[kind], valueFor(kind, numbers), name))
        const lost = beaten.filter((kind) => !won.includes(kind))
        setClaimed({ game: saving, state: { status: 'saved', won, lost }, records })
      })
      .catch((error: unknown) => {
        console.warn('Could not save the record', error)
        const refused = error instanceof ApiError && error.status === 400
        setClaimed({ game: saving, state: { status: 'failed', refused } })
      })
      .finally(() => clearTimeout(timer))
  }

  return {
    state: {
      status: 'ready',
      records: mine?.records ?? fetched.outcome.records,
      beaten,
      eligible,
      claim: claimState,
    },
    claim,
    retry,
  }
}
