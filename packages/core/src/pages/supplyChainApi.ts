/**
 * Supplier Security Lifecycle — data contract + hooks
 * ====================================================
 * UI-side typed view of the `supplyChain.*` tRPC procedures the backend
 * agent is building (registered as `supplyChain:` on the AppRouter in
 * `packages/core/src/routers.ts`).
 *
 * NIS2 Implementation Plan Phase 3 Task 3.1 — ENISA Measure 5.1,
 * NIS2 Art. 21(2)(d) (supply-chain security measures).
 *
 * COORDINATION BY CONVENTION (UI-STANDARD §16) — if the procedures are not
 * live yet the tRPC HTTP call 404s and the query surfaces an error; every
 * consumer in the UI degrades to a graceful EmptyState
 * ("Connect the supplyChain.<procedure> API").
 *
 * ---------------------------------------------------------------------------
 * Expected procedures (all protected queries, pure — no DB access):
 *
 * 1) supplyChain.classifySupplier
 *    input:  { supplierName?: string; servicesEssentialToCriticalFunctions?: boolean;
 *              processesSensitiveData?: boolean; networkAccessLevel?: 'none'|'restricted'|'broad';
 *              isSubcontractor?: boolean; annualSpendEur?: number; now?: Date }
 *    output: { supplierName: string; criticality: 'critical'|'high'|'medium'|'low';
 *              criticalityScore: number; rationale: string[];
 *              reviewFrequency: 'Quarterly'|'Semi-Annual'|'Annual'|'Biennial';
 *              nextReviewDate: string }
 *
 * 2) supplyChain.scorePosture
 *    input:  { supplierName?: string;
 *              answers?: Partial<Record<'securityRequirementsInAgreement'
 *                |'incidentNotificationCommitment'|'vulnerabilityHandlingProcess'
 *                |'auditRights'|'subcontractingConstraints'|'terminationExitProvisions'
 *                |'dataProtectionMeasures'|'businessContinuityProvisions', boolean>> }
 *    output: { supplierName: string; score: number;
 *              readiness: 'Strong'|'Developing'|'At Risk'|'No Data';
 *              areas: { id: string; label: string; met: boolean; weight: number }[];
 *              gaps: string[]; recommendedActions: string[] }
 *
 * 3) supplyChain.trackIncident
 *    input:  { supplierName?: string; incidentTitle?: string; detectedAt?: Date;
 *              significant?: boolean; notificationSlaHours?: number;
 *              reportedToEntityAt?: Date; acknowledgedAt?: Date; now?: Date }
 *    output: { incidentId: string; supplierName: string; incidentTitle: string;
 *              significant: boolean; notificationDeadline: Date;
 *              status: 'not-required'|'pending'|'due'|'overdue'|'submitted'|'acknowledged';
 *              daysRemaining: number | null; note: string }
 *
 * 4) supplyChain.monitorSla
 *    input:  { supplierName?: string;
 *              items?: { id: string; title: string; cadenceDays: number;
 *                        lastVerifiedAt?: Date; passed: boolean }[];
 *              now?: Date }
 *    output: { supplierName: string;
 *              items: { id: string; title: string; cadenceDays: number;
 *                        lastVerifiedAt: Date | null; passed: boolean;
 *                        status: 'compliant'|'at-risk'|'breached'|'not-tested';
 *                        daysUntilDue: number }[];
 *              summary: { compliant: number; atRisk: number; breached: number;
 *                         notTested: number; total: number } }
 * ---------------------------------------------------------------------------
 */

import { trpc } from "@/lib/trpc";

/* ------------------------------------------------------------------ */
/* Types (mirror the backend contract 1:1, defensive on optionals)    */
/* ------------------------------------------------------------------ */

export type SupplierCriticality = "critical" | "high" | "medium" | "low";

export type NetworkAccessLevel = "none" | "restricted" | "broad";

