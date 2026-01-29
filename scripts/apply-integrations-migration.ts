import 'dotenv/config';
import { getDb } from '../db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

async function applyMigration() {
    console.log('Using DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 20) + '...');
    const db = await getDb();

    try {
        // Read the migration SQL file
        const migrationPath = path.join(process.cwd(), 'drizzle', '0007_quick_kinsey_walden.sql');
        
        if (!fs.existsSync(migrationPath)) {
             console.error('Migration file not found at:', migrationPath);
             process.exit(1);
        }

        const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

        console.log('📦 Applying migration: 0007_quick_kinsey_walden.sql');
        console.log('SQL content length:', migrationSQL.length);
        console.log('SQL Preview:', migrationSQL.substring(0, 100));

        // Execute the migration
        await db.execute(sql.raw(migrationSQL));

        console.log('✅ Migration applied successfully!');
        console.log('\nNew tables created:');
        console.log('  - integration_definitions');

    } catch (error: any) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
    
    // Close connection manually if possible, or just exit
    process.exit(0);
}

applyMigration();
