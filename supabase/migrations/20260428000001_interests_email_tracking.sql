ALTER TABLE interests
  ADD COLUMN IF NOT EXISTS email_sent_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS email_sent_status TEXT;
