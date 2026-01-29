import dotenv from "dotenv";
dotenv.config();

import { getDb } from '../db';
import { controls } from '../schema';
import { eq, isNull, sql } from "drizzle-orm";

async function check() {
    const db = await getDb();
    if (!db) {
        console.log('No DB connection');
        return;
    }
    const all = await db.select().from(controls);
    console.log('Total controls:', all.length);

    const nist = all.filter(c => c.framework === 'NIST CSF');
    const iso = all.filter(c => c.framework === 'ISO 27001');

    console.log('NIST Count:', nist.length);
    console.log('ISO Count:', iso.length);

    if (nist.length > 0) {
        console.log('Sample NIST Control:', {
            id: nist[0].controlId,
            name: nist[0].name,
            category: nist[0].category,
            grouping: nist[0].grouping
        });
    }

    if (iso.length > 0) {
        console.log('Sample ISO Control:', {
            id: iso[0].controlId,
            name: iso[0].name,
            category: iso[0].category,
            grouping: iso[0].grouping
        });
    }

    console.log("Backfilling grouping for non-NIST controls...");
    await db.update(controls)
        .set({ grouping: sql`${controls.category}` })
        .where(isNull(controls.grouping));
    console.log("Backfill complete.");
}
check();
