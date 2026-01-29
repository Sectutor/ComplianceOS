import 'dotenv/config';
import { getDb } from '../db';
import { clientPolicies } from '../schema';
import { eq, desc } from 'drizzle-orm';

async function checkPolicy() {
    const db = await getDb();
    // Get all recent policies
    const policies = await db.select({
        id: clientPolicies.id,
        clientId: clientPolicies.clientId,
        name: clientPolicies.name,
        module: clientPolicies.module
    }).from(clientPolicies).orderBy(desc(clientPolicies.id)).limit(10);
    console.log('Recent policies:', JSON.stringify(policies, null, 2));
    process.exit(0);
}

checkPolicy();
