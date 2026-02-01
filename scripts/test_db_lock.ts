
import { config } from "dotenv";
config();
import { getDb } from "../packages/core/src/db";
import { controls } from "../packages/core/src/schema";
import { sql, inArray } from "drizzle-orm";

async function main() {
    console.log("Testing DB connection...");
    try {
        const db = await getDb();
        console.log("Connected. Querying filtered count...");

        // Simulate the exact query logic
        const fw = ["CIS Critical Security Controls"];

        const result = await db.select({ count: sql<number>`count(*)` })
            .from(controls)
            .where(inArray(controls.framework, fw));

        console.log("Controls count for CIS:", result[0].count);
        process.exit(0);
    } catch (e) {
        console.error("DB Test Failed:", e);
        process.exit(1);
    }
}

main();
