import { describe, expect, it } from 'vitest'
import {
  beatenText,
  cardsText,
  claimedValuesText,
  lostText,
  mixText,
  precisionNote,
  progressText,
  recordKeyText,
  recordValueText,
  resultNote,
  riskText,
  saveFailedText,
  savedText,
  tiedText,
  turnsText,
} from './text.ts'

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
    expect(resultNote({ best: 6, previousBest: null, isNewBest: true }, 6)).toBe('Nytt personlig beste!')
    expect(resultNote({ best: 4, previousBest: 6, isNewBest: true }, 4)).toBe(
      'Nytt personlig beste! Det forrige var 6 runder.',
    )
    expect(resultNote({ best: 5, previousBest: 5, isNewBest: false }, 5)).toBe(
      'Like bra som ditt beste.',
    )
    expect(resultNote({ best: 5, previousBest: 5, isNewBest: false }, 6)).toBe(
      'Én runde unna ditt beste.',
    )
    expect(resultNote({ best: 5, previousBest: 5, isNewBest: false }, 8)).toBe(
      '3 runder unna ditt beste.',
    )
  })
})

describe('start screen text', () => {
  it('says how the mix is set, or that there is nothing to mix', () => {
    expect(mixText('both', 40)).toBe('40\u00a0% personlige kort')
    expect(mixText('none', 0)).toBe('0\u00a0% personlige kort')
    expect(mixText('history', 40)).toBe('Bare historie')
    expect(mixText('personal', 40)).toBe('Bare personlige kort')
  })

  it('says what a tie is at each precision', () => {
    expect(precisionNote('year')).toBe('Kort fra samme år kan ligge i hvilken som helst rekkefølge.')
    expect(precisionNote('month')).toBe('Kort fra samme måned kan ligge i hvilken som helst rekkefølge.')
    expect(precisionNote('day')).toBe('Kort fra samme dag kan ligge i hvilken som helst rekkefølge.')
  })
})

describe('records text', () => {
  it('gives a record its unit', () => {
    expect(recordValueText('fewestTurns', 1)).toBe('1 runde')
    expect(recordValueText('fewestTurns', 4)).toBe('4 runder')
    expect(recordValueText('mostInTurn', 1)).toBe('1 kort')
    expect(cardsText(6)).toBe('6 kort')
  })

  it('names the target and precision the records are for', () => {
    expect(recordKeyText(10, 'year')).toBe('10 kort · nøyaktighet år')
    expect(recordKeyText(25, 'day')).toBe('25 kort · nøyaktighet dag')
  })

  it('says which records were beaten', () => {
    expect(beatenText(['fewestTurns'])).toBe('Ny rekord for alle: færrest runder!')
    expect(beatenText(['mostInTurn'])).toBe('Ny rekord for alle: flest kort i én runde!')
    expect(beatenText(['fewestTurns', 'mostInTurn'])).toBe('To nye rekorder for alle!')
  })

  it('says what a save came to', () => {
    expect(savedText(['fewestTurns'], [])).toBe('Rekorden er din.')
    expect(savedText(['fewestTurns', 'mostInTurn'], [])).toBe('Rekordene er dine.')
    expect(savedText(['mostInTurn'], ['fewestTurns'])).toBe(
      'Rekorden for flest kort i én runde er din. Noen rakk det før deg på den andre.',
    )
    expect(savedText([], ['fewestTurns'])).toBe('Noen rakk det før deg. Rekorden står.')
    expect(savedText([], ['fewestTurns', 'mostInTurn'])).toBe('Noen rakk det før deg. Rekordene står.')
  })

  it('names the numbers a game claims, and says when a save failed', () => {
    expect(claimedValuesText([{ kind: 'fewestTurns', value: 6 }, { kind: 'mostInTurn', value: 2 }])).toBe(
      'Færrest runder: 6 runder · Flest kort i én runde: 2 kort',
    )
    expect(saveFailedText(1, false)).toBe('Fikk ikke lagret rekorden. Prøv igjen.')
    expect(saveFailedText(2, false)).toBe('Fikk ikke lagret rekordene. Prøv igjen.')
    expect(saveFailedText(2, true)).toBe('Navnet ble ikke godtatt. Prøv et annet.')
  })

  it('says a tie keeps the old holder, or that the record cannot be beaten', () => {
    expect(tiedText(['fewestTurns'], false)).toBe(
      'Du tangerte rekorden for færrest runder. Den som setter en rekord først, beholder den.',
    )
    expect(tiedText(['mostInTurn'], true)).toBe('Du tangerte rekorden for flest kort i én runde. Den kan ikke slås.')
    expect(tiedText(['fewestTurns', 'mostInTurn'], true)).toBe('Du tangerte begge rekordene. De kan ikke slås.')
  })
})
