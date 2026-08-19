/**
 * NIS2 Security Metrics & Reporting engine.
 *
 * Cycle 20 (NIS2 Implementation Plan Phase 4 Task 4.2 — ENISA Measure 7.1
 * "Effectiveness Assessment" / NIS2 Article 21(2)(f)): computes the mean time
 * to recovery (MTTR) from resolved incidents, tracks vulnerability age against
 * the injectable clock, detects compliance drift (current vs baseline posture
 * per control area), and rolls everything up into an executive-level security
 * dashboard summary. Pure view-model logic — no DB, no network, no side
 * effects.
 *
 * Design rules (house pattern — mirrors lib/nis2/vulnerabilityMgmt.ts and
 * lib/nis2/thirdPartyRisk.ts):
 * - Pure and deterministic: no I/O, no DB, no Math.random, no iteration-order
 *   dependent logic. Same input always yields the same output.
 * - NEVER throws: malformed input (null/non-object rows, missing/invalid
 *   dates, NaN numbers, non-array collections, unknown enum strings) is
 *   coerced to safe neutral values and yields the documented safe shape.
 * - Injectable clock: each function accepts an optional `opts` object with
 *   `now` (Date, epoch-ms number, or ISO-8601 string) or a `clock` factory
 *   `() => Date`; when both are missing it defaults to `new Date()`. Tests
 *   may pin the clock for reproducibility.
 * - Time arithmetic uses fixed millisecond constants (one day = 24h, one
 *   hour = 60m).
 * - All numeric outputs are rounded deterministically: averages to 1 decimal,
 *   ratios/rates to the documented precision, counts and day deltas to whole
 *   numbers.
 *
 * Severity buckets (shared by all functions): "critical" | "high" |
 * "medium" | "low" | "info" are honored; any missing/invalid severity value
 * falls into the "unknown" bucket. Deterministic bucket order is critical,
 * high, medium, low, info, unknown.
 */

/* ------------------------------------------------------------------ */
/* Public types                                                        */
/* ------------------------------------------------------------------ */

/** Severity bucket used across all security-metrics functions. */
export type SecurityMetricsSeverity =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "info"
  | "unknown";

/** Injectable clock options shared by every engine function. */
export interface SecurityMetricsOptions {
  /** Pin "now": Date, epoch-ms number, or ISO-8601 string. */
  now?: Date | number | string | null;
  /** Pin "now" via a factory; used only when `now` is absent/invalid. */
  clock?: (() => Date) | null;
}

/** One resolved incident for MTTR computation. */
export interface MttrIncidentInput {
  id?: string | number | null;
  severity?: string | null;
  detectedAt?: Date | number | string | null;
  resolvedAt?: Date | number | string | null;
}

/** MTTR rollup for one severity bucket (or the overall rollup). */
export interface MttrSeverityResult {
  /** Bucket label; "overall" on the overall rollup. */
  severity: SecurityMetricsSeverity | "overall";
  /** Number of incidents with valid detectedAt + resolvedAt (resolvedAt >= detectedAt). */
  count: number;
  /** Mean time to recovery in hours, 1 decimal; 0 when count is 0. */
  mttrHours: number;
  /** Mean time to recovery in days, 2 decimals; 0 when count is 0. */
  mttrDays: number;
  /** Fastest recovery in hours, 1 decimal; 0 when count is 0. */
  minHours: number;
  /** Slowest recovery in hours, 1 decimal; 0 when count is 0. */
  maxHours: number;
}

/** Output of `computeMttr`. */
export interface MttrResult {
  /** Per-severity rollups in deterministic order: critical..unknown. */
  bySeverity: MttrSeverityResult[];
  /** Rollup across every resolved incident (severity: "overall"). */
  overall: MttrSeverityResult;
  /** Total number of incidents that contributed to the computation. */
  totalResolved: number;
}

/** One vulnerability-register row for age tracking. */
export interface VulnerabilityAgeInput {
  id?: string | number | null;
  severity?: string | null;
  discoveredAt?: Date | number | string | null;
  status?: string | null;
}

