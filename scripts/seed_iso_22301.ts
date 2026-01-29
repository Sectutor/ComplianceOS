
import 'dotenv/config';
import { getDb } from '../db';
import { controls } from '../schema';
import { eq } from 'drizzle-orm';
import { iso22301Controls } from '../data/frameworks/iso22301';

async function seedISO22301() {
    const db = await getDb();
    if (!db) {
        console.error("No DB connection");
        process.exit(1);
    }

    console.log(`--- Seeding ${iso22301Controls.length} ISO 22301 Controls ---`);

    for (const c of iso22301Controls) {
        // Upsert based on controlId
        // Check if exists
        const existing = await db.select().from(controls).where(eq(controls.controlId, c.id));
        if (existing.length === 0) {
            await db.insert(controls).values({
                controlId: c.id,
                name: c.name,
                description: c.description,
                framework: "ISO 22301",
                category: c.category
            });
            console.log(`Included: ${c.id}`);
        } else {
            console.log(`Skipped (Exists): ${c.id}`);
        }
    }
    console.log("--- ISO 22301 Seed Complete ---");
    process.exit(0);
}

seedISO22301().catch(e => {
    console.error(e);
    process.exit(1);
});
