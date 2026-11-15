import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SETTINGS,
  SETTINGS_KEY,
  loadSettings,
  parseSettings,
  saveSettings,
  type Settings,
  type SettingsStore,
} from './settings.ts'

function fakeStore(initial: Record<string, string> = {}): SettingsStore & { data: Record<string, string> } {
  const data = { ...initial }
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value
    },
  }
}

const brokenStore: SettingsStore = {
  getItem: () => {
    throw new Error('storage is blocked')
  },
  setItem: () => {
    throw new Error('storage is blocked')
  },
}

const chosen: Settings = { unticked: ['historie'], personalPercent: 70, target: 14, precision: 'day' }

describe('settings', () => {
  it('defaults to every deck ticked, half personal, 10 cards and judging by year', () => {
    expect(DEFAULT_SETTINGS).toEqual({ unticked: [], personalPercent: 50, target: 10, precision: 'year' })
  })

  it('remembers the choices on the device', () => {
    const store = fakeStore()
    saveSettings(store, chosen)
    expect(JSON.parse(store.data[SETTINGS_KEY] ?? '')).toEqual(chosen)
    expect(loadSettings(store)).toEqual(chosen)
  })

  it('gives the defaults when nothing is stored', () => {
    expect(loadSettings(fakeStore())).toEqual(DEFAULT_SETTINGS)
    expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS)
  })

  it('gives the defaults and saves nothing when storage is blocked', () => {
    expect(loadSettings(brokenStore)).toEqual(DEFAULT_SETTINGS)
    expect(() => saveSettings(brokenStore, chosen)).not.toThrow()
    expect(() => saveSettings(null, chosen)).not.toThrow()
  })

  it('treats unreadable storage as empty', () => {
    for (const raw of ['', '{', 'null', '42', '"text"', '[1,2]']) {
      expect(parseSettings(raw), raw).toEqual(DEFAULT_SETTINGS)
    }
  })

  it('falls back field by field when a stored value is damaged', () => {
    const parse = (value: object) => parseSettings(JSON.stringify(value))
    expect(parse({ ...chosen, target: 1 })).toEqual({ ...chosen, target: 10 })
    expect(parse({ ...chosen, target: 7.5 })).toEqual({ ...chosen, target: 10 })
    expect(parse({ ...chosen, target: '12' })).toEqual({ ...chosen, target: 10 })
    expect(parse({ ...chosen, target: 1e9 })).toEqual({ ...chosen, target: 10 })
    expect(parse({ ...chosen, precision: 'week' })).toEqual({ ...chosen, precision: 'year' })
    expect(parse({ ...chosen, personalPercent: -10 })).toEqual({ ...chosen, personalPercent: 50 })
    expect(parse({ ...chosen, personalPercent: 101 })).toEqual({ ...chosen, personalPercent: 50 })
    expect(parse({ ...chosen, personalPercent: 'all' })).toEqual({ ...chosen, personalPercent: 50 })
    expect(parse({ ...chosen, unticked: 'historie' })).toEqual({ ...chosen, unticked: [] })
  })

  it('snaps the mix to its steps of 10 and drops odd deck ids', () => {
    const parse = (value: object) => parseSettings(JSON.stringify(value))
    expect(parse({ personalPercent: 44 }).personalPercent).toBe(40)
    expect(parse({ personalPercent: 46 }).personalPercent).toBe(50)
    expect(parse({ personalPercent: 0 }).personalPercent).toBe(0)
    expect(parse({ personalPercent: 100 }).personalPercent).toBe(100)
    expect(parse({ unticked: ['a', 3, null, 'a', 'b'] }).unticked).toEqual(['a', 'b'])
  })

  it('keeps every precision', () => {
    for (const precision of ['year', 'month', 'day'] as const) {
      expect(parseSettings(JSON.stringify({ precision })).precision).toBe(precision)
    }
  })
})
