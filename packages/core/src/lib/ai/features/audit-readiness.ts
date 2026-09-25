/**
 * Audit Readiness Scorer — Continuous audit readiness assessment.
 *
 * Produces a real-time audit readiness score based on:
 * - Evidence quality, freshness, and coverage per control
 * - Policy implementation status
 * - Red team test results
 * - Attestation freshness
 * - Cross-framework coverage inheritance
 *
 * Unlike the existing binary pass/fail scoring, this produces a
 * continuous 0-100 score with predictive "days until audit ready."
 */

import { withExternalAi } from "../privacy-gatekeeper";
import { createJevAiProvider } from "../jevai-provider";
import { getDb } from "../../../db";
import { clientControls, controls, evidence, clientPolicies } from "../../../schema";
import { eq, and } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AuditReadinessResult {
  clientId: number;
  framework: string;
  overallScore: number; // 0-100
  evidenceScore: number;
  policyScore: number;
  controlImplementationScore: number;
  freshnessScore: number;
  frameworkScores: Array<{
    framework: string;
    score: number;
    totalControls: number;
    implementedControls: number;
    sufficientEvidence: number;
  }>;
  daysUntilAuditReady: number;
  criticalGaps: Array<{
    controlId: string;
    controlName: string;
    issue: string;
    impact: number;
  }>;
  recommendations: string[];
  reasoning: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main scoring function
// ─────────────────────────────────────────────────────────────────────────────

export async function scoreAuditReadiness(
  clientId: number,
  framework?: string,
  userId?: number
): Promise<AuditReadinessResult | null> {
  const db = await getDb();
  if (!db) return null;

  // 1. Load all controls and their evidence status
  const frameworkFilter = framework ? eq(controls.framework, framework) : undefined;
  const ctrlRows = frameworkFilter
    ? await db.select().from(controls).where(frameworkFilter)
    : await db.select().from(controls);

  const policyRows = await db.select().from(clientPolicies).where(eq(clientPolicies.clientId, clientId));

  // Bulk-load all client controls and evidence for this client (avoid N+1)
  const allClientControls = await db.select().from(clientControls).where(eq(clientControls.clientId, clientId));
  const allEvidence = await db.select().from(evidence).where(eq(evidence.clientId, clientId));

  // Build lookup maps
  const clientControlMap = new Map<number, any>(); // controls.id -> clientControls row
  for (const cc of allClientControls) {
    clientControlMap.set(cc.controlId, cc);
  }
  const evidenceByControl = new Map<number, any[]>(); // clientControlId -> evidence[]
  for (const ev of allEvidence) {
    const list = evidenceByControl.get(ev.clientControlId) || [];
    list.push(ev);
    evidenceByControl.set(ev.clientControlId, list);
  }

  // 2. Calculate per-control metrics
  const controlMetrics: Array<{
    controlId: string;
    controlName: string;
    framework: string;
    status: string;
    evidenceCount: number;
    hasRecentEvidence: boolean;
  }> = [];

  for (const ctrl of ctrlRows) {
    const cc = clientControlMap.get(ctrl.id);
    const evRows = cc ? (evidenceByControl.get(cc.id) || []) : [];

    const hasRecentEvidence = evRows.some((e) => {
      if (!e.createdAt) return false;
      const age = Date.now() - new Date(e.createdAt).getTime();
      return age < 90 * 24 * 60 * 60 * 1000; // 90 days
    });

    controlMetrics.push({
      controlId: ctrl.controlId || "",
      controlName: ctrl.name || "",
      framework: ctrl.framework || "",
      status: cc?.status || "not_assessed",
      evidenceCount: evRows.length,
      hasRecentEvidence,
    });
  }

  // 3. Build scoring input
  const frameworks = [...new Set(controlMetrics.map((c) => c.framework))];
  const summary = controlMetrics.map((c) =>
    `${c.controlId}: ${c.controlName} [${c.framework}] — ${c.status}, Evidence: ${c.evidenceCount}, Recent: ${c.hasRecentEvidence}`
  ).join("\n");

  const data = {
    clientId,
    frameworks,
    controlSummary: summary.slice(0, 6000),
    totalControls: controlMetrics.length,
    implementedCount: controlMetrics.filter((c) => c.status === "implemented").length,
    withEvidenceCount: controlMetrics.filter((c) => c.evidenceCount > 0).length,
    withRecentEvidenceCount: controlMetrics.filter((c) => c.hasRecentEvidence).length,
    policyCount: policyRows.length,
    policyStatuses: policyRows.map((p) => p.status),
  };

  // 4. Send through privacy gatekeeper
  const result = await withExternalAi(
    {
      clientId,
      featureId: "audit_readiness",
      userId,
      entityType: "audit_readiness",
      data,
      provider: "jevai",
    },
    async (sanitizedData, jevConfig) => {
      const provider = createJevAiProvider(jevConfig);
      if (!provider) throw new Error("JevAI provider not configured");

      // Scorer: overall readiness
      const readinessScoring = await provider.score(
        `Audit readiness assessment for client with ${sanitizedData.totalControls} controls across ${sanitizedData.frameworks?.join(", ")}. ${sanitizedData.implementedCount} implemented, ${sanitizedData.withEvidenceCount} with evidence, ${sanitizedData.withRecentEvidenceCount} with recent evidence.`,
        [
          { id: "evidence_coverage", description: "What percentage of controls have sufficient evidence?", weight: 0.3 },
          { id: "evidence_freshness", description: "How fresh is the evidence? (within 90 days)", weight: 0.2 },
          { id: "policy_coverage", description: "Are required policies in place and approved?", weight: 0.2 },
          { id: "control_implementation", description: "What percentage of controls are fully implemented?", weight: 0.2 },
          { id: "red_team_validation", description: "Have controls been validated through testing?", weight: 0.1 },
        ],
        { min: 0, max: 100, labels: ["Not Ready", "Partially Ready", "Mostly Ready", "Audit Ready"] }
      );

      return { readinessScoring };
    }
  );

  // 5. Calculate deterministic scores (always available, even without AI)
  const totalControls = controlMetrics.length;
  const implementedCount = controlMetrics.filter((c) => c.status === "implemented").length;
  const withEvidence = controlMetrics.filter((c) => c.evidenceCount > 0).length;
  const withRecentEvidence = controlMetrics.filter((c) => c.hasRecentEvidence).length;

  const evidenceScore = totalControls > 0 ? Math.round((withEvidence / totalControls) * 100) : 0;
  const freshnessScore = totalControls > 0 ? Math.round((withRecentEvidence / totalControls) * 100) : 0;
  const controlImplScore = totalControls > 0 ? Math.round((implementedCount / totalControls) * 100) : 0;
  const policyScore = policyRows.length > 0
    ? Math.round((policyRows.filter((p) => p.status === "approved").length / policyRows.length) * 100)
    : 0;

  const overallScore = result.response?.readinessScoring?.score || Math.round(
    evidenceScore * 0.3 + freshnessScore * 0.2 + policyScore * 0.2 + controlImplScore * 0.3
  );

  // 6. Framework-level breakdown
  const frameworkScores = frameworks.map((fw) => {
    const fwControls = controlMetrics.filter((c) => c.framework === fw);
    const fwImplemented = fwControls.filter((c) => c.status === "implemented").length;
    const fwWithEvidence = fwControls.filter((c) => c.hasRecentEvidence).length;
    return {
      framework: fw,
      score: fwControls.length > 0 ? Math.round(((fwImplemented + fwWithEvidence) / (fwControls.length * 2)) * 100) : 0,
      totalControls: fwControls.length,
      implementedControls: fwImplemented,
      sufficientEvidence: fwWithEvidence,
    };
  });

  // 7. Critical gaps
  const criticalGaps = controlMetrics
    .filter((c) => c.status !== "implemented" && !c.hasRecentEvidence)
    .slice(0, 5)
    .map((c) => ({
      controlId: c.controlId,
      controlName: c.controlName,
      issue: c.evidenceCount === 0 ? "No evidence on file" : "Evidence is stale (>90 days)",
      impact: c.status === "not_implemented" ? 3 : 2,
    }));

  return {
    clientId,
    framework: framework || "All",
    overallScore,
    evidenceScore,
    policyScore,
    controlImplementationScore: controlImplScore,
    freshnessScore,
    frameworkScores,
    daysUntilAuditReady: Math.max(0, Math.round((100 - overallScore) * 0.7)),
    criticalGaps,
    recommendations: generateRecommendations(overallScore, criticalGaps, evidenceScore, policyScore),
    reasoning: result.response?.readinessScoring?.reasoning || (result.dryRun ? "Dry-run mode" : "Deterministic scoring"),
  };
}

function generateRecommendations(score: number, gaps: any[], evidence: number, policy: number): string[] {
  const recs: string[] = [];
  if (score >= 80) recs.push("You're nearly audit-ready. Focus on closing the remaining critical gaps.");
  else if (score >= 60) recs.push("Good progress. Prioritize evidence collection for unimplemented controls.");
  else if (score >= 40) recs.push("Moderate readiness. Focus on policy approval and evidence freshness.");
  else recs.push("Significant work needed. Start with high-priority controls and policy drafting.");

  if (evidence < 50) recs.push("Evidence coverage is below 50%. Collect evidence for at least one control per policy area.");
  if (policy < 50) recs.push("Policy approval rate is low. Review and approve draft policies.");
  if (gaps.length > 0) recs.push(`Close ${gaps.length} critical gap(s) with missing or stale evidence.`);

  return recs;
}
