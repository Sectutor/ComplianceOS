
import 'dotenv/config';
import { getDb } from "../db";
import { sql } from "drizzle-orm";

async function applyIndexes() {
  const db = await getDb();
  console.log("Applying database indexes...");

  const queries = [
    // remediation_tasks
    `CREATE INDEX IF NOT EXISTS "idx_rt_client_status" ON "remediation_tasks" ("client_id", "status");`,
    `CREATE INDEX IF NOT EXISTS "idx_rt_assignee" ON "remediation_tasks" ("assignee_id");`,

    // control_policy_mappings
    `CREATE INDEX IF NOT EXISTS "idx_cpm_policy" ON "control_policy_mappings" ("client_policy_id");`,
    `CREATE INDEX IF NOT EXISTS "idx_cpm_control" ON "control_policy_mappings" ("client_control_id");`,
    // Unique index might fail if duplicates exist, so we use safe modification if possible, or just try.
    // Drizzle would enforce unique constraint on insert, but adding unique index requires unique data.
    `CREATE UNIQUE INDEX IF NOT EXISTS "idx_cpm_unique" ON "control_policy_mappings" ("client_policy_id", "client_control_id");`,

    // evidence_requests
    `CREATE INDEX IF NOT EXISTS "idx_er_client_status" ON "evidence_requests" ("client_id", "status");`,
    `CREATE INDEX IF NOT EXISTS "idx_er_assignee" ON "evidence_requests" ("assignee_id");`,
    `CREATE INDEX IF NOT EXISTS "idx_er_control" ON "evidence_requests" ("client_control_id");`,

    // control_mappings
    `CREATE INDEX IF NOT EXISTS "idx_cm_source" ON "control_mappings" ("source_control_id");`,
    `CREATE INDEX IF NOT EXISTS "idx_cm_target" ON "control_mappings" ("target_control_id");`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "idx_cm_unique" ON "control_mappings" ("source_control_id", "target_control_id");`,

    // risk_assessments (adding the missing composite index)
    `CREATE INDEX IF NOT EXISTS "idx_ra_client_status" ON "risk_assessments" ("client_id", "status");`
  ];

  for (const query of queries) {
    try {
      console.log(`Executing: ${query}`);
      await db.execute(sql.raw(query));
      console.log("Success.");
    } catch (e: any) {
      if (e.code === '23505') {
         console.warn(`Skipping unique index due to duplicates (needs cleanup): ${query}`);
      } else {
         console.error(`Error executing ${query}:`, e);
      }
    }
  }

  console.log("Index application complete.");
  process.exit(0);
}

applyIndexes().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
