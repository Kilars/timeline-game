# State

Updated: 2026-11-15

## Current state

Lars said go on 2026-11-14. Public repo Kilars/timeline-game exists. T0 is done: the scaffold is live at https://kilars.github.io/timeline-game/ (placeholder page), `npm run check` is the gate, `npm run play` saves phone-size screenshots to `artifacts/play/`. Every push to main runs the gate and deploys.

Known quirk: headless Chrome hangs on a cold start on Lars's laptop unless `--disable-gpu` is set (it is, in `e2e/phone.ts`). The cause is not known.

Decided 2026-11-15: no filters in version 1; reveal happens on confirming a placement; screens are built plain with one theme file and restyled from a Claude Design handoff (prompt in `design-prompt.md`).

T1 is done: the rules live in `src/game/` (see its README), pure and seeded, 146 unit tests. The reviewer found no defects and played 2160 seeded games through it.

Notes from the T1 review for coming tasks:

- T2: show dates at the judging precision, or a year-judged timeline can look out of order.
- T2: do not offer "draw another" when both piles are empty.
- T2 and T3: "play again" must pick a new seed, or the same game is replayed.
- T3: the target must be at least 2 and should not exceed the number of cards in play.
- T4: map database NULL month and day to absent before creating a game.

## Waiting on Lars

1. **Backend host** (ADR 0007). Blocks only T8.
2. **Design handoff** from Claude Design. Blocks only T9.
3. Optional: overrule any default listed at the bottom of `SPEC.md`.

## Next task

T2 (with the builder), then T3.

## Backlog

| # | Task | Done when | Status |
|---|---|---|---|
| T0 | Repo and tooling: git repo, public GitHub repo, Vite + React + TypeScript scaffold, Vitest, Playwright, `npm run check`, `npm run play`, Pages deploy workflow | An empty page is live on Pages and the gate passes | Done 2026-11-15 |
| T1 | Game rules as a pure module: turns, pending and locked cards, miss, lock in, win, judging with precision and ties, draw with deck mix and no repeats, seeded shuffle | Unit tests cover every rule in SPEC "Game rules" | Done 2026-11-15 |
| T2 | Game screen on the fixture deck: vertical timeline, tap a gap, reveal, draw another or lock in, miss feedback, result screen with personal best; all colours, fonts and spacing in one theme file | `npm run play` completes a full game; stories P2 to P6, P11 | In progress |
| T3 | Start screen: deck ticks, mix slider, target, judging precision, remembered settings | Stories P1, P7, P8, P12 | Not started |
| T4 | API and local database: schema, read endpoints for decks and cards, seed script, client reads from the API | The game runs locally against the API; fixture deck still used in tests | Not started |
| T5 | Codes: private decks, play codes, hidden code entry, hashed storage, rate limit | Stories P10, O2 to O4, O6; a test proves a private deck is not returned without its code | Not started |
| T6 | Editor: edit codes, add, change and delete cards, create decks | Stories A1 to A4, O1 | Not started |
| T7 | History import: Wikidata query script, AI curation to about 1000 Norwegian cards, load into the database | Story O5; a sample of 50 cards checked against Wikidata by the reviewer | Not started |
| T8 | Backend deploy | The live site plays against the hosted backend from a phone | Blocked on ADR 0007 |
| T9 | Restyle from the Claude Design handoff | Screens match the handoff at phone size; gate passes | Blocked on the handoff |
