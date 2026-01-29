import { getDb, closeDb } from '../db';
import { clients } from '../schema';
import { ilike } from 'drizzle-orm';

async function main() {
    const db = await getDb();
    if (!db) process.exit(1);

    const results = await db.select().from(clients).where(ilike(clients.name, '%ACME%'));

    console.log("Found clients:", results.map(c => ({ id: c.id, name: c.name, modules: c.activeModules })));
    await closeDb();
}

main();
