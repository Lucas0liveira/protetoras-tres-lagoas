-- R3: Colaboradoras (NGO internal field volunteers/acompanhantes)

CREATE TABLE IF NOT EXISTS colaboradoras (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  phone        TEXT,
  email        TEXT,
  notes        TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ
);

-- Junction table: many-to-many, no cap on number per animal
CREATE TABLE IF NOT EXISTS animal_colaboradoras (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id        UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  colaboradora_id  UUID NOT NULL REFERENCES colaboradoras(id) ON DELETE CASCADE,
  assigned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (animal_id, colaboradora_id)
);

-- RLS
ALTER TABLE colaboradoras        ENABLE ROW LEVEL SECURITY;
ALTER TABLE animal_colaboradoras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members_manage_colaboradoras"
  ON colaboradoras FOR ALL
  USING (is_member()) WITH CHECK (is_member());

CREATE POLICY "members_manage_animal_colaboradoras"
  ON animal_colaboradoras FOR ALL
  USING (is_member()) WITH CHECK (is_member());

-- Updated_at trigger
CREATE TRIGGER set_updated_at_colaboradoras
  BEFORE UPDATE ON colaboradoras
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
