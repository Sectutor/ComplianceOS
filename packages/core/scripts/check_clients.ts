
import 'dotenv/config';
import { getDb } from '../src/db';
import { clients } from '../src/schema';
import { desc } from 'drizzle-orm';

async function main() {
    console.log('--- Checking All Clients ---');
    try {
        const db = await getDb();
        const allClients = await db.select().from(clients).orderBy(desc(clients.id));

        console.log("Found clients:", allClients.length);
        // Log raw object for first client to see keys
        if (allClients.length > 0) {
            console.log("First client keys:", Object.keys(allClients[0]));
            console.log("First client planTier:", (allClients[0] as any).planTier);
        }

        console.table(allClients.map(c => ({
            id: c.id,
            name: c.name,
            planTier: (c as any).planTier
        })));
    } catch (e) {
        console.error(e);
    }

    process.exit(0);
}

main();
