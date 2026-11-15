// Helpers shared by the end-to-end tests and `npm run play`.
//
// They play the way a person who knows every date would: read the cards on screen, look them up
// in the fixture deck, and ask the rules (`correctGapsFor`) which gaps are right. The app has no
// debug hook and gives nothing away; everything here comes from what is on screen.

import type { Locator, Page } from '@playwright/test'
import { fixtureCards } from '../src/fixtures/cards.ts'
import { DEFAULT_CONFIG, correctGapsFor, type Card, type Precision } from '../src/game/index.ts'

const cardsByTitle = new Map(fixtureCards.map((card) => [card.title, card]))

export function cardWithTitle(title: string): Card {
  const card = cardsByTitle.get(title.trim())
  if (!card) throw new Error(`No fixture card has the title "${title}"`)
  return card
}

/** The "Spill" button on the start screen. */
export function playButton(page: Page): Locator {
  return page.getByRole('button', { name: 'Spill', exact: true })
}

/** On the start screen: taps "Spill" and waits for the first card in hand. */
export async function startGame(page: Page): Promise<void> {
  await playButton(page).click()
  await handCard(page).waitFor()
}

/** The timeline, oldest at the top. */
export function timeline(page: Page): Locator {
  return page.getByRole('list', { name: 'Tidslinje, eldst øverst' })
}

/** The drawn card in the tray. */
export function handCard(page: Page): Locator {
  return page.locator('.tl-kort[data-state="hand"]')
}

/** The cards on the timeline in a given state: `last` (locked), `spill` (pending) or `tapt`. */
export function lineCards(page: Page, state?: 'last' | 'spill' | 'tapt'): Locator {
  return timeline(page).locator(state ? `.tl-kort[data-state="${state}"]` : '.tl-kort')
}

/** The gap with this number: 0 is before the first card. */
export function gapButton(page: Page, gap: number): Locator {
  return timeline(page).locator(`button[data-gap="${gap}"]`)
}

/** The fixture cards on the timeline, oldest first, read from their titles. */
export async function cardsOnLine(page: Page): Promise<Card[]> {
  const titles = await timeline(page).locator('.tl-kort .tl-kort__tittel').allTextContents()
  return titles.map(cardWithTitle)
}

/** The fixture card in the hand, read from its title. */
export async function cardInHand(page: Page): Promise<Card> {
  return cardWithTitle(await handCard(page).locator('.tl-kort__tittel').innerText())
}

/**
 * The gaps where the card in hand may go, by the rules, for the timeline on screen. The precision is
 * the one the game was started with; the screen does not say it.
 */
export async function correctGapsOnScreen(
  page: Page,
  precision: Precision = DEFAULT_CONFIG.precision,
): Promise<number[]> {
  await handCard(page).waitFor()
  return correctGapsFor(await cardsOnLine(page), await cardInHand(page), precision)
}

/**
 * A gap where the card in hand does not belong, as close to the right place as possible so that
 * both end up on screen. Null when every gap is right (the card ties with every card on the line).
 */
export async function wrongGapOnScreen(
  page: Page,
  precision: Precision = DEFAULT_CONFIG.precision,
): Promise<number | null> {
  const correct = await correctGapsOnScreen(page, precision)
  const gaps = await timeline(page).locator('button[data-gap]').count()
  const last = Math.max(...correct)
  const first = Math.min(...correct)
  if (last + 1 < gaps) return last + 1
  if (first - 1 >= 0) return first - 1
  return null
}

/** Taps a gap. Brings it to the middle of the timeline first, clear of the tray and the chips. */
export async function chooseGap(page: Page, gap: number): Promise<void> {
  const button = gapButton(page, gap)
  await button.evaluate((element) => element.scrollIntoView({ block: 'center' }))
  await button.click()
}

export type Outcome = 'deciding' | 'miss' | 'won' | 'exhausted' | 'placing'

/** Waits for the tray or the result screen to show what happened, and says which it was. */
export async function outcome(page: Page): Promise<Outcome> {
  const lockIn = page.getByRole('button', { name: /^Lås inn/ })
  const nextTurn = page.getByRole('button', { name: 'Neste runde' })
  const seeResult = page.getByRole('button', { name: 'Se resultatet' })
  const playAgain = page.getByRole('button', { name: 'Spill igjen' })
  const hand = handCard(page)
  await lockIn.or(nextTurn).or(seeResult).or(playAgain).or(hand).first().waitFor()
  if (await lockIn.isVisible()) return 'deciding'
  if (await nextTurn.isVisible()) return 'miss'
  if (await seeResult.isVisible()) return 'won'
  if (await hand.isVisible()) return 'placing'
  return 'exhausted'
}

/** After a win: goes from the last card on the game screen to the result. */
export async function seeResult(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Se resultatet' }).click()
  await page.getByRole('button', { name: 'Spill igjen' }).waitFor()
}

/** Taps a gap and confirms. Returns what happened. */
export async function place(page: Page, gap: number): Promise<Outcome> {
  await chooseGap(page, gap)
  await page.getByRole('button', { name: 'Bekreft' }).click()
  await handCard(page).waitFor({ state: 'detached' })
  return outcome(page)
}

/** Places the card in hand in a correct gap. Returns the card and what happened. */
export async function placeCorrectly(
  page: Page,
  precision: Precision = DEFAULT_CONFIG.precision,
): Promise<{ card: Card; outcome: Outcome }> {
  const card = await cardInHand(page)
  const [gap] = await correctGapsOnScreen(page, precision)
  if (gap === undefined) throw new Error(`"${card.title}" has no correct gap`)
  return { card, outcome: await place(page, gap) }
}

/**
 * Places the card in hand in a wrong gap. Returns null, and places nothing, when every gap is right.
 */
export async function placeWrongly(
  page: Page,
  precision: Precision = DEFAULT_CONFIG.precision,
): Promise<{ card: Card; outcome: Outcome } | null> {
  const card = await cardInHand(page)
  const gap = await wrongGapOnScreen(page, precision)
  if (gap === null) return null
  return { card, outcome: await place(page, gap) }
}

export async function drawAnother(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^Trekk et kort til/ }).click()
  await handCard(page).waitFor()
}

/** Locks in. The next turn starts, or the game ends when no cards are left. */
export async function lockIn(page: Page): Promise<Outcome> {
  await page.getByRole('button', { name: /^Lås inn/ }).click()
  await page.getByRole('button', { name: /^Lås inn/ }).waitFor({ state: 'detached' })
  return outcome(page)
}

/** Starts the next turn after a miss. */
export async function nextTurn(page: Page): Promise<Outcome> {
  await page.getByRole('button', { name: 'Neste runde' }).click()
  await page.getByRole('button', { name: 'Neste runde' }).waitFor({ state: 'detached' })
  return outcome(page)
}

/** Waits until the fonts are in and every animation and transition has run to its end. */
export async function settle(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready
    const frame = () => new Promise((resolve) => requestAnimationFrame(resolve))
    await frame()
    for (let round = 0; round < 50; round++) {
      const running = document.getAnimations().filter((animation) => animation.playState !== 'finished')
      if (running.length === 0) break
      await Promise.allSettled(running.map((animation) => animation.finished))
    }
    await frame()
    await frame()
  })
}
