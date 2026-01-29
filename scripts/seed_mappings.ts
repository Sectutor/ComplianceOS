
import { getDb, closeDb } from "../db";
import { controlMappings, controls } from "../schema";
import { eq, like, or } from "drizzle-orm";

async function seedMappings() {
    const db = await getDb();
    if (!db) return;

    try {
        // 1. Find ISO A.5.15 (Access Control) and SOC 2 CC6.1 (Logical Access)
        // Adjust titles/ids based on what's actually in your DB. 
        // Using broad search to be safe.
        const isoControl = await db.query.controls.findFirst({
            where: like(controls.framework, 'ISO%')
        });

        const socControl = await db.query.controls.findFirst({
            where: like(controls.framework, 'SOC%')
        });

        if (!isoControl || !socControl) {
            console.log("Could not find ISO or SOC controls to map.");
            return;
        }

        console.log(`Mapping ${isoControl.framework} ${isoControl.controlId} <-> ${socControl.framework} ${socControl.controlId}`);

        // 2. Create Bi-directional mapping
        await db.insert(controlMappings).values([
            {
                sourceControlId: isoControl.id,
                targetControlId: socControl.id,
                relationship: 'equivalent'
            },
            {
                sourceControlId: socControl.id,
                targetControlId: isoControl.id,
                relationship: 'equivalent'
            }
        ]);

        console.log("Mappings seeded successfully.");

    } catch (e) {
        console.error(e);
    } finally {
        process.exit(0);
    }
}

seedMappings();
