-- ============================================================================
-- AGENT COMPLIANCE MODULE — Phase 1 Schema Migration
-- ============================================================================

-- Enums
DO $$ BEGIN
  CREATE TYPE agent_type AS ENUM ('hermes', 'custom', 'langchain', 'autogen', 'crewai', 'other');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE agent_hosting AS ENUM ('docker_local', 'docker_remote', 'on_prem', 'vps', 'cloud_aws', 'cloud_azure', 'cloud_gcp');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE agent_sandbox AS ENUM ('docker', 'vm', 'ssh', 'none');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE agent_memory AS ENUM ('local_encrypted', 'local_plaintext', 'remote', 'none');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE agent_approval_mode AS ENUM ('manual', 'smart', 'auto');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE agent_tool_status AS ENUM ('active', 'allowlisted', 'disabled', 'blocked');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE policy_card_status AS ENUM ('draft', 'active', 'archived', 'superseded');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE policy_rule_effect AS ENUM ('deny', 'allow', 'escalate');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE policy_rule_status AS ENUM ('active', 'paused', 'triggered');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE mapping_status AS ENUM ('mapped', 'implemented', 'verified', 'failed', 'waived');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE redteam_severity AS ENUM ('informational', 'low', 'medium', 'high', 'critical');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Agent Profiles
