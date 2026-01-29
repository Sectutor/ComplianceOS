
import 'dotenv/config';
import { getDb } from './db';
import * as schema from './schema';
import { eq } from 'drizzle-orm';

async function main() {
    const db = await getDb();

    const planId = 18; // The GDPR plan I created
    const targetUserId = 33; // aroms2001
    const targetClientId = 3; // Intellfence

    console.log(`Fixing Plan ${planId}...`);

    // 1. Update the plan
    await db.update(schema.implementationPlans)
        .set({
            clientId: targetClientId,
            createdById: targetUserId
        })
        .where(eq(schema.implementationPlans.id, planId));

    // 2. Update the tasks
    await db.update(schema.implementationTasks)
        .set({
            clientId: targetClientId,
            createdById: targetUserId
        })
        .where(eq(schema.implementationTasks.implementationPlanId, planId));

    console.log(`✅ Plan ${planId} and its tasks re-assigned to User ${targetUserId} and Client ${targetClientId}.`);

    process.exit(0);
}

main();
