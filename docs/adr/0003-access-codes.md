# 0003: Access by codes, private decks invisible

Status: Accepted (Lars, 2026-11-14)

## Context

Family, friends and Lars's own decks must not unlock each other. Some decks should not be known to exist. Nobody wants accounts.

## Decision

- A deck is `public` or `private`.
- Public decks need no login and no code.
- Private decks are never listed. Presenting a code reveals every deck that code belongs to.
- A code has a role: `play` or `edit`. Edit includes play. The same mechanism serves players and admins.
- Lars holds a master edit code for all decks.
- Code entry sits behind a hidden gesture: tapping the title five times. A web app cannot detect the power button.
- The taps give no feedback of any kind: no counter, no animation, no vibration. Only the fifth tap does something, and it opens a single text field. (Lars, 2026-11-15)
- The field is built for pasting a long code, not typing one: no autocorrect, no capitalisation, no length limit. Lars keeps his codes ready to copy. (Lars, 2026-11-15)
- The device remembers the codes it has been given.

## Rules for the implementation

- The server checks codes on every request for private data. The client never receives a private deck's name or cards without a valid code.
- Codes are stored hashed.
- Code attempts are rate limited.
- Edit codes are long. Play codes may be short and memorable.
- A code can be replaced or revoked without touching the deck.

## Consequences

- Anyone holding a code can share it. Rotation is the remedy.
- No record of which person changed a card, only which code.
- Card dates reach the browser so the client can judge placements. A player with developer tools could read them. Accepted for a game among friends.
