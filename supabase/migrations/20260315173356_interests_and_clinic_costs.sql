-- ============================================================
-- INTERESTS — people expressing intent to help/adopt/foster
-- ============================================================

CREATE TYPE interest_type_enum AS ENUM ('adocao', 'lar_temporario', 'contribuicao');
CREATE TYPE interest_status_enum AS ENUM ('pendente', 'contactado', 'aprovado', 'recusado');

CREATE TABLE interests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id     UUID REFERENCES animals(id) ON DELETE SET NULL, -- nullable = general interest
  full_name     TEXT NOT NULL,
  phone         TEXT NOT NULL,
  email         TEXT,
  message       TEXT,
  interest_type interest_type_enum NOT NULL,
  status        interest_status_enum NOT NULL DEFAULT 'pendente',
  admin_notes   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON interests(animal_id);
CREATE INDEX ON interests(status);
CREATE INDEX ON interests(interest_type);

CREATE TRIGGER interests_updated_at
  BEFORE UPDATE ON interests
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE interests ENABLE ROW LEVEL SECURITY;

-- Anyone can submit an interest (public page, no auth)
CREATE POLICY "public can insert interests"
  ON interests FOR INSERT WITH CHECK (true);

-- Only members can read and update
CREATE POLICY "members can read interests"
  ON interests FOR SELECT USING (is_member());
CREATE POLICY "members can update interests"
  ON interests FOR UPDATE USING (is_member());
CREATE POLICY "admin can delete interests"
  ON interests FOR DELETE USING (is_admin());

-- ============================================================
-- CLINIC PROCEDURE COSTS
-- ============================================================

CREATE TABLE clinic_procedure_costs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id      UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
  procedure_name TEXT NOT NULL,
  cost           NUMERIC(10,2),
  notes          TEXT,
  created_by     UUID REFERENCES profiles(id) DEFAULT auth.uid(),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON clinic_procedure_costs(clinic_id);

CREATE TRIGGER clinic_procedure_costs_updated_at
  BEFORE UPDATE ON clinic_procedure_costs
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE clinic_procedure_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can read clinic_procedure_costs"
  ON clinic_procedure_costs FOR SELECT USING (is_member());
CREATE POLICY "members can insert clinic_procedure_costs"
  ON clinic_procedure_costs FOR INSERT WITH CHECK (is_member());
CREATE POLICY "members can update clinic_procedure_costs"
  ON clinic_procedure_costs FOR UPDATE USING (is_member());
CREATE POLICY "admin can delete clinic_procedure_costs"
  ON clinic_procedure_costs FOR DELETE USING (is_admin());