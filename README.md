# Tidslinje

A timeline card game: place event cards in the right order and push your luck each turn.
Norwegian only, phone first. Live at https://kilars.github.io/timeline-game/.

## Run

Needs Node 22.18 or newer and Google Chrome.

```sh
npm install
npm run dev          # dev server at http://localhost:5173/timeline-game/
npm run check        # the gate: type check, lint, unit tests, end-to-end tests
npm run play         # plays the app in headless Chrome at phone size, seed 1
npm run play -- 42   # the same with seed 42
```

`npm run play` saves a numbered screenshot of every step to `artifacts/play/`.

## Layout

- `src/` is the client. `src/game/` is the pure rules module, with no UI or network code.
- `e2e/` holds the end-to-end tests, `scripts/` the play script.
- `docs/` holds the spec (`SPEC.md`), the current state (`STATE.md`), how work is done
  (`WORKFLOW.md`) and the decisions (`adr/`).
