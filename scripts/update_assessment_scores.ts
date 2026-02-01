import * as dotenv from 'dotenv';
dotenv.config();
import { getDb } from "../packages/core/src/db";
import { riskAssessments, riskScenarios } from "../packages/core/src/schema";
import { eq, isNotNull } from "drizzle-orm";

async function updateScores() {
    const db = await getDb();
    console.log("Updating scores for synced risk assessments...");

    // Get all assessments that have a riskId (linked to scenarios)
    const assessments = await db.select()
        .from(riskAssessments)
        .where(isNotNull(riskAssessments.riskId));

    console.log(`Found ${assessments.length} assessments with linked scenarios`);

    let updated = 0;
    for (const assessment of assessments) {
        if (assessment.riskId) {
            // Get the linked scenario
            const [scenario] = await db.select()
                .from(riskScenarios)
                .where(eq(riskScenarios.id, assessment.riskId));

            if (scenario && scenario.inherentRiskScore) {
                // Update the assessment with the score from the scenario
                await db.update(riskAssessments)
                    .set({ inherentScore: scenario.inherentRiskScore })
                    .where(eq(riskAssessments.id, assessment.id));
                console.log(`Updated assessment ${assessment.id} with score ${scenario.inherentRiskScore}`);
                updated++;
            }
        }
    }

    console.log(`Updated ${updated} assessments`);
    process.exit(0);
}

updateScores().catch(console.error);
