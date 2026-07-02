
import 'dotenv/config';
import { getDb } from './db';
import { users, clients, userClients } from './schema';
import { sql } from 'drizzle-orm';

async function checkData() {
    const db = await getDb();
    if (!db) {
        console.error("No DB connection");
        return;
    }

    console.log("--- Summary ---");
    const userCount = await db.select({ count: sql<number>`count(*)` }).from(users);
    const clientCount = await db.select({ count: sql<number>`count(*)` }).from(clients);
    const mapCount = await db.select({ count: sql<number>`count(*)` }).from(userClients);

    console.log(`Users: ${userCount[0].count}`);
    console.log(`Clients: ${clientCount[0].count}`);
    console.log(`Mappings: ${mapCount[0].count}`);

    if (userCount[0].count > 0) {
        console.log("\n--- Users List ---");
        const usrs = await db.select().from(users);
        usrs.forEach(u => console.log(`ID: ${u.id}, Email: ${u.email}, OpenID: ${u.openId}`));
    }

    if (clientCount[0].count > 0 && mapCount[0].count === 0) {
        console.log("\n[!] DETECTED ORPHAN CLIENTS (Data exists but not linked to user)");
        // Optional: Auto-fix?
        // Let's just list them first
    }


    process.exit(0);
}

checkData().catch(console.error);
