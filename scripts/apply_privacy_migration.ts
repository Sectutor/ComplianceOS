
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { sql } from "drizzle-orm";
import * as schema from "../schema";
import dotenv from "dotenv";

dotenv.config();

// Use ENV var or default local connection string
const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/compliance_os";

const client = postgres(connectionString);
const db = drizzle(client, { schema });

async function main() {
	console.log("Applying Privacy Migration...");

	try {
		await db.execute(sql`
            CREATE TABLE IF NOT EXISTS "policy_assignments" (
                "id" serial PRIMARY KEY NOT NULL,
                "policy_id" integer NOT NULL,
                "employee_id" integer NOT NULL,
                "status" varchar(50) DEFAULT 'pending',
                "attested_at" timestamp,
                "assigned_at" timestamp DEFAULT now(),
                "viewed_at" timestamp
            );
            
            CREATE TABLE IF NOT EXISTS "policy_exceptions" (
                "id" serial PRIMARY KEY NOT NULL,
                "policy_id" integer NOT NULL,
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
            
            CREATE INDEX IF NOT EXISTS "idx_pa_policy" ON "policy_assignments" ("policy_id");
            CREATE INDEX IF NOT EXISTS "idx_pa_employee" ON "policy_assignments" ("employee_id");
            CREATE INDEX IF NOT EXISTS "idx_pe_policy" ON "policy_exceptions" ("policy_id");
            CREATE INDEX IF NOT EXISTS "idx_pe_employee" ON "policy_exceptions" ("employee_id");
            CREATE INDEX IF NOT EXISTS "idx_pe_status" ON "policy_exceptions" ("status");
            CREATE INDEX IF NOT EXISTS "idx_pa_client_type" ON "privacy_assessments" ("client_id","type");
            CREATE INDEX IF NOT EXISTS "idx_var_client_vendor" ON "vendor_assessment_requests" ("client_id","vendor_id");
            CREATE INDEX IF NOT EXISTS "idx_var_token" ON "vendor_assessment_requests" ("token");
            CREATE INDEX IF NOT EXISTS "idx_var_status" ON "vendor_assessment_requests" ("status");
            CREATE INDEX IF NOT EXISTS "idx_vat_client" ON "vendor_assessment_templates" ("client_id");
        `);

		console.log("Migration applied successfully.");
	} catch (e) {
		console.error("Migration failed:", e);
	} finally {
		await client.end();
	}
}

main();
