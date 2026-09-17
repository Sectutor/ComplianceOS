/**
 * NIS2 Incident Timeline & Escalation Engine.
 *
 * Cycle 16 (NIS2 Implementation Plan Phase 2 Task 2.2, Must Have #2): tracks
 * the four NIS2 Article 23 incident-reporting phases — Detection, Early
 * warning (24h), Incident notification (72h), Final report (30d) — and
 * computes deterministic escalation triggers as the statutory reporting
 * deadlines approach or pass.
 *
 * Design rules (house pattern — mirrors lib/cyber/incidentClassifier.ts):
 * - Pure and deterministic: no I/O, no DB, no Math.random, no
 *   iteration-order dependent logic. Same input always yields the same
 *   output.
 * - NEVER throws: malformed input (missing/invalid dates, unknown severity
 *   labels, non-object input) yields a neutral safe shape.
 * - Injectable clock: `now` parameters default to `new Date()` but can be
 *   pinned in tests.
 * - Deadline math reuses getReportingDeadlines from incidentClassifier:
 *   early warning = detectedAt + 24h, incident notification = detectedAt +
 *   72h, final report = detectedAt + 30 days, with the same 12h DUE_WINDOW
 *   pending/due/overdue lifecycle semantics.
 */

import { getReportingDeadlines } from "./incidentClassifier";
import type { IncidentSeverity } from "./incidentClassifier";

/* ------------------------------------------------------------------ */
/* Public types                                                        */
/* ------------------------------------------------------------------ */

/** The four NIS2 Article 23 reporting phases, in submission order. */
export type IncidentPhase = "detection" | "early-warning" | "notification" | "final-report";

/** A single phase entry on the incident timeline. */
export interface IncidentTimelineEvent {
  id: string;
  phase: IncidentPhase;
  label: string;
  /** When this phase is/was due (detection = detection time; others = deadline). */
  at: Date;
  status: "completed" | "current" | "upcoming";
}

/** Full timeline shape returned by `buildIncidentTimeline`. */
export interface IncidentTimeline {
  phases: IncidentTimelineEvent[];
  currentPhase: IncidentPhase;
  isComplete: boolean;
}

/** Automated escalation trigger produced by `computeEscalations`. */
export interface EscalationTrigger {
  id: string;
  level: "info" | "warning" | "critical";
  title: string;
  detail: string;
  /** The statutory deadline this trigger refers to (overdue triggers only). */
  dueBy?: Date;
}

/**
 * Everything the timeline engine needs.
 *
 * @param detectedAt — when the incident was detected (required by contract;
 *   the engine defensively tolerates missing/invalid values at runtime).
 * @param severity — severity band; only used by the escalation engine.
 * @param isSignificant — NIS2 Article 23(3) significance; gates mandatory
 *   reporting deadlines in the escalation engine.
 * @param earlyWarningSentAt — when the 24h early warning was submitted.
 * @param notificationSentAt — when the 72h incident notification was
 *   submitted.
 * @param finalReportSentAt — when the 30-day final report was submitted.
 * @param now — injectable reference clock (defaults to `new Date()`).
 */
export interface IncidentTimelineInput {
  detectedAt: Date;
  severity?: IncidentSeverity;
  isSignificant?: boolean;
  earlyWarningSentAt?: Date;
  notificationSentAt?: Date;
  finalReportSentAt?: Date;
  now?: Date;
}

/* ------------------------------------------------------------------ */
/* Neutral "empty" shape                                               */
/* ------------------------------------------------------------------ */

const PHASE_ORDER: IncidentPhase[] = ["detection", "early-warning", "notification", "final-report"];

const PHASE_LABELS: Record<IncidentPhase, string> = {
  detection: "Detection",
  "early-warning": "Early warning",
  notification: "Incident notification",
  "final-report": "Final report",
};

/**
 * Neutral timeline returned on malformed/empty input: four upcoming phases,
 * current phase "detection", not complete. `detection.at` (and the other
 * phase anchors) fall back to the reference clock, matching the "detectedAt
 * or now" contract for an empty timeline.
 */
