/**
 * Audit — data contract + hooks
 * ==============================
 * UI-side typed view of the audit-management tRPC procedures implemented in
 * `packages/core/src/server/routers/audit.ts`, `auditPackage.ts` and
 * `auditorPortal.ts` (registered on the AppRouter in `packages/core/src/routers.ts`).
 *
 * COORDINATION BY CONVENTION (UI-STANDARD §16) — consumers degrade to a
 * graceful EmptyState when a call is not live. Audit-package generation
 * failures surface as structured TRPCErrors (NOT_FOUND for missing clients,
 * INTERNAL_SERVER_ERROR otherwise — cycle 13 hardening).
 *
 * Expected procedures:
 *
 * 1) auditPackage.generatePackage
 *    input:  { clientId: number; framework?: string; auditorNotes?: string }
 *    output: { base64Zip: string; filename: string; manifest: AuditPackageManifest }
 *
 * 2) auditPackage.generatePdfReport
 *    input:  { clientId: number; framework?: string; auditorNotes?: string }
 *    output: { base64Pdf: string; filename: string }
 *
 * 3) audit.inviteAuditor
 *    input:  { clientId: number; email: string; name?: string }
 *    output: { success: boolean; message?: string }
 *
 * 4) audit.list
 *    input:  { clientId: number }
 *    output: AuditRecord[]
 *
 * 5) audit.updateStatus
 *    input:  { id: number; status: string }
 *    output: AuditRecord
 *
 * 6) audit.scheduleAudit
 *    input:  { clientId: number; ...schedule fields }
 *    output: AuditRecord
 *
 * 7) auditorPortal.createSession
 *    input:  { clientId: number; expiresInHours?: number; scope?: string;
 *              auditorEmail?: string; auditorName?: string }
 *    output: { token: string; expiresAt: string; ... }
 * ---------------------------------------------------------------------------
 */

import { trpc } from "@/lib/trpc";

/* ------------------------------------------------------------------ */
/* Types (mirror the backend contract 1:1, defensive on optionals)    */
/* ------------------------------------------------------------------ */

export interface AuditPackageManifest {
  framework: string;
  totalControls: number;
  implementedControls: number;
  passRate: number;
  generatedAt: string;
}

export interface AuditPackageResult {
  base64Zip: string;
  filename: string;
  manifest: AuditPackageManifest;
}

export interface AuditPdfResult {
  base64Pdf: string;
  filename: string;
}

export interface AuditRecord {
  id: number;
  clientId: number;
  title?: string;
  status?: string;
  auditorEmail?: string | null;
  auditorName?: string | null;
  dueDate?: string | null;
  framework?: string | null;
  createdAt?: string | null;
}

export interface AuditorSession {
  token: string;
  expiresAt: string;
  scope?: string | null;
  auditorEmail?: string | null;
  auditorName?: string | null;
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

interface AuditTrpc {
  auditPackage: {
    generatePackage: {
      useMutation: () => MutationLike<{ clientId: number; framework?: string; auditorNotes?: string }, AuditPackageResult>;
    };
    generatePdfReport: {
      useMutation: () => MutationLike<{ clientId: number; framework?: string; auditorNotes?: string }, AuditPdfResult>;
    };
  };
  audit: {
    inviteAuditor: {
      useMutation: () => MutationLike<{ clientId: number; email: string; name?: string }, { success: boolean; message?: string }>;
    };
    list: {
      useQuery: (input: { clientId: number }, opts?: { enabled?: boolean; retry?: boolean | number }) => QueryLike<AuditRecord[]>;
    };
    updateStatus: {
      useMutation: () => MutationLike<{ id: number; status: string }, AuditRecord>;
    };
    scheduleAudit: {
      useMutation: () => MutationLike<
        { clientId: number; dueDate?: string; framework?: string; auditorEmail?: string; auditorName?: string },
        AuditRecord
      >;
    };
  };
  auditorPortal: {
    createSession: {
      useMutation: () => MutationLike<
        { clientId: number; expiresInHours?: number; scope?: string; auditorEmail?: string; auditorName?: string },
        AuditorSession
      >;
    };
  };
}

const auditApi = trpc as unknown as AuditTrpc;

/* ------------------------------------------------------------------ */
/* Hooks — retry: false + enabled only when we have a clientId        */
/* ------------------------------------------------------------------ */

export const useGenerateAuditPackage = (): MutationLike<
  { clientId: number; framework?: string; auditorNotes?: string },
  AuditPackageResult
> => auditApi.auditPackage.generatePackage.useMutation();

export const useGenerateAuditPdf = (): MutationLike<
  { clientId: number; framework?: string; auditorNotes?: string },
  AuditPdfResult
> => auditApi.auditPackage.generatePdfReport.useMutation();

export const useInviteAuditor = (): MutationLike<
  { clientId: number; email: string; name?: string },
  { success: boolean; message?: string }
> => auditApi.audit.inviteAuditor.useMutation();

export const useAuditList = (clientId: number): QueryLike<AuditRecord[]> =>
  auditApi.audit.list.useQuery({ clientId }, { retry: false, enabled: clientId > 0 });

export const useAuditUpdateStatus = (): MutationLike<{ id: number; status: string }, AuditRecord> =>
  auditApi.audit.updateStatus.useMutation();

export const useAuditSchedule = (): MutationLike<
  { clientId: number; dueDate?: string; framework?: string; auditorEmail?: string; auditorName?: string },
  AuditRecord
> => auditApi.audit.scheduleAudit.useMutation();

export const useCreateAuditorSession = (): MutationLike<
  { clientId: number; expiresInHours?: number; scope?: string; auditorEmail?: string; auditorName?: string },
  AuditorSession
> => auditApi.auditorPortal.createSession.useMutation();
