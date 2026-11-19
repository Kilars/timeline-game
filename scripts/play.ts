// Plays one full game in headless Chrome at phone size and saves a numbered screenshot of every
// step to artifacts/play/. Builds the app, serves it, and stops the server again when done.
// Animations are left to finish before each screenshot.
//
//   npm run play                 seed 1, on the bundled fixture decks
//   npm run play -- 42           seed 42
//   npm run play -- --api [42]   against an API on this machine (e2e/apiClient.ts): the result
//                                screen then shows the records for everyone, and the game claims them
//
// Exits with a non-zero code if anything fails, including errors logged by the page.

import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { chromium, expect, type Page } from '@playwright/test'
import { build, preview } from 'vite'
import { serveApiAndClient } from '../e2e/apiClient.ts'
import {
  cardInHand,
  chooseGap,
  correctGapsOnScreen,
  drawAnother,
  handCard,
  lineCards,
  lockIn,
  nextTurn,
  place,
  playButton,
  seeResult,
  settle,
  startGame,
  wrongGapOnScreen,
} from '../e2e/helpers.ts'
import { browser as browserOptions, phone } from '../e2e/phone.ts'

const root = path.resolve(import.meta.dirname, '..')
const outDir = path.join(root, 'artifacts', 'play')
const port = 4174
const apiPort = 4177

/** Saves a screenshot of the current screen, or the whole page, as `<nn>-<name>.png`. */
type Shot = (name: string, options?: { fullPage?: boolean }) => Promise<void>

/**
 * Starts on the start screen with the default settings and plays one full game to a win, the way a
 * player who knows every date and likes a risk would, with a screenshot of every step:
 *
 * - the start screen, then "Spill",
 * - the first turn takes two cards before locking in,
 * - the next turn takes one card and then misses on purpose, losing it,
 * - every turn after that takes two cards and locks in, until the target is reached.
 *
 * The right gap is worked out from the cards on screen, the fixture deck and the rules
 * (see e2e/helpers.ts). Fails when the game did not show all of that.
 */
async function play(page: Page, shot: Shot): Promise<void> {
  const cardsATurn = 2
  let turns = 1
  let pending = 0
  let turnsWithSeveralCards = 0
  let lostToTheMiss = 0
  let won = false

  await expect(playButton(page)).toBeVisible()
  await shot('start')
  await startGame(page)
  await expect(handCard(page)).toBeVisible()
  await expect(page.getByText('Runde 1', { exact: true })).toBeVisible()
  await shot('ny-runde')

  for (let step = 0; step < 100 && !won; step++) {
    const card = await cardInHand(page)
    const correct = await correctGapsOnScreen(page)
    const wrong = await wrongGapOnScreen(page)
    const missOnPurpose =
      lostToTheMiss === 0 && turnsWithSeveralCards > 0 && pending > 0 && wrong !== null
    const gap = missOnPurpose ? wrong : correct[0]
    if (gap === undefined) throw new Error(`"${card.title}" has no correct gap`)

    await chooseGap(page, gap)
    await expect(page.getByRole('button', { name: 'Bekreft' })).toBeVisible()
    await shot('valgt-plass')

    const result = await place(page, gap)
    if (missOnPurpose) {
      if (result !== 'miss') throw new Error(`Expected a miss for "${card.title}", got "${result}"`)
      lostToTheMiss = await lineCards(page, 'tapt').count() - 1
      if (lostToTheMiss !== pending) {
        throw new Error(`The miss shows ${lostToTheMiss} lost cards, expected ${pending}`)
      }
      await shot('bom')
      if ((await nextTurn(page)) !== 'placing') throw new Error('No new turn after the miss')
      turns += 1
      pending = 0
      await expect(lineCards(page, 'tapt')).toHaveCount(0)
      await shot('ny-runde')
      continue
    }

    if (result === 'won') {
      won = true
      await expect(page.locator('.tl-kort--apen')).toContainText(card.title)
      await shot('siste-kort')
      await seeResult(page)
      await shot('resultat')
      break
    }
    if (result !== 'deciding') throw new Error(`Expected "${card.title}" to be correct, got "${result}"`)
    pending += 1
    await expect(lineCards(page, 'spill')).toHaveCount(pending)
    await shot('riktig')

    if (pending < cardsATurn) {
      await drawAnother(page)
      await shot('trukket-et-til')
    } else {
      turnsWithSeveralCards += 1
      if ((await lockIn(page)) !== 'placing') throw new Error('No new turn after locking in')
      turns += 1
      pending = 0
      await expect(lineCards(page, 'spill')).toHaveCount(0)
      await shot('last-inn')
    }
  }

  if (!won) throw new Error('The game was not won')
  if (lostToTheMiss === 0) throw new Error('The game had no miss that lost pending cards')
  if (turnsWithSeveralCards === 0) throw new Error('The game had no turn with several cards')
  await expect(page.getByRole('heading', { level: 1, name: '10 kort på tidslinjen' })).toBeVisible()
  await expect(page.locator('.tl-resultat__tall')).toHaveText(String(turns))
  console.log(`Won in ${turns} turns, with ${lostToTheMiss} card lost to a miss on purpose`)
}

