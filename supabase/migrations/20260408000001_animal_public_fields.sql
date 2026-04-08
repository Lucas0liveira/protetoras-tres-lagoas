-- Add public-facing fields to animals and animal_photos
-- public_description: catchy text shown on the public animal page/card
-- is_public: marks photos as safe for public display (separate from internal cover photo)

ALTER TABLE animals
  ADD COLUMN IF NOT EXISTS public_description TEXT;

ALTER TABLE animal_photos
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT false;

-- Allow anon to read public photos
DROP POLICY IF EXISTS "Public can read public animal photos" ON animal_photos;
CREATE POLICY "Public can read public animal photos"
  ON animal_photos FOR SELECT
  USING (is_public = true);
