
import 'dotenv/config';
import { getDb } from '../db';
import { clientPolicies } from '../schema';
import { like } from 'drizzle-orm';

async function check() {
    const db = await getDb();
    if (!db) process.exit(1);

    const policies = await db.select().from(clientPolicies).where(like(clientPolicies.name, "%Test Policy%"));

    if (policies.length > 0) {
        console.log(`✅ Found ${policies.length} policies matching 'Test Policy'`);
        policies.forEach(p => console.log(`   - ID: ${p.id}, Name: ${p.name}, Content Length: ${p.content?.length}`));
    } else {
        console.log("❌ No policies found matching 'Test Policy'");
    }

    process.exit(0);
}

check();
