import { getDb } from "../../packages/core/src/db";
import * as schema from "../../packages/core/src/schema";
import { eq } from "drizzle-orm";
import {
  recordPolicyAcknowledgment,
  getClientPolicyAcknowledgments,
  getPolicySignOffStats,
} from "../../packages/core/src/lib/policy/policyAcknowledgmentService";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function runTest() {
  console.log("=== Employee Policy Acknowledgment Workflow Integration Test ===");
  const db = await getDb();

  // 1. Get or create client
  let [client] = await db.select().from(schema.clients).limit(1);
  if (!client) {
    [client] = await db
      .insert(schema.clients)
      .values({ name: "Policy Signoff Test Client", status: "active" })
      .returning();
  }
  const clientId = client.id;

  // 2. Get or create sample policy
  let [policy] = await db
    .select()
    .from(schema.clientPolicies)
    .where(eq(schema.clientPolicies.clientId, clientId))
    .limit(1);

  if (!policy) {
    [policy] = await db
      .insert(schema.clientPolicies)
      .values({
        clientId,
        name: "Information Security & Acceptable Use Policy",
        content: "Standard policy defining employee responsibilities for data protection.",
        status: "approved",
      })
      .returning();
  }
  const policyId = policy.id;
  console.log(`Using Client ID #${clientId}, Policy ID #${policyId} ('${policy.name}')...`);

  // 3. Record Policy Acknowledgment Sign-off
  const employeeName = "John Alexander Doe";
  const employeeEmail = "john.doe@testcompany.org";

  const ackRecord = await recordPolicyAcknowledgment({
    clientId,
    policyId,
    employeeName,
    employeeEmail,
    version: String(policy.version || "1.0"),
    ipAddress: "192.168.1.100",
  });

  console.log(`Created Acknowledgment Record #${ackRecord.id} for '${ackRecord.employeeEmail}' at ${ackRecord.signedAt}`);
  if (ackRecord.status !== "acknowledged" || ackRecord.employeeEmail !== employeeEmail) {
    throw new Error("FAILED: Acknowledgment record properties mismatch!");
  }

  // 4. Retrieve Client Acknowledgment History
  const history = await getClientPolicyAcknowledgments(clientId, 10);
  console.log(`History Audit Query: Retrieved ${history.length} sign-off record(s).`);

  const foundAck = history.find((h) => h.id === ackRecord.id);
  if (!foundAck) {
    throw new Error("FAILED: Created acknowledgment not found in history query!");
  }
  console.log("✅ Policy sign-off audit history query passed.");

  // 5. Query Sign-Off Statistics
  const stats = await getPolicySignOffStats(clientId);
  console.log(`Sign-off Stats for ${stats.length} policy(ies):`);
  stats.forEach((s) => {
    console.log(`- Policy #${s.policyId} (${s.policyTitle}): ${s.acknowledgedCount}/${s.totalAssigned} signed (${s.acknowledgmentRate}%)`);
  });

  if (stats.length === 0) {
    throw new Error("FAILED: Policy sign-off stats returned empty list!");
  }
  console.log("✅ Policy sign-off statistics engine verified.");

  console.log("\n=== Employee Policy Acknowledgment Workflow Test PASSED Successfully ===");
}

runTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("FAILED: Policy Acknowledgment Test failed:", err);
    process.exit(1);
  });
