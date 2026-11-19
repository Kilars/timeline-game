// The game against a real API: the API runs here over an in-memory database seeded from the
// fixture decks (as `npm run api:seed` does), and the client is built with VITE_API_URL pointing
// at it and served on its own port (e2e/apiClient.ts). The other end-to-end tests play the bundled
// fixture decks.

import { expect, test, type Page } from '@playwright/test'
import type { LocalDatabase } from '../api/src/sqlite.ts'
import { serveApiAndClient, type ApiAndClient } from './apiClient.ts'
import {
  cardInHand,
  cardsOnLine,
  lineCards,
  lockIn,
  playButton,
  placeCorrectly,
  playToTheEnd,
  seeResult,
  startGame,
} from './helpers.ts'

const apiPort = 4176
const clientPort = 4175
const decksUrl = `http://127.0.0.1:${apiPort}/decks`
const recordsUrl = `http://127.0.0.1:${apiPort}/records`

let served: ApiAndClient | undefined
let clientUrl = ''

test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
  test.setTimeout(120_000)
  served = await serveApiAndClient({ api: apiPort, client: clientPort })
  clientUrl = served.clientUrl
})

test.afterAll(async () => {
  await served?.close()
})

/** The shared database. Every test starts with no records in it. */
function database(): LocalDatabase {
  if (!served) throw new Error('The API is not running')
  return served.db
}

test.beforeEach(async () => {
  await database().exec('DELETE FROM records')
})

/** Opens the client and waits for the start screen, which shows once the decks are in. */
async function open(page: Page, query = '?seed=1'): Promise<void> {
  const decks = page.waitForResponse(decksUrl)
  await page.goto(`${clientUrl}${query}`)
  expect((await decks).status()).toBe(200)
  await expect(playButton(page)).toBeVisible()
}

test('the start screen offers the public decks from the API, and not the private fixture deck', async ({
  page,
}) => {
  await open(page)
  await expect(page.getByRole('checkbox')).toHaveCount(1)
  await expect(page.getByRole('checkbox', { name: 'Historie' })).toBeChecked()
  await expect(page.getByText('Familien Testesen')).toHaveCount(0)
  // Only history is in play, so there is nothing to mix.
  await expect(page.getByRole('slider', { name: 'Blanding' })).toBeDisabled()
})

test('a seeded game against the API is played to a win', async ({ page }) => {
  await open(page)
  await startGame(page)
  let won = false
  for (let step = 0; step < 30 && !won; step++) {
    const { card, outcome } = await placeCorrectly(page)
    expect(card.pool).toBe('history')
    if (outcome === 'won') won = true
    else if (outcome === 'deciding') expect(await lockIn(page)).toBe('placing')
    else throw new Error(`Expected "${card.title}" to be correct, got "${outcome}"`)
  }
  expect(won).toBe(true)
  await expect(lineCards(page)).toHaveCount(10)
  await seeResult(page)
  await expect(page.getByRole('heading', { level: 1, name: '10 kort på tidslinjen' })).toBeVisible()
})

test('the same ?seed= deals the same game against the API', async ({ page }) => {
  const deal = async () => {
    await open(page, '?seed=42')
    await startGame(page)
    return [...(await cardsOnLine(page)), await cardInHand(page)].map((card) => card.id)
  }
  const first = await deal()
  expect(await deal()).toEqual(first)
})

test('shows that it is fetching, says so plainly when the API cannot be reached, and tries again', async ({
  page,
}) => {
  let release = () => {}
  const held = new Promise<void>((resolve) => (release = resolve))
  let calls = 0
  await page.route(decksUrl, async (route) => {
    calls += 1
    if (calls === 1) {
      await held
      await route.abort('connectionrefused')
    } else {
      await route.continue()
    }
  })

  await page.goto(`${clientUrl}?seed=1`)
  await expect(page.getByRole('status')).toHaveText('Henter kortstokkene …')
  await expect(playButton(page)).toHaveCount(0)

  release()
  await expect(page.getByRole('alert')).toHaveText('Fikk ikke hentet kortstokkene. Sjekk nettet og prøv igjen.')
  await expect(playButton(page)).toHaveCount(0)

  await page.getByRole('button', { name: 'Prøv igjen' }).click()
  await expect(playButton(page)).toBeVisible()
  await expect(page.getByRole('checkbox', { name: 'Historie' })).toBeChecked()
  expect(calls).toBe(2)
})

