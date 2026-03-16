-- Add is_special_needs flag to animals
-- and a free-text description of the needs

ALTER TABLE animals
  ADD COLUMN is_special_needs BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN special_needs_description TEXT;

CREATE INDEX ON animals(is_special_needs) WHERE is_special_needs = TRUE;