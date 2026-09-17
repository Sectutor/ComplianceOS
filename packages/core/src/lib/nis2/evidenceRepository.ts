/**
 * NIS2 Evidence Repository engine.
 *
 * Cycle 24 (NIS2 Implementation Plan Phase 6 Task 6.2 "Evidence Repository
 * Enhancement"): provides the pure evidence engine behind three protected
 * tRPC procedures - evidence suggestions keyed to the ENISA measures of the
 * plan's ENISA -> NIS2 Article 21(2) -> ISO/IEC 27001:2022 mapping table
 * (measures 1.1, 2.1, 3.1, 4.1, 5.1, 6.7, 6.2, 7.1, 8.1, 9.1, 10.1, 11.1,
 * 12.1), an evidence audit trail (last activity per evidence record with a
 * by-status summary), and an evidence quality analysis (quality score/band,
 * freshness, renewal cadence, expiry countdown and next-action per record
 * plus overall rollups and recommendations).
 * Pure view-model logic - no DB, no network, no side effects.
 *
 * Design rules (house pattern - mirrors lib/nis2/policyTemplates.ts):
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
 *   reproducibility. Date objects for row timestamps are also accepted by
 *   the engine (never throws); the tRPC layer rejects them with BAD_REQUEST
 *   before they reach the engine.
 * - Time arithmetic uses fixed millisecond constants (one day = 24h).
 * - All numeric outputs are rounded deterministically: rates to 1 decimal,
 *   counts to whole numbers, quality scores to integers.
 */

/* ------------------------------------------------------------------ */
/* Public types                                                        */
/* ------------------------------------------------------------------ */

/** Injectable clock options shared by the engine functions. */
export interface EvidenceRepositoryOptions {
  /** Pin "now": epoch-ms number or ISO-8601 string. */
  now?: string | number | null;
  /** Pin "now" via a factory; used only when `now` is absent/invalid. */
  clock?: (() => Date) | null;
}

/** Lifecycle status of an evidence record (6-value contract enum). */
export type EvidenceStatus =
  | "pending"
  | "collected"
  | "verified"
  | "rejected"
  | "expired"
  | "not_applicable";

/** Evidence quality band (0-100 score collapsed to three bands). */
export type EvidenceQualityBand = "strong" | "adequate" | "weak";

/** Evidence freshness relative to verification + expiry signals. */
export type EvidenceFreshness = "fresh" | "expiring" | "stale" | "expired";

/** Renewal cadence health relative to `intervalDays` from last verification. */
export type EvidenceCadence = "on-track" | "due-soon" | "overdue" | "n-a";

/* --- evidenceRepository.suggest --------------------------------------- */

/** Input for `suggestEvidence`. */
export interface EvidenceSuggestionsInput {
  /** ENISA measure id, e.g. "4.1"; narrows to one measure when provided. */
  measureId?: string | null;
  /** Free-form evidence category filter, e.g. "continuity". */
  category?: string | null;
  /** Natural-language requirement text used to score the match. */
  requirementText?: string | null;
  /** Max number of suggestions to return. */
  limit?: number | null;
}

/** One suggested evidence collection mapped to an ENISA measure. */
export interface EvidenceSuggestionItem {
  /** ENISA technical measure id, e.g. "4.1" (NIS2 plan mapping table). */
  measureId: string;
  /** NIS2 article, e.g. "21(2)(c)". */
  article: string;
  /** Human-readable title of the evidence to collect. */
  title: string;
  /** Document/artifact types that satisfy the measure. */
  evidenceTypes: string[];
  /** How to collect/verify the evidence. */
  collectionMethod: string;
  /** Recommended re-collection interval in days. */
  freshnessDays: number;
  /** Concrete example file names / artifacts. */
  exampleEvidence: string;
  /** Match score 0-100 (higher = stronger gap). */
  score: number;
  /** Why this suggestion surfaced (tied to a gap in current evidence). */
  matchReason: string;
}

/** Output of `suggestEvidence`. */
export interface EvidenceSuggestionsResponse {
  suggestions: EvidenceSuggestionItem[];
}

/* --- evidenceRepository.auditTrail ------------------------------------ */

/** One evidence row fed into the audit-trail engine (input side). */
export interface EvidenceAuditTrailRowInput {
  id: string | number;
  evidenceId?: string | null;
  clientControlId?: string | number | null;
  status?: string | null;
  type?: string | null;
  owner?: string | null;
  fileCount?: number | null;
  /** Last activity timestamp; used to derive daysSinceUpdate. */
  updatedAt?: string | number | null;
}

