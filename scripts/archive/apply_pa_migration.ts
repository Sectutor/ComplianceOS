
import "dotenv/config";
import { getDb } from "./db";
import { sql } from "drizzle-orm";

async function main() {
    const db = await getDb();
    console.log("Creating privacy_assessments table...");

    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS privacy_assessments (
            id SERIAL PRIMARY KEY,
            client_id INTEGER NOT NULL,
            type VARCHAR(50) NOT NULL,
            status VARCHAR(50) DEFAULT 'not_started',
            responses JSONB,
            score INTEGER,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
    `);

    console.log("privacy_assessments table created successfully.");
    process.exit(0);
}

main().catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
});
