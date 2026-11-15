// The `Database` on Cloudflare D1 (ADR 0007). The few D1 types it uses are written out here, so
// the API needs no Cloudflare package to type-check.

import type { Database, Statement, Value } from './db.ts'

interface D1PreparedStatement {
  bind(...values: Value[]): D1PreparedStatement
  all<Row>(): Promise<{ results: Row[] }>
  first<Row>(): Promise<Row | null>
}

export interface D1Database {
  prepare(sql: string): D1PreparedStatement
  batch(statements: D1PreparedStatement[]): Promise<unknown>
  exec(sql: string): Promise<unknown>
}

export function d1Database(d1: D1Database): Database {
  const prepare = (sql: string, params: readonly Value[] = []) => d1.prepare(sql).bind(...params)
  return {
    async all<Row>(sql: string, params?: readonly Value[]) {
      return (await prepare(sql, params).all<Row>()).results
    },
    async first<Row>(sql: string, params?: readonly Value[]) {
      return prepare(sql, params).first<Row>()
    },
    async batch(statements: readonly Statement[]) {
      // D1 runs a batch as one transaction: all or nothing.
      if (statements.length > 0) await d1.batch(statements.map((s) => prepare(s.sql, s.params)))
    },
    async exec(sql: string) {
      await d1.exec(sql)
    },
  }
}
