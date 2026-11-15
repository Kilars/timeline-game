// The game against a real API: the API runs here over an in-memory database seeded from the
// fixture decks (as `npm run api:seed` does), and the client is built with VITE_API_URL pointing
// at it and served on its own port. The other end-to-end tests play the bundled fixture decks.

import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { build, preview, type PreviewServer } from 'vite'
import { openLocalDatabase, serveLocal, type LocalServer } from '../api/src/local.ts'
import { seedDecks } from '../api/src/seed.ts'
import type { LocalDatabase } from '../api/src/sqlite.ts'
import { fixtureDecks } from '../src/fixtures/cards.ts'
import { cardInHand, cardsOnLine, lineCards, lockIn, playButton, placeCorrectly, seeResult, startGame } from './helpers.ts'

const root = path.resolve(import.meta.dirname, '..')
const apiPort = 4176
const clientPort = 4175
const clientOrigin = `http://127.0.0.1:${clientPort}`
const clientUrl = `${clientOrigin}/timeline-game/`
const decksUrl = `http://127.0.0.1:${apiPort}/decks`

let db: LocalDatabase | undefined
let api: LocalServer | undefined
let client: PreviewServer | undefined
let outDir: string | undefined

test.describe.configure({ mode: 'serial' })

test.beforeAll(async () => {
  test.setTimeout(120_000)
  db = await openLocalDatabase(':memory:')
  await seedDecks(db, fixtureDecks)
  api = await serveLocal({ db, port: apiPort, origins: [clientOrigin] })

  outDir = await mkdtemp(path.join(os.tmpdir(), 'tidslinje-api-e2e-'))
  // Vite reads VITE_* variables from the environment at build time.
  process.env.VITE_API_URL = api.url
  try {
    await build({ root, logLevel: 'warn', build: { outDir, emptyOutDir: true } })
  } finally {
    delete process.env.VITE_API_URL
  }
  client = await preview({
    root,
    logLevel: 'warn',
    build: { outDir },
    preview: { host: '127.0.0.1', port: clientPort, strictPort: true },
  })
})

test.afterAll(async () => {
  await client?.close()
  await api?.close()
  db?.close()
  if (outDir) await rm(outDir, { recursive: true, force: true })
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
