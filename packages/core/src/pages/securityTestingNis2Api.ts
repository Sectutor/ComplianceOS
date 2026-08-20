/**
 * NIS2 Advanced Security Testing - data contract + hooks
 * ========================================================
 * UI-side typed view of the `securityTestingNis2.*` tRPC procedures the
 * backend agent is building (registered as `securityTestingNis2:` on the
 * AppRouter in `packages/core/src/routers.ts`).
 *
 * NIS2 Implementation Plan Phase 5 Task 5.1 - NIS2 Art. 21(2)(e) (security
 * in network and information systems acquisition, development and
 * maintenance, including vulnerability handling and disclosure) with ENISA
 * Measure 6.7 (systematic testing, auditing and security exercises). The
 * four procedures power the "NIS2 Advanced Security Testing" section
 * (penetration test scheduler, red team exercise tracker, benchmark
 * compliance and scan coverage).
 *
 * COORDINATION BY CONVENTION (UI-STANDARD 16) - if the procedures are not
 * live yet the tRPC HTTP call 404s (NOT_FOUND) and the query surfaces an
 * error; every consumer in the UI degrades to a graceful EmptyState
 * ("Connect the securityTestingNis2.<procedure> API").
 *
 * ---------------------------------------------------------------------------
 * Expected procedures (all protected queries, pure - no DB access). The
 * contracts below mirror `lib/nis2/securityTesting.ts` + the zod input
 * schemas in `server/routers/securityTestingNis2.ts` 1:1 (reconciled cycle
 * 21 - the engine is the source of truth):
 *
 * 1) securityTestingNis2.planTest
 *    input:  { clientId, tests?: [{ id?, testType?, status?, riskTier?,
 *                                   scheduledDate?, lastCompletedAt?,
 *                                   windowHours? }] }
 *    output: { total,
 *              countsByStatus: { draft, scheduled, inProgress, completed,
 *                                reported, unknown },
 *              countsByType: { external, internal, webApp, api, mobile,
 *                              wireless, socialEngineering, physical,
 *                              redTeam, unknown },
 *              overdueCount, overdueTests: [{ id, testType, testTypeLabel,
 *                                             status, statusLabel,
 *                                             scheduledDate, windowHours,
 *                                             riskTier, frequency,
 *                                             nextDueDate, isOverdue }],
 *              tests: [{ id, testType, testTypeLabel, status, statusLabel,
 *                        scheduledDate, windowHours, riskTier, isOverdue,
 *                        frequency, nextDueDate }], updatedAt? }
 *            frequency: 'quarterly' | 'semi-annual' | 'annual' | 'biennial'
 *            (risk-tier driven: critical->quarterly, high->semi-annual,
 *             medium->annual, low/info->biennial, unknown->annual)
 *
 * 2) securityTestingNis2.redTeam
 *    input:  { clientId, name?, status?, startAt?, endAt?, verdict?,
 *              participants?: [{ id?, name?, role? }],
 *              phases?: [{ id?, name?, status?, startedAt?, completedAt?,
 *                          estimatedEndAt? }] }
 *    output: { name, status: 'not-started'|'active'|'paused'|'completed',
 *              verdict: 'no-breach'|'contained'|'breached'|'unknown',
 *              startAt, endAt,
 *              phases: [{ id, name, tacticCodes, status, statusBadge,
 *                         startedAt, completedAt, dueAt, isCurrent,
 *                         isOverdue }],   // 7 catalog phases, MITRE ATT&CK
 *              participants: [{ id, name, role, roleLabel }],
 *              participantCounts: { operator, observer, decisionMaker },
 *              summary: { totalPhases, activePhases, completedPhases,
 *                         pendingPhases, overduePhases },
 *              updatedAt? }
 *            phase ids: recon | weaponization | delivery | exploitation |
 *                       lateral-movement | exfiltration | reporting
 *
 * 3) securityTestingNis2.benchmarks
 *    input:  { clientId, assessments?: [{ benchmark?, category?,
 *                                         controlId?, controlName?,
 *                                         status? }] }
 *    output: { overallScore, passRate, totalApplicable, totalPass,
 *              totalFail, totalNa,
 *              categories: [{ benchmark, category, categoryName, pass,
 *                             fail, na, applicable, categoryScore }],
 *              topGaps: [{ benchmark, category, categoryName, controlId,
 *                          controlName, remediation }], updatedAt? }
 *            benchmark: 'cis' | 'nist' ;
 *            category: cis: ig1|ig2|ig3 ; nist: govern|identify|protect|
 *                      detect|respond|recover ;
 *            status: 'pass' | 'fail' | 'not-applicable' | 'na' | 'n-a'
 *
 * 4) securityTestingNis2.scanCoverage
 *    input:  { clientId, assets?: [{ id?, assetName?, assetClass?,
 *                                    scanFrequencyHours?, lastScanAt?,
 *                                    dueAt? }] }
 *    output: { totalAssets, coveredCount, overdueCount, coverageRate,
 *              byClass: [{ assetClass, assetClassName, total, covered,
 *                          overdue, coverageRate }],  // catalog order
 *              assets: [{ id, assetName, assetClass, assetClassName,
 *                         scanFrequencyHours, lastScanAt, dueAt, inSla,
 *                         isOverdue, daysOverdue }], updatedAt? }
 * ---------------------------------------------------------------------------
 */

import { trpc } from "@/lib/trpc";

/* ------------------------------------------------------------------ */
/* Types (mirror the backend contract 1:1, defensive on optionals)    */
/* ------------------------------------------------------------------ */

/** Lifecycle status of a planned penetration test. */
export type PenTestStatus = "draft" | "scheduled" | "in_progress" | "completed" | "reported" | "unknown";

/** Test type band used by the planTest scheduler. */
export type PenTestType =
  | "external"
  | "internal"
  | "web-app"
  | "api"
  | "mobile"
  | "wireless"
  | "social-engineering"
  | "physical"
  | "red-team"
  | "unknown";

/** Test recurrence cadence (recurrence window derived from `windowHours`). */
export type TestFrequency = "quarterly" | "semi-annual" | "annual" | "biennial";

/** Red team exercise lifecycle status. */
export type RedTeamExerciseStatus = "not-started" | "active" | "paused" | "completed";

/** Red team outcome verdict. */
export type RedTeamVerdict = "no-breach" | "contained" | "breached" | "unknown";

/** Lifecycle status of one kill-chain phase inside a red team exercise. */
export type RedTeamPhaseStatus = "pending" | "active" | "completed";

/** Participant role bands counted by the red team procedure. */
export type RedTeamParticipantRole = "operator" | "observer" | "decision-maker";

/** Benchmark framework understood by the benchmarks procedure. */
export type BenchmarkFramework = "cis" | "nist";

/** CIS Controls v8 implementation groups (engine output ids). */
export type CisCategory = "ig1" | "ig2" | "ig3";

/** NIST CSF 2.0 functions (engine output ids). */
export type NistCategory = "govern" | "identify" | "protect" | "detect" | "respond" | "recover";

/** Union of all benchmark categories across both frameworks. */
export type BenchmarkCategory = CisCategory | NistCategory;

/** Assessment result of one benchmark control. */
export type BenchmarkControlStatus = "pass" | "fail" | "not-applicable";

/** Asset class band used by the scan coverage procedure. */
export type AssetClass = "external-ip" | "internal-host" | "web-app" | "api" | "cloud-asset";

/** Badge variants actually supported by the Badge component. */
export type SecurityBadgeVariant =
  | "default"
  | "secondary"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "outline"
  | "destructive";

