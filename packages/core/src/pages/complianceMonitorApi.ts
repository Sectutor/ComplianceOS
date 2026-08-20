/**
 * NIS2 Continuous Compliance Monitoring - data contract + hooks
 * ==============================================================
 * UI-side typed view of the `complianceMonitor.*` tRPC procedures the
 * backend agent is building in parallel (Phase 5 Task 5.2 - NIS2 Art.
 * 21(2)(f) "continuous compliance monitoring" with ENISA Measure 7.1
 * "measuring the effectiveness of the risk-management measures").
 *
 * COORDINATION BY CONVENTION (UI-STANDARD 16) - if the procedures are not
 * live yet the tRPC HTTP call 404s (NOT_FOUND) and the query surfaces an
 * error; every consumer in the UI degrades to a graceful EmptyState
 * ("Connect the complianceMonitor.<procedure> API").
 *
 * ---------------------------------------------------------------------------
 * Expected procedures (all protected queries, pure - no DB access):
 *
 * 1) complianceMonitor.posture
 *    input:  { measures?: [{ measureId?, name?, score?, baselineScore?,
 *                            status? }], now?, clock? }
 *    output: { overallScore (1dp), status: 'Strong'|'Developing'|'At Risk'|
 *              'Critical'|'No Data', coverageRate (1dp), driftPts (1dp|null),
 *              trend: 'improved'|'declined'|'stable'|'n-a',
 *              statusCounts: { strong, developing, atRisk, critical, noData },
 *              topGaps: [{ measureId, name, score, status }] (max 5,
 *                        score asc), totalMeasures, assessedMeasures,
 *              verdict: string }
 *
 * 2) complianceMonitor.evidenceCoverage
 *    input:  { items?: [{ controlId?, measureId?, name?, evidenceCount?,
 *                         lastCollectedAt?, expiresAt? }], now?, clock? }
 *    output: { coverageRate (1dp), totalItems, coveredCount, missingCount,
 *              expiringCount, expiredCount, currentCount,
 *              avgEvidencePerControl (1dp),
 *              byMeasure: [{ measureId, name, total, covered, coverageRate }]
 *                         (coverageRate asc),
 *              items: [{ controlId, name, status: 'covered'|'missing',
 *                        expiry: 'expired'|'expiring'|'current'|'n-a' }]
 *                     (controlId asc) }
 *
 * 3) complianceMonitor.auditReport
 *    input:  { entityName?, entitySector?, postureScore?, measures?,
 *              evidenceSummary?: { total?, covered?, coverageRate? },
 *              now?, clock? }
 *    output: { report: string (markdown), sections: [{ key, title,
 *              status: 'pass'|'warn'|'fail'|'info' }], generatedAt: ISO,
 *              postureScore (1dp), coverageRate (1dp),
 *              topGaps: [{ measureId, name, score, status }],
 *              recommendationCount: number }
 * ---------------------------------------------------------------------------
 */

import { trpc } from "@/lib/trpc";

/* ------------------------------------------------------------------ */
/* Types (mirror the backend contract 1:1, defensive on optionals)    */
/* ------------------------------------------------------------------ */

/** Overall compliance posture band derived from the measured scores. */
export type CompliancePostureStatus = "Strong" | "Developing" | "At Risk" | "Critical" | "No Data";

/** Direction of change vs the previous reporting period. */
export type ComplianceTrend = "improved" | "declined" | "stable" | "n-a";

/** Coverage state of a single control (evidence attached or not). */
export type EvidenceItemStatus = "covered" | "missing";

/** Expiry state of a control's evidence vs the evaluation instant. */
export type EvidenceExpiry = "expired" | "expiring" | "current" | "n-a";

/** Badge variants actually supported by the Badge component. */
export type ComplianceBadgeVariant =
  | "default"
  | "secondary"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "outline"
  | "destructive";

/** Data-viz score-bar fill (index.css .progress-* classes, UI-STANDARD 18). */
export type ComplianceBarClass = "progress-success" | "progress-warning" | "progress-error";

/** Audit report section key + status band. */
export type AuditSectionKey = "posture" | "measures" | "evidence" | "gaps";
export type AuditSectionStatus = "pass" | "warn" | "fail" | "info";

/* --- complianceMonitor.posture -------------------------------------- */

