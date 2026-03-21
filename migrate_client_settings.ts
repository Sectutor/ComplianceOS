import { getDb } from "./packages/core/src/db";
import { sql } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config();

async function run() {
    try {
        const db = await getDb();
        console.log("Connected to DB");

        console.log("Creating client_settings table...");
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS client_settings (
                id SERIAL PRIMARY KEY,
                client_id INTEGER NOT NULL UNIQUE,
                branding_overrides JSONB,
                feature_flags JSONB,
                custom_settings JSONB,
                version INTEGER DEFAULT 1,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log("Creating indexes...");
        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_client_settings_client_id ON client_settings(client_id);`);
        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_client_settings_version ON client_settings(version);`);

        console.log("Migration complete: client_settings table ready.");
        process.exit(0);
    } catch (err) {
        console.error("Migration error:", err);
        process.exit(1);
    }
}

run();
