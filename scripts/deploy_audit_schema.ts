
import "dotenv/config";
import { getDb } from '../packages/core/src/db';
import { sql } from 'drizzle-orm';

async function main() {
    console.log("Starting Manual Schema Deployment...");
    const db = await getDb();

    try {
        // 1. Create Enums
        console.log("Creating Enums...");
        await db.execute(sql`
            DO $$ BEGIN
                CREATE TYPE finding_severity AS ENUM ('low', 'medium', 'high', 'critical');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);
        
        await db.execute(sql`
            DO $$ BEGIN
                CREATE TYPE finding_status AS ENUM ('open', 'remediated', 'accepted', 'closed');
            EXCEPTION
                WHEN duplicate_object THEN null;
            END $$;
        `);

        // 2. Create Table
        console.log("Creating audit_findings Table...");
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS audit_findings (
                id SERIAL PRIMARY KEY,
                client_id INTEGER NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                severity finding_severity DEFAULT 'medium',
                status finding_status DEFAULT 'open',
                evidence_id INTEGER,
                author_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        
        // 3. Create Indices
        console.log("Creating Indices...");
        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_findings_client ON audit_findings (client_id);`);
        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_findings_status ON audit_findings (status);`);

        // 4. Create Evidence Comments (just in case)
        console.log("Ensuring evidence_comments Table...");
        await db.execute(sql`
           CREATE TABLE IF NOT EXISTS evidence_comments (
                id SERIAL PRIMARY KEY,
                evidence_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        console.log("✅ Schema deployed successfully.");
    } catch (e) {
        console.error("❌ Schema deployment failed:", e);
    }
    process.exit(0);
}

main();
