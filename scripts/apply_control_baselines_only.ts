
import postgres from 'postgres';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
}

const client = postgres(process.env.DATABASE_URL, { max: 1 });

async function createTable() {
    console.log('Creating control_baselines table...');
    try {
        await client`
      CREATE TABLE IF NOT EXISTS "control_baselines" (
        "id" serial PRIMARY KEY NOT NULL,
        "control_id" varchar(50) NOT NULL,
        "framework" varchar(100) NOT NULL,
        "baseline" varchar(20) NOT NULL
      );
    `;
        console.log('Table created successfully.');

        await client`
      CREATE INDEX IF NOT EXISTS "idx_cb_baseline" ON "control_baselines" ("framework","baseline");
    `;
        await client`
      CREATE INDEX IF NOT EXISTS "idx_cb_control" ON "control_baselines" ("control_id");
    `;
        console.log('Indexes created successfully.');

    } catch (err) {
        console.error('Error creating table:', err);
    } finally {
        await client.end();
    }
}

createTable();
