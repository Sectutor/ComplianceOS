/**
 * Gap Prioritizer — Auto-prioritize compliance gaps for remediation.
 *
 * Analyzes all open gaps (controls missing evidence) and produces
 * a prioritized queue based on:
 * - Audit proximity (which framework audit is coming soonest)
 * - Risk severity of the gap
 * - Effort to close
 * - Cross-framework impact (closing this gap unlocks multiple frameworks)
 */

import { withExternalAi } from "../privacy-gatekeeper";
import { createJevAiProvider } from "../jevai-provider";
import { getDb } from "../../../db";
import { clientControls, controls, evidence } from "../../../schema";
import { eq, and } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface GapPriority {
  controlId: string;
  controlName: string;
  framework: string;
  status: string;
  evidenceCount: number;
  priorityScore: number; // 0-100, higher = close first
  urgency: "critical" | "high" | "medium" | "low";
  estimatedEffort: "hours" | "days" | "weeks";
  crossFrameworkImpact: string[]; // other frameworks that benefit
  reasoning: string;
  suggestedAssignee?: string;
  suggestedDeadline?: string;
}

export interface GapPrioritizationResult {
  clientId: number;
  gaps: GapPriority[];
  totalGaps: number;
  criticalGaps: number;
  estimatedDaysToAuditReady: number;
  topPriority: GapPriority | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main function
// ─────────────────────────────────────────────────────────────────────────────

export async function prioritizeGaps(
  clientId: number,
  userId?: number,
  frameworkFilter?: string
): Promise<GapPrioritizationResult | null> {
  const db = await getDb();
  if (!db) return null;

  // 1. Load all controls with missing or insufficient evidence
  const gaps = await loadGaps(db, clientId, frameworkFilter);
  if (gaps.length === 0) {
    return { clientId, gaps: [], totalGaps: 0, criticalGaps: 0, estimatedDaysToAuditReady: 0, topPriority: null };
  }

  // 2. Build prioritization input
  const gapDescriptions = gaps
    .map((g, i) => `${i + 1}. ${g.controlId}: ${g.controlName} [${g.framework}] — Status: ${g.status}, Evidence: ${g.evidenceCount}`)
    .join("\n");

  const data = {
    clientId,
    gapCount: gaps.length,
    gaps: gapDescriptions,
    frameworks: [...new Set(gaps.map((g) => g.framework))],
  };

  // 3. Send through privacy gatekeeper + JevAI
  const result = await withExternalAi(
    {
      clientId,
      featureId: "gap_prioritizer",
      userId,
      entityType: "gap_analysis",
      data,
      provider: "jevai",
    },
    async (sanitizedData, jevConfig) => {
      const provider = createJevAiProvider(jevConfig);
      if (!provider) throw new Error("JevAI provider not configured");

      // Router: which gap to close first?
      const gapOptions = sanitizedData.gaps.split("\n").map((line: string) => ({
        id: line.slice(0, 80),
        description: line,
      }));

      const routing = await provider.route(
        `You have ${sanitizedData.gaps.split("\n").length} compliance gaps to close. Which should be prioritized first for maximum audit readiness?`,
        gapOptions.slice(0, 10), // Top 10 gaps for routing
        "Consider: audit proximity, risk severity, cross-framework impact, and effort to close."
      );

      // Scorer: prioritize all gaps
      const scoring = await provider.score(
        `Gap analysis for ${sanitizedData.gaps.split("\n").length} open gaps across frameworks: ${sanitizedData.frameworks?.join(", ")}`,
        [
          { id: "audit_proximity", description: "How soon is the audit for this framework?", weight: 0.3 },
          { id: "risk_severity", description: "What is the risk severity of leaving this gap open?", weight: 0.25 },
          { id: "cross_framework_impact", description: "Does closing this gap satisfy multiple frameworks?", weight: 0.25 },
          { id: "effort_to_close", description: "How much effort is needed to close this gap (inverse — less effort = higher priority)?", weight: 0.2 },
        ],
        { min: 0, max: 100, labels: ["Low", "Medium", "High", "Critical"] }
      );

      return { routing, scoring, gapCount: sanitizedData.gaps.split("\n").length };
    }
  );

  if (!result.sent && !result.dryRun) return null;
  if (result.dryRun || !result.response) {
    return {
      clientId,
      gaps: gaps.map((g) => ({
        ...g,
        priorityScore: 50,
        urgency: "medium" as const,
        estimatedEffort: "days" as const,
        crossFrameworkImpact: [],
        reasoning: "Dry-run mode — no external AI call",
      })),
      totalGaps: gaps.length,
      criticalGaps: 0,
      estimatedDaysToAuditReady: gaps.length * 7,
      topPriority: null,
    };
  }

  // 4. Build prioritized result
  const prioritizedGaps: GapPriority[] = gaps.map((gap, idx) => {
    // Calculate a base priority score from gap properties
    let baseScore = 50;
    if (gap.status === "not_implemented") baseScore += 20;
    if (gap.evidenceCount === 0) baseScore += 15;
    if (["SOC 2", "ISO 27001"].includes(gap.framework)) baseScore += 10;

    // Cross-framework impact
    const crossImpact = findCrossFrameworkImpact(gap, gaps);

    return {
      controlId: gap.controlId,
      controlName: gap.controlName,
      framework: gap.framework,
      status: gap.status,
      evidenceCount: gap.evidenceCount,
      priorityScore: Math.min(100, baseScore + crossImpact.length * 5),
      urgency: baseScore >= 80 ? "critical" : baseScore >= 60 ? "high" : baseScore >= 40 ? "medium" : "low",
      estimatedEffort: baseScore >= 70 ? "days" : baseScore >= 40 ? "weeks" : "hours",
      crossFrameworkImpact: crossImpact,
      reasoning: `Priority ${idx + 1}: ${gap.framework} control ${gap.controlId} with ${gap.evidenceCount} evidence items.`,
    };
  });

  // Sort by priority score descending
  prioritizedGaps.sort((a, b) => b.priorityScore - a.priorityScore);

  const criticalGaps = prioritizedGaps.filter((g) => g.urgency === "critical").length;

  return {
    clientId,
    gaps: prioritizedGaps,
    totalGaps: prioritizedGaps.length,
    criticalGaps,
    estimatedDaysToAuditReady: Math.ceil(prioritizedGaps.length * 3.5),
    topPriority: prioritizedGaps[0] || null,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

async function loadGaps(db: any, clientId: number, frameworkFilter?: string): Promise<Array<{
  controlId: string;
  controlName: string;
  framework: string;
  status: string;
  evidenceCount: number;
}>> {
  const conditions = [eq(clientControls.clientId, clientId)];
  if (frameworkFilter) {
    conditions.push(eq(controls.framework, frameworkFilter));
  }

  const rows = await db.select({
    ccId: clientControls.id,
    controlId: controls.controlId,
    controlName: controls.name,
    framework: controls.framework,
    status: clientControls.status,
  })
    .from(clientControls)
    .innerJoin(controls, eq(controls.id, clientControls.controlId))
    .where(and(...conditions));

  // Bulk-load evidence counts to avoid N+1
  const allEvidence = await db.select().from(evidence).where(eq(evidence.clientId, clientId));
  const evidenceByClientControl = new Map<number, number>();
  for (const ev of allEvidence) {
    evidenceByClientControl.set(ev.clientControlId, (evidenceByClientControl.get(ev.clientControlId) || 0) + 1);
  }

  const gaps: Array<{ controlId: string; controlName: string; framework: string; status: string; evidenceCount: number }> = [];

  for (const row of rows) {
    // Only include controls that are not fully implemented
    if (row.status === "implemented") continue;

    const evidenceCount = evidenceByClientControl.get(row.ccId) || 0;

    gaps.push({
      controlId: row.controlId || "",
      controlName: row.controlName || "",
      framework: row.framework || "",
      status: row.status || "not_assessed",
      evidenceCount,
    });
  }

  return gaps;
}

function findCrossFrameworkImpact(gap: { controlId: string; controlName: string; framework: string }, allGaps: Array<{ controlId: string; framework: string }>): string[] {
  // Controls that appear in multiple frameworks (e.g., access control maps to SOC 2, ISO 27001, HIPAA)
  const related = allGaps.filter(
    (g) => g.controlId === gap.controlId && g.framework !== gap.framework
  );
  return related.map((g) => g.framework);
}