export const EMPTY_INCIDENT_TIMELINE: IncidentTimeline = {
  phases: PHASE_ORDER.map((phase) => ({
    id: phase,
    phase,
    label: PHASE_LABELS[phase],
    at: new Date(),
    status: "upcoming",
  })),
  currentPhase: "detection",
  isComplete: false,
};

/** Fresh deep copy of the empty shape (callers may safely mutate it). */
const emptyTimeline = (): IncidentTimeline => ({
  phases: EMPTY_INCIDENT_TIMELINE.phases.map((phase) => ({ ...phase })),
  currentPhase: "detection",
  isComplete: false,
});

/* ------------------------------------------------------------------ */
/* Sanitization helpers (house pattern)                                */
/* ------------------------------------------------------------------ */

const isDate = (value: unknown): value is Date =>
  value instanceof Date && !Number.isNaN(value.getTime());

/** Coerce a date to a valid Date; invalid input -> `fallback`. */
const toValidDate = (value: Date | undefined, fallback: Date): Date =>
  isDate(value) ? value : fallback;

/** True when a submission date is present and not in the future. */
const isSent = (value: Date | undefined, now: Date): boolean =>
  isDate(value) && value.getTime() <= now.getTime();

/* ------------------------------------------------------------------ */
/* Public engine functions                                             */
/* ------------------------------------------------------------------ */

/**
 * Build the NIS2 Article 23 incident timeline.
 *
 * Always returns exactly four ordered phases — detection, early-warning,
 * notification, final-report — with labels "Detection", "Early warning",
 * "Incident notification", "Final report". Phase anchors: detection.at =
 * detectedAt; early-warning.at / notification.at / final-report.at are the
 * 24h / 72h / 30-day deadlines computed via getReportingDeadlines.
 *
 * A phase is "completed" when its sentAt is present and <= now (detection is
 * always completed). "current" is the first phase not yet completed, in
 * order; the rest are "upcoming". When all four phases are completed every
 * status is "completed", currentPhase is "final-report" and isComplete is
 * true.
 *
 * Never throws: malformed input (non-object, missing/invalid detectedAt)
 * yields the EMPTY_INCIDENT_TIMELINE shape; invalid sentAt values are
 * treated as not-sent.
 */
export function buildIncidentTimeline(input: IncidentTimelineInput): IncidentTimeline {
  if (!input || typeof input !== "object" || !isDate(input.detectedAt)) {
    return emptyTimeline();
  }

  const now = toValidDate(input.now, new Date());
  const deadlines = getReportingDeadlines(input.detectedAt, input.now);

  const completed: Record<IncidentPhase, boolean> = {
    detection: true,
    "early-warning": isSent(input.earlyWarningSentAt, now),
    notification: isSent(input.notificationSentAt, now),
    "final-report": isSent(input.finalReportSentAt, now),
  };

  const atByPhase: Record<IncidentPhase, Date> = {
    detection: input.detectedAt,
    "early-warning": deadlines.earlyWarning,
    notification: deadlines.incidentNotification,
    "final-report": deadlines.finalReport,
  };

  const phases: IncidentTimelineEvent[] = [];
  let currentPhase: IncidentPhase = "final-report";
  let currentAssigned = false;
  let isComplete = true;

  for (const phase of PHASE_ORDER) {
    const at = atByPhase[phase];
    if (completed[phase]) {
      phases.push({ id: phase, phase, label: PHASE_LABELS[phase], at, status: "completed" });
      continue;
    }
    isComplete = false;
    if (!currentAssigned) {
      currentAssigned = true;
      currentPhase = phase;
      phases.push({ id: phase, phase, label: PHASE_LABELS[phase], at, status: "current" });
    } else {
      phases.push({ id: phase, phase, label: PHASE_LABELS[phase], at, status: "upcoming" });
    }
  }

  return { phases, currentPhase, isComplete };
}

