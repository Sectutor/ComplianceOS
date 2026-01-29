
import 'dotenv/config';
import { getDb } from "../db";
import * as schema from "../schema";
import { eq } from "drizzle-orm";

async function checkRequirements() {
    const db = await getDb();
    console.log("🔍 Checking Framework Requirements...");

    const frameworks = await db.query.complianceFrameworks.findMany();
    console.log(`Found ${frameworks.length} frameworks.`);

    for (const fw of frameworks) {
        console.log(`- Framework: ${fw.name} (ID: ${fw.id})`);
        const reqs = await db.query.frameworkRequirements.findMany({
            where: eq(schema.frameworkRequirements.frameworkId, fw.id)
        });
        console.log(`  > Requirements count: ${reqs.length}`);
        if (reqs.length > 0) {
            console.log(`  > Sample: ${reqs[0].title} | PhaseID: ${reqs[0].phaseId}`);
        }
    }
}

checkRequirements().catch(console.error);
