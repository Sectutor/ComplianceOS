import { trpc } from "@/lib/trpc";

/**
 * AI readiness for UI gating.
 *
 * Returns { configured, isLoading }. `configured` is true only when at least
 * one enabled LLM provider has a real (non-placeholder) API key. AI action
 * buttons should be disabled with a clear hint while unconfigured.
 */
export function useAiConfigured(): { configured: boolean; isLoading: boolean } {
    const { data, isLoading } = trpc.llm.status.useQuery(undefined, {
        staleTime: 60 * 1000,
        retry: false,
    });
    return { configured: !!data?.configured, isLoading };
}
