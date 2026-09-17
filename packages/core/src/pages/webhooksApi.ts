/**
 * Webhooks — data contract + hooks
 * =================================
 * UI-side typed view of the `webhooks.*` tRPC procedures that the backend
 * agent is building in `packages/core/src/server/routers/webhooks.ts`
 * (registered as `webhooks:` on the AppRouter in `packages/core/src/routers.ts`).
 *
 * COORDINATION BY CONVENTION — the backend agent implements these exact
 * procedure names + input/output shapes. If a procedure is not live yet the
 * tRPC HTTP call 404s and the query surfaces an error; every consumer in the
 * UI degrades to a graceful EmptyState ("Connect the webhooks API").
 *
 * ---------------------------------------------------------------------------
 * Expected procedures:
 *
 * 1) webhooks.subscribe
 *    input:  { clientId: number; name: string; targetUrl: string; events: string[]; secret?: string }
 *    output: WebhookSubscription  (when `secret` is omitted the backend generates
 *            one and returns it — the UI shows it exactly once after create)
 *
 * 2) webhooks.listSubscriptions
 *    input:  { clientId: number }
 *    output: WebhookSubscription[]
 *
 * 3) webhooks.updateSubscription
 *    input:  { id: number; name?: string; targetUrl?: string; events?: string[]; status?: string }
 *    output: WebhookSubscription
 *
 * 4) webhooks.deleteSubscription
 *    input:  { id: number }
 *    output: { success: boolean }
 *
 * 5) webhooks.listDeliveries
 *    input:  { clientId: number; limit?: number }
 *    output: WebhookDelivery[]
 *
 * 6) webhooks.listEventCatalog
 *    input:  (none)
 *    output: WebhookEventDefinition[]  (e.g. "test.ping", "evidence.expired",
 *            "control.autotest.failed", "risk.created", "policy.ack.overdue", "*")
 *
 * 7) webhooks.triggerTestEvent
 *    input:  { clientId: number; event?: string; data?: unknown }
 *    output: WebhookTestResult  ({ event, dispatchedCount, successCount, failureCount })
 * ---------------------------------------------------------------------------
 */

import { trpc } from "@/lib/trpc";

/* ------------------------------------------------------------------ */
/* Types (mirror the backend contract 1:1, defensive on optionals)    */
/* ------------------------------------------------------------------ */

export type WebhookStatus = "active" | "disabled" | string;

export interface WebhookSubscription {
  id: number;
  clientId: number;
  name: string;
  targetUrl: string;
  /** HMAC-SHA256 signing secret. Returned on create (and by list) — the UI
   *  only reveals it once, immediately after a create that omitted `secret`. */
  secret?: string;
  events: string[];
  status: WebhookStatus;
  createdAt?: string | null;
}

export interface WebhookDelivery {
  id: number;
  subscriptionId: number;
  event: string;
  payload?: unknown;
  statusCode: number;
  responseBody?: string | null;
  durationMs: number;
  success: boolean;
  executedAt: string;
}

export interface WebhookEventDefinition {
  id: string;
  label: string;
  description?: string;
}

export interface WebhookTestResult {
  event: string;
  dispatchedCount: number;
  successCount: number;
  failureCount: number;
}

/* ------------------------------------------------------------------ */
/* Fallback event catalog — used for rendering event options while    */
/* webhooks.listEventCatalog is loading or absent (UI-STANDARD §16.4). */
/* ------------------------------------------------------------------ */

export const WEBHOOK_EVENTS: WebhookEventDefinition[] = [
  { id: "*", label: "All events", description: "Subscribe to every event type (most common)" },
  { id: "test.ping", label: "Test ping", description: "Manual connectivity check from the dashboard" },
  { id: "evidence.expired", label: "Evidence expired", description: "An evidence item passed its expiry date" },
  { id: "control.autotest.failed", label: "Control auto-test failed", description: "A scheduled control auto-test did not pass" },
  { id: "risk.created", label: "Risk created", description: "A new risk was logged for the workspace" },
  { id: "policy.ack.overdue", label: "Policy ack overdue", description: "A policy acknowledgment passed its due date" },
];

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
    options?: {
      onSuccess?: (data: TResult) => void;
      onError?: (error: unknown) => void;
    }
  ) => void;
  isPending: boolean;
  isError: boolean;
  error?: unknown;
}

interface WebhooksTrpc {
  webhooks: {
    listSubscriptions: {
      useQuery: (
        input: { clientId: number },
        opts?: { enabled?: boolean; retry?: boolean | number; staleTime?: number }
      ) => QueryLike<WebhookSubscription[]>;
    };
    listDeliveries: {
      useQuery: (
        input: { clientId: number; limit?: number },
        opts?: { enabled?: boolean; retry?: boolean | number; staleTime?: number }
      ) => QueryLike<WebhookDelivery[]>;
    };
    listEventCatalog: {
      useQuery: (
        opts?: { enabled?: boolean; retry?: boolean | number; staleTime?: number }
      ) => QueryLike<WebhookEventDefinition[]>;
    };
    subscribe: {
      useMutation: () => MutationLike<
        { clientId: number; name: string; targetUrl: string; events: string[]; secret?: string },
        WebhookSubscription
      >;
    };
    updateSubscription: {
      useMutation: () => MutationLike<
        { id: number; name?: string; targetUrl?: string; events?: string[]; status?: string },
        WebhookSubscription
      >;
    };
    deleteSubscription: {
      useMutation: () => MutationLike<{ id: number }, { success: boolean }>;
    };
    triggerTestEvent: {
      useMutation: () => MutationLike<
        { clientId: number; event?: string; data?: unknown },
        WebhookTestResult
      >;
    };
  };
}

const webhooksApi = trpc as unknown as WebhooksTrpc;

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

/** Subscriptions for the workspace. Falls back to EmptyState on NOT_FOUND. */
export function useWebhookSubscriptions(clientId: number, enabled = true) {
  return webhooksApi.webhooks.listSubscriptions.useQuery(
    { clientId },
    {
      enabled: enabled && clientId > 0,
      retry: false,
      staleTime: 15_000,
    }
  );
}

/** Recent delivery attempts for the workspace. */
export function useWebhookDeliveries(clientId: number, limit = 50, enabled = true) {
  return webhooksApi.webhooks.listDeliveries.useQuery(
    { clientId, limit },
    {
      enabled: enabled && clientId > 0,
      retry: false,
      staleTime: 15_000,
    }
  );
}

/** Available event types for the checkbox list. No input — safe to call always. */
export function useWebhookEventCatalog() {
  return webhooksApi.webhooks.listEventCatalog.useQuery({
    retry: false,
    staleTime: 60_000,
  });
}

export function useSubscribeWebhook() {
  return webhooksApi.webhooks.subscribe.useMutation();
}

export function useUpdateWebhook() {
  return webhooksApi.webhooks.updateSubscription.useMutation();
}

export function useDeleteWebhook() {
  return webhooksApi.webhooks.deleteSubscription.useMutation();
}

export function useTriggerWebhookTest() {
  return webhooksApi.webhooks.triggerTestEvent.useMutation();
}
