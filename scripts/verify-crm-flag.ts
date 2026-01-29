import 'dotenv/config';
import { getDb, closeDb } from '../db';
import { clients } from '../schema';
import { eq } from 'drizzle-orm';

async function main() {
    const db = await getDb();
    if (!db) {
        console.error("Failed to connect to DB");
        process.exit(1);
    }

    /*
  const clientId = 1; // Default test client
  console.log(`Enabling CRM module for client ${clientId}...`);
  */

    // Find first client
    const client = await db.query.clients.findFirst();

    if (!client) {
        console.error("No clients found in database.");
        process.exit(1);
    }
    const clientId = client.id;
    console.log(`Enabling CRM module for client ID ${clientId} (${client.name})...`);

    try {
        /*
        const client = await db.query.clients.findFirst({
            where: eq(clients.id, clientId)
        });
        */
        if (!client) {
            console.error("Client not found");
            process.exit(1);
        }

        let modules = (client.activeModules as string[]) || [];
        if (!modules.includes('crm')) {
            modules.push('crm');
        }

        await db.update(clients)
            .set({ activeModules: modules })
            .where(eq(clients.id, clientId));

        console.log("Success! Active modules:", modules);
    } catch (error) {
        console.error("Error updating client:", error);
    } finally {
        await closeDb();
    }
}

main();
