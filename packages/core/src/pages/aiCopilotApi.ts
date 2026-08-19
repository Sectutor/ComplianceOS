/**
 * AiCopilot — data contract + hooks
 * ==================================
 * UI-side typed view of the `aiCopilot.*` tRPC procedures implemented in
 * `packages/core/src/server/routers/aiCopilot.ts` (registered as
 * `aiCopilot:` on the AppRouter in `packages/core/src/routers.ts`).
 *
 * COORDINATION BY CONVENTION (UI-STANDARD §16) — the backend agent wires these
 * procedures in parallel; this module casts the client once so the UI compiles
 * before the router exists. Consumers degrade to a graceful EmptyState
 * ("Connect the aiCopilot.<procedure> API") when a call is not live.
 * Scorecard #10 — in-app AI Copilot: auto-map / suggest evidence / draft policies.
 *
 * Expected procedures:
 *
 * 1) aiCopilot.draftPolicy
 *    input:  { topic: string; framework?: string; orgName?: string; clientId?: number }
 *    output: { title: string; purpose: string; scope: string;
 *              sections: { heading: string; body: string }[];
 *              controls: { code: string; title: string }[];
 *              reviewCadence: string; disclaimer: string }
 *
 * 2) aiCopilot.suggestEvidence
 *    input:  { controlTitle: string; framework?: string; clientId?: number }
 *    output: { evidence: { title: string; type: string; description: string;
 *                          freshness: string }[];
 *              source: 'builtin' }
 *
 * 3) aiCopilot.autoMap
 *    input:  { requirement: string; frameworks?: string[]; clientId?: number }
 *    output: { matches: { framework: string; controlId: string;
 *                         controlTitle: string; score: number; rationale: string }[];
 *              bestMatch: { ... } | null }
 *
 * 4) aiCopilot.status
 *    input:  none
 *    output: { available: boolean; mode: 'builtin'; capabilities: string[] }
 * ---------------------------------------------------------------------------
 */

import { trpc } from "@/lib/trpc";

/* ------------------------------------------------------------------ */
/* Types (mirror the backend contract 1:1, defensive on optionals)    */
/* ------------------------------------------------------------------ */

export interface AiCopilotDraftSection {
  heading: string;
  body: string;
}

export interface AiCopilotDraftControl {
  code: string;
  title: string;
}

export interface AiCopilotDraftPolicy {
  title: string;
  purpose: string;
  scope: string;
  sections?: AiCopilotDraftSection[];
  controls?: AiCopilotDraftControl[];
  reviewCadence: string;
  disclaimer: string;
}

export interface AiCopilotEvidenceItem {
  title: string;
  type: string;
  description: string;
  freshness: string;
}

export interface AiCopilotEvidenceSuggestion {
  evidence?: AiCopilotEvidenceItem[];
  source?: "builtin" | string;
}

export interface AiCopilotControlMatch {
  framework: string;
  controlId: string;
  controlTitle: string;
  score: number;
  rationale: string;
}

export interface AiCopilotAutoMapResult {
  matches?: AiCopilotControlMatch[];
  bestMatch?: AiCopilotControlMatch | null;
}

export interface AiCopilotStatus {
  available: boolean;
  mode?: "builtin" | string;
  capabilities?: string[];
}

/* ------------------------------------------------------------------ */
/* Narrowed tRPC query/mutation result shapes (runtime is a superset) */
/* ------------------------------------------------------------------ */

export interface QueryLike<T> {
  data?: T;
  isLoading: boolean;
  isError: boolean;
  isFetching?: boolean;
  error?: unknown;
  refetch: () => unknown;
}

export interface MutationLike<TInput, TResult> {
  mutate: (
    input: TInput,
    options?: { onSuccess?: (data: TResult) => void; onError?: (error: unknown) => void }
  ) => void;
  isPending: boolean;
  isError: boolean;
  error?: unknown;
}

interface AiCopilotTrpc {
  aiCopilot: {
    draftPolicy: {
      useMutation: () => MutationLike<
        { topic: string; framework?: string; orgName?: string; clientId?: number },
        AiCopilotDraftPolicy
      >;
    };
    suggestEvidence: {
      useMutation: () => MutationLike<
        { controlTitle: string; framework?: string; clientId?: number },
        AiCopilotEvidenceSuggestion
      >;
    };
    autoMap: {
      useMutation: () => MutationLike<
        { requirement: string; frameworks?: string[]; clientId?: number },
        AiCopilotAutoMapResult
      >;
    };
    status: {
      useQuery: (input: undefined, opts?: { retry?: boolean | number }) => QueryLike<AiCopilotStatus>;
    };
  };
}

const aiCopilotApi = trpc as unknown as AiCopilotTrpc;

/* ------------------------------------------------------------------ */
/* Hooks — retry: false (UI-STANDARD §16)                             */
/* ------------------------------------------------------------------ */

export const useAiCopilotDraftPolicy = (): MutationLike<
  { topic: string; framework?: string; orgName?: string; clientId?: number },
  AiCopilotDraftPolicy
> => aiCopilotApi.aiCopilot.draftPolicy.useMutation();

export const useAiCopilotSuggestEvidence = (): MutationLike<
  { controlTitle: string; framework?: string; clientId?: number },
  AiCopilotEvidenceSuggestion
> => aiCopilotApi.aiCopilot.suggestEvidence.useMutation();

export const useAiCopilotAutoMap = (): MutationLike<
  { requirement: string; frameworks?: string[]; clientId?: number },
  AiCopilotAutoMapResult
> => aiCopilotApi.aiCopilot.autoMap.useMutation();

export const useAiCopilotStatus = (): QueryLike<AiCopilotStatus> =>
  aiCopilotApi.aiCopilot.status.useQuery(undefined, { retry: false });

/** Neutral status shape for degraded/empty rendering (UI-STANDARD §16). */
export const EMPTY_AI_COPILOT_STATUS: AiCopilotStatus = {
  available: false,
  mode: "builtin",
  capabilities: [],
};