/** Stores records at target 10 and precision year, as if earlier games had set them. */
async function storeRecords(fewestTurns: number, mostInTurn: number, name: string): Promise<void> {
  const at = '2026-11-01T12:00:00.000Z'
  await database().batch([
    {
      sql: `INSERT OR REPLACE INTO records (kind, target, precision, value, name, set_at) VALUES
            ('fewest_turns', 10, 'year', ?, ?, ?), ('most_in_turn', 10, 'year', ?, ?, ?)`,
      params: [fewestTurns, name, at, mostInTurn, name, at],
    },
  ])
}

const recordRows = (page: Page) => page.locator('.tl-rekorder__rad')
const nameField = (page: Page) => page.getByLabel('Navnet ditt')
const saveButton = (page: Page) => page.getByRole('button', { name: 'Lagre' })

/** Plays the seeded game to a win, `cardsATurn` cards a turn, and opens the result. */
async function winWith(page: Page, cardsATurn: number): Promise<void> {
  await open(page)
  await startGame(page)
  expect(await playToTheEnd(page, (pending) => pending < cardsATurn)).toBe('won')
  await seeResult(page)
}

test('a win with no records yet claims both under the name given', async ({ page }) => {
  // One card a turn: the tenth card is placed in turn 9.
  await winWith(page, 1)
  await expect(page.getByText('To nye rekorder for alle!')).toBeVisible()
  await expect(page.locator('.tl-rekorder__nokkel')).toHaveText('10 kort · nøyaktighet år')
  await expect(recordRows(page)).toHaveText(['Færrest runderIngen ennåDu: 9 runder', 'Flest kort i én rundeIngen ennåDu: 1 kort'])

  // A new device has no name to fill in, and a blank name cannot be saved.
  await expect(nameField(page)).toHaveValue('')
  await expect(saveButton(page)).toBeDisabled()
  await nameField(page).fill('  Testesen ')
  await saveButton(page).click()

  await expect(page.getByRole('status').filter({ hasText: 'Rekordene er dine.' })).toBeVisible()
  await expect(nameField(page)).toHaveCount(0)
  await expect(recordRows(page)).toHaveText([
    'Færrest runder9 runderDu: 9 runderTestesen',
    'Flest kort i én runde1 kortDu: 1 kortTestesen',
  ])
  const response = await page.request.get(`${recordsUrl}?target=10&precision=year`)
  expect(await response.json()).toEqual({
    records: { fewestTurns: { value: 9, name: 'Testesen' }, mostInTurn: { value: 1, name: 'Testesen' } },
  })
})

test('a game that only ties the records asks for no name', async ({ page }) => {
  await storeRecords(9, 1, 'Kari')
  await winWith(page, 1)
  await expect(recordRows(page)).toHaveText([
    'Færrest runder9 runderDu: 9 runderKari',
    'Flest kort i én runde1 kortDu: 1 kortKari',
  ])
  await expect(page.getByText('Du tangerte begge rekordene. Den som setter en rekord først, beholder den.')).toBeVisible()
  await expect(nameField(page)).toHaveCount(0)
})

test('the name from last time is filled in, and a perfect game is told it cannot be beaten', async ({ page }) => {
  await storeRecords(9, 1, 'Kari')
  await page.addInitScript(() => window.localStorage.setItem('tidslinje:navn', 'Testesen'))
  // Every card in one turn.
  await winWith(page, 10)
  await expect(page.getByText('To nye rekorder for alle!')).toBeVisible()
  await expect(nameField(page)).toHaveValue('Testesen')
  await saveButton(page).click()
  await expect(page.getByRole('status').filter({ hasText: 'Rekordene er dine.' })).toBeVisible()
  await expect(recordRows(page)).toHaveText([
    'Færrest runder1 rundeDu: 1 rundeTestesen',
    'Flest kort i én runde9 kortDu: 9 kortTestesen',
  ])

  // The same game again ties records that are at their limit.
  await page.getByRole('button', { name: 'Til start' }).click()
  await startGame(page)
  expect(await playToTheEnd(page, () => true)).toBe('won')
  await seeResult(page)
  await expect(page.getByText('Du tangerte begge rekordene. De kan ikke slås.')).toBeVisible()
})

