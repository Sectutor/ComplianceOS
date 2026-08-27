/**
 * NIS2 Security Testing — typed UI contract layer (UI-STANDARD sec.16).
 *
 * Cycle 51 (NIS2 Article 21(2)(e) / ENISA Measure 6.2): wraps the pure
 * security-testing engine (lib/nis2/securityTesting.ts) behind retry:false
 * tRPC-style hooks with EMPTY shapes, emptiness predicates, status META maps
 * and fixed-clock demo builders.
 */

import {
  // engine types
  type PenetrationTestPlanResult,
  type PenetrationTestInput,
  type RedTeamExerciseResult,
  type RedTeamExerciseInput,
  type BenchmarkAssessmentResult,
  type BenchmarkAssessmentInput,
  type ScanCoverageResult,
  type ScanCoverageAssetInput,
  // engine constants
  EMPTY_PEN_TEST_PLAN,
  EMPTY_RED_TEAM_EXERCISE,
  EMPTY_BENCHMARK_ASSESSMENT,
  EMPTY_SCAN_COVERAGE,
  // engine functions (pure passthrough for demo/offline mode)
  planPenetrationTest,
  runRedTeamExercise,
  assessSecurityBenchmarks,
  trackScanCoverage,
} from "../lib/nis2/securityTesting";

/* ------------------------------------------------------------------ */
/* Re-exported types (UI-facing aliases)                               */
/* ------------------------------------------------------------------ */

export type PenTestPlanResponse = PenetrationTestPlanResult;
export type PenTestPlanInput = { tests?: PenetrationTestInput[] | null };
export type RedTeamExerciseResponse = RedTeamExerciseResult;
export type RedTeamInput = RedTeamExerciseInput;
export type RedTeamPhase = import("../lib/nis2/securityTesting").RedTeamPhaseResult;
export type BenchmarkAssessmentResponse = BenchmarkAssessmentResult;
export type BenchmarkInput = { assessments?: BenchmarkAssessmentInput[] | null };
export type BenchmarkCategory = import("../lib/nis2/securityTesting").BenchmarkCategoryResult;
export type ScanCoverageResponse = ScanCoverageResult;
export type ScanCoverageInput = { assets?: ScanCoverageAssetInput[] | null };
export type AssetClass = import("../lib/nis2/securityTesting").ScanCoverageClassResult;

/* ------------------------------------------------------------------ */
/* EMPTY shapes + emptiness predicates                                 */
/* ------------------------------------------------------------------ */

export const isEmptyPenTestPlan = (d: PenTestPlanResponse | undefined | null): boolean =>
  !d || d.total === 0;

export const isEmptyRedTeamExercise = (d: RedTeamExerciseResponse | undefined | null): boolean =>
  !d || (d.status === "not-started" && d.phases.every((p) => p.status === "pending"));

export const isEmptyBenchmarkAssessment = (d: BenchmarkAssessmentResponse | undefined | null): boolean =>
  !d || d.totalApplicable === 0;

export const isEmptyScanCoverage = (d: ScanCoverageResponse | undefined | null): boolean =>
  !d || d.totalAssets === 0;

/* ------------------------------------------------------------------ */
/* Retry:false hooks (UI-STANDARD sec.16)                               */
/* ------------------------------------------------------------------ */

const NO_RETRY = { retry: false as const, refetchOnWindowFocus: false as const };

export function usePenTestPlan(_clientId: number | undefined, input: PenTestPlanInput | null) {
  // Offline/demo mode: call the pure engine directly with a fixed clock
  const result = input?.tests ? planPenetrationTest(input.tests, { now: DEMO_CLOCK }) : EMPTY_PEN_TEST_PLAN;
  return {
    data: isEmptyPenTestPlan(result) ? undefined : result,
    isLoading: false,
    isError: false,
    ...NO_RETRY,
  };
}

export function useRedTeamExercise(_clientId: number | undefined, input: RedTeamInput | null) {
  const result = input ? runRedTeamExercise(input, { now: DEMO_CLOCK }) : EMPTY_RED_TEAM_EXERCISE;
  return {
    data: isEmptyRedTeamExercise(result) ? undefined : result,
    isLoading: false,
    isError: false,
    ...NO_RETRY,
  };
}