CREATE TABLE IF NOT EXISTS agent_profiles (
  id SERIAL PRIMARY KEY,
  client_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version VARCHAR(50) DEFAULT '1.0.0',
  type agent_type NOT NULL,
  hosting agent_hosting NOT NULL,
  sandbox agent_sandbox NOT NULL,
  sandbox_details TEXT,
  memory_type agent_memory DEFAULT 'local_plaintext',
  memory_encryption BOOLEAN DEFAULT false,
  credential_handling TEXT,
  approval_mode agent_approval_mode DEFAULT 'manual',
  network_isolation BOOLEAN DEFAULT false,
  overall_score INTEGER DEFAULT 0,
  owasp_coverage INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active',
  owner VARCHAR(255),
  vendor_id INTEGER,
  config_path VARCHAR(500),
  docker_compose_path VARCHAR(500),
  deployment_notes TEXT,
  last_audit_date TIMESTAMP,
  next_audit_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ap_client ON agent_profiles (client_id);
CREATE INDEX IF NOT EXISTS idx_ap_type ON agent_profiles (type);
CREATE INDEX IF NOT EXISTS idx_ap_status ON agent_profiles (status);

-- Agent Tools
CREATE TABLE IF NOT EXISTS agent_tools (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  status agent_tool_status DEFAULT 'active',
  requires_approval BOOLEAN DEFAULT false,
  allowlist_only BOOLEAN DEFAULT false,
  risk_level VARCHAR(50) DEFAULT 'medium',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_at_agent ON agent_tools (agent_id);
CREATE INDEX IF NOT EXISTS idx_at_category ON agent_tools (category);

-- Agent Policy Cards
CREATE TABLE IF NOT EXISTS agent_policy_cards (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER NOT NULL,
  client_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  version VARCHAR(50) DEFAULT '1.0.0',
  status policy_card_status DEFAULT 'draft',
  ai_act_risk_level VARCHAR(50) DEFAULT 'limited',
  intended_uses JSONB DEFAULT '[]',
  prohibited_uses JSONB DEFAULT '[]',
  geography JSONB DEFAULT '[]',
  effective_date TIMESTAMP,
  review_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apc_agent ON agent_policy_cards (agent_id);
CREATE INDEX IF NOT EXISTS idx_apc_client ON agent_policy_cards (client_id);
CREATE INDEX IF NOT EXISTS idx_apc_status ON agent_policy_cards (status);

-- Agent Policy Rules
CREATE TABLE IF NOT EXISTS agent_policy_rules (
  id SERIAL PRIMARY KEY,
  policy_card_id INTEGER NOT NULL,
  rule_id VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  effect policy_rule_effect NOT NULL,
  status policy_rule_status DEFAULT 'active',
  condition_field VARCHAR(255) NOT NULL,
  condition_operator VARCHAR(50) NOT NULL,
  condition_value TEXT,
  action_type VARCHAR(100),
  action_message TEXT,
  severity VARCHAR(50) DEFAULT 'medium',
  owasp_category VARCHAR(100),
  nist_category VARCHAR(100),
  trigger_count INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apr_policy ON agent_policy_rules (policy_card_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_apr_rule_id ON agent_policy_rules (policy_card_id, rule_id);

-- Agent Policy Escalations
CREATE TABLE IF NOT EXISTS agent_policy_escalations (
  id SERIAL PRIMARY KEY,
  policy_card_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_condition VARCHAR(255) NOT NULL,
  trigger_operator VARCHAR(50) NOT NULL,
  trigger_value TEXT,
  action VARCHAR(100) NOT NULL,
  notify_emails JSONB DEFAULT '[]',
  priority VARCHAR(50) DEFAULT 'high',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ape_policy ON agent_policy_escalations (policy_card_id);

-- Agent Policy KPIs
CREATE TABLE IF NOT EXISTS agent_policy_kpis (
  id SERIAL PRIMARY KEY,
  policy_card_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  metric VARCHAR(100) NOT NULL,
  target_value INTEGER NOT NULL,
  critical_threshold INTEGER,
  warning_threshold INTEGER,
  current_value INTEGER DEFAULT 0,
  unit VARCHAR(50) DEFAULT 'percent',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apk_policy ON agent_policy_kpis (policy_card_id);

-- Agent Policy Assurance Mappings
CREATE TABLE IF NOT EXISTS agent_policy_assurance_mappings (
  id SERIAL PRIMARY KEY,
  policy_card_id INTEGER NOT NULL,
  framework VARCHAR(100) NOT NULL,
  section VARCHAR(255) NOT NULL,
  section_title VARCHAR(500),
  is_compliant BOOLEAN DEFAULT false,
  evidence TEXT,
  notes TEXT,
  mapped_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_apam_policy ON agent_policy_assurance_mappings (policy_card_id);
CREATE INDEX IF NOT EXISTS idx_apam_framework ON agent_policy_assurance_mappings (framework);

-- Agent Framework Mappings
CREATE TABLE IF NOT EXISTS agent_framework_mappings (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER NOT NULL,
  client_id INTEGER NOT NULL,
  framework VARCHAR(100) NOT NULL,
  control_id VARCHAR(100) NOT NULL,
  control_title VARCHAR(500),
  status mapping_status DEFAULT 'mapped',
  implementation TEXT,
  evidence_description TEXT,
  evidence_id INTEGER,
  auto_mapped BOOLEAN DEFAULT false,
  confidence INTEGER DEFAULT 100,
  mapped_by VARCHAR(100) DEFAULT 'system',
  verified_by VARCHAR(255),
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_afm_agent ON agent_framework_mappings (agent_id);
CREATE INDEX IF NOT EXISTS idx_afm_client ON agent_framework_mappings (client_id);
CREATE INDEX IF NOT EXISTS idx_afm_framework ON agent_framework_mappings (framework);
CREATE UNIQUE INDEX IF NOT EXISTS idx_afm_unique ON agent_framework_mappings (agent_id, framework, control_id);

-- Agent Red Team Results
CREATE TABLE IF NOT EXISTS agent_redteam_results (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER NOT NULL,
  client_id INTEGER NOT NULL,
  test_name VARCHAR(255) NOT NULL,
  test_category VARCHAR(100) NOT NULL,
  severity redteam_severity DEFAULT 'medium',
  passed BOOLEAN NOT NULL,
  details TEXT,
  remediation TEXT,
  evidence_path VARCHAR(500),
  status VARCHAR(50) DEFAULT 'open',
  tested_at TIMESTAMP DEFAULT NOW(),
  remediated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arr_agent ON agent_redteam_results (agent_id);
CREATE INDEX IF NOT EXISTS idx_arr_category ON agent_redteam_results (test_category);
CREATE INDEX IF NOT EXISTS idx_arr_status ON agent_redteam_results (status);

-- Agent Evidence (deployment artifacts)
CREATE TABLE IF NOT EXISTS agent_evidence (
  id SERIAL PRIMARY KEY,
  agent_id INTEGER NOT NULL,
  client_id INTEGER NOT NULL,
  evidence_type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_path VARCHAR(500),
  content TEXT,
  framework VARCHAR(100),
  control_id VARCHAR(100),
  status VARCHAR(50) DEFAULT 'collected',
  verified_by VARCHAR(255),
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ae_agent ON agent_evidence (agent_id);
CREATE INDEX IF NOT EXISTS idx_ae_type ON agent_evidence (evidence_type);
CREATE INDEX IF NOT EXISTS idx_ae_framework ON agent_evidence (framework);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE agent_profiles IS 'Agent Compliance: deployed AI agents with full security posture';
COMMENT ON TABLE agent_tools IS 'Agent Compliance: tools/integrations enabled for each agent';
COMMENT ON TABLE agent_policy_cards IS 'Agent Compliance: governance policy cards for agents';
COMMENT ON TABLE agent_policy_rules IS 'Agent Compliance: individual rules within a policy card';
COMMENT ON TABLE agent_policy_escalations IS 'Agent Compliance: escalation triggers for policy violations';
COMMENT ON TABLE agent_policy_kpis IS 'Agent Compliance: KPI thresholds for monitoring';
COMMENT ON TABLE agent_policy_assurance_mappings IS 'Agent Compliance: framework assurance mappings per policy card';
COMMENT ON TABLE agent_framework_mappings IS 'Agent Compliance: agent-to-framework control mappings';
COMMENT ON TABLE agent_redteam_results IS 'Agent Compliance: red team test results';
COMMENT ON TABLE agent_evidence IS 'Agent Compliance: deployment artifacts and evidence';