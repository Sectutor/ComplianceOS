/**
 * AI Copilot Router — tRPC-accessible facade over the deterministic
 * built-in compliance engine (lib/ai/copilot.ts).
 *
 * Cycle 14 (scorecard #10 "AI-powered compliance"): exposes draftPolicy,
 * suggestEvidence, and autoMap as protected procedures plus a public
 * deterministic `status` probe. The engine is pure and dependency-free:
 * no database access, no LLM calls, no side effects. The only intentional
 * errors are zod BAD_REQUEST failures from input validation.
 *
 * NOTE: `clientId` is accepted on every input for future DB-backed
 * personalization but is intentionally unused in this cycle (pure engine).
 */

import { z } from "zod";
import {
  draftPolicyDraft,
  suggestEvidenceForControl,
  autoMapRequirement,
} from "../../lib/ai/copilot";

export const createAiCopilotRouter = (t: any, protectedProcedure: any, publicProcedure: any, premiumClientProcedure?: any) => {
  const pProc = premiumClientProcedure || protectedProcedure;
  return t.router({
    /**
     * Draft a policy document from a topic (plus optional framework/org).
     * Deterministic engine output; safe shape on any empty input.
     */
    draftPolicy: pProc
      .input(
        z.object({
          topic: z.string().min(1),
          framework: z.string().optional(),
          orgName: z.string().optional(),
          clientId: z.number().optional(),
        })
      )
      .mutation(async ({ input }) =>
        draftPolicyDraft({
          topic: input.topic,
          framework: input.framework,
          orgName: input.orgName,
        })
      ),

    /**
     * Suggest evidence artifacts for a given control.
     * Returns built-in catalog suggestions with freshness hints.
     */
    suggestEvidence: pProc
      .input(
        z.object({
          controlTitle: z.string().min(1),
          framework: z.string().optional(),
          clientId: z.number().optional(),
        })
      )
      .mutation(async ({ input }) =>
        suggestEvidenceForControl({
          controlTitle: input.controlTitle,
          framework: input.framework,
        })
      ),

    /**
     * Map a free-text requirement onto the built-in control KB.
     * Returns 0-100 scored matches plus the best match (or null).
     */
    autoMap: pProc
      .input(
        z.object({
          requirement: z.string().min(1),
          frameworks: z.array(z.string()).max(10).optional(),
          clientId: z.number().optional(),
        })
      )
      .mutation(async ({ input }) =>
        autoMapRequirement({
          requirement: input.requirement,
          frameworks: input.frameworks,
        })
      ),

    /**
     * Deterministic capability probe (no DB). Lets UIs gate the copilot
     * features without waiting on LLM/provider configuration.
     */
    status: publicProcedure.query(async () => ({
      available: true,
      mode: "builtin" as const,
      capabilities: ["draftPolicy", "suggestEvidence", "autoMap"] as const,
    })),
  });
};