/** Input for `buildEvidenceAuditTrail`. */
export interface EvidenceAuditTrailInput extends EvidenceRepositoryOptions {
  rows?: EvidenceAuditTrailRowInput[] | null;
}

/** One audit-trail event (evidence record at last activity). */
export interface EvidenceAuditEvent {
  id: string | number;
  evidenceId: string;
  status: EvidenceStatus;
  type: string;
  owner: string | null;
  fileCount: number;
  updatedAt: Date | null;
  /** Whole days since last activity; null when `updatedAt` is missing. */
  daysSinceUpdate: number | null;
}

/** Output of `buildEvidenceAuditTrail`. */
export interface EvidenceAuditTrailResponse {
  /** Events sorted most-recent-first. */
  events: EvidenceAuditEvent[];
  summary: {
    totals: {
      total: number;
      byStatus: Record<string, number>;
    };
    /** Events with a named owner. */
    withOwner: number;
    /** Events with at least one file attached. */
    withFiles: number;
  };
}

/* --- evidenceRepository.analyze --------------------------------------- */

/** One evidence row fed into the quality/freshness engine (input side). */
export interface EvidenceAnalysisRowInput {
  id: string | number;
  evidenceId?: string | null;
  status?: string | null;
  type?: string | null;
  owner?: string | null;
  fileCount?: number | null;
  systemId?: string | number | null;
  lastVerified?: string | number | null;
  expirationDate?: string | number | null;
  /** Renewal cadence in days; null disables cadence tracking. */
  intervalDays?: number | null;
}

/** Input for `analyzeEvidenceQuality`. */
export interface EvidenceAnalysisInput extends EvidenceRepositoryOptions {
  rows?: EvidenceAnalysisRowInput[] | null;
}

/** Per-status / freshness / cadence counters returned by analyze. */
export interface EvidenceAnalysisCounts {
  total: number;
  verified: number;
  expired: number;
  stale: number;
  fresh: number;
  expiring: number;
  dueSoon: number;
  overdue: number;
}

/** One computed evidence row returned by `analyzeEvidenceQuality`. */
export interface EvidenceAnalysisRow {
  id: string | number;
  evidenceId: string;
  status: EvidenceStatus;
  /** 0-100 composite quality score (higher = stronger evidence). */
  qualityScore: number;
  qualityBand: EvidenceQualityBand;
  freshness: EvidenceFreshness;
  cadence: EvidenceCadence;
  /** Whole days until the expiration date; null when none. */
  daysUntilExpiry: number | null;
  /** Named owner of the evidence record; null when unassigned. */
  owner: string | null;
  /** Short instruction generated from the row's weakest signal. */
  nextAction: string;
}

/** Output of `analyzeEvidenceQuality`. */
export interface EvidenceAnalysisResponse {
  rows: EvidenceAnalysisRow[];
  overall: {
    /** Mean quality score, rounded to 1 decimal. */
    avgQualityScore: number;
    /** Percentage of rows currently verified, rounded to 1 decimal. */
    coverageRate: number;
    counts: EvidenceAnalysisCounts;
    recommendations: string[];
  };
}

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

