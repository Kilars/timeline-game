# Tidslinje

A timeline card game: place event cards in the right order and push your luck each turn.
Norwegian only, phone first. Live at https://kilars.github.io/timeline-game/.

## Run

Needs Node 22.18 or newer and Google Chrome.

```sh
npm install
npm run dev          # dev server at http://localhost:5173/timeline-game/
npm run check        # the gate: type check, lint, unit tests, end-to-end tests
npm run play         # plays one full game in headless Chrome at phone size, seed 1
npm run play -- 42   # the same with seed 42
```

The app opens on the start screen. Built without an API address, as above, it plays the bundled
fixture decks; that is what the tests and `npm run play` use. The live site is built against the
hosted API (see below).

- `?seed=<integer>` in the address fixes the game: the same seed always deals the same cards.
  Without it a seed is picked by chance, and "Spill igjen" always picks a new one.
- The best score per target is kept in the browser's localStorage under `tidslinje:rekord`.
  The game also works when storage is blocked; the best score then lasts until the page is closed.

`npm run play` plays a seeded game to a win and saves a numbered screenshot of every step to
`artifacts/play/`, after the animations have finished. The game it plays has a turn with several
cards, a miss on purpose that loses a pending card, and the result screen. It finds the right gap
the way the end-to-end tests do (`e2e/helpers.ts`): it reads the cards on screen, looks them up in
the fixture deck and asks the rules. The app has no debug hook.

## Run against the API

The API (`api/`) serves decks and cards from a SQLite database. It runs on this machine with no
cloud account, on Node's built-in SQLite.

```sh
npm run api:seed     # creates api/local.sqlite (git-ignored) and loads the fixture decks into it
npm run api          # serves it at http://127.0.0.1:8787
npm run dev:api      # in another terminal: the client at http://localhost:5173/timeline-game/, reading the API
```

The client reads the API when it is built with `VITE_API_URL` set, and plays the bundled fixture
decks when it is not. A production build against the local API:
`VITE_API_URL=http://127.0.0.1:8787 npm run build && npm run preview`.

- `GET /decks` lists the public decks: `{ decks: [{ id, name, visibility, kind }] }`.
- `GET /decks/:id/cards` gives a public deck's cards: `{ cards: [{ id, title, reveal?, year,
  month?, day?, source? }] }`. A field that is empty in the database is left out, never sent as
  null. An unknown deck and a private one both get 404 `{ "error": "not_found" }`.
- Private decks are never returned. Codes that open them come in T5. The fixture family deck is
  private, so it is seeded but not served.
- The API is read only. The schema is in `api/migrations/` and is applied on start and on seed.
- Settings: `API_PORT` (8787), `API_HOST` (127.0.0.1), `API_DB` (`api/local.sqlite`) and
  `API_ORIGINS`, a comma-separated list of web origins allowed to call it. The default allows
  `https://kilars.github.io` and the local client on ports 5173 and 4173.

## Hosted API

The live API is a Cloudflare Worker over D1 (ADR 0007): https://tidslinje-api.kilars.workers.dev.
`api/worker.ts` is its entry, `api/src/d1.ts` the D1 version of the database interface, and
`wrangler.jsonc` its configuration. On every push to main, GitHub Actions runs the gate, applies
new files in `api/migrations/` to D1, deploys the Worker, and then builds the site with
`VITE_API_URL` set to it. It needs the secrets `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID` on the `github-pages` environment.

By hand, with those two set in the environment:

```sh
npx wrangler@4.156.0 d1 migrations apply tidslinje --remote   # the schema
npm run -s api:seed-sql > seed.sql                              # the public fixture decks as SQL
npx wrangler@4.156.0 d1 execute tidslinje --remote --file seed.sql
npx wrangler@4.156.0 deploy                                     # the Worker
```

## History deck

`node api/history-import.ts` builds the history deck from Wikidata: dated events (battles,
treaties, disasters and more), international organisations by founding date and crewed space
flights by launch, with Norwegian bokmål labels as titles and descriptions as reveal lines. It
keeps the 1000 best known (by number of Wikipedia articles), at most a quarter of one type, drops
titles that give the date away, and writes `artifacts/history/cards.json` and `history.sql`.
`--push` loads them into the hosted database, replacing every card in the "historie" deck;
`--count <n>` picks another number. Logic and tests: `api/src/wikidata.ts`.

## Layout

- `src/` is the client.
  - `src/game/` is the pure rules module, with no UI, network, storage or randomness of its own.
  - `src/fixtures/` is the fixture deck: public history and a fictional family. Real personal
    cards never go in the repo.
  - `src/ui/` is the game screen and the result screen, and the plain functions behind them
    (dates, best score, seed, the session on top of the rules).
  - `src/theme.css` holds every colour, font, size, spacing, radius, shadow and timing as a
    `--tl-*` variable, light and dark. The component styles in `src/ui/*.css` use only those.
  - `src/data/` reads the decks from the API and checks what comes back.
- `api/` is the API: a [Hono](https://hono.dev) app (`api/src/app.ts`) over a small database
  interface (`api/src/db.ts`), so the same app can run on Node now and on a hosted runtime later
  (ADR 0007). `api/src/sqlite.ts` implements the interface with `node:sqlite`. Its tests are in
  `api/src/` and run with the unit tests.
- `e2e/` holds the end-to-end tests and their helpers, `scripts/` the play script. `e2e/api.spec.ts`
  starts the API over a seeded in-memory database, builds the client against it and plays a game.
- `docs/` holds the spec (`SPEC.md`), the current state (`STATE.md`), how work is done
  (`WORKFLOW.md`) and the decisions (`adr/`).
