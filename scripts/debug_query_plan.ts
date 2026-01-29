
import 'dotenv/config';
import { getDb } from "../db";
import * as schema from "../schema";
import { eq } from "drizzle-orm";

async function debugQuery() {
    const db = await getDb();
    console.log("🔍 Debugging Drizzle Query...");

    // 1. Get a client ID (first one)
    const client = await db.query.clients.findFirst();
    if (!client) {
        console.log("❌ No clients found.");
        return;
    }
    console.log(`👤 Using Client ID: ${client.id}`);

    // 2. Try to fetch plan with phases
    // We need to know what 'plans' maps to in the schema export. 
    // Usually it is 'implementationPlans'.
    // And users usually alias it or import it. 
    // db.query.implementationPlans

    const plan = await db.query.implementationPlans.findFirst({
        where: eq(schema.implementationPlans.clientId, client.id),
        with: {
            // @ts-ignore - checking if this relation exists at runtime
            phases: true
        }
    });

    if (plan) {
        console.log(`✅ Found Plan: ${plan.title} (ID: ${plan.id})`);
        // @ts-ignore
        if (plan.phases) {
            // @ts-ignore
            console.log(`   > Phases count: ${plan.phases.length}`);
        } else {
            console.log(`   > Phases: undefined or null`);
        }
    } else {
        console.log("❌ No plan found for this client.");
    }

    // 3. Check simple fetch of phases
    if (plan && plan.frameworkId) {
        const phases = await db.query.implementationPhases.findMany({
            where: eq(schema.implementationPhases.frameworkId, plan.frameworkId)
        });
        console.log(`ℹ️ Manual fetch of phases for FrameworkID ${plan.frameworkId}: ${phases.length}`);
    }
}

debugQuery().catch(console.error);
