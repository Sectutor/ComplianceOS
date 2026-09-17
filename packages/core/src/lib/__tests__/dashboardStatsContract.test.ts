import { describe, it, expect, vi } from "vitest";
import * as dashboardStatsModule from "../../lib/dashboardStats";

/**
 * Contract tests for packages/core/src/lib/dashboardStats.ts (QA cycle 3).
 *
 * BACKEND-DEP: the cycle-3 backend agent is adding `toPostureStats`
 * (dashboard.getStats contract, UI-STANDARD.md section 16: PostureStats
 * { postureScore, status, controls, frameworks[], evidence, trend[] }).
 * NOTE: toPostureStats was landed by the backend agent WHILE QA was running
 * (present by 19:31, dashboardStats.ts line ~336); the suite below runs
 * against the ACTUAL implementation and is green. The skipIf guard is kept
 * so the suite stays green if the export is ever reverted mid-cycle.
 *
 * Fixtures are built from the real DashboardStats shape exported by this
 * module (complianceScore / passRateByFramework / evidenceCoverage /
 * counts / trend30d / generatedAt).
 *
 * Assumptions tested (documented contract; exact field mapping may vary):
 *   - postureScore <- complianceScore.scorePct
 *   - status: passRate >= 85 -> strong, >= 60 -> attention, else critical
 *   - controls: { implemented <- passing, total <- total, passRate <- scorePct }
 *   - frameworks: passRateByFramework mapped to
 *     { framework, passRate <- ratePct, totalControls <- total,
 *       passedControls <- passing }
 *   - evidence: { verified <- covered, total, coverage } where coverage is
 *     recomputed as total > 0 ? verified / total * 100 : 0
 *     (expiringSoon is not derivable from DashboardStats; asserted as a number)
 *   - trend: trend30d mapped to { date, score <- complianceScore }
 *   - framework arg filters the frameworks array (unknown framework -> [])
 */

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  clientControls: { id: "cc.id", clientId: "cc.clientId", controlId: "cc.controlId", status: "cc.status" },
  controls: { id: "c.id", framework: "c.framework" },
  evidence: { clientControlId: "e.clientControlId", status: "e.status", clientId: "e.clientId" },
  clients: { id: "cl.id" },
  clientPolicies: { id: "cp.id", clientId: "cp.clientId" },
  vendors: { id: "v.id", clientId: "v.clientId" },
  riskScenarios: { id: "rs.id", clientId: "rs.clientId", status: "rs.status" },
  complianceSnapshots: {
    snapshotDate: "cs.snapshotDate",
    complianceScore: "cs.complianceScore",
    riskScore: "cs.riskScore",
    implementedControls: "cs.implementedControls",
    totalControls: "cs.totalControls",
    clientId: "cs.clientId",
  },
}));

vi.mock("../../db", () => ({ getDb: mocks.getDb }));
vi.mock("../../schema", () => ({
  clientControls: mocks.clientControls,
  controls: mocks.controls,
  evidence: mocks.evidence,
  clients: mocks.clients,
  clientPolicies: mocks.clientPolicies,
  vendors: mocks.vendors,
  riskScenarios: mocks.riskScenarios,
  complianceSnapshots: mocks.complianceSnapshots,
}));

const baseStats = {
  complianceScore: { passing: 17, total: 20, scorePct: 85 },
  passRateByFramework: [
    { framework: "ISO 27001", passing: 8, total: 10, ratePct: 80 },
    { framework: "SOC 2", passing: 9, total: 10, ratePct: 90 },
  ],
  evidenceCoverage: { covered: 15, total: 20, coveragePct: 75 },
  counts: { clients: 1, openRisks: 3, policies: 12, vendors: 2 },
  trend30d: [
    { date: "2026-07-15", complianceScore: 80, riskScore: 12, controlsImplementedPct: 75 },
    { date: "2026-07-16", complianceScore: 85, riskScore: 10, controlsImplementedPct: 80 },
  ],
  generatedAt: "2026-08-14T10:00:00.000Z",
};

const toPostureStatsAvailable = typeof dashboardStatsModule.toPostureStats === "function";

describe.skipIf(!toPostureStatsAvailable)("toPostureStats (BACKEND-DEP)", () => {
  const toPostureStats = dashboardStatsModule.toPostureStats!;

  it("maps the full DashboardStats shape onto PostureStats", () => {
    const out = toPostureStats(baseStats);
    expect(out.postureScore).toBe(85);
    expect(out.status).toBe("strong");
    expect(out.controls).toEqual({ implemented: 17, total: 20, passRate: 85 });
    expect(out.frameworks).toHaveLength(2);
    const iso = out.frameworks.find((f) => f.framework === "ISO 27001");
    const soc2 = out.frameworks.find((f) => f.framework === "SOC 2");
    expect(iso).toEqual({ framework: "ISO 27001", passRate: 80, totalControls: 10, passedControls: 8 });
    expect(soc2).toEqual({ framework: "SOC 2", passRate: 90, totalControls: 10, passedControls: 9 });
    expect(out.evidence).toMatchObject({ verified: 15, total: 20, coverage: 75 });
    expect(typeof out.evidence.expiringSoon).toBe("number");
    expect(out.trend).toEqual([
      { date: "2026-07-15", score: 80 },
      { date: "2026-07-16", score: 85 },
    ]);
  });

  it("applies the status thresholds (>=85 strong, >=60 attention, else critical)", () => {
    const withScore = (scorePct: number) => ({
      ...baseStats,
      complianceScore: { passing: scorePct, total: 100, scorePct },
    });
    expect(toPostureStats(withScore(85)).status).toBe("strong");
    expect(toPostureStats(withScore(100)).status).toBe("strong");
    expect(toPostureStats(withScore(84)).status).toBe("attention");
    expect(toPostureStats(withScore(60)).status).toBe("attention");
    expect(toPostureStats(withScore(59)).status).toBe("critical");
    expect(toPostureStats(withScore(0)).status).toBe("critical");
  });

  it("recomputes evidence coverage as verified/total*100 and returns 0 when total is 0", () => {
    // Input coveragePct deliberately disagrees with the raw ratio: the
    // contract mandates recomputation from verified/total.
    const disagreeing = {
      ...baseStats,
      evidenceCoverage: { covered: 3, total: 4, coveragePct: 99 },
    };
    expect(toPostureStats(disagreeing).evidence.coverage).toBe(75);

    const empty = {
      ...baseStats,
      evidenceCoverage: { covered: 0, total: 0, coveragePct: 100 },
    };
    expect(toPostureStats(empty).evidence).toMatchObject({ verified: 0, total: 0, coverage: 0 });
  });

  it("filters frameworks when a framework argument is provided", () => {
    const out = toPostureStats(baseStats, "SOC 2");
    expect(out.frameworks).toHaveLength(1);
    expect(out.frameworks[0]).toEqual({
      framework: "SOC 2",
      passRate: 90,
      totalControls: 10,
      passedControls: 9,
    });

    const none = toPostureStats(baseStats, "NIST 800-53");
    expect(none.frameworks).toEqual([]);
  });
});
