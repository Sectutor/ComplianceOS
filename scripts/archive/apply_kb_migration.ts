import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const client = postgres(connectionString);
const db = drizzle(client);

async function main() {
  console.log("Starting manual migration for Knowledge Base...");

  try {
    await client`
      CREATE TABLE IF NOT EXISTS "knowledge_base_entries" (
        "id" serial PRIMARY KEY,
        "client_id" integer NOT NULL,
        "question" text NOT NULL,
        "answer" text NOT NULL,
        "tags" json DEFAULT '[]'::json,
        "access" varchar(50) DEFAULT 'internal',
        "assignee_id" integer,
        "health" varchar(50),
        "comments" text,
        "updated_at" timestamp DEFAULT now(),
        "created_at" timestamp DEFAULT now()
      );
    `;
    console.log("Created table: knowledge_base_entries");

    await client`
      CREATE INDEX IF NOT EXISTS "idx_kb_client" ON "knowledge_base_entries" ("client_id");
    `;
    console.log("Created index: idx_kb_client");

    await client`
      CREATE INDEX IF NOT EXISTS "idx_kb_question" ON "knowledge_base_entries" ("question");
    `;
    console.log("Created index: idx_kb_question");

    console.log("Migration completed successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    const closed = await client.end();
    console.log("Database connection closed.");
    process.exit(0);
  }
}

main();
