/**
 * NIS2 Policy Center engine.
 *
 * Cycle 23 (NIS2 Implementation Plan Phase 6 Task 6.1 "Article 21-specific
 * policy templates mapped to ENISA Measures 1.1 - 12.1"): provides the pure
 * policy-template catalog (one template per ENISA measure row of the plan's
 * ENISA -> NIS2 Article 21(2) -> ISO/IEC 27001:2022 mapping table), a gap
 * analysis between implemented policies and the required templates, an
 * approval-workflow tracker, and a version history tracker.
 * Pure view-model logic - no DB, no network, no side effects.
 *
 * Design rules (house pattern - mirrors lib/nis2/complianceMonitor.ts):
 * - Pure and deterministic: no I/O, no DB, no Math.random, no
 *   iteration-order dependent logic. Same input always yields the same
 *   output.
 * - NEVER throws: malformed input (null/non-object rows, missing/invalid
 *   dates, NaN numbers, non-array collections) is coerced to safe neutral
 *   values and yields the documented safe shape (the exported EMPTY_* frozen
 *   constants).
 * - Injectable clock: each function accepts an optional `now` (epoch-ms
 *   number or ISO-8601 string) or a `clock` factory `() => Date`; when both
 *   are missing it defaults to `new Date()`. Tests may pin the clock for
 *   reproducibility.
 * - Time arithmetic uses fixed millisecond constants (one day = 24h).
 * - All numeric outputs are rounded deterministically: rates to 1 decimal,
 *   counts to whole numbers.
 */

/* ------------------------------------------------------------------ */
/* Public types                                                        */
/* ------------------------------------------------------------------ */

/** Injectable clock options shared by every engine function. */
export interface PolicyTemplatesNis2Options {
  /** Pin "now": epoch-ms number or ISO-8601 string. */
  now?: string | number | null;
  /** Pin "now" via a factory; used only when `now` is absent/invalid. */
  clock?: (() => Date) | null;
}

/** NIS2 Article 21(2) category key (a-j, lowercase). */
export type Nis2Article21Category = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j";

/** One policy template row (ENISA measure + ISO 27001:2022 mapping). */
export interface Nis2PolicyTemplate {
  /** Stable slug id. */
  id: string;
  title: string;
  /** NIS2 Article 21(2) category key (a-j). */
  article21Category: Nis2Article21Category;
  /** Human-readable NIS2 Article 21(2) requirement title. */
  article21Title: string;
  /** ENISA measure id, e.g. "1.1". */
  enisaMeasureId: string;
  /** ENISA measure title, e.g. "Information Systems Security Policy". */
  enisaMeasureTitle: string;
  /** ISO/IEC 27001:2022 control ids, e.g. "A.5.1". */
  isoControls: string[];
  /** Short plain-text summary of the template. */
  summary: string;
  /** Suggested document sections. */
  requiredSections: string[];
  /** Recommended review cadence in days (positive integer). */
  reviewCadenceDays: number;
  /** Owner role accountable for the policy. */
  ownerRole: string;
  /** Entity applicability, e.g. ["essential", "important", "all"]. */
  applicability: string[];
}

/** Input for `getNis2PolicyTemplates`. */
export interface Nis2PolicyTemplatesInput extends PolicyTemplatesNis2Options {
  /** Exact-match filter on article21Category (a-j). */
  category?: string | null;
  /** Exact-match filter on enisaMeasureId (e.g. "6.2"). */
  measureId?: string | null;
  /** Case-insensitive substring filter over title/summary/enisaMeasureTitle. */
  search?: string | null;
  /** Positive integer cap applied last; absent/invalid means no limit. */
  limit?: number | null;
}

/** Output of `getNis2PolicyTemplates`. */
export interface Nis2PolicyTemplatesResult {
  total: number;
  /** Echoes the applied category filter; absent when none was applied. */
  category?: string;
  /** Echoes the applied measureId filter; absent when none was applied. */
  measureId?: string;
  items: Nis2PolicyTemplate[];
}

/** One implemented policy row for `analyzePolicyGap`. */
export interface Nis2PolicyGapPolicyInput {
  id?: string | number | null;
  title?: string | null;
  isoControls?: string[] | null;
  status?: string | null;
  lastReviewedAt?: string | number | null;
}

/** Input for `analyzePolicyGap`. */
export interface Nis2PolicyGapAnalysisInput extends PolicyTemplatesNis2Options {
  /** Implemented policies; every row is treated as implemented. */
  policies?: Array<Nis2PolicyGapPolicyInput> | null;
  /** Template catalog to assess against; default = the built-in catalog. */
  templates?: Nis2PolicyTemplate[] | null;
}

/** One uncovered template in the gap analysis. */
export interface Nis2PolicyGap {
  templateId: string;
  title: string;
  enisaMeasureId: string;
  /** Uncovered ISO controls only (controls no implemented policy covers). */
  isoControls: string[];
  /** Deterministic remediation hint. */
  recommendation: string;
}

/** One ISO control rollup row in the gap analysis. */
export interface Nis2IsoControlRollup {
  isoControl: string;
  /** True when any implemented policy covers the control. */
  implemented: boolean;
  /** Number of templates referencing the control. */
  templateCount: number;
  status: "covered" | "gap";
}

/** Output of `analyzePolicyGap`. */
export interface Nis2PolicyGapAnalysis {
  /** covered / totalTemplates * 100, 1 decimal (0 when total is 0). */
  coverageRate: number;
  totalTemplates: number;
  coveredCount: number;
  gapCount: number;
  /** Uncovered templates, enisaMeasureId asc then title asc. */
  gaps: Nis2PolicyGap[];
  /** Per-ISO-control rollups, isoControl asc. */
  byIsoControl: Nis2IsoControlRollup[];
  /** Up to 5 deterministic recommendations derived from the gaps. */
  recommendations: string[];
  /** Number of implemented policies supplied as input. */
  totalImplementedPolicies: number;
}

