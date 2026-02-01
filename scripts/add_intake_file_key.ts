
import 'dotenv/config';
import { getDb } from "../packages/core/src/db";
import { sql } from "drizzle-orm";

async function runMigration() {
    console.log("Starting migration...");
    const db = await getDb();

    try {
        await db.execute(sql`
            ALTER TABLE intake_items 
            ADD COLUMN IF NOT EXISTS file_key VARCHAR(500);
        `);
        console.log("Migration successful: Added file_key to intake_items.");
    } catch (e) {
        console.error("Migration failed:", e);
    }
    process.exit(0);
}

runMigration();
