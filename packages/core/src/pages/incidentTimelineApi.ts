/**
 * Incident Timeline — data contract + hooks
 * ===========================================
 * UI-side typed view of the `incidentTimeline.*` tRPC procedures the backend
 * agent is building (registered as `incidentTimeline:` on the AppRouter in
 * `packages/core/src/routers.ts`).
 *
 * COORDINATION BY CONVENTION (UI-STANDARD §16) — if the procedures are not
 * live yet the tRPC HTTP call 404s and the query surfaces an error; every
 * consumer in the UI degrades to a graceful EmptyState
 * ("Connect the incidentTimeline.<procedure> API").
 *
 * ---------------------------------------------------------------------------
 * Expected procedures (all protected queries, pure — no DB access):
 *
 * 1) incidentTimeline.timeline
 *    input:  { detectedAt: Date; severity?: 'low'|'medium'|'high'|'critical';
 *              isSignificant?: boolean; earlyWarningSentAt?: Date;
 *              notificationSentAt?: Date; finalReportSentAt?: Date; now?: Date }
 *    output: { phases: { id: string; phase: 'detection'|'early-warning'|
 *                       'notification'|'final-report'; label: string; at: Date;
 *                       status: 'completed'|'current'|'upcoming' }[];
 *              currentPhase: 'detection'|'early-warning'|'notification'|
 *                            'final-report'; isComplete: boolean }
 *
 * 2) incidentTimeline.escalations
 *    input:  same as timeline
 *    output: { id: string; level: 'info'|'warning'|'critical'; title: string;
 *              detail: string; dueBy?: Date }[]
 * ---------------------------------------------------------------------------
 */

import { trpc } from "@/lib/trpc";
import type { IncidentSeverity } from "@/pages/incidentClassifierApi";

/* ------------------------------------------------------------------ */
/* Types (mirror the backend contract 1:1, defensive on optionals)    */
/* ------------------------------------------------------------------ */

export type IncidentTimelinePhaseId =
  | "detection"
  | "early-warning"
  | "notification"
  | "final-report";

export type IncidentPhaseStatus = "completed" | "current" | "upcoming";

export type EscalationLevel = "info" | "warning" | "critical";

/** Input shared by incidentTimeline.timeline and incidentTimeline.escalations. */
export interface IncidentTimelineInput {
  detectedAt: Date;
  severity?: IncidentSeverity;
  isSignificant?: boolean;
  earlyWarningSentAt?: Date;
  notificationSentAt?: Date;
  finalReportSentAt?: Date;
  now?: Date;
}

/** One step of the NIS2 Art. 23 reporting timeline. */
export interface IncidentTimelinePhase {
  id: string;
  phase: IncidentTimelinePhaseId;
  label: string;
  at: Date;
  status: IncidentPhaseStatus;
}

/** Output of incidentTimeline.timeline. `at` is nullable on degradation. */
export interface IncidentTimeline {
  phases: Array<{
    id: string;
    phase: IncidentTimelinePhaseId;
    label: string;
    at: Date | null;
    status: IncidentPhaseStatus;
  }>;
  currentPhase: IncidentTimelinePhaseId;
  isComplete: boolean;
}

/** Output row of incidentTimeline.escalations. Dates are nullable on degradation. */
export interface IncidentEscalation {
  id: string;
  level: EscalationLevel;
  title: string;
  detail: string;
  dueBy?: Date;
}

/* ------------------------------------------------------------------ */
/* Empty shapes — stable defaults for degraded rendering (§16)        */
/* ------------------------------------------------------------------ */

export const EMPTY_INCIDENT_TIMELINE: IncidentTimeline = {
  phases: [],
  currentPhase: "detection",
  isComplete: false,
};

export const EMPTY_ESCALATIONS: IncidentEscalation[] = [];

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

interface IncidentTimelineTrpc {
  incidentTimeline: {
    timeline: {
      useQuery: (input: IncidentTimelineInput, opts?: QueryOptions) => QueryLike<IncidentTimeline>;
    };
    escalations: {
      useQuery: (input: IncidentTimelineInput, opts?: QueryOptions) => QueryLike<IncidentEscalation[]>;
    };
  };
}

const incidentTimelineApi = trpc as unknown as IncidentTimelineTrpc;

/** Placeholder input used only while a query is disabled (never rendered). */
const HIDDEN_TIMELINE_INPUT: IncidentTimelineInput = { detectedAt: new Date(0) };

/* ------------------------------------------------------------------ */
/* Hooks — retry: false (UI-STANDARD §16)                             */
/* ------------------------------------------------------------------ */

/**
 * NIS2 Art. 23 reporting timeline (Detection → Early warning → Notification
 * → Final report). Pass null to keep the query disabled (e.g. before the
 * incident record is loaded).
 */
export function useIncidentTimeline(
  input: IncidentTimelineInput | null,
  enabled = true
): QueryLike<IncidentTimeline> {
  return incidentTimelineApi.incidentTimeline.timeline.useQuery(input ?? HIDDEN_TIMELINE_INPUT, {
    enabled: enabled && input !== null,
    retry: false,
    staleTime: 30_000,
  });
}

