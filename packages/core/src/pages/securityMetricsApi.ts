/**
 * NIS2 Security Metrics & Reporting - data contract + hooks
 * =========================================================
 * UI-side typed view of the `securityMetrics.*` tRPC procedures the backend
 * agent is building (registered as `securityMetrics:` on the AppRouter in
 * `packages/core/src/routers.ts`).
 *
 * NIS2 Implementation Plan Phase 4 Task 4.2 - NIS2 Art. 21(2)(f) (security
 * in network and information systems acquisition, development and
 * maintenance, including vulnerability handling and disclosure) with ENISA
 * Measure 7.1 (measuring the effectiveness of the risk-management measures).
 * The four procedures power the executive "NIS2 Security Metrics &
 * Reporting" dashboard (summary strip, MTTR, vulnerability age and
 * compliance drift).
 *
 * COORDINATION BY CONVENTION (UI-STANDARD 16) - if the procedures are not
 * live yet the tRPC HTTP call 404s (NOT_FOUND) and the query surfaces an
 * error; every consumer in the UI degrades to a graceful EmptyState
 * ("Connect the securityMetrics.<procedure> API").
 *
 * ---------------------------------------------------------------------------
 * Expected procedures (all protected queries, pure - no DB access):
 *
 * 1) securityMetrics.mttr
 *    input:  { clientId, incidents?: [{ id, severity?, detectedAt?,
 *                                      resolvedAt? }] }
 *    output: { overall: { mttrHours, minHours, maxHours, count, trend,
 *                         trendPct }, bySeverity: {
 *                         critical|high|medium|low|info|unknown:
 *                         { mttrHours, minHours, maxHours, count } },
 *               updatedAt? }
 *
 * 2) securityMetrics.vulnerabilityAge
 *    input:  { clientId, items?: [{ id, cveId?, assetName?, severity?,
 *                                  discoveredAt?, patchedAt?, dueAt? }] }
 *    output: { total, overdueCount, bySeverity: {
 *                         critical|high|medium|low|info|unknown:
 *                         { count, avgAgeDays, maxAgeDays, overdueCount } },
 *              ageBands: { "0-7"|"8-30"|"31-60"|"61-90"|"90+": count },
 *              updatedAt? }
 *
 * 3) securityMetrics.complianceDrift
 *    input:  { clientId, areas?: [{ id, areaName, measure?, baselineScore,
 *                                  currentScore }] }
 *    output: { items: [{ areaId, areaName, measure?, baselineScore,
 *                        currentScore, driftPoints, severity,
 *                        recommendation }],
 *              totalAreas, driftAlertCount, stableCount, improvedCount,
 *              updatedAt? }
 *            severity: 'critical' | 'high' | 'medium' | 'low' | 'none'
 *            driftPoints: baselineScore - currentScore (positive = worsened)
 *
 * 4) securityMetrics.executiveSummary
 *    input:  { clientId, mttr?, vulnerabilityAge?, complianceDrift? }
 *    output: { postureScore, postureTrend, postureTrendPct, mttrHours,
 *              mttrTrend, mttrTrendPct, overdueVulnerabilities, driftAlerts,
 *              status, statusLabel, updatedAt? }
 *            status: 'good' | 'watch' | 'critical'
 * ---------------------------------------------------------------------------
 */

import { trpc } from "@/lib/trpc";

/* ------------------------------------------------------------------ */
/* Types (mirror the backend contract 1:1, defensive on optionals)    */
/* ------------------------------------------------------------------ */

/** Severity band shared by the MTTR and vulnerability-age procedures. */
export type MetricSeverity = "critical" | "high" | "medium" | "low" | "info" | "unknown";

/** Direction of change vs the previous reporting period. */
export type MetricTrend = "improved" | "worsened" | "flat" | "n-a";

/** Compliance drift alert severity (drift vs the control baseline). */
export type DriftSeverity = "critical" | "high" | "medium" | "low" | "none";

/** Executive posture status derived from score + alert pressure. */
export type PostureStatus = "good" | "watch" | "critical";

/** Vulnerability age bucket (whole days since discovery). */
export type AgeBand = "0-7" | "8-30" | "31-60" | "61-90" | "90+";

/** Badge variants actually supported by the Badge component. */
export type MetricsBadgeVariant =
  | "default"
  | "secondary"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "outline"
  | "destructive";

/** Data-viz score-bar fill (index.css .progress-* classes, UI-STANDARD 18). */
export type MetricsBarClass = "progress-success" | "progress-warning" | "progress-error";

/* --- securityMetrics.mttr -------------------------------------------- */

/** One incident fed into the MTTR engine (input side). */
export interface MttrIncidentInput {
  id: string | number;
  severity?: MetricSeverity;
  detectedAt?: string | null;
  resolvedAt?: string | null;
}

/** Input of securityMetrics.mttr. */
export interface MttrInput {
  clientId: number;
  incidents?: MttrIncidentInput[];
}

