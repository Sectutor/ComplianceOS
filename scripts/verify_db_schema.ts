
import "dotenv/config";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("🔍 Checking Database Schema State...");
    const db = await getDb();

    // Check implementation_tasks columns
    try {
        const result: any = await db.execute(sql`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'implementation_tasks'
        `);
        const rows = result.rows || result;
        console.log("Implementation Tasks Columns:");
        console.log(JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error("Error checking columns:", e);
    }

    // Check kanban_status enum values
    try {
        const result: any = await db.execute(sql`
            SELECT enumlabel 
            FROM pg_enum 
            JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
            WHERE pg_type.typname = 'kanban_status'
        `);
        const rows = result.rows || result;
        console.log("Kanban Status Enum Values:");
        console.log(JSON.stringify(rows, null, 2));
    } catch (e) {
        console.error("Error checking enum:", e);
    }

    process.exit(0);
}

main().catch(console.error);