/** Normalized approval statuses. */
export type Nis2PolicyApprovalStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "rejected"
  | "changes_requested"
  | "unknown";

/** One reviewer row for `runPolicyApproval`. */
export interface Nis2PolicyReviewerInput {
  id?: string | number | null;
  name?: string | null;
  decision?: "approved" | "rejected" | "changes_requested" | null;
  comment?: string | null;
  decidedAt?: string | number | null;
}

/** Enriched reviewer row returned by `runPolicyApproval`. */
export interface Nis2PolicyReviewerOutput {
  id: string | null;
  name: string | null;
  decision: "approved" | "rejected" | "changes_requested" | null;
  comment: string | null;
  decidedAt: string | number | null;
  status: "approved" | "rejected" | "changes_requested" | "pending";
}

/** One workflow step of the approval tracker. */
export interface Nis2PolicyApprovalStep {
  label: string;
  status: "done" | "current" | "pending";
}

/** Input for `runPolicyApproval`. */
export interface Nis2PolicyApprovalInput extends PolicyTemplatesNis2Options {
  policyId?: string | number | null;
  policyTitle?: string | null;
  status?: string | null;
  submittedAt?: string | number | null;
  reviewers?: Array<Nis2PolicyReviewerInput> | null;
  /** Approvals required for approval; default 1. */
  requiredApprovals?: number | null;
  /** Review SLA in days; default 14. */
  slaDays?: number | null;
}

/** Output of `runPolicyApproval`. */
export interface Nis2PolicyApproval {
  policyId: string | null;
  policyTitle: string;
  status: Nis2PolicyApprovalStatus;
  /** Short verdict: approved / rejected / changes_requested / draft /
   *  unknown / "Awaiting review". */
  verdict: string;
  approvalCount: number;
  /** Reviewers that decided "rejected". */
  rejectionCount: number;
  /** Reviewers that decided "changes_requested". */
  changesRequestedCount: number;
  /** Reviewers that have not decided yet. */
  pendingCount: number;
  requiredApprovals: number;
  /** decisions made / requiredApprovals * 100, 1 decimal (0 when invalid). */
  reviewProgress: number;
  complete: boolean;
  overdue: boolean;
  /** Whole floor days from submittedAt to now; null when invalid. */
  daysInReview: number | null;
  steps: Nis2PolicyApprovalStep[];
  reviewers: Nis2PolicyReviewerOutput[];
  nextAction: string;
}

/** One version row for `trackPolicyVersions`. */
export interface Nis2PolicyVersionInput {
  version?: string | number | null;
  label?: string | null;
  createdAt?: string | number | null;
  status?: string | null;
  changeSummary?: string | null;
}

/** Enriched version entry returned by `trackPolicyVersions`. */
export interface Nis2PolicyVersionEntry {
  /** Version label ("" when missing). */
  version: string;
  /** ISO-8601 string, or null when invalid/missing. */
  createdAt: string | null;
  status: "current" | "superseded" | "draft";
  /** Change summary ("" when missing). */
  changeSummary: string;
}

/** Input for `trackPolicyVersions`. */
export interface Nis2PolicyVersionHistoryInput extends PolicyTemplatesNis2Options {
  policyId?: string | number | null;
  versions?: Array<Nis2PolicyVersionInput> | null;
}

