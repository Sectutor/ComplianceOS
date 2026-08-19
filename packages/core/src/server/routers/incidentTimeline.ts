/**
 * Incident Timeline Router — tRPC facade over the pure NIS2 Article 23
 * incident timeline engine (lib/cyber/incidentTimeline.ts).
 *
 * Cycle 16 (NIS2 Implementation Plan Phase 2 Task 2.2, Must Have #2): exposes
 * timeline and escalations as protected query procedures. The engine is pure
 * — no database access, no side effects, no LLM calls. The only intentional
 * errors are zod BAD_REQUEST failures from input validation. No secrets are
 * ever echoed or logged.
 */

import { z } from "zod";
import { buildIncidentTimeline, computeEscalations } from "../../lib/cyber/incidentTimeline";

/** Shared input schema for both timeline procedures (exported for tests). */
export const incidentTimelineInputSchema = z.object({
  detectedAt: z.date(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  isSignificant: z.boolean().optional(),
  earlyWarningSentAt: z.date().optional(),
  notificationSentAt: z.date().optional(),
  finalReportSentAt: z.date().optional(),
  now: z.date().optional(),
});

export const createIncidentTimelineRouter = (t: any, protectedProcedure: any) => {
  return t.router({
    /**
     * Build the NIS2 Article 23 incident timeline: four ordered phases
     * (detection, early-warning, notification, final-report) with deadline
     * anchors and completed/current/upcoming statuses. Deterministic engine
     * output; safe shape on any input.
     */
    timeline: protectedProcedure
      .input(incidentTimelineInputSchema)
      .query(async ({ input }) => buildIncidentTimeline(input)),

    /**
     * Compute automated escalation triggers as the NIS2 reporting deadlines
     * approach or pass (12h due window, same semantics as the incident
     * classifier's deadlineStatus). Deterministic engine output; safe shape
     * on any input.
     */
    escalations: protectedProcedure
      .input(incidentTimelineInputSchema)
      .query(async ({ input }) => computeEscalations(input)),
  });
};
