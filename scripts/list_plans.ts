
import 'dotenv/config';
import { getDb } from '../db';
import * as schema from '../schema';
import { eq, isNotNull } from 'drizzle-orm';

async function listAllPlans() {
    const db = await getDb();
    if (!db) return;

    const plans = await db.select({
        id: schema.implementationPlans.id,
        title: schema.implementationPlans.title,
        framework: schema.complianceFrameworks.shortCode
    })
        .from(schema.implementationPlans)
        .leftJoin(schema.complianceFrameworks, eq(schema.implementationPlans.frameworkId, schema.complianceFrameworks.id));

    console.log("Current Implementation Plans:");
    plans.forEach((p: { id: number; title: string; framework: string | null }) => {
        console.log(`[ID: ${p.id}] ${p.title} (${p.framework || 'No Framework'})`);
    });

    process.exit(0);
}

listAllPlans();
