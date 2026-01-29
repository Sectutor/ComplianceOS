
import { getDb } from '../db.ts';
import { sql } from 'drizzle-orm';
import 'dotenv/config';

async function fix() {
    const db = await getDb();
    console.log("Creating federal tables...");

    try {
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS "federal_ssps" (
                "id" SERIAL PRIMARY KEY,
                "client_id" INTEGER NOT NULL,
                "title" VARCHAR(255) NOT NULL,
                "framework" VARCHAR(50) NOT NULL,
                "system_name" VARCHAR(255),
                "system_type" VARCHAR(255),
                "boundary_description" TEXT,
                "responsible_role" VARCHAR(255),
                "status" VARCHAR(50) DEFAULT 'draft',
                "version" INTEGER DEFAULT 1,
                "updated_at" TIMESTAMP DEFAULT NOW(),
                "created_at" TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log("Created federal_ssps");

        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS "federal_sars" (
                "id" SERIAL PRIMARY KEY,
                "client_id" INTEGER NOT NULL,
                "ssp_id" INTEGER,
                "title" VARCHAR(255) NOT NULL,
                "assessor_name" VARCHAR(255),
                "assessment_date" TIMESTAMP,
                "summary_of_findings" TEXT,
                "risk_executive_summary" TEXT,
                "status" VARCHAR(50) DEFAULT 'draft',
                "updated_at" TIMESTAMP DEFAULT NOW(),
                "created_at" TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log("Created federal_sars");

        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS "fips_categorizations" (
                "id" SERIAL PRIMARY KEY,
                "client_id" INTEGER NOT NULL,
                "system_name" VARCHAR(255),
                "information_types" JSONB,
                "confidentiality_impact" VARCHAR(20),
                "integrity_impact" VARCHAR(20),
                "availability_impact" VARCHAR(20),
                "high_water_mark" VARCHAR(20),
                "status" VARCHAR(50) DEFAULT 'draft',
                "updated_at" TIMESTAMP DEFAULT NOW(),
                "created_at" TIMESTAMP DEFAULT NOW(),
                UNIQUE("client_id")
            );
        `);
        console.log("Created fips_categorizations");

        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS "federal_poams" (
                "id" SERIAL PRIMARY KEY,
                "client_id" INTEGER NOT NULL,
                "title" VARCHAR(255) NOT NULL,
                "source_ssp_id" INTEGER,
                "status" VARCHAR(50) DEFAULT 'active',
                "updated_at" TIMESTAMP DEFAULT NOW(),
                "created_at" TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log("Created federal_poams");

        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS "poam_items" (
                "id" SERIAL PRIMARY KEY,
                "poam_id" INTEGER NOT NULL,
                "control_id" VARCHAR(100),
                "weakness_name" VARCHAR(500),
                "weakness_description" TEXT,
                "point_of_contact" VARCHAR(255),
                "resources_required" TEXT,
                "scheduled_completion_date" TIMESTAMP,
                "milestones" JSONB,
                "status" VARCHAR(50) DEFAULT 'open',
                "updated_at" TIMESTAMP DEFAULT NOW(),
                "created_at" TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log("Created poam_items");

        console.log("All federal tables ensured.");
    } catch (err) {
        console.error("Error creating tables:", err);
    }
    process.exit(0);
}

fix();
