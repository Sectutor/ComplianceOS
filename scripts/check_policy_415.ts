
import "dotenv/config";
import { getDb } from "../db";
import { clientPolicies } from "../schema";
import { eq } from "drizzle-orm";

async function main() {
    const db = await getDb();
    console.log("Checking Policy 415...");

    const policy = await db.select().from(clientPolicies).where(eq(clientPolicies.id, 415));

    if (policy.length > 0) {
        console.log("FOUND Policy 415:", policy[0]);
    } else {
        console.log("Policy 415 NOT FOUND in database.");
    }
    process.exit(0);
}

main().catch(console.error);
