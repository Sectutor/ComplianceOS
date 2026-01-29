
import { config } from "dotenv";
config();
import { getDb } from "../db";
import { sql } from "drizzle-orm";

async function checkTable() {
    const db = await getDb();
    try {
        const result = await db.execute(sql`SELECT count(*) FROM vendor_dpas`);
        console.log("vendor_dpas table exists");
    } catch (e) {
        console.log("vendor_dpas table does NOT exist or error:", e.message);
    }
    process.exit(0);
}

checkTable();