export function useBenchmarkAssessment(_clientId: number | undefined, input: BenchmarkInput | null) {
  const result = input?.assessments ? assessSecurityBenchmarks(input.assessments, { now: DEMO_CLOCK }) : EMPTY_BENCHMARK_ASSESSMENT;
  return {
    data: isEmptyBenchmarkAssessment(result) ? undefined : result,
    isLoading: false,
    isError: false,
    ...NO_RETRY,
  };
}

export function useScanCoverage(_clientId: number | undefined, input: ScanCoverageInput | null) {
  const result = input?.assets ? trackScanCoverage(input.assets, { now: DEMO_CLOCK }) : EMPTY_SCAN_COVERAGE;
  return {
    data: isEmptyScanCoverage(result) ? undefined : result,
    isLoading: false,
    isError: false,
    ...NO_RETRY,
  };
}

/* ------------------------------------------------------------------ */
/* Status / type META maps                                             */
/* ------------------------------------------------------------------ */

export const TEST_TYPE_META: Record<string, { label: string; tone: string }> = {
  external: { label: "External Pentest", tone: "error" },
  internal: { label: "Internal Pentest", tone: "warning" },
  "web-app": { label: "Web App", tone: "info" },
  api: { label: "API", tone: "info" },
  mobile: { label: "Mobile", tone: "info" },
  wireless: { label: "Wireless", tone: "warning" },
  "social-engineering": { label: "Social Engineering", tone: "warning" },
  physical: { label: "Physical", tone: "warning" },
  "red-team": { label: "Red Team", tone: "error" },
  unknown: { label: "Unknown", tone: "secondary" },
};

export const FREQUENCY_META: Record<string, { label: string; months: number }> = {
  quarterly: { label: "Quarterly", months: 3 },
  "semi-annual": { label: "Semi-Annual", months: 6 },
  annual: { label: "Annual", months: 12 },
  biennial: { label: "Biennial", months: 24 },
};

export const EXERCISE_STATUS_META: Record<string, { label: string; tone: string }> = {
  "not-started": { label: "Not Started", tone: "secondary" },
  active: { label: "Active", tone: "info" },
  paused: { label: "Paused", tone: "warning" },
  completed: { label: "Completed", tone: "success" },
};

export const VERDICT_META: Record<string, { label: string; tone: string }> = {
  "no-breach": { label: "No Breach", tone: "success" },
  contained: { label: "Contained", tone: "warning" },
  breached: { label: "Breached", tone: "error" },
  unknown: { label: "Unknown", tone: "secondary" },
};

export const PHASE_STATUS_META: Record<string, { label: string; tone: string }> = {
  pending: { label: "Pending", tone: "secondary" },
  active: { label: "Active", tone: "info" },
  completed: { label: "Completed", tone: "success" },
};

export const RED_TEAM_PHASE_META: Record<string, { label: string; tacticCodes: string[] }> = {
  recon: { label: "Reconnaissance", tacticCodes: ["TA0043"] },
  weaponization: { label: "Weaponization", tacticCodes: ["TA0001", "TA0002"] },
  delivery: { label: "Delivery", tacticCodes: ["TA0001"] },
  exploitation: { label: "Exploitation", tacticCodes: ["TA0002"] },
  installation: { label: "Installation", tacticCodes: ["TA0003"] },
  "c2": { label: "Command & Control", tacticCodes: ["TA0011"] },
  "actions-on-objective": { label: "Actions on Objective", tacticCodes: ["TA0004", "TA0005", "TA0006"] },
  reporting: { label: "Reporting", tacticCodes: [] },
};

export const KILL_CHAIN_STEPS = [
  "recon",
  "weaponization",
  "delivery",
  "exploitation",
  "installation",
  "c2",
  "actions-on-objective",
  "reporting",
] as const;

