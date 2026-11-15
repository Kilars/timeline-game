# 0007: Backend host

Status: Accepted (Lars, 2026-11-15): **option A, Cloudflare Workers + D1**, on the `workers.dev` address.

## Decision

- The API runs as a Cloudflare Worker over D1. The `Database` interface gets a D1 implementation; the schema is applied with wrangler's D1 migrations from `api/migrations/`.
- The code pepper is a Worker secret (`wrangler secret put`), never in the repo.
- GitHub Actions deploys the Worker with a Cloudflare API token kept as a repository secret, and builds Pages with `VITE_API_URL` set to the Worker's address.
- The owner's code script reaches the hosted database through wrangler.
- On day one, the `workers.dev` address is tested from the family's phones, because Telenor Nettvern has blocked Cloudflare domains before. If it is blocked, a domain of Lars's own is pointed at the Worker.
- Backups: D1's point-in-time restore, plus a regular export to a private place. Check D1's current free limits before the first deploy.
- The first deploy still needs Lars's explicit yes, and Lars creates the Cloudflare account and the API token.

Lars deferred this on 2026-11-14 and asked for pros and cons; the options as weighed then follow.

## What the host must do

- Hold a small database: a few thousand cards, a handful of decks and codes.
- Run an API that checks codes on the server and accepts admin edits.
- Stay private, cost nothing, and be awake when someone wants to play, also after weeks of no use.
- Be deployable by an agent from GitHub Actions.

## Options

### A. Cloudflare Workers + D1 (Claude's recommendation)

A small API script and a hosted SQLite database.

| For | Against |
|---|---|
| Free tier far above this project's needs | A new account to create |
| Never sleeps, no cold start to speak of | Lars's Telenor Nettvern has blocked Cloudflare tunnel domains before. `workers.dev` must be tested from the phones on day one |
| SQLite, the same engine used in local development and tests | A little Cloudflare-specific glue |
| One deploy command, easy for agents | |

### B. Supabase

Hosted Postgres with auth and a dashboard.

| For | Against |
|---|---|
| Dashboard for browsing and editing cards by hand | Free projects pause after about a week without traffic; a game played now and then needs a keep-alive job |
| Built-in auth if accounts are ever wanted | Access rules live in database policies, which are harder for agents to test locally (needs Docker, not installed here) |
| No API code to write for simple reads | Postgres differs from the SQLite used in local tests |

### C. Azure Functions + Table Storage

| For | Against |
|---|---|
| Lars already has a subscription | Most setup of the four; Azure CLI is not installed on this machine |
| Scales to anything | Cold starts of several seconds on the free plan |
| | Storage differs from local SQLite, so a second storage layer to write and test |
| | A misconfiguration can cost money |

### D. The spare laptop

API and a SQLite file at home, reached through a tunnel.

| For | Against |
|---|---|
| Free, fully under Lars's control | Game is down when the laptop sleeps, loses power or loses network |
| Simplest code: one process, one file | Needs a tunnel; Cloudflare tunnels are blocked on the home network, and free alternatives give unstable addresses |
| Data never leaves the house | A home machine exposed to the internet |
| | Backups are Lars's job |

Free tier limits change. Check the current ones for the chosen option before committing.

## Keeping the decision cheap to defer

The API is written as a small portable HTTP app over SQLite. It runs locally for development and tests with no cloud account. Options A and D can host it nearly unchanged. Option C needs a different storage layer. Option B replaces the API with Supabase's own and would mean rewriting the data layer.

Everything except the backend deploy (task T8 in `STATE.md`) can be built before this is decided.