/** One built-in evidence suggestion catalog entry (internal keywords + base score). */
export interface EvidenceSuggestionCatalogEntry {
  /** ENISA technical measure id, e.g. "4.1". */
  measureId: string;
  /** NIS2 article, e.g. "21(2)(c)". */
  article: string;
  /** Human-readable evidence title. */
  title: string;
  /** Document/artifact types that satisfy the measure (2-4). */
  evidenceTypes: string[];
  /** How to collect/verify the evidence. */
  collectionMethod: string;
  /** Recommended re-collection interval in days (positive integer). */
  freshnessDays: number;
  /** Concrete example file names / artifacts. */
  exampleEvidence: string;
  /** Stable scoring keywords (never exposed in the suggest output). */
  keywords: string[];
  /** Pre-seeded base score by measure criticality (60-85). */
  baseScore: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
/** Max deterministic recommendations in the analyze rollup. */
const MAX_RECOMMENDATIONS = 5;
/** The 6-value evidence status enum (stable order, zeroed byStatus keys). */
const EVIDENCE_STATUSES: ReadonlyArray<EvidenceStatus> = deepFreeze([
  "pending",
  "collected",
  "verified",
  "rejected",
  "expired",
  "not_applicable",
]);

/** Quality base per normalized evidence status. */
const STATUS_BASE: Readonly<Record<EvidenceStatus, number>> = deepFreeze({
  verified: 50,
  collected: 35,
  pending: 20,
  not_applicable: 15,
  rejected: 0,
  expired: 0,
});

/** Freshness bonus toward the quality score. */
const FRESHNESS_BONUS: Readonly<Record<EvidenceFreshness, number>> = deepFreeze({
  fresh: 30,
  expiring: 15,
  stale: 5,
  expired: 0,
});

/** Cadence bonus toward the quality score. */
const CADENCE_BONUS: Readonly<Record<EvidenceCadence, number>> = deepFreeze({
  "on-track": 15,
  "due-soon": 5,
  overdue: 0,
  "n-a": 5,
});

/**
 * Built-in evidence suggestion catalog: one entry per ENISA measure row of
 * the plan's mapping table (ENISA -> NIS2 Art. 21(2) -> ISO/IEC 27001:2022),
 * ordered measureId asc. Each entry carries a stable internal keyword list
 * (never exposed in the suggest output) used to score requirementText
 * overlap, and a pre-seeded base score by measure criticality (60-85).
 */
export const EVIDENCE_SUGGESTION_CATALOG: ReadonlyArray<EvidenceSuggestionCatalogEntry> =
  deepFreeze([
    {
      measureId: "1.1",
      article: "21(2)(a)",
      title: "Information Systems Security Policy",
      evidenceTypes: ["policy-document", "approval-record"],
      collectionMethod:
        "Collect the approved, signed information security policy and its latest management approval record from the GRC document store.",
      freshnessDays: 365,
      exampleEvidence: "infosec-policy-v5-approved.pdf, policy-approval-2026-01.pdf",
      keywords: [
        "security policy",
        "information security",
        "policies",
        "governance",
        "approval",
        "management commitment",
        "top management",
      ],
      baseScore: 65,
    },
    {
      measureId: "2.1",
      article: "21(2)(a)",
      title: "Risk Management Framework",
      evidenceTypes: ["risk-assessment", "risk-register"],
      collectionMethod:
        "Export the current risk assessment report and the maintained risk register (threats, likelihood, impact, treatment) from the risk module.",
      freshnessDays: 180,
      exampleEvidence: "risk-assessment-q2-2026.pdf, risk-register-export.xlsx",
      keywords: [
        "risk assessment",
        "risk management",
        "risk register",
        "threat",
        "scenario",
        "risk treatment",
        "risk appetite",
      ],
      baseScore: 70,
    },
    {
      measureId: "3.1",
      article: "21(2)(b)",
      title: "Incident Handling Policy",
      evidenceTypes: ["policy-document", "incident-report", "post-incident-review"],
      collectionMethod:
        "Attach the incident handling policy plus the latest significant incident report and post-incident review demonstrating the response workflow.",
      freshnessDays: 180,
      exampleEvidence:
        "incident-handling-policy-v3.pdf, incident-report-IR-2026-07.pdf, post-incident-review.docx",
      keywords: [
        "incident",
        "incident handling",
        "response",
        "reporting",
        "escalation",
        "csirt",
        "breach",
        "notification",
      ],
      baseScore: 75,
    },
    {
      measureId: "4.1",
      article: "21(2)(c)",
      title: "BC & Disaster Recovery Plan",
      evidenceTypes: ["policy-document", "test-report"],
      collectionMethod:
        "Collect the approved BC/DR plan and the latest restore/continuity test report (including RTO/RPO validation) from the DR provider.",
      freshnessDays: 180,
      exampleEvidence: "bcp-dr-plan-v3-signed.pdf, restore-test-2026-08.pdf",
      keywords: [
        "business continuity",
        "disaster recovery",
        "backup",
        "restore",
        "bcm",
        "dr plan",
        "rto",
        "rpo",
        "crisis",
        "resilience",
      ],
      baseScore: 80,
    },
    {
      measureId: "5.1",
      article: "21(2)(d)",
      title: "Supply Chain Security Policy",
      evidenceTypes: ["policy-document", "assessment", "questionnaire-response"],
      collectionMethod:
        "Collect the supply chain security policy and the completed supplier security assessments for critical vendors from the TPRM portal.",
      freshnessDays: 180,
      exampleEvidence: "supply-chain-policy-v2.pdf, vendor-assessment-acme-2026.pdf",
      keywords: [
        "supply chain",
        "supplier",
        "vendor",
        "third party",
        "supply chain security",
        "tprm",
        "subcontractor",
        "procurement",
      ],
      baseScore: 72,
    },
    {
      measureId: "6.7",
      article: "21(2)(e)",
      title: "Network Security",
      evidenceTypes: ["config-export", "network-diagram", "scan-report"],
      collectionMethod:
        "Export the current network architecture diagram, firewall/segment configs and the latest vulnerability scan report for the production network.",
      freshnessDays: 90,
      exampleEvidence: "network-architecture-2026.png, fw-segment-config.txt, nessus-scan-2026-08.pdf",
      keywords: [
        "network",
        "segmentation",
        "firewall",
        "network security",
        "zoning",
        "vulnerability scan",
        "perimeter",
        "monitoring",
      ],
      baseScore: 78,
    },
    {
      measureId: "6.2",
      article: "21(2)(e)",
      title: "Secure Development (SDLC)",
      evidenceTypes: ["test-report", "audit-log", "approval-record"],
      collectionMethod:
        "Attach the latest pipeline security-gate results (SAST/SCA), the release sign-off and the vulnerability handling log for the last production release.",
      freshnessDays: 90,
      exampleEvidence: "pipeline-gate-results-2026-08.txt, release-signoff-2211.pdf, vuln-handling-log.csv",
      keywords: [
        "secure development",
        "sdlc",
        "code review",
        "vulnerability handling",
        "software",
        "devsecops",
        "pipeline",
        "release",
        "disclosure",
      ],
      baseScore: 68,
    },
    {
      measureId: "7.1",
      article: "21(2)(f)",
      title: "Effectiveness Assessment",
      evidenceTypes: ["assessment", "metrics-report", "review-minutes"],
      collectionMethod:
        "Collect the security effectiveness assessment report, the metrics dashboard export and the management review minutes demonstrating measure effectiveness.",
      freshnessDays: 365,
      exampleEvidence: "effectiveness-assessment-2026.pdf, metrics-dashboard-export.csv, management-review-minutes.pdf",
      keywords: [
        "effectiveness",
        "assessment",
        "metrics",
        "monitoring",
        "measurement",
        "management review",
        "kpi",
        "continuous improvement",
      ],
      baseScore: 70,
    },
    {
      measureId: "8.1",
      article: "21(2)(g)",
      title: "Awareness and Hygiene",
      evidenceTypes: ["training-record", "screenshot", "phishing-report"],
      collectionMethod:
        "Export the training completion report from the LMS, a phishing simulation summary and a screenshot of the awareness campaign materials.",
      freshnessDays: 90,
      exampleEvidence: "lms-training-q2-2026-completion.csv, phishing-sim-2026-07.pdf",
      keywords: [
        "awareness",
        "training",
        "hygiene",
        "phishing",
        "education",
        "staff",
        "employees",
        "competency",
        "security culture",
      ],
      baseScore: 62,
    },
    {
      measureId: "9.1",
      article: "21(2)(h)",
      title: "Cryptography & Encryption",
      evidenceTypes: ["policy-document", "config-export", "key-management-report"],
      collectionMethod:
        "Re-collect the approved cryptography policy, a configuration export proving TLS 1.2+ and at-rest encryption defaults, and the key management report.",
      freshnessDays: 365,
      exampleEvidence: "crypto-policy-v4-approved.pdf, tls-config-export.txt, key-mgmt-report-2026.pdf",
      keywords: [
        "cryptography",
        "encryption",
        "key management",
        "tls",
        "cipher",
        "at rest",
        "in transit",
        "crypto",
      ],
      baseScore: 74,
    },
    {
      measureId: "10.1",
      article: "21(2)(i)",
      title: "HR Security",
      evidenceTypes: ["policy-document", "screening-record", "offboarding-log"],
      collectionMethod:
        "Collect the HR security policy, a sample of pre-employment screening records and the offboarding/access-revocation log for the last quarter.",
      freshnessDays: 365,
      exampleEvidence: "hr-security-policy.pdf, screening-records-sample.csv, offboarding-log-q2-2026.csv",
      keywords: [
        "hr security",
        "human resources",
        "screening",
        "background check",
        "offboarding",
        "recruitment",
        "employment",
        "personnel",
      ],
      baseScore: 60,
    },
    {
      measureId: "11.1",
      article: "21(2)(j)",
      title: "Access Control Policy",
      evidenceTypes: ["policy-document", "access-review", "iam-export"],
      collectionMethod:
        "Attach the access control policy, the latest privileged access review and an IAM export showing MFA and role-based access enforcement.",
      freshnessDays: 180,
      exampleEvidence: "access-control-policy-v3.pdf, access-review-2026-08.pdf, iam-mfa-export.csv",
      keywords: [
        "access control",
        "authentication",
        "authorization",
        "mfa",
        "privileged access",
        "iam",
        "least privilege",
        "identity",
        "access review",
        "rbac",
      ],
      baseScore: 76,
    },
    {
      measureId: "12.1",
      article: "21(2)(j)",
      title: "Asset Classification & Handling",
      evidenceTypes: ["spreadsheet", "config-export", "inventory-export"],
      collectionMethod:
        "Export the classified asset register (crown jewels, business critical, internal) from the CMDB and the asset handling rules document.",
      freshnessDays: 365,
      exampleEvidence: "asset-register-classified-2026.xlsx, asset-handling-rules.pdf",
      keywords: [
        "asset",
        "asset management",
        "classification",
        "inventory",
        "crown jewels",
        "cmdb",
        "asset register",
        "ownership",
        "handling",
      ],
      baseScore: 66,
    },
  ]);

/** Empty evidence suggestions (exported safe shape for malformed input). */
export const EMPTY_EVIDENCE_SUGGESTIONS: EvidenceSuggestionsResponse = deepFreeze({
  suggestions: [],
});

/** Empty evidence audit trail (exported safe shape for malformed input). */
export const EMPTY_EVIDENCE_AUDIT_TRAIL: EvidenceAuditTrailResponse = deepFreeze({
  events: [],
  summary: {
    totals: { total: 0, byStatus: {} },
    withOwner: 0,
    withFiles: 0,
  },
});

/** Empty evidence analysis (exported safe shape for malformed input). */
export const EMPTY_EVIDENCE_ANALYSIS: EvidenceAnalysisResponse = deepFreeze({
  rows: [],
  overall: {
    avgQualityScore: 0,
    coverageRate: 0,
    counts: {
      total: 0,
      verified: 0,
      expired: 0,
      stale: 0,
      fresh: 0,
      expiring: 0,
      dueSoon: 0,
      overdue: 0,
    },
    recommendations: [],
  },
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

/** Coerce an id-like field to the emitted id value, or "" when missing. */
const toIdValue = (value: unknown): string | number => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") return value;
  return "";
};

/** Coerce a name; missing/blank -> "". */
const toName = (value: unknown): string => {
  return typeof value === "string" ? value.trim() : "";
};

/** Coerce a name; missing/blank -> null. */
const toNullableName = (value: unknown): string | null => {
  const name = toName(value);
  return name !== "" ? name : null;
};

/** Coerce a finite number to a safe floor-count (negatives -> 0). */
const toFloorCount = (value: unknown): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.floor(value));
};

