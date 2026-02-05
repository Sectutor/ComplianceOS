
import 'dotenv/config';
import { getDb } from '../packages/core/src/db';
import * as schema from '../packages/core/src/schema';
import { eq, count } from 'drizzle-orm';

async function verifySeeding() {
    const db = await getDb();
    const clientId = 3;

    const projectCount = await db.select({ value: count() }).from(schema.projects).where(eq(schema.projects.clientId, clientId));
    const riskCount = await db.select({ value: count() }).from(schema.riskScenarios).where(eq(schema.riskScenarios.clientId, clientId));
    const modelCount = await db.select({ value: count() }).from(schema.threatModels).where(eq(schema.threatModels.clientId, clientId));
    const complianceCount = await db.select({ value: count() }).from(schema.projectComplianceMappings);

    console.log('--- Seeding Verification ---');
    console.log(`Projects for Client 3: ${projectCount[0].value}`);
    console.log(`Risks for Client 3: ${riskCount[0].value}`);
    console.log(`Threat Models for Client 3: ${modelCount[0].value}`);
    console.log(`Total Compliance Mappings: ${complianceCount[0].value}`);

    // Check one project's stats
    const [firstProject] = await db.select().from(schema.projects).where(eq(schema.projects.clientId, clientId)).limit(1);
    const projectRisks = await db.select().from(schema.riskScenarios).where(eq(schema.riskScenarios.projectId, firstProject.id));

    console.log(`\nStats for Project: ${firstProject.name}`);
    console.log(`Risks: ${projectRisks.length}`);
    console.log('CSF Functions found:', [...new Set(projectRisks.map(r => r.csfFunction))]);
    console.log('OWASP Categories found:', [...new Set(projectRisks.map(r => r.owaspCategory))]);

    process.exit(0);
}

verifySeeding();
