
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
}

const migrationClient = postgres(process.env.DATABASE_URL, { max: 1 });

async function runMigration() {
    console.log('Running manual migration...');

    const migrationFile = '0009_opposite_spitfire.sql';
    const migrationPath = path.join(process.cwd(), 'drizzle', migrationFile);

    if (!fs.existsSync(migrationPath)) {
        console.error(`Migration file not found: ${migrationPath}`);
        process.exit(1);
    }

    const sqlContent = fs.readFileSync(migrationPath, 'utf8');

    try {
        // Split by semicolons to run statements individually if needed, or just run the whole block
        // postgres.js handles multi-statement queries usually
        await migrationClient.unsafe(sqlContent);
        console.log('Migration applied successfully!');
    } catch (err) {
        console.error('Error applying migration:', err);
    } finally {
        await migrationClient.end();
    }
}

runMigration();
