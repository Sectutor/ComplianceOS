/**
 * NIS2 Risk Quantification engine.
 *
 * Cycle 26 (NIS2 Implementation Plan Phase 1 Task 1.2 "Risk Quantification
 * Engine"): quantitative risk appetite checking, a 5x5 likelihood x impact
 * heat matrix, inherent-vs-residual risk tracking and a deterministic risk
 * treatment plan generator.
 * Pure view-model logic — no DB, no network, no side effects.
 *
 * Design rules (house pattern — mirrors lib/nis2/threatLandscape.ts and
 * lib/nis2/securityMetrics.ts):
 * - Pure and deterministic: no I/O, no DB, no random sources,
 *   iteration-order independent logic. Same input always yields the same
 *   output.
 * - NEVER throws: malformed input (null/non-object rows, missing/invalid
 *   numbers, non-array collections, unknown enum strings) is coerced to
 *   safe neutral values and yields the documented safe shape (the exported
 *   EMPTY_* frozen constants).
 * - Injectable clock: `generateTreatmentPlans` accepts an optional `now`
 *   (epoch-ms number, ISO-8601 string or Date) or a `clock` factory
 *   `() => Date`; when both are missing it defaults to the current time.
 *   A throwing clock factory falls through to the current time.
 * - Time arithmetic uses fixed millisecond constants (one day = 24h).
 * - All numeric outputs are rounded deterministically: averages/percentages
 *   to 1 decimal (half-up), counts to whole numbers.
 *
 * Field coercion contract:
 * - `likelihood`: number 1-5 OR keyword rare=1 / unlikely=2 / possible=3 /
 *   likely=4 / almost-certain=5 (case-insensitive). Numbers outside 1-5
 *   and unknown words are INVALID (excluded from score math, not clamped).
 * - `impact`: number 1-5 OR negligible=1 / minor=2 / moderate=3 /
 *   major=4 / severe=5. Same invalid rules.
 * - `inherentScore` / `residualScore` / `controlEffectiveness`: finite
 *   numbers in [0, 100]; anything else is invalid.
 */

/* ------------------------------------------------------------------ */
/* Public types                                                        */
/* ------------------------------------------------------------------ */

/** Injectable clock options shared by time-aware engine functions. */
export interface RiskQuantificationOptions {
  /** Pin "now": ISO-8601 string, epoch-ms number or Date object. */
  now?: string | number | Date | null;
  /** Pin "now" via a factory; used only when `now` is absent/invalid. */
  clock?: (() => Date) | null;
}

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

/** One risk row consumed by every engine function. */
export interface QuantRiskRow {
  id?: string | number;
  name?: string;
  likelihood?: number | string;
  impact?: number | string;
  inherentScore?: number;
  residualScore?: number;
  annualLossEstimateEur?: number;
  status?: string;
  owner?: string;
  controls?: string[];
  controlEffectiveness?: number;
  dueAt?: string;
  createdAt?: string;
}

/* --- computeRiskAppetite ------------------------------------------- */

/** Configuration for the quantitative appetite calculator. */
export interface RiskAppetiteConfig {
  /** Maximum acceptable 1-25 score (strictly higher enters tolerance). */
  appetiteScore?: number;
  /** Maximum acceptable estimated annual loss in EUR (optional). */
  appetiteAnnualLossEur?: number;
  /** Tolerance margin in percent above the appetite (default 10). */
  tolerancePct?: number;
}

export interface RiskAppetiteBreach {
  id: string | number;
  name: string;
  score: number;
  verdict: Extract<AppetiteVerdict, "exceeded">;
}

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

/* --- buildQuantitativeMatrix --------------------------------------- */

export interface QuantMatrixCell {
  likelihood: number;
  impact: number;
  score: number;
  count: number;
  band: QuantRiskBand;
}

export interface QuantTopRisk {
  id: string | number;
  name: string;
  score: number;
  band: QuantRiskBand;
}

