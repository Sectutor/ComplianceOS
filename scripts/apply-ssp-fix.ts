import { config } from "dotenv";
config();
import { sql } from "drizzle-orm";
import { getDb, closeDb } from "../db";

async function main() {
    console.log("Applying SSP schema fix...");
    try {
        const db = await getDb();
        console.log("Connected to database.");

        await db.execute(sql`ALTER TABLE federal_ssps ADD COLUMN IF NOT EXISTS content TEXT;`);
        console.log("Column 'content' added to 'federal_ssps' table.");

    } catch (error) {
        console.error("Failed to apply fix:", error);
    } finally {
        await closeDb();
        console.log("Database connection closed.");
    }
}

main();
