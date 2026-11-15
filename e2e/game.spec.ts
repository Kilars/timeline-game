import { expect, test, type Page } from '@playwright/test'
import { dateText } from '../src/ui/dates.ts'
import {
  cardInHand,
  chooseGap,
  correctGapsOnScreen,
  drawAnother,
  gapButton,
  handCard,
  lineCards,
  lockIn,
  nextTurn,
  placeCorrectly,
  placeWrongly,
  seeResult,
  timeline,
  wrongGapOnScreen,
  type Outcome,
} from './helpers.ts'

const confirm = (page: Page) => page.getByRole('button', { name: 'Bekreft' })
const drawButton = (page: Page) => page.getByRole('button', { name: /^Trekk et kort til/ })
const lockButton = (page: Page) => page.getByRole('button', { name: /^Lås inn/ })
const turn = (page: Page) => page.locator('.tl-runde')
const progress = (page: Page) => page.locator('.tl-framdrift__tekst')

/**
 * Plays a seeded game to the end with every card placed correctly. `push` says, after each correct
 * placement, whether to draw another card (true) or lock in (false).
 */
async function playToTheEnd(page: Page, push: () => boolean): Promise<Outcome> {
  for (let step = 0; step < 60; step++) {
    const { outcome } = await placeCorrectly(page)
    if (outcome !== 'deciding') return outcome
    if (push()) await drawAnother(page)
    else if ((await lockIn(page)) !== 'placing') throw new Error('No new turn after locking in')
  }
  throw new Error('The game did not end')
}

test.beforeEach(async ({ page }) => {
  await page.goto('./?seed=1')
})

test('opening the app starts a game at phone size, in Norwegian', async ({ page }) => {
  expect(page.viewportSize()).toEqual({ width: 390, height: 844 })
  await expect(page.locator('html')).toHaveAttribute('lang', 'nb')
  await expect(page.getByRole('heading', { level: 1, name: 'Tidslinje' })).toBeAttached()

  await expect(turn(page)).toHaveText('Runde 1')
  await expect(progress(page)).toHaveText('1 av 10 kort')
  await expect(lineCards(page, 'last')).toHaveCount(1)
  await expect(handCard(page)).toBeVisible()
  await expect(timeline(page).locator('button[data-gap]')).toHaveCount(2)
})

test('the same seed gives the same game', async ({ page }) => {
  const first = await cardInHand(page)
  await page.reload()
  expect(await cardInHand(page)).toEqual(first)
})

test('nothing is revealed before "Bekreft"', async ({ page }) => {
  const card = await cardInHand(page)
  const year = dateText(card, 'year')

  // In hand: the title only.
  await expect(handCard(page)).toHaveText(`?${card.title}`)
  await expect(page.getByText(card.reveal ?? '')).toHaveCount(0)
  await expect(page.locator('.tl-brett')).not.toContainText(year)
  await expect(confirm(page)).toHaveCount(0)

  // Choosing a gap marks it and offers "Bekreft", and still reveals nothing.
  const [gap] = await correctGapsOnScreen(page)
  await chooseGap(page, gap ?? 0)
  await expect(gapButton(page, gap ?? 0)).toHaveAttribute('aria-pressed', 'true')
  await expect(confirm(page)).toBeVisible()
  await expect(handCard(page)).toHaveText(`?${card.title}`)
  await expect(page.getByText(card.reveal ?? '')).toHaveCount(0)
  await expect(lineCards(page)).toHaveCount(1)

  // Tapping another gap moves the choice.
  const other = gap === 0 ? 1 : 0
  await chooseGap(page, other)
  await expect(gapButton(page, other)).toHaveAttribute('aria-pressed', 'true')
  await expect(timeline(page).locator('button[aria-pressed="true"]')).toHaveCount(1)
  await expect(lineCards(page)).toHaveCount(1)

  // Confirming reveals the date and the reveal line.
  await chooseGap(page, gap ?? 0)
  await confirm(page).click()
  await expect(page.getByText(card.reveal ?? '')).toBeVisible()
  await expect(lineCards(page, 'spill')).toContainText(year)
})