/** Per-severity MTTR stats returned by securityMetrics.mttr. */
export interface MttrSeverityStats {
  /** Mean remediation time in hours (0 when the bucket is empty). */
  mttrHours: number;
  /** Fastest remediation in hours (0 when the bucket is empty). */
  minHours: number;
  /** Slowest remediation in hours (0 when the bucket is empty). */
  maxHours: number;
  count: number;
}

/** Overall MTTR stats returned by securityMetrics.mttr. */
export interface MttrOverallStats extends MttrSeverityStats {
  trend: MetricTrend;
  /** Signed % change vs the previous period (negative = faster). */
  trendPct: number | null;
}

/** Output of securityMetrics.mttr. */
export interface MttrResponse {
  overall: MttrOverallStats;
  bySeverity: Record<MetricSeverity, MttrSeverityStats>;
  updatedAt: string | null;
}

/* --- securityMetrics.vulnerabilityAge -------------------------------- */

/** One vulnerability finding fed into the age engine (input side). */
export interface VulnerabilityAgeItemInput {
  id: string | number;
  cveId?: string | null;
  assetName?: string | null;
  severity?: MetricSeverity;
  discoveredAt?: string | null;
  patchedAt?: string | null;
  /** Remediation due date; past due dates count as overdue. */
  dueAt?: string | null;
}

/** Input of securityMetrics.vulnerabilityAge. */
export interface VulnerabilityAgeInput {
  clientId: number;
  items?: VulnerabilityAgeItemInput[];
}

/** Per-severity age distribution returned by securityMetrics.vulnerabilityAge. */
export interface VulnerabilityAgeSeverityStats {
  count: number;
  /** Mean age in whole days (0 when the bucket is empty). */
  avgAgeDays: number;
  /** Oldest finding in whole days (0 when the bucket is empty). */
  maxAgeDays: number;
  /** Findings whose due date has passed. */
  overdueCount: number;
}

/** Output of securityMetrics.vulnerabilityAge. */
export interface VulnerabilityAgeResponse {
  total: number;
  overdueCount: number;
  bySeverity: Record<MetricSeverity, VulnerabilityAgeSeverityStats>;
  /** Count of findings per age bucket (whole days since discovery). */
  ageBands: Record<AgeBand, number>;
  updatedAt: string | null;
}

/* --- securityMetrics.complianceDrift --------------------------------- */

/** One measured control area fed into the drift engine (input side). */
export interface ComplianceDriftAreaInput {
  id: string | number;
  areaName: string;
  /** NIS2 article / ENISA measure the area maps to, e.g. "Art. 21(2)(a)". */
  measure?: string | null;
  /** Baseline maturity/effectiveness score, 0-100 (higher = better). */
  baselineScore: number;
  /** Current maturity/effectiveness score, 0-100 (higher = better). */
  currentScore: number;
}

/** Input of securityMetrics.complianceDrift. */
export interface ComplianceDriftInput {
  clientId: number;
  areas?: ComplianceDriftAreaInput[];
}

/** One drift alert returned by securityMetrics.complianceDrift. */
export interface ComplianceDriftItem {
  areaId: string | number;
  areaName: string;
  /** NIS2 article / ENISA measure the area maps to, e.g. "Art. 21(2)(a)". */
  measure?: string | null;
  baselineScore: number;
  currentScore: number;
  /** baseline - current; positive = worsened, negative = improved. */
  driftPoints: number;
  severity: DriftSeverity;
  recommendation: string;
}

/** Output of securityMetrics.complianceDrift. */
export interface ComplianceDriftResponse {
  /** Alerted areas sorted by severity (critical first, highest drift first). */
  items: ComplianceDriftItem[];
  totalAreas: number;
  /** Areas whose severity is >= medium (drift beyond tolerance). */
  driftAlertCount: number;
  /** Areas within tolerance (no meaningful drift). */
  stableCount: number;
  /** Areas whose current score is above their baseline. */
  improvedCount: number;
  updatedAt: string | null;
}

/* --- securityMetrics.executiveSummary -------------------------------- */

/** Input of securityMetrics.executiveSummary (sub-models optional in live mode). */
export interface ExecutiveSummaryInput {
  clientId: number;
  mttr?: MttrResponse | null;
  vulnerabilityAge?: VulnerabilityAgeResponse | null;
  complianceDrift?: ComplianceDriftResponse | null;
}

/** Output of securityMetrics.executiveSummary - one strip for the board. */
export interface ExecutiveSummaryResponse {
  /** Overall NIS2 posture, 0-100 (higher = better). */
  postureScore: number;
  postureTrend: MetricTrend;
  /** Signed % change vs the previous period (positive = score up). */
  postureTrendPct: number | null;
  /** Overall mean time to remediate in hours. */
  mttrHours: number;
  mttrTrend: MetricTrend;
  /** Signed % change vs the previous period (negative = faster). */
  mttrTrendPct: number | null;
  overdueVulnerabilities: number;
  driftAlerts: number;
  status: PostureStatus;
  statusLabel: string;
  updatedAt: string | null;
}

