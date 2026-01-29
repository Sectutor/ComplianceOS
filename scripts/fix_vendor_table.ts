import 'dotenv/config';
import { getDb } from '../db';
import { sql } from 'drizzle-orm';

async function main() {
    console.log('Starting manual database repair...');

    try {
        const db = await getDb();
        console.log('Connected to database.');

        // 1. Create vendor_data_requests table
        console.log('Creating vendor_data_requests table...');
        await db.execute(sql`
      CREATE TABLE IF NOT EXISTS vendor_data_requests (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL,
        vendor_id INTEGER NOT NULL,
        token VARCHAR(64) NOT NULL UNIQUE,
        recipient_email VARCHAR(255),
        message TEXT,
        status VARCHAR(50) DEFAULT 'sent',
        items JSON DEFAULT '[]'::json,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

        // Add indexes for vendor_data_requests
        console.log('Adding indexes for vendor_data_requests...');
        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_vdr_client_vendor ON vendor_data_requests (client_id, vendor_id);`);
        await db.execute(sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_vdr_token ON vendor_data_requests (token);`);
        console.log('vendor_data_requests table created/verified.');

        // 2. Fix notification_settings (add client_id and updated_at if missing)
        console.log('Checking notification_settings...');
        try {
            await db.execute(sql`ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS client_id INTEGER;`);
            await db.execute(sql`ALTER TABLE notification_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();`);
            console.log('Fixed notification_settings columns.');
        } catch (e) {
            console.warn('Note: Issue updating notification_settings (might be minor):', (e as Error).message);
        }

        console.log('Database fix completed successfully!');
        process.exit(0);

    } catch (err) {
        console.error('CRITICAL ERROR fixing database:', err);
        process.exit(1);
    }
}

main();
