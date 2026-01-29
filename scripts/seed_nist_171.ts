
import 'dotenv/config';
import { getDb } from '../db';
import { controls } from '../schema';
import { eq } from 'drizzle-orm';
import { nist800171Controls } from '../data/frameworks/nist-800-171';

async function seed() {
    const db = await getDb();
    if (!db) {
        console.error("No DB connection");
        process.exit(1);
    }
    console.log(`--- Seeding ${nist800171Controls.length} NIST 800-171 Controls ---`);

    let count = 0;
    for (const c of nist800171Controls) {
        await db.insert(controls).values({
            controlId: c.id,
            name: c.name,
            description: c.description,
            framework: "NIST 800-171",
            category: c.category,
            implementationGuidance: c.implementationGuidance,
            status: "active",
            version: 1
        }).onConflictDoUpdate({
            target: controls.controlId,
            set: {
                description: c.description,
                implementationGuidance: c.implementationGuidance,
                category: c.category,
                name: c.name,
                status: "active"
            }
        });
        count++;
    }
    console.log(`--- NIST 800-171 Seed Complete (${count} items) ---`);
    process.exit(0);
}

seed().catch(e => {
    console.error(e);
    process.exit(1);
});
