
import 'dotenv/config';
import { getDb } from "../db";
import { vendors } from "../schema";
import { eq } from "drizzle-orm";

async function main() {
    console.log("Starting DB check...");
    try {
        const db = await getDb();
        console.log("DB connected.");

        // Try to fetch vendor ID 28
        console.log("Fetching vendor 28...");
        const vendor = await db.query.vendors.findFirst({
            where: eq(vendors.id, 28)
        });

        if (vendor) {
            console.log("Found vendor:", vendor.name);
            console.log("isSubprocessor:", (vendor as any).isSubprocessor);
        } else {
            console.log("Vendor 28 not found.");
        }

    } catch (e) {
        console.error("Error fetching vendor:", e);
    }
    process.exit(0);
}

main();