/** Vulnerability-age counts bucketed by whole-day age bands. */
export interface VulnerabilityAgeBandCounts {
  "0-7": number;
  "8-30": number;
  "31-60": number;
  "61-90": number;
  "90+": number;
}

/** Age rollup for one severity bucket (or the overall rollup). */
export interface VulnerabilityAgeSeverityResult {
  /** Bucket label; "overall" on the overall rollup. */
  severity: SecurityMetricsSeverity | "overall";
  /** Non-terminal rows with a valid discoveredAt in this bucket. */
  count: number;
  /** Mean age in days, 1 decimal; 0 when count is 0. */
  avgAgeDays: number;
  /** Oldest row in whole days; 0 when count is 0. */
  maxAgeDays: number;
  /** Rows whose age exceeds the severity overdue threshold. */
  overdueCount: number;
  /** Whole-day age band counts (0-7, 8-30, 31-60, 61-90, 90+). */
  ageBandCounts: VulnerabilityAgeBandCounts;
}

/** Output of `trackVulnerabilityAge`. */
export interface VulnerabilityAgeResult {
  /** Per-severity rollups in deterministic order: critical..unknown. */
  bySeverity: VulnerabilityAgeSeverityResult[];
  /** Rollup across every open (non-terminal) row (severity: "overall"). */
  overall: VulnerabilityAgeSeverityResult;
  /** Total number of open (non-terminal) rows with a valid discoveredAt. */
  totalOpen: number;
}

/** One control area for compliance drift detection. */
export interface ComplianceAreaInput {
  areaId?: string | number | null;
  name?: string | null;
  baselineScore?: number | null;
  currentScore?: number | null;
}

/** One drift alert (or the severity label for stable/improved areas). */
export interface ComplianceDriftAlert {
  areaId: string | number;
  name: string;
  /** Baseline posture 0-100 (clamped). */
  baselineScore: number;
  /** Current posture 0-100 (clamped). */
  currentScore: number;
  /** currentScore - baselineScore, 1 decimal. */
  driftPts: number;
  /** Alert severity, or "stable" / "improved" for non-alert areas. */
  severity: SecurityMetricsSeverity | "stable" | "improved";
  /** Catalog recommendation; "" for stable/improved areas. */
  recommendation: string;
}

/** Alert counts by severity plus non-alert area counts. */
export interface ComplianceDriftCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
  stable: number;
  improved: number;
  /** critical + high + medium + low. */
  totalAlerts: number;
}

/** Output of `detectComplianceDrift`. */
export interface ComplianceDriftResult {
  /** Alert areas only (driftPts <= -0.05), sorted driftPts asc, areaId asc. */
  alerts: ComplianceDriftAlert[];
  counts: ComplianceDriftCounts;
  /** Unique control areas evaluated (after dedup by areaId, last wins). */
  totalAreas: number;
}

/** One area at risk for the executive summary. */
export interface AreaAtRiskInput {
  areaId?: string | number | null;
  name?: string | null;
  driftPts?: number | null;
}

/** Top area at risk in the executive summary (driftPts 1 decimal). */
export interface AreaAtRisk {
  areaId: string | number;
  name: string;
  driftPts: number;
}

/** MTTR trend signal for the executive summary. */
export interface MttrTrend {
  direction: "improved" | "worsened" | "flat" | "n-a";
  /** ((prior - current) / prior) * 100, 1 decimal; 0 when direction is n-a. */
  pctChange: number;
}

/** Executive dashboard status band. */
export type ExecutiveSummaryStatus = "Good" | "Watch" | "Critical";

/** Input for `buildExecutiveSummary`. */
export interface ExecutiveSummaryInput {
  postureScore?: number | null;
  openCriticalVulns?: number | null;
  overdueVulns?: number | null;
  overallMttrHours?: number | null;
  priorMttrHours?: number | null;
  driftAlertCount?: number | null;
  incidentsLast30d?: number | null;
  areasAtRisk?: Array<AreaAtRiskInput> | null;
}

