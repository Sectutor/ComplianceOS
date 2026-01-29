
import { config } from "dotenv";
config();
import { getDb } from "./db";
import { clients } from "./schema";

async function main() {
    console.log("Listing Clients...");
    const db = await getDb();
    if (!db) {
        console.error("Database connection failed!");
        process.exit(1);
    }

    const allClients = await db.select().from(clients);
    console.log("Found Clients:", allClients.length);
    allClients.forEach(c => {
        console.log(`[ID: ${c.id}] ${c.name} (${c.domain}) - Modules: ${JSON.stringify(c.activeModules)}`);
    });
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
