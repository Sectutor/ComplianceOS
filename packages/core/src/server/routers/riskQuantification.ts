/**
 * Risk Quantification Router — tRPC facade over the pure NIS2 risk
 * quantification engine (lib/nis2/riskQuantification.ts).
 *
 * Cycle 26 (NIS2 Implementation Plan Phase 1 Task 1.2 "Risk Quantification
 * Engine"): exposes the quantitative risk appetite calculator, the 5x5
 * likelihood x impact matrix, inherent-vs-residual tracking and the
 * treatment plan generator as protected query procedures.
 *
 * The engine is pure — no database access, no side effects, no LLM calls.
 * Handlers never throw for valid input; the only intentional errors are zod
 * BAD_REQUEST failures from input validation (zod rejects malformed input
 * automatically). No secrets are ever echoed or logged.
 */

import { z } from "zod";
import {
  computeRiskAppetite,
  buildQuantitativeMatrix,
  trackResidualRisk,
  generateTreatmentPlans,
} from "../../lib/nis2/riskQuantification";

/** Injectable clock pin (epoch-ms number or ISO-8601 string). */
export const riskQuantificationClockOptionSchema = {
  now: z.union([z.string(), z.number()]).nullish(),
  clock: z.function().returns(z.date()).nullish(),
};

/**
 * One risk row fed into every riskQuantification procedure. Scale fields
 * are loose at the boundary (the engine coerces unknown values to safe
 * neutral results internally — numbers outside 1-5 and unknown keywords are
 * excluded from score math, never clamped).
 */
export const riskQuantificationRiskRowSchema = z.object({
  id: z.union([z.string(), z.number()]).nullish(),
  name: z.string().nullish(),
  likelihood: z.union([z.number(), z.string()]).nullish(),
  impact: z.union([z.number(), z.string()]).nullish(),
  inherentScore: z.number().nullish(),
  residualScore: z.number().nullish(),
  annualLossEstimateEur: z.number().nullish(),
  status: z.string().nullish(),
  owner: z.string().nullish(),
  controls: z.array(z.string()).nullish(),
  controlEffectiveness: z.number().nullish(),
  dueAt: z.string().nullish(),
  createdAt: z.string().nullish(),
});

/** Appetite configuration block for the `appetite` procedure. */
export const riskQuantificationAppetiteConfigSchema = z.object({
  appetiteScore: z.number().nullish(),
  appetiteAnnualLossEur: z.number().nullish(),
  tolerancePct: z.number().nullish(),
});

/** Input schema for `appetite` (exported for tests / UI / QA). */
export const riskQuantificationAppetiteInputSchema = z.object({
  risks: z.array(riskQuantificationRiskRowSchema).nullish(),
  config: riskQuantificationAppetiteConfigSchema.nullish(),
});

/** Input schema for `matrix` (exported for tests / UI / QA). */
export const riskQuantificationMatrixInputSchema = z.object({
  risks: z.array(riskQuantificationRiskRowSchema).nullish(),
});

/** Input schema for `residual` (exported for tests / UI / QA). */
export const riskQuantificationResidualInputSchema = z.object({
  risks: z.array(riskQuantificationRiskRowSchema).nullish(),
  appetiteScore: z.number().nullish(),
});

/** Input schema for `treatmentPlans` (exported for tests / UI / QA). */
export const riskQuantificationTreatmentPlansInputSchema = z.object({
  risks: z.array(riskQuantificationRiskRowSchema).nullish(),
  horizonDays: z.number().nullish(),
  threshold: z.number().nullish(),
  ...riskQuantificationClockOptionSchema,
});

export const createRiskQuantificationRouter = (t: any, protectedProcedure: any) => {
  return t.router({
    /**
     * Quantitative risk appetite check: score = likelihood x impact (1-25),
     * verdicts within/tolerance/exceeded against appetiteScore with a
     * tolerancePct margin, plus an optional EUR annual-loss appetite check.
     * Deterministic engine output; safe shape on any input.
     */
    appetite: protectedProcedure
      .input(riskQuantificationAppetiteInputSchema)
      .query(({ input }) => {
        return computeRiskAppetite(input?.risks ?? [], input?.config ?? null);
      }),

    /**
     * Fixed 5x5 likelihood x impact heat matrix with per-cell counts,
     * band rollups (low 1-4 / medium 5-9 / high 10-15 / critical 16-25)
     * and the top-5 risks by score.
     */
    matrix: protectedProcedure.input(riskQuantificationMatrixInputSchema).query(({ input }) => {
      return buildQuantitativeMatrix(input?.risks ?? []);
    }),

    /**
     * Inherent-vs-residual tracking: residual derivation from control
     * effectiveness, per-row reduction percentages, above-appetite counts
     * and the worst-5 residual risks.
     */
    residual: protectedProcedure.input(riskQuantificationResidualInputSchema).query(({ input }) => {
      return trackResidualRisk(input?.risks ?? [], { appetiteScore: input?.appetiteScore ?? undefined });
    }),

    /**
     * Deterministic treatment plan generator: strategy ladder
     * (mitigate/transfer) over the priority bands, P0/P1 deadlines from the
     * injectable clock and per-strategy action catalogs.
     */
    treatmentPlans: protectedProcedure
      .input(riskQuantificationTreatmentPlansInputSchema)
      .query(({ input }) => {
        return generateTreatmentPlans(input?.risks ?? [], {
          horizonDays: input?.horizonDays ?? undefined,
          threshold: input?.threshold ?? undefined,
          now: input?.now ?? undefined,
          clock: input?.clock ?? undefined,
        });
      }),
  });
};
