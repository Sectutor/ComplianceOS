
import 'dotenv/config';
import { getDb } from "../db";
import * as schema from "../schema";

async function main() {
    console.log("Listing Frameworks...");
    try {
        const db = await getDb();
        const frameworks = await db.select().from(schema.complianceFrameworks);
        console.table(frameworks);
    } catch (e) {
        console.error("Error query:", e);
    }
    process.exit(0);
}

main();
