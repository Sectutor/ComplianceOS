/**
 * Incident Classifier — data contract + hooks
 * =============================================
 * UI-side typed view of the `incidentClassifier.*` tRPC procedures the backend
 * agent is building (registered as `incidentClassifier:` on the AppRouter in
 * `packages/core/src/routers.ts`).
 *
 * COORDINATION BY CONVENTION (UI-STANDARD §16) — if the procedures are not
 * live yet the tRPC HTTP call 404s and the query surfaces an error; every
 * consumer in the UI degrades to a graceful EmptyState
 * ("Connect the incidentClassifier.<procedure> API").
 *
 * ---------------------------------------------------------------------------
 * Expected procedures (all protected queries, pure — no DB access):
 *
 * 1) incidentClassifier.classify
 *    input:  { cause?: string; affectedUsers?: number; durationMinutes?: number;
 *              financialLossCents?: number; publicSafetyImpact?: boolean;
 *              criticalInfrastructureAffected?: boolean;
 *              dataIntegrityCompromised?: boolean; crossBorderImpact?: boolean;
 *              detectedAt: Date }
 *    output: { score: number; severity: 'low'|'medium'|'high'|'critical';
 *              isSignificant: boolean; reasons: string[];
 *              category: string; categoryId: string;
 *              nextDeadline: '24h'|'72h'|'1mo'|null }
 *
 * 2) incidentClassifier.deadlines
 *    input:  { detectedAt: Date; now?: Date }
 *    output: { earlyWarning: Date; incidentNotification: Date; finalReport: Date;
 *              earlyWarningStatus: 'pending'|'due'|'overdue';
 *              incidentNotificationStatus: 'pending'|'due'|'overdue';
 *              finalReportStatus: 'pending'|'due'|'overdue' }
 *
 * 3) incidentClassifier.csirtTemplate
 *    input:  { countryCode: string; incidentTitle: string;
 *              incidentSummary?: string; severity: 'low'|'medium'|'high'|'critical';
 *              detectedAt?: Date }
 *    output: { subject: string; body: string }
 * ---------------------------------------------------------------------------
 */

import { trpc } from "@/lib/trpc";

/* ------------------------------------------------------------------ */
/* Types (mirror the backend contract 1:1, defensive on optionals)    */
/* ------------------------------------------------------------------ */

export type IncidentSeverity = "low" | "medium" | "high" | "critical";

export type NextDeadline = "24h" | "72h" | "1mo";

export type DeadlineStatus = "pending" | "due" | "overdue";

/** Input of incidentClassifier.classify (NIS2 Art. 23 significance model). */
export interface IncidentClassificationInput {
  cause?: string;
  affectedUsers?: number;
  durationMinutes?: number;
  financialLossCents?: number;
  publicSafetyImpact?: boolean;
  criticalInfrastructureAffected?: boolean;
  dataIntegrityCompromised?: boolean;
  crossBorderImpact?: boolean;
  detectedAt: Date;
}

/** Output of incidentClassifier.classify. */
export interface IncidentClassification {
  /** 0-100 severity score. */
  score: number;
  severity: IncidentSeverity;
  /** Art. 23(3) significance verdict. */
  isSignificant: boolean;
  reasons: string[];
  /** ENISA threat-taxonomy category label. */
  category: string;
  categoryId: string;
  nextDeadline: NextDeadline | null;
}

/** Output of incidentClassifier.deadlines. Dates are nullable on degradation. */
export interface IncidentDeadlines {
  earlyWarning: Date | null;
  incidentNotification: Date | null;
  finalReport: Date | null;
  earlyWarningStatus: DeadlineStatus;
  incidentNotificationStatus: DeadlineStatus;
  finalReportStatus: DeadlineStatus;
}

/** Input of incidentClassifier.csirtTemplate. */
export interface CsirtTemplateInput {
  countryCode: string;
  incidentTitle: string;
  incidentSummary?: string;
  severity: IncidentSeverity;
  detectedAt?: Date;
}

/** Output of incidentClassifier.csirtTemplate. */
export interface CsirtTemplate {
  subject: string;
  body: string;
}

/* ------------------------------------------------------------------ */
/* Empty shapes — stable defaults for degraded rendering (§16)        */
/* ------------------------------------------------------------------ */

export const EMPTY_INCIDENT_CLASSIFICATION: IncidentClassification = {
  score: 0,
  severity: "low",
  isSignificant: false,
  reasons: [],
  category: "",
  categoryId: "",
  nextDeadline: null,
};

export const EMPTY_DEADLINES: IncidentDeadlines = {
  earlyWarning: null,
  incidentNotification: null,
  finalReport: null,
  earlyWarningStatus: "pending",
  incidentNotificationStatus: "pending",
  finalReportStatus: "pending",
};

export const EMPTY_CSIRT_TEMPLATE: CsirtTemplate = {
  subject: "",
  body: "",
};

/* ------------------------------------------------------------------ */
/* Narrowed tRPC query/mutation result shapes (runtime is a superset) */
/* ------------------------------------------------------------------ */

