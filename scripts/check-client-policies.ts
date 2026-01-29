import * as dotenv from 'dotenv';
dotenv.config();

import { getDb } from '../db';
import { clientPolicies } from '../schema';
import { eq } from 'drizzle-orm';

async function checkClientPolicies() {
    const db = await getDb();
    if (!db) throw new Error('No DB');

    console.log('=== CLIENT POLICIES FOR CLIENT 3 ===\n');

    const policies = await db.select().from(clientPolicies).where(eq(clientPolicies.clientId, 3));

    console.log(`Found ${policies.length} policies in clientPolicies table\n`);

    policies.forEach((p, i) => {
        console.log(`${i + 1}. ID: ${p.id}`);
        console.log(`   Name: ${p.name}`);
        console.log(`   Content length: ${p.content?.length || 0} chars`);
        console.log(`   Content preview: ${p.content?.substring(0, 200)}...`);
        console.log('');
    });
}

checkClientPolicies().catch(console.error);
