/**
 * NIS2 Risk Quantification - data contract + hooks
 * =================================================
 * UI-side typed view of the `riskQuantification.*` tRPC procedures (registered
 * as `riskQuantification:` on the AppRouter in `packages/core/src/routers.ts`,
 * facade over the pure engine `packages/core/src/lib/nis2/riskQuantification.ts`).
 *
 * NIS2 Implementation Plan Phase 1 Task 1.2 "Risk Quantification Engine":
 * the four procedures power the "NIS2 Risk Quantification" section on the
 * Risk Heat Map page (quantitative appetite check, 5x5 likelihood x impact
 * heat matrix, inherent-vs-residual tracking and treatment plan cards).
 *
 * COORDINATION BY CONVENTION (UI-STANDARD 16) - if the procedures are not
 * live yet the tRPC HTTP call 404s (NOT_FOUND) and the query surfaces an
 * error; every consumer in the UI degrades to a graceful EmptyState
 * ("Connect the riskQuantification.<procedure> API").
 *
 * ---------------------------------------------------------------------------
 * Expected procedures (all protected queries, pure - no DB access):
 *
 * 1) riskQuantification.appetite
 *    input:  { risks?: QuantRiskRow[], config?: { appetiteScore?,
 *              appetiteAnnualLossEur?, tolerancePct? } }
 *    output: { totalRisks, assessedCount, withinCount, toleranceCount,
 *              exceededCount, avgScore, appetiteUtilizationPct,
 *              breaches: Array<{ id, name, score, verdict: 'exceeded' }>,
 *              recommendations: string[] }
 *            (score = likelihood x impact, 1-25; exceeded when score >
 *             appetiteScore x (1 + tolerancePct/100), tolerance when score >
 *             appetiteScore, else within; bands low 1-4 / medium 5-9 /
 *             high 10-15 / critical 16-25)
 *
 * 2) riskQuantification.matrix
 *    input:  { risks?: QuantRiskRow[] }
 *    output: { cells: Array<{ likelihood, impact, score, count, band }>
 *              (fixed 25 cells, likelihood desc 5..1 then impact asc 1..5),
 *              totalAssessed, byBand: { critical, high, medium, low },
 *              avgScore, topRisks: Array<{ id, name, score, band }> (max 5) }
 *
 * 3) riskQuantification.residual
 *    input:  { risks?: QuantRiskRow[], appetiteScore? }
 *    output: { rows: Array<{ id, name, inherent, residual, delta,
 *              reductionPct, direction: 'reduced'|'unchanged'|'increased' }>
 *              (sorted residual desc),
 *              totalTracked, reducedCount, unchangedCount, increasedCount,
 *              aboveAppetiteCount (strict residual > appetiteScore),
 *              avgReductionPct, worst: rows[0..5] }
 *
 * 4) riskQuantification.treatmentPlans
 *    input:  { risks?: QuantRiskRow[], horizonDays?, threshold?, now? }
 *    output: { plans: Array<{ id, name, score,
 *              priority: 'P0'|'P1'|'P2'|'P3',
 *              strategy: 'mitigate'|'transfer'|'accept'|'avoid',
 *              actions: string[], owner, deadline: string|null }>,
 *              totalRisks, plannedCount,
 *              byStrategy: Record<strategy, number>,
 *              byPriority: Record<priority, number>,
 *              nextDeadline: string|null }
 *            (priorities P0 >=16 / P1 >=10 / P2 >=5 / P3 else; P0/P1 get a
 *             deadline clock + horizonDays; plans sort priority asc)
 * ---------------------------------------------------------------------------
 */

import { trpc } from "@/lib/trpc";

/* ------------------------------------------------------------------ */
/* Types (mirror the backend contract 1:1, defensive on optionals)     */
/* ------------------------------------------------------------------ */

/** Quantitative risk band derived from the 1-25 likelihood x impact score. */
export type QuantRiskBand = "low" | "medium" | "high" | "critical";

/** Appetite verdict for one assessed risk. */
export type AppetiteVerdict = "within" | "tolerance" | "exceeded";

/** Direction of inherent -> residual movement. */
export type ResidualDirection = "reduced" | "unchanged" | "increased";

/** Treatment strategy recommended for a risk. */
export type TreatmentStrategy = "mitigate" | "transfer" | "accept" | "avoid";

/** Treatment priority band. */
export type TreatmentPriority = "P0" | "P1" | "P2" | "P3";

/** Badge variants actually supported by the Badge component. */
export type QuantBadgeVariant =
  | "default"
  | "secondary"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "outline"
  | "destructive";

/** Data-viz score-bar fill (index.css .progress-* classes, UI-STANDARD 18). */
export type QuantBarClass = "progress-success" | "progress-warning" | "progress-error";

/** One risk row fed into every riskQuantification procedure (input side). */
export interface QuantRiskRowInput {
  id?: string | number | null;
  name?: string | null;
  /** Number 1-5 or keyword rare..almost-certain; invalid values are excluded by the engine. */
  likelihood?: number | string | null;
  /** Number 1-5 or keyword negligible..severe; invalid values are excluded by the engine. */
  impact?: number | string | null;
  inherentScore?: number | null;
  residualScore?: number | null;
  annualLossEstimateEur?: number | null;
  status?: string | null;
  owner?: string | null;
  controls?: string[] | null;
  controlEffectiveness?: number | null;
  dueAt?: string | null;
  createdAt?: string | null;
}

/** Appetite configuration block for the `appetite` procedure (input side). */
export interface RiskAppetiteConfigInput {
  appetiteScore?: number | null;
  appetiteAnnualLossEur?: number | null;
  tolerancePct?: number | null;
}

/* --- riskQuantification.appetite ------------------------------------- */

/** Input of riskQuantification.appetite. */
export interface RiskAppetiteQueryInput {
  risks?: QuantRiskRowInput[] | null;
  config?: RiskAppetiteConfigInput | null;
}

/** One appetite breach entry. */
export interface RiskAppetiteBreach {
  id: string | number;
  name: string;
  score: number;
  verdict: Extract<AppetiteVerdict, "exceeded">;
}

/** Output of riskQuantification.appetite. */
export interface RiskAppetiteResult {
  totalRisks: number;
  assessedCount: number;
  withinCount: number;
  toleranceCount: number;
  exceededCount: number;
  avgScore: number;
  appetiteUtilizationPct: number;
  breaches: RiskAppetiteBreach[];
  recommendations: string[];
}

/* --- riskQuantification.matrix --------------------------------------- */

/** Input of riskQuantification.matrix. */
export interface RiskMatrixQueryInput {
  risks?: QuantRiskRowInput[] | null;
}

/** One fixed matrix cell. */
export interface QuantMatrixCell {
  likelihood: number;
  impact: number;
  score: number;
  count: number;
  band: QuantRiskBand;
}

/** One top-risk entry. */
export interface QuantTopRisk {
  id: string | number;
  name: string;
  score: number;
  band: QuantRiskBand;
}

/** Output of riskQuantification.matrix. */
export interface RiskMatrixResult {
  cells: QuantMatrixCell[];
  totalAssessed: number;
  byBand: Record<QuantRiskBand, number>;
  avgScore: number;
  topRisks: QuantTopRisk[];
}

/* --- riskQuantification.residual ------------------------------------- */

/** Input of riskQuantification.residual. */
export interface ResidualQueryInput {
  risks?: QuantRiskRowInput[] | null;
  appetiteScore?: number | null;
}

/** One inherent-vs-residual tracking row. */
export interface ResidualRow {
  id: string | number;
  name: string;
  inherent: number;
  residual: number;
  delta: number;
  reductionPct: number;
  direction: ResidualDirection;
}

/** Output of riskQuantification.residual. */
export interface ResidualTrackingResult {
  rows: ResidualRow[];
  totalTracked: number;
  reducedCount: number;
  unchangedCount: number;
  increasedCount: number;
  aboveAppetiteCount: number;
  avgReductionPct: number;
  worst: ResidualRow[];
}

/* --- riskQuantification.treatmentPlans ------------------------------- */

/**
 * Input of riskQuantification.treatmentPlans. `now` pins the deadline clock
 * (epoch-ms number or ISO-8601 string; superjson-safe). The engine also
 * accepts a `clock` factory but functions do not survive the wire.
 */
export interface TreatmentPlansQueryInput {
  risks?: QuantRiskRowInput[] | null;
  horizonDays?: number | null;
  threshold?: number | null;
  now?: string | number | null;
}

/** One generated treatment plan item. */
export interface TreatmentPlanItem {
  id: string | number;
  name: string;
  score: number;
  priority: TreatmentPriority;
  strategy: TreatmentStrategy;
  actions: string[];
  owner: string;
  /** ISO-8601 deadline (P0/P1 only) or null. */
  deadline: string | null;
}

/** Output of riskQuantification.treatmentPlans. */
export interface TreatmentPlanResult {
  plans: TreatmentPlanItem[];
  totalRisks: number;
  plannedCount: number;
  byStrategy: Record<TreatmentStrategy, number>;
  byPriority: Record<TreatmentPriority, number>;
  nextDeadline: string | null;
}

/* ------------------------------------------------------------------ */
/* Empty shapes - stable defaults for degraded rendering (16)          */
/* ------------------------------------------------------------------ */

const zeroBandCounts = (): Record<QuantRiskBand, number> => ({
  critical: 0,
  high: 0,
  medium: 0,
  low: 0,
});

const zeroStrategyCounts = (): Record<TreatmentStrategy, number> => ({
  mitigate: 0,
  transfer: 0,
  accept: 0,
  avoid: 0,
});

const zeroPriorityCounts = (): Record<TreatmentPriority, number> => ({
  P0: 0,
  P1: 0,
  P2: 0,
  P3: 0,
});

export const EMPTY_RISK_APPETITE: RiskAppetiteResult = {
  totalRisks: 0,
  assessedCount: 0,
  withinCount: 0,
  toleranceCount: 0,
  exceededCount: 0,
  avgScore: 0,
  appetiteUtilizationPct: 0,
  breaches: [],
  recommendations: [],
};

