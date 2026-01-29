
import { getDb } from "../db";
import { clients, controls, clientPolicies, users } from "../schema";
import { count } from "drizzle-orm";

async function checkData() {
    try {
        const db = await getDb();
        if (!db) {
            console.log("Failed to connect to DB");
            return;
        }

        const clientCount = await db.select({ count: count() }).from(clients);
        console.log("Clients:", clientCount[0].count);

        const controlCount = await db.select({ count: count() }).from(controls);
        console.log("Controls:", controlCount[0].count);

        const policyCount = await db.select({ count: count() }).from(clientPolicies);
        console.log("Policies:", policyCount[0].count);

        const userCount = await db.select({ count: count() }).from(users);
        console.log("Users:", userCount[0].count);

        // Force exit because getDb keeps connection open
        process.exit(0);

    } catch (e) {
        console.error("Error querying DB:", e);
        process.exit(1);
    }
}

checkData();
