/**
 * Access Reviews — data contract + hooks
 * =======================================
 * UI-side typed view of the `accessReviews.*` tRPC procedures that the backend
 * agent is building in `packages/core/src/routers/accessReviews.ts` (registered
 * as `accessReviews:` on the AppRouter in `packages/core/src/routers.ts`).
 *
 * COORDINATION BY CONVENTION — the backend agent implements these exact
 * procedure names + input/output shapes. If a procedure is not live yet the
 * tRPC HTTP call 404s and the query surfaces an error; every consumer in the
 * UI degrades to a graceful EmptyState ("Connect the accessReviews API").
 *
 * ---------------------------------------------------------------------------
 * Expected procedures:
 *
 * 1) accessReviews.getSummary
 *    input:  { clientId: number }
 *    output: AccessReviewSummary  (see below)
 *
 * 2) accessReviews.list
 *    input:  { clientId: number }
 *    output: AccessReviewCycle[]  (cycles with per-status task counts)
 *
 * 3) accessReviews.createCycle
 *    input:  { clientId: number; name: string; dueDate?: Date; description?: string }
 *    output: AccessReviewCycle
 *
 * 4) accessReviews.provision
 *    input:  { clientId: number; cycleId: number }
 *    output: AccessReviewCycle   (idempotent — auto-creates tasks)
 *
 * 5) accessReviews.listTasks
 *    input:  { cycleId: number; status?: string }
 *    output: AccessReviewTask[]
 *
 * 6) accessReviews.certify
 *    input:  { taskId: number; note?: string }
 *    output: AccessReviewTask
 *
 * 7) accessReviews.revoke
 *    input:  { taskId: number; note?: string }
 *    output: AccessReviewTask
 *
 * 8) accessReviews.runOverdueCheck
 *    input:  { clientId: number }
 *    output: { overdue: number; checkedAt?: string }   (count of tasks that just flipped to overdue + when)
 *
 * 9) accessReviews.listHistory
 *    input:  { clientId: number }
 *    output: AccessReviewHistoryItem[]
 * ---------------------------------------------------------------------------
 */

import { trpc } from "@/lib/trpc";

/* ------------------------------------------------------------------ */
/* Types (mirror the backend contract 1:1, defensive on optionals)    */
/* ------------------------------------------------------------------ */

export interface AccessReviewSummary {
  total: number;
  pending: number;
  overdue: number;
  certified: number;
  revoked: number;
}

export interface CycleTaskCounts {
  total: number;
  pending: number;
  overdue: number;
  certified: number;
  revoked: number;
}

export interface AccessReviewCycle {
  id: number;
  name: string;
  description?: string | null;
  dueDate?: string | null;
  /** active | completed | string */
  status?: string;
  createdAt?: string | null;
  taskCounts?: CycleTaskCounts;
}

/** pending | overdue | certified | revoked | string */
export type TaskStatus = string;

export interface AccessReviewTask {
  id: number;
  cycleId?: number;
  userId?: number | null;
  userName?: string | null;
  roleName?: string | null;
  status: TaskStatus;
  note?: string | null;
  dueDate?: string | null;
  reviewedAt?: string | null;
}

export interface AccessReviewHistoryItem {
  id: number;
  taskId?: number;
  userName?: string | null;
  roleName?: string | null;
  /** certified | revoked */
  action: TaskStatus;
  note?: string | null;
  reviewedAt?: string | null;
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
    options?: {
      onSuccess?: (data: TResult) => void;
      onError?: (error: unknown) => void;
    }
  ) => void;
  isPending: boolean;
  isError: boolean;
  error?: unknown;
}

interface AccessReviewsTrpc {
  accessReviews: {
    getSummary: {
      useQuery: (
        input: { clientId: number },
        opts?: { enabled?: boolean; retry?: boolean | number; staleTime?: number }
      ) => QueryLike<AccessReviewSummary>;
    };
    list: {
      useQuery: (
        input: { clientId: number },
        opts?: { enabled?: boolean; retry?: boolean | number; staleTime?: number }
      ) => QueryLike<AccessReviewCycle[]>;
    };
    listTasks: {
      useQuery: (
        input: { cycleId: number; status?: TaskStatus },
        opts?: { enabled?: boolean; retry?: boolean | number; staleTime?: number }
      ) => QueryLike<AccessReviewTask[]>;
    };
    listHistory: {
      useQuery: (
        input: { clientId: number },
        opts?: { enabled?: boolean; retry?: boolean | number; staleTime?: number }
      ) => QueryLike<AccessReviewHistoryItem[]>;
    };
    createCycle: {
      useMutation: () => MutationLike<
        { clientId: number; name: string; dueDate?: Date; description?: string },
        AccessReviewCycle
      >;
    };
    provision: {
      useMutation: () => MutationLike<{ clientId: number; cycleId: number }, AccessReviewCycle>;
    };
    certify: {
      useMutation: () => MutationLike<{ taskId: number; note?: string }, AccessReviewTask>;
    };
    revoke: {
      useMutation: () => MutationLike<{ taskId: number; note?: string }, AccessReviewTask>;
    };
    runOverdueCheck: {
      useMutation: () => MutationLike<{ clientId: number }, { overdue: number; checkedAt?: string }>;
    };
  };
}

const accessReviewsApi = trpc as unknown as AccessReviewsTrpc;

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

/** Summary counters for the stat cards. Falls back to EmptyState on NOT_FOUND. */
export function useAccessReviewSummary(clientId: number, enabled = true) {
  return accessReviewsApi.accessReviews.getSummary.useQuery(
    { clientId },
    {
      enabled: enabled && clientId > 0,
      retry: false,
      staleTime: 30_000,
    }
  );
}

/** Review cycles with per-status task counts. */
export function useAccessReviewCycles(clientId: number, enabled = true) {
  return accessReviewsApi.accessReviews.list.useQuery(
    { clientId },
    {
      enabled: enabled && clientId > 0,
      retry: false,
      staleTime: 30_000,
    }
  );
}

/** Tasks for one expanded cycle (optionally filtered by status). */
export function useAccessReviewTasks(cycleId: number, status?: TaskStatus, enabled = true) {
  return accessReviewsApi.accessReviews.listTasks.useQuery(
    { cycleId, status },
    {
      enabled: enabled && cycleId > 0,
      retry: false,
      staleTime: 15_000,
    }
  );
}

/** Certified/revoked history feed. */
export function useAccessReviewHistory(clientId: number, enabled = true) {
  return accessReviewsApi.accessReviews.listHistory.useQuery(
    { clientId },
    {
      enabled: enabled && clientId > 0,
      retry: false,
      staleTime: 30_000,
    }
  );
}

export function useCreateCycleMutation() {
  return accessReviewsApi.accessReviews.createCycle.useMutation();
}

export function useProvisionTasksMutation() {
  return accessReviewsApi.accessReviews.provision.useMutation();
}

export function useCertifyTaskMutation() {
  return accessReviewsApi.accessReviews.certify.useMutation();
}

export function useRevokeTaskMutation() {
  return accessReviewsApi.accessReviews.revoke.useMutation();
}

export function useRunOverdueCheckMutation() {
  return accessReviewsApi.accessReviews.runOverdueCheck.useMutation();
}
