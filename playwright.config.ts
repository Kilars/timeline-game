import { defineConfig } from '@playwright/test'
import { browser, phone } from './e2e/phone.ts'

// The tests run against the production build, served under the same base path as on GitHub Pages.
const port = 4173
const baseURL = `http://127.0.0.1:${port}/timeline-game/`

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results',
  reporter: 'list',
  forbidOnly: !!process.env.CI,
  workers: 1,
  use: {
    ...phone,
    launchOptions: browser,
    baseURL,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `npm run build && npm run preview -- --host 127.0.0.1 --port ${port} --strictPort`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
