
import 'dotenv/config';
import { getDb } from '../db';
import * as schema from '../schema';
import { eq } from 'drizzle-orm';

async function checkTasks() {
    const db = await getDb();
    if (!db) return;

    const planId = 18; // From previous logs
    const tasks = await db.select().from(schema.implementationTasks)
        .where(eq(schema.implementationTasks.implementationPlanId, planId));

    console.log(`Tasks for Plan ${planId}:`);
    tasks.forEach(t => {
        console.log(`[${t.pdca}] ${t.title}`);
    });

    process.exit(0);
}

checkTasks();
