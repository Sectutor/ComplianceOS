import postgres from 'postgres';
import * as dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
}

const sql = postgres(databaseUrl, { ssl: 'require' });

async function migrate() {
    console.log("Starting migration: Advanced Subprocessor Module");

    try {
        // 1. Add columns to vendors table
        console.log("Adding columns to 'vendors' table...");
        await sql.unsafe(`
            ALTER TABLE vendors 
            ADD COLUMN IF NOT EXISTS is_subprocessor boolean DEFAULT false,
            ADD COLUMN IF NOT EXISTS data_location varchar(255),
            ADD COLUMN IF NOT EXISTS transfer_mechanism varchar(255),
            ADD COLUMN IF NOT EXISTS recursive_subprocessors jsonb,
            ADD COLUMN IF NOT EXISTS dpa_analysis jsonb,
            ADD COLUMN IF NOT EXISTS last_trust_center_change timestamp;
        `);

        // 2. Create vendor_change_logs table
        console.log("Creating 'vendor_change_logs' table...");
        await sql.unsafe(`
            CREATE TABLE IF NOT EXISTS vendor_change_logs (
                id serial PRIMARY KEY,
                client_id integer NOT NULL,
                vendor_id integer NOT NULL,
                change_type varchar(50) NOT NULL,
                description text,
                old_value jsonb,
                new_value jsonb,
                detected_at timestamp DEFAULT now()
            );
        `);

        // 3. Create index for vendor_change_logs
        console.log("Creating indexes...");
        await sql.unsafe(`
            CREATE INDEX IF NOT EXISTS idx_vcl_client_vendor ON vendor_change_logs (client_id, vendor_id);
        `);

        console.log("Migration completed successfully!");
    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        await sql.end();
    }
}

migrate();
