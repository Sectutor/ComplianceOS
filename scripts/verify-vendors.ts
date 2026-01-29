
import 'dotenv/config';
import { getDb } from "../db";
import { vendors } from "../schema";

async function verifyVendorsTable() {
    console.log("Verifying vendors table...");
    const db = await getDb();
    if (!db) {
        console.error("DB not connected");
        return;
    }

    try {
        const result = await db.select().from(vendors).limit(1);
        console.log("Select success. Table exists.");
        console.log(result);

        const [inserted] = await db.insert(vendors).values({
            clientId: 1,
            name: "Test Vendor " + Date.now(),
            criticality: "Low",
            dataAccess: "Internal",
            status: "Active"
        }).returning();

        console.log("Insert success:", inserted);

    } catch (e) {
        console.error("Error accessing vendors table:", e);
    }
}

verifyVendorsTable();
