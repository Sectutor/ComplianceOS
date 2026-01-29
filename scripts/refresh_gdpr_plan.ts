
import 'dotenv/config';
import { getDb } from '../db';
import * as schema from '../schema';
import { eq, and } from 'drizzle-orm';

async function refreshPlan() {
    const db = await getDb();
    if (!db) return;

    const gdprFw = await db.query.complianceFrameworks.findFirst({
        where: eq(schema.complianceFrameworks.shortCode, "GDPR")
    });

    if (!gdprFw) return;

    const plan = await db.query.implementationPlans.findFirst({
        where: and(
            eq(schema.implementationPlans.frameworkId, gdprFw.id),
            eq(schema.implementationPlans.id, 18)
        )
    });

    if (!plan) return;

    await db.delete(schema.implementationTasks)
        .where(eq(schema.implementationTasks.implementationPlanId, plan.id));

    const requirements = await db.select({
        requirement: schema.frameworkRequirements,
        phase: schema.implementationPhases
    })
        .from(schema.frameworkRequirements)
        .leftJoin(schema.implementationPhases, eq(schema.frameworkRequirements.phaseId, schema.implementationPhases.id))
        .where(eq(schema.frameworkRequirements.frameworkId, gdprFw.id));

    const tasksToInsert = requirements.map((r: any) => ({
        implementationPlanId: plan.id,
        clientId: plan.clientId,
        title: r.requirement.title,
        description: r.requirement.description,
        status: 'todo',
        priority: 'medium',
        pdca: r.phase?.name || 'Plan',
        tags: r.requirement.mappingTags || [],
        createdById: 1
    }));

    if (tasksToInsert.length > 0) {
        await db.insert(schema.implementationTasks).values(tasksToInsert);
        console.log(`Successfully refreshed ${tasksToInsert.length} tasks for GDPR plan.`);
    }

    process.exit(0);
}

refreshPlan();
