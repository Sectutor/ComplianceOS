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
CREATE TABLE IF NOT EXISTS "access_review_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"reviewer_id" integer NOT NULL,
	"reviewee_id" integer NOT NULL,
	"status" varchar(50) DEFAULT 'pending',
	"justification" text,
	"reviewed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "access_review_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"scope" varchar(50) DEFAULT 'all',
	"scope_value" varchar(255),
	"due_date" timestamp,
	"status" varchar(50) DEFAULT 'draft',
	"created_by_id" integer,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "access_review_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"campaign_id" integer,
	"user_id" integer NOT NULL,
	"action" varchar(50) NOT NULL,
	"details" jsonb,
	"reviewed_by" integer NOT NULL,
	"reviewed_at" timestamp DEFAULT now()
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
	"framework" varchar(100),
	"control_id" varchar(100),
	"status" varchar(50) DEFAULT 'collected',
	"verified_by" varchar(255),
	"verified_at" timestamp,
	"created_at" timestamp DEFAULT now()
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
	"tested_at" timestamp DEFAULT now(),
	"remediated_at" timestamp,
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
CREATE TABLE IF NOT EXISTS "client_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"branding_overrides" jsonb,
	"feature_flags" jsonb,
	"custom_settings" jsonb,
	"version" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "client_settings_client_id_unique" UNIQUE("client_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "federal_contracts" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"agency_name" varchar(255),
	"contract_number" varchar(255),
	"type" varchar(50) DEFAULT 'prime',
	"status" varchar(50) DEFAULT 'active',
	"fisma_system_id" integer,
	"dfars_7012" boolean DEFAULT false,
	"dfars_7019" boolean DEFAULT false,
	"dfars_7020" boolean DEFAULT false,
	"dfars_7021" boolean DEFAULT false,
	"far_52_204_21" boolean DEFAULT false,
	"cmmc_level" varchar(20),
	"start_date" timestamp,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "federal_fips_140_module_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"fips_module_id" integer NOT NULL,
	"asset_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fips_199_information_types_ref" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100),
	"provisional_confidentiality" varchar(20) NOT NULL,
	"provisional_integrity" varchar(20) NOT NULL,
	"provisional_availability" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "fips_199_information_types_ref_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ioc_enrichment_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"ioc_id" integer,
	"provider" varchar(50),
	"result" jsonb,
	"enriched_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ioc_export_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer,
	"format" varchar(20),
	"filters" jsonb,
	"ioc_count" integer,
	"exported_by" integer,
	"exported_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ioc_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer,
	"indicator" varchar(1000) NOT NULL,
	"type" varchar(50) NOT NULL,
	"reputation" varchar(20),
	"confidence" integer,
	"source" varchar(100),
	"source_ref" varchar(500),
	"enrichment" jsonb,
	"cve_ids" jsonb,
	"mitre_techniques" jsonb,
	"mitre_groups" jsonb,
	"tags" jsonb,
	"category" varchar(100),
	"first_seen" timestamp,
	"last_seen" timestamp,
	"last_enriched" timestamp,
	"status" varchar(20) DEFAULT 'active',
	"is_manual" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learning_frameworks" (
	"id" serial PRIMARY KEY NOT NULL,
	"framework_id" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"color" varchar(50) DEFAULT 'bg-blue-600',
	"icon" varchar(100),
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "learning_frameworks_framework_id_unique" UNIQUE("framework_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "learning_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"framework_id" integer NOT NULL,
	"section_id" varchar(100) NOT NULL,
	"title" varchar(255) NOT NULL,
	"icon" varchar(100),
	"content" text NOT NULL,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nis2_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"nis2_article" varchar(50) NOT NULL,
	"enisa_measure_id" varchar(20) NOT NULL,
	"enisa_measure_title" varchar(255) NOT NULL,
	"iso27001_control_ids" json,
	"nist_csf_control_ids" json,
	"soc2_control_ids" json,
	"pci_dss_control_ids" json,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nist_80030_impact_assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"fisma_system_id" integer,
	"domain" varchar(255) NOT NULL,
	"cia_type" varchar(50),
	"magnitude" varchar(50) NOT NULL,
	"magnitude_score" integer DEFAULT 0,
	"description" text,
	"rationale" text,
	"factor_name" varchar(255),
	"factor_level" varchar(50),
	"factor_type" varchar(50),
	"factor_description" text,
	"estimated_daily_impact" integer,
	"revenue_loss_pct" integer,
	"legal_fines_pct" integer,
	"brand_equity_pct" integer,
	"status" varchar(50) DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nist_80030_threat_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"fisma_system_id" integer,
	"threat_source_id" integer,
	"event_id" varchar(50),
	"name" varchar(500) NOT NULL,
	"description" text,
	"source_type" varchar(100),
	"relevance" varchar(50),
	"likelihood" varchar(50),
	"vulnerabilities_predispositions" text,
	"targeted_assets" text,
	"status" varchar(50) DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nist_80030_threat_sources" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"fisma_system_id" integer,
	"type" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"capability" varchar(50),
	"intent" varchar(50),
	"targeting" varchar(50),
	"motive" varchar(255),
	"range_of_effects" varchar(255),
	"status" varchar(50) DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "personal_access_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"token" varchar(255) NOT NULL,
	"prefix" varchar(50) NOT NULL,
	"last_used_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "personal_access_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "program_guide_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"guide_type" varchar(50) NOT NULL,
	"step_id" varchar(50) NOT NULL,
	"user_id" integer NOT NULL,
	"target_date" timestamp,
	"assigned_by" integer,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "risk_appetite" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"financial_threshold" integer,
	"reputational_threshold" varchar(50),
	"operational_threshold" integer,
	"overall_risk_level" varchar(50) DEFAULT 'Medium',
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "security_test_findings" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"test_id" integer,
	"title" varchar(500) NOT NULL,
	"severity" varchar(50) NOT NULL,
	"description" text,
	"status" varchar(50) DEFAULT 'open',
	"asset_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "security_tests" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"type" varchar(100) NOT NULL,
	"frequency" varchar(50),
	"status" varchar(50) DEFAULT 'scheduled',
	"scheduled_date" timestamp,
	"completion_date" timestamp,
	"findings_count" integer DEFAULT 0,
	"report_url" varchar(1024),
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "system_feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"client_id" integer,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"url" varchar(1024),
	"status" varchar(50) DEFAULT 'new',
	"admin_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "threat_alert_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"email_enabled" boolean DEFAULT false,
	"webhook_enabled" boolean DEFAULT false,
	"slack_enabled" boolean DEFAULT false,
	"webhook_url" text,
	"slack_webhook_url" text,
	"slack_channel" text,
	"email_recipients" text,
	"alert_on_critical" boolean DEFAULT true,
	"alert_on_high" boolean DEFAULT true,
	"alert_on_medium" boolean DEFAULT false,
	"alert_on_new_cve" boolean DEFAULT true,
	"alert_on_zero_day" boolean DEFAULT true,
	"alert_on_ransomware" boolean DEFAULT true,
	"alert_on_apt" boolean DEFAULT true,
	"cvss_threshold" integer DEFAULT 7,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "threat_asset_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"threat_id" integer NOT NULL,
	"asset_id" integer NOT NULL,
	"confidence" integer DEFAULT 100,
	"impact_level" varchar(20) DEFAULT 'medium',
	"status" varchar(50) DEFAULT 'active',
	"mapped_by" integer,
	"mapping_method" varchar(50) DEFAULT 'manual',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nist_tiers" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"function_code" varchar(20) NOT NULL,
	"current_tier" integer DEFAULT 1,
	"target_tier" integer DEFAULT 1,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gumroad_webhook_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" varchar(255) NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"resource_name" varchar(100),
	"gumroad_timestamp" varchar(50),
	"gumroad_signature" varchar(255),
	"raw_payload" json NOT NULL,
	"processed_payload" json,
	"processing_status" varchar(50) DEFAULT 'pending',
	"processing_attempts" integer DEFAULT 0,
	"processing_error" text,
	"processed_at" timestamp,
	"license_key" varchar(255),
	"product_id" varchar(100),
	"purchase_id" varchar(255),
	"subscription_id" varchar(255),
	"received_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "gumroad_webhook_events_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "license_activations" (
	"id" serial PRIMARY KEY NOT NULL,
	"license_key" varchar(255) NOT NULL,
	"license_type" varchar(50) DEFAULT 'community' NOT NULL,
	"license_status" varchar(50) DEFAULT 'active' NOT NULL,
	"product_id" varchar(100),
	"product_permalink" varchar(255),
	"product_name" varchar(255),
	"customer_email" varchar(255),
	"customer_name" varchar(255),
	"client_id" integer,
	"user_id" integer,
	"activation_ip" varchar(45),
	"max_users" integer DEFAULT 10,
	"max_clients" integer DEFAULT 5,
	"max_features" integer DEFAULT 0,
	"issued_at" timestamp DEFAULT now(),
	"activated_at" timestamp DEFAULT now(),
	"expires_at" timestamp,
	"renewed_at" timestamp,
	"subscription_id" varchar(255),
	"is_recurring" boolean DEFAULT false,
	"recurrence_period" varchar(50),
	"enabled_features" json DEFAULT '[]'::json,
	"metadata" json DEFAULT '{}'::json,
	"gumroad_purchase_id" varchar(255),
	"gumroad_sale_id" varchar(255),
	"gumroad_validation_data" json,
	"last_validated_at" timestamp,
	"validation_count" integer DEFAULT 0,
	"last_validation_result" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "license_configurations" (
	"id" serial PRIMARY KEY NOT NULL,
	"config_type" varchar(50) NOT NULL,
	"config_key" varchar(100) NOT NULL,
	"config_value" json,
	"build_type" varchar(50),
	"license_type" varchar(50),
	"feature_id" varchar(100),
	"description" text,
	"is_enabled" boolean DEFAULT true,
	"priority" integer DEFAULT 0,
	"valid_from" timestamp DEFAULT now(),
	"valid_until" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "license_feature_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"license_activation_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"user_id" integer,
	"feature_id" varchar(100) NOT NULL,
	"feature_name" varchar(255),
	"feature_category" varchar(100),
	"usage_count" integer DEFAULT 1,
	"last_used_at" timestamp DEFAULT now(),
	"first_used_at" timestamp DEFAULT now(),
	"usage_context" json,
	"resource_id" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "license_status_enum" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text,
	CONSTRAINT "license_status_enum_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "license_type_enum" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text,
	CONSTRAINT "license_type_enum_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "license_validation_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"license_activation_id" integer,
	"license_key" varchar(255),
	"client_id" integer,
	"user_id" integer,
	"request_ip" varchar(45),
	"user_agent" text,
	"requested_features" jsonb,
	"validation_type" varchar(50),
	"is_valid" boolean NOT NULL,
	"validation_result" jsonb,
	"error_message" text,
	"missing_features" jsonb,
	"validation_duration_ms" integer,
	"cache_hit" boolean DEFAULT false,
	"external_validation" boolean DEFAULT false,
	"external_service" varchar(50),
	"external_response" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "addon_run_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"subscription_id" integer,
	"addon_slug" varchar(64) NOT NULL,
	"client_id" integer NOT NULL,
	"trigger" varchar(20) DEFAULT 'scheduled' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"findings_count" integer DEFAULT 0,
	"risks_created" integer DEFAULT 0,
	"evidence_pushed" integer DEFAULT 0,
	"duration_seconds" integer,
	"started_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"error_message" text,
	"summary" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "addon_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"addon_slug" varchar(64) NOT NULL,
	"status" varchar(20) DEFAULT 'trial' NOT NULL,
	"trial_ends_at" timestamp,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"stripe_subscription_id" varchar(128),
	"stripe_price_id" varchar(128),
	"last_sync_at" timestamp,
	"next_scheduled_run" timestamp,
	"auto_renew" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "integration_definitions" DROP CONSTRAINT "integration_definitions_provider_unique";--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "last_scanned_at" timestamp;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "cui_scope" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "cui_category" varchar(100);--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "cui_justification" text;--> statement-breakpoint
ALTER TABLE "client_policies" ADD COLUMN "reviewers" jsonb;--> statement-breakpoint
ALTER TABLE "client_policies" ADD COLUMN "review_due_date" timestamp;--> statement-breakpoint
ALTER TABLE "client_policies" ADD COLUMN "approval_status" varchar(50) DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "client_policies" ADD COLUMN "tailoring_answers" jsonb;--> statement-breakpoint
ALTER TABLE "client_policies" ADD COLUMN "last_review_alert_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "client_policies" ADD COLUMN "next_review_date" timestamp;--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "sidebar_bg" varchar(20);--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "sidebar_fg" varchar(20);--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "heading_font" varchar(100);--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "body_font" varchar(100);--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "base_font_size" integer DEFAULT 16;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "parent_id" integer;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "is_resolved" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "resolved_by" integer;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "resolved_at" timestamp;--> statement-breakpoint
ALTER TABLE "comments" ADD COLUMN "context" json;--> statement-breakpoint
ALTER TABLE "controls" ADD COLUMN "requirement_text" text;--> statement-breakpoint
ALTER TABLE "controls" ADD COLUMN "official_guidance" text;--> statement-breakpoint
ALTER TABLE "controls" ADD COLUMN "evidence_blueprint" json;--> statement-breakpoint
ALTER TABLE "evidence" ADD COLUMN "system_id" varchar(50);--> statement-breakpoint
ALTER TABLE "evidence" ADD COLUMN "expiration_date" timestamp;--> statement-breakpoint
ALTER TABLE "evidence" ADD COLUMN "interval_days" integer DEFAULT 365;--> statement-breakpoint
ALTER TABLE "federal_fisma_systems" ADD COLUMN "acronym" varchar(20);--> statement-breakpoint
ALTER TABLE "federal_fisma_systems" ADD COLUMN "owner" varchar(255);--> statement-breakpoint
ALTER TABLE "federal_fisma_systems" ADD COLUMN "controls_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "federal_fisma_systems" ADD COLUMN "assets_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "federal_poams" ADD COLUMN "fisma_system_id" integer;--> statement-breakpoint
ALTER TABLE "federal_sars" ADD COLUMN "fisma_system_id" integer;--> statement-breakpoint
ALTER TABLE "federal_ssps" ADD COLUMN "fisma_system_id" integer;--> statement-breakpoint
ALTER TABLE "fips_categorizations" ADD COLUMN "fisma_system_id" integer;--> statement-breakpoint
ALTER TABLE "fips_categorizations" ADD COLUMN "confidentiality_rationale" text;--> statement-breakpoint
ALTER TABLE "fips_categorizations" ADD COLUMN "integrity_rationale" text;--> statement-breakpoint
ALTER TABLE "fips_categorizations" ADD COLUMN "availability_rationale" text;--> statement-breakpoint
ALTER TABLE "fips_categorizations" ADD COLUMN "metadata" json DEFAULT '{}'::json;--> statement-breakpoint
ALTER TABLE "incidents" ADD COLUMN "is_significant" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "incidents" ADD COLUMN "significance_criteria" json;--> statement-breakpoint
ALTER TABLE "incidents" ADD COLUMN "affected_users_count" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "incidents" ADD COLUMN "service_disruption_duration" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "incidents" ADD COLUMN "estimated_financial_loss" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "incidents" ADD COLUMN "is_continuity_triggered" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "incidents" ADD COLUMN "early_warning_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "incidents" ADD COLUMN "intermediate_report_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "incidents" ADD COLUMN "final_report_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "integration_definitions" ADD COLUMN "tenant_id" integer;--> statement-breakpoint
ALTER TABLE "magic_links" ADD COLUMN "used_at" timestamp;--> statement-breakpoint
ALTER TABLE "magic_links" ADD COLUMN "used_by_user_id" integer;--> statement-breakpoint
ALTER TABLE "policy_templates" ADD COLUMN "tailoring_questions" json;--> statement-breakpoint
ALTER TABLE "policy_templates" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "questionnaire_questions" ADD COLUMN "focus_area" text;--> statement-breakpoint
ALTER TABLE "questionnaire_questions" ADD COLUMN "sub_focus_area" text;--> statement-breakpoint
ALTER TABLE "questionnaire_questions" ADD COLUMN "category" varchar(100);--> statement-breakpoint
ALTER TABLE "questionnaire_questions" ADD COLUMN "priority" varchar(20) DEFAULT 'medium';--> statement-breakpoint
ALTER TABLE "questionnaire_questions" ADD COLUMN "control_id" text;--> statement-breakpoint
ALTER TABLE "questionnaire_questions" ADD COLUMN "control_framework" varchar(50);--> statement-breakpoint
ALTER TABLE "questionnaire_questions" ADD COLUMN "remediation_deadline" timestamp;--> statement-breakpoint
ALTER TABLE "questionnaire_questions" ADD COLUMN "answered_by" integer;--> statement-breakpoint
ALTER TABLE "questionnaire_questions" ADD COLUMN "approved_by" integer;--> statement-breakpoint
ALTER TABLE "questionnaire_questions" ADD COLUMN "approved_at" timestamp;--> statement-breakpoint
ALTER TABLE "questionnaire_questions" ADD COLUMN "extra_fields" jsonb DEFAULT '{}'::jsonb;--> statement-breakpoint
ALTER TABLE "questionnaire_questions" ADD COLUMN "version" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "questionnaires" ADD COLUMN "direction" varchar(20) DEFAULT 'inbound';--> statement-breakpoint
ALTER TABLE "questionnaires" ADD COLUMN "vendor_name" text;--> statement-breakpoint
ALTER TABLE "questionnaires" ADD COLUMN "vendor_email" text;--> statement-breakpoint
ALTER TABLE "questionnaires" ADD COLUMN "vendor_token" text;--> statement-breakpoint
ALTER TABLE "questionnaires" ADD COLUMN "vendor_link_expires_at" timestamp;--> statement-breakpoint
ALTER TABLE "questionnaires" ADD COLUMN "category" varchar(100);--> statement-breakpoint
ALTER TABLE "questionnaires" ADD COLUMN "priority" varchar(20) DEFAULT 'medium';--> statement-breakpoint
ALTER TABLE "questionnaires" ADD COLUMN "control_id" text;--> statement-breakpoint
ALTER TABLE "questionnaires" ADD COLUMN "control_framework" varchar(50);--> statement-breakpoint
ALTER TABLE "questionnaires" ADD COLUMN "remediation_deadline" timestamp;--> statement-breakpoint
ALTER TABLE "questionnaires" ADD COLUMN "answered_by" integer;--> statement-breakpoint
ALTER TABLE "questionnaires" ADD COLUMN "approved_by" integer;--> statement-breakpoint
ALTER TABLE "questionnaires" ADD COLUMN "approved_at" timestamp;--> statement-breakpoint
ALTER TABLE "questionnaires" ADD COLUMN "version" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "risk_assessments" ADD COLUMN "fisma_system_id" integer;--> statement-breakpoint
ALTER TABLE "user_invitations" ADD COLUMN "used_at" timestamp;--> statement-breakpoint
ALTER TABLE "user_invitations" ADD COLUMN "used_by_user_id" integer;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "nis2_category" varchar(100);--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "is_essential_service" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "supply_chain_impact" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "vendors" ADD COLUMN "last_supply_chain_review" timestamp;--> statement-breakpoint
ALTER TABLE "waiting_list" ADD COLUMN "interested_play" varchar(255);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ae_agent" ON "agent_evidence" ("agent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ae_type" ON "agent_evidence" ("evidence_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ae_framework" ON "agent_evidence" ("framework");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_afm_agent" ON "agent_framework_mappings" ("agent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_afm_client" ON "agent_framework_mappings" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_afm_framework" ON "agent_framework_mappings" ("framework");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_afm_unique" ON "agent_framework_mappings" ("agent_id","framework","control_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_apam_policy" ON "agent_policy_assurance_mappings" ("policy_card_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_apam_framework" ON "agent_policy_assurance_mappings" ("framework");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_apc_agent" ON "agent_policy_cards" ("agent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_apc_client" ON "agent_policy_cards" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_apc_status" ON "agent_policy_cards" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ape_policy" ON "agent_policy_escalations" ("policy_card_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_apk_policy" ON "agent_policy_kpis" ("policy_card_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_apr_policy" ON "agent_policy_rules" ("policy_card_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_apr_rule_id" ON "agent_policy_rules" ("policy_card_id","rule_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ap_client" ON "agent_profiles" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ap_type" ON "agent_profiles" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ap_status" ON "agent_profiles" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_arr_agent" ON "agent_redteam_results" ("agent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_arr_category" ON "agent_redteam_results" ("test_category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_arr_status" ON "agent_redteam_results" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_at_agent" ON "agent_tools" ("agent_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_at_category" ON "agent_tools" ("category");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fed_ctrcts_client" ON "federal_contracts" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ioc_indicator" ON "ioc_records" ("indicator");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ioc_type" ON "ioc_records" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ioc_reputation" ON "ioc_records" ("reputation");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ioc_client_id" ON "ioc_records" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ioc_status" ON "ioc_records" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_learning_sections_framework" ON "learning_sections" ("framework_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_learning_sections_unique" ON "learning_sections" ("framework_id","section_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_nis2_article" ON "nis2_mappings" ("nis2_article");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_nis2_enisa_id" ON "nis2_mappings" ("enisa_measure_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_n80030_ia_client_domain" ON "nist_80030_impact_assessments" ("client_id","domain");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_n80030_te_client" ON "nist_80030_threat_events" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_n80030_te_source" ON "nist_80030_threat_events" ("threat_source_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_n80030_ts_client_type" ON "nist_80030_threat_sources" ("client_id","type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pat_user" ON "personal_access_tokens" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_pat_token" ON "personal_access_tokens" ("token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pga_client" ON "program_guide_assignments" ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_pga_unique_step" ON "program_guide_assignments" ("client_id","guide_type","step_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_appetite_client" ON "risk_appetite" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_feedback_status" ON "system_feedback" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_feedback_type" ON "system_feedback" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_threat_alert_client" ON "threat_alert_settings" ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_nist_tiers_client_function" ON "nist_tiers" ("client_id","function_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gumroad_events_type" ON "gumroad_webhook_events" ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gumroad_events_license" ON "gumroad_webhook_events" ("license_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gumroad_events_status" ON "gumroad_webhook_events" ("processing_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gumroad_events_received" ON "gumroad_webhook_events" ("received_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_license_activations_key" ON "license_activations" ("license_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_license_activations_client" ON "license_activations" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_license_activations_user" ON "license_activations" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_license_activations_product" ON "license_activations" ("product_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_license_activations_status" ON "license_activations" ("license_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_license_activations_expires" ON "license_activations" ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_license_activations_client" ON "license_activations" ("client_id","license_status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_license_config_key" ON "license_configurations" ("config_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_license_config_build" ON "license_configurations" ("build_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_license_config_license" ON "license_configurations" ("license_type");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_license_config" ON "license_configurations" ("config_type","config_key","build_type","license_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_license_feature_license_feature" ON "license_feature_usage" ("license_activation_id","feature_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_license_feature_client_feature" ON "license_feature_usage" ("client_id","feature_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_license_feature_usage_date" ON "license_feature_usage" ("last_used_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uniq_license_feature_usage" ON "license_feature_usage" ("license_activation_id","feature_id","resource_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_license_logs_key" ON "license_validation_logs" ("license_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_license_logs_client" ON "license_validation_logs" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_license_logs_valid" ON "license_validation_logs" ("is_valid");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_license_logs_created" ON "license_validation_logs" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_addon_runs_subscription" ON "addon_run_logs" ("subscription_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_addon_runs_client" ON "addon_run_logs" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_addon_runs_addon" ON "addon_run_logs" ("addon_slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_addon_sub_client_addon" ON "addon_subscriptions" ("client_id","addon_slug");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_addon_sub_status" ON "addon_subscriptions" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_addon_sub_next_run" ON "addon_subscriptions" ("next_scheduled_run");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_qn_vendor_token" ON "questionnaires" ("vendor_token");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "questionnaire_questions" ADD CONSTRAINT "questionnaire_questions_answered_by_users_id_fk" FOREIGN KEY ("answered_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "questionnaire_questions" ADD CONSTRAINT "questionnaire_questions_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "questionnaires" ADD CONSTRAINT "questionnaires_answered_by_users_id_fk" FOREIGN KEY ("answered_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "questionnaires" ADD CONSTRAINT "questionnaires_approved_by_users_id_fk" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "federal_fips_140_module_assets" ADD CONSTRAINT "federal_fips_140_module_assets_fips_module_id_federal_fips_140_modules_id_fk" FOREIGN KEY ("fips_module_id") REFERENCES "federal_fips_140_modules"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "federal_fips_140_module_assets" ADD CONSTRAINT "federal_fips_140_module_assets_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ioc_enrichment_history" ADD CONSTRAINT "ioc_enrichment_history_ioc_id_ioc_records_id_fk" FOREIGN KEY ("ioc_id") REFERENCES "ioc_records"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ioc_export_history" ADD CONSTRAINT "ioc_export_history_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ioc_export_history" ADD CONSTRAINT "ioc_export_history_exported_by_users_id_fk" FOREIGN KEY ("exported_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ioc_records" ADD CONSTRAINT "ioc_records_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ioc_records" ADD CONSTRAINT "ioc_records_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "security_test_findings" ADD CONSTRAINT "security_test_findings_test_id_security_tests_id_fk" FOREIGN KEY ("test_id") REFERENCES "security_tests"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "security_test_findings" ADD CONSTRAINT "security_test_findings_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "threat_asset_mappings" ADD CONSTRAINT "threat_asset_mappings_threat_id_threats_id_fk" FOREIGN KEY ("threat_id") REFERENCES "threats"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "threat_asset_mappings" ADD CONSTRAINT "threat_asset_mappings_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "addon_run_logs" ADD CONSTRAINT "addon_run_logs_subscription_id_addon_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "addon_subscriptions"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
