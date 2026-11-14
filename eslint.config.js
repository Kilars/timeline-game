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
    // The rules of the game are pure: nothing from outside src/game/, no browser, no network,
    // no storage, and no randomness or clock other than the seeded generator.
    files: ['src/game/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: gameImports() }],
      'no-restricted-globals': [
        'error',
        ...['window', 'document', 'localStorage', 'fetch'].map((name) => ({
          name,
          message: 'src/game/ is the pure rules module: no browser, storage or network.',
        })),
      ],
      'no-restricted-properties': [
        'error',
        { object: 'Math', property: 'random', message: 'Use the seeded generator in rng.ts.' },
        { object: 'Date', property: 'now', message: 'The rules must not depend on the clock.' },
      ],
    },
  },
  {
    // The tests of the rules may also import the test runner.
    files: ['src/game/**/*.test.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: gameImports('vitest') }],
    },
  },
  {
    // Tooling that runs in Node: configs, end-to-end tests and scripts.
    files: ['*.{js,ts}', 'e2e/**/*.ts', 'scripts/**/*.ts'],
    languageOptions: { globals: globals.node },
  },
)

/**
 * Import patterns that keep a file inside src/game/: only `./` paths that never climb with `..`,
 * plus the packages named in `allowed`. This shuts out react, react-dom and every other package.
 */
function gameImports(...allowed) {
  const message = 'src/game/ is the pure rules module: import only from inside src/game/.'
  return [
    { regex: `^(?!\\./${allowed.map((name) => `|${name}$`).join('')})`, message },
    { regex: '^\\./(.*/)?\\.\\.(/|$)', message },
  ]
}
