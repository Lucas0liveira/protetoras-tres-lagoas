-- Pharmacy inventory table for tracking donated/stocked medications

CREATE TABLE pharmacy_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  description     TEXT,
  quantity        INTEGER NOT NULL DEFAULT 0,
  unit            TEXT,              -- e.g. 'comprimidos', 'frascos', 'unidades'
  expiration_date DATE,
  batch_number    TEXT,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at      TIMESTAMPTZ
);

CREATE INDEX ON pharmacy_items(expiration_date) WHERE deleted_at IS NULL;
CREATE INDEX ON pharmacy_items(deleted_at);

CREATE TRIGGER set_pharmacy_items_updated_at
  BEFORE UPDATE ON pharmacy_items
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE pharmacy_items ENABLE ROW LEVEL SECURITY;

-- Members can read, insert, update
CREATE POLICY "members can read pharmacy_items"
  ON pharmacy_items FOR SELECT
  USING (is_member() AND deleted_at IS NULL);

CREATE POLICY "members can insert pharmacy_items"
  ON pharmacy_items FOR INSERT
  WITH CHECK (is_member());

CREATE POLICY "members can update pharmacy_items"
  ON pharmacy_items FOR UPDATE
  USING (is_member());

-- Only admins can hard delete (soft delete via UPDATE is allowed above)
CREATE POLICY "admins can delete pharmacy_items"
  ON pharmacy_items FOR DELETE
  USING (is_admin());
