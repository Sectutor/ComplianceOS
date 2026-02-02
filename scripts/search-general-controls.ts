import { getDb } from '../packages/core/src/db';
import { controls } from '../packages/core/src/schema';
import { like, or } from 'drizzle-orm';

async function main() {
    try {
        const db = await getDb();
        const results = await db.select()
            .from(controls)
            .where(like(controls.framework, '%ISO 27001%'))
            .limit(20);
        console.log("FOUND_CONTROLS:" + JSON.stringify(results));
    } catch (e) {
        console.error(e);
    }
}

main().then(() => process.exit(0));
