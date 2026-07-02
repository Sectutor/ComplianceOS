
import 'dotenv/config';
import { getDb } from './db';
import * as schema from './schema';
import { desc } from 'drizzle-orm';

async function main() {
    const db = await getDb();

    const plans = await db.select().from(schema.implementationPlans).limit(20);
    const clients = await db.select().from(schema.clients);
    const clientMap = new Map(clients.map(c => [c.id, c.name]));

    console.log("Last 20 Implementation Plans:");
    plans.forEach(p => {
        console.log(` - [ID: ${p.id}] Title: '${p.title}' | Client: '${clientMap.get(p.clientId)}' (ID: ${p.clientId}) | User: ${p.createdById}`);
    });

    process.exit(0);
}

main();
