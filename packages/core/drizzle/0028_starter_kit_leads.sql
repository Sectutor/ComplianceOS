-- Migration 0028: ISO 27001 Starter Kit lead capture (public landing page form)
CREATE TABLE IF NOT EXISTS "starter_kit_leads" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"name" varchar(120) NOT NULL,
	"company" varchar(160) NOT NULL,
	"role" varchar(60),
	"consent_text" text,
	"consent_at" timestamp NOT NULL,
	"consent_ip" varchar(64),
	"user_agent" varchar(300),
	"source" varchar(80),
	"utm_source" varchar(120),
	"utm_medium" varchar(120),
	"utm_campaign" varchar(120),
	"request_count" integer DEFAULT 1 NOT NULL,
	"email_sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_requested_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "starter_kit_leads_email_uq" ON "starter_kit_leads" USING btree ("email");
