/**
 * TrustCenter — data contract + hooks
 * ===================================
 * UI-side typed view of the `trustCenter.*` tRPC procedures implemented in
 * `packages/core/src/server/routers/trustCenter.ts` (registered as
 * `trustCenter:` on the AppRouter in `packages/core/src/routers.ts`).
 *
 * COORDINATION BY CONVENTION (UI-STANDARD §16) — these procedures are public
 * and never throw on DB failure (cycle 13 hardening); consumers degrade to a
 * graceful EmptyState ("Connect the trustCenter.getPosture API") when a call
 * is not live.
 *
 * Expected procedures:
 *
 * 1) trustCenter.getPublicData
 *    input:  { clientId: number }
 *    output: { documents: TrustDocument[] }
 *
 * 2) trustCenter.getPosture          (added cycle 13 — public posture page)
 *    input:  { clientId: number }
 *    output: TrustPosture
 *
 * 3) trustCenter.requestAccess
 *    input:  { clientId: number; email: string; name: string; company?: string }
 *    output: { visitorId: number | null; success: boolean; reason?: string }
 *            (FORBIDDEN TRPCError for competitor domains)
 *
 * 4) trustCenter.signNDA
 *    input:  { clientId: number; visitorId: number; signatureText: string }
 *    output: { success: boolean; reason?: string }
 *
 * 5) trustCenter.getAccessStatus
 *    input:  { clientId: number; email?: string }
 *    output: { signed: boolean; isLoggedIn: boolean; visitorId?: number;
 *              user?: { name?: string; email?: string; company?: string };
 *              status?: string }
 * ---------------------------------------------------------------------------
 */

import { trpc } from "@/lib/trpc";

/* ------------------------------------------------------------------ */
/* Types (mirror the backend contract 1:1, defensive on optionals)    */
/* ------------------------------------------------------------------ */

export interface TrustDocument {
  id: number;
  clientId: number;
  name: string;
  description?: string | null;
  fileUrl: string;
  isLocked?: boolean | null;
  category?: string | null;
  createdAt?: string | null;
}

export type TrustPostureStatus = "Strong" | "Developing" | "At Risk" | "No Data";

export interface TrustPosture {
  client: {
    id: number;
    name: string;
    industry?: string | null;
    logo?: string | null;
  } | null;
  complianceScore: number;
  status: TrustPostureStatus;
  totalControls: number;
  implementedControls: number;
  frameworks: unknown[];
  documents: TrustDocument[];
  badges: unknown[];
}

export interface TrustAccessResult {
  visitorId: number | null;
  success: boolean;
  reason?: string;
}

export interface TrustAccessStatus {
  signed: boolean;
  isLoggedIn: boolean;
  visitorId?: number;
  user?: { name?: string; email?: string; company?: string };
  status?: string;
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

interface TrustCenterTrpc {
  trustCenter: {
    getPublicData: {
      useQuery: (input: { clientId: number }, opts?: { enabled?: boolean; retry?: boolean | number }) => QueryLike<{ documents: TrustDocument[] }>;
    };
    getPosture: {
      useQuery: (input: { clientId: number }, opts?: { enabled?: boolean; retry?: boolean | number }) => QueryLike<TrustPosture>;
    };
    getAccessStatus: {
      useQuery: (input: { clientId: number; email?: string }, opts?: { enabled?: boolean; retry?: boolean | number }) => QueryLike<TrustAccessStatus>;
    };
    requestAccess: {
      useMutation: () => MutationLike<{ clientId: number; email: string; name: string; company?: string }, TrustAccessResult>;
    };
    signNDA: {
      useMutation: () => MutationLike<{ clientId: number; visitorId: number; signatureText: string }, { success: boolean; reason?: string }>;
    };
  };
}

const trustCenterApi = trpc as unknown as TrustCenterTrpc;

/* ------------------------------------------------------------------ */
/* Hooks — retry: false + enabled only when we have a clientId        */
/* ------------------------------------------------------------------ */

export const useTrustPublicData = (clientId: number): QueryLike<{ documents: TrustDocument[] }> =>
  trustCenterApi.trustCenter.getPublicData.useQuery({ clientId }, { retry: false, enabled: clientId > 0 });

export const useTrustPosture = (clientId: number): QueryLike<TrustPosture> =>
  trustCenterApi.trustCenter.getPosture.useQuery({ clientId }, { retry: false, enabled: clientId > 0 });

export const useTrustAccessStatus = (clientId: number, email?: string): QueryLike<TrustAccessStatus> =>
  trustCenterApi.trustCenter.getAccessStatus.useQuery(
    email ? { clientId, email } : { clientId },
    { retry: false, enabled: clientId > 0 }
  );

export const useRequestAccess = (): MutationLike<
  { clientId: number; email: string; name: string; company?: string },
  TrustAccessResult
> => trustCenterApi.trustCenter.requestAccess.useMutation();

export const useSignNda = (): MutationLike<
  { clientId: number; visitorId: number; signatureText: string },
  { success: boolean; reason?: string }
> => trustCenterApi.trustCenter.signNDA.useMutation();

/** Neutral posture shape for degraded/empty rendering (UI-STANDARD §16). */
export const EMPTY_TRUST_POSTURE: TrustPosture = {
  client: null,
  complianceScore: 0,
  status: "No Data",
  totalControls: 0,
  implementedControls: 0,
  frameworks: [],
  documents: [],
  badges: [],
};
