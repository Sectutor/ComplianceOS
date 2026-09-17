-- ============================================================================
-- AGENT COMPLIANCE MODULE — Phase 2 Schema Migration
-- Adds evidence-backed scoring, score history, engagement tracking, drift detection
-- ============================================================================

-- Phase 2: New enum
DO $$ BEGIN
  CREATE TYPE score_source AS ENUM ('auto_map', 'evidence', 'redteam', 'manual', 'scan');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================================
-- Phase 2: Add columns to existing agent_framework_mappings for evidence linkage
-- ============================================================================

ALTER TABLE agent_profiles ADD COLUMN IF NOT EXISTS config_hash VARCHAR(100);

ALTER TABLE agent_framework_mappings ADD COLUMN IF NOT EXISTS evidence_count INTEGER DEFAULT 0;
ALTER TABLE agent_framework_mappings ADD COLUMN IF NOT EXISTS last_evidence_at TIMESTAMP;
ALTER TABLE agent_framework_mappings ADD COLUMN IF NOT EXISTS last_redteam_at TIMESTAMP;
ALTER TABLE agent_framework_mappings ADD COLUMN IF NOT EXISTS redteam_passed BOOLEAN;

ALTER TABLE agent_redteam_results ADD COLUMN IF NOT EXISTS related_framework VARCHAR(100);
ALTER TABLE agent_redteam_results ADD COLUMN IF NOT EXISTS related_control_id VARCHAR(100);

ALTER TABLE agent_evidence ADD COLUMN IF NOT EXISTS file_hash VARCHAR(128);
ALTER TABLE agent_evidence ADD COLUMN IF NOT EXISTS file_size INTEGER;
ALTER TABLE agent_evidence ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100);
ALTER TABLE agent_evidence ADD COLUMN IF NOT EXISTS source_type VARCHAR(50) DEFAULT 'manual';
ALTER TABLE agent_evidence ADD COLUMN IF NOT EXISTS source_detail VARCHAR(500);

-- ============================================================================
-- Phase 2: New table - Evidence-to-Control Linkage (precise many-to-many)
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_evidence_controls (
  id SERIAL PRIMARY KEY,
  evidence_id INTEGER NOT NULL,
  agent_id INTEGER NOT NULL,
  framework VARCHAR(100) NOT NULL,
  control_id VARCHAR(100) NOT NULL,
  contribution_type VARCHAR(50) NOT NULL,
  weight INTEGER DEFAULT 100,
  linked_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aec_evidence ON agent_evidence_controls (evidence_id);
CREATE INDEX IF NOT EXISTS idx_aec_agent ON agent_evidence_controls (agent_id);
CREATE INDEX IF NOT EXISTS idx_aec_fwctrl ON agent_evidence_controls (framework, control_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_aec_unique ON agent_evidence_controls (evidence_id, framework, control_id);

-- ============================================================================
-- Phase 2: New table - Score History (for trend tracking and board reports)
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_score_history (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER NOT NULL,
  client_id INTEGER NOT NULL,
  overall_score INTEGER NOT NULL,
  owasp_coverage INTEGER NOT NULL,
  framework_scores JSONB DEFAULT '{}',
  trigger_source score_source NOT NULL,
  trigger_detail VARCHAR(500),
  evidence_count INTEGER DEFAULT 0,
  redteam_pass_count INTEGER DEFAULT 0,
  redteam_fail_count INTEGER DEFAULT 0,
  gap_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ash_agent ON agent_score_history (agent_id);
CREATE INDEX IF NOT EXISTS idx_ash_client ON agent_score_history (client_id);
CREATE INDEX IF NOT EXISTS idx_ash_created ON agent_score_history (created_at);

-- ============================================================================
-- Phase 2: New table - Engagement Tracker (service delivery lifecycle)
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_engagements (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER NOT NULL UNIQUE,
  client_id INTEGER NOT NULL,
  stage VARCHAR(50) DEFAULT 'discovery',
  stage_started_at TIMESTAMP DEFAULT NOW(),
  stage_completed_at TIMESTAMP,
  assigned_to VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ae_agent ON agent_engagements (agent_id);
CREATE INDEX IF NOT EXISTS idx_ae_client ON agent_engagements (client_id);
CREATE INDEX IF NOT EXISTS idx_ae_stage ON agent_engagements (stage);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE agent_evidence_controls IS 'Phase 2: precise linkage of evidence to framework controls with weight';
COMMENT ON TABLE agent_score_history IS 'Phase 2: historical snapshots of agent compliance scores for trend tracking';
COMMENT ON TABLE agent_engagements IS 'Phase 2: service delivery lifecycle stage tracker per agent';
COMMENT ON COLUMN agent_profiles.config_hash IS 'Phase 2: SHA-256 of deployment config for drift detection';
COMMENT ON COLUMN agent_framework_mappings.evidence_count IS 'Phase 2: denormalized count of evidence items per mapping';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
