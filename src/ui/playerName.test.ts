import { describe, expect, it } from 'vitest'
import { NAME_KEY, loadName, saveName, type NameStore } from './playerName.ts'

function fakeStore(initial: Record<string, string> = {}): NameStore & { data: Record<string, string> } {
  const data = { ...initial }
  return {
    data,
    getItem: (key) => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value
    },
  }
}

const brokenStore: NameStore = {
  getItem: () => {
    throw new Error('storage is blocked')
  },
  setItem: () => {
    throw new Error('storage is blocked')
  },
}

describe('the name on the device', () => {
  it('is remembered', () => {
    const store = fakeStore()
    saveName(store, 'Kari')
    expect(store.data[NAME_KEY]).toBe('Kari')
    expect(loadName(store)).toBe('Kari')
  })

  it('is empty when none is stored, or storage is missing or blocked', () => {
    expect(loadName(fakeStore())).toBe('')
    expect(loadName(null)).toBe('')
    expect(loadName(brokenStore)).toBe('')
    expect(() => saveName(brokenStore, 'Kari')).not.toThrow()
    expect(() => saveName(null, 'Kari')).not.toThrow()
  })

  it('is empty when what is stored could not be put on a record', () => {
    expect(loadName(fakeStore({ [NAME_KEY]: 'x'.repeat(21) }))).toBe('')
    expect(loadName(fakeStore({ [NAME_KEY]: 'Ka\u200bri' }))).toBe('')
    expect(loadName(fakeStore({ [NAME_KEY]: '   ' }))).toBe('')
  })
})