/** The fixed 25-cell 5x5 grid (likelihood 5..1 rows, impact 1..5 cols). */
function buildEmptyCells(): QuantMatrixCell[] {
  const cells: QuantMatrixCell[] = [];
  for (let likelihood = 5; likelihood >= 1; likelihood--) {
    for (let impact = 1; impact <= 5; impact++) {
      const score = likelihood * impact;
      cells.push({ likelihood, impact, score, count: 0, band: quantBandForScore(score) });
    }
  }
  return cells;
}

export const EMPTY_RISK_MATRIX: RiskMatrixResult = {
  cells: buildEmptyCells(),
  totalAssessed: 0,
  byBand: zeroBandCounts(),
  avgScore: 0,
  topRisks: [],
};

export const EMPTY_RESIDUAL_TRACKING: ResidualTrackingResult = {
  rows: [],
  totalTracked: 0,
  reducedCount: 0,
  unchangedCount: 0,
  increasedCount: 0,
  aboveAppetiteCount: 0,
  avgReductionPct: 0,
  worst: [],
};

export const EMPTY_TREATMENT_PLAN_RESULT: TreatmentPlanResult = {
  plans: [],
  totalRisks: 0,
  plannedCount: 0,
  byStrategy: zeroStrategyCounts(),
  byPriority: zeroPriorityCounts(),
  nextDeadline: null,
};

/* ------------------------------------------------------------------ */
/* Narrowed tRPC query result shapes (runtime is a superset)           */
/* ------------------------------------------------------------------ */

export interface QueryLike<T> {
  data?: T;
  isLoading: boolean;
  isError: boolean;
  isFetching?: boolean;
  error?: unknown;
  refetch: () => unknown;
}

interface QueryOptions {
  enabled?: boolean;
  retry?: boolean | number;
  staleTime?: number;
}

interface RiskQuantificationTrpc {
  riskQuantification: {
    appetite: {
      useQuery: (
        input: RiskAppetiteQueryInput,
        opts?: QueryOptions
      ) => QueryLike<RiskAppetiteResult>;
    };
    matrix: {
      useQuery: (
        input: RiskMatrixQueryInput,
        opts?: QueryOptions
      ) => QueryLike<RiskMatrixResult>;
    };
    residual: {
      useQuery: (
        input: ResidualQueryInput,
        opts?: QueryOptions
      ) => QueryLike<ResidualTrackingResult>;
    };
    treatmentPlans: {
      useQuery: (
        input: TreatmentPlansQueryInput,
        opts?: QueryOptions
      ) => QueryLike<TreatmentPlanResult>;
    };
  };
}

const riskQuantificationApi = trpc as unknown as RiskQuantificationTrpc;

/* ------------------------------------------------------------------ */
/* Hooks - retry: false, enabled: clientId > 0 (UI-STANDARD 16)        */
/* ------------------------------------------------------------------ */

/**
 * Quantitative appetite check. Client-scoped - pass null for `input` to keep
 * the query disabled.
 */
export function useRiskAppetite(
  clientId: number,
  input: RiskAppetiteQueryInput | null,
  enabled = true
): QueryLike<RiskAppetiteResult> {
  return riskQuantificationApi.riskQuantification.appetite.useQuery(
    input ?? { risks: [] },
    {
      enabled: enabled && clientId > 0 && input !== null,
      retry: false,
      staleTime: 30_000,
    }
  );
}

/**
 * Fixed 5x5 likelihood x impact matrix. Client-scoped - pass null for
 * `input` to keep the query disabled.
 */
export function useRiskMatrix(
  clientId: number,
  input: RiskMatrixQueryInput | null,
  enabled = true
): QueryLike<RiskMatrixResult> {
  return riskQuantificationApi.riskQuantification.matrix.useQuery(
    input ?? { risks: [] },
    {
      enabled: enabled && clientId > 0 && input !== null,
      retry: false,
      staleTime: 30_000,
    }
  );
}

/**
 * Inherent-vs-residual tracking. Client-scoped - pass null for `input` to
 * keep the query disabled.
 */
export function useResidualTracking(
  clientId: number,
  input: ResidualQueryInput | null,
  enabled = true
): QueryLike<ResidualTrackingResult> {
  return riskQuantificationApi.riskQuantification.residual.useQuery(
    input ?? { risks: [] },
    {
      enabled: enabled && clientId > 0 && input !== null,
      retry: false,
      staleTime: 30_000,
    }
  );
}

/**
 * Deterministic treatment plan generator. Client-scoped - pass null for
 * `input` to keep the query disabled.
 */
export function useTreatmentPlans(
  clientId: number,
  input: TreatmentPlansQueryInput | null,
  enabled = true
): QueryLike<TreatmentPlanResult> {
  return riskQuantificationApi.riskQuantification.treatmentPlans.useQuery(
    input ?? { risks: [] },
    {
      enabled: enabled && clientId > 0 && input !== null,
      retry: false,
      staleTime: 30_000,
    }
  );
}

