/**
 * Evidence renewal — data contract + hooks
 * =========================================
 * UI-side typed view of the `evidenceRenewal.*` tRPC procedures the backend
 * agent is building in `packages/core/src/routers/evidenceRenewal.ts`
 * (registered as `evidenceRenewal:` on the AppRouter in `routers.ts`).
 *
 * COORDINATION BY CONVENTION (UI-STANDARD.md §16) — the backend implements
 * these exact procedure names + input/output shapes (verified against the
 * on-disk router while it is mid-flight). Until they are live the calls 404
 * and the UI degrades gracefully:
 *   - getSummary  → falls back to the live `evidenceExpiry.getStats` endpoint
 *                   and derives the same view-model ("Derived from workspace
 *                   data" badge, §16.4).
 *   - runNow      → error toast; no crash.
 *   - setConfig   → NOT exposed by the backend router; the auto-renew toggle
 *                   persists to localStorage with a visible note instead.
 *
 * ---------------------------------------------------------------------------
 * Backend contract (packages/core/src/routers/evidenceRenewal.ts):
 *
 * 1) evidenceRenewal.getSummary
 *    input:  { horizonDays?: number }   (optional object)
 *    output: RenewalStateSummary
 *            { horizonDays, dueForRenewal, expired, verified, collected,
 *              completedAt: string }
 *
 * 2) evidenceRenewal.runNow
 *    input:  { horizonDays?: number }   (optional object)
 *    output: RenewalRunSummary
 *            { dueRows, renewedRows, expiredRows, skippedRows,
 *              failedRenewals, remediationNotes: string[], horizonDays,
 *              completedAt: Date | string }
 * ---------------------------------------------------------------------------
 */

import { trpc } from "@/lib/trpc";

/* ------------------------------------------------------------------ */
/* Contracts (mirror the backend router + lib/evidenceRenewal.ts)      */
/* ------------------------------------------------------------------ */

export interface RenewalStateSummary {
  horizonDays: number;
  dueForRenewal: number;
  expired: number;
  verified: number;
  collected: number;
  completedAt: string;
}

export interface RenewalRunSummary {
  dueRows: number;
  renewedRows: number;
  expiredRows: number;
  skippedRows: number;
  failedRenewals: number;
  remediationNotes: string[];
  horizonDays: number;
  completedAt: Date | string;
}

/** Item-level status used for the per-row chips (valid / expiring-soon / expired). */
export type EvidenceRenewalStatus = "valid" | "expiring-soon" | "expired";

export interface EvidenceRenewalItem {
  /** Primary key of the evidence record. */
  id: number;
  /** Human evidence id, e.g. "EVD-001". */
  evidenceId: string;
  controlName?: string | null;
  owner?: string | null;
  status: EvidenceRenewalStatus;
  expirationDate?: string | null;
  daysUntilExpiry: number;
  intervalDays?: number | null;
}

/** Panel view-model — counts from the live renewal API (when live) + items. */
export interface EvidenceRenewalSummary {
  horizonDays?: number;
  valid: number;
  expiringSoon: number;
  expired: number;
  dueForRenewal?: number;
  items: EvidenceRenewalItem[];
  updatedAt?: string | null;
}

/* ------------------------------------------------------------------ */
/* Narrowed tRPC hook shapes (runtime is a superset)                   */
/* ------------------------------------------------------------------ */

interface QueryLike<T> {
  data?: T;
  isLoading: boolean;
  isError: boolean;
  error?: unknown;
  refetch: () => unknown;
}

interface MutationLike<TInput, TResult> {
  mutate: (input: TInput) => void;
  mutateAsync: (input: TInput) => Promise<TResult>;
  isPending: boolean;
  isError: boolean;
  error?: unknown;
  reset: () => void;
}

interface EvidenceRenewalTrpc {
  evidenceRenewal: {
    getSummary: {
      useQuery: (
        input?: { horizonDays?: number },
        opts?: { enabled?: boolean; retry?: boolean | number; staleTime?: number }
      ) => QueryLike<RenewalStateSummary>;
    };
    runNow: {
      useMutation: (opts?: {
        onSuccess?: (data: RenewalRunSummary) => void;
        onError?: (error: unknown) => void;
      }) => MutationLike<{ horizonDays?: number }, RenewalRunSummary>;
    };
  };
  /** Live fallback — evidenceExpiry.getStats (already registered). */
  evidenceExpiry: {
    getStats: {
      useQuery: (
        input: { clientId: number },
        opts?: { enabled?: boolean; retry?: boolean | number; staleTime?: number }
      ) => QueryLike<EvidenceExpiryStatsLike>;
    };
  };
}

const evidenceRenewalApi = trpc as unknown as EvidenceRenewalTrpc;

export function useEvidenceRenewalSummary(enabled = true) {
  return evidenceRenewalApi.evidenceRenewal.getSummary.useQuery(
    {},
    { enabled, retry: false, staleTime: 30_000 }
  );
}

export function useEvidenceExpiryStats(clientId: number, enabled = true) {
  return evidenceRenewalApi.evidenceExpiry.getStats.useQuery(
    { clientId },
    { enabled: enabled && clientId > 0, retry: false, staleTime: 30_000 }
  );
}

export function useRunEvidenceRenewal(opts?: {
  onSuccess?: (data: RenewalRunSummary) => void;
  onError?: (error: unknown) => void;
}) {
  return evidenceRenewalApi.evidenceRenewal.runNow.useMutation(opts);
}

/* ------------------------------------------------------------------ */
/* Fallback derivation (§16.4) — live evidenceExpiry.getStats → our    */
/* view-model. Show a "Derived from workspace data" badge when used.   */
/* ------------------------------------------------------------------ */

/** Minimal structural view of `evidenceExpiry.getStats` output. */
export interface EvidenceExpiryStatsLike {
  total: number;
  expired: number;
  expiring30: number;
  expiring90: number;
  noExpiry: number;
  urgentItems?: Array<{
    id: number;
    evidenceId: string;
    owner?: string | null;
    expirationDate?: Date | string | null;
    daysUntilExpiry: number;
    status?: string | null;
    controlName?: string | null;
  }>;
}

const EXPIRING_SOON_WINDOW_DAYS = 30;

function toStatus(daysUntilExpiry: number): EvidenceRenewalStatus {
  return daysUntilExpiry <= 0 ? "expired" : "expiring-soon";
}

function toIso(value?: Date | string | null): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export function deriveRenewalSummary(
  expiry: EvidenceExpiryStatsLike | null | undefined
): EvidenceRenewalSummary | null {
  if (!expiry) return null;
  const urgent = (expiry.urgentItems ?? []).filter((i) => i && i.id != null);
  const items: EvidenceRenewalItem[] = urgent
    .map((i) => ({
      id: i.id,
      evidenceId: i.evidenceId || `Evidence #${i.id}`,
      controlName: i.controlName ?? null,
      owner: i.owner ?? null,
      status: toStatus(i.daysUntilExpiry ?? EXPIRING_SOON_WINDOW_DAYS),
      expirationDate: toIso(i.expirationDate),
      daysUntilExpiry: i.daysUntilExpiry ?? EXPIRING_SOON_WINDOW_DAYS,
      intervalDays: null,
    }))
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

  const expired = items.filter((i) => i.status === "expired").length;
  const expiringSoon = items.length - expired;

  return {
    valid: Math.max(0, (expiry.total ?? 0) - items.length),
    expiringSoon,
    expired,
    items,
    updatedAt: new Date().toISOString(),
  };
}
