// The API on Cloudflare Workers (ADR 0007). Deployed by `wrangler deploy` with wrangler.jsonc.
// The schema is applied with `wrangler d1 migrations apply`, from api/migrations/.

import { createApp } from './src/app.ts'
import { originsFrom } from './src/config.ts'
import { d1Database, type D1Database } from './src/d1.ts'

interface Env {
  DB: D1Database
  /** Comma-separated origins allowed to call the API; the defaults when unset. */
  API_ORIGINS?: string
}

export default {
  fetch(request: Request, env: Env): Response | Promise<Response> {
    const app = createApp({ db: d1Database(env.DB), origins: originsFrom(env.API_ORIGINS) })
    return app.fetch(request)
  },
}
