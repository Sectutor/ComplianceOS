/**
 * Backfill embedding_vector from embedding_data
 * Run with: npx tsx scripts/backfill-vectors.ts
 * 
 * This script populates the pgvector column from legacy JSON embedding data.
 * Safe to run multiple times (idempotent).
 */

import 'dotenv/config';
import { getDb } from '../db';
import { sql } from 'drizzle-orm';

async function backfillVectors() {
    console.log('🔄 Starting vector backfill...\n');

    const db = await getDb();
    if (!db) {
        console.error('❌ Database connection failed');
        process.exit(1);
    }

    try {
        // Check current state
        const [before] = await db.execute(sql`
            SELECT 
                COUNT(*) as total,
                COUNT(embedding_vector) as with_vector,
                COUNT(*) - COUNT(embedding_vector) as needs_backfill
            FROM embeddings
            WHERE embedding_data IS NOT NULL;
        `);

        console.log('📊 Current state:');
        console.log(`   Total embeddings with data: ${(before as any).total}`);
        console.log(`   Already have vector: ${(before as any).with_vector}`);
        console.log(`   Need backfill: ${(before as any).needs_backfill}`);

        if ((before as any).needs_backfill === 0 || (before as any).needs_backfill === '0') {
            console.log('\n✅ No backfill needed - all embeddings already have vectors!');
            return;
        }

        console.log('\n🔧 Running backfill...');

        // Run the backfill - convert JSON embedding_data to pgvector
        const result = await db.execute(sql`
            UPDATE embeddings 
            SET embedding_vector = embedding_data::text::vector
            WHERE embedding_data IS NOT NULL 
              AND embedding_vector IS NULL;
        `);

        console.log(`   Updated rows: ${(result as any).rowCount || 'unknown'}`);

        // Verify
        const [after] = await db.execute(sql`
            SELECT 
                COUNT(*) as total,
                COUNT(embedding_vector) as with_vector,
                COUNT(*) - COUNT(embedding_vector) as still_missing
            FROM embeddings
            WHERE embedding_data IS NOT NULL;
        `);

        console.log('\n📊 After backfill:');
        console.log(`   Total: ${(after as any).total}`);
        console.log(`   With vector: ${(after as any).with_vector}`);
        console.log(`   Still missing: ${(after as any).still_missing}`);

        console.log('\n✅ Backfill complete!');
    } catch (error) {
        console.error('❌ Backfill failed:', error);
        process.exit(1);
    }
}

backfillVectors()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
