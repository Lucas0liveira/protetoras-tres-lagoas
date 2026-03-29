-- Urgent alerts: admins create alerts that appear as a modal on the public home page

CREATE TABLE alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  link_url    TEXT,
  link_label  TEXT,
  image_url   TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT FALSE,
  created_by  UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER set_alerts_updated_at
  BEFORE UPDATE ON alerts
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- Public can read active alerts
CREATE POLICY "public can read active alerts"
  ON alerts FOR SELECT
  USING (is_active = true);

-- Members can read all alerts
CREATE POLICY "members can read all alerts"
  ON alerts FOR SELECT
  USING (is_member());

-- Admins can do everything
CREATE POLICY "admins can insert alerts"
  ON alerts FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "admins can update alerts"
  ON alerts FOR UPDATE
  USING (is_admin());

CREATE POLICY "admins can delete alerts"
  ON alerts FOR DELETE
  USING (is_admin());

-- ─── Site config ─────────────────────────────────────────────────────────────
-- Key-value store for site-wide settings (wish list, etc.)

CREATE TABLE site_config (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT '{}',
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE site_config ENABLE ROW LEVEL SECURITY;

-- Public can read all config
CREATE POLICY "public can read site_config"
  ON site_config FOR SELECT
  USING (true);

-- Admins can update
CREATE POLICY "admins can update site_config"
  ON site_config FOR UPDATE
  USING (is_admin());

CREATE POLICY "admins can insert site_config"
  ON site_config FOR INSERT
  WITH CHECK (is_admin());

-- Seed the wish list
INSERT INTO site_config (key, value) VALUES
  ('wish_list', '["Scalibur","Simparic","Bravecto","Drontal","Ataduras","Gazes","Soro fisiológico","Luva","Máscara"]'::jsonb)
ON CONFLICT (key) DO NOTHING;