/** Output of `buildExecutiveSummary`. */
export interface ExecutiveSummaryResult {
  /** 0-100 clamped posture score, 1 decimal. */
  postureScore: number;
  openCriticalVulns: number;
  overdueVulns: number;
  /** Overall MTTR in hours, 1 decimal. */
  overallMttrHours: number;
  mttrTrend: MttrTrend;
  driftAlertCount: number;
  incidentsLast30d: number;
  /** Top 3 areas at risk by driftPts asc (most negative first), areaId asc. */
  topAreasAtRisk: AreaAtRisk[];
  status: ExecutiveSummaryStatus;
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Deterministic severity bucket order (most severe first). */
const SEVERITY_ORDER: readonly SecurityMetricsSeverity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
  "unknown",
];

/** Valid severity buckets (anything else coerces to "unknown"). */
const VALID_SEVERITIES: ReadonlySet<string> = new Set([
  "critical",
  "high",
  "medium",
  "low",
  "info",
]);

/** Overdue threshold (whole days) per severity bucket. */
const OVERDUE_THRESHOLD_DAYS: Record<SecurityMetricsSeverity, number> = {
  critical: 30,
  high: 60,
  medium: 90,
  low: 120,
  info: 180,
  unknown: 180,
};

/** Terminal statuses (case-insensitive): excluded from the age register. */
const TERMINAL_STATUSES: ReadonlySet<string> = new Set([
  "patched",
  "risk-accepted",
  "false-positive",
]);

/** Whole-day age band keys in deterministic order. */
const AGE_BAND_KEYS = ["0-7", "8-30", "31-60", "61-90", "90+"] as const;

/** Drift alert band thresholds (driftPts <= threshold triggers the band). */
const DRIFT_ALERT_BANDS: ReadonlyArray<{
  threshold: number;
  severity: Exclude<SecurityMetricsSeverity, "unknown">;
}> = [
  { threshold: -20, severity: "critical" },
  { threshold: -10, severity: "high" },
  { threshold: -5, severity: "medium" },
  { threshold: -0.05, severity: "low" },
];

/** Stable recommendation catalog keyed by alert severity. */
const DRIFT_RECOMMENDATION: Record<string, string> = {
  critical:
    "Immediate remediation plan required — address critical compliance drift within 30 days",
  high: "Prioritize remediation — high compliance drift must be resolved within 60 days",
  medium: "Develop a corrective action plan — moderate drift to be closed within 90 days",
  low: "Monitor closely and schedule corrective actions in the next review cycle",
};

/** Zeroed MTTR rollup (safe shape for missing buckets / overall). */
const ZERO_MTTR_ROLLUP: MttrSeverityResult = {
  severity: "overall",
  count: 0,
  mttrHours: 0,
  mttrDays: 0,
  minHours: 0,
  maxHours: 0,
};

/** Zeroed vulnerability-age rollup (safe shape for missing buckets). */
const ZERO_AGE_ROLLUP: VulnerabilityAgeSeverityResult = {
  severity: "overall",
  count: 0,
  avgAgeDays: 0,
  maxAgeDays: 0,
  overdueCount: 0,
  ageBandCounts: { "0-7": 0, "8-30": 0, "31-60": 0, "61-90": 0, "90+": 0 },
};

/** Zeroed MTTR result (exported safe shape for malformed/empty input). */
export const EMPTY_MTTR_RESULT: MttrResult = {
  bySeverity: SEVERITY_ORDER.map((severity) => ({ ...ZERO_MTTR_ROLLUP, severity })),
  overall: { ...ZERO_MTTR_ROLLUP },
  totalResolved: 0,
};

/** Zeroed vulnerability-age result (exported safe shape). */
export const EMPTY_VULNERABILITY_AGE_RESULT: VulnerabilityAgeResult = {
  bySeverity: SEVERITY_ORDER.map((severity) => ({ ...ZERO_AGE_ROLLUP, severity })),
  overall: { ...ZERO_AGE_ROLLUP },
  totalOpen: 0,
};

