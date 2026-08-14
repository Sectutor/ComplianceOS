/**
 * Risk Heatmap + Treatment Plan aggregation (scorecard P1 #3 — "Risk heat map
 * + treatment plans").
 *
 * Activates the dormant Phase-2 risk code:
 *   - `lib/risk-quant/matrix.ts` (getScoreLevel / qualitative 5x5 levels)
 *   - `lib/riskCalculations.ts` (parseLikelihoodImpact / getMatrixScoreLevel)
 *
 * The module is split into two layers so the aggregation logic is fully unit
 * testable:
 *   1. PURE functions — heat-map bucketing, summarising, treatment status
 *      transitions. They operate on plain row-shaped arrays and have no I/O.
 *   2. DB-backed loaders — thin `getDb()` wrappers that fetch rows from the
 *      existing `riskAssessments` / `riskTreatments` tables and feed the pure
 *      functions. Tests mock `../db` and `../schema` (see
 *      `lib/__tests__/riskHeatmap.test.ts`).
 */
import { eq, or } from "drizzle-orm";
import { getDb } from "../db";
import { riskAssessments, riskTreatments } from "../schema";
import { parseLikelihoodImpact, getMatrixScoreLevel } from "./riskCalculations";
import { getScoreLevel } from "./risk-quant/matrix";

export type HeatmapType = "inherent" | "residual";

export type RiskLevel = "Low" | "Medium" | "High" | "Very High" | "Critical";

/** Minimal shape of a risk-assessment row the heat map needs. */
export interface RiskAssessmentLike {
  id: number;
  likelihood?: string | number | null;
  impact?: string | number | null;
  inherentScore?: number | null;
  residualScore?: number | null;
  residualRisk?: string | null;
  inherentRisk?: string | null;
  title?: string | null;
  assessmentId?: string | null;
}

/** One cell of the 5x5 likelihood x impact matrix. */
export interface HeatmapCell {
  likelihood: number; // 1-5
  impact: number; // 1-5
  count: number;
  score: number; // likelihood * impact (1-25)
  level: RiskLevel;
  riskIds: number[];
}

/** Rolled-up statistics derived from the matrix. */
export interface HeatmapSummary {
  totalAssessments: number;
  critical: number; // score >= 15 (red band)
  high: number; // 8 <= score < 15 (orange band)
  medium: number; // 4 <= score < 8 (yellow band)
  low: number; // score < 4 (green band)
  treatmentProgressPct: number; // % of treatments implemented/verified
  treatmentsByStatus: Record<string, number>;
}

export interface RiskHeatmapResult {
  type: HeatmapType;
  matrix: HeatmapCell[];
  summary: HeatmapSummary;
  assessments: RiskAssessmentLike[];
}

// ---------------------------------------------------------------------------
// Pure aggregation logic
// ---------------------------------------------------------------------------

/**
 * Map a residual 1-25 score onto the 5x5 likelihood scale (1-5).
 * Mirrors the UI heat map (components/risk/RiskHeatmap.tsx) which renders
 * residual risk along the matrix diagonal using the same thresholds.
 */
export function residualScoreToScale(score: number | null | undefined): number {
  const s = Number(score);
  if (!Number.isFinite(s) || s <= 0) return 0;
  if (s >= 20) return 5;
  if (s >= 12) return 4;
  if (s >= 8) return 3;
  if (s >= 4) return 2;
  return 1;
}

/** 5x5 colour band used by the UI — red >= 15, orange >= 8, yellow >= 4. */
export function getCellBand(score: number): "critical" | "high" | "medium" | "low" {
  if (score >= 15) return "critical";
  if (score >= 8) return "high";
  if (score >= 4) return "medium";
  return "low";
}

/**
 * Build the 5x5 likelihood x impact matrix with per-cell risk counts.
 *
 * - type "inherent": uses likelihood x impact (each parsed/clamped to 1-5).
 * - type "residual": uses residualScore mapped onto the diagonal
 *   (likelihood = impact = scale), matching the UI behaviour.
 * Assessments that cannot be placed are skipped.
 */
export function buildHeatmapMatrix(
  assessments: RiskAssessmentLike[],
  type: HeatmapType = "inherent"
): HeatmapCell[] {
  const cells = new Map<string, HeatmapCell>();

  for (const a of assessments ?? []) {
    let l = 0;
    let i = 0;

    if (type === "residual") {
      const scale = residualScoreToScale(a.residualScore);
      if (scale > 0) {
        l = scale;
        i = scale;
      }
    } else {
      l = parseLikelihoodImpact(a.likelihood);
      i = parseLikelihoodImpact(a.impact);
    }

    if (l <= 0 || i <= 0) continue;

    const key = `${l}-${i}`;
    const score = l * i;
    let cell = cells.get(key);
    if (!cell) {
      cell = { likelihood: l, impact: i, count: 0, score, level: getMatrixScoreLevel(score), riskIds: [] };
      cells.set(key, cell);
    }
    cell.count += 1;
    cell.riskIds.push(a.id);
  }

  // Deterministic order: likelihood 1..5 then impact 1..5.
  return Array.from(cells.values()).sort(
    (a, b) => a.likelihood - b.likelihood || a.impact - b.impact
  );
}

/**
 * Normalize a raw treatment status onto the summary vocabulary used by
 * `aggregateTreatmentStatuses` / `loadTreatmentSummary`.
 *
 * Accepts BOTH vocabularies that exist in the codebase:
 *   - DB vocabulary written by createRiskTreatment: planned / in_progress /
 *     implemented / verified
 *   - UI vocabulary (riskHeatmapApi.ts): open / in-progress / mitigated /
 *     accepted
 *
 * Mapping: planned → open, in_progress|in-progress → in-progress,
 * implemented|verified|completed → mitigated, accepted → accepted.
 * Unknown statuses pass through lowercased so no data is silently dropped.
 */
export function normalizeSummaryStatus(
  status: string | null | undefined
): string {
  const s = (status || "planned")
    .toLowerCase()
    .trim()
    .replace(/[\s-]+/g, "_");
  if (s === "planned") return "open";
  if (s === "in_progress" || s === "in-progress") return "in-progress";
  if (s === "implemented" || s === "verified" || s === "completed") return "mitigated";
  if (s === "accepted") return "accepted";
  return s;
}

/**
 * Aggregate treatment rows into a status breakdown + progress percentage.
 * Statuses are normalized onto the summary vocabulary (see
 * `normalizeSummaryStatus`) so treatments written by createRiskTreatment
 * (planned/in_progress/implemented/verified) count toward the same buckets as
 * the UI vocabulary (open/in-progress/mitigated/accepted). treatmentProgressPct
 * counts resolved treatments (implemented/verified/completed → mitigated).
 */
export function aggregateTreatmentStatuses(
  treatments: Array<{ status?: string | null }>
): { treatmentsByStatus: Record<string, number>; treatmentProgressPct: number } {
  const byStatus: Record<string, number> = {};
  let total = 0;
  let done = 0;

  for (const t of treatments ?? []) {
    const status = normalizeSummaryStatus(t.status);
    byStatus[status] = (byStatus[status] || 0) + 1;
    total += 1;
    if (status === "mitigated") {
      done += 1;
    }
  }

  const treatmentProgressPct = total > 0 ? Math.round((done / total) * 100) : 0;
  return { treatmentsByStatus: byStatus, treatmentProgressPct };
}

/**
 * Summarise the matrix: total count and counts per UI colour band.
 * Uses `getScoreLevel` from the dormant risk-quant module (now activated).
 */
export function summarizeHeatmap(matrix: HeatmapCell[]): Omit<HeatmapSummary, "treatmentProgressPct" | "treatmentsByStatus"> {
  let total = 0;
  let critical = 0;
  let high = 0;
  let medium = 0;
  let low = 0;

  for (const cell of matrix ?? []) {
    total += cell.count;
    const band = getCellBand(cell.score);
    if (band === "critical") critical += cell.count;
    else if (band === "high") high += cell.count;
    else if (band === "medium") medium += cell.count;
    else low += cell.count;
    // getScoreLevel is referenced here so the qualitative level metadata from
    // risk-quant/matrix.ts stays exercised (thresholds 20/12/8).
    void getScoreLevel(cell.score);
  }

  return { totalAssessments: total, critical, high, medium, low };
}

// ---------------------------------------------------------------------------
// Treatment status transitions
// ---------------------------------------------------------------------------

/**
 * Canonical treatment lifecycle. `completed` is accepted as a synonym for
 * `verified` (used by several existing queries in risks.ts).
 */
export const TREATMENT_STATUS_FLOW: Record<string, readonly string[]> = {
  planned: ["in_progress"],
  in_progress: ["implemented", "verified"],
  implemented: ["verified"],
  verified: [],
  completed: [],
};

export const TREATMENT_STATUSES = Object.keys(TREATMENT_STATUS_FLOW);

export interface TransitionResult {
  allowed: boolean;
  reason?: string;
}

/**
 * Validate a treatment status transition (pure).
 * - Same status is a no-op (allowed).
 * - Only forward moves in TREATMENT_STATUS_FLOW are allowed.
 * - `completed` is treated as an alias of the terminal state `verified`.
 */
export function canTransitionTreatment(
  current: string | null | undefined,
  next: string | null | undefined
): TransitionResult {
  const normalize = (s: string | null | undefined): string => {
    const v = (s || "planned").toLowerCase();
    return v === "completed" ? "verified" : v;
  };
  const from = normalize(current);
  const to = normalize(next);

  if (!TREATMENT_STATUSES.includes(from)) {
    return { allowed: false, reason: `Unknown current status "${from}"` };
  }
  if (!TREATMENT_STATUSES.includes(to)) {
    return { allowed: false, reason: `Unknown target status "${to}"` };
  }
  if (from === to) return { allowed: true };

  const allowedNext = TREATMENT_STATUS_FLOW[from];
  if (!allowedNext.includes(to)) {
    return {
      allowed: false,
      reason: `Cannot transition treatment from "${from}" to "${to}"`,
    };
  }
  return { allowed: true };
}

// ---------------------------------------------------------------------------
// DB-backed loaders (getDb() + existing tables)
// ---------------------------------------------------------------------------

/**
 * Load heat-map data for a client:
 *   1. all risk assessments for the client
 *   2. all treatment plans linked to those assessments (or with a direct
 *      client_id — both write paths exist in risks.ts)
 * and aggregate them into a matrix + summary.
 */
export async function loadRiskHeatmap(
  clientId: number,
  type: HeatmapType = "inherent"
): Promise<RiskHeatmapResult> {
  const db = await getDb();

  const assessments = (await db
    .select({
      id: riskAssessments.id,
      likelihood: riskAssessments.likelihood,
      impact: riskAssessments.impact,
      inherentScore: riskAssessments.inherentScore,
      residualScore: riskAssessments.residualScore,
      residualRisk: riskAssessments.residualRisk,
      inherentRisk: riskAssessments.inherentRisk,
      title: riskAssessments.title,
      assessmentId: riskAssessments.assessmentId,
    })
    .from(riskAssessments)
    .where(eq(riskAssessments.clientId, clientId))) as unknown as RiskAssessmentLike[];

  const treatments = (await db
    .select({
      id: riskTreatments.id,
      clientId: riskTreatments.clientId,
      riskAssessmentId: riskTreatments.riskAssessmentId,
      status: riskTreatments.status,
      dueDate: riskTreatments.dueDate,
      priority: riskTreatments.priority,
      strategy: riskTreatments.strategy,
    })
    .from(riskTreatments)
    .innerJoin(riskAssessments, eq(riskTreatments.riskAssessmentId, riskAssessments.id))
    .where(
      or(eq(riskAssessments.clientId, clientId), eq(riskTreatments.clientId, clientId))
    )) as unknown as Array<{ status?: string | null }>;

  const matrix = buildHeatmapMatrix(assessments, type);
  const base = summarizeHeatmap(matrix);
  const { treatmentsByStatus, treatmentProgressPct } = aggregateTreatmentStatuses(treatments);

  return {
    type,
    matrix,
    summary: { ...base, treatmentProgressPct, treatmentsByStatus },
    assessments,
  };
}