test('a correct placement shows the pending card and both choices', async ({ page }) => {
  const { card, outcome } = await placeCorrectly(page)
  expect(outcome).toBe('deciding')

  const pending = lineCards(page, 'spill')
  await expect(pending).toHaveCount(1)
  await expect(pending).toContainText(card.title)
  await expect(pending).toContainText(dateText(card, 'year'))
  await expect(pending).toContainText(card.reveal ?? '')
  await expect(pending).toContainText('På spill')
  await expect(pending).toBeInViewport()
  await expect(lineCards(page, 'last')).toHaveCount(1)

  await expect(drawButton(page)).toBeVisible()
  await expect(lockButton(page)).toBeVisible()
  await expect(progress(page)).toHaveText('2 av 10 kort')
  await expect(turn(page)).toHaveText('Runde 1')
  // The two choices have equal weight.
  const draw = await drawButton(page).boundingBox()
  const lock = await lockButton(page).boundingBox()
  expect(draw?.width).toBe(lock?.width)
  expect(draw?.height).toBe(lock?.height)
})

test('a miss removes the pending cards and shows the correct date', async ({ page }) => {
  const first = await placeCorrectly(page)
  await drawAnother(page)
  await expect(lineCards(page, 'spill')).toHaveCount(1)

  const missed = await placeWrongly(page)
  if (!missed) throw new Error('Seed 1 should give a card with a wrong gap here')
  expect(missed.outcome).toBe('miss')

  // The missed card with its date and reveal line, where it belongs, and what was lost.
  const tray = page.locator('.tl-brett')
  await expect(tray).toContainText('Ikke denne gangen')
  await expect(tray).toContainText(`${missed.card.title} var i ${dateText(missed.card, 'year')}`)
  await expect(tray).toContainText(missed.card.reveal ?? '')
  await expect(tray).toContainText(`Du mistet ${first.card.title}.`)
  await expect(timeline(page).locator('.tl-hjem')).toHaveText(/hører hjemme her/)
  await expect(lineCards(page, 'tapt')).toHaveCount(2)
  await expect(lineCards(page, 'tapt').filter({ hasText: first.card.title })).toContainText('Ute av spillet')
  await expect(lineCards(page, 'tapt').filter({ hasText: missed.card.title })).toContainText('Du la det her')
  await expect(lineCards(page, 'spill')).toHaveCount(0)
  await expect(progress(page)).toHaveText('1 av 10 kort')
  await expect(page.getByRole('button')).toHaveText(['Neste runde'])

  // The next turn starts with only the locked cards on the line.
  expect(await nextTurn(page)).toBe('placing')
  await expect(lineCards(page)).toHaveCount(1)
  await expect(lineCards(page, 'last')).toHaveCount(1)
  await expect(timeline(page)).not.toContainText(first.card.title)
  await expect(timeline(page)).not.toContainText(missed.card.title)
  await expect(turn(page)).toHaveText('Runde 2')
  await expect(progress(page)).toHaveText('1 av 10 kort')
})

test('locking in keeps the cards, also through a later miss', async ({ page }) => {
  const first = await placeCorrectly(page)
  await drawAnother(page)
  const second = await placeCorrectly(page)
  expect(await lockIn(page)).toBe('placing')

  await expect(lineCards(page, 'last')).toHaveCount(3)
  await expect(lineCards(page, 'spill')).toHaveCount(0)
  await expect(turn(page)).toHaveText('Runde 2')
  await expect(progress(page)).toHaveText('3 av 10 kort')

  const missed = await placeWrongly(page)
  if (!missed) throw new Error('Seed 1 should give a card with a wrong gap here')
  await expect(page.locator('.tl-brett')).toContainText('Du hadde ingen kort på spill.')
  await nextTurn(page)

  await expect(lineCards(page, 'last')).toHaveCount(3)
  await expect(timeline(page)).toContainText(first.card.title)
  await expect(timeline(page)).toContainText(second.card.title)
  await expect(turn(page)).toHaveText('Runde 3')
  await expect(progress(page)).toHaveText('3 av 10 kort')
})

test('a full game reaches the result view with the right number of turns', async ({ page }) => {
  // Locking in after every card: the tenth card is placed in turn 9.
  expect(await playToTheEnd(page, () => false)).toBe('won')

  // The winning card is revealed on the timeline before the result is shown.
  const winner = timeline(page).locator('.tl-kort--apen')
  await expect(winner).toContainText('Riktig')
  await expect(winner).toContainText('Låst')
  await expect(lineCards(page)).toHaveCount(10)
  await expect(page.locator('.tl-brett')).toContainText('Alle 10 kort er på plass')
  await seeResult(page)

  await expect(page.getByRole('heading', { level: 1, name: '10 kort på tidslinjen' })).toBeVisible()
  await expect(page.locator('.tl-resultat__tall')).toHaveText('9')
  await expect(page.locator('.tl-resultat__liste')).toContainText('Din rekord9 runder')
  await expect(page.locator('.tl-resultat__liste')).toContainText('Dette spillet9 runder')
  await expect(page.locator('.tl-resultat__merknad')).toHaveText('Ny rekord!')

  // "Spill igjen" starts a new game.
  await page.getByRole('button', { name: 'Spill igjen' }).click()
  await expect(handCard(page)).toBeVisible()
  await expect(turn(page)).toHaveText('Runde 1')
  await expect(progress(page)).toHaveText('1 av 10 kort')
  await expect(lineCards(page)).toHaveCount(1)
})

