
import "dotenv/config";
import { getDb } from "../db";
import { clients } from "../schema";

async function main() {
    const db = await getDb();
    const allClients = await db.select().from(clients);
    console.log("Clients in DB:", allClients.length);
    allClients.forEach(c => {
        console.log(`ID: ${c.id} | Name: ${c.name}`);
    });
    process.exit(0);
}

main().catch(console.error);
