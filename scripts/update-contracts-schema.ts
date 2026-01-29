
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  const client = await pool.connect();
  try {
    console.log("Adding missing columns to vendor_contracts...");
    
    // Check and add notice_period
    await client.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendor_contracts' AND column_name='notice_period') THEN
              ALTER TABLE vendor_contracts ADD COLUMN notice_period VARCHAR(50);
          END IF;
      END
      $$;
    `);

    // Check and add payment_terms
    await client.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendor_contracts' AND column_name='payment_terms') THEN
              ALTER TABLE vendor_contracts ADD COLUMN payment_terms VARCHAR(50);
          END IF;
      END
      $$;
    `);

    // Check and add sla_details
    await client.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendor_contracts' AND column_name='sla_details') THEN
              ALTER TABLE vendor_contracts ADD COLUMN sla_details TEXT;
          END IF;
      END
      $$;
    `);

    // Check and add dpa_status
    await client.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendor_contracts' AND column_name='dpa_status') THEN
              ALTER TABLE vendor_contracts ADD COLUMN dpa_status VARCHAR(50) DEFAULT 'Not Signed';
          END IF;
      END
      $$;
    `);

    // Check and add owner
    await client.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendor_contracts' AND column_name='owner') THEN
              ALTER TABLE vendor_contracts ADD COLUMN owner VARCHAR(100);
          END IF;
      END
      $$;
    `);

    console.log("Schema update for vendor_contracts completed successfully.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    client.release();
    pool.end();
  }
}

main();
