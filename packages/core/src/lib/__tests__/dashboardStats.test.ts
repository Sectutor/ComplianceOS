import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * dashboardStats tests — fully mocked DB, no live connection.
 *
 * Follows the controlAutoTestEngine.test.ts pattern (chainable thenable db
 * builder + vi.mock of ../../db and ../../schema).
 */

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  clientControls: {
    id: "cc.id",
    clientId: "cc.clientId",
    controlId: "cc.controlId",
    status: "cc.status",
  },
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

type Stats = typeof import("../dashboardStats");
let stats: Stats;

const CHAIN_METHODS = ["select", "from", "where", "orderBy", "limit", "execute"] as const;

function makeDb() {
  const queue: unknown[] = [];
  const calls: Record<string, unknown[][]> = {};
  for (const name of CHAIN_METHODS) calls[name] = [];

  function makeChain(): any {
    const chain: any = {};
    for (const name of CHAIN_METHODS) {
      chain[name] = vi.fn((...args: unknown[]) => {
        calls[name].push(args);
        return makeChain();
      });
    }
    chain.then = (onFulfilled?: (value: unknown) => unknown, onRejected?: (reason?: unknown) => unknown) => {
      const entry = queue.shift();
      const promise =
        entry && typeof entry === "object" && "__reject" in entry
          ? Promise.reject((entry as { __reject: unknown }).__reject)
          : Promise.resolve(entry);
      return promise.then(onFulfilled, onRejected);
    };
    return chain;
  }

  const db = makeChain();
  delete db.then;
  return { db, queue, calls };
}

function rejectQueue(err: Error) {
  return { __reject: err };
}

beforeEach(async () => {
  vi.resetModules();
  stats = await import("../dashboardStats");
  mocks.getDb.mockReset();
});

afterEach(() => {});

// ---------------------------------------------------------------------------
// Pure: computeComplianceScore
// ---------------------------------------------------------------------------

describe("computeComplianceScore", () => {
  it("computes implemented / applicable percentage", () => {
    const rows = [
      { id: 1, controlId: 1, status: "implemented" },
      { id: 2, controlId: 2, status: "implemented" },
      { id: 3, controlId: 3, status: "in_progress" },
      { id: 4, controlId: 4, status: "not_implemented" },
      { id: 5, controlId: 5, status: "not_applicable" },
    ];
    expect(stats.computeComplianceScore(rows)).toEqual({ passing: 2, total: 4, scorePct: 50 });
  });

  it("returns 0 for an empty set", () => {
    expect(stats.computeComplianceScore([])).toEqual({ passing: 0, total: 0, scorePct: 0 });
  });
});

// ---------------------------------------------------------------------------
// Pure: computePassRateByFramework
// ---------------------------------------------------------------------------

