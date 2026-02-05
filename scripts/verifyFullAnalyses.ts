
import 'dotenv/config';
import { getDb } from '../packages/core/src/db';
import * as schema from '../packages/core/src/schema';
import { eq, count } from 'drizzle-orm';

async function verifyAnalyses() {
    const db = await getDb();
    const clientId = 3;

    console.log('🔍 Verifying Data for Client 3...');

    const [projectCount] = await db.select({ value: count() }).from(schema.projects).where(eq(schema.projects.clientId, clientId));
    const [riskCount] = await db.select({ value: count() }).from(schema.riskAssessments).where(eq(schema.riskAssessments.clientId, clientId));
    const [treatmentCount] = await db.select({ value: count() }).from(schema.riskTreatments).where(eq(schema.riskTreatments.clientId, clientId));
    const [modelCount] = await db.select({ value: count() }).from(schema.threatModels).where(eq(schema.threatModels.clientId, clientId));

    console.log(`- Projects: ${projectCount.value}`);
    console.log(`- Risk Assessments: ${riskCount.value}`);
    console.log(`- Risk Treatments: ${treatmentCount.value}`);
    console.log(`- Threat Models: ${modelCount.value}`);

    const projects = await db.select().from(schema.projects).where(eq(schema.projects.clientId, clientId));
    for (const p of projects) {
        const risks = await db.select().from(schema.riskAssessments).where(eq(schema.riskAssessments.projectId, p.id));
        const privacyRisks = risks.filter(r => r.privacyImpact === true);
        const securityRisks = risks.filter(r => r.privacyImpact === false);

        console.log(`\nProject: ${p.name} (Type: ${p.projectType})`);
        console.log(`  Security Risks: ${securityRisks.length}`);
        console.log(`  Privacy Risks: ${privacyRisks.length}`);

        if (risks.length > 0) {
            const sample = risks[0];
            const treatments = await db.select().from(schema.riskTreatments).where(eq(schema.riskTreatments.riskAssessmentId, sample.id));
            console.log(`  Sample Risk: "${sample.title}" - Status: ${sample.status}, Residual Score: ${sample.residualScore}, Treatments: ${treatments.length}`);
        }
    }

    process.exit(0);
}

verifyAnalyses().catch(console.error);
