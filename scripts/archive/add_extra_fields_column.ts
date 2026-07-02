import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL!;

(async () => {
  const client = new pg.Client(DATABASE_URL);
  await client.connect();
  console.log("Connected. Running migration...");
  await client.query(
    "ALTER TABLE questionnaire_questions ADD COLUMN IF NOT EXISTS extra_fields jsonb DEFAULT '{}'"
  );
  console.log("✓ extra_fields column added to questionnaire_questions");
  await client.end();
  process.exit(0);
})();
