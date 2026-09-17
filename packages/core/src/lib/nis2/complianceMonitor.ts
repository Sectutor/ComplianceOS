/**
 * NIS2 Continuous Compliance Monitoring engine.
 *
 * Cycle 22 (NIS2 Implementation Plan Phase 5 Task 5.2 — ENISA Measure 7.1
 * "Effectiveness Assessment" / NIS2 Article 21(2)(f)): computes the overall
 * compliance posture from per-measure scores (with drift vs baselines),
 * tracks evidence coverage against the injectable clock (expired / expiring /
 * current), and generates a deterministic plain-text NIS2 audit report.
 * Pure view-model logic — no DB, no network, no side effects.
 *
 * Design rules (house pattern — mirrors lib/nis2/securityMetrics.ts):
 * - Pure and deterministic: no I/O, no DB, no Math.random, no
 *   iteration-order dependent logic. Same input always yields the same
 *   output.
 * - NEVER throws: malformed input (null/non-object rows, missing/invalid
 *   dates, NaN numbers, non-array collections) is coerced to safe neutral
 *   values and yields the documented safe shape.
 * - Injectable clock: each function accepts an optional `now` (epoch-ms
 *   number or ISO-8601 string) or a `clock` factory `() => Date`; when both
 *   are missing it defaults to `new Date()`. Tests may pin the clock for
 *   reproducibility.
 * - Time arithmetic uses fixed millisecond constants (one day = 24h, one
 *   expiring window = 90 days).
 * - All numeric outputs are rounded deterministically: averages, drift and
 *   coverage rates to 1 decimal, counts to whole numbers.
 */

/* ------------------------------------------------------------------ */
/* Public types                                                        */
/* ------------------------------------------------------------------ */

/** Injectable clock options shared by every engine function. */
export interface ComplianceMonitorOptions {
  /** Pin "now": epoch-ms number or ISO-8601 string. */
  now?: string | number | null;
  /** Pin "now" via a factory; used only when `now` is absent/invalid. */
  clock?: (() => Date) | null;
}

/** One compliance measure for posture computation. */
export interface ComplianceMeasureInput {
  measureId?: string | number | null;
  name?: string | null;
  score?: number | null;
  baselineScore?: number | null;
  status?: string | null;
}

/** Input for `computeCompliancePosture`. */
export interface CompliancePostureInput extends ComplianceMonitorOptions {
  measures?: Array<ComplianceMeasureInput> | null;
}

/** Posture status band labels (Strong >= 85, Developing >= 65, At Risk >= 40). */
export type PostureStatusBand = "Strong" | "Developing" | "At Risk" | "Critical" | "No Data";

/** Deterministic trend labels. */
export type TrendLabel = "improved" | "declined" | "stable" | "n-a";

/** Status counts across all measures. */
export interface PostureStatusCounts {
  strong: number;
  developing: number;
  atRisk: number;
  critical: number;
  noData: number;
}

/** One worst-scoring assessed measure (top gap). */
export interface PostureTopGap {
  measureId: string | null;
  name: string;
  /** Clamped 0-100 score, 1 decimal. */
  score: number;
  status: Exclude<PostureStatusBand, "No Data">;
}

/** Output of `computeCompliancePosture`. */
export interface CompliancePostureResult {
  /** Equal-weight average of valid measure scores, 1 decimal. */
  overallScore: number;
  status: PostureStatusBand;
  /** valid measures / total measures, 0..100, 1 decimal. */
  coverageRate: number;
  /** Average drift (score - baseline) across measures with baselines; null when none. */
  driftPts: number | null;
  trend: TrendLabel;
  statusCounts: PostureStatusCounts;
  /** Top 5 worst assessed measures, score asc then measureId asc. */
  topGaps: PostureTopGap[];
  /** Total rows in the input measures array. */
  totalMeasures: number;
  /** Rows with a numeric score. */
  assessedMeasures: number;
  /** Short deterministic executive verdict. */
  verdict: string;
}

