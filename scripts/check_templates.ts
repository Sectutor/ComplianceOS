
import 'dotenv/config';
import { getDb } from '../db';
import { policyTemplates } from '../schema';

async function run() {
    const db = await getDb();
    const templates = await db.select({ name: policyTemplates.name, frameworks: policyTemplates.frameworks }).from(policyTemplates);
    console.log("Current Templates:", JSON.stringify(templates, null, 2));
    process.exit(0);
}

run().catch(console.error);
