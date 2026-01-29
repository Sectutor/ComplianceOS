
import 'dotenv/config';
import { getDb } from '../db';
import { clientPolicies } from '../schema';
import { eq } from 'drizzle-orm';

async function check() {
    const db = await getDb();
    if (!db) process.exit(1);

    const policies = await db.select().from(clientPolicies);
    console.log(`Total policies: ${policies.length}`);
    policies.forEach(p => console.log(`- ${p.clientPolicyId} (ID: ${p.id})`));

    process.exit(0);
}

check();
