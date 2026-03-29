-- Allow unauthenticated visitors to read public animal data on the home page.
-- Without these policies, animals and photos are invisible until the user logs in.

-- Animals: public can read any non-deleted, non-deceased animal
CREATE POLICY "public can read animals"
  ON animals FOR SELECT
  USING (deleted_at IS NULL AND status != 'obito'::animal_status_enum);

-- Animal photos: public can read cover photos (used on animal cards)
CREATE POLICY "public can read animal cover photos"
  ON animal_photos FOR SELECT
  USING (is_cover = true);
