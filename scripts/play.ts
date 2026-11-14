// Plays the app in headless Chrome at phone size and saves a numbered screenshot of every step
// to artifacts/play/. Builds the app, serves it, and stops the server again when done.
//
//   npm run play            seed 1
//   npm run play -- 42      seed 42
//
// Exits with a non-zero code if anything fails, including errors logged by the page.

import { mkdir, rm } from 'node:fs/promises'
import path from 'node:path'
import { chromium, expect, type Page } from '@playwright/test'
import { build, preview } from 'vite'
import { browser as browserOptions, phone } from '../e2e/phone.ts'

const root = path.resolve(import.meta.dirname, '..')
const outDir = path.join(root, 'artifacts', 'play')
const port = 4174

/** Saves a screenshot of the current screen as `<nn>-<name>.png`. */
type Shot = (name: string) => Promise<void>

/**
 * The steps of the game. Each step acts on the page and then calls `shot`.
 * For now this only loads the start page; T2 extends it to play a full game.
 */
async function play(page: Page, shot: Shot): Promise<void> {
  await expect(page.getByRole('heading', { level: 1, name: 'Tidslinje' })).toBeVisible()
  await shot('start')
}

function readSeed(args: string[]): number {
  const arg = args[0]
  if (arg === undefined) return 1
  const value = arg.replace(/^--seed=/, '')
  if (!/^\d+$/.test(value)) {
    throw new Error(`The seed must be a whole number, got "${arg}". Usage: npm run play -- <seed>`)
  }
  return Number(value)
}

async function main(): Promise<void> {
  const seed = readSeed(process.argv.slice(2))

  await rm(outDir, { recursive: true, force: true })
  await mkdir(outDir, { recursive: true })

  await build({ root, logLevel: 'warn' })
  const server = await preview({
    root,
    logLevel: 'warn',
    preview: { host: '127.0.0.1', port, strictPort: true },
  })
  let browser
  try {
    const baseURL = server.resolvedUrls?.local[0]
    if (!baseURL) throw new Error('The preview server did not report a URL')

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
    const shot: Shot = async (name) => {
      step += 1
      const file = path.join(outDir, `${String(step).padStart(2, '0')}-${name}.png`)
      await page.screenshot({ path: file })
      console.log(path.relative(root, file))
    }

    const url = `${baseURL}?seed=${seed}`
    console.log(`Playing ${url}`)
    await page.goto(url)
    await play(page, shot)

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
