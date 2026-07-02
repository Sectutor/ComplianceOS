/**
 * Migration: Add CUI boundary columns to assets and create federalContracts table
 * Run with: npx tsx add_cui_federal_contracts.ts
 */
import 'dotenv/config';
import { getDb } from "./packages/core/src/db";
import { sql } from 'drizzle-orm';

async function migrate() {
    const db = await getDb();

    console.log('Starting migration...');

    // 1. Add CUI columns to assets table
    console.log('Adding CUI columns to assets table...');

    try {
        await db.execute(sql`ALTER TABLE assets ADD COLUMN IF NOT EXISTS cui_scope boolean DEFAULT false`);
        console.log('✓ Added cui_scope column');
    } catch (e: any) {
        if (e.message?.includes('duplicate')) {
            console.log('⚠ cui_scope column already exists');
        } else {
            console.error('Error adding cui_scope:', e.message);
        }
    }

    try {
        await db.execute(sql`ALTER TABLE assets ADD COLUMN IF NOT EXISTS cui_category varchar(100)`);
        console.log('✓ Added cui_category column');
    } catch (e: any) {
        if (e.message?.includes('duplicate')) {
            console.log('⚠ cui_category column already exists');
        } else {
            console.error('Error adding cui_category:', e.message);
        }
    }

    try {
        await db.execute(sql`ALTER TABLE assets ADD COLUMN IF NOT EXISTS cui_justification text`);
        console.log('✓ Added cui_justification column');
    } catch (e: any) {
        if (e.message?.includes('duplicate')) {
            console.log('⚠ cui_justification column already exists');
        } else {
            console.error('Error adding cui_justification:', e.message);
        }
    }

    // 2. Create federalContracts table
    console.log('Creating federalContracts table...');

    try {
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS federal_contracts (
                id serial PRIMARY KEY,
                client_id integer NOT NULL,
                title varchar(255) NOT NULL,
                description text,
                agency_name varchar(255),
                contract_number varchar(255),
                type varchar(50) DEFAULT 'prime',
                status varchar(50) DEFAULT 'active',
                fisma_system_id integer,
                dfars_7012 boolean DEFAULT false,
                dfars_7019 boolean DEFAULT false,
                dfars_7020 boolean DEFAULT false,
                dfars_7021 boolean DEFAULT false,
                far_52_204_21 boolean DEFAULT false,
                cmmc_level varchar(20),
                start_date timestamp,
                end_date timestamp,
                created_at timestamp DEFAULT NOW(),
                updated_at timestamp DEFAULT NOW()
            )
        `);
        console.log('✓ Created federal_contracts table');
    } catch (e: any) {
        if (e.message?.includes('already exists')) {
            console.log('⚠ federal_contracts table already exists');
        } else {
            console.error('Error creating federal_contracts:', e.message);
        }
    }

    // 3. Create index on client_id
    try {
        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_fed_ctrcts_client ON federal_contracts(client_id)`);
        console.log('✓ Created index on federal_contracts.client_id');
    } catch (e: any) {
        if (e.message?.includes('already exists')) {
            console.log('⚠ Index already exists');
        } else {
            console.error('Error creating index:', e.message);
        }
    }

    console.log('\n✅ Migration complete!');
    console.log('\nTo verify, run:');
    console.log('  psql $DATABASE_URL -c "\\d assets" | grep cui');
    console.log('  psql $DATABASE_URL -c "\\d federal_contracts"');
}

migrate()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Migration failed:', err);
        process.exit(1);
    });
