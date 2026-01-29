
import "dotenv/config";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("🛠️  Manually creating implementation_templates table...");
    const db = await getDb();

    await db.execute(sql`
        CREATE TABLE IF NOT EXISTS implementation_templates (
            id SERIAL PRIMARY KEY,
            client_id INTEGER,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            estimated_hours INTEGER DEFAULT 0,
            priority VARCHAR(50) DEFAULT 'medium',
            category VARCHAR(100),
            tasks JSONB DEFAULT '[]'::jsonb,
            risk_mitigation_focus JSONB DEFAULT '[]'::jsonb,
            is_system BOOLEAN DEFAULT false,
            created_by_id INTEGER,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
    `);

    console.log("✅ Table created or already exists.");
    process.exit(0);
}

main().catch(console.error);
