-- Animals: extra fields, new status, rescue geocoordinates

-- Porte enum
DO $$ BEGIN
  CREATE TYPE porte_enum AS ENUM ('mini', 'pequeno', 'medio', 'grande', 'gigante');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- New columns on animals
ALTER TABLE animals
  ADD COLUMN IF NOT EXISTS porte        porte_enum,
  ADD COLUMN IF NOT EXISTS color        TEXT,
  ADD COLUMN IF NOT EXISTS google_drive_url TEXT,
  ADD COLUMN IF NOT EXISTS palavra_chave    TEXT,
  ADD COLUMN IF NOT EXISTS acompanhante    TEXT;

-- New status: owner was found and animal returned
ALTER TYPE animal_status_enum ADD VALUE IF NOT EXISTS 'dono_identificado';

-- Rescue geocoordinates (optional, filled via Nominatim geocoding on the UI)
ALTER TABLE animal_rescues
  ADD COLUMN IF NOT EXISTS rescue_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS rescue_lng DOUBLE PRECISION;

-- Update the public status-count function to also exclude dono_identificado
CREATE OR REPLACE FUNCTION public.get_animal_status_counts()
RETURNS TABLE(status text, count bigint)
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT status::text, COUNT(*)::bigint
  FROM animals
  WHERE deleted_at IS NULL
    AND status::text NOT IN ('obito', 'dono_identificado')
  GROUP BY status;
$$;