/** One evidence item for coverage tracking. */
export interface EvidenceCoverageItemInput {
  controlId?: string | number | null;
  measureId?: string | number | null;
  name?: string | null;
  evidenceCount?: number | null;
  lastCollectedAt?: string | number | null;
  expiresAt?: string | number | null;
}

/** Input for `trackEvidenceCoverage`. */
export interface EvidenceCoverageInput extends ComplianceMonitorOptions {
  items?: Array<EvidenceCoverageItemInput> | null;
}

/** Item coverage status. */
export type EvidenceItemStatus = "covered" | "missing";

/** Item expiry status. */
export type EvidenceExpiryStatus = "expired" | "expiring" | "current" | "n-a";

/** Enriched evidence item returned by `trackEvidenceCoverage`. */
export interface EvidenceCoverageItem {
  controlId: string | null;
  measureId: string | null;
  name: string | null;
  /** Sanitized non-negative evidence count (0 when missing/invalid). */
  evidenceCount: number;
  lastCollectedAt: string | number | null;
  expiresAt: string | number | null;
  status: EvidenceItemStatus;
  expiry: EvidenceExpiryStatus;
}

/** Per-measure rollup of evidence coverage. */
export interface EvidenceMeasureRollup {
  measureId: string;
  name: string;
  total: number;
  covered: number;
  coverageRate: number;
}

/** Output of `trackEvidenceCoverage`. */
export interface EvidenceCoverageResult {
  totalItems: number;
  coveredCount: number;
  missingCount: number;
  expiringCount: number;
  expiredCount: number;
  currentCount: number;
  /** covered / total, 0..100, 1 decimal. */
  coverageRate: number;
  /** Total evidence across items / total items, 1 decimal. */
  avgEvidencePerControl: number;
  /** Per-measure rollups, coverageRate asc then measureId asc. */
  byMeasure: EvidenceMeasureRollup[];
  /** Enriched items, controlId asc (null last). */
  items: EvidenceCoverageItem[];
}

/** One measure row for the audit report. */
export interface AuditMeasureInput {
  measureId?: string | number | null;
  name?: string | null;
  score?: number | null;
  status?: string | null;
}

/** Evidence summary for the audit report. */
export interface AuditEvidenceSummaryInput {
  total?: number | null;
  covered?: number | null;
  coverageRate?: number | null;
}

/** Input for `generateAuditReport`. */
export interface AuditReportInput extends ComplianceMonitorOptions {
  entityName?: string | null;
  entitySector?: string | null;
  postureScore?: number | null;
  measures?: Array<AuditMeasureInput> | null;
  evidenceSummary?: AuditEvidenceSummaryInput | null;
}

/** Section keys of the audit report. */
export type AuditSectionKey = "posture" | "measures" | "evidence" | "gaps";

/** Section status of the audit report. */
export type AuditSectionStatus = "pass" | "warn" | "fail" | "info";

/** One section of the audit report. */
export interface AuditReportSection {
  key: AuditSectionKey;
  title: string;
  status: AuditSectionStatus;
}

