import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * riskHeatmap tests — fully mocked DB, no live connection.
 *
 * Follows the controlAutoTestEngine.test.ts pattern: vi.mock the `../../db`
 * (getDb) and `../../schema` modules with stubbed tables, use a chainable
 * thenable db builder whose queue controls resolved rows, and reset modules in
 * beforeEach so each test gets a fresh module.
 */

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  riskAssessments: {
    id: "ra.id",
    clientId: "ra.clientId",
    likelihood: "ra.likelihood",
    impact: "ra.impact",
    inherentScore: "ra.inherentScore",
    residualScore: "ra.residualScore",
    residualRisk: "ra.residualRisk",
    inherentRisk: "ra.inherentRisk",
    title: "ra.title",
    assessmentId: "ra.assessmentId",
  },
  riskTreatments: {
    id: "rt.id",
    clientId: "rt.clientId",
    riskAssessmentId: "rt.riskAssessmentId",
    status: "rt.status",
    dueDate: "rt.dueDate",
    priority: "rt.priority",
    strategy: "rt.strategy",
    updatedAt: "rt.updatedAt",
  },
}));

vi.mock("../../db", () => ({ getDb: mocks.getDb }));
vi.mock("../../schema", () => ({
  riskAssessments: mocks.riskAssessments,
  riskTreatments: mocks.riskTreatments,
}));

type Heatmap = typeof import("../riskHeatmap");
let heatmap: Heatmap;

const CHAIN_METHODS = [
  "select",
  "from",
  "innerJoin",
  "where",
  "orderBy",
  "limit",
  "insert",
  "values",
  "update",
  "set",
  "returning",
  "execute",
] as const;

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
  heatmap = await import("../riskHeatmap");
  mocks.getDb.mockReset();
});

afterEach(() => {});

// ---------------------------------------------------------------------------
// Pure: buildHeatmapMatrix
// ---------------------------------------------------------------------------

describe("buildHeatmapMatrix", () => {
  it("buckets inherent likelihood x impact into 5x5 cells with counts and riskIds", () => {
    const assessments = [
      { id: 1, likelihood: "4", impact: "3" },
      { id: 2, likelihood: "4", impact: 3 },
      { id: 3, likelihood: 5, impact: 5 },
      { id: 4, likelihood: "2", impact: "4" },
      { id: 5, likelihood: "4", impact: "3" },
    ];
    const matrix = heatmap.buildHeatmapMatrix(assessments, "inherent");

    expect(matrix).toHaveLength(3);
    const cell43 = matrix.find((c) => c.likelihood === 4 && c.impact === 3)!;
    expect(cell43.count).toBe(3);
    expect(cell43.riskIds).toEqual([1, 2, 5]);
    expect(cell43.score).toBe(12);
    expect(cell43.level).toBe("High");

    const cell55 = matrix.find((c) => c.likelihood === 5 && c.impact === 5)!;
    expect(cell55.count).toBe(1);
    expect(cell55.level).toBe("Critical");

    const cell24 = matrix.find((c) => c.likelihood === 2 && c.impact === 4)!;
    expect(cell24.level).toBe("Medium");
  });

  it("skips assessments with missing or non-numeric likelihood/impact", () => {
    const matrix = heatmap.buildHeatmapMatrix(
      [
        { id: 1, likelihood: null, impact: "3" },
        { id: 2, likelihood: "", impact: "2" },
        { id: 3, likelihood: "abc", impact: "2" },
        { id: 4, likelihood: "3", impact: "2" },
      ],
      "inherent"
    );
    expect(matrix).toHaveLength(1);
    expect(matrix[0].count).toBe(1);
  });

  it("clamps out-of-range values to 1-5", () => {
    const matrix = heatmap.buildHeatmapMatrix(
      [{ id: 1, likelihood: "9", impact: "-3" }],
      "inherent"
    );
    expect(matrix[0].likelihood).toBe(5);
    expect(matrix[0].impact).toBe(1);
  });

  it("places residual risks along the diagonal from residualScore", () => {
    const matrix = heatmap.buildHeatmapMatrix(
      [
        { id: 1, residualScore: 25 },
        { id: 2, residualScore: 10 },
        { id: 3, residualScore: 3 },
        { id: 4, residualScore: null },
      ],
      "residual"
    );
    expect(matrix).toHaveLength(3);
    const cell55 = matrix.find((c) => c.likelihood === 5 && c.impact === 5)!;
    expect(cell55.riskIds).toEqual([1]);
    const diag10 = matrix.find((c) => c.likelihood === 3 && c.impact === 3)!;
    expect(diag10.riskIds).toEqual([2]);
    const diag3 = matrix.find((c) => c.likelihood === 1 && c.impact === 1)!;
    expect(diag3.riskIds).toEqual([3]);
  });

  it("sorts cells deterministically by likelihood then impact", () => {
    const matrix = heatmap.buildHeatmapMatrix(
      [
        { id: 1, likelihood: "5", impact: "1" },
        { id: 2, likelihood: "1", impact: "5" },
        { id: 3, likelihood: "1", impact: "1" },
      ],
      "inherent"
    );
    expect(matrix.map((c) => `${c.likelihood}-${c.impact}`)).toEqual(["1-1", "1-5", "5-1"]);
  });
});

