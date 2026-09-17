import { getDb } from "../db";
import { complianceFrameworks, implementationPhases, frameworkRequirements, controls } from "../schema";
import { eq, and } from "drizzle-orm";
import { pciControls } from "../data/frameworks/pci";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function main() {
    const db = await getDb();
    console.log("=== Importing & Promoting PCI DSS v4.0 Framework ===");

    const shortCode = "PCIDSS";
    const name = "PCI DSS v4.0";
    const description = "Payment Card Industry Data Security Standard v4.0.";
    const version = "4.0";
    const type = "Security";

    // 1. Upsert Framework
    let frameworkId: number;
    const existingFw = await db.select().from(complianceFrameworks).where(eq(complianceFrameworks.shortCode, shortCode));
    if (existingFw.length > 0) {
        console.log(`Updating compliance framework entry for ${shortCode}...`);
        frameworkId = existingFw[0].id;
        await db.update(complianceFrameworks).set({
            name,
            version,
            description,
            type,
            updatedAt: new Date()
        }).where(eq(complianceFrameworks.id, frameworkId));
    } else {
        console.log(`Creating compliance framework entry for ${shortCode}...`);
        const [insertedFw] = await db.insert(complianceFrameworks).values({
            name,
            shortCode,
            version,
            description,
            type
        }).returning();
        frameworkId = insertedFw.id;
    }
    console.log(`Framework ID: ${frameworkId}`);

    // 2. Identify distinct categories (phases) and upsert them
    const categories = [...new Set(pciControls.map(c => c.category || "General Requirement"))];
    console.log(`Found ${categories.length} categories to seed.`);

    const phaseMap = new Map<string, number>();
    let order = 1;
    for (const catName of categories) {
        // Parse order from name if possible (e.g. "Requirement 1" -> 1)
        const match = catName.match(/\d+/);
        const parsedOrder = match ? parseInt(match[0], 10) : order++;

        const existingPhase = await db.select().from(implementationPhases).where(and(
            eq(implementationPhases.frameworkId, frameworkId),
            eq(implementationPhases.name, catName)
        ));

        let phaseId: number;
        if (existingPhase.length > 0) {
            phaseId = existingPhase[0].id;
            await db.update(implementationPhases).set({
                order: parsedOrder,
                updatedAt: new Date()
            }).where(eq(implementationPhases.id, phaseId));
        } else {
            const [insertedPhase] = await db.insert(implementationPhases).values({
                frameworkId,
                name: catName,
                order: parsedOrder
            }).returning();
            phaseId = insertedPhase.id;
        }
        phaseMap.set(catName, phaseId);
    }

    // 3. Upsert Requirements
    console.log(`Upserting ${pciControls.length} framework requirements...`);
    let reqsAdded = 0;
    let reqsUpdated = 0;

    for (const ctrl of pciControls) {
        const phaseId = phaseMap.get(ctrl.category || "General Requirement");
        
        const existingReq = await db.select().from(frameworkRequirements).where(and(
            eq(frameworkRequirements.frameworkId, frameworkId),
            eq(frameworkRequirements.identifier, ctrl.id)
        ));

        const reqData = {
            frameworkId,
            phaseId,
            identifier: ctrl.id,
            title: ctrl.name.substring(0, 500),
            description: ctrl.description,
            guidance: ctrl.implementationGuidance,
            updatedAt: new Date()
        };

        if (existingReq.length > 0) {
            await db.update(frameworkRequirements).set(reqData).where(eq(frameworkRequirements.id, existingReq[0].id));
            reqsUpdated++;
        } else {
            await db.insert(frameworkRequirements).values(reqData);
            reqsAdded++;
        }
    }
    console.log(`Framework Requirements: ${reqsAdded} added, ${reqsUpdated} updated.`);

    // 4. Promote Requirements to Master Controls
    console.log(`Promoting requirements to master controls...`);
    let controlsAdded = 0;
    let controlsUpdated = 0;

    for (const ctrl of pciControls) {
        const existingControl = await db.select().from(controls).where(and(
            eq(controls.controlId, ctrl.id),
            eq(controls.framework, shortCode)
        ));

        const controlData = {
            controlId: ctrl.id,
            name: ctrl.name.substring(0, 255),
            description: ctrl.description,
            framework: shortCode,
            status: "active" as const,
            evidenceType: "Document",
            frequency: "Annual",
            implementationGuidance: ctrl.implementationGuidance,
            category: ctrl.category || "General"
        };

        if (existingControl.length > 0) {
            await db.update(controls).set(controlData).where(eq(controls.id, existingControl[0].id));
            controlsUpdated++;
        } else {
            await db.insert(controls).values(controlData);
            controlsAdded++;
        }
    }
    console.log(`Master Controls: ${controlsAdded} added, ${controlsUpdated} updated.`);
    console.log("=== PCI DSS v4.0 Seeding Complete ===");
}

main().then(() => {
    process.exit(0);
}).catch(err => {
    console.error("Failed to seed PCI DSS:", err);
    process.exit(1);
});
