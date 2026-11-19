// The API on this machine over an in-memory database seeded from the fixture decks (as
// `npm run api:seed` does), and the client built with VITE_API_URL pointing at it, served on its own
// port. Shared by e2e/api.spec.ts and `npm run play -- --api`.

import { mkdtemp, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { build, preview, type PreviewServer } from 'vite'
import { openLocalDatabase, serveLocal, type LocalServer } from '../api/src/local.ts'
import { seedDecks } from '../api/src/seed.ts'
import type { LocalDatabase } from '../api/src/sqlite.ts'
import { fixtureDecks } from '../src/fixtures/cards.ts'

const root = path.resolve(import.meta.dirname, '..')

export interface ApiAndClient {
  db: LocalDatabase
  /** The API's address, such as `http://127.0.0.1:4176`. */
  apiUrl: string
  /** The client's address, with the base path and a trailing slash. */
  clientUrl: string
  close(): Promise<void>
}

export async function serveApiAndClient(ports: { api: number; client: number }): Promise<ApiAndClient> {
  const clientOrigin = `http://127.0.0.1:${ports.client}`
  let db: LocalDatabase | undefined
  let api: LocalServer | undefined
  let client: PreviewServer | undefined
  let outDir: string | undefined

  const close = async () => {
    await client?.close()
    await api?.close()
    db?.close()
    if (outDir) await rm(outDir, { recursive: true, force: true })
  }

  try {
    db = await openLocalDatabase(':memory:')
    await seedDecks(db, fixtureDecks)
    api = await serveLocal({ db, port: ports.api, origins: [clientOrigin] })

    outDir = await mkdtemp(path.join(os.tmpdir(), 'tidslinje-api-client-'))
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
      preview: { host: '127.0.0.1', port: ports.client, strictPort: true },
    })
    return { db, apiUrl: api.url, clientUrl: `${clientOrigin}/timeline-game/`, close }
  } catch (error) {
    await close()
    throw error
  }
}
