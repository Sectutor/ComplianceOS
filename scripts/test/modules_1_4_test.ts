import { generateCustomPolicyDocument } from "../../packages/core/src/lib/policies/policyGenerator";
import { analyzeClientEvidenceGaps } from "../../packages/core/src/lib/evidence/gapAnalysisEngine";
import { evaluateTransferImpactAssessment } from "../../packages/core/src/lib/privacy/privacySovereigntyService";
import { calculateVendorRiskTier, dispatchVendorQuestionnaire } from "../../packages/core/src/lib/vendor/vendorRiskEngine";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function runTest() {
  console.log("=== Modules 1-4 Complete Integration Verification Suite ===");
  const clientId = 1;

  // --- Module 1: AI Security Policy Generator ---
  console.log("\n[Module 1] Verifying AI Security Policy Document Generator...");
  const polRes = await generateCustomPolicyDocument(clientId, "Acme Cyber Tech", "Access Control", "SOC 2 & ISO 27001");
  console.log("Policy Document Generation Result:", polRes);

  if (!polRes.success || !polRes.policyId) {
    throw new Error("FAILED: Policy document generation failed!");
  }

  // --- Module 2: Automated Evidence Gap Analysis Engine ---
  console.log("\n[Module 2] Verifying Automated Evidence Gap Analysis Engine...");
  const gapReport = await analyzeClientEvidenceGaps(clientId);
  console.log(`Gap Analysis Result: Assessed ${gapReport.totalControlsAssessed} controls, Readiness Score: ${gapReport.auditReadinessScore}%`);
  console.log("Sample Missing Gap:", gapReport.missingGaps[0] || "None");

  if (gapReport.totalControlsAssessed < 0 || gapReport.auditReadinessScore === undefined) {
    throw new Error("FAILED: Evidence gap analysis failed!");
  }

  // --- Module 3: Cross-Border Data Sovereignty & TIA ---
  console.log("\n[Module 3] Verifying Cross-Border Data Sovereignty & TIA Engine...");
  const tia = await evaluateTransferImpactAssessment(clientId, "EU", "US", "PII");
  console.log("Transfer Impact Assessment (TIA) Result:", tia);

  if (tia.complianceStatus !== "compliant" || !tia.legalMechanism) {
    throw new Error("FAILED: Transfer impact assessment failed!");
  }

  // --- Module 4: Third-Party Vendor Risk Engine ---
  console.log("\n[Module 4] Verifying Third-Party Vendor Risk Matrix Engine...");
  const vendorRisk = await calculateVendorRiskTier("Datadog Cloud Monitoring", "PII", true);
  console.log("Vendor Risk Tier Result:", vendorRisk);

  if (vendorRisk.tprmTier !== "Tier 1 (Critical)" || vendorRisk.residualRiskScore < 80) {
    throw new Error("FAILED: Vendor risk matrix evaluation failed!");
  }

  const dispatch = await dispatchVendorQuestionnaire(101, "security@datadog.com");
  console.log("Questionnaire Dispatch Result:", dispatch);

  if (!dispatch.success || !dispatch.questionnaireToken) {
    throw new Error("FAILED: Vendor questionnaire dispatch failed!");
  }

  console.log("\n=== ALL 4 ENTERPRISE MODULES VERIFIED AND PASSED 100% SUCCESSFULLY! 🚀 ===");
}

runTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("FAILED: Modules 1-4 verification test failed:", err);
    process.exit(1);
  });
