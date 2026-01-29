
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
}

const client = postgres(process.env.DATABASE_URL, { max: 1 });

async function checkSchema() {
    try {
        const result = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name = 'control_baselines';
    `;

        console.log('Tables found:', result);

        if (result.length > 0) {
            console.log('control_baselines table EXISTS.');

            const count = await client`SELECT count(*) FROM control_baselines`;
            console.log('Row count:', count[0].count);
        } else {
            console.log('control_baselines table DOES NOT EXIST.');
        }

    } catch (err) {
        console.error('Error checking schema:', err);
    } finally {
        await client.end();
    }
}

checkSchema();
