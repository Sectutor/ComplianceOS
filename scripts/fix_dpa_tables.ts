
import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { getDb } from '../db';

async function main() {
    console.log("Applying manual fix for DPA tables...");
    const db = await getDb();

    try {
        // Create dpa_templates
        console.log("Creating dpa_templates...");
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS dpa_templates (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                version INTEGER DEFAULT 1,
                is_default BOOLEAN DEFAULT false,
                jurisdiction VARCHAR(100),
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // Create vendor_authorizations
        console.log("Creating vendor_authorizations...");
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS vendor_authorizations (
                id SERIAL PRIMARY KEY,
                client_id INTEGER NOT NULL,
                vendor_id INTEGER NOT NULL,
                initiated_by INTEGER,
                status VARCHAR(50) DEFAULT 'Pending',
                notification_date TIMESTAMP,
                objection_deadline TIMESTAMP,
                approval_date TIMESTAMP,
                notes TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // Create index for vendor_authorizations
        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_va_client_vendor ON vendor_authorizations (client_id, vendor_id);`);

        // Create process_data_flows
        console.log("Creating process_data_flows...");
        await db.execute(sql`
            CREATE TABLE IF NOT EXISTS process_data_flows (
                id SERIAL PRIMARY KEY,
                client_id INTEGER NOT NULL,
                vendor_id INTEGER,
                name VARCHAR(255) NOT NULL,
                source VARCHAR(255),
                destination VARCHAR(255),
                data_category VARCHAR(255),
                transfer_mechanism VARCHAR(255),
                is_cross_border BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);

        // Create index for process_data_flows
        await db.execute(sql`CREATE INDEX IF NOT EXISTS idx_pdf_client_vendor ON process_data_flows (client_id, vendor_id);`);

        console.log("All tables created successfully.");
    } catch (e) {
        console.error("Error creating tables:", e);
    }
    process.exit(0);
}

main();