/** One NIS2 measure fed into the posture engine (input side). */
export interface ComplianceMeasureInput {
  measureId?: string | null;
  name?: string | null;
  /** Current effectiveness score, 0-100 (higher = better). */
  score?: number | null;
  /** Baseline effectiveness score, 0-100 (higher = better). */
  baselineScore?: number | null;
  status?: CompliancePostureStatus | null;
}

/** Input of complianceMonitor.posture. */
export interface CompliancePostureInput {
  measures?: ComplianceMeasureInput[];
  /** Evaluation instant (ISO). Defaults to server time when omitted. */
  now?: string | null;
  /** Injectable clock (ISO) used by tests/demo to pin time. */
  clock?: string | null;
}

/** Per-band measure counts returned by complianceMonitor.posture. */
export interface ComplianceStatusCounts {
  strong: number;
  developing: number;
  atRisk: number;
  critical: number;
  noData: number;
}

/** One top-gap measure returned by complianceMonitor.posture. */
export interface ComplianceTopGap {
  measureId: string;
  name: string;
  /** Current effectiveness score, 0-100. */
  score: number;
  status: CompliancePostureStatus;
}

/** Output of complianceMonitor.posture. */
export interface CompliancePostureResponse {
  /** Overall effectiveness score, 0-100, one decimal. */
  overallScore: number;
  status: CompliancePostureStatus;
  /** Share of measures with an assessed score, 0-100, one decimal. */
  coverageRate: number;
  /** Mean baseline - current drift; positive = worsened (null when no baselines). */
  driftPts: number | null;
  trend: ComplianceTrend;
  statusCounts: ComplianceStatusCounts;
  /** Lowest-scoring measures, max 5, ascending by score. */
  topGaps: ComplianceTopGap[];
  totalMeasures: number;
  assessedMeasures: number;
  verdict: string;
}

/* --- complianceMonitor.evidenceCoverage ------------------------------ */

/** One control/evidence row fed into the coverage engine (input side). */
export interface EvidenceItemInput {
  controlId?: string | number | null;
  measureId?: string | null;
  name?: string | null;
  evidenceCount?: number | null;
  lastCollectedAt?: string | null;
  /** Evidence expiry; past dates count as expired, <= 90d as expiring. */
  expiresAt?: string | null;
}

/** Input of complianceMonitor.evidenceCoverage. */
export interface EvidenceCoverageInput {
  items?: EvidenceItemInput[];
  now?: string | null;
  clock?: string | null;
}

/** Coverage rollup per NIS2 measure returned by complianceMonitor.evidenceCoverage. */
export interface EvidenceByMeasure {
  measureId: string;
  name: string;
  total: number;
  covered: number;
  /** 0-100, one decimal. */
  coverageRate: number;
}

/** One control row returned by complianceMonitor.evidenceCoverage. */
export interface EvidenceCoverageItem {
  controlId: string | number;
  name: string;
  status: EvidenceItemStatus;
  expiry: EvidenceExpiry;
}

/** Output of complianceMonitor.evidenceCoverage. */
export interface EvidenceCoverageResponse {
  /** Share of controls with at least one piece of evidence, 0-100, one decimal. */
  coverageRate: number;
  totalItems: number;
  coveredCount: number;
  missingCount: number;
  /** Evidence expiring within the next 90 days. */
  expiringCount: number;
  /** Evidence already past its expiry date. */
  expiredCount: number;
  /** Evidence still current (expiry beyond 90 days or never set). */
  currentCount: number;
  /** Mean evidence items per control, one decimal. */
  avgEvidencePerControl: number;
  /** Measure rollups sorted by coverageRate ascending. */
  byMeasure: EvidenceByMeasure[];
  /** Control rows sorted by controlId ascending. */
  items: EvidenceCoverageItem[];
}

/* --- complianceMonitor.auditReport ----------------------------------- */

/** Input of complianceMonitor.auditReport. */
export interface AuditReportInput {
  entityName?: string | null;
  entitySector?: string | null;
  postureScore?: number | null;
  measures?: ComplianceMeasureInput[];
  evidenceSummary?: {
    total?: number;
    covered?: number;
    coverageRate?: number;
  } | null;
  now?: string | null;
  clock?: string | null;
}

/** One section of the generated audit report. */
export interface AuditReportSection {
  key: AuditSectionKey;
  title: string;
  status: AuditSectionStatus;
}

