import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });

const DATABASE_URL = process.env.DATABASE_URL!;

(async () => {
  const client = new pg.Client(DATABASE_URL);
  await client.connect();
  console.log("Connected. Running migration...");

  await client.query(
    "ALTER TABLE questionnaire_questions ADD COLUMN IF NOT EXISTS focus_area text"
  );
  console.log("✓ focus_area column added");

  await client.query(
    "ALTER TABLE questionnaire_questions ADD COLUMN IF NOT EXISTS sub_focus_area text"
  );
  console.log("✓ sub_focus_area column added");

  await client.end();
  console.log("Migration complete.");
  process.exit(0);
})();
