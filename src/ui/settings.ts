// The choices on the start screen, remembered on the device so the next visit starts where the last
// one ended. Storage can be missing, full or blocked: every access is wrapped, and anything unreadable
// falls back to the defaults. Within a visit the choices live in the app's state, so blocked storage
// only means they are forgotten when the page closes.

import { DEFAULT_CONFIG, type Precision } from '../game/index.ts'
import { MIN_TARGET, MIX_STEP } from './setup.ts'

export interface Settings {
  /**
   * The decks the player has unticked, by id. Every other deck is in play, so a deck that is new to
   * the device (one opened by a code, say) starts ticked.
   */
  unticked: string[]
  /** The share of personal cards in percent: 0 to 100 in steps of `MIX_STEP`. */
  personalPercent: number
  /** The chosen target. The bounds that depend on the decks are applied when the game starts. */
  target: number
  precision: Precision
}

export const DEFAULT_SETTINGS: Settings = {
  unticked: [],
  personalPercent: Math.round(DEFAULT_CONFIG.personalShare * 100),
  target: DEFAULT_CONFIG.target,
  precision: DEFAULT_CONFIG.precision,
}

/** The part of `localStorage` used here, so tests can pass a stand-in. */
export type SettingsStore = Pick<Storage, 'getItem' | 'setItem'>

export const SETTINGS_KEY = 'tidslinje:innstillinger'

const PRECISIONS: readonly Precision[] = ['year', 'month', 'day']

/** The largest target that is remembered. Higher stored values are taken as damage. */
const MAX_STORED_TARGET = 10_000

/** Reads stored choices. Each field that is missing or damaged falls back to its default on its own. */
export function parseSettings(raw: string | null): Settings {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw ?? 'null')
  } catch {
    return DEFAULT_SETTINGS
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return DEFAULT_SETTINGS
  const value = parsed as Record<string, unknown>

  const settings = { ...DEFAULT_SETTINGS }
  if (Array.isArray(value.unticked)) {
    const ids = value.unticked.filter((id): id is string => typeof id === 'string')
    settings.unticked = [...new Set(ids)]
  }
  const percent = value.personalPercent
  if (typeof percent === 'number' && percent >= 0 && percent <= 100) {
    settings.personalPercent = Math.round(percent / MIX_STEP) * MIX_STEP
  }
  const target = value.target
  if (Number.isInteger(target) && Number(target) >= MIN_TARGET && Number(target) <= MAX_STORED_TARGET) {
    settings.target = Number(target)
  }
  const precision = PRECISIONS.find((name) => name === value.precision)
  if (precision) settings.precision = precision
  return settings
}

/** The remembered choices, or the defaults when there are none or storage cannot be read. */
export function loadSettings(store: SettingsStore | null): Settings {
  try {
    return parseSettings(store?.getItem(SETTINGS_KEY) ?? null)
  } catch {
    return DEFAULT_SETTINGS
  }
}

/** Remembers the choices. Does nothing when storage is blocked or full. */
export function saveSettings(store: SettingsStore | null, settings: Settings): void {
  try {
    store?.setItem(SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    // The choices stay in the app's state for this visit.
  }
}