/* ------------------------------------------------------------------ */
/* Meta helpers (all token-based, dark-mode safe - UI-STANDARD 2)      */
/* ------------------------------------------------------------------ */

export interface QuantBandMeta {
  label: string;
  badgeVariant: QuantBadgeVariant;
  /** Token-based class for the band value text (dark-mode safe). */
  textClass: string;
  /**
   * Data-viz heat fill for matrix cells (UI-STANDARD 18 exception), kept
   * consistent with pages/risk/RiskHeatmapPage.tsx and
   * components/risk/RiskHeatmap.tsx.
   */
  cellClass: string;
}

/** 1-25 score band -> badge label/variant + heat-cell fill. */
export const QUANT_BAND_META: Record<QuantRiskBand, QuantBandMeta> = {
  critical: {
    label: "Critical",
    badgeVariant: "error",
    textClass: "text-[var(--error-foreground)]",
    cellClass: "bg-red-500 text-white dark:bg-red-600",
  },
  high: {
    label: "High",
    badgeVariant: "warning",
    textClass: "text-[var(--warning-foreground)]",
    cellClass: "bg-orange-500 text-white dark:bg-orange-600",
  },
  medium: {
    label: "Medium",
    badgeVariant: "warning",
    textClass: "text-[var(--warning-foreground)]",
    cellClass: "bg-amber-400 text-amber-950 dark:bg-amber-500 dark:text-amber-50",
  },
  low: {
    label: "Low",
    badgeVariant: "success",
    textClass: "text-muted-foreground",
    cellClass: "bg-emerald-400 text-emerald-950 dark:bg-emerald-500 dark:text-emerald-50",
  },
};

/** Stable render order for band tiles (critical first). */
export const QUANT_BAND_ORDER: QuantRiskBand[] = ["critical", "high", "medium", "low"];

/** Fill for an empty matrix cell (no risks in the cell). */
export const QUANT_CELL_EMPTY_CLASS =
  "bg-muted/60 text-muted-foreground/60 dark:bg-muted";

export interface AppetiteVerdictMeta {
  label: string;
  badgeVariant: QuantBadgeVariant;
  glyph: string;
  /** Token-based class for the verdict count text (dark-mode safe). */
  textClass: string;
}

/** Appetite verdict -> badge label/variant + glyph. */
export const APPETITE_VERDICT_META: Record<AppetiteVerdict, AppetiteVerdictMeta> = {
  within: {
    label: "Within appetite",
    badgeVariant: "success",
    glyph: "✓",
    textClass: "text-[var(--success-foreground)]",
  },
  tolerance: {
    label: "In tolerance",
    badgeVariant: "warning",
    glyph: "!",
    textClass: "text-[var(--warning-foreground)]",
  },
  exceeded: {
    label: "Exceeded",
    badgeVariant: "error",
    glyph: "↑",
    textClass: "text-[var(--error-foreground)]",
  },
};

/** Stable render order for verdict chips. */
export const APPETITE_VERDICT_ORDER: AppetiteVerdict[] = [
  "exceeded",
  "tolerance",
  "within",
];

export interface ResidualDirectionMeta {
  label: string;
  badgeVariant: QuantBadgeVariant;
  /** Arrow glyph; down = risk reduced (good). */
  glyph: "↓" | "→" | "↑";
  /** Token-based class for the direction value (dark-mode safe). */
  textClass: string;
}

/** Inherent -> residual direction -> badge label/variant + arrow glyph. */
export const RESIDUAL_DIRECTION_META: Record<ResidualDirection, ResidualDirectionMeta> = {
  reduced: {
    label: "Reduced",
    badgeVariant: "success",
    glyph: "↓",
    textClass: "text-[var(--success-foreground)]",
  },
  unchanged: {
    label: "Unchanged",
    badgeVariant: "secondary",
    glyph: "→",
    textClass: "text-muted-foreground",
  },
  increased: {
    label: "Increased",
    badgeVariant: "error",
    glyph: "↑",
    textClass: "text-[var(--error-foreground)]",
  },
};

/** Stable render order for direction counters. */
export const RESIDUAL_DIRECTION_ORDER: ResidualDirection[] = [
  "reduced",
  "unchanged",
  "increased",
];

export interface TreatmentStrategyMeta {
  label: string;
  badgeVariant: QuantBadgeVariant;
}

/** Treatment strategy -> badge label/variant. */
export const TREATMENT_STRATEGY_META: Record<TreatmentStrategy, TreatmentStrategyMeta> = {
  mitigate: { label: "Mitigate", badgeVariant: "info" },
  transfer: { label: "Transfer", badgeVariant: "warning" },
  accept: { label: "Accept", badgeVariant: "secondary" },
  avoid: { label: "Avoid", badgeVariant: "outline" },
};

/** Stable render order for strategy chips. */
export const TREATMENT_STRATEGY_ORDER: TreatmentStrategy[] = [
  "mitigate",
  "transfer",
  "accept",
  "avoid",
];

