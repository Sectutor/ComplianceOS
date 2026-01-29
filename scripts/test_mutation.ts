
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../schema';
import * as dotenv from 'dotenv';
import { eq, desc } from 'drizzle-orm';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/compliance_os';
const client = postgres(connectionString);
const db = drizzle(client, { schema });

async function testMutation() {
    console.log('--- Testing Create Mutation Logic ---');
    const input = {
        clientId: 3, // Valid Client ID
        step: 2,
        data: {
            scope: { test: "Simulated Scope" }
        }
    };

    try {
        // 1. Check for existing
        let assessment = await db.query.readinessAssessments.findFirst({
            where: eq(schema.readinessAssessments.clientId, input.clientId),
            orderBy: [desc(schema.readinessAssessments.updatedAt)]
        });

        if (!assessment) {
            console.log("No existing assessment. Creating new...");
            const [newAssessment] = await db.insert(schema.readinessAssessments).values({
                clientId: input.clientId,
                name: `ISO 27001 Readiness - ${new Date().getFullYear()}`,
                currentStep: input.step || 1,
                scopeDetails: input.data?.scope,
                // Insert other fields as null/undefined is fine
            }).returning();
            console.log("Created successfully:", newAssessment);
        } else {
            console.log("Found existing:", assessment.id);
            const [updated] = await db.update(schema.readinessAssessments)
                .set({
                    currentStep: input.step,
                    scopeDetails: input.data.scope,
                    updatedAt: new Date()
                })
                .where(eq(schema.readinessAssessments.id, assessment.id))
                .returning();
            console.log("Updated successfully:", updated);
        }

    } catch (error) {
        console.error('Mutation failed:', error);
    } finally {
        process.exit(0);
    }
}

testMutation();
