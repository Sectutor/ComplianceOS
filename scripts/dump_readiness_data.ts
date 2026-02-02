
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../packages/core/src/schema';
import * as dotenv from 'dotenv';
import { eq, desc } from 'drizzle-orm';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/compliance_os';
const client = postgres(connectionString);
const db = drizzle(client, { schema });

async function dumpReadinessData() {
    console.log('--- Dumping Readiness Assessments ---');
    try {
        const assessments = await db.select().from(schema.readinessAssessments)
            .where(eq(schema.readinessAssessments.clientId, 3))
            .orderBy(desc(schema.readinessAssessments.updatedAt));

        if (assessments.length === 0) {
            console.log('No assessments found for Client 3.');
        }

        assessments.forEach(a => {
            console.log(`\nID: ${a.id} | ClientID: ${a.clientId} | Standard: ${a.standardId} | Status: ${a.status} | Step: ${a.currentStep}`);
            console.log('Scope:', JSON.stringify(a.scopeDetails, null, 2));
            console.log('Stakeholders:', JSON.stringify(a.stakeholders, null, 2));
            console.log('Policies:', JSON.stringify(a.existingPolicies, null, 2));
            console.log('Context:', JSON.stringify(a.businessContext, null, 2));
            console.log('Expectations:', JSON.stringify(a.maturityExpectations, null, 2));
            console.log('Report Length:', a.scopingReport?.length || 0);
            console.log('-----------------------------------');
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        process.exit(0);
    }
}

dumpReadinessData();
