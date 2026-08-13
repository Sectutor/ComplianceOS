-- ============================================================================
-- AGENT COMPLIANCE MODULE — Phase 3 Schema Migration
-- Adds: remediation task bridging, portal tokens, engagement automation
-- ============================================================================

-- ============================================================================
-- Phase 3: Extend existing project_tasks table for agent compliance bridging
-- ============================================================================

ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS agent_confidence INTEGER;
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS agent_framework VARCHAR(100);
ALTER TABLE project_tasks ADD COLUMN IF NOT EXISTS agent_control_id VARCHAR(100);

-- ============================================================================
-- Phase 3: Portal Token Registry (for client-facing portal access)
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_portal_tokens (
  id SERIAL PRIMARY KEY,
  token VARCHAR(255) NOT NULL UNIQUE,
  agent_id INTEGER NOT NULL,
  client_id INTEGER NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_by INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  last_accessed_at TIMESTAMP,
  access_count INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_apt_token ON agent_portal_tokens (token);
CREATE INDEX IF NOT EXISTS idx_apt_agent ON agent_portal_tokens (agent_id);
CREATE INDEX IF NOT EXISTS idx_apt_expires ON agent_portal_tokens (expires_at);

-- ============================================================================
-- Phase 3: Remediation Templates (playbook for each framework control)
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_remediation_templates (
  id SERIAL PRIMARY KEY,
  framework VARCHAR(100) NOT NULL,
  control_id VARCHAR(100) NOT NULL,
  title VARCHAR(500) NOT NULL,
  how_to_fix TEXT NOT NULL,
  evidence_required TEXT NOT NULL,
  difficulty VARCHAR(50) DEFAULT 'medium', -- easy, medium, hard
  estimated_hours INTEGER, -- how long this typically takes
  advisor_prompt TEXT, -- prompt for the AI advisor to generate specific guidance
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(framework, control_id)
);

CREATE INDEX IF NOT EXISTS idx_art_fwctrl ON agent_remediation_templates (framework, control_id);

-- ============================================================================
-- Phase 3: Autopilot Agent Compliance Config
-- ============================================================================

-- Add agent compliance as an autopilot module option
-- (No new table needed — autopilot_configs already has JSONB modules column)
-- The module name will be 'agent_compliance'

-- ============================================================================
-- Phase 3: Engagement Stage History (audit trail of stage changes)
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_engagement_history (
  id SERIAL PRIMARY KEY,
  engagement_id INTEGER NOT NULL,
  agent_id INTEGER NOT NULL,
  from_stage VARCHAR(50),
  to_stage VARCHAR(50) NOT NULL,
  triggered_by VARCHAR(100), -- system, manual, autopilot, evidence_upload
  trigger_detail VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_aeh_engagement ON agent_engagement_history (engagement_id);
CREATE INDEX IF NOT EXISTS idx_aeh_agent ON agent_engagement_history (agent_id);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE agent_portal_tokens IS 'Phase 3: shareable tokens for client-facing agent readiness portal';
COMMENT ON TABLE agent_remediation_templates IS 'Phase 3: playbook templates for remediating framework control gaps';
COMMENT ON TABLE agent_engagement_history IS 'Phase 3: audit trail of engagement stage transitions';
COMMENT ON COLUMN project_tasks.agent_confidence IS 'Phase 3: confidence score when remediation task was created';
COMMENT ON COLUMN project_tasks.agent_framework IS 'Phase 3: framework this remediation task relates to';
COMMENT ON COLUMN project_tasks.agent_control_id IS 'Phase 3: control ID this remediation task relates to';

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
