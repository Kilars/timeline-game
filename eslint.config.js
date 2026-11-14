import js from '@eslint/js'
import { defineConfig, globalIgnores } from 'eslint/config'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig(
  globalIgnores(['dist', 'artifacts', 'test-results', 'playwright-report']),
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    // The client. src/game/ is the pure rules module and must stay free of UI and network code.
    files: ['src/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: { globals: globals.browser },
  },
  {
    // Tooling that runs in Node: configs, end-to-end tests and scripts.
    files: ['*.{js,ts}', 'e2e/**/*.ts', 'scripts/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
)
