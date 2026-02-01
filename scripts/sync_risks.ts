
import * as dotenv from 'dotenv';
dotenv.config();
import { getDb } from "../packages/core/src/db";
import { riskScenarios, riskAssessments } from "../packages/core/src/schema";
import { eq, isNull } from "drizzle-orm";

async function syncRisks() {
    const db = await getDb();
    console.log("Starting Risk Sync...");

    const allScenarios = await db.select().from(riskScenarios);
    console.log(`Found ${allScenarios.length} risk scenarios.`);

    let syncedCount = 0;

    for (const scenario of allScenarios) {
        // Check if assessment exists for this scenario
        // We link via riskId field in riskAssessments
        const existing = await db.select().from(riskAssessments).where(eq(riskAssessments.riskId, scenario.id));

        if (existing.length === 0) {
            console.log(`Syncing scenario ${scenario.id}: ${scenario.title}`);
            const payload = {
                clientId: scenario.clientId,
                assessmentId: `TM-${scenario.threatModelId || 'LEGACY'}-${scenario.id}`,
                title: scenario.title,
                threatDescription: scenario.description,
                likelihood: String(scenario.likelihood),
                impact: String(scenario.impact),
                inherentScore: scenario.inherentRiskScore, // riskScenarios uses inherentRiskScore
                inherentRisk: scenario.inherentRisk,
                riskId: scenario.id,
                status: 'draft', // 'identified' is not a valid enum value for risk_assessments
                contextSnapshot: {
                    source: 'Threat Model',
                    projectId: scenario.devProjectId,
                    threatModelId: scenario.threatModelId
                },
                createdAt: scenario.createdAt || new Date(),
                updatedAt: new Date()
            };
            try {
                await db.insert(riskAssessments).values(payload as any);
                syncedCount++;
            } catch (err: any) {
                console.error(`Failed to sync scenario ${scenario.id}:`, err);
            }
        }
    }

    console.log(`Sync complete. Created ${syncedCount} new global risk assessments.`);
    process.exit(0);
}

syncRisks().catch(console.error);
