/**
 * NIS2 Advanced Security Testing engine.
 *
 * Cycle 21 (NIS2 Implementation Plan Phase 5 Task 5.1 — ENISA Measure 6.7
 * "Network Security" / NIS2 Article 21(2)(e)): plans & tracks penetration
 * tests (risk-based frequency, overdue windows), runs red team exercise
 * frameworks (MITRE ATT&CK-aligned phases, roles, verdicts), assesses security
 * benchmark compliance (CIS Critical Security Controls v8 implementation
 * groups + NIST CSF 2.0 functions), and tracks automated vulnerability
 * scanning coverage per asset class. Pure view-model logic — no DB, no
 * network, no side effects.
 *
 * Design rules (house pattern — mirrors lib/nis2/securityMetrics.ts and
 * lib/nis2/vulnerabilityMgmt.ts):
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
 *   hour = 60m). Default penetration-test window = 336h (14 days).
 * - All numeric outputs are rounded deterministically: scores/rates to 1
 *   decimal, day deltas to whole (floored) numbers.
 * - Statuses, test types, risk tiers, benchmark ids and asset classes are
 *   coerced case-insensitively; unknown enum values land in a deterministic
 *   "unknown" bucket (or are skipped where documented).
 */

/* ------------------------------------------------------------------ */
/* Public types                                                        */
/* ------------------------------------------------------------------ */

/** Injectable clock options shared by every engine function. */
export interface SecurityTestingOptions {
  /** Pin "now": Date, epoch-ms number, or ISO-8601 string. */
  now?: Date | number | string | null;
  /** Pin "now" via a factory; used only when `now` is absent/invalid. */
  clock?: (() => Date) | null;
}

/* ------------------------- Penetration tests ---------------------- */

/** Penetration test lifecycle status (normalized). */
export type PenetrationTestStatus =
  | "draft"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "reported"
  | "unknown";

/** Risk-tier driven testing frequency recommendation. */
export type PenetrationTestFrequency =
  | "quarterly"
  | "semi-annual"
  | "annual"
  | "biennial";

/** Risk tier of the tested asset (drives the frequency recommendation). */
export type PenetrationTestRiskTier =
  | "critical"
  | "high"
  | "medium"
  | "low"
  | "info"
  | "unknown";

/** One penetration-test row for planning & tracking. */
export interface PenetrationTestInput {
  id?: string | number | null;
  testType?: string | null;
  status?: string | null;
  scheduledDate?: Date | number | string | null;
  /** Overdue window override in hours; default 336 (14 days). */
  windowHours?: number | null;
  riskTier?: string | null;
  lastCompletedAt?: Date | number | string | null;
}

/** Per-test enrichment computed by `planPenetrationTest`. */
export interface PenetrationTestEnriched {
  id: string | number;
  /** Catalog test type id ("external" | "web-app" | ... | "unknown"). */
  testType: string;
  testTypeLabel: string;
  status: PenetrationTestStatus;
  statusLabel: string;
  /** ISO-8601 scheduled date, or null when missing/invalid. */
  scheduledDate: string | null;
  /** Effective overdue window in hours (per-test override honored). */
  windowHours: number;
  riskTier: PenetrationTestRiskTier;
  frequency: PenetrationTestFrequency;
  /** ISO-8601 next due date (lastCompletedAt + frequency, scheduledDate fallback). */
  nextDueDate: string | null;
  isOverdue: boolean;
}

/** Counts by status (kebab -> camel keys). */
export interface PenTestStatusCounts {
  draft: number;
  scheduled: number;
  inProgress: number;
  completed: number;
  reported: number;
  unknown: number;
}