/** Output of `trackPolicyVersions`. */
export interface Nis2PolicyVersionHistory {
  policyId?: string | null;
  totalVersions: number;
  /** Label of the latest version; null when empty. */
  latestVersion: string | null;
  /** Same as latestVersion. */
  currentVersion: string | null;
  draftCount: number;
  approvedCount: number;
  supersededCount: number;
  /** Versions sorted createdAt asc (invalid/null last) then label asc. */
  versions: Nis2PolicyVersionEntry[];
  /** Every non-empty changeSummary in version order. */
  changes: string[];
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const DAY_MS = 24 * 60 * 60 * 1000;
/** Default approvals required for the approval workflow. */
const DEFAULT_REQUIRED_APPROVALS = 1;
/** Default review SLA in days. */
const DEFAULT_SLA_DAYS = 14;
/** Max deterministic recommendations in the gap analysis. */
const MAX_RECOMMENDATIONS = 5;

/** NIS2 Directive (EU) 2022/2555 Article 21(2) requirement titles. */
const ARTICLE_21_TITLES: Readonly<Record<string, string>> = {
  a: "Policies on risk analysis and information system security",
  b: "Incident handling",
  c: "Business continuity, such as backup management and disaster recovery, and crisis management",
  d: "Supply chain security, including security-related aspects of relationships with direct suppliers or service providers",
  e: "Security in network and information systems acquisition, development and maintenance, including vulnerability handling and disclosure",
  f: "Policies and procedures to assess the effectiveness of cybersecurity risk-management measures",
  g: "Basic cyber hygiene practices and cybersecurity training",
  h: "Policies and procedures regarding the use of cryptography and, where appropriate, encryption",
  i: "Human resources security, access control policies and asset management",
  j: "Use of multi-factor authentication or continuous authentication solutions, secured voice, video and text communications and secured emergency communication systems within the entity",
};

/**
 * Built-in NIS2 policy template catalog: one template per ENISA measure row
 * of the NIS2 Implementation Plan mapping table (ENISA -> NIS2 Art. 21(2) ->
 * ISO/IEC 27001:2022). Ordered enisaMeasureId asc.
 */
export const NIS2_POLICY_TEMPLATE_CATALOG: ReadonlyArray<Nis2PolicyTemplate> = deepFreeze([
  {
    id: "information-systems-security-policy",
    title: "Information Systems Security Policy",
    article21Category: "a",
    article21Title: ARTICLE_21_TITLES.a,
    enisaMeasureId: "1.1",
    enisaMeasureTitle: "Information Systems Security Policy",
    isoControls: ["5.2", "A.5.1", "A.5.36", "A.5.4"],
    summary:
      "Top-level security policy defining the entity's information systems security objectives, governance structure and mandatory baseline controls for essential and important services.",
    requiredSections: [
      "Policy purpose and scope",
      "Roles and responsibilities",
      "Security objectives and governance",
      "Compliance and review",
    ],
    reviewCadenceDays: 365,
    ownerRole: "CISO",
    applicability: ["essential", "important", "all"],
  },
  {
    id: "risk-management-framework",
    title: "Risk Management Framework",
    article21Category: "a",
    article21Title: ARTICLE_21_TITLES.a,
    enisaMeasureId: "2.1",
    enisaMeasureTitle: "Risk Management Framework",
    isoControls: ["6.1.2", "6.1.3", "A.5.7", "A.5.19"],
    summary:
      "Framework for identifying, analysing and treating cybersecurity risks to the entity's essential and important services, including risk appetite and scenario-based assessments.",
    requiredSections: [
      "Risk identification and taxonomy",
      "Risk assessment methodology",
      "Risk appetite and treatment",
      "Risk register and review cycles",
    ],
    reviewCadenceDays: 180,
    ownerRole: "Chief Risk Officer",
    applicability: ["essential", "important", "all"],
  },
  {
    id: "incident-handling-policy",
    title: "Incident Handling Policy",
    article21Category: "b",
    article21Title: ARTICLE_21_TITLES.b,
    enisaMeasureId: "3.1",
    enisaMeasureTitle: "Incident Handling Policy",
    isoControls: ["A.5.24", "A.5.25", "A.5.26"],
    summary:
      "End-to-end incident response lifecycle covering classification tiers, severity scoring, escalation paths and CSIRT coordination with reporting obligations.",
    requiredSections: [
      "Incident classification and severity",
      "Response roles and escalation",
      "Reporting and notification timelines",
      "Post-incident review",
    ],
    reviewCadenceDays: 180,
    ownerRole: "CSIRT Lead",
    applicability: ["essential", "important", "all"],
  },
  {
    id: "business-continuity-disaster-recovery-plan",
    title: "BC & Disaster Recovery Plan",
    article21Category: "c",
    article21Title: ARTICLE_21_TITLES.c,
    enisaMeasureId: "4.1",
    enisaMeasureTitle: "BC & Disaster Recovery Plan",
    isoControls: ["A.5.29", "A.5.30"],
    summary:
      "Business continuity and disaster recovery plan ensuring resilience, backup management and timely recovery of essential services during and after disruptions.",
    requiredSections: [
      "Business impact analysis",
      "Recovery objectives (RTO/RPO)",
      "Backup management",
      "Crisis management and testing",
    ],
    reviewCadenceDays: 180,
    ownerRole: "COO",
    applicability: ["essential", "important"],
  },
  {
    id: "supply-chain-security-policy",
    title: "Supply Chain Security Policy",
    article21Category: "d",
    article21Title: ARTICLE_21_TITLES.d,
    enisaMeasureId: "5.1",
    enisaMeasureTitle: "Supply Chain Security Policy",
    isoControls: ["A.5.19", "A.5.20", "A.5.21", "A.8.30"],
    summary:
      "Security requirements for suppliers and service providers covering risk scoring, contractual security clauses, SLAs and lifecycle management of third-party relationships.",
    requiredSections: [
      "Supplier risk classification",
      "Contractual security requirements",
      "Supplier assessment and monitoring",
      "Third-party incident management",
    ],
    reviewCadenceDays: 180,
    ownerRole: "Procurement Director",
    applicability: ["essential", "important", "all"],
  },
  {
    id: "network-security",
    title: "Network Security",
    article21Category: "e",
    article21Title: ARTICLE_21_TITLES.e,
    enisaMeasureId: "6.7",
    enisaMeasureTitle: "Network Security",
    isoControls: ["A.8.16", "A.8.20", "A.8.22"],
    summary:
      "Security architecture and operational controls for networks, including segmentation, monitoring, segregation of duties and protection of network services.",
    requiredSections: [
      "Network architecture and zoning",
      "Segmentation and access rules",
      "Network monitoring and logging",
      "Security testing of network controls",
    ],
    reviewCadenceDays: 180,
    ownerRole: "Network Security Architect",
    applicability: ["essential", "important", "all"],
  },
  {
    id: "secure-development-sdlc",
    title: "Secure Development (SDLC)",
    article21Category: "e",
    article21Title: ARTICLE_21_TITLES.e,
    enisaMeasureId: "6.2",
    enisaMeasureTitle: "Secure Development (SDLC)",
    isoControls: ["A.8.25", "A.8.26", "A.8.31"],
    summary:
      "Secure software development lifecycle covering security requirements, secure coding standards, vulnerability handling and disclosure and release management.",
    requiredSections: [
      "Security requirements in the SDLC",
      "Secure coding standards",
      "Vulnerability handling and disclosure",
      "Release and change management",
    ],
    reviewCadenceDays: 180,
    ownerRole: "Head of Engineering",
    applicability: ["essential", "important", "all"],
  },
  {
    id: "effectiveness-assessment",
    title: "Effectiveness Assessment",
    article21Category: "f",
    article21Title: ARTICLE_21_TITLES.f,
    enisaMeasureId: "7.1",
    enisaMeasureTitle: "Effectiveness Assessment",
    isoControls: ["9.1", "9.2", "9.3"],
    summary:
      "Policies and procedures to assess the effectiveness of cybersecurity risk-management measures through monitoring, measurement, management review and continuous improvement.",
    requiredSections: [
      "Assessment methodology and metrics",
      "Monitoring and measurement",
      "Management review",
      "Continuous improvement plan",
    ],
    reviewCadenceDays: 365,
    ownerRole: "CISO",
    applicability: ["essential", "important", "all"],
  },
  {
    id: "awareness-and-hygiene",
    title: "Awareness and Hygiene",
    article21Category: "g",
    article21Title: ARTICLE_21_TITLES.g,
    enisaMeasureId: "8.1",
    enisaMeasureTitle: "Awareness and Hygiene",
    isoControls: ["7.3", "A.6.3"],
    summary:
      "Basic cyber hygiene practices and cybersecurity training programmes ensuring all personnel understand and apply secure behaviours in their daily work.",
    requiredSections: [
      "Awareness training programme",
      "Cyber hygiene practices",
      "Phishing and social engineering defence",
      "Training effectiveness measurement",
    ],
    reviewCadenceDays: 365,
    ownerRole: "Head of Security Awareness",
    applicability: ["essential", "important", "all"],
  },
  {
    id: "cryptography-and-encryption",
    title: "Cryptography & Encryption",
    article21Category: "h",
    article21Title: ARTICLE_21_TITLES.h,
    enisaMeasureId: "9.1",
    enisaMeasureTitle: "Cryptography & Encryption",
    isoControls: ["A.5.31", "A.8.24"],
    summary:
      "Policies and procedures for the use of cryptography and, where appropriate, encryption to protect data in transit and at rest, including key management.",
    requiredSections: [
      "Cryptographic controls catalogue",
      "Key management and lifecycle",
      "Data at rest and in transit encryption",
      "Cryptographic review and decommissioning",
    ],
    reviewCadenceDays: 180,
    ownerRole: "CISO",
    applicability: ["essential", "important", "all"],
  },
  {
    id: "hr-security",
    title: "HR Security",
    article21Category: "i",
    article21Title: ARTICLE_21_TITLES.i,
    enisaMeasureId: "10.1",
    enisaMeasureTitle: "HR Security",
    isoControls: ["7.1", "7.2", "A.6.2", "A.6.3"],
    summary:
      "Human resources security controls across recruitment, employment and termination lifecycles, including screening, terms of employment and awareness responsibilities.",
    requiredSections: [
      "Pre-employment screening",
      "Terms and conditions of employment",
      "Awareness and competency requirements",
      "Offboarding and access revocation",
    ],
    reviewCadenceDays: 365,
    ownerRole: "HR Director",
    applicability: ["essential", "important", "all"],
  },
  {
    id: "access-control-policy",
    title: "Access Control Policy",
    article21Category: "j",
    article21Title: ARTICLE_21_TITLES.j,
    enisaMeasureId: "11.1",
    enisaMeasureTitle: "Access Control Policy",
    isoControls: ["A.5.15", "A.5.18", "A.8.3"],
    summary:
      "Access control policy governing identity, authentication and authorisation across information systems and data, including privileged access and access reviews.",
    requiredSections: [
      "Access control principles",
      "Identity and authentication",
      "Privileged access management",
      "Access review and revocation",
    ],
    reviewCadenceDays: 180,
    ownerRole: "IAM Lead",
    applicability: ["essential", "important", "all"],
  },
  {
    id: "asset-classification-handling",
    title: "Asset Classification & Handling",
    article21Category: "j",
    article21Title: ARTICLE_21_TITLES.j,
    enisaMeasureId: "12.1",
    enisaMeasureTitle: "Asset Classification & Handling",
    isoControls: ["A.5.9", "A.5.12", "A.5.13"],
    summary:
      "Asset classification and handling rules ensuring information assets are inventoried, owned, labelled and protected according to their classification.",
    requiredSections: [
      "Asset inventory and ownership",
      "Classification scheme and labelling",
      "Handling and transmission rules",
      "Asset lifecycle and disposal",
    ],
    reviewCadenceDays: 365,
    ownerRole: "Information Asset Owner",
    applicability: ["essential", "important", "all"],
  },
]);

/** Fixed approval workflow step labels (order matters). */
const APPROVAL_STEP_LABELS: ReadonlyArray<string> = [
  "Draft",
  "Submit for review",
  "Review",
  "Approve / Request changes / Reject",
];

/** Empty policy template list (exported safe shape for malformed input). */
export const EMPTY_POLICY_TEMPLATE_LIST: Nis2PolicyTemplatesResult = deepFreeze({
  total: 0,
  items: [],
});

/** Empty policy gap analysis (exported safe shape for malformed input). */
export const EMPTY_POLICY_GAP_ANALYSIS: Nis2PolicyGapAnalysis = deepFreeze({
  coverageRate: 0,
  totalTemplates: 0,
  coveredCount: 0,
  gapCount: 0,
  gaps: [],
  byIsoControl: [],
  recommendations: [],
  totalImplementedPolicies: 0,
});

/** Empty policy approval (exported safe shape for malformed input). */
export const EMPTY_POLICY_APPROVAL: Nis2PolicyApproval = deepFreeze({
  policyId: null,
  policyTitle: "",
  status: "unknown",
  verdict: "unknown",
  approvalCount: 0,
  rejectionCount: 0,
  changesRequestedCount: 0,
  pendingCount: 0,
  requiredApprovals: DEFAULT_REQUIRED_APPROVALS,
  reviewProgress: 0,
  complete: false,
  overdue: false,
  daysInReview: null,
  steps: APPROVAL_STEP_LABELS.map((label) => ({ label, status: "pending" })),
  reviewers: [],
  nextAction: "Policy status unknown",
});

/** Empty policy version history (exported safe shape for malformed input). */
export const EMPTY_POLICY_VERSION_HISTORY: Nis2PolicyVersionHistory = deepFreeze({
  totalVersions: 0,
  latestVersion: null,
  currentVersion: null,
  draftCount: 0,
  approvedCount: 0,
  supersededCount: 0,
  versions: [],
  changes: [],
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
      // a throwing clock factory must never break the engine - fall through
    }
  }
  return new Date();
};

