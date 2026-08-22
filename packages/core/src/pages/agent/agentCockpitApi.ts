/**
 * Multi-Agent Cockpit — data contract + hooks (UI-STANDARD sec.16)
 * ================================================================
 * UI-side typed view of the `teammates.*` tRPC procedures implemented in
 * `packages/core/src/server/routers/teammatesRouter.ts` (registered as
 * `teammates:` on the AppRouter in `packages/core/src/routers.ts`).
 *
 * COORDINATION BY CONVENTION — mirrors `pages/sso/ssoApi.ts`. If a procedure
 * is not live yet the tRPC HTTP call 404s and the query surfaces an error;
 * every consumer degrades gracefully instead of crashing.
 *
 * ---------------------------------------------------------------------------
 * Expected procedures:
 *
 *  1) teammates.listTeammates       input: (none)
 *                                   output: Teammate[]
 *  2) teammates.listRoutines        input: (none)
 *                                   output: TeammateRoutine[]
 *  3) teammates.listMessages        input: { channelId }        (default "war_room")
 *                                   output: ChatMessage[]
 *  4) teammates.getGuardrailsStatus input: (none)               (poll ~5s)
 *                                   output: GuardrailsStatus
 *  5) teammates.getAuditCertificate input: { scope }            (scope has backend default)
 *                                   output: AuditCertificate
 *  6) teammates.listApprovals       input: (none)
 *                                   output: ApprovalItem[]
 *  7) teammates.sendMessage         input: { channelId, content, mentions? }
 *  8) teammates.toggleRoutine       input: { routineId, active } -> TeammateRoutine
 *  9) teammates.takeControlSandbox  input: { teammateId } -> { success, message, sessionUrl }
 * 10) teammates.resolveApproval     input: { approvalId, action, comment? }
 *                                       -> { success, item: ApprovalItem }
 * ---------------------------------------------------------------------------
 */

import { trpc } from "@/lib/trpc";

/* ------------------------------------------------------------------ */
/* Types (mirror the backend contract 1:1, defensive on optionals)     */
/* ------------------------------------------------------------------ */

export interface Teammate {
  id: string;
  name: string;
  role: string;
  avatar: string;
  description: string;
  status: "idle" | "running" | "waiting_approval" | "paused";
  sandboxType: "docker" | "e2b" | "browser" | "cli";
  model: string;
  capabilities: string[];
  tasksCompleted: number;
  lastActive: string;
}

export interface TeammateRoutine {
  id: string;
  teammateId: string;
  name: string;
  schedule: string;
  description: string;
  status: "active" | "paused" | "running";
  lastRun: string;
  nextRun: string;
  lastRunResult?: "success" | "warning" | "error";
}

export interface ChatMessage {
  id: string;
  channelId: string; // "war_room" or teammateId
  senderId: string; // "user" or teammateId
  senderName: string;
  senderAvatar: string;
  senderRole?: string;
  content: string;
  timestamp: string;
  mentions?: string[];
  delegatedTo?: string;
  attachments?: Array<{ title: string; type: string; size?: string; status?: string }>;
  browserPreview?: { url: string; title: string; steps: string[]; status: string };
}

export interface ApprovalItem {
  id: string;
  taskId: string;
  teammateId: string;
  teammateName: string;
  title: string;
  type: "github_pr" | "vendor_email" | "policy_update" | "aws_remediation" | "terraform_apply";
  description: string;
  diffOrPayload: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "pending" | "approved" | "rejected";
  createdAt: string;
}

export interface ProvenanceRecord {
  recordId: string;
  taskId: string;
  botId: string;
  botName: string;
  action: string;
  promptHash: string;
  sanitizedInputHash: string;
  outputPayloadHash: string;
  toolCalls: string[];
  approver?: string;
  status: "verified_automated" | "human_approved" | "rejected";
  timestamp: string;
  merkleHash: string;
  frameworkControlMapping?: string[];
}

export interface AuditCertificate {
  certificateId: string;
  issuedAt: string;
  scope: string;
  verifiedTransactions: number;
  integritySignature: string;
  auditLedger: ProvenanceRecord[];
}

export interface CircuitBreakerStatus {
  name: string;
  state: string;
  [key: string]: unknown;
}

export interface GuardrailsStatus {
  dlpStatus: {
    active: boolean;
    mode: string;
    patternsMonitored: number;
    secretsBlockedCount: number;
  };
  zeroTrustGatekeeper: {
    active: boolean;
    enforceDestructiveApproval: boolean;
    destructiveActionsCovered: number;
    pendingApprovalsCount: number;
  };
  cryptographicProvenance: {
    active: boolean;
    ledgerBlockCount: number;
    latestMerkleHash: string;
  };
  circuitBreakers: CircuitBreakerStatus[] | Record<string, CircuitBreakerStatus>;
}

