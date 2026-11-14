# Prompt for Claude Design

Paste everything below the line into Claude Design. Bring the handoff back to this repo for task T9.

---

Design the visual identity and screens for **Tidslinje**, a Norwegian timeline card game played in a phone browser.

## What the game is

The player builds a timeline of event cards. Each turn they draw a card showing only a title, tap the gap on the timeline where they think it belongs, and confirm. The date is then revealed. If the placement is right they choose between drawing another card and locking in what they have gained this turn. One wrong placement loses every card gained that turn. The goal is 10 cards on the timeline in as few turns as possible.

Cards come from a general history deck and from private decks made by families and friend groups ("the day grandfather was born", "the year we moved to Bergen"). A game mixes the two.

## Who plays

Family and friends from about 12 to 80, on their own phones, often around a table. Some are not comfortable with apps. Everything is in Norwegian (bokmål).

## The feeling

Warm, calm and a little playful, like a well-made card game on a kitchen table. Not a quiz show, not a casino, not a school app. The tension of "one more card or lock in?" should be felt in the design.

Create an original identity. Do not imitate the box, cards or colours of any published timeline board game.

## Screens to design, at 390 × 844 first

1. **Start.** Title. A list of decks with tick boxes. One slider: share of personal cards against history. Target number of cards (default 10). Judging precision (year, month, day). A large play button.
2. **Game, placing.** A vertical timeline, oldest at the top, with 1 to 12 cards. Each card on the timeline shows its year and title. Between and around the cards are gaps the player can tap. The drawn card, title only, is clearly "in hand". A turn counter and a "7 of 10" progress marker are always visible. A confirm button appears once a gap is chosen.
3. **Game, correct.** The card sits in the timeline with its date and a one-line reveal text. It is visibly *pending*, not yet safe. Two choices of equal weight: "Trekk et kort til" and "Lås inn".
4. **Game, miss.** The correct date is shown, and the pending cards from this turn are visibly lost. Clear, not humiliating.
5. **Result.** Turns used, personal best, play again.
6. **Code entry.** A small, plain dialog with one text field. It is reached by a hidden gesture, so it should look unremarkable.
7. **Editor.** A deck's cards as a list sorted by date, and a form for one card: title, year, optional month, optional day, optional reveal line.

## Things the design must solve

- **Locked against pending.** The player must see at a glance which cards are safe and which are at risk this turn.
- **A long timeline on a small screen.** Twelve cards and thirteen gaps must stay tappable with a thumb. Tap targets at least 44 px. Show how the timeline scrolls and how the drawn card stays reachable.
- **The reveal.** Describe the motion for a correct placement and for a miss, each under half a second.
- **Readability.** Large type and strong contrast for older players. Titles can be up to about 60 characters.
- **Light and dark.** Both, following the phone's setting.

## Sample content

Timeline cards: "1814 Grunnloven vedtas på Eidsvoll", "1905 Unionen med Sverige oppløses", "1969 Første menneske på månen", "1989 Berlinmuren faller", "1994 OL på Lillehammer".
Drawn card: "Det første iPhone-salget".
Reveal line: "Solgt fra 29. juni i USA, til Norge kom den først året etter."
Personal card: "Familien flytter til Bergen".
Deck names: "Historie", "Familien", "Vennegjengen".

## What I need back

- Design tokens: colours for light and dark, type scale, spacing scale, corner radius, shadows. Named, with values.
- Each screen above at 390 × 844, plus the game screen at 1280 wide.
- The card component in its states: in hand, placed and pending, locked, missed.
- Motion notes for reveal, miss and lock in.
- A handoff a developer can apply to an existing React app whose colours, fonts and spacing all live in one theme file of CSS variables.

No photos or illustrations on cards. No logins, profiles, leaderboards or advertising.