/** Coerce an id-like field to a string, or null when missing/invalid. */
const toIdString = (value: unknown): string | null => {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim() !== "") return value;
  return null;
};

/** Coerce a name; missing/blank -> "". */
const toName = (value: unknown): string => {
  return typeof value === "string" ? value.trim() : "";
};

/** Coerce a finite number to a safe integer count (negatives -> 0). */
const toCount = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
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

/** Compare two nullable strings; null sorts last. */
const compareNullableStrings = (a: string | null, b: string | null): number => {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a.localeCompare(b);
};

/**
 * Compare ENISA measure ids numerically ("1.1" < "2.1" < ... < "10.1" <
 * "11.1" < "12.1"): split into (major, minor) parts and compare each
 * numerically. Non-numeric / missing ids sort last; same-major ties break
 * on the minor part, then the raw string as a stable fallback.
 */
const compareEnisaMeasureId = (a: string | null, b: string | null): number => {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  const parse = (value: string): [number, number] => {
    const [major, minor] = value.split(".").map((part) => Number(part));
    return [
      Number.isFinite(major) ? major : Number.POSITIVE_INFINITY,
      Number.isFinite(minor) ? minor : 0,
    ];
  };
  const [aMajor, aMinor] = parse(a);
  const [bMajor, bMinor] = parse(b);
  if (aMajor !== bMajor) return aMajor - bMajor;
  if (aMinor !== bMinor) return aMinor - bMinor;
  return a.localeCompare(b);
};

