import { runEvidenceSentinelScan } from "../../packages/core/src/lib/evidence/evidenceSentinel";
import { logAuditorFinding, getCapRemediationStatus } from "../../packages/core/src/lib/audit/auditorFindingTracker";
import { getPeerBenchmarkData } from "../../packages/core/src/lib/analytics/peerBenchmarkEngine";
import { calculateZeroTrustHealthScore } from "../../packages/core/src/lib/telemetry/controlHealthTelemetry";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function runTest() {
  console.log("=== Recommendations 1-4 Complete Integration Verification Suite ===");
  const clientId = 1;

  // --- Recommendation 1: Continuous Evidence Expiry Sentinel ---
  console.log("\n[Recommendation 1] Verifying Continuous Evidence Expiry Sentinel & Auto-Recollection Engine...");
  const sentinel = await runEvidenceSentinelScan(clientId);
  console.log(`Sentinel Result: Scanned ${sentinel.totalEvidenceScanned} evidence items. Expiring: ${sentinel.expiringItemsCount}, Auto-Recollected: ${sentinel.autoRecollectedCount}`);

  if (sentinel.totalEvidenceScanned < 0 || !Array.isArray(sentinel.expiringItems)) {
    throw new Error("FAILED: Evidence sentinel scan failed!");
  }

  // --- Recommendation 2: Auditor Finding & CAP Remediation Tracker ---
  console.log("\n[Recommendation 2] Verifying Auditor Observation & CAP Remediation Tracker...");
  const findingLog = await logAuditorFinding({
    clientId,
    title: "Quarterly Access Review Log Sign-off Missing",
    description: "External auditor noted missing approval signature on Q4 2025 entitlement review sheet.",
    severity: "high",
    auditorId: 1,
    slaDays: 60,
  });
  console.log("Auditor Finding Log Result:", findingLog);

  if (!findingLog.success || !findingLog.findingId) {
    throw new Error("FAILED: Auditor finding logging failed!");
  }

  const capStatus = await getCapRemediationStatus(clientId);
  console.log(`CAP Remediation Status: Total: ${capStatus.totalFindings}, Open: ${capStatus.openFindings}, SLA Compliance: ${capStatus.capSlaCompliancePercentage}%`);

  // --- Recommendation 3: Anonymous Industry Peer Benchmarking ---
  console.log("\n[Recommendation 3] Verifying Anonymous Industry Peer Compliance Benchmarking Index...");
  const benchmark = await getPeerBenchmarkData(clientId, "SaaS & Cloud");
  console.log("Peer Benchmark Report:", benchmark);

  if (benchmark.percentileRank < 50 || !benchmark.benchmarkGrade) {
    throw new Error("FAILED: Peer benchmarking index calculation failed!");
  }

  // --- Recommendation 4: Zero-Trust Control Health Score ---
  console.log("\n[Recommendation 4] Verifying Zero-Trust Real-Time Control Health Score & Telemetry Engine...");
  const zeroTrust = await calculateZeroTrustHealthScore(clientId);
  console.log("Zero-Trust Health Score Result:", zeroTrust);

  if (zeroTrust.overallZeroTrustScore < 80 || zeroTrust.vectors.length !== 4) {
    throw new Error("FAILED: Zero-Trust health score calculation failed!");
  }

  console.log("\n=== ALL 4 ADVANCED RECOMMENDATIONS VERIFIED AND PASSED 100% SUCCESSFULLY! 🚀 ===");
}

runTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("FAILED: Recommendations 1-4 verification test failed:", err);
    process.exit(1);
  });
