
import 'dotenv/config';
import { getDb } from '../db';
import { clientPolicies } from '../schema';
import { like } from 'drizzle-orm';

async function check() {
    const db = await getDb();
    if (!db) process.exit(1);

    const policies = await db.select().from(clientPolicies).where(like(clientPolicies.name, "%Demo Crypto Policy%"));

    console.log(`Found ${policies.length} policies matching 'Demo Crypto Policy'`);

    policies.forEach(p => {
        console.log(`\nID: ${p.id}, Name: ${p.name}`);
        console.log(`Content Preview: ${p.content?.substring(0, 200)}`);
    });

    process.exit(0);
}

check();