/** Fresh mutable copy of the empty template list. */
const cloneEmptyTemplateList = (): Nis2PolicyTemplatesResult => ({
  ...EMPTY_POLICY_TEMPLATE_LIST,
  items: [],
});

/** Fresh mutable copy of the empty gap analysis. */
const cloneEmptyGapAnalysis = (): Nis2PolicyGapAnalysis => ({
  ...EMPTY_POLICY_GAP_ANALYSIS,
  gaps: [],
  byIsoControl: [],
  recommendations: [],
});

/** Fresh mutable copy of the empty approval. */
const cloneEmptyApproval = (): Nis2PolicyApproval => ({
  ...EMPTY_POLICY_APPROVAL,
  steps: EMPTY_POLICY_APPROVAL.steps.map((step) => ({ ...step })),
  reviewers: [],
});

/** Fresh mutable copy of the empty version history. */
const cloneEmptyVersionHistory = (): Nis2PolicyVersionHistory => ({
  ...EMPTY_POLICY_VERSION_HISTORY,
  versions: [],
  changes: [],
});

/** Lowercase word tokens of length >= 3, deduplicated, in first-seen order. */
const toWordTokens = (value: string): string[] => {
  const tokens: string[] = [];
  const seen = new Set<string>();
  for (const raw of value.toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length < 3 || seen.has(raw)) continue;
    seen.add(raw);
    tokens.push(raw);
  }
  return tokens;
};

/** True when two word token sets share at least one exact word. */
const sharesWord = (a: string[], b: string[]): boolean => {
  const setB = new Set(b);
  return a.some((word) => setB.has(word));
};

/** Stable slug from a title (lowercase, runs of non-alphanumerics -> "-"). */
const toSlug = (title: string): string => {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug !== "" ? slug : "template";
};

/** Normalize a template-like row into the catalog shape. */
const normalizeTemplate = (raw: unknown): Nis2PolicyTemplate => {
  const row = isObject(raw) ? raw : {};
  const title = toName(row.title) || toName(row.enisaMeasureTitle) || "Unnamed Template";
  const category = toName(row.article21Category).toLowerCase();
  return {
    id: toIdString(row.id) ?? toSlug(title),
    title,
    article21Category: isArticle21Category(category) ? category : "a",
    article21Title: toName(row.article21Title) || (ARTICLE_21_TITLES[category] ?? ""),
    enisaMeasureId: toName(row.enisaMeasureId),
    enisaMeasureTitle: toName(row.enisaMeasureTitle),
    isoControls: normalizeControlList(row.isoControls),
    summary: toName(row.summary),
    requiredSections: normalizeStringList(row.requiredSections),
    reviewCadenceDays: toCount(row.reviewCadenceDays) || 365,
    ownerRole: toName(row.ownerRole) || "Unassigned",
    applicability: normalizeStringList(row.applicability),
  };
};

/** True when the value is one of the NIS2 Article 21(2) category keys. */
const isArticle21Category = (value: string): value is Nis2Article21Category => {
  return /^[a-j]$/.test(value);
};

/** Normalize a list of strings: trim, drop blanks, dedupe, keep order. */
const normalizeStringList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const trimmed = entry.trim();
    if (trimmed === "" || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
};

/** Normalize an ISO control list (same rules as normalizeStringList). */
const normalizeControlList = (value: unknown): string[] => normalizeStringList(value);

/* ------------------------------------------------------------------ */
/* Public engine functions                                             */
/* ------------------------------------------------------------------ */

