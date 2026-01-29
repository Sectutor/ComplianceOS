
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
  console.log("Starting manual migration for Questionnaires...");

  try {
    // 1. Create questionnaires table
    await client`
      CREATE TABLE IF NOT EXISTS "questionnaires" (
        "id" serial PRIMARY KEY,
        "client_id" integer NOT NULL,
        "name" text NOT NULL,
        "sender_name" text,
        "product_name" text,
        "status" varchar(50) DEFAULT 'open',
        "progress" integer DEFAULT 0,
        "due_date" timestamp,
        "owner_id" integer,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `;
    console.log("Created table: questionnaires");

    await client`
      CREATE INDEX IF NOT EXISTS "idx_qn_client" ON "questionnaires" ("client_id");
    `;
    await client`
        CREATE INDEX IF NOT EXISTS "idx_qn_status" ON "questionnaires" ("status");
    `;
    console.log("Created indexes for questionnaires");

    // 2. Create questionnaire_questions table
    await client`
      CREATE TABLE IF NOT EXISTS "questionnaire_questions" (
        "id" serial PRIMARY KEY,
        "questionnaire_id" integer NOT NULL REFERENCES "questionnaires"("id") ON DELETE CASCADE,
        "question" text NOT NULL,
        "answer" text,
        "confidence" integer,
        "sources" json DEFAULT '[]'::json,
        "status" varchar(50) DEFAULT 'pending',
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
    `;
    console.log("Created table: questionnaire_questions");

    await client`
      CREATE INDEX IF NOT EXISTS "idx_qq_questionnaire" ON "questionnaire_questions" ("questionnaire_id");
    `;
    console.log("Created indexes for questionnaire_questions");

    console.log("Migration completed successfully.");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await client.end();
    process.exit(0);
  }
}

main();