/** Output of complianceMonitor.auditReport. */
export interface AuditReportResponse {
  /** Full markdown report text (display-only). */
  report: string;
  sections: AuditReportSection[];
  /** ISO timestamp the report was generated at. */
  generatedAt: string;
  postureScore: number;
  coverageRate: number;
  topGaps: ComplianceTopGap[];
  recommendationCount: number;
}

/* ------------------------------------------------------------------ */
/* Empty shapes - stable defaults for degraded rendering (16)          */
/* ------------------------------------------------------------------ */

export const EMPTY_COMPLIANCE_POSTURE: CompliancePostureResponse = {
  overallScore: 0,
  status: "No Data",
  coverageRate: 0,
  driftPts: null,
  trend: "n-a",
  statusCounts: { strong: 0, developing: 0, atRisk: 0, critical: 0, noData: 0 },
  topGaps: [],
  totalMeasures: 0,
  assessedMeasures: 0,
  verdict: "No compliance posture data available yet.",
};

export const EMPTY_EVIDENCE_COVERAGE: EvidenceCoverageResponse = {
  coverageRate: 0,
  totalItems: 0,
  coveredCount: 0,
  missingCount: 0,
  expiringCount: 0,
  expiredCount: 0,
  currentCount: 0,
  avgEvidencePerControl: 0,
  byMeasure: [],
  items: [],
};

