/**
 * Dashboard posture summary — data contract + hooks
 * =================================================
 * UI-side typed view of the `dashboard.getStats` tRPC procedure the backend
 * agent is adding to `packages/core/src/server/routers/dashboard.ts`
 * (namespace `dashboard:` on the AppRouter).
 *
 * COORDINATION BY CONVENTION — backend implements this exact shape. Until it
 * is live the call 404s and the UI falls back to metrics derived from the
 * existing `dashboard.enhanced` + `dashboard.complianceScores` payloads.
 *
 * ---------------------------------------------------------------------------
 * Expected procedure:
 *
 * 1) dashboard.getStats
 *    input:  { clientId?: string | number; framework?: string }
 *    output: PostureStats (see below)
 * ---------------------------------------------------------------------------
 */

import { trpc } from "@/lib/trpc";

/* ------------------------------------------------------------------ */
/* Types (mirror the backend contract 1:1)                            */
/* ------------------------------------------------------------------ */

export interface PostureFrameworkStat {
  framework: string;
  /** 0..100 */
  passRate: number;
  totalControls: number;
  passedControls: number;
}

export interface PostureEvidenceStat {
  verified: number;
  total: number;
  /** 0..100 */
  coverage: number;
  expiringSoon: number;
}

export interface PostureTrendPoint {
  date: string;
  score: number;
}

export interface PostureControlsStat {
  implemented: number;
  total: number;
  /** 0..100 */
  passRate: number;
}

export type PostureStatus = "strong" | "attention" | "critical";

export interface PostureStats {
  /** 0..100 overall posture score */
  postureScore: number;
  status: PostureStatus;
  controls: PostureControlsStat;
  frameworks: PostureFrameworkStat[];
  evidence: PostureEvidenceStat;
  trend: PostureTrendPoint[];
}

interface DashboardStatsTrpc {
  dashboard: {
    getStats: {
      useQuery: (
        input: { clientId?: string | number; framework?: string },
        opts?: { enabled?: boolean; retry?: boolean | number; staleTime?: number }
      ) => {
        data?: PostureStats;
        isLoading: boolean;
        isError: boolean;
        error?: unknown;
        refetch: () => unknown;
      };
    };
  };
}

const dashboardStatsApi = trpc as unknown as DashboardStatsTrpc;

export function useDashboardStats(clientId?: string | number, framework?: string, enabled = true) {
  return dashboardStatsApi.dashboard.getStats.useQuery(
    { clientId: clientId ?? undefined, framework: framework ?? undefined },
    { enabled, retry: false, staleTime: 60_000 }
  );
}

/* ------------------------------------------------------------------ */
/* Fallback derivation from existing endpoints (no new backend needed) */
/* ------------------------------------------------------------------ */

function clamp100(value: number) {
  if (!isFinite(value) || value <= 0) return 0;
  return Math.min(100, Math.round(value));
}

export function derivePostureStats(
  enhancedStats: any,
  complianceScores: Array<{ date?: string; score?: number }> | undefined
): PostureStats | null {
  const status = enhancedStats?.controlsByStatus;
  const eStatus = enhancedStats?.evidenceByStatus;
  const frameworks = enhancedStats?.controlsByFramework;
  const overview = enhancedStats?.overview;

  const implemented = Number(status?.implemented ?? overview?.controlsImplemented ?? 0);
  const inProgress = Number(status?.inProgress ?? overview?.controlsInProgress ?? 0);
  const notStarted = Number(status?.notStarted ?? overview?.controlsNotStarted ?? 0);
  const totalControls = implemented + inProgress + notStarted;

  const verified = Number(eStatus?.verified ?? 0);
  const evidenceTotal = verified + Number(eStatus?.collected ?? 0) + Number(eStatus?.pending ?? 0) + Number(eStatus?.expired ?? 0);

  const postureScore = clamp100(totalControls > 0 ? (implemented / totalControls) * 100 : 0);
  const statusTone: PostureStatus = postureScore >= 80 ? "strong" : postureScore >= 50 ? "attention" : "critical";

  const frameworkStats: PostureFrameworkStat[] = Object.entries(frameworks ?? {}).map(([framework, count]) => ({
    framework,
    // Per-framework pass rate is not in `enhanced`; show share of total controls instead.
    passRate: clamp100(totalControls > 0 ? (Number(count) / totalControls) * 100 : 0),
    totalControls: Number(count),
    passedControls: 0,
  }));

  return {
    postureScore,
    status: statusTone,
    controls: { implemented, total: totalControls, passRate: postureScore },
    frameworks: frameworkStats,
    evidence: {
      verified,
      total: evidenceTotal,
      coverage: clamp100(evidenceTotal > 0 ? (verified / evidenceTotal) * 100 : 0),
      expiringSoon: 0,
    },
    trend: (complianceScores ?? [])
      .filter((p) => typeof p?.score === "number")
      .map((p) => ({ date: String(p.date ?? ""), score: Number(p.score) })),
  };
}

/** Empty shell used before any data arrives (avoids "–" flashes). */
export function emptyPostureStats(): PostureStats {
  return {
    postureScore: 0,
    status: "attention",
    controls: { implemented: 0, total: 0, passRate: 0 },
    frameworks: [],
    evidence: { verified: 0, total: 0, coverage: 0, expiringSoon: 0 },
    trend: [],
  };
}
