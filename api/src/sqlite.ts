// The database interface over Node's built-in SQLite (node:sqlite), for local runs and tests.
// Node only: a hosted API implements `Database` with its own driver instead.

import { DatabaseSync } from 'node:sqlite'
import type { Database, Statement, Value } from './db.ts'

export interface LocalDatabase extends Database {
  close(): void
}

/** Opens a SQLite file, or a fresh in-memory database for `:memory:`. Foreign keys are enforced. */
export function openSqlite(path: string): LocalDatabase {
  const db = new DatabaseSync(path, { enableForeignKeyConstraints: true })

  const run = ({ sql, params = [] }: Statement) => db.prepare(sql).run(...params)

  return {
    async all<Row>(sql: string, params: readonly Value[] = []) {
      return db.prepare(sql).all(...params) as Row[]
    },
    async first<Row>(sql: string, params: readonly Value[] = []) {
      return (db.prepare(sql).get(...params) as Row | undefined) ?? null
    },
    async batch(statements: readonly Statement[]) {
      db.exec('BEGIN')
      try {
        for (const statement of statements) run(statement)
        db.exec('COMMIT')
      } catch (error) {
        db.exec('ROLLBACK')
        throw error
      }
    },
    async exec(sql: string) {
      db.exec(sql)
    },
    close() {
      db.close()
    },
  }
}
