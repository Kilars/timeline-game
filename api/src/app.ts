// The HTTP API. Portable: it runs on Node now (local.ts) and can run on a hosted runtime such as
// Cloudflare Workers later, given a `Database` for that host (ADR 0007). Read only in T4.

import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Database } from './db.ts'
import { publicDeckCards, publicDecks } from './decks.ts'

export interface AppOptions {
  db: Database
  /** The web origins allowed to call the API from a browser, such as `https://kilars.github.io`. */
  origins: readonly string[]
}

export function createApp({ db, origins }: AppOptions) {
  const app = new Hono()

  app.use(
    '*',
    cors({
      origin: (origin) => (origins.includes(origin) ? origin : null),
      allowMethods: ['GET'],
    }),
  )

  app.get('/decks', async (c) => c.json({ decks: await publicDecks(db) }))

  app.get('/decks/:id/cards', async (c) => {
    const cards = await publicDeckCards(db, c.req.param('id'))
    // An unknown deck and a private one get the same answer, so a private deck is not given away.
    if (!cards) return c.json({ error: 'not_found' }, 404)
    return c.json({ cards })
  })

  app.notFound((c) => c.json({ error: 'not_found' }, 404))

  app.onError((error, c) => {
    console.error(error)
    return c.json({ error: 'server_error' }, 500)
  })

  return app
}
