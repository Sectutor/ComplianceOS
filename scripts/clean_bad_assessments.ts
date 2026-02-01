import * as dotenv from 'dotenv';
dotenv.config();
import { getDb } from "../packages/core/src/db";
import { riskAssessments } from "../packages/core/src/schema";
import { isNotNull, and, eq, sql } from "drizzle-orm";

async function deleteNullScoreAssessments() {
    const db = await getDb();
    console.log("Deleting risk assessments with null scores from Threat Model sync...");

    // Delete assessments that have contextSnapshot.source = 'Threat Model' and inherentScore is null
    const deleted = await db.delete(riskAssessments)
        .where(
            and(
                eq(riskAssessments.clientId, 3),
                sql`context_snapshot->>'source' = 'Threat Model'`
            )
        )
        .returning({ id: riskAssessments.id });

    console.log(`Deleted ${deleted.length} assessments with Threat Model source`);
    process.exit(0);
}

deleteNullScoreAssessments().catch(console.error);
