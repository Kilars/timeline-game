# 0002: All cards in the database, admins edit in the app

Status: Accepted (Lars, 2026-11-14)

## Context

History cards could have shipped as a public file with the client, leaving only personal cards in a database. Lars chose one home for all cards, editable by admins in the app.

## Decision

- Every card, history included, lives in the database and is served by the API.
- Admins add, change and delete cards in the client. There is no file-editing workflow for cards.
- The history import writes to the database.

## Consequences

- The game depends on the backend being up. A bundled fixture deck covers tests and preview only.
- One data model and one editor for all decks.
- A wrong history date is fixed in the app, not by a code change.
