
import 'dotenv/config';
import { getDb } from '../db';
import * as schema from '../schema';
import { eq } from 'drizzle-orm';

async function testHeuristics() {
    const db = await getDb();
    if (!db) return;

    const planId = 18;
    const tasks = await db.select().from(schema.implementationTasks)
        .where(eq(schema.implementationTasks.implementationPlanId, planId));

    console.log("Testing Bound Heuristics on Plan 18:");
    for (const task of tasks) {
        let phase = 'Plan'; // Default
        const text = (task.title + " " + (task.description || "")).toLowerCase();

        if (text.match(/\b(policy|define|scope|assess|risk|plan|strategy|inventory|governance|accountability|basis|lawfulness|appoint)\b/)) {
            phase = 'Plan';
        } else if (text.match(/\b(audit|review|test|monitor|scan|check|verify|verification|effectiveness|kpi)\b/)) {
            phase = 'Check';
        } else if (text.match(/\b(remediate|correct|improve|update|fix|act|response|incident|breach|notification)\b/)) {
            phase = 'Act';
        } else if (text.match(/\b(implement|deploy|install|configure|enable|train|rollout|execute|workflow|technical|transparency|notice|rights|access|erasure|transfer|measure)\b/)) {
            phase = 'Do';
        }

        console.log(`[${task.pdca} -> ${phase}] ${task.title}`);
    }

    process.exit(0);
}

testHeuristics();