test('the best score survives a reload', async ({ page }) => {
  // Every card in one turn: the best there is.
  expect(await playToTheEnd(page, () => true)).toBe('won')
  await seeResult(page)
  await expect(page.locator('.tl-resultat__tall')).toHaveText('1')
  await expect(page.locator('.tl-resultat__enhet')).toHaveText('runde')
  await expect(page.locator('.tl-resultat__merknad')).toHaveText('Ny rekord!')

  await page.reload()
  expect(await playToTheEnd(page, () => false)).toBe('won')
  await seeResult(page)
  await expect(page.locator('.tl-resultat__tall')).toHaveText('9')
  await expect(page.locator('.tl-resultat__liste')).toContainText('Din rekord1 runde')
  await expect(page.locator('.tl-resultat__liste')).toContainText('Dette spillet9 runder')
  await expect(page.locator('.tl-resultat__merknad')).toHaveText('8 runder unna rekorden din.')
})

test('the game works when storage is blocked', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('blocked', 'SecurityError')
      },
    })
  })
  await page.reload()
  expect(await playToTheEnd(page, () => true)).toBe('won')
  await seeResult(page)
  await expect(page.locator('.tl-resultat__tall')).toHaveText('1')
  await expect(page.locator('.tl-resultat__merknad')).toHaveText('Ny rekord!')
})

test('the drawn card stays in reach and nothing scrolls sideways on a small phone', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 })
  // A long line: eight cards, nine gaps.
  for (let cards = 1; cards < 8; cards++) {
    await placeCorrectly(page)
    await lockIn(page)
  }
  await expect(lineCards(page)).toHaveCount(8)

  // The tray is on screen whatever the timeline does, and the timeline ends where the tray begins.
  await expect(handCard(page)).toBeInViewport({ ratio: 1 })
  const tray = await page.locator('.tl-brett').boundingBox()
  const scroller = await page.locator('.tl-linje__rull').boundingBox()
  expect(tray && scroller && scroller.y + scroller.height).toBeLessThanOrEqual((tray?.y ?? 0) + 1)
  expect((tray?.y ?? 0) + (tray?.height ?? 0)).toBeLessThanOrEqual(640)

  // Every gap is a tap target of at least 44 px, and both ends of the line can be reached.
  const gaps = timeline(page).locator('button[data-gap]')
  await expect(gaps).toHaveCount(9)
  for (const box of await gaps.evaluateAll((all) => all.map((gap) => gap.getBoundingClientRect().height))) {
    expect(box).toBeGreaterThanOrEqual(44)
  }
  await chooseGap(page, 0)
  await expect(gapButton(page, 0)).toBeInViewport({ ratio: 1 })
  await chooseGap(page, 8)
  await expect(gapButton(page, 8)).toBeInViewport({ ratio: 1 })
  // The chosen last gap is at the end of the line, so nothing covers it.
  await expect(page.getByRole('button', { name: 'Nyere kort' })).toBeHidden()
  await expect(page.getByRole('button', { name: 'Bekreft' })).toBeInViewport({ ratio: 1 })

  const sideways = () =>
    page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  expect(await sideways()).toBe(false)
  expect(await placeWrongly(page)).not.toBeNull()
  expect(await sideways()).toBe(false)
})

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' })

  test('running out of cards ends the game with a message', async ({ page }) => {
    test.slow()
    // Miss every card: each miss throws one card away until none are left.
    let result: Outcome = 'placing'
    for (let step = 0; step < 200 && result === 'placing'; step++) {
      if ((await wrongGapOnScreen(page)) === null) {
        // A card that ties with the whole line cannot be missed. Place it and lock it in.
        result = (await placeCorrectly(page)).outcome
        if (result === 'deciding') result = await lockIn(page)
      } else {
        await placeWrongly(page)
        result = await nextTurn(page)
      }
    }
    expect(result).toBe('exhausted')
    await expect(page.getByRole('heading', { level: 1, name: 'Bunken er tom' })).toBeVisible()
    await expect(page.getByText('Det er ikke flere kort å trekke.')).toBeVisible()

    await page.getByRole('button', { name: 'Spill igjen' }).click()
    await expect(handCard(page)).toBeVisible()
    await expect(turn(page)).toHaveText('Runde 1')
  })
})
