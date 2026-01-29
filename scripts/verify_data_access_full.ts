import 'dotenv/config';
import { getDb, closeDb } from '../db';
import { users, clients, controls } from '../schema';
import { sql } from 'drizzle-orm';

async function verify() {
    console.log("Starting Full Data Verification...");
    try {
        const db = await getDb();
        console.log("DB Connected.");

        const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
        console.log(`Users: ${userCount.count}`);

        const [clientCount] = await db.select({ count: sql<number>`count(*)` }).from(clients);
        console.log(`Clients: ${clientCount.count}`);

        const [controlCount] = await db.select({ count: sql<number>`count(*)` }).from(controls);
        console.log(`Controls: ${controlCount.count}`);

        console.log("VERIFICATION SUCCESS: Data is accessible.");
    } catch (e) {
        console.error("VERIFICATION FAILED:", e);
    } finally {
        await closeDb();
    }
}

verify();
