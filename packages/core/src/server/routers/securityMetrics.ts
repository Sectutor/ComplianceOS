/**
 * Security Metrics Router — tRPC facade over the pure NIS2 security metrics &
 * reporting engine (lib/nis2/securityMetrics.ts).
 *
 * Cycle 20 (NIS2 Implementation Plan Phase 4 Task 4.2 — ENISA Measure 7.1
 * "Effectiveness Assessment", NIS2 Article 21(2)(f)): exposes MTTR
 * computation, vulnerability-age tracking, compliance-drift detection and the
 * executive security summary as protected query procedures.
 *
 * The engine is pure — no database access, no side effects, no LLM calls.
 * Handlers never throw for valid input; the only intentional errors are zod
 * BAD_REQUEST failures from input validation (zod rejects malformed input
 * automatically). No secrets are ever echoed or logged.
 */

import { z } from "zod";
import {
  computeMttr,
  trackVulnerabilityAge,
  detectComplianceDrift,
  buildExecutiveSummary,
} from "../../lib/nis2/securityMetrics";

/** Injectable clock pin (Date, epoch-ms number, or ISO-8601 string). */
const clockOptionSchema = {
  now: z.union([z.string(), z.number()]).nullish(),
  clock: z.function().returns(z.date()).nullish(),
};

/** One incident row for MTTR computation. */
export const securityMetricsIncidentSchema = z.object({
  id: z.union([z.string(), z.number()]).nullish(),
  severity: z.string().nullish(),
  detectedAt: z.union([z.string(), z.number()]).nullish(),
  resolvedAt: z.union([z.string(), z.number()]).nullish(),
});

/** Input schema for `mttr` (exported for tests / UI / QA). */
export const securityMetricsMttrInputSchema = z.object({
  incidents: z.array(securityMetricsIncidentSchema).nullish(),
  ...clockOptionSchema,
});

/** One vulnerability-register row for age tracking. */
export const securityMetricsVulnerabilityAgeItemSchema = z.object({
  id: z.union([z.string(), z.number()]).nullish(),
  severity: z.string().nullish(),
  discoveredAt: z.union([z.string(), z.number()]).nullish(),
  status: z.string().nullish(),
});

/** Input schema for `vulnerabilityAge` (exported for tests / UI / QA). */
export const securityMetricsVulnerabilityAgeInputSchema = z.object({
  vulns: z.array(securityMetricsVulnerabilityAgeItemSchema).nullish(),
  ...clockOptionSchema,
});

/** One control area for compliance-drift detection. */
export const securityMetricsComplianceAreaSchema = z.object({
  areaId: z.union([z.string(), z.number()]).nullish(),
  name: z.string().nullish(),
  baselineScore: z.number().nullish(),
  currentScore: z.number().nullish(),
});

/** Input schema for `complianceDrift` (exported for tests / UI / QA). */
export const securityMetricsComplianceDriftInputSchema = z.object({
  areas: z.array(securityMetricsComplianceAreaSchema).nullish(),
  ...clockOptionSchema,
});

/** One area at risk for the executive summary. */
export const securityMetricsAreaAtRiskSchema = z.object({
  areaId: z.union([z.string(), z.number()]).nullish(),
  name: z.string().nullish(),
  driftPts: z.number().nullish(),
});

/** Input schema for `executiveSummary` (exported for tests / UI / QA). */
export const securityMetricsExecutiveSummaryInputSchema = z.object({
  postureScore: z.number().nullish(),
  openCriticalVulns: z.number().nullish(),
  overdueVulns: z.number().nullish(),
  overallMttrHours: z.number().nullish(),
  priorMttrHours: z.number().nullish(),
  driftAlertCount: z.number().nullish(),
  incidentsLast30d: z.number().nullish(),
  areasAtRisk: z.array(securityMetricsAreaAtRiskSchema).nullish(),
  ...clockOptionSchema,
});

export const createSecurityMetricsRouter = (t: any, protectedProcedure: any) => {
  return t.router({
    /**
     * Compute the mean time to recovery (MTTR) from resolved incidents,
     * bucketed by severity with an overall rollup and totalResolved count.
     * Only incidents with both detectedAt and resolvedAt (resolvedAt >=
     * detectedAt) count. Deterministic engine output; safe shape on any input.
     */
    mttr: protectedProcedure
      .input(securityMetricsMttrInputSchema)
      .query(async ({ input }) => computeMttr(input.incidents, input)),

    /**
     * Track vulnerability age (whole days vs the injected clock) per severity:
     * counts, average/max age, overdue counts and whole-day age bands.
     * Terminal statuses (patched / risk-accepted / false-positive) are
     * excluded from the register. Deterministic engine output; safe shape on
     * any input.
     */
    vulnerabilityAge: protectedProcedure
      .input(securityMetricsVulnerabilityAgeInputSchema)
      .query(async ({ input }) => trackVulnerabilityAge(input.vulns, input)),

    /**
     * Detect compliance drift (current vs baseline posture per control area):
     * drift points per area with alert severities (critical/high/medium/low)
     * and catalog recommendations, plus stable/improved counts. Deterministic
     * engine output; safe shape on any input.
     */
    complianceDrift: protectedProcedure
      .input(securityMetricsComplianceDriftInputSchema)
      .query(async ({ input }) => detectComplianceDrift(input.areas, input)),

    /**
     * Build the executive-level security dashboard rollup: posture score,
     * open critical / overdue vulnerability counts, MTTR trend, drift alert
     * count, incidents in the last 30 days, top areas at risk, and a
     * Good / Watch / Critical status band. Deterministic engine output; safe
     * shape on any input.
     */
    executiveSummary: protectedProcedure
      .input(securityMetricsExecutiveSummaryInputSchema)
      .query(async ({ input }) => buildExecutiveSummary(input, input)),
  });
};
