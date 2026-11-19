-- The records everyone shares (ADR 0010): the fewest turns to win and the most cards secured in one
-- turn, one of each per target and judging precision. Only the record itself is kept, with the
-- holder's name; nothing about decks or cards.
-- 0003 is left to the codes migration on the T5 branch. Both this file's runner (api/src/migrate.ts)
-- and wrangler apply every migration not yet applied, whatever its number.

CREATE TABLE records (
  kind TEXT NOT NULL CHECK (kind IN ('fewest_turns', 'most_in_turn')),
  target INTEGER NOT NULL CHECK (target BETWEEN 2 AND 10000),
  precision TEXT NOT NULL CHECK (precision IN ('year', 'month', 'day')),
  value INTEGER NOT NULL CHECK (value BETWEEN 1 AND 10000),
  -- Shown to everyone who plays at this target and precision. Checked by the API before it is stored.
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 20),
  -- When the record was set, as an ISO 8601 time in UTC.
  set_at TEXT NOT NULL,
  PRIMARY KEY (kind, target, precision)
);
