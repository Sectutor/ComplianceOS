
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../schema';
import * as dotenv from 'dotenv';
import { eq } from 'drizzle-orm';

dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/compliance_os';
const client = postgres(connectionString);
const db = drizzle(client, { schema });

async function checkClients() {
    console.log('Checking clients table...');
    try {
        const clients = await db.select().from(schema.clients);
        console.log(`Found ${clients.length} clients:`);
        clients.forEach(c => {
            console.log(`- ID: ${c.id}, Name: ${c.name}, Industry: ${c.industry}`);
        });

        if (clients.length === 0) {
            console.log('Use `npm run seed` or similar to populate data if available, or create a client via the UI.');
        }

    } catch (error) {
        console.error('Error accessing clients table:', error);
    } finally {
        process.exit(0);
    }
}

checkClients();
