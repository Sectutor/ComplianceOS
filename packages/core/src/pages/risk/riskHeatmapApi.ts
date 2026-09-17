/**
 * Risk Heat Map — data contract + hooks
 * =====================================
 * UI-side typed view of the `riskHeatmap.*` tRPC procedures that the backend
 * agent is building in `packages/core/src/routers/riskHeatmap.ts` (registered
 * as `riskHeatmap:` on the AppRouter in `packages/core/src/routers.ts`).
 *
 * COORDINATION BY CONVENTION — the backend agent implements these exact
 * procedure names + input/output shapes. If a procedure is not live yet the
 * tRPC HTTP call 404s and the query surfaces an error; every consumer in the
 * UI degrades to a graceful EmptyState ("Connect the risk heat map API").
 *
 * ---------------------------------------------------------------------------
 * Expected procedures:
 *
 * 1) riskHeatmap.getHeatmap
 *    input:  { clientId: number }
 *    output: RiskHeatmapData   (see below)
 *
 * 2) riskHeatmap.listTreatmentPlans
 *    input:  { clientId: number; likelihood?: number; impact?: number }
 *    output: TreatmentPlan[]   (optional cell filter for drawer drill-down)
 * ---------------------------------------------------------------------------
 */

import { trpc } from "@/lib/trpc";

/* ------------------------------------------------------------------ */
/* Types (mirror the backend contract 1:1)                            */
/* ------------------------------------------------------------------ */

/** One 5x5 matrix cell. likelihood/impact are 1..5 (1 = very low). */
export interface HeatmapCell {
  likelihood: number;
  impact: number;
  count: number;
  /** ids of risks landing in this cell (optional, used for drill-down) */
  riskIds?: number[];
}

export interface HeatmapTotals {
  totalRisks: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  /** 0..100 — share of risks with an active/completed treatment plan */
  treatmentProgress: number;
}

export interface RiskHeatmapData {
  matrix: HeatmapCell[];
  totals: HeatmapTotals;
  updatedAt?: string | null;
}

export type TreatmentStatus = "open" | "in-progress" | "mitigated" | "accepted" | string;

export interface TreatmentPlan {
  id: number;
  riskId: number;
  riskTitle: string;
  /** mitigate | transfer | accept | avoid */
  strategy?: string;
  status: TreatmentStatus;
  owner?: string | null;
  dueDate?: string | null;
  likelihood?: number;
  impact?: number;
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
  mutate: (input: TInput) => void;
  isPending: boolean;
  isError: boolean;
  error?: unknown;
}

interface RiskHeatmapTrpc {
  riskHeatmap: {
    getHeatmap: {
      useQuery: (
        input: { clientId: number },
        opts?: { enabled?: boolean; retry?: boolean | number; staleTime?: number }
      ) => QueryLike<RiskHeatmapData>;
    };
    listTreatmentPlans: {
      useQuery: (
        input: { clientId: number; likelihood?: number; impact?: number },
        opts?: { enabled?: boolean; retry?: boolean | number; staleTime?: number }
      ) => QueryLike<TreatmentPlan[]>;
    };
  };
}

const riskHeatmapApi = trpc as unknown as RiskHeatmapTrpc;

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */

/** 5x5 matrix + summary totals. Falls back to EmptyState on NOT_FOUND. */
export function useRiskHeatmapData(clientId: number, enabled = true) {
  return riskHeatmapApi.riskHeatmap.getHeatmap.useQuery(
    { clientId },
    {
      enabled: enabled && clientId > 0,
      retry: false,
      staleTime: 60_000,
    }
  );
}

/** Treatment plans, optionally scoped to a (likelihood, impact) cell. */
export function useTreatmentPlans(clientId: number, cell?: { likelihood: number; impact: number } | null, enabled = true) {
  return riskHeatmapApi.riskHeatmap.listTreatmentPlans.useQuery(
    {
      clientId,
      likelihood: cell?.likelihood,
      impact: cell?.impact,
    },
    {
      enabled: enabled && clientId > 0,
      retry: false,
      staleTime: 60_000,
    }
  );
}

/* ------------------------------------------------------------------ */
/* Demo mode — clearly labeled sample data (never the primary state)  */
/* ------------------------------------------------------------------ */

export const DEMO_MATRIX: HeatmapCell[] = (() => {
  const cells: HeatmapCell[] = [];
  for (let likelihood = 1; likelihood <= 5; likelihood++) {
    for (let impact = 1; impact <= 5; impact++) {
      const score = likelihood * impact;
      // Weight counts toward the upper-right (higher risk) corner.
      let count = 0;
      if (score >= 15) count = 1 + ((likelihood + impact) % 3);
      else if (score >= 8) count = (likelihood + impact) % 4;
      else if (score >= 4) count = (likelihood + impact) % 3;
      else count = (likelihood * impact) % 2;
      cells.push({ likelihood, impact, count, riskIds: count > 0 ? [1] : [] });
    }
  }
  return cells;
})();

export const DEMO_TOTALS: HeatmapTotals = {
  totalRisks: 42,
  criticalCount: 7,
  highCount: 11,
  mediumCount: 14,
  lowCount: 10,
  treatmentProgress: 64,
};

export const DEMO_TREATMENT_PLANS: TreatmentPlan[] = [
  {
    id: 1,
    riskId: 101,
    riskTitle: "Ransomware on critical file server",
    strategy: "mitigate",
    status: "in-progress",
    owner: "A. Chen",
    dueDate: new Date(Date.now() + 14 * 86400_000).toISOString(),
    likelihood: 5,
    impact: 5,
  },
  {
    id: 2,
    riskId: 102,
    riskTitle: "Unpatched edge firewall CVEs",
    strategy: "mitigate",
    status: "open",
    owner: "Ops Team",
    dueDate: new Date(Date.now() + 7 * 86400_000).toISOString(),
    likelihood: 4,
    impact: 5,
  },
  {
    id: 3,
    riskId: 103,
    riskTitle: "Cloud IAM keys over-privileged",
    strategy: "mitigate",
    status: "mitigated",
    owner: "S. Patel",
    dueDate: new Date(Date.now() - 3 * 86400_000).toISOString(),
    likelihood: 4,
    impact: 4,
  },
  {
    id: 4,
    riskId: 104,
    riskTitle: "Vendor data processor outage (accepted)",
    strategy: "accept",
    status: "accepted",
    owner: "Risk Council",
    dueDate: null,
    likelihood: 3,
    impact: 4,
  },
  {
    id: 5,
    riskId: 105,
    riskTitle: "Phishing susceptibility of staff",
    strategy: "mitigate",
    status: "in-progress",
    owner: "HR / Security",
    dueDate: new Date(Date.now() + 30 * 86400_000).toISOString(),
    likelihood: 3,
    impact: 3,
  },
];

export function buildDemoHeatmapData(): RiskHeatmapData {
  return {
    matrix: DEMO_MATRIX,
    totals: DEMO_TOTALS,
    updatedAt: new Date().toISOString(),
  };
}
