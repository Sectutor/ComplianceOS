DO $$ BEGIN
 CREATE TYPE "access_review_cycle_status" AS ENUM('draft', 'active', 'completed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "access_review_task_status" AS ENUM('pending', 'certified', 'revoked', 'overdue');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "ai_risk_level" AS ENUM('low', 'medium', 'high', 'critical', 'unacceptable');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "ai_system_status" AS ENUM('evaluation', 'development', 'production', 'monitoring', 'retired');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "approval_status" AS ENUM('pending', 'approved', 'rejected');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "asset_status" AS ENUM('active', 'archived', 'disposed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "client_control_status" AS ENUM('not_implemented', 'in_progress', 'implemented', 'not_applicable');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "cloud_provider" AS ENUM('aws', 'azure', 'gcp');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "consent_status" AS ENUM('active', 'withdrawn', 'expired', 'revoked');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "consent_type" AS ENUM('marketing', 'analytics', 'functional', 'third_party', 'cookie');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "control_status" AS ENUM('active', 'inactive', 'draft');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "crm_engagement_stage" AS ENUM('planned', 'gap_analysis', 'remediation', 'audit_prep', 'audit_active', 'certified', 'maintenance');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "data_breach_status" AS ENUM('open', 'investigating', 'closed', 'reported');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "dpia_status" AS ENUM('draft', 'in_progress', 'under_review', 'completed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "escalation_trigger" AS ENUM('overdue', 'risk_threshold_breach', 'approval_rejected', 'status_regression', 'missing_evidence', 'missing_raci');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "eu_ai_act_class" AS ENUM('unacceptable', 'high', 'limited', 'minimal', 'general_purpose_ai', 'not_applicable');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "evidence_status" AS ENUM('pending', 'collected', 'verified', 'rejected', 'expired', 'not_applicable');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "finding_severity" AS ENUM('low', 'medium', 'high', 'critical');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "finding_status" AS ENUM('open', 'remediated', 'accepted', 'closed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "governance_entity_type" AS ENUM('policy', 'control', 'risk', 'bcp_plan', 'vendor', 'evidence', 'task', 'roadmap', 'implementation_plan');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "implementation_status" AS ENUM('not_started', 'planning', 'in_progress', 'testing', 'completed', 'blocked');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "incident_severity" AS ENUM('low', 'medium', 'high', 'critical');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "incident_status" AS ENUM('open', 'investigating', 'mitigated', 'resolved', 'reported');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "international_transfer_status" AS ENUM('pending', 'active', 'expired', 'risk_flagged');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "kanban_status" AS ENUM('backlog', 'todo', 'in_progress', 'review', 'done');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "policy_ack_status" AS ENUM('pending', 'acknowledged', 'declined');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "policy_module" AS ENUM('general', 'privacy');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "policy_review_status" AS ENUM('analyzing', 'completed', 'applying_changes', 'applied', 'failed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "policy_status" AS ENUM('draft', 'review', 'approved', 'archived');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "raci_role" AS ENUM('responsible', 'accountable', 'consulted', 'informed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "report_type" AS ENUM('executive_summary', 'controls', 'policies', 'evidence', 'mappings', 'soa', 'compliance_readiness', 'audit_bundle');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "report_version" AS ENUM('draft', 'v1.0', 'v1.1', 'v2.0', 'final');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "risk_assessment_status" AS ENUM('draft', 'approved', 'reviewed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "roadmap_status" AS ENUM('draft', 'active', 'on_track', 'delayed', 'completed');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "role" AS ENUM('owner', 'admin', 'editor', 'viewer', 'auditor');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "scc_module" AS ENUM('c2c', 'c2p', 'p2p', 'p2c');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "task_type" AS ENUM('control', 'policy', 'evidence', 'mapping');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "threat_status" AS ENUM('active', 'dormant', 'monitored');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "transfer_tool" AS ENUM('scc_2021', 'bcr', 'adequacy', 'derogation', 'ad_hoc');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "vulnerability_status" AS ENUM('open', 'mitigated', 'accepted', 'remediated');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "work_item_priority" AS ENUM('low', 'medium', 'high', 'critical');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "work_item_status" AS ENUM('pending', 'in_progress', 'completed', 'cancelled', 'escalated');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "work_item_type" AS ENUM('review', 'approval', 'evidence_collection', 'raci_assignment', 'risk_treatment', 'vendor_assessment', 'bcp_approval', 'policy_review', 'control_implementation', 'risk_review', 'control_assessment');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "maturity_framework_status" AS ENUM('draft', 'active', 'archived');
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
CREATE TABLE IF NOT EXISTS "access_review_cycles" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"due_date" timestamp NOT NULL,
	"status" "access_review_cycle_status" DEFAULT 'draft',
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
CREATE TABLE IF NOT EXISTS "access_review_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"cycle_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"user_id" integer,
	"role" varchar(100),
	"status" "access_review_task_status" DEFAULT 'pending',
	"due_date" timestamp,
	"note" text,
	"reviewed_at" timestamp,
	"reviewed_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "adequacy_decisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"country_code" varchar(2) NOT NULL,
	"country_name" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'adequate',
	"scope" text,
	"decision_url" text,
	"last_updated_at" timestamp DEFAULT now(),
	CONSTRAINT "adequacy_decisions_country_code_unique" UNIQUE("country_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "advisor_conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"client_id" integer,
	"conversation_id" varchar(100) NOT NULL,
	"title" varchar(500),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "advisor_conversations_conversation_id_unique" UNIQUE("conversation_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "advisor_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" varchar(100) NOT NULL,
	"role" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"sources" json,
	"metadata" json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_eu_ai_act_compliance" (
	"id" serial PRIMARY KEY NOT NULL,
	"ai_system_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"risk_mgmt_system_established" boolean DEFAULT false,
	"risk_mgmt_doc_link" text,
	"risk_mgmt_review_date" timestamp,
	"data_governance_implemented" boolean DEFAULT false,
	"training_data_provenance" text,
	"data_privacy_compliant" boolean DEFAULT false,
	"tech_documentation_complete" boolean DEFAULT false,
	"tech_doc_url" text,
	"logs_automatically_recorded" boolean DEFAULT false,
	"log_retention_days" integer DEFAULT 180,
	"transparency_info_provided" boolean DEFAULT false,
	"transparency_info_url" text,
	"human_oversight_measures_implemented" boolean DEFAULT false,
	"human_oversight_description" text,
	"accuracy_benchmarks_met" boolean DEFAULT false,
	"robustness_tested" boolean DEFAULT false,
	"cybersecurity_measures_implemented" boolean DEFAULT false,
	"deployer_human_oversight_assigned" boolean DEFAULT false,
	"deployer_monitoring_implemented" boolean DEFAULT false,
	"deployer_incident_reporting_configured" boolean DEFAULT false,
	"transparency_label_implemented" boolean DEFAULT false,
	"transparency_label_text" text,
	"compliance_status" varchar(50) DEFAULT 'not_assessed',
	"compliance_score" integer DEFAULT 0,
	"last_assessed_at" timestamp,
	"assessed_by_user_id" integer,
	"assessment_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_impact_assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"ai_system_id" integer NOT NULL,
	"assessor_id" integer,
	"status" varchar(50) DEFAULT 'draft',
	"safety_impact" text,
	"bias_impact" text,
	"privacy_impact" text,
	"security_impact" text,
	"overall_risk_score" integer,
	"assessment_date" timestamp DEFAULT now(),
	"next_review_date" timestamp,
	"recommendations" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_system_controls" (
	"id" serial PRIMARY KEY NOT NULL,
	"ai_system_id" integer NOT NULL,
	"control_id" integer NOT NULL,
	"status" varchar(50) DEFAULT 'mapped',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_systems" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"purpose" text,
	"intended_users" text,
	"deployment_context" text,
	"type" varchar(100),
	"risk_level" "ai_risk_level" DEFAULT 'medium',
	"status" "ai_system_status" DEFAULT 'evaluation',
	"owner" varchar(255),
	"vendor_id" integer,
	"data_sensitivity" varchar(100),
	"technical_constraints" text,
	"eu_ai_act_class" "eu_ai_act_class" DEFAULT 'not_applicable',
	"eu_ai_act_prohibited" boolean DEFAULT false,
	"eu_ai_act_high_risk_category" text,
	"eu_ai_act_deployer" boolean DEFAULT true,
	"eu_ai_act_registration_number" varchar(100),
	"eu_ai_act_conformity_assessment" varchar(50) DEFAULT 'not_required',
	"eu_ai_act_last_assessment_date" timestamp,
	"eu_ai_act_next_assessment_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ai_usage_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer,
	"user_id" integer,
	"entity_type" varchar(50),
	"entity_id" integer,
	"endpoint" varchar(255) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"model" varchar(100) NOT NULL,
	"prompt_tokens" integer DEFAULT 0 NOT NULL,
	"completion_tokens" integer DEFAULT 0 NOT NULL,
	"total_tokens" integer DEFAULT 0 NOT NULL,
	"estimated_cost_cents" integer DEFAULT 0 NOT NULL,
	"latency_ms" integer,
	"success" boolean DEFAULT true,
	"error_message" text,
	"request_metadata" json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "approval_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" integer NOT NULL,
	"status" "approval_status" DEFAULT 'pending',
	"submitter_id" integer,
	"submitted_at" timestamp DEFAULT now(),
	"required_roles" json,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "approval_signatures" (
	"id" serial PRIMARY KEY NOT NULL,
	"request_id" integer NOT NULL,
	"signer_id" integer NOT NULL,
	"signer_role" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'signed',
	"comment" text,
	"signature_data" text,
	"signed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "asset_cve_matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"asset_id" integer NOT NULL,
	"cve_id" varchar(50) NOT NULL,
	"match_score" integer DEFAULT 100,
	"match_reason" text,
	"is_kev" boolean DEFAULT false,
	"status" varchar(50) DEFAULT 'suggested',
	"imported_vulnerability_id" integer,
	"discovered_at" timestamp DEFAULT now(),
	"reviewed_at" timestamp,
	"reviewed_by" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(100) NOT NULL,
	"owner" varchar(255),
	"vendor" varchar(255),
	"product_name" varchar(255),
	"version" varchar(100),
	"technologies" json,
	"valuation_c" integer DEFAULT 3,
	"valuation_i" integer DEFAULT 3,
	"valuation_a" integer DEFAULT 3,
	"description" text,
	"location" varchar(255),
	"department" varchar(255),
	"status" "asset_status" DEFAULT 'active',
	"acquisition_date" timestamp,
	"last_review_date" timestamp,
	"last_scanned_at" timestamp,
	"category" varchar(100),
	"criticality" varchar(50),
	"ip_address" varchar(50),
	"mac_address" varchar(50),
	"os" varchar(100),
	"custom_fields" json,
	"tags" json DEFAULT '[]'::json,
	"is_personal_data" boolean DEFAULT false,
	"data_sensitivity" varchar(50),
	"data_format" varchar(50),
	"data_owner" varchar(255),
	"cui_scope" boolean DEFAULT false,
	"cui_category" varchar(100),
	"cui_justification" text,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "asvs_assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"requirement_id" varchar(20) NOT NULL,
	"status" varchar(50) DEFAULT 'unanswered',
	"notes" text,
	"evidence" jsonb DEFAULT '[]'::jsonb,
	"assessed_by" integer,
	"assessment_date" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "asvs_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" varchar(10) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"order" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "asvs_categories_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "asvs_requirements" (
	"id" serial PRIMARY KEY NOT NULL,
	"category_code" varchar(10) NOT NULL,
	"chapter_id" varchar(20) NOT NULL,
	"chapter_name" varchar(255),
	"requirement_id" varchar(20) NOT NULL,
	"description" text NOT NULL,
	"level_1" boolean DEFAULT false,
	"level_2" boolean DEFAULT false,
	"level_3" boolean DEFAULT false,
	"cwe" varchar(50),
	"nist" varchar(50),
	"version" varchar(20) DEFAULT '4.0.3',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "asvs_requirements_requirement_id_unique" UNIQUE("requirement_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_findings" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"severity" "finding_severity" DEFAULT 'medium',
	"status" "finding_status" DEFAULT 'open',
	"evidence_id" integer,
	"author_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"fisma_system_id" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer,
	"user_id" integer NOT NULL,
	"action" varchar(50) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" integer,
	"details" json,
	"severity" varchar(20) DEFAULT 'info',
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"control_id" integer NOT NULL,
	"user_id" integer,
	"note" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bc_approvals" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" integer NOT NULL,
	"approver_id" integer NOT NULL,
	"status" varchar(50) DEFAULT 'pending',
	"requested_at" timestamp DEFAULT now(),
	"responded_at" timestamp,
	"comments" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bc_committee_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"program_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"role" varchar(100) NOT NULL,
	"name" varchar(255),
	"responsibilities" text,
	"assigned_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bc_plan_appendices" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"file_url" varchar(1024),
	"type" varchar(50),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bc_plan_bias" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"bia_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bc_plan_communication_channels" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"audience" varchar(100) NOT NULL,
	"channel" varchar(100),
	"responsible_role" varchar(255),
	"message_template" text,
	"frequency" varchar(100),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bc_plan_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"user_id" integer,
	"vendor_contact_id" integer,
	"role" varchar(100),
	"is_primary" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bc_plan_logistics" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"location_name" varchar(255) NOT NULL,
	"address" text,
	"capacity" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bc_plan_scenarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"scenario_id" integer NOT NULL,
	"coverage_notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bc_plan_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"section_key" varchar(100) NOT NULL,
	"content" text,
	"order" integer DEFAULT 0,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bc_plan_strategies" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"strategy_id" integer NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bc_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"version" varchar(50) DEFAULT '1.0',
	"status" varchar(50) DEFAULT 'draft',
	"owner_id" integer,
	"last_tested_date" timestamp,
	"next_test_date" timestamp,
	"content" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bc_programs" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"program_name" varchar(255) DEFAULT 'Business Continuity Management Program' NOT NULL,
	"scope_description" text,
	"policy_statement" text,
	"budget_allocated" varchar(100),
	"program_manager_id" integer,
	"executive_sponsor_id" integer,
	"status" varchar(50) DEFAULT 'draft',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bc_strategies" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"resource_requirements" text,
	"estimated_cost" varchar(100),
	"benefits" text,
	"approval_status" varchar(50) DEFAULT 'draft',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bc_training_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"training_type" varchar(100) NOT NULL,
	"completion_date" timestamp,
	"expiry_date" timestamp,
	"status" varchar(50) DEFAULT 'completed',
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bcp_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"scope" text,
	"manager_id" integer,
	"start_date" timestamp,
	"target_date" timestamp,
	"status" varchar(50) DEFAULT 'planning',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bcp_stakeholders" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"process_id" integer,
	"user_id" integer NOT NULL,
	"role" varchar(50) NOT NULL,
	"assigned_date" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bia_questionnaires" (
	"id" serial PRIMARY KEY NOT NULL,
	"bia_id" integer NOT NULL,
	"question" text NOT NULL,
	"category" varchar(100),
	"response" text,
	"impact_level" varchar(50),
	"notes" text,
	"order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bia_seasonal_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"bia_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"start_date" varchar(50),
	"end_date" varchar(50),
	"impact_description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bia_vital_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"bia_id" integer NOT NULL,
	"record_name" varchar(255) NOT NULL,
	"media_type" varchar(50),
	"location" varchar(255),
	"backup_method" varchar(255),
	"rto" varchar(50),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "business_impact_analyses" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"project_id" integer,
	"process_id" integer,
	"title" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'draft',
	"conductor_id" integer,
	"approved_by" integer,
	"approved_at" timestamp,
	"methodology" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "business_processes" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"owner_id" integer,
	"parent_id" integer,
	"department" varchar(255),
	"criticality_tier" varchar(50),
	"rto" varchar(50),
	"rpo" varchar(50),
	"mtpd" varchar(50),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "certification_audits" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"framework_id" integer,
	"audit_firm" varchar(255),
	"auditor_name" varchar(255),
	"start_date" timestamp,
	"end_date" timestamp,
	"status" varchar(50) DEFAULT 'scheduled',
	"stage" varchar(50),
	"outcome" varchar(50),
	"notes" text,
	"report_url" text,
	"created_by_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "checklist_states" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"checklist_id" varchar(255) NOT NULL,
	"items" json DEFAULT '{}'::json,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cisa_kev_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"cve_id" varchar(50) NOT NULL,
	"vendor_project" varchar(255),
	"product" varchar(255),
	"vulnerability_name" varchar(500),
	"short_description" text,
	"required_action" text,
	"due_date" timestamp,
	"known_ransomware_campaign_use" boolean DEFAULT false,
	"date_added" timestamp,
	"fetched_at" timestamp DEFAULT now(),
	CONSTRAINT "cisa_kev_cache_cve_id_unique" UNIQUE("cve_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "client_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"first_name" varchar(255),
	"last_name" varchar(255),
	"email" varchar(255),
	"department" varchar(255),
	"role" varchar(100),
	"phone" varchar(50),
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "client_controls" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"control_id" integer NOT NULL,
	"client_control_id" varchar(50),
	"custom_description" text,
	"owner" varchar(255),
	"due_date" timestamp,
	"applicability" varchar(50) DEFAULT 'applicable',
	"justification" text,
	"implementation_date" timestamp,
	"implementation_notes" text,
	"evidence_location" text,
	"status" "client_control_status" DEFAULT 'not_implemented',
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "client_framework_controls" (
	"id" serial PRIMARY KEY NOT NULL,
	"framework_id" integer NOT NULL,
	"control_code" varchar(100) NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"grouping" varchar(255),
	"original_data" json,
	"status" varchar(50) DEFAULT 'not_implemented',
	"applicability" varchar(50) DEFAULT 'applicable',
	"owner" varchar(255),
	"custom_description" text,
	"implementation_notes" text,
	"evidence_location" text,
	"justification" text,
	"implementation_date" timestamp,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "client_framework_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"framework_control_id" integer NOT NULL,
	"client_control_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "client_frameworks" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"version" varchar(50),
	"source_file_name" varchar(255),
	"imported_at" timestamp DEFAULT now(),
	"status" varchar(50) DEFAULT 'active'
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "client_integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"provider" varchar(50) DEFAULT 'smtp' NOT NULL,
	"settings" json,
	"is_enabled" boolean DEFAULT true,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "client_policies" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"template_id" integer,
	"client_policy_id" varchar(50),
	"name" varchar(255) NOT NULL,
	"content" text,
	"status" "policy_status" DEFAULT 'draft',
	"version" integer DEFAULT 1,
	"owner" varchar(255),
	"module" varchar(50) DEFAULT 'general',
	"is_ai_generated" boolean DEFAULT false,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"reviewers" jsonb,
	"review_due_date" timestamp,
	"approval_status" varchar(50) DEFAULT 'pending',
	"tailoring_answers" jsonb,
	"last_review_alert_sent_at" timestamp,
	"next_review_date" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "client_readiness_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"regulation_id" varchar(50) NOT NULL,
	"question_id" varchar(50) NOT NULL,
	"response" varchar(50),
	"updated_at" timestamp DEFAULT now()
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
CREATE TABLE IF NOT EXISTS "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"industry" varchar(255),
	"size" varchar(50),
	"status" varchar(50) DEFAULT 'active',
	"notes" text,
	"logo_url" varchar(1024),
	"primary_contact_name" varchar(255),
	"primary_contact_email" varchar(255),
	"primary_contact_phone" varchar(50),
	"deployment_type" varchar(50),
	"region" varchar(100),
	"client_tier" varchar(50),
	"service_model" varchar(50) DEFAULT 'subscription',
	"brand_primary_color" varchar(20),
	"brand_secondary_color" varchar(20),
	"portal_title" varchar(255),
	"sidebar_bg" varchar(20),
	"sidebar_fg" varchar(20),
	"heading_font" varchar(100),
	"body_font" varchar(100),
	"base_font_size" integer DEFAULT 16,
	"weekly_focus" text,
	"target_compliance_score" integer DEFAULT 80,
	"ciso_name" varchar(255),
	"dpo_name" varchar(255),
	"scan_key" varchar(255),
	"headquarters" varchar(255),
	"main_service_region" varchar(255),
	"policy_language" varchar(50) DEFAULT 'en',
	"currency" varchar(10) DEFAULT 'USD',
	"locale" varchar(20) DEFAULT 'en-US',
	"date_format" varchar(20) DEFAULT 'YYYY-MM-DD',
	"legal_entity_name" varchar(500),
	"regulatory_jurisdictions" json,
	"default_document_classification" varchar(50) DEFAULT 'internal',
	"stripe_customer_id" varchar(255),
	"subscription_status" varchar(50),
	"plan_tier" varchar(50) DEFAULT 'consultant',
	"subscription_end_date" timestamp,
	"active_modules" json,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"require_mfa" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cloud_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"connection_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"asset_type" varchar(100) NOT NULL,
	"asset_id" varchar(255) NOT NULL,
	"name" varchar(255),
	"region" varchar(100),
	"metadata" json,
	"compliance_status" varchar(50) DEFAULT 'unknown',
	"last_scanned_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cloud_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"provider" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"credentials" text NOT NULL,
	"region" varchar(100),
	"status" varchar(50) DEFAULT 'pending',
	"last_sync_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" integer NOT NULL,
	"content" text NOT NULL,
	"parent_id" integer,
	"is_resolved" boolean DEFAULT false,
	"resolved_by" integer,
	"resolved_at" timestamp,
	"context" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "common_controls" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"domain" varchar(100),
	"created_by_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "communication_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"subject_template" varchar(500) NOT NULL,
	"body_template" text NOT NULL,
	"category" varchar(50) DEFAULT 'general',
	"tags" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "communication_templates_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "company_memory_nodes" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"path" varchar(500) NOT NULL,
	"parent_path" varchar(500) DEFAULT '/' NOT NULL,
	"node_type" varchar(50) DEFAULT 'document' NOT NULL,
	"title" varchar(255) NOT NULL,
	"summary_l0" text,
	"content_l2" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "company_memory_relations" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"source_node_id" integer NOT NULL,
	"target_node_id" integer NOT NULL,
	"relation_type" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "compliance_certificates" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"framework_id" integer,
	"audit_id" integer,
	"certificate_number" varchar(255),
	"issue_date" timestamp NOT NULL,
	"expiry_date" timestamp NOT NULL,
	"status" varchar(50) DEFAULT 'active',
	"document_url" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "compliance_frameworks" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"short_code" varchar(50) NOT NULL,
	"version" varchar(50),
	"description" text,
	"type" varchar(50) DEFAULT 'framework',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "compliance_requirements" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"key" varchar(100) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"is_mandatory" boolean DEFAULT true,
	"display_order" integer DEFAULT 0,
	"category" varchar(100) DEFAULT 'General',
	"estimated_time_minutes" integer DEFAULT 5,
	"document_type" varchar(50) DEFAULT 'acknowledgment',
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "compliance_snapshots" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"snapshot_date" timestamp DEFAULT now() NOT NULL,
	"total_controls" integer DEFAULT 0,
	"implemented_controls" integer DEFAULT 0,
	"in_progress_controls" integer DEFAULT 0,
	"not_implemented_controls" integer DEFAULT 0,
	"not_applicable_controls" integer DEFAULT 0,
	"total_gaps" integer DEFAULT 0,
	"closed_gaps" integer DEFAULT 0,
	"critical_gaps" integer DEFAULT 0,
	"high_gaps" integer DEFAULT 0,
	"total_risks" integer DEFAULT 0,
	"mitigated_risks" integer DEFAULT 0,
	"compliance_score" integer DEFAULT 0,
	"risk_score" integer DEFAULT 0,
	"controls_closed_this_period" integer DEFAULT 0,
	"gaps_closed_this_period" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "consent_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"consent_type" "consent_type" NOT NULL,
	"template_content" text NOT NULL,
	"granular_options" json,
	"retention_period" integer DEFAULT 2555,
	"is_active" boolean DEFAULT true,
	"version" varchar(20) DEFAULT '1.0',
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "consents" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"data_subject_id" varchar(255) NOT NULL,
	"consent_type" "consent_type" NOT NULL,
	"purpose" text NOT NULL,
	"legal_basis" text NOT NULL,
	"granular_consents" json,
	"consent_timestamp" timestamp DEFAULT now(),
	"ip_address" varchar(45),
	"user_agent" text,
	"consent_form" text,
	"withdrawal_timestamp" timestamp,
	"withdrawal_reason" text,
	"expiration_date" timestamp,
	"status" "consent_status" DEFAULT 'active',
	"retention_period" integer,
	"metadata" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "control_baselines" (
	"id" serial PRIMARY KEY NOT NULL,
	"control_id" varchar(50) NOT NULL,
	"framework" varchar(100) NOT NULL,
	"baseline" varchar(20) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "control_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"control_id" integer NOT NULL,
	"version" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"framework" varchar(255),
	"owner" varchar(255),
	"frequency" varchar(50),
	"evidence_type" varchar(100),
	"changed_by" integer,
	"change_note" text,
	"changed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "control_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_control_id" integer NOT NULL,
	"target_control_id" integer NOT NULL,
	"mapping_type" varchar(50) DEFAULT 'equivalent' NOT NULL,
	"confidence" varchar(50) DEFAULT 'manual',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"entity_id" integer,
	"entity_type" varchar(50),
	"created_by" integer,
	"is_ai_generated" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "control_policy_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"client_control_id" integer NOT NULL,
	"client_policy_id" integer NOT NULL,
	"evidence_reference" text,
	"notes" text,
	"is_ai_generated" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "control_tech_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"control_code" varchar(50) NOT NULL,
	"framework" varchar(100) NOT NULL,
	"tech_id" varchar(100) NOT NULL,
	"vendor" varchar(100),
	"service_name" varchar(200),
	"description" text,
	"pros" json,
	"cons" json,
	"implementation_effort" varchar(50),
	"maturity_level" varchar(50),
	"references" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "controls" (
	"id" serial PRIMARY KEY NOT NULL,
	"control_id" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"framework" varchar(255) NOT NULL,
	"owner" varchar(255),
	"frequency" varchar(50),
	"evidence_type" varchar(100),
	"status" "control_status" DEFAULT 'draft',
	"version" integer DEFAULT 1 NOT NULL,
	"category" varchar(255),
	"grouping" varchar(255),
	"implementation_guidance" text,
	"ai_guidance" text,
	"requirement_text" text,
	"official_guidance" text,
	"evidence_blueprint" json,
	"suggested_policies" text,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	"client_id" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"subject" varchar(500),
	"content" text,
	"outcome" varchar(255),
	"occurred_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"job_title" varchar(255),
	"is_primary" boolean DEFAULT false,
	"category" varchar(50),
	"linkedin_url" varchar(1024),
	"notes" text,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_deal_stages" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"order" integer DEFAULT 0,
	"win_probability" integer,
	"color" varchar(50),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_deals" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"value" integer,
	"currency" varchar(10) DEFAULT 'USD',
	"stage_id" integer NOT NULL,
	"lead_id" integer,
	"client_id" integer,
	"owner_id" integer,
	"expected_close_date" timestamp,
	"probability" integer,
	"notes" text,
	"status" varchar(50) DEFAULT 'open',
	"lost_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_engagements" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"stage" "crm_engagement_stage" DEFAULT 'planned',
	"framework" varchar(100),
	"priority" varchar(50) DEFAULT 'medium',
	"target_date" timestamp,
	"progress" integer DEFAULT 0,
	"owner" varchar(255),
	"controls_count" integer DEFAULT 0,
	"mitigated_risks_count" integer DEFAULT 0,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "crm_leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer,
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255) NOT NULL,
	"email" varchar(255),
	"company_name" varchar(255),
	"job_title" varchar(255),
	"status" varchar(50) DEFAULT 'new',
	"source" varchar(100),
	"notes" text,
	"owner_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "data_breaches" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"description" text NOT NULL,
	"effects" text NOT NULL,
	"remedial_actions" text NOT NULL,
	"date_occurred" timestamp,
	"date_detected" timestamp,
	"date_reported_to_dpa" timestamp,
	"date_reported_to_data_subjects" timestamp,
	"status" "data_breach_status" DEFAULT 'open',
	"is_notifiable_to_dpa" boolean DEFAULT false,
	"is_notifiable_to_subjects" boolean DEFAULT false,
	"created_by" integer,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "data_flow_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"flow_id" integer NOT NULL,
	"source_node_id" integer NOT NULL,
	"target_node_id" integer NOT NULL,
	"connection_type" varchar(50) NOT NULL,
	"data_type" varchar(100) NOT NULL,
	"frequency" varchar(50),
	"security_controls" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "data_flow_nodes" (
	"id" serial PRIMARY KEY NOT NULL,
	"flow_id" integer NOT NULL,
	"node_type" varchar(50) NOT NULL,
	"node_name" varchar(255) NOT NULL,
	"node_description" text,
	"node_category" varchar(100),
	"position_x" integer DEFAULT 0,
	"position_y" integer DEFAULT 0,
	"node_metadata" json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "data_flow_visualizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"source_system" varchar(255) NOT NULL,
	"target_system" varchar(255) NOT NULL,
	"data_type" varchar(100) NOT NULL,
	"flow_type" varchar(100) NOT NULL,
	"process_id" integer,
	"legal_basis" text,
	"frequency" varchar(50),
	"volume" varchar(100),
	"security_measures" text,
	"countries" json,
	"flow_metadata" json,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "process_data_flows" (
	"id" serial PRIMARY KEY NOT NULL,
	"process_id" integer NOT NULL,
	"asset_id" integer,
	"data_elements" text,
	"interaction_type" varchar(50),
	"legal_basis" varchar(100),
	"purpose" text,
	"data_subject_type" varchar(100),
	"recipients" text,
	"is_cross_border" boolean DEFAULT false,
	"transfer_mechanism" varchar(100),
	"retention_period" varchar(100),
	"disposal_method" varchar(100),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "data_protection_impact_assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"activity_id" integer,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"scope" text NOT NULL,
	"identified_risks" text NOT NULL,
	"mitigation_measures" text NOT NULL,
	"status" "dpia_status" DEFAULT 'draft',
	"assigned_to" integer,
	"last_review_date" timestamp,
	"questionnaire_data" json,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dev_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"repository_url" varchar(500),
	"tech_stack" json,
	"owner" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "disruptive_scenarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"likelihood" varchar(50),
	"potential_impact" text,
	"mitigation_strategies" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dpa_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"version" integer DEFAULT 1,
	"is_default" boolean DEFAULT false,
	"jurisdiction" varchar(100),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dpia_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100) NOT NULL,
	"template_content" json,
	"is_active" boolean DEFAULT true,
	"usage_count" integer DEFAULT 0,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dsar_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"request_id" varchar(50) NOT NULL,
	"request_type" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'New',
	"priority" varchar(20) DEFAULT 'medium',
	"subject_email" varchar(255),
	"subject_name" varchar(255),
	"verification_status" varchar(50) DEFAULT 'Pending',
	"verification_method" varchar(100),
	"submission_method" varchar(50) DEFAULT 'manual',
	"request_date" timestamp DEFAULT now(),
	"due_date" timestamp,
	"completed_date" timestamp,
	"assignee_id" integer,
	"resolution_notes" text,
	"response_data" jsonb,
	"audit_log" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "dsar_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"request_type" varchar(100) NOT NULL,
	"template_content" json,
	"is_active" boolean DEFAULT true,
	"usage_count" integer DEFAULT 0,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"user_id" integer,
	"folder" varchar(20) DEFAULT 'inbox',
	"status" varchar(20) DEFAULT 'draft',
	"subject" varchar(500),
	"body" text,
	"snippet" varchar(255),
	"from" varchar(255),
	"to" json,
	"cc" json,
	"bcc" json,
	"is_read" boolean DEFAULT false,
	"is_starred" boolean DEFAULT false,
	"metadata" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"sent_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"subject" text NOT NULL,
	"content" text NOT NULL,
	"description" text,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "email_templates_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_triggers" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_slug" varchar(255) NOT NULL,
	"template_id" integer,
	"description" text,
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "email_triggers_event_slug_unique" UNIQUE("event_slug")
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
	"embedding_vector" "vector(1536)",
	"embedding" "vector(1536)",
	"content" text,
	"metadata" json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_acknowledgments" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"acknowledgment_type" varchar(100) NOT NULL,
	"acknowledged_at" timestamp DEFAULT now() NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_asset_receipts" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"asset_type" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'assigned' NOT NULL,
	"serial_number" varchar(100),
	"asset_id" integer,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"assigned_by" integer,
	"confirmed_at" timestamp,
	"expires_at" timestamp DEFAULT now() NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_security_setup" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"mfa_enrolled" boolean DEFAULT false,
	"mfa_enrolled_at" timestamp,
	"password_manager_setup" boolean DEFAULT false,
	"password_manager_setup_at" timestamp,
	"security_questions_set" boolean DEFAULT false,
	"security_questions_set_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "employee_security_setup_employee_id_unique" UNIQUE("employee_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_task_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"task_type" "task_type" NOT NULL,
	"task_id" integer NOT NULL,
	"raci_role" "raci_role" NOT NULL,
	"notes" text,
	"due_date" timestamp,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"assigned_by" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employee_training_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"framework_id" varchar(100) NOT NULL,
	"section_id" varchar(100) NOT NULL,
	"completed_at" timestamp NOT NULL,
	"completed_by_user_id" integer NOT NULL,
	"ip_address" varchar(50),
	"user_agent" text,
	"time_spent_seconds" integer,
	"score" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "employees" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"first_name" varchar(255) NOT NULL,
	"last_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"job_title" varchar(255),
	"department" varchar(255),
	"role" varchar(255),
	"org_role_id" integer,
	"manager_id" integer,
	"employment_status" varchar(50),
	"start_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "escalation_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"trigger" "escalation_trigger" NOT NULL,
	"entity_type" "governance_entity_type",
	"trigger_conditions" json,
	"actions" json DEFAULT '{}'::json,
	"work_item_priority" "work_item_priority" DEFAULT 'high',
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "essential_eight_assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"control_id" varchar(80) NOT NULL,
	"maturity_level" integer DEFAULT 0 NOT NULL,
	"target_level" integer DEFAULT 1 NOT NULL,
	"assessment_answers" jsonb DEFAULT '{}'::jsonb,
	"quality_criteria" jsonb DEFAULT '{}'::jsonb,
	"level_notes" jsonb DEFAULT '{}'::jsonb,
	"outcome" varchar(30) DEFAULT 'not_assessed' NOT NULL,
	"evidence_quality" varchar(20) DEFAULT 'poor' NOT NULL,
	"evidence_quality_by_level" jsonb DEFAULT '{}'::jsonb,
	"sample_coverage" jsonb DEFAULT '{}'::jsonb,
	"compensating_controls" jsonb DEFAULT '[]'::jsonb,
	"evidence_links" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "evidence" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"client_control_id" integer NOT NULL,
	"evidence_id" varchar(50) NOT NULL,
	"system_id" varchar(50),
	"description" text,
	"framework" varchar(50) DEFAULT 'ISO 27001',
	"type" varchar(100),
	"status" "evidence_status" DEFAULT 'pending',
	"due_date" timestamp,
	"file_count" integer DEFAULT 0,
	"owner" varchar(255),
	"location" varchar(1024),
	"last_verified" timestamp,
	"expiration_date" timestamp,
	"interval_days" integer DEFAULT 365,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "evidence_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"evidence_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "evidence_files" (
	"id" serial PRIMARY KEY NOT NULL,
	"evidence_id" integer NOT NULL,
	"filename" varchar(255) NOT NULL,
	"file_url" varchar(1024) NOT NULL,
	"file_key" varchar(1024) NOT NULL,
	"content_type" varchar(100),
	"file_size" integer,
	"uploaded_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "evidence_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"client_control_id" integer NOT NULL,
	"requester_id" integer NOT NULL,
	"assignee_id" integer NOT NULL,
	"status" varchar(50) DEFAULT 'open',
	"due_date" timestamp,
	"description" text,
	"evidence_id" integer,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "evidence_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"control_pattern" varchar(255) NOT NULL,
	"framework" varchar(100),
	"category" varchar(100),
	"suggested_sources" json DEFAULT '[]'::json,
	"sample_description" text,
	"integration_type" varchar(50) DEFAULT 'manual',
	"priority" integer DEFAULT 50,
	"created_at" timestamp DEFAULT now()
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
	"section_889_status" varchar(50) DEFAULT 'not_required',
	"section_889_representative" varchar(255),
	"section_889_date" timestamp,
	"start_date" timestamp,
	"end_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "federal_disa_stig_checklists" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"category" varchar(100),
	"asset_identifier" varchar(255),
	"overall_status" varchar(50),
	"findings_count" integer DEFAULT 0,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "federal_disa_stig_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"checklist_id" integer NOT NULL,
	"rule_id" varchar(50) NOT NULL,
	"vuln_id" varchar(50),
	"title" text NOT NULL,
	"description" text,
	"check_text" text,
	"fix_text" text,
	"severity" varchar(20),
	"status" varchar(50),
	"comments" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "federal_fedramp_packages" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"impact_level" varchar(20),
	"authorization_type" varchar(50),
	"agency_name" varchar(255),
	"provisioning_status" varchar(50),
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "federal_fips_140_module_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"fips_module_id" integer NOT NULL,
	"asset_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "federal_fips_140_modules" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"module_name" varchar(255) NOT NULL,
	"vendor" varchar(255),
	"certificate_number" varchar(50),
	"validation_level" varchar(20),
	"validation_version" varchar(20),
	"status" varchar(50),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "federal_fips_categorizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"ssp_id" integer NOT NULL,
	"security_objective_confidentiality" varchar(20) DEFAULT 'low',
	"security_objective_integrity" varchar(20) DEFAULT 'low',
	"security_objective_availability" varchar(20) DEFAULT 'low',
	"rationale_confidentiality" text,
	"rationale_integrity" text,
	"rationale_availability" text,
	"information_types" json DEFAULT '[]'::json,
	"updated_at" timestamp DEFAULT now(),
	"fisma_system_id" integer,
	CONSTRAINT "federal_fips_categorizations_ssp_id_unique" UNIQUE("ssp_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "federal_fisma_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"reporting_period" varchar(100),
	"system_impact" varchar(20),
	"overall_status" varchar(50),
	"metrics" json,
	"fisma_system_id" integer,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "federal_fisma_systems" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"acronym" varchar(20),
	"owner" varchar(255),
	"fips_199_overall" varchar(20),
	"description" text,
	"status" varchar(50),
	"controls_count" integer DEFAULT 0,
	"assets_count" integer DEFAULT 0,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "federal_inheritances" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"package_id" integer NOT NULL,
	"partner_name" varchar(255) NOT NULL,
	"control_id" varchar(100) NOT NULL,
	"description" text,
	"status" varchar(50) DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"fisma_system_id" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "federal_nist_800_53_assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"ssp_id" integer,
	"fisma_system_id" integer,
	"sprs_assessment_id" integer,
	"rmf_workflow_id" integer,
	"control_id" varchar(50) NOT NULL,
	"implementation_status" varchar(50),
	"implementation_description" text,
	"test_results" text,
	"compliance_status" varchar(50),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "federal_poams" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"fisma_system_id" integer,
	"title" varchar(255) NOT NULL,
	"source_ssp_id" integer,
	"status" varchar(50) DEFAULT 'active',
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "federal_rmf_workflows" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"system_name" varchar(255) NOT NULL,
	"current_step" integer DEFAULT 1,
	"step_status" json,
	"updated_at" timestamp DEFAULT now(),
	"fisma_system_id" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "federal_sars" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"fisma_system_id" integer,
	"ssp_id" integer,
	"title" varchar(255) NOT NULL,
	"assessor_name" varchar(255),
	"assessment_date" timestamp,
	"summary_of_findings" text,
	"risk_executive_summary" text,
	"system_acronym" varchar(50),
	"system_identification" varchar(255),
	"system_type" varchar(50),
	"version" varchar(50),
	"agency" varchar(100),
	"assessment_completion_date" timestamp,
	"system_owner_id" integer,
	"confidentiality" varchar(20),
	"integrity" varchar(20),
	"availability" varchar(20),
	"impact" varchar(20),
	"package_type" varchar(100),
	"executive_summary" text,
	"status" varchar(50) DEFAULT 'draft',
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "federal_ssps" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"fisma_system_id" integer,
	"title" varchar(255) NOT NULL,
	"framework" varchar(50) NOT NULL,
	"system_name" varchar(255),
	"system_type" varchar(255),
	"boundary_description" text,
	"responsible_role" varchar(255),
	"content" text DEFAULT '{}',
	"status" varchar(50) DEFAULT 'draft',
	"version" integer DEFAULT 1,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "federal_sar_findings" (
	"id" serial PRIMARY KEY NOT NULL,
	"sar_id" integer NOT NULL,
	"control_id" varchar(50) NOT NULL,
	"result" varchar(50) DEFAULT 'other_than_satisfied',
	"observation" text,
	"risk_level" varchar(20),
	"remediation_plan" text,
	"overlay" varchar(100),
	"na_justification" text,
	"vulnerability_summary" text,
	"vulnerability_severity" varchar(20),
	"residual_risk_level" varchar(20),
	"recommendations" text,
	"updated_at" timestamp DEFAULT now(),
	"fisma_system_id" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "federal_sprs_assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"score" integer DEFAULT 110,
	"assessment_date" timestamp DEFAULT now(),
	"scope_description" text,
	"status" varchar(50) DEFAULT 'Active',
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "federal_ssp_controls" (
	"id" serial PRIMARY KEY NOT NULL,
	"ssp_id" integer NOT NULL,
	"control_id" varchar(50) NOT NULL,
	"implementation_status" varchar(50) DEFAULT 'not_implemented',
	"implementation_description" text,
	"responsible_role" varchar(255),
	"evidence_links" json DEFAULT '[]'::json,
	"updated_at" timestamp DEFAULT now(),
	"fisma_system_id" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "federal_ssp_sections" (
	"id" serial PRIMARY KEY NOT NULL,
	"ssp_id" integer NOT NULL,
	"section_key" varchar(100) NOT NULL,
	"content" json,
	"updated_at" timestamp DEFAULT now(),
	"fisma_system_id" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "financial_impacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"bia_id" integer NOT NULL,
	"loss_category" varchar(100) NOT NULL,
	"amount_per_unit" integer,
	"unit" varchar(50),
	"description" text,
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
CREATE TABLE IF NOT EXISTS "fips_categorizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"fisma_system_id" integer,
	"system_name" varchar(255),
	"information_types" json,
	"confidentiality_impact" varchar(20),
	"confidentiality_rationale" text,
	"integrity_impact" varchar(20),
	"integrity_rationale" text,
	"availability_impact" varchar(20),
	"availability_rationale" text,
	"high_water_mark" varchar(20),
	"metadata" json DEFAULT '{}'::json,
	"status" varchar(50) DEFAULT 'draft',
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "framework_knowledge_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_requirement_id" integer NOT NULL,
	"target_type" varchar(50) NOT NULL,
	"target_value" varchar(255) NOT NULL,
	"mapping_weight" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "framework_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_framework_id" integer,
	"source_requirement_id" integer,
	"target_framework_id" integer,
	"target_requirement_id" integer,
	"strength" varchar(50) DEFAULT 'related',
	"justification" text,
	"common_control_id" integer,
	"created_by_id" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "framework_mappings_deprecated" (
	"id" serial PRIMARY KEY NOT NULL,
	"source_control_id" integer NOT NULL,
	"target_control_id" integer NOT NULL,
	"mapping_type" varchar(50) DEFAULT 'equivalent',
	"notes" text,
	"confidence" integer,
	"status" varchar(50) DEFAULT 'approved',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "framework_requirements" (
	"id" serial PRIMARY KEY NOT NULL,
	"framework_id" integer NOT NULL,
	"phase_id" integer,
	"identifier" varchar(100) NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"guidance" text,
	"mapping_tags" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gap_assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"framework" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'draft',
	"scope" text,
	"user_id" integer,
	"assignees" json,
	"executive_summary" text,
	"introduction" text,
	"key_recommendations" json,
	"methodology" text,
	"assumptions" text,
	"references" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gap_questionnaire_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"assessment_id" integer NOT NULL,
	"token" varchar(64) NOT NULL,
	"recipient_email" varchar(255) NOT NULL,
	"recipient_name" varchar(255),
	"control_ids" json DEFAULT '[]'::json,
	"message" text,
	"status" varchar(20) DEFAULT 'pending',
	"sent_at" timestamp,
	"expires_at" timestamp,
	"viewed_at" timestamp,
	"completed_at" timestamp,
	"applied_at" timestamp,
	"archived_at" timestamp,
	"respondent_name" varchar(255),
	"responses" json DEFAULT '[]'::json,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "gap_questionnaire_requests_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "gap_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"assessment_id" integer NOT NULL,
	"control_id" varchar(100) NOT NULL,
	"current_status" varchar(50),
	"target_status" varchar(50),
	"notes" text,
	"evidence_links" json,
	"remediation_plan" text,
	"gap_severity" varchar(20),
	"priority_score" integer,
	"priority_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "global_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"first_name" varchar(255),
	"last_name" varchar(255),
	"email" varchar(255) NOT NULL,
	"company" varchar(255),
	"role" varchar(255),
	"phone" varchar(50),
	"source" varchar(50) DEFAULT 'manual',
	"status" varchar(50) DEFAULT 'lead',
	"notes" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "global_contacts_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "global_crm_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_id" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"subject" varchar(255),
	"description" text,
	"outcome" varchar(100),
	"scheduled_at" timestamp,
	"completed_at" timestamp,
	"duration" integer,
	"created_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "global_crm_contact_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_id" integer NOT NULL,
	"tag_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "global_crm_deals" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"value" integer NOT NULL,
	"probability" integer DEFAULT 0,
	"stage" varchar(50) NOT NULL,
	"expected_close_date" timestamp,
	"description" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "global_crm_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"contact_id" integer NOT NULL,
	"content" text NOT NULL,
	"is_pinned" boolean DEFAULT false,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "global_crm_tags" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"color" varchar(20),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "global_crm_tags_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "global_vendors" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"website" varchar(512),
	"trust_center_url" varchar(512),
	"platform" varchar(100),
	"favicon_url" varchar(512),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "governance_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"entity_type" "governance_entity_type" NOT NULL,
	"entity_id" integer NOT NULL,
	"entity_name" varchar(500),
	"event_type" varchar(100) NOT NULL,
	"from_state" varchar(100),
	"to_state" varchar(100),
	"action" varchar(100),
	"actor_user_id" integer,
	"actor_name" varchar(255),
	"metadata" json,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "impact_assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"bia_id" integer NOT NULL,
	"time_interval" varchar(50) NOT NULL,
	"financial_rating" integer,
	"operational_rating" integer,
	"reputation_rating" integer,
	"legal_rating" integer,
	"financial_value" varchar(100),
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "implementation_phases" (
	"id" serial PRIMARY KEY NOT NULL,
	"framework_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"order" integer NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "implementation_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"roadmap_id" integer,
	"framework_id" integer,
	"custom_framework_name" varchar(255),
	"harmonization_source_ids" json,
	"title" varchar(255) NOT NULL,
	"description" text,
	"status" "implementation_status" DEFAULT 'not_started',
	"priority" varchar(50) DEFAULT 'medium',
	"planned_start_date" timestamp,
	"planned_end_date" timestamp,
	"actual_start_date" timestamp,
	"actual_end_date" timestamp,
	"estimated_hours" integer,
	"actual_hours" integer,
	"budget_amount" integer,
	"actual_cost" integer,
	"project_manager_id" integer,
	"team_member_ids" json,
	"linked_framework" varchar(100),
	"linked_controls" json,
	"risk_mitigation_focus" json,
	"prerequisites" json,
	"blocked_by" json,
	"created_by_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "implementation_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"implementation_plan_id" integer NOT NULL,
	"completed_tasks_count" integer DEFAULT 0,
	"total_tasks_count" integer DEFAULT 0,
	"overall_progress_percentage" integer DEFAULT 0,
	"status_change_date" timestamp DEFAULT now(),
	"previous_status" varchar(50),
	"new_status" varchar(50),
	"affected_milestone_ids" json,
	"milestone_progress_updates" json,
	"workflows_completed_count" integer DEFAULT 0,
	"workflows_blocked_count" integer DEFAULT 0,
	"quality_score" integer,
	"adherence_score" integer,
	"reported_by_id" integer NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "implementation_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"implementation_plan_id" integer NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"status" "kanban_status" DEFAULT 'todo',
	"pdca" varchar(100),
	"nist" varchar(50),
	"progress_percentage" integer DEFAULT 0,
	"assignee_id" integer,
	"reviewer_id" integer,
	"estimated_hours" integer,
	"actual_hours" integer,
	"planned_start_date" timestamp,
	"planned_end_date" timestamp,
	"actual_start_date" timestamp,
	"actual_end_date" timestamp,
	"dependencies" json,
	"blocked_by" json,
	"acceptance_criteria" text,
	"deliverables" json,
	"evidence_required" json,
	"risk_mitigation" text,
	"control_id" varchar(100),
	"tags" json,
	"subtasks" json,
	"priority" varchar(50) DEFAULT 'medium',
	"created_by_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "implementation_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer,
	"title" varchar(255) NOT NULL,
	"description" text,
	"estimated_hours" integer DEFAULT 0,
	"priority" varchar(50) DEFAULT 'medium',
	"category" varchar(100),
	"tasks" jsonb DEFAULT '[]'::jsonb,
	"risk_mitigation_focus" jsonb DEFAULT '[]'::jsonb,
	"is_system" boolean DEFAULT false,
	"created_by_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "incidents" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"title" varchar(255) DEFAULT 'Untitled Incident' NOT NULL,
	"detected_at" timestamp,
	"severity" "incident_severity" DEFAULT 'low',
	"is_significant" boolean DEFAULT false,
	"significance_criteria" json,
	"affected_users_count" integer DEFAULT 0,
	"service_disruption_duration" integer DEFAULT 0,
	"estimated_financial_loss" integer DEFAULT 0,
	"is_continuity_triggered" boolean DEFAULT false,
	"early_warning_sent_at" timestamp,
	"intermediate_report_sent_at" timestamp,
	"final_report_sent_at" timestamp,
	"cause" varchar(100),
	"description" text,
	"affected_assets" text,
	"cross_border_impact" boolean DEFAULT false,
	"status" "incident_status" DEFAULT 'open',
	"reported_to_authorities" boolean DEFAULT false,
	"reporter_name" varchar(255),
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "intake_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"filename" varchar(255) NOT NULL,
	"file_url" varchar(1024) NOT NULL,
	"file_key" varchar(500),
	"status" varchar(50) DEFAULT 'pending',
	"classification" varchar(255),
	"confidence" integer,
	"details" json,
	"uploaded_by" integer,
	"processed_by" integer,
	"mapped_evidence_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"fisma_system_id" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "integration_definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"provider" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"client_id" text NOT NULL,
	"client_secret" text NOT NULL,
	"scopes" text,
	"redirect_uri" text,
	"is_active" boolean DEFAULT true,
	"tenant_id" integer,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "integrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"provider" varchar(50) NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"expires_at" timestamp,
	"external_account_id" varchar(255),
	"scopes" json,
	"metadata" json,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "international_transfers" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"activity_id" integer,
	"vendor_id" integer,
	"title" varchar(255) NOT NULL,
	"destination_country_code" varchar(2) NOT NULL,
	"transfer_tool" "transfer_tool" NOT NULL,
	"scc_module" "scc_module",
	"status" "international_transfer_status" DEFAULT 'pending',
	"next_review_date" timestamp,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
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
CREATE TABLE IF NOT EXISTS "issue_tracker_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"provider" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"base_url" varchar(1024),
	"credentials" text NOT NULL,
	"project_key" varchar(100),
	"status" varchar(50) DEFAULT 'pending',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "knowledge_articles" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(500) NOT NULL,
	"body" text NOT NULL,
	"tags" json,
	"source" varchar(255),
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "knowledge_base_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"tags" json DEFAULT '[]'::json,
	"access" varchar(50) DEFAULT 'internal',
	"assignee_id" integer,
	"health" varchar(50),
	"comments" text,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "kris" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"status" varchar(50) DEFAULT 'active',
	"threshold_green" text,
	"threshold_amber" text,
	"threshold_red" text,
	"current_value" text,
	"current_status" varchar(50) DEFAULT 'green',
	"owner" varchar(255),
	"last_updated" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
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
CREATE TABLE IF NOT EXISTS "llm_providers" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"model" varchar(100) NOT NULL,
	"api_key" text NOT NULL,
	"base_url" varchar(512),
	"priority" integer DEFAULT 0,
	"is_enabled" boolean DEFAULT false,
	"supports_embeddings" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "llm_router_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"feature" varchar(100) NOT NULL,
	"provider_id" integer,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "llm_router_rules_feature_unique" UNIQUE("feature")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "magic_link_redemptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"magic_link_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"redeemed_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "magic_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"token" varchar(255) NOT NULL,
	"label" varchar(255),
	"email" varchar(255),
	"role" varchar(50) DEFAULT 'viewer',
	"plan_tier" varchar(50) DEFAULT 'consultant',
	"max_clients" integer DEFAULT 2,
	"access_duration_type" varchar(50),
	"access_duration_days" integer,
	"waitlist_id" integer,
	"status" varchar(50) DEFAULT 'active',
	"created_by_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"used_at" timestamp,
	"used_by_user_id" integer,
	"expires_at" timestamp,
	"usage_limit" integer DEFAULT 1,
	"use_count" integer DEFAULT 0,
	"restricted_domains" json,
	CONSTRAINT "magic_links_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nda_signatures" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"visitor_id" integer NOT NULL,
	"nda_version" varchar(50) DEFAULT 'v1.0',
	"signed_at" timestamp DEFAULT now(),
	"signature_text" varchar(255),
	"ip_address" varchar(50)
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
CREATE TABLE IF NOT EXISTS "notification_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" varchar(50),
	"channel" varchar(20) DEFAULT 'email',
	"title" varchar(255),
	"message" text,
	"link" text,
	"sent_at" timestamp DEFAULT now(),
	"read_at" timestamp,
	"status" varchar(20) DEFAULT 'sent',
	"metadata" json,
	"related_entity_type" varchar(50),
	"related_entity_id" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"email_enabled" boolean DEFAULT true,
	"overdue_enabled" boolean DEFAULT true,
	"upcoming_review_days" integer DEFAULT 7,
	"daily_digest_enabled" boolean DEFAULT false,
	"weekly_digest_enabled" boolean DEFAULT true,
	"notify_control_reviews" boolean DEFAULT true,
	"notify_policy_renewals" boolean DEFAULT true,
	"notify_evidence_expiration" boolean DEFAULT true,
	"notify_risk_reviews" boolean DEFAULT true,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "nvd_cve_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"cve_id" varchar(50) NOT NULL,
	"cvss_score" varchar(10),
	"cvss_vector" varchar(255),
	"cwe_ids" json,
	"description" text,
	"published_date" timestamp,
	"last_modified_date" timestamp,
	"affected_products" json,
	"references" json,
	"raw_data" json,
	"fetched_at" timestamp DEFAULT now(),
	"expires_at" timestamp,
	CONSTRAINT "nvd_cve_cache_cve_id_unique" UNIQUE("cve_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "onboarding_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"template_id" integer,
	"status" varchar(50) DEFAULT 'assigned',
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "onboarding_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"role_type" varchar(100) DEFAULT 'general',
	"requirement_keys" jsonb DEFAULT '[]' NOT NULL,
	"training_module_ids" jsonb DEFAULT '[]' NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "org_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"responsibilities" text,
	"department" varchar(255),
	"reporting_role_id" integer,
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
CREATE TABLE IF NOT EXISTS "plan_change_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"action" varchar(50) NOT NULL,
	"details" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plan_exercises" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"plan_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"start_date" timestamp DEFAULT now(),
	"conductor_id" integer,
	"status" varchar(50) DEFAULT 'planned',
	"outcome" text,
	"notes" text,
	"follow_up_tasks" json,
	"report_url" varchar(1024),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "plan_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"version" varchar(50) NOT NULL,
	"content_snapshot" json,
	"change_summary" text,
	"created_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "poam_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"poam_id" integer NOT NULL,
	"control_id" varchar(100),
	"weakness_name" varchar(500),
	"weakness_description" text,
	"weakness_detector_source" varchar(255),
	"source_identifier" varchar(255),
	"asset_identifier" varchar(255),
	"point_of_contact" varchar(255),
	"resources_required" text,
	"overall_remediation_plan" text,
	"assignee_id" integer,
	"original_detection_date" timestamp,
	"scheduled_completion_date" timestamp,
	"milestones" json,
	"milestone_changes" json,
	"status" varchar(50) DEFAULT 'open',
	"status_date" timestamp,
	"vendor_dependency" varchar(255),
	"last_vendor_checkin_date" timestamp,
	"product_name" varchar(255),
	"original_risk_rating" varchar(50),
	"adjusted_risk_rating" varchar(50),
	"risk_adjustment" text,
	"false_positive" boolean DEFAULT false,
	"operational_requirement" text,
	"deviation_rationale" text,
	"supporting_documents" json,
	"comments" text,
	"auto_approve" boolean DEFAULT false,
	"related_risk_id" integer,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "policy_acknowledgements" (
	"id" serial PRIMARY KEY NOT NULL,
	"policy_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"status" "policy_ack_status" DEFAULT 'pending',
	"acknowledged_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "policy_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"policy_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"status" varchar(50) DEFAULT 'pending',
	"attested_at" timestamp,
	"assigned_at" timestamp DEFAULT now(),
	"viewed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "policy_exceptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"policy_id" integer,
	"requirement_id" integer,
	"policy_type" varchar(50) DEFAULT 'policy',
	"employee_id" integer NOT NULL,
	"reason" text NOT NULL,
	"status" varchar(50) DEFAULT 'pending',
	"expiration_date" timestamp,
	"approved_by" integer,
	"approved_at" timestamp,
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "policy_review_results" (
	"id" serial PRIMARY KEY NOT NULL,
	"policy_review_id" integer NOT NULL,
	"overall_score" integer,
	"gaps" json,
	"compliance" json,
	"recommendations" json,
	"improved_policy_content" text,
	"ai_provider" varchar(100),
	"ai_model" varchar(100),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "policy_reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"policy_review_id" varchar(50) NOT NULL,
	"policy_name" varchar(500) NOT NULL,
	"policy_content" text NOT NULL,
	"selected_requirements" json,
	"status" "policy_review_status" DEFAULT 'analyzing',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "policy_reviews_policy_review_id_unique" UNIQUE("policy_review_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "policy_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"content" text,
	"owner_id" integer,
	"client_id" integer,
	"is_public" boolean DEFAULT false,
	"sections" json,
	"tailoring_questions" json,
	"frameworks" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "policy_templates_template_id_unique" UNIQUE("template_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "policy_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_policy_id" integer NOT NULL,
	"version" varchar(50) NOT NULL,
	"content" text,
	"status" varchar(50),
	"description" text,
	"published_by" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "privacy_assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"type" varchar(50) NOT NULL,
	"responses" json,
	"status" varchar(20) DEFAULT 'not_started',
	"score" integer DEFAULT 0,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "process_dependencies" (
	"id" serial PRIMARY KEY NOT NULL,
	"process_id" integer NOT NULL,
	"dependency_type" varchar(50) NOT NULL,
	"dependency_name" varchar(255) NOT NULL,
	"dependency_id" integer,
	"criticality" varchar(50) DEFAULT 'medium',
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "processing_activities" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"activity_name" text NOT NULL,
	"activity_id" text NOT NULL,
	"description" text,
	"role" varchar(50) NOT NULL,
	"controller_name" text,
	"controller_contact" text,
	"dpo_name" text,
	"dpo_contact" text,
	"representative_name" text,
	"representative_contact" text,
	"purposes" json DEFAULT '[]'::json NOT NULL,
	"legal_basis" varchar(100) NOT NULL,
	"data_categories" json DEFAULT '[]'::json NOT NULL,
	"data_subject_categories" json DEFAULT '[]'::json NOT NULL,
	"special_categories" json DEFAULT '[]'::json,
	"recipients" json DEFAULT '[]'::json NOT NULL,
	"recipient_categories" json DEFAULT '[]'::json,
	"has_international_transfers" boolean DEFAULT false,
	"transfer_countries" json DEFAULT '[]'::json,
	"transfer_safeguards" text,
	"transfer_details" text,
	"retention_period" text,
	"retention_criteria" text,
	"deletion_procedure" text,
	"technical_measures" json DEFAULT '[]'::json,
	"organizational_measures" json DEFAULT '[]'::json,
	"security_description" text,
	"status" varchar(50) DEFAULT 'draft',
	"last_review_date" timestamp,
	"next_review_date" timestamp,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "processing_activity_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"processing_activity_id" integer NOT NULL,
	"asset_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "processing_activity_vendors" (
	"id" serial PRIMARY KEY NOT NULL,
	"processing_activity_id" integer NOT NULL,
	"vendor_id" integer NOT NULL,
	"role" varchar(50),
	"created_at" timestamp DEFAULT now()
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
CREATE TABLE IF NOT EXISTS "project_compliance_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer,
	"dev_project_id" integer,
	"framework" varchar(100) NOT NULL,
	"requirement_id" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'pending',
	"evidence_id" integer,
	"notes" text,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"title" varchar(500) NOT NULL,
	"description" text,
	"status" "kanban_status" DEFAULT 'todo',
	"priority" varchar(50) DEFAULT 'medium',
	"due_date" timestamp,
	"assignee_id" integer,
	"position" integer DEFAULT 0,
	"tags" json,
	"source_type" varchar(50),
	"source_id" integer,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"status" varchar(50) DEFAULT 'planning',
	"start_date" timestamp,
	"end_date" timestamp,
	"owner" varchar(255),
	"project_type" varchar(50) DEFAULT 'it',
	"security_criticality" varchar(50) DEFAULT 'medium',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "questionnaire_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"questionnaire_id" integer NOT NULL,
	"question_id" text,
	"focus_area" text,
	"sub_focus_area" text,
	"question" text NOT NULL,
	"answer" text,
	"comment" text,
	"tags" json DEFAULT '[]'::json,
	"category" varchar(100),
	"priority" varchar(20) DEFAULT 'medium',
	"control_id" text,
	"control_framework" varchar(50),
	"remediation_deadline" timestamp,
	"access" varchar(50) DEFAULT 'internal',
	"assignee_id" integer,
	"answered_by" integer,
	"approved_by" integer,
	"approved_at" timestamp,
	"confidence" integer,
	"sources" json DEFAULT '[]'::json,
	"extra_fields" jsonb DEFAULT '{}'::jsonb,
	"status" varchar(50) DEFAULT 'pending',
	"version" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "questionnaires" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"name" text NOT NULL,
	"sender_name" text,
	"product_name" text,
	"status" varchar(50) DEFAULT 'open',
	"direction" varchar(20) DEFAULT 'inbound',
	"progress" integer DEFAULT 0,
	"due_date" timestamp,
	"owner_id" integer,
	"vendor_name" text,
	"vendor_email" text,
	"vendor_token" text,
	"vendor_link_expires_at" timestamp,
	"category" varchar(100),
	"priority" varchar(20) DEFAULT 'medium',
	"control_id" text,
	"control_framework" varchar(50),
	"remediation_deadline" timestamp,
	"answered_by" integer,
	"approved_by" integer,
	"approved_at" timestamp,
	"version" integer DEFAULT 1,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "readiness_assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'in_progress',
	"standard_id" varchar(50) DEFAULT 'ISO27001' NOT NULL,
	"current_step" integer DEFAULT 1,
	"scope_details" json,
	"stakeholders" json,
	"existing_policies" json,
	"business_context" json,
	"maturity_expectations" json,
	"scoping_report" text,
	"questionnaire_data" jsonb,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "recovery_objectives" (
	"id" serial PRIMARY KEY NOT NULL,
	"bia_id" integer NOT NULL,
	"activity" varchar(255) NOT NULL,
	"criticality" varchar(50),
	"rto" varchar(50),
	"rpo" varchar(50),
	"mtpd" varchar(50),
	"dependencies" text,
	"resources" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "regulation_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"regulation_id" varchar(50) NOT NULL,
	"article_id" varchar(50) NOT NULL,
	"mapped_type" varchar(50) NOT NULL,
	"mapped_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "remediation_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'draft',
	"start_date" timestamp DEFAULT now(),
	"target_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "remediation_playbooks" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" varchar(255) NOT NULL,
	"gap_pattern" varchar(255) NOT NULL,
	"category" varchar(100),
	"framework" varchar(100),
	"severity" varchar(20) DEFAULT 'medium',
	"estimated_effort" varchar(50),
	"steps" json DEFAULT '[]'::json,
	"owner_template" text,
	"policy_language" text,
	"itsm_template" json,
	"priority" integer DEFAULT 50,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "remediation_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"client_control_id" integer,
	"title" varchar(500) NOT NULL,
	"description" text,
	"priority" varchar(50) DEFAULT 'medium',
	"status" varchar(50) DEFAULT 'open',
	"due_date" timestamp,
	"assignee_id" integer,
	"issue_tracker_connection_id" integer,
	"external_issue_id" varchar(255),
	"external_issue_url" varchar(1024),
	"last_synced_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "report_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"user_id" integer,
	"report_type" "report_type" NOT NULL,
	"format" varchar(20) NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"metadata" json
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
CREATE TABLE IF NOT EXISTS "risk_assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"project_id" integer,
	"fisma_system_id" integer,
	"assessment_id" varchar(50) NOT NULL,
	"title" varchar(255),
	"category" varchar(100) DEFAULT 'General',
	"owasp_category" varchar(100),
	"privacy_impact" boolean DEFAULT false,
	"csf_function" varchar(50),
	"ai_rmf_category" varchar(50),
	"risk_id" integer,
	"assessment_date" timestamp,
	"assessor" varchar(255),
	"method" varchar(100),
	"threat_id" integer,
	"threat_description" text,
	"vulnerability_id" integer,
	"vulnerability_description" text,
	"affected_assets" json,
	"affected_process_ids" json,
	"context_snapshot" json,
	"gap_response_id" integer,
	"likelihood" varchar(50),
	"impact" varchar(50),
	"inherent_risk" varchar(50),
	"inherent_score" integer,
	"existing_controls" text,
	"control_ids" json,
	"control_effectiveness" varchar(50),
	"residual_risk" varchar(50),
	"residual_score" integer,
	"risk_owner" varchar(255),
	"treatment_option" varchar(50),
	"recommended_actions" text,
	"priority" varchar(50),
	"target_residual_risk" varchar(50),
	"review_due_date" timestamp,
	"status" "risk_assessment_status" DEFAULT 'draft',
	"notes" text,
	"next_review_date" timestamp,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "risk_policy_mappings" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"risk_assessment_id" integer NOT NULL,
	"client_policy_id" integer NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "risk_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"title" varchar(255) DEFAULT 'Risk Management Report',
	"executive_summary" text,
	"introduction" text,
	"scope" text,
	"methodology" text,
	"key_findings" text,
	"recommendations" text,
	"conclusion" text,
	"assumptions" text,
	"references" text,
	"status" varchar(50) DEFAULT 'draft',
	"version" integer DEFAULT 1,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "risk_scenario_links" (
	"id" serial PRIMARY KEY NOT NULL,
	"risk_id" integer NOT NULL,
	"scenario_id" integer NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "risk_scenarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"assessment_type" varchar(50) DEFAULT 'asset' NOT NULL,
	"asset_id" integer,
	"process_id" varchar(100),
	"vendor_id" integer,
	"dev_project_id" integer,
	"project_id" integer,
	"threat_model_id" integer,
	"threat_id" integer,
	"vulnerability_id" integer,
	"title" varchar(500) NOT NULL,
	"description" text,
	"category" varchar(100) DEFAULT 'General',
	"owasp_category" varchar(100),
	"privacy_impact" boolean DEFAULT false,
	"csf_function" varchar(50),
	"threat_category" varchar(100),
	"vulnerability" varchar(255),
	"gap_response_id" integer,
	"likelihood" integer DEFAULT 1,
	"impact" integer DEFAULT 1,
	"inherent_score" integer,
	"inherent_risk" varchar(50),
	"residual_likelihood" integer,
	"residual_impact" integer,
	"residual_score" integer,
	"residual_risk" varchar(50),
	"inherent_risk_score" integer,
	"status" varchar(50) DEFAULT 'identified',
	"owner" varchar(255),
	"custom_mitigation_plan" text,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "risk_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"scope" text,
	"context" text,
	"risk_appetite" text,
	"risk_tolerance" json,
	"methodology" varchar(255) DEFAULT 'ISO 27005',
	"impact_criteria" json,
	"likelihood_criteria" json,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "risk_treatments" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer,
	"risk_scenario_id" integer,
	"risk_assessment_id" integer,
	"treatment_type" varchar(50) DEFAULT 'mitigate' NOT NULL,
	"strategy" text,
	"justification" text,
	"control_id" integer,
	"status" varchar(50) DEFAULT 'planned',
	"due_date" timestamp,
	"implementation_date" timestamp,
	"owner" varchar(255),
	"priority" varchar(50),
	"estimated_cost" varchar(100),
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roadmap_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"plan_id" integer NOT NULL,
	"control_id" varchar(100),
	"gap_response_id" integer,
	"title" varchar(500) NOT NULL,
	"description" text,
	"phase" integer DEFAULT 1,
	"order" integer DEFAULT 0,
	"status" varchar(50) DEFAULT 'pending',
	"owner_role" varchar(255),
	"assignee_id" integer,
	"estimated_duration" integer,
	"actual_start_date" timestamp,
	"actual_end_date" timestamp,
	"dependencies" json,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roadmap_milestones" (
	"id" serial PRIMARY KEY NOT NULL,
	"roadmap_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"target_date" timestamp NOT NULL,
	"actual_date" timestamp,
	"status" varchar(50) DEFAULT 'pending',
	"dependencies" json,
	"progress_percentage" integer DEFAULT 0,
	"completed_items_count" integer DEFAULT 0,
	"total_items_count" integer DEFAULT 0,
	"is_gate" boolean DEFAULT false,
	"priority" varchar(50) DEFAULT 'medium',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roadmap_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"roadmap_id" integer,
	"client_id" integer NOT NULL,
	"title" varchar(500) NOT NULL,
	"version" varchar(50) DEFAULT 'draft',
	"content" text,
	"included_sections" jsonb,
	"data_sources" jsonb,
	"branding" jsonb,
	"file_path" text,
	"file_size" integer,
	"generated_at" timestamp DEFAULT now(),
	"generated_by" integer,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "roadmaps" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"vision" text,
	"objectives" json,
	"framework" varchar(100),
	"status" "roadmap_status" DEFAULT 'draft',
	"start_date" timestamp,
	"target_date" timestamp,
	"actual_start_date" timestamp,
	"actual_end_date" timestamp,
	"kpi_targets" json,
	"created_by_id" integer NOT NULL,
	"approved_by_id" integer,
	"approved_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "samm_maturity_assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"practice_id" varchar(50) NOT NULL,
	"maturity_level" integer DEFAULT 0 NOT NULL,
	"target_level" integer DEFAULT 1 NOT NULL,
	"evidence_links" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "samm_practices" (
	"id" serial PRIMARY KEY NOT NULL,
	"practice_id" varchar(10) NOT NULL,
	"practice_name" varchar(100) NOT NULL,
	"description" text,
	"business_function" varchar(50) NOT NULL,
	"stream_a_name" varchar(100),
	"stream_a_description" text,
	"stream_b_name" varchar(100),
	"stream_b_description" text,
	"official_link" varchar(500),
	"order" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "samm_practices_practice_id_unique" UNIQUE("practice_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "samm_stream_assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"practice_id" varchar(10) NOT NULL,
	"stream_id" varchar(1) NOT NULL,
	"maturity_level" integer DEFAULT 0 NOT NULL,
	"target_level" integer DEFAULT 1 NOT NULL,
	"assessment_answers" jsonb DEFAULT '{}'::jsonb,
	"quality_criteria" jsonb DEFAULT '{}'::jsonb,
	"assessment_date" timestamp,
	"assessed_by" integer,
	"evidence" jsonb DEFAULT '[]'::jsonb,
	"notes" text,
	"improvement_notes" text,
	"level_notes" jsonb DEFAULT '{}'::jsonb,
	"criteria_notes" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "samm_stream_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"practice_id" varchar(10) NOT NULL,
	"practice_name" varchar(100) NOT NULL,
	"stream_id" varchar(1) NOT NULL,
	"stream_name" varchar(100) NOT NULL,
	"stream_description" text,
	"level" integer NOT NULL,
	"level_name" varchar(50),
	"question" text NOT NULL,
	"quality_criteria" jsonb DEFAULT '[]'::jsonb,
	"activities" jsonb DEFAULT '[]'::jsonb,
	"benefits" text,
	"maturity_indicators" jsonb DEFAULT '[]'::jsonb,
	"suggested_evidence" jsonb DEFAULT '[]'::jsonb,
	"business_function" varchar(50) NOT NULL,
	"official_link" varchar(500),
	"is_active" boolean DEFAULT true,
	"version" varchar(20) DEFAULT '2.0',
	"created_at" timestamp DEFAULT now(),
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
CREATE TABLE IF NOT EXISTS "strategic_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text,
	"roadmap_id" integer,
	"implementation_plan_id" integer,
	"status" varchar(50) DEFAULT 'draft',
	"version" varchar(50) DEFAULT '1.0',
	"created_by_id" integer,
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
CREATE TABLE IF NOT EXISTS "task_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"task_type" varchar(50) NOT NULL,
	"task_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"raci_role" "raci_role" NOT NULL,
	"assigned_at" timestamp DEFAULT now(),
	"assigned_by" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"assignee_id" integer,
	"due_date" timestamp,
	"status" varchar(50) DEFAULT 'pending',
	"priority" varchar(20) DEFAULT 'medium',
	"related_entity_type" varchar(50),
	"related_entity_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"created_by" integer
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tech_suggestions" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"control_id" integer NOT NULL,
	"suggestion_text" text NOT NULL,
	"tech_id" varchar(100),
	"vendor" varchar(100),
	"sources" json,
	"created_by" varchar(50) DEFAULT 'ai',
	"created_at" timestamp DEFAULT now(),
	"status" varchar(50) DEFAULT 'proposed',
	"feedback" text,
	"applied_at" timestamp
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
CREATE TABLE IF NOT EXISTS "threat_intel_sync_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" varchar(50) NOT NULL,
	"sync_type" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'completed',
	"records_processed" integer DEFAULT 0,
	"error_message" text,
	"started_at" timestamp DEFAULT now(),
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "threat_model_components" (
	"id" serial PRIMARY KEY NOT NULL,
	"threat_model_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"description" text,
	"x" integer DEFAULT 0,
	"y" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "threat_model_data_flows" (
	"id" serial PRIMARY KEY NOT NULL,
	"threat_model_id" integer NOT NULL,
	"source_component_id" integer NOT NULL,
	"target_component_id" integer NOT NULL,
	"protocol" varchar(50) DEFAULT 'HTTPS',
	"is_encrypted" boolean DEFAULT true,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "threat_models" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"dev_project_id" integer,
	"project_id" integer,
	"name" varchar(255) NOT NULL,
	"methodology" varchar(50) DEFAULT 'STRIDE',
	"status" varchar(50) DEFAULT 'draft',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "threats" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"threat_id" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100),
	"source" varchar(100),
	"intent" varchar(50),
	"likelihood" varchar(50),
	"potential_impact" text,
	"affected_assets" json,
	"related_vulnerabilities" json,
	"associated_risks" json,
	"scenario" text,
	"detection_method" text,
	"status" "threat_status" DEFAULT 'active',
	"owner" varchar(255),
	"last_review_date" timestamp,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "training_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"employee_id" integer NOT NULL,
	"module_id" integer NOT NULL,
	"status" varchar(50) DEFAULT 'pending',
	"score" integer,
	"feedback" text,
	"assigned_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "training_modules" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"type" varchar(20) NOT NULL,
	"video_url" text,
	"thumbnail_url" text,
	"content" text,
	"duration_minutes" integer DEFAULT 0,
	"active" boolean DEFAULT true,
	"order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "transfer_impact_assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"transfer_id" integer NOT NULL,
	"risk_level" varchar(50),
	"status" varchar(50) DEFAULT 'draft',
	"questionnaire_data" json,
	"version" integer DEFAULT 1,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "treatment_controls" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer DEFAULT 0 NOT NULL,
	"treatment_id" integer NOT NULL,
	"control_id" integer NOT NULL,
	"effectiveness" varchar(50),
	"implementation_notes" text,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trust_center_visitors" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(255),
	"company" varchar(255),
	"last_seen_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trust_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"file_url" text NOT NULL,
	"is_locked" boolean DEFAULT false,
	"category" varchar(100),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"client_id" integer NOT NULL,
	"role" "role" DEFAULT 'viewer' NOT NULL,
	"joined_at" timestamp DEFAULT now(),
	"access_expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_invitations" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'viewer' NOT NULL,
	"client_id" integer,
	"invited_by" integer NOT NULL,
	"status" varchar(50) DEFAULT 'pending',
	"token" varchar(255) NOT NULL,
	"used_at" timestamp,
	"used_by_user_id" integer,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_invitations_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"open_id" varchar(255) NOT NULL,
	"name" varchar(255),
	"email" varchar(255),
	"login_method" varchar(255),
	"last_signed_in" timestamp DEFAULT now(),
	"role" varchar(50) DEFAULT 'user',
	"deleted_at" timestamp,
	"max_clients" integer DEFAULT 2,
	"has_seen_tour" boolean DEFAULT false,
	"stripe_customer_id" varchar(255),
	"subscription_status" varchar(50),
	"plan_tier" varchar(50) DEFAULT 'consultant',
	"access_expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_open_id_unique" UNIQUE("open_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vendor_assessment_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"vendor_id" integer NOT NULL,
	"template_id" integer NOT NULL,
	"token" varchar(64) NOT NULL,
	"recipient_email" varchar(255),
	"status" varchar(50) DEFAULT 'draft',
	"responses" json,
	"score" integer,
	"sent_at" timestamp,
	"expires_at" timestamp,
	"viewed_at" timestamp,
	"submitted_at" timestamp,
	"completed_at" timestamp,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "vendor_assessment_requests_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vendor_assessment_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"content" json,
	"created_by" integer,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vendor_assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"vendor_id" integer NOT NULL,
	"type" varchar(100),
	"status" varchar(50) DEFAULT 'Planned',
	"review_status" varchar(50) DEFAULT 'pending',
	"inherent_impact" varchar(50),
	"inherent_likelihood" varchar(50),
	"inherent_risk_level" varchar(50),
	"residual_impact" varchar(50),
	"residual_likelihood" varchar(50),
	"residual_risk_level" varchar(50),
	"score" integer,
	"findings" text,
	"document_url" varchar(1024),
	"due_date" timestamp,
	"completed_date" timestamp,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vendor_authorizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"vendor_id" integer NOT NULL,
	"initiated_by" integer,
	"status" varchar(50) DEFAULT 'Pending',
	"notification_date" timestamp,
	"objection_deadline" timestamp,
	"approval_date" timestamp,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vendor_breaches" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"breach_date" timestamp,
	"severity" varchar(50),
	"source" varchar(255),
	"status" varchar(50) DEFAULT 'Active',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vendor_change_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"vendor_id" integer NOT NULL,
	"change_type" varchar(50) NOT NULL,
	"description" text,
	"old_value" json,
	"new_value" json,
	"detected_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vendor_contacts" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"vendor_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255),
	"phone" varchar(50),
	"role" varchar(100),
	"is_primary" boolean DEFAULT false,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vendor_contracts" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"vendor_id" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"start_date" timestamp,
	"end_date" timestamp,
	"auto_renew" boolean DEFAULT false,
	"value" varchar(50),
	"status" varchar(50) DEFAULT 'Active',
	"document_url" text,
	"notice_period" varchar(50),
	"payment_terms" varchar(50),
	"sla_details" text,
	"dpa_status" varchar(50) DEFAULT 'Not Signed',
	"owner" varchar(100),
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vendor_cve_matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"vendor_id" integer NOT NULL,
	"scan_id" integer,
	"cve_id" varchar(50) NOT NULL,
	"match_score" integer,
	"match_reason" text,
	"description" text,
	"cvss_score" varchar(10),
	"status" varchar(50) DEFAULT 'Active',
	"discovered_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vendor_data_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"vendor_id" integer NOT NULL,
	"token" varchar(64) NOT NULL,
	"recipient_email" varchar(255),
	"message" text,
	"status" varchar(50) DEFAULT 'sent',
	"items" json,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "vendor_data_requests_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vendor_dpas" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"vendor_id" integer NOT NULL,
	"template_id" integer,
	"name" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"status" varchar(50) DEFAULT 'Draft',
	"version" integer DEFAULT 1,
	"signed_at" timestamp,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vendor_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"requester_id" integer,
	"name" varchar(255) NOT NULL,
	"website" varchar(255),
	"category" varchar(100),
	"description" text,
	"status" varchar(50) DEFAULT 'pending',
	"business_owner" varchar(100),
	"rejection_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vendor_scans" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"vendor_id" integer NOT NULL,
	"scan_date" timestamp DEFAULT now(),
	"status" varchar(50) DEFAULT 'Completed',
	"risk_score" integer,
	"vulnerability_count" integer DEFAULT 0,
	"breach_count" integer DEFAULT 0,
	"raw_result" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vendors" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"website" varchar(512),
	"criticality" varchar(50) DEFAULT 'Low',
	"data_access" varchar(50) DEFAULT 'Internal',
	"misc_data" json,
	"service_description" text,
	"uses_ai" boolean DEFAULT false,
	"is_ai_service" boolean DEFAULT false,
	"ai_data_usage" text,
	"additional_notes" text,
	"additional_documents" json,
	"status" varchar(50) DEFAULT 'Active',
	"owner_id" integer,
	"security_owner_id" integer,
	"category" varchar(100) DEFAULT 'Unassigned',
	"source" varchar(100),
	"discovery_date" timestamp,
	"review_status" varchar(50) DEFAULT 'needs_review',
	"trust_center_url" varchar(512),
	"trust_center_data" json,
	"trust_score" integer,
	"is_subprocessor" boolean DEFAULT false,
	"data_location" varchar(255),
	"transfer_mechanism" varchar(255),
	"recursive_subprocessors" json,
	"dpa_analysis" json,
	"last_trust_center_change" timestamp,
	"nis2_category" varchar(100),
	"is_essential_service" boolean DEFAULT false,
	"supply_chain_impact" integer DEFAULT 1,
	"last_supply_chain_review" timestamp,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vulnerabilities" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"vulnerability_id" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"cve_id" varchar(50),
	"cvss_score" integer,
	"severity" varchar(50),
	"affected_assets" json,
	"discovery_date" timestamp,
	"source" varchar(100),
	"exploitability" varchar(255),
	"impact" varchar(255),
	"status" "vulnerability_status" DEFAULT 'open',
	"owner" varchar(255),
	"remediation_plan" text,
	"due_date" timestamp,
	"last_review_date" timestamp,
	"updated_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "waiting_list" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"first_name" varchar(255),
	"last_name" varchar(255),
	"company" varchar(255),
	"role" varchar(255),
	"certification" varchar(255),
	"org_size" varchar(100),
	"industry" varchar(255),
	"status" varchar(50) DEFAULT 'pending',
	"source" varchar(50) DEFAULT 'landing_page',
	"interested_play" varchar(255),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "waiting_list_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "work_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"type" "work_item_type" NOT NULL,
	"status" "work_item_status" DEFAULT 'pending',
	"priority" "work_item_priority" DEFAULT 'medium',
	"title" varchar(500) NOT NULL,
	"description" text,
	"entity_type" "governance_entity_type",
	"entity_id" integer,
	"assigned_to_user_id" integer,
	"assigned_to_employee_id" integer,
	"assigned_role" varchar(50),
	"due_date" timestamp,
	"completed_at" timestamp,
	"is_escalated" boolean DEFAULT false,
	"escalated_at" timestamp,
	"escalation_rule_id" integer,
	"metadata" json,
	"created_by" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "maturity_assessments" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"framework_id" varchar(50) NOT NULL,
	"requirement_id" integer NOT NULL,
	"is_achieved" boolean DEFAULT false,
	"notes" text,
	"evidence" jsonb DEFAULT '[]'::jsonb,
	"is_target" boolean DEFAULT false,
	"assessed_by" integer,
	"assessment_date" timestamp,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "maturity_categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"framework_id" varchar(50) NOT NULL,
	"parent_id" integer,
	"code" varchar(20) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"icon" varchar(50),
	"order" integer DEFAULT 0
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "maturity_client_frameworks" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"framework_id" varchar(50) NOT NULL,
	"overall_score" integer DEFAULT 0,
	"target_score" integer DEFAULT 0,
	"status" varchar(20) DEFAULT 'not_started',
	"last_assessed_at" timestamp,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "maturity_frameworks" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"version" varchar(20),
	"logo" varchar(255),
	"levels" jsonb NOT NULL,
	"status" "maturity_framework_status" DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "maturity_requirements" (
	"id" serial PRIMARY KEY NOT NULL,
	"framework_id" varchar(50) NOT NULL,
	"category_id" integer NOT NULL,
	"code" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"level" integer NOT NULL,
	"order" integer DEFAULT 0,
	"benefits" text,
	"activities" jsonb DEFAULT '[]'::jsonb
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "maturity_simulations" (
	"id" serial PRIMARY KEY NOT NULL,
	"client_id" integer NOT NULL,
	"framework_id" varchar(50) NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"config" jsonb NOT NULL,
	"results" jsonb,
	"created_at" timestamp DEFAULT now(),
	"created_by" integer
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
CREATE INDEX IF NOT EXISTS "idx_arc_client" ON "access_review_cycles" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_arc_due" ON "access_review_cycles" ("due_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_art_cycle" ON "access_review_tasks" ("cycle_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_art_client" ON "access_review_tasks" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_art_status" ON "access_review_tasks" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_am_conversation" ON "advisor_messages" ("conversation_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_eu_ai_system" ON "ai_eu_ai_act_compliance" ("ai_system_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_eu_ai_client" ON "ai_eu_ai_act_compliance" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_aiia_system" ON "ai_impact_assessments" ("ai_system_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_aisc_system" ON "ai_system_controls" ("ai_system_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_aisc_control" ON "ai_system_controls" ("control_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ais_client" ON "ai_systems" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ai_usage_client" ON "ai_usage_metrics" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ai_usage_provider" ON "ai_usage_metrics" ("provider");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ai_usage_endpoint" ON "ai_usage_metrics" ("endpoint");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ai_usage_created" ON "ai_usage_metrics" ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ar_client_status" ON "approval_requests" ("client_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ar_entity" ON "approval_requests" ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_as_request" ON "approval_signatures" ("request_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_as_signer" ON "approval_signatures" ("signer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_acm_client_asset" ON "asset_cve_matches" ("client_id","asset_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_acm_cve" ON "asset_cve_matches" ("cve_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_acm_status" ON "asset_cve_matches" ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_asvs_client_req" ON "asvs_assessments" ("client_id","requirement_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_asvs_client_status" ON "asvs_assessments" ("client_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_asvs_req_category" ON "asvs_requirements" ("category_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_asvs_req_id" ON "asvs_requirements" ("requirement_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_findings_client" ON "audit_findings" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_findings_status" ON "audit_findings" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_al_client_time" ON "audit_logs" ("client_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bpb_plan_bia" ON "bc_plan_bias" ("plan_id","bia_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bpsc_plan_scen" ON "bc_plan_scenarios" ("plan_id","scenario_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_bps_plan_strat" ON "bc_plan_strategies" ("plan_id","strategy_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_client" ON "certification_audits" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_framework" ON "certification_audits" ("framework_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kev_cve_id" ON "cisa_kev_cache" ("cve_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_clc_client" ON "client_contacts" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cc_client" ON "client_controls" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cc_client_status" ON "client_controls" ("client_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cfc_framework" ON "client_framework_controls" ("framework_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cfm_fw_ctrl" ON "client_framework_mappings" ("framework_control_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cfm_cl_ctrl" ON "client_framework_mappings" ("client_control_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cfm_unique" ON "client_framework_mappings" ("framework_control_id","client_control_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_integration_client" ON "client_integrations" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cp_client" ON "client_policies" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cp_client_status" ON "client_policies" ("client_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comments_entity" ON "comments" ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comments_client" ON "comments" ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_cmn_client_path" ON "company_memory_nodes" ("client_id","path");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cmn_client_parent" ON "company_memory_nodes" ("client_id","parent_path");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cmn_type" ON "company_memory_nodes" ("node_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cmr_source" ON "company_memory_relations" ("source_node_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cmr_target" ON "company_memory_relations" ("target_node_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cmr_client" ON "company_memory_relations" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_comp_req_client" ON "compliance_requirements" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_consent_client" ON "consents" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_consent_subject" ON "consents" ("data_subject_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_consent_status" ON "consents" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cb_baseline" ON "control_baselines" ("framework","baseline");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cb_control" ON "control_baselines" ("control_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cm_source" ON "control_mappings" ("source_control_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cm_target" ON "control_mappings" ("target_control_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_cm_unique" ON "control_mappings" ("source_control_id","target_control_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cpm_policy" ON "control_policy_mappings" ("client_policy_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_cpm_control" ON "control_policy_mappings" ("client_control_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_cpm_unique" ON "control_policy_mappings" ("client_policy_id","client_control_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ctm_control_framework" ON "control_tech_mappings" ("control_code","framework");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ctm_tech" ON "control_tech_mappings" ("tech_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_controls_framework" ON "controls" ("framework");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_controls_client" ON "controls" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_crm_activity_client" ON "crm_activities" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_crm_activity_date" ON "crm_activities" ("occurred_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_crm_contact_client" ON "crm_contacts" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_crm_contact_email" ON "crm_contacts" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_db_client_status" ON "data_breaches" ("client_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_dataflow_client" ON "data_flow_visualizations" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_dataflow_process" ON "data_flow_visualizations" ("process_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_dataflow_source" ON "data_flow_visualizations" ("source_system");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_dataflow_target" ON "data_flow_visualizations" ("target_system");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pdf_process" ON "process_data_flows" ("process_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pdf_asset" ON "process_data_flows" ("asset_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_dpia_client_status" ON "data_protection_impact_assessments" ("client_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_dev_proj_client" ON "dev_projects" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_dsar_client" ON "dsar_requests" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_dsar_status" ON "dsar_requests" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_dsar_email" ON "dsar_requests" ("subject_email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_emb_doctype" ON "embeddings" ("doc_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_emb_docid" ON "embeddings" ("doc_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_emb_client" ON "embeddings" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_training_employee" ON "employee_training_records" ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_training_client" ON "employee_training_records" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_training_framework" ON "employee_training_records" ("framework_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_training_unique" ON "employee_training_records" ("employee_id","framework_id","section_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_er_client_active" ON "escalation_rules" ("client_id","is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_er_trigger" ON "escalation_rules" ("trigger");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_e8_client_control" ON "essential_eight_assessments" ("client_id","control_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ev_client" ON "evidence" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ev_client_status" ON "evidence" ("client_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_evidence_comments_evidence" ON "evidence_comments" ("evidence_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_evidence_comments_user" ON "evidence_comments" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_er_client_status" ON "evidence_requests" ("client_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_er_assignee" ON "evidence_requests" ("assignee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_er_control" ON "evidence_requests" ("client_control_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fed_ctrcts_client" ON "federal_contracts" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fed_inh_client_pkg" ON "federal_inheritances" ("client_id","package_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fkm_source" ON "framework_knowledge_mappings" ("source_requirement_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fkm_target" ON "framework_knowledge_mappings" ("target_type","target_value");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fm_source" ON "framework_mappings_deprecated" ("source_control_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fm_target" ON "framework_mappings_deprecated" ("target_control_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fm_unique" ON "framework_mappings_deprecated" ("source_control_id","target_control_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_req_framework" ON "framework_requirements" ("framework_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_req_phase" ON "framework_requirements" ("phase_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gr_assess_ctrl" ON "gap_responses" ("assessment_id","control_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gc_email" ON "global_contacts" ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gc_status" ON "global_contacts" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gcrm_act_contact" ON "global_crm_activities" ("contact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gcrm_act_type" ON "global_crm_activities" ("type");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_gcrm_contact_tag" ON "global_crm_contact_tags" ("contact_id","tag_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gcrm_deals_contact" ON "global_crm_deals" ("contact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gcrm_deals_stage" ON "global_crm_deals" ("stage");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_gcrm_notes_contact" ON "global_crm_notes" ("contact_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ge_client_entity" ON "governance_events" ("client_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ge_client_created" ON "governance_events" ("client_id","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ge_entity_type" ON "governance_events" ("entity_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_phase_framework" ON "implementation_phases" ("framework_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_impl_plan_client_status" ON "implementation_plans" ("client_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_impl_plan_roadmap" ON "implementation_plans" ("roadmap_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_impl_plan_timeline" ON "implementation_plans" ("planned_start_date","planned_end_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_impl_progress_plan" ON "implementation_progress" ("implementation_plan_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_impl_progress_date" ON "implementation_progress" ("status_change_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_impl_task_plan" ON "implementation_tasks" ("implementation_plan_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_impl_task_assignee" ON "implementation_tasks" ("assignee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_impl_task_status" ON "implementation_tasks" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_incidents_client" ON "incidents" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_incidents_status" ON "incidents" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_intake_client" ON "intake_items" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_intake_status" ON "intake_items" ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_integrations_client_provider" ON "integrations" ("client_id","provider");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_transfer_client" ON "international_transfers" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_transfer_status" ON "international_transfers" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ioc_indicator" ON "ioc_records" ("indicator");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ioc_type" ON "ioc_records" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ioc_reputation" ON "ioc_records" ("reputation");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ioc_client_id" ON "ioc_records" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ioc_status" ON "ioc_records" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_client" ON "knowledge_base_entries" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kb_question" ON "knowledge_base_entries" ("question");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_kri_client" ON "kris" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_learning_sections_framework" ON "learning_sections" ("framework_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_learning_sections_unique" ON "learning_sections" ("framework_id","section_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_nis2_article" ON "nis2_mappings" ("nis2_article");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_nis2_enisa_id" ON "nis2_mappings" ("enisa_measure_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_n80030_ia_client_domain" ON "nist_80030_impact_assessments" ("client_id","domain");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_n80030_te_client" ON "nist_80030_threat_events" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_n80030_te_source" ON "nist_80030_threat_events" ("threat_source_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_n80030_ts_client_type" ON "nist_80030_threat_sources" ("client_id","type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ns_client" ON "notification_settings" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_nvd_cve_id" ON "nvd_cve_cache" ("cve_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oassign_client" ON "onboarding_assignments" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_oassign_employee" ON "onboarding_assignments" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_otmpl_client" ON "onboarding_templates" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pat_user" ON "personal_access_tokens" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_pat_token" ON "personal_access_tokens" ("token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pa_ack_client" ON "policy_acknowledgements" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pa_ack_policy" ON "policy_acknowledgements" ("policy_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pa_ack_user" ON "policy_acknowledgements" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pa_policy" ON "policy_assignments" ("policy_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pa_employee" ON "policy_assignments" ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pe_policy" ON "policy_exceptions" ("policy_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pe_employee" ON "policy_exceptions" ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pe_status" ON "policy_exceptions" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pa_client_type" ON "privacy_assessments" ("client_id","type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pa_client" ON "processing_activities" ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_pa_activity_id" ON "processing_activities" ("activity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pa_status" ON "processing_activities" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_paa_pa" ON "processing_activity_assets" ("processing_activity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_paa_asset" ON "processing_activity_assets" ("asset_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pav_pa" ON "processing_activity_vendors" ("processing_activity_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pav_vendor" ON "processing_activity_vendors" ("vendor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pga_client" ON "program_guide_assignments" ("client_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_pga_unique_step" ON "program_guide_assignments" ("client_id","guide_type","step_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pcm_project" ON "project_compliance_mappings" ("project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pcm_dev_project" ON "project_compliance_mappings" ("dev_project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pt_client_status" ON "project_tasks" ("client_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_pt_assignee" ON "project_tasks" ("assignee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_projects_client" ON "projects" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_qq_questionnaire" ON "questionnaire_questions" ("questionnaire_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_qn_client" ON "questionnaires" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_qn_status" ON "questionnaires" ("status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_qn_vendor_token" ON "questionnaires" ("vendor_token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rm_client_reg_art" ON "regulation_mappings" ("client_id","regulation_id","article_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rt_client_status" ON "remediation_tasks" ("client_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rt_assignee" ON "remediation_tasks" ("assignee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rl_client" ON "report_logs" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rl_type" ON "report_logs" ("report_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_appetite_client" ON "risk_appetite" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ra_client" ON "risk_assessments" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ra_risk" ON "risk_assessments" ("risk_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ra_status" ON "risk_assessments" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ra_next_review" ON "risk_assessments" ("next_review_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ra_client_status" ON "risk_assessments" ("client_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rpm_policy" ON "risk_policy_mappings" ("client_policy_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rpm_risk" ON "risk_policy_mappings" ("risk_assessment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rpm_unique" ON "risk_policy_mappings" ("risk_assessment_id","client_policy_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rsl_risk" ON "risk_scenario_links" ("risk_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rsl_scenario" ON "risk_scenario_links" ("scenario_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rsl_unique" ON "risk_scenario_links" ("risk_id","scenario_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rs_client" ON "risk_scenarios" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rs_client_status" ON "risk_scenarios" ("client_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rsettings_client" ON "risk_settings" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_treatment_scenario" ON "risk_treatments" ("risk_scenario_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_treatment_assessment" ON "risk_treatments" ("risk_assessment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ri_plan_phase" ON "roadmap_items" ("plan_id","phase");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_milestone_roadmap" ON "roadmap_milestones" ("roadmap_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_milestone_target" ON "roadmap_milestones" ("target_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rr_client" ON "roadmap_reports" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rr_roadmap" ON "roadmap_reports" ("roadmap_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_rr_generated_by" ON "roadmap_reports" ("generated_by");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_roadmap_client_status" ON "roadmaps" ("client_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_roadmap_framework" ON "roadmaps" ("framework");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_samm_client_practice" ON "samm_maturity_assessments" ("client_id","practice_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_samm_client_practice_stream" ON "samm_stream_assessments" ("client_id","practice_id","stream_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_samm_practice_stream_level" ON "samm_stream_questions" ("practice_id","stream_id","level");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_strat_rep_client" ON "strategic_reports" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_strat_rep_roadmap" ON "strategic_reports" ("roadmap_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_feedback_status" ON "system_feedback" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_feedback_type" ON "system_feedback" ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ta_client" ON "task_assignments" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ta_task" ON "task_assignments" ("task_type","task_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ta_user" ON "task_assignments" ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_ta_unique" ON "task_assignments" ("task_type","task_id","user_id","raci_role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ts_client" ON "tech_suggestions" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ts_control" ON "tech_suggestions" ("control_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_threat_alert_client" ON "threat_alert_settings" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tm_comp_tm" ON "threat_model_components" ("threat_model_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tm_df_tm" ON "threat_model_data_flows" ("threat_model_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tm_project" ON "threat_models" ("dev_project_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tm_client" ON "threat_models" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_threat_client" ON "threats" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_threat_client_status" ON "threats" ("client_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_training_assignment_client" ON "training_assignments" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_training_assignment_employee" ON "training_assignments" ("employee_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_training_assignment_module" ON "training_assignments" ("module_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_training_module_client" ON "training_modules" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tia_transfer" ON "transfer_impact_assessments" ("transfer_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tc_treatment" ON "treatment_controls" ("treatment_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tc_control" ON "treatment_controls" ("control_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_uc_user" ON "user_clients" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_uc_client" ON "user_clients" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_var_client_vendor" ON "vendor_assessment_requests" ("client_id","vendor_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_var_token" ON "vendor_assessment_requests" ("token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_var_status" ON "vendor_assessment_requests" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_vat_client" ON "vendor_assessment_templates" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_assessment_vendor" ON "vendor_assessments" ("vendor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_assessment_client" ON "vendor_assessments" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_va_client_vendor" ON "vendor_authorizations" ("client_id","vendor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_breach_vendor" ON "vendor_breaches" ("vendor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_vcl_client_vendor" ON "vendor_change_logs" ("client_id","vendor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contact_vendor" ON "vendor_contacts" ("vendor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_contract_vendor" ON "vendor_contracts" ("vendor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_vendor_cve" ON "vendor_cve_matches" ("vendor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_vendor_cve_id" ON "vendor_cve_matches" ("cve_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_vdr_client_vendor" ON "vendor_data_requests" ("client_id","vendor_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_vdr_token" ON "vendor_data_requests" ("token");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_vdpa_client_vendor" ON "vendor_dpas" ("client_id","vendor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_vendor_request_client" ON "vendor_requests" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_vendor_request_status" ON "vendor_requests" ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_scan_vendor" ON "vendor_scans" ("vendor_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_vendor_client" ON "vendors" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_vuln_client" ON "vulnerabilities" ("client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_vuln_client_status" ON "vulnerabilities" ("client_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_wi_client_status" ON "work_items" ("client_id","status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_wi_assigned_user" ON "work_items" ("assigned_to_user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_wi_due_date" ON "work_items" ("due_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_wi_entity" ON "work_items" ("entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_maturity_client_framework_req" ON "maturity_assessments" ("client_id","framework_id","requirement_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_maturity_client_framework" ON "maturity_client_frameworks" ("client_id","framework_id");--> statement-breakpoint
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
DO $$ BEGIN
 ALTER TABLE "ai_eu_ai_act_compliance" ADD CONSTRAINT "ai_eu_ai_act_compliance_ai_system_id_ai_systems_id_fk" FOREIGN KEY ("ai_system_id") REFERENCES "ai_systems"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "certification_audits" ADD CONSTRAINT "certification_audits_framework_id_compliance_frameworks_id_fk" FOREIGN KEY ("framework_id") REFERENCES "compliance_frameworks"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "compliance_certificates" ADD CONSTRAINT "compliance_certificates_framework_id_compliance_frameworks_id_fk" FOREIGN KEY ("framework_id") REFERENCES "compliance_frameworks"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "compliance_certificates" ADD CONSTRAINT "compliance_certificates_audit_id_certification_audits_id_fk" FOREIGN KEY ("audit_id") REFERENCES "certification_audits"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "data_flow_connections" ADD CONSTRAINT "data_flow_connections_flow_id_data_flow_visualizations_id_fk" FOREIGN KEY ("flow_id") REFERENCES "data_flow_visualizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "data_flow_connections" ADD CONSTRAINT "data_flow_connections_source_node_id_data_flow_nodes_id_fk" FOREIGN KEY ("source_node_id") REFERENCES "data_flow_nodes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "data_flow_connections" ADD CONSTRAINT "data_flow_connections_target_node_id_data_flow_nodes_id_fk" FOREIGN KEY ("target_node_id") REFERENCES "data_flow_nodes"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "data_flow_nodes" ADD CONSTRAINT "data_flow_nodes_flow_id_data_flow_visualizations_id_fk" FOREIGN KEY ("flow_id") REFERENCES "data_flow_visualizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "email_triggers" ADD CONSTRAINT "email_triggers_template_id_email_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "email_templates"("id") ON DELETE no action ON UPDATE no action;
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
 ALTER TABLE "framework_mappings" ADD CONSTRAINT "framework_mappings_common_control_id_common_controls_id_fk" FOREIGN KEY ("common_control_id") REFERENCES "common_controls"("id") ON DELETE no action ON UPDATE no action;
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
 ALTER TABLE "llm_router_rules" ADD CONSTRAINT "llm_router_rules_provider_id_llm_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "llm_providers"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "processing_activities" ADD CONSTRAINT "processing_activities_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "processing_activities" ADD CONSTRAINT "processing_activities_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "processing_activity_assets" ADD CONSTRAINT "processing_activity_assets_processing_activity_id_processing_activities_id_fk" FOREIGN KEY ("processing_activity_id") REFERENCES "processing_activities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "processing_activity_assets" ADD CONSTRAINT "processing_activity_assets_asset_id_assets_id_fk" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "processing_activity_vendors" ADD CONSTRAINT "processing_activity_vendors_processing_activity_id_processing_activities_id_fk" FOREIGN KEY ("processing_activity_id") REFERENCES "processing_activities"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "processing_activity_vendors" ADD CONSTRAINT "processing_activity_vendors_vendor_id_vendors_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "questionnaire_questions" ADD CONSTRAINT "questionnaire_questions_questionnaire_id_questionnaires_id_fk" FOREIGN KEY ("questionnaire_id") REFERENCES "questionnaires"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "questionnaire_questions" ADD CONSTRAINT "questionnaire_questions_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
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
