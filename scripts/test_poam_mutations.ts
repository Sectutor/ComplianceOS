
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../schema';
import { eq, and, desc } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/compliance_os';
const client = postgres(connectionString);
const db = drizzle(client, { schema });

async function testMutations() {
    try {
        console.log('--- Testing POA&M Mutations ---');

        // Find a client
        const clientData = await db.query.clients.findFirst();
        if (!clientData) throw new Error("No client found");
        const clientId = clientData.id;

        // Find a POAM
        let poam = await db.query.federalPoams.findFirst({
            where: eq(schema.federalPoams.clientId, clientId)
        });

        if (!poam) {
            console.log("Creating test POAM...");
            const result = await db.insert(schema.federalPoams).values({
                clientId,
                title: "Test POAM",
                status: "active"
            }).returning();
            poam = result[0];
        }

        console.log(`Testing addPoamItem for POAM ID: ${poam.id}...`);

        // Test adding item with null/empty-equivalent values
        const [newItem] = await db.insert(schema.poamItems).values({
            poamId: poam.id,
            weaknessName: "Test Weakness " + Date.now(),
            status: "open",
            originalDetectionDate: null,
            weaknessDetectorSource: "Automated Test"
        }).returning();

        console.log("Item added successfully:", newItem.id);

        // Test updating
        console.log(`Testing updatePoamItem for ID: ${newItem.id}...`);
        const [updatedItem] = await db.update(schema.poamItems)
            .set({
                weaknessDescription: "Updated from test script",
                updatedAt: new Date()
            })
            .where(eq(schema.poamItems.id, newItem.id))
            .returning();

        console.log("Item updated successfully.");

        // Cleanup
        await db.delete(schema.poamItems).where(eq(schema.poamItems.id, newItem.id));
        console.log("Test item cleaned up.");

        process.exit(0);
    } catch (error) {
        console.error("Test failed:", error);
        process.exit(1);
    }
}

testMutations();