/* ------------------------------------------------------------------ */
/* Minimal react-query shims (same shape as ssoApi's QueryLike)        */
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
  mutate: (input: TInput) => void;
  isLoading: boolean;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  error?: unknown;
}

interface QueryOptions {
  enabled?: boolean;
  retry?: boolean | number;
  staleTime?: number;
  refetchInterval?: number | false;
}

interface MutationOptions<TInput, TResult> {
  onSuccess?: (data: TResult, variables: TInput) => void;
  onError?: (error: { message: string }) => void;
}

interface TeammatesTrpc {
  teammates: {
    listTeammates: { useQuery: (opts?: QueryOptions) => QueryLike<Teammate[]> };
    listRoutines: { useQuery: (opts?: QueryOptions) => QueryLike<TeammateRoutine[]> };
    listMessages: {
      useQuery: (
        input: { channelId: string },
        opts?: QueryOptions,
      ) => QueryLike<ChatMessage[]>;
    };
    getGuardrailsStatus: { useQuery: (opts?: QueryOptions) => QueryLike<GuardrailsStatus> };
    getAuditCertificate: {
      useQuery: (
        input: { scope: string },
        opts?: QueryOptions,
      ) => QueryLike<AuditCertificate>;
    };
    listApprovals: { useQuery: (opts?: QueryOptions) => QueryLike<ApprovalItem[]> };
    sendMessage: {
      useMutation: (
        opts?: MutationOptions<
          { channelId: string; content: string; mentions?: string[] },
          { success: boolean }
        >,
      ) => MutationLike<{ channelId: string; content: string; mentions?: string[] }, { success: boolean }>;
    };
    toggleRoutine: {
      useMutation: (
        opts?: MutationOptions<{ routineId: string; active: boolean }, TeammateRoutine>,
      ) => MutationLike<{ routineId: string; active: boolean }, TeammateRoutine>;
    };
    takeControlSandbox: {
      useMutation: (
        opts?: MutationOptions<
          { teammateId: string },
          { success: boolean; message: string; sessionUrl: string }
        >,
      ) => MutationLike<
        { teammateId: string },
        { success: boolean; message: string; sessionUrl: string }
      >;
    };
    resolveApproval: {
      useMutation: (
        opts?: MutationOptions<
          { approvalId: string; action: "approved" | "rejected"; comment?: string },
          { success: boolean; item: ApprovalItem }
        >,
      ) => MutationLike<
        { approvalId: string; action: "approved" | "rejected"; comment?: string },
        { success: boolean; item: ApprovalItem }
      >;
    };
  };
}

const cockpitApi = trpc as unknown as TeammatesTrpc;

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

/** Fleet roster for the cockpit sidebar. */
export function useTeammatesQuery() {
  return cockpitApi.teammates.listTeammates.useQuery({ retry: false });
}

/** Scheduled routines for the cockpit right rail. */
export function useRoutinesQuery() {
  return cockpitApi.teammates.listRoutines.useQuery({ retry: false });
}

/** Channel messages ("war_room" or a teammate id); light polling keeps the
 *  war-room feel without hammering the API. */
export function useMessagesQuery(channelId: string) {
  return cockpitApi.teammates.listMessages.useQuery(
    { channelId },
    { retry: false, refetchInterval: 3000 },
  );
}

/** DLP / zero-trust / provenance / circuit-breaker posture strip. */
export function useGuardrailsStatusQuery() {
  return cockpitApi.teammates.getGuardrailsStatus.useQuery({
    retry: false,
    refetchInterval: 5000,
  });
}

/** Cryptographic audit certificate for the compliance modal. */
export function useAuditCertificateQuery(scope: string) {
  return cockpitApi.teammates.getAuditCertificate.useQuery({ scope }, { retry: false });
}

/** Zero-trust approval inbox. */
export function useApprovalsQuery() {
  return cockpitApi.teammates.listApprovals.useQuery({ retry: false });
}

export function useSendMessageMutation(
  opts?: MutationOptions<
    { channelId: string; content: string; mentions?: string[] },
    { success: boolean }
  >,
) {
  return cockpitApi.teammates.sendMessage.useMutation(opts);
}

export function useToggleRoutineMutation(
  opts?: MutationOptions<{ routineId: string; active: boolean }, TeammateRoutine>,
) {
  return cockpitApi.teammates.toggleRoutine.useMutation(opts);
}

export function useTakeControlSandboxMutation(
  opts?: MutationOptions<
    { teammateId: string },
    { success: boolean; message: string; sessionUrl: string }
  >,
) {
  return cockpitApi.teammates.takeControlSandbox.useMutation(opts);
}

export function useResolveApprovalMutation(
  opts?: MutationOptions<
    { approvalId: string; action: "approved" | "rejected"; comment?: string },
    { success: boolean; item: ApprovalItem }
  >,
) {
  return cockpitApi.teammates.resolveApproval.useMutation(opts);
}
