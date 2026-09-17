import { getDb } from "../../packages/core/src/db";
import * as schema from "../../packages/core/src/schema";
import {
  runControlAutoTest,
  runAllControlAutoTestsForClient,
  getClientTestRunHistory,
} from "../../packages/core/src/lib/controlAutoTestEngine";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function runTest() {
  console.log("=== Control Auto-Testing Engine Integration Test ===");
  const db = await getDb();

  // 1. Fetch first available client
  const [client] = await db.select().from(schema.clients).limit(1);

  if (!client) {
    console.log("No client found in DB. Creating a temporary test client...");
    const [newClient] = await db
      .insert(schema.clients)
      .values({
        name: "Auto-Test Engine Test Client",
        status: "active",
      })
      .returning();

    // Attach a sample control to the new client
    const [masterControl] = await db.select().from(schema.controls).limit(1);
    if (masterControl) {
      await db.insert(schema.clientControls).values({
        clientId: newClient.id,
        controlId: masterControl.id,
        status: "implemented",
      });
    }
    return runEngineTestsForClient(newClient.id);
  }

  return runEngineTestsForClient(client.id);
}

async function runEngineTestsForClient(clientId: number) {
  console.log(`Testing Control Auto-Testing Engine for Client ID #${clientId}...`);

  // 2. Execute full client auto-testing run
  const { summary, results } = await runAllControlAutoTestsForClient(clientId);

  console.log("\n--- Execution Summary ---");
  console.log(`Total Controls Tested: ${summary.totalControlsTested}`);
  console.log(`Pass Rate: ${summary.overallPassRate}%`);
  console.log(`Average Score: ${summary.averageScore}/100`);
  console.log(`Passed: ${summary.passedCount}`);
  console.log(`Warnings: ${summary.warningCount}`);
  console.log(`Failed: ${summary.failedCount}`);

  if (summary.totalControlsTested === 0) {
    console.log("Client has no controls mapped yet, auto-test executed cleanly.");
  } else {
    console.log(`\nSample Test Result (Control #${results[0].clientControlId}):`);
    console.log(`- Control Code: ${results[0].controlCode || "N/A"}`);
    console.log(`- Status: ${results[0].status}`);
    console.log(`- Score: ${results[0].score}/100`);
    console.log(`- Message: ${results[0].message}`);
    console.log(`- Findings Count: ${results[0].findings.length}`);
  }

  // 3. Verify audit history retrieval from database
  const history = await getClientTestRunHistory(clientId, 10);
  console.log(`\nAudit Log Check: Retrieved ${history.length} test run record(s) from 'control_test_runs' table.`);

  if (summary.totalControlsTested > 0 && history.length === 0) {
    throw new Error("FAILED: Test run history was not saved to control_test_runs table!");
  }

  console.log("\n=== Control Auto-Testing Engine Test PASSED Successfully ===");
}

runTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("FAILED: Control Auto-Testing Engine Test failed:", err);
    process.exit(1);
  });
