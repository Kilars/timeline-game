import { useEffect, useState } from 'react'
import { fixtureDecks } from '../fixtures/cards.ts'
import type { Deck } from '../ui/setup.ts'
import { fetchDecks } from './api.ts'

/** How long to wait for the API before saying it cannot be reached. */
export const API_TIMEOUT_MS = 15_000

export type DecksState =
  | { status: 'loading' }
  | { status: 'ready'; decks: readonly Deck[] }
  | { status: 'failed' }

type Outcome = { decks: readonly Deck[] } | { failed: true }

const fixture: DecksState = { status: 'ready', decks: fixtureDecks }

/**
 * The decks to offer on the start screen. With an API address, they are fetched from the API once,
 * and again on `retry` after a failure. With none (null), they are the bundled fixture decks, at once.
 */
export function useDecks(apiUrl: string | null): { state: DecksState; retry: () => void } {
  const [attempt, setAttempt] = useState(0)
  /** What the fetch for an attempt ended with. A newer attempt is loading until its own ends. */
  const [ended, setEnded] = useState<{ attempt: number; outcome: Outcome } | null>(null)

  useEffect(() => {
    if (apiUrl === null) return
    let current = true
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS)
    const end = (outcome: Outcome) => {
      if (current) setEnded({ attempt, outcome })
    }
    fetchDecks(apiUrl, { signal: controller.signal })
      .then((decks) => end({ decks }))
      .catch((error: unknown) => {
        // A fetch stopped because the screen moved on is not a failure.
        if (!current) return
        console.warn('Could not fetch the decks', error)
        end({ failed: true })
      })
      .finally(() => clearTimeout(timer))
    return () => {
      current = false
      clearTimeout(timer)
      controller.abort()
    }
  }, [apiUrl, attempt])

  const retry = () => setAttempt((count) => count + 1)
  if (apiUrl === null) return { state: fixture, retry }
  if (ended === null || ended.attempt !== attempt) return { state: { status: 'loading' }, retry }
  const { outcome } = ended
  return { state: 'decks' in outcome ? { status: 'ready', decks: outcome.decks } : { status: 'failed' }, retry }
}
