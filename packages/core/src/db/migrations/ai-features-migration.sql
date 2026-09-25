-- ============================================================================
-- AI Features Migration
-- Creates tables for: feature toggles, privacy settings, audit log,
-- JevAI provider config, and regulation watch list.
-- ============================================================================

-- 1. AI Feature Toggles (per-client, per-feature on/off)
CREATE TABLE IF NOT EXISTS ai_feature_toggles (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL,
  feature_id VARCHAR(50) NOT NULL,
  is_enabled BOOLEAN DEFAULT FALSE,
  data_scope VARCHAR(20) DEFAULT 'anonymized',
  confidence_threshold INTEGER DEFAULT 70,
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_feature_client_feature ON ai_feature_toggles (client_id, feature_id);
CREATE INDEX IF NOT EXISTS idx_ai_feature_client ON ai_feature_toggles (client_id);

-- 2. AI Privacy Settings (master switches)
CREATE TABLE IF NOT EXISTS ai_privacy_settings (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL UNIQUE,
  external_ai_enabled BOOLEAN DEFAULT FALSE,
  dry_run_mode BOOLEAN DEFAULT TRUE,
  default_data_scope VARCHAR(20) DEFAULT 'anonymized',
  jevai_enabled BOOLEAN DEFAULT FALSE,
  cloud_llm_enabled BOOLEAN DEFAULT FALSE,
  local_llm_enabled BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_privacy_client ON ai_privacy_settings (client_id);

-- 3. External AI Audit Log (immutable record of every external call)
CREATE TABLE IF NOT EXISTS ai_audit_log (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL,
  user_id INTEGER,
  feature_id VARCHAR(50) NOT NULL,
  provider VARCHAR(50) NOT NULL,
  data_scope VARCHAR(20) NOT NULL,
  was_dry_run BOOLEAN DEFAULT FALSE,
  entity_type VARCHAR(50),
  entity_id INTEGER,
  payload_summary TEXT,
  success BOOLEAN DEFAULT TRUE,
  error_message TEXT,
  confidence_score INTEGER,
  latency_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_audit_client ON ai_audit_log (client_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_feature ON ai_audit_log (feature_id);
CREATE INDEX IF NOT EXISTS idx_ai_audit_created ON ai_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_audit_provider ON ai_audit_log (provider);

-- 4. JevAI Provider Configuration
CREATE TABLE IF NOT EXISTS jevai_config (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL UNIQUE,
  api_key TEXT NOT NULL,
  base_url VARCHAR(512) DEFAULT 'https://api.typesafe.ai',
  model VARCHAR(100) DEFAULT 'jev-default',
  enabled_modes JSON DEFAULT '["classifier", "router", "scorer", "extractor"]',
  rate_limit_per_minute INTEGER DEFAULT 60,
  is_enabled BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jevai_config_client ON jevai_config (client_id);

-- 5. Regulation Watch List (for regulation change monitoring)
CREATE TABLE IF NOT EXISTS regulation_watch (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL,
  regulation_name VARCHAR(255) NOT NULL,
  regulation_url VARCHAR(512),
  last_content_hash VARCHAR(64),
  last_checked_at TIMESTAMP,
  last_changed_at TIMESTAMP,
  affected_controls JSON DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reg_watch_client_reg ON regulation_watch (client_id, regulation_name);

-- ============================================================================
-- Default privacy settings for existing clients (safe defaults: all disabled)
-- ============================================================================

-- Insert default privacy settings for any client that doesn't have them yet
INSERT INTO ai_privacy_settings (client_id, external_ai_enabled, dry_run_mode, default_data_scope)
SELECT id, FALSE, TRUE, 'anonymized'
FROM clients
WHERE id NOT IN (SELECT client_id FROM ai_privacy_settings)
ON CONFLICT (client_id) DO NOTHING;
