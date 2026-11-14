# 0005: Store dates as precisely as known, judge by year by default

Status: Accepted (Lars, 2026-11-14)

## Context

History cards often have only a year. Personal cards have exact days, and several may share a year.

## Decision

- A card stores year, optional month, optional day. Whatever is known is stored.
- Year is a signed integer, so events before year 1 work.
- Judging precision is a game setting: year (default), month or day.
- Two cards are compared at the judging precision. If a card lacks that precision, the comparison falls back to the most precise level both cards have.
- Equal values are a tie. A tie is correct on either side of the other card.

## Consequences

- No unfair misses from year-only cards.
- Personal decks can be played harder by switching to exact dates, with no change to the data.