/** Data-viz score-bar fill (index.css .progress-* classes, UI-STANDARD 18). */
export type SecurityBarClass = "progress-success" | "progress-warning" | "progress-error";

/* --- securityTestingNis2.planTest -------------------------------------- */

/** One scheduled/completed test fed into the scheduler engine (input side). */
export interface PenTestInputItem {
  id?: string | number;
  title?: string;
  testType?: string;
  status?: string;
  /** Business criticality of the surface under test. */
  riskTier?: string;
  scheduledDate?: string | null;
  lastCompletedAt?: string | null;
  /** Recurrence window in hours; drives frequency + nextDueDate. */
  windowHours?: number | null;
}

/** Input of securityTestingNis2.planTest. */
export interface PenTestPlanInput {
  clientId: number;
  tests?: PenTestInputItem[];
}

/** Per-status counters returned by securityTestingNis2.planTest (camel keys). */
export interface PenTestByStatus {
  draft: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  reported: number;
  unknown: number;
}

/** Per-type counters returned by securityTestingNis2.planTest (camel keys). */
export interface PenTestByType {
  external: number;
  internal: number;
  webApp: number;
  api: number;
  mobile: number;
  wireless: number;
  socialEngineering: number;
  physical: number;
  redTeam: number;
  unknown: number;
}

/** One overdue test surfaced by the scheduler engine. */
export interface OverduePenTest {
  id: string | number;
  testType: PenTestType;
  testTypeLabel: string;
  status: PenTestStatus;
  statusLabel: string;
  scheduledDate: string | null;
  windowHours: number;
  riskTier: string;
  frequency: TestFrequency | null;
  nextDueDate: string | null;
  isOverdue: boolean;
}

/** One computed scheduler row returned by securityTestingNis2.planTest. */
export interface PenTestPlanItem {
  id: string | number;
  testType: PenTestType;
  testTypeLabel: string;
  status: PenTestStatus;
  /** Human-readable status label ("Scheduled", "In Progress", ...). */
  statusLabel: string;
  scheduledDate: string | null;
  windowHours: number;
  riskTier: string;
  /** True when the test is not completed/reported and its date has passed. */
  isOverdue: boolean;
  frequency: TestFrequency | null;
  /** lastCompletedAt + cadence (fallback scheduledDate); null when no dates. */
  nextDueDate: string | null;
}

/** Output of securityTestingNis2.planTest. */
export interface PenTestPlanResponse {
  total: number;
  countsByStatus: PenTestByStatus;
  countsByType: PenTestByType;
  overdueCount: number;
  overdueTests: OverduePenTest[];
  tests: PenTestPlanItem[];
  updatedAt: string | null;
}

/* --- securityTestingNis2.redTeam ---------------------------------------- */

/** One participant fed into the red team engine (input side). */
export interface RedTeamParticipantInput {
  id?: string | number;
  name?: string;
  role?: string;
}

/** One kill-chain phase fed into the red team engine (input side). */
export interface RedTeamPhaseInput {
  id?: string | number;
  name?: string;
  status?: string;
  startedAt?: string | null;
  completedAt?: string | null;
  estimatedEndAt?: string | null;
}

/** Exercise payload fed into the red team engine (input side). */
export interface RedTeamExerciseInputItem {
  id?: string | number;
  name?: string;
  startAt?: string | null;
  endAt?: string | null;
  status?: string;
  verdict?: string;
  participants?: RedTeamParticipantInput[];
  phases?: RedTeamPhaseInput[];
}

/** Input of securityTestingNis2.redTeam. */
export interface RedTeamInput {
  clientId: number;
  name?: string;
  status?: string;
  startAt?: string | null;
  endAt?: string | null;
  verdict?: string;
  participants?: RedTeamParticipantInput[];
  phases?: RedTeamPhaseInput[];
}

/** One computed kill-chain phase returned by securityTestingNis2.redTeam. */
export interface RedTeamPhase {
  id: string;
  name: string;
  tacticCodes: string[];
  status: RedTeamPhaseStatus;
  /** Human-readable status badge ("Pending", "Active", "Completed"). */
  statusBadge: string;
  startedAt: string | null;
  completedAt: string | null;
  /** estimatedEndAt (or exercise endAt when closer); null when unset. */
  dueAt: string | null;
  /** True for the first phase currently in progress. */
  isCurrent: boolean;
  /** True when an unfinished phase has passed its due date. */
  isOverdue: boolean;
}

/** One enriched participant returned by securityTestingNis2.redTeam. */
export interface RedTeamParticipant {
  id: string | number;
  name: string;
  role: RedTeamParticipantRole;
  /** Human-readable role label ("Operator", "Observer", "Decision Maker"). */
  roleLabel: string;
}

/** Per-role participant counters returned by securityTestingNis2.redTeam. */
export interface RedTeamParticipantCounts {
  operator: number;
  observer: number;
  decisionMaker: number;
}

/** Phase progress summary returned by securityTestingNis2.redTeam. */
export interface RedTeamSummary {
  totalPhases: number;
  activePhases: number;
  completedPhases: number;
  pendingPhases: number;
  overduePhases: number;
}

/** Output of securityTestingNis2.redTeam. */
export interface RedTeamExerciseResponse {
  name: string;
  status: RedTeamExerciseStatus;
  verdict: RedTeamVerdict;
  startAt: string | null;
  endAt: string | null;
  phases: RedTeamPhase[];
  participants: RedTeamParticipant[];
  participantCounts: RedTeamParticipantCounts;
  summary: RedTeamSummary;
  updatedAt: string | null;
}

/* --- securityTestingNis2.benchmarks ------------------------------------- */

/** One control assessment fed into the benchmark engine (input side). */
export interface BenchmarkAssessmentInputItem {
  id?: string | number;
  /** Framework the control belongs to: "cis" | "nist". */
  benchmark?: string;
  /** Category within the framework (IG1-IG3 / CSF 2.0 functions). */
  category?: string;
  controlId?: string;
  controlName?: string;
  status?: string;
}

/** Input of securityTestingNis2.benchmarks. */
export interface BenchmarkInput {
  clientId: number;
  assessments?: BenchmarkAssessmentInputItem[];
}

/** Per-category score returned by securityTestingNis2.benchmarks. */
export interface BenchmarkCategoryScore {
  benchmark: BenchmarkFramework;
  category: BenchmarkCategory;
  /** Human-readable category name ("IG1", "Govern", ...). */
  categoryName: string;
  pass: number;
  fail: number;
  /** Not-applicable count (excluded from the score). */
  na: number;
  /** pass + fail (excludes n/a). */
  applicable: number;
  /** 0-100, pass share of applicable controls (0 when none applicable). */
  categoryScore: number;
}

/** One remediation gap returned by securityTestingNis2.benchmarks. */
export interface BenchmarkGap {
  benchmark: BenchmarkFramework;
  category: BenchmarkCategory;
  /** Human-readable category name ("IG1", "Govern", ...). */
  categoryName: string;
  controlId: string;
  controlName: string;
  remediation: string;
}

/** Output of securityTestingNis2.benchmarks. */
export interface BenchmarkAssessmentResponse {
  /** 0-100 aggregate pass rate (pass / applicable). */
  overallScore: number;
  /** Percentage of applicable controls passing (0-100). */
  passRate: number;
  /** Controls assessed as pass or fail (excludes n/a). */
  totalApplicable: number;
  totalPass: number;
  totalFail: number;
  totalNa: number;
  categories: BenchmarkCategoryScore[];
  /** Failed controls sorted by category order then controlId asc, capped 5. */
  topGaps: BenchmarkGap[];
  updatedAt: string | null;
}

/* --- securityTestingNis2.scanCoverage ----------------------------------- */

