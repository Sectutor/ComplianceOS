import * as dotenv from "dotenv";
dotenv.config();
import { getDb } from "./db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Attempting to create vendor_breaches table manually...");

    try {
        const db = await getDb();
        await db.execute(sql`
      CREATE TABLE IF NOT EXISTS vendor_breaches (
        id SERIAL PRIMARY KEY,
        vendor_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        breach_date TIMESTAMP,
        affected_count INTEGER,
        data_classes JSON DEFAULT '[]'::json,
        risk_score INTEGER,
        source TEXT,
        is_verified BOOLEAN DEFAULT false,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
        console.log("Successfully created vendor_breaches table.");
    } catch (error) {
        console.error("Error creating table:", error);
        process.exit(1);
    }

    process.exit(0);
}

main();
