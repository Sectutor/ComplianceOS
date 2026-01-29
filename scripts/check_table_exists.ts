
import 'dotenv/config';
import { getDb } from "../db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Checking tables...");
    try {
        const db = await getDb();
        const res = await db.execute(sql`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'framework_mappings';
        `);

        if (res.length > 0) {
            console.log("✅ Table 'framework_mappings' EXISTS.");
        } else {
            console.log("❌ Table 'framework_mappings' DOES NOT EXIST.");
        }
    } catch (e) {
        console.error("Error checking tables:", e);
    }
    process.exit(0);
}

main();
