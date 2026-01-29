
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const client = await pool.connect();
  try {
    console.log("Creating vendor_requests table...");
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS vendor_requests (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL,
        requester_id INTEGER,
        name VARCHAR(255) NOT NULL,
        website VARCHAR(255),
        category VARCHAR(100),
        description TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        business_owner VARCHAR(100),
        rejection_reason TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_vendor_request_client ON vendor_requests(client_id);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_vendor_request_status ON vendor_requests(status);
    `);

    console.log("Migration executed successfully.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    client.release();
    pool.end();
  }
}

main();
