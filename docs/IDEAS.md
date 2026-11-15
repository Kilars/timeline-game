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
