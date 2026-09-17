import { getDb } from "../../packages/core/src/db";
import { complianceFrameworks, controls } from "../../packages/core/src/schema";
import { createJiraRemediationTicket } from "../../packages/core/src/lib/integrations/remediationNotifier";
import { autoAnswerQuestionnaire } from "../../packages/core/src/lib/ai/questionnaireAutoResponder";
import { discoverCloudAssets } from "../../packages/core/src/lib/assets/cloudAssetDiscovery";
import { eq } from "drizzle-orm";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

async function runTest() {
  console.log("=== Features 1-4 Complete Integration Verification Suite ===");
  const db = await getDb();
  const clientId = 1;

  // --- Feature 1: ISO 27001:2022 Framework Verification ---
  console.log("\n[Feature 1] Verifying ISO 27001:2022 Annex A Framework Seeding...");
  const [isoFw] = await db
    .select()
    .from(complianceFrameworks)
    .where(eq(complianceFrameworks.shortCode, "ISO27001_2022"));

  console.log("ISO 27001:2022 Framework Record:", isoFw);
  if (!isoFw) {
    throw new Error("FAILED: ISO 27001:2022 framework record missing!");
  }

  const isoCtrls = await db
    .select()
    .from(controls)
    .where(eq(controls.framework, "ISO 27001:2022"));
  console.log(`ISO 27001:2022 Master Controls Seeded: ${isoCtrls.length}`);

  if (isoCtrls.length < 15) {
    throw new Error(`FAILED: Expected at least 15 ISO 27001:2022 controls, found ${isoCtrls.length}`);
  }

  // --- Feature 2: Jira & Slack Remediation Workflows Verification ---
  console.log("\n[Feature 2] Verifying Jira & Slack Remediation Notifier...");
  const jiraRes = await createJiraRemediationTicket("demo-company", "demo_token", "admin@complianceos.local", "COMP", {
    clientId,
    controlId: "AC-1",
    title: "Access Control Policy Review",
    severity: "high",
    reason: "Policy review past due 30 days",
  });

  console.log("Jira Remediation Ticket Result:", jiraRes);
  if (!jiraRes.success || !jiraRes.issueKey) {
    throw new Error("FAILED: Jira ticket creation failed!");
  }

  // --- Feature 3: AI Security Questionnaire Auto-Responder Verification ---
  console.log("\n[Feature 3] Verifying AI Security Questionnaire Auto-Responder...");
  const sampleQuestions = [
    { questionId: "Q1", questionText: "Does your organization mandate Multi-Factor Authentication (MFA) for all employees?" },
    { questionId: "Q2", questionText: "How is customer data encrypted at rest and in transit?" },
    { questionId: "Q3", questionText: "How often are Disaster Recovery (DR) and backup restoration tests performed?" },
  ];

  const qRes = await autoAnswerQuestionnaire(clientId, sampleQuestions);
  console.log(`Answered Questions Count: ${qRes.answeredQuestions.length}, Overall Confidence: ${qRes.overallConfidence}%`);
  console.log("Sample AI Answer [Q1]:", qRes.answeredQuestions[0]);

  if (qRes.answeredQuestions.length !== 3 || qRes.overallConfidence < 80) {
    throw new Error("FAILED: Questionnaire auto-responder evaluation failed!");
  }

  // --- Feature 4: Cloud Asset Auto-Discovery Verification ---
  console.log("\n[Feature 4] Verifying Cloud Asset Auto-Discovery Engine...");
  const assetRes = await discoverCloudAssets(clientId, "aws");
  console.log("Discovered Cloud Assets Result:", assetRes);

  if (assetRes.totalDiscovered < 4) {
    throw new Error("FAILED: Cloud asset auto-discovery failed!");
  }

  console.log("\n=== ALL 4 FEATURES VERIFIED AND PASSED 100% SUCCESSFULLY! 🚀 ===");
}

runTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("FAILED: Features 1-4 verification test failed:", err);
    process.exit(1);
  });
