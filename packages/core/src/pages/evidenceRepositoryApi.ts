/**
 * NIS2 Evidence Repository - data contract + hooks
 * =================================================
 * UI-side typed view of the `evidenceRepository.*` tRPC procedures the
 * backend agent is building (registered as `evidenceRepository:` on the
 * AppRouter in `packages/core/src/routers.ts`).
 *
 * NIS2 Implementation Plan Phase 6 Task 6.2 - Evidence Repository
 * Enhancement: automated evidence suggestions mapped to ENISA measures,
 * an evidence audit trail, and AI-powered evidence quality analysis. The
 * three procedures power the new "NIS2 Evidence Repository" section on the
 * Evidence page (Art. 21(2) evidence completeness, freshness and cadence).
 *
 * COORDINATION BY CONVENTION (UI-STANDARD 16) - if the procedures are not
 * live yet the tRPC HTTP call 404s (NOT_FOUND) and the query surfaces an
 * error; every consumer in the UI degrades to a graceful EmptyState
 * ("Connect the evidenceRepository.<procedure> API").
 *
 * ---------------------------------------------------------------------------
 * Expected procedures (all protected queries, pure - no DB access):
 *
 * 1) evidenceRepository.suggest
 *    input:  { measureId?, category?, requirementText?, limit? }
 *    output: { suggestions: Array<{ measureId, article, title,
 *              evidenceTypes: string[], collectionMethod, freshnessDays,
 *              exampleEvidence, score, matchReason }> }
 *
 * 2) evidenceRepository.auditTrail
 *    input:  { rows?: Array<{ id, evidenceId?, clientControlId?, status?,
 *              type?, owner?, fileCount?, updatedAt? }>, now?, clock? }
 *    output: { events: Array<{ id, evidenceId, status, type, owner,
 *              fileCount, updatedAt: Date|null, daysSinceUpdate: number|null }>,
 *              summary: { totals: { total, byStatus: Record<string,number> },
 *              withOwner, withFiles } }
 *
 * 3) evidenceRepository.analyze
 *    input:  { rows?: Array<{ id, evidenceId?, status?, type?, owner?,
 *              fileCount?, systemId?, lastVerified?, expirationDate?,
 *              intervalDays? }>, now?, clock? }
 *    output: { rows: Array<{ id, evidenceId, status, qualityScore,
 *              qualityBand: 'strong'|'adequate'|'weak',
 *              freshness: 'fresh'|'expiring'|'stale'|'expired',
 *              cadence: 'on-track'|'due-soon'|'overdue'|'n-a',
 *              daysUntilExpiry: number|null, nextAction }>,
 *              overall: { avgQualityScore, coverageRate,
 *              counts: { total, verified, expired, stale, fresh, expiring,
 *              dueSoon, overdue }, recommendations: string[] } }
 * ---------------------------------------------------------------------------
 */

import { trpc } from "@/lib/trpc";

/* ------------------------------------------------------------------ */
/* Types (mirror the backend contract 1:1, defensive on optionals)    */
/* ------------------------------------------------------------------ */

/** Lifecycle status of an evidence record. */
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

/** Badge variants actually supported by the Badge component. */
export type EvidenceBadgeVariant =
  | "default"
  | "secondary"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "outline"
  | "destructive";

/** Data-viz score-bar fill (index.css .progress-* classes, UI-STANDARD 18). */
export type EvidenceBarClass = "progress-success" | "progress-warning" | "progress-error";

/** Wall-clock input accepted by the pure engines (superjson Date|string). */
export type EvidenceClockInput = string | Date | null | undefined;

/* --- evidenceRepository.suggest --------------------------------------- */

/** Input of evidenceRepository.suggest. */
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

/** Output of evidenceRepository.suggest. */
export interface EvidenceSuggestionsResponse {
  suggestions: EvidenceSuggestionItem[];
}

/* --- evidenceRepository.auditTrail ------------------------------------ */

