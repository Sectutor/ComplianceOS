import { getDb } from "./src/db.ts";
import { policyTemplates } from "./src/schema.ts";
import { eq, or, and, sql } from "drizzle-orm";

async function testQuery() {
    try {
        const db = await getDb();
        console.log("DB connected");

        const baseConditions = [
            or(
                eq(policyTemplates.isPublic, true),
                eq(policyTemplates.ownerId, 1),
                eq(policyTemplates.clientId, 3)
            )
        ].filter(Boolean);

        const whereClause = and(...baseConditions as any);

        console.log("Executing query...");
        const result = await db.select().from(policyTemplates).where(whereClause);
        console.log("Query success. Rows:", result.length);

    } catch (e: any) {
        console.error("Query failed:", e.message);
        console.error(e.stack);
    }
}

testQuery().then(() => process.exit(0));
