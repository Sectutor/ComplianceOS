
import 'dotenv/config';
import { getDb } from '../db';
import { controls, gapAssessments, gapResponses, clients } from '../schema';
import { eq, and } from 'drizzle-orm';

async function seed() {
    console.log("🚀 Starting ISO 27001 Assessment Seeding for Client 3...");
    const db = await getDb();

    // 1. Verify Client 3
    const client = await db.select().from(clients).where(eq(clients.id, 3));
    if (client.length === 0) {
        console.error("❌ Client ID 3 not found. Please ensure seed data exists.");
        process.exit(1);
    }
    console.log(`✅ Found Client: ${client[0].name}`);

    // 2. Fetch ISO 27001 Controls
    const isoControls = await db.select().from(controls).where(eq(controls.framework, 'ISO 27001'));
    if (isoControls.length === 0) {
        console.error("❌ No ISO 27001 controls found in master list.");
        process.exit(1);
    }
    console.log(`✅ Found ${isoControls.length} ISO 27001 controls.`);

    // 3. Create Assessment
    const assessmentName = "Q1 2026 ISO 27001 Gap Analysis (Generated)";

    // Check if exists to avoid dupe spamming
    const existing = await db.select().from(gapAssessments).where(
        and(eq(gapAssessments.clientId, 3), eq(gapAssessments.name, assessmentName))
    );

    let assessmentId: number;

    if (existing.length > 0) {
        console.log("ℹ️ Assessment already exists, using ID:", existing[0].id);
        assessmentId = existing[0].id;
        // Optionally clear responses to re-seed? Let's just append/overwrite if we were smarter, but simpler is fine.
        // Let's delete old responses to be clean
        await db.delete(gapResponses).where(eq(gapResponses.assessmentId, assessmentId));
        console.log("🗑️ Cleared previous responses.");
    } else {
        const [newAssessment] = await db.insert(gapAssessments).values({
            clientId: 3,
            name: assessmentName,
            framework: "ISO 27001",
            status: "in_progress",
            scope: "Whole organization, focusing on cloud infrastructure and remote work policies."
        }).returning();
        assessmentId = newAssessment.id;
        console.log("✅ Created new Assessment ID:", assessmentId);
    }

    // 4. Generate Responses
    const responses = isoControls.map(c => {
        // Randomize status slightly but mostly Implemented for a mature-ish BCP client
        const rand = Math.random();
        let status = "implemented";
        let note = "Control is fully documented and practiced.";

        if (rand > 0.8) {
            status = "partial";
            note = "Policy exists but evidence is sporadic.";
        } else if (rand > 0.95) {
            status = "not_implemented";
            note = "Planned for Q3 2026.";
        }

        // Custom notes for specific domains roughly
        if (c.controlId.startsWith("A.5")) note = "Policies defined and approved by C-Suite.";
        if (c.controlId.startsWith("A.8")) note = "Asset inventory managed in Jira/Snipe-IT.";
        if (c.controlId.startsWith("A.9")) note = "Access control matrix reviewed quarterly.";
        if (c.controlId.startsWith("A.12")) note = "Cryptography Policy v1.2 in effect.";

        return {
            assessmentId: assessmentId,
            controlId: c.controlId,
            currentStatus: status,
            notes: note,
            targetStatus: "required",
            gapSeverity: status === "implemented" ? "low" : "medium"
        };
    });

    console.log(`⏳ Inserting ${responses.length} responses...`);

    // Batch insert? Drizzle insert many
    await db.insert(gapResponses).values(responses);

    console.log("🎉 Seeding Complete!");
    process.exit(0);
}

seed().catch(err => {
    console.error("❌ Seeding failed:", err);
    process.exit(1);
});
