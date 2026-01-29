import 'dotenv/config';
import { getDb } from '../db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

async function applyMigration() {
    const db = await getDb();

    try {
        // Read the migration SQL file
        const migrationPath = path.join(process.cwd(), 'drizzle', '0001_organic_annihilus.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

        console.log('📦 Applying migration: 0001_organic_annihilus.sql');
        console.log('⚠️  This will drop the "relationship" column from control_mappings table');
        console.log('✓ Table is empty - no data will be lost\n');

        // Execute the migration
        await db.execute(sql.raw(migrationSQL));

        console.log('✅ Migration applied successfully!');
        console.log('\nNew tables created:');
        console.log('  - bc_plan_bias');
        console.log('  - bc_plan_strategies');
        console.log('  - bc_plan_scenarios');
        console.log('  - bc_plan_contacts');
        console.log('  - plan_versions');
        console.log('  - plan_change_log');
        console.log('  - plan_exercises');
        console.log('\nSchema updates:');
        console.log('  - recovery_objectives (formerly healing_time_objectives)');
        console.log('  - Updated work_item_type enum with control_implementation');

    } catch (error: any) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }

    process.exit(0);
}

applyMigration();