export interface RiskMatrixResult {
  cells: QuantMatrixCell[];
  totalAssessed: number;
  byBand: Record<QuantRiskBand, number>;
  avgScore: number;
  topRisks: QuantTopRisk[];
}

/* --- trackResidualRisk ---------------------------------------------- */

export interface ResidualRow {
  id: string | number;
  name: string;
  inherent: number;
  residual: number;
  delta: number;
  reductionPct: number;
  direction: ResidualDirection;
}

export interface ResidualTrackingOptions extends RiskQuantificationOptions {
  /** Appetite threshold; residuals strictly above count as above-appetite. */
  appetiteScore?: number;
}

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

/* --- generateTreatmentPlans ----------------------------------------- */

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

export interface TreatmentPlanOptions extends RiskQuantificationOptions {
  /** Days from the clock until the P0/P1 plan deadline (default 30). */
  horizonDays?: number;
  /** Minimum 1-25 score that receives a plan (default 10). */
  threshold?: number;
}

export interface TreatmentPlanResult {
  plans: TreatmentPlanItem[];
  totalRisks: number;
  plannedCount: number;
  byStrategy: Record<TreatmentStrategy, number>;
  byPriority: Record<TreatmentPriority, number>;
  /** Earliest non-null plan deadline (ISO-8601) or null. */
  nextDeadline: string | null;
}

/* ------------------------------------------------------------------ */
/* Safe empty shapes (frozen constants)                                */
/* ------------------------------------------------------------------ */

export const EMPTY_RISK_APPETITE: RiskAppetiteResult = deepFreeze({
  totalRisks: 0,
  assessedCount: 0,
  withinCount: 0,
  toleranceCount: 0,
  exceededCount: 0,
  avgScore: 0,
  appetiteUtilizationPct: 0,
  breaches: [],
  recommendations: [],
});

export const EMPTY_RISK_MATRIX: RiskMatrixResult = deepFreeze({
  cells: buildEmptyCells(),
  totalAssessed: 0,
  byBand: deepFreeze({ low: 0, medium: 0, high: 0, critical: 0 }),
  avgScore: 0,
  topRisks: [],
});

export const EMPTY_RESIDUAL_TRACKING: ResidualTrackingResult = deepFreeze({
  rows: [],
  totalTracked: 0,
  reducedCount: 0,
  unchangedCount: 0,
  increasedCount: 0,
  aboveAppetiteCount: 0,
  avgReductionPct: 0,
  worst: [],
});

export const EMPTY_TREATMENT_PLAN_RESULT: TreatmentPlanResult = deepFreeze({
  plans: [],
  totalRisks: 0,
  plannedCount: 0,
  byStrategy: deepFreeze({ mitigate: 0, transfer: 0, accept: 0, avoid: 0 }),
  byPriority: deepFreeze({ P0: 0, P1: 0, P2: 0, P3: 0 }),
  nextDeadline: null,
});

/* ------------------------------------------------------------------ */
/* Sanitization helpers                                                */
/* ------------------------------------------------------------------ */

/** True for plain non-null, non-array objects. */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Recursively freeze plain objects and arrays (frozen-constant contract). */
function deepFreeze<T>(value: T): T {
  if (Array.isArray(value)) {
    for (const entry of value) {
      deepFreeze(entry);
    }
    return Object.freeze(value);
  }
  if (isObject(value)) {
    for (const key of Object.keys(value)) {
      deepFreeze((value as Record<string, unknown>)[key]);
    }
    return Object.freeze(value);
  }
  return value;
}

/** The fixed 25-cell 5x5 grid (likelihood 5..1 rows, impact 1..5 cols). */
function buildEmptyCells(): QuantMatrixCell[] {
  const cells: QuantMatrixCell[] = [];
  for (let likelihood = 5; likelihood >= 1; likelihood--) {
    for (let impact = 1; impact <= 5; impact++) {
      const score = likelihood * impact;
      cells.push({ likelihood, impact, score, count: 0, band: bandForScore(score) });
    }
  }
  return cells;
}