/** Output of `generateAuditReport`. */
export interface AuditReportResult {
  /** ISO-8601 timestamp from the resolved clock. */
  generatedAt: string;
  entityName: string;
  entitySector: string;
  /** Clamped 0-100 posture score, 1 decimal. */
  postureScore: number;
  statusBand: PostureStatusBand;
  /** 0..100, 1 decimal. */
  coverageRate: number;
  covered: number;
  total: number;
  topGaps: PostureTopGap[];
  /** Number of actionable recommendations (= topGaps.length). */
  recommendationCount: number;
  /** Deterministic plain-text markdown report ('' only on malformed input). */
  report: string;
  sections: AuditReportSection[];
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const DAY_MS = 24 * 60 * 60 * 1000;
/** Evidence is "expiring" when it lapses within this window (0..90 days). */
const EXPIRING_WINDOW_MS = 90 * DAY_MS;
/** Posture "Strong" band floor; measures below this are audit gaps. */
const STRONG_BAR = 85;

/** Deterministic audit-report section order. */
const AUDIT_SECTION_ORDER: ReadonlyArray<AuditReportSection> = [
  { key: "posture", title: "Posture assessment", status: "info" },
  { key: "measures", title: "Measure scores", status: "info" },
  { key: "evidence", title: "Evidence coverage", status: "info" },
  { key: "gaps", title: "Top gaps", status: "info" },
];

/** Empty compliance posture (exported safe shape for malformed/empty input). */
export const EMPTY_COMPLIANCE_POSTURE: CompliancePostureResult = deepFreeze({
  overallScore: 0,
  status: "No Data",
  coverageRate: 0,
  driftPts: null,
  trend: "n-a",
  statusCounts: { strong: 0, developing: 0, atRisk: 0, critical: 0, noData: 0 },
  topGaps: [],
  totalMeasures: 0,
  assessedMeasures: 0,
  verdict: "No Data — no assessed measures",
});

/** Empty evidence coverage (exported safe shape for malformed/empty input). */
export const EMPTY_EVIDENCE_COVERAGE: EvidenceCoverageResult = deepFreeze({
  totalItems: 0,
  coveredCount: 0,
  missingCount: 0,
  expiringCount: 0,
  expiredCount: 0,
  currentCount: 0,
  coverageRate: 0,
  avgEvidencePerControl: 0,
  byMeasure: [],
  items: [],
});

/** Empty audit report (exported safe shape for malformed input; report: ""). */
export const EMPTY_AUDIT_REPORT: AuditReportResult = deepFreeze({
  generatedAt: "",
  entityName: "",
  entitySector: "",
  postureScore: 0,
  statusBand: "No Data",
  coverageRate: 0,
  covered: 0,
  total: 0,
  topGaps: [],
  recommendationCount: 0,
  report: "",
  sections: AUDIT_SECTION_ORDER.map((section) => ({ ...section })),
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

/** Resolve the injectable clock from an options-like object, else now. */
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
      // a throwing clock factory must never break the engine — fall through
    }
  }
  return new Date();
};

/** Coerce an id-like field to a string, or null when missing/invalid. */
const toIdString = (value: unknown): string | null => {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string") return value;
  return null;
};

/** Coerce a name; missing/blank -> "". */
const toName = (value: unknown): string => {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed;
};

/** Coerce a finite number to a safe integer count (negatives -> 0). */
const toCount = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
};

/** Coerce a 0-100 value, clamped; NaN/null -> 0. */
const toScore = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
};

/**
 * Round to 1 decimal, compensating floating-point error (e.g. 80.05 - 80
 * yields 0.04999999999999716, which must round to 0.1) and normalizing -0
 * to +0 (Object.is-safe for deep-equality assertions).
 */
const round1 = (value: number): number => {
  const rounded = Math.round((value + 1e-12) * 10) / 10;
  return rounded === 0 ? 0 : rounded;
};

/** Posture status band for a 0-100 score. */
const toPostureBand = (value: number): PostureStatusBand => {
  if (value >= 85) return "Strong";
  if (value >= 65) return "Developing";
  if (value >= 40) return "At Risk";
  return "Critical";
};

/** Compare two nullable strings; null sorts last. */
const compareNullableStrings = (a: string | null, b: string | null): number => {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a.localeCompare(b);
};

/** Fresh mutable copy of the empty posture (never hand out the frozen constant). */
const cloneEmptyPosture = (): CompliancePostureResult => ({
  ...EMPTY_COMPLIANCE_POSTURE,
  statusCounts: { ...EMPTY_COMPLIANCE_POSTURE.statusCounts },
  topGaps: [],
});

/** Fresh mutable copy of the empty evidence coverage. */
const cloneEmptyEvidence = (): EvidenceCoverageResult => ({
  ...EMPTY_EVIDENCE_COVERAGE,
  byMeasure: [],
  items: [],
});

/** Fresh mutable copy of the empty audit report. */
const cloneEmptyAuditReport = (): AuditReportResult => ({
  ...EMPTY_AUDIT_REPORT,
  topGaps: [],
  sections: EMPTY_AUDIT_REPORT.sections.map((section) => ({ ...section })),
});

