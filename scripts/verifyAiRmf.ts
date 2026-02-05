
import 'dotenv/config';
import { getDb } from '../packages/core/src/db';
import * as schema from '../packages/core/src/schema';
import { eq, count, isNotNull } from 'drizzle-orm';

async function verifyAiRmf() {
    const db = await getDb();
    const clientId = 3;

    console.log('🔍 Verifying AI RMF Categories...');

    const aiProjects = await db.select().from(schema.projects).where(eq(schema.projects.projectType, 'ai'));
    for (const p of aiProjects) {
        const risksWithAiRmf = await db.select()
            .from(schema.riskAssessments)
            .where(isNotNull(schema.riskAssessments.aiRmfCategory));

        console.log(`\nProject: ${p.name}`);
        console.log(`  Risks with AI RMF categories: ${risksWithAiRmf.length}`);
        if (risksWithAiRmf.length > 0) {
            const sample = risksWithAiRmf[0];
            console.log(`  Sample AI RMF Category: ${sample.aiRmfCategory}`);
        }
    }

    process.exit(0);
}

verifyAiRmf().catch(console.error);
