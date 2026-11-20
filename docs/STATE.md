# State

Updated: 2026-11-20

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

On 2026-11-18, at Lars's request (ideas from 2026-11-17), cards got a description: shown under the title on the card in hand and on the opened card, never giving the date away (migration `0002_card_descriptions.sql`, ADR 0006 update). Births and deaths are no longer fetched; about 300 hand-written cards (`api/src/history-milestones.ts`: inventions, discoveries, works, achievements, events, and the few deaths that are events) take their place, each date checked against Wikidata and the Wikipedia intro. Every Wikidata card has a description in `api/src/history-descriptions.ts`, or is left out. The curation can now correct dates. The same change fixed CI, red on main since `331b267` because `api/history-import.ts` lacked three imports.

On 2026-11-19, at Lars's request, the app was restyled to the "Avis, utklipp" look. Lars found the checked tablecloth was not working and picked this look on 2026-11-18 from three alternatives on a second private Design canvas; its link is kept out of this repo. The look is newsprint paper and ink, set in Newsreader and IBM Plex Mono. Cards are clippings on a darker desk, with the year in an ink stamp. Pending cards are yellow with a red "På spill" stamp. Corners are square and shadows are hard offsets. Dark mode is a night edition of the same paper. Only the tokens, the component CSS and the font link changed. The timeline's line and dots are no longer drawn, because the clippings and stamps carry the order.

T10 is done (2026-11-19, at Lars's request): records for everyone, kept in D1 (ADR 0010). Two records per target and judging precision: the fewest turns to win, and the most cards secured in one turn (`Player.mostInTurn` in the rules). `GET /records` and `POST /records` in `api/src/records.ts`; a record is written only when a claim beats it, in one conditional upsert per record, and impossible claims and hidden-character names are refused. The result screen fetches the records as soon as a game is won and shows them beside the game's own numbers; a game on public history decks alone that beats one asks for a name at the top. The device best is now "Ditt beste", so "rekord" means only the shared records. `npm run play -- --api` plays against a local API and screenshots the claim. The design, the plan and the build each had one review; the findings that were left are in `IDEAS.md`. Lars has not seen it yet; the defaults are listed in `SPEC.md`.

On 2026-11-19 Lars asked how to get light mode, and chose a switch: "Utseende" on the start screen offers Auto (follows the device, as before), Lys and Mørk, remembered on the device (`src/ui/theme.ts`).

On 2026-11-20 the history deck built on 2026-11-18 was loaded into the hosted database at Lars's yes: 727 cards, all with descriptions, 11 deaths (it had still been the 670 cards without descriptions and with about 140 deaths). The same day a loop for improving the cards was set up (`docs/CARDS.md`): a blind playtest by an agent (`scripts/playtest.ts`), a report, suggested changes that Lars keeps or rejects on a private review page (its link is kept out of this repo), then the changes go into the curation files and the deck is loaded again. Round 1 played 120 cards. Organisations being founded, wars with both a start and an end card (43 of them), Norwegian battles, titles in specialist words and local accidents with no clue to the era were the weakest; about 29 % of the deck is war. The model placed 98 % right, so the share placed right is no measure; the flags are. Lars kept 45 of round 1's 49 suggestions and rejected four drops (the Spanish succession war, the Algerian war, the Boston massacre, the Unabomber). Applied and loaded the same day: 586 cards. 147 dropped (organisations being founded except the famous ones, one card per war except the world wars, war and violence cut to about 15 % keeping the best known, and cards the playtest found blind), 15 clearer titles or descriptions, the fourth crusade moved to the sack of Constantinople (1204), and six new cards on everyday life, food and women's history. Anne Hov's brunost is in as 1863, at Lars's wish, though the sources give 1862 or 1863. "Den cubanske revolusjon" fell out because Wikidata did not return it this time.

Notes for coming tasks:

- T5 rebase: records took migration `0004_records.sql` and left `0003` for `0003_codes.sql`; wrangler applies any migration not yet applied, whatever its number. Append `0004_records.sql` to the list in T5's `schema.test.ts`. CORS (GET and POST) and the global `Cache-Control: no-store` are already as on the T5 branch; T5 adds its codes header. T5's `createApp` takes `now: () => number`, as records does now.
- T5 or later: claims are not rate limited per client. T5's attempt counter could limit them too (ADR 0010).

- T5: `codes.hash` is a unique lookup hash, so short play codes need a server-side pepper: a Worker secret (`wrangler secret put`), never in the repo.
- T5: a new migration file is applied to D1 by CI on push; test it locally first.
- T5: code entry per ADR 0003 as updated 2026-11-15: no feedback on the taps, one text field made for pasting a long code.
- T8: add a health route for the host's checks.

## Waiting on Lars

1. **Backend:** deployed 2026-11-15 on Cloudflare Workers + D1 (ADR 0007). The API answered from Lars's laptop on the home network, so Nettvern does not block `workers.dev` there; phones on mobile data are untested.
2. **Design handoff:** arrived on Lars's private Design canvas on 2026-11-15 (16 artboards: seven screens, dark mode, the game at 1280, card states, tokens, motion, developer handoff). Lars has not said it is final; if it changes, T9 picks up the differences. The canvas link is kept out of this public repo; the orchestrator session has it. Before T9, fetch the artboards into the git-ignored folder `design-handoff/`. On 2026-11-18 Lars replaced the handoff's look with "Avis, utklipp" (see above). Its layout and states still hold, but T9 checks the screens against the new look. Screens the new canvas does not show follow the same paper, stamps and colours.
3. Optional: overrule any default listed at the bottom of `SPEC.md`.

## Next task

Card loop round 2 when Lars asks (docs/CARDS.md): it deals cards round 1 did not show. T5 (codes) is deferred by Lars.

After that, T5: codes. Build it in the design (board "6 Code entry", `design-handoff/CodeEntry.dc.html`).

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
| T10 | Records for everyone (ADR 0010), brought forward at Lars's request on 2026-11-19 as T8 was: fewest turns and most cards in one turn, per target and precision, kept in the database | Story P16; API tests prove a record is written only when beaten and that impossible claims are refused; `npm run play -- --api` shows the records and a claim | Done 2026-11-19 |
| T9 | Design check after T6: compare every screen with the handoff's layout and the "Avis, utklipp" look at phone size and 1280, light and dark, and fix what differs | Reviewer finds no differences that matter; gate passes | Not started |
