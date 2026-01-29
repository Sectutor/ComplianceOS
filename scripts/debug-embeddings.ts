import * as dotenv from 'dotenv';
dotenv.config();

import { getDb } from '../db';
import { embeddings } from '../schema';
import { eq } from 'drizzle-orm';

async function debugEmbeddings() {
    const db = await getDb();
    if (!db) throw new Error('No DB');

    console.log('=== DEBUGGING EMBEDDINGS FOR CLIENT 3 ===\n');

    // Check what's in embeddings table for client 3
    const allEmbeddings = await db.select({
        id: embeddings.id,
        clientId: embeddings.clientId,
        docType: embeddings.docType,
        docId: embeddings.docId,
        metadata: embeddings.metadata
    }).from(embeddings).where(eq(embeddings.clientId, 3));

    console.log(`Total embeddings for Client 3: ${allEmbeddings.length}\n`);

    // Group by type
    const byType: Record<string, number> = {};
    for (const e of allEmbeddings) {
        byType[e.docType] = (byType[e.docType] || 0) + 1;
    }
    console.log('By Type:');
    Object.entries(byType).forEach(([type, count]) => {
        console.log(`  ${type}: ${count}`);
    });

    // Show sample policies
    const policyEmbeddings = allEmbeddings.filter(e => e.docType === 'policy');
    console.log(`\nPolicy Embeddings (${policyEmbeddings.length} total):`);
    policyEmbeddings.slice(0, 5).forEach(p => {
        console.log(`  - ID: ${p.docId}, Metadata: ${JSON.stringify(p.metadata)}`);
    });
}

debugEmbeddings().catch(console.error);
