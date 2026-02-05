
import 'dotenv/config';
import { getDb } from '../packages/core/src/db';
import * as schema from '../packages/core/src/schema';
import { eq, desc } from 'drizzle-orm';

async function verifyNewProjects() {
    const db = await getDb();
    const clientId = 3;

    const newProjects = await db.select()
        .from(schema.projects)
        .where(eq(schema.projects.clientId, clientId))
        .orderBy(desc(schema.projects.id))
        .limit(5);

    console.log(`--- Verifying Last 5 Projects ---`);
    for (const p of newProjects) {
        const risks = await db.select().from(schema.riskScenarios).where(eq(schema.riskScenarios.projectId, p.id));
        const mapping = await db.select().from(schema.projectComplianceMappings).where(eq(schema.projectComplianceMappings.projectId, p.id));
        console.log(`\nProject: ${p.name} (ID: ${p.id})`);
        console.log(`- Risks: ${risks.length}`);
        console.log(`- Compliance Mappings: ${mapping.length}`);
        if (risks.length > 0) {
            console.log('  CSF Functions:', [...new Set(risks.map(r => r.csfFunction))]);
            console.log('  OWASP Categories:', [...new Set(risks.map(r => r.owaspCategory))]);
        }
    }

    process.exit(0);
}

verifyNewProjects();