/** Coerce a value to epoch milliseconds, or null when invalid. */
const toTimeMs = (value: unknown): number | null => {
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isNaN(ms) ? null : ms;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const ms = Date.parse(value);
    return Number.isNaN(ms) ? null : ms;
  }
  return null;
};

/** Resolve the injectable clock from an options-like object, else current time. */
const toClock = (opts: unknown): Date => {
  const options = isObject(opts) ? opts : {};
  const now = toTimeMs(options.now);
  if (now !== null) {
    return new Date(now);
  }
  if (typeof options.clock === "function") {
    try {
      const fromClock = options.clock();
      if (fromClock instanceof Date && !Number.isNaN(fromClock.getTime())) {
        return fromClock;
      }
    } catch {
      // a throwing clock factory must never break the engine - fall through
    }
  }
  return new Date();
};

/** Round to 1 decimal, half-up, compensating floating-point error and -0. */
const round1 = (value: number): number => {
  const rounded = Math.round((value + 1e-12) * 10) / 10;
  return rounded === 0 ? 0 : rounded;
};

/** Compare id values ascending (numbers numerically before strings lexically). */
const compareIdsAsc = (a: string | number, b: string | number): number => {
  if (typeof a === "number" && typeof b === "number") {
    return a === b ? 0 : a < b ? -1 : 1;
  }
  if (typeof a === "number") return -1;
  if (typeof b === "number") return 1;
  return a.localeCompare(b);
};

/** Coerce an id-like field to the emitted id value, or "" when missing. */
const toIdValue = (value: unknown): string | number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") return value;
  return "";
};

/** Coerce a name; missing/non-string -> "". */
const toName = (value: unknown): string => {
  return typeof value === "string" ? value.trim() : "";
};

const LIKELIHOOD_WORDS: Record<string, number> = {
  rare: 1,
  unlikely: 2,
  possible: 3,
  likely: 4,
  "almost-certain": 5,
  "almost certain": 5,
};

const IMPACT_WORDS: Record<string, number> = {
  negligible: 1,
  minor: 2,
  moderate: 3,
  major: 4,
  severe: 5,
};

/**
 * Coerce a 1-5 scale field accepting numbers 1-5 or known keywords.
 * Numbers outside 1-5 and unknown words are invalid (null) — never clamped.
 */
const coerceScale = (value: unknown, words: Record<string, number>): number | null => {
  if (typeof value === "number") {
    return Number.isInteger(value) && value >= 1 && value <= 5 ? value : null;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (Object.prototype.hasOwnProperty.call(words, normalized)) {
      return words[normalized];
    }
    const parsed = Number(normalized);
    if (normalized !== "" && Number.isInteger(parsed) && parsed >= 1 && parsed <= 5) {
      return parsed;
    }
  }
  return null;
};

const coerceLikelihood = (value: unknown): number | null => coerceScale(value, LIKELIHOOD_WORDS);
const coerceImpact = (value: unknown): number | null => coerceScale(value, IMPACT_WORDS);

/** Finite number in [min, max] or null. */
const coerceFiniteIn = (value: unknown, min: number, max: number): number | null => {
  if (typeof value === "number" && Number.isFinite(value) && value >= min && value <= max) {
    return value;
  }
  return null;
};

/** Positive finite option value or the fallback. */
const coercePositive = (value: unknown, fallback: number): number => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  return fallback;
};

/** Non-negative finite option value or the fallback. */
const coerceNonNegative = (value: unknown, fallback: number): number => {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0) return value;
  return fallback;
};

/** Band for a 1-25 score: low 1-4 / medium 5-9 / high 10-15 / critical 16-25. */
function bandForScore(score: number): QuantRiskBand {
  if (score <= 4) return "low";
  if (score <= 9) return "medium";
  if (score <= 15) return "high";
  return "critical";
}

/** Priority band for a 1-25 score: P0 >=16 / P1 >=10 / P2 >=5 / P3 else. */
function priorityForScore(score: number): TreatmentPriority {
  if (score >= 16) return "P0";
  if (score >= 10) return "P1";
  if (score >= 5) return "P2";
  return "P3";
}

