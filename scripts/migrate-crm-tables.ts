import 'dotenv/config';
import pg from 'pg';

const { Client } = pg;

async function runMigration() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        console.error('DATABASE_URL not set');
        process.exit(1);
    }

    const client = new Client({ connectionString: databaseUrl });
    await client.connect();
    console.log('Connected to database');

    try {
        // Create global_contacts table
        await client.query(`
            CREATE TABLE IF NOT EXISTS global_contacts (
                id SERIAL PRIMARY KEY,
                first_name VARCHAR(255),
                last_name VARCHAR(255),
                email VARCHAR(255) NOT NULL UNIQUE,
                company VARCHAR(255),
                role VARCHAR(255),
                phone VARCHAR(50),
                source VARCHAR(50) DEFAULT 'manual',
                status VARCHAR(50) DEFAULT 'lead',
                notes TEXT,
                created_by INTEGER,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ global_contacts table created');

        // Create indexes for global_contacts
        await client.query(`CREATE INDEX IF NOT EXISTS idx_gc_email ON global_contacts(email)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_gc_status ON global_contacts(status)`);

        // Create client_contacts table
        await client.query(`
            CREATE TABLE IF NOT EXISTS client_contacts (
                id SERIAL PRIMARY KEY,
                client_id INTEGER NOT NULL,
                first_name VARCHAR(255),
                last_name VARCHAR(255),
                email VARCHAR(255),
                department VARCHAR(255),
                role VARCHAR(100),
                phone VARCHAR(50),
                notes TEXT,
                created_by INTEGER,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ client_contacts table created');

        // Create index for client_contacts
        await client.query(`CREATE INDEX IF NOT EXISTS idx_clc_client ON client_contacts(client_id)`);

        // Create global_crm_activities table
        await client.query(`
            CREATE TABLE IF NOT EXISTS global_crm_activities (
                id SERIAL PRIMARY KEY,
                contact_id INTEGER NOT NULL,
                type VARCHAR(50) NOT NULL,
                subject VARCHAR(255),
                description TEXT,
                outcome VARCHAR(100),
                scheduled_at TIMESTAMP,
                completed_at TIMESTAMP,
                duration INTEGER,
                created_by INTEGER,
                created_at TIMESTAMP DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_gcrm_act_contact ON global_crm_activities(contact_id);
            CREATE INDEX IF NOT EXISTS idx_gcrm_act_type ON global_crm_activities(type);
        `);
        console.log('✅ global_crm_activities table created');

        // Create global_crm_notes table
        await client.query(`
            CREATE TABLE IF NOT EXISTS global_crm_notes (
                id SERIAL PRIMARY KEY,
                contact_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                is_pinned BOOLEAN DEFAULT FALSE,
                created_by INTEGER,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_gcrm_notes_contact ON global_crm_notes(contact_id);
        `);
        console.log('✅ global_crm_notes table created');

        // Create global_crm_deals table
        await client.query(`
            CREATE TABLE IF NOT EXISTS global_crm_deals (
                id SERIAL PRIMARY KEY,
                contact_id INTEGER NOT NULL,
                name VARCHAR(255) NOT NULL,
                value INTEGER NOT NULL,
                probability INTEGER DEFAULT 0,
                stage VARCHAR(50) NOT NULL,
                expected_close_date TIMESTAMP,
                description TEXT,
                created_by INTEGER,
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            );
            CREATE INDEX IF NOT EXISTS idx_gcrm_deals_contact ON global_crm_deals(contact_id);
            CREATE INDEX IF NOT EXISTS idx_gcrm_deals_stage ON global_crm_deals(stage);
        `);
        console.log('✅ global_crm_deals table created');

        // Create global_crm_tags table
        await client.query(`
            CREATE TABLE IF NOT EXISTS global_crm_tags (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) NOT NULL UNIQUE,
                color VARCHAR(20),
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('✅ global_crm_tags table created');

        // Create global_crm_contact_tags table (join table)
        await client.query(`
            CREATE TABLE IF NOT EXISTS global_crm_contact_tags (
                id SERIAL PRIMARY KEY,
                contact_id INTEGER NOT NULL,
                tag_id INTEGER NOT NULL,
                UNIQUE(contact_id, tag_id)
            );
            CREATE INDEX IF NOT EXISTS idx_gcrm_ct_contact ON global_crm_contact_tags(contact_id);
            CREATE INDEX IF NOT EXISTS idx_gcrm_ct_tag ON global_crm_contact_tags(tag_id);
        `);
        console.log('✅ global_crm_contact_tags table created');

        console.log('✅ CRM tables migration complete!');
    } finally {
        await client.end();
    }
}

runMigration().catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
});
