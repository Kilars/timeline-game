# 0004: Solo push-your-luck, score is fewest turns

Status: Accepted (Lars, 2026-11-14). Three details are Claude's defaults, marked below.

## Context

Single player first, to keep it simple. Teams can come later. A push-your-luck game alone needs something that makes locking in a real choice.

## Decision

- The goal is a timeline of N cards. N is a setting, default 10.
- Each turn the player draws and places one card at a time. After a correct placement they draw another or lock in. A miss loses every card gained that turn.
- The score is the number of turns used to reach N. Fewer is better. The best score is kept on the device.

Defaults not yet confirmed:

- The start card counts toward N.
- Cards lost to a miss are discarded for the rest of the game.
- Reaching N with pending cards wins at once.

## Consequences

- Locking in early is safe and slow; pushing is fast and risky. That is the whole game.
- "First to N" for teams is the same rule with players taking turns, so the game logic should treat the solo game as a one-player case of a turn-based game.
