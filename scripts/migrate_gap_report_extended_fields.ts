
import { getDb } from "../db";
import { sql } from "drizzle-orm";

async function migrate() {
    const db = await getDb();
    console.log("Adding methodology, assumptions, and references to gap_assessments...");

    // Using "references" in quotes just in case, though likely fine in Postgres unless reserved contextual.
    // methodology and assumptions are safe.
    await db.execute(sql`
        ALTER TABLE gap_assessments 
        ADD COLUMN IF NOT EXISTS methodology text,
        ADD COLUMN IF NOT EXISTS assumptions text,
        ADD COLUMN IF NOT EXISTS "references" text;
    `);

    console.log("Migration complete.");
    process.exit(0);
}

migrate().catch(console.error);
