
import 'dotenv/config';
import { getDb } from '../src/db';
import { clients } from '../src/schema'; // If schema exports clients
import { desc } from 'drizzle-orm';

async function main() {
    console.log('--- Checking Clients (Strict) ---');
    try {
        const db = await getDb();
        const allClients = await db.select().from(clients).orderBy(desc(clients.id));

        console.log(`Found ${allClients.length} clients.`);
        allClients.forEach((c: any) => {
            console.log(`ID: ${c.id}, Name: "${c.name}", PlanTier: "${c.planTier}" (Type: ${typeof c.planTier})`);
        });

    } catch (e) {
        console.error(e);
    }

    process.exit(0);
}

main();
