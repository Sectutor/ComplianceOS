
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { privacyAssessments } from "../schema";
import dotenv from "dotenv";
import { eq, and } from "drizzle-orm";

dotenv.config();

const connectionString = process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/compliance_os";
const client = postgres(connectionString);
// Using generic schema to avoid import issues if possible, or import schema
import * as schema from "../schema";
const db = drizzle(client, { schema });

async function main() {
    console.log("Testing insert into privacy_assessments...");
    try {
        // Mock data
        const clientId = 679;
        const type = "gdpr";

        // Check if exists
        const existing = await db.query.privacyAssessments.findFirst({
            where: and(
                eq(privacyAssessments.clientId, clientId),
                eq(privacyAssessments.type, type)
            )
        });

        console.log("Existing record:", existing);

        if (existing) {
            await db.update(privacyAssessments)
                .set({
                    score: 50,
                    updatedAt: new Date()
                })
                .where(eq(privacyAssessments.id, existing.id));
            console.log("Update success");
        } else {
            await db.insert(privacyAssessments).values({
                clientId,
                type,
                responses: { "legal_basis": { answer: "yes", notes: "Test" } },
                status: "in_progress",
                score: 10
            });
            console.log("Insert success");
        }

    } catch (e) {
        console.error("Insert/Update failed:", e);
    } finally {
        await client.end();
    }
}

main();
