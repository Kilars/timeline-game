import { describe, expect, it } from 'vitest'
import { defaultOrigins, originsFrom, portFrom } from './config.ts'

describe('originsFrom', () => {
  it('allows the live site and the local client when nothing is set', () => {
    expect(originsFrom(undefined)).toEqual(defaultOrigins)
    expect(originsFrom('  ')).toEqual(defaultOrigins)
    expect(defaultOrigins).toContain('https://kilars.github.io')
    expect(defaultOrigins).toContain('http://localhost:5173')
  })

  it('reads a comma-separated list and drops spaces and trailing slashes', () => {
    expect(originsFrom(' https://a.example/, http://localhost:3000 ,')).toEqual([
      'https://a.example',
      'http://localhost:3000',
    ])
  })
})

describe('portFrom', () => {
  it('is 8787 when nothing is set', () => {
    expect(portFrom(undefined)).toBe(8787)
    expect(portFrom('')).toBe(8787)
  })

  it('reads a port and refuses anything else', () => {
    expect(portFrom('9000')).toBe(9000)
    expect(() => portFrom('abc')).toThrow(/API_PORT/)
    expect(() => portFrom('70000')).toThrow(/API_PORT/)
  })
})
