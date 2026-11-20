# Cards: what makes a good one, and how the deck gets better

This covers the public history deck. Personal cards are written by their owners and are not
covered here.

## What published games do

- **Timeline** (Asmodee, Frédéric Henry): each set has one theme (inventions, discoveries, events,
  music and film). A card shows one thing with a clear "first" moment, a name and a picture, and
  only the year counts. Players most often complain about dates that can be argued, such as an
  invention's patent versus its first working model, and about the game going stale once the
  dates are learned.
- **Anno Domini** (Urs Hostettler): 340 cards per set, each a short description of an event with
  the year on the back. Many events are obscure on purpose: the rulebook says a feel for sequence
  and psychology matter more than knowledge. The description carries the clues, and the extra
  detail on the back (month, day, a comment) does not count in the game.
- **Hitster** (Jumbo): each country gets its own song list, picked for local recognition, and a
  few "essential" songs appear in every edition. The cards cover many decades and genres. Players
  can choose different difficulty levels.

## What we take from them

1. **One thing, one year.** The card names a single moment. Where people would argue (start or
   end, first or famous, patent or product), the title says which one: "… åpner",
   "… tar slutt", "første …".
2. **Fair to guess, not only to know.** A card nobody knows is fine if the description gives a
   clue to the era: what people used, who was in power, what came before it. A card is bad only
   when it is a pure guess (Anno Domini).
3. **Things over people.** Inventions, works, discoveries, achievements and events make the best
   cards. A birth or death belongs in the deck only when it was an event in itself (Elvis, Diana,
   Stalin). Timeline has almost none.
4. **Local first, with a world canon.** Norwegian history and culture are the local edition; the
   few world events everyone knows are the canon (Hitster).
5. **Plain titles.** The title says what happened in everyday words. "Norge og Sverige blir enige
   om å skilles" works; "Karlstadkonvensjonen" does not.
6. **One card per war, little war in all.** Only the two world wars get both a start and an end
   card. Organisations being founded go in only when everyone knows them (NATO, the UN). War and
   violence stay under 15 % of the deck, keeping the best known. (Rules 5 and 6 came from round 1.)
7. **A spread over time.** No era should crowd out the others, though the last 150 years will
   always have the most cards people know.
8. **Something to talk about.** The best cards make players argue or laugh when they are revealed.
   A correct but dull card (a minor treaty, a renamed organisation) wastes a turn.
9. **Never give the year away.** The title and description never name the year, its decade or
   anything that fixes it, such as "the first Olympics after the war". This is already enforced by
   `api/src/history-content.test.ts`.

The playtest's flags check rules 1, 2, 3, 5, 8 and 9 card by card; its report checks rules 3, 4, 6
and 7 across the whole deck.

## The loop

Each round:

1. **Play.** A fresh agent, told only to play as an average Norwegian adult, plays 10 games of 12
   cards with `node scripts/playtest.ts` (usage at the top of the script). It sees each card's
   title and description, places it, says how sure it was and why, and only then sees the year.
   It flags every card (`known`, `guessable`, `blind`, `gives-away`, `ambiguous-date`,
   `unclear-text`, `dull`, `too-narrow`, `death-or-birth`, `great`) and ends with a summary.
   Each round shows cards no earlier round has shown first, so a few rounds cover the deck.
2. **Report.** `node scripts/playtest.ts report <round>` writes `artifacts/playtest/<round>/report.md`:
   flag counts, the mix of kinds and eras across the deck, and every card with its notes. It also
   gives the share placed right and right by confidence, but those say little (see below).
3. **Suggest.** The orchestrator turns the report into changes: drop a card, retitle it, rewrite
   its description, correct its date, or add cards where the deck is thin. Each change says why.
4. **Decide.** The changes go to Lars on a private review page where he keeps or rejects each one.
5. **Apply.** Kept changes go into `api/src/history-curation.ts`, `history-descriptions.ts` or
   `history-milestones.ts`; dates are checked against Wikidata and the Wikipedia intro as before.
   The gate must pass. Then `node api/history-import.ts --push` rebuilds and loads the deck.
6. **Compare.** The next round's report sits beside the last one's.

The share placed right does not measure difficulty. A model knows the dates however hard it plays
an average adult: in round 1 it placed 117 of 120 right. Judge the deck by the flags instead. Aim
for under 10 % `blind` and over a third `great` among the cards a round shows. Only people playing
can tell how hard the deck really is.

Playtest logs and reports stay under the git-ignored `artifacts/`. A short summary of each round
goes in `STATE.md`.
