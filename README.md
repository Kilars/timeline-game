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

Opening the app starts a game straight away, with the default settings (10 cards, judged by
year), on a bundled fixture deck. There is no start screen and no backend yet.

- `?seed=<integer>` in the address fixes the game: the same seed always deals the same cards.
  Without it a seed is picked by chance, and "Spill igjen" always picks a new one.
- The best score per target is kept in the browser's localStorage under `tidslinje:rekord`.
  The game also works when storage is blocked; the best score then lasts until the page is closed.

`npm run play` plays a seeded game to a win and saves a numbered screenshot of every step to
`artifacts/play/`, after the animations have finished. The game it plays has a turn with several
cards, a miss on purpose that loses a pending card, and the result screen. It finds the right gap
the way the end-to-end tests do (`e2e/helpers.ts`): it reads the cards on screen, looks them up in
the fixture deck and asks the rules. The app has no debug hook.

## Layout

- `src/` is the client.
  - `src/game/` is the pure rules module, with no UI, network, storage or randomness of its own.
  - `src/fixtures/` is the fixture deck: public history and a fictional family. Real personal
    cards never go in the repo.
  - `src/ui/` is the game screen and the result screen, and the plain functions behind them
    (dates, best score, seed, the session on top of the rules).
  - `src/theme.css` holds every colour, font, size, spacing, radius, shadow and timing as a
    `--tl-*` variable, light and dark. The component styles in `src/ui/*.css` use only those.
- `e2e/` holds the end-to-end tests and their helpers, `scripts/` the play script.
- `docs/` holds the spec (`SPEC.md`), the current state (`STATE.md`), how work is done
  (`WORKFLOW.md`) and the decisions (`adr/`).
