-- Migrate animals away from the lar_temporario status.
-- Custody is now the source of truth for foster/adoption state.
-- Animals in lar_temporario had a custody record created when the status was set;
-- moving them to disponivel lets the custody section show the actual placement.

UPDATE animals
  SET status = 'disponivel'::animal_status_enum
  WHERE status = 'lar_temporario'::animal_status_enum
    AND deleted_at IS NULL;

-- Note: adotado animals are left as-is (terminal legacy state).
-- Note: the enum values lar_temporario and adotado are kept in the DB type
--       because PostgreSQL does not allow removing enum values.
