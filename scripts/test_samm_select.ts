
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as dotenv from 'dotenv';
import { sammStreamAssessments } from '../packages/core/src/schema';
import { eq } from 'drizzle-orm';

dotenv.config();

async function test() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        console.error('DATABASE_URL is not set');
        process.exit(1);
    }

    const client = postgres(url, { ssl: { rejectUnauthorized: false } });
    const db = drizzle(client);

    try {
        console.log('Testing select criteria_notes...');
        const results = await db.select({
            id: sammStreamAssessments.id,
            criteria_notes: sammStreamAssessments.criteriaNotes
        })
            .from(sammStreamAssessments)
            .limit(1);

        console.log('Results:', results);
        console.log('✓ Successfully selected criteria_notes');

    } catch (error: any) {
        console.error('❌ Failed to select criteria_notes:', error.message);
    } finally {
        await client.end();
    }
}

test();
