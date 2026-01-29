
import 'dotenv/config';
import { getDb } from './db';
import { policyTemplates } from './schema';
import { desc } from 'drizzle-orm';

async function checkLast() {
    const db = await getDb();
    if (!db) process.exit(1);

    const last = await db.select().from(policyTemplates).orderBy(desc(policyTemplates.id)).limit(1);
    if (last.length > 0) {
        console.log("Last Template Sections:", last[0].sections);
        console.log("Type:", typeof last[0].sections);
        console.log("Is Array?", Array.isArray(last[0].sections));
    } else {
        console.log("No templates.");
    }
    process.exit(0);
}
checkLast();
