/**
 * Compliance Monitor Router — tRPC facade over the pure NIS2 continuous
 * compliance monitoring engine (lib/nis2/complianceMonitor.ts).
 *
 * Cycle 22 (NIS2 Implementation Plan Phase 5 Task 5.2 — ENISA Measure 7.1
 * "Effectiveness Assessment", NIS2 Article 21(2)(f)): exposes compliance
 * posture computation, evidence-coverage tracking and NIS2 audit report
 * generation as protected query procedures.
 *
 * The engine is pure — no database access, no side effects, no LLM calls.
 * Handlers never throw for valid input; the only intentional errors are zod
 * BAD_REQUEST failures from input validation (zod rejects malformed input
 * automatically). No secrets are ever echoed or logged.
 */

import { z } from "zod";
import {
  computeCompliancePosture,
  trackEvidenceCoverage,
  generateAuditReport,
} from "../../lib/nis2/complianceMonitor";

/** Injectable clock pin fields (spreadable into input schemas). */
export const clockOptionFields = {
  now: z.union([z.string(), z.number()]).nullish(),
  clock: z.function().returns(z.date()).nullish(),
};

/** Injectable clock pin schema (parseable standalone). */
export const clockOptionSchema = z.object(clockOptionFields);

/** One compliance measure for posture computation. */
export const complianceMonitorMeasureSchema = z.object({
  measureId: z.union([z.string(), z.number()]).nullish(),
  name: z.string().nullish(),
  score: z.number().nullish(),
  baselineScore: z.number().nullish(),
  status: z.string().nullish(),
});

/** Input schema for `posture` (exported for tests / UI / QA). */
export const complianceMonitorPostureInputSchema = z.object({
  measures: z.array(complianceMonitorMeasureSchema).nullish(),
  ...clockOptionFields,
});

/** One evidence item for coverage tracking. */
export const complianceMonitorEvidenceItemSchema = z.object({
  controlId: z.union([z.string(), z.number()]).nullish(),
  measureId: z.union([z.string(), z.number()]).nullish(),
  name: z.string().nullish(),
  evidenceCount: z.number().nullish(),
  lastCollectedAt: z.union([z.string(), z.number()]).nullish(),
  expiresAt: z.union([z.string(), z.number()]).nullish(),
});

/** Input schema for `evidenceCoverage` (exported for tests / UI / QA). */
export const complianceMonitorEvidenceCoverageInputSchema = z.object({
  items: z.array(complianceMonitorEvidenceItemSchema).nullish(),
  ...clockOptionFields,
});

/** Evidence summary for the audit report. */
export const complianceMonitorAuditEvidenceSummarySchema = z.object({
  total: z.number().nullish(),
  covered: z.number().nullish(),
  coverageRate: z.number().nullish(),
});

/** Input schema for `auditReport` (exported for tests / UI / QA). */
export const complianceMonitorAuditReportInputSchema = z.object({
  entityName: z.string().nullish(),
  entitySector: z.string().nullish(),
  postureScore: z.number().nullish(),
  measures: z.array(complianceMonitorMeasureSchema).nullish(),
  evidenceSummary: complianceMonitorAuditEvidenceSummarySchema.nullish(),
  ...clockOptionFields,
});

export const createComplianceMonitorRouter = (t: any, protectedProcedure: any) => {
  return t.router({
    /**
     * Compute the overall compliance posture from per-measure scores:
     * equal-weight average with status bands (Strong / Developing / At Risk /
     * Critical / No Data), coverage rate, drift vs baselines with trend,
     * status counts, top gaps and a short deterministic verdict. Pure engine
     * output; safe shape on any input.
     */
    posture: protectedProcedure
      .input(complianceMonitorPostureInputSchema)
      .query(async ({ input }) => computeCompliancePosture(input)),

    /**
     * Track evidence coverage per control item: covered / missing status,
     * expiry (expired / expiring / current / n-a) against the injected
     * clock, coverage rate, per-measure rollups and enriched items. Pure
     * engine output; safe shape on any input.
     */
    evidenceCoverage: protectedProcedure
      .input(complianceMonitorEvidenceCoverageInputSchema)
      .query(async ({ input }) => trackEvidenceCoverage(input)),

    /**
     * Generate a deterministic plain-text NIS2 audit report (posture,
     * evidence coverage, measure scores, top gaps, recommendations and
     * pass / warn / fail sections). Pure engine output; safe shape on any
     * input.
     */
    auditReport: protectedProcedure
      .input(complianceMonitorAuditReportInputSchema)
      .query(async ({ input }) => generateAuditReport(input)),
  });
};
