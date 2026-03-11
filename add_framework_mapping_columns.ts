import { getDb } from './packages/core/src/db';
import { sql } from 'drizzle-orm';

async function migrate() {
    const db = await getDb();

    console.log('Adding framework mapping columns to nis2_mappings table...');

    try {
        // Add columns if they don't exist (using raw SQL for safety)
        await db.execute(sql`
            ALTER TABLE nis2_mappings 
            ADD COLUMN IF NOT EXISTS nist_csf_control_ids JSONB,
            ADD COLUMN IF NOT EXISTS soc2_control_ids JSONB,
            ADD COLUMN IF NOT EXISTS pci_dss_control_ids JSONB;
        `);

        console.log('Columns added successfully!');
    } catch (error) {
        console.error('Migration failed:', error);
    }
}

migrate();