export function penStatusMetaForLabel(status: string): { label: string; tone: string } {
  const meta: Record<string, { label: string; tone: string }> = {
    draft: { label: "Draft", tone: "secondary" },
    scheduled: { label: "Scheduled", tone: "info" },
    in_progress: { label: "In Progress", tone: "warning" },
    completed: { label: "Completed", tone: "success" },
    reported: { label: "Reported", tone: "success" },
    unknown: { label: "Unknown", tone: "secondary" },
  };
  return meta[status] ?? meta.unknown;
}

export function coverageBarClass(rate: number): string {
  if (rate >= 80) return "bg-success";
  if (rate >= 60) return "bg-warning";
  return "bg-error";
}

export function formatNextDueDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString();
  } catch {
    return "—";
  }
}

/* ------------------------------------------------------------------ */
/* Demo data (UI-STANDARD sec.17)                                       */
/* ------------------------------------------------------------------ */

const DEMO_CLOCK = new Date("2026-08-27T12:00:00Z");

export function buildDemoPenTestInput(): PenTestPlanInput {
  return {
    tests: [
      { id: "pt-1", testType: "external", status: "completed", scheduledDate: "2026-07-15T00:00:00Z", riskTier: "critical", lastCompletedAt: "2026-07-15T00:00:00Z" },
      { id: "pt-2", testType: "web-app", status: "scheduled", scheduledDate: "2026-08-10T00:00:00Z", riskTier: "high", lastCompletedAt: "2026-06-01T00:00:00Z" },
      { id: "pt-3", testType: "internal", status: "in_progress", scheduledDate: "2026-08-20T00:00:00Z", riskTier: "medium" },
      { id: "pt-4", testType: "api", status: "draft", riskTier: "high" },
      { id: "pt-5", testType: "social-engineering", status: "scheduled", scheduledDate: "2026-09-01T00:00:00Z", riskTier: "medium" },
    ],
  };
}

export function buildDemoPenTestPlan(): PenetrationTestPlanResult {
  return planPenetrationTest(buildDemoPenTestInput().tests, { now: DEMO_CLOCK });
}

export function buildDemoRedTeamInput(): RedTeamInput {
  return {
    name: "Operation Red Storm",
    status: "active",
    startAt: "2026-08-01T00:00:00Z",
    endAt: "2026-09-15T00:00:00Z",
    participants: [
      { id: "p-1", name: "Alice Chen", role: "operator" },
      { id: "p-2", name: "Bob Martinez", role: "observer" },
      { id: "p-3", name: "Carol White", role: "decision-maker" },
    ],
    phases: [
      { id: "recon", name: "Reconnaissance", status: "completed", startedAt: "2026-08-01T00:00:00Z", completedAt: "2026-08-05T00:00:00Z" },
      { id: "weaponization", name: "Weaponization", status: "completed", startedAt: "2026-08-05T00:00:00Z", completedAt: "2026-08-10T00:00:00Z" },
      { id: "delivery", name: "Delivery", status: "active", startedAt: "2026-08-10T00:00:00Z", estimatedEndAt: "2026-08-20T00:00:00Z" },
      { id: "exploitation", name: "Exploitation", status: "pending" },
      { id: "installation", name: "Installation", status: "pending" },
      { id: "c2", name: "C2", status: "pending" },
      { id: "actions-on-objective", name: "Actions on Objective", status: "pending" },
      { id: "reporting", name: "Reporting", status: "pending" },
    ],
  };
}

export function buildDemoRedTeamExercise(): RedTeamExerciseResult {
  return runRedTeamExercise(buildDemoRedTeamInput(), { now: DEMO_CLOCK });
}