/** One evidence row fed into the audit-trail engine (input side). */
export interface EvidenceAuditTrailRowInput {
  id: string | number;
  evidenceId?: string | null;
  clientControlId?: string | number | null;
  status?: EvidenceStatus | null;
  type?: string | null;
  owner?: string | null;
  fileCount?: number | null;
  /** Last activity timestamp; used to derive daysSinceUpdate. */
  updatedAt?: EvidenceClockInput;
}

/** Input of evidenceRepository.auditTrail. */
export interface EvidenceAuditTrailInput {
  rows?: EvidenceAuditTrailRowInput[];
  now?: EvidenceClockInput;
  clock?: (() => number | Date | null) | null;
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

/** Output of evidenceRepository.auditTrail. */
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
  status?: EvidenceStatus | null;
  type?: string | null;
  owner?: string | null;
  fileCount?: number | null;
  systemId?: string | number | null;
  lastVerified?: EvidenceClockInput;
  expirationDate?: EvidenceClockInput;
  /** Renewal cadence in days; null disables cadence tracking. */
  intervalDays?: number | null;
}

/** Input of evidenceRepository.analyze. */
export interface EvidenceAnalysisInput {
  rows?: EvidenceAnalysisRowInput[];
  now?: EvidenceClockInput;
  clock?: (() => number | Date | null) | null;
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

/** One computed evidence row returned by evidenceRepository.analyze. */
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

/** Output of evidenceRepository.analyze. */
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
/* Empty shapes - stable defaults for degraded rendering (16)          */
/* ------------------------------------------------------------------ */

export const EMPTY_EVIDENCE_SUGGESTIONS: EvidenceSuggestionsResponse = {
  suggestions: [],
};

export const EMPTY_EVIDENCE_AUDIT_TRAIL: EvidenceAuditTrailResponse = {
  events: [],
  summary: {
    totals: { total: 0, byStatus: {} },
    withOwner: 0,
    withFiles: 0,
  },
};

export const EMPTY_EVIDENCE_ANALYSIS: EvidenceAnalysisResponse = {
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

interface EvidenceRepositoryTrpc {
  evidenceRepository: {
    suggest: {
      useQuery: (
        input: EvidenceSuggestionsInput,
        opts?: QueryOptions
      ) => QueryLike<EvidenceSuggestionsResponse>;
    };
    auditTrail: {
      useQuery: (
        input: EvidenceAuditTrailInput,
        opts?: QueryOptions
      ) => QueryLike<EvidenceAuditTrailResponse>;
    };
    analyze: {
      useQuery: (
        input: EvidenceAnalysisInput,
        opts?: QueryOptions
      ) => QueryLike<EvidenceAnalysisResponse>;
    };
  };
}

const evidenceRepositoryApi = trpc as unknown as EvidenceRepositoryTrpc;

/** Placeholder inputs used only while a query is disabled (never rendered). */
const HIDDEN_SUGGEST_INPUT: EvidenceSuggestionsInput = {};
const HIDDEN_AUDIT_TRAIL_INPUT: EvidenceAuditTrailInput = { rows: [] };
const HIDDEN_ANALYSIS_INPUT: EvidenceAnalysisInput = { rows: [] };

/* ------------------------------------------------------------------ */
/* Hooks - retry: false, enabled: clientId > 0 (UI-STANDARD 16)        */
/* ------------------------------------------------------------------ */

/**
 * Evidence suggestions mapped to ENISA measures (gaps vs Art. 21(2)).
 * Client-scoped - pass null for `input` to keep the query disabled.
 */
export function useEvidenceSuggestions(
  clientId: number,
  input: EvidenceSuggestionsInput | null,
  enabled = true
): QueryLike<EvidenceSuggestionsResponse> {
  return evidenceRepositoryApi.evidenceRepository.suggest.useQuery(input ?? HIDDEN_SUGGEST_INPUT, {
    enabled: enabled && clientId > 0 && input !== null,
    retry: false,
    staleTime: 30_000,
  });
}

/**
 * Evidence audit trail (last activity per evidence record + summary).
 * Client-scoped - pass null for `input` to keep the query disabled.
 */
export function useEvidenceAuditTrail(
  clientId: number,
  input: EvidenceAuditTrailInput | null,
  enabled = true
): QueryLike<EvidenceAuditTrailResponse> {
  return evidenceRepositoryApi.evidenceRepository.auditTrail.useQuery(
    input ?? HIDDEN_AUDIT_TRAIL_INPUT,
    {
      enabled: enabled && clientId > 0 && input !== null,
      retry: false,
      staleTime: 30_000,
    }
  );
}

/**
 * Evidence quality analysis (quality band, freshness, renewal cadence).
 * Client-scoped - pass null for `input` to keep the query disabled.
 */
export function useEvidenceAnalysis(
  clientId: number,
  input: EvidenceAnalysisInput | null,
  enabled = true
): QueryLike<EvidenceAnalysisResponse> {
  return evidenceRepositoryApi.evidenceRepository.analyze.useQuery(input ?? HIDDEN_ANALYSIS_INPUT, {
    enabled: enabled && clientId > 0 && input !== null,
    retry: false,
    staleTime: 30_000,
  });
}

/* ------------------------------------------------------------------ */
/* Meta helpers (all token-based, dark-mode safe - UI-STANDARD 2)      */
/* ------------------------------------------------------------------ */

export interface EvidenceMeta {
  label: string;
  badgeVariant: EvidenceBadgeVariant;
  /** index.css .progress-* class that colors a [data-slot="progress-indicator"] fill. */
  barClass: EvidenceBarClass;
}

/** Quality band -> badge label/variant + score-bar fill (18 exception). */
export const QUALITY_BAND_META: Record<EvidenceQualityBand, EvidenceMeta> = {
  strong: { label: "Strong", badgeVariant: "success", barClass: "progress-success" },
  adequate: { label: "Adequate", badgeVariant: "warning", barClass: "progress-warning" },
  weak: { label: "Weak", badgeVariant: "error", barClass: "progress-error" },
};

/** Freshness -> badge label/variant + score-bar fill (18 exception). */
export const FRESHNESS_META: Record<EvidenceFreshness, EvidenceMeta> = {
  fresh: { label: "Fresh", badgeVariant: "success", barClass: "progress-success" },
  expiring: { label: "Expiring", badgeVariant: "warning", barClass: "progress-warning" },
  stale: { label: "Stale", badgeVariant: "warning", barClass: "progress-warning" },
  expired: { label: "Expired", badgeVariant: "error", barClass: "progress-error" },
};

/** Evidence lifecycle status -> badge label + variant. */
export const EVIDENCE_STATUS_META: Record<EvidenceStatus, EvidenceMeta> = {
  pending: { label: "Pending", badgeVariant: "secondary", barClass: "progress-warning" },
  collected: { label: "Collected", badgeVariant: "info", barClass: "progress-warning" },
  verified: { label: "Verified", badgeVariant: "success", barClass: "progress-success" },
  rejected: { label: "Rejected", badgeVariant: "error", barClass: "progress-error" },
  expired: { label: "Expired", badgeVariant: "error", barClass: "progress-error" },
  not_applicable: { label: "N/A", badgeVariant: "outline", barClass: "progress-warning" },
};

/** Renewal cadence -> badge label + variant. */
export const CADENCE_META: Record<EvidenceCadence, EvidenceMeta> = {
  "on-track": { label: "On Track", badgeVariant: "success", barClass: "progress-success" },
  "due-soon": { label: "Due Soon", badgeVariant: "warning", barClass: "progress-warning" },
  overdue: { label: "Overdue", badgeVariant: "error", barClass: "progress-error" },
  "n-a": { label: "N/A", badgeVariant: "secondary", barClass: "progress-warning" },
};

/** Stable render order for evidence status chips. */
export const EVIDENCE_STATUS_ORDER: EvidenceStatus[] = [
  "pending",
  "collected",
  "verified",
  "rejected",
  "expired",
  "not_applicable",
];

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Map a quality score to a score-bar fill (>=80 strong, >=55 adequate). */
export function qualityBarClass(score: number): EvidenceBarClass {
  if (score >= 80) return "progress-success";
  if (score >= 55) return "progress-warning";
  return "progress-error";
}

/** Map a quality score to its band (>=80 strong, >=55 adequate, else weak). */
export function qualityBandForScore(score: number): EvidenceQualityBand {
  if (score >= 80) return "strong";
  if (score >= 55) return "adequate";
  return "weak";
}

/** Human-readable expiry countdown label for a computed row. */
export function formatDaysUntilExpiry(days: number | null): string {
  if (days === null) return "No expiry";
  if (days === 0) return "Expires today";
  if (days < 0) return `${Math.abs(days)}d expired`;
  return `${days}d left`;
}

/* ------------------------------------------------------------------ */
/* Demo mode (UI-STANDARD 17) - sample data, never fake primary state  */
/* ------------------------------------------------------------------ */

/**
 * Fixed demo clock so the evidence demo is deterministic: every
 * lastVerified / expirationDate and derived stat is computed from this
 * instant.
 */
export const DEMO_EVIDENCE_BASE_DATE = new Date("2026-09-15T00:00:00.000Z");

const DAY_MS = 86_400_000;

const demoIso = (daysFromBase: number): string =>
  new Date(DEMO_EVIDENCE_BASE_DATE.getTime() + daysFromBase * DAY_MS).toISOString();

/**
 * Sample evidence rows (input side) across NIS2 Art. 21(2) measures with
 * mixed statuses, freshness and cadence so every band/pill is represented.
 * `lastVerified` also drives the audit-trail demo (`updatedAt`).
 */
export const DEMO_EVIDENCE_ROWS: EvidenceAnalysisRowInput[] = [
  {
    id: 1,
    evidenceId: "EVD-101",
    status: "verified",
    type: "risk-assessment",
    owner: "S. Rehman",
    fileCount: 4,
    systemId: "SEC-CORE",
    lastVerified: demoIso(-21),
    expirationDate: demoIso(120),
    intervalDays: 365,
  },
  {
    id: 2,
    evidenceId: "EVD-102",
    status: "verified",
    type: "policy-document",
    owner: "A. Novak",
    fileCount: 2,
    systemId: "GRC-HUB",
    lastVerified: demoIso(-15),
    expirationDate: demoIso(90),
    intervalDays: 180,
  },
  {
    id: 3,
    evidenceId: "EVD-103",
    status: "collected",
    type: "policy-document",
    owner: null,
    fileCount: 1,
    systemId: "GRC-HUB",
    lastVerified: demoIso(-190),
    expirationDate: demoIso(-12),
    intervalDays: 180,
  },
  {
    id: 4,
    evidenceId: "EVD-104",
    status: "verified",
    type: "config-export",
    owner: "M. Osei",
    fileCount: 3,
    systemId: "IDP-AZURE",
    lastVerified: demoIso(-9),
    expirationDate: demoIso(45),
    intervalDays: 90,
  },
  {
    id: 5,
    evidenceId: "EVD-105",
    status: "pending",
    type: "training-record",
    owner: "L. Chen",
    fileCount: 0,
    systemId: "LMS",
    lastVerified: demoIso(-80),
    expirationDate: demoIso(-5),
    intervalDays: 90,
  },
  {
    id: 6,
    evidenceId: "EVD-106",
    status: "collected",
    type: "assessment",
    owner: "P. Duval",
    fileCount: 2,
    systemId: "TPRM",
    lastVerified: demoIso(-120),
    expirationDate: demoIso(30),
    intervalDays: 120,
  },
  {
    id: 7,
    evidenceId: "EVD-107",
    status: "verified",
    type: "scan-report",
    owner: "T. Inoue",
    fileCount: 5,
    systemId: "NESSUS",
    lastVerified: demoIso(-6),
    expirationDate: demoIso(14),
    intervalDays: 30,
  },
  {
    id: 8,
    evidenceId: "EVD-108",
    status: "rejected",
    type: "policy-document",
    owner: "R. Silva",
    fileCount: 1,
    systemId: "GRC-HUB",
    lastVerified: demoIso(-45),
    expirationDate: demoIso(20),
    intervalDays: 365,
  },
  {
    id: 9,
    evidenceId: "EVD-109",
    status: "verified",
    type: "test-report",
    owner: "S. Rehman",
    fileCount: 2,
    systemId: "VEEAM",
    lastVerified: demoIso(-28),
    expirationDate: demoIso(62),
    intervalDays: 90,
  },
  {
    id: 10,
    evidenceId: "EVD-110",
    status: "not_applicable",
    type: "access-review",
    owner: "A. Novak",
    fileCount: 1,
    systemId: "IDP-AZURE",
    lastVerified: demoIso(-200),
    expirationDate: null,
    intervalDays: null,
  },
];

/**
 * Sample evidence suggestions mapped to ENISA measures that show gaps in
 * the demo rows (expired, rejected or missing evidence for the measure).
 */
export const DEMO_SUGGESTION_MEASURES: EvidenceSuggestionItem[] = [
  {
    measureId: "4.1",
    article: "21(2)(c)",
    title: "Business continuity & disaster recovery plan",
    evidenceTypes: ["policy-document", "test-report"],
    collectionMethod:
      "Collect the approved BC/DR plan PDF and the latest restore test report from the DR provider.",
    freshnessDays: 180,
    exampleEvidence: "bcp-dr-plan-v3-signed.pdf, restore-test-2026-08-21.pdf",
    score: 92,
    matchReason: "EVD-103 expired 12 days ago - the plan must be re-collected.",
  },
  {
    measureId: "8.1",
    article: "21(2)(g)",
    title: "Security awareness training completion records",
    evidenceTypes: ["training-record", "screenshot"],
    collectionMethod:
      "Export the completion report from the LMS for the last training cycle and attach it to the control.",
    freshnessDays: 90,
    exampleEvidence: "lms-training-q2-2026-completion.csv",
    score: 88,
    matchReason: "EVD-105 is still pending and passed its expiration date 5 days ago.",
  },
  {
    measureId: "12.1",
    article: "21(2)(j)",
    title: "Asset classification & handling register",
    evidenceTypes: ["spreadsheet", "config-export"],
    collectionMethod:
      "Export the classified asset register (crown jewels, business critical, internal) from the CMDB.",
    freshnessDays: 365,
    exampleEvidence: "asset-register-classified-2026.xlsx",
    score: 85,
    matchReason: "No evidence has been collected for asset management yet.",
  },
  {
    measureId: "5.1",
    article: "21(2)(d)",
    title: "Supply chain security assessment",
    evidenceTypes: ["assessment", "questionnaire-response"],
    collectionMethod:
      "Collect the completed supplier security assessment for the top critical vendors from the TPRM portal.",
    freshnessDays: 180,
    exampleEvidence: "vendor-assessment-acme-cloud-2026.pdf",
    score: 80,
    matchReason: "EVD-106 is only collected (not verified) and expires within 30 days.",
  },
  {
    measureId: "9.1",
    article: "21(2)(h)",
    title: "Cryptography & encryption policy",
    evidenceTypes: ["policy-document", "config-export"],
    collectionMethod:
      "Re-collect the approved crypto policy and an export proving TLS 1.2+ and at-rest encryption defaults.",
    freshnessDays: 365,
    exampleEvidence: "crypto-policy-v4-approved.pdf, tls-config-export.txt",
    score: 76,
    matchReason: "EVD-108 was rejected in the last review - a corrected version is required.",
  },
  {
    measureId: "6.2",
    article: "21(2)(e)",
    title: "Secure development (SDLC) sign-off trail",
    evidenceTypes: ["test-report", "audit-log"],
    collectionMethod:
      "Attach the latest pipeline security gate results and the release sign-off for the last production change.",
    freshnessDays: 90,
    exampleEvidence: "pipeline-gate-results-2026-08.txt, release-signoff-2211.pdf",
    score: 62,
    matchReason: "Scan evidence exists (EVD-107) but no SDLC sign-off trail is recorded.",
  },
];

/** Quality base per status (documented blend used by the demo engine). */
const DEMO_QUALITY_BASE: Record<EvidenceStatus, number> = {
  verified: 90,
  collected: 65,
  pending: 45,
  rejected: 25,
  expired: 20,
  not_applicable: 70,
};

/** Whole days from the base clock to a date; null when unparseable. */
function daysFromBase(value: EvidenceClockInput): number | null {
  if (value === null || value === undefined) return null;
  const time = value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (Number.isNaN(time)) return null;
  return Math.round((time - DEMO_EVIDENCE_BASE_DATE.getTime()) / DAY_MS);
}

/** Composite quality score for one demo row (mirrors the engine blend). */
function demoQualityScore(row: EvidenceAnalysisRowInput, freshness: EvidenceFreshness): number {
  const base = DEMO_QUALITY_BASE[row.status ?? "pending"];
  const fileBonus = (row.fileCount ?? 0) >= 1 ? 5 : 0;
  const freshnessPenalty = freshness === "expired" ? 15 : freshness === "stale" ? 10 : 0;
  return Math.max(0, Math.min(100, base + fileBonus - freshnessPenalty));
}

/** Freshness for one demo row (mirrors the engine's banding). */
function demoFreshnessFor(row: EvidenceAnalysisRowInput): EvidenceFreshness {
  const daysSinceVerified = daysFromBase(row.lastVerified);
  const daysUntilExpiry = daysFromBase(row.expirationDate);
  if (daysUntilExpiry !== null && daysUntilExpiry <= 0) return "expired";
  if (daysSinceVerified !== null && daysSinceVerified > 90) return "stale";
  if (
    (daysUntilExpiry !== null && daysUntilExpiry <= 30) ||
    (daysSinceVerified !== null && daysSinceVerified > 60)
  ) {
    return "expiring";
  }
  return "fresh";
}

/** Cadence for one demo row (mirrors the engine's cadence banding). */
function demoCadenceFor(row: EvidenceAnalysisRowInput): EvidenceCadence {
  if (row.intervalDays === null || row.intervalDays === undefined) return "n-a";
  const daysSinceVerified = daysFromBase(row.lastVerified);
  if (daysSinceVerified === null) return "n-a";
  const daysUntilDue = row.intervalDays - daysSinceVerified;
  if (daysUntilDue < 0) return "overdue";
  if (daysUntilDue <= 14) return "due-soon";
  return "on-track";
}

/** Short next-action string for one demo row (mirrors the engine). */
function demoNextAction(row: EvidenceAnalysisRowInput): string {
  const freshness = demoFreshnessFor(row);
  const cadence = demoCadenceFor(row);
  if (freshness === "expired") return "Re-collect evidence - expired";
  if (row.status === "rejected") return "Upload corrected evidence after review";
  if (freshness === "stale") return "Schedule re-verification - evidence is stale";
  if (cadence === "overdue") return "Renewal is overdue - collect new evidence now";
  if (cadence === "due-soon") return "Renew within 14 days";
  if (freshness === "expiring") return "Refresh before the expiry window closes";
  if (row.status === "pending") return "Awaiting collection";
  if (row.status === "not_applicable") return "No action - not applicable";
  return "Up to date";
}

/** Input object for evidenceRepository.analyze in demo mode. */
export function buildDemoEvidenceAnalysisInput(): EvidenceAnalysisInput {
  return { rows: DEMO_EVIDENCE_ROWS };
}

/** Compute the demo analysis view-model (mirrors analyze output, deterministic). */
export function buildDemoEvidenceAnalysis(): EvidenceAnalysisResponse {
  const rows: EvidenceAnalysisRow[] = DEMO_EVIDENCE_ROWS.map((row) => {
    const freshness = demoFreshnessFor(row);
    const qualityScore = demoQualityScore(row, freshness);
    return {
      id: row.id,
      evidenceId: row.evidenceId ?? `Evidence #${row.id}`,
      status: row.status ?? "pending",
      qualityScore,
      qualityBand: qualityBandForScore(qualityScore),
      freshness,
      cadence: demoCadenceFor(row),
      daysUntilExpiry: daysFromBase(row.expirationDate),
      owner: row.owner ?? null,
      nextAction: demoNextAction(row),
    };
  });

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

  const recommendations: string[] = [];
  const expiredItems = rows.filter((r) => r.freshness === "expired");
  if (expiredItems.length > 0) {
    recommendations.push(
      `Re-collect ${expiredItems.length} expired evidence item${expiredItems.length > 1 ? "s" : ""} (${expiredItems
        .map((r) => r.evidenceId)
        .join(", ")}) before the next auditor review.`
    );
  }
  const dueSoonItems = rows.filter((r) => r.cadence === "due-soon");
  if (dueSoonItems.length > 0) {
    recommendations.push(
      `Renew ${dueSoonItems.length} evidence item${dueSoonItems.length > 1 ? "s" : ""} due within 14 days (${dueSoonItems
        .map((r) => r.evidenceId)
        .join(", ")}).`
    );
  }
  const rejectedItems = rows.filter((r) => r.status === "rejected");
  if (rejectedItems.length > 0) {
    recommendations.push(
      `${rejectedItems.map((r) => r.evidenceId).join(", ")} was rejected - upload a corrected version with reviewer notes.`
    );
  }
  const staleItems = rows.filter((r) => r.freshness === "stale");
  if (staleItems.length > 0) {
    recommendations.push(
      `Schedule re-verification for stale evidence (${staleItems.map((r) => r.evidenceId).join(", ")}) - no update in over 90 days.`
    );
  }
  const noOwner = rows.filter((r) => r.status !== "not_applicable" && !r.owner);
  if (noOwner.length > 0) {
    recommendations.push(
      `Assign an owner to ${noOwner.length} evidence record${noOwner.length > 1 ? "s" : ""} without one (${noOwner
        .map((r) => r.evidenceId)
        .join(", ")}).`
    );
  }

  const avgQualityScore =
    rows.length > 0 ? Math.round((rows.reduce((acc, r) => acc + r.qualityScore, 0) / rows.length) * 10) / 10 : 0;
  const coverageRate = rows.length > 0 ? Math.round((counts.verified / rows.length) * 1000) / 10 : 0;

  return {
    rows,
    overall: { avgQualityScore, coverageRate, counts, recommendations },
  };
}

/** Input object for evidenceRepository.auditTrail in demo mode. */
export function buildDemoEvidenceAuditTrailInput(): EvidenceAuditTrailInput {
  return { rows: DEMO_EVIDENCE_ROWS };
}

/** Compute the demo audit-trail view-model (mirrors auditTrail output). */
export function buildDemoEvidenceAuditTrail(): EvidenceAuditTrailResponse {
  const events: EvidenceAuditEvent[] = DEMO_EVIDENCE_ROWS.map((row) => {
    const daysSinceUpdate = daysFromBase(row.lastVerified);
    return {
      id: row.id,
      evidenceId: row.evidenceId ?? `Evidence #${row.id}`,
      status: row.status ?? "pending",
      type: row.type ?? "document",
      owner: row.owner ?? null,
      fileCount: row.fileCount ?? 0,
      updatedAt: row.lastVerified ? new Date(row.lastVerified) : null,
      daysSinceUpdate,
    };
  }).sort((a, b) => (a.daysSinceUpdate ?? Number.MAX_SAFE_INTEGER) - (b.daysSinceUpdate ?? Number.MAX_SAFE_INTEGER));

  const byStatus: Record<string, number> = {};
  let withOwner = 0;
  let withFiles = 0;
  for (const event of events) {
    byStatus[event.status] = (byStatus[event.status] ?? 0) + 1;
    if (event.owner) withOwner += 1;
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

/** Input object for evidenceRepository.suggest in demo mode. */
export function buildDemoEvidenceSuggestionsInput(): EvidenceSuggestionsInput {
  return {
    measureId: null,
    category: null,
    requirementText: "NIS2 Article 21(2) evidence gaps",
    limit: DEMO_SUGGESTION_MEASURES.length,
  };
}

/** Compute the demo suggestions view-model (mirrors suggest output). */
export function buildDemoEvidenceSuggestions(): EvidenceSuggestionsResponse {
  return {
    suggestions: [...DEMO_SUGGESTION_MEASURES].sort((a, b) => b.score - a.score),
  };
}