/* ------------------------------------------------------------------ */
/* Empty shapes - stable defaults for degraded rendering (16)          */
/* ------------------------------------------------------------------ */

const zeroMttrSeverityStats = (): MttrSeverityStats => ({
  mttrHours: 0,
  minHours: 0,
  maxHours: 0,
  count: 0,
});

const zeroMttrBySeverity = (): Record<MetricSeverity, MttrSeverityStats> => ({
  critical: zeroMttrSeverityStats(),
  high: zeroMttrSeverityStats(),
  medium: zeroMttrSeverityStats(),
  low: zeroMttrSeverityStats(),
  info: zeroMttrSeverityStats(),
  unknown: zeroMttrSeverityStats(),
});

export const EMPTY_MTTR: MttrResponse = {
  overall: { ...zeroMttrSeverityStats(), trend: "n-a", trendPct: null },
  bySeverity: zeroMttrBySeverity(),
  updatedAt: null,
};

const zeroAgeSeverityStats = (): VulnerabilityAgeSeverityStats => ({
  count: 0,
  avgAgeDays: 0,
  maxAgeDays: 0,
  overdueCount: 0,
});

const zeroAgeBands = (): Record<AgeBand, number> => ({
  "0-7": 0,
  "8-30": 0,
  "31-60": 0,
  "61-90": 0,
  "90+": 0,
});

export const EMPTY_VULNERABILITY_AGE: VulnerabilityAgeResponse = {
  total: 0,
  overdueCount: 0,
  bySeverity: {
    critical: zeroAgeSeverityStats(),
    high: zeroAgeSeverityStats(),
    medium: zeroAgeSeverityStats(),
    low: zeroAgeSeverityStats(),
    info: zeroAgeSeverityStats(),
    unknown: zeroAgeSeverityStats(),
  },
  ageBands: zeroAgeBands(),
  updatedAt: null,
};

export const EMPTY_COMPLIANCE_DRIFT: ComplianceDriftResponse = {
  items: [],
  totalAreas: 0,
  driftAlertCount: 0,
  stableCount: 0,
  improvedCount: 0,
  updatedAt: null,
};

export const EMPTY_EXECUTIVE_SUMMARY: ExecutiveSummaryResponse = {
  postureScore: 0,
  postureTrend: "n-a",
  postureTrendPct: null,
  mttrHours: 0,
  mttrTrend: "n-a",
  mttrTrendPct: null,
  overdueVulnerabilities: 0,
  driftAlerts: 0,
  status: "watch",
  statusLabel: "Watch",
  updatedAt: null,
};

/* ------------------------------------------------------------------ */
/* Narrowed tRPC query result shapes (runtime is a superset)          */
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

interface SecurityMetricsTrpc {
  securityMetrics: {
    mttr: {
      useQuery: (input: MttrInput, opts?: QueryOptions) => QueryLike<MttrResponse>;
    };
    vulnerabilityAge: {
      useQuery: (input: VulnerabilityAgeInput, opts?: QueryOptions) => QueryLike<VulnerabilityAgeResponse>;
    };
    complianceDrift: {
      useQuery: (input: ComplianceDriftInput, opts?: QueryOptions) => QueryLike<ComplianceDriftResponse>;
    };
    executiveSummary: {
      useQuery: (input: ExecutiveSummaryInput, opts?: QueryOptions) => QueryLike<ExecutiveSummaryResponse>;
    };
  };
}

const securityMetricsApi = trpc as unknown as SecurityMetricsTrpc;

/** Placeholder inputs used only while a query is disabled (never rendered). */
const HIDDEN_MTTR_INPUT: MttrInput = { clientId: 0, incidents: [] };
const HIDDEN_VULNERABILITY_AGE_INPUT: VulnerabilityAgeInput = { clientId: 0, items: [] };
const HIDDEN_COMPLIANCE_DRIFT_INPUT: ComplianceDriftInput = { clientId: 0, areas: [] };
const HIDDEN_EXECUTIVE_SUMMARY_INPUT: ExecutiveSummaryInput = { clientId: 0 };

/* ------------------------------------------------------------------ */
/* Hooks - retry: false, enabled: clientId > 0 (UI-STANDARD 16)        */
/* ------------------------------------------------------------------ */

/**
 * Mean time to remediate across severity bands (Art. 21(2)(f)).
 * Client-scoped - pass null for `input` to keep the query disabled.
 */
export function useMttr(
  clientId: number,
  input: MttrInput | null,
  enabled = true
): QueryLike<MttrResponse> {
  return securityMetricsApi.securityMetrics.mttr.useQuery(input ?? HIDDEN_MTTR_INPUT, {
    enabled: enabled && clientId > 0 && input !== null,
    retry: false,
    staleTime: 30_000,
  });
}

/**
 * Vulnerability age distribution (count / avg age / max age / overdue per
 * severity + age-band buckets). Client-scoped - pass null for `input` to
 * keep the query disabled.
 */