/** One asset fed into the scan coverage engine (input side). */
export interface ScanAssetInput {
  id?: string | number;
  assetName?: string;
  assetClass?: string;
  /** SLA window between scans in hours. */
  scanFrequencyHours?: number | null;
  lastScanAt?: string | null;
  dueAt?: string | null;
}

/** Input of securityTestingNis2.scanCoverage. */
export interface ScanCoverageInput {
  clientId: number;
  assets?: ScanAssetInput[];
}

/** Per-asset-class coverage returned by securityTestingNis2.scanCoverage. */
export interface AssetClassCoverage {
  assetClass: AssetClass;
  /** Human-readable class label ("External IP", ...). */
  assetClassName: string;
  total: number;
  covered: number;
  overdue: number;
  /** Percentage of the class assets scanned within SLA (0-100). */
  coverageRate: number;
}

/** One computed asset row returned by securityTestingNis2.scanCoverage. */
export interface ScanCoverageItem {
  id: string | number;
  assetName: string;
  assetClass: AssetClass;
  assetClassName: string;
  scanFrequencyHours: number;
  lastScanAt: string | null;
  dueAt: string | null;
  /** True when the asset was scanned within its SLA window. */
  inSla: boolean;
  /** True when the next scan due date has passed. */
  isOverdue: boolean;
  /** Whole days past the due date (signed; <= 0 when not overdue). */
  daysOverdue: number;
}

/** Output of securityTestingNis2.scanCoverage. */
export interface ScanCoverageResponse {
  totalAssets: number;
  /** Assets scanned within their SLA window. */
  coveredCount: number;
  overdueCount: number;
  /** Percentage of all assets scanned within SLA (0-100). */
  coverageRate: number;
  /** Per-class rollups in catalog order. */
  byClass: AssetClassCoverage[];
  assets: ScanCoverageItem[];
  updatedAt: string | null;
}

/* ------------------------------------------------------------------ */
/* Empty shapes - stable defaults for degraded rendering (16)          */
/* ------------------------------------------------------------------ */

export const EMPTY_PEN_TEST_PLAN: PenTestPlanResponse = {
  total: 0,
  countsByStatus: { draft: 0, scheduled: 0, inProgress: 0, completed: 0, reported: 0, unknown: 0 },
  countsByType: {
    external: 0,
    internal: 0,
    webApp: 0,
    api: 0,
    mobile: 0,
    wireless: 0,
    socialEngineering: 0,
    physical: 0,
    redTeam: 0,
    unknown: 0,
  },
  overdueCount: 0,
  overdueTests: [],
  tests: [],
  updatedAt: null,
};

export const EMPTY_RED_TEAM_EXERCISE: RedTeamExerciseResponse = {
  name: "",
  status: "not-started",
  verdict: "unknown",
  startAt: null,
  endAt: null,
  phases: [],
  participants: [],
  participantCounts: { operator: 0, observer: 0, decisionMaker: 0 },
  summary: { totalPhases: 0, activePhases: 0, completedPhases: 0, pendingPhases: 0, overduePhases: 0 },
  updatedAt: null,
};

export const EMPTY_BENCHMARK_ASSESSMENT: BenchmarkAssessmentResponse = {
  overallScore: 0,
  passRate: 0,
  totalApplicable: 0,
  totalPass: 0,
  totalFail: 0,
  totalNa: 0,
  categories: [],
  topGaps: [],
  updatedAt: null,
};

const ZERO_CLASS_ROLLUPS: Array<{ assetClass: AssetClass; assetClassName: string }> = [
  { assetClass: "external-ip", assetClassName: "External IP" },
  { assetClass: "internal-host", assetClassName: "Internal Host" },
  { assetClass: "web-app", assetClassName: "Web Application" },
  { assetClass: "api", assetClassName: "API" },
  { assetClass: "cloud-asset", assetClassName: "Cloud Asset" },
];

const zeroClassCoverage = (rollup: { assetClass: AssetClass; assetClassName: string }): AssetClassCoverage => ({
  assetClass: rollup.assetClass,
  assetClassName: rollup.assetClassName,
  total: 0,
  covered: 0,
  overdue: 0,
  coverageRate: 0,
});

