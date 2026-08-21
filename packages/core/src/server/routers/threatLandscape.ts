/**
 * Threat Landscape Router — tRPC facade over the pure NIS2 threat landscape
 * integration engine (lib/nis2/threatLandscape.ts).
 *
 * Cycle 25 (NIS2 Implementation Plan Phase 1 Task 1.1 — ENISA Measure 2.1
 * "Risk Management Framework", NIS2 Article 21(1) and 21(2)(a)): exposes
 * threat-event classification, sector scenario generation, the TARA (Threat
 * and Risk Assessment) workbook and the full landscape summary as protected
 * query procedures.
 *
 * The engine is pure — no database access, no side effects, no LLM calls.
 * Handlers never throw for valid input; the only intentional errors are zod
 * BAD_REQUEST failures from input validation (zod rejects malformed input
 * automatically). No secrets are ever echoed or logged.
 */

import { z } from "zod";
import {
  classifyThreatEvent,
  generateThreatScenarios,
  buildTaraTemplate,
  summarizeThreatLandscape,
} from "../../lib/nis2/threatLandscape";

/** Injectable clock pin (epoch-ms number or ISO-8601 string). */
export const threatLandscapeClockOptionSchema = {
  now: z.union([z.string(), z.number()]).nullish(),
  clock: z.function().returns(z.date()).nullish(),
};

/** Input schema for `classify` (exported for tests / UI / QA). */
export const threatLandscapeClassifyInputSchema = z.object({
  id: z.union([z.string(), z.number()]).nullish(),
  title: z.string().nullish(),
  description: z.string().nullish(),
  source: z.string().nullish(),
});

/** Input schema for `scenarios` (exported for tests / UI / QA). */
export const threatLandscapeScenariosInputSchema = z.object({
  sector: z.string().nullish(),
  limit: z.number().nullish(),
});

/**
 * One asset row fed into the TARA engine. `criticality` is a STRICT enum:
 * loose strings are rejected at the router boundary even though the engine
 * coerces unknown values internally (riskBand is output-only and never
 * accepted as input — zod strips it).
 */
export const threatLandscapeTaraAssetSchema = z.object({
  id: z.union([z.string(), z.number()]).nullish(),
  name: z.string().nullish(),
  criticality: z.enum(["Critical", "High", "Medium", "Low"]).nullish(),
});

/**
 * One scenario row fed into the TARA engine. `likelihood` is a STRICT enum
 * (loose strings rejected at the boundary); either `id` or `scenarioId` is
 * accepted by the engine.
 */
export const threatLandscapeTaraScenarioSchema = z.object({
  id: z.union([z.string(), z.number()]).nullish(),
  scenarioId: z.union([z.string(), z.number()]).nullish(),
  title: z.string().nullish(),
  description: z.string().nullish(),
  baseThreatId: z.string().nullish(),
  categoryId: z.string().nullish(),
  categoryName: z.string().nullish(),
  likelihood: z.enum(["Low", "Medium", "High"]).nullish(),
  potentialImpact: z.string().nullish(),
  recommendedControls: z.array(z.string()).nullish(),
  mitigations: z.array(z.string()).nullish(),
  industrySector: z.array(z.string()).nullish(),
  nis2Articles: z.array(z.string()).nullish(),
});

/** Input schema for `tara` (exported for tests / UI / QA). */
export const threatLandscapeTaraInputSchema = z.object({
  assets: z.array(threatLandscapeTaraAssetSchema).nullish(),
  scenarios: z.array(threatLandscapeTaraScenarioSchema).nullish(),
});

/** One threat event row fed into the landscape summary. */
export const threatLandscapeSummaryEventSchema = z.object({
  id: z.union([z.string(), z.number()]).nullish(),
  title: z.string().nullish(),
  description: z.string().nullish(),
  severity: z.string().nullish(),
  occurredAt: z.union([z.string(), z.number()]).nullish(),
});

/** Input schema for `summary` (exported for tests / UI / QA). */
export const threatLandscapeSummaryInputSchema = z.object({
  events: z.array(threatLandscapeSummaryEventSchema).nullish(),
  sector: z.string().nullish(),
  ...threatLandscapeClockOptionSchema,
});

export const createThreatLandscapeRouter = (t: any, protectedProcedure: any) => {
  return t.router({
    /**
     * Classify a threat event against the ENISA Threat Taxonomy 2024: first
     * taxonomy entry (in catalog order) whose keyword appears in the event
     * title/description wins, returning category, impact level, NIS2
     * articles, matched keywords and confidence (1 on an exact keyword hit;
     * the TH-000 "Other" fallback otherwise). Deterministic engine output;
     * safe shape on any input.
     */
    classify: protectedProcedure
      .input(threatLandscapeClassifyInputSchema)
      .query(async ({ input }) => classifyThreatEvent(input)),

    /**
     * Generate threat scenarios for a sector from the built-in catalog
     * (case-insensitive sector match, "Any" scenarios always eligible;
     * missing sector or no match returns the general scenarios). Limit is
     * applied last. Deterministic engine output; safe shape on any input.
     */
    scenarios: protectedProcedure
      .input(threatLandscapeScenariosInputSchema)
      .query(async ({ input }) => generateThreatScenarios(input)),

    /**
     * Build the Threat and Risk Assessment (TARA) workbook: one row per
     * asset × scenario with inherent likelihood/impact, a 1-12 risk score
     * (critical >= 9, high >= 6, medium >= 3, low < 3), merged ISO 27001
     * mitigations and NIS2 articles, plus a summary with per-band counts,
     * average risk score and top 5 risks. Deterministic engine output; safe
     * shape on any input.
     */
    tara: protectedProcedure
      .input(threatLandscapeTaraInputSchema)
      .query(async ({ input }) => buildTaraTemplate(input)),

    /**
     * Summarize the threat landscape: category and severity counts, top
     * recent events, a 30-day trend vs the injected clock, the 0-100
     * exposure score and up to 5 deterministic recommendations. Deterministic
     * engine output; safe shape on any input.
     */
    summary: protectedProcedure
      .input(threatLandscapeSummaryInputSchema)
      .query(async ({ input }) => summarizeThreatLandscape(input)),
  });
};