/**
 * Compute automated escalation triggers for an incident.
 *
 * Deterministic, stable order; never throws.
 *
 * Non-significant incidents yield exactly one info trigger ("monitor").
 * Significant incidents may yield, in order: sev-escalation (warning, for
 * high/critical severity before the notification is sent), ew-due /
 * ew-overdue, notif-due / notif-overdue, final-due / final-overdue (using
 * the same 12h DUE_WINDOW pending/due/overdue semantics as
 * incidentClassifier's deadlineStatus), and complete (info, once the final
 * report is sent). No trigger id is ever emitted twice.
 */
export function computeEscalations(input: IncidentTimelineInput): EscalationTrigger[] {
  if (!input || typeof input !== "object" || input.isSignificant !== true) {
    return [
      {
        id: "monitor",
        level: "info",
        title: "Continue monitoring",
        detail:
          "Incident is below the NIS2 Article 23(3) significance threshold — no mandatory reporting deadlines apply.",
      },
    ];
  }

  const now = toValidDate(input.now, new Date());
  const detectedAt = toValidDate(input.detectedAt, now);
  const deadlines = getReportingDeadlines(detectedAt, now);

  const earlyWarningSent = isSent(input.earlyWarningSentAt, now);
  const notificationSent = isSent(input.notificationSentAt, now);
  const finalReportSent = isSent(input.finalReportSentAt, now);

  const triggers: EscalationTrigger[] = [];

  // 1. Severity escalation — high/critical significant incident that has
  //    not yet been formally notified.
  if ((input.severity === "high" || input.severity === "critical") && !notificationSent) {
    triggers.push({
      id: "sev-escalation",
      level: "warning",
      title: "Escalate to CSIRT lead",
      detail: "High/critical severity significant incident — escalate to the CSIRT/IR lead immediately.",
    });
  }

  // 2/3. Early-warning (24h) deadline window.
  if (!earlyWarningSent) {
    if (deadlines.earlyWarningStatus === "due") {
      triggers.push({
        id: "ew-due",
        level: "warning",
        title: "Early-warning due within 12h",
        detail: "NIS2 24h early-warning deadline approaches.",
      });
    } else if (deadlines.earlyWarningStatus === "overdue") {
      triggers.push({
        id: "ew-overdue",
        level: "critical",
        title: "Early-warning overdue",
        detail: "NIS2 24h early-warning deadline passed — submit without delay.",
        dueBy: deadlines.earlyWarning,
      });
    }
  }

  // 4/5. Incident notification (72h) deadline window.
  if (!notificationSent) {
    if (deadlines.incidentNotificationStatus === "due") {
      triggers.push({
        id: "notif-due",
        level: "warning",
        title: "Incident notification due within 12h",
        detail: "NIS2 72h incident notification deadline approaches.",
      });
    } else if (deadlines.incidentNotificationStatus === "overdue") {
      triggers.push({
        id: "notif-overdue",
        level: "critical",
        title: "Incident notification overdue",
        detail: "NIS2 72h incident notification deadline passed — submit without delay.",
        dueBy: deadlines.incidentNotification,
      });
    }
  }

  // 6/7. Final report (30d) deadline window.
  if (!finalReportSent) {
    if (deadlines.finalReportStatus === "due") {
      triggers.push({
        id: "final-due",
        level: "warning",
        title: "Final report due within 12h",
        detail: "NIS2 30-day final report deadline approaches.",
      });
    } else if (deadlines.finalReportStatus === "overdue") {
      triggers.push({
        id: "final-overdue",
        level: "critical",
        title: "Final report overdue",
        detail: "NIS2 30-day final report deadline passed — submit without delay.",
        dueBy: deadlines.finalReport,
      });
    }
  }

  // 8. All reporting complete.
  if (finalReportSent) {
    triggers.push({
      id: "complete",
      level: "info",
      title: "Reporting complete",
      detail: "All NIS2 Article 23 notifications submitted.",
    });
  }

  return triggers;
}
