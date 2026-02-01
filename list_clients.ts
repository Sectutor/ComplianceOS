
import "dotenv/config";
import { getDb } from "./packages/core/src/db";
import { clients } from "./packages/core/src/schema";

async function list() {
    try {
        const db = await getDb();
        const results = await db.select().from(clients);
        console.log(`[CHECK] All Clients:`);
        results.forEach(c => {
            console.log(` - ID: ${c.id}, Name: ${c.name}, Domain: ${c.domain}`);
        });
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

list();
