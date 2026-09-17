import { getDb } from "../db";
import { complianceFrameworks, implementationPhases, frameworkRequirements, controls } from "../schema";
import { eq, and } from "drizzle-orm";
import { hipaaControls } from "../data/frameworks/hipaa";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function main() {
    const db = await getDb();
    console.log("=== Importing & Promoting HIPAA Security Rule Framework ===");

    const shortCode = "HIPAA";
    const name = "HIPAA Security Rule";
    const description = "Health Insurance Portability and Accountability Act - Security Rule (45 CFR Part 164, Subpart C). Covers Administrative, Physical, and Technical Safeguards for electronic Protected Health Information (ePHI).";
    const version = "2025";
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

    // 2. Identify distinct categories (safeguard types) and upsert them as phases
    const categories = [...new Set(hipaaControls.map(c => c.category))];
    console.log(`Found ${categories.length} safeguard categories to seed.`);

    const categoryOrder: Record<string, number> = {
        "Administrative Safeguards": 1,
        "Physical Safeguards": 2,
        "Technical Safeguards": 3,
        "Organizational Requirements": 4,
        "Documentation Requirements": 5
    };

    const phaseMap = new Map<string, number>();
    for (const catName of categories) {
        const order = categoryOrder[catName] ?? categories.indexOf(catName) + 1;

        const existingPhase = await db.select().from(implementationPhases).where(and(
            eq(implementationPhases.frameworkId, frameworkId),
            eq(implementationPhases.name, catName)
        ));

        let phaseId: number;
        if (existingPhase.length > 0) {
            phaseId = existingPhase[0].id;
            await db.update(implementationPhases).set({
                order,
                updatedAt: new Date()
            }).where(eq(implementationPhases.id, phaseId));
        } else {
            const [insertedPhase] = await db.insert(implementationPhases).values({
                frameworkId,
                name: catName,
                order
            }).returning();
            phaseId = insertedPhase.id;
        }
        phaseMap.set(catName, phaseId);
    }

    // 3. Upsert Requirements
    console.log(`Upserting ${hipaaControls.length} framework requirements...`);
    let reqsAdded = 0;
    let reqsUpdated = 0;

    for (const ctrl of hipaaControls) {
        const phaseId = phaseMap.get(ctrl.category);
        
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

    for (const ctrl of hipaaControls) {
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
            category: ctrl.category
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

    // Summary
    console.log("\n=== HIPAA Security Rule Seeding Summary ===");
    console.log(`Framework: ${name} (${shortCode})`);
    console.log(`Categories: ${categories.length} (${categories.join(", ")})`);
    console.log(`Requirements: ${reqsAdded} added, ${reqsUpdated} updated (${hipaaControls.length} total)`);
    console.log(`Controls: ${controlsAdded} added, ${controlsUpdated} updated`);
    console.log("=== HIPAA Security Rule Seeding Complete ===");
}

main().then(() => {
    process.exit(0);
}).catch(err => {
    console.error("Failed to seed HIPAA Security Rule:", err);
    process.exit(1);
});
