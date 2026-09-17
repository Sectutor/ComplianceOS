
import 'dotenv/config';
import { getDb } from '../src/db';
import { clients, userClients } from '../src/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';

async function main() {
    try {
        const db = await getDb();
        const client1 = await db.select().from(clients).where(eq(clients.id, 1)).limit(1);

        let output = "";

        if (client1.length === 0) {
            output = "Client 1 NOT FOUND.";
        } else {
            output = `Client 1 FOUND. PlanTier: "${client1[0].planTier}".`;

            // Check members
            const members = await db.select().from(userClients).where(eq(userClients.clientId, 1));
            output += `\nMembers count: ${members.length}`;
        }

        console.log(output);
        fs.writeFileSync('client_1_check.txt', output);

        // Also check if ANY client has ID 1

    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

main();
