
import { getDb } from "../packages/core/src/db";
import dotenv from "dotenv";
import { sql } from "drizzle-orm";

dotenv.config();

async function main() {
    console.log("🛠️ Attempting to manually add parent_id column to maturity_categories...");
    const db = await getDb();

    try {
        // We use sql template literal for raw SQL
        await db.execute(sql`
            ALTER TABLE maturity_categories 
            ADD COLUMN IF NOT EXISTS parent_id INTEGER;
        `);
        console.log("✅ Successfully added parent_id column!");
    } catch (error) {
        console.error("❌ Failed to add column:", error);
    }

    process.exit(0);
}

main().catch(console.error);
