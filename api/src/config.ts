// Settings for running the API, read from the environment.

/** The live site, and the client run locally by `npm run dev` and `npm run preview`. */
export const defaultOrigins = [
  'https://kilars.github.io',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
]

/**
 * The allowed origins: `API_ORIGINS` as a comma-separated list, or the defaults when it is unset
 * or blank. An origin is scheme, host and port, with no path: `https://kilars.github.io`.
 */
export function originsFrom(value: string | undefined): string[] {
  const origins = (value ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter((origin) => origin !== '')
  return origins.length > 0 ? origins : [...defaultOrigins]
}

/** The port from `API_PORT`, or 8787. */
export function portFrom(value: string | undefined): number {
  if (value === undefined || value.trim() === '') return 8787
  const port = Number(value)
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`API_PORT must be a port number, got "${value}"`)
  }
  return port
}