/* ------------------------------------------------------------------ */
/* Public engine functions                                             */
/* ------------------------------------------------------------------ */

/**
 * Compute the overall compliance posture from per-measure scores. Valid
 * measures are rows with a finite numeric score (each clamped to 0-100);
 * overallScore is the equal-weight average of valid scores (1 decimal),
 * status bands (Strong >= 85, Developing >= 65, At Risk >= 40, Critical <
 * 40) are applied to the UNROUNDED average. coverageRate = valid / total
 * (0..100, 1 decimal). Per measure, driftPts = score - baselineScore (1
 * decimal) when the baseline is finite; trend improved >= +0.05, declined
 * <= -0.05, else stable (n-a when no baseline). statusCounts buckets every
 * measure by its own band (non-numeric scores count as noData). topGaps are
 * the worst 5 assessed measures sorted score asc then measureId asc (null
 * measureId last). Never throws — malformed or empty input yields
 * `EMPTY_COMPLIANCE_POSTURE`.
 */
export function computeCompliancePosture(
  input: CompliancePostureInput | null | undefined
): CompliancePostureResult {
  // Malformed (non-object input / measures not an array) -> empty shape.
  if (!isObject(input) || !Array.isArray(input.measures)) {
    return cloneEmptyPosture();
  }
  const rows = input.measures;

  interface NormalizedMeasure {
    measureId: string | null;
    name: string;
    /** Clamped 0-100 when the input score was finite, else null. */
    score: number | null;
    /** Raw finite baseline, else null. */
    baselineScore: number | null;
  }

  const normalized: NormalizedMeasure[] = [];
  for (const rawRow of rows) {
    const row = isObject(rawRow) ? rawRow : {};
    const hasScore = typeof row.score === "number" && Number.isFinite(row.score);
    normalized.push({
      measureId: toIdString(row.measureId),
      name: toName(row.name),
      score: hasScore ? toScore(row.score) : null,
      baselineScore:
        typeof row.baselineScore === "number" && Number.isFinite(row.baselineScore)
          ? row.baselineScore
          : null,
    });
  }

  const totalMeasures = normalized.length;
  const assessed = normalized.filter((measure) => measure.score !== null);
  const assessedMeasures = assessed.length;

  const rawAverage =
    assessedMeasures > 0
      ? assessed.reduce((acc, measure) => acc + (measure.score as number), 0) / assessedMeasures
      : 0;
  const overallScore = assessedMeasures > 0 ? round1(rawAverage) : 0;
  const status: PostureStatusBand = assessedMeasures > 0 ? toPostureBand(rawAverage) : "No Data";
  const coverageRate = totalMeasures > 0 ? round1((assessedMeasures / totalMeasures) * 100) : 0;

  // Average drift across measures that have BOTH a numeric score and baseline.
  const driftValues: number[] = [];
  for (const measure of normalized) {
    if (measure.score !== null && measure.baselineScore !== null) {
      driftValues.push(measure.score - measure.baselineScore);
    }
  }
  const driftPts =
    driftValues.length > 0
      ? round1(driftValues.reduce((acc, value) => acc + value, 0) / driftValues.length)
      : null;
  const trend: TrendLabel =
    driftPts === null
      ? "n-a"
      : driftPts >= 0.05
        ? "improved"
        : driftPts <= -0.05
          ? "declined"
          : "stable";

  const statusCounts: PostureStatusCounts = {
    strong: 0,
    developing: 0,
    atRisk: 0,
    critical: 0,
    noData: 0,
  };
  for (const measure of normalized) {
    if (measure.score === null) {
      statusCounts.noData += 1;
      continue;
    }
    const band = toPostureBand(measure.score);
    if (band === "Strong") statusCounts.strong += 1;
    else if (band === "Developing") statusCounts.developing += 1;
    else if (band === "At Risk") statusCounts.atRisk += 1;
    else statusCounts.critical += 1;
  }

  const topGaps: PostureTopGap[] = assessed
    .map((measure) => ({
      measureId: measure.measureId,
      name: measure.name,
      score: measure.score as number,
      status: toPostureBand(measure.score as number) as Exclude<PostureStatusBand, "No Data">,
    }))
    .sort(
      (a, b) =>
        a.score - b.score || compareNullableStrings(a.measureId, b.measureId)
    )
    .slice(0, 5)
    .map((entry) => ({ ...entry, score: round1(entry.score) }));

  const verdict =
    assessedMeasures === 0
      ? "No Data — no assessed measures"
      : status === "Strong"
        ? "Strong posture — no immediate action"
        : status === "Developing"
          ? "Developing posture — address top gaps"
          : status === "At Risk"
            ? "At Risk — remediation required"
            : "Critical — urgent remediation required";

  return {
    overallScore,
    status,
    coverageRate,
    driftPts,
    trend,
    statusCounts,
    topGaps,
    totalMeasures,
    assessedMeasures,
    verdict,
  };
}