/** Zeroed compliance-drift result (exported safe shape). */
export const EMPTY_COMPLIANCE_DRIFT_RESULT: ComplianceDriftResult = {
  alerts: [],
  counts: { critical: 0, high: 0, medium: 0, low: 0, stable: 0, improved: 0, totalAlerts: 0 },
  totalAreas: 0,
};

/** Zeroed executive summary (exported safe shape). */
export const EMPTY_EXECUTIVE_SUMMARY: ExecutiveSummaryResult = {
  postureScore: 0,
  openCriticalVulns: 0,
  overdueVulns: 0,
  overallMttrHours: 0,
  mttrTrend: { direction: "n-a", pctChange: 0 },
  driftAlertCount: 0,
  incidentsLast30d: 0,
  topAreasAtRisk: [],
  status: "Good",
};

/* ------------------------------------------------------------------ */
/* Sanitization helpers                                                */
/* ------------------------------------------------------------------ */

/** True for plain non-null, non-array objects. */
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

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

/** Resolve the injectable clock from opts.now / opts.clock, else now. */
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

/** Coerce a severity; missing/invalid -> "unknown". */
const toSeverity = (value: unknown): SecurityMetricsSeverity =>
  typeof value === "string" && VALID_SEVERITIES.has(value.trim())
    ? (value.trim() as SecurityMetricsSeverity)
    : "unknown";

/** Coerce an item id; missing/invalid -> "" (deterministic safe id). */
const toItemId = (value: unknown): string | number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") return value;
  return "";
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

/** Coerce a 0-100 score, clamped; NaN/null -> 0. */
const toScore = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, value));
};

/** Coerce a non-negative number, rounded to 1 decimal. */
const toNonNegativeHours = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return round1(Math.max(0, value));
};

/** Round to 1 decimal. */
const round1 = (value: number): number => Math.round(value * 10) / 10;

/** Round to 2 decimals. */
const round2 = (value: number): number => Math.round(value * 100) / 100;

/** Deterministic id compare: numeric when both numbers, else String order. */
const compareIds = (a: string | number, b: string | number): number => {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
};

/** Dedup key that keeps numeric and string ids distinct. */
const idKey = (id: string | number): string => `${typeof id}:${String(id)}`;

/** Whole-day age band for an age in days. */
const toAgeBand = (ageDays: number): keyof VulnerabilityAgeBandCounts => {
  if (ageDays <= 7) return "0-7";
  if (ageDays <= 30) return "8-30";
  if (ageDays <= 60) return "31-60";
  if (ageDays <= 90) return "61-90";
  return "90+";
};

/* ------------------------------------------------------------------ */
/* Public engine functions                                             */
/* ------------------------------------------------------------------ */

/**
 * Compute the mean time to recovery (MTTR) from resolved incidents, bucketed
 * by severity with an overall rollup. Only incidents with BOTH a valid
 * detectedAt and resolvedAt (resolvedAt >= detectedAt) count; all other rows
 * are skipped, never errors. Averages are rounded to 1 decimal (mttrDays to 2
 * decimals); min/max hours are rounded to 1 decimal. Never throws — malformed
 * or empty input yields `EMPTY_MTTR_RESULT`.
 */
