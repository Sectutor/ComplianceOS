
import 'dotenv/config';
import { getDb } from "../db";
import * as schema from "../schema";

async function main() {
    console.log("Debugging Harmonization Data...");
    try {
        const db = await getDb();

        const plans = await db.select().from(schema.implementationPlans);
        console.log(`Found ${plans.length} implementation plans.`);

        console.table(plans.map(p => ({
            id: p.id,
            title: p.title,
            frameworkId: p.frameworkId,
            clientId: p.clientId
        })));

    } catch (e) {
        console.error("Error querying data:", e);
    }
    process.exit(0);
}

main();
