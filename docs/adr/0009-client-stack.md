# 0009: Client and test stack

Status: Claude's default, not discussed with Lars.

## Decision

- React, TypeScript and Vite for the client. The same stack as Lars's bluff-catcher project.
- Game rules as a pure TypeScript module with no UI or network code, tested with Vitest.
- Playwright for end-to-end tests and for agents playing the game.
- The API as a small TypeScript HTTP app over SQLite (see ADR 0007).
- Shuffling takes a seed, set by `?seed=<n>`, so a game can be replayed exactly.

## Consequences

- Rules can be tested in milliseconds without a browser.
- Agents and tests share one way of driving the app.
