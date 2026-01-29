
import 'dotenv/config';
import { getDb } from '../db';
import { policyGenerator } from '../lib/policy/policy-generation';
import { clients, policyTemplates } from '../schema';
import { eq } from 'drizzle-orm';

async function verify() {
    const db = await getDb();
    if (!db) {
        console.error("No DB connection");
        process.exit(1);
    }

    // 1. Get a client or create a dummy one if needed (assuming client 1 exists from seed)
    const client = await db.query.clients.findFirst();
    if (!client) {
        console.error("No clients found to test with.");
        process.exit(1);
    }
    console.log(`Testing with Client: ${client.name} (ID: ${client.id})`);

    // 2. Get the migrated template (ID 1)
    const template = await db.query.policyTemplates.findFirst({
        where: eq(policyTemplates.templateId, "1")
    });

    if (!template) {
        console.error("Template ID 1 not found.");
        process.exit(1);
    }
    console.log(`Testing with Template: ${template.name}`);
    console.log(`Sections present: ${JSON.stringify(template.sections).substring(0, 100)}...`);

    // 3. Generate
    console.log("Generating...");
    try {
        const content = await policyGenerator.generate(client.id, template.id, { tailorToIndustry: false });

        console.log("\n--- Generated Content Preview ---");
        console.log(content.substring(0, 500));
        console.log("---------------------------------");

        if (content.includes("## Purpose")) {
            console.log("SUCCESS: Modular header '## Purpose' found.");
        } else {
            console.error("FAILURE: Modular header '## Purpose' NOT found. Fallback might be active or empty.");
        }

    } catch (e) {
        console.error("Generation failed:", e);
    }

    process.exit(0);
}

verify();