describe("residualScoreToScale", () => {
  it("maps 1-25 scores onto the 5-scale using UI thresholds", () => {
    expect(heatmap.residualScoreToScale(25)).toBe(5);
    expect(heatmap.residualScoreToScale(20)).toBe(5);
    expect(heatmap.residualScoreToScale(19)).toBe(4);
    expect(heatmap.residualScoreToScale(12)).toBe(4);
    expect(heatmap.residualScoreToScale(11)).toBe(3);
    expect(heatmap.residualScoreToScale(8)).toBe(3);
    expect(heatmap.residualScoreToScale(7)).toBe(2);
    expect(heatmap.residualScoreToScale(4)).toBe(2);
    expect(heatmap.residualScoreToScale(3)).toBe(1);
    expect(heatmap.residualScoreToScale(null)).toBe(0);
    expect(heatmap.residualScoreToScale(undefined)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Pure: summarizeHeatmap / aggregateTreatmentStatuses
// ---------------------------------------------------------------------------

describe("summarizeHeatmap", () => {
  it("counts risks per UI colour band", () => {
    const matrix = heatmap.buildHeatmapMatrix(
      [
        { id: 1, likelihood: "5", impact: "5" }, // 25 critical
        { id: 2, likelihood: "4", impact: "3" }, // 12 high
        { id: 3, likelihood: "2", impact: "2" }, // 4 medium
        { id: 4, likelihood: "1", impact: "1" }, // 1 low
        { id: 5, likelihood: "5", impact: "5" }, // 25 critical
      ],
      "inherent"
    );
    const summary = heatmap.summarizeHeatmap(matrix);
    expect(summary.totalAssessments).toBe(5);
    expect(summary.critical).toBe(2);
    expect(summary.high).toBe(1);
    expect(summary.medium).toBe(1);
    expect(summary.low).toBe(1);
  });

  it("returns zeroed totals for an empty matrix", () => {
    const summary = heatmap.summarizeHeatmap([]);
    expect(summary).toEqual({ totalAssessments: 0, critical: 0, high: 0, medium: 0, low: 0 });
  });
});

describe("aggregateTreatmentStatuses", () => {
  it("groups treatments by status and computes progress", () => {
    const { treatmentsByStatus, treatmentProgressPct } = heatmap.aggregateTreatmentStatuses([
      { status: "planned" },
      { status: "in_progress" },
      { status: "implemented" },
      { status: "verified" },
      { status: "completed" },
      { status: null },
    ]);
    expect(treatmentsByStatus).toEqual({
      planned: 2, // { status: null } defaults to planned
      in_progress: 1,
      implemented: 1,
      verified: 1,
      completed: 1,
    });
    // implemented + verified + completed = 3 of 6
    expect(treatmentProgressPct).toBe(50);
  });

  it("returns 0% progress for no treatments", () => {
    expect(heatmap.aggregateTreatmentStatuses([]).treatmentProgressPct).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Pure: treatment status transitions
// ---------------------------------------------------------------------------

describe("canTransitionTreatment", () => {
  it("allows forward transitions along the lifecycle", () => {
    expect(heatmap.canTransitionTreatment("planned", "in_progress").allowed).toBe(true);
    expect(heatmap.canTransitionTreatment("in_progress", "implemented").allowed).toBe(true);
    expect(heatmap.canTransitionTreatment("in_progress", "verified").allowed).toBe(true);
    expect(heatmap.canTransitionTreatment("implemented", "verified").allowed).toBe(true);
  });

  it("treats completed as a terminal alias", () => {
    expect(heatmap.canTransitionTreatment("implemented", "completed").allowed).toBe(true);
    expect(heatmap.canTransitionTreatment("completed", "verified").allowed).toBe(true);
    expect(heatmap.canTransitionTreatment("completed", "implemented").allowed).toBe(false);
  });

  it("rejects backwards and arbitrary jumps", () => {
    expect(heatmap.canTransitionTreatment("verified", "planned").allowed).toBe(false);
    expect(heatmap.canTransitionTreatment("implemented", "planned").allowed).toBe(false);
    expect(heatmap.canTransitionTreatment("planned", "verified").allowed).toBe(false);
    expect(heatmap.canTransitionTreatment("planned", "implemented").allowed).toBe(false);
  });

  it("allows same-status no-ops", () => {
    expect(heatmap.canTransitionTreatment("planned", "planned").allowed).toBe(true);
    expect(heatmap.canTransitionTreatment(null, "planned").allowed).toBe(true);
  });

  it("rejects unknown statuses with a reason", () => {
    const res = heatmap.canTransitionTreatment("nonsense", "planned");
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain("Unknown current status");
    expect(heatmap.canTransitionTreatment("planned", "nonsense").allowed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// DB-backed: loadRiskHeatmap
// ---------------------------------------------------------------------------

describe("loadRiskHeatmap", () => {
  it("loads assessments + treatments and returns matrix, summary and rows", async () => {
    const { db, queue, calls } = makeDb();
    queue.push([
      { id: 1, likelihood: "5", impact: "5", residualScore: 25, title: "R1" },
      { id: 2, likelihood: "2", impact: "3", residualScore: 6, title: "R2" },
    ]);
    queue.push([
      { id: 11, status: "planned" },
      { id: 12, status: "implemented" },
      { id: 13, status: "verified" },
    ]);
    mocks.getDb.mockResolvedValue(db);

    const result = await heatmap.loadRiskHeatmap(7, "inherent");

    expect(mocks.getDb).toHaveBeenCalledTimes(1);
    expect(calls.from[0][0]).toBe(mocks.riskAssessments);
    expect(calls.where).toHaveLength(2); // assessments + treatments queries
    expect(calls.from[1][0]).toBe(mocks.riskTreatments);
    expect(calls.innerJoin[0][0]).toBe(mocks.riskAssessments);

    expect(result.type).toBe("inherent");
    expect(result.assessments).toHaveLength(2);
    expect(result.matrix).toHaveLength(2);
    const critical = result.matrix.find((c) => c.likelihood === 5 && c.impact === 5)!;
    expect(critical.count).toBe(1);
    expect(result.summary.totalAssessments).toBe(2);
    expect(result.summary.critical).toBe(1);
    expect(result.summary.high).toBe(0);
    expect(result.summary.treatmentsByStatus).toEqual({ planned: 1, implemented: 1, verified: 1 });
    expect(result.summary.treatmentProgressPct).toBe(67); // 2 of 3
  });

  it("supports residual heat maps and empty data", async () => {
    const { db, queue } = makeDb();
    queue.push([]);
    queue.push([]);
    mocks.getDb.mockResolvedValue(db);

    const result = await heatmap.loadRiskHeatmap(7, "residual");

    expect(result.matrix).toEqual([]);
    expect(result.summary.totalAssessments).toBe(0);
    expect(result.summary.treatmentProgressPct).toBe(0);
  });

  it("propagates db failures as thrown errors", async () => {
    const { db, queue } = makeDb();
    queue.push(rejectQueue(new Error("db down")));
    mocks.getDb.mockResolvedValue(db);

    await expect(heatmap.loadRiskHeatmap(7)).rejects.toThrow("db down");
  });
});

describe("loadTreatmentSummary", () => {
  it("returns total, breakdown and progress", async () => {
    const { db, queue } = makeDb();
    queue.push([
      { id: 1, status: "planned" },
      { id: 2, status: "in_progress" },
      { id: 3, status: "implemented" },
    ]);
    mocks.getDb.mockResolvedValue(db);

    const summary = await heatmap.loadTreatmentSummary(7);
    expect(summary.total).toBe(3);
    expect(summary.treatmentsByStatus).toEqual({ planned: 1, in_progress: 1, implemented: 1 });
    expect(summary.treatmentProgressPct).toBe(33);
  });
});

describe("updateTreatmentStatus", () => {
  it("updates status when transition is allowed and ownership matches", async () => {
    const { db, queue, calls } = makeDb();
    queue.push([{ id: 5, clientId: 7, status: "planned" }]); // treatment select
    queue.push([{ clientId: 7 }]); // owner check
    queue.push([{ id: 5, status: "in_progress" }]); // update returning
    mocks.getDb.mockResolvedValue(db);

    const result = await heatmap.updateTreatmentStatus(5, 7, "in_progress");

    expect(result).toEqual({ id: 5, status: "in_progress", allowed: true });
    expect(calls.update[0][0]).toBe(mocks.riskTreatments);
    expect(calls.set[0][0]).toMatchObject({ status: "in_progress" });
    expect(calls.set[0][0].updatedAt).toBeInstanceOf(Date);
  });

  it("resolves clientId through the linked assessment when treatment.clientId is null", async () => {
    const { db, queue, calls } = makeDb();
    queue.push([{ id: 5, clientId: null, status: "planned" }]);
    queue.push([{ clientId: 7 }]);
    queue.push([{ id: 5, status: "in_progress" }]);
    mocks.getDb.mockResolvedValue(db);

    const result = await heatmap.updateTreatmentStatus(5, 7, "in_progress");
    expect(result.allowed).toBe(true);
    expect(calls.update).toHaveLength(1);
  });

  it("rejects a backwards transition without touching the db", async () => {
    const { db, queue, calls } = makeDb();
    queue.push([{ id: 5, clientId: 7, status: "verified" }]);
    queue.push([{ clientId: 7 }]);
    mocks.getDb.mockResolvedValue(db);

    const result = await heatmap.updateTreatmentStatus(5, 7, "planned");
    expect(result).toEqual({ id: 5, status: "verified", allowed: false });
    expect(calls.update).toHaveLength(0);
  });

  it("throws when the treatment does not belong to the client", async () => {
    const { db, queue } = makeDb();
    queue.push([{ id: 5, clientId: 9, status: "planned" }]);
    queue.push([{ clientId: 9 }]);
    mocks.getDb.mockResolvedValue(db);

    await expect(heatmap.updateTreatmentStatus(5, 7, "in_progress")).rejects.toThrow(
      "does not belong to client"
    );
  });

  it("throws when the treatment is not found", async () => {
    const { db, queue } = makeDb();
    queue.push([]);
    mocks.getDb.mockResolvedValue(db);

    await expect(heatmap.updateTreatmentStatus(99, 7, "in_progress")).rejects.toThrow("not found");
  });
});