/**
 * Track evidence coverage per control item against the injectable clock. An
 * item is "covered" when its evidenceCount is a finite number > 0; coverage
 * rate = covered / total (0..100, 1 decimal). Expiry is evaluated only for
 * covered items with a valid expiresAt: expired when expiresAt < now,
 * expiring when 0 <= expiresAt - now <= 90 days (exactly 90 days or exactly
 * 0 are expiring, not expired), current otherwise; all other items are
 * "n-a". Items are enriched and sorted controlId asc (null last); per-measure
 * rollups are sorted coverageRate asc then measureId asc (missing measureId
 * rolls into the "" / "Unknown" bucket). Never throws — malformed or empty
 * input yields `EMPTY_EVIDENCE_COVERAGE`.
 */
export function trackEvidenceCoverage(
  input: EvidenceCoverageInput | null | undefined
): EvidenceCoverageResult {
  // Malformed (non-object input / items not an array) -> empty shape.
  if (!isObject(input) || !Array.isArray(input.items)) {
    return cloneEmptyEvidence();
  }
  const nowMs = toClock(input).getTime();
  const rows = input.items;

  interface NormalizedEvidenceItem {
    controlId: string | null;
    measureId: string | null;
    name: string | null;
    evidenceCount: number;
    lastCollectedAt: string | number | null;
    expiresAt: string | number | null;
    status: EvidenceItemStatus;
    expiry: EvidenceExpiryStatus;
  }

  const normalized: NormalizedEvidenceItem[] = [];
  for (const rawRow of rows) {
    const row = isObject(rawRow) ? rawRow : {};
    const evidenceCount = toCount(row.evidenceCount);
    const covered = evidenceCount > 0;
    const expiresMs = covered ? toTimeMs(row.expiresAt) : null;
    let expiry: EvidenceExpiryStatus = "n-a";
    if (covered && expiresMs !== null) {
      const remaining = expiresMs - nowMs;
      if (remaining < 0) {
        expiry = "expired";
      } else if (remaining <= EXPIRING_WINDOW_MS) {
        expiry = "expiring";
      } else {
        expiry = "current";
      }
    }
    normalized.push({
      controlId: toIdString(row.controlId),
      measureId: toIdString(row.measureId),
      name: typeof row.name === "string" ? row.name.trim() : null,
      evidenceCount,
      lastCollectedAt:
        typeof row.lastCollectedAt === "string"
          ? row.lastCollectedAt
          : typeof row.lastCollectedAt === "number" && Number.isFinite(row.lastCollectedAt)
            ? row.lastCollectedAt
            : null,
      expiresAt:
        typeof row.expiresAt === "string"
          ? row.expiresAt
          : typeof row.expiresAt === "number" && Number.isFinite(row.expiresAt)
            ? row.expiresAt
            : null,
      status: covered ? "covered" : "missing",
      expiry,
    });
  }

  const totalItems = normalized.length;
  let coveredCount = 0;
  let expiringCount = 0;
  let expiredCount = 0;
  let currentCount = 0;
  let totalEvidence = 0;
  for (const item of normalized) {
    totalEvidence += item.evidenceCount;
    if (item.status === "covered") coveredCount += 1;
    if (item.expiry === "expiring") expiringCount += 1;
    else if (item.expiry === "expired") expiredCount += 1;
    else if (item.expiry === "current") currentCount += 1;
  }
  const missingCount = totalItems - coveredCount;
  const coverageRate = totalItems > 0 ? round1((coveredCount / totalItems) * 100) : 0;
  const avgEvidencePerControl = totalItems > 0 ? round1(totalEvidence / totalItems) : 0;

  // Per-measure rollup; missing measureId lands in the "" / "Unknown" bucket.
  const measureCounts = new Map<string, { total: number; covered: number }>();
  const measureNames = new Map<string, string>();
  for (const item of normalized) {
    const key = item.measureId ?? "";
    const counts = measureCounts.get(key);
    if (counts) {
      counts.total += 1;
      if (item.status === "covered") counts.covered += 1;
    } else {
      measureCounts.set(key, { total: 1, covered: item.status === "covered" ? 1 : 0 });
    }
    if (item.name && item.name !== "" && !measureNames.has(key)) {
      measureNames.set(key, item.name);
    }
  }
  const byMeasure: EvidenceMeasureRollup[] = [...measureCounts.entries()]
    .map(([measureId, counts]) => ({
      measureId,
      name: measureId === "" ? "Unknown" : (measureNames.get(measureId) ?? ""),
      total: counts.total,
      covered: counts.covered,
      coverageRate: counts.total > 0 ? round1((counts.covered / counts.total) * 100) : 0,
    }))
    .sort(
      (a, b) =>
        a.coverageRate - b.coverageRate || compareNullableStrings(a.measureId, b.measureId)
    );

  const items: EvidenceCoverageItem[] = normalized
    .map((item) => ({ ...item }))
    .sort((a, b) => compareNullableStrings(a.controlId, b.controlId));

  return {
    totalItems,
    coveredCount,
    missingCount,
    expiringCount,
    expiredCount,
    currentCount,
    coverageRate,
    avgEvidencePerControl,
    byMeasure,
    items,
  };
}