export function buildDemoBenchmarkInput(): BenchmarkInput {
  return {
    assessments: [
      { benchmark: "cis", category: "ig1", controlId: "1.1", controlName: "Inventory of Enterprise Assets", status: "pass" },
      { benchmark: "cis", category: "ig1", controlId: "1.2", controlName: "Inventory of Software Platforms", status: "pass" },
      { benchmark: "cis", category: "ig1", controlId: "2.1", controlName: "Authorized Software Inventory", status: "fail" },
      { benchmark: "cis", category: "ig2", controlId: "4.1", controlName: "Secure Configuration", status: "pass" },
      { benchmark: "cis", category: "ig2", controlId: "5.1", controlName: "Account Management", status: "pass" },
      { benchmark: "cis", category: "ig3", controlId: "6.1", controlName: "Access Control Management", status: "fail" },
      { benchmark: "nist", category: "govern", controlId: "ID.1", controlName: "Risk Management", status: "pass" },
      { benchmark: "nist", category: "identify", controlId: "ID.2", controlName: "Asset Management", status: "pass" },
      { benchmark: "nist", category: "protect", controlId: "PR.1", controlName: "Identity Management", status: "fail" },
      { benchmark: "nist", category: "detect", controlId: "DE.1", controlName: "Continuous Monitoring", status: "pass" },
      { benchmark: "nist", category: "respond", controlId: "RS.1", controlName: "Incident Response", status: "pass" },
      { benchmark: "nist", category: "recover", controlId: "RC.1", controlName: "Recovery Planning", status: "not-applicable" },
    ],
  };
}

export function buildDemoScanCoverageInput(): ScanCoverageInput {
  return {
    assets: [
      { id: "a-1", assetName: "web-prod-01", assetClass: "external-ip", scanFrequencyHours: 168, lastScanAt: "2026-08-25T00:00:00Z" },
      { id: "a-2", assetName: "api-gateway", assetClass: "cloud-asset", scanFrequencyHours: 168, lastScanAt: "2026-08-20T00:00:00Z" },
      { id: "a-3", assetName: "db-internal", assetClass: "internal-host", scanFrequencyHours: 720, lastScanAt: "2026-07-15T00:00:00Z" },
      { id: "a-4", assetName: "mobile-app", assetClass: "web-app", scanFrequencyHours: 720, lastScanAt: "2026-08-10T00:00:00Z" },
      { id: "a-5", assetName: "workstation-fleet", assetClass: "cloud-asset", scanFrequencyHours: 168, lastScanAt: "2026-08-26T00:00:00Z" },
    ],
  };
}

/* ------------------------------------------------------------------ */
/* Benchmark + asset class META maps (UI-STANDARD sec.2)               */
/* ------------------------------------------------------------------ */

export const BENCHMARK_CATEGORY_META: Record<string, { label: string; tone: string }> = {
  ig1: { label: "IG1", tone: "error" },
  ig2: { label: "IG2", tone: "warning" },
  ig3: { label: "IG3", tone: "info" },
  govern: { label: "Govern", tone: "info" },
  identify: { label: "Identify", tone: "info" },
  protect: { label: "Protect", tone: "success" },
  detect: { label: "Detect", tone: "warning" },
  respond: { label: "Respond", tone: "error" },
  recover: { label: "Recover", tone: "success" },
};

export const BENCHMARK_CATEGORY_ORDER = [
  "ig1",
  "ig2",
  "ig3",
  "govern",
  "identify",
  "protect",
  "detect",
  "respond",
  "recover",
] as const;

export const BENCHMARK_META: Record<string, { label: string }> = {
  cis: { label: "CIS Controls v8" },
  nist: { label: "NIST CSF 2.0" },
};

export const ASSET_CLASS_META: Record<string, { label: string; tone: string }> = {
  "external-ip": { label: "External IP", tone: "error" },
  "internal-host": { label: "Internal Host", tone: "info" },
  "web-app": { label: "Web App", tone: "info" },
  api: { label: "API", tone: "info" },
  "cloud-asset": { label: "Cloud Asset", tone: "warning" },
};

export const ASSET_CLASS_ORDER = [
  "external-ip",
  "internal-host",
  "web-app",
  "api",
  "cloud-asset",
] as const;

/** Build the full demo benchmark assessment (mirrors assessSecurityBenchmarks). */
export function buildDemoBenchmarkAssessment(): BenchmarkAssessmentResponse {
  return assessSecurityBenchmarks(buildDemoBenchmarkInput().assessments, { now: DEMO_CLOCK });
}

/** Build the full demo scan coverage (mirrors trackScanCoverage). */
export function buildDemoScanCoverage(): ScanCoverageResponse {
  return trackScanCoverage(buildDemoScanCoverageInput().assets, { now: DEMO_CLOCK });
}
