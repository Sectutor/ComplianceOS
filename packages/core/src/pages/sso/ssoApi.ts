/**
 * SSO (OIDC) — data contract + hooks
 * ===================================
 * UI-side typed view of the `sso.*` tRPC procedures that the backend agent
 * is building in `packages/core/src/server/routers/sso.ts`
 * (registered as `sso:` on the AppRouter in `packages/core/src/routers.ts`).
 *
 * COORDINATION BY CONVENTION — mirrors `pages/webhooksApi.ts`. If a procedure
 * is not live yet the tRPC HTTP call 404s and the query surfaces an error;
 * every consumer degrades gracefully (LoginPage hides the SSO button,
 * SecuritySettings shows "Connect the sso.status API").
 *
 * ---------------------------------------------------------------------------
 * Expected procedures:
 *
 * 1) sso.status
 *    input:  (none)
 *    output: { enabled: boolean; mode: 'oidc' | 'proxy' | 'none';
 *              providerName?: string; issuer?: string; roleClaim?: string;
 *              proxyHeader?: string; redirectUri?: string }
 *
 * 2) sso.start
 *    input:  (none)
 *    output: { authorizationUrl: string }
 *            (TRPCError PRECONDITION_FAILED when OIDC is disabled)
 *
 * 3) sso.callback
 *    input:  { code: string; state: string }
 *    output: { token: string; user: { id: string | number; email: string;
 *              name: string; role: string } }
 * ---------------------------------------------------------------------------
 */

import { trpc } from "@/lib/trpc";

/* ------------------------------------------------------------------ */
/* Types (mirror the backend contract 1:1, defensive on optionals)    */
/* ------------------------------------------------------------------ */

export type SsoMode = "oidc" | "proxy" | "none";

export interface SsoStatus {
  enabled: boolean;
  mode: SsoMode;
  providerName?: string;
  issuer?: string;
  roleClaim?: string;
  proxyHeader?: string;
  redirectUri?: string;
}

export interface SsoStartResult {
  authorizationUrl: string;
}

export interface SsoUser {
  id: string | number;
  email: string;
  name: string;
  role: string;
}

export interface SsoCallbackResult {
  token: string;
  user: SsoUser;
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
  refetch: () => Promise<{ data?: T; isError?: boolean }>;
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
  isSuccess: boolean;
  isError: boolean;
  error?: unknown;
}

interface SsoTrpc {
  sso: {
    status: {
      useQuery: (opts?: { enabled?: boolean; retry?: boolean | number; staleTime?: number }) => QueryLike<SsoStatus>;
    };
    start: {
      useQuery: (opts?: { enabled?: boolean; retry?: boolean | number }) => QueryLike<SsoStartResult>;
    };
    callback: {
      useMutation: () => MutationLike<{ code: string; state: string }, SsoCallbackResult>;
    };
  };
}

const ssoApi = trpc as unknown as SsoTrpc;

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

/** Read-only SSO configuration/status. Never blocks a page when absent. */
export function useSsoStatusQuery() {
  return ssoApi.sso.status.useQuery(undefined, {
    retry: false,
    staleTime: 30_000,
  } as any);
}

/**
 * On-demand `sso.start` — kept disabled so it only fires when the user
 * clicks "Continue with SSO" (call `refetch()` and read `authorizationUrl`).
 * NOTE: tRPC's useQuery signature is (input, opts) — the (no-input) procedure
 * must pass undefined as input, otherwise the options object is treated as
 * query input and real options default to enabled, firing on mount and
 * throwing "SSO OIDC is not enabled or configured" when unconfigured.
 */
export function useSsoStartQuery() {
  return ssoApi.sso.start.useQuery(undefined, {
    enabled: false,
    retry: false,
  } as any);
}

/** Exchange the IdP authorization code + state for a session token. */
export function useSsoCallbackMutation() {
  return ssoApi.sso.callback.useMutation();
}

/* ------------------------------------------------------------------ */
/* Label helpers                                                       */
/* ------------------------------------------------------------------ */

/**
 * Human-readable identity-provider label for the login page caption
 * ("Sign in with <provider>"). Returns null when SSO/OIDC is not usable or
 * no provider name is configured — consumers render nothing in that case.
 */
export function buildProviderLabel(status?: SsoStatus | null): string | null {
  if (!status?.enabled || status.mode !== "oidc") return null;
  const provider = status.providerName?.trim();
  return provider ? provider : null;
}
