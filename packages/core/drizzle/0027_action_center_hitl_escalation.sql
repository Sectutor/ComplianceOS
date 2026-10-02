-- Migration 0027: Action Center HITL, Escalation Matrix, and Audit History

-- 1. Extend autopilot_actions table
ALTER TABLE "autopilot_actions" 
  ADD COLUMN IF NOT EXISTS "assigned_to_user_id" integer,
  ADD COLUMN IF NOT EXISTS "assigned_to_employee_id" integer,
  ADD COLUMN IF NOT EXISTS "assigned_agent" varchar(50),
  ADD COLUMN IF NOT EXISTS "reviewer_user_id" integer,
  ADD COLUMN IF NOT EXISTS "delegated_by_user_id" integer,
  ADD COLUMN IF NOT EXISTS "escalation_level" integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "escalated_to_role" varchar(50),
  ADD COLUMN IF NOT EXISTS "escalated_to_name" varchar(255),
  ADD COLUMN IF NOT EXISTS "escalated_at" timestamp,
  ADD COLUMN IF NOT EXISTS "escalation_reason" text,
  ADD COLUMN IF NOT EXISTS "due_at" timestamp,
  ADD COLUMN IF NOT EXISTS "sla_breach_at" timestamp,
  ADD COLUMN IF NOT EXISTS "risk_accepted_until" timestamp,
  ADD COLUMN IF NOT EXISTS "risk_acceptance_rationale" text,
  ADD COLUMN IF NOT EXISTS "compensating_controls" text,
  ADD COLUMN IF NOT EXISTS "incident_id" integer;

-- 2. Create autopilot_action_history table for immutable audit trails
CREATE TABLE IF NOT EXISTS "autopilot_action_history" (
  "id" serial PRIMARY KEY,
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

CREATE INDEX IF NOT EXISTS "idx_ap_history_action" ON "autopilot_action_history" ("action_id");
CREATE INDEX IF NOT EXISTS "idx_ap_history_client" ON "autopilot_action_history" ("client_id");