/** Escalation triggers raised by the incident timeline engine. */
export function useIncidentEscalations(
  input: IncidentTimelineInput | null,
  enabled = true
): QueryLike<IncidentEscalation[]> {
  return incidentTimelineApi.incidentTimeline.escalations.useQuery(input ?? HIDDEN_TIMELINE_INPUT, {
    enabled: enabled && input !== null,
    retry: false,
    staleTime: 30_000,
  });
}

/* ------------------------------------------------------------------ */
/* Meta helpers                                                        */
/* ------------------------------------------------------------------ */

export type PhaseBadgeVariant = "success" | "info" | "secondary";
export type EscalationBadgeVariant = "info" | "warning" | "error";

export interface IncidentPhaseMeta {
  label: string;
  order: number;
  /** Phase status → Badge variant. */
  badgeVariant: Record<IncidentPhaseStatus, PhaseBadgeVariant>;
  /** Phase status → rail dot classes (CSS-var tokens, dark-mode safe). */
  dotClass: Record<IncidentPhaseStatus, string>;
}

/** NIS2 Art. 23 milestone metadata, ordered 0→3. */
export const INCIDENT_PHASE_META: Record<IncidentTimelinePhaseId, IncidentPhaseMeta> = {
  detection: {
    label: "Detection",
    order: 0,
    badgeVariant: { completed: "success", current: "info", upcoming: "secondary" },
    dotClass: {
      completed: "bg-[var(--success)]",
      current: "bg-[var(--info)] ring-4 ring-[var(--info-bg)]",
      upcoming: "bg-muted-foreground/40",
    },
  },
  "early-warning": {
    label: "Early warning",
    order: 1,
    badgeVariant: { completed: "success", current: "info", upcoming: "secondary" },
    dotClass: {
      completed: "bg-[var(--success)]",
      current: "bg-[var(--info)] ring-4 ring-[var(--info-bg)]",
      upcoming: "bg-muted-foreground/40",
    },
  },
  notification: {
    label: "Incident notification",
    order: 2,
    badgeVariant: { completed: "success", current: "info", upcoming: "secondary" },
    dotClass: {
      completed: "bg-[var(--success)]",
      current: "bg-[var(--info)] ring-4 ring-[var(--info-bg)]",
      upcoming: "bg-muted-foreground/40",
    },
  },
  "final-report": {
    label: "Final report",
    order: 3,
    badgeVariant: { completed: "success", current: "info", upcoming: "secondary" },
    dotClass: {
      completed: "bg-[var(--success)]",
      current: "bg-[var(--info)] ring-4 ring-[var(--info-bg)]",
      upcoming: "bg-muted-foreground/40",
    },
  },
};

/** Human label for a phase status. */
export const INCIDENT_PHASE_STATUS_LABEL: Record<IncidentPhaseStatus, string> = {
  completed: "Completed",
  current: "Current",
  upcoming: "Upcoming",
};

export interface EscalationMeta {
  label: string;
  badgeVariant: EscalationBadgeVariant;
  /** Row/callout tint classes (CSS-var tokens, dark-mode safe). */
  tintClass: string;
  /** Icon color classes. */
  iconClass: string;
}

/** Escalation level → label, badge variant and row tint (UI-STANDARD §2). */
export const ESCALATION_LEVEL_META: Record<EscalationLevel, EscalationMeta> = {
  info: {
    label: "Info",
    badgeVariant: "info",
    tintClass: "border-[var(--info)]/20 bg-[var(--info-bg)]",
    iconClass: "text-[var(--info-foreground)]",
  },
  warning: {
    label: "Warning",
    badgeVariant: "warning",
    tintClass: "border-[var(--warning)]/20 bg-[var(--warning-bg)]",
    iconClass: "text-[var(--warning-foreground)]",
  },
  critical: {
    label: "Critical",
    badgeVariant: "error",
    tintClass: "border-[var(--error)]/20 bg-[var(--error-bg)]",
    iconClass: "text-[var(--error-foreground)]",
  },
};

/** Lookup helper for INCIDENT_PHASE_META. */
export function getPhaseMeta(phase: IncidentTimelinePhaseId): IncidentPhaseMeta {
  return INCIDENT_PHASE_META[phase];
}

/** Lookup helper for ESCALATION_LEVEL_META. */
export function getEscalationMeta(level: EscalationLevel): EscalationMeta {
  return ESCALATION_LEVEL_META[level];
}

/** Escalations ordered most-severe first, then earliest dueBy first. */
export function sortEscalations(escalations: IncidentEscalation[]): IncidentEscalation[] {
  const rank: Record<EscalationLevel, number> = { critical: 0, warning: 1, info: 2 };
  return [...escalations].sort((a, b) => {
    const byLevel = rank[a.level] - rank[b.level];
    if (byLevel !== 0) return byLevel;
    if (a.dueBy && b.dueBy) return new Date(a.dueBy).getTime() - new Date(b.dueBy).getTime();
    return a.dueBy ? -1 : b.dueBy ? 1 : 0;
  });
}

/** True when the escalation's dueBy has passed (overdue item). */
export function isEscalationOverdue(
  escalation: IncidentEscalation,
  now: Date = new Date()
): boolean {
  return escalation.dueBy !== undefined && new Date(escalation.dueBy).getTime() < now.getTime();
}