export function useVulnerabilityAge(
  clientId: number,
  input: VulnerabilityAgeInput | null,
  enabled = true
): QueryLike<VulnerabilityAgeResponse> {
  return securityMetricsApi.securityMetrics.vulnerabilityAge.useQuery(
    input ?? HIDDEN_VULNERABILITY_AGE_INPUT,
    {
      enabled: enabled && clientId > 0 && input !== null,
      retry: false,
      staleTime: 30_000,
    }
  );
}

/**
 * Compliance drift alerts (baseline -> current scores per control area).
 * Client-scoped - pass null for `input` to keep the query disabled.
 */
export function useComplianceDrift(
  clientId: number,
  input: ComplianceDriftInput | null,
  enabled = true
): QueryLike<ComplianceDriftResponse> {
  return securityMetricsApi.securityMetrics.complianceDrift.useQuery(
    input ?? HIDDEN_COMPLIANCE_DRIFT_INPUT,
    {
      enabled: enabled && clientId > 0 && input !== null,
      retry: false,
      staleTime: 30_000,
    }
  );
}

/**
 * Executive summary strip (posture score, MTTR, overdue vulnerabilities,
 * drift alerts + overall status badge). Client-scoped - pass null for
 * `input` to keep the query disabled.
 */
export function useExecutiveSummary(
  clientId: number,
  input: ExecutiveSummaryInput | null,
  enabled = true
): QueryLike<ExecutiveSummaryResponse> {
  return securityMetricsApi.securityMetrics.executiveSummary.useQuery(
    input ?? HIDDEN_EXECUTIVE_SUMMARY_INPUT,
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

export interface SeverityMeta {
  label: string;
  badgeVariant: MetricsBadgeVariant;
  /** index.css .progress-* class that colors a [data-slot="progress-indicator"] fill. */
  barClass: MetricsBarClass;
}

/** Severity band -> badge label/variant + score-bar fill (18 exception). */
export const MTTR_SEVERITY_META: Record<MetricSeverity, SeverityMeta> = {
  critical: { label: "Critical", badgeVariant: "error", barClass: "progress-error" },
  high: { label: "High", badgeVariant: "warning", barClass: "progress-warning" },
  medium: { label: "Medium", badgeVariant: "warning", barClass: "progress-warning" },
  low: { label: "Low", badgeVariant: "info", barClass: "progress-success" },
  info: { label: "Info", badgeVariant: "outline", barClass: "progress-success" },
  unknown: { label: "Unknown", badgeVariant: "secondary", barClass: "progress-warning" },
};

/** Stable render order for severity rows (critical first). */
export const METRIC_SEVERITY_ORDER: MetricSeverity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
  "unknown",
];

export interface DriftSeverityMeta {
  label: string;
  badgeVariant: MetricsBadgeVariant;
  /** index.css .progress-* class (kept for consistency with severity bars). */
  barClass: MetricsBarClass;
}

/** Compliance drift severity -> badge label + variant. */
export const DRIFT_SEVERITY_META: Record<DriftSeverity, DriftSeverityMeta> = {
  critical: { label: "Critical", badgeVariant: "error", barClass: "progress-error" },
  high: { label: "High", badgeVariant: "warning", barClass: "progress-warning" },
  medium: { label: "Medium", badgeVariant: "warning", barClass: "progress-warning" },
  low: { label: "Low", badgeVariant: "info", barClass: "progress-success" },
  none: { label: "No Drift", badgeVariant: "secondary", barClass: "progress-success" },
};

/** Stable render order for drift severity counters. */
export const DRIFT_SEVERITY_ORDER: DriftSeverity[] = ["critical", "high", "medium", "low", "none"];

export interface AgeBandMeta {
  label: string;
  badgeVariant: MetricsBadgeVariant;
}

/** Vulnerability age bucket -> chip label + badge variant. */
export const AGE_BAND_META: Record<AgeBand, AgeBandMeta> = {
  "0-7": { label: "0-7d", badgeVariant: "success" },
  "8-30": { label: "8-30d", badgeVariant: "info" },
  "31-60": { label: "31-60d", badgeVariant: "warning" },
  "61-90": { label: "61-90d", badgeVariant: "warning" },
  "90+": { label: "90+d", badgeVariant: "error" },
};

/** Stable render order for age-band bucket chips (youngest first). */
export const AGE_BAND_ORDER: AgeBand[] = ["0-7", "8-30", "31-60", "61-90", "90+"];

export interface TrendMeta {
  label: string;
  /** Arrow glyph. Assumes score semantics (up = improved); use `trendGlyph(trend, true)` to flip for metrics that improve by decreasing (MTTR, overdue counts). */
  glyph: "↑" | "↓" | "→" | "–";
  /** Token-based class for the trend value (dark-mode safe). */
  textClass: string;
  badgeVariant: MetricsBadgeVariant;
}

/** Trend state -> label, arrow glyph + semantic colors. */
export const TREND_META: Record<MetricTrend, TrendMeta> = {
  improved: {
    label: "Improved",
    glyph: "↑",
    textClass: "text-[var(--success-foreground)]",
    badgeVariant: "success",
  },
  worsened: {
    label: "Worsened",
    glyph: "↓",
    textClass: "text-[var(--error-foreground)]",
    badgeVariant: "error",
  },
  flat: {
    label: "Flat",
    glyph: "→",
    textClass: "text-muted-foreground",
    badgeVariant: "secondary",
  },
  "n-a": {
    label: "N/A",
    glyph: "–",
    textClass: "text-muted-foreground",
    badgeVariant: "outline",
  },
};

/**
 * Arrow glyph for a trend. Pass `inverted` when the metric improves by
 * decreasing (MTTR hours, overdue counts): an "improved" MTTR trend then
 * renders a down arrow while keeping the success coloring.
 */
export function trendGlyph(trend: MetricTrend, inverted = false): "↑" | "↓" | "→" | "–" {
  const glyph = TREND_META[trend].glyph;
  if (inverted) {
    if (glyph === "↑") return "↓";
    if (glyph === "↓") return "↑";
  }
  return glyph;
}

export interface PostureStatusMeta {
  label: string;
  badgeVariant: MetricsBadgeVariant;
  /** Token-based class for the big posture number. */
  textClass: string;
}

/** Executive posture status -> badge label + variant. */
export const POSTURE_STATUS_META: Record<PostureStatus, PostureStatusMeta> = {
  good: { label: "Good", badgeVariant: "success", textClass: "text-[var(--success-foreground)]" },
  watch: { label: "Watch", badgeVariant: "warning", textClass: "text-[var(--warning-foreground)]" },
  critical: { label: "Critical", badgeVariant: "error", textClass: "text-[var(--error-foreground)]" },
};

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Human-readable hours label, one decimal (e.g. "141.3h", "24h"). */
export function formatMetricHours(hours: number): string {
  if (!Number.isFinite(hours) || hours <= 0) return "0h";
  const rounded = Math.round(hours * 10) / 10;
  return `${rounded}h`;
}

/* ------------------------------------------------------------------ */
/* Demo mode (UI-STANDARD 17) - sample data, never fake primary state  */
/* ------------------------------------------------------------------ */

/**
 * Fixed demo clock so the metrics demo is deterministic: every detectedAt /
 * resolvedAt / dueAt and derived stat is computed from this instant.
 */
export const DEMO_METRICS_BASE_DATE = new Date("2026-09-15T00:00:00.000Z");

const demoIso = (daysFromBase: number): string =>
  new Date(DEMO_METRICS_BASE_DATE.getTime() + daysFromBase * 86_400_000).toISOString();

const HOURS_MS = 3_600_000;

/** Sample incidents fed into the MTTR engine (input side). */
export const DEMO_MTTR_INCIDENTS: MttrIncidentInput[] = [
  { id: 1, severity: "critical", detectedAt: demoIso(-40), resolvedAt: demoIso(-33) },
  { id: 2, severity: "critical", detectedAt: demoIso(-18), resolvedAt: demoIso(-14) },
  { id: 3, severity: "high", detectedAt: demoIso(-30), resolvedAt: demoIso(-24) },
  { id: 4, severity: "high", detectedAt: demoIso(-10), resolvedAt: demoIso(-6) },
  { id: 5, severity: "medium", detectedAt: demoIso(-25), resolvedAt: demoIso(-15) },
  { id: 6, severity: "medium", detectedAt: demoIso(-8), resolvedAt: demoIso(-2) },
  { id: 7, severity: "low", detectedAt: demoIso(-20), resolvedAt: demoIso(-9) },
  { id: 8, severity: "info", detectedAt: demoIso(-5), resolvedAt: demoIso(-1) },
  { id: 9, severity: "unknown", detectedAt: demoIso(-12), resolvedAt: demoIso(-11) },
];

/** Sample vulnerability findings fed into the age engine (input side). */
export const DEMO_VULNERABILITY_ITEMS: VulnerabilityAgeItemInput[] = [
  {
    id: 1,
    cveId: "CVE-2021-44228",
    assetName: "Apache Tomcat (Customer Portal)",
    severity: "critical",
    discoveredAt: demoIso(-42),
    dueAt: demoIso(-30),
  },
  {
    id: 2,
    cveId: "CVE-2017-0144",
    assetName: "Windows Server 2019 (File Server)",
    severity: "critical",
    discoveredAt: demoIso(-28),
    dueAt: demoIso(3),
  },
  {
    id: 3,
    cveId: "CVE-2023-34362",
    assetName: "MOVEit DMZ Gateway",
    severity: "critical",
    discoveredAt: demoIso(-15),
    dueAt: demoIso(12),
  },
  {
    id: 4,
    cveId: "CVE-2024-3400",
    assetName: "Palo Alto PA-3260 (Edge FW)",
    severity: "high",
    discoveredAt: demoIso(-10),
    dueAt: demoIso(5),
  },
  {
    id: 5,
    cveId: "CVE-2019-6109",
    assetName: "Linux Bastion Host",
    severity: "high",
    discoveredAt: demoIso(-20),
    dueAt: demoIso(14),
  },
  {
    id: 6,
    cveId: "CVE-2024-1234",
    assetName: "Customer Portal API",
    severity: "critical",
    discoveredAt: demoIso(-9),
    dueAt: demoIso(-5),
  },
  {
    id: 7,
    cveId: "CVE-2023-4863",
    assetName: "Image Processing Service",
    severity: "medium",
    discoveredAt: demoIso(-60),
    patchedAt: demoIso(-55),
  },
  {
    id: 8,
    cveId: "CVE-2022-30190",
    assetName: "Windows Workstation Fleet",
    severity: "medium",
    discoveredAt: demoIso(-45),
    dueAt: demoIso(-40),
  },
  {
    id: 9,
    cveId: "CVE-2023-23397",
    assetName: "Exchange Mail Gateway",
    severity: "low",
    discoveredAt: demoIso(-30),
    patchedAt: demoIso(-28),
  },
  {
    id: 10,
    cveId: "CVE-2024-21762",
    assetName: "FortiGate Edge VPN",
    severity: "info",
    discoveredAt: demoIso(-25),
    patchedAt: demoIso(-24),
  },
  {
    id: 11,
    cveId: "CVE-2021-34527",
    assetName: "Print Spooler Service",
    severity: "critical",
    discoveredAt: demoIso(-95),
    dueAt: demoIso(-80),
  },
];

/** Sample control areas fed into the drift engine (input side). */
export const DEMO_DRIFT_AREAS: ComplianceDriftAreaInput[] = [
  {
    id: "a1",
    areaName: "Risk analysis & security policies",
    measure: "Art. 21(2)(a)",
    baselineScore: 92,
    currentScore: 64,
  },
  {
    id: "a2",
    areaName: "Incident handling & reporting",
    measure: "Art. 21(2)(c)",
    baselineScore: 88,
    currentScore: 78,
  },
  {
    id: "a3",
    areaName: "Supply chain security",
    measure: "Art. 21(2)(d)",
    baselineScore: 78,
    currentScore: 52,
  },
  {
    id: "a4",
    areaName: "Access control & MFA",
    measure: "Art. 21(2)(g)",
    baselineScore: 85,
    currentScore: 83,
  },
  {
    id: "a5",
    areaName: "Backup & recovery",
    measure: "Art. 21(2)(h)",
    baselineScore: 70,
    currentScore: 76,
  },
  {
    id: "a6",
    areaName: "Network security & monitoring",
    measure: "Art. 21(2)(f)",
    baselineScore: 90,
    currentScore: 72,
  },
  {
    id: "a7",
    areaName: "Cryptography & PKI",
    measure: "Art. 21(2)(i)",
    baselineScore: 81,
    currentScore: 79,
  },
];

/** Remediation-time in hours for one demo incident (null when incomplete). */
function incidentHours(incident: MttrIncidentInput): number | null {
  if (!incident.detectedAt || !incident.resolvedAt) return null;
  const detected = new Date(incident.detectedAt).getTime();
  const resolved = new Date(incident.resolvedAt).getTime();
  if (Number.isNaN(detected) || Number.isNaN(resolved) || resolved < detected) return null;
  return Math.round(((resolved - detected) / HOURS_MS) * 10) / 10;
}

/** Input object for securityMetrics.mttr in demo mode. */
export function buildDemoMttrInput(): MttrInput {
  return { clientId: 0, incidents: DEMO_MTTR_INCIDENTS };
}

/** Compute the demo MTTR view-model (mirrors mttr output, deterministic). */
export function buildDemoMttr(): MttrResponse {
  const buckets: Record<MetricSeverity, { sum: number; min: number; max: number; count: number }> = {
    critical: { sum: 0, min: Number.POSITIVE_INFINITY, max: 0, count: 0 },
    high: { sum: 0, min: Number.POSITIVE_INFINITY, max: 0, count: 0 },
    medium: { sum: 0, min: Number.POSITIVE_INFINITY, max: 0, count: 0 },
    low: { sum: 0, min: Number.POSITIVE_INFINITY, max: 0, count: 0 },
    info: { sum: 0, min: Number.POSITIVE_INFINITY, max: 0, count: 0 },
    unknown: { sum: 0, min: Number.POSITIVE_INFINITY, max: 0, count: 0 },
  };
  let totalSum = 0;
  let totalMin = Number.POSITIVE_INFINITY;
  let totalMax = 0;
  let totalCount = 0;

  for (const incident of DEMO_MTTR_INCIDENTS) {
    const hours = incidentHours(incident);
    if (hours === null) continue;
    const severity: MetricSeverity = incident.severity ?? "unknown";
    const bucket = buckets[severity];
    bucket.sum += hours;
    bucket.min = Math.min(bucket.min, hours);
    bucket.max = Math.max(bucket.max, hours);
    bucket.count += 1;
    totalSum += hours;
    totalMin = Math.min(totalMin, hours);
    totalMax = Math.max(totalMax, hours);
    totalCount += 1;
  }

  const toSeverityStats = (bucket: { sum: number; min: number; max: number; count: number }): MttrSeverityStats =>
    bucket.count === 0
      ? { mttrHours: 0, minHours: 0, maxHours: 0, count: 0 }
      : {
          mttrHours: Math.round((bucket.sum / bucket.count) * 10) / 10,
          minHours: Math.round(bucket.min * 10) / 10,
          maxHours: Math.round(bucket.max * 10) / 10,
          count: bucket.count,
        };

  return {
    overall: {
      mttrHours: totalCount > 0 ? Math.round((totalSum / totalCount) * 10) / 10 : 0,
      minHours: totalCount > 0 ? Math.round(totalMin * 10) / 10 : 0,
      maxHours: totalCount > 0 ? Math.round(totalMax * 10) / 10 : 0,
      count: totalCount,
      trend: "improved",
      trendPct: -12.5,
    },
    bySeverity: {
      critical: toSeverityStats(buckets.critical),
      high: toSeverityStats(buckets.high),
      medium: toSeverityStats(buckets.medium),
      low: toSeverityStats(buckets.low),
      info: toSeverityStats(buckets.info),
      unknown: toSeverityStats(buckets.unknown),
    },
    updatedAt: DEMO_METRICS_BASE_DATE.toISOString(),
  };
}

/** Whole days since discovery for one demo finding (0 when unknown). */
function findingAgeDays(item: VulnerabilityAgeItemInput): number {
  if (!item.discoveredAt) return 0;
  const discovered = new Date(item.discoveredAt).getTime();
  if (Number.isNaN(discovered)) return 0;
  return Math.max(0, Math.round((DEMO_METRICS_BASE_DATE.getTime() - discovered) / 86_400_000));
}

/** Whether a demo finding's due date has passed (false when none). */
function isOverdue(item: VulnerabilityAgeItemInput): boolean {
  if (!item.dueAt) return false;
  const due = new Date(item.dueAt).getTime();
  return !Number.isNaN(due) && due < DEMO_METRICS_BASE_DATE.getTime();
}

/** Age bucket for a whole-day age (mirrors the engine's banding). */
function ageBandFor(ageDays: number): AgeBand {
  if (ageDays <= 7) return "0-7";
  if (ageDays <= 30) return "8-30";
  if (ageDays <= 60) return "31-60";
  if (ageDays <= 90) return "61-90";
  return "90+";
}

/** Input object for securityMetrics.vulnerabilityAge in demo mode. */
export function buildDemoVulnerabilityAgeInput(): VulnerabilityAgeInput {
  return { clientId: 0, items: DEMO_VULNERABILITY_ITEMS };
}

/** Compute the demo vulnerability-age view-model (mirrors vulnerabilityAge output). */
export function buildDemoVulnerabilityAge(): VulnerabilityAgeResponse {
  const buckets: Record<MetricSeverity, { sum: number; max: number; count: number; overdue: number }> = {
    critical: { sum: 0, max: 0, count: 0, overdue: 0 },
    high: { sum: 0, max: 0, count: 0, overdue: 0 },
    medium: { sum: 0, max: 0, count: 0, overdue: 0 },
    low: { sum: 0, max: 0, count: 0, overdue: 0 },
    info: { sum: 0, max: 0, count: 0, overdue: 0 },
    unknown: { sum: 0, max: 0, count: 0, overdue: 0 },
  };
  const ageBands: Record<AgeBand, number> = { "0-7": 0, "8-30": 0, "31-60": 0, "61-90": 0, "90+": 0 };
  let overdueCount = 0;

  for (const item of DEMO_VULNERABILITY_ITEMS) {
    const severity: MetricSeverity = item.severity ?? "unknown";
    const ageDays = findingAgeDays(item);
    const overdue = isOverdue(item);
    const bucket = buckets[severity];
    bucket.sum += ageDays;
    bucket.max = Math.max(bucket.max, ageDays);
    bucket.count += 1;
    if (overdue) {
      bucket.overdue += 1;
      overdueCount += 1;
    }
    ageBands[ageBandFor(ageDays)] += 1;
  }

  const toSeverityStats = (bucket: { sum: number; max: number; count: number; overdue: number }): VulnerabilityAgeSeverityStats =>
    bucket.count === 0
      ? { count: 0, avgAgeDays: 0, maxAgeDays: 0, overdueCount: 0 }
      : {
          count: bucket.count,
          avgAgeDays: Math.round((bucket.sum / bucket.count) * 10) / 10,
          maxAgeDays: bucket.max,
          overdueCount: bucket.overdue,
        };

  const total = DEMO_VULNERABILITY_ITEMS.length;
  return {
    total,
    overdueCount,
    bySeverity: {
      critical: toSeverityStats(buckets.critical),
      high: toSeverityStats(buckets.high),
      medium: toSeverityStats(buckets.medium),
      low: toSeverityStats(buckets.low),
      info: toSeverityStats(buckets.info),
      unknown: toSeverityStats(buckets.unknown),
    },
    ageBands,
    updatedAt: DEMO_METRICS_BASE_DATE.toISOString(),
  };
}

const DRIFT_RECOMMENDATION: Record<DriftSeverity, string> = {
  critical: "Immediate corrective action - reopen the control and assign an accountable owner",
  high: "Schedule targeted remediation within the next reporting cycle",
  medium: "Investigate the cause and define a recovery plan before the next review",
  low: "Monitor closely at the next scheduled review",
  none: "Within tolerance - continue monitoring",
};

/** Drift severity from baseline -> current delta (mirrors the engine). */
function driftSeverityFor(driftPoints: number): DriftSeverity {
  if (driftPoints < 0) return "none";
  if (driftPoints >= 25) return "critical";
  if (driftPoints >= 15) return "high";
  if (driftPoints >= 8) return "medium";
  if (driftPoints >= 3) return "low";
  return "none";
}

/** Input object for securityMetrics.complianceDrift in demo mode. */
export function buildDemoComplianceDriftInput(): ComplianceDriftInput {
  return { clientId: 0, areas: DEMO_DRIFT_AREAS };
}

/** Compute the demo compliance-drift view-model (mirrors complianceDrift output). */
export function buildDemoComplianceDrift(): ComplianceDriftResponse {
  const items: ComplianceDriftItem[] = DEMO_DRIFT_AREAS.map((area) => {
    const driftPoints = Math.round((area.baselineScore - area.currentScore) * 10) / 10;
    const severity = driftSeverityFor(driftPoints);
    return {
      areaId: area.id,
      areaName: area.areaName,
      measure: area.measure ?? null,
      baselineScore: area.baselineScore,
      currentScore: area.currentScore,
      driftPoints,
      severity,
      recommendation: DRIFT_RECOMMENDATION[severity],
    };
  });
  const alerted = items
    .filter((item) => item.severity !== "none")
    .sort((a, b) => b.driftPoints - a.driftPoints);
  return {
    items: alerted,
    totalAreas: items.length,
    driftAlertCount: alerted.length,
    stableCount: items.filter((item) => item.severity === "none" && item.driftPoints >= 0).length,
    improvedCount: items.filter((item) => item.driftPoints < 0).length,
    updatedAt: DEMO_METRICS_BASE_DATE.toISOString(),
  };
}

/**
 * Demo posture score - deterministic blend of drift pressure, overdue
 * vulnerabilities and remediation speed (documented in the demo builder).
 */
function demoPostureScore(): number {
  const mttr = buildDemoMttr();
  const age = buildDemoVulnerabilityAge();
  const drift = buildDemoComplianceDrift();
  const alertPoints = drift.items.reduce((acc, item) => acc + Math.max(0, item.driftPoints), 0);
  const driftPenalty = Math.min(35, drift.driftAlertCount * 5 + alertPoints * 0.12);
  const overduePenalty = Math.min(15, Math.round(age.overdueCount * 2));
  const mttrPenalty = Math.min(10, Math.max(0, (mttr.overall.mttrHours - 72) / 96));
  return Math.max(0, Math.min(100, Math.round(100 - driftPenalty - overduePenalty - mttrPenalty)));
}

/** Input object for securityMetrics.executiveSummary in demo mode. */
export function buildDemoExecutiveSummaryInput(): ExecutiveSummaryInput {
  return {
    clientId: 0,
    mttr: buildDemoMttr(),
    vulnerabilityAge: buildDemoVulnerabilityAge(),
    complianceDrift: buildDemoComplianceDrift(),
  };
}

/** Compute the demo executive-summary view-model (mirrors executiveSummary output). */
export function buildDemoExecutiveSummary(): ExecutiveSummaryResponse {
  const mttr = buildDemoMttr();
  const age = buildDemoVulnerabilityAge();
  const drift = buildDemoComplianceDrift();
  const postureScore = demoPostureScore();
  const status: PostureStatus =
    postureScore >= 80 ? "good" : postureScore >= 60 ? "watch" : "critical";
  return {
    postureScore,
    postureTrend: "improved",
    postureTrendPct: 2.4,
    mttrHours: mttr.overall.mttrHours,
    mttrTrend: mttr.overall.trend,
    mttrTrendPct: mttr.overall.trendPct,
    overdueVulnerabilities: age.overdueCount,
    driftAlerts: drift.driftAlertCount,
    status,
    statusLabel: POSTURE_STATUS_META[status].label,
    updatedAt: DEMO_METRICS_BASE_DATE.toISOString(),
  };
}

/** Input bundle for all four securityMetrics queries in demo mode. */
export const DEMO_EXECUTIVE_INPUTS: ExecutiveSummaryInput = buildDemoExecutiveSummaryInput();
