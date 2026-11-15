// Applies the schema files in api/migrations/ in name order, each once. A host with its own
// migration tool (such as Cloudflare's for D1) can apply the same files instead.

import type { Database } from './db.ts'

export interface Migration {
  /** The file name, such as `0001_init.sql`. Applied in name order. */
  name: string
  sql: string
}

/** Applies the migrations not yet applied, in name order. Returns the names it applied. */
export async function migrate(db: Database, migrations: readonly Migration[]): Promise<string[]> {
  await db.exec('CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY)')
  const done = new Set(
    (await db.all<{ name: string }>('SELECT name FROM _migrations')).map((row) => row.name),
  )
  const applied: string[] = []
  for (const migration of [...migrations].sort((a, b) => a.name.localeCompare(b.name))) {
    if (done.has(migration.name)) continue
    await db.exec(migration.sql)
    await db.batch([{ sql: 'INSERT INTO _migrations (name) VALUES (?)', params: [migration.name] }])
    applied.push(migration.name)
  }
  return applied
}
