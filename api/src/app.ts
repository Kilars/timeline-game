// The HTTP API. Portable: it runs on Node (local.ts) and on Cloudflare Workers (worker.ts), given a
// `Database` for the host (ADR 0007). Decks are read only; records can be claimed (ADR 0010).

import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { cors } from 'hono/cors'
import type { Database } from './db.ts'
import { publicDeckCards, publicDecks } from './decks.ts'
import { claimRecords, parseClaim, parseKey, readRecords } from './records.ts'

/** A claim is a few small numbers and a short name. */
const MAX_CLAIM_BYTES = 1024

export interface AppOptions {
  db: Database
  /** The web origins allowed to call the API from a browser, such as `https://kilars.github.io`. */
  origins: readonly string[]
  /** The clock, in milliseconds. For tests. */
  now?: () => number
}

export function createApp({ db, origins, now = Date.now }: AppOptions) {
  const app = new Hono()

  app.use(
    '*',
    cors({
      origin: (origin) => (origins.includes(origin) ? origin : null),
      allowMethods: ['GET', 'POST'],
      allowHeaders: ['Content-Type'],
      maxAge: 600,
    }),
  )

  // Records change while people play, so nothing may be kept by a cache on the way.
  app.use('*', async (c, next) => {
    await next()
    c.header('Cache-Control', 'no-store')
  })

  app.get('/decks', async (c) => c.json({ decks: await publicDecks(db) }))

  app.get('/decks/:id/cards', async (c) => {
    const cards = await publicDeckCards(db, c.req.param('id'))
    // An unknown deck and a private one get the same answer, so a private deck is not given away.
    if (!cards) return c.json({ error: 'not_found' }, 404)
    return c.json({ cards })
  })

  app.get('/records', async (c) => {
    const key = parseKey(c.req.query('target'), c.req.query('precision'))
    if (!key) return c.json({ error: 'bad_request' }, 400)
    return c.json({ records: await readRecords(db, key) })
  })

  app.post(
    '/records',
    bodyLimit({ maxSize: MAX_CLAIM_BYTES, onError: (c) => c.json({ error: 'too_large' }, 413) }),
    async (c) => {
      // A JSON body makes a browser ask first (CORS preflight), so a page on another site cannot
      // send claims from its visitors' browsers.
      if (!/^application\/json\s*(;|$)/i.test(c.req.header('Content-Type') ?? '')) {
        return c.json({ error: 'unsupported_media_type' }, 415)
      }
      let body: unknown
      try {
        body = await c.req.json()
      } catch {
        return c.json({ error: 'bad_request' }, 400)
      }
      const claim = parseClaim(body)
      if (!claim) return c.json({ error: 'bad_request' }, 400)
      return c.json(await claimRecords(db, claim, new Date(now())))
    },
  )

  app.notFound((c) => c.json({ error: 'not_found' }, 404))

  app.onError((error, c) => {
    console.error(error)
    return c.json({ error: 'server_error' }, 500)
  })

  return app
}
