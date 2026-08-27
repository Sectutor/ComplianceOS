/**
 * Security Testing Router — tRPC facade over the pure NIS2 security testing
 * engine (lib/nis2/securityTesting.ts).
 *
 * Cycle 51 (NIS2 Implementation Plan — ENISA Measure 6.2 "Security Testing",
 * NIS2 Article 21(2)(e)): exposes penetration-test planning, red-team exercise
 * tracking, security-benchmark assessment and scan-coverage measurement as
 * protected query procedures.
 *
 * The engine is pure — no database access, no side effects, no LLM calls.
 * Handlers never throw for valid input; the only intentional errors are zod
 * BAD_REQUEST failures from input validation (zod rejects malformed input
 * automatically). No secrets are ever echoed or logged.
 */

import { z } from "zod";
import {
  planPenetrationTest,
  runRedTeamExercise,
  assessSecurityBenchmarks,
  trackScanCoverage,
} from "../../lib/nis2/securityTesting";

/** Injectable clock pin (Date, epoch-ms number, or ISO-8601 string). */
const clockOptionSchema = {
  now: z.union([z.string(), z.number()]).nullish(),
  clock: z.function().returns(z.date()).nullish(),
};

/** One penetration-test row for planning. */
export const securityTestingPenTestSchema = z.object({
  id: z.union([z.string(), z.number()]).nullish(),
  testType: z.string().nullish(),
  status: z.string().nullish(),
  scope: z.string().nullish(),
  frequency: z.string().nullish(),
  lastTestDate: z.union([z.string(), z.number()]).nullish(),
  nextTestDate: z.union([z.string(), z.number()]).nullish(),
  findings: z.number().nullish(),
  riskTier: z.string().nullish(),
});

/** Input schema for `planTest` (exported for tests / UI / QA). */
export const securityTestingPlanTestInputSchema = z.object({
  tests: z.array(securityTestingPenTestSchema).nullish(),
  ...clockOptionSchema,
});

/** One red-team phase input. */
export const securityTestingRedTeamPhaseSchema = z.object({
  id: z.union([z.string(), z.number()]).nullish(),
  name: z.string().nullish(),
  status: z.string().nullish(),
  startDate: z.union([z.string(), z.number()]).nullish(),
  endDate: z.union([z.string(), z.number()]).nullish(),
});

/** One red-team participant input. */
export const securityTestingRedTeamParticipantSchema = z.object({
  id: z.union([z.string(), z.number()]).nullish(),
  name: z.string().nullish(),
  role: z.string().nullish(),
});

/** Input schema for `redTeam` (exported for tests / UI / QA). */
export const securityTestingRedTeamInputSchema = z.object({
  name: z.string().nullish(),
  status: z.string().nullish(),
  startDate: z.union([z.string(), z.number()]).nullish(),
  endDate: z.union([z.string(), z.number()]).nullish(),
  phases: z.array(securityTestingRedTeamPhaseSchema).nullish(),
  participants: z.array(securityTestingRedTeamParticipantSchema).nullish(),
  ...clockOptionSchema,
});

/** One benchmark assessment row. */
export const securityTestingBenchmarkSchema = z.object({
  benchmark: z.string().nullish(),
  category: z.string().nullish(),
  controlId: z.union([z.string(), z.number()]).nullish(),
  status: z.string().nullish(),
});

/** Input schema for `benchmarks` (exported for tests / UI / QA). */
export const securityTestingBenchmarksInputSchema = z.object({
  assessments: z.array(securityTestingBenchmarkSchema).nullish(),
  ...clockOptionSchema,
});

/** One scan-coverage asset row. */
export const securityTestingScanAssetSchema = z.object({
  id: z.union([z.string(), z.number()]).nullish(),
  assetName: z.string().nullish(),
  assetClass: z.string().nullish(),
  lastScanDate: z.union([z.string(), z.number()]).nullish(),
  scanStatus: z.string().nullish(),
});

/** Input schema for `scanCoverage` (exported for tests / UI / QA). */
export const securityTestingScanCoverageInputSchema = z.object({
  assets: z.array(securityTestingScanAssetSchema).nullish(),
  ...clockOptionSchema,
});

/**
 * Factory: creates the security-testing router.
 *
 * @param t — the tRPC init object
 * @param protectedProcedure — protected query procedure (auth-gated)
 * @param _editorProcedure — (unused) editor procedure for compatibility
 */
export const createSecurityTestingRouter = (
  t: any,
  protectedProcedure: any,
  _editorProcedure?: any
) => ({
  /** Plan / schedule penetration tests. */
  planTest: protectedProcedure
    .input(securityTestingPlanTestInputSchema)
    .query(({ input }: { input: any }) => {
      return planPenetrationTest(input?.tests, {
        now: input?.now ?? undefined,
        clock: input?.clock ?? undefined,
      });
    }),

  /** Track a red-team exercise. */
  redTeam: protectedProcedure
    .input(securityTestingRedTeamInputSchema)
    .query(({ input }: { input: any }) => {
      return runRedTeamExercise(
        {
          name: input?.name ?? null,
          status: input?.status ?? null,
          startDate: input?.startDate ?? null,
          endDate: input?.endDate ?? null,
          phases: input?.phases ?? null,
          participants: input?.participants ?? null,
        },
        {
          now: input?.now ?? undefined,
          clock: input?.clock ?? undefined,
        }
      );
    }),

  /** Assess security-benchmark compliance. */
  benchmarks: protectedProcedure
    .input(securityTestingBenchmarksInputSchema)
    .query(({ input }: { input: any }) => {
      return assessSecurityBenchmarks(input?.assessments, {
        now: input?.now ?? undefined,
        clock: input?.clock ?? undefined,
      });
    }),

  /** Track scan coverage across assets. */
  scanCoverage: protectedProcedure
    .input(securityTestingScanCoverageInputSchema)
    .query(({ input }: { input: any }) => {
      return trackScanCoverage(input?.assets, {
        now: input?.now ?? undefined,
        clock: input?.clock ?? undefined,
      });
    }),
});
