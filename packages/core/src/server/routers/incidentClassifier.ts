/**
 * Incident Classifier Router — tRPC facade over the pure NIS2 Article 23
 * incident engine (lib/cyber/incidentClassifier.ts).
 *
 * Cycle 15 (NIS2 Implementation Plan Phase 2 Task 2.1, Must Have #1): exposes
 * classify, deadlines, and csirtTemplate as protected query procedures.
 * The engine is pure — no database access, no side effects, no LLM calls.
 * The only intentional errors are zod BAD_REQUEST failures from input
 * validation. No secrets are ever echoed or logged.
 */

import { z } from "zod";
import {
  classifyIncident,
  getReportingDeadlines,
  buildCsirtTemplate,
} from "../../lib/cyber/incidentClassifier";

export const createIncidentClassifierRouter = (t: any, protectedProcedure: any) => {
  return t.router({
    /**
     * Classify a single incident: NIS2 Art. 23(3) significance, additive
     * 0-100 severity score, ENISA threat category, and the next reporting
     * deadline label. Deterministic engine output; safe shape on any input.
     */
    classify: protectedProcedure
      .input(
        z.object({
          cause: z.string().optional(),
          affectedUsers: z.number().optional(),
          durationMinutes: z.number().optional(),
          financialLossCents: z.number().optional(),
          publicSafetyImpact: z.boolean().optional(),
          criticalInfrastructureAffected: z.boolean().optional(),
          dataIntegrityCompromised: z.boolean().optional(),
          crossBorderImpact: z.boolean().optional(),
          detectedAt: z.date(),
        })
      )
      .query(async ({ input }) =>
        classifyIncident({
          cause: input.cause,
          affectedUsers: input.affectedUsers,
          durationMinutes: input.durationMinutes,
          financialLossCents: input.financialLossCents,
          publicSafetyImpact: input.publicSafetyImpact,
          criticalInfrastructureAffected: input.criticalInfrastructureAffected,
          dataIntegrityCompromised: input.dataIntegrityCompromised,
          crossBorderImpact: input.crossBorderImpact,
          detectedAt: input.detectedAt,
        })
      ),

    /**
     * NIS2 reporting deadlines (24h early warning / 72h notification / 30d
     * final report) with lifecycle statuses against the reference clock.
     * `now` is optional and injectable for tests and "what-if" checks.
     */
    deadlines: protectedProcedure
      .input(
        z.object({
          detectedAt: z.date(),
          now: z.date().optional(),
        })
      )
      .query(async ({ input }) => getReportingDeadlines(input.detectedAt, input.now)),

    /**
     * Build a plain-text CSIRT notification template addressed to the NIS2
     * competent authority for a country code. Unknown country codes yield
     * generic "competent authority" wording (never throws).
     */
    csirtTemplate: protectedProcedure
      .input(
        z.object({
          countryCode: z.string(),
          incidentTitle: z.string(),
          incidentSummary: z.string().optional(),
          severity: z.enum(["low", "medium", "high", "critical"]),
          detectedAt: z.date().optional(),
        })
      )
      .query(async ({ input }) =>
        buildCsirtTemplate({
          countryCode: input.countryCode,
          incidentTitle: input.incidentTitle,
          incidentSummary: input.incidentSummary,
          severity: input.severity,
          detectedAt: input.detectedAt,
        })
      ),
  });
};
