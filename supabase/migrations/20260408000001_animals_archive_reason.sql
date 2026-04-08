-- R2: Archive reason field on animals
ALTER TABLE animals ADD COLUMN IF NOT EXISTS archive_reason TEXT;