export function computeMttr(
  incidents: Array<MttrIncidentInput> | null | undefined,
  opts?: SecurityMetricsOptions | null
): MttrResult {
  const rows = Array.isArray(incidents) ? incidents : [];

  const durationsBySeverity = new Map<SecurityMetricsSeverity, number[]>();
  for (const severity of SEVERITY_ORDER) {
    durationsBySeverity.set(severity, []);
  }
  const overallDurations: number[] = [];

  for (const rawRow of rows) {
    const row = isObject(rawRow) ? rawRow : {};
    const detectedMs = toTimeMs(row.detectedAt);
    const resolvedMs = toTimeMs(row.resolvedAt);
    if (detectedMs === null || resolvedMs === null || resolvedMs < detectedMs) {
      continue;
    }
    const severity = toSeverity(row.severity);
    durationsBySeverity.get(severity)?.push(resolvedMs - detectedMs);
    overallDurations.push(resolvedMs - detectedMs);
  }

  const buildRollup = (
    label: SecurityMetricsSeverity | "overall",
    durations: number[]
  ): MttrSeverityResult => {
    if (durations.length === 0) {
      return { ...ZERO_MTTR_ROLLUP, severity: label };
    }
    const sum = durations.reduce((acc, ms) => acc + ms, 0);
    const avgMs = sum / durations.length;
    const minMs = Math.min(...durations);
    const maxMs = Math.max(...durations);
    return {
      severity: label,
      count: durations.length,
      mttrHours: round1(avgMs / HOUR_MS),
      mttrDays: round2(avgMs / DAY_MS),
      minHours: round1(minMs / HOUR_MS),
      maxHours: round1(maxMs / HOUR_MS),
    };
  };

  const bySeverity = SEVERITY_ORDER.map((severity) =>
    buildRollup(severity, durationsBySeverity.get(severity) ?? [])
  );
  const overall = buildRollup("overall", overallDurations);

  return {
    bySeverity,
    overall,
    totalResolved: overall.count,
  };
}

/**
 * Track vulnerability age (whole days vs the injectable clock) per severity.
 * Terminal statuses (patched / risk-accepted / false-positive,
 * case-insensitive) are excluded from the register and can never be overdue.
 * Rows without a valid discoveredAt are skipped. Overdue thresholds:
 * critical 30d, high 60d, medium 90d, low 120d, info 180d, unknown 180d
 * (the overall rollup applies each row's own severity threshold).
 * Per-severity rollups are ordered critically first; rows within a bucket are
 * aggregated in id-ascending order for deterministic ties. Never throws —
 * malformed or empty input yields `EMPTY_VULNERABILITY_AGE_RESULT`.
 */
export function trackVulnerabilityAge(
  vulns: Array<VulnerabilityAgeInput> | null | undefined,
  opts?: SecurityMetricsOptions | null
): VulnerabilityAgeResult {
  const safeOpts = isObject(opts) ? opts : {};
  const nowMs = toClock(safeOpts).getTime();
  const rows = Array.isArray(vulns) ? vulns : [];

  type AgeEntry = { id: string | number; ageDays: number; severity: SecurityMetricsSeverity };
  const rowsBySeverity = new Map<SecurityMetricsSeverity, AgeEntry[]>();
  for (const severity of SEVERITY_ORDER) {
    rowsBySeverity.set(severity, []);
  }
  const overallRows: AgeEntry[] = [];

  for (const rawRow of rows) {
    const row = isObject(rawRow) ? rawRow : {};
    const status = typeof row.status === "string" ? row.status.trim().toLowerCase() : "";
    if (TERMINAL_STATUSES.has(status)) {
      continue;
    }
    const discoveredMs = toTimeMs(row.discoveredAt);
    if (discoveredMs === null) {
      continue;
    }
    const ageDays = Math.max(0, Math.floor((nowMs - discoveredMs) / DAY_MS));
    const severity = toSeverity(row.severity);
    const entry: AgeEntry = { id: toItemId(row.id), ageDays, severity };
    rowsBySeverity.get(severity)?.push(entry);
    overallRows.push(entry);
  }

  const buildRollup = (
    label: SecurityMetricsSeverity | "overall",
    entries: AgeEntry[]
  ): VulnerabilityAgeSeverityResult => {
    if (entries.length === 0) {
      return { ...ZERO_AGE_ROLLUP, severity: label };
    }
    // Deterministic tie-breaking: id-ascending order within the bucket.
    const sorted = [...entries].sort((a, b) => compareIds(a.id, b.id));
    const ageBandCounts: VulnerabilityAgeBandCounts = {
      "0-7": 0,
      "8-30": 0,
      "31-60": 0,
      "61-90": 0,
      "90+": 0,
    };
    let sum = 0;
    let maxAgeDays = 0;
    let overdueCount = 0;
    for (const entry of sorted) {
      sum += entry.ageDays;
      if (entry.ageDays > maxAgeDays) {
        maxAgeDays = entry.ageDays;
      }
      // Overall applies each row's own severity threshold; per-severity
      // buckets share the bucket threshold.
      const threshold =
        label === "overall" ? OVERDUE_THRESHOLD_DAYS[entry.severity] : OVERDUE_THRESHOLD_DAYS[label];
      if (entry.ageDays > threshold) {
        overdueCount += 1;
      }
      ageBandCounts[toAgeBand(entry.ageDays)] += 1;
    }
    return {
      severity: label,
      count: entries.length,
      avgAgeDays: round1(sum / entries.length),
      maxAgeDays,
      overdueCount,
      ageBandCounts,
    };
  };

  const bySeverity = SEVERITY_ORDER.map((severity) =>
    buildRollup(severity, rowsBySeverity.get(severity) ?? [])
  );
  const overall = buildRollup("overall", overallRows);

  return {
    bySeverity,
    overall,
    totalOpen: overall.count,
  };
}