export interface TreatmentPriorityMeta {
  label: string;
  badgeVariant: QuantBadgeVariant;
  /** Sort rank (P0 first). */
  rank: number;
}

/** Treatment priority -> badge label/variant + sort rank. */
export const TREATMENT_PRIORITY_META: Record<TreatmentPriority, TreatmentPriorityMeta> = {
  P0: { label: "P0 · Critical", badgeVariant: "error", rank: 0 },
  P1: { label: "P1 · High", badgeVariant: "warning", rank: 1 },
  P2: { label: "P2 · Medium", badgeVariant: "info", rank: 2 },
  P3: { label: "P3 · Low", badgeVariant: "secondary", rank: 3 },
};

/** Stable render order for priority chips. */
export const TREATMENT_PRIORITY_ORDER: TreatmentPriority[] = ["P0", "P1", "P2", "P3"];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Band for a 1-25 score (mirrors the engine thresholds). */
export function quantBandForScore(score: number): QuantRiskBand {
  if (score <= 4) return "low";
  if (score <= 9) return "medium";
  if (score <= 15) return "high";
  return "critical";
}

/** Priority band for a 1-25 score (mirrors the engine thresholds). */
export function quantPriorityForScore(score: number): TreatmentPriority {
  if (score >= 16) return "P0";
  if (score >= 10) return "P1";
  if (score >= 5) return "P2";
  return "P3";
}

/** Formatted score chip text ("20/25"). */
export function formatQuantScore(score: number): string {
  return `${score}/25`;
}

