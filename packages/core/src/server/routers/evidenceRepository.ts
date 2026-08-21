/**
 * Evidence Repository Router - tRPC facade over the pure NIS2 evidence
 * repository engine (lib/nis2/evidenceRepository.ts).
 *
 * Cycle 24 (NIS2 Implementation Plan Phase 6 Task 6.2 - Evidence Repository
 * Enhancement): exposes ENISA-measure-keyed evidence suggestions, the
 * evidence audit trail and the evidence quality analysis as protected query
 * procedures.
 *
 * The engine is pure - no database access, no side effects, no LLM calls.
 * Handlers never throw for valid input; the only intentional errors are zod
 * BAD_REQUEST failures from input validation (zod rejects malformed input
 * automatically). No secrets are ever echoed or logged.
 */

import { z } from "zod";
import {
  suggestEvidence,
  buildEvidenceAuditTrail,
  analyzeEvidenceQuality,
} from "../../lib/nis2/evidenceRepository";

/** Injectable clock pin (Date, epoch-ms number, or ISO-8601 string). */
const clockOptionSchema = {
  now: z.union([z.string(), z.number()]).nullish(),
  clock: z.function().returns(z.date()).nullish(),
};

/** Input schema for `suggest` (exported for tests / UI / QA). */
export const evidenceRepositorySuggestInputSchema = z.object({
  measureId: z.string().nullish(),
  category: z.string().nullish(),
  requirementText: z.string().nullish(),
  limit: z.number().nullish(),
});

/** One evidence row fed into the audit-trail engine. */
export const evidenceRepositoryAuditTrailRowSchema = z.object({
  id: z.union([z.string(), z.number()]),
  evidenceId: z.string().nullish(),
  clientControlId: z.union([z.string(), z.number()]).nullish(),
  status: z.string().nullish(),
  type: z.string().nullish(),
  owner: z.string().nullish(),
  fileCount: z.number().nullish(),
  updatedAt: z.union([z.string(), z.number()]).nullish(),
});

/** Input schema for `auditTrail` (exported for tests / UI / QA). */
export const evidenceRepositoryAuditTrailInputSchema = z.object({
  rows: z.array(evidenceRepositoryAuditTrailRowSchema).nullish(),
  ...clockOptionSchema,
});

/** One evidence row fed into the quality/freshness engine. */
export const evidenceRepositoryAnalysisRowSchema = z.object({
  id: z.union([z.string(), z.number()]),
  evidenceId: z.string().nullish(),
  status: z.string().nullish(),
  type: z.string().nullish(),
  owner: z.string().nullish(),
  fileCount: z.number().nullish(),
  systemId: z.union([z.string(), z.number()]).nullish(),
  lastVerified: z.union([z.string(), z.number()]).nullish(),
  expirationDate: z.union([z.string(), z.number()]).nullish(),
  intervalDays: z.number().nullish(),
});

/** Input schema for `analyze` (exported for tests / UI / QA). */
export const evidenceRepositoryAnalyzeInputSchema = z.object({
  rows: z.array(evidenceRepositoryAnalysisRowSchema).nullish(),
  ...clockOptionSchema,
});

export const createEvidenceRepositoryRouter = (t: any, protectedProcedure: any) => {
  return t.router({
    /**
     * Suggest evidence collections keyed to the ENISA measures of the plan's
     * mapping table (1.1, 2.1, 3.1, 4.1, 5.1, 6.7, 6.2, 7.1, 8.1, 9.1, 10.1,
     * 11.1, 12.1) with a measureId exact-match filter, a category substring
     * filter and an optional limit. Suggestions score 0-100 from the catalog
     * base plus requirementText keyword overlap and sort score desc, then
     * measureId asc, then title asc. Deterministic engine output; safe shape
     * on any input.
     */
    suggest: protectedProcedure
      .input(evidenceRepositorySuggestInputSchema)
      .query(async ({ input }) => suggestEvidence(input)),

    /**
     * Build the evidence audit trail: one event per row (most-recent-first)
     * with normalized evidenceId, status, type, owner, fileCount, updatedAt
     * and daysSinceUpdate, plus a by-status summary with withOwner /
     * withFiles counts. Deterministic engine output; safe shape on any input.
     */
    auditTrail: protectedProcedure
      .input(evidenceRepositoryAuditTrailInputSchema)
      .query(async ({ input }) => buildEvidenceAuditTrail(input)),

    /**
     * Analyse evidence quality against the injected clock: per-row quality
     * score/band, freshness, renewal cadence, daysUntilExpiry and nextAction,
     * plus overall averages, counts and up to 5 deterministic
     * recommendations. Deterministic engine output; safe shape on any input.
     */
    analyze: protectedProcedure
      .input(evidenceRepositoryAnalyzeInputSchema)
      .query(async ({ input }) => analyzeEvidenceQuality(input)),
  });
};
