// A `Database` that writes SQL text instead of running it, so a seed can be sent to a hosted
// database as a file (`wrangler d1 execute --file`). For our own seed data only.

import type { Database, Statement, Value } from './db.ts'

function literal(value: Value): string {
  if (value === null) return 'NULL'
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error(`Cannot write ${value} as SQL`)
    return String(value)
  }
  return `'${value.replaceAll("'", "''")}'`
}

/** Puts the parameters into the statement, in order. */
export function inline({ sql, params = [] }: Statement): string {
  let next = 0
  const text = sql.replace(/\?/g, () => {
    if (next >= params.length) throw new Error(`Too few parameters for: ${sql}`)
    return literal(params[next++] as Value)
  })
  if (next !== params.length) throw new Error(`Too many parameters for: ${sql}`)
  return `${text.replace(/\s+/g, ' ').trim()};`
}

export function sqlDump(): Database & { text(): string } {
  const lines: string[] = []
  const nothing = () => Promise.reject(new Error('An SQL dump cannot be read'))
  return {
    all: nothing,
    first: nothing,
    async batch(statements: readonly Statement[]) {
      for (const statement of statements) lines.push(inline(statement))
    },
    async exec(sql: string) {
      lines.push(sql)
    },
    text: () => `${lines.join('\n')}\n`,
  }
}
