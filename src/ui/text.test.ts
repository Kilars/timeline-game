import { describe, expect, it } from 'vitest'
import { lostText, progressText, resultNote, riskText, turnsText } from './text.ts'

describe('text', () => {
  it('counts turns in singular and plural', () => {
    expect(turnsText(1)).toBe('1 runde')
    expect(turnsText(6)).toBe('6 runder')
  })

  it('says what a miss would cost', () => {
    expect(riskText(1)).toBe('Bommer du på neste kort, mister du det.')
    expect(riskText(2)).toBe('Bommer du på neste kort, mister du begge.')
    expect(riskText(4)).toBe('Bommer du på neste kort, mister du alle 4.')
  })

  it('says what a miss did cost', () => {
    expect(lostText([])).toBe('Du hadde ingen kort på spill.')
    expect(lostText(['Slaget ved Marathon'])).toBe('Du mistet Slaget ved Marathon.')
    expect(lostText(['A', 'B'])).toBe('Du mistet A og B.')
    expect(lostText(['A', 'B', 'C'])).toBe('Du mistet A, B og C.')
  })

  it('describes the progress pips', () => {
    expect(progressText(6, 1, 10)).toBe('6 kort låst, 1 på spill, 3 igjen')
    expect(progressText(6, 0, 10)).toBe('6 kort låst, 4 igjen')
    expect(progressText(10, 0, 10)).toBe('Alle 10 kort låst')
  })

  it('compares a result with the best score', () => {
    expect(resultNote({ best: 6, previousBest: null, isNewBest: true }, 6)).toBe('Ny rekord!')
    expect(resultNote({ best: 4, previousBest: 6, isNewBest: true }, 4)).toBe(
      'Ny rekord! Den forrige var 6 runder.',
    )
    expect(resultNote({ best: 5, previousBest: 5, isNewBest: false }, 5)).toBe(
      'Like bra som rekorden din.',
    )
    expect(resultNote({ best: 5, previousBest: 5, isNewBest: false }, 6)).toBe(
      'Én runde unna rekorden din.',
    )
    expect(resultNote({ best: 5, previousBest: 5, isNewBest: false }, 8)).toBe(
      '3 runder unna rekorden din.',
    )
  })
})