/**
 * List NIS2 policy templates from the built-in catalog (one template per
 * ENISA measure row of the plan's mapping table: 1.1, 2.1, 3.1, 4.1, 5.1,
 * 6.7, 6.2, 7.1, 8.1, 9.1, 10.1, 11.1, 12.1). `category` and `measureId`
 * are exact-match filters; `search` is a case-insensitive substring over
 * title / summary / enisaMeasureTitle; `limit` (positive integer) is applied
 * last. Items are sorted enisaMeasureId asc then title asc. Never throws -
 * non-object input yields `EMPTY_POLICY_TEMPLATE_LIST`.
 */
export function getNis2PolicyTemplates(
  input: Nis2PolicyTemplatesInput | null | undefined
): Nis2PolicyTemplatesResult {
  if (!isObject(input)) {
    return cloneEmptyTemplateList();
  }

  const category = toName(input.category);
  const measureId = toName(input.measureId);
  const search = toName(input.search).toLowerCase();
  const rawLimit = input.limit;
  const limit =
    typeof rawLimit === "number" && Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.round(rawLimit)
      : null;

  let items = NIS2_POLICY_TEMPLATE_CATALOG.map((template) => ({ ...template, isoControls: [...template.isoControls] }));
  if (category !== "") {
    items = items.filter((template) => template.article21Category === category);
  }
  if (measureId !== "") {
    items = items.filter((template) => template.enisaMeasureId === measureId);
  }
  if (search !== "") {
    items = items.filter(
      (template) =>
        template.title.toLowerCase().includes(search) ||
        template.summary.toLowerCase().includes(search) ||
        template.enisaMeasureTitle.toLowerCase().includes(search)
    );
  }
  items = items.sort(
    (a, b) =>
      compareEnisaMeasureId(a.enisaMeasureId, b.enisaMeasureId) ||
      compareNullableStrings(a.title, b.title)
  );
  if (limit !== null) {
    items = items.slice(0, limit);
  }

  const result: Nis2PolicyTemplatesResult = { total: items.length, items };
  if (category !== "") result.category = category;
  if (measureId !== "") result.measureId = measureId;
  return result;
}

/**
 * Analyse the gap between implemented policies and the required NIS2 policy
 * templates. A template is COVERED when ANY implemented policy has a
 * non-empty ISO-control overlap with the template's controls, OR when a
 * policy title shares at least one exact word (length >= 3, case-insensitive)
 * with the template title. Every policy row in the input is treated as an
 * implemented policy. coverageRate = covered / totalTemplates * 100 (1
 * decimal, 0 when total is 0). Gaps carry only the uncovered controls;
 * byIsoControl rolls every control up by template count and policy coverage;
 * recommendations are the first 5 gaps in order. Never throws - non-object
 * input or a non-array policies list yields `EMPTY_POLICY_GAP_ANALYSIS`.
 */
export function analyzePolicyGap(
  input: Nis2PolicyGapAnalysisInput | null | undefined
): Nis2PolicyGapAnalysis {
  if (!isObject(input) || !Array.isArray(input.policies)) {
    return cloneEmptyGapAnalysis();
  }
  const templates = Array.isArray(input.templates)
    ? input.templates.map(normalizeTemplate)
    : NIS2_POLICY_TEMPLATE_CATALOG.map((template) => ({
        ...template,
        isoControls: [...template.isoControls],
      }));

  // Normalize implemented policies: id, title and a deduped ISO control set.
  interface NormalizedPolicy {
    id: string | null;
    title: string;
    titleTokens: string[];
    controls: Set<string>;
  }
  const normalizedPolicies: NormalizedPolicy[] = [];
  for (const rawRow of input.policies) {
    const row = isObject(rawRow) ? rawRow : {};
    const title = toName(row.title);
    normalizedPolicies.push({
      id: toIdString(row.id),
      title,
      titleTokens: toWordTokens(title),
      controls: new Set(normalizeControlList(row.isoControls)),
    });
  }
  const totalImplementedPolicies = normalizedPolicies.length;

  const anyPolicyCoversControl = (control: string): boolean =>
    normalizedPolicies.some((policy) => policy.controls.has(control));

  const templateCovered = (template: Nis2PolicyTemplate): boolean =>
    normalizedPolicies.some(
      (policy) =>
        template.isoControls.some((control) => policy.controls.has(control)) ||
        sharesWord(policy.titleTokens, toWordTokens(template.title))
    );

  const gaps: Nis2PolicyGap[] = [];
  const controlRollups = new Map<string, { templateCount: number; implemented: boolean }>();
  let coveredCount = 0;

  for (const template of templates) {
    for (const control of template.isoControls) {
      const rollup = controlRollups.get(control);
      if (rollup) {
        rollup.templateCount += 1;
        if (anyPolicyCoversControl(control)) rollup.implemented = true;
      } else {
        controlRollups.set(control, {
          templateCount: 1,
          implemented: anyPolicyCoversControl(control),
        });
      }
    }
    if (templateCovered(template)) {
      coveredCount += 1;
      continue;
    }
    const uncovered = template.isoControls.filter((control) => !anyPolicyCoversControl(control));
    const recommendation =
      uncovered.length > 0
        ? `Adopt ${template.title} to cover ${uncovered.join(", ")}`
        : `Adopt ${template.title}`;
    gaps.push({
      templateId: template.id,
      title: template.title,
      enisaMeasureId: template.enisaMeasureId,
      isoControls: uncovered,
      recommendation,
    });
  }

  gaps.sort(
    (a, b) =>
      compareEnisaMeasureId(a.enisaMeasureId, b.enisaMeasureId) ||
      compareNullableStrings(a.title, b.title)
  );

  const totalTemplates = templates.length;
  const coverageRate = totalTemplates > 0 ? round1((coveredCount / totalTemplates) * 100) : 0;

  const byIsoControl: Nis2IsoControlRollup[] = [...controlRollups.entries()]
    .map(([isoControl, rollup]) => ({
      isoControl,
      implemented: rollup.implemented,
      templateCount: rollup.templateCount,
      status: rollup.implemented ? ("covered" as const) : ("gap" as const),
    }))
    .sort((a, b) => a.isoControl.localeCompare(b.isoControl));

  const recommendations = gaps.slice(0, MAX_RECOMMENDATIONS).map((gap) => gap.recommendation);

  return {
    coverageRate,
    totalTemplates,
    coveredCount,
    gapCount: gaps.length,
    gaps,
    byIsoControl,
    recommendations,
    totalImplementedPolicies,
  };
}

