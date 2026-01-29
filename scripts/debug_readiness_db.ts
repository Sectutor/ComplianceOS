
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../schema';
import * as dotenv from 'dotenv';
import { eq } from 'drizzle-orm';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/compliance_os';
const client = postgres(connectionString);
const db = drizzle(client, { schema });

async function checkReadinessTable() {
    console.log('Checking readiness_assessments table...');
    try {
        const assessments = await db.select().from(schema.readinessAssessments).limit(1);
        console.log('Current assessments:', assessments);

        // Try inserting a test record
        console.log('Inserting test record...');
        const [inserted] = await db.insert(schema.readinessAssessments).values({
            clientId: 1,
            name: 'Test Assessment',
            status: 'in_progress',
            scopeDetails: { test: 'data' }
        }).returning();
        console.log('Inserted:', inserted);

        // Clean up
        console.log('Cleaning up...');
        await db.delete(schema.readinessAssessments).where(eq(schema.readinessAssessments.id, inserted.id));
        console.log('Cleaned up.');

    } catch (error) {
        console.error('Error accessing readiness_assessments:', error);
    } finally {
        process.exit(0);
    }
}

checkReadinessTable();
