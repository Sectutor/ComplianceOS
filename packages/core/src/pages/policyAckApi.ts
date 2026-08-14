/**
 * Policy acknowledgment — data contract + hooks
 * =============================================
 * UI-side typed view of the `policyAck.*` tRPC procedures the backend agent
 * is building in `packages/core/src/routers/policyAck.ts` (registered as
 * `policyAck:` on the AppRouter in `packages/core/src/routers.ts`).
 *
 * COORDINATION BY CONVENTION — backend implements these exact procedure
 * names + input/output shapes. Until then the calls 404 and the UI degrades
 * to a graceful EmptyState.
 *
 * ---------------------------------------------------------------------------
 * Expected procedures:
 *
 * 1) policyAck.list
 *    input:  { clientId: number }
 *    output: PolicyAckRecord[]
 *
 * 2) policyAck.acknowledge
 *    input:  { acknowledgmentId: number }
 *    output: PolicyAckRecord (updated)
 *
 * 3) policyAck.assign   (cycle 6 — "Assign policy" affordance)
 *    input:  { policyId: number; clientId: number; userId?: number }
 *            userId omitted ⇒ assign to every employee of the client.
 *    output: PolicyAckRecord[] (created records)
 * ---------------------------------------------------------------------------
 */

import { trpc } from "@/lib/trpc";

export interface PolicyAckRecord {
  id: number;
  policyId: number;
  policyTitle: string;
  assigneeName?: string | null;
  status: "pending" | "acknowledged" | string;
  acknowledgedAt?: string | null;
  dueDate?: string | null;
  /** Optional — when present, drives the "pending > 3 days" highlight. */
  createdAt?: string | null;
}

export interface AssignPolicyInput {
  policyId: number;
  clientId: number;
  userId?: number;
}

interface QueryLike<T> {
  data?: T;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  refetch: () => unknown;
}

interface ClientPolicyLike {
  id: number;
  name?: string | null;
}

interface EmployeeLike {
  id: number;
  firstName?: string | null;
  lastName?: string | null;
}

interface PolicyAckTrpc {
  /** Live endpoints used by the panel — routed through the cast (§16.1). */
  clientPolicies: {
    list: {
      useQuery: (
        input: { clientId: number },
        opts?: { enabled?: boolean; retry?: boolean | number; staleTime?: number }
      ) => QueryLike<ClientPolicyLike[]>;
    };
  };
  employees: {
    list: {
      useQuery: (
        input: { clientId: number },
        opts?: { enabled?: boolean; retry?: boolean | number; staleTime?: number }
      ) => QueryLike<EmployeeLike[]>;
    };
  };
  policyAck: {
    list: {
      useQuery: (
        input: { clientId: number },
        opts?: { enabled?: boolean; retry?: boolean | number; staleTime?: number }
      ) => QueryLike<PolicyAckRecord[]>;
    };
    acknowledge: {
      useMutation: (opts?: {
        onSuccess?: (data: PolicyAckRecord) => void;
        onError?: (error: unknown) => void;
      }) => {
        mutate: (input: { acknowledgmentId: number }) => void;
        isPending: boolean;
        isError: boolean;
        error?: unknown;
      };
    };
    assign: {
      useMutation: (opts?: {
        onSuccess?: (data: PolicyAckRecord[]) => void;
        onError?: (error: unknown) => void;
      }) => MutationLike<AssignPolicyInput, PolicyAckRecord[]>;
    };
  };
}

interface MutationLike<TInput, TResult> {
  mutate: (input: TInput) => void;
  mutateAsync: (input: TInput) => Promise<TResult>;
  isPending: boolean;
  isError: boolean;
  error?: unknown;
  reset: () => void;
}

const policyAckApi = trpc as unknown as PolicyAckTrpc;

export function usePolicyAcks(clientId: number, enabled = true) {
  return policyAckApi.policyAck.list.useQuery(
    { clientId },
    {
      enabled: enabled && clientId > 0,
      retry: false,
      staleTime: 30_000,
    }
  );
}

export function useAcknowledgePolicy(opts?: { onSuccess?: (data: PolicyAckRecord) => void; onError?: (error: unknown) => void }) {
  return policyAckApi.policyAck.acknowledge.useMutation(opts);
}

export function useAssignPolicy(opts?: {
  onSuccess?: (data: PolicyAckRecord[]) => void;
  onError?: (error: unknown) => void;
}) {
  return policyAckApi.policyAck.assign.useMutation(opts);
}

export function useClientPolicies(clientId: number, enabled = true) {
  return policyAckApi.clientPolicies.list.useQuery(
    { clientId },
    { enabled: enabled && clientId > 0, retry: false, staleTime: 30_000 }
  );
}

export function useClientEmployees(clientId: number, enabled = true) {
  return policyAckApi.employees.list.useQuery(
    { clientId },
    { enabled: enabled && clientId > 0, retry: false, staleTime: 30_000 }
  );
}
