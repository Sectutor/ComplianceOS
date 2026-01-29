
import dotenv from "dotenv";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

dotenv.config();

async function migrate() {
    console.log("Starting International Transfers migration...");
    const db = await getDb();

    // 1. Create Enums
    console.log("Creating enums...");
    await db.execute(sql`
        DO $$ BEGIN
            CREATE TYPE international_transfer_status AS ENUM ('pending', 'active', 'expired', 'risk_flagged');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    `);

    await db.execute(sql`
        DO $$ BEGIN
            CREATE TYPE transfer_tool AS ENUM ('scc_2021', 'bcr', 'adequacy', 'derogation', 'ad_hoc');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    `);

    await db.execute(sql`
        DO $$ BEGIN
            CREATE TYPE scc_module AS ENUM ('c2c', 'c2p', 'p2p', 'p2c');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    `);

    // 2. Create Tables
    console.log("Creating tables...");

    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS adequacy_decisions (
            id SERIAL PRIMARY KEY,
            country_code VARCHAR(2) NOT NULL UNIQUE,
            country_name VARCHAR(255) NOT NULL,
            status VARCHAR(50) DEFAULT 'adequate',
            scope TEXT,
            decision_url TEXT,
            last_updated_at TIMESTAMP DEFAULT NOW()
        );
    `);

    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS international_transfers (
            id SERIAL PRIMARY KEY,
            client_id INTEGER NOT NULL,
            activity_id INTEGER,
            vendor_id INTEGER,
            title VARCHAR(255) NOT NULL,
            destination_country_code VARCHAR(2) NOT NULL,
            transfer_tool transfer_tool NOT NULL,
            scc_module scc_module,
            status international_transfer_status DEFAULT 'pending',
            next_review_date TIMESTAMP,
            updated_at TIMESTAMP DEFAULT NOW(),
            created_at TIMESTAMP DEFAULT NOW()
        );
    `);

    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS transfer_impact_assessments (
            id SERIAL PRIMARY KEY,
            client_id INTEGER NOT NULL,
            transfer_id INTEGER NOT NULL,
            risk_level VARCHAR(50),
            status VARCHAR(50) DEFAULT 'draft',
            questionnaire_data JSONB,
            version INTEGER DEFAULT 1,
            updated_at TIMESTAMP DEFAULT NOW(),
            created_at TIMESTAMP DEFAULT NOW()
        );
    `);

    // 3. Create Indexes
    console.log("Creating indexes...");
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_transfer_client ON international_transfers(client_id)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_transfer_status ON international_transfers(status)`);
    await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_tia_transfer ON transfer_impact_assessments(transfer_id)`);

    console.log("Migration complete!");
    process.exit(0);
}

migrate().catch(err => {
    console.error("Migration failed:", err);
    process.exit(1);
});
