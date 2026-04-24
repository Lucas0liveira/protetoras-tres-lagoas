-- Link colaboradoras to auth users (one-to-one, nullable)
-- Allows creating auth users for team members and associating them
-- with their existing colaboradora record.

ALTER TABLE colaboradoras
  ADD COLUMN user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;
