// The little the API needs from a database. Node's built-in SQLite implements it now
// (sqlite.ts); a hosted SQLite such as Cloudflare D1 can implement it later (ADR 0007).
// Everything is async because hosted databases are.

/** A value bound to a `?` in a statement, or read back from a column. */
export type Value = string | number | null

export interface Statement {
  sql: string
  params?: readonly Value[]
}

export interface Database {
  /** Every row a query returns, as objects keyed by column name. */
  all<Row>(sql: string, params?: readonly Value[]): Promise<Row[]>
  /** The first row a query returns, or null. */
  first<Row>(sql: string, params?: readonly Value[]): Promise<Row | null>
  /** Runs the statements in order, all or nothing. */
  batch(statements: readonly Statement[]): Promise<void>
  /** Runs one or more statements with no parameters, such as a schema file. */
  exec(sql: string): Promise<void>
}