/** Normalize a status string; missing/non-string -> undefined. */
const coerceStatus = (value: unknown): string | undefined => {
  return typeof value === "string" && value.trim() !== "" ? value.trim().toLowerCase() : undefined;
};

/** True when the status allows an active treatment plan. */
const isPlanEligibleStatus = (status: string | undefined): boolean => {
  return status === undefined || status === "open" || status === "mitigating";
};

/** Trimmed control strings of a row (order-preserving). */
const toControls = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const entry of value) {
    if (typeof entry === "string" && entry.trim() !== "") out.push(entry.trim());
  }
  return out;
};

/** One coerced risk row (or null when not an object). */
interface CoercedRow {
  id: string | number;
  name: string;
  likelihood: number | null;
  impact: number | null;
  inherentOverride: number | null;
  residualOverride: number | null;
  annualLossEur: number | null;
  status: string | undefined;
  owner: string;
  controls: string[];
  controlEffectiveness: number | null;
}

const coerceRow = (value: unknown): CoercedRow | null => {
  if (!isObject(value)) return null;
  return {
    id: toIdValue(value.id),
    name: toName(value.name),
    likelihood: coerceLikelihood(value.likelihood),
    impact: coerceImpact(value.impact),
    inherentOverride: coerceFiniteIn(value.inherentScore, 0, 100),
    residualOverride: coerceFiniteIn(value.residualScore, 0, 100),
    annualLossEur: typeof value.annualLossEstimateEur === "number" && Number.isFinite(value.annualLossEstimateEur) ? value.annualLossEstimateEur : null,
    status: coerceStatus(value.status),
    owner: toName(value.owner),
    controls: toControls(value.controls),
    controlEffectiveness: coerceFiniteIn(value.controlEffectiveness, 0, 100),
  };
};

/** Coerce the input collection into rows, preserving order. Non-array -> []. */
const coerceRows = (risks: unknown): CoercedRow[] => {
  if (!Array.isArray(risks)) return [];
  const rows: CoercedRow[] = [];
  for (const entry of risks) {
    const row = coerceRow(entry);
    if (row !== null) rows.push(row);
  }
  return rows;
};

/** Score of a row (likelihood x impact) or null when either axis is invalid. */
const rowScore = (row: CoercedRow): number | null => {
  if (row.likelihood === null || row.impact === null) return null;
  return row.likelihood * row.impact;
};

