/**
 * NIS2 Policy Center - data contract + hooks
 * ===========================================
 * UI-side typed view of the `policyTemplatesNis2.*` tRPC procedures the
 * backend agent is building in parallel (NIS2 Implementation Plan Phase 6
 * Task 6.1 - policy templates, ISO gap analysis, approval workflow and
 * version history for NIS2 Art. 21 policies).
 *
 * COORDINATION BY CONVENTION (UI-STANDARD 16) - if the procedures are not
 * live yet the tRPC HTTP call 404s (NOT_FOUND) and the query surfaces an
 * error; every consumer in the UI degrades to a graceful EmptyState
 * ("Connect the policyTemplatesNis2.<procedure> API").
 *
 * ---------------------------------------------------------------------------
 * Expected procedures (all protected queries, pure - no DB access):
 *
 * 1) policyTemplatesNis2.templates
 *    input:  { category?, measureId?, search?, limit?, now?, clock? }
 *    output: { total, category?, measureId?,
 *              items: [{ id, title, article21Category ('a'..'j'),
 *                       article21Title, enisaMeasureId ('1.1'..'12.1'),
 *                       enisaMeasureTitle, isoControls: string[],
 *                       summary, requiredSections: string[],
 *                       reviewCadenceDays, ownerRole,
 *                       applicability: string[] }] }
 *            (items enisaMeasureId asc, then title asc)
 *
 * 2) policyTemplatesNis2.gapAnalysis
 *    input:  { policies?: [{ id?, title?, isoControls?: string[]|null,
 *                            status?, lastReviewedAt? }], templates?, now?,
 *              clock? }
 *    output: { coverageRate (1dp), totalTemplates, coveredCount, gapCount,
 *              gaps: [{ templateId, title, enisaMeasureId,
 *                       isoControls: string[], recommendation }]
 *                    (enisaMeasureId asc),
 *              byIsoControl: [{ isoControl, implemented: boolean,
 *                               templateCount,
 *                               status: 'covered'|'gap' }] (isoControl asc),
 *              recommendations: string[] (max 5), totalImplementedPolicies }
 *
 * 3) policyTemplatesNis2.approvalWorkflow
 *    input:  { policyId?, policyTitle?, status?, submittedAt?,
 *              reviewers?: [{ id?, name?,
 *                             decision?: 'approved'|'rejected'|
 *                                        'changes_requested'|null,
 *                             comment?, decidedAt? }],
 *              requiredApprovals?, slaDays?, now?, clock? }
 *    output: { policyId, policyTitle,
 *              currentStatus: 'draft'|'in_review'|'approved'|'rejected'|
 *                             'changes_requested'|'unknown',
 *              nextAction,
 *              verdict: 'Approved'|'Changes requested'|'Rejected'|
 *                       'Awaiting review'|'Draft'|'Unknown',
 *              approvalCount, rejectionCount, changesRequestedCount,
 *              pendingCount, reviewProgress (1dp), complete: boolean,
 *              overdue: boolean, daysInReview: number|null,
 *              steps: [{ label, status: 'done'|'current'|'pending',
 *                        detail? }],
 *              reviewers: [{ id, name, decision?, comment?, decidedAt?,
 *                            status: 'approved'|'rejected'|
 *                                    'changes_requested'|'pending' }] }
 *
 * 4) policyTemplatesNis2.versionHistory
 *    input:  { policyId?, versions?: [{ version?, label?, createdAt?,
 *                                       status?, changeSummary? }], now?,
 *              clock? }
 *    output: { policyId, totalVersions, latestVersion, currentVersion,
 *              draftCount, approvedCount, supersededCount,
 *              versions: [{ version, createdAt (ISO|null),
 *                           status: 'current'|'superseded'|'draft',
 *                           changeSummary }],
 *              changes: string[] }
 * ---------------------------------------------------------------------------
 */

import { trpc } from "@/lib/trpc";

/* ------------------------------------------------------------------ */
/* Types (mirror the backend contract 1:1, defensive on optionals)    */
/* ------------------------------------------------------------------ */

/** Badge variants actually supported by the Badge component. */
export type Nis2BadgeVariant =
  | "default"
  | "secondary"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "outline"
  | "destructive";

/** NIS2 Art. 21(2) category index ('a'..'j' per the directive's Annex I). */
export type Nis2Article21Category = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j";

/** Lifecycle status of a policy under the approval workflow. */
export type Nis2ApprovalStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "rejected"
  | "changes_requested"
  | "unknown";

/** Human verdict shown on the approval panel (derived from currentStatus). */
export type Nis2ApprovalVerdict =
  | "Approved"
  | "Changes requested"
  | "Rejected"
  | "Awaiting review"
  | "Draft"
  | "Unknown";

/** Status of a single policy version in the history table. */
export type Nis2VersionStatus = "current" | "superseded" | "draft";

/** Implementation state of an ISO 27001 control vs the template library. */
export type Nis2GapStatus = "covered" | "gap";

/** A reviewer's decision on the current review round. */
export type Nis2ApprovalDecision = "approved" | "rejected" | "changes_requested" | null;

/** Progress-bar fill class (index.css .progress-* classes, UI-STANDARD 18). */
export type Nis2BarClass = "progress-success" | "progress-warning" | "progress-error";

/* --- policyTemplatesNis2.templates ---------------------------------- */

/** One NIS2 Art. 21 policy template returned by policyTemplatesNis2.templates. */
export interface Nis2Template {
  id: string;
  title: string;
  article21Category: Nis2Article21Category;
  article21Title: string;
  /** ENISA measure id, e.g. "1.1" .. "12.1". */
  enisaMeasureId: string;
  enisaMeasureTitle: string;
  /** ISO 27001:2022 control ids the template maps to, e.g. "A.5.1". */
  isoControls: string[];
  summary: string;
  /** Required document sections, e.g. ["Purpose", "Scope", ...]. */
  requiredSections: string[];
  /** Target review cadence in days. */
  reviewCadenceDays: number;
  /** Role accountable for keeping the policy current. */
  ownerRole: string;
  /** Audiences/entities the policy applies to. */
  applicability: string[];
}

