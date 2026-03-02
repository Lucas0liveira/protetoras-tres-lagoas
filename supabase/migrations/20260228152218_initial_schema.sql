-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE species_enum AS ENUM ('canino', 'felino', 'outro');
CREATE TYPE sex_enum AS ENUM ('macho', 'femea', 'indefinido');
CREATE TYPE animal_status_enum AS ENUM (
  'pendente_resgate', 'resgatado', 'lar_temporario', 'disponivel', 'adotado', 'obito'
);
CREATE TYPE visit_type_enum AS ENUM (
  'emergencia', 'rotina', 'retorno', 'cirurgia', 'outro'
);
CREATE TYPE exam_result_enum AS ENUM (
  'reagente', 'nao_reagente', 'aguardando', 'inconclusivo'
);
CREATE TYPE custody_type_enum AS ENUM ('lar_temporario', 'adocao');
CREATE TYPE custody_end_reason_enum AS ENUM (
  'devolucao_incompatibilidade', 'devolucao_mudanca', 'devolucao_alergia',
  'falecimento_responsavel', 'transferencia', 'obito_animal', 'outro'
);
CREATE TYPE sanitary_procedure_enum AS ENUM (
  'castracao', 'vacina_v8', 'vacina_v10', 'vacina_antirabica',
  'vermifugacao', 'bravecto', 'coleira_leishmaniose',
  'transfusao_sanguinea', 'outro'
);
CREATE TYPE user_role_enum AS ENUM ('admin', 'volunteer');

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================

CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL,
  role          user_role_enum NOT NULL DEFAULT 'volunteer',
  phone         TEXT,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- REUSABLE UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- CLINICS
-- ============================================================

CREATE TABLE clinics (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  phone       TEXT,
  address     TEXT,
  contact_vet TEXT,
  notes       TEXT,
  created_by  UUID REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ
);

CREATE TRIGGER clinics_updated_at
  BEFORE UPDATE ON clinics
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- ANIMALS
-- ============================================================

CREATE TABLE animals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  species          species_enum NOT NULL,
  sex              sex_enum NOT NULL DEFAULT 'indefinido',
  breed            TEXT,
  coat_description TEXT,
  birth_estimate   DATE,
  notes            TEXT,
  status           animal_status_enum NOT NULL DEFAULT 'pendente_resgate',
  created_by       UUID REFERENCES profiles(id),
  updated_by       UUID REFERENCES profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX ON animals(status);
CREATE INDEX ON animals(species);

CREATE TRIGGER animals_updated_at
  BEFORE UPDATE ON animals
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- RESCUE INFO (1:1 with animal, created after rescue happens)
-- ============================================================

