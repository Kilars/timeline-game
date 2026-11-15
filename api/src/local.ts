// Running the API on this machine: the SQLite file, the schema files and the HTTP server.
// Node only. Used by `npm run api`, `npm run api:seed` and the tests.

import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { serve, type ServerType } from '@hono/node-server'
import { createApp } from './app.ts'
import { migrate, type Migration } from './migrate.ts'
import { openSqlite, type LocalDatabase } from './sqlite.ts'

export const migrationsDir = path.resolve(import.meta.dirname, '..', 'migrations')

/** The local database file when none is given: git-ignored, like every `*.sqlite`. */
export const defaultDbPath = path.resolve(import.meta.dirname, '..', 'local.sqlite')

/** The schema files in api/migrations/. */
export function readMigrations(dir = migrationsDir): Migration[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith('.sql'))
    .map((name) => ({ name, sql: readFileSync(path.join(dir, name), 'utf8') }))
}

/** Opens a SQLite file (or `:memory:`) and brings its schema up to date. */
export async function openLocalDatabase(file: string): Promise<LocalDatabase> {
  const db = openSqlite(file)
  try {
    await migrate(db, readMigrations())
  } catch (error) {
    db.close()
    throw error
  }
  return db
}

export interface LocalServer {
  url: string
  close(): Promise<void>
}

/** Serves the API over a database on this machine until `close` is called. */
export function serveLocal(options: {
  db: LocalDatabase
  port: number
  hostname?: string
  origins: readonly string[]
}): Promise<LocalServer> {
  const { db, port, hostname = '127.0.0.1', origins } = options
  const app = createApp({ db, origins })
  return new Promise((resolve, reject) => {
    const server: ServerType = serve({ fetch: app.fetch, port, hostname }, (info) => {
      resolve({
        url: `http://${hostname}:${info.port}`,
        close: () =>
          new Promise<void>((done, fail) => server.close((error) => (error ? fail(error) : done()))),
      })
    })
    server.once('error', reject)
  })
}