/**
 * Detect compliance drift (current vs baseline posture per control area).
 * Scores are clamped to 0-100 (NaN/null -> 0); driftPts = current -
 * baseline, rounded to 1 decimal. Alert bands: <= -20 critical, <= -10 high,
 * <= -5 medium, <= -0.05 low; only negative drift alerts. Positive drift
 * (>= 0.05) is "improved", everything else above the alert floor is "stable".
 * Areas are deduped by areaId (last wins) and alerts are sorted by driftPts
 * asc, then areaId asc. Never throws — malformed or empty input yields
 * `EMPTY_COMPLIANCE_DRIFT_RESULT`.
 */
export function detectComplianceDrift(
  areas: Array<ComplianceAreaInput> | null | undefined,
  opts?: SecurityMetricsOptions | null
): ComplianceDriftResult {
  const rows = Array.isArray(areas) ? areas : [];

  // Normalized private shape: every field coerced to a safe non-null value.
  interface NormalizedArea {
    areaId: string | number;
    name: string;
    baselineScore: number;
    currentScore: number;
  }

  // Dedup by areaId, last wins (deterministic Map keyed by type + value).
  const deduped = new Map<string, NormalizedArea>();
  for (const rawRow of rows) {
    const row = isObject(rawRow) ? rawRow : {};
    const areaId = toItemId(row.areaId);
    deduped.set(idKey(areaId), {
      areaId,
      name: toName(row.name),
      baselineScore: toScore(row.baselineScore),
      currentScore: toScore(row.currentScore),
    });
  }

  const counts: ComplianceDriftCounts = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    stable: 0,
    improved: 0,
    totalAlerts: 0,
  };
  const alerts: ComplianceDriftAlert[] = [];

  for (const area of deduped.values()) {
    const driftPts = round1(area.currentScore - area.baselineScore);
    let severity: ComplianceDriftAlert["severity"];
    if (driftPts >= 0.05) {
      severity = "improved";
    } else if (driftPts > -0.05) {
      severity = "stable";
    } else {
      const band = DRIFT_ALERT_BANDS.find((candidate) => driftPts <= candidate.threshold);
      severity = band?.severity ?? "low";
    }

    if (
      severity === "critical" ||
      severity === "high" ||
      severity === "medium" ||
      severity === "low"
    ) {
      counts[severity] += 1;
      counts.totalAlerts += 1;
      alerts.push({
        areaId: area.areaId,
        name: area.name,
        baselineScore: area.baselineScore,
        currentScore: area.currentScore,
        driftPts,
        severity,
        recommendation: DRIFT_RECOMMENDATION[severity] ?? "",
      });
    } else if (severity === "stable") {
      counts.stable += 1;
    } else {
      counts.improved += 1;
    }
  }

  alerts.sort(
    (a, b) =>
      a.driftPts - b.driftPts ||
      compareIds(a.areaId, b.areaId)
  );

  return {
    alerts,
    counts,
    totalAreas: deduped.size,
  };
}