export const EMPTY_SCAN_COVERAGE: ScanCoverageResponse = {
  totalAssets: 0,
  coveredCount: 0,
  overdueCount: 0,
  coverageRate: 0,
  byClass: ZERO_CLASS_ROLLUPS.map(zeroClassCoverage),
  assets: [],
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

interface SecurityTestingNis2Trpc {
  securityTestingNis2: {
    planTest: {
      useQuery: (input: PenTestPlanInput, opts?: QueryOptions) => QueryLike<PenTestPlanResponse>;
    };
    redTeam: {
      useQuery: (input: RedTeamInput, opts?: QueryOptions) => QueryLike<RedTeamExerciseResponse>;
    };
    benchmarks: {
      useQuery: (input: BenchmarkInput, opts?: QueryOptions) => QueryLike<BenchmarkAssessmentResponse>;
    };
    scanCoverage: {
      useQuery: (input: ScanCoverageInput, opts?: QueryOptions) => QueryLike<ScanCoverageResponse>;
    };
  };
}

const securityTestingNis2Api = trpc as unknown as SecurityTestingNis2Trpc;

/** Placeholder inputs used only while a query is disabled (never rendered). */
const HIDDEN_PEN_TEST_PLAN_INPUT: PenTestPlanInput = { clientId: 0, tests: [] };
const HIDDEN_RED_TEAM_INPUT: RedTeamInput = { clientId: 0 };
const HIDDEN_BENCHMARK_INPUT: BenchmarkInput = { clientId: 0, assessments: [] };
const HIDDEN_SCAN_COVERAGE_INPUT: ScanCoverageInput = { clientId: 0, assets: [] };

/* ------------------------------------------------------------------ */
/* Hooks - retry: false, enabled: clientId > 0 (UI-STANDARD 16)        */
/* ------------------------------------------------------------------ */

/**
 * Penetration test schedule (totals per status/type, overdue tests and the
 * computed scheduler rows with frequency + next due date). Client-scoped -
 * pass null for `input` to keep the query disabled.
 */
export function usePenTestPlan(
  clientId: number,
  input: PenTestPlanInput | null,
  enabled = true
): QueryLike<PenTestPlanResponse> {
  return securityTestingNis2Api.securityTestingNis2.planTest.useQuery(
    input ?? HIDDEN_PEN_TEST_PLAN_INPUT,
    {
      enabled: enabled && clientId > 0 && input !== null,
      retry: false,
      staleTime: 30_000,
    }
  );
}

/**
 * Red team exercise tracker (status, verdict, kill-chain phase progress and
 * participant counts). Client-scoped - pass null for `input` to keep the
 * query disabled.
 */
export function useRedTeamExercise(
  clientId: number,
  input: RedTeamInput | null,
  enabled = true
): QueryLike<RedTeamExerciseResponse> {
  return securityTestingNis2Api.securityTestingNis2.redTeam.useQuery(input ?? HIDDEN_RED_TEAM_INPUT, {
    enabled: enabled && clientId > 0 && input !== null,
    retry: false,
    staleTime: 30_000,
  });
}

/**
 * Benchmark compliance (CIS Controls v8 + NIST CSF 2.0 category scores and
 * top remediation gaps). Client-scoped - pass null for `input` to keep the
 * query disabled.
 */
export function useBenchmarkAssessment(
  clientId: number,
  input: BenchmarkInput | null,
  enabled = true
): QueryLike<BenchmarkAssessmentResponse> {
  return securityTestingNis2Api.securityTestingNis2.benchmarks.useQuery(
    input ?? HIDDEN_BENCHMARK_INPUT,
    {
      enabled: enabled && clientId > 0 && input !== null,
      retry: false,
      staleTime: 30_000,
    }
  );
}

/**
 * Scan coverage (assets covered within SLA per class + overdue asset list).
 * Client-scoped - pass null for `input` to keep the query disabled.
 */
export function useScanCoverage(
  clientId: number,
  input: ScanCoverageInput | null,
  enabled = true
): QueryLike<ScanCoverageResponse> {
  return securityTestingNis2Api.securityTestingNis2.scanCoverage.useQuery(
    input ?? HIDDEN_SCAN_COVERAGE_INPUT,
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

export interface TypeMeta {
  label: string;
  badgeVariant: SecurityBadgeVariant;
}

/** Test type -> badge label + variant. */
export const TEST_TYPE_META: Record<PenTestType, TypeMeta> = {
  external: { label: "External", badgeVariant: "info" },
  internal: { label: "Internal", badgeVariant: "secondary" },
  "web-app": { label: "Web App", badgeVariant: "default" },
  api: { label: "API", badgeVariant: "outline" },
  mobile: { label: "Mobile", badgeVariant: "secondary" },
  wireless: { label: "Wireless", badgeVariant: "secondary" },
  "social-engineering": { label: "Social Engineering", badgeVariant: "warning" },
  physical: { label: "Physical", badgeVariant: "default" },
  "red-team": { label: "Red Team", badgeVariant: "error" },
  unknown: { label: "Unknown", badgeVariant: "outline" },
};

/** Stable render order for the type breakdown rows. */
export const TEST_TYPE_ORDER: PenTestType[] = [
  "external",
  "internal",
  "web-app",
  "api",
  "mobile",
  "wireless",
  "social-engineering",
  "physical",
  "red-team",
  "unknown",
];

export interface PenStatusMeta {
  label: string;
  badgeVariant: SecurityBadgeVariant;
}

/** Test lifecycle status -> badge label + variant. */
export const PEN_STATUS_META: Record<PenTestStatus, PenStatusMeta> = {
  draft: { label: "Draft", badgeVariant: "secondary" },
  scheduled: { label: "Scheduled", badgeVariant: "info" },
  in_progress: { label: "In Progress", badgeVariant: "warning" },
  completed: { label: "Completed", badgeVariant: "success" },
  reported: { label: "Reported", badgeVariant: "default" },
  unknown: { label: "Unknown", badgeVariant: "outline" },
};

/**
 * Look up status meta from a computed `statusLabel` (the planTest output
 * rows carry the label, not the raw key) - defensive fallback to unknown.
 */
export function penStatusMetaForLabel(statusLabel: string): PenStatusMeta {
  const entry = (Object.keys(PEN_STATUS_META) as PenTestStatus[]).find(
    (key) => PEN_STATUS_META[key].label === statusLabel
  );
  return entry ? PEN_STATUS_META[entry] : PEN_STATUS_META.unknown;
}

export interface FrequencyMeta {
  label: string;
  badgeVariant: SecurityBadgeVariant;
}

/** Test recurrence cadence -> badge label + variant. */
export const FREQUENCY_META: Record<TestFrequency, FrequencyMeta> = {
  quarterly: { label: "Quarterly", badgeVariant: "default" },
  "semi-annual": { label: "Semi-Annual", badgeVariant: "info" },
  annual: { label: "Annual", badgeVariant: "secondary" },
  biennial: { label: "Biennial", badgeVariant: "outline" },
};

export interface PhaseStatusMeta {
  label: string;
  badgeVariant: SecurityBadgeVariant;
}

/** Kill-chain phase lifecycle -> badge label + variant. */
export const PHASE_STATUS_META: Record<RedTeamPhaseStatus, PhaseStatusMeta> = {
  pending: { label: "Pending", badgeVariant: "secondary" },
  active: { label: "Active", badgeVariant: "warning" },
  completed: { label: "Completed", badgeVariant: "success" },
};

/**
 * Red team kill chain - the 7 ordered steps rendered by the phase tracker,
 * each with the MITRE ATT&CK tactic codes typically exercised at that stage.
 */
export const KILL_CHAIN_STEPS: { name: string; tacticCodes: string[] }[] = [
  { name: "Reconnaissance", tacticCodes: ["TA0043"] },
  { name: "Weaponization", tacticCodes: ["TA0042"] },
  { name: "Delivery", tacticCodes: ["TA0001"] },
  { name: "Exploitation", tacticCodes: ["TA0002", "TA0004"] },
  { name: "Lateral Movement", tacticCodes: ["TA0008"] },
  { name: "Exfiltration", tacticCodes: ["TA0010"] },
  { name: "Reporting", tacticCodes: [] },
];

export interface RedTeamPhaseMeta {
  label: string;
  badgeVariant: SecurityBadgeVariant;
  /** MITRE ATT&CK tactic codes for the step (chips rendered next to it). */
  tacticCodes: string[];
}

/** Kill-chain step name -> tracker meta (unknown names fall back safely). */
export const RED_TEAM_PHASE_META: Record<string, RedTeamPhaseMeta> = {
  Reconnaissance: { label: "Reconnaissance", badgeVariant: "secondary", tacticCodes: ["TA0043"] },
  Weaponization: { label: "Weaponization", badgeVariant: "secondary", tacticCodes: ["TA0042"] },
  Delivery: { label: "Delivery", badgeVariant: "info", tacticCodes: ["TA0001"] },
  Exploitation: { label: "Exploitation", badgeVariant: "warning", tacticCodes: ["TA0002", "TA0004"] },
  "Lateral Movement": { label: "Lateral Movement", badgeVariant: "warning", tacticCodes: ["TA0008"] },
  Exfiltration: { label: "Exfiltration", badgeVariant: "error", tacticCodes: ["TA0010"] },
  Reporting: { label: "Reporting", badgeVariant: "success", tacticCodes: [] },
};

export interface ExerciseStatusMeta {
  label: string;
  badgeVariant: SecurityBadgeVariant;
}

/** Red team exercise lifecycle -> badge label + variant. */
export const EXERCISE_STATUS_META: Record<RedTeamExerciseStatus, ExerciseStatusMeta> = {
  "not-started": { label: "Not Started", badgeVariant: "secondary" },
  active: { label: "Active", badgeVariant: "warning" },
  paused: { label: "Paused", badgeVariant: "info" },
  completed: { label: "Completed", badgeVariant: "success" },
};

export interface VerdictMeta {
  label: string;
  badgeVariant: SecurityBadgeVariant;
}

/** Red team outcome verdict -> badge label + variant. */
export const VERDICT_META: Record<RedTeamVerdict, VerdictMeta> = {
  "no-breach": { label: "No Breach", badgeVariant: "success" },
  contained: { label: "Contained", badgeVariant: "warning" },
  breached: { label: "Breached", badgeVariant: "error" },
  unknown: { label: "Unknown", badgeVariant: "outline" },
};

export interface BenchmarkCategoryMeta {
  label: string;
  badgeVariant: SecurityBadgeVariant;
}

/** Benchmark category -> badge label + variant (engine output ids). */
export const BENCHMARK_CATEGORY_META: Record<BenchmarkCategory, BenchmarkCategoryMeta> = {
  ig1: { label: "IG1", badgeVariant: "default" },
  ig2: { label: "IG2", badgeVariant: "secondary" },
  ig3: { label: "IG3", badgeVariant: "outline" },
  govern: { label: "Govern", badgeVariant: "default" },
  identify: { label: "Identify", badgeVariant: "warning" },
  protect: { label: "Protect", badgeVariant: "info" },
  detect: { label: "Detect", badgeVariant: "warning" },
  respond: { label: "Respond", badgeVariant: "secondary" },
  recover: { label: "Recover", badgeVariant: "success" },
};

export interface BenchmarkMeta {
  label: string;
  /** Stable render order of the framework's categories (weakest first). */
  categories: BenchmarkCategory[];
}

/** CIS Controls v8 categories (implementation groups). */
export const CIS_CATEGORY_ORDER: BenchmarkCategory[] = ["ig1", "ig2", "ig3"];

/** NIST CSF 2.0 functions. */
export const NIST_CATEGORY_ORDER: BenchmarkCategory[] = [
  "govern",
  "identify",
  "protect",
  "detect",
  "respond",
  "recover",
];

/** Framework -> label + category render order. */
export const BENCHMARK_META: Record<BenchmarkFramework, BenchmarkMeta> = {
  cis: { label: "CIS Controls v8", categories: CIS_CATEGORY_ORDER },
  nist: { label: "NIST CSF 2.0", categories: NIST_CATEGORY_ORDER },
};

/** Stable render order across both frameworks (CIS first, weakest first). */
export const BENCHMARK_CATEGORY_ORDER: BenchmarkCategory[] = [
  "ig1",
  "ig2",
  "ig3",
  "govern",
  "identify",
  "protect",
  "detect",
  "respond",
  "recover",
];

export interface AssetClassMeta {
  label: string;
  badgeVariant: SecurityBadgeVariant;
}

/** Asset class -> badge label + variant. */
export const ASSET_CLASS_META: Record<AssetClass, AssetClassMeta> = {
  "external-ip": { label: "External IP", badgeVariant: "info" },
  "internal-host": { label: "Internal Host", badgeVariant: "default" },
  "web-app": { label: "Web App", badgeVariant: "secondary" },
  api: { label: "API", badgeVariant: "outline" },
  "cloud-asset": { label: "Cloud Asset", badgeVariant: "secondary" },
};

/** Stable render order for the per-class coverage rows. */
export const ASSET_CLASS_ORDER: AssetClass[] = [
  "external-ip",
  "internal-host",
  "web-app",
  "api",
  "cloud-asset",
];

/** Map a coverage rate / benchmark score to a score-bar fill. */
export function coverageBarClass(rate: number): SecurityBarClass {
  if (rate >= 90) return "progress-success";
  if (rate >= 60) return "progress-warning";
  return "progress-error";
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Human-readable next-due label for a scheduler row ("Oct 1, 2026"). */
export function formatNextDueDate(date: string | null): string {
  if (!date) return "TBD";
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "TBD";
  return parsed.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/** Normalize a raw string into a test-type band (defensive fallback). */
export function normalizeTestType(type: string | undefined | null): PenTestType {
  const t = (type ?? "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  if (TEST_TYPE_META[t as PenTestType]) return t as PenTestType;
  return "unknown";
}

/** Normalize a raw string into a test-status band (defensive fallback). */
export function normalizePenStatus(status: string | undefined | null): PenTestStatus {
  const s = (status ?? "").toLowerCase().replace(/-/g, "_");
  if (PEN_STATUS_META[s as PenTestStatus]) return s as PenTestStatus;
  return "unknown";
}

/** Normalize a raw string into a scan asset class (defensive fallback). */
export function normalizeAssetClass(assetClass: string | undefined | null): AssetClass {
  const a = (assetClass ?? "").toLowerCase().trim();
  if (ASSET_CLASS_META[a as AssetClass]) return a as AssetClass;
  return "external-ip";
}

/* ------------------------------------------------------------------ */
/* Demo mode (UI-STANDARD 17) - sample data, never fake primary state  */
/* ------------------------------------------------------------------ */

/**
 * Fixed demo clock so the advanced-testing demo is deterministic: every
 * scheduledDate / dueAt / lastScanAt and derived stat is computed from this
 * instant.
 */
export const DEMO_SECURITY_TESTING_BASE_DATE = new Date("2026-10-01T00:00:00.000Z");

const demoDate = (daysFromBase: number): string =>
  new Date(DEMO_SECURITY_TESTING_BASE_DATE.getTime() + daysFromBase * 86_400_000).toISOString();

const DAY_MS = 86_400_000;

/* --- Demo pen test scheduler ------------------------------------------- */

/** Sample tests fed into the scheduler engine (input side). */
export const DEMO_PEN_TESTS: PenTestInputItem[] = [
  {
    id: 1,
    title: "Annual External Penetration Test",
    testType: "external",
    status: "completed",
    riskTier: "high",
    scheduledDate: demoDate(-20),
    lastCompletedAt: demoDate(-370),
    windowHours: 8760,
  },
  {
    id: 2,
    title: "Quarterly Web Application Assessment",
    testType: "web-app",
    status: "scheduled",
    riskTier: "high",
    scheduledDate: demoDate(12),
    lastCompletedAt: demoDate(-78),
    windowHours: 2160,
  },
  {
    id: 3,
    title: "Internal Infrastructure Assessment",
    testType: "internal",
    status: "in_progress",
    riskTier: "medium",
    scheduledDate: demoDate(-2),
    lastCompletedAt: demoDate(-182),
    windowHours: 4380,
  },
  {
    id: 4,
    title: "API Security Assessment",
    testType: "api",
    status: "scheduled",
    riskTier: "high",
    scheduledDate: demoDate(20),
    lastCompletedAt: demoDate(-66),
    windowHours: 2160,
  },
  {
    id: 5,
    title: "Mobile Application Test",
    testType: "mobile",
    status: "draft",
    riskTier: "medium",
    scheduledDate: demoDate(45),
    windowHours: 8760,
  },
  {
    id: 6,
    title: "Wireless Network Assessment",
    testType: "wireless",
    status: "scheduled",
    riskTier: "low",
    scheduledDate: demoDate(-40),
    lastCompletedAt: demoDate(-130),
    windowHours: 2160,
  },
  {
    id: 7,
    title: "Social Engineering Exercise",
    testType: "social-engineering",
    status: "reported",
    riskTier: "medium",
    scheduledDate: demoDate(-35),
    lastCompletedAt: demoDate(-210),
    windowHours: 4380,
  },
  {
    id: 8,
    title: "Physical Security Assessment",
    testType: "physical",
    status: "draft",
    riskTier: "low",
    scheduledDate: demoDate(90),
    windowHours: 17520,
  },
  {
    id: 9,
    title: "Red Team Exercise",
    testType: "red-team",
    status: "in_progress",
    riskTier: "critical",
    scheduledDate: demoDate(-5),
    lastCompletedAt: demoDate(-370),
    windowHours: 8760,
  },
  {
    id: 10,
    title: "External Infrastructure Scan",
    testType: "external",
    status: "scheduled",
    riskTier: "high",
    scheduledDate: demoDate(-50),
    lastCompletedAt: demoDate(-95),
    windowHours: 2160,
  },
];

/** Recurrence band from a window in hours (mirrors the engine's banding). */
function frequencyForWindow(windowHours: number | null | undefined): TestFrequency | null {
  if (!windowHours || windowHours <= 0) return null;
  const days = windowHours / 24;
  if (days <= 91) return "quarterly";
  if (days <= 182) return "semi-annual";
  if (days <= 366) return "annual";
  return "biennial";
}

/** Input object for securityTestingNis2.planTest in demo mode. */
export function buildDemoPenTestInput(): PenTestPlanInput {
  return { clientId: 0, tests: DEMO_PEN_TESTS };
}

/** Compute the demo scheduler view-model (mirrors planTest output). */
export function buildDemoPenTestPlan(): PenTestPlanResponse {
  const countsByStatus: PenTestByStatus = {
    draft: 0,
    scheduled: 0,
    inProgress: 0,
    completed: 0,
    reported: 0,
    unknown: 0,
  };
  const countsByType: PenTestByType = {
    external: 0,
    internal: 0,
    webApp: 0,
    api: 0,
    mobile: 0,
    wireless: 0,
    socialEngineering: 0,
    physical: 0,
    redTeam: 0,
    unknown: 0,
  };
  const overdueTests: OverduePenTest[] = [];
  const tests: PenTestPlanItem[] = [];

  for (const input of DEMO_PEN_TESTS) {
    const status = normalizePenStatus(input.status);
    const testType = normalizeTestType(input.testType);
    countsByStatus[status === "in_progress" ? "inProgress" : status] += 1;
    countsByType[testType === "web-app" ? "webApp" : testType === "social-engineering" ? "socialEngineering" : testType === "red-team" ? "redTeam" : testType] += 1;

    const frequency = frequencyForWindow(input.windowHours);
    const scheduled = input.scheduledDate ? new Date(input.scheduledDate).getTime() : null;
    const notFinished = status === "draft" || status === "scheduled" || status === "in_progress";
    const isOverdue = notFinished && scheduled !== null && scheduled < DEMO_SECURITY_TESTING_BASE_DATE.getTime();
    const windowHours = input.windowHours ?? 336;
    const statusLabel = PEN_STATUS_META[status].label;
    const nextDueDate =
      scheduled !== null && input.windowHours && input.windowHours > 0
        ? new Date(scheduled + input.windowHours * 3_600_000).toISOString()
        : null;

    if (isOverdue) {
      overdueTests.push({
        id: input.id ?? 0,
        testType,
        testTypeLabel: TEST_TYPE_META[testType].label,
        status,
        statusLabel,
        scheduledDate: input.scheduledDate ?? null,
        windowHours,
        riskTier: input.riskTier ?? "unknown",
        frequency,
        nextDueDate,
        isOverdue,
      });
    }

    tests.push({
      id: input.id ?? 0,
      testType,
      testTypeLabel: TEST_TYPE_META[testType].label,
      status,
      statusLabel,
      scheduledDate: input.scheduledDate ?? null,
      windowHours,
      riskTier: input.riskTier ?? "unknown",
      isOverdue,
      frequency,
      nextDueDate,
    });
  }

  return {
    total: DEMO_PEN_TESTS.length,
    countsByStatus,
    countsByType,
    overdueCount: overdueTests.length,
    overdueTests,
    tests,
    updatedAt: DEMO_SECURITY_TESTING_BASE_DATE.toISOString(),
  };
}

/* --- Demo red team exercise -------------------------------------------- */

/** Sample red team exercise fed into the tracker engine (input side). */
export const DEMO_RED_TEAM_EXERCISE: RedTeamExerciseInputItem = {
  id: "rt-2026-q4",
  name: "Project Night Ops",
  startAt: demoDate(-10),
  endAt: demoDate(20),
  status: "active",
  participants: [
    { name: "A. Kessler", role: "operator" },
    { name: "J. Okafor", role: "operator" },
    { name: "M. Delacroix", role: "operator" },
    { name: "S. Yamamoto", role: "observer" },
    { name: "P. Novak", role: "observer" },
    { name: "L. Ibrahim", role: "observer" },
    { name: "R. Chen", role: "observer" },
    { name: "D. Weber", role: "decision-maker" },
    { name: "T. Andersson", role: "decision-maker" },
  ],
  phases: [
    {
      id: "recon",
      name: "Reconnaissance",
      status: "completed",
      startedAt: demoDate(-10),
      completedAt: demoDate(-7),
      estimatedEndAt: demoDate(-7),
    },
    {
      id: "weaponization",
      name: "Weaponization",
      status: "completed",
      startedAt: demoDate(-7),
      completedAt: demoDate(-5),
      estimatedEndAt: demoDate(-5),
    },
    {
      id: "delivery",
      name: "Delivery",
      status: "completed",
      startedAt: demoDate(-5),
      completedAt: demoDate(-3),
      estimatedEndAt: demoDate(-3),
    },
    {
      id: "exploitation",
      name: "Exploitation",
      status: "active",
      startedAt: demoDate(-3),
      estimatedEndAt: demoDate(2),
    },
    {
      id: "lateral-movement",
      name: "Lateral Movement",
      status: "pending",
      estimatedEndAt: demoDate(-1),
    },
    {
      id: "exfiltration",
      name: "Exfiltration",
      status: "pending",
      estimatedEndAt: demoDate(12),
    },
    {
      id: "reporting",
      name: "Reporting",
      status: "pending",
      estimatedEndAt: demoDate(20),
    },
  ],
};

/** Input object for securityTestingNis2.redTeam in demo mode. */
export function buildDemoRedTeamInput(): RedTeamInput {
  return { clientId: 0, ...DEMO_RED_TEAM_EXERCISE };
}

/** Compute the demo red team view-model (mirrors redTeam output). */
export function buildDemoRedTeamExercise(): RedTeamExerciseResponse {
  const phases: RedTeamPhase[] = (DEMO_RED_TEAM_EXERCISE.phases ?? []).map((phase, index) => {
    const status: RedTeamPhaseStatus = ["pending", "active", "completed"].includes(
      phase.status ?? ""
    )
      ? (phase.status as RedTeamPhaseStatus)
      : "pending";
    const dueAt = phase.estimatedEndAt ? new Date(phase.estimatedEndAt).getTime() : null;
    const unfinished = status === "pending" || status === "active";
    return {
      id: String(phase.id ?? index),
      name: phase.name ?? `Phase ${index + 1}`,
      tacticCodes:
        RED_TEAM_PHASE_META[phase.name ?? ""]?.tacticCodes ??
        KILL_CHAIN_STEPS.find((step) => step.name === phase.name)?.tacticCodes ??
        [],
      status,
      statusBadge: PHASE_STATUS_META[status].label,
      startedAt: phase.startedAt ?? null,
      completedAt: phase.completedAt ?? null,
      dueAt: dueAt !== null ? new Date(dueAt).toISOString() : null,
      isCurrent: status === "active",
      isOverdue:
        unfinished && dueAt !== null && dueAt < DEMO_SECURITY_TESTING_BASE_DATE.getTime(),
    };
  });

  const counts: RedTeamParticipantCounts = { operator: 0, observer: 0, decisionMaker: 0 };
  for (const participant of DEMO_RED_TEAM_EXERCISE.participants ?? []) {
    const role = participant.role ?? "";
    if (role === "operator" || role === "observer" || role === "decision-maker") {
      counts[role === "decision-maker" ? "decisionMaker" : role] += 1;
    }
  }

  const status: RedTeamExerciseStatus =
    DEMO_RED_TEAM_EXERCISE.status === "paused"
      ? "paused"
      : phases.some((p) => p.status === "active")
        ? "active"
        : "not-started";

  return {
    name: DEMO_RED_TEAM_EXERCISE.name ?? "",
    status,
    verdict: "contained",
    startAt: DEMO_RED_TEAM_EXERCISE.startAt ?? null,
    endAt: DEMO_RED_TEAM_EXERCISE.endAt ?? null,
    phases,
    participants: (DEMO_RED_TEAM_EXERCISE.participants ?? []).map((participant, index) => ({
      id: participant.id ?? index,
      name: participant.name ?? `Participant ${index + 1}`,
      role: ["operator", "observer", "decision-maker"].includes(participant.role ?? "")
        ? (participant.role as RedTeamParticipantRole)
        : "observer",
      roleLabel:
        participant.role === "decision-maker"
          ? "Decision Maker"
          : participant.role === "operator"
            ? "Operator"
            : "Observer",
    })),
    participantCounts: counts,
    summary: {
      totalPhases: phases.length,
      activePhases: phases.filter((p) => p.status === "active").length,
      completedPhases: phases.filter((p) => p.status === "completed").length,
      pendingPhases: phases.filter((p) => p.status === "pending").length,
      overduePhases: phases.filter((p) => p.isOverdue).length,
    },
    updatedAt: DEMO_SECURITY_TESTING_BASE_DATE.toISOString(),
  };
}

/* --- Demo benchmark assessment ------------------------------------------ */

/** Sample control assessments fed into the benchmark engine (input side). */
export const DEMO_BENCHMARK_ASSESSMENTS: BenchmarkAssessmentInputItem[] = [
  // CIS Controls v8 - IG1
  {
    id: "c1",
    benchmark: "cis",
    category: "IG1",
    controlId: "CIS-1.1",
    controlName: "Establish and Maintain Detailed Enterprise Asset Inventory",
    status: "pass",
  },
  {
    id: "c2",
    benchmark: "cis",
    category: "IG1",
    controlId: "CIS-1.2",
    controlName: "Establish and Maintain a Detailed Software Inventory",
    status: "fail",
  },
  {
    id: "c3",
    benchmark: "cis",
    category: "IG1",
    controlId: "CIS-1.4",
    controlName: "Establish and Maintain a Secure Configuration Process",
    status: "fail",
  },
  {
    id: "c4",
    benchmark: "cis",
    category: "IG1",
    controlId: "CIS-5.2",
    controlName: "Use Unique Passwords",
    status: "pass",
  },
  // CIS Controls v8 - IG2
  {
    id: "c5",
    benchmark: "cis",
    category: "IG2",
    controlId: "CIS-6.8",
    controlName: "Define and Maintain Role-Based Access Control",
    status: "pass",
  },
  {
    id: "c6",
    benchmark: "cis",
    category: "IG2",
    controlId: "CIS-8.2",
    controlName: "Collect Audit Logs",
    status: "fail",
  },
  {
    id: "c7",
    benchmark: "cis",
    category: "IG2",
    controlId: "CIS-10.1",
    controlName: "Deploy Anti-Malware Software",
    status: "fail",
  },
  {
    id: "c8",
    benchmark: "cis",
    category: "IG2",
    controlId: "CIS-5.6",
    controlName: "Centralize Account Management",
    status: "pass",
  },
  // CIS Controls v8 - IG3
  {
    id: "c9",
    benchmark: "cis",
    category: "IG3",
    controlId: "CIS-11.1",
    controlName: "Establish and Maintain a Data Recovery Process",
    status: "pass",
  },
  {
    id: "c10",
    benchmark: "cis",
    category: "IG3",
    controlId: "CIS-12.2",
    controlName: "Establish and Maintain a Secure Network Architecture",
    status: "n-a",
  },
  // NIST CSF 2.0
  {
    id: "n1",
    benchmark: "nist",
    category: "Govern",
    controlId: "GV.RM-01",
    controlName: "Cybersecurity Risk Management Strategy",
    status: "pass",
  },
  {
    id: "n2",
    benchmark: "nist",
    category: "Identify",
    controlId: "ID.AM-01",
    controlName: "Asset Inventories Maintained",
    status: "fail",
  },
  {
    id: "n3",
    benchmark: "nist",
    category: "Protect",
    controlId: "PR.AA-01",
    controlName: "Access Control for Authorized Users",
    status: "pass",
  },
  {
    id: "n4",
    benchmark: "nist",
    category: "Protect",
    controlId: "PR.DS-01",
    controlName: "Data at Rest Protection",
    status: "fail",
  },
  {
    id: "n5",
    benchmark: "nist",
    category: "Detect",
    controlId: "DE.CM-01",
    controlName: "Continuous Monitoring of Networks",
    status: "fail",
  },
  {
    id: "n6",
    benchmark: "nist",
    category: "Respond",
    controlId: "RS.MA-01",
    controlName: "Incident Response Plan Executed",
    status: "pass",
  },
  {
    id: "n7",
    benchmark: "nist",
    category: "Recover",
    controlId: "RC.RP-01",
    controlName: "Recovery Plan Executed",
    status: "pass",
  },
];

/** Demo remediation copy keyed by controlId (top-gap cards, §17 sample). */
const DEMO_GAP_REMEDIATION: Record<string, string> = {
  "CIS-1.2":
    "Deploy automated software inventory tooling and reconcile it monthly against procurement and asset records.",
  "CIS-1.4":
    "Implement a secure configuration baseline from CIS Benchmarks and enforce drift detection on all enterprise assets.",
  "CIS-8.2":
    "Centralize audit logs into the SIEM and retain them for at least 12 months per the retention policy.",
  "CIS-10.1":
    "Deploy managed anti-malware on all endpoints and enforce signature auto-updates within 24h of release.",
  "ID.AM-01":
    "Complete the asset inventory with owner, data classification and network zone for every device.",
  "PR.DS-01":
    "Enable encryption at rest for databases and object storage; inventory any unencrypted sensitive data stores.",
  "DE.CM-01":
    "Enable continuous monitoring of network and endpoint telemetry and alert on any coverage gaps.",
};

/** Fallback remediation text for gaps without canned copy. */
function demoRemediationFor(controlName: string): string {
  return `Remediate "${controlName}" per the benchmark guidance and document the corrective action before the next assessment.`;
}

/** Priority order for the top-gap sort (ig1 first, then ig2/ig3, NIST). */
const GAP_CATEGORY_RANK: Record<string, number> = {
  ig1: 0,
  ig2: 1,
  ig3: 2,
  govern: 3,
  identify: 4,
  protect: 5,
  detect: 6,
  respond: 7,
  recover: 8,
};

/** Normalize a raw category string into a benchmark category (fallback). */
function normalizeBenchmarkCategory(category: string | undefined | null): BenchmarkCategory | null {
  const c = (category ?? "").trim();
  if (BENCHMARK_CATEGORY_META[c as BenchmarkCategory]) return c as BenchmarkCategory;
  return null;
}

/** Input object for securityTestingNis2.benchmarks in demo mode. */
export function buildDemoBenchmarkInput(): BenchmarkInput {
  return { clientId: 0, assessments: DEMO_BENCHMARK_ASSESSMENTS };
}

/** Compute the demo benchmark view-model (mirrors benchmarks output). */
export function buildDemoBenchmarkAssessment(): BenchmarkAssessmentResponse {
  const categoryScores = new Map<BenchmarkCategory, { pass: number; fail: number; na: number }>();
  for (const category of BENCHMARK_CATEGORY_ORDER) {
    categoryScores.set(category, { pass: 0, fail: 0, na: 0 });
  }
  const gaps: BenchmarkGap[] = [];

  for (const assessment of DEMO_BENCHMARK_ASSESSMENTS) {
    const category = normalizeBenchmarkCategory(assessment.category);
    if (!category) continue;
    const bucket = categoryScores.get(category) ?? { pass: 0, fail: 0, na: 0 };
    const status = (assessment.status ?? "unknown").toLowerCase();
    if (status === "pass") bucket.pass += 1;
    else if (status === "fail") {
      bucket.fail += 1;
      gaps.push({
        benchmark: assessment.benchmark === "nist" ? "nist" : "cis",
        category,
        categoryName: BENCHMARK_CATEGORY_META[category].label,
        controlId: assessment.controlId ?? "",
        controlName: assessment.controlName ?? "Untitled control",
        remediation: DEMO_GAP_REMEDIATION[assessment.controlId ?? ""] ?? demoRemediationFor(assessment.controlName ?? ""),
      });
    } else if (status === "n-a" || status === "not-applicable" || status === "na") bucket.na += 1;
    // unknown statuses are skipped by the engine -> skip here too
    categoryScores.set(category, bucket);
  }

  const categories: BenchmarkCategoryScore[] = BENCHMARK_CATEGORY_ORDER.map((category) => {
    const bucket = categoryScores.get(category) ?? { pass: 0, fail: 0, na: 0 };
    const applicable = bucket.pass + bucket.fail;
    const categoryScore = applicable === 0 ? 0 : Math.round((bucket.pass / applicable) * 1000) / 10;
    return {
      benchmark: category === "ig1" || category === "ig2" || category === "ig3" ? "cis" : "nist",
      category,
      categoryName: BENCHMARK_CATEGORY_META[category].label,
      pass: bucket.pass,
      fail: bucket.fail,
      na: bucket.na,
      applicable,
      categoryScore,
    };
  });

  const totalApplicable = categories.reduce((acc, c) => acc + c.applicable, 0);
  const totalPass = categories.reduce((acc, c) => acc + c.pass, 0);
  const totalFail = categories.reduce((acc, c) => acc + c.fail, 0);
  const totalNa = categories.reduce((acc, c) => acc + c.na, 0);
  const passRate = totalApplicable > 0 ? Math.round((totalPass / totalApplicable) * 1000) / 10 : 0;

  gaps.sort(
    (a, b) =>
      (GAP_CATEGORY_RANK[a.category] ?? 99) - (GAP_CATEGORY_RANK[b.category] ?? 99) ||
      a.controlId.localeCompare(b.controlId)
  );

  return {
    overallScore: passRate,
    passRate,
    totalApplicable,
    totalPass,
    totalFail,
    totalNa,
    categories,
    topGaps: gaps.slice(0, 5),
    updatedAt: DEMO_SECURITY_TESTING_BASE_DATE.toISOString(),
  };
}

/* --- Demo scan coverage -------------------------------------------------- */

/** Sample assets fed into the scan coverage engine (input side). */
export const DEMO_SCAN_ASSETS: ScanAssetInput[] = [
  {
    id: 1,
    assetName: "203.0.113.10",
    assetClass: "external-ip",
    scanFrequencyHours: 168,
    lastScanAt: demoDate(-1),
    dueAt: demoDate(6),
  },
  {
    id: 2,
    assetName: "203.0.113.11",
    assetClass: "external-ip",
    scanFrequencyHours: 168,
    lastScanAt: demoDate(-9),
    dueAt: demoDate(-2),
  },
  {
    id: 3,
    assetName: "203.0.113.12",
    assetClass: "external-ip",
    scanFrequencyHours: 168,
    lastScanAt: demoDate(-2),
    dueAt: demoDate(5),
  },
  {
    id: 4,
    assetName: "svr-db-01.corp",
    assetClass: "internal-host",
    scanFrequencyHours: 720,
    lastScanAt: demoDate(-10),
    dueAt: demoDate(20),
  },
  {
    id: 5,
    assetName: "svr-file-02.corp",
    assetClass: "internal-host",
    scanFrequencyHours: 720,
    lastScanAt: demoDate(-35),
    dueAt: demoDate(-5),
  },
  {
    id: 6,
    assetName: "customer-portal.example.com",
    assetClass: "web-app",
    scanFrequencyHours: 2160,
    lastScanAt: demoDate(-40),
    dueAt: demoDate(50),
  },
  {
    id: 7,
    assetName: "api-gateway.example.com",
    assetClass: "api",
    scanFrequencyHours: 2160,
    lastScanAt: demoDate(-75),
    dueAt: demoDate(15),
  },
  {
    id: 8,
    assetName: "partner-api.example.com",
    assetClass: "api",
    scanFrequencyHours: 2160,
    lastScanAt: demoDate(-100),
    dueAt: demoDate(-10),
  },
  {
    id: 9,
    assetName: "web-shop.example.com",
    assetClass: "web-app",
    scanFrequencyHours: 2160,
    lastScanAt: demoDate(-30),
    dueAt: demoDate(60),
  },
  {
    id: 10,
    assetName: "s3-uploads-prod",
    assetClass: "cloud-asset",
    scanFrequencyHours: 720,
    lastScanAt: demoDate(-12),
    dueAt: demoDate(18),
  },
];

/** Input object for securityTestingNis2.scanCoverage in demo mode. */
export function buildDemoScanCoverageInput(): ScanCoverageInput {
  return { clientId: 0, assets: DEMO_SCAN_ASSETS };
}

/** Compute the demo scan coverage view-model (mirrors scanCoverage output). */
export function buildDemoScanCoverage(): ScanCoverageResponse {
  const classBuckets: Record<AssetClass, { total: number; covered: number }> = {
    "external-ip": { total: 0, covered: 0 },
    "internal-host": { total: 0, covered: 0 },
    "web-app": { total: 0, covered: 0 },
    api: { total: 0, covered: 0 },
    "cloud-asset": { total: 0, covered: 0 },
  };
  const assets: ScanCoverageItem[] = [];
  const baseTime = DEMO_SECURITY_TESTING_BASE_DATE.getTime();

  for (const input of DEMO_SCAN_ASSETS) {
    const assetClass = normalizeAssetClass(input.assetClass);
    const frequencyMs = (input.scanFrequencyHours ?? 0) * 3_600_000;
    const dueMs = input.dueAt ? new Date(input.dueAt).getTime() : null;
    const dueTime = dueMs !== null && !Number.isNaN(dueMs) ? dueMs : input.lastScanAt ? new Date(input.lastScanAt).getTime() + frequencyMs : null;
    const inSla = dueTime !== null && dueTime >= baseTime;
    const isOverdue = dueTime !== null && dueTime < baseTime;
    const daysOverdue = isOverdue && dueTime !== null ? Math.floor((baseTime - dueTime) / DAY_MS) : 0;

    const bucket = classBuckets[assetClass];
    bucket.total += 1;
    if (inSla) bucket.covered += 1;

    assets.push({
      id: input.id ?? 0,
      assetName: input.assetName ?? "Untitled asset",
      assetClass,
      assetClassName: ASSET_CLASS_META[assetClass].label,
      scanFrequencyHours: input.scanFrequencyHours ?? 0,
      lastScanAt: input.lastScanAt ?? null,
      dueAt: input.dueAt ?? null,
      inSla,
      isOverdue,
      daysOverdue,
    });
  }

  const byClass: AssetClassCoverage[] = ASSET_CLASS_ORDER.map((assetClass) => {
    const bucket = classBuckets[assetClass];
    return {
      assetClass,
      assetClassName: ASSET_CLASS_META[assetClass].label,
      total: bucket.total,
      covered: bucket.covered,
      overdue: bucket.total - bucket.covered,
      coverageRate: bucket.total > 0 ? Math.round((bucket.covered / bucket.total) * 1000) / 10 : 0,
    };
  });

  const totalAssets = assets.length;
  const coveredCount = assets.filter((a) => a.inSla).length;
  const overdueCount = assets.filter((a) => a.isOverdue).length;

  return {
    totalAssets,
    coveredCount,
    overdueCount,
    coverageRate: totalAssets > 0 ? Math.round((coveredCount / totalAssets) * 1000) / 10 : 0,
    byClass,
    assets,
    updatedAt: DEMO_SECURITY_TESTING_BASE_DATE.toISOString(),
  };
}