export interface QueryLike<T> {
  data?: T;
  isLoading: boolean;
  isError: boolean;
  isFetching?: boolean;
  error?: unknown;
  refetch: () => unknown;
}

interface IncidentClassifierTrpc {
  incidentClassifier: {
    classify: {
      useQuery: (
        input: IncidentClassificationInput,
        opts?: { enabled?: boolean; retry?: boolean | number; staleTime?: number }
      ) => QueryLike<IncidentClassification>;
    };
    deadlines: {
      useQuery: (
        input: { detectedAt: Date; now?: Date },
        opts?: { enabled?: boolean; retry?: boolean | number; staleTime?: number }
      ) => QueryLike<IncidentDeadlines>;
    };
    csirtTemplate: {
      useQuery: (
        input: CsirtTemplateInput,
        opts?: { enabled?: boolean; retry?: boolean | number; staleTime?: number }
      ) => QueryLike<CsirtTemplate>;
    };
  };
}

const incidentClassifierApi = trpc as unknown as IncidentClassifierTrpc;

/** Placeholder inputs used only while a query is disabled (never rendered). */
const HIDDEN_DETECTED_AT = new Date(0);
const HIDDEN_CLASSIFY_INPUT: IncidentClassificationInput = { detectedAt: HIDDEN_DETECTED_AT };
const HIDDEN_TEMPLATE_INPUT: CsirtTemplateInput = {
  countryCode: "DE",
  incidentTitle: "",
  severity: "low",
};

/* ------------------------------------------------------------------ */
/* Hooks — retry: false (UI-STANDARD §16)                             */
/* ------------------------------------------------------------------ */

/**
 * NIS2 Art. 23 significance classification for an incident. Pass null to keep
 * the query disabled (e.g. before the incident record is loaded).
 */
export function useIncidentClassification(
  criteria: IncidentClassificationInput | null,
  enabled = true
): QueryLike<IncidentClassification> {
  return incidentClassifierApi.incidentClassifier.classify.useQuery(
    criteria ?? HIDDEN_CLASSIFY_INPUT,
    {
      enabled: enabled && criteria !== null,
      retry: false,
      staleTime: 30_000,
    }
  );
}

/** Reporting deadline tracker (early warning 24h / notification 72h / final 1mo). */
export function useIncidentDeadlines(
  detectedAt: Date | null | undefined,
  enabled = true
): QueryLike<IncidentDeadlines> {
  return incidentClassifierApi.incidentClassifier.deadlines.useQuery(
    { detectedAt: detectedAt ?? HIDDEN_DETECTED_AT },
    {
      enabled: enabled && detectedAt !== null && detectedAt !== undefined,
      retry: false,
      staleTime: 30_000,
    }
  );
}

/** CSIRT notification template for a given EU member state. */
export function useCsirtTemplate(
  input: CsirtTemplateInput | null,
  enabled = true
): QueryLike<CsirtTemplate> {
  return incidentClassifierApi.incidentClassifier.csirtTemplate.useQuery(
    input ?? HIDDEN_TEMPLATE_INPUT,
    {
      enabled: enabled && input !== null,
      retry: false,
      staleTime: 60_000,
    }
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                            */
/* ------------------------------------------------------------------ */

export type SeverityBadgeVariant = "success" | "warning" | "error" | "info" | "destructive";

export interface SeverityMeta {
  label: string;
  badgeVariant: SeverityBadgeVariant;
  /** index.css .progress-* class that colors a [data-slot="progress-indicator"] fill. */
  barClass: "progress-success" | "progress-warning" | "progress-error";
}

/** Severity → badge variant + score-bar fill (UI-STANDARD §18 data-viz scale). */
export function getSeverityMeta(severity: IncidentSeverity): SeverityMeta {
  switch (severity) {
    case "critical":
      return { label: "Critical", badgeVariant: "destructive", barClass: "progress-error" };
    case "high":
      return { label: "High", badgeVariant: "error", barClass: "progress-error" };
    case "medium":
      return { label: "Medium", badgeVariant: "warning", barClass: "progress-warning" };
    default:
      return { label: "Low", badgeVariant: "success", barClass: "progress-success" };
  }
}

export type DeadlineBadgeVariant = "secondary" | "warning" | "error";

export interface DeadlineMeta {
  label: string;
  badgeVariant: DeadlineBadgeVariant;
}

/** Deadline status → badge label + variant. */
export function getDeadlineMeta(status: DeadlineStatus): DeadlineMeta {
  switch (status) {
    case "due":
      return { label: "Due now", badgeVariant: "warning" };
    case "overdue":
      return { label: "Overdue", badgeVariant: "error" };
    default:
      return { label: "Pending", badgeVariant: "secondary" };
  }
}

/** Art. 23 milestone label for the classifier's nextDeadline value. */
export function getNextDeadlineLabel(nextDeadline: NextDeadline | null): string {
  switch (nextDeadline) {
    case "24h":
      return "24h early warning";
    case "72h":
      return "72h incident notification";
    case "1mo":
      return "1mo final report";
    default:
      return "No report required";
  }
}
