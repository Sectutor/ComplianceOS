/**
 * Direct schema push script - creates all tables from the Drizzle schema
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { config } from "dotenv";

config({ path: ".env" });

const connectionString = process.env.DATABASE_URL || "";

async function main() {
  console.log("[Push] Connecting to:", connectionString.replace(/\/\/.*@/, "//user:pass@"));
  
  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql);

  try {
    console.log("[Push] Running migrations...");
    await migrate(db, { migrationsFolder: "./packages/core/drizzle" });
    console.log("[Push] ✅ Migrations applied successfully!");
  } catch (err: any) {
    console.error("[Push] Migration error:", err.message || err);
  }

  await sql.end();
  process.exit(0);
}

main();