/**
 * Track a policy through its approval workflow. Status is normalized to
 * draft | in_review | approved | rejected | changes_requested | unknown
 * (unknown for missing/garbage). Verdict precedence: approved when
 * approvalCount >= requiredApprovals, then rejected (any rejection), then
 * changes_requested (any request), then draft, then unknown, else "Awaiting
 * review". reviewProgress = decisions made / requiredApprovals * 100 (1
 * decimal, 0 when requiredApprovals is invalid). overdue compares
 * submittedAt + slaDays * 86400000 against the resolved clock; daysInReview
 * is the whole floor days between submittedAt and now (null when invalid).
 * Steps are the fixed 4-step workflow with statuses derived from the
 * normalized status. Reviewers are enriched with a status and sorted
 * decidedAt asc (null last) then id asc. Never throws - non-object input
 * yields `EMPTY_POLICY_APPROVAL`.
 */
export function runPolicyApproval(
  input: Nis2PolicyApprovalInput | null | undefined
): Nis2PolicyApproval {
  if (!isObject(input)) {
    return cloneEmptyApproval();
  }
  const nowMs = toClock(input).getTime();
  const reviewers = Array.isArray(input.reviewers) ? input.reviewers : [];

  const requiredRaw = input.requiredApprovals;
  const requiredExplicitValid =
    typeof requiredRaw === "number" && Number.isFinite(requiredRaw) && requiredRaw >= 1;
  const requiredApprovals = requiredExplicitValid
    ? Math.round(requiredRaw)
    : DEFAULT_REQUIRED_APPROVALS;
  // Absent requiredApprovals defaults to 1 (a valid single-approval round);
  // an explicit invalid value (0, negative, NaN, non-number) zeroes progress.
  const requiredValid = requiredRaw == null || requiredExplicitValid;

  const slaRaw = input.slaDays;
  const slaDays =
    typeof slaRaw === "number" && Number.isFinite(slaRaw) ? slaRaw : DEFAULT_SLA_DAYS;

  const statusRaw = toName(input.status).toLowerCase();
  const status: Nis2PolicyApprovalStatus =
    statusRaw === "draft" ||
    statusRaw === "in_review" ||
    statusRaw === "approved" ||
    statusRaw === "rejected" ||
    statusRaw === "changes_requested"
      ? statusRaw
      : "unknown";

  interface NormalizedReviewer {
    id: string | null;
    name: string | null;
    decision: "approved" | "rejected" | "changes_requested" | null;
    comment: string | null;
    decidedAt: string | number | null;
    decidedMs: number | null;
    status: "approved" | "rejected" | "changes_requested" | "pending";
  }

  const normalizedReviewers: NormalizedReviewer[] = [];
  for (const rawRow of reviewers) {
    const row = isObject(rawRow) ? rawRow : {};
    const rawDecision = toName(row.decision);
    const decision =
      rawDecision === "approved" || rawDecision === "rejected" || rawDecision === "changes_requested"
        ? rawDecision
        : null;
    const decidedAt =
      typeof row.decidedAt === "string"
        ? row.decidedAt
        : typeof row.decidedAt === "number" && Number.isFinite(row.decidedAt)
          ? row.decidedAt
          : null;
    normalizedReviewers.push({
      id: toIdString(row.id),
      name: typeof row.name === "string" ? row.name.trim() : null,
      decision,
      comment: typeof row.comment === "string" ? row.comment.trim() : null,
      decidedAt,
      decidedMs: toTimeMs(decidedAt),
      status: decision ?? "pending",
    });
  }

  normalizedReviewers.sort(
    (a, b) =>
      (a.decidedMs ?? Number.POSITIVE_INFINITY) - (b.decidedMs ?? Number.POSITIVE_INFINITY) ||
      compareNullableStrings(a.id, b.id)
  );

  let approvalCount = 0;
  let rejectionCount = 0;
  let changesRequestedCount = 0;
  for (const reviewer of normalizedReviewers) {
    if (reviewer.decision === "approved") approvalCount += 1;
    else if (reviewer.decision === "rejected") rejectionCount += 1;
    else if (reviewer.decision === "changes_requested") changesRequestedCount += 1;
  }
  const decisionsMade = approvalCount + rejectionCount + changesRequestedCount;

  const reviewProgress = requiredValid
    ? round1((decisionsMade / requiredApprovals) * 100)
    : 0;
  const complete = requiredValid && approvalCount >= requiredApprovals;

  const submittedMs = toTimeMs(input.submittedAt);
  const overdue =
    submittedMs !== null && submittedMs + slaDays * DAY_MS < nowMs;
  const daysInReview = submittedMs !== null ? Math.floor((nowMs - submittedMs) / DAY_MS) : null;

  const statusDerivedVerdict =
    status === "draft"
      ? "Draft"
      : status === "in_review"
        ? "Awaiting review"
        : status === "approved"
          ? "Approved"
          : status === "rejected"
            ? "Rejected"
            : status === "changes_requested"
              ? "Changes requested"
              : statusRaw === ""
                ? "unknown"
                : "Unknown";
  const verdict =
    approvalCount >= requiredApprovals
      ? "Approved"
      : rejectionCount > 0
        ? "Rejected"
        : changesRequestedCount > 0
          ? "Changes requested"
          : statusDerivedVerdict;

  const nextAction =
    verdict === "Approved"
      ? "Policy approved"
      : verdict === "Rejected"
        ? "Policy rejected"
        : verdict === "Changes requested"
          ? "Revise and resubmit"
          : verdict === "Draft"
            ? "Submit for review"
            : verdict === "unknown" || verdict === "Unknown"
              ? "Policy status unknown"
              : `Awaiting ${approvalCount} of ${requiredApprovals} approvals`;

  const stepStatuses = (): Array<"done" | "current" | "pending"> => {
    if (status === "draft") return ["current", "pending", "pending", "pending"];
    if (status === "in_review") return ["done", "done", "current", "pending"];
    if (status === "approved") return ["done", "done", "done", "done"];
    if (status === "rejected" || status === "changes_requested") {
      return ["done", "done", "done", "current"];
    }
    return ["pending", "pending", "pending", "pending"];
  };
  const statuses = stepStatuses();
  const steps: Nis2PolicyApprovalStep[] = APPROVAL_STEP_LABELS.map((label, index) => ({
    label,
    status: statuses[index],
  }));

  const reviewersOutput: Nis2PolicyReviewerOutput[] = normalizedReviewers.map(
    ({ id, name, decision, comment, decidedAt, status: reviewerStatus }) => ({
      id,
      name,
      decision,
      comment,
      decidedAt,
      status: reviewerStatus,
    })
  );

  return {
    policyId: toIdString(input.policyId),
    policyTitle: toName(input.policyTitle),
    status,
    verdict,
    approvalCount,
    rejectionCount,
    changesRequestedCount,
    pendingCount: Math.max(0, reviewers.length - decisionsMade),
    requiredApprovals,
    reviewProgress,
    complete,
    overdue,
    daysInReview,
    steps,
    reviewers: reviewersOutput,
    nextAction,
  };
}

