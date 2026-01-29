
import "dotenv/config";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("🛠️  Manually fixing missing implementation_tasks columns...");
    const db = await getDb();

    try {
        await db.execute(sql`ALTER TABLE "implementation_tasks" ADD COLUMN IF NOT EXISTS "pdca" varchar(20)`);
        console.log("✅ Added 'pdca' column.");
    } catch (e) {
        console.error("Error adding pdca:", e);
    }

    try {
        await db.execute(sql`ALTER TABLE "implementation_tasks" ADD COLUMN IF NOT EXISTS "nist" varchar(50)`);
        console.log("✅ Added 'nist' column.");
    } catch (e) {
        console.error("Error adding nist:", e);
    }

    console.log("🏁 Manual fix complete.");
    process.exit(0);
}

main().catch(console.error);
