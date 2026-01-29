
import 'dotenv/config';
import { getDb } from '../db';
import * as schema from '../schema';

async function listClients() {
    const db = await getDb();
    if (!db) return;

    const clients = await db.select().from(schema.clients);
    console.log("Active Clients:");
    clients.forEach(c => {
        console.log(`[ID: ${c.id}] ${c.name}`);
    });

    // Also list plans by client
    const plans = await db.select().from(schema.implementationPlans);
    console.log("\nPlans by Client:");
    plans.forEach(p => {
        console.log(`- Plan [${p.id}] "${p.title}" is assigned to Client ID: ${p.clientId}`);
    });

    process.exit(0);
}

listClients();
