# Ideas

Parked features and suggestions. Nothing here is built until Lars moves it to the backlog in `STATE.md`.

| Idea | From | Note |
|---|---|---|
| Teams or pass-and-play, first to the target | Lars, 2026-11-14 | Rules already fit (ADR 0004) |
| Photos on personal cards | Grilling session | Needs private file storage |
| Prefer cards not seen recently | Claude | Helps replay value, most of all for small personal decks |
| Paste a list to add many cards | Claude | |
| Install to home screen, offline play | Claude | |
| English card text and menus | Grilling session | Lars chose Norwegian only for now |
| Drag and drop placement | Claude | Tap a gap is version 1 |
| Filters on the history deck: category, period, difficulty | Lars chose none for now, 2026-11-15 | Period needs no new data; the other two need tags from the import |
| Self-host the fonts | T2 review | Removes a render-blocking request to Google and stops sending players' IP addresses there |
| Move focus to the tray after "Bekreft" | T2 review | Focus falls to the page; touch play is unaffected and the trays are aria-live |
| Smaller chips and fades on short phones | T2 review | At 360×640 they take about 96 of 351 px and sit over the "+" of edge gaps |
| Compact result screen at short heights | T2 review | At 360×640 "Spill igjen" is half below the fold |
| Keep the era on the same line as the year at 1280 | T2 review | A lost "490 f.Kr." wraps |
| Miss marker at the game's judging precision | T2 review | Shows the year only; matters once T3 adds month and day |
| Let the flying card leave the timeline's clip | T2 review | Clipped during the 140 ms fly; barely visible |
| e2e check that "Spill igjen" deals a new game | T2 review | Checked by hand and in unit tests; `?seed=` stays in the address, so a reload replays it |
| Scope the DOM lib to `e2e/helpers.ts` | T2 review | `tsconfig.node.json` has it for `settle` |
| Best score per target and judging precision | T3 review | Now a day-judged game shares its record with a year-judged one |
| Dim the slider's end labels when it is disabled | T3 review | "Bare historie" on the left reads oddly next to "Bare personlige kort" |
| Keep "Kort for å vinne" on one line at 360 wide | T3 review | Wraps to two lines |
| Smoother band behind the sticky "Spill" | Orchestrator, T3 | On short phones the solid band cuts across the checked background |
| Seed script: handle cards that move between decks and decks removed from the fixture | T4 review | Harmless with today's fixture |
| Run each local migration and its record in one transaction | T4 review | A crash in between now needs the local file deleted |
| Keep `exec` and `migrate` out of the app-facing `Database` interface | T4 review | The app uses only `all`, `first` and `batch`; D1 would use wrangler migrations |
| Same `?seed=` deals the same game with and without the API | T4 review | The API orders cards by id, the bundle by source order |
| A notice when the API lists no decks | T4 review | The start screen shows an empty deck box |
| Tell a network failure from a server error in the load error text | T4 review | Always says "Sjekk nettet" |
| More room between the error text and "Prøv igjen" | T4 review | |
| Check that a day fits its month in the schema | T4 review | 30 February is accepted |
| README: running the API for a phone on the LAN | T4 review | `dev:api` points at 127.0.0.1 and uses POSIX env syntax |
| History: drop space shuttle cards named by code ("STS-9 skytes opp", "STS-51-L" is Challenger) | Play run 2026-11-17 | Keep the famous launches; the AI pass could retitle the rest |
| History: flag cards whose Wikidata date is not the one people know | Play run 2026-11-17 | "Den amerikanske revolusjon" is 1763; most would say 1776. For the AI pass |
| History: fewer births of living people | Play run 2026-11-17 | Known names, unknown birth years (Mourinho, Thiel, Skarsgård) |
| A decade judging precision, as an easy level | Play run 2026-11-17 | Year precision makes 1933 and 1934 different gaps |
| History: inventions as cards (telefonen, penicillinen, internett) | Lars, 2026-11-17 | Wikidata P575, time of discovery or invention |
| History: more context on the card face, not only after the reveal | Lars, 2026-11-17 | A short line under the title, without the year |
| History: fewer "blir født" / "dør" cards, they feel samey | Lars, 2026-11-17 | Rather what the person is known for: when Pippi Langstrømpe came out, not when Astrid Lindgren died. Works by date of publication (P577), achievements |
