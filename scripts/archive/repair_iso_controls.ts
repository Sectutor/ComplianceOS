import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve('packages/core/.env') });

import { getDb } from './packages/core/src/db';
import { controls, clientControls } from './packages/core/src/schema';
import { iso27001Controls } from './packages/core/src/data/frameworks/iso27001';
import { eq, and, or } from 'drizzle-orm';

async function repair() {
    console.log('--- ISO 27001:2022 Framework Repair Tool ---');
    const db = await getDb();
    const clientId = 3; // The client reported

    // 1. Fetch current global controls for ISO 27001:2022
    const globalControls = await db.select().from(controls).where(or(
        eq(controls.framework, 'ISO 27001:2022'),
        eq(controls.framework, 'ISO 27001')
    ));

    console.log(`Found ${globalControls.length} global controls in database.`);

    const existingNames = new Set(globalControls.map(c => c.name));
    const existingIds = new Set(globalControls.map(c => c.controlId));

    // 2. Identify missing controls
    const missing = iso27001Controls.filter(c => !existingIds.has(c.id));
    console.log(`Missing ${missing.length} controls from global catalog.`);

    if (missing.length > 0) {
        console.log('Seeding missing global controls...');
        // Insert in batches of 50
        for (let i = 0; i < missing.length; i += 50) {
            const batch = missing.slice(i, i + 50).map(c => ({
                controlId: c.id,
                name: c.name,
                description: c.description,
                framework: "ISO 27001:2022",
                category: c.category,
                status: 'active' as const,
                version: 1
            }));
            await db.insert(controls).values(batch);
        }
        console.log('Global catalog updated.');
    }

    // 3. Ensure client has all controls assigned
    const updatedGlobalControls = await db.select().from(controls).where(or(
        eq(controls.framework, 'ISO 27001:2022'),
        eq(controls.framework, 'ISO 27001')
    ));

    const existingClientMapppings = await db.select({
        controlId: clientControls.controlId
    }).from(clientControls).where(eq(clientControls.clientId, clientId));

    const clientAssignedIds = new Set(existingClientMapppings.map(m => m.controlId));
    
    const missingForClient = updatedGlobalControls.filter(c => !clientAssignedIds.has(c.id));
    console.log(`Missing ${missingForClient.length} controls for Client ${clientId}.`);

    if (missingForClient.length > 0) {
        console.log('Assigning missing controls to client...');
        const clientBatch = missingForClient.map(c => ({
            clientId: clientId,
            controlId: c.id,
            clientControlId: c.controlId, // The varchar ID from the framework
            status: 'not_implemented' as const,
            applicability: 'applicable'
        }));

        // Batch insert client controls
        for (let i = 0; i < clientBatch.length; i += 50) {
            await db.insert(clientControls).values(clientBatch.slice(i, i + 50));
        }
        console.log('Client controls updated.');
    }

    console.log('--- Repair Complete ---');
    process.exit(0);
}

repair().catch(err => {
    console.error('Repair failed:', err);
    process.exit(1);
});
