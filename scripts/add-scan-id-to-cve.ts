
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const client = await pool.connect();
  try {
    console.log("Adding scan_id column to vendor_cve_matches...");
    
    await client.query(`
      ALTER TABLE vendor_cve_matches ADD COLUMN IF NOT EXISTS scan_id INTEGER;
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