CREATE TABLE animal_rescues (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id        UUID NOT NULL UNIQUE REFERENCES animals(id) ON DELETE CASCADE,
  rescue_date      DATE NOT NULL,
  rescue_location  TEXT,
  rescue_notes     TEXT,
  rescued_by       TEXT, -- free text name of who performed the rescue
  created_by       UUID REFERENCES profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER animal_rescues_updated_at
  BEFORE UPDATE ON animal_rescues
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- CUSTODY (temporary homes + adoptions unified)
-- ============================================================

CREATE TABLE custodians (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name            TEXT NOT NULL,
  cpf                  TEXT UNIQUE,
  rg                   TEXT,
  phone                TEXT NOT NULL,
  email                TEXT,
  address_street       TEXT,
  address_number       TEXT,
  address_neighborhood TEXT,
  address_city         TEXT,
  notes                TEXT,
  created_by           UUID REFERENCES profiles(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ
);

CREATE TRIGGER custodians_updated_at
  BEFORE UPDATE ON custodians
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE TABLE animal_custody (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id      UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  custodian_id   UUID NOT NULL REFERENCES custodians(id),
  custody_type   custody_type_enum NOT NULL,

  -- start
  started_at     DATE NOT NULL,
  termo_date     DATE,

  -- current state
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,

  -- end
  ended_at       DATE,
  end_reason     custody_end_reason_enum,
  end_notes      TEXT,

  created_by     UUID REFERENCES profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON animal_custody(animal_id);
CREATE INDEX ON animal_custody(custodian_id);
CREATE INDEX ON animal_custody(custody_type);
-- only one active custody per animal at a time
CREATE UNIQUE INDEX ON animal_custody(animal_id) WHERE is_active = TRUE;

CREATE TRIGGER animal_custody_updated_at
  BEFORE UPDATE ON animal_custody
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- MEDICAL RECORDS
-- ============================================================

CREATE TABLE medical_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id       UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  clinic_id       UUID REFERENCES clinics(id) ON DELETE SET NULL,
  visit_date      DATE NOT NULL,
  vet_name        TEXT,
  visit_type      visit_type_enum NOT NULL DEFAULT 'rotina',
  description     TEXT NOT NULL,
  follow_up_notes TEXT,
  follow_up_date  DATE,
  created_by      UUID REFERENCES profiles(id),
  updated_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON medical_records(animal_id);
CREATE INDEX ON medical_records(visit_date);

CREATE TRIGGER medical_records_updated_at
  BEFORE UPDATE ON medical_records
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- EXAMS
-- ============================================================

CREATE TABLE exams (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id         UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  medical_record_id UUID REFERENCES medical_records(id) ON DELETE SET NULL,
  exam_name         TEXT NOT NULL,
  result            exam_result_enum NOT NULL DEFAULT 'aguardando',
  result_detail     TEXT,
  exam_date         DATE,
  result_date       DATE,
  created_by        UUID REFERENCES profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON exams(animal_id);
CREATE INDEX ON exams(medical_record_id);

CREATE TRIGGER exams_updated_at
  BEFORE UPDATE ON exams
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- MEDICATIONS
-- ============================================================

CREATE TABLE medications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id         UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  medical_record_id UUID REFERENCES medical_records(id) ON DELETE SET NULL,
  name              TEXT NOT NULL,
  dosage            TEXT,
  frequency         TEXT,
  duration_days     INT,
  start_date        DATE,
  notes             TEXT,
  created_by        UUID REFERENCES profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON medications(animal_id);
CREATE INDEX ON medications(medical_record_id);

CREATE TRIGGER medications_updated_at
  BEFORE UPDATE ON medications
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- SANITARY PROCEDURES
-- ============================================================

CREATE TABLE sanitary_procedures (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id      UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  procedure_type sanitary_procedure_enum NOT NULL,
  performed_date DATE NOT NULL,
  next_due_date  DATE,
  description    TEXT,
  created_by     UUID REFERENCES profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON sanitary_procedures(animal_id);
CREATE INDEX ON sanitary_procedures(procedure_type);

CREATE TRIGGER sanitary_procedures_updated_at
  BEFORE UPDATE ON sanitary_procedures
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

-- ============================================================
-- ANIMAL PHOTOS
-- ============================================================

CREATE TABLE animal_photos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  animal_id    UUID NOT NULL REFERENCES animals(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  is_cover     BOOLEAN NOT NULL DEFAULT FALSE,
  caption      TEXT,
  taken_at     DATE,
  uploaded_by  UUID REFERENCES profiles(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON animal_photos(animal_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE animals              ENABLE ROW LEVEL SECURITY;
ALTER TABLE animal_rescues       ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinics              ENABLE ROW LEVEL SECURITY;
ALTER TABLE custodians           ENABLE ROW LEVEL SECURITY;
ALTER TABLE animal_custody       ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_records      ENABLE ROW LEVEL SECURITY;
ALTER TABLE exams                ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE sanitary_procedures  ENABLE ROW LEVEL SECURITY;
ALTER TABLE animal_photos        ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION is_member()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND active = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin' AND active = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- profiles
CREATE POLICY "members can read all profiles"
  ON profiles FOR SELECT USING (is_member());
CREATE POLICY "users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "admin full access to profiles"
  ON profiles FOR ALL USING (is_admin());

-- all other tables: members read+write, admin-only delete
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'animals', 'animal_rescues', 'clinics', 'custodians', 'animal_custody',
    'medical_records', 'exams', 'medications', 'sanitary_procedures', 'animal_photos'
  ] LOOP
    EXECUTE format('
      CREATE POLICY "members can read %I"   ON %I FOR SELECT USING (is_member());
      CREATE POLICY "members can insert %I" ON %I FOR INSERT WITH CHECK (is_member());
      CREATE POLICY "members can update %I" ON %I FOR UPDATE USING (is_member());
      CREATE POLICY "admin can delete %I"   ON %I FOR DELETE USING (is_admin());
    ', t, t, t, t, t, t, t, t);
  END LOOP;
END $$;