-- A card's description, shown with its title while it is placed and kept when it is revealed, so a
-- player knows what the card is about (idea from Lars, 2026-11-17). It never gives the date away.
-- Optional: a card can still be its title alone.
ALTER TABLE cards ADD COLUMN description TEXT;
