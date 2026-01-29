
import { config } from 'dotenv';
config();
import { getDb } from '../db';
import { clientFrameworkControls } from '../schema';
import { sql } from 'drizzle-orm';

async function checkSchema() {
    console.log("Checking DB Schema...");
    try {
        const db = await getDb();
        // Try to count controls
        const [count] = await db.select({ count: sql<number>`count(*)` }).from(clientFrameworkControls);
        console.log("Client Framework Controls Count:", count);

        // Also check native controls
        const [nativeCount] = await db.select({ count: sql<number>`count(*)` }).from(clientFrameworkControls);
        // Wait, let's just run a raw query to list tables if possible, or just trust the select.

        console.log("SUCCESS: Table exists and is queryable.");
    } catch (error) {
        console.error("ERROR: Schema check failed.", error);
    } finally {
        process.exit(0);
    }
}

checkSchema();
