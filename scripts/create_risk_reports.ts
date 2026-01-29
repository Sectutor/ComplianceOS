
import "dotenv/config";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Starting migration...");
    const db = await getDb();
    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS risk_reports (
            id SERIAL PRIMARY KEY,
            client_id INTEGER NOT NULL,
            title VARCHAR(255) DEFAULT 'Risk Management Report',
            executive_summary TEXT,
            introduction TEXT,
            scope TEXT,
            methodology TEXT,
            key_findings TEXT,
            recommendations TEXT,
            conclusion TEXT,
            assumptions TEXT,
            "references" TEXT,
            status VARCHAR(50) DEFAULT 'draft',
            version INTEGER DEFAULT 1,
            updated_at TIMESTAMP DEFAULT NOW(),
            created_at TIMESTAMP DEFAULT NOW()
        );
    `);
    console.log("Migration complete: risk_reports table created.");
    process.exit(0);
}

main().catch(err => {
    console.error("Migration failed:", err);
    process.exit(1);
});
