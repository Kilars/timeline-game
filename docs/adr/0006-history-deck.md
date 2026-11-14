# 0006: History deck from Wikidata, curated by AI, Norwegian only

Status: Accepted (Lars, 2026-11-14)

## Context

The standard deck needs about a thousand recognisable events with reliable dates, in Norwegian. The project is not commercial, but the repo is public, so sources must be clean.

Legal position: dates are facts and cannot be copyrighted. Wikidata is CC0 (public domain) and has an official query service. Wikipedia text is CC BY-SA, reusable with attribution; this project does not copy it.

## Decision

1. A script queries Wikidata for events, inventions, births, deaths and works with a date, ranked by the number of Wikipedia language editions covering them.
2. An AI pass picks the recognisable ones, writes a short Norwegian title and reveal line, and tags category and difficulty.
3. Each card keeps its Wikidata id as source reference.
4. The result is loaded into the database as the public history deck.

The game is Norwegian only. One text per card, no translation fields.

## Consequences

- Every date can be traced and rechecked.
- The query service is used through its API with a polite rate; no web page scraping.
- Wikidata dates are sometimes wrong or ambiguous (start or end of a war, for instance). The AI pass must flag those, and admins can fix cards in the app.
- Adding English later means adding a text field and translating.
