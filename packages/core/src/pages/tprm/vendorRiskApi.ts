/**
 * Vendor Risk — data contract + hooks
 * =====================================
 * UI-side typed view of the `vendorRisk.*` tRPC procedures in
 * `packages/core/src/server/routers/vendorRisk.ts` (registered as
 * `vendorRisk:` on the AppRouter in `packages/core/src/routers.ts`).
 * Types mirror the shapes exported from `packages/core/src/lib/vendor/vendorRisk.ts`.
 *
 * COORDINATION BY CONVENTION — if the procedures are not live yet the tRPC
 * HTTP call 404s and the query surfaces an error; every consumer in the UI
 * degrades to a graceful EmptyState ("Connect the vendorRisk.getOverview API").
 *
 * ---------------------------------------------------------------------------
 * Procedures:
 *
 * 1) vendorRisk.getOverview
 *    input:  { clientId: number }
 *    output: { summary: VendorRiskOverview; vendors: VendorRiskResult[] }
 *            Never throws — on DB failure the backend returns an EMPTY overview
 *            + empty vendor list (so the UI must treat an empty result as a
 *            genuine "no data yet", not an error).
 *
 * 2) vendorRisk.getVendorRisk
 *    input:  { clientId: number; vendorId: number }
 *    output: VendorRiskResult            (NOT_FOUND when vendor is unknown)
 * ---------------------------------------------------------------------------
 */

import { trpc } from "@/lib/trpc";

/* ------------------------------------------------------------------ */
/* Types (mirror the backend contract 1:1, defensive on optionals)    */
/* ------------------------------------------------------------------ */

/** critical | medium | string (defensive) — base inherent risk by data access. */
export type InherentRiskLevel = "critical" | "medium" | string;

/** TPRM tier labels as returned by the backend. */
export type RiskTier = "Tier 1 (Critical)" | "Tier 2 (High)" | "Tier 3 (Medium)" | string;

/** Quarterly | Semi-Annual | Annual | string (defensive). */
export type ReviewFrequency = "Quarterly" | "Semi-Annual" | "Annual" | string;

export interface VendorRiskResult {
  vendorId: number;
  vendorName: string;
  dataAccessType?: string | null;
  inherentRisk: InherentRiskLevel;
  /** 0–100 residual risk score. HIGHER = safer (fully mitigated). */
  residualScore: number;
  tier: RiskTier;
  reviewFrequency: ReviewFrequency;
  /** ISO-8601 date of the next scheduled review. */
  nextReviewDate: string;
  recommendedActions: string[];
  /** Echoed scoring inputs so the UI can render a drill-down without re-querying. */
  riskFactors?: {
    latestScanRiskScore: number | null;
    openHighCriticalAssessments: number;
    hasContract: boolean;
    hasDpa: boolean;
    subprocessorCount: number;
    hasCleanSoc2: boolean;
  };
}

/** Aggregate view over the client's vendor portfolio (returned as `summary`). */
export interface VendorRiskOverview {
  totalVendors: number;
  tierCounts: {
    tier1: number;
    tier2: number;
    tier3: number;
  };
  avgResidualScore: number;
  /** Vendors whose nextReviewDate is due or overdue. */
  vendorsDueForReview: VendorRiskResult[];
  /** ISO-8601 timestamp of when the overview was computed. */
  updatedAt: string;
}

/** Full response of `vendorRisk.getOverview`. */
export interface VendorRiskOverviewResponse {
  summary: VendorRiskOverview;
  vendors: VendorRiskResult[];
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

interface VendorRiskTrpc {
  vendorRisk: {
    getOverview: {
      useQuery: (
        input: { clientId: number },
        opts?: { enabled?: boolean; retry?: boolean | number; staleTime?: number }
      ) => QueryLike<VendorRiskOverviewResponse>;
    };
    getVendorRisk: {
      useQuery: (
        input: { clientId: number; vendorId: number },
        opts?: { enabled?: boolean; retry?: boolean | number; staleTime?: number }
      ) => QueryLike<VendorRiskResult>;
    };
  };
}

const vendorRiskApi = trpc as unknown as VendorRiskTrpc;

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

/**
 * Vendor risk overview (summary counters + full risk register) for the
 * workspace. Falls back to EmptyState when the procedure is absent (isError)
 * or shows an empty register when the backend returns no vendors.
 */
export function useVendorRiskOverviewQuery(clientId: number, enabled = true) {
  return vendorRiskApi.vendorRisk.getOverview.useQuery(
    { clientId },
    {
      enabled: enabled && clientId > 0,
      retry: false,
      staleTime: 30_000,
    }
  );
}

/**
 * Per-vendor residual risk drill-down. Gracefully degrades (isError, no data)
 * when the procedure is absent or the vendor is unknown.
 */
export function useVendorRiskQuery(clientId: number, vendorId: number, enabled = true) {
  return vendorRiskApi.vendorRisk.getVendorRisk.useQuery(
    { clientId, vendorId },
    {
      enabled: enabled && clientId > 0 && vendorId > 0,
      retry: false,
      staleTime: 30_000,
    }
  );
}