export const EMPTY_AUDIT_REPORT: AuditReportResponse = {
  report: "",
  sections: [],
  generatedAt: "",
  postureScore: 0,
  coverageRate: 0,
  topGaps: [],
  recommendationCount: 0,
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

interface ComplianceMonitorTrpc {
  complianceMonitor: {
    posture: {
      useQuery: (input: CompliancePostureInput, opts?: QueryOptions) => QueryLike<CompliancePostureResponse>;
    };
    evidenceCoverage: {
      useQuery: (input: EvidenceCoverageInput, opts?: QueryOptions) => QueryLike<EvidenceCoverageResponse>;
    };
    auditReport: {
      useQuery: (input: AuditReportInput, opts?: QueryOptions) => QueryLike<AuditReportResponse>;
    };
  };
}

const complianceMonitorApi = trpc as unknown as ComplianceMonitorTrpc;

/** Placeholder inputs used only while a query is disabled (never rendered). */
const HIDDEN_COMPLIANCE_POSTURE_INPUT: CompliancePostureInput = { measures: [] };
const HIDDEN_EVIDENCE_COVERAGE_INPUT: EvidenceCoverageInput = { items: [] };
const HIDDEN_AUDIT_REPORT_INPUT: AuditReportInput = {};

/* ------------------------------------------------------------------ */
/* Hooks - retry: false, disabled while input is null (UI-STANDARD 16) */
/* ------------------------------------------------------------------ */

/**
 * Compliance posture (overall score, status band, drift, top gaps).
 * Pass null for `input` to keep the query disabled.
 */
export function useCompliancePosture(
  input: CompliancePostureInput | null,
  enabled = true
): QueryLike<CompliancePostureResponse> {
  return complianceMonitorApi.complianceMonitor.posture.useQuery(
    input ?? HIDDEN_COMPLIANCE_POSTURE_INPUT,
    {
      enabled: enabled && input !== null,
      retry: false,
      staleTime: 30_000,
    }
  );
}

/**
 * Evidence coverage (covered/missing/expiring/expired + per-measure rollup).
 * Pass null for `input` to keep the query disabled.
 */
export function useEvidenceCoverage(
  input: EvidenceCoverageInput | null,
  enabled = true
): QueryLike<EvidenceCoverageResponse> {
  return complianceMonitorApi.complianceMonitor.evidenceCoverage.useQuery(
    input ?? HIDDEN_EVIDENCE_COVERAGE_INPUT,
    {
      enabled: enabled && input !== null,
      retry: false,
      staleTime: 30_000,
    }
  );
}

/**
 * Generated NIS2 audit report preview (markdown + section statuses).
 * Pass null for `input` to keep the query disabled.
 */
export function useAuditReport(
  input: AuditReportInput | null,
  enabled = true
): QueryLike<AuditReportResponse> {
  return complianceMonitorApi.complianceMonitor.auditReport.useQuery(
    input ?? HIDDEN_AUDIT_REPORT_INPUT,
    {
      enabled: enabled && input !== null,
      retry: false,
      staleTime: 30_000,
    }
  );
}

/* ------------------------------------------------------------------ */
/* Meta helpers (all token-based, dark-mode safe - UI-STANDARD 2)      */
/* ------------------------------------------------------------------ */

export interface ComplianceStatusMeta {
  label: string;
  badgeVariant: ComplianceBadgeVariant;
  /** Token-based dot color (dark-mode safe). */
  dotClass: string;
  /** Token-based class for the big posture number (band coloring). */
  textClass: string;
}

/** Posture band -> badge label/variant, dot + number color. */
export const POSTURE_STATUS_META: Record<CompliancePostureStatus, ComplianceStatusMeta> = {
  Strong: {
    label: "Strong",
    badgeVariant: "success",
    dotClass: "bg-[var(--success-foreground)]",
    textClass: "text-[var(--success-foreground)]",
  },
  Developing: {
    label: "Developing",
    badgeVariant: "info",
    dotClass: "bg-[var(--info-foreground)]",
    textClass: "text-[var(--info-foreground)]",
  },
  "At Risk": {
    label: "At Risk",
    badgeVariant: "warning",
    dotClass: "bg-[var(--warning-foreground)]",
    textClass: "text-[var(--warning-foreground)]",
  },
  Critical: {
    label: "Critical",
    badgeVariant: "error",
    dotClass: "bg-[var(--error-foreground)]",
    textClass: "text-[var(--error-foreground)]",
  },
  "No Data": {
    label: "No Data",
    badgeVariant: "outline",
    dotClass: "bg-muted-foreground",
    textClass: "text-muted-foreground",
  },
};

/** Stable render order for posture band chips (best first). */
export const POSTURE_STATUS_ORDER: CompliancePostureStatus[] = [
  "Strong",
  "Developing",
  "At Risk",
  "Critical",
  "No Data",
];

/** Token-based class for the posture number per band. */
export function postureBandClass(status: CompliancePostureStatus): string {
  return POSTURE_STATUS_META[status].textClass;
}

export interface ComplianceEvidenceMeta {
  label: string;
  badgeVariant: ComplianceBadgeVariant;
  /** Token-based class for expiry/status text (dark-mode safe). */
  textClass: string;
}

/** Evidence status + expiry state -> badge label/variant + text color. */
export const EVIDENCE_STATUS_META: Record<
  EvidenceItemStatus | EvidenceExpiry,
  ComplianceEvidenceMeta
> = {
  covered: {
    label: "Covered",
    badgeVariant: "success",
    textClass: "text-[var(--success-foreground)]",
  },
  missing: {
    label: "Missing",
    badgeVariant: "error",
    textClass: "text-[var(--error-foreground)]",
  },
  expiring: {
    label: "Expiring",
    badgeVariant: "warning",
    textClass: "text-[var(--warning-foreground)]",
  },
  expired: {
    label: "Expired",
    badgeVariant: "error",
    textClass: "text-[var(--error-foreground)]",
  },
  current: {
    label: "Current",
    badgeVariant: "info",
    textClass: "text-[var(--info-foreground)]",
  },
  "n-a": {
    label: "N/A",
    badgeVariant: "outline",
    textClass: "text-muted-foreground",
  },
};

/** Token-based text class for an evidence expiry state. */
export function evidenceExpiryClass(expiry: EvidenceExpiry): string {
  return EVIDENCE_STATUS_META[expiry].textClass;
}

export interface ComplianceTrendMeta {
  label: string;
  /** Arrow glyph (score semantics: up = improved). */
  glyph: "↑" | "↓" | "→" | "–";
  /** Token-based class for the trend value (dark-mode safe). */
  textClass: string;
  badgeVariant: ComplianceBadgeVariant;
}

/** Trend state -> label, arrow glyph + semantic colors. */
export const TREND_META: Record<ComplianceTrend, ComplianceTrendMeta> = {
  improved: {
    label: "Improved",
    glyph: "↑",
    textClass: "text-[var(--success-foreground)]",
    badgeVariant: "success",
  },
  declined: {
    label: "Declined",
    glyph: "↓",
    textClass: "text-[var(--error-foreground)]",
    badgeVariant: "error",
  },
  stable: {
    label: "Stable",
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

/** Arrow glyph for a trend (score semantics - up = improved). */
export function trendGlyph(trend: ComplianceTrend): "↑" | "↓" | "→" | "–" {
  return TREND_META[trend].glyph;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Score as a human-readable percentage, one decimal (e.g. "76.4%"). */
export function formatScore(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "0.0%";
  return `${(Math.round(n * 10) / 10).toFixed(1)}%`;
}

/** Rate as a human-readable percentage, one decimal (e.g. "75.0%"). */
export function formatRate(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "0.0%";
  return `${(Math.round(n * 10) / 10).toFixed(1)}%`;
}

/** Drift points label with sign (e.g. "+7.2 pts", "n/a"). */
export function formatDriftPts(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "n/a";
  const rounded = Math.round(n * 10) / 10;
  return `${rounded > 0 ? "+" : ""}${rounded} pts`;
}

/** Score-bar fill class for a 0-100 rate (UI-STANDARD 18 exception). */
export function coverageBarClass(rate: number): ComplianceBarClass {
  if (rate >= 80) return "progress-success";
  if (rate >= 50) return "progress-warning";
  return "progress-error";
}

/* ------------------------------------------------------------------ */
/* Demo mode (UI-STANDARD 17) - sample data, never fake primary state  */
/* ------------------------------------------------------------------ */

/**
 * Fixed demo clock so the compliance demo is deterministic: every derived
 * stat (drift, expiry bands, generatedAt) is computed from this instant.
 */
export const DEMO_COMPLIANCE_BASE_DATE = new Date("2026-11-02T00:00:00.000Z");

const demoIso = (daysFromBase: number): string =>
  new Date(DEMO_COMPLIANCE_BASE_DATE.getTime() + daysFromBase * 86_400_000).toISOString();

/** Posture band derived from a 0-100 measure score (mirrors the engine). */
function postureStatusForScore(score: number | null | undefined): CompliancePostureStatus {
  if (score == null) return "No Data";
  if (score >= 85) return "Strong";
  if (score >= 70) return "Developing";
  if (score >= 55) return "At Risk";
  return "Critical";
}

/** Posture band -> statusCounts key (mirrors the engine's aggregation). */
const POSTURE_STATUS_COUNT_KEY: Record<CompliancePostureStatus, keyof ComplianceStatusCounts> = {
  Strong: "strong",
  Developing: "developing",
  "At Risk": "atRisk",
  Critical: "critical",
  "No Data": "noData",
};

/** Sample NIS2 Art. 21 measures fed into the posture engine (input side). */
export const DEMO_COMPLIANCE_MEASURES: ComplianceMeasureInput[] = [
  {
    measureId: "risk-analysis",
    name: "Risk analysis & security policies",
    score: 88,
    baselineScore: 92,
  },
  {
    measureId: "incident-handling",
    name: "Incident handling & reporting",
    score: 82,
    baselineScore: 88,
  },
  {
    measureId: "business-continuity",
    name: "Business continuity & crisis management",
    score: 76,
    baselineScore: 80,
  },
  {
    measureId: "supply-chain",
    name: "Supply chain security",
    score: 48,
    baselineScore: 78,
  },
  {
    measureId: "vulnerability-handling",
    name: "Vulnerability handling & disclosure",
    score: 71,
    baselineScore: 85,
  },
  {
    measureId: "security-testing",
    name: "Security testing & exercises",
    score: 64,
    baselineScore: 70,
  },
  {
    measureId: "effectiveness",
    name: "Effectiveness of risk-management measures",
    score: 80,
    baselineScore: 84,
  },
  {
    measureId: "hygiene-training",
    name: "Cyber hygiene & training",
    score: 92,
    baselineScore: 90,
  },
  {
    measureId: "cryptography",
    name: "Cryptography & encryption",
    score: 85,
    baselineScore: 86,
  },
  {
    measureId: "access-control",
    name: "Access control & identity",
    score: 78,
    baselineScore: 83,
  },
];

/** Sample control/evidence rows fed into the coverage engine (input side). */
export const DEMO_EVIDENCE_ITEMS: EvidenceItemInput[] = [
  {
    controlId: "C-01",
    measureId: "risk-analysis",
    name: "Risk assessment register",
    evidenceCount: 3,
    lastCollectedAt: demoIso(-10),
    expiresAt: demoIso(80),
  },
  {
    controlId: "C-02",
    measureId: "incident-handling",
    name: "Incident response plan sign-off",
    evidenceCount: 2,
    lastCollectedAt: demoIso(-45),
    expiresAt: demoIso(-15),
  },
  {
    controlId: "C-03",
    measureId: "business-continuity",
    name: "BCP exercise report Q3",
    evidenceCount: 1,
    lastCollectedAt: demoIso(-20),
    expiresAt: demoIso(90),
  },
  {
    controlId: "C-04",
    measureId: "supply-chain",
    name: "Vendor assessment - core SaaS",
    evidenceCount: 0,
    lastCollectedAt: demoIso(-60),
    expiresAt: demoIso(30),
  },
  {
    controlId: "C-05",
    measureId: "vulnerability-handling",
    name: "Vulnerability scan baseline",
    evidenceCount: 4,
    lastCollectedAt: demoIso(-5),
    expiresAt: null,
  },
  {
    controlId: "C-06",
    measureId: "security-testing",
    name: "Penetration test report",
    evidenceCount: 0,
    lastCollectedAt: null,
    expiresAt: null,
  },
  {
    controlId: "C-07",
    measureId: "effectiveness",
    name: "Effectiveness KPI dashboard",
    evidenceCount: 2,
    lastCollectedAt: demoIso(-12),
    expiresAt: demoIso(120),
  },
  {
    controlId: "C-08",
    measureId: "hygiene-training",
    name: "Security awareness completion",
    evidenceCount: 5,
    lastCollectedAt: demoIso(-3),
    expiresAt: demoIso(60),
  },
  {
    controlId: "C-09",
    measureId: "cryptography",
    name: "Crypto inventory & key rotation",
    evidenceCount: 1,
    lastCollectedAt: demoIso(-90),
    expiresAt: demoIso(-30),
  },
  {
    controlId: "C-10",
    measureId: "access-control",
    name: "MFA enrollment report",
    evidenceCount: 2,
    lastCollectedAt: demoIso(-25),
    expiresAt: demoIso(200),
  },
  {
    controlId: "C-11",
    measureId: "supply-chain",
    name: "Vendor SLA & insurance certificates",
    evidenceCount: 1,
    lastCollectedAt: demoIso(-15),
    expiresAt: demoIso(75),
  },
  {
    controlId: "C-12",
    measureId: "incident-handling",
    name: "24h early-warning drill",
    evidenceCount: 0,
    lastCollectedAt: null,
    expiresAt: demoIso(45),
  },
];

/** Input object for complianceMonitor.posture in demo mode. */
export function buildDemoCompliancePostureInput(): CompliancePostureInput {
  return {
    measures: DEMO_COMPLIANCE_MEASURES,
    now: DEMO_COMPLIANCE_BASE_DATE.toISOString(),
    clock: DEMO_COMPLIANCE_BASE_DATE.toISOString(),
  };
}

/** Compute the demo posture view-model (mirrors posture output, deterministic). */
export function buildDemoCompliancePosture(): CompliancePostureResponse {
  const assessed = DEMO_COMPLIANCE_MEASURES.filter((measure) => measure.score != null);
  const statusCounts: ComplianceStatusCounts = {
    strong: 0,
    developing: 0,
    atRisk: 0,
    critical: 0,
    noData: 0,
  };

  for (const measure of DEMO_COMPLIANCE_MEASURES) {
    const status = postureStatusForScore(measure.score);
    statusCounts[POSTURE_STATUS_COUNT_KEY[status]] += 1;
  }

  const overallScore =
    assessed.length > 0
      ? Math.round((assessed.reduce((acc, m) => acc + (m.score ?? 0), 0) / assessed.length) * 10) / 10
      : 0;

  const withBaselines = DEMO_COMPLIANCE_MEASURES.filter(
    (measure) => measure.score != null && measure.baselineScore != null
  );
  const driftPts =
    withBaselines.length > 0
      ? Math.round(
          (withBaselines.reduce((acc, m) => acc + ((m.baselineScore ?? 0) - (m.score ?? 0)), 0) /
            withBaselines.length) *
            10
        ) / 10
      : null;

  const topGaps: ComplianceTopGap[] = DEMO_COMPLIANCE_MEASURES.filter((measure) => measure.score != null)
    .map((measure, index) => ({
      measureId: String(measure.measureId ?? `measure-${index}`),
      name: measure.name ?? "Untitled measure",
      score: measure.score ?? 0,
      status: postureStatusForScore(measure.score),
    }))
    .sort((a, b) => a.score - b.score || a.name.localeCompare(b.name))
    .slice(0, 5);

  const belowTarget = topGaps.filter((gap) => gap.score < 70);
  const verdict =
    belowTarget.length === 0
      ? "All assessed measures meet the target band (70+)."
      : `${belowTarget.length} of ${assessed.length} measures below target; largest gap: ${topGaps[0].name} (score ${formatScore(topGaps[0].score)}).`;

  return {
    overallScore,
    status: postureStatusForScore(overallScore),
    coverageRate: DEMO_COMPLIANCE_MEASURES.length > 0 ? Math.round((assessed.length / DEMO_COMPLIANCE_MEASURES.length) * 1000) / 10 : 0,
    driftPts,
    trend: "improved",
    statusCounts,
    topGaps,
    totalMeasures: DEMO_COMPLIANCE_MEASURES.length,
    assessedMeasures: assessed.length,
    verdict,
  };
}

/** Expiry state for an evidence row vs the evaluation instant (mirrors the engine). */
function evidenceExpiryFor(expiresAt: string | null | undefined, nowMs: number): EvidenceExpiry {
  if (!expiresAt) return "n-a";
  const expires = new Date(expiresAt).getTime();
  if (Number.isNaN(expires)) return "n-a";
  if (expires < nowMs) return "expired";
  if (expires - nowMs <= 90 * 86_400_000) return "expiring";
  return "current";
}

/** Input object for complianceMonitor.evidenceCoverage in demo mode. */
export function buildDemoEvidenceCoverageInput(): EvidenceCoverageInput {
  return {
    items: DEMO_EVIDENCE_ITEMS,
    now: DEMO_COMPLIANCE_BASE_DATE.toISOString(),
    clock: DEMO_COMPLIANCE_BASE_DATE.toISOString(),
  };
}

/** Compute the demo evidence-coverage view-model (mirrors evidenceCoverage output). */
export function buildDemoEvidenceCoverage(): EvidenceCoverageResponse {
  const nowMs = DEMO_COMPLIANCE_BASE_DATE.getTime();
  const rows: EvidenceCoverageItem[] = DEMO_EVIDENCE_ITEMS.map(
    (item): EvidenceCoverageItem => ({
      controlId: String(item.controlId ?? "unknown"),
      name: item.name ?? "Untitled control",
      status: (item.evidenceCount ?? 0) > 0 ? "covered" : "missing",
      expiry: evidenceExpiryFor(item.expiresAt, nowMs),
    })
  ).sort((a, b) => String(a.controlId).localeCompare(String(b.controlId)));

  const byMeasureMap = new Map<string, EvidenceByMeasure>();
  for (const item of DEMO_EVIDENCE_ITEMS) {
    const measureId = String(item.measureId ?? "unknown");
    const bucket = byMeasureMap.get(measureId) ?? {
      measureId,
      name: item.name ?? "Untitled measure",
      total: 0,
      covered: 0,
      coverageRate: 0,
    };
    bucket.total += 1;
    if ((item.evidenceCount ?? 0) > 0) bucket.covered += 1;
    byMeasureMap.set(measureId, bucket);
  }
  const byMeasure: EvidenceByMeasure[] = [...byMeasureMap.values()]
    .map((bucket) => ({
      ...bucket,
      coverageRate: bucket.total > 0 ? Math.round((bucket.covered / bucket.total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => a.coverageRate - b.coverageRate || a.name.localeCompare(b.name));

  const totalItems = rows.length;
  const coveredCount = rows.filter((row) => row.status === "covered").length;
  const expiringCount = rows.filter((row) => row.expiry === "expiring").length;
  const expiredCount = rows.filter((row) => row.expiry === "expired").length;
  const currentCount = rows.filter((row) => row.expiry === "current").length;
  const totalEvidence = DEMO_EVIDENCE_ITEMS.reduce((acc, item) => acc + (item.evidenceCount ?? 0), 0);

  return {
    coverageRate: totalItems > 0 ? Math.round((coveredCount / totalItems) * 1000) / 10 : 0,
    totalItems,
    coveredCount,
    missingCount: totalItems - coveredCount,
    expiringCount,
    expiredCount,
    currentCount,
    avgEvidencePerControl: totalItems > 0 ? Math.round((totalEvidence / totalItems) * 10) / 10 : 0,
    byMeasure,
    items: rows,
  };
}

/** Input object for complianceMonitor.auditReport in demo mode. */
export function buildDemoAuditReportInput(): AuditReportInput {
  const posture = buildDemoCompliancePosture();
  const evidence = buildDemoEvidenceCoverage();
  return {
    entityName: "Demo Essential Entity",
    entitySector: "Digital Infrastructure",
    postureScore: posture.overallScore,
    measures: DEMO_COMPLIANCE_MEASURES,
    evidenceSummary: {
      total: evidence.totalItems,
      covered: evidence.coveredCount,
      coverageRate: evidence.coverageRate,
    },
    now: DEMO_COMPLIANCE_BASE_DATE.toISOString(),
    clock: DEMO_COMPLIANCE_BASE_DATE.toISOString(),
  };
}

/** Compute the demo audit-report view-model (mirrors auditReport output). */
export function buildDemoAuditReport(): AuditReportResponse {
  const posture = buildDemoCompliancePosture();
  const evidence = buildDemoEvidenceCoverage();

  const sections: AuditReportSection[] = [
    {
      key: "posture",
      title: "Overall posture",
      status: posture.status === "Strong" ? "pass" : posture.status === "Developing" ? "warn" : "fail",
    },
    {
      key: "measures",
      title: "Measure effectiveness",
      status: posture.statusCounts.atRisk + posture.statusCounts.critical > 0 ? "warn" : "pass",
    },
    {
      key: "evidence",
      title: "Evidence coverage",
      status: evidence.coverageRate >= 80 ? "pass" : evidence.coverageRate >= 50 ? "warn" : "fail",
    },
    {
      key: "gaps",
      title: "Top gaps",
      status: posture.topGaps.length > 0 ? "fail" : "pass",
    },
  ];

  const report = [
    "# NIS2 Continuous Compliance Audit Report",
    "",
    `**Entity:** Demo Essential Entity (Digital Infrastructure)`,
    `**Generated:** ${DEMO_COMPLIANCE_BASE_DATE.toISOString()}`,
    "",
    "## 1. Posture",
    `Overall compliance posture score is **${formatScore(posture.overallScore)}** (${posture.status}).`,
    `Mean drift vs baseline: **${formatDriftPts(posture.driftPts)}**.`,
    "",
    "## 2. Measure effectiveness",
    `Assessed ${posture.assessedMeasures} of ${posture.totalMeasures} measures. ` +
      `Strong: ${posture.statusCounts.strong}, Developing: ${posture.statusCounts.developing}, ` +
      `At Risk: ${posture.statusCounts.atRisk}, Critical: ${posture.statusCounts.critical}, ` +
      `No Data: ${posture.statusCounts.noData}.`,
    "",
    "## 3. Evidence",
    `Evidence coverage is **${formatRate(evidence.coverageRate)}** ` +
      `(${evidence.coveredCount} of ${evidence.totalItems} controls; ` +
      `${evidence.expiredCount} expired, ${evidence.expiringCount} expiring within 90 days).`,
    "",
    "## 4. Top gaps",
    ...(posture.topGaps.length > 0
      ? posture.topGaps.map((gap) => `- **${gap.name}** (${gap.status}) - score ${formatScore(gap.score)}`)
      : ["- No material gaps detected."]),
    "",
    `Recommendations: ${posture.topGaps.length} gap remediation actions scheduled for the next reporting cycle.`,
  ].join("\n");

  return {
    report,
    sections,
    generatedAt: DEMO_COMPLIANCE_BASE_DATE.toISOString(),
    postureScore: posture.overallScore,
    coverageRate: evidence.coverageRate,
    topGaps: posture.topGaps,
    recommendationCount: posture.topGaps.length,
  };
}

/** Input bundle for all three complianceMonitor queries in demo mode. */
export const DEMO_COMPLIANCE_INPUTS: {
  posture: CompliancePostureInput;
  evidenceCoverage: EvidenceCoverageInput;
  auditReport: AuditReportInput;
} = {
  posture: buildDemoCompliancePostureInput(),
  evidenceCoverage: buildDemoEvidenceCoverageInput(),
  auditReport: buildDemoAuditReportInput(),
};