/** Effectiveness fraction for residual derivation. */
const effectivenessOf = (row: CoercedRow): number => {
  if (row.controlEffectiveness !== null) {
    return row.controlEffectiveness / 100;
  }
  switch (Math.min(row.controls.length, 4)) {
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
};

/** Verdict for a value against an appetite threshold with a tolerance band. */
const verdictFor = (
  value: number,
  appetite: number,
  toleranceFactor: number,
): AppetiteVerdict => {
  if (value > appetite * toleranceFactor) return "exceeded";
  if (value > appetite) return "tolerance";
  return "within";
};

/* ------------------------------------------------------------------ */
/* 1) Risk appetite calculator (quantitative)                          */
/* ------------------------------------------------------------------ */

/**
 * Check every scored risk against the quantitative appetite thresholds.
 * Score = likelihood x impact (1-25). A risk is `exceeded` when its score is
 * strictly greater than appetiteScore x (1 + tolerancePct/100), `tolerance`
 * when strictly greater than appetiteScore, else `within`. When both a risk
 * loss estimate and `appetiteAnnualLossEur` are present the same comparison
 * runs against the loss appetite and drives an extra recommendation.
 * Never throws — malformed/non-array input yields `EMPTY_RISK_APPETITE`.
 */
export function computeRiskAppetite(
  risks: unknown,
  config?: RiskAppetiteConfig | null,
): RiskAppetiteResult {
  if (!Array.isArray(risks)) return { ...EMPTY_RISK_APPETITE };

  const options = isObject(config) ? config : {};
  const appetiteScore = coercePositive(options.appetiteScore, 12);
  const appetiteLoss =
    typeof options.appetiteAnnualLossEur === "number" &&
    Number.isFinite(options.appetiteAnnualLossEur) &&
    options.appetiteAnnualLossEur >= 0
      ? options.appetiteAnnualLossEur
      : null;
  const tolerancePct = coerceNonNegative(options.tolerancePct, 10);
  const toleranceFactor = 1 + tolerancePct / 100;

  const rows = coerceRows(risks);
  let withinCount = 0;
  let toleranceCount = 0;
  let exceededCount = 0;
  let lossExceededCount = 0;
  let scoreSum = 0;
  const breaches: RiskAppetiteBreach[] = [];

  for (const row of rows) {
    const score = rowScore(row);
    if (score === null) continue;

    const verdict = verdictFor(score, appetiteScore, toleranceFactor);
    if (verdict === "within") withinCount++;
    else if (verdict === "tolerance") toleranceCount++;
    else exceededCount++;
    scoreSum += score;

    if (verdict === "exceeded") {
      breaches.push({ id: row.id, name: row.name, score, verdict });
    }

    if (appetiteLoss !== null && row.annualLossEur !== null) {
      const lossVerdict = verdictFor(row.annualLossEur, appetiteLoss, toleranceFactor);
      if (lossVerdict === "exceeded") lossExceededCount++;
    }
  }

  const assessedCount = withinCount + toleranceCount + exceededCount;
  const avgScore = assessedCount > 0 ? round1(scoreSum / assessedCount) : 0;
  const utilizationRaw = appetiteScore > 0 ? (avgScore / appetiteScore) * 100 : 0;
  const appetiteUtilizationPct = round1(Math.min(100, Math.max(0, utilizationRaw)));

  breaches.sort(
    (a, b) =>
      b.score - a.score ||
      compareIdsAsc(a.id, b.id),
  );

  const recommendations: string[] = [];
  if (exceededCount > 0) {
    recommendations.push(
      `${exceededCount} risk${exceededCount === 1 ? "" : "s"} exceed the risk appetite - prioritise treatment immediately`,
    );
  }
  if (toleranceCount > 0) {
    recommendations.push(
      `${toleranceCount} risk${toleranceCount === 1 ? "" : "s"} sit in tolerance - monitor closely and prepare contingency plans`,
    );
  }
  if (lossExceededCount > 0) {
    recommendations.push(
      `${lossExceededCount} risk${lossExceededCount === 1 ? "" : "s"} exceed the annual-loss appetite - quantify mitigation ROI`,
    );
  }
  if (assessedCount > 0) {
    recommendations.push("Review appetite thresholds annually or after major organisational change");
  }

  return {
    totalRisks: rows.length,
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

/* ------------------------------------------------------------------ */
/* 2) Likelihood x impact matrix                                       */
/* ------------------------------------------------------------------ */

/**
 * Place every scored risk on the fixed 5x5 likelihood x impact matrix.
 * The grid always contains 25 cells ordered likelihood desc (5..1) then
 * impact asc (1..5) with per-cell counts; bands on the 1-25 score are
 * low 1-4 / medium 5-9 / high 10-15 / critical 16-25. `topRisks` is capped
 * at 5 sorted score desc then id asc.
 * Never throws — malformed/non-array input yields the empty grid
 * (`EMPTY_RISK_MATRIX`).
 */
export function buildQuantitativeMatrix(risks: unknown): RiskMatrixResult {
  if (!Array.isArray(risks)) return { ...EMPTY_RISK_MATRIX };

  const rows = coerceRows(risks);
  const cells = buildEmptyCells();
  const cellIndex = new Map<string, number>();
  cells.forEach((cell, index) => {
    cellIndex.set(`${cell.likelihood}:${cell.impact}`, index);
  });

  const byBand: Record<QuantRiskBand, number> = { low: 0, medium: 0, high: 0, critical: 0 };
  const top: QuantTopRisk[] = [];
  let scoreSum = 0;
  let assessedCount = 0;

  for (const row of rows) {
    const score = rowScore(row);
    if (score === null) continue;

    const band = bandForScore(score);
    const index = cellIndex.get(`${row.likelihood}:${row.impact}`);
    if (index !== undefined) cells[index].count++;

    byBand[band]++;
    scoreSum += score;
    assessedCount++;
    top.push({ id: row.id, name: row.name, score, band });
  }

  top.sort((a, b) => b.score - a.score || compareIdsAsc(a.id, b.id));

  return {
    cells,
    totalAssessed: assessedCount,
    byBand,
    avgScore: assessedCount > 0 ? round1(scoreSum / assessedCount) : 0,
    topRisks: top.slice(0, 5),
  };
}

/* ------------------------------------------------------------------ */
/* 3) Residual risk tracking                                           */
/* ------------------------------------------------------------------ */

/**
 * Track inherent -> residual movement for every assessable risk.
 * inherent = inherentScore (when a valid 0-100 number) else likelihood x
 * impact. residual = residualScore (when valid) else
 * inherent x (1 - effectiveness) where effectiveness comes from
 * `controlEffectiveness` (0-100) or, absent that, the control count map
 * 0->0% / 1->20% / 2->35% / 3->50% / >=4->60%. Rows are sorted residual
 * desc then id asc; `aboveAppetiteCount` uses a STRICT `>` comparison.
 * Never throws — malformed/non-array input yields `EMPTY_RESIDUAL_TRACKING`.
 */
export function trackResidualRisk(
  risks: unknown,
  opts?: ResidualTrackingOptions | null,
): ResidualTrackingResult {
  if (!Array.isArray(risks)) return { ...EMPTY_RESIDUAL_TRACKING };

  const options = isObject(opts) ? opts : {};
  const appetiteScore = coercePositive(options.appetiteScore, 12);

  const rows: ResidualRow[] = [];
  let reducedCount = 0;
  let unchangedCount = 0;
  let increasedCount = 0;
  let aboveAppetiteCount = 0;
  let reductionSum = 0;
  let reductionRowCount = 0;

  for (const row of coerceRows(risks)) {
    const liScore = rowScore(row);
    const inherent =
      row.inherentOverride !== null
        ? row.inherentOverride
        : liScore !== null
          ? liScore
          : null;
    if (inherent === null) continue;

    const residual =
      row.residualOverride !== null
        ? row.residualOverride
        : round1(inherent * (1 - effectivenessOf(row)));

    const delta = round1(Math.max(0, inherent - residual));
    const reductionPct = inherent > 0 ? round1((delta / inherent) * 100) : 0;
    const direction: ResidualDirection =
      delta > 0 ? "reduced" : residual > inherent ? "increased" : "unchanged";

    rows.push({
      id: row.id,
      name: row.name,
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
    if (inherent > 0) {
      reductionSum += reductionPct;
      reductionRowCount++;
    }
  }

  rows.sort((a, b) => b.residual - a.residual || compareIdsAsc(a.id, b.id));

  return {
    rows,
    totalTracked: rows.length,
    reducedCount,
    unchangedCount,
    increasedCount,
    aboveAppetiteCount,
    avgReductionPct: reductionRowCount > 0 ? round1(reductionSum / reductionRowCount) : 0,
    worst: rows.slice(0, 5),
  };
}

/* ------------------------------------------------------------------ */
/* 4) Risk treatment plan generator                                    */
/* ------------------------------------------------------------------ */

const ACTIONS_MITIGATE = [
  "Identify and apply additional controls to reduce likelihood",
  "Identify and apply additional controls to reduce impact",
  "Assign a control owner and an implementation deadline",
  "Re-assess residual risk after control implementation",
  "Track implementation progress in the treatment register",
];

const ACTIONS_TRANSFER = [
  "Evaluate cyber insurance coverage for this risk",
  "Negotiate contractual risk-sharing with the responsible party",
  "Document the transfer agreement and the remaining exposure",
  "Verify the counterparty security posture at least annually",
];

const ACTIONS_ACCEPT = [
  "Document formal risk acceptance with justification",
  "Set a review date and monitor for material changes",
  "Communicate the accepted risk to the risk owner",
];

const ACTIONS_AVOID = [
  "Discontinue or redesign the activity creating the risk",
  "Document the avoidance decision and alternatives considered",
];

const ESCALATION_ACTION = "Escalate to the management board - critical risk exceeds appetite";

/**
 * Generate a treatment plan for every eligible open/mitigating risk whose
 * score meets the threshold (default 10). Strategy ladder: score >= 16 ->
 * mitigate; 10-15 -> transfer when any control matches /transfer|insurance|
 * contract/i else mitigate. Priorities: P0 >=16 / P1 >=10 / P2 >=5 / P3
 * else. P0 plans get an escalation action prepended (capped 5) and P0/P1
 * get a deadline of clock + horizonDays. Plans sort priority asc, then
 * score desc, then id asc; `byPriority` covers ALL assessable risks while
 * `byStrategy` covers planned ones only.
 * Never throws — malformed/non-array input yields
 * `EMPTY_TREATMENT_PLAN_RESULT`.
 */
export function generateTreatmentPlans(
  risks: unknown,
  opts?: TreatmentPlanOptions | null,
): TreatmentPlanResult {
  if (!Array.isArray(risks)) return { ...EMPTY_TREATMENT_PLAN_RESULT };

  const options = isObject(opts) ? opts : {};
  const horizonDays = coercePositive(options.horizonDays, 30);
  const threshold = coerceNonNegative(options.threshold, 10);
  const clock = toClock(options);

  const rows = coerceRows(risks);
  const plans: TreatmentPlanItem[] = [];
  const byStrategy: Record<TreatmentStrategy, number> = {
    mitigate: 0,
    transfer: 0,
    accept: 0,
    avoid: 0,
  };
  const byPriority: Record<TreatmentPriority, number> = { P0: 0, P1: 0, P2: 0, P3: 0 };
  let nextDeadlineMs: number | null = null;

  for (const row of rows) {
    const score = rowScore(row);
    if (score === null) continue;

    const priority = priorityForScore(score);
    byPriority[priority]++;

    if (score < threshold || !isPlanEligibleStatus(row.status)) continue;

    const strategy: TreatmentStrategy =
      score >= 16
        ? "mitigate"
        : row.controls.some((control) => /transfer|insurance|contract/i.test(control))
          ? "transfer"
          : "mitigate";

    const baseActions =
      strategy === "transfer"
        ? ACTIONS_TRANSFER
        : strategy === "mitigate"
          ? ACTIONS_MITIGATE
          : strategy === "accept"
            ? ACTIONS_ACCEPT
            : ACTIONS_AVOID;
    const actions =
      priority === "P0" ? [ESCALATION_ACTION, ...baseActions].slice(0, 5) : [...baseActions];

    let deadline: string | null = null;
    if (priority === "P0" || priority === "P1") {
      deadline = new Date(clock.getTime() + horizonDays * 86400000).toISOString();
      const deadlineMs = clock.getTime() + horizonDays * 86400000;
      if (nextDeadlineMs === null || deadlineMs < nextDeadlineMs) nextDeadlineMs = deadlineMs;
    }

    byStrategy[strategy]++;
    plans.push({
      id: row.id,
      name: row.name,
      score,
      priority,
      strategy,
      actions,
      owner: row.owner !== "" ? row.owner : "unassigned",
      deadline,
    });
  }

  const priorityRank: Record<TreatmentPriority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
  plans.sort(
    (a, b) =>
      priorityRank[a.priority] - priorityRank[b.priority] ||
      b.score - a.score ||
      compareIdsAsc(a.id, b.id),
  );

  return {
    plans,
    totalRisks: rows.length,
    plannedCount: plans.length,
    byStrategy,
    byPriority,
    nextDeadline: nextDeadlineMs !== null ? new Date(nextDeadlineMs).toISOString() : null,
  };
}
