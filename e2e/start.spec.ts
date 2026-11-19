import { expect, test, type Page } from '@playwright/test'
import { fixtureDecks } from '../src/fixtures/cards.ts'
import { correctGapsFor, type Precision } from '../src/game/index.ts'
import { dateParts, dateText } from '../src/ui/dates.ts'
import {
  cardInHand,
  cardsOnLine,
  handCard,
  lineCards,
  lockIn,
  place,
  placeCorrectly,
  playButton,
  seeResult,
  startGame,
  type Outcome,
} from './helpers.ts'

const deckBox = (page: Page, name: string) => page.getByRole('checkbox', { name })
const slider = (page: Page) => page.getByRole('slider', { name: 'Blanding' })
const fewer = (page: Page) => page.getByRole('button', { name: 'Færre kort' })
const more = (page: Page) => page.getByRole('button', { name: 'Flere kort' })
const targetValue = (page: Page) => page.locator('.tl-teller__tall')
const precisionButton = (page: Page, name: 'År' | 'Måned' | 'Dag') =>
  page.getByRole('group', { name: 'Nøyaktighet' }).getByRole('button', { name })
const progress = (page: Page) => page.locator('.tl-framdrift__tekst')

const [historyDeck, familyDeck] = fixtureDecks
if (!historyDeck || !familyDeck) throw new Error('The fixture should have a history and a family deck')
const familyCount = familyDeck.cards.length

/** Places correctly and locks in until `count` cards are on the line or the game ends. */
async function fillLine(page: Page, count: number, precision?: Precision): Promise<Outcome> {
  let outcome: Outcome = 'placing'
  while ((await lineCards(page).count()) < count) {
    outcome = (await placeCorrectly(page, precision)).outcome
    if (outcome === 'deciding') outcome = await lockIn(page)
    if (outcome !== 'placing') return outcome
  }
  return outcome
}

/** The fixture decks the cards on the line and in hand come from, by kind. */
async function kindsInGame(page: Page): Promise<Set<string>> {
  const cards = [...(await cardsOnLine(page)), await cardInHand(page)]
  return new Set(cards.map((card) => card.pool))
}

test.beforeEach(async ({ page }) => {
  await page.goto('./?seed=1')
})

test('P1: the app opens on the start screen and "Spill" starts a game with the history deck', async ({
  page,
}) => {
  expect(page.viewportSize()).toEqual({ width: 390, height: 844 })
  await expect(page.getByRole('heading', { level: 1, name: 'Tidslinje' })).toBeVisible()
  // No login and no code: only the settings and "Spill", which is on screen without scrolling.
  await expect(page.getByRole('textbox')).toHaveCount(0)
  await expect(deckBox(page, 'Historie')).toBeChecked()
  await expect(playButton(page)).toBeInViewport({ ratio: 1 })

  await playButton(page).click()
  await expect(handCard(page)).toBeVisible()
  await expect(progress(page)).toHaveText('1 av 10 kort')
  await expect(lineCards(page, 'last')).toHaveCount(1)
})

test('the start screen shows the defaults: every deck, half personal, 10 cards, by year', async ({ page }) => {
  await expect(deckBox(page, 'Historie')).toBeChecked()
  await expect(deckBox(page, 'Familien Testesen')).toBeChecked()
  await expect(page.locator('.tl-stokk')).toHaveText(['HistorieFelles', 'Familien TestesenPrivat'])
  await expect(slider(page)).toHaveValue('50')
  await expect(slider(page)).toHaveAttribute('aria-valuetext', '50 % personlige kort')
  await expect(page.locator('.tl-blanding__verdi')).toHaveText('50 % personlige kort')
  await expect(targetValue(page)).toHaveText('10')
  await expect(precisionButton(page, 'År')).toHaveAttribute('aria-pressed', 'true')
  await expect(precisionButton(page, 'Måned')).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByText('Kort fra samme år kan ligge i hvilken som helst rekkefølge.')).toBeVisible()
})

test('P7: the target goes from 10 to another number, and the game plays to it', async ({ page }) => {
  await more(page).click()
  await more(page).click()
  await expect(targetValue(page)).toHaveText('12')
  await fewer(page).click()
  await expect(targetValue(page)).toHaveText('11')
  await startGame(page)
  await expect(progress(page)).toHaveText('1 av 11 kort')
  await expect(page.locator('.tl-topp .tl-pip')).toHaveCount(11)
})

test('P7: the target stays from 2 up to the cards in play', async ({ page }) => {
  for (let i = 0; i < 8; i++) await fewer(page).click()
  await expect(targetValue(page)).toHaveText('2')
  await expect(fewer(page)).toBeDisabled()
  await expect(more(page)).toBeEnabled()

  // Only the family deck: there are not more cards than that to win with.
  await deckBox(page, 'Historie').uncheck()
  for (let i = 0; i < familyCount + 3; i++) {
    if (await more(page).isDisabled()) break
    await more(page).click()
  }
  await expect(targetValue(page)).toHaveText(String(familyCount))
  await expect(more(page)).toBeDisabled()

  // With history back, the target can go on up.
  await deckBox(page, 'Historie').check()
  await expect(more(page)).toBeEnabled()
  await more(page).click()
  await expect(targetValue(page)).toHaveText(String(familyCount + 1))

  // Taking history away again brings the target down to what the family deck holds.
  await deckBox(page, 'Historie').uncheck()
  await expect(targetValue(page)).toHaveText(String(familyCount))
  await startGame(page)
  await expect(progress(page)).toHaveText(`1 av ${familyCount} kort`)
})

test('P8: unticking the family deck plays history only, and the mix has nothing to mix', async ({ page }) => {
  await deckBox(page, 'Familien Testesen').uncheck()
  await expect(slider(page)).toBeDisabled()
  await expect(page.locator('.tl-blanding__verdi')).toHaveText('Bare historie')
  await startGame(page)
  await fillLine(page, 6)
  expect(await kindsInGame(page)).toEqual(new Set(['history']))
})

test('P8: the slider at 100 % plays personal cards only, at 0 % history only', async ({ page }) => {
  await slider(page).fill('100')
  await expect(page.locator('.tl-blanding__verdi')).toHaveText('100 % personlige kort')
  await startGame(page)
  await fillLine(page, 6)
  expect(await kindsInGame(page)).toEqual(new Set(['personal']))

  await page.goto('./?seed=1')
  await expect(slider(page)).toHaveValue('100')
  await slider(page).fill('0')
  await startGame(page)
  await fillLine(page, 6)
  expect(await kindsInGame(page)).toEqual(new Set(['history']))
})

test('P8: the slider moves in steps of 10, with the keyboard too', async ({ page }) => {
  await slider(page).focus()
  await page.keyboard.press('ArrowLeft')
  await expect(slider(page)).toHaveValue('40')
  await expect(page.locator('.tl-blanding__verdi')).toHaveText('40 % personlige kort')
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await expect(slider(page)).toHaveValue('60')
})

test('with no deck ticked there is nothing to play', async ({ page }) => {
  await deckBox(page, 'Historie').uncheck()
  await deckBox(page, 'Familien Testesen').uncheck()
  await expect(playButton(page)).toBeDisabled()
  // It looks disabled too, not like the dark "Spill" that starts a game.
  const background = (locator: ReturnType<typeof playButton>) =>
    locator.evaluate((el) => getComputedStyle(el).backgroundColor)
  const lastColour = await page.evaluate(() => {
    const probe = document.createElement('div')
    probe.style.backgroundColor = 'var(--tl-last)'
    document.body.append(probe)
    const colour = getComputedStyle(probe).backgroundColor
    probe.remove()
    return colour
  })
  expect(await background(playButton(page))).not.toBe(lastColour)
  await expect(page.locator('.tl-start__spill [role="status"]')).toHaveText('Kryss av minst én kortstokk.')
  await expect(fewer(page)).toBeDisabled()
  await expect(more(page)).toBeDisabled()
  await deckBox(page, 'Familien Testesen').check()
  await expect(playButton(page)).toBeEnabled()
})

for (const [name, precision] of [
  ['Måned', 'month'],
  ['Dag', 'day'],
] as const) {
  test(`P12: judging by ${precision} shows the ${precision} and marks a same-year card on the wrong side wrong`, async ({
    page,
  }) => {
    // Seed 34 draws a card that shares its year with the start card but not its month or day.
    await page.goto('./?seed=34')
    await precisionButton(page, name).click()
    await expect(precisionButton(page, name)).toHaveAttribute('aria-pressed', 'true')
    await expect(precisionButton(page, 'År')).toHaveAttribute('aria-pressed', 'false')
    await startGame(page)

    // The start card shows its date at this precision.
    const [start] = await cardsOnLine(page)
    if (!start) throw new Error('No start card')
    const { rest } = dateParts(start, precision)
    if (!rest) throw new Error(`The start card of seed 34 should have a ${precision}`)
    await expect(lineCards(page, 'last')).toContainText(rest)

    // A gap that is right by year but wrong at this precision is a miss.
    const drawn = await cardInHand(page)
    const line = await cardsOnLine(page)
    const byYear = correctGapsFor(line, drawn, 'year')
    const strict = correctGapsFor(line, drawn, precision)
    const gap = byYear.find((g) => !strict.includes(g))
    if (gap === undefined) throw new Error('Seed 34 should draw a card that ties by year only')
    expect(await place(page, gap)).toBe('miss')
    await expect(page.locator('.tl-brett')).toContainText(dateText(drawn, precision))
  })
}

test('P12: by year, the same placement is correct', async ({ page }) => {
  await page.goto('./?seed=34')
  await startGame(page)
  const drawn = await cardInHand(page)
  const line = await cardsOnLine(page)
  const byYear = correctGapsFor(line, drawn, 'year')
  const gap = byYear.find((g) => !correctGapsFor(line, drawn, 'day').includes(g))
  if (gap === undefined) throw new Error('Seed 34 should draw a card that ties by year only')
  expect(await place(page, gap)).toBe('deciding')
})

test('the last choices are remembered on the device', async ({ page }) => {
  await deckBox(page, 'Familien Testesen').uncheck()
  await more(page).click()
  await precisionButton(page, 'Dag').click()
  await page.reload()
  await expect(deckBox(page, 'Historie')).toBeChecked()
  await expect(deckBox(page, 'Familien Testesen')).not.toBeChecked()
  await expect(targetValue(page)).toHaveText('11')
  await expect(precisionButton(page, 'Dag')).toHaveAttribute('aria-pressed', 'true')

  await deckBox(page, 'Familien Testesen').check()
  await slider(page).fill('30')
  await page.reload()
  await expect(deckBox(page, 'Familien Testesen')).toBeChecked()
  await expect(slider(page)).toHaveValue('30')
})

test('the start screen works when storage is blocked', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      get() {
        throw new DOMException('blocked', 'SecurityError')
      },
    })
  })
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.reload()
  await expect(targetValue(page)).toHaveText('10')
  for (let i = 0; i < 8; i++) await fewer(page).click()
  await precisionButton(page, 'Måned').click()
  await startGame(page)
  await expect(progress(page)).toHaveText('1 av 2 kort')
  expect(await placeCorrectly(page, 'month')).toMatchObject({ outcome: 'won' })
  await seeResult(page)

  // The choices hold for the visit, even though nothing could be stored.
  await page.getByRole('button', { name: 'Til start' }).click()
  await expect(targetValue(page)).toHaveText('2')
  await expect(precisionButton(page, 'Måned')).toHaveAttribute('aria-pressed', 'true')
  expect(errors).toEqual([])
})

test('"Spill igjen" keeps the settings and deals a new game; "Til start" goes back', async ({ page }) => {
  for (let i = 0; i < 8; i++) await fewer(page).click()
  await precisionButton(page, 'Dag').click()
  await startGame(page)
  const firstGame = [(await cardsOnLine(page))[0]?.id, (await cardInHand(page)).id]
  expect(await placeCorrectly(page, 'day')).toMatchObject({ outcome: 'won' })
  await seeResult(page)
  await expect(page.getByRole('heading', { level: 1, name: '2 kort på tidslinjen' })).toBeVisible()

  await page.getByRole('button', { name: 'Spill igjen' }).click()
  await expect(handCard(page)).toBeVisible()
  await expect(progress(page)).toHaveText('1 av 2 kort')
  // A new seed: with 56 cards, the same start card and the same card in hand would be a fluke.
  expect([(await cardsOnLine(page))[0]?.id, (await cardInHand(page)).id]).not.toEqual(firstGame)
  // The same precision: the start card's date is shown by day where the card has one.
  const [start] = await cardsOnLine(page)
  const { rest } = start ? dateParts(start, 'day') : { rest: null }
  if (rest) await expect(lineCards(page, 'last')).toContainText(rest)

  expect(await placeCorrectly(page, 'day')).toMatchObject({ outcome: 'won' })
  await seeResult(page)
  await page.getByRole('button', { name: 'Til start' }).click()
  await expect(playButton(page)).toBeVisible()
  await expect(targetValue(page)).toHaveText('2')
  await expect(precisionButton(page, 'Dag')).toHaveAttribute('aria-pressed', 'true')
})

test('on a small phone nothing scrolls sideways and "Spill" is on screen without scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 640 })
  const sideways = () =>
    page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)
  expect(await sideways()).toBe(false)

  await expect(playButton(page)).toBeInViewport({ ratio: 1 })
  // Every control is a tap target of at least 44 px.
  const controls = page.locator('.tl-start').locator('button, input[type="range"], label.tl-stokk')
  for (const box of await controls.evaluateAll((all) => all.map((el) => el.getBoundingClientRect().height))) {
    expect(box).toBeGreaterThanOrEqual(44)
  }
  await playButton(page).click()
  await expect(handCard(page)).toBeVisible()
  expect(await sideways()).toBe(false)
})

test.describe('light or dark', () => {
  const light = 'rgb(243, 239, 229)' // --tl-bord in the day edition
  const dark = 'rgb(21, 20, 18)' // --tl-bord in the night edition
  const themeButton = (page: Page, name: 'Auto' | 'Lys' | 'Mørk') =>
    page.getByRole('group', { name: 'Utseende' }).getByRole('button', { name })
  const background = (page: Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor)

  test('follows the device on "Auto", the first choice', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('./?seed=1')
    await expect(themeButton(page, 'Auto')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByText('Lys eller mørk, som på enheten.')).toBeVisible()
    expect(await background(page)).toBe(dark)
    await page.emulateMedia({ colorScheme: 'light' })
    expect(await background(page)).toBe(light)
  })

  test('"Lys" and "Mørk" hold whatever the device says, and are remembered', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('./?seed=1')
    await themeButton(page, 'Lys').click()
    await expect(themeButton(page, 'Lys')).toHaveAttribute('aria-pressed', 'true')
    expect(await background(page)).toBe(light)

    await page.emulateMedia({ colorScheme: 'light' })
    await themeButton(page, 'Mørk').click()
    expect(await background(page)).toBe(dark)

    // Set before the first paint on the next visit, and kept in the game.
    await page.reload()
    await expect(page.locator('html')).toHaveAttribute('data-tema', 'mork')
    await expect(themeButton(page, 'Mørk')).toHaveAttribute('aria-pressed', 'true')
    expect(await background(page)).toBe(dark)
    await startGame(page)
    expect(await background(page)).toBe(dark)
  })

  test('"Auto" again follows the device', async ({ page }) => {
    await page.addInitScript(() => window.localStorage.setItem('tidslinje:tema', 'lys'))
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('./?seed=1')
    expect(await background(page)).toBe(light)
    await themeButton(page, 'Auto').click()
    await expect(page.locator('html')).not.toHaveAttribute('data-tema')
    expect(await background(page)).toBe(dark)
  })
})
