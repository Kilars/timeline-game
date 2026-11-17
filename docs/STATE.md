# State

Updated: 2026-11-15

## Current state

Lars said go on 2026-11-14. Public repo Kilars/timeline-game exists. T0 is done: the scaffold is live at https://kilars.github.io/timeline-game/ (placeholder page), `npm run check` is the gate, `npm run play` saves phone-size screenshots to `artifacts/play/`. Every push to main runs the gate and deploys.

Known quirk: headless Chrome hangs on a cold start on Lars's laptop unless `--disable-gpu` is set (it is, in `e2e/phone.ts`). The cause is not known.

Decided 2026-11-15: no filters in version 1; reveal happens on confirming a placement; screens are built plain with one theme file and restyled from a Claude Design handoff (prompt in `design-prompt.md`).

T1 is done: the rules live in `src/game/` (see its README), pure and seeded, 146 unit tests. The reviewer found no defects and played 2160 seeded games through it.

T2 is done: the game screen is built in the design (src/ui/, tokens in src/theme.css) and plays the fixture deck (src/fixtures/). Opening the app starts a game at once; T3 puts the start screen in front of it. The reviewer found four defects, all fixed: the winning card now gets its reveal before "Se resultatet"; a miss names the cards it took; a chosen gap at the end of the line is kept clear of the "Nyere kort" chip; two fixture titles were corrected. Ideas from the review are in `IDEAS.md`. The copy says lost cards are "Ute av spillet", as the spec says; the design's "Tilbake i bunken" is wrong there.

T3 is done: the app opens on the start screen (src/ui/Start.tsx) with deck ticks, the mix slider, the target and the judging precision, remembered on the device (src/ui/settings.ts). src/ui/setup.ts turns the choices into a game; the mix itself is applied by the rules, which fall back to the other pile when one runs out. The fixture now has two decks, "Historie" and the fictional "Familien Testesen". The result screen has "Til start". The review found three defects, all fixed: a disabled "Spill" looked active; "Spill" was below the fold on short phones (it now sticks to the foot); the UI dropped whole decks at 0 % and 100 %, against the spec's fallback.

T4 is done: a Hono API over SQLite in `api/` (Node's built-in `node:sqlite` locally; the `Database` interface is async so D1 can implement it). Schema in `api/migrations/0001_init.sql`: decks, cards, and the codes tables for T5. `GET /decks` and `GET /decks/:id/cards` serve public decks only; a private deck gets the same 404 as an unknown one. `npm run api:seed`, `npm run api` and `npm run dev:api` run it locally (README). The client reads the API when built with `VITE_API_URL`, otherwise the bundled fixture, so the live site and the tests still use the fixture. The reviewer found no defects; ideas are in `IDEAS.md`.

T8 brought forward on 2026-11-15 with Lars's yes: the T4 API runs on Cloudflare Workers + D1 at https://tidslinje-api.kilars.workers.dev (D1 database `tidslinje`, seeded with the public history fixture deck, 44 cards). CI applies migrations, deploys the Worker, then builds the site against it. Still open for T8: a health route, and a regular backup export.

T7 started on 2026-11-15 at Lars's request: `node api/history-import.ts --push` loaded 1000 history cards from Wikidata into the hosted "historie" deck (README, "History deck"). Titles and reveal lines are Wikidata's bokmål text as it is; the AI curation pass and the reviewer's 50-card check against Wikidata are still to do. Julian-calendar dates keep only the year. Books were left out because their query times out on the public service. On 2026-11-17, after Lars found the cards too niche, the import was changed to rank by how often the Norwegian Wikipedia article is read (last 60 days), to add wars (start and end) and the births, deaths and events among the most read Norwegian articles of the last two years (people only with 50+ Wikipedias), and to cap each type at 15 %. After a play run the same day, Claude curated the 840 best known by hand (`api/src/history-curation.ts`: 111 clearer titles, 171 cards dropped as duplicates, wrong or disputed dates or too obscure), births from 1960 on and shuttle flights named by code were left out, and the bottom 10 % cut; 670 cards are loaded.

Notes for coming tasks:

- T5: `codes.hash` is a unique lookup hash, so short play codes need a server-side pepper: a Worker secret (`wrangler secret put`), never in the repo.
- T5: a new migration file is applied to D1 by CI on push; test it locally first.
- T5: code entry per ADR 0003 as updated 2026-11-15: no feedback on the taps, one text field made for pasting a long code.
- T8: add a health route for the host's checks.

## Waiting on Lars

1. **Backend:** deployed 2026-11-15 on Cloudflare Workers + D1 (ADR 0007). The API answered from Lars's laptop on the home network, so Nettvern does not block `workers.dev` there; phones on mobile data are untested.
2. **Design handoff:** arrived on Lars's private Design canvas on 2026-11-15 (16 artboards: seven screens, dark mode, the game at 1280, card states, tokens, motion, developer handoff). Lars has not said it is final; if it changes, T9 picks up the differences. The canvas link is kept out of this public repo; the orchestrator session has it. Before T9, fetch the artboards into the git-ignored folder `design-handoff/`.
3. Optional: overrule any default listed at the bottom of `SPEC.md`.

## Next task

T5: codes. Build it in the design (board "6 Code entry", `design-handoff/CodeEntry.dc.html`).

## Backlog

| # | Task | Done when | Status |
|---|---|---|---|
| T0 | Repo and tooling: git repo, public GitHub repo, Vite + React + TypeScript scaffold, Vitest, Playwright, `npm run check`, `npm run play`, Pages deploy workflow | An empty page is live on Pages and the gate passes | Done 2026-11-15 |
| T1 | Game rules as a pure module: turns, pending and locked cards, miss, lock in, win, judging with precision and ties, draw with deck mix and no repeats, seeded shuffle | Unit tests cover every rule in SPEC "Game rules" | Done 2026-11-15 |
| T2 | Game screen on the fixture deck: vertical timeline, tap a gap, reveal, draw another or lock in, miss feedback, result screen with personal best; all colours, fonts and spacing in one theme file | `npm run play` completes a full game; stories P2 to P6, P11 | Done 2026-11-15 |
| T3 | Start screen: deck ticks, mix slider, target, judging precision, remembered settings | Stories P1, P7, P8, P12 | Done 2026-11-15 |
| T4 | API and local database: schema, read endpoints for decks and cards, seed script, client reads from the API | The game runs locally against the API; fixture deck still used in tests | Done 2026-11-15 |
| T5 | Codes: private decks, play codes, hidden code entry, hashed storage, rate limit | Stories P10, O2 to O4, O6; a test proves a private deck is not returned without its code | Not started |
| T6 | Editor: edit codes, add, change and delete cards, create decks | Stories A1 to A4, O1 | Not started |
| T7 | History import: Wikidata query script, AI curation to about 1000 Norwegian cards, load into the database | Story O5; a sample of 50 cards checked against Wikidata by the reviewer | Not started |
| T8 | Backend deploy to Cloudflare Workers + D1 (ADR 0007) | The live site plays against the hosted backend from a phone | Waits on Lars's Cloudflare account and yes |
| T9 | Design check after T6: compare every screen with the handoff at phone size and 1280, light and dark, and fix what differs | Reviewer finds no differences that matter; gate passes | Not started |
