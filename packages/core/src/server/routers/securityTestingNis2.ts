/**
 * Security Testing (NIS2) Router — tRPC facade over the pure NIS2 advanced
 * security testing engine (lib/nis2/securityTesting.ts).
 *
 * Cycle 21 (NIS2 Implementation Plan Phase 5 Task 5.1 — ENISA Measure 6.7
 * "Network Security", NIS2 Article 21(2)(e)): exposes penetration-test
 * planning & tracking, red team exercise frameworks, security benchmark
 * compliance (CIS + NIST CSF) and automated scan coverage tracking as
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

/** One penetration-test row for planning & tracking. */
export const securityTestingNis2PenTestItemSchema = z.object({
  id: z.union([z.string(), z.number()]).nullish(),
  testType: z.string().nullish(),
  status: z.string().nullish(),
  scheduledDate: z.union([z.string(), z.number()]).nullish(),
  windowHours: z.number().nullish(),
  riskTier: z.string().nullish(),
  lastCompletedAt: z.union([z.string(), z.number()]).nullish(),
});

/** Input schema for `planTest` (exported for tests / UI / QA). */
export const securityTestingNis2PlanInputSchema = z.object({
  tests: z.array(securityTestingNis2PenTestItemSchema).nullish(),
  ...clockOptionSchema,
});

/** One red team phase row. */
export const securityTestingNis2RedTeamPhaseSchema = z.object({
  id: z.union([z.string(), z.number()]).nullish(),
  name: z.string().nullish(),
  status: z.string().nullish(),
  estimatedEndAt: z.union([z.string(), z.number()]).nullish(),
  startedAt: z.union([z.string(), z.number()]).nullish(),
  completedAt: z.union([z.string(), z.number()]).nullish(),
});

/** One red team participant row. */
export const securityTestingNis2RedTeamParticipantSchema = z.object({
  id: z.union([z.string(), z.number()]).nullish(),
  name: z.string().nullish(),
  role: z.string().nullish(),
});

/** Input schema for `redTeam` (exported for tests / UI / QA). */
export const securityTestingNis2RedTeamInputSchema = z.object({
  name: z.string().nullish(),
  status: z.string().nullish(),
  startAt: z.union([z.string(), z.number()]).nullish(),
  endAt: z.union([z.string(), z.number()]).nullish(),
  verdict: z.string().nullish(),
  participants: z.array(securityTestingNis2RedTeamParticipantSchema).nullish(),
  phases: z.array(securityTestingNis2RedTeamPhaseSchema).nullish(),
  ...clockOptionSchema,
});

/** One benchmark assessment row. */
export const securityTestingNis2BenchmarkItemSchema = z.object({
  benchmark: z.string().nullish(),
  category: z.string().nullish(),
  controlId: z.union([z.string(), z.number()]).nullish(),
  controlName: z.string().nullish(),
  status: z.string().nullish(),
});

/** Input schema for `benchmarks` (exported for tests / UI / QA). */
export const securityTestingNis2BenchmarksInputSchema = z.object({
  assessments: z.array(securityTestingNis2BenchmarkItemSchema).nullish(),
  ...clockOptionSchema,
});

/** One scan-coverage asset row. */
export const securityTestingNis2ScanAssetSchema = z.object({
  id: z.union([z.string(), z.number()]).nullish(),
  assetName: z.string().nullish(),
  assetClass: z.string().nullish(),
  scanFrequencyHours: z.number().nullish(),
  lastScanAt: z.union([z.string(), z.number()]).nullish(),
  dueAt: z.union([z.string(), z.number()]).nullish(),
});

/** Input schema for `scanCoverage` (exported for tests / UI / QA). */
export const securityTestingNis2ScanCoverageInputSchema = z.object({
  assets: z.array(securityTestingNis2ScanAssetSchema).nullish(),
  ...clockOptionSchema,
});

export const createSecurityTestingNis2Router = (t: any, protectedProcedure: any) => {
  return t.router({
    /**
     * Plan & track penetration tests: test-type/status lifecycle counts,
     * overdue detection (scheduled/in_progress past the window), risk-tier
     * based frequency recommendations and next-due dates, plus the ordered
     * overdue list. Deterministic engine output; safe shape on any input.
     */
    planTest: protectedProcedure
      .input(securityTestingNis2PlanInputSchema)
      .query(async ({ input }) => planPenetrationTest(input.tests, input)),

    /**
     * Run a red team exercise framework: MITRE ATT&CK-aligned phase statuses,
     * badges, tactic chips, current/overdue flags, participant roles, overall
     * exercise status and verdict. Deterministic engine output; safe shape on
     * any input.
     */
    redTeam: protectedProcedure
      .input(securityTestingNis2RedTeamInputSchema)
      .query(async ({ input }) => runRedTeamExercise(input, input)),

    /**
     * Assess security benchmark compliance (CIS Critical Security Controls
     * v8 IG1-IG3 + NIST CSF 2.0): per-category scores/counts, aggregate pass
     * rate and top failing controls with remediation guidance. Deterministic
     * engine output; safe shape on any input.
     */
    benchmarks: protectedProcedure
      .input(securityTestingNis2BenchmarksInputSchema)
      .query(async ({ input }) => assessSecurityBenchmarks(input.assessments, input)),

    /**
     * Track automated vulnerability scanning coverage per asset class:
     * within-SLA / overdue assets, days overdue, coverage rates and the
     * ordered asset list. Deterministic engine output; safe shape on any
     * input.
     */
    scanCoverage: protectedProcedure
      .input(securityTestingNis2ScanCoverageInputSchema)
      .query(async ({ input }) => trackScanCoverage(input.assets, input)),
  });
};
