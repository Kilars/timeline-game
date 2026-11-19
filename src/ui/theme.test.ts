import { describe, expect, it } from 'vitest'
import css from '../theme.css?raw'
import { THEME_KEY, applyTheme, loadTheme, saveTheme, type ThemeStore } from './theme.ts'

function fakeStore(initial: Record<string, string> = {}): ThemeStore & { data: Record<string, string> } {
  const data = { ...initial }
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value
    },
  }
}

const brokenStore: ThemeStore = {
  getItem: () => {
    throw new Error('storage is blocked')
  },
  setItem: () => {
    throw new Error('storage is blocked')
  },
}

describe('the light or dark choice', () => {
  it('is remembered on the device', () => {
    const store = fakeStore()
    saveTheme(store, 'mork')
    expect(store.data[THEME_KEY]).toBe('mork')
    expect(loadTheme(store)).toBe('mork')
    saveTheme(store, 'lys')
    expect(loadTheme(store)).toBe('lys')
  })

  it('is auto when none is stored, when it is damaged, or when storage is missing or blocked', () => {
    expect(loadTheme(fakeStore())).toBe('auto')
    expect(loadTheme(fakeStore({ [THEME_KEY]: 'dark' }))).toBe('auto')
    expect(loadTheme(null)).toBe('auto')
    expect(loadTheme(brokenStore)).toBe('auto')
    expect(() => saveTheme(brokenStore, 'lys')).not.toThrow()
  })

  it('is set on the root element, and cleared for auto', () => {
    const root = { dataset: {} as DOMStringMap } as HTMLElement
    applyTheme('mork', root)
    expect(root.dataset.tema).toBe('mork')
    applyTheme('lys', root)
    expect(root.dataset.tema).toBe('lys')
    applyTheme('auto', root)
    expect(root.dataset).toEqual({})
  })
})

describe('src/theme.css', () => {
  /** The declarations of the first rule whose selector is `selector`, as `name: value` lines. */
  function declarations(selector: string): string[] {
    const start = css.indexOf(`${selector} {`)
    expect(start, selector).toBeGreaterThanOrEqual(0)
    const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start))
    return body
      .split(';')
      .map((line) => line.replace(/\s+/g, ' ').trim())
      .filter((line) => line !== '')
  }

  it('gives a dark device and the choice "Mørk" the same night edition', () => {
    const onDarkDevice = declarations(":root:not([data-tema='lys'])")
    expect(onDarkDevice.length).toBeGreaterThan(10)
    expect(declarations(":root[data-tema='mork']")).toEqual(onDarkDevice)
  })

  it('keeps "Lys" out of the dark device block, inside the media query', () => {
    const media = css.indexOf('@media (prefers-color-scheme: dark)')
    expect(css.indexOf(":root:not([data-tema='lys'])")).toBeGreaterThan(media)
  })
})
