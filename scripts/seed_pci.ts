
import 'dotenv/config';
import { getDb } from '../db';
import { controls } from '../schema';
import { pciControls } from '../data/frameworks/pci';

async function seed() {
    const db = await getDb();
    if (!db) {
        console.error("No DB connection");
        process.exit(1);
    }
    console.log(`--- Seeding ${pciControls.length} PCI DSS v4.0 Requirements ---`);

    for (const c of pciControls) {
        await db.insert(controls).values({
            controlId: c.id,
            name: c.name,
            description: c.description,
            framework: "PCI DSS v4.0",
            category: c.category,
            implementationGuidance: "Refer to official PCI DSS v4.0 standard.",
            status: "active",
            version: 1
        }).onConflictDoUpdate({
            target: controls.controlId,
            set: {
                description: c.description,
                category: c.category,
                name: c.name,
                framework: "PCI DSS v4.0",
                status: "active"
            }
        });
        console.log(`Included: ${c.id}`);
    }
    console.log("--- PCI DSS Seed Complete ---");
    process.exit(0);
}

seed().catch(e => {
    console.error(e);
    process.exit(1);
});
