import * as dotenv from 'dotenv';
dotenv.config();

import { getDb } from '../db';
import { embeddings } from '../schema';
import { eq, and } from 'drizzle-orm';

async function checkPolicies() {
    const db = await getDb();
    if (!db) throw new Error('No DB');

    console.log('=== RAW POLICY EMBEDDINGS FOR CLIENT 3 ===\n');

    // Get all policies for client 3
    const policyEmbeddings = await db.select({
        id: embeddings.id,
        clientId: embeddings.clientId,
        docType: embeddings.docType,
        docId: embeddings.docId,
        content: embeddings.content,
        metadata: embeddings.metadata
    }).from(embeddings)
        .where(and(
            eq(embeddings.clientId, 3),
            eq(embeddings.docType, 'policy')
        ));

    console.log(`Found ${policyEmbeddings.length} policy embeddings for client 3\n`);

    policyEmbeddings.forEach((p, i) => {
        console.log(`${i + 1}. DocID: ${p.docId}`);
        console.log(`   Type: ${p.docType}, ClientId: ${p.clientId}`);
        console.log(`   Metadata: ${JSON.stringify(p.metadata)}`);
        console.log(`   Content preview: ${p.content?.substring(0, 150)}...`);
        console.log('');
    });
}

checkPolicies().catch(console.error);
