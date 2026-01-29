import { getDb } from "../db";
import { sql } from "drizzle-orm";
import * as dotenv from "dotenv";

dotenv.config();

async function migrate() {
  console.log("🚀 Starting manual migration for global_vendors table...");

  try {
    const db = await getDb();
    
    // Using drizzle's execute to run raw SQL
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS global_vendors (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        website VARCHAR(512),
        trust_center_url VARCHAR(512),
        platform VARCHAR(100),
        favicon_url VARCHAR(512),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    
    console.log("✅ Successfully created global_vendors table.");
  } catch (error) {
    console.error("❌ Migration failed:", error);
  } finally {
    process.exit(0);
  }
}

migrate();
