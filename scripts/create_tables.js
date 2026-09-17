import fs from 'fs';
import pkg from 'pg';
const { Client } = pkg;
import dotenv from 'dotenv';
dotenv.config();
if (fs.existsSync(".env.local")) {
    dotenv.config({ path: ".env.local", override: true });
}

async function main() {
  console.log("URL:", process.env.DATABASE_URL);
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  await client.connect();
  console.log("Connected to DB");

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS program_guide_assignments (
        id SERIAL PRIMARY KEY,
        client_id INTEGER NOT NULL,
        guide_type VARCHAR(50) NOT NULL,
        step_id VARCHAR(50) NOT NULL,
        user_id INTEGER NOT NULL,
        target_date TIMESTAMP,
        assigned_by INTEGER,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_pga_client ON program_guide_assignments (client_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_pga_unique_step ON program_guide_assignments (client_id, guide_type, step_id);

      CREATE TABLE IF NOT EXISTS framework_knowledge_mappings (
        id SERIAL PRIMARY KEY,
        source_requirement_id INTEGER NOT NULL,
        target_type VARCHAR(50) NOT NULL,
        target_value VARCHAR(255) NOT NULL,
        mapping_weight INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_fkm_source ON framework_knowledge_mappings (source_requirement_id);
      CREATE INDEX IF NOT EXISTS idx_fkm_target ON framework_knowledge_mappings (target_type, target_value);
    `);
    console.log("Tables created successfully");
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
