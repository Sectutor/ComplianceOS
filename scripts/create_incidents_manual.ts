import { Client } from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
});

async function main() {
    await client.connect();
    try {
        console.log('Creating types...');
        await client.query(`
      DO $$ BEGIN
        CREATE TYPE "incident_severity" AS ENUM('low', 'medium', 'high', 'critical');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
        await client.query(`
      DO $$ BEGIN
        CREATE TYPE "incident_status" AS ENUM('open', 'investigating', 'mitigated', 'resolved', 'reported');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

        console.log('Creating incidents table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS "incidents" (
        "id" serial PRIMARY KEY NOT NULL,
        "client_id" integer NOT NULL,
        "title" varchar(255) DEFAULT 'Untitled Incident' NOT NULL,
        "detected_at" timestamp,
        "severity" "incident_severity" DEFAULT 'low',
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
    `);

        console.log('Creating indexes...');
        await client.query(`CREATE INDEX IF NOT EXISTS "idx_incidents_client" ON "incidents" ("client_id");`);
        await client.query(`CREATE INDEX IF NOT EXISTS "idx_incidents_status" ON "incidents" ("status");`);

        console.log('Incidents table created successfully.');
    } catch (err) {
        console.error('Error creating table:', err);
    } finally {
        await client.end();
    }
}

main();
