-- Decks, cards and access codes (SPEC "Data", ADR 0003, ADR 0005).
-- Plain SQLite, applied in file order by api/src/migrate.ts locally. The same files can be applied
-- by a future host's own migration tool (ADR 0007).

CREATE TABLE decks (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  -- Private decks are never listed without a code for them (ADR 0003).
  visibility TEXT NOT NULL CHECK (visibility IN ('public', 'private')),
  -- Which side of the mix slider the deck's cards fall on.
  kind TEXT NOT NULL CHECK (kind IN ('history', 'personal'))
);

CREATE TABLE cards (
  id TEXT PRIMARY KEY,
  deck_id TEXT NOT NULL REFERENCES decks (id) ON DELETE CASCADE,
  -- Shown while placing.
  title TEXT NOT NULL CHECK (length(title) > 0),
  -- Shown with the date after placing.
  reveal TEXT,
  -- The date as precisely as it is known. A signed year, so dates before year 1 work.
  year INTEGER NOT NULL,
  month INTEGER CHECK (month BETWEEN 1 AND 12),
  day INTEGER CHECK (day BETWEEN 1 AND 31),
  -- Where the date comes from, such as a Wikidata item or a link.
  source TEXT,
  CHECK (day IS NULL OR month IS NOT NULL)
);

CREATE INDEX cards_by_deck ON cards (deck_id);

-- Access codes. Only the hash is stored. Checking codes is built in T5.
CREATE TABLE codes (
  id INTEGER PRIMARY KEY,
  hash TEXT NOT NULL UNIQUE,
  -- An edit code also lets you play.
  role TEXT NOT NULL CHECK (role IN ('play', 'edit')),
  -- 1 for the master code, which opens every deck. Other codes open the decks in code_decks.
  all_decks INTEGER NOT NULL DEFAULT 0 CHECK (all_decks IN (0, 1))
);

-- The decks a code opens.
CREATE TABLE code_decks (
  code_id INTEGER NOT NULL REFERENCES codes (id) ON DELETE CASCADE,
  deck_id TEXT NOT NULL REFERENCES decks (id) ON DELETE CASCADE,
  PRIMARY KEY (code_id, deck_id)
);
