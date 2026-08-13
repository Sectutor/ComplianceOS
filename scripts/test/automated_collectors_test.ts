import {
  runAllAutomatedCollectors,
  collectGithubEvidence,
} from "../../packages/core/src/connectors/automatedEvidenceCollectors";
import { getDb } from "../../packages/core/src/db";
import * as schema from "../../packages/core/src/schema";
import { eq, sql } from "drizzle-orm";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function runTest() {
  console.log("=== Automated Evidence Collectors Integration Test ===");
  const clientId = 1;

  // 1. Run GitHub collector
  console.log("\nRunning GitHub Collector...");
  const ghResult = await collectGithubEvidence(clientId);
  console.log(`GitHub Result: ${ghResult.status}, Evidence Generated: ${ghResult.evidenceGenerated}`);

  if (ghResult.evidenceGenerated < 3) {
    throw new Error("FAILED: GitHub collector failed to generate 3 findings!");
  }

  // 2. Run All Automated Collectors (GitHub, AWS, Okta)
  console.log("\nRunning All Automated Collectors...");
  const allResults = await runAllAutomatedCollectors(clientId);
  console.log(`Total Collector Providers Executed: ${allResults.length}`);

  const providers = allResults.map((r) => r.provider);
  console.log("Providers Executed:", providers);

  if (!providers.includes("github") || !providers.includes("aws") || !providers.includes("okta")) {
    throw new Error("FAILED: Not all expected provider collectors were executed!");
  }

  // 3. Verify logs table
  const db = await getDb();
  const logsRes = await db.execute(sql`
    SELECT COUNT(*)::int as count FROM evidence_collector_logs WHERE client_id = ${clientId};
  `);

  const count = (logsRes.rows || logsRes)[0]?.count || 0;
  console.log(`Evidence Collector Audit Logs Created: ${count}`);

  if (count < 3) {
    throw new Error("FAILED: Audit log entries were not recorded in evidence_collector_logs!");
  }

  console.log("\n=== Automated Evidence Collectors Test PASSED Successfully ===");
}

runTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("FAILED: Automated evidence collectors test error:", err);
    process.exit(1);
  });
