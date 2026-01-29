
import "dotenv/config";
import { createContext } from '../packages/core/src/context';
import { createFindingsRouter } from '../packages/core/src/server/routers/findings';
import { createEvidenceRouter } from '../packages/core/src/server/routers/evidence';
import { getDb } from '../packages/core/src/db';
import * as schema from '../packages/core/src/schema';
import { eq } from 'drizzle-orm';

async function main() {
    console.log("Starting Audit Hub Verification...");

    const db = await getDb();

    // 1. Setup Context (Mock User)
    const ctx = {
        user: { id: 1, email: 'admin@example.com', role: 'admin' },
        session: null
    };

    // Initialize Routers
    // Note: We need to bind the t variable or mock the trpc structure, 
    // but for simplicity in this script, we'll direct call if possible or verify via DB direct first
    // Actually, calling routers purely from script is hard without the full trpc init.
    // Let's test via direct DB operations that mirror the router logic to ensure schema is correct.

    const clientId = 1; // Assuming client 1 exists

    console.log("1. Creating a new Finding...");
    const [newFinding] = await db.insert(schema.auditFindings).values({
        clientId: clientId,
        title: "Test Finding via Script",
        description: "This is a test finding created by the verification script.",
        severity: "high",
        status: "open",
        authorId: 1
    }).returning();

    console.log("   ✅ Created finding:", newFinding.id);

    console.log("2. Verifying Findings List...");
    const findings = await db.select().from(schema.auditFindings).where(eq(schema.auditFindings.clientId, clientId));
    if (findings.length > 0) {
        console.log(`   ✅ Found ${findings.length} findings.`);
    } else {
        console.error("   ❌ No findings found!");
    }

    console.log("3. Creating an Evidence Comment...");
    // valid evidence ID?
    const evidence = await db.query.evidence.findFirst({
        where: eq(schema.evidence.clientId, clientId)
    });

    if (evidence) {
        await db.insert(schema.evidenceComments).values({
            evidenceId: evidence.id,
            userId: 1,
            content: "Test comment from verification script."
        });
        console.log("   ✅ Comment added to evidence ID:", evidence.id);
    } else {
        console.log("   ⚠️ No evidence found for client 1, skipping comment test.");
    }

    console.log("Verification Complete!");
    process.exit(0);
}

main().catch(console.error);
