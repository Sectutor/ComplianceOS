import { config } from "dotenv";
import pg from "pg";

config({ path: ".env.local" });

(async () => {
  const client = new pg.Client(process.env.DATABASE_URL!);
  await client.connect();
  console.log("Connected. Running migration...");
  await client.query(
    "ALTER TABLE questionnaires ADD COLUMN IF NOT EXISTS direction varchar(20) DEFAULT 'inbound'"
  );
  console.log("✓ direction column added to questionnaires");
  await client.end();
  process.exit(0);
})();