export type ReviewFrequency = "Quarterly" | "Semi-Annual" | "Annual" | "Biennial";

/** ENISA Measure 5.1 posture question ids (Art. 21(2)(d) contract areas). */
export type PostureQuestionId =
  | "securityRequirementsInAgreement"
  | "incidentNotificationCommitment"
  | "vulnerabilityHandlingProcess"
  | "auditRights"
  | "subcontractingConstraints"
  | "terminationExitProvisions"
  | "dataProtectionMeasures"
  | "businessContinuityProvisions";

export type PostureReadiness = "Strong" | "Developing" | "At Risk" | "No Data";

export type SupplierIncidentStatus =
  | "not-required"
  | "pending"
  | "due"
  | "overdue"
  | "submitted"
  | "acknowledged";

export type SlaStatus = "compliant" | "at-risk" | "breached" | "not-tested";

/** Input of supplyChain.classifySupplier. */
export interface ClassifySupplierInput {
  supplierName?: string;
  servicesEssentialToCriticalFunctions?: boolean;
  processesSensitiveData?: boolean;
  networkAccessLevel?: NetworkAccessLevel;
  isSubcontractor?: boolean;
  annualSpendEur?: number;
  now?: Date;
}

/** Output of supplyChain.classifySupplier. */
export interface SupplierClassification {
  supplierName: string;
  criticality: SupplierCriticality;
  /** 0-100 criticality score. */
  criticalityScore: number;
  rationale: string[];
  reviewFrequency: ReviewFrequency;
  /** ISO date string of the next mandatory review. */
  nextReviewDate: string;
}

/** Input of supplyChain.scorePosture. */
export interface ScorePostureInput {
  supplierName?: string;
  answers?: Partial<Record<PostureQuestionId, boolean>>;
}

/** One scored contract area returned by supplyChain.scorePosture. */
export interface PostureArea {
  id: string;
  label: string;
  met: boolean;
  weight: number;
}

/** Output of supplyChain.scorePosture. */
export interface PostureScore {
  supplierName: string;
  /** 0-100 posture score. */
  score: number;
  readiness: PostureReadiness;
  areas: PostureArea[];
  gaps: string[];
  recommendedActions: string[];
}

/** Input of supplyChain.trackIncident. */
export interface TrackIncidentInput {
  supplierName?: string;
  incidentTitle?: string;
  detectedAt?: Date;
  significant?: boolean;
  notificationSlaHours?: number;
  reportedToEntityAt?: Date;
  acknowledgedAt?: Date;
  now?: Date;
}

/** Output of supplyChain.trackIncident. `notificationDeadline` nullable on degradation. */
export interface SupplierIncidentNotification {
  incidentId: string;
  supplierName: string;
  incidentTitle: string;
  significant: boolean;
  notificationDeadline: Date | null;
  status: SupplierIncidentStatus;
  daysRemaining: number | null;
  note: string;
}

/** One SLA item of the supplyChain.monitorSla input. */
export interface SlaItemInput {
  id: string;
  title: string;
  cadenceDays: number;
  lastVerifiedAt?: Date;
  passed: boolean;
}

/** Input of supplyChain.monitorSla. */
export interface MonitorSlaInput {
  supplierName?: string;
  items?: SlaItemInput[];
  now?: Date;
}

/** One evaluated SLA item returned by supplyChain.monitorSla. */
export interface SlaItem {
  id: string;
  title: string;
  cadenceDays: number;
  lastVerifiedAt: Date | null;
  passed: boolean;
  status: SlaStatus;
  /** Days until the verification is due; negative when breached. */
  daysUntilDue: number;
}

/** Output of supplyChain.monitorSla. */
export interface SlaMonitor {
  supplierName: string;
  items: SlaItem[];
  summary: {
    compliant: number;
    atRisk: number;
    breached: number;
    notTested: number;
    total: number;
  };
}

