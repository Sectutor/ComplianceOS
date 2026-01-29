import { getDb } from "../db";
import * as schema from "../schema";
import { eq, desc } from "drizzle-orm";

async function verifyPoamRiskLink() {
    console.log("Starting POA&M Risk Link Verification...");
    const db = await getDb();
    const clientId = 1; // Assuming client 1 exists for testing

    try {
        // 1. Create a Test Risk Assessment
        console.log("Creating Test Risk Assessment...");
        const [risk] = await db.insert(schema.riskAssessments).values({
            clientId,
            assessmentId: `TEST-RISK-${Date.now()}`,
            title: "Test Risk for POA&M Linkage",
            likelihood: "3",
            impact: "3",
            inherentRisk: "Medium",
            status: "draft"
        }).returning();
        console.log(`Risk Created: ID ${risk.id}, Title: ${risk.title}`);

        // 2. Create a Test POA&M Plan (if needed, or just insert item directly if referencing existing poam)
        // Let's create a fresh POAM plan to be safe
        console.log("Creating Test POA&M Plan...");
        const [poam] = await db.insert(schema.federalPoams).values({
            clientId,
            title: "Test POA&M Plan",
            status: 'active'
        }).returning();
        console.log(`POA&M Plan Created: ID ${poam.id}`);

        // 3. Create POA&M Item LINKED to the Risk
        console.log("Creating POA&M Item linked to Risk...");
        const [item] = await db.insert(schema.poamItems).values({
            poamId: poam.id,
            weaknessName: "Weakness Associated with Test Risk",
            status: "open",
            relatedRiskId: risk.id // <--- THE KEY TEST
        }).returning();
        console.log(`POA&M Item Created: ID ${item.id}, RelatedRiskId: ${item.relatedRiskId}`);

        if (item.relatedRiskId !== risk.id) {
            throw new Error(`FAILED: relatedRiskId mismatch. Expected ${risk.id}, got ${item.relatedRiskId}`);
        }

        // 4. Verify Retrieval (simulating the join query)
        console.log("Verifying Retrieval with Join...");
        const itemsWithRisk = await db.select({
            ...schema.poamItems,
            riskTitle: schema.riskAssessments.title,
        })
            .from(schema.poamItems)
            .leftJoin(schema.riskAssessments, eq(schema.poamItems.relatedRiskId, schema.riskAssessments.id))
            .where(eq(schema.poamItems.id, item.id));

        const fetchedItem = itemsWithRisk[0];
        console.log(`Fetched Item Risk Title: "${fetchedItem.riskTitle}"`);

        if (fetchedItem.riskTitle === risk.title) {
            console.log("SUCCESS: Linked Risk Title fetched correctly.");
        } else {
            throw new Error(`FAILED: Risk Title mismatch. Expected "${risk.title}", got "${fetchedItem.riskTitle}"`);
        }

        // Cleanup
        console.log("Cleaning up test data...");
        await db.delete(schema.poamItems).where(eq(schema.poamItems.id, item.id));
        await db.delete(schema.federalPoams).where(eq(schema.federalPoams.id, poam.id));
        await db.delete(schema.riskAssessments).where(eq(schema.riskAssessments.id, risk.id));
        console.log("Cleanup complete.");

        process.exit(0);

    } catch (error) {
        console.error("VERIFICATION FAILED:", error);
        process.exit(1);
    }
}

verifyPoamRiskLink();