describe("computePassRateByFramework", () => {
  it("groups pass rate by master-control framework", () => {
    const controlRows = [
      { id: 1, controlId: 10, status: "implemented" },
      { id: 2, controlId: 10, status: "implemented" },
      { id: 3, controlId: 11, status: "not_implemented" },
      { id: 4, controlId: 12, status: "implemented" },
      { id: 5, controlId: 13, status: "not_applicable" },
    ];
    const masterRows = [
      { id: 10, framework: "SOC 2" },
      { id: 11, framework: "SOC 2" },
      { id: 12, framework: "ISO 27001" },
      { id: 13, framework: "ISO 27001" },
    ];
    const result = stats.computePassRateByFramework(controlRows, masterRows);
    const soc2 = result.find((r) => r.framework === "SOC 2")!;
    expect(soc2).toEqual({ framework: "SOC 2", passing: 2, total: 3, ratePct: 67 });
    const iso = result.find((r) => r.framework === "ISO 27001")!;
    expect(iso).toEqual({ framework: "ISO 27001", passing: 1, total: 1, ratePct: 100 });
    expect(result.length).toBe(2);
  });

  it("falls back to Unmapped for controls without a master row and sorts by total desc", () => {
    const result = stats.computePassRateByFramework(
      [
        { id: 1, controlId: 1, status: "implemented" },
        { id: 2, controlId: 2, status: "implemented" },
        { id: 3, controlId: 3, status: "not_implemented" },
      ],
      []
    );
    expect(result).toHaveLength(1);
    expect(result[0].framework).toBe("Unmapped");
    expect(result[0].total).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// Pure: computeEvidenceCoverage
// ---------------------------------------------------------------------------

describe("computeEvidenceCoverage", () => {
  it("counts distinct controls with collected/verified evidence", () => {
    const controlRows = [
      { id: 1, controlId: 1, status: "implemented" },
      { id: 2, controlId: 2, status: "implemented" },
      { id: 3, controlId: 3, status: "not_implemented" },
      { id: 4, controlId: 4, status: "not_applicable" },
    ];
    const evidenceRows = [
      { clientControlId: 1, status: "verified" },
      { clientControlId: 1, status: "collected" }, // duplicate — still 1 covered
      { clientControlId: 3, status: "pending" },
      { clientControlId: 2, status: "expired" },
    ];
    const result = stats.computeEvidenceCoverage(controlRows, evidenceRows);
    expect(result).toEqual({ covered: 1, total: 3, coveragePct: 33 });
  });

  it("returns 0 coverage when there are no controls", () => {
    expect(stats.computeEvidenceCoverage([], [])).toEqual({ covered: 0, total: 0, coveragePct: 0 });
  });
});

// ---------------------------------------------------------------------------
// Pure: computeTrend
// ---------------------------------------------------------------------------

describe("computeTrend", () => {
  it("filters to the last N days, sorts ascending and formats dates", () => {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    const snapshots = [
      { snapshotDate: new Date(now - 40 * day), complianceScore: 10, riskScore: 90, implementedControls: 1, totalControls: 10 },
      { snapshotDate: new Date(now - 10 * day), complianceScore: 60, riskScore: 40, implementedControls: 6, totalControls: 10 },
      { snapshotDate: new Date(now - 5 * day), complianceScore: 80, riskScore: 20, implementedControls: 8, totalControls: 10 },
    ];
    const trend = stats.computeTrend(snapshots, 30);
    expect(trend).toHaveLength(2);
    expect(trend[0].complianceScore).toBe(60);
    expect(trend[1].complianceScore).toBe(80);
    expect(trend[1].controlsImplementedPct).toBe(80);
    expect(trend[0].date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("handles null snapshot metrics", () => {
    const trend = stats.computeTrend([
      { snapshotDate: new Date(), complianceScore: null, riskScore: null, implementedControls: null, totalControls: null },
    ]);
    expect(trend[0]).toMatchObject({ complianceScore: 0, riskScore: 0, controlsImplementedPct: 0 });
  });
});

// ---------------------------------------------------------------------------
// Pure: aggregateDashboardStats
// ---------------------------------------------------------------------------

describe("aggregateDashboardStats", () => {
  it("composes the full stats object", () => {
    const result = stats.aggregateDashboardStats({
      controlRows: [
        { id: 1, controlId: 10, status: "implemented" },
        { id: 2, controlId: 11, status: "not_implemented" },
      ],
      masterRows: [{ id: 10, framework: "SOC 2" }],
      evidenceRows: [{ clientControlId: 1, status: "verified" }],
      snapshotRows: [],
      counts: { clients: 3, openRisks: 4, policies: 5, vendors: 6 },
    });
    expect(result.complianceScore.scorePct).toBe(50);
    expect(result.passRateByFramework).toHaveLength(2);
    expect(result.evidenceCoverage).toEqual({ covered: 1, total: 2, coveragePct: 50 });
    expect(result.counts).toEqual({ clients: 3, openRisks: 4, policies: 5, vendors: 6 });
    expect(result.trend30d).toEqual([]);
    expect(result.generatedAt).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// DB-backed: loadDashboardStats
// ---------------------------------------------------------------------------

describe("loadDashboardStats", () => {
  it("loads and aggregates all dashboard metrics", async () => {
    const { db, queue, calls } = makeDb();
    const now = Date.now();
    queue.push([
      { id: 1, controlId: 10, status: "implemented" },
      { id: 2, controlId: 11, status: "not_implemented" },
      { id: 3, controlId: 12, status: "not_applicable" },
    ]);
    queue.push([
      { id: 10, framework: "SOC 2" },
      { id: 11, framework: "SOC 2" },
      { id: 12, framework: "ISO 27001" },
    ]);
    queue.push([
      { clientControlId: 1, status: "verified" },
      { clientControlId: 2, status: "pending" },
    ]);
    queue.push([{ value: 4 }]); // clients
    queue.push([{ value: 9 }]); // policies
    queue.push([{ value: 6 }]); // vendors
    queue.push([{ value: 2 }]); // open risks
    queue.push([
      {
        snapshotDate: new Date(now - 3 * 24 * 60 * 60 * 1000),
        complianceScore: 50,
        riskScore: 50,
        implementedControls: 1,
        totalControls: 2,
      },
    ]);
    mocks.getDb.mockResolvedValue(db);

    const result = await stats.loadDashboardStats();

    expect(mocks.getDb).toHaveBeenCalledTimes(1);
    expect(calls.from[0][0]).toBe(mocks.clientControls);
    expect(calls.from[1][0]).toBe(mocks.controls);
    expect(calls.from[2][0]).toBe(mocks.evidence);
    expect(calls.from[3][0]).toBe(mocks.clients);
    expect(calls.from[4][0]).toBe(mocks.clientPolicies);
    expect(calls.from[5][0]).toBe(mocks.vendors);
    expect(calls.from[6][0]).toBe(mocks.riskScenarios);
    expect(calls.from[7][0]).toBe(mocks.complianceSnapshots);

    expect(result.complianceScore).toEqual({ passing: 1, total: 2, scorePct: 50 });
    expect(result.passRateByFramework.find((r) => r.framework === "SOC 2")).toEqual({
      framework: "SOC 2",
      passing: 1,
      total: 2,
      ratePct: 50,
    });
    expect(result.evidenceCoverage).toEqual({ covered: 1, total: 2, coveragePct: 50 });
    expect(result.counts).toEqual({ clients: 4, openRisks: 2, policies: 9, vendors: 6 });
    expect(result.trend30d).toHaveLength(1);
    expect(result.trend30d[0].complianceScore).toBe(50);
  });

  it("scopes rows to a client when clientId is provided", async () => {
    const { db, queue } = makeDb();
    queue.push([]); // clientControls
    queue.push([]); // controls
    queue.push([]); // evidence
    queue.push([{ value: 1 }]);
    queue.push([{ value: 1 }]);
    queue.push([{ value: 1 }]);
    queue.push([{ value: 1 }]);
    queue.push([]); // snapshots
    mocks.getDb.mockResolvedValue(db);

    const result = await stats.loadDashboardStats({ clientId: 7 });

    expect(result.counts.clients).toBe(1);
    // The clientControls query received a where clause (eq on clientId)
    expect(result.trend30d).toEqual([]);
  });

  it("propagates db failures", async () => {
    const { db, queue } = makeDb();
    queue.push(rejectQueue(new Error("connection lost")));
    mocks.getDb.mockResolvedValue(db);

    await expect(stats.loadDashboardStats()).rejects.toThrow("connection lost");
  });
});