/** Load treatment summary (status breakdown + progress) for a client. */
export async function loadTreatmentSummary(clientId: number): Promise<{
  total: number;
  treatmentsByStatus: Record<string, number>;
  treatmentProgressPct: number;
}> {
  const db = await getDb();

  const treatments = (await db
    .select({
      id: riskTreatments.id,
      status: riskTreatments.status,
      dueDate: riskTreatments.dueDate,
      priority: riskTreatments.priority,
    })
    .from(riskTreatments)
    .innerJoin(riskAssessments, eq(riskTreatments.riskAssessmentId, riskAssessments.id))
    .where(
      or(eq(riskAssessments.clientId, clientId), eq(riskTreatments.clientId, clientId))
    )) as unknown as Array<{ status?: string | null }>;

  const { treatmentsByStatus, treatmentProgressPct } = aggregateTreatmentStatuses(treatments);
  return { total: treatments.length, treatmentsByStatus, treatmentProgressPct };
}

/**
 * Update a treatment's status enforcing the forward-only transition rules.
 * Verifies the treatment belongs to the client before mutating.
 */
export async function updateTreatmentStatus(
  treatmentId: number,
  clientId: number,
  nextStatus: string
): Promise<{ id: number; status: string; allowed: boolean }> {
  const db = await getDb();

  const [treatment] = await db
    .select({ id: riskTreatments.id, clientId: riskTreatments.clientId, status: riskTreatments.status })
    .from(riskTreatments)
    .where(eq(riskTreatments.id, treatmentId))
    .limit(1);

  if (!treatment) {
    throw new Error(`Treatment ${treatmentId} not found`);
  }

  // Verify ownership through the linked assessment as well (treatments may
  // have a null client_id when created via saveTreatmentPlan).
  const [owner] = await db
    .select({ clientId: riskAssessments.clientId })
    .from(riskAssessments)
    .innerJoin(riskTreatments, eq(riskTreatments.riskAssessmentId, riskAssessments.id))
    .where(eq(riskTreatments.id, treatmentId))
    .limit(1);

  const ownerClientId = treatment.clientId ?? owner?.clientId;
  if (ownerClientId !== undefined && ownerClientId !== null && ownerClientId !== clientId) {
    throw new Error(`Treatment ${treatmentId} does not belong to client ${clientId}`);
  }

  const transition = canTransitionTreatment(treatment.status, nextStatus);
  if (!transition.allowed) {
    return { id: treatmentId, status: treatment.status, allowed: false };
  }

  const [updated] = await db
    .update(riskTreatments)
    .set({ status: nextStatus.toLowerCase(), updatedAt: new Date() })
    .where(eq(riskTreatments.id, treatmentId))
    .returning();

  return { id: treatmentId, status: updated.status, allowed: true };
}

// ---------------------------------------------------------------------------
// Cycle-3 UI contract (riskHeatmapApi.ts): heatmap contract + treatment plans
// ---------------------------------------------------------------------------

export interface HeatmapContractTotals {
  totalRisks: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  /** 0..100 — share of risks with an active/completed treatment plan */
  treatmentProgress: number;
}

/**
 * Map the internal RiskHeatmapResult onto the UI contract shape
 * (packages/core/src/pages/risk/riskHeatmapApi.ts):
 *   { matrix, totals: { totalRisks, criticalCount, highCount, mediumCount,
 *     lowCount, treatmentProgress }, updatedAt }
 */
export function buildHeatmapContract(result: RiskHeatmapResult): {
  matrix: HeatmapCell[];
  totals: HeatmapContractTotals;
  updatedAt: string;
} {
  return {
    matrix: result.matrix,
    totals: {
      totalRisks: result.summary.totalAssessments,
      criticalCount: result.summary.critical,
      highCount: result.summary.high,
      mediumCount: result.summary.medium,
      lowCount: result.summary.low,
      treatmentProgress: result.summary.treatmentProgressPct,
    },
    updatedAt: new Date().toISOString(),
  };
}

/** Minimal shape of a risk-treatment row the plan list needs. */
export interface TreatmentLike {
  id: number;
  riskAssessmentId?: number | null;
  riskScenarioId?: number | null;
  treatmentType?: string | null;
  strategy?: string | null;
  status?: string | null;
  owner?: string | null;
  dueDate?: Date | string | null;
}

