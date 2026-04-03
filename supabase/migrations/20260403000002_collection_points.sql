-- Collection points: physical locations where donations can be dropped off

CREATE TABLE IF NOT EXISTS collection_points (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  address       TEXT NOT NULL,
  neighborhood  TEXT,
  notes         TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  created_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  deleted_at    TIMESTAMPTZ
);

-- Auto-update updated_at
CREATE TRIGGER set_updated_at_collection_points
  BEFORE UPDATE ON collection_points
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE collection_points ENABLE ROW LEVEL SECURITY;

-- Public can read active, non-deleted points
CREATE POLICY "collection_points_public_read"
  ON collection_points FOR SELECT
  USING (is_active = TRUE AND deleted_at IS NULL);

-- Members can insert and update
CREATE POLICY "collection_points_member_insert"
  ON collection_points FOR INSERT
  WITH CHECK (is_member());

CREATE POLICY "collection_points_member_update"
  ON collection_points FOR UPDATE
  USING (is_member());

-- Admins can do anything (including soft-delete)
CREATE POLICY "collection_points_admin_all"
  ON collection_points FOR ALL
  USING (is_admin());
