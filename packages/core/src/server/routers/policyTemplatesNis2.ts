/**
 * Policy Templates (NIS2) Router - tRPC facade over the pure NIS2 Policy
 * Center engine (lib/nis2/policyTemplates.ts).
 *
 * Cycle 23 (NIS2 Implementation Plan Phase 6 Task 6.1 - Article 21-specific
 * policy templates mapped to ENISA Measures 1.1 - 12.1): exposes the built-in
 * template catalog (ENISA -> NIS2 Article 21(2) -> ISO/IEC 27001:2022),
 * gap analysis between implemented policies and required templates, the
 * policy approval workflow tracker and the policy version history tracker as
 * protected query procedures.
 *
 * The engine is pure - no database access, no side effects, no LLM calls.
 * Handlers never throw for valid input; the only intentional errors are zod
 * BAD_REQUEST failures from input validation (zod rejects malformed input
 * automatically). No secrets are ever echoed or logged.
 */

import { z } from "zod";
import {
  getNis2PolicyTemplates,
  analyzePolicyGap,
  runPolicyApproval,
  trackPolicyVersions,
} from "../../lib/nis2/policyTemplates";

/** Injectable clock pin (Date, epoch-ms number, or ISO-8601 string). */
const clockOptionSchema = {
  now: z.union([z.string(), z.number()]).nullish(),
  clock: z.function().returns(z.date()).nullish(),
};

/** Input schema for `templates` (exported for tests / UI / QA). */
export const policyTemplatesNis2TemplatesInputSchema = z.object({
  category: z.string().nullish(),
  measureId: z.string().nullish(),
  search: z.string().nullish(),
  limit: z.number().nullish(),
  ...clockOptionSchema,
});

/** One policy template row (matches the engine catalog shape). */
export const policyTemplatesNis2TemplateItemSchema = z.object({
  id: z.string().nullish(),
  title: z.string().nullish(),
  article21Category: z.string().nullish(),
  article21Title: z.string().nullish(),
  enisaMeasureId: z.string().nullish(),
  enisaMeasureTitle: z.string().nullish(),
  isoControls: z.array(z.string()).nullish(),
  summary: z.string().nullish(),
  requiredSections: z.array(z.string()).nullish(),
  reviewCadenceDays: z.number().nullish(),
  ownerRole: z.string().nullish(),
  applicability: z.array(z.string()).nullish(),
});

/** One implemented policy row for the gap analysis. */
export const policyTemplatesNis2PolicyItemSchema = z.object({
  id: z.union([z.string(), z.number()]).nullish(),
  title: z.string().nullish(),
  isoControls: z.array(z.string()).nullish(),
  status: z.string().nullish(),
  lastReviewedAt: z.union([z.string(), z.number()]).nullish(),
});

/** Input schema for `gapAnalysis` (exported for tests / UI / QA). */
export const policyTemplatesNis2GapAnalysisInputSchema = z.object({
  policies: z.array(policyTemplatesNis2PolicyItemSchema).nullish(),
  templates: z.array(policyTemplatesNis2TemplateItemSchema).nullish(),
  ...clockOptionSchema,
});

/** One reviewer row for the approval workflow. */
export const policyTemplatesNis2ReviewerSchema = z.object({
  id: z.union([z.string(), z.number()]).nullish(),
  name: z.string().nullish(),
  decision: z.enum(["approved", "rejected", "changes_requested"]).nullish(),
  comment: z.string().nullish(),
  decidedAt: z.union([z.string(), z.number()]).nullish(),
});

/** Input schema for `approvalWorkflow` (exported for tests / UI / QA). */
export const policyTemplatesNis2ApprovalInputSchema = z.object({
  policyId: z.union([z.string(), z.number()]).nullish(),
  policyTitle: z.string().nullish(),
  status: z.string().nullish(),
  submittedAt: z.union([z.string(), z.number()]).nullish(),
  reviewers: z.array(policyTemplatesNis2ReviewerSchema).nullish(),
  requiredApprovals: z.number().nullish(),
  slaDays: z.number().nullish(),
  ...clockOptionSchema,
});

/** One version row for the version history. */
export const policyTemplatesNis2VersionItemSchema = z.object({
  version: z.union([z.string(), z.number()]).nullish(),
  label: z.string().nullish(),
  createdAt: z.union([z.string(), z.number()]).nullish(),
  status: z.string().nullish(),
  changeSummary: z.string().nullish(),
});

/** Input schema for `versionHistory` (exported for tests / UI / QA). */
export const policyTemplatesNis2VersionsInputSchema = z.object({
  policyId: z.union([z.string(), z.number()]).nullish(),
  versions: z.array(policyTemplatesNis2VersionItemSchema).nullish(),
  ...clockOptionSchema,
});

export const createPolicyTemplatesNis2Router = (t: any, protectedProcedure: any) => {
  return t.router({
    /**
     * List NIS2 policy templates from the built-in catalog (one template per
     * ENISA measure row: 1.1, 2.1, 3.1, 4.1, 5.1, 6.7, 6.2, 7.1, 8.1, 9.1,
     * 10.1, 11.1, 12.1) with exact-match category / measureId filters, a
     * case-insensitive search and an optional limit. Deterministic engine
     * output; safe shape on any input.
     */
    templates: protectedProcedure
      .input(policyTemplatesNis2TemplatesInputSchema)
      .query(async ({ input }) => getNis2PolicyTemplates(input)),

    /**
     * Analyse the gap between implemented policies and the required NIS2
     * templates: coverage rate, uncovered templates with their uncovered ISO
     * controls and recommendations, per-ISO-control rollups. Deterministic
     * engine output; safe shape on any input.
     */
    gapAnalysis: protectedProcedure
      .input(policyTemplatesNis2GapAnalysisInputSchema)
      .query(async ({ input }) => analyzePolicyGap(input)),

    /**
     * Track a policy through its approval workflow: normalized status,
     * verdict, review progress, overdue / days-in-review against the injected
     * clock, the fixed 4-step workflow and enriched reviewers. Deterministic
     * engine output; safe shape on any input.
     */
    approvalWorkflow: protectedProcedure
      .input(policyTemplatesNis2ApprovalInputSchema)
      .query(async ({ input }) => {
        const result = runPolicyApproval(input);
        // Contract: the engine emits the normalized status under `status`;
        // the router renames it `currentStatus` (kept alongside for parity).
        return { ...result, currentStatus: result.status };
      }),

    /**
     * Track policy version history: versions sorted by createdAt asc, latest
     * / superseded / draft statuses, counts and the ordered change summaries.
     * Deterministic engine output; safe shape on any input.
     */
    versionHistory: protectedProcedure
      .input(policyTemplatesNis2VersionsInputSchema)
      .query(async ({ input }) => trackPolicyVersions(input)),
  });
};
