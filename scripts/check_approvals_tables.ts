import 'dotenv/config';
import { getDb } from "../db";
import { sql } from "drizzle-orm";

async function checkTables() {
    const db = await getDb();
    if (!db) {
        console.error("No DB connection");
        return;
    }

    try {
        const result = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('approval_requests', 'approval_signatures');
    `);

        console.log("Found tables:", result.map(r => r.table_name));
    } catch (error) {
        console.error("Error checking tables:", error);
    }
}

checkTables();