/**
 * Build an executive-level security dashboard rollup. Posture score is
 * clamped to 0-100 (1 decimal); counts are whole non-negative numbers; MTTR
 * hours are rounded to 1 decimal. MTTR trend compares overallMttrHours vs
 * priorMttrHours (lower is better): pctChange = ((prior - current) / prior) *
 * 100 (1 decimal), direction improved/worsened/flat, or n-a when prior is
 * missing or 0. Status bands: Critical when driftAlertCount >= 5 OR
 * overdueVulns >= 10 OR postureScore < 50; Watch when driftAlertCount >= 1 OR
 * overdueVulns >= 1 OR postureScore < 75; else Good. Top areas at risk are
 * deduped by areaId (last wins), sorted driftPts asc then areaId asc, limited
 * to 3. Never throws — malformed or empty input yields
 * `EMPTY_EXECUTIVE_SUMMARY`.
 */
export function buildExecutiveSummary(
  inputs: ExecutiveSummaryInput | null | undefined,
  opts?: SecurityMetricsOptions | null
): ExecutiveSummaryResult {
  // Malformed (non-object) input returns the documented neutral safe shape;
  // a valid-but-empty object follows the status bands over zeroed metrics.
  if (!isObject(inputs)) {
    return { ...EMPTY_EXECUTIVE_SUMMARY };
  }
  const raw = inputs;

  const postureScore = round1(toScore(raw.postureScore));
  const openCriticalVulns = toCount(raw.openCriticalVulns);
  const overdueVulns = toCount(raw.overdueVulns);
  const overallMttrHours = toNonNegativeHours(raw.overallMttrHours);
  const driftAlertCount = toCount(raw.driftAlertCount);
  const incidentsLast30d = toCount(raw.incidentsLast30d);

  const priorRaw = typeof raw.priorMttrHours === "number" && Number.isFinite(raw.priorMttrHours)
    ? Math.max(0, raw.priorMttrHours)
    : null;
  let mttrTrend: MttrTrend = { direction: "n-a", pctChange: 0 };
  if (priorRaw !== null && priorRaw > 0) {
    const pctChange = round1(((priorRaw - overallMttrHours) / priorRaw) * 100);
    mttrTrend = {
      direction:
        overallMttrHours < priorRaw
          ? "improved"
          : overallMttrHours > priorRaw
            ? "worsened"
            : "flat",
      pctChange,
    };
  }

  const rawAreas = Array.isArray(raw.areasAtRisk) ? raw.areasAtRisk : [];
  const dedupedAreas = new Map<string, AreaAtRisk>();
  for (const rawArea of rawAreas) {
    const area = isObject(rawArea) ? rawArea : {};
    const areaId = toItemId(area.areaId);
    dedupedAreas.set(idKey(areaId), {
      areaId,
      name: toName(area.name),
      driftPts: typeof area.driftPts === "number" && Number.isFinite(area.driftPts)
        ? round1(area.driftPts)
        : 0,
    });
  }
  const topAreasAtRisk = [...dedupedAreas.values()]
    .sort((a, b) => a.driftPts - b.driftPts || compareIds(a.areaId, b.areaId))
    .slice(0, 3);

  const status: ExecutiveSummaryStatus =
    driftAlertCount >= 5 || overdueVulns >= 10 || postureScore < 50
      ? "Critical"
      : driftAlertCount >= 1 || overdueVulns >= 1 || postureScore < 75
        ? "Watch"
        : "Good";

  return {
    postureScore,
    openCriticalVulns,
    overdueVulns,
    overallMttrHours,
    mttrTrend,
    driftAlertCount,
    incidentsLast30d,
    topAreasAtRisk,
    status,
  };
}
