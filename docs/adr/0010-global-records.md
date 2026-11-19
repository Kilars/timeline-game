# 0010: Two global records, kept in the database

Status: Accepted (Lars asked for global records, 2026-11-19: "just records, not a full leaderboard, persistent in the database"). The details below are Claude's defaults; Lars can overrule any of them.

## Context

The best score is kept on each device (ADR 0004), so family and friends cannot see who plays best. Lars wants two records that everyone shares: the most cards in one round, and the fewest rounds to finish. Only the record itself is kept, not a ranked list. There are no accounts (SPEC, "Out of scope").

## Decision

- **Two records.**
  - *Færrest runder:* the fewest turns used to win a game. Lower is better.
  - *Flest kort i én runde:* the most cards secured in one turn. A card counts when it is locked in, or when it is still pending as the game is won. Cards lost to a miss do not count. Higher is better.
- **One pair per target and judging precision.** Both records depend on the target (with target 10, at most 9 cards can be secured in one turn), and judging by year is easier than by day. A game competes only with games played at the same target and precision.
- **Public history decks only.** Only a game whose every deck in play is a public history deck can set a record. A personal deck that is ticked counts as in play even at a 0 % share, since the rules fall back to it when history runs out. Whoever made a small personal or private deck knows its dates, and a perfect game there would freeze the record for good. It also keeps every trace of private decks out of shared data. Any other game shows the records and says in one line why it cannot set them.
- **Only won games can set a record.** A game that ends because the cards ran out shows no records.
- **A record is beaten, never tied.** The first game to reach a value keeps the record. A game that ties it is told so, also when it beats the other record; when the record is at its limit (1 turn, or target − 1 cards) the screen says it cannot be beaten.
- **"Rekord" means the shared records.** The best score kept on the device is called "Ditt beste" on the result screen ("Nytt personlig beste!"), so the two are not confused.
- **The holder's name.** A record shows the value and a name. When a won game beats a record, the result screen asks for a name at the top, under what was beaten and the numbers claimed, with "Lagre" beside the field, which is filled in from last time; the device remembers the name. The field says the name is shown to everyone. The record is set only when the player saves. A player who leaves without saving does not claim it.
- **One claim sets both.** Saving claims every record the game beats, with the same name.
- **The server decides.** It writes a record only when the claim is strictly better than the one stored, in a single conditional statement per record, so two players finishing at once cannot overwrite a better record. It answers with the records as they now stand and which of them this claim set. If someone got there first, the result screen says so. If the stored record already has this claim's value and name (a retry after a save whose answer was lost), the screen shows it as saved.
- **Checks on the server.** The target is a whole number from 2 to 10 000, the precision is year, month or day, turns are from 1 to 10 000, cards in one turn are from 1 to target − 1, and the two must fit together: target − 1 ≤ turns × cards in one turn. The name is put in Unicode normal form C, trimmed, and inner runs of white space become one space. Hidden characters are refused (control, format, private-use, unassigned and default-ignorable ones such as zero-width spaces, direction overrides and Hangul fillers), except the joiners and variation selectors inside emoji such as 👩‍💻 and ❤️. The name needs at least one letter, digit or emoji, and no combining mark without a letter under it or more than three on one letter. It must then be 1 to 20 characters, counted as code points. The client runs the same check (`api/src/names.ts`) before it sends a name. Bodies over 1 KB are refused. Record responses are marked `Cache-Control: no-store`.
- **When the records cannot be fetched or saved.** The fetch starts the moment the game is won, so the records are usually there when the result screen opens. If it fails, the screen says the records could not be fetched, never that there are none, and offers to try again. If a save fails, the name stays in the field and the screen offers to try again; if the server refuses the claim, it asks for another name.
- **No API, no records.** A client built without `VITE_API_URL` (the tests, local play on the fixture) shows no records section.
- **Storage.** One table, `records`, keyed by record, target and precision, with the value, the name and when it was set. Nothing about decks or cards is stored with a record. The migration is `0004_records.sql`; `0003` is left to the codes migration on the unmerged T5 branch, and wrangler applies any migration not yet applied, whatever its number.

## Consequences

- The client is trusted. Card dates already reach the browser (ADR 0003), and anyone can send a made-up claim with a script. The checks stop impossible values, not cheating. Accepted for a game among friends.
- Claims are not rate limited per client. A record changes only when it is beaten and every value is capped, so a script can only step a record towards its limit. It could still claim many records at their limits under a rude name, or use up the database's daily writes, which would stop saves for the day. The owner removes bad records with wrangler; README, "Records", has the commands. Once T5 is on main its attempt counter can limit claims too.
- Names are public to anyone who plays at that target and precision. They are not accounts and prove nothing.
- Changing the precision or target starts from no records, which makes uncommon settings easy to claim.
- Families who play their own decks get no shared records, only the best score on the device.
