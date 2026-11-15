import { describe, expect, it } from 'vitest'
import { inline, sqlDump } from './sql-dump.ts'

describe('sql dump', () => {
  it('puts parameters in, quoting text and writing NULL', () => {
    expect(inline({ sql: 'INSERT INTO t VALUES (?, ?, ?)', params: ["O'Brien", -490, null] })).toBe(
      "INSERT INTO t VALUES ('O''Brien', -490, NULL);",
    )
  })

  it('refuses a wrong number of parameters', () => {
    expect(() => inline({ sql: 'SELECT ?', params: [] })).toThrow()
    expect(() => inline({ sql: 'SELECT 1', params: [1] })).toThrow()
  })

  it('collects batches as lines and cannot be read', async () => {
    const db = sqlDump()
    await db.batch([{ sql: 'DELETE FROM cards WHERE deck_id = ?', params: ['historie'] }])
    expect(db.text()).toBe("DELETE FROM cards WHERE deck_id = 'historie';\n")
    await expect(db.all('SELECT 1')).rejects.toThrow()
  })
})
