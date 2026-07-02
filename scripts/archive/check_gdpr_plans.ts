
import 'dotenv/config';
import { getDb } from './db';
import * as schema from './schema';
import { eq } from 'drizzle-orm';

async function main() {
    const db = await getDb();

    // 1. Find GDPR framework
    const gdpr = await db.query.complianceFrameworks.findFirst({
        where: eq(schema.complianceFrameworks.shortCode, "GDPR")
    });

    if (!gdpr) {
        console.log("❌ GDPR framework not found in database!");
        process.exit(1);
    }

    console.log(`✅ GDPR framework found (ID: ${gdpr.id})`);

    // 2. Find all plans
    const allPlans = await db.select().from(schema.implementationPlans);
    console.log(`Total plans in DB: ${allPlans.length}`);

    const gdprPlans = allPlans.filter(p => p.frameworkId === gdpr.id);
    console.log(`Found ${gdprPlans.length} implementation plans for GDPR.`);
    gdprPlans.forEach(p => console.log(` - [ID: ${p.id}] ${p.title}`));

    process.exit(0);
}

main();
