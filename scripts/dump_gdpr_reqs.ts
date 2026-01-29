
import 'dotenv/config';
import { getDb } from '../db';
import * as schema from '../schema';
import { eq } from 'drizzle-orm';

async function dumpRequirements() {
    const db = await getDb();
    if (!db) return;

    const gdpr = await db.query.complianceFrameworks.findFirst({
        where: eq(schema.complianceFrameworks.shortCode, "GDPR")
    });

    if (!gdpr) {
        console.log("No GDPR framework");
        return;
    }

    const requirements = await db.select().from(schema.frameworkRequirements)
        .where(eq(schema.frameworkRequirements.frameworkId, gdpr.id));

    const phases = await db.select().from(schema.implementationPhases)
        .where(eq(schema.implementationPhases.frameworkId, gdpr.id));

    const phaseMap = new Map(phases.map(p => [p.id, p.name]));

    console.log(`GDPR Requirements (${requirements.length}):`);
    requirements.forEach(r => {
        const phaseName = r.phaseId ? phaseMap.get(r.phaseId) : 'No Phase';
        console.log(`[${phaseName}] ${r.identifier}: ${r.title}`);
    });

    process.exit(0);
}

dumpRequirements();
