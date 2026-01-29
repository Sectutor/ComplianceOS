
import "dotenv/config";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

async function inspect() {
    const db = await getDb();
    console.log("Inspecting roadmap_items columns...");

    const result = await db.execute(sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'roadmap_reports';
    `);

    console.log(result);
}

inspect().catch(console.error);
