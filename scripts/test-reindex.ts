import 'dotenv/config';
import { getDb } from '../db';
import { reindexKnowledgeBase } from '../lib/advisor/service';

async function main() {
    console.log('--- Testing RAG Re-indexing ---');

    // 1. Initialize DB Connection
    const db = await getDb();
    if (!db) {
        console.error('Database connection failed');
        process.exit(1);
    }

    // 2. Run Re-index (Policies Only first to be safe, or just run 'all' if we have mock data)
    // We'll run 'all' to test both paths.
    console.log('Running reindexKnowledgeBase(undefined, "all")...');

    try {
        const stats = await reindexKnowledgeBase(undefined, 'all');
        console.log('Re-indexing completed!');
        console.log('Stats:', stats);

        if (stats.errors > 0) {
            console.warn('completed with errors.');
        } else {
            console.log('SUCCESS: Clean run.');
        }

    } catch (error) {
        console.error('Re-indexing FAILED:', error);
        process.exit(1);
    }

    process.exit(0);
}

main().catch(console.error);
