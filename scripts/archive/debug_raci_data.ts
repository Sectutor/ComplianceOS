
import { getDb } from './db';
import { clientControls, controls } from './schema';
import { eq } from 'drizzle-orm';

async function main() {
    console.log("Connecting to DB...");
    const db = await getDb();

    // Check Client ID 3
    const clientId = 3;
    console.log(`Checking Client ID: ${clientId}`);

    // Get raw client controls
    const rawCC = await db.select().from(clientControls).where(eq(clientControls.clientId, clientId)).limit(5);
    console.log("\n--- Raw Client Controls (First 5) ---");
    console.table(rawCC.map(c => ({ id: c.id, controlId: c.controlId, owner: c.owner })));

    if (rawCC.length > 0) {
        const sampleCC = rawCC[0];
        console.log(`\nChecking Control linkage for Control ID: ${sampleCC.controlId}`);

        const linkedControl = await db.select().from(controls).where(eq(controls.id, sampleCC.controlId));
        console.log("--- Linked Master Control ---");
        console.log(linkedControl);
    }

    // Run the actual join query logic
    const joined = await db.select({
        id: clientControls.id,
        controlId: clientControls.controlId,
        masterCode: controls.controlId,
        masterName: controls.name,
    })
        .from(clientControls)
        .leftJoin(controls, eq(clientControls.controlId, controls.id))
        .where(eq(clientControls.clientId, clientId))
        .limit(5);

    console.log("\n--- Joined Data (First 5) ---");
    console.table(joined);

    process.exit(0);
}

main().catch(console.error);
