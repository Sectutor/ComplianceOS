
import 'dotenv/config';
import { getDb } from '../src/db';
import { sql } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { join } from 'path';

async function main() {
    console.log("🚀 Applying migration 0011_milky_plazm.sql...");
    const db = await getDb();

    // Assuming running from packages/core
    const migrationPath = join(process.cwd(), 'drizzle/0011_milky_plazm.sql');
    console.log(`Reading migration from: ${migrationPath}`);

    try {
        const migrationSQL = readFileSync(migrationPath, 'utf-8');
        // Split by '--> statement-breakpoint'
        const statements = migrationSQL.split('--> statement-breakpoint');

        console.log(`Found ${statements.length} statements.`);

        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i].trim();
            if (!stmt) continue;

            // console.log(`[${i+1}] Executing: ${stmt.substring(0, 50).replace(/\n/g, ' ')}...`);

            try {
                await db.execute(sql.raw(stmt));
            } catch (e: any) {
                // Ignore "already exists" errors common in idempotent runs
                if (e.message.includes("already exists") || e.message.includes("duplicate column")) {
                    // console.log(`   ⚠️ Skipped (already exists)`);
                } else {
                    console.warn(`   ❌ Error executing statement: ${stmt.substring(0, 100)}...`);
                    console.warn(`      Msg: ${e.message}`);
                }
            }
        }
        console.log("✅ Migration application finished.");
    } catch (e) {
        console.error("❌ Fatal error:", e);
        process.exit(1);
    }
    process.exit(0);
}

main();
