# State

Updated: 2026-11-14

## Current state

Specification phase. No code yet. The folder is not its own git repo yet.

Written: `SPEC.md`, `user-stories.md`, ADRs 0001 to 0009, `WORKFLOW.md`.

## Waiting on Lars

1. **Backend host** (ADR 0007). Blocks only T8.
2. **Go** to start the loop, including a yes to creating the public GitHub repo.
3. Optional: overrule any default listed at the bottom of `SPEC.md`.

## Next task

T0, once Lars says go.

## Backlog

| # | Task | Done when | Status |
|---|---|---|---|
| T0 | Repo and tooling: git repo, public GitHub repo, Vite + React + TypeScript scaffold, Vitest, Playwright, `npm run check`, `npm run play`, Pages deploy workflow | An empty page is live on Pages and the gate passes | Not started |
| T1 | Game rules as a pure module: turns, pending and locked cards, miss, lock in, win, judging with precision and ties, draw with deck mix and no repeats, seeded shuffle | Unit tests cover every rule in SPEC "Game rules" | Not started |
| T2 | Game screen on the fixture deck: vertical timeline, tap a gap, reveal, draw another or lock in, miss feedback, result screen with personal best | `npm run play` completes a full game; stories P2 to P6, P11 | Not started |
| T3 | Start screen: deck ticks, mix slider, filters, target, judging precision, remembered settings | Stories P1, P7 to P9, P12 | Not started |
| T4 | API and local database: schema, read endpoints for decks and cards, seed script, client reads from the API | The game runs locally against the API; fixture deck still used in tests | Not started |
| T5 | Codes: private decks, play codes, hidden code entry, hashed storage, rate limit | Stories P10, O2 to O4, O6; a test proves a private deck is not returned without its code | Not started |
| T6 | Editor: edit codes, add, change and delete cards, create decks | Stories A1 to A4, O1 | Not started |
| T7 | History import: Wikidata query script, AI curation to about 1000 Norwegian cards, load into the database | Story O5; a sample of 50 cards checked against Wikidata by the reviewer | Not started |
| T8 | Backend deploy | The live site plays against the hosted backend from a phone | Blocked on ADR 0007 |