/** The seed and whether to play against the API, from the arguments in any order. */
function readArgs(args: string[]): { seed: number; api: boolean } {
  const api = args.includes('--api')
  const rest = args.filter((arg) => arg !== '--api')
  const [arg] = rest
  if (rest.length > 1) throw new Error(`Unknown arguments: ${rest.join(' ')}. Usage: npm run play -- [--api] [seed]`)
  if (arg === undefined) return { seed: 1, api }
  const value = arg.replace(/^--seed=/, '')
  if (!/^\d+$/.test(value)) {
    throw new Error(`The seed must be a whole number, got "${arg}". Usage: npm run play -- [--api] [seed]`)
  }
  return { seed: Number(value), api }
}

/**
 * On the result screen of a game played against the API: the records for everyone, the claim, the
 * saved claim, the screen at 360×640 and in dark mode. Whole-page shots, since the records are below
 * the fold on a phone.
 */
async function claimRecords(page: Page, shot: Shot): Promise<void> {
  await expect(page.getByText('To nye rekorder for alle!')).toBeVisible()
  await shot('rekord-slatt', { fullPage: true })
  await page.getByLabel('Navnet ditt').fill('Testesen')
  await page.getByRole('button', { name: 'Lagre' }).click()
  await expect(page.getByText('Rekordene er dine.')).toBeVisible()
  await shot('rekord-lagret', { fullPage: true })
  await page.emulateMedia({ colorScheme: 'dark' })
  await shot('rekord-lagret-mork', { fullPage: true })
  await page.emulateMedia({ colorScheme: 'light' })
  await page.setViewportSize({ width: 360, height: 640 })
  await shot('rekord-lagret-360')
  await shot('rekord-lagret-360-hel', { fullPage: true })
}

/** The built client, served: on its own, or with the API on this machine. */
async function serve(api: boolean): Promise<{ baseURL: string; close: () => Promise<void> }> {
  if (api) {
    const served = await serveApiAndClient({ api: apiPort, client: port })
    return { baseURL: served.clientUrl, close: served.close }
  }
  await build({ root, logLevel: 'warn' })
  const server = await preview({
    root,
    logLevel: 'warn',
    preview: { host: '127.0.0.1', port, strictPort: true },
  })
  const baseURL = server.resolvedUrls?.local[0]
  if (!baseURL) {
    await server.close()
    throw new Error('The preview server did not report a URL')
  }
  return { baseURL, close: () => server.close() }
}

async function main(): Promise<void> {
  const { seed, api } = readArgs(process.argv.slice(2))

  await rm(outDir, { recursive: true, force: true })
  await mkdir(outDir, { recursive: true })

  const server = await serve(api)
  let browser
  try {
    const { baseURL } = server

    browser = await chromium.launch({ ...browserOptions, headless: true })
    const context = await browser.newContext(phone)
    const page = await context.newPage()
    page.setDefaultTimeout(10_000)

    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') pageErrors.push(message.text())
    })

    let step = 0
    const shot: Shot = async (name, options = {}) => {
      step += 1
      const file = path.join(outDir, `${String(step).padStart(2, '0')}-${name}.png`)
      await settle(page)
      await page.screenshot({ path: file, fullPage: options.fullPage ?? false })
      console.log(path.relative(root, file))
    }

    const url = `${baseURL}?seed=${seed}`
    console.log(`Playing ${url}`)
    await page.goto(url)
    await play(page, shot)
    if (api) await claimRecords(page, shot)

    if (pageErrors.length > 0) {
      throw new Error(`The page logged errors:\n${pageErrors.join('\n')}`)
    }
    console.log(`Done: ${step} screenshot${step === 1 ? '' : 's'} in ${path.relative(root, outDir)}/`)
  } finally {
    await browser?.close()
    await server.close()
  }
}

try {
  await main()
  process.exit(0)
} catch (error) {
  console.error(error)
  process.exit(1)
}