/** Coerce a status to the 6-value enum; invalid/missing -> "pending". */
const toEvidenceStatus = (value: unknown): EvidenceStatus => {
  const raw = toName(value).toLowerCase();
  if (EVIDENCE_STATUSES.includes(raw as EvidenceStatus)) {
    return raw as EvidenceStatus;
  }
  return "pending";
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

/**
 * Compare id values ascending (tie-break key): numbers compare numerically,
 * strings compare with localeCompare, numbers sort before strings, "" sorts
 * last among strings.
 */
const compareIdsAsc = (a: string | number, b: string | number): number => {
  if (typeof a === "number" && typeof b === "number") {
    return a === b ? 0 : a < b ? -1 : 1;
  }
  if (typeof a === "number") return -1;
  if (typeof b === "number") return 1;
  return a.localeCompare(b);
};

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

/** Fresh mutable copy of the empty suggestions. */
const cloneEmptySuggestions = (): EvidenceSuggestionsResponse => ({
  ...EMPTY_EVIDENCE_SUGGESTIONS,
  suggestions: [],
});

/** Fresh mutable copy of the empty audit trail. */
const cloneEmptyAuditTrail = (): EvidenceAuditTrailResponse => ({
  ...EMPTY_EVIDENCE_AUDIT_TRAIL,
  events: [],
  summary: {
    totals: { total: 0, byStatus: {} },
    withOwner: 0,
    withFiles: 0,
  },
});

/** Fresh mutable copy of the empty analysis. */
const cloneEmptyAnalysis = (): EvidenceAnalysisResponse => ({
  ...EMPTY_EVIDENCE_ANALYSIS,
  rows: [],
  overall: {
    ...EMPTY_EVIDENCE_ANALYSIS.overall,
    counts: { ...EMPTY_EVIDENCE_ANALYSIS.overall.counts },
    recommendations: [],
  },
});

/* ------------------------------------------------------------------ */
/* Public engine functions                                             */
/* ------------------------------------------------------------------ */

/**
 * Suggest evidence collections keyed to the ENISA measures of the plan's
 * mapping table (one catalog entry per measure: 1.1, 2.1, 3.1, 4.1, 5.1,
 * 6.7, 6.2, 7.1, 8.1, 9.1, 10.1, 11.1, 12.1). `measureId` is an exact-match
 * filter (case-insensitive); `category` is a case-insensitive substring over
 * title + collectionMethod + evidenceTypes; `limit` (positive integer) is
 * applied last after sorting. Score = clamp(0,100) of the catalog base score
 * (60-85 by measure criticality) plus a +1-per-matched-term bonus (capped
 * +15) from requirementText keyword/word overlap against the entry's title,
 * evidenceTypes and internal keywords. Suggestions sort score desc, then
 * measureId numeric asc, then title asc. Never throws - non-object input
 * yields `EMPTY_EVIDENCE_SUGGESTIONS`.
 */
export function suggestEvidence(
  input: EvidenceSuggestionsInput | null | undefined
): EvidenceSuggestionsResponse {
  if (!isObject(input)) {
    return cloneEmptySuggestions();
  }

  const measureId = toName(input.measureId);
  const category = toName(input.category).toLowerCase();
  const requirementText = toName(input.requirementText);
  const requirementLower = requirementText.toLowerCase();
  const requirementTokens = toWordTokens(requirementText);
  const rawLimit = input.limit;
  const limit =
    typeof rawLimit === "number" && Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.round(rawLimit)
      : null;

  const suggestions: EvidenceSuggestionItem[] = [];
  for (const entry of EVIDENCE_SUGGESTION_CATALOG) {
    if (measureId !== "" && entry.measureId.toLowerCase() !== measureId) continue;
    if (category !== "") {
      const haystack = `${entry.title} ${entry.collectionMethod} ${entry.evidenceTypes.join(" ")}`.toLowerCase();
      if (!haystack.includes(category)) continue;
    }

    // Corpus words: entry title + evidenceTypes + internal keywords.
    const corpusWords = new Set(
      toWordTokens(`${entry.title} ${entry.evidenceTypes.join(" ")} ${entry.keywords.join(" ")}`)
    );
    // Matched requirement-text terms, first-seen order, deduplicated.
    const matched: string[] = [];
    const seenMatched = new Set<string>();
    for (const token of requirementTokens) {
      if (!corpusWords.has(token)) continue;
      if (seenMatched.has(token)) continue;
      seenMatched.add(token);
      matched.push(token);
    }
    for (const phrase of entry.keywords) {
      if (!phrase.includes(" ")) continue;
      const phraseLower = phrase.toLowerCase();
      if (!requirementLower.includes(phraseLower) || seenMatched.has(phraseLower)) continue;
      seenMatched.add(phraseLower);
      matched.push(phrase);
    }

    // The measureId penalty is always 0 here (non-matching entries were
    // filtered above) but kept for spec fidelity of the score composition.
    const measurePenalty = measureId !== "" && entry.measureId.toLowerCase() !== measureId ? 5 : 0;
    const bonus = Math.min(15, matched.length);
    const score = Math.max(0, Math.min(100, entry.baseScore + bonus - measurePenalty));

    const matchReason =
      matched.length > 0
        ? `No evidence collected for ENISA measure ${entry.measureId} (${entry.title}). Requirement text matched: '${matched.join(", ")}'`
        : `No evidence collected for ENISA measure ${entry.measureId} (${entry.title})`;

    suggestions.push({
      measureId: entry.measureId,
      article: entry.article,
      title: entry.title,
      evidenceTypes: [...entry.evidenceTypes],
      collectionMethod: entry.collectionMethod,
      freshnessDays: entry.freshnessDays,
      exampleEvidence: entry.exampleEvidence,
      score,
      matchReason,
    });
  }

  suggestions.sort(
    (a, b) =>
      b.score - a.score ||
      compareEnisaMeasureId(a.measureId, b.measureId) ||
      a.title.localeCompare(b.title)
  );

  const sliced = limit !== null ? suggestions.slice(0, limit) : suggestions;
  return { suggestions: sliced };
}

/**
 * Build the evidence audit trail: one event per input row with the
 * normalized evidenceId (row.evidenceId ?? String(row.id)), coerced 6-value
 * status (invalid/missing -> "pending"), type (default "evidence"), owner
 * (null unless a non-empty trimmed string), fileCount (max(0, floor), 0
 * default), updatedAt (ISO-8601 / epoch-ms, null when invalid) and
 * daysSinceUpdate (whole floor days against the injected clock, negative
 * clamps to 0, null when updatedAt missing). Events sort most-recent-first
 * (updatedAt desc, missing last, then id asc). The summary totals count
 * events, byStatus carries every 6 enum keys (zeroed included, stable
 * order), and withOwner / withFiles count named-owner and file-attached
 * events. Never throws - non-object input or a non-array rows list yields
 * `EMPTY_EVIDENCE_AUDIT_TRAIL`.
 */
export function buildEvidenceAuditTrail(
  input: EvidenceAuditTrailInput | null | undefined
): EvidenceAuditTrailResponse {
  if (!isObject(input) || !Array.isArray(input.rows)) {
    return cloneEmptyAuditTrail();
  }
  const nowMs = toClock(input).getTime();

  interface NormalizedEvent {
    id: string | number;
    evidenceId: string;
    status: EvidenceStatus;
    type: string;
    owner: string | null;
    fileCount: number;
    updatedAt: Date | null;
    updatedMs: number | null;
    daysSinceUpdate: number | null;
  }

  const normalized: NormalizedEvent[] = [];
  for (const rawRow of input.rows) {
    const row = isObject(rawRow) ? rawRow : {};
    const updatedMs = toTimeMs(row.updatedAt);
    const daysSinceUpdate =
      updatedMs !== null ? Math.max(0, Math.floor((nowMs - updatedMs) / DAY_MS)) : null;
    normalized.push({
      id: toIdValue(row.id),
      evidenceId: toIdString(row.evidenceId) ?? toIdString(row.id) ?? "",
      status: toEvidenceStatus(row.status),
      type: toName(row.type) || "evidence",
      owner: toNullableName(row.owner),
      fileCount: toFloorCount(row.fileCount),
      updatedAt: updatedMs !== null ? new Date(updatedMs) : null,
      updatedMs,
      daysSinceUpdate,
    });
  }

  normalized.sort((a, b) => {
    const aMs = a.updatedMs ?? Number.NEGATIVE_INFINITY;
    const bMs = b.updatedMs ?? Number.NEGATIVE_INFINITY;
    if (aMs !== bMs) return bMs - aMs;
    return compareIdsAsc(a.id, b.id);
  });

  const events: EvidenceAuditEvent[] = normalized.map(
    ({ id, evidenceId, status, type, owner, fileCount, updatedAt, daysSinceUpdate }) => ({
      id,
      evidenceId,
      status,
      type,
      owner,
      fileCount,
      updatedAt,
      daysSinceUpdate,
    })
  );

  const byStatus: Record<string, number> = {};
  for (const status of EVIDENCE_STATUSES) {
    byStatus[status] = 0;
  }
  let withOwner = 0;
  let withFiles = 0;
  for (const event of events) {
    byStatus[event.status] += 1;
    if (event.owner !== null) withOwner += 1;
    if (event.fileCount > 0) withFiles += 1;
  }

  return {
    events,
    summary: {
      totals: { total: events.length, byStatus },
      withOwner,
      withFiles,
    },
  };
}

/**
 * Analyse evidence quality against the injected clock. Per row: coerced
 * status (invalid/missing -> "pending"), evidenceId (row.evidenceId ??
 * String(row.id)), fileCount (max(0, floor)), lastVerified / expirationDate
 * (ISO-8601 / epoch-ms, null when invalid), intervalDays (positive finite
 * number else null, null disables cadence) and daysUntilExpiry (signed whole
 * days, null when no expiry). Freshness precedence: expired when the expiry
 * is in the past, expiring when <= 90 days remain, stale when never
 * verified or past the interval, else fresh. Cadence: "n-a" without an
 * interval, "overdue" when never verified or past the interval (strict >),
 * "due-soon" at >= 75% of the interval, else "on-track". qualityScore =
 * clamp(0,100) of statusBase + freshnessBonus + cadenceBonus + fileBonus
 * (verified 50 / collected 35 / pending 20 / not_applicable 15 / rejected 0
 * / expired 0; fresh 30 / expiring 15 / stale 5 / expired 0; on-track 15 /
 * due-soon 5 / overdue 0 / n-a 5; files +5); qualityBand >= 80 strong, >= 55
 * adequate, else weak. nextAction follows the weakest-signal precedence
 * (expired, rejected, overdue, stale, due-soon, else healthy). Rows keep
 * input order. The overall rollup returns avgQualityScore (1 decimal),
 * coverageRate = verified / total * 100 (1 decimal) and up to 5
 * deterministic recommendations (expired, stale, overdue, due-soon,
 * unverified - only when > 0). Never throws - non-object input or a non-array
 * rows list yields `EMPTY_EVIDENCE_ANALYSIS`.
 */
export function analyzeEvidenceQuality(
  input: EvidenceAnalysisInput | null | undefined
): EvidenceAnalysisResponse {
  if (!isObject(input) || !Array.isArray(input.rows)) {
    return cloneEmptyAnalysis();
  }
  const nowMs = toClock(input).getTime();

  const rows: EvidenceAnalysisRow[] = [];
  for (const rawRow of input.rows) {
    const row = isObject(rawRow) ? rawRow : {};
    const status = toEvidenceStatus(row.status);
    const fileCount = toFloorCount(row.fileCount);
    const lastVerifiedMs = toTimeMs(row.lastVerified);
    const expirationMs = toTimeMs(row.expirationDate);
    const rawInterval = row.intervalDays;
    const intervalDays =
      typeof rawInterval === "number" && Number.isFinite(rawInterval) && rawInterval > 0
        ? rawInterval
        : null;

    const daysSinceVerified = lastVerifiedMs !== null ? Math.floor((nowMs - lastVerifiedMs) / DAY_MS) : null;
    const daysUntilExpiry = expirationMs !== null ? Math.floor((expirationMs - nowMs) / DAY_MS) : null;

    let freshness: EvidenceFreshness;
    if (expirationMs !== null && expirationMs < nowMs) {
      freshness = "expired";
    } else if (expirationMs !== null && daysUntilExpiry !== null && daysUntilExpiry <= 90) {
      freshness = "expiring";
    } else if (lastVerifiedMs === null) {
      freshness = "stale";
    } else if (intervalDays !== null && daysSinceVerified !== null && daysSinceVerified > intervalDays) {
      freshness = "stale";
    } else {
      freshness = "fresh";
    }

    let cadence: EvidenceCadence;
    if (intervalDays === null) {
      cadence = "n-a";
    } else if (lastVerifiedMs === null) {
      cadence = "overdue";
    } else if (daysSinceVerified !== null && daysSinceVerified > intervalDays) {
      cadence = "overdue";
    } else if (daysSinceVerified !== null && daysSinceVerified >= intervalDays * 0.75) {
      cadence = "due-soon";
    } else {
      cadence = "on-track";
    }

    const qualityScore = Math.max(
      0,
      Math.min(100, STATUS_BASE[status] + FRESHNESS_BONUS[freshness] + CADENCE_BONUS[cadence] + (fileCount > 0 ? 5 : 0))
    );
    const qualityBand: EvidenceQualityBand =
      qualityScore >= 80 ? "strong" : qualityScore >= 55 ? "adequate" : "weak";

    const nextAction =
      freshness === "expired"
        ? "Re-collect expired evidence"
        : status === "rejected"
          ? "Upload replacement evidence"
          : cadence === "overdue"
            ? "Re-verify evidence (renewal due)"
            : freshness === "stale"
              ? "Verify evidence freshness"
              : cadence === "due-soon"
                ? "Schedule renewal verification"
                : "Evidence healthy — no action needed";

    rows.push({
      id: toIdValue(row.id),
      evidenceId: toIdString(row.evidenceId) ?? toIdString(row.id) ?? "",
      status,
      qualityScore,
      qualityBand,
      freshness,
      cadence,
      daysUntilExpiry,
      owner: toNullableName(row.owner),
      nextAction,
    });
  }

  const counts: EvidenceAnalysisCounts = {
    total: rows.length,
    verified: 0,
    expired: 0,
    stale: 0,
    fresh: 0,
    expiring: 0,
    dueSoon: 0,
    overdue: 0,
  };
  for (const row of rows) {
    if (row.status === "verified") counts.verified += 1;
    if (row.freshness === "expired") counts.expired += 1;
    if (row.freshness === "stale") counts.stale += 1;
    if (row.freshness === "fresh") counts.fresh += 1;
    if (row.freshness === "expiring") counts.expiring += 1;
    if (row.cadence === "due-soon") counts.dueSoon += 1;
    if (row.cadence === "overdue") counts.overdue += 1;
  }

  const avgQualityScore =
    rows.length > 0 ? round1(rows.reduce((sum, row) => sum + row.qualityScore, 0) / rows.length) : 0;
  const coverageRate = rows.length > 0 ? round1((counts.verified / rows.length) * 100) : 0;

  const recommendations: string[] = [];
  if (counts.expired > 0) recommendations.push(`Re-collect ${counts.expired} expired evidence item(s)`);
  if (counts.stale > 0) recommendations.push(`Verify ${counts.stale} stale evidence item(s)`);
  if (counts.overdue > 0) recommendations.push(`Renew ${counts.overdue} overdue item(s)`);
  if (counts.dueSoon > 0) recommendations.push(`Schedule renewal for ${counts.dueSoon} item(s)`);
  const unverified = rows.length - counts.verified;
  if (unverified > 0) recommendations.push(`Collect evidence for ${unverified} unverified item(s)`);

  return {
    rows,
    overall: {
      avgQualityScore,
      coverageRate,
      counts,
      recommendations: recommendations.slice(0, MAX_RECOMMENDATIONS),
    },
  };
}
