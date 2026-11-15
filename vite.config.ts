import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // The site is served at https://kilars.github.io/timeline-game/.
  base: '/timeline-game/',
  plugins: [react()],
  test: {
    // Unit tests live next to the code: the client in src/, the API in api/. End-to-end tests are
    // in e2e/ and run with Playwright.
    include: ['src/**/*.test.{ts,tsx}', 'api/**/*.test.ts'],
    // The API tests use Node's built-in SQLite, which warns on every run that it is experimental.
    execArgv: ['--disable-warning=ExperimentalWarning'],
  },
})
