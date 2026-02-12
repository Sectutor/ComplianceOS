
import postgres from 'postgres';
import * as dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config();

async function addColumn() {
    const url = process.env.DATABASE_URL;
    if (!url) {
        console.error('DATABASE_URL is not set');
        process.exit(1);
    }

    console.log('Connecting to database...');
    const sql = postgres(url, { ssl: { rejectUnauthorized: false } });

    try {
        console.log('Checking for table existence...');
        const tables = await sql`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name = 'samm_stream_assessments'
        `;

        if (tables.length === 0) {
            console.error('Table samm_stream_assessments does not exist.');
            process.exit(1);
        }

        console.log('Adding column criteria_notes to samm_stream_assessments...');
        await sql`
            ALTER TABLE samm_stream_assessments 
            ADD COLUMN IF NOT EXISTS criteria_notes jsonb DEFAULT '{}'::jsonb
        `;
        console.log('✓ Successfully added criteria_notes column');

    } catch (error: any) {
        console.error('Error adding column:', error.message);
        process.exit(1);
    } finally {
        await sql.end();
    }
}

addColumn();
