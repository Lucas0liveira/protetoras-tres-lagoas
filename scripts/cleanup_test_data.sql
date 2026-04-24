-- ============================================================
-- CLEANUP TEST DATA — Preserve real animals only
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
--
-- Real user UUID: 8130202c-8c08-4798-a485-1a1be84a5fc2
--
-- STEP 0 ─ Run the preview query below FIRST to confirm what
--           will be saved before executing the full script.
-- ============================================================

-- PREVIEW (run this alone first, do NOT run with the full script):
-- SELECT id, name, species, status, created_at
-- FROM animals
-- WHERE created_by = '8130202c-8c08-4798-a485-1a1be84a5fc2'
-- ORDER BY created_at;

-- ============================================================
-- FULL CLEANUP (run everything below as one block)
-- ============================================================

BEGIN;

-- ── 1. Snapshot the real animals ─────────────────────────────
CREATE TEMP TABLE _real_animals AS
  SELECT * FROM animals
  WHERE created_by = '8130202c-8c08-4798-a485-1a1be84a5fc2';

-- Abort immediately if nothing matched — safety guard
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM _real_animals) = 0 THEN
    RAISE EXCEPTION 'No animals found for the given created_by UUID. Aborting.';
  END IF;
END $$;

-- ── 2. Snapshot all data related to those animals ────────────
CREATE TEMP TABLE _real_rescues AS
  SELECT ar.* FROM animal_rescues ar
  JOIN _real_animals a ON ar.animal_id = a.id;

CREATE TEMP TABLE _real_custody AS
  SELECT ac.* FROM animal_custody ac
  JOIN _real_animals a ON ac.animal_id = a.id;

CREATE TEMP TABLE _real_medical AS
  SELECT mr.* FROM medical_records mr
  JOIN _real_animals a ON mr.animal_id = a.id;

CREATE TEMP TABLE _real_exams AS
  SELECT e.* FROM exams e
  JOIN _real_animals a ON e.animal_id = a.id;

CREATE TEMP TABLE _real_meds AS
  SELECT m.* FROM medications m
  JOIN _real_animals a ON m.animal_id = a.id;

CREATE TEMP TABLE _real_sanitary AS
  SELECT sp.* FROM sanitary_procedures sp
  JOIN _real_animals a ON sp.animal_id = a.id;

CREATE TEMP TABLE _real_photos AS
  SELECT ap.* FROM animal_photos ap
  JOIN _real_animals a ON ap.animal_id = a.id;

-- Custodians referenced by real custody records (FK dependency)
CREATE TEMP TABLE _real_custodians AS
  SELECT c.* FROM custodians c
  WHERE c.id IN (SELECT custodian_id FROM _real_custody WHERE custodian_id IS NOT NULL);

-- Clinics referenced by real medical records (FK dependency)
CREATE TEMP TABLE _real_clinics AS
  SELECT c.* FROM clinics c
  WHERE c.id IN (SELECT clinic_id FROM _real_medical WHERE clinic_id IS NOT NULL)
     OR c.created_by = '8130202c-8c08-4798-a485-1a1be84a5fc2';

-- ── 3. Wipe all mutable tables ───────────────────────────────
-- Explicit list avoids hidden cascade surprises.
-- profiles and site_config are intentionally excluded.
TRUNCATE
  animal_photos,
  sanitary_procedures,
  medications,
  exams,
  medical_records,
  animal_custody,
  animal_rescues,
  interests,
  clinic_procedure_costs,
  animals,
  custodians,
  clinics,
  pharmacy_items,
  alerts,
  financial_records,
  collection_points
CASCADE;

-- ── 4. Restore real data (FK-safe order) ────────────────────
INSERT INTO animals             SELECT * FROM _real_animals;
INSERT INTO custodians          SELECT * FROM _real_custodians;
INSERT INTO clinics             SELECT * FROM _real_clinics;
INSERT INTO animal_rescues      SELECT * FROM _real_rescues;
INSERT INTO animal_custody      SELECT * FROM _real_custody;
INSERT INTO medical_records     SELECT * FROM _real_medical;
INSERT INTO exams               SELECT * FROM _real_exams;
INSERT INTO medications         SELECT * FROM _real_meds;
INSERT INTO sanitary_procedures SELECT * FROM _real_sanitary;
INSERT INTO animal_photos       SELECT * FROM _real_photos;

-- ── 5. Verify result ─────────────────────────────────────────
SELECT id, name, species, status, created_at
FROM animals
ORDER BY created_at;

COMMIT;