test('says so when someone else beat the records first', async ({ page }) => {
  await storeRecords(9, 1, 'Kari')
  // Two cards a turn: 5 turns, 2 cards at most. Better than Kari, but Ola gets there between the
  // fetch and the save.
  await page.route(recordsUrl, async (route) => {
    if (route.request().method() === 'POST') await storeRecords(1, 9, 'Ola')
    await route.continue()
  })
  await winWith(page, 2)
  await expect(page.getByText('To nye rekorder for alle!')).toBeVisible()
  await nameField(page).fill('Testesen')
  await saveButton(page).click()
  await expect(page.getByText('Noen rakk det før deg. Rekordene står.')).toBeVisible()
  await expect(recordRows(page)).toHaveText([
    'Færrest runder1 rundeDu: 5 runderOla',
    'Flest kort i én runde9 kortDu: 2 kortOla',
  ])
})

test('keeps the name and offers to try again when a save fails', async ({ page }) => {
  let posts = 0
  await page.route(recordsUrl, async (route) => {
    if (route.request().method() === 'POST' && ++posts === 1) await route.abort('connectionrefused')
    else await route.continue()
  })
  await winWith(page, 1)
  await nameField(page).fill('Testesen')
  await saveButton(page).click()
  await expect(page.getByRole('alert')).toHaveText('Fikk ikke lagret rekordene. Prøv igjen.')
  await expect(nameField(page)).toHaveValue('Testesen')
  await saveButton(page).click()
  await expect(page.getByRole('status').filter({ hasText: 'Rekordene er dine.' })).toBeVisible()
  expect(posts).toBe(2)
})

test('refuses a name with hidden characters before it is sent', async ({ page }) => {
  await winWith(page, 1)
  await nameField(page).fill('Test\u200besen')
  await expect(saveButton(page)).toBeDisabled()
  await expect(page.getByRole('alert')).toHaveText(
    'Navnet kan ha opptil 20 tegn, med minst én bokstav, og ingen usynlige tegn.',
  )
  await nameField(page).fill('Testesen')
  await expect(saveButton(page)).toBeEnabled()
})

test('says plainly when the records cannot be fetched, and fetches them again on request', async ({ page }) => {
  let fetches = 0
  // Only the fetch, which has a query; a save would go to /records itself.
  await page.route(/\/records\?/, async (route) => {
    if (++fetches === 1) await route.abort('connectionrefused')
    else await route.continue()
  })
  await winWith(page, 1)
  await expect(page.getByText('Fikk ikke hentet rekordene.')).toBeVisible()
  await expect(page.getByText('Ingen ennå')).toHaveCount(0)
  await expect(nameField(page)).toHaveCount(0)

  await page.getByRole('button', { name: 'Prøv igjen' }).click()
  await expect(page.getByText('To nye rekorder for alle!')).toBeVisible()
  await expect(recordRows(page)).toHaveCount(2)
  expect(fetches).toBe(2)
})

test('the rest of the result screen works when the records cannot be fetched', async ({ page }) => {
  await page.route(/\/records\?/, (route) => route.abort('connectionrefused'))
  await winWith(page, 1)
  await expect(page.getByText('Fikk ikke hentet rekordene.')).toBeVisible()
  await page.getByRole('button', { name: 'Spill igjen' }).click()
  await expect(lineCards(page)).toHaveCount(1)
})

test('a save sent again after its answer was lost is told the records are already its own', async ({ page }) => {
  let posts = 0
  await page.route(recordsUrl, async (route) => {
    if (route.request().method() === 'POST' && ++posts === 1) {
      // The server stores the claim, but the answer never reaches the phone.
      await route.fetch()
      await route.abort('connectionreset')
    } else {
      await route.continue()
    }
  })
  await winWith(page, 1)
  await nameField(page).fill(' Test  esen ')
  await saveButton(page).click()
  await expect(page.getByRole('alert')).toHaveText('Fikk ikke lagret rekordene. Prøv igjen.')
  await saveButton(page).click()
  await expect(page.getByRole('status').filter({ hasText: 'Rekordene er dine.' })).toBeVisible()
  expect(posts).toBe(2)
})

test('a game that beats one record and ties the other is told both', async ({ page }) => {
  // Two cards a turn: 5 turns, 2 cards at most. Kari holds 6 turns and 2 cards.
  await storeRecords(6, 2, 'Kari')
  await winWith(page, 2)
  await expect(page.getByText('Ny rekord for alle: færrest runder!')).toBeVisible()
  await expect(page.locator('.tl-krav__tall')).toHaveText('Færrest runder: 5 runder')
  await expect(
    page.getByText('Du tangerte rekorden for flest kort i én runde. Den som setter en rekord først, beholder den.'),
  ).toBeVisible()
})