/* ------------------------------------------------------------------ */
/* Empty shapes — stable defaults for degraded rendering (§16)        */
/* ------------------------------------------------------------------ */

export const EMPTY_SUPPLIER_CLASSIFICATION: SupplierClassification = {
  supplierName: "",
  criticality: "low",
  criticalityScore: 0,
  rationale: [],
  reviewFrequency: "Annual",
  nextReviewDate: "",
};

export const EMPTY_POSTURE_SCORE: PostureScore = {
  supplierName: "",
  score: 0,
  readiness: "No Data",
  areas: [],
  gaps: [],
  recommendedActions: [],
};

export const EMPTY_INCIDENT_NOTIFICATION: SupplierIncidentNotification = {
  incidentId: "",
  supplierName: "",
  incidentTitle: "",
  significant: false,
  notificationDeadline: null,
  status: "pending",
  daysRemaining: null,
  note: "",
};

export const EMPTY_SLA_MONITOR: SlaMonitor = {
  supplierName: "",
  items: [],
  summary: { compliant: 0, atRisk: 0, breached: 0, notTested: 0, total: 0 },
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

interface SupplyChainTrpc {
  supplyChain: {
    classifySupplier: {
      useQuery: (
        input: ClassifySupplierInput,
        opts?: QueryOptions
      ) => QueryLike<SupplierClassification>;
    };
    scorePosture: {
      useQuery: (input: ScorePostureInput, opts?: QueryOptions) => QueryLike<PostureScore>;
    };
    trackIncident: {
      useQuery: (
        input: TrackIncidentInput,
        opts?: QueryOptions
      ) => QueryLike<SupplierIncidentNotification>;
    };
    monitorSla: {
      useQuery: (input: MonitorSlaInput, opts?: QueryOptions) => QueryLike<SlaMonitor>;
    };
  };
}

const supplyChainApi = trpc as unknown as SupplyChainTrpc;

/** Placeholder inputs used only while a query is disabled (never rendered).
 *  Every contract field is optional, so empty objects are valid inputs. */
const HIDDEN_CLASSIFY_INPUT: ClassifySupplierInput = {};
const HIDDEN_POSTURE_INPUT: ScorePostureInput = {};
const HIDDEN_INCIDENT_INPUT: TrackIncidentInput = {};
const HIDDEN_SLA_INPUT: MonitorSlaInput = {};

/* ------------------------------------------------------------------ */
/* Hooks — retry: false, enabled: clientId > 0 (UI-STANDARD §16)      */
/* ------------------------------------------------------------------ */

/**
 * NIS2 Art. 21(2)(d) supplier criticality classification.
 * Pass null for `input` to keep the query disabled (e.g. before the user
 * fills the classifier form). The query only fires when a client is
 * selected AND an input object is provided.
 */
export function useClassifySupplier(
  clientId: number,
  input: ClassifySupplierInput | null,
  enabled = true
): QueryLike<SupplierClassification> {
  return supplyChainApi.supplyChain.classifySupplier.useQuery(input ?? HIDDEN_CLASSIFY_INPUT, {
    enabled: enabled && clientId > 0 && input !== null,
    retry: false,
    staleTime: 30_000,
  });
}

/** ENISA Measure 5.1 security posture scorecard (8 contract areas). */
export function useScorePosture(
  clientId: number,
  input: ScorePostureInput | null,
  enabled = true
): QueryLike<PostureScore> {
  return supplyChainApi.supplyChain.scorePosture.useQuery(input ?? HIDDEN_POSTURE_INPUT, {
    enabled: enabled && clientId > 0 && input !== null,
    retry: false,
    staleTime: 30_000,
  });
}

/** Supplier incident notification tracker (Art. 21(2)(d) reporting SLA). */
export function useTrackIncident(
  clientId: number,
  input: TrackIncidentInput | null,
  enabled = true
): QueryLike<SupplierIncidentNotification> {
  return supplyChainApi.supplyChain.trackIncident.useQuery(input ?? HIDDEN_INCIDENT_INPUT, {
    enabled: enabled && clientId > 0 && input !== null,
    retry: false,
    staleTime: 30_000,
  });
}

/** Security SLA verification monitor (per-vendor contract cadence). */
export function useMonitorSla(
  clientId: number,
  input: MonitorSlaInput | null,
  enabled = true
): QueryLike<SlaMonitor> {
  return supplyChainApi.supplyChain.monitorSla.useQuery(input ?? HIDDEN_SLA_INPUT, {
    enabled: enabled && clientId > 0 && input !== null,
    retry: false,
    staleTime: 30_000,
  });
}

/* ------------------------------------------------------------------ */
/* Meta helpers (all token-based, dark-mode safe — UI-STANDARD §2)    */
/* ------------------------------------------------------------------ */

export type SupplyBadgeVariant =
  | "default"
  | "secondary"
  | "success"
  | "warning"
  | "error"
  | "info";

export type SupplyBarClass = "progress-success" | "progress-warning" | "progress-error";

export interface SupplyCriticalityMeta {
  label: string;
  badgeVariant: SupplyBadgeVariant;
  /** index.css .progress-* class that colors a [data-slot="progress-indicator"] fill. */
  barClass: SupplyBarClass;
}

/** Supplier criticality → badge variant + score-bar fill. */
export const SUPPLIER_CRITICALITY_META: Record<SupplierCriticality, SupplyCriticalityMeta> = {
  critical: { label: "Critical", badgeVariant: "error", barClass: "progress-error" },
  high: { label: "High", badgeVariant: "warning", barClass: "progress-warning" },
  medium: { label: "Medium", badgeVariant: "default", barClass: "progress-warning" },
  low: { label: "Low", badgeVariant: "secondary", barClass: "progress-success" },
};

export interface PostureReadinessMeta {
  label: string;
  badgeVariant: SupplyBadgeVariant;
  /** index.css .progress-* class for the posture score bar fill. */
  barClass: SupplyBarClass;
}

/** Posture readiness → badge label, variant + score-bar fill. */
export const POSTURE_READINESS_META: Record<PostureReadiness, PostureReadinessMeta> = {
  Strong: { label: "Strong", badgeVariant: "success", barClass: "progress-success" },
  Developing: { label: "Developing", badgeVariant: "warning", barClass: "progress-warning" },
  "At Risk": { label: "At Risk", badgeVariant: "error", barClass: "progress-error" },
  "No Data": { label: "No Data", badgeVariant: "secondary", barClass: "progress-success" },
};

export interface SupplierIncidentStatusMeta {
  label: string;
  badgeVariant: SupplyBadgeVariant;
}

/** Supplier incident notification status → badge label + variant. */
export const INCIDENT_STATUS_META: Record<SupplierIncidentStatus, SupplierIncidentStatusMeta> = {
  "not-required": { label: "Not required", badgeVariant: "secondary" },
  pending: { label: "Pending", badgeVariant: "default" },
  due: { label: "Due now", badgeVariant: "warning" },
  overdue: { label: "Overdue", badgeVariant: "error" },
  submitted: { label: "Submitted", badgeVariant: "success" },
  acknowledged: { label: "Acknowledged", badgeVariant: "info" },
};

export interface SlaStatusMeta {
  label: string;
  badgeVariant: SupplyBadgeVariant;
}

/** SLA verification status → badge label + variant. */
export const SLA_STATUS_META: Record<SlaStatus, SlaStatusMeta> = {
  compliant: { label: "Compliant", badgeVariant: "success" },
  "at-risk": { label: "At risk", badgeVariant: "warning" },
  breached: { label: "Breached", badgeVariant: "error" },
  "not-tested": { label: "Not tested", badgeVariant: "secondary" },
};

/** ENISA Measure 5.1 posture question id → display label (card 2). */
export const POSTURE_QUESTION_LABELS: Record<PostureQuestionId, string> = {
  securityRequirementsInAgreement: "Security requirements in agreement",
  incidentNotificationCommitment: "Incident notification commitment",
  vulnerabilityHandlingProcess: "Vulnerability handling & disclosure",
  auditRights: "Audit & inspection rights",
  subcontractingConstraints: "Subcontracting constraints",
  terminationExitProvisions: "Termination & exit provisions",
  dataProtectionMeasures: "Data protection measures",
  businessContinuityProvisions: "Business continuity provisions",
};

/** Render order for the 8 posture questions (stable across consumers). */
export const POSTURE_QUESTION_ORDER: PostureQuestionId[] = [
  "securityRequirementsInAgreement",
  "incidentNotificationCommitment",
  "vulnerabilityHandlingProcess",
  "auditRights",
  "subcontractingConstraints",
  "terminationExitProvisions",
  "dataProtectionMeasures",
  "businessContinuityProvisions",
];

/* ------------------------------------------------------------------ */
/* Demo mode (UI-STANDARD §17) — sample data, never fake primary state */
/* ------------------------------------------------------------------ */

/**
 * Sample SLA verification rows for demo mode. SLA items originate from
 * vendor contracts (not the pure engine), so sample rows are the honest
 * demo representation. `lastVerifiedAt` is relative to "now" so the table
 * stays sensible whenever it is rendered.
 */
export const DEMO_SUPPLIER_SLA_ITEMS: SlaItemInput[] = [
  { id: "sla-1", title: "Annual security assessment", cadenceDays: 365, passed: true },
  { id: "sla-2", title: "Penetration test report", cadenceDays: 180, passed: true },
  { id: "sla-3", title: "SOC 2 Type II report", cadenceDays: 365, passed: false },
  { id: "sla-4", title: "Subcontractor register review", cadenceDays: 90, passed: true },
  { id: "sla-5", title: "Business continuity test", cadenceDays: 270, passed: false },
  { id: "sla-6", title: "Vulnerability scan evidence", cadenceDays: 30, passed: true },
];

/** Demo SLA supplier name used by the monitor card. */
export const DEMO_SUPPLIER_NAME = "Acme Cloud GmbH";

/** Compute the demo SLA view-model (mirrors what monitorSla would return). */
export function buildDemoSlaMonitor(
  supplierName: string = DEMO_SUPPLIER_NAME,
  now: Date = new Date()
): SlaMonitor {
  const nowMs = now.getTime();
  const items: SlaItem[] = DEMO_SUPPLIER_SLA_ITEMS.map((item) => {
    // Stagger the last-verified dates so statuses vary (0–20 days ago).
    const daysAgo = (DEMO_SUPPLIER_SLA_ITEMS.indexOf(item) % 5) * 12;
    const lastVerifiedAt = new Date(nowMs - daysAgo * 86_400_000);
    const daysUntilDue = item.cadenceDays - daysAgo;
    let status: SlaStatus;
    if (!item.passed) {
      status = "breached";
    } else if (daysUntilDue <= 0) {
      status = "breached";
    } else if (daysUntilDue <= Math.max(14, Math.round(item.cadenceDays * 0.2))) {
      status = "at-risk";
    } else if (daysAgo === 0) {
      status = "not-tested";
    } else {
      status = "compliant";
    }
    return {
      id: item.id,
      title: item.title,
      cadenceDays: item.cadenceDays,
      lastVerifiedAt,
      passed: item.passed,
      status,
      daysUntilDue,
    };
  });

  return {
    supplierName,
    items,
    summary: {
      compliant: items.filter((i) => i.status === "compliant").length,
      atRisk: items.filter((i) => i.status === "at-risk").length,
      breached: items.filter((i) => i.status === "breached").length,
      notTested: items.filter((i) => i.status === "not-tested").length,
      total: items.length,
    },
  };
}