/** Input of policyTemplatesNis2.templates. */
export interface Nis2TemplatesInput {
  category?: Nis2Article21Category | null;
  measureId?: string | null;
  /** Case-insensitive free-text filter over title/summary/titles. */
  search?: string | null;
  limit?: number | null;
  /** Evaluation instant (ISO). Defaults to server time when omitted. */
  now?: string | null;
  /** Injectable clock (ISO) used by tests/demo to pin time. */
  clock?: string | null;
}

/** Output of policyTemplatesNis2.templates. */
export interface Nis2TemplatesResponse {
  total: number;
  category?: Nis2Article21Category | null;
  measureId?: string | null;
  /** Templates sorted by enisaMeasureId asc, then title asc. */
  items: Nis2Template[];
}

/* --- policyTemplatesNis2.gapAnalysis -------------------------------- */

/** One implemented policy fed into the gap engine (input side). */
export interface Nis2PolicyInput {
  id?: string | number | null;
  title?: string | null;
  isoControls?: string[] | null;
  status?: string | null;
  lastReviewedAt?: string | null;
}

/** Input of policyTemplatesNis2.gapAnalysis. */
export interface Nis2GapAnalysisInput {
  policies?: Nis2PolicyInput[];
  /** Optional template library override (defaults to the server's own list). */
  templates?: Nis2Template[] | null;
  now?: string | null;
  clock?: string | null;
}

/** One uncovered template returned by policyTemplatesNis2.gapAnalysis. */
export interface Nis2GapRow {
  templateId: string;
  title: string;
  enisaMeasureId: string;
  /** The template's ISO controls that are NOT implemented by any policy. */
  isoControls: string[];
  recommendation: string;
}

/** ISO control rollup row returned by policyTemplatesNis2.gapAnalysis. */
export interface Nis2ByIsoControl {
  isoControl: string;
  implemented: boolean;
  /** Number of templates that require this control. */
  templateCount: number;
  status: Nis2GapStatus;
}

/** Output of policyTemplatesNis2.gapAnalysis. */
export interface Nis2GapAnalysisResponse {
  /** Share of templates whose ISO controls are fully implemented, 0-100, 1dp. */
  coverageRate: number;
  totalTemplates: number;
  coveredCount: number;
  gapCount: number;
  /** Uncovered templates, enisaMeasureId ascending. */
  gaps: Nis2GapRow[];
  /** Per-control rollup, isoControl ascending. */
  byIsoControl: Nis2ByIsoControl[];
  /** Remediation hints, max 5. */
  recommendations: string[];
  totalImplementedPolicies: number;
}

/* --- policyTemplatesNis2.approvalWorkflow --------------------------- */

/** One reviewer fed into the approval engine (input side). */
export interface Nis2ReviewerInput {
  id?: string | number | null;
  name?: string | null;
  decision?: Nis2ApprovalDecision;
  comment?: string | null;
  decidedAt?: string | null;
}

/** Input of policyTemplatesNis2.approvalWorkflow. */
export interface Nis2ApprovalInput {
  policyId?: string | null;
  policyTitle?: string | null;
  status?: Nis2ApprovalStatus | null;
  submittedAt?: string | null;
  reviewers?: Nis2ReviewerInput[];
  /** Number of approvals required for the policy to be approved. */
  requiredApprovals?: number | null;
  /** Service-level agreement for the whole review round, in days. */
  slaDays?: number | null;
  now?: string | null;
  clock?: string | null;
}

/** One step of the approval pipeline (Draft -> Submit -> Review -> Approve). */
export interface Nis2ApprovalStep {
  label: string;
  status: "done" | "current" | "pending";
  detail?: string | null;
}

/** One reviewer row returned by policyTemplatesNis2.approvalWorkflow. */
export interface Nis2ReviewerRow {
  id: string | number;
  name: string;
  decision?: Nis2ApprovalDecision;
  comment?: string | null;
  decidedAt?: string | null;
  status: "approved" | "rejected" | "changes_requested" | "pending";
}

/** Output of policyTemplatesNis2.approvalWorkflow. */
export interface Nis2ApprovalResponse {
  policyId: string;
  policyTitle: string;
  currentStatus: Nis2ApprovalStatus;
  /** Human instruction describing the immediate next step. */
  nextAction: string;
  verdict: Nis2ApprovalVerdict;
  approvalCount: number;
  rejectionCount: number;
  changesRequestedCount: number;
  pendingCount: number;
  /** Share of reviewers that have decided, 0-100, one decimal. */
  reviewProgress: number;
  /** True when the review round has reached a final outcome. */
  complete: boolean;
  /** True when the review round has blown its SLA (slaDays). */
  overdue: boolean;
  /** Days since submission (null when not submitted yet). */
  daysInReview: number | null;
  steps: Nis2ApprovalStep[];
  reviewers: Nis2ReviewerRow[];
}

/* --- policyTemplatesNis2.versionHistory ----------------------------- */

/** One version record fed into the version engine (input side). */
export interface Nis2VersionItemInput {
  version?: string | null;
  label?: string | null;
  createdAt?: string | null;
  status?: Nis2VersionStatus | null;
  changeSummary?: string | null;
}

/** Input of policyTemplatesNis2.versionHistory. */
export interface Nis2VersionInput {
  policyId?: string | null;
  versions?: Nis2VersionItemInput[];
  now?: string | null;
  clock?: string | null;
}

/** One version row returned by policyTemplatesNis2.versionHistory. */
export interface Nis2VersionRow {
  version: string;
  /** ISO timestamp the version was published at (null when unknown/draft). */
  createdAt: string | null;
  status: Nis2VersionStatus;
  changeSummary: string;
}

