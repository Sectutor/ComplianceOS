import 'dotenv/config';
import { getDb } from '../db';
import { sql } from 'drizzle-orm';

async function addMissingAssetColumns() {
    console.log('Starting targeted migration for assets table...');
    const db = await getDb();

    const alterStatements = [
        sql`ALTER TABLE assets ADD COLUMN IF NOT EXISTS category VARCHAR(100)`,
        sql`ALTER TABLE assets ADD COLUMN IF NOT EXISTS criticality VARCHAR(50)`,
        sql`ALTER TABLE assets ADD COLUMN IF NOT EXISTS ip_address VARCHAR(50)`,
        sql`ALTER TABLE assets ADD COLUMN IF NOT EXISTS mac_address VARCHAR(50)`,
        sql`ALTER TABLE assets ADD COLUMN IF NOT EXISTS os VARCHAR(100)`,
        sql`ALTER TABLE assets ADD COLUMN IF NOT EXISTS custom_fields JSONB`,
        sql`ALTER TABLE assets ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb`,
    ];

    for (const stmt of alterStatements) {
        try {
            await db.execute(stmt);
            console.log(`✅ Statement executed.`);
        } catch (error: any) {
            console.error(`❌ Failed:`, error.message);
        }
    }

    console.log('Migration complete.');
    process.exit(0);
}

addMissingAssetColumns().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
