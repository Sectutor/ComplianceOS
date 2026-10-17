-- =============================================================================
-- Self-host gap fill (2026-10-14). Generated from the Drizzle schema modules with
-- drizzle-kit/payload (generateMigration) for tables and columns the code uses
-- but that the statements above never created. Every statement is idempotent
-- (IF NOT EXISTS / duplicate_object guards), so it is safe on existing installs.
-- Columns that Drizzle marks NOT NULL are added nullable here so existing rows
-- are never rejected.
-- =============================================================================
DO $$ BEGIN
 CREATE TYPE "agent_approval_mode" AS ENUM('manual', 'smart', 'auto');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "agent_hosting" AS ENUM('docker_local', 'docker_remote', 'on_prem', 'vps', 'cloud_aws', 'cloud_azure', 'cloud_gcp');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "agent_memory" AS ENUM('local_encrypted', 'local_plaintext', 'remote', 'none');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "agent_sandbox" AS ENUM('docker', 'vm', 'ssh', 'none');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "agent_tool_status" AS ENUM('active', 'allowlisted', 'disabled', 'blocked');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "agent_type" AS ENUM('hermes', 'custom', 'langchain', 'autogen', 'crewai', 'other');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "mapping_status" AS ENUM('mapped', 'implemented', 'verified', 'failed', 'waived');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "policy_card_status" AS ENUM('draft', 'active', 'archived', 'superseded');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "policy_rule_effect" AS ENUM('deny', 'allow', 'escalate');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "policy_rule_status" AS ENUM('active', 'paused', 'triggered');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "redteam_severity" AS ENUM('informational', 'low', 'medium', 'high', 'critical');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "score_source" AS ENUM('auto_map', 'evidence', 'redteam', 'manual', 'scan');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_engagements" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"stage" varchar(50) DEFAULT 'discovery',
	"stage_started_at" timestamp DEFAULT now(),
	"stage_completed_at" timestamp,
	"assigned_to" varchar(255),
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "agent_engagements_agent_id_unique" UNIQUE("agent_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_evidence" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"evidence_type" varchar(100) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"file_path" varchar(500),
	"content" text,
	"file_hash" varchar(128),
	"file_size" integer,
	"mime_type" varchar(100),
	"framework" varchar(100),
	"control_id" varchar(100),
	"source_type" varchar(50) DEFAULT 'manual',
	"source_detail" varchar(500),
	"status" varchar(50) DEFAULT 'collected',
	"verified_by" varchar(255),
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_evidence_controls" (
	"id" serial PRIMARY KEY NOT NULL,
	"evidence_id" integer NOT NULL,
	"agent_id" integer NOT NULL,
	"framework" varchar(100) NOT NULL,
	"control_id" varchar(100) NOT NULL,
	"contribution_type" varchar(50) NOT NULL,
	"weight" integer DEFAULT 100,
	"linked_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_framework_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"framework" varchar(100) NOT NULL,
	"control_id" varchar(100) NOT NULL,
	"control_title" varchar(500),
	"status" "mapping_status" DEFAULT 'mapped',
	"implementation" text,
	"evidence_description" text,
	"evidence_id" integer,
	"auto_mapped" boolean DEFAULT false,
	"confidence" integer DEFAULT 100,
	"mapped_by" varchar(100) DEFAULT 'system',
	"verified_by" varchar(255),
	"verified_at" timestamp,
	"evidence_count" integer DEFAULT 0,
	"last_evidence_at" timestamp,
	"last_redteam_at" timestamp,
	"redteam_passed" boolean,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_policy_assurance_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"policy_card_id" integer NOT NULL,
	"framework" varchar(100) NOT NULL,
	"section" varchar(255) NOT NULL,
	"section_title" varchar(500),
	"is_compliant" boolean DEFAULT false,
	"evidence" text,
	"notes" text,
	"mapped_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_policy_cards" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"version" varchar(50) DEFAULT '1.0.0',
	"status" "policy_card_status" DEFAULT 'draft',
	"ai_act_risk_level" varchar(50) DEFAULT 'limited',
	"intended_uses" jsonb DEFAULT '[]'::jsonb,
	"prohibited_uses" jsonb DEFAULT '[]'::jsonb,
	"geography" jsonb DEFAULT '[]'::jsonb,
	"effective_date" timestamp,
	"review_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_policy_escalations" (
	"id" serial PRIMARY KEY NOT NULL,
	"policy_card_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"trigger_condition" varchar(255) NOT NULL,
	"trigger_operator" varchar(50) NOT NULL,
	"trigger_value" text,
	"action" varchar(100) NOT NULL,
	"notify_emails" jsonb DEFAULT '[]'::jsonb,
	"priority" varchar(50) DEFAULT 'high',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_policy_kpis" (
	"id" serial PRIMARY KEY NOT NULL,
	"policy_card_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"metric" varchar(100) NOT NULL,
	"target_value" integer NOT NULL,
	"critical_threshold" integer,
	"warning_threshold" integer,
	"current_value" integer DEFAULT 0,
	"unit" varchar(50) DEFAULT 'percent',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_policy_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"policy_card_id" integer NOT NULL,
	"rule_id" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"effect" "policy_rule_effect" NOT NULL,
	"status" "policy_rule_status" DEFAULT 'active',
	"condition_field" varchar(255) NOT NULL,
	"condition_operator" varchar(50) NOT NULL,
	"condition_value" text,
	"action_type" varchar(100),
	"action_message" text,
	"severity" varchar(50) DEFAULT 'medium',
	"owasp_category" varchar(100),
	"nist_category" varchar(100),
	"trigger_count" integer DEFAULT 0,
	"last_triggered_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_portal_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" varchar(255) NOT NULL,
	"agent_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"last_accessed_at" timestamp,
	"access_count" integer DEFAULT 0,
	"created_by" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"version" varchar(50) DEFAULT '1.0.0',
	"type" "agent_type" NOT NULL,
	"hosting" "agent_hosting" NOT NULL,
	"sandbox" "agent_sandbox" NOT NULL,
	"sandbox_details" text,
	"memory_type" "agent_memory" DEFAULT 'local_plaintext',
	"memory_encryption" boolean DEFAULT false,
	"credential_handling" text,
	"approval_mode" "agent_approval_mode" DEFAULT 'manual',
	"network_isolation" boolean DEFAULT false,
	"overall_score" integer DEFAULT 0,
	"owasp_coverage" integer DEFAULT 0,
	"status" varchar(50) DEFAULT 'active',
	"owner" varchar(255),
	"vendor_id" integer,
	"config_path" varchar(500),
	"docker_compose_path" varchar(500),
	"config_hash" varchar(100),
	"deployment_notes" text,
	"last_audit_date" timestamp,
	"next_audit_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_redteam_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"test_name" varchar(255) NOT NULL,
	"test_category" varchar(100) NOT NULL,
	"severity" "redteam_severity" DEFAULT 'medium',
	"passed" boolean NOT NULL,
	"details" text,
	"remediation" text,
	"evidence_path" varchar(500),
	"status" varchar(50) DEFAULT 'open',
	"related_framework" varchar(100),
	"related_control_id" varchar(100),
	"tested_at" timestamp DEFAULT now(),
	"remediated_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_score_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"overall_score" integer NOT NULL,
	"owasp_coverage" integer NOT NULL,
	"framework_scores" jsonb DEFAULT '{}'::jsonb,
	"trigger_source" "score_source" NOT NULL,
	"trigger_detail" varchar(500),
	"evidence_count" integer DEFAULT 0,
	"redteam_pass_count" integer DEFAULT 0,
	"redteam_fail_count" integer DEFAULT 0,
	"gap_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_tools" (
	"id" serial PRIMARY KEY NOT NULL,
	"agent_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100),
	"status" "agent_tool_status" DEFAULT 'active',
	"requires_approval" boolean DEFAULT false,
	"allowlist_only" boolean DEFAULT false,
	"risk_level" varchar(50) DEFAULT 'medium',
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_audit_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"user_id" integer,
	"feature_id" varchar(50) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"data_scope" varchar(20) NOT NULL,
	"was_dry_run" boolean DEFAULT false,
	"entity_type" varchar(50),
	"entity_id" integer,
	"payload_summary" text,
	"success" boolean DEFAULT true,
	"error_message" text,
	"confidence_score" integer,
	"latency_ms" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_feature_toggles" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"feature_id" varchar(50) NOT NULL,
	"is_enabled" boolean DEFAULT false,
	"data_scope" varchar(20) DEFAULT 'anonymized',
	"confidence_threshold" integer DEFAULT 70,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_privacy_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"external_ai_enabled" boolean DEFAULT false,
	"dry_run_mode" boolean DEFAULT true,
	"default_data_scope" varchar(20) DEFAULT 'anonymized',
	"jevai_enabled" boolean DEFAULT false,
	"cloud_llm_enabled" boolean DEFAULT false,
	"local_llm_enabled" boolean DEFAULT true,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "ai_privacy_settings_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auditor_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer NOT NULL,
	"control_id" integer,
	"evidence_id" integer,
	"comment" text NOT NULL,
	"author_name" varchar(255),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "auditor_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"token" varchar(64) NOT NULL,
	"expires_at" timestamp NOT NULL,
	"scope" varchar(100) DEFAULT 'all',
	"auditor_email" varchar(255),
	"auditor_name" varchar(255),
	"created_by_id" integer,
	"last_accessed_at" timestamp,
	"is_revoked" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "auditor_sessions_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "autopilot_action_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"action_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"actor_type" varchar(20) NOT NULL,
	"actor_id" varchar(100),
	"actor_name" varchar(255),
	"action_type" varchar(50) NOT NULL,
	"previous_status" varchar(30),
	"new_status" varchar(30),
	"notes" text,
	"patch_payload" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "autopilot_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"run_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"priority" varchar(20) DEFAULT 'medium',
	"status" varchar(30) DEFAULT 'pending',
	"target_entity" jsonb,
	"metadata" jsonb,
	"ai_rationale" text,
	"assigned_to_user_id" integer,
	"assigned_to_employee_id" integer,
	"assigned_agent" varchar(50),
	"reviewer_user_id" integer,
	"delegated_by_user_id" integer,
	"escalation_level" integer DEFAULT 1,
	"escalated_to_role" varchar(50),
	"escalated_to_name" varchar(255),
	"escalated_at" timestamp,
	"escalation_reason" text,
	"due_at" timestamp,
	"sla_breach_at" timestamp,
	"risk_accepted_until" timestamp,
	"risk_acceptance_rationale" text,
	"compensating_controls" text,
	"incident_id" integer,
	"created_at" timestamp DEFAULT now(),
	"reviewed_at" timestamp,
	"reviewed_by" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "autopilot_configs" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"enabled" boolean DEFAULT false,
	"schedule" varchar(20) DEFAULT 'daily',
	"modules" jsonb DEFAULT '{"collectEvidence":true,"runHealthChecks":true,"detectGaps":true,"createRemediationTasks":true,"generateReport":false,"sendNotifications":true}'::jsonb,
	"approval_mode" varchar(20) DEFAULT 'review',
	"last_run_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "autopilot_configs_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "autopilot_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp,
	"status" varchar(20) DEFAULT 'running',
	"modules_executed" jsonb,
	"results" jsonb,
	"error_message" text,
	"duration" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "client_auto_test_schedules" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"interval_hours" integer DEFAULT 6 NOT NULL,
	"last_run_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "client_control_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_control_id" integer NOT NULL,
	"from_status" varchar(50),
	"to_status" varchar(50) NOT NULL,
	"changed_by_user_id" integer,
	"changed_by_name" varchar(255),
	"note" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "client_journey" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"current_step" varchar(64) DEFAULT 'welcome' NOT NULL,
	"completed_steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"skipped_steps" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"selected_framework" varchar(64),
	"onboarding_status" varchar(32) DEFAULT 'not_started' NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "client_journey_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "compliance_monitor_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"control_id" integer,
	"control_name" varchar(255),
	"old_value" text,
	"new_value" text,
	"severity" varchar(50) DEFAULT 'info',
	"details" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "control_test_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"client_control_id" integer NOT NULL,
	"control_code" varchar(50),
	"test_type" varchar(50) NOT NULL,
	"status" varchar(20) NOT NULL,
	"score" integer DEFAULT 100,
	"message" text,
	"findings" jsonb,
	"executed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "embeddings" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer,
	"entity_type" varchar(50),
	"entity_id" varchar(100),
	"doc_id" varchar(100) NOT NULL,
	"doc_type" varchar(50) NOT NULL,
	"embedding_data" text,
	"embedding_vector" vector,
	"embedding" vector,
	"content" text,
	"metadata" json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "jevai_config" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"api_key" text NOT NULL,
	"base_url" varchar(512) DEFAULT 'https://api.typesafe.ai',
	"model" varchar(100) DEFAULT 'jev-default',
	"enabled_modes" json DEFAULT '["classifier","router","scorer","extractor"]'::json,
	"rate_limit_per_minute" integer DEFAULT 60,
	"is_enabled" boolean DEFAULT false,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "jevai_config_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "regulation_watch" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"regulation_name" varchar(255) NOT NULL,
	"regulation_url" varchar(512),
	"last_content_hash" varchar(64),
	"last_checked_at" timestamp,
	"last_changed_at" timestamp,
	"affected_controls" json,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "client_controls" ADD COLUMN IF NOT EXISTS "last_reviewed_at" timestamp;
--> statement-breakpoint
ALTER TABLE "client_controls" ADD COLUMN IF NOT EXISTS "next_review_date" timestamp;
--> statement-breakpoint
ALTER TABLE "data_breaches" ADD COLUMN IF NOT EXISTS "metadata" jsonb;
--> statement-breakpoint
ALTER TABLE "dsar_requests" ADD COLUMN IF NOT EXISTS "purge_checklist" jsonb;
--> statement-breakpoint
ALTER TABLE "process_data_flows" ADD COLUMN IF NOT EXISTS "client_id" integer;
--> statement-breakpoint
ALTER TABLE "process_data_flows" ADD COLUMN IF NOT EXISTS "data_category" varchar(255);
--> statement-breakpoint
ALTER TABLE "process_data_flows" ADD COLUMN IF NOT EXISTS "destination" varchar(255);
--> statement-breakpoint
ALTER TABLE "process_data_flows" ADD COLUMN IF NOT EXISTS "name" varchar(255);
--> statement-breakpoint
ALTER TABLE "process_data_flows" ADD COLUMN IF NOT EXISTS "source" varchar(255);
--> statement-breakpoint
ALTER TABLE "process_data_flows" ADD COLUMN IF NOT EXISTS "vendor_id" integer;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_aeg_agent" ON "agent_engagements" ("agent_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_aeg_client" ON "agent_engagements" ("client_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_aeg_stage" ON "agent_engagements" ("stage");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ae_agent" ON "agent_evidence" ("agent_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ae_type" ON "agent_evidence" ("evidence_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ae_framework" ON "agent_evidence" ("framework");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_aec_evidence" ON "agent_evidence_controls" ("evidence_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_aec_agent" ON "agent_evidence_controls" ("agent_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_aec_fwctrl" ON "agent_evidence_controls" ("framework","control_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_aec_unique" ON "agent_evidence_controls" ("evidence_id","framework","control_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_afm_agent" ON "agent_framework_mappings" ("agent_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_afm_client" ON "agent_framework_mappings" ("client_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_afm_framework" ON "agent_framework_mappings" ("framework");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_afm_unique" ON "agent_framework_mappings" ("agent_id","framework","control_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_apam_policy" ON "agent_policy_assurance_mappings" ("policy_card_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_apam_framework" ON "agent_policy_assurance_mappings" ("framework");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_apc_agent" ON "agent_policy_cards" ("agent_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_apc_client" ON "agent_policy_cards" ("client_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_apc_status" ON "agent_policy_cards" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ape_policy" ON "agent_policy_escalations" ("policy_card_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_apk_policy" ON "agent_policy_kpis" ("policy_card_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_apr_policy" ON "agent_policy_rules" ("policy_card_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_apr_rule_id" ON "agent_policy_rules" ("policy_card_id","rule_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_apt_token" ON "agent_portal_tokens" ("token");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_apt_agent" ON "agent_portal_tokens" ("agent_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ap_client" ON "agent_profiles" ("client_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ap_type" ON "agent_profiles" ("type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ap_status" ON "agent_profiles" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_arr_agent" ON "agent_redteam_results" ("agent_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_arr_category" ON "agent_redteam_results" ("test_category");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_arr_status" ON "agent_redteam_results" ("status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ash_agent" ON "agent_score_history" ("agent_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ash_client" ON "agent_score_history" ("client_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ash_created" ON "agent_score_history" ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_at_agent" ON "agent_tools" ("agent_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_at_category" ON "agent_tools" ("category");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ai_audit_client" ON "ai_audit_log" ("client_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ai_audit_feature" ON "ai_audit_log" ("feature_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ai_audit_created" ON "ai_audit_log" ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ai_audit_provider" ON "ai_audit_log" ("provider");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_ai_feature_client_feature" ON "ai_feature_toggles" ("client_id","feature_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ai_feature_client" ON "ai_feature_toggles" ("client_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ai_privacy_client" ON "ai_privacy_settings" ("client_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_auditor_token" ON "auditor_sessions" ("token");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_auditor_client" ON "auditor_sessions" ("client_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ap_history_action" ON "autopilot_action_history" ("action_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ap_history_client" ON "autopilot_action_history" ("client_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ap_action_run" ON "autopilot_actions" ("run_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ap_action_client_status" ON "autopilot_actions" ("client_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ap_run_client" ON "autopilot_runs" ("client_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ap_run_status" ON "autopilot_runs" ("status");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_client_auto_test_schedules_client" ON "client_auto_test_schedules" ("client_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cch_client_control" ON "client_control_history" ("client_control_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cme_client" ON "compliance_monitor_events" ("client_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cme_severity" ON "compliance_monitor_events" ("severity","created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ctr_client" ON "control_test_runs" ("client_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ctr_control" ON "control_test_runs" ("client_control_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ctr_status" ON "control_test_runs" ("client_id","status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_emb_doctype" ON "embeddings" ("doc_type");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_emb_docid" ON "embeddings" ("doc_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_emb_client" ON "embeddings" ("client_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_jevai_config_client" ON "jevai_config" ("client_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_reg_watch_client_reg" ON "regulation_watch" ("client_id","regulation_name");
--> statement-breakpoint
-- risk register statuses used by risks.getRiskStats (must run outside a transaction)
ALTER TYPE "risk_assessment_status" ADD VALUE IF NOT EXISTS 'treated';
--> statement-breakpoint
ALTER TYPE "risk_assessment_status" ADD VALUE IF NOT EXISTS 'accepted';
