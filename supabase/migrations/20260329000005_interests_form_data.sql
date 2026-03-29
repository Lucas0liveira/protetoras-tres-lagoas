-- Add form_data JSONB column and voluntario interest type to interests table

ALTER TABLE interests ADD COLUMN IF NOT EXISTS form_data JSONB DEFAULT '{}';

-- Add 'voluntario' to the interest_type_enum
ALTER TYPE interest_type_enum ADD VALUE IF NOT EXISTS 'voluntario';
