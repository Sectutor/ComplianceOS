-- Migration: Phase 3.4 — Token Credits System
-- Run: npx drizzle-kit push:pg
-- Or: psql $DATABASE_URL -f scripts/migrations/004_token_credits.sql

-- 1. Add token columns to clients table
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS token_balance INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS token_used INTEGER NOT NULL DEFAULT 0;

-- 2. Create token_transactions table for audit trail
CREATE TABLE IF NOT EXISTS token_transactions (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('purchase', 'consumption', 'refund', 'grant')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_token_transactions_client_id
  ON token_transactions(client_id);

CREATE INDEX IF NOT EXISTS idx_token_transactions_created_at
  ON token_transactions(created_at DESC);

-- 4. Grant free starter tokens to existing clients
UPDATE clients SET token_balance = 10000 WHERE token_balance = 0;

-- 5. Record the grant
INSERT INTO token_transactions (client_id, amount, type, description)
  SELECT id, 10000, 'grant', 'Free starter tokens (Phase 3.4 migration)'
  FROM clients
  WHERE token_balance = 10000
    AND NOT EXISTS (
      SELECT 1 FROM token_transactions tt
      WHERE tt.client_id = clients.id AND tt.type = 'grant'
    );
