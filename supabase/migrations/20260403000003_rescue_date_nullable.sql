-- Allow rescue records to be created without a date.
-- Pending-rescue animals need a location on the map before they are rescued.

ALTER TABLE animal_rescues ALTER COLUMN rescue_date DROP NOT NULL;
