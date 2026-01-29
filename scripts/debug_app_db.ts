import 'dotenv/config';
import { getDb, closeDb } from '../db';
import { sql } from 'drizzle-orm';

async function test() {
    console.log("Starting App DB Debug...");
    try {
        const db = await getDb();
        console.log("DB Initialized.");
        const result = await db.execute(sql`SELECT 1 as connected`);
        console.log("Query Result:", result);
    } catch (e) {
        console.error("App DB Connection Failed:", e);
    } finally {
        await closeDb();
    }
}

test();