/** Output of policyTemplatesNis2.versionHistory. */
export interface Nis2VersionResponse {
  policyId: string;
  totalVersions: number;
  latestVersion: string;
  currentVersion: string;
  draftCount: number;
  approvedCount: number;
  supersededCount: number;
  versions: Nis2VersionRow[];
  /** One-line change log entries ("v3.1: ..."), newest first. */
  changes: string[];
}

/* ------------------------------------------------------------------ */
/* Empty shapes - stable defaults for degraded rendering (16)          */
/* ------------------------------------------------------------------ */

export const EMPTY_POLICY_TEMPLATE_LIST: Nis2TemplatesResponse = {
  total: 0,
  items: [],
};

export const EMPTY_POLICY_GAP_ANALYSIS: Nis2GapAnalysisResponse = {
  coverageRate: 0,
  totalTemplates: 0,
  coveredCount: 0,
  gapCount: 0,
  gaps: [],
  byIsoControl: [],
  recommendations: [],
  totalImplementedPolicies: 0,
};

export const EMPTY_POLICY_APPROVAL: Nis2ApprovalResponse = {
  policyId: "",
  policyTitle: "",
  currentStatus: "unknown",
  nextAction: "",
  verdict: "Unknown",
  approvalCount: 0,
  rejectionCount: 0,
  changesRequestedCount: 0,
  pendingCount: 0,
  reviewProgress: 0,
  complete: false,
  overdue: false,
  daysInReview: null,
  steps: [],
  reviewers: [],
};

export const EMPTY_POLICY_VERSION_HISTORY: Nis2VersionResponse = {
  policyId: "",
  totalVersions: 0,
  latestVersion: "",
  currentVersion: "",
  draftCount: 0,
  approvedCount: 0,
  supersededCount: 0,
  versions: [],
  changes: [],
};

/* ------------------------------------------------------------------ */
/* Narrowed tRPC query result shapes (runtime is a superset)          */
/* ------------------------------------------------------------------ */

