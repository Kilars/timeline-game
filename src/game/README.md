# src/game: the rules

Pure TypeScript: no UI, network, storage, clock or `Math.random`. Import from `./index.ts`.
Every function takes plain data and returns a new `GameState`; an action that is not allowed throws an `Error`.

- `createGame(cards, { seed, target?, precision?, personalShare? })`: deals the locked start card and draws the first card of turn 1. Defaults are in `DEFAULT_CONFIG` (10, `'year'`, 0.5).
- `placeCard(state, gap)`: phase `placing`. Gap 0 is before the first card, gap n after the last of the n cards on the timeline (pending cards count). Gives `deciding`, `won` or `miss`.
- `drawAnother(state)` and `lockIn(state)`: phase `deciding`. Both give `placing`, or `exhausted` when no cards are left.
- `nextTurn(state)`: phase `miss`. Gives `placing` or `exhausted`.
- `correctGaps(state)`: the correct gap indices for the drawn card (`placing`) or for the missed card (`miss`).
- `score(state)`: turns used when `won`, otherwise `null`.
- `compareCards(a, b, precision)` and `correctGapsFor(cards, card, precision)`: the judging on its own.

`GameState` (see `types.ts`) is JSON-safe. `Card` is `{ id, title, reveal?, year, month?, day?, pool: 'history' | 'personal' }`; the caller sets `pool` from the card's deck.

- `phase`: `'placing' | 'deciding' | 'miss' | 'won' | 'exhausted'`.
- `player`: `{ timeline: { card, locked }[], turnsUsed }`, oldest first. `locked: false` means pending.
- `drawn`: the card to place, only in `placing`. Show only its title until it is placed.
- `miss`: only in `miss`: `{ card, chosenGap, correctGaps, lostCards, timeline }`. `timeline` is the line as it was when the card was placed; `player.timeline` has already lost the pending cards.
- `config`, `piles` (undrawn cards per pool), `discarded` (cards lost to misses), `rng` (generator state).
