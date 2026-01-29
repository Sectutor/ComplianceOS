
import "dotenv/config";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("🛠️  Updating kanban_status enum to include 'backlog'...");
    const db = await getDb();

    try {
        // Postgres syntax to add value to enum
        // Note: This cannot be run in a transaction block in some PG versions, 
        // but Drizzle execute usually handles it if not explicitly wrapped.
        await db.execute(sql`ALTER TYPE kanban_status ADD VALUE IF NOT EXISTS 'backlog'`);
        console.log("✅ Enum updated successfully.");
    } catch (e: any) {
        if (e.message.includes("already exists")) {
            console.log("⏭️  Value 'backlog' already exists in enum.");
        } else {
            console.error("💥 Error updating enum:", e);
        }
    }

    process.exit(0);
}

main().catch(console.error);