/** Compact EUR amount ("€2.4M" / "€800k" / "€750"). */
export function formatEur(value: number): string {
  if (!Number.isFinite(value)) return "€0";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `€${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `€${Math.round(value / 1_000)}k`;
  return `€${Math.round(value)}`;
}

/** Whole days from `nowMs` until an ISO deadline (null when invalid). */
export function daysUntilDeadline(deadlineIso: string | null, nowMs: number): number | null {
  if (!deadlineIso) return null;
  const ms = Date.parse(deadlineIso);
  if (Number.isNaN(ms)) return null;
  return Math.ceil((ms - nowMs) / 86_400_000);
}

export interface DeadlineCountdownMeta {
  label: string;
  badgeVariant: QuantBadgeVariant;
  textClass: string;
}

/** Deadline countdown -> urgency label/colors (overdue red, <=7d amber). */
export function deadlineCountdownMeta(daysLeft: number | null): DeadlineCountdownMeta {
  if (daysLeft === null) {
    return { label: "No deadline", badgeVariant: "secondary", textClass: "text-muted-foreground" };
  }
  if (daysLeft < 0) {
    return {
      label: `Overdue ${Math.abs(daysLeft)}d`,
      badgeVariant: "error",
      textClass: "text-[var(--error-foreground)]",
    };
  }
  if (daysLeft <= 7) {
    return {
      label: `Due in ${daysLeft}d`,
      badgeVariant: "warning",
      textClass: "text-[var(--warning-foreground)]",
    };
  }
  return {
    label: `${daysLeft}d left`,
    badgeVariant: "secondary",
    textClass: "text-muted-foreground",
  };
}

/** Appetite utilization (0-100) -> score-bar fill (>=100 red, >=70 amber). */
export function utilizationBarClass(pct: number): QuantBarClass {
  if (pct >= 100) return "progress-error";
  if (pct >= 70) return "progress-warning";
  return "progress-success";
}

/** Residual reduction pct -> score-bar fill (higher reduction = greener). */
export function reductionBarClass(pct: number): QuantBarClass {
  if (pct >= 40) return "progress-success";
  if (pct >= 15) return "progress-warning";
  return "progress-error";
}

/** Default appetite threshold when no config is provided (engine default). */
export const DEFAULT_APPETITE_SCORE = 12;

/** Derived EUR loss-appetite check for rows known client-side (demo mode). */
export interface LossAppetiteCheck {
  appetiteEur: number;
  exceededCount: number;
}

/**
 * Count rows whose annual loss estimate exceeds the loss appetite including
 * the tolerance margin (mirrors the engine comparison). Returns null when no
 * loss appetite is configured - the live contract does not expose this count.
 */
export function deriveLossAppetiteCheck(
  rows: QuantRiskRowInput[],
  config: RiskAppetiteConfigInput | null | undefined
): LossAppetiteCheck | null {
  const appetiteEur = config?.appetiteAnnualLossEur;
  if (typeof appetiteEur !== "number" || !Number.isFinite(appetiteEur) || appetiteEur < 0) {
    return null;
  }
  const tolerancePct =
    typeof config?.tolerancePct === "number" && Number.isFinite(config.tolerancePct)
      ? config.tolerancePct
      : 10;
  const factor = 1 + tolerancePct / 100;
  let exceededCount = 0;
  for (const row of rows) {
    const loss = row.annualLossEstimateEur;
    if (typeof loss === "number" && Number.isFinite(loss) && loss > appetiteEur * factor) {
      exceededCount++;
    }
  }
  return { appetiteEur, exceededCount };
}

/* ------------------------------------------------------------------ */
/* Demo mode (UI-STANDARD 17) - sample data, never fake primary state  */
/* ------------------------------------------------------------------ */

/**
 * Fixed demo clock so the risk-quantification demo is deterministic: every
 * deadline and countdown is computed from this instant.
 */
export const DEMO_QUANT_BASE_DATE = new Date("2026-09-15T00:00:00.000Z");

const DAY_MS = 86_400_000;

/** Demo appetite configuration (11 keeps all three verdicts populated). */
export const DEMO_APPETITE_CONFIG: RiskAppetiteConfigInput = {
  appetiteScore: 11,
  appetiteAnnualLossEur: 1_000_000,
  tolerancePct: 10,
};

/** Demo treatment-plan options (mirror the engine defaults). */
export const DEMO_TREATMENT_HORIZON_DAYS = 30;
export const DEMO_TREATMENT_THRESHOLD = 10;

/**
 * Sample risk register fed into every demo procedure: mixed bands, verdicts,
 * residual directions (one increased, one unchanged via zero controls), one
 * closed row (excluded from plans) and one contractual control that flips
 * the strategy ladder to "transfer".
 */
export const DEMO_QUANT_RISKS: QuantRiskRowInput[] = [
  {
    id: "R-001",
    name: "Ransomware encryption of backup repositories",
    likelihood: 5,
    impact: 4,
    inherentScore: 20,
    residualScore: 8,
    annualLossEstimateEur: 2_400_000,
    status: "open",
    owner: "CISO",
    controls: ["Immutable offline backups", "EDR on all endpoints", "Incident response runbook"],
  },
  {
    id: "R-002",
    name: "SCADA remote-access gateway exposed on the internet",
    likelihood: 4,
    impact: 4,
    inherentScore: 16,
    residualScore: 9,
    annualLossEstimateEur: 1_800_000,
    status: "mitigating",
    owner: "Head of OT",
    controls: ["Network segmentation", "Jump host hardening"],
  },
  {
    id: "R-003",
    name: "Supply-chain compromise of managed service provider",
    likelihood: 4,
    impact: 3,
    inherentScore: 12,
    residualScore: 7,
    annualLossEstimateEur: 900_000,
    status: "open",
    owner: "Procurement Lead",
    controls: ["Vendor security reviews", "Contractual security clauses"],
  },
  {
    id: "R-004",
    name: "Spear-phishing of finance administrators",
    likelihood: 4,
    impact: 2,
    inherentScore: 8,
    controlEffectiveness: 50,
    annualLossEstimateEur: 400_000,
    status: "open",
    owner: "IT Security",
    controls: ["MFA everywhere", "Awareness training"],
  },
  {
    id: "R-005",
    name: "Volumetric DDoS against the customer portal",
    likelihood: 3,
    impact: 3,
    inherentScore: 9,
    residualScore: 5,
    annualLossEstimateEur: 250_000,
    status: "open",
    owner: "Platform Team",
    controls: ["CDN scrubbing", "Anycast failover"],
  },
  {
    id: "R-006",
    name: "Insider data exfiltration via removable media",
    likelihood: 3,
    impact: 4,
    inherentScore: 12,
    residualScore: 8,
    annualLossEstimateEur: 750_000,
    status: "open",
    owner: "DPO",
    controls: ["DLP agent"],
  },
  {
    id: "R-007",
    name: "Zero-day exploit in the edge VPN gateway",
    likelihood: 2,
    impact: 5,
    inherentScore: 10,
    residualScore: 12,
    annualLossEstimateEur: 600_000,
    status: "open",
    owner: "Network Team",
    controls: ["Virtual patching"],
  },
  {
    id: "R-008",
    name: "Legacy TLS cipher suites on internal services",
    likelihood: 2,
    impact: 2,
    inherentScore: 4,
    annualLossEstimateEur: 50_000,
    status: "open",
    owner: "IT Operations",
    controls: [],
  },
  {
    id: "R-009",
    name: "Malware on OT maintenance laptops",
    likelihood: 3,
    impact: 2,
    inherentScore: 6,
    residualScore: 3,
    annualLossEstimateEur: 120_000,
    status: "mitigating",
    owner: "OT Engineering",
    controls: ["Endpoint hardening", "USB port blocking"],
  },
  {
    id: "R-010",
    name: "Cloud storage misconfiguration exposing records",
    likelihood: 3,
    impact: 5,
    inherentScore: 15,
    residualScore: 10,
    annualLossEstimateEur: 1_200_000,
    status: "open",
    owner: "Cloud Platform",
    controls: ["CSPM alerts"],
  },
  {
    id: "R-011",
    name: "Physical intrusion into the server room",
    likelihood: 2,
    impact: 4,
    inherentScore: 8,
    controlEffectiveness: 50,
    annualLossEstimateEur: 300_000,
    status: "open",
    owner: "Facilities",
    controls: ["Badge access", "CCTV coverage"],
  },
  {
    id: "R-012",
    name: "End-of-life firewall firmware",
    likelihood: 5,
    impact: 1,
    inherentScore: 5,
    residualScore: 5,
    annualLossEstimateEur: 80_000,
    status: "closed",
    owner: "IT Operations",
    controls: ["Replacement project"],
  },
];

const cloneDemoRisks = (): QuantRiskRowInput[] =>
  DEMO_QUANT_RISKS.map((row) => ({ ...row, controls: [...(row.controls ?? [])] }));

/** Round to 1 decimal, half-up (mirrors the engine). */
const round1 = (value: number): number => {
  const rounded = Math.round((value + 1e-12) * 10) / 10;
  return rounded === 0 ? 0 : rounded;
};

/** Effectiveness fraction for residual derivation (mirrors the engine map). */
function demoEffectiveness(row: QuantRiskRowInput): number {
  if (typeof row.controlEffectiveness === "number") {
    return row.controlEffectiveness / 100;
  }
  switch (Math.min((row.controls ?? []).length, 4)) {
    case 0:
      return 0;
    case 1:
      return 0.2;
    case 2:
      return 0.35;
    case 3:
      return 0.5;
    default:
      return 0.6;
  }
}

/** Score of a demo row (likelihood x impact); all demo rows are valid. */
function demoScore(row: QuantRiskRowInput): number {
  return (row.likelihood as number) * (row.impact as number);
}

/** Input object for riskQuantification.appetite in demo mode. */
export function buildDemoRiskAppetiteInput(): RiskAppetiteQueryInput {
  return { risks: cloneDemoRisks(), config: { ...DEMO_APPETITE_CONFIG } };
}

/** Compute the demo appetite view-model (mirrors appetite output). */
export function buildDemoRiskAppetite(): RiskAppetiteResult {
  const config = DEMO_APPETITE_CONFIG;
  const appetiteScore = config.appetiteScore ?? DEFAULT_APPETITE_SCORE;
  const factor = 1 + (config.tolerancePct ?? 10) / 100;

  let withinCount = 0;
  let toleranceCount = 0;
  let exceededCount = 0;
  let scoreSum = 0;
  const breaches: RiskAppetiteBreach[] = [];

  for (const row of DEMO_QUANT_RISKS) {
    const score = demoScore(row);
    if (score > appetiteScore * factor) {
      exceededCount++;
      breaches.push({ id: row.id ?? "", name: row.name ?? "", score, verdict: "exceeded" });
    } else if (score > appetiteScore) {
      toleranceCount++;
    } else {
      withinCount++;
    }
    scoreSum += score;
  }

  const assessedCount = withinCount + toleranceCount + exceededCount;
  const avgScore = assessedCount > 0 ? round1(scoreSum / assessedCount) : 0;
  const appetiteUtilizationPct = round1(Math.min(100, (avgScore / appetiteScore) * 100));

  breaches.sort((a, b) => b.score - a.score || String(a.id).localeCompare(String(b.id)));

  const recommendations: string[] = [
    `${exceededCount} risks exceed the risk appetite - prioritise treatment immediately`,
    `${toleranceCount} risks sit in tolerance - monitor closely and prepare contingency plans`,
    `3 risks exceed the annual-loss appetite - quantify mitigation ROI`,
    "Review appetite thresholds annually or after major organisational change",
  ];

  return {
    totalRisks: DEMO_QUANT_RISKS.length,
    assessedCount,
    withinCount,
    toleranceCount,
    exceededCount,
    avgScore,
    appetiteUtilizationPct,
    breaches: breaches.slice(0, 5),
    recommendations: recommendations.slice(0, 5),
  };
}

/** Input object for riskQuantification.matrix in demo mode. */
export function buildDemoRiskMatrixInput(): RiskMatrixQueryInput {
  return { risks: cloneDemoRisks() };
}

/** Compute the demo matrix view-model (mirrors matrix output). */
export function buildDemoRiskMatrix(): RiskMatrixResult {
  const cells = buildEmptyCells();
  const cellIndex = new Map<string, number>();
  cells.forEach((cell, index) => cellIndex.set(`${cell.likelihood}:${cell.impact}`, index));

  const byBand = zeroBandCounts();
  const top: QuantTopRisk[] = [];
  let scoreSum = 0;

  for (const row of DEMO_QUANT_RISKS) {
    const score = demoScore(row);
    const band = quantBandForScore(score);
    const index = cellIndex.get(`${row.likelihood}:${row.impact}`);
    if (index !== undefined) cells[index].count++;
    byBand[band]++;
    scoreSum += score;
    top.push({ id: row.id ?? "", name: row.name ?? "", score, band });
  }

  top.sort((a, b) => b.score - a.score || String(a.id).localeCompare(String(b.id)));

  return {
    cells,
    totalAssessed: DEMO_QUANT_RISKS.length,
    byBand,
    avgScore: round1(scoreSum / DEMO_QUANT_RISKS.length),
    topRisks: top.slice(0, 5),
  };
}

/** Input object for riskQuantification.residual in demo mode. */
export function buildDemoResidualInput(): ResidualQueryInput {
  return { risks: cloneDemoRisks(), appetiteScore: DEMO_APPETITE_CONFIG.appetiteScore ?? null };
}

/** Compute the demo residual view-model (mirrors residual output). */
export function buildDemoResidualTracking(): ResidualTrackingResult {
  const appetiteScore = DEMO_APPETITE_CONFIG.appetiteScore ?? DEFAULT_APPETITE_SCORE;
  const rows: ResidualRow[] = [];
  let reducedCount = 0;
  let unchangedCount = 0;
  let increasedCount = 0;
  let aboveAppetiteCount = 0;
  let reductionSum = 0;

  for (const row of DEMO_QUANT_RISKS) {
    const inherent = typeof row.inherentScore === "number" ? row.inherentScore : demoScore(row);
    const residual =
      typeof row.residualScore === "number"
        ? row.residualScore
        : round1(inherent * (1 - demoEffectiveness(row)));
    const delta = round1(Math.max(0, inherent - residual));
    const reductionPct = inherent > 0 ? round1((delta / inherent) * 100) : 0;
    const direction: ResidualDirection =
      delta > 0 ? "reduced" : residual > inherent ? "increased" : "unchanged";

    rows.push({
      id: row.id ?? "",
      name: row.name ?? "",
      inherent: round1(inherent),
      residual,
      delta,
      reductionPct,
      direction,
    });

    if (direction === "reduced") reducedCount++;
    else if (direction === "increased") increasedCount++;
    else unchangedCount++;
    if (residual > appetiteScore) aboveAppetiteCount++;
    if (inherent > 0) reductionSum += reductionPct;
  }

  rows.sort((a, b) => b.residual - a.residual || String(a.id).localeCompare(String(b.id)));

  return {
    rows,
    totalTracked: rows.length,
    reducedCount,
    unchangedCount,
    increasedCount,
    aboveAppetiteCount,
    avgReductionPct: round1(reductionSum / rows.length),
    worst: rows.slice(0, 5),
  };
}

/** Input object for riskQuantification.treatmentPlans in demo mode. */
export function buildDemoTreatmentPlansInput(): TreatmentPlansQueryInput {
  return {
    risks: cloneDemoRisks(),
    horizonDays: DEMO_TREATMENT_HORIZON_DAYS,
    threshold: DEMO_TREATMENT_THRESHOLD,
    now: DEMO_QUANT_BASE_DATE.getTime(),
  };
}

/** Compute the demo treatment plans (mirrors treatmentPlans output). */
export function buildDemoTreatmentPlans(): TreatmentPlanResult {
  const threshold = DEMO_TREATMENT_THRESHOLD;
  const deadlineIso = new Date(
    DEMO_QUANT_BASE_DATE.getTime() + DEMO_TREATMENT_HORIZON_DAYS * DAY_MS
  ).toISOString();

  const plans: TreatmentPlanItem[] = [];
  const byStrategy = zeroStrategyCounts();
  const byPriority = zeroPriorityCounts();

  for (const row of DEMO_QUANT_RISKS) {
    const score = demoScore(row);
    const priority = quantPriorityForScore(score);
    byPriority[priority]++;

    // Plan eligibility mirrors the engine: open/mitigating and >= threshold.
    const status = (row.status ?? "").toLowerCase();
    const eligible = status === "" || status === "open" || status === "mitigating";
    if (score < threshold || !eligible) continue;

    const controls = row.controls ?? [];
    const strategy: TreatmentStrategy =
      score >= 16
        ? "mitigate"
        : controls.some((control) => /transfer|insurance|contract/i.test(control))
          ? "transfer"
          : "mitigate";

    const baseActions =
      strategy === "transfer"
        ? [
            "Evaluate cyber insurance coverage for this risk",
            "Negotiate contractual risk-sharing with the responsible party",
            "Document the transfer agreement and the remaining exposure",
            "Verify the counterparty security posture at least annually",
          ]
        : [
            "Identify and apply additional controls to reduce likelihood",
            "Identify and apply additional controls to reduce impact",
            "Assign a control owner and an implementation deadline",
            "Re-assess residual risk after control implementation",
            "Track implementation progress in the treatment register",
          ];
    const actions =
      priority === "P0"
        ? ["Escalate to the management board - critical risk exceeds appetite", ...baseActions].slice(0, 5)
        : [...baseActions];

    byStrategy[strategy]++;
    plans.push({
      id: row.id ?? "",
      name: row.name ?? "",
      score,
      priority,
      strategy,
      actions,
      owner: row.owner || "unassigned",
      deadline: priority === "P0" || priority === "P1" ? deadlineIso : null,
    });
  }

  plans.sort(
    (a, b) =>
      TREATMENT_PRIORITY_META[a.priority].rank - TREATMENT_PRIORITY_META[b.priority].rank ||
      b.score - a.score ||
      String(a.id).localeCompare(String(b.id))
  );

  return {
    plans,
    totalRisks: DEMO_QUANT_RISKS.length,
    plannedCount: plans.length,
    byStrategy,
    byPriority,
    nextDeadline: plans.some((plan) => plan.deadline !== null) ? deadlineIso : null,
  };
}