/**
 * Generate a deterministic plain-text NIS2 audit report. The posture score
 * is the provided score (clamped 0-100, 1 decimal) or, when absent, derived
 * from the measures via the same equal-weight average as
 * `computeCompliancePosture` (0 when no assessed measures; status band then
 * "No Data"). Evidence coverage rate is evidenceSummary.coverageRate when
 * finite, else covered / total (0 when total is 0), 1 decimal. The markdown
 * report is stable for identical inputs; sections carry pass / warn / fail
 * (posture: >= 85 / >= 65 / else; evidence: >= 80 / >= 50 / else; gaps: any
 * top gap fails). Never throws — non-object input yields
 * `EMPTY_AUDIT_REPORT` (report: "").
 */
export function generateAuditReport(
  input: AuditReportInput | null | undefined
): AuditReportResult {
  // Malformed (non-object input) -> empty shape with report: "".
  if (!isObject(input)) {
    return cloneEmptyAuditReport();
  }
  const generatedAt = toClock(input).toISOString();
  const entityName = typeof input.entityName === "string" ? input.entityName.trim() : "";
  const entitySector = typeof input.entitySector === "string" ? input.entitySector.trim() : "";

  const hasPosture =
    typeof input.postureScore === "number" && Number.isFinite(input.postureScore);
  const rawPosture = hasPosture ? toScore(input.postureScore) : null;

  const rows = Array.isArray(input.measures) ? input.measures : [];
  interface NormalizedAuditMeasure {
    measureId: string | null;
    name: string;
    /** Clamped 0-100 when the input score was finite, else null. */
    score: number | null;
  }
  const normalized: NormalizedAuditMeasure[] = [];
  for (const rawRow of rows) {
    const row = isObject(rawRow) ? rawRow : {};
    const hasScore = typeof row.score === "number" && Number.isFinite(row.score);
    normalized.push({
      measureId: toIdString(row.measureId),
      name: toName(row.name),
      score: hasScore ? toScore(row.score) : null,
    });
  }
  const assessed = normalized.filter((measure) => measure.score !== null);
  const rawAverage =
    assessed.length > 0
      ? assessed.reduce((acc, measure) => acc + (measure.score as number), 0) / assessed.length
      : 0;

  const postureRaw = rawPosture !== null ? rawPosture : rawAverage;
  const postureScore = round1(postureRaw);
  const statusBand: PostureStatusBand =
    rawPosture !== null
      ? toPostureBand(rawPosture)
      : assessed.length > 0
        ? toPostureBand(rawAverage)
        : "No Data";

  const summary = isObject(input.evidenceSummary) ? input.evidenceSummary : {};
  const covered = toCount(summary.covered);
  const total = toCount(summary.total);
  const coverageRate =
    typeof summary.coverageRate === "number" && Number.isFinite(summary.coverageRate)
      ? round1(toScore(summary.coverageRate))
      : total > 0
        ? round1((covered / total) * 100)
        : 0;

  // Audit gaps are measures below the Strong bar (score < 85) — a measure
  // already at Strong is not a gap, even if it is the weakest assessed.
  const topGaps: PostureTopGap[] = assessed
    .filter((measure) => (measure.score as number) < STRONG_BAR)
    .map((measure) => ({
      measureId: measure.measureId,
      name: measure.name,
      score: measure.score as number,
      status: toPostureBand(measure.score as number) as Exclude<PostureStatusBand, "No Data">,
    }))
    .sort(
      (a, b) =>
        a.score - b.score || compareNullableStrings(a.measureId, b.measureId)
    )
    .slice(0, 5)
    .map((entry) => ({ ...entry, score: round1(entry.score) }));

  const entityLabel = entityName !== "" ? entityName : "Unknown Entity";
  const sectorLabel = entitySector !== "" ? entitySector : "n/a";

  const measureRows = normalized
    .filter((measure) => measure.score !== null)
    .sort((a, b) => compareNullableStrings(a.measureId, b.measureId))
    .map((measure) => {
      const band = toPostureBand(measure.score as number);
      return `| ${measure.measureId ?? "n/a"} | ${round1(measure.score as number)} | ${band} |`;
    });

  const gapLabel = (gap: PostureTopGap): string =>
    gap.name !== "" ? gap.name : (gap.measureId ?? "Unknown measure");

  const gapBlock =
    topGaps.length > 0 ? topGaps.map((gap) => `- ${gapLabel(gap)}: ${gap.score} (${gap.status})`).join("\n") : "- None";

  const recommendationBlock =
    topGaps.length > 0
      ? topGaps.map((gap) => `- Raise ${gapLabel(gap)} above 85 (Strong)`).join("\n")
      : "- None";

  const report = [
    "# NIS2 Continuous Compliance Report",
    `Entity: ${entityLabel}`,
    `Sector: ${sectorLabel}`,
    `Generated: ${generatedAt}`,
    "Standard: NIS2 Article 21(2)(f) — ENISA Measure 7.1 Effectiveness Assessment",
    `Posture: ${postureScore} (${statusBand})`,
    `Evidence coverage: ${coverageRate}% (${covered}/${total})`,
    "",
    "## Measure scores",
    "| Measure | Score | Status |",
    "|---|---|---|",
    ...measureRows,
    "",
    "## Top gaps",
    gapBlock,
    "",
    "## Recommendations",
    recommendationBlock,
  ].join("\n");

  const sections: AuditReportSection[] = AUDIT_SECTION_ORDER.map((section) => {
    let status: AuditSectionStatus = section.status;
    if (section.key === "posture") {
      status = postureScore >= 85 ? "pass" : postureScore >= 65 ? "warn" : "fail";
    } else if (section.key === "evidence") {
      status = coverageRate >= 80 ? "pass" : coverageRate >= 50 ? "warn" : "fail";
    } else if (section.key === "gaps") {
      status = topGaps.length > 0 ? "fail" : "pass";
    }
    return { ...section, status };
  });

  return {
    generatedAt,
    entityName,
    entitySector,
    postureScore,
    statusBand,
    coverageRate,
    covered,
    total,
    topGaps,
    recommendationCount: topGaps.length,
    report,
    sections,
  };
}
