
import 'dotenv/config';
import { getDb } from "../db";
import * as schema from "../schema";
import { isNull } from "drizzle-orm";

async function main() {
    console.log("Checking for plans with missing Framework ID...");
    try {
        const db = await getDb();
        const plans = await db.select().from(schema.implementationPlans).where(isNull(schema.implementationPlans.frameworkId));

        if (plans.length > 0) {
            console.log(`❌ Found ${plans.length} plans with NULL frameworkId.`);
            plans.forEach(p => console.log(` - Plan ID: ${p.id}, Title: ${p.title}`));
        } else {
            console.log("✅ All plans have a frameworkId.");
        }

    } catch (e) {
        console.error("Error:", e);
    }
    process.exit(0);
}

main();
