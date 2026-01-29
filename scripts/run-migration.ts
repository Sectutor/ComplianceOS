/**
 * Run pgvector migration programmatically
 * Usage: npx tsx scripts/run-migration.ts
 */

import 'dotenv/config';
import { getDb } from '../db';
import { sql } from 'drizzle-orm';
import { readFileSync } from 'fs';
import { join } from 'path';

async function runMigration() {
    console.log('🚀 Running pgvector migration...\n');

    try {
        const db = await getDb();
        if (!db) {
            throw new Error('Database connection failed');
        }

        // Read migration file
        const migrationPath = join(process.cwd(), 'migrations/001_add_pgvector.sql');
        const migrationSQL = readFileSync(migrationPath, 'utf-8');

        // Split by semicolons and execute each statement
        const statements = migrationSQL
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        console.log(`Found ${statements.length} SQL statements to execute\n`);

        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];

            // Do not skip comments, postgres handles them
            // if (stmt.startsWith('--')) continue;

            console.log(`[${i + 1}/${statements.length}] Executing: ${stmt.substring(0, 50)}...`);

            try {
                await db.execute(sql.raw(stmt));
                console.log('✅ Success\n');
            } catch (error: any) {
                // Some errors are expected (e.g., "already exists")
                if (error.message.includes('already exists')) {
                    console.log('⚠️  Already exists (skipping)\n');
                } else if (stmt.toUpperCase().startsWith('COMMENT')) {
                    console.log('⚠️  Comment error (skipping):', error.message, '\n');
                } else {
                    console.error('❌ Error executing statement:', stmt.substring(0, 50) + '...');
                    console.error('❌ Error message:', error.message);
                    throw error;
                }
            }
        }

        // Verify migration
        console.log('🔍 Verifying migration...\n');

        const [result] = await db.execute(sql`
            SELECT 
                COUNT(*) as total,
                COUNT(embedding_vector) as migrated,
                COUNT(*) - COUNT(embedding_vector) as pending
            FROM embeddings;
        `);

        console.log('Migration verification:');
        console.log('  Total embeddings:', (result as any).total);
        console.log('  Migrated to vector:', (result as any).migrated);
        console.log('  Pending migration:', (result as any).pending);

        // Check if pgvector extension is enabled
        const [extCheck] = await db.execute(sql`
            SELECT EXISTS (
                SELECT 1 FROM pg_extension WHERE extname = 'vector'
            ) as has_pgvector;
        `);

        console.log('\n✅ pgvector extension:', (extCheck as any).has_pgvector ? 'Enabled' : 'Not enabled');
        console.log('\n🎉 Migration completed successfully!');

    } catch (error: any) {
        console.error('\n❌ Migration failed:', error.message);
        console.error('\nPlease run the migration manually:');
        console.error('psql -U postgres -d complianceos -f migrations/001_add_pgvector.sql');
        process.exit(1);
    }
}

runMigration();
