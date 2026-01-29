
import 'dotenv/config';
import { getDb } from "../db";
import { sql } from "drizzle-orm";

async function forceCreate() {
    const db = await getDb();
    if (!db) {
        console.error("No valid DB connection");
        process.exit(1);
    }

    console.log("Force creating approvals tables...");

    try {
        // 1. Enum
        await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

        // 2. approval_requests
        await db.execute(sql`
      CREATE TABLE IF NOT EXISTS approval_requests (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        entity_type VARCHAR(50) NOT NULL,
        entity_id INTEGER NOT NULL,
        status approval_status DEFAULT 'pending',
        submitter_id INTEGER,
        submitted_at TIMESTAMP DEFAULT NOW(),
        required_roles JSON,
        updated_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

        // 3. approval_signatures
        await db.execute(sql`
      CREATE TABLE IF NOT EXISTS approval_signatures (
        id SERIAL PRIMARY KEY,
        request_id INTEGER NOT NULL,
        signer_id INTEGER NOT NULL,
        signer_role VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'signed',
        comment TEXT,
        signature_data TEXT,
        signed_at TIMESTAMP DEFAULT NOW()
      );
    `);

        console.log("Tables created successfully.");
    } catch (err) {
        console.error("Error creating tables:", err);
    }
    process.exit(0);
}

forceCreate();
