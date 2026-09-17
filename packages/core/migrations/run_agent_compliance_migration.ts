import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(process.cwd(), '.env') });

async function runMigration() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();
        console.log('Connected to database');

        const schemas = ['agent_compliance_schema.sql', 'agent_compliance_phase2_schema.sql', 'agent_compliance_phase3_schema.sql'];
        for (const schemaFile of schemas) {
            const sqlPath = path.join(__dirname, schemaFile);
            console.log(`Running migration: ${schemaFile}...`);
            const sql = fs.readFileSync(sqlPath, 'utf8');
            await client.query(sql);
        }
        console.log('✅ All Agent Compliance migrations completed successfully!');

    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    } finally {
        await client.end();
    }
}

runMigration();