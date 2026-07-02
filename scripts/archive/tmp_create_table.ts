
import postgres from "postgres";

const databaseUrl = 'postgres://postgres:postgres@127.0.0.1:5432/complianceos?sslmode=disable';

async function run() {
  const sql = postgres(databaseUrl);
  try {
    console.log('Connecting to DB on 127.0.0.1...');
    await sql`
      CREATE TABLE IF NOT EXISTS client_settings (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL UNIQUE,
        branding_overrides JSONB,
        feature_flags JSONB,
        custom_settings JSONB,
        version INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `;
    console.log('Successfully created client_settings table');
  } catch (err) {
    console.error('Error creating table:', err);
  } finally {
    await sql.end();
  }
}

run();
