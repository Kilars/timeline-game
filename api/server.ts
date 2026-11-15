// npm run api: serves the API on this machine over the local database. Seed it first with
// `npm run api:seed`; the schema is brought up to date on start.
//
//   API_PORT     port, default 8787
//   API_HOST     address to listen on, default 127.0.0.1 (this machine only)
//   API_DB       SQLite file, default api/local.sqlite
//   API_ORIGINS  comma-separated web origins allowed to call it; see api/src/config.ts

import path from 'node:path'
import { originsFrom, portFrom } from './src/config.ts'
import { defaultDbPath, openLocalDatabase, serveLocal } from './src/local.ts'

const file = process.env.API_DB || defaultDbPath
const origins = originsFrom(process.env.API_ORIGINS)
const db = await openLocalDatabase(file)
const server = await serveLocal({
  db,
  port: portFrom(process.env.API_PORT),
  hostname: process.env.API_HOST || '127.0.0.1',
  origins,
})

console.log(`API on ${server.url} over ${path.relative(process.cwd(), file)}`)
console.log(`Allowed origins: ${origins.join(', ')}`)

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void server.close().finally(() => {
      db.close()
      process.exit(0)
    })
  })
}
