import 'dotenv/config';
import { getDb, closeDb } from '../db';
import { clients } from '../schema';
import { ilike, eq } from 'drizzle-orm';

async function main() {
    const db = await getDb();
    if (!db) {
        console.error("Failed to connect to DB");
        process.exit(1);
    }

    const searchName = process.argv[2] || 'ACME';
    console.log(`Searching for client matching: ${searchName}`);

    const foundClients = await db.select().from(clients).where(ilike(clients.name, `%${searchName}%`));

    if (foundClients.length === 0) {
        console.error("No matching client found.");
        process.exit(1);
    }

    const targetClient = foundClients[0];
    console.log(`Found client: ${targetClient.name} (ID: ${targetClient.id})`);

    let modules = (targetClient.activeModules as string[]) || [];
    if (!modules.includes('crm')) {
        modules.push('crm');
        await db.update(clients)
            .set({ activeModules: modules })
            .where(eq(clients.id, targetClient.id));
        console.log(`Enable CRM for ${targetClient.name}. Active modules:`, modules);
    } else {
        console.log(`CRM already enabled for ${targetClient.name}.`);
    }

    await closeDb();
}

main();
