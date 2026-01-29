
import 'dotenv/config';
import { getDb } from "../db";
import { sql } from "drizzle-orm";

async function main() {
    console.log("Applying manual schema fix for controls table...");
    try {
        const d = await getDb();

        // Add client_id column if it doesn't exist
        await d.execute(sql`
      DO $$
      BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'controls' AND column_name = 'client_id') THEN
              ALTER TABLE controls ADD COLUMN client_id integer;
              RAISE NOTICE 'Added client_id column';
          END IF;
      END
      $$;
    `);

        // Create index for client_id
        await d.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_controls_client ON controls (client_id);
    `);

        // Remove old unique constraint on control_id if it exists (it was likely named controls_control_id_unique or similar)
        // We'll try to drop it safely.
        await d.execute(sql`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'controls_control_id_unique') THEN
            ALTER TABLE controls DROP CONSTRAINT controls_control_id_unique;
            RAISE NOTICE 'Dropped old unique constraint on control_id';
        END IF;
      END
      $$;
    `);

        console.log("Schema fix applied successfully.");
    } catch (error) {
        console.error("Error applying schema fix:", error);
    }
}

main().then(() => process.exit(0)).catch((err) => {
    console.error(err);
    process.exit(1);
});