export interface Nis2QueryLike<T> {
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

interface PolicyTemplatesNis2Trpc {
  policyTemplatesNis2: {
    templates: {
      useQuery: (input: Nis2TemplatesInput, opts?: QueryOptions) => Nis2QueryLike<Nis2TemplatesResponse>;
    };
    gapAnalysis: {
      useQuery: (input: Nis2GapAnalysisInput, opts?: QueryOptions) => Nis2QueryLike<Nis2GapAnalysisResponse>;
    };
    approvalWorkflow: {
      useQuery: (input: Nis2ApprovalInput, opts?: QueryOptions) => Nis2QueryLike<Nis2ApprovalResponse>;
    };
    versionHistory: {
      useQuery: (input: Nis2VersionInput, opts?: QueryOptions) => Nis2QueryLike<Nis2VersionResponse>;
    };
  };
}

const policyTemplatesNis2Api = trpc as unknown as PolicyTemplatesNis2Trpc;

/** Placeholder inputs used only while a query is disabled (never rendered). */
const HIDDEN_NIS2_TEMPLATES_INPUT: Nis2TemplatesInput = {};
const HIDDEN_NIS2_GAP_ANALYSIS_INPUT: Nis2GapAnalysisInput = { policies: [] };
const HIDDEN_NIS2_APPROVAL_INPUT: Nis2ApprovalInput = { reviewers: [] };
const HIDDEN_NIS2_VERSION_INPUT: Nis2VersionInput = { versions: [] };

/* ------------------------------------------------------------------ */
/* Hooks - retry: false, disabled while input is null (UI-STANDARD 16) */
/* ------------------------------------------------------------------ */

/**
 * NIS2 Art. 21 policy template library (category/search filters, ENISA
 * measure mapping, ISO control mapping). Pass null for `input` to keep the
 * query disabled.
 */
export function useNis2PolicyTemplates(
  input: Nis2TemplatesInput | null,
  enabled = true
): Nis2QueryLike<Nis2TemplatesResponse> {
  return policyTemplatesNis2Api.policyTemplatesNis2.templates.useQuery(
    input ?? HIDDEN_NIS2_TEMPLATES_INPUT,
    {
      enabled: enabled && input !== null,
      retry: false,
      staleTime: 30_000,
    }
  );
}

/**
 * ISO 27001 gap analysis over the template library vs implemented policies.
 * Pass null for `input` to keep the query disabled.
 */
export function useNis2PolicyGapAnalysis(
  input: Nis2GapAnalysisInput | null,
  enabled = true
): Nis2QueryLike<Nis2GapAnalysisResponse> {
  return policyTemplatesNis2Api.policyTemplatesNis2.gapAnalysis.useQuery(
    input ?? HIDDEN_NIS2_GAP_ANALYSIS_INPUT,
    {
      enabled: enabled && input !== null,
      retry: false,
      staleTime: 30_000,
    }
  );
}

/**
 * Approval workflow state (steps, verdict, reviewer decisions, SLA).
 * Pass null for `input` to keep the query disabled.
 */
export function useNis2PolicyApproval(
  input: Nis2ApprovalInput | null,
  enabled = true
): Nis2QueryLike<Nis2ApprovalResponse> {
  return policyTemplatesNis2Api.policyTemplatesNis2.approvalWorkflow.useQuery(
    input ?? HIDDEN_NIS2_APPROVAL_INPUT,
    {
      enabled: enabled && input !== null,
      retry: false,
      staleTime: 30_000,
    }
  );
}

/**
 * Policy version history (current/superseded/draft rows + change log).
 * Pass null for `input` to keep the query disabled.
 */
export function useNis2PolicyVersionHistory(
  input: Nis2VersionInput | null,
  enabled = true
): Nis2QueryLike<Nis2VersionResponse> {
  return policyTemplatesNis2Api.policyTemplatesNis2.versionHistory.useQuery(
    input ?? HIDDEN_NIS2_VERSION_INPUT,
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

export interface Nis2CategoryMeta {
  label: string;
  title: string;
}

/** NIS2 Art. 21(2) categories (Annex I letter) -> short label + full title. */
export const ARTICLE21_CATEGORY_META: Record<Nis2Article21Category, Nis2CategoryMeta> = {
  a: {
    label: "A - Risk analysis & policies",
    title: "Risk analysis and information system security policies",
  },
  b: {
    label: "B - Incident handling",
    title: "Incident handling",
  },
  c: {
    label: "C - Business continuity",
    title: "Business continuity, backup management and crisis management",
  },
  d: {
    label: "D - Supply chain",
    title: "Supply chain security",
  },
  e: {
    label: "E - Network & systems security",
    title:
      "Security in network and information systems acquisition, development and maintenance, including vulnerability handling and disclosure",
  },
  f: {
    label: "F - Effectiveness",
    title: "Policies and procedures to assess the effectiveness of cybersecurity risk-management measures",
  },
  g: {
    label: "G - Hygiene & training",
    title: "Basic cyber hygiene practices and cybersecurity training",
  },
  h: {
    label: "H - Cryptography",
    title: "Policies and procedures regarding the use of cryptography and encryption",
  },
  i: {
    label: "I - HR, access & assets",
    title: "Human resources security, access control policies and asset management",
  },
  j: {
    label: "J - Multi-factor auth",
    title: "Use of multi-factor authentication or continuous authentication solutions",
  },
};

/** Stable render order for Art. 21 category chips (a..j). */
export const ARTICLE21_CATEGORY_ORDER: Nis2Article21Category[] = [
  "a",
  "b",
  "c",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
];

export interface Nis2StatusMeta {
  label: string;
  badgeVariant: Nis2BadgeVariant;
  /** Token-based dot color (dark-mode safe). */
  dotClass: string;
}

/** Approval lifecycle status -> badge label/variant + dot color. */
export const APPROVAL_STATUS_META: Record<Nis2ApprovalStatus, Nis2StatusMeta> = {
  draft: {
    label: "Draft",
    badgeVariant: "secondary",
    dotClass: "bg-muted-foreground",
  },
  in_review: {
    label: "In review",
    badgeVariant: "info",
    dotClass: "bg-[var(--info-foreground)]",
  },
  approved: {
    label: "Approved",
    badgeVariant: "success",
    dotClass: "bg-[var(--success-foreground)]",
  },
  rejected: {
    label: "Rejected",
    badgeVariant: "error",
    dotClass: "bg-[var(--error-foreground)]",
  },
  changes_requested: {
    label: "Changes requested",
    badgeVariant: "warning",
    dotClass: "bg-[var(--warning-foreground)]",
  },
  unknown: {
    label: "Unknown",
    badgeVariant: "outline",
    dotClass: "bg-muted-foreground",
  },
};

/** Approval verdict -> badge label/variant. */
export const APPROVAL_VERDICT_META: Record<Nis2ApprovalVerdict, Nis2StatusMeta> = {
  Approved: {
    label: "Approved",
    badgeVariant: "success",
    dotClass: "bg-[var(--success-foreground)]",
  },
  "Changes requested": {
    label: "Changes requested",
    badgeVariant: "warning",
    dotClass: "bg-[var(--warning-foreground)]",
  },
  Rejected: {
    label: "Rejected",
    badgeVariant: "error",
    dotClass: "bg-[var(--error-foreground)]",
  },
  "Awaiting review": {
    label: "Awaiting review",
    badgeVariant: "info",
    dotClass: "bg-[var(--info-foreground)]",
  },
  Draft: {
    label: "Draft",
    badgeVariant: "secondary",
    dotClass: "bg-muted-foreground",
  },
  Unknown: {
    label: "Unknown",
    badgeVariant: "outline",
    dotClass: "bg-muted-foreground",
  },
};

/** Policy version status -> badge label/variant + dot color. */
export const VERSION_STATUS_META: Record<Nis2VersionStatus, Nis2StatusMeta> = {
  current: {
    label: "Current",
    badgeVariant: "success",
    dotClass: "bg-[var(--success-foreground)]",
  },
  superseded: {
    label: "Superseded",
    badgeVariant: "secondary",
    dotClass: "bg-muted-foreground",
  },
  draft: {
    label: "Draft",
    badgeVariant: "info",
    dotClass: "bg-[var(--info-foreground)]",
  },
};

/** ISO control implementation state -> badge label/variant + dot color. */
export const GAP_STATUS_META: Record<Nis2GapStatus, Nis2StatusMeta> = {
  covered: {
    label: "Covered",
    badgeVariant: "success",
    dotClass: "bg-[var(--success-foreground)]",
  },
  gap: {
    label: "Gap",
    badgeVariant: "error",
    dotClass: "bg-[var(--error-foreground)]",
  },
};

/** Badge variant for an approval status (UI-STANDARD 2 token colors). */
export function getApprovalStatusClass(status: Nis2ApprovalStatus): Nis2BadgeVariant {
  return APPROVAL_STATUS_META[status].badgeVariant;
}

/** Badge variant for a version status. */
export function getVersionStatusClass(status: Nis2VersionStatus): Nis2BadgeVariant {
  return VERSION_STATUS_META[status].badgeVariant;
}

/** Badge variant for an ISO control gap status. */
export function getGapStatusClass(status: Nis2GapStatus): Nis2BadgeVariant {
  return GAP_STATUS_META[status].badgeVariant;
}

/** Progress-bar fill class for a 0-100 rate (UI-STANDARD 18 exception). */
export function nis2CoverageBarClass(rate: number): Nis2BarClass {
  if (rate >= 80) return "progress-success";
  if (rate >= 50) return "progress-warning";
  return "progress-error";
}

/** ISO date -> short local date ("15 Jan 2026"); empty/invalid -> "—". */
export function formatPolicyDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/** Days in review label ("3 days", "1 day", "—" when null). */
export function formatDaysInReview(days: number | null | undefined): string {
  if (days == null || !Number.isFinite(days)) return "—";
  return `${days} ${days === 1 ? "day" : "days"}`;
}

/* ------------------------------------------------------------------ */
/* Demo mode (UI-STANDARD 17) - sample data, never fake primary state  */
/* ------------------------------------------------------------------ */

/**
 * Fixed demo clock so the policy-center demo is deterministic: every derived
 * stat (review progress, days in review, version dates) is computed from this
 * instant.
 */
export const DEMO_NIS2_BASE_DATE = new Date("2026-01-15T12:00:00.000Z");

const demoIso = (daysFromBase: number): string =>
  new Date(DEMO_NIS2_BASE_DATE.getTime() + daysFromBase * 86_400_000).toISOString();

/** Sample NIS2 Art. 21 policy templates, one per ENISA measure 1.1..12.1. */
export const DEMO_NIS2_TEMPLATES: Nis2Template[] = [
  {
    id: "tpl-001",
    title: "Information Security Policy",
    article21Category: "a",
    article21Title: "Risk analysis and information system security policies",
    enisaMeasureId: "1.1",
    enisaMeasureTitle: "Policies on risk analysis and information security",
    isoControls: ["A.5.1", "A.5.2"],
    summary:
      "Top-level policy establishing the information security framework, governance and management commitment for the whole organization.",
    requiredSections: ["Purpose", "Scope", "Information security objectives", "Roles & responsibilities", "Review & enforcement"],
    reviewCadenceDays: 365,
    ownerRole: "CISO",
    applicability: ["All employees", "All business units", "Third-party vendors"],
  },
  {
    id: "tpl-002",
    title: "Risk Management Policy",
    article21Category: "a",
    article21Title: "Risk analysis and information system security policies",
    enisaMeasureId: "2.1",
    enisaMeasureTitle: "ICT risk management process",
    isoControls: ["A.5.7", "A.8.8"],
    summary:
      "Defines the ICT risk assessment and treatment process, threat-intelligence inputs and the risk acceptance criteria.",
    requiredSections: ["Risk criteria", "Risk assessment process", "Threat intelligence", "Risk treatment", "Risk register"],
    reviewCadenceDays: 365,
    ownerRole: "CISO",
    applicability: ["All business units", "IT operations", "Third-party vendors"],
  },
  {
    id: "tpl-003",
    title: "Incident Handling Policy",
    article21Category: "b",
    article21Title: "Incident handling",
    enisaMeasureId: "3.1",
    enisaMeasureTitle: "Incident handling and reporting",
    isoControls: ["A.5.24", "A.5.25", "A.5.26"],
    summary:
      "End-to-end incident response framework: detection, triage, response, escalation and the NIS2 24-hour early-warning reporting duty.",
    requiredSections: ["Detection & triage", "Severity levels", "Response procedures", "Reporting duty (24h/72h)", "Lessons learned"],
    reviewCadenceDays: 180,
    ownerRole: "Security Operations Lead",
    applicability: ["IT operations", "All employees", "Service desk"],
  },
  {
    id: "tpl-004",
    title: "Business Continuity Plan",
    article21Category: "c",
    article21Title: "Business continuity, backup management and crisis management",
    enisaMeasureId: "4.1",
    enisaMeasureTitle: "Business continuity and crisis management",
    isoControls: ["A.5.29", "A.5.30"],
    summary:
      "Continuity and crisis-management framework: BIA-driven recovery objectives, backups, crisis team and exercise schedule.",
    requiredSections: ["BIA summary", "Recovery objectives", "Backup strategy", "Crisis management team", "Exercise & testing"],
    reviewCadenceDays: 365,
    ownerRole: "Business Continuity Manager",
    applicability: ["All business units", "IT operations", "Executive management"],
  },
  {
    id: "tpl-005",
    title: "Supply Chain Security Policy",
    article21Category: "d",
    article21Title: "Supply chain security",
    enisaMeasureId: "5.1",
    enisaMeasureTitle: "Supply chain security",
    isoControls: ["A.5.19", "A.5.20", "A.5.21"],
    summary:
      "Governs security in supplier relationships: due-diligence tiers, contractual clauses, ICT supply-chain risk and vendor monitoring.",
    requiredSections: ["Supplier tiers", "Due diligence", "Contractual clauses", "Supply-chain risk", "Vendor monitoring"],
    reviewCadenceDays: 365,
    ownerRole: "Procurement Security Lead",
    applicability: ["Procurement", "IT operations", "Legal"],
  },
  {
    id: "tpl-006",
    title: "Secure Development Policy",
    article21Category: "e",
    article21Title:
      "Security in network and information systems acquisition, development and maintenance, including vulnerability handling and disclosure",
    enisaMeasureId: "6.2",
    enisaMeasureTitle: "Secure development and change management",
    isoControls: ["A.8.25", "A.8.27", "A.8.28"],
    summary:
      "Secure software development lifecycle: secure design, coding standards, change control and pre-release security testing.",
    requiredSections: ["Secure SDLC", "Threat modelling", "Secure coding standards", "Change management", "Release gates"],
    reviewCadenceDays: 365,
    ownerRole: "Security Architecture Lead",
    applicability: ["Engineering", "DevOps", "QA"],
  },
  {
    id: "tpl-007",
    title: "Network Security Policy",
    article21Category: "e",
    article21Title:
      "Security in network and information systems acquisition, development and maintenance, including vulnerability handling and disclosure",
    enisaMeasureId: "6.7",
    enisaMeasureTitle: "Network and information systems security",
    isoControls: ["A.8.20", "A.8.21", "A.8.22"],
    summary:
      "Network segmentation, firewall and service-security rules, plus vulnerability handling and disclosure for exposed systems.",
    requiredSections: ["Network zoning", "Firewall & filtering", "Segregation", "Vulnerability handling", "Disclosure process"],
    reviewCadenceDays: 180,
    ownerRole: "Network Security Lead",
    applicability: ["IT operations", "Engineering"],
  },
  {
    id: "tpl-008",
    title: "Effectiveness Assessment Policy",
    article21Category: "f",
    article21Title:
      "Policies and procedures to assess the effectiveness of cybersecurity risk-management measures",
    enisaMeasureId: "7.1",
    enisaMeasureTitle: "Measuring effectiveness of risk-management measures",
    isoControls: ["A.5.36", "A.5.37"],
    summary:
      "Defines how the effectiveness of risk-management measures is measured, reviewed and reported to management.",
    requiredSections: ["Effectiveness KPIs", "Measurement methodology", "Review schedule", "Reporting", "Continuous improvement"],
    reviewCadenceDays: 365,
    ownerRole: "CISO",
    applicability: ["All business units", "IT operations"],
  },
  {
    id: "tpl-009",
    title: "Security Awareness Policy",
    article21Category: "g",
    article21Title: "Basic cyber hygiene practices and cybersecurity training",
    enisaMeasureId: "8.1",
    enisaMeasureTitle: "Cyber hygiene and training",
    isoControls: ["A.6.3"],
    summary:
      "Mandatory cyber-hygiene and training program: onboarding, phishing simulations, role-based courses and completion tracking.",
    requiredSections: ["Training curriculum", "Onboarding", "Phishing simulation", "Completion tracking", "Non-compliance"],
    reviewCadenceDays: 180,
    ownerRole: "Security Awareness Lead",
    applicability: ["All employees", "Contractors", "Third-party vendors"],
  },
  {
    id: "tpl-010",
    title: "Cryptography Policy",
    article21Category: "h",
    article21Title: "Policies and procedures regarding the use of cryptography and encryption",
    enisaMeasureId: "9.1",
    enisaMeasureTitle: "Cryptography and encryption",
    isoControls: ["A.8.24"],
    summary:
      "Approved cryptographic algorithms, key-management rules and encryption requirements for data at rest and in transit.",
    requiredSections: ["Approved algorithms", "Key management", "Encryption at rest", "Encryption in transit", "Crypto inventory"],
    reviewCadenceDays: 365,
    ownerRole: "Cryptography Lead",
    applicability: ["IT operations", "Engineering", "All business units"],
  },
  {
    id: "tpl-011",
    title: "HR Security Policy",
    article21Category: "i",
    article21Title: "Human resources security, access control policies and asset management",
    enisaMeasureId: "10.1",
    enisaMeasureTitle: "Human resources security",
    isoControls: ["A.6.1", "A.6.2"],
    summary:
      "Screening, terms and conditions, offboarding and confidentiality obligations across the employee lifecycle.",
    requiredSections: ["Screening", "Terms & conditions", "Confidentiality", "Offboarding", "Remote working"],
    reviewCadenceDays: 365,
    ownerRole: "HR Director",
    applicability: ["HR", "All employees", "Contractors"],
  },
  {
    id: "tpl-012",
    title: "Access Control Policy",
    article21Category: "i",
    article21Title: "Human resources security, access control policies and asset management",
    enisaMeasureId: "11.1",
    enisaMeasureTitle: "Access control and identity management",
    isoControls: ["A.8.2", "A.8.4", "A.8.5"],
    summary:
      "Identity lifecycle, least-privilege access, authentication requirements (incl. MFA) and periodic access reviews.",
    requiredSections: ["Identity lifecycle", "Least privilege", "Authentication & MFA", "Access reviews", "Privileged access"],
    reviewCadenceDays: 180,
    ownerRole: "Identity & Access Lead",
    applicability: ["All employees", "IT operations", "Third-party vendors"],
  },
  {
    id: "tpl-013",
    title: "Asset Management Policy",
    article21Category: "i",
    article21Title: "Human resources security, access control policies and asset management",
    enisaMeasureId: "12.1",
    enisaMeasureTitle: "Asset management",
    isoControls: ["A.5.9", "A.5.10", "A.5.11"],
    summary:
      "Asset inventory, ownership, acceptable use and return-of-assets rules covering hardware, software and information assets.",
    requiredSections: ["Asset inventory", "Ownership", "Acceptable use", "Return of assets", "Classification"],
    reviewCadenceDays: 365,
    ownerRole: "Asset Management Lead",
    applicability: ["All employees", "IT operations", "Finance"],
  },
];

/** Sample implemented policies fed into the gap engine (input side). */
export const DEMO_NIS2_POLICIES: Nis2PolicyInput[] = [
  {
    id: "pol-1",
    title: "Information Security Policy",
    isoControls: ["A.5.1", "A.5.2"],
    status: "approved",
    lastReviewedAt: demoIso(-20),
  },
  {
    id: "pol-2",
    title: "Access Control Policy",
    isoControls: ["A.8.2", "A.8.4"],
    status: "approved",
    lastReviewedAt: demoIso(-45),
  },
  {
    id: "pol-3",
    title: "Security Awareness Policy",
    isoControls: ["A.6.3"],
    status: "approved",
    lastReviewedAt: demoIso(-60),
  },
  {
    id: "pol-4",
    title: "Incident Handling Policy",
    isoControls: ["A.5.24", "A.5.26"],
    status: "approved",
    lastReviewedAt: demoIso(-10),
  },
  {
    id: "pol-5",
    title: "Business Continuity Plan",
    isoControls: ["A.5.29"],
    status: "draft",
    lastReviewedAt: null,
  },
];

/** Sample reviewers fed into the approval engine (input side). */
export const DEMO_NIS2_REVIEWERS: Nis2ReviewerInput[] = [
  {
    id: "r-1",
    name: "Marta Silva (CISO)",
    decision: "approved",
    comment: "Approved with minor editorial notes.",
    decidedAt: demoIso(-2),
  },
  {
    id: "r-2",
    name: "Jan Kowalski (DPO)",
    decision: "changes_requested",
    comment: "Add an enforcement clause for access reviews.",
    decidedAt: demoIso(-1),
  },
  {
    id: "r-3",
    name: "Ana Petrov (Legal)",
    decision: null,
    comment: null,
    decidedAt: null,
  },
];

/** Sample version records fed into the version engine (input side). */
export const DEMO_NIS2_VERSION_ITEMS: Nis2VersionItemInput[] = [
  {
    version: "v3.1",
    label: "Version 3.1",
    createdAt: demoIso(-2),
    status: "current",
    changeSummary: "Add supplier screening clause (Art. 21(2)(d)).",
  },
  {
    version: "v3.0",
    label: "Version 3.0",
    createdAt: demoIso(-30),
    status: "superseded",
    changeSummary: "Annual review; updated ISO 27001 control mapping.",
  },
  {
    version: "v2.4",
    label: "Version 2.4",
    createdAt: demoIso(-120),
    status: "superseded",
    changeSummary: "Revised review cadence to 365 days.",
  },
  {
    version: "v3.2-draft",
    label: "Version 3.2 (draft)",
    createdAt: demoIso(0),
    status: "draft",
    changeSummary: "Pending approval - MFA policy appendix.",
  },
];

/** Numeric sort key for ENISA measure ids ("10.1" before "2.1" must be avoided). */
const enisaSortKey = (id: string): number => {
  const parsed = parseFloat(id);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
};

/** Input object for policyTemplatesNis2.templates in demo mode. */
export function buildDemoNis2TemplatesInput(): Nis2TemplatesInput {
  return {
    now: DEMO_NIS2_BASE_DATE.toISOString(),
    clock: DEMO_NIS2_BASE_DATE.toISOString(),
  };
}

/**
 * Compute the demo template-library view-model (mirrors templates output).
 * Applies the same category/measureId/search/limit filters the server would,
 * so demo mode reacts to the panel controls.
 */
export function buildDemoNis2Templates(input?: Nis2TemplatesInput | null): Nis2TemplatesResponse {
  let items = [...DEMO_NIS2_TEMPLATES];
  if (input?.category) {
    items = items.filter((t) => t.article21Category === input.category);
  }
  if (input?.measureId) {
    items = items.filter((t) => t.enisaMeasureId === input.measureId);
  }
  const query = (input?.search ?? "").trim().toLowerCase();
  if (query) {
    items = items.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        t.summary.toLowerCase().includes(query) ||
        t.article21Title.toLowerCase().includes(query) ||
        t.enisaMeasureTitle.toLowerCase().includes(query)
    );
  }
  items.sort(
    (a, b) => enisaSortKey(a.enisaMeasureId) - enisaSortKey(b.enisaMeasureId) || a.title.localeCompare(b.title)
  );
  if (input?.limit != null && input.limit > 0) {
    items = items.slice(0, input.limit);
  }
  return {
    total: items.length,
    category: input?.category ?? null,
    measureId: input?.measureId ?? null,
    items,
  };
}

/** Input object for policyTemplatesNis2.gapAnalysis in demo mode. */
export function buildDemoNis2GapAnalysisInput(): Nis2GapAnalysisInput {
  return {
    policies: DEMO_NIS2_POLICIES,
    templates: DEMO_NIS2_TEMPLATES,
    now: DEMO_NIS2_BASE_DATE.toISOString(),
    clock: DEMO_NIS2_BASE_DATE.toISOString(),
  };
}

/** Compute the demo gap-analysis view-model (mirrors gapAnalysis output). */
export function buildDemoNis2GapAnalysis(): Nis2GapAnalysisResponse {
  const implemented = new Set<string>();
  for (const policy of DEMO_NIS2_POLICIES) {
    for (const control of policy.isoControls ?? []) {
      implemented.add(control);
    }
  }

  const isoMap = new Map<string, { implemented: boolean; templateCount: number }>();
  const gaps: Nis2GapRow[] = [];
  for (const template of DEMO_NIS2_TEMPLATES) {
    const missing = template.isoControls.filter((control) => !implemented.has(control));
    if (missing.length > 0) {
      gaps.push({
        templateId: template.id,
        title: template.title,
        enisaMeasureId: template.enisaMeasureId,
        isoControls: missing,
        recommendation: `Adopt "${template.title}" and implement the missing ISO 27001 control${
          missing.length > 1 ? "s" : ""
        }: ${missing.join(", ")}.`,
      });
    }
    for (const control of template.isoControls) {
      const bucket = isoMap.get(control) ?? { implemented: implemented.has(control), templateCount: 0 };
      bucket.templateCount += 1;
      isoMap.set(control, bucket);
    }
  }

  gaps.sort(
    (a, b) => enisaSortKey(a.enisaMeasureId) - enisaSortKey(b.enisaMeasureId) || a.title.localeCompare(b.title)
  );
  const byIsoControl: Nis2ByIsoControl[] = [...isoMap.entries()]
    .map(
      ([isoControl, bucket]): Nis2ByIsoControl => ({
        isoControl,
        implemented: bucket.implemented,
        templateCount: bucket.templateCount,
        status: bucket.implemented ? "covered" : "gap",
      })
    )
    .sort((a, b) => a.isoControl.localeCompare(b.isoControl, undefined, { numeric: true }));

  const totalTemplates = DEMO_NIS2_TEMPLATES.length;
  const coveredCount = totalTemplates - gaps.length;
  const coverageRate =
    totalTemplates > 0 ? Math.round((coveredCount / totalTemplates) * 1000) / 10 : 0;
  const recommendations = gaps.slice(0, 5).map((gap) => gap.recommendation);

  return {
    coverageRate,
    totalTemplates,
    coveredCount,
    gapCount: gaps.length,
    gaps,
    byIsoControl,
    recommendations,
    totalImplementedPolicies: DEMO_NIS2_POLICIES.length,
  };
}

/** Input object for policyTemplatesNis2.approvalWorkflow in demo mode. */
export function buildDemoNis2ApprovalInput(): Nis2ApprovalInput {
  return {
    policyId: "pol-1",
    policyTitle: "Information Security Policy",
    status: "in_review",
    submittedAt: demoIso(-3),
    reviewers: DEMO_NIS2_REVIEWERS,
    requiredApprovals: 3,
    slaDays: 14,
    now: DEMO_NIS2_BASE_DATE.toISOString(),
    clock: DEMO_NIS2_BASE_DATE.toISOString(),
  };
}

/** Compute the demo approval view-model (mirrors approvalWorkflow output). */
export function buildDemoNis2Approval(): Nis2ApprovalResponse {
  const reviewers: Nis2ReviewerRow[] = DEMO_NIS2_REVIEWERS.map((reviewer, index) => ({
    id: String(reviewer.id ?? `reviewer-${index}`),
    name: reviewer.name ?? "Unnamed reviewer",
    decision: reviewer.decision ?? null,
    comment: reviewer.comment ?? null,
    decidedAt: reviewer.decidedAt ?? null,
    status: reviewer.decision ?? "pending",
  }));

  const approvalCount = reviewers.filter((r) => r.decision === "approved").length;
  const rejectionCount = reviewers.filter((r) => r.decision === "rejected").length;
  const changesRequestedCount = reviewers.filter((r) => r.decision === "changes_requested").length;
  const pendingCount = reviewers.filter((r) => r.decision == null).length;
  const reviewProgress =
    reviewers.length > 0
      ? Math.round(((approvalCount + rejectionCount + changesRequestedCount) / reviewers.length) * 1000) / 10
      : 0;
  const complete = pendingCount === 0 && changesRequestedCount === 0;

  let currentStatus: Nis2ApprovalStatus;
  if (complete) {
    currentStatus = changesRequestedCount > 0 ? "changes_requested" : rejectionCount > 0 ? "rejected" : "approved";
  } else if (pendingCount === reviewers.length) {
    currentStatus = "draft";
  } else {
    currentStatus = "in_review";
  }

  const verdict: Nis2ApprovalVerdict =
    currentStatus === "approved"
      ? "Approved"
      : currentStatus === "changes_requested"
        ? "Changes requested"
        : currentStatus === "rejected"
          ? "Rejected"
          : currentStatus === "in_review"
            ? "Awaiting review"
            : currentStatus === "draft"
              ? "Draft"
              : "Unknown";

  const pendingNames = reviewers.filter((r) => r.status === "pending").map((r) => r.name);
  const nextAction = complete
    ? verdict === "Approved"
      ? "Policy approved - publish to the documentation repository."
      : verdict === "Changes requested"
        ? "Address reviewer comments and resubmit for approval."
        : "Policy rejected - revise and resubmit."
    : pendingNames.length > 0
      ? `Awaiting decision from ${pendingNames.join(", ")}.`
      : "Resolve requested changes before resubmission.";

  return {
    policyId: "pol-1",
    policyTitle: "Information Security Policy",
    currentStatus,
    nextAction,
    verdict,
    approvalCount,
    rejectionCount,
    changesRequestedCount,
    pendingCount,
    reviewProgress,
    complete,
    overdue: false,
    daysInReview: 3,
    steps: [
      { label: "Draft", status: "done", detail: "Drafted by the CISO office" },
      { label: "Submit", status: "done", detail: "Submitted 3 days ago" },
      { label: "Review", status: "current", detail: "2 of 3 reviewers have decided" },
      { label: "Approve", status: "pending", detail: "Awaiting final verdict" },
    ],
    reviewers,
  };
}

/** Input object for policyTemplatesNis2.versionHistory in demo mode. */
export function buildDemoNis2VersionHistoryInput(): Nis2VersionInput {
  return {
    policyId: "pol-1",
    versions: DEMO_NIS2_VERSION_ITEMS,
    now: DEMO_NIS2_BASE_DATE.toISOString(),
    clock: DEMO_NIS2_BASE_DATE.toISOString(),
  };
}

/** Compute the demo version-history view-model (mirrors versionHistory output). */
export function buildDemoNis2VersionHistory(): Nis2VersionResponse {
  const VERSION_RANK: Record<Nis2VersionStatus, number> = { current: 0, superseded: 1, draft: 2 };
  const rows: Nis2VersionRow[] = DEMO_NIS2_VERSION_ITEMS.map((version, index) => ({
    version: String(version.version ?? `v${index + 1}`),
    createdAt: version.createdAt ?? null,
    status: version.status ?? "draft",
    changeSummary: version.changeSummary ?? "",
  })).sort((a, b) => {
    if (VERSION_RANK[a.status] !== VERSION_RANK[b.status]) {
      return VERSION_RANK[a.status] - VERSION_RANK[b.status];
    }
    return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
  });

  const draftCount = rows.filter((r) => r.status === "draft").length;
  const supersededCount = rows.filter((r) => r.status === "superseded").length;

  return {
    policyId: "pol-1",
    totalVersions: rows.length,
    latestVersion: rows[0]?.version ?? "",
    currentVersion: rows.find((r) => r.status === "current")?.version ?? "",
    draftCount,
    approvedCount: rows.length - draftCount,
    supersededCount,
    versions: rows,
    changes: rows.map((row) => `${row.version}: ${row.changeSummary}`),
  };
}

/** Input bundle for all four policyTemplatesNis2 queries in demo mode. */
export const DEMO_NIS2_INPUTS: {
  templates: Nis2TemplatesInput;
  gapAnalysis: Nis2GapAnalysisInput;
  approval: Nis2ApprovalInput;
  versionHistory: Nis2VersionInput;
} = {
  templates: buildDemoNis2TemplatesInput(),
  gapAnalysis: buildDemoNis2GapAnalysisInput(),
  approval: buildDemoNis2ApprovalInput(),
  versionHistory: buildDemoNis2VersionHistoryInput(),
};