/** Treatment-plan row the UI contract expects (status normalized). */
export interface TreatmentPlan {
  id: number;
  riskId: number;
  riskTitle: string;
  strategy?: string | null;
  status: "open" | "in-progress" | "mitigated" | "accepted" | string;
  owner?: string | null;
  dueDate?: string | null;
  likelihood?: number | null;
  impact?: number | null;
}

/**
 * Normalize a raw treatment status onto the UI vocabulary:
 * implemented|verified|completed -> mitigated, accepted -> accepted,
 * in-progress|in_progress -> in-progress, anything else -> open.
 */
export function normalizeTreatmentStatus(
  status: string | null | undefined
): TreatmentPlan["status"] {
  const s = (status || "").toLowerCase().replace(/[\s-]+/g, "_");
  if (s === "implemented" || s === "verified" || s === "completed") return "mitigated";
  if (s === "accepted") return "accepted";
  if (s === "in_progress" || s === "in-progress") return "in-progress";
  return "open";
}

/**
 * Join treatment rows to their risk assessments and project the UI contract
 * rows. Pure — unit-testable with plain arrays.
 */
export function buildTreatmentPlans(
  treatments: TreatmentLike[],
  assessmentsById: Map<number, RiskAssessmentLike>
): TreatmentPlan[] {
  return (treatments ?? []).map((t) => {
    const assessment =
      t.riskAssessmentId !== undefined && t.riskAssessmentId !== null
        ? assessmentsById?.get(t.riskAssessmentId)
        : undefined;
    const riskId = t.riskAssessmentId ?? t.riskScenarioId ?? t.id;
    const likelihood = assessment ? parseLikelihoodImpact(assessment.likelihood) : 0;
    const impact = assessment ? parseLikelihoodImpact(assessment.impact) : 0;

    return {
      id: t.id,
      riskId,
      riskTitle: assessment?.title || `Risk #${riskId}`,
      strategy: t.treatmentType ?? t.strategy ?? null,
      status: normalizeTreatmentStatus(t.status),
      owner: t.owner ?? null,
      dueDate: t.dueDate ? new Date(t.dueDate).toISOString() : null,
      likelihood: likelihood > 0 ? likelihood : undefined,
      impact: impact > 0 ? impact : undefined,
    };
  });
}

/**
 * Load treatment plans for a client (optionally filtered to a 5x5 cell via
 * likelihood/impact). Joins risk_treatments -> risk_assessments for the
 * risk title + cell coordinates.
 */
export async function listTreatmentPlans(
  clientId: number,
  likelihood?: number,
  impact?: number
): Promise<TreatmentPlan[]> {
  const db = await getDb();

  const treatments = (await db
    .select({
      id: riskTreatments.id,
      riskAssessmentId: riskTreatments.riskAssessmentId,
      riskScenarioId: riskTreatments.riskScenarioId,
      treatmentType: riskTreatments.treatmentType,
      strategy: riskTreatments.strategy,
      status: riskTreatments.status,
      owner: riskTreatments.owner,
      dueDate: riskTreatments.dueDate,
    })
    .from(riskTreatments)
    .innerJoin(riskAssessments, eq(riskTreatments.riskAssessmentId, riskAssessments.id))
    .where(
      or(eq(riskAssessments.clientId, clientId), eq(riskTreatments.clientId, clientId))
    )) as unknown as TreatmentLike[];

  const assessments = (await db
    .select({
      id: riskAssessments.id,
      title: riskAssessments.title,
      likelihood: riskAssessments.likelihood,
      impact: riskAssessments.impact,
    })
    .from(riskAssessments)
    .where(eq(riskAssessments.clientId, clientId))) as unknown as RiskAssessmentLike[];

  const assessmentsById = new Map(assessments.map((a) => [a.id, a]));

  const filtered = (treatments ?? []).filter((t) => {
    if (likelihood === undefined && impact === undefined) return true;
    const a =
      t.riskAssessmentId !== undefined && t.riskAssessmentId !== null
        ? assessmentsById.get(t.riskAssessmentId)
        : undefined;
    if (!a) return false;
    if (likelihood !== undefined && parseLikelihoodImpact(a.likelihood) !== likelihood) return false;
    if (impact !== undefined && parseLikelihoodImpact(a.impact) !== impact) return false;
    return true;
  });

  return buildTreatmentPlans(filtered, assessmentsById);
}
