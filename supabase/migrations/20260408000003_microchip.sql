-- R6: Microchip procedure type and number field
ALTER TYPE sanitary_procedure_enum ADD VALUE IF NOT EXISTS 'microchipagem';
ALTER TABLE sanitary_procedures ADD COLUMN IF NOT EXISTS microchip_number TEXT;
