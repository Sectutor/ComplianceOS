
import 'dotenv/config';
import { getDb } from './db';
import * as schema from './schema';
import { eq } from 'drizzle-orm';

async function main() {
    const db = await getDb();
    const allReqs = await db.select().from(schema.frameworkRequirements);
    console.log(`Total requirements in DB: ${allReqs.length}`);

    const iso = await db.query.complianceFrameworks.findFirst({
        where: eq(schema.complianceFrameworks.shortCode, "ISO27001")
    });

    if (iso) {
        const isoReqs = allReqs.filter(r => r.frameworkId === iso.id);
        console.log(`ISO 27001 (ID: ${iso.id}) has ${isoReqs.length} requirements.`);
        isoReqs.forEach(r => console.log(` - [${r.identifier}] ${r.title}`));
    }

    const soc2 = await db.query.complianceFrameworks.findFirst({
        where: eq(schema.complianceFrameworks.shortCode, "SOC2")
    });

    if (soc2) {
        const soc2Reqs = allReqs.filter(r => r.frameworkId === soc2.id);
        console.log(`SOC 2 (ID: ${soc2.id}) has ${soc2Reqs.length} requirements.`);
        soc2Reqs.forEach(r => console.log(` - [${r.identifier}] ${r.title}`));
    }

    process.exit(0);
}

main();
