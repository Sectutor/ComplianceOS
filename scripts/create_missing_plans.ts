
import 'dotenv/config';
import { getDb } from '../db';
import * as schema from '../schema';
import { eq } from 'drizzle-orm';

async function createMissingPlans() {
    const db = await getDb();
    if (!db) return;

    // 1. Create SOC 2 Plan
    await createPlanForFramework(db, 3, "SOC2", "SOC 2 Type II Readiness", "Tactical implementation plan for SOC 2 Type II compliance.");

    // 2. Create NIST CSF Plan
    await createPlanForFramework(db, 3, "NISTCSF", "NIST CSF 2.0 Implementation", "Cybersecurity improvements alignment with NIST CSF 2.0.");

    process.exit(0);
}

async function createPlanForFramework(db: any, clientId: number, shortCode: string, title: string, description: string) {
    console.log(`\n--- Processing ${shortCode} for Client ${clientId} ---`);

    // Find Framework
    const framework = await db.query.complianceFrameworks.findFirst({
        where: eq(schema.complianceFrameworks.shortCode, shortCode)
    });

    if (!framework) {
        console.error(`❌ Framework ${shortCode} not found. Run seed_framework_baselines.ts first.`);
        return;
    }

    // Check if plan already exists
    const existingPlan = await db.query.implementationPlans.findFirst({
        where: (plans: any, { and, eq }: any) => and(
            eq(plans.frameworkId, framework.id),
            eq(plans.title, title),
            eq(plans.clientId, clientId)
        )
    });

    if (existingPlan) {
        console.log(`⚠️ Plan "${title}" already exists (ID: ${existingPlan.id}). Skipping.`);
        return;
    }

    // Create New Plan
    const [plan] = await db.insert(schema.implementationPlans).values({
        clientId: clientId, // Use passed client ID
        frameworkId: framework.id,
        title: title,
        description: description,
        status: 'planning',
        createdById: 1
    }).returning();

    console.log(`✅ Created Plan: ${title} (ID: ${plan.id})`);

    // Fetch Requirements for this Framework
    const requirements = await db.select({
        req: schema.frameworkRequirements,
        phase: schema.implementationPhases
    })
        .from(schema.frameworkRequirements)
        .leftJoin(schema.implementationPhases, eq(schema.frameworkRequirements.phaseId, schema.implementationPhases.id))
        .where(eq(schema.frameworkRequirements.frameworkId, framework.id));

    if (requirements.length === 0) {
        console.warn(`⚠️ No requirements found for ${shortCode}. Plan created but empty.`);
        return;
    }

    // Seed Tasks
    const tasksToInsert = requirements.map((r: any) => ({
        implementationPlanId: plan.id,
        clientId: plan.clientId,
        title: r.req.title,
        description: r.req.description,
        status: 'todo',
        priority: 'medium',
        pdca: r.phase?.name || 'Plan', // Use the phase name directly as PDCA mapping for now
        tags: [shortCode, r.req.identifier],
        createdById: 1
    }));

    await db.insert(schema.implementationTasks).values(tasksToInsert);
    console.log(`✅ Seeded ${tasksToInsert.length} tasks for ${shortCode}.`);
}

createMissingPlans();
