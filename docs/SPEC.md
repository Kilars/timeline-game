# Tidslinje: spec

Working title "Tidslinje". A private, non-commercial timeline game for Lars, family and friends.
The player places event cards in the right order on a timeline and pushes their luck each turn.

Decisions are recorded in `docs/adr/`. This file is the summary; when the two disagree, the ADR wins.

The game belongs to the same family as tabletop timeline games, where you place events in order and decide whether to push on. It shares the mechanic only. The name, every card text and the visual design are this project's own; nothing is copied from a published game.

## Layers

| Layer | What it does | Where it runs |
|---|---|---|
| Client | The game, deck selection, code entry, card editor | Static site on GitHub Pages, public repo |
| Data | Decks, cards, access codes, and a small API in front of them | Hosted backend, private. Host not chosen yet (ADR 0007) |
| Infrastructure | Build, test, deploy | GitHub Actions |

## Game rules (version 1, single player)

1. **Setup.** The player ticks decks, sets the personal share slider and the target (default 10 cards).
2. **Start.** One card is dealt face up on the timeline. It is locked and counts toward the target.
3. **Turn.** The player draws a card. Only its title is visible. They tap a gap on the timeline and confirm. Confirming reveals the date and the reveal line; cards themselves are not tappable.
   - **Correct:** the card stays on the timeline with its date showing, marked as pending. The player chooses *draw another* or *lock in*.
   - **Miss:** the correct date is shown, then the missed card and every pending card from this turn are removed. The turn ends.
   - **Lock in:** all pending cards become permanent. The turn ends.
4. **Win.** The game ends as soon as locked plus pending cards reach the target.
5. **Score.** The number of turns used. Fewer is better. The best score per target is remembered on the device.

Details:

- A card removed by a miss is not drawn again in the same game.
- No card appears twice in one game.
- If the personal decks run out, the remaining draws come from history. If everything runs out, the game ends and says so.
- **Judging.** Cards are compared at the judging precision, a setting with default *year*. Two cards with the same value at that precision are a tie, and a tie is correct on either side. A placement is judged against every card on the timeline, not only its two neighbours.
- **Mix.** Each draw, the start card included, rolls against the personal share: personal decks or the history deck.

## Client

- Norwegian only, phone first. Works on a laptop too.
- Vertical timeline, oldest at the top. Place by tapping a gap, then confirm. No drag and drop in version 1.
- **Start screen:** deck ticks, one slider for the share of personal cards against history (default 50%), target, judging precision. The last choice is remembered. No filters in version 1.
- **Code entry:** hidden behind tapping the title five times, with no feedback until the fifth tap opens one text field. The field is made for pasting a long code. A code reveals every deck it belongs to. The device remembers its codes.
- **Editor:** appears for decks where the device holds an edit code. Add, change and delete cards.
- **Result screen:** turns used, personal best, play again with the same settings.
- **Look:** built plain first, with every colour, font and spacing value in one theme file. The visual design comes from a Claude Design handoff (`docs/design-prompt.md`) and is applied in a restyle task.
- **For agents and tests:** `?seed=<n>` makes the shuffle repeatable, and a bundled fixture deck of fictional and public history cards lets the game run with no backend.

## Data

- **Deck:** name, visibility (`public` or `private`), kind (`history` or `personal`). The kind decides which side of the mix slider a deck's cards fall on. The history deck is an ordinary public deck of kind `history`.
- **Card:** belongs to one deck. Title (shown while placing), reveal line (optional, shown with the date after placing), year, optional month, optional day, source reference.
  - The date is stored as precisely as it is known. Year is a signed integer so dates before year 1 work.
- **Code:** stored hashed, with a role (`play` or `edit`) and the decks it opens. One master edit code opens everything.
- All cards live in the database, history included. Personal cards never enter the git repo.
- **History deck:** candidates from Wikidata, curated and written in Norwegian by an AI pass. First target is about 1000 cards.

## Access rules

- Public decks: no login, no code.
- Private decks: never listed until the device presents a code for them. The server checks codes; the client contains no secrets.
- Play codes let you play a deck. Edit codes also let you change it.
- Code attempts are rate limited. An admin can replace a leaked code.

## Out of scope for version 1

Teams and multiplayer, accounts and profiles, photos on cards, filters on the history deck, English, drag and drop, offline play.
These are parked in `docs/IDEAS.md`.

## Defaults chosen by Claude, not yet confirmed by Lars

Lars was not asked about these. Change any of them by saying so.

- The start card counts toward the target.
- Missed and lost cards are discarded for the rest of the game.
- Reaching the target with pending cards wins at once, without a separate lock in.
- Tap a gap to place; vertical timeline.
- Client stack: React, TypeScript, Vite, Vitest, Playwright (ADR 0009).
