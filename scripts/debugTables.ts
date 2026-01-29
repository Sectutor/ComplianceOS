
import { getDb } from '../db.ts';
import { sql } from 'drizzle-orm';
import 'dotenv/config';

async function check() {
    const db = await getDb();
    try {
        const result = await db.execute(sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`);
        console.log("Tables in DB:", result.map((r: any) => r.table_name).join(', '));
    } catch (err) {
        console.error("Error listing tables:", err);
    }
    process.exit(0);
}

check();