/** Counts by test type (kebab -> camel keys). */
export interface PenTestTypeCounts {
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

/** Output of `planPenetrationTest`. */
export interface PenetrationTestPlanResult {
  total: number;
  countsByStatus: PenTestStatusCounts;
  countsByType: PenTestTypeCounts;
  overdueCount: number;
  /** Overdue tests sorted scheduledDate asc, then id asc. */
  overdueTests: PenetrationTestEnriched[];
  /** All enriched tests in deterministic order (status, type, id). */
  tests: PenetrationTestEnriched[];
}

/* ------------------------- Red team exercises --------------------- */

/** Normalized per-phase status. */
export type RedTeamPhaseStatus = "pending" | "active" | "completed";

/** Overall exercise status. */
export type RedTeamExerciseStatus = "not-started" | "active" | "paused" | "completed";

/** Exercise verdict (unknown when the exercise is not completed). */
export type RedTeamVerdict = "no-breach" | "contained" | "breached" | "unknown";

/** Participant role (invalid -> observer). */
export type RedTeamParticipantRole = "operator" | "observer" | "decision-maker";

/** One phase in a red team exercise. */
export interface RedTeamPhaseInput {
  id?: string | number | null;
  name?: string | null;
  status?: string | null;
  estimatedEndAt?: Date | number | string | null;
  startedAt?: Date | number | string | null;
  completedAt?: Date | number | string | null;
}

/** One participant in a red team exercise. */
export interface RedTeamParticipantInput {
  id?: string | number | null;
  name?: string | null;
  role?: string | null;
}

/** Input for `runRedTeamExercise`. */
export interface RedTeamExerciseInput {
  name?: string | null;
  /** Explicit exercise status ("paused" forces the paused overall state). */
  status?: string | null;
  startAt?: Date | number | string | null;
  endAt?: Date | number | string | null;
  verdict?: string | null;
  participants?: Array<RedTeamParticipantInput> | null;
  phases?: Array<RedTeamPhaseInput> | null;
}

/** Enriched phase computed by `runRedTeamExercise`. */
export interface RedTeamPhaseResult {
  /** Catalog phase id ("recon" | "weaponization" | ... | "reporting"). */
  id: string;
  name: string;
  /** MITRE ATT&CK tactic codes (chips); empty for reporting. */
  tacticCodes: string[];
  status: RedTeamPhaseStatus;
  statusBadge: string;
  /** ISO-8601 startedAt, or null when missing/invalid. */
  startedAt: string | null;
  /** ISO-8601 completedAt, or null when missing/invalid. */
  completedAt: string | null;
  /** ISO-8601 due time (exercise endAt, else phase.estimatedEndAt). */
  dueAt: string | null;
  /** True when active AND dueAt < clock. */
  isOverdue: boolean;
  /** True for the first active phase, else the first pending phase. */
  isCurrent: boolean;
}

/** Enriched participant computed by `runRedTeamExercise`. */
export interface RedTeamParticipantResult {
  id: string | number;
  name: string;
  role: RedTeamParticipantRole;
  roleLabel: string;
}

/** Participant counts by role (kebab -> camel keys). */
export interface RedTeamParticipantCounts {
  operator: number;
  observer: number;
  decisionMaker: number;
}

/** Phase summary counts. */
export interface RedTeamPhaseSummary {
  totalPhases: number;
  completedPhases: number;
  activePhases: number;
  pendingPhases: number;
  overduePhases: number;
}

/** Output of `runRedTeamExercise`. */
export interface RedTeamExerciseResult {
  name: string;
  status: RedTeamExerciseStatus;
  verdict: RedTeamVerdict;
  /** ISO-8601 startAt, or null when missing/invalid. */
  startAt: string | null;
  /** ISO-8601 endAt, or null when missing/invalid. */
  endAt: string | null;
  /** All catalog phases in deterministic catalog order. */
  phases: RedTeamPhaseResult[];
  /** Participants sorted role asc, name asc, id asc. */
  participants: RedTeamParticipantResult[];
  participantCounts: RedTeamParticipantCounts;
  summary: RedTeamPhaseSummary;
}

/* ------------------------- Benchmark compliance ------------------- */

/** Benchmark family ("cis" | "nist"). */
export type BenchmarkFamily = "cis" | "nist";

/** One benchmark assessment row. */
export interface BenchmarkAssessmentInput {
  benchmark?: string | null;
  category?: string | null;
  controlId?: string | number | null;
  controlName?: string | null;
  /** "pass" | "fail" | "not-applicable". */
  status?: string | null;
}

/** Per-category aggregation result. */
export interface BenchmarkCategoryResult {
  benchmark: BenchmarkFamily;
  /** Normalized category id ("ig1".."ig3" | "govern".."recover"). */
  category: string;
  categoryName: string;
  pass: number;
  fail: number;
  /** Not-applicable controls (excluded from the denominator). */
  na: number;
  /** pass + fail. */
  applicable: number;
  /** pass / applicable * 100, 1 decimal; 0 when no applicable controls. */
  categoryScore: number;
}

/** One failing control surfaced as a top gap. */
export interface BenchmarkGap {
  benchmark: BenchmarkFamily;
  category: string;
  categoryName: string;
  controlId: string;
  controlName: string;
  /** Remediation guidance from the stable keyword catalog. */
  remediation: string;
}

/** Output of `assessSecurityBenchmarks`. */
export interface BenchmarkAssessmentResult {
  /** Aggregate pass rate (pass / applicable * 100), 1 decimal. */
  overallScore: number;
  /** Aggregate pass rate, 1 decimal (same formula as overallScore). */
  passRate: number;
  totalApplicable: number;
  totalPass: number;
  totalFail: number;
  totalNa: number;
  /** Per-category results in catalog order. */
  categories: BenchmarkCategoryResult[];
  /** Failing controls, category order then controlId asc, capped 5. */
  topGaps: BenchmarkGap[];
}

/* ------------------------- Scan coverage -------------------------- */

/** One scanned asset row. */
export interface ScanCoverageAssetInput {
  id?: string | number | null;
  assetName?: string | null;
  assetClass?: string | null;
  scanFrequencyHours?: number | null;
  lastScanAt?: Date | number | string | null;
  /** Explicit due override; honored when present. */
  dueAt?: Date | number | string | null;
}

/** Per-asset coverage enrichment. */
export interface ScanCoverageAssetResult {
  id: string | number;
  assetName: string;
  /** Catalog asset class id ("external-ip" | ... | "cloud-asset"). */
  assetClass: string;
  assetClassName: string;
  /** Effective scan frequency in hours (0 when missing/invalid). */
  scanFrequencyHours: number;
  /** ISO-8601 last scan, or null when missing/invalid. */
  lastScanAt: string | null;
  /** ISO-8601 effective due time (dueAt override, else lastScan + window). */
  dueAt: string;
  /** True when the asset is within SLA (due >= clock). */
  inSla: boolean;
  /** True when NOT within SLA. */
  isOverdue: boolean;
  /** Whole days (floor) since due, signed (negative when not yet due). */
  daysOverdue: number;
}

/** Per-class coverage rollup. */
export interface ScanCoverageClassResult {
  assetClass: string;
  assetClassName: string;
  total: number;
  covered: number;
  overdue: number;
  /** covered / total * 100, 1 decimal; 0 when total is 0. */
  coverageRate: number;
}

/** Output of `trackScanCoverage`. */
export interface ScanCoverageResult {
  totalAssets: number;
  coveredCount: number;
  overdueCount: number;
  /** covered / total * 100, 1 decimal; 0 on empty input. */
  coverageRate: number;
  /** Per-class rollups in catalog order. */
  byClass: ScanCoverageClassResult[];
  /** Enriched assets sorted class catalog order, name asc, id asc. */
  assets: ScanCoverageAssetResult[];
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Default penetration-test overdue window in hours (14 days). */
const DEFAULT_WINDOW_HOURS = 336;

/** Test type catalog (deterministic order; anything else -> "unknown"). */
const TEST_TYPE_CATALOG: ReadonlyArray<{ id: string; label: string }> = [
  { id: "external", label: "External" },
  { id: "internal", label: "Internal" },
  { id: "web-app", label: "Web Application" },
  { id: "api", label: "API" },
  { id: "mobile", label: "Mobile" },
  { id: "wireless", label: "Wireless" },
  { id: "social-engineering", label: "Social Engineering" },
  { id: "physical", label: "Physical" },
  { id: "red-team", label: "Red Team" },
];

/** Type id -> kebab->camel count key. */
const TEST_TYPE_COUNT_KEYS: ReadonlyArray<{
  id: string;
  key: keyof PenTestTypeCounts;
}> = [
  { id: "external", key: "external" },
  { id: "internal", key: "internal" },
  { id: "web-app", key: "webApp" },
  { id: "api", key: "api" },
  { id: "mobile", key: "mobile" },
  { id: "wireless", key: "wireless" },
  { id: "social-engineering", key: "socialEngineering" },
  { id: "physical", key: "physical" },
  { id: "red-team", key: "redTeam" },
  { id: "unknown", key: "unknown" },
];

/** Status lifecycle in deterministic order. */
const STATUS_ORDER: ReadonlyArray<PenetrationTestStatus> = [
  "draft",
  "scheduled",
  "in_progress",
  "completed",
  "reported",
  "unknown",
];

/** Status -> display label. */
const STATUS_LABELS: Record<PenetrationTestStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  reported: "Reported",
  unknown: "Unknown",
};

/** Status -> kebab->camel count key. */
const STATUS_COUNT_KEYS: Record<PenetrationTestStatus, keyof PenTestStatusCounts> = {
  draft: "draft",
  scheduled: "scheduled",
  in_progress: "inProgress",
  completed: "completed",
  reported: "reported",
  unknown: "unknown",
};

/** Risk tier -> frequency + next-due offset in days. */
const RISK_FREQUENCY: ReadonlyArray<{
  tier: string;
  frequency: PenetrationTestFrequency;
  days: number;
}> = [
  { tier: "critical", frequency: "quarterly", days: 91 },
  { tier: "high", frequency: "semi-annual", days: 182 },
  { tier: "medium", frequency: "annual", days: 365 },
  { tier: "low", frequency: "biennial", days: 730 },
  { tier: "info", frequency: "biennial", days: 730 },
];

/** Neutral frequency for unknown risk tiers (documented safe default). */
const UNKNOWN_RISK_FREQUENCY: { frequency: PenetrationTestFrequency; days: number } = {
  frequency: "annual",
  days: 365,
};

/** Red team phase catalog (MITRE ATT&CK-aligned, deterministic order). */
const RED_TEAM_PHASES: ReadonlyArray<{
  id: string;
  name: string;
  tacticCodes: string[];
}> = [
  { id: "recon", name: "Reconnaissance", tacticCodes: ["TA0043"] },
  { id: "weaponization", name: "Weaponization", tacticCodes: ["TA0001"] },
  { id: "delivery", name: "Delivery", tacticCodes: ["TA0001", "TA0042"] },
  { id: "exploitation", name: "Exploitation", tacticCodes: ["TA0002"] },
  { id: "lateral-movement", name: "Lateral Movement", tacticCodes: ["TA0008"] },
  { id: "exfiltration", name: "Exfiltration", tacticCodes: ["TA0010"] },
  { id: "reporting", name: "Reporting", tacticCodes: [] },
];

/** Phase status -> display badge. */
const PHASE_STATUS_LABELS: Record<RedTeamPhaseStatus, string> = {
  pending: "Pending",
  active: "Active",
  completed: "Completed",
};

/** Participant role -> display label. */
const ROLE_LABELS: Record<RedTeamParticipantRole, string> = {
  operator: "Operator",
  observer: "Observer",
  "decision-maker": "Decision Maker",
};

/** Benchmark category catalog (CIS IG1-IG3, then NIST CSF 2.0). */
const BENCHMARK_CATEGORY_ORDER: ReadonlyArray<{
  benchmark: BenchmarkFamily;
  category: string;
  name: string;
}> = [
  { benchmark: "cis", category: "ig1", name: "IG1" },
  { benchmark: "cis", category: "ig2", name: "IG2" },
  { benchmark: "cis", category: "ig3", name: "IG3" },
  { benchmark: "nist", category: "govern", name: "Govern" },
  { benchmark: "nist", category: "identify", name: "Identify" },
  { benchmark: "nist", category: "protect", name: "Protect" },
  { benchmark: "nist", category: "detect", name: "Detect" },
  { benchmark: "nist", category: "respond", name: "Respond" },
  { benchmark: "nist", category: "recover", name: "Recover" },
];

/** Stable remediation guidance catalog (first keyword match wins). */
const REMEDIATION_CATALOG: ReadonlyArray<{ keywords: string[]; remediation: string }> = [
  {
    keywords: ["access", "auth", "privilege", "account"],
    remediation:
      "Enforce least-privilege access: review role assignments, disable dormant accounts and require MFA for privileged access",
  },
  {
    keywords: ["inventory", "asset", "hardware", "software"],
    remediation:
      "Maintain an up-to-date hardware/software inventory and flag unauthorized or unmanaged assets",
  },
  {
    keywords: ["network", "firewall", "segment", "perimeter"],
    remediation:
      "Segment networks by trust zone, tighten firewall rules and remove unnecessary exposure to the internet",
  },
  {
    keywords: ["vuln", "patch", "update", "cve"],
    remediation:
      "Run regular authenticated vulnerability scans and patch critical/high findings within the documented SLA",
  },
  {
    keywords: ["config", "baseline", "hardening", "settings"],
    remediation:
      "Apply hardened configuration baselines to all assets and monitor for configuration drift",
  },
  {
    keywords: ["train", "awareness", "education", "phish", "human"],
    remediation:
      "Deliver role-based security awareness training and run periodic phishing simulations",
  },
  {
    keywords: ["incident", "response", "contain", "detection"],
    remediation:
      "Strengthen incident detection and response: rehearse runbooks, verify escalation paths and define containment triggers",
  },
  {
    keywords: ["recover", "backup", "restore", "resilien"],
    remediation:
      "Validate backups with regular restoration tests and document recovery time objectives (RTO/RPO)",
  },
  {
    keywords: ["monitor", "log", "telemetry", "detect", "alert"],
    remediation:
      "Improve logging, monitoring and alerting coverage across endpoints, network and cloud workloads",
  },
  {
    keywords: ["govern", "risk", "policy", "oversight", "third"],
    remediation:
      "Strengthen governance, risk and policy oversight: assign control owners and review supplier risk posture",
  },
  {
    keywords: ["identify", "classif", "data", "supply"],
    remediation:
      "Complete asset and data classification, and map critical data flows and supply-chain dependencies",
  },
];

/** Fallback remediation when no keyword matches. */
const GENERIC_REMEDIATION =
  "Review the failing control against the applicable benchmark guidance, assign an owner and implement compensating measures with a documented due date";

/** Asset class catalog (deterministic order; anything else -> skipped). */
const ASSET_CLASS_ORDER: ReadonlyArray<{ id: string; label: string }> = [
  { id: "external-ip", label: "External IP" },
  { id: "internal-host", label: "Internal Host" },
  { id: "web-app", label: "Web Application" },
  { id: "api", label: "API" },
  { id: "cloud-asset", label: "Cloud Asset" },
];

/* ------------------------- Empty safe shapes ---------------------- */

/** Zeroed counts-by-status (safe shape). */
const ZERO_STATUS_COUNTS: PenTestStatusCounts = {
  draft: 0,
  scheduled: 0,
  inProgress: 0,
  completed: 0,
  reported: 0,
  unknown: 0,
};

/** Zeroed counts-by-type (safe shape). */
const ZERO_TYPE_COUNTS: PenTestTypeCounts = {
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

/** Exportable safe shape for malformed/empty penetration-test input. */
export const EMPTY_PEN_TEST_PLAN: PenetrationTestPlanResult = {
  total: 0,
  countsByStatus: { ...ZERO_STATUS_COUNTS },
  countsByType: { ...ZERO_TYPE_COUNTS },
  overdueCount: 0,
  overdueTests: [],
  tests: [],
};

/** Exportable safe shape for malformed red-team exercise input. */
export const EMPTY_RED_TEAM_EXERCISE: RedTeamExerciseResult = {
  name: "",
  status: "not-started",
  verdict: "unknown",
  startAt: null,
  endAt: null,
  phases: RED_TEAM_PHASES.map((phase) => ({
    id: phase.id,
    name: phase.name,
    tacticCodes: [...phase.tacticCodes],
    status: "pending" as const,
    statusBadge: "Pending",
    startedAt: null,
    completedAt: null,
    dueAt: null,
    isOverdue: false,
    isCurrent: false,
  })),
  participants: [],
  participantCounts: { operator: 0, observer: 0, decisionMaker: 0 },
  summary: {
    totalPhases: RED_TEAM_PHASES.length,
    completedPhases: 0,
    activePhases: 0,
    pendingPhases: RED_TEAM_PHASES.length,
    overduePhases: 0,
  },
};

/** Exportable safe shape for malformed/empty benchmark input. */
export const EMPTY_BENCHMARK_ASSESSMENT: BenchmarkAssessmentResult = {
  overallScore: 0,
  passRate: 0,
  totalApplicable: 0,
  totalPass: 0,
  totalFail: 0,
  totalNa: 0,
  categories: BENCHMARK_CATEGORY_ORDER.map((cat) => ({
    benchmark: cat.benchmark,
    category: cat.category,
    categoryName: cat.name,
    pass: 0,
    fail: 0,
    na: 0,
    applicable: 0,
    categoryScore: 0,
  })),
  topGaps: [],
};

/** Exportable safe shape for malformed/empty scan-coverage input. */
export const EMPTY_SCAN_COVERAGE: ScanCoverageResult = {
  totalAssets: 0,
  coveredCount: 0,
  overdueCount: 0,
  coverageRate: 0,
  byClass: ASSET_CLASS_ORDER.map((assetClass) => ({
    assetClass: assetClass.id,
    assetClassName: assetClass.label,
    total: 0,
    covered: 0,
    overdue: 0,
    coverageRate: 0,
  })),
  assets: [],
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

/** Round to 1 decimal. */
const round1 = (value: number): number => Math.round(value * 10) / 10;

/** Deterministic id compare: numeric when both numbers, else String order. */
const compareIds = (a: string | number, b: string | number): number => {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
};

/** Lowercase-trim a string value; "" when missing/non-string. */
const toLower = (value: unknown): string =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

/** Normalize a penetration-test type; unknown -> "unknown". */
const toTestType = (value: unknown): string => {
  const normalized = toLower(value).replace(/_/g, "-");
  return TEST_TYPE_CATALOG.some((entry) => entry.id === normalized)
    ? normalized
    : "unknown";
};

/** Normalize a penetration-test status; unknown -> "unknown". */
const toPenTestStatus = (value: unknown): PenetrationTestStatus => {
  const normalized = toLower(value);
  if (normalized === "draft" || normalized === "scheduled" || normalized === "in_progress"
    || normalized === "completed" || normalized === "reported") {
    return normalized;
  }
  return "unknown";
};

/** Normalize a risk tier; unknown -> "unknown". */
const toRiskTier = (value: unknown): PenetrationTestRiskTier => {
  const normalized = toLower(value);
  if (normalized === "critical" || normalized === "high" || normalized === "medium"
    || normalized === "low" || normalized === "info") {
    return normalized;
  }
  return "unknown";
};

/** Frequency table lookup for a normalized risk tier. */
const frequencyForTier = (
  tier: PenetrationTestRiskTier
): { frequency: PenetrationTestFrequency; days: number } => {
  const hit = RISK_FREQUENCY.find((entry) => entry.tier === tier);
  return hit ? { frequency: hit.frequency, days: hit.days } : UNKNOWN_RISK_FREQUENCY;
};

/** Normalize a phase status; invalid -> "pending". */
const toPhaseStatus = (value: unknown): RedTeamPhaseStatus => {
  const normalized = toLower(value);
  if (normalized === "active") return "active";
  if (normalized === "completed") return "completed";
  return "pending";
};

/** Normalize a participant role; invalid -> "observer". */
const toParticipantRole = (value: unknown): RedTeamParticipantRole => {
  const normalized = toLower(value).replace(/_/g, "-");
  if (normalized === "operator") return "operator";
  if (normalized === "decision-maker") return "decision-maker";
  return "observer";
};

/** Normalize a verdict; anything not in the set -> "unknown". */
const toVerdict = (value: unknown): Exclude<RedTeamVerdict, "unknown"> | null => {
  const normalized = toLower(value).replace(/_/g, "-");
  if (normalized === "no-breach" || normalized === "contained" || normalized === "breached") {
    return normalized;
  }
  return null;
};

/** Normalize a benchmark family; null when unrecognized. */
const toBenchmarkFamily = (value: unknown): BenchmarkFamily | null => {
  const normalized = toLower(value);
  if (normalized === "cis") return "cis";
  if (normalized === "nist" || normalized === "nist-csf" || normalized === "nistcsf" || normalized === "csf") {
    return "nist";
  }
  return null;
};

/** Normalize a benchmark category; null when not in the catalog. */
const toBenchmarkCategory = (
  benchmark: BenchmarkFamily,
  value: unknown
): { category: string; name: string } | null => {
  // Strip everything non-alphanumeric for case/separator-insensitive matching.
  const normalized = toLower(value).replace(/[^a-z0-9]/g, "");
  const hit = BENCHMARK_CATEGORY_ORDER.find(
    (entry) => entry.benchmark === benchmark && entry.category === normalized
  );
  return hit ? { category: hit.category, name: hit.name } : null;
};

/** Normalize an assessment status; null when unrecognized (row skipped). */
const toAssessmentStatus = (
  value: unknown
): "pass" | "fail" | "not-applicable" | null => {
  const normalized = toLower(value).replace(/_/g, "-").replace(/\//g, "-");
  if (normalized === "pass") return "pass";
  if (normalized === "fail") return "fail";
  if (normalized === "not-applicable" || normalized === "na" || normalized === "n-a") {
    return "not-applicable";
  }
  return null;
};

/** Coerce a controlId to a stable string ("" when missing/invalid). */
const toControlId = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
};

/** Remediation guidance via first keyword match, else generic fallback. */
const remediationForControl = (controlId: string, controlName: string): string => {
  // Match against the control id AND the control name (e.g. NIST "PR.AC-1"
  // is matched through its "Access Control" name). Deterministic: first
  // catalog entry whose keyword appears wins; generic fallback otherwise.
  const haystack = `${controlId.toLowerCase()} ${controlName.toLowerCase()}`;
  for (const entry of REMEDIATION_CATALOG) {
    for (const keyword of entry.keywords) {
      if (haystack.includes(keyword)) {
        return entry.remediation;
      }
    }
  }
  return GENERIC_REMEDIATION;
};

/** Normalize an asset class; null when unrecognized (row skipped). */
const toAssetClass = (value: unknown): { id: string; label: string } | null => {
  const normalized = toLower(value).replace(/_/g, "-");
  const hit = ASSET_CLASS_ORDER.find((entry) => entry.id === normalized);
  return hit ? { id: hit.id, label: hit.label } : null;
};

/* ------------------------------------------------------------------ */
/* Public engine functions                                             */
/* ------------------------------------------------------------------ */

/**
 * Plan & track penetration tests: normalizes the test-type/status lifecycle
 * (draft -> scheduled -> in_progress -> completed | reported), flags overdue
 * tests (scheduled/in_progress AND scheduledDate + windowHours < clock;
 * default window 336h, per-test override honored), and recommends a
 * risk-tier based testing frequency (critical quarterly / high semi-annual /
 * medium annual / low+info biennial; unknown risk tiers fall back to annual).
 * `nextDueDate` = lastCompletedAt + frequency days, falling back to
 * scheduledDate when lastCompletedAt is missing. Tests are returned in
 * deterministic order (status, test type, id); overdue tests additionally
 * sorted by scheduledDate asc then id asc. Non-object rows are filtered.
 * Never throws — malformed or empty input yields `EMPTY_PEN_TEST_PLAN`.
 */
export function planPenetrationTest(
  tests: Array<PenetrationTestInput> | null | undefined,
  opts?: SecurityTestingOptions | null
): PenetrationTestPlanResult {
  const safeOpts = isObject(opts) ? opts : {};
  const nowMs = toClock(safeOpts).getTime();
  const rows = Array.isArray(tests) ? tests : [];

  const countsByStatus: PenTestStatusCounts = { ...ZERO_STATUS_COUNTS };
  const countsByType: PenTestTypeCounts = { ...ZERO_TYPE_COUNTS };
  const enriched: PenetrationTestEnriched[] = [];

  for (const rawRow of rows) {
    if (!isObject(rawRow)) continue;
    const row = rawRow;
    const testType = toTestType(row.testType);
    const status = toPenTestStatus(row.status);
    const riskTier = toRiskTier(row.riskTier);
    const frequency = frequencyForTier(riskTier);

    const windowRaw = row.windowHours;
    const windowHours =
      typeof windowRaw === "number" && Number.isFinite(windowRaw)
        ? Math.max(0, windowRaw)
        : DEFAULT_WINDOW_HOURS;

    const scheduledDateMs = toTimeMs(row.scheduledDate);
    const lastCompletedMs = toTimeMs(row.lastCompletedAt);
    const baseMs = lastCompletedMs ?? scheduledDateMs;
    const nextDueMs = baseMs !== null ? baseMs + frequency.days * DAY_MS : null;

    const isOverdue =
      (status === "scheduled" || status === "in_progress") &&
      scheduledDateMs !== null &&
      scheduledDateMs + windowHours * HOUR_MS < nowMs;

    countsByStatus[STATUS_COUNT_KEYS[status]] += 1;
    countsByType[TEST_TYPE_COUNT_KEYS.find((entry) => entry.id === testType)?.key ?? "unknown"] += 1;

    enriched.push({
      id: toItemId(row.id),
      testType,
      testTypeLabel:
        TEST_TYPE_CATALOG.find((entry) => entry.id === testType)?.label ?? "Unknown",
      status,
      statusLabel: STATUS_LABELS[status],
      scheduledDate: scheduledDateMs !== null ? new Date(scheduledDateMs).toISOString() : null,
      windowHours,
      riskTier,
      frequency: frequency.frequency,
      nextDueDate: nextDueMs !== null ? new Date(nextDueMs).toISOString() : null,
      isOverdue,
    });
  }

  const statusIndex = new Map<PenetrationTestStatus, number>(
    STATUS_ORDER.map((status, index) => [status, index])
  );
  const typeIndex = new Map<string, number>(
    TEST_TYPE_CATALOG.map((entry, index) => [entry.id, index])
  );

  const testsSorted = [...enriched].sort(
    (a, b) =>
      (statusIndex.get(a.status) ?? STATUS_ORDER.length) -
        (statusIndex.get(b.status) ?? STATUS_ORDER.length) ||
      (typeIndex.get(a.testType) ?? TEST_TYPE_CATALOG.length) -
        (typeIndex.get(b.testType) ?? TEST_TYPE_CATALOG.length) ||
      compareIds(a.id, b.id)
  );

  const overdueTests = testsSorted
    .filter((test) => test.isOverdue)
    .sort((a, b) => {
      const aMs = a.scheduledDate !== null ? Date.parse(a.scheduledDate) : Number.MAX_SAFE_INTEGER;
      const bMs = b.scheduledDate !== null ? Date.parse(b.scheduledDate) : Number.MAX_SAFE_INTEGER;
      return aMs - bMs || compareIds(a.id, b.id);
    });

  return {
    total: enriched.length,
    countsByStatus,
    countsByType,
    overdueCount: overdueTests.length,
    overdueTests,
    tests: testsSorted,
  };
}

/**
 * Run a red team exercise framework: enriches the 7-phase MITRE ATT&CK
 * catalog (recon -> reporting) with per-phase status (pending | active |
 * completed; invalid -> pending), started/completed timestamps, due times
 * (exercise endAt, else phase.estimatedEndAt) and overdue flags (active AND
 * dueAt < clock). `isCurrent` marks the first active phase, else the first
 * pending phase. Overall status precedence: completed (all phases completed)
 * > paused (explicit) > active (any active) > not-started. Verdict is only
 * read when the exercise is completed, else "unknown". Participants are
 * normalized by role (operator | observer | decision-maker; invalid ->
 * observer) and sorted role asc, name asc, id asc. Never throws — malformed
 * or empty input yields `EMPTY_RED_TEAM_EXERCISE`.
 */
export function runRedTeamExercise(
  exercise: RedTeamExerciseInput | null | undefined,
  opts?: SecurityTestingOptions | null
): RedTeamExerciseResult {
  if (!isObject(exercise)) {
    return { ...EMPTY_RED_TEAM_EXERCISE };
  }
  const safeOpts = isObject(opts) ? opts : {};
  const nowMs = toClock(safeOpts).getTime();
  const raw = exercise;

  const name = toName(raw.name);
  const startAtMs = toTimeMs(raw.startAt);
  const endAtMs = toTimeMs(raw.endAt);
  const exerciseStatusRaw = toLower(raw.status);

  // Match input phase rows to the catalog by id (last wins on duplicates).
  const phaseInputs = new Map<string, Record<string, unknown>>();
  if (Array.isArray(raw.phases)) {
    for (const rawPhase of raw.phases) {
      if (!isObject(rawPhase)) continue;
      const phaseId = toLower(rawPhase.id);
      if (phaseId !== "") {
        phaseInputs.set(phaseId, rawPhase);
      }
    }
  }

  const phases: RedTeamPhaseResult[] = RED_TEAM_PHASES.map((phase) => {
    const input = phaseInputs.get(phase.id);
    const phaseStatus = toPhaseStatus(input?.status);
    const startedAtMs = toTimeMs(input?.startedAt);
    const completedAtMs = toTimeMs(input?.completedAt);
    const estimatedEndAtMs = toTimeMs(input?.estimatedEndAt);
    const dueMs = endAtMs ?? estimatedEndAtMs;
    return {
      id: phase.id,
      name: toName(input?.name) || phase.name,
      tacticCodes: [...phase.tacticCodes],
      status: phaseStatus,
      statusBadge: PHASE_STATUS_LABELS[phaseStatus],
      startedAt: startedAtMs !== null ? new Date(startedAtMs).toISOString() : null,
      completedAt: completedAtMs !== null ? new Date(completedAtMs).toISOString() : null,
      dueAt: dueMs !== null ? new Date(dueMs).toISOString() : null,
      isOverdue: phaseStatus === "active" && dueMs !== null && dueMs < nowMs,
      isCurrent: false,
    };
  });

  // isCurrent: first active phase, else first pending phase.
  const activeIndex = phases.findIndex((phase) => phase.status === "active");
  const currentIndex =
    activeIndex >= 0 ? activeIndex : phases.findIndex((phase) => phase.status === "pending");
  if (currentIndex >= 0) {
    phases[currentIndex] = { ...phases[currentIndex], isCurrent: true };
  }

  const allCompleted = phases.every((phase) => phase.status === "completed");
  const anyActive = phases.some((phase) => phase.status === "active");
  let status: RedTeamExerciseStatus;
  if (allCompleted) {
    status = "completed";
  } else if (exerciseStatusRaw === "paused") {
    status = "paused";
  } else if (anyActive) {
    status = "active";
  } else {
    status = "not-started";
  }

  const verdict: RedTeamVerdict =
    status === "completed" ? (toVerdict(raw.verdict) ?? "unknown") : "unknown";

  // Participants: normalized by role, deduped (id, last wins), sorted.
  const roleOrder = ["operator", "observer", "decision-maker"] as const;
  const participantsById = new Map<string, RedTeamParticipantResult>();
  if (Array.isArray(raw.participants)) {
    for (const rawParticipant of raw.participants) {
      if (!isObject(rawParticipant)) continue;
      const participantId = toItemId(rawParticipant.id);
      const role = toParticipantRole(rawParticipant.role);
      participantsById.set(`${typeof participantId}:${String(participantId)}`, {
        id: participantId,
        name: toName(rawParticipant.name),
        role,
        roleLabel: ROLE_LABELS[role],
      });
    }
  }
  const participants = [...participantsById.values()].sort(
    (a, b) =>
      roleOrder.indexOf(a.role) - roleOrder.indexOf(b.role) ||
      a.name.localeCompare(b.name) ||
      compareIds(a.id, b.id)
  );

  const participantCounts: RedTeamParticipantCounts = {
    operator: 0,
    observer: 0,
    decisionMaker: 0,
  };
  for (const participant of participants) {
    if (participant.role === "operator") participantCounts.operator += 1;
    else if (participant.role === "decision-maker") participantCounts.decisionMaker += 1;
    else participantCounts.observer += 1;
  }

  const summary: RedTeamPhaseSummary = {
    totalPhases: phases.length,
    completedPhases: phases.filter((phase) => phase.status === "completed").length,
    activePhases: phases.filter((phase) => phase.status === "active").length,
    pendingPhases: phases.filter((phase) => phase.status === "pending").length,
    overduePhases: phases.filter((phase) => phase.isOverdue).length,
  };

  return {
    name,
    status,
    verdict,
    startAt: startAtMs !== null ? new Date(startAtMs).toISOString() : null,
    endAt: endAtMs !== null ? new Date(endAtMs).toISOString() : null,
    phases,
    participants,
    participantCounts,
    summary,
  };
}

/**
 * Assess security benchmark compliance (CIS Critical Security Controls v8
 * implementation groups IG1-IG3 + NIST CSF 2.0 functions Govern..Recover).
 * Per-category score = pass / (pass + fail) * 100 (1 decimal; 0 when no
 * applicable controls); n/a controls are excluded from the denominator.
 * Categories appear in catalog order. The overall score / pass rate is the
 * aggregate pass rate (total pass / total applicable, 1 decimal). Top gaps
 * are failing controls sorted by category order then controlId asc, capped
 * at 5, each with remediation from a stable keyword catalog (generic
 * fallback). Unknown benchmark, category or status skips the row. Never
 * throws — malformed or empty input yields `EMPTY_BENCHMARK_ASSESSMENT`.
 */
export function assessSecurityBenchmarks(
  assessments: Array<BenchmarkAssessmentInput> | null | undefined,
  opts?: SecurityTestingOptions | null
): BenchmarkAssessmentResult {
  const rows = Array.isArray(assessments) ? assessments : [];

  interface CategoryAcc {
    benchmark: BenchmarkFamily;
    category: string;
    name: string;
    pass: number;
    fail: number;
    na: number;
    failItems: Array<{ controlId: string; controlName: string }>;
  }

  const acc = new Map<string, CategoryAcc>();
  for (const cat of BENCHMARK_CATEGORY_ORDER) {
    acc.set(`${cat.benchmark}:${cat.category}`, {
      benchmark: cat.benchmark,
      category: cat.category,
      name: cat.name,
      pass: 0,
      fail: 0,
      na: 0,
      failItems: [],
    });
  }

  for (const rawRow of rows) {
    if (!isObject(rawRow)) continue;
    const benchmark = toBenchmarkFamily(rawRow.benchmark);
    if (benchmark === null) continue;
    const category = toBenchmarkCategory(benchmark, rawRow.category);
    if (category === null) continue;
    const status = toAssessmentStatus(rawRow.status);
    if (status === null) continue;
    const entry = acc.get(`${benchmark}:${category.category}`);
    if (!entry) continue;
    if (status === "pass") {
      entry.pass += 1;
    } else if (status === "fail") {
      entry.fail += 1;
      entry.failItems.push({
        controlId: toControlId(rawRow.controlId),
        controlName: toName(rawRow.controlName),
      });
    } else {
      entry.na += 1;
    }
  }

  const categoryIndex = new Map<string, number>(
    BENCHMARK_CATEGORY_ORDER.map((cat, index) => [`${cat.benchmark}:${cat.category}`, index])
  );

  const categories: BenchmarkCategoryResult[] = BENCHMARK_CATEGORY_ORDER.map((cat) => {
    const entry = acc.get(`${cat.benchmark}:${cat.category}`) as CategoryAcc;
    const applicable = entry.pass + entry.fail;
    return {
      benchmark: entry.benchmark,
      category: entry.category,
      categoryName: entry.name,
      pass: entry.pass,
      fail: entry.fail,
      na: entry.na,
      applicable,
      categoryScore: applicable > 0 ? round1((entry.pass / applicable) * 100) : 0,
    };
  });

  let totalPass = 0;
  let totalFail = 0;
  let totalNa = 0;
  for (const cat of categories) {
    totalPass += cat.pass;
    totalFail += cat.fail;
    totalNa += cat.na;
  }
  const totalApplicable = totalPass + totalFail;
  const overallScore = totalApplicable > 0 ? round1((totalPass / totalApplicable) * 100) : 0;

  // Top gaps: failing controls, category order then controlId asc, capped 5.
  const gapCandidates: Array<{ categoryKey: string; controlId: string; controlName: string }> = [];
  for (const entry of acc.values()) {
    for (const failItem of entry.failItems) {
      gapCandidates.push({
        categoryKey: `${entry.benchmark}:${entry.category}`,
        controlId: failItem.controlId,
        controlName: failItem.controlName,
      });
    }
  }
  const topGaps: BenchmarkGap[] = gapCandidates
    .sort(
      (a, b) =>
        (categoryIndex.get(a.categoryKey) ?? Number.MAX_SAFE_INTEGER) -
          (categoryIndex.get(b.categoryKey) ?? Number.MAX_SAFE_INTEGER) ||
        a.controlId.localeCompare(b.controlId)
    )
    .slice(0, 5)
    .map((gap) => {
      const [benchmark, category] = gap.categoryKey.split(":") as [BenchmarkFamily, string];
      const cat = BENCHMARK_CATEGORY_ORDER.find(
        (entry) => entry.benchmark === benchmark && entry.category === category
      );
      return {
        benchmark,
        category,
        categoryName: cat?.name ?? category,
        controlId: gap.controlId,
        controlName: gap.controlName,
        remediation: remediationForControl(gap.controlId, gap.controlName),
      };
    });

  return {
    overallScore,
    passRate: overallScore,
    totalApplicable,
    totalPass,
    totalFail,
    totalNa,
    categories,
    topGaps,
  };
}

/**
 * Track automated vulnerability scanning coverage per asset class
 * (external-ip, internal-host, web-app, api, cloud-asset). An asset is
 * within SLA when due >= clock, where due = dueAt override (when present and
 * valid) else lastScanAt + scanFrequencyHours (missing/invalid frequency ->
 * 0). Rows without any timing information, or with an unknown asset class,
 * are filtered. daysOverdue = floor((now - due) / day), signed (negative
 * while not yet due). Assets are sorted by class catalog order, then name
 * asc, then id asc. Never throws — malformed or empty input yields
 * `EMPTY_SCAN_COVERAGE`.
 */
export function trackScanCoverage(
  assets: Array<ScanCoverageAssetInput> | null | undefined,
  opts?: SecurityTestingOptions | null
): ScanCoverageResult {
  const safeOpts = isObject(opts) ? opts : {};
  const nowMs = toClock(safeOpts).getTime();
  const rows = Array.isArray(assets) ? assets : [];

  interface NormalizedAsset {
    id: string | number;
    assetName: string;
    assetClass: string;
    assetClassName: string;
    scanFrequencyHours: number;
    lastScanAtMs: number | null;
    dueMs: number;
    inSla: boolean;
    daysOverdue: number;
  }

  const normalized: NormalizedAsset[] = [];
  for (const rawRow of rows) {
    if (!isObject(rawRow)) continue;
    const assetClass = toAssetClass(rawRow.assetClass);
    if (assetClass === null) continue;
    const lastScanAtMs = toTimeMs(rawRow.lastScanAt);
    const dueAtMs = toTimeMs(rawRow.dueAt);
    const freqRaw = rawRow.scanFrequencyHours;
    const scanFrequencyHours =
      typeof freqRaw === "number" && Number.isFinite(freqRaw) ? Math.max(0, freqRaw) : 0;

    let dueMs: number | null = null;
    if (dueAtMs !== null) {
      dueMs = dueAtMs;
    } else if (lastScanAtMs !== null) {
      dueMs = lastScanAtMs + scanFrequencyHours * HOUR_MS;
    }
    if (dueMs === null) continue;

    const inSla = dueMs >= nowMs;
    normalized.push({
      id: toItemId(rawRow.id),
      assetName: toName(rawRow.assetName),
      assetClass: assetClass.id,
      assetClassName: assetClass.label,
      scanFrequencyHours,
      lastScanAtMs,
      dueMs,
      inSla,
      daysOverdue: Math.floor((nowMs - dueMs) / DAY_MS),
    });
  }

  const classIndex = new Map<string, number>(
    ASSET_CLASS_ORDER.map((entry, index) => [entry.id, index])
  );

  const assetsSorted = [...normalized].sort(
    (a, b) =>
      (classIndex.get(a.assetClass) ?? ASSET_CLASS_ORDER.length) -
        (classIndex.get(b.assetClass) ?? ASSET_CLASS_ORDER.length) ||
      a.assetName.localeCompare(b.assetName) ||
      compareIds(a.id, b.id)
  );

  const byClass: ScanCoverageClassResult[] = ASSET_CLASS_ORDER.map((entry) => {
    const members = assetsSorted.filter((asset) => asset.assetClass === entry.id);
    const covered = members.filter((asset) => asset.inSla).length;
    const total = members.length;
    return {
      assetClass: entry.id,
      assetClassName: entry.label,
      total,
      covered,
      overdue: total - covered,
      coverageRate: total > 0 ? round1((covered / total) * 100) : 0,
    };
  });

  const totalAssets = assetsSorted.length;
  const coveredCount = assetsSorted.filter((asset) => asset.inSla).length;

  return {
    totalAssets,
    coveredCount,
    overdueCount: totalAssets - coveredCount,
    coverageRate: totalAssets > 0 ? round1((coveredCount / totalAssets) * 100) : 0,
    byClass,
    assets: assetsSorted.map((asset) => ({
      id: asset.id,
      assetName: asset.assetName,
      assetClass: asset.assetClass,
      assetClassName: asset.assetClassName,
      scanFrequencyHours: asset.scanFrequencyHours,
      lastScanAt: asset.lastScanAtMs !== null ? new Date(asset.lastScanAtMs).toISOString() : null,
      dueAt: new Date(asset.dueMs).toISOString(),
      inSla: asset.inSla,
      isOverdue: !asset.inSla,
      daysOverdue: asset.daysOverdue,
    })),
  };
}