/**
 * Track policy version history. Versions are sorted createdAt asc
 * (invalid/null last) then label asc; the last entry of the sorted list is
 * the latest version (status "current"), all others are "superseded" (draft
 * entries keep "draft" when their input status normalized to draft).
 * createdAt is emitted as an ISO-8601 string (null when invalid). changes
 * collects every non-empty changeSummary in version order. Never throws -
 * non-object input or a non-array versions list yields
 * `EMPTY_POLICY_VERSION_HISTORY`.
 */
export function trackPolicyVersions(
  input: Nis2PolicyVersionHistoryInput | null | undefined
): Nis2PolicyVersionHistory {
  if (!isObject(input) || !Array.isArray(input.versions)) {
    return cloneEmptyVersionHistory();
  }
  const rows = input.versions;

  interface NormalizedVersion {
    label: string;
    createdAtMs: number | null;
    createdAt: string | null;
    /** Normalized input status: "draft" | "approved" | other. */
    inputStatus: "draft" | "approved" | "other";
    changeSummary: string;
  }

  const normalized: NormalizedVersion[] = [];
  for (const rawRow of rows) {
    const row = isObject(rawRow) ? rawRow : {};
    const label = toName(row.label) || toIdString(row.version) || "";
    const createdAtMs = toTimeMs(row.createdAt);
    const statusRaw = toName(row.status).toLowerCase();
    const inputStatus: NormalizedVersion["inputStatus"] =
      statusRaw === "draft" ? "draft" : statusRaw === "approved" ? "approved" : "other";
    normalized.push({
      label,
      createdAtMs,
      createdAt: createdAtMs !== null ? new Date(createdAtMs).toISOString() : null,
      inputStatus,
      changeSummary: toName(row.changeSummary),
    });
  }

  normalized.sort(
    (a, b) =>
      (a.createdAtMs ?? Number.POSITIVE_INFINITY) - (b.createdAtMs ?? Number.POSITIVE_INFINITY) ||
      compareNullableStrings(a.label, b.label)
  );

  const versions: Nis2PolicyVersionEntry[] = normalized.map((version, index) => {
    const isLatest = index === normalized.length - 1;
    const status: Nis2PolicyVersionEntry["status"] = isLatest
      ? "current"
      : version.inputStatus === "draft"
        ? "draft"
        : "superseded";
    return {
      version: version.label,
      createdAt: version.createdAt,
      status,
      changeSummary: version.changeSummary,
    };
  });

  let draftCount = 0;
  let approvedCount = 0;
  let supersededCount = 0;
  for (const version of versions) {
    if (version.status === "draft") draftCount += 1;
    else if (version.status === "superseded") supersededCount += 1;
  }
  for (const version of normalized) {
    if (version.inputStatus === "approved") approvedCount += 1;
  }

  const changes = normalized
    .map((version) => version.changeSummary)
    .filter((summary) => summary !== "");

  // The latest version is the last sorted entry that carries a real label;
  // garbage rows normalize to "" and must never become the "current" version.
  const latestLabel =
    [...normalized].reverse().find((version) => version.label !== "")?.label ?? null;

  return {
    policyId: toIdString(input.policyId),
    totalVersions: normalized.length,
    latestVersion: latestLabel,
    currentVersion: latestLabel,
    draftCount,
    approvedCount,
    supersededCount,
    versions,
    changes,
  };
}
