
import 'dotenv/config';
import { getDb } from '../db';
import { sql } from 'drizzle-orm';

async function main() {
    console.log("Applying Asset Privacy Columns Migration...");
    const db = await getDb();

    // Use raw SQL to add columns. Using IF NOT EXISTS to be safe.
    const columns = [
        `ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "is_personal_data" boolean DEFAULT false`,
        `ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "data_sensitivity" varchar(50)`,
        `ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "data_format" varchar(50)`,
        `ALTER TABLE "assets" ADD COLUMN IF NOT EXISTS "data_owner" varchar(255)`
    ];

    for (const stmt of columns) {
        try {
            await db.execute(sql.raw(stmt));
            console.log(`Executed: ${stmt}`);
        } catch (e: any) {
            console.log(`Skipped/Failed (${stmt}): ${e.message}`);
        }
    }

    console.log("Assets Migration Complete.");
    process.exit(0);
}

main().catch((e) => {
    console.error("Migration fatal error:", e);
    process.exit(1);
});
