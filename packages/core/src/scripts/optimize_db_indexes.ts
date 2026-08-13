import { getDb } from "../db";
import { sql } from "drizzle-orm";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

export async function optimizeDatabaseIndexes() {
  console.log("=== Database Composite Index Optimization Engine ===");
  const db = await getDb();

  const indexStatements = [
    {
      name: "idx_client_controls_client_status",
      query: sql`CREATE INDEX IF NOT EXISTS idx_client_controls_client_status ON client_controls(client_id, status);`,
    },
    {
      name: "idx_evidence_client_status",
      query: sql`CREATE INDEX IF NOT EXISTS idx_evidence_client_status ON evidence(client_id, status);`,
    },
    {
      name: "idx_risk_assessments_client_category",
      query: sql`CREATE INDEX IF NOT EXISTS idx_risk_assessments_client_category ON risk_assessments(client_id, category);`,
    },
    {
      name: "idx_access_assignments_campaign_status",
      query: sql`CREATE INDEX IF NOT EXISTS idx_access_assignments_campaign_status ON access_review_assignments(campaign_id, status);`,
    },
    {
      name: "idx_client_policies_client_status",
      query: sql`CREATE INDEX IF NOT EXISTS idx_client_policies_client_status ON client_policies(client_id, status);`,
    },
    {
      name: "idx_assets_client_name",
      query: sql`CREATE INDEX IF NOT EXISTS idx_assets_client_name ON assets(client_id, name);`,
    },
  ];

  let indexesCreated = 0;

  for (const idx of indexStatements) {
    try {
      await db.execute(idx.query);
      console.log(`✓ Composite index verified/created: ${idx.name}`);
      indexesCreated++;
    } catch (err: any) {
      console.warn(`! Index creation note for ${idx.name}:`, err.message || err);
    }
  }

  console.log(`Database Optimization Complete: ${indexesCreated} high-frequency composite indexes active.`);
}

// Run script if executed directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1].endsWith("optimize_db_indexes.ts")) {
  optimizeDatabaseIndexes()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Database optimization failed:", err);
      process.exit(1);
    });
}
