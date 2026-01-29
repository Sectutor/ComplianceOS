
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../schema';
import * as dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/compliance_os';

async function checkHealth() {
    console.log('--- Health Check ---');

    // 1. Database Check
    console.log('1. Checking Database Connection...');
    try {
        const sql = postgres(connectionString);
        const db = drizzle(sql, { schema });
        const clients = await db.select().from(schema.clients).limit(5);
        console.log(`   [OK] Database connected. Found ${clients.length} clients.`);
        clients.forEach(c => console.log(`      - ID ${c.id}: ${c.name}`));
        await sql.end();
    } catch (error) {
        console.error('   [FAIL] Database Error:', error);
    }

    // 2. Server Check (if running on port 3000 or similar)
    console.log('\n2. Checking API Server (localhost:3000)...');
    try {
        // Assuming TRPC health check or similar exists, or just root
        // Since we don't have a dedicated health endpoint, we'll try a simple fetch or just skip if we can't easily curl from here.
        // We'll rely on the DB check mostly for "all clients missing".
        console.log('   (Skipping HTTP check from script, relying on DB check first)');
    } catch (error) {
        console.error('   [FAIL] Server Error:', error);
    }

    process.exit(0);
}

checkHealth();
