
import "dotenv/config";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

async function createTable() {
    const db = await getDb();
    console.log("Creating roadmap_reports table...");

    // Manual SQL to create table and avoiding Drizzle kit interactivity
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "roadmap_reports" (
            "id" serial PRIMARY KEY NOT NULL,
            "roadmap_id" integer,
            "client_id" integer NOT NULL,
            "title" varchar(500) NOT NULL,
            "version" varchar(50) DEFAULT 'draft',
            "included_sections" jsonb,
            "data_sources" jsonb,
            "branding" jsonb,
            "file_path" text,
            "file_size" integer,
            "generated_at" timestamp DEFAULT now(),
            "generated_by" integer,
            "updated_at" timestamp DEFAULT now()
        );
    `);

    console.log("Table created successfully.");

    // Verify creation
    const result = await db.execute(sql`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'roadmap_reports';
    `);

    console.log("Columns:", result);
}

createTable().catch(console.error);
