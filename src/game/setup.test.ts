import { expect, test } from 'vitest'

// Proves that the unit test setup runs. src/game/ is reserved for the pure
// rules module (T1), whose tests replace this file.
test('the unit test setup runs', () => {
  expect(1 + 1).toBe(2)
})
