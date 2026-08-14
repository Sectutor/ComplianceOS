import { describe, it, expect, vi } from "vitest";
import {
  buildHeatmapMatrix,
  aggregateTreatmentStatuses,
  summarizeHeatmap,
  residualScoreToScale,
  getCellBand,
} from "../../lib/riskHeatmap";
import * as riskHeatmapModule from "../../lib/riskHeatmap";

/**
 * Contract tests for packages/core/src/lib/riskHeatmap.ts (QA cycle 3).
 *
 * Baseline (landed, must stay green): the pure functions buildHeatmapMatrix,
 * aggregateTreatmentStatuses, summarizeHeatmap, residualScoreToScale and
 * getCellBand are tested unconditionally below.
 *
 * NOTE: buildHeatmapContract / buildTreatmentPlans were landed by the
 * backend agent WHILE QA was running (present by 19:29). The suites below
 * now test the ACTUAL signatures:
 *   - buildHeatmapContract stamps updatedAt with new Date().toISOString()
 *     (always a string - not passed through, never null)
 *   - buildTreatmentPlans(rows, assessmentsById: Map) joins via
 *     Map.get(riskAssessmentId), falls back to `Risk #<riskId>` titles,
 *     prefers treatmentType over strategy, ISO-converts dueDate, and omits
 *     likelihood/impact when they cannot be parsed
 * The skipIf guards are kept so the suite stays green if the exports are
 * ever reverted mid-cycle.
 *
 * Per plans/pipeline/UI-STANDARD.md section 16:
 *   getHeatmap -> { matrix, totals: { totalRisks, criticalCount, highCount,
 *     mediumCount, lowCount, treatmentProgress }, updatedAt? }
 *   listTreatmentPlans -> { id, riskId, riskTitle, strategy, status,
 *     owner?, dueDate?, likelihood?, impact? } with status in
 *     open | in-progress | mitigated | accepted
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
  },
}));

vi.mock("../../db", () => ({ getDb: mocks.getDb }));
vi.mock("../../schema", () => ({
  riskAssessments: mocks.riskAssessments,
  riskTreatments: mocks.riskTreatments,
}));

// ---------------------------------------------------------------------------
// Baseline: pure functions already landed in riskHeatmap.ts
// ---------------------------------------------------------------------------

describe("residualScoreToScale", () => {
  it("maps 1-25 residual scores onto the 1-5 likelihood scale", () => {
    expect(residualScoreToScale(25)).toBe(5);
    expect(residualScoreToScale(20)).toBe(5);
    expect(residualScoreToScale(19)).toBe(4);
    expect(residualScoreToScale(12)).toBe(4);
    expect(residualScoreToScale(11)).toBe(3);
    expect(residualScoreToScale(8)).toBe(3);
    expect(residualScoreToScale(7)).toBe(2);
    expect(residualScoreToScale(4)).toBe(2);
    expect(residualScoreToScale(3)).toBe(1);
    expect(residualScoreToScale(1)).toBe(1);
  });

  it("returns 0 for missing, invalid or non-positive scores", () => {
    expect(residualScoreToScale(0)).toBe(0);
    expect(residualScoreToScale(-5)).toBe(0);
    expect(residualScoreToScale(null)).toBe(0);
    expect(residualScoreToScale(undefined)).toBe(0);
    expect(residualScoreToScale(Number.NaN)).toBe(0);
  });

  it("coerces numeric strings", () => {
    expect(residualScoreToScale("12")).toBe(4);
    expect(residualScoreToScale("8")).toBe(3);
    expect(residualScoreToScale("abc")).toBe(0);
  });
});

describe("getCellBand", () => {
  it("uses the UI colour-band thresholds (>=15 critical, >=8 high, >=4 medium, else low)", () => {
    expect(getCellBand(25)).toBe("critical");
    expect(getCellBand(15)).toBe("critical");
    expect(getCellBand(14)).toBe("high");
    expect(getCellBand(8)).toBe("high");
    expect(getCellBand(7)).toBe("medium");
    expect(getCellBand(4)).toBe("medium");
    expect(getCellBand(3)).toBe("low");
    expect(getCellBand(0)).toBe("low");
  });
});

describe("buildHeatmapMatrix (inherent)", () => {
  const assessments = [
    { id: 1, likelihood: 5, impact: 5 },
    { id: 2, likelihood: 5, impact: 5 },
    { id: 3, likelihood: 4, impact: 3 },
    { id: 4, likelihood: 1, impact: 1 },
    { id: 5, likelihood: "2", impact: "3" },
    { id: 6, likelihood: null, impact: 4 }, // skipped (no likelihood)
    { id: 7, likelihood: 0, impact: 4 }, // parseLikelihoodImpact(0) -> 1 (clamped); lands at (1,4)
    { id: 8, likelihood: 6, impact: 2 }, // clamped to (5,2)
    { id: 9, likelihood: "", impact: 2 }, // skipped
    { id: 10, likelihood: undefined, impact: undefined }, // skipped
  ];

  it("buckets by likelihood x impact, collects riskIds and clamps to 1-5", () => {
    const matrix = buildHeatmapMatrix(assessments);
    expect(matrix).toHaveLength(6);
    expect(matrix.map((c) => [c.likelihood, c.impact])).toEqual([
      [1, 1],
      [1, 4],
      [2, 3],
      [4, 3],
      [5, 2],
      [5, 5],
    ]);

    expect(matrix[0]).toMatchObject({ likelihood: 1, impact: 1, count: 1, score: 1, riskIds: [4] });
    // parseLikelihoodImpact clamps 0 up to 1 (Math.max(1, ...)), so a zero
    // likelihood lands in row 1 instead of being skipped.
    expect(matrix[1]).toMatchObject({ likelihood: 1, impact: 4, count: 1, score: 4, riskIds: [7] });
    expect(matrix[2]).toMatchObject({ likelihood: 2, impact: 3, count: 1, score: 6, riskIds: [5] });
    expect(matrix[3]).toMatchObject({ likelihood: 4, impact: 3, count: 1, score: 12, riskIds: [3] });
    expect(matrix[4]).toMatchObject({ likelihood: 5, impact: 2, count: 1, score: 10, riskIds: [8] });
    expect(matrix[5]).toMatchObject({ likelihood: 5, impact: 5, count: 2, score: 25, riskIds: [1, 2] });
  });

  it("assigns qualitative levels via getMatrixScoreLevel (>=20 Critical, >=15 Very High, >=9 High, >=4 Medium)", () => {
    const matrix = buildHeatmapMatrix([
      { id: 1, likelihood: 5, impact: 5 }, // 25 -> Critical
      { id: 2, likelihood: 4, impact: 4 }, // 16 -> Very High
      { id: 3, likelihood: 4, impact: 3 }, // 12 -> High
      { id: 4, likelihood: 2, impact: 4 }, // 8 -> Medium (8 < 9)
      { id: 5, likelihood: 2, impact: 2 }, // 4 -> Medium
      { id: 6, likelihood: 1, impact: 1 }, // 1 -> Low
    ]);
    const levels = new Map(matrix.map((c) => [c.score, c.level]));
    expect(levels.get(25)).toBe("Critical");
    expect(levels.get(16)).toBe("Very High");
    expect(levels.get(12)).toBe("High");
    expect(levels.get(8)).toBe("Medium");
    expect(levels.get(4)).toBe("Medium");
    expect(levels.get(1)).toBe("Low");
  });

  it("defaults to type 'inherent' and handles empty input", () => {
    expect(buildHeatmapMatrix([])).toEqual([]);
    expect(buildHeatmapMatrix(undefined as never)).toEqual([]);
    expect(buildHeatmapMatrix(assessments, "inherent")).toHaveLength(6);
  });
});

describe("buildHeatmapMatrix (residual)", () => {
  it("places residual scores along the diagonal using residualScoreToScale", () => {
    const matrix = buildHeatmapMatrix(
      [
        { id: 1, residualScore: 25 }, // scale 5 -> (5,5)
        { id: 2, residualScore: 20 }, // scale 5 -> (5,5)
        { id: 3, residualScore: 12 }, // scale 4 -> (4,4)
        { id: 4, residualScore: 11 }, // scale 3 -> (3,3)
        { id: 5, residualScore: 8 }, // scale 3 -> (3,3)
        { id: 6, residualScore: 4 }, // scale 2 -> (2,2)
        { id: 7, residualScore: 1 }, // scale 1 -> (1,1)
        { id: 8, residualScore: 0 }, // skipped
        { id: 9, residualScore: null }, // skipped
        { id: 10, residualScore: undefined }, // skipped
        { id: 11, residualScore: -3 }, // skipped
        { id: 12, residualScore: "16" }, // scale 4 -> (4,4)
        { id: 13, likelihood: 5, impact: 5, residualScore: 3 }, // scale 1 -> (1,1); inherent fields ignored
      ],
      "residual"
    );

    expect(matrix).toHaveLength(5);
    expect(matrix.map((c) => [c.likelihood, c.impact])).toEqual([
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 4],
      [5, 5],
    ]);

    expect(matrix[0]).toMatchObject({ likelihood: 1, impact: 1, count: 2, score: 1, riskIds: [7, 13] });
    expect(matrix[1]).toMatchObject({ likelihood: 2, impact: 2, count: 1, score: 4, riskIds: [6] });
    expect(matrix[2]).toMatchObject({ likelihood: 3, impact: 3, count: 2, score: 9, riskIds: [4, 5] });
    expect(matrix[3]).toMatchObject({ likelihood: 4, impact: 4, count: 2, score: 16, riskIds: [3, 12] });
    expect(matrix[4]).toMatchObject({ likelihood: 5, impact: 5, count: 2, score: 25, riskIds: [1, 2] });
  });
});

describe("aggregateTreatmentStatuses", () => {
  it("counts by status (case-insensitive) and treats implemented/verified/completed as done", () => {
    const result = aggregateTreatmentStatuses([
      { status: "implemented" },
      { status: "Verified" },
      { status: "completed" },
      { status: "in_progress" },
      { status: "planned" },
      { status: "Accepted" },
    ]);
    expect(result.treatmentsByStatus).toEqual({
      implemented: 1,
      verified: 1,
      completed: 1,
      in_progress: 1,
      planned: 1,
      accepted: 1,
    });
    expect(result.treatmentProgressPct).toBe(50); // 3 of 6 done
  });

  it("defaults missing statuses to 'planned'", () => {
    const result = aggregateTreatmentStatuses([{ status: null }, { status: undefined }, {}]);
    expect(result.treatmentsByStatus).toEqual({ planned: 3 });
    expect(result.treatmentProgressPct).toBe(0);
  });

  it("rounds the progress percentage and handles empty input", () => {
    expect(
      aggregateTreatmentStatuses([
        { status: "implemented" },
        { status: "verified" },
        { status: "planned" },
      ]).treatmentProgressPct
    ).toBe(67); // 2/3 = 66.66 -> 67
    expect(aggregateTreatmentStatuses([])).toEqual({ treatmentsByStatus: {}, treatmentProgressPct: 0 });
    expect(aggregateTreatmentStatuses(undefined as never)).toEqual({
      treatmentsByStatus: {},
      treatmentProgressPct: 0,
    });
  });
});

describe("summarizeHeatmap", () => {
  it("totals counts per UI band (>=15 critical, >=8 high, >=4 medium, else low)", () => {
    const cells = [
      { likelihood: 5, impact: 5, count: 2, score: 25, level: "Critical" as const, riskIds: [1, 2] },
      { likelihood: 5, impact: 3, count: 1, score: 15, level: "Very High" as const, riskIds: [3] },
      { likelihood: 4, impact: 3, count: 3, score: 12, level: "High" as const, riskIds: [4, 5, 6] },
      { likelihood: 2, impact: 4, count: 1, score: 8, level: "Medium" as const, riskIds: [7] },
      { likelihood: 3, impact: 2, count: 2, score: 6, level: "Medium" as const, riskIds: [8, 9] },
      { likelihood: 2, impact: 2, count: 1, score: 4, level: "Medium" as const, riskIds: [10] },
      { likelihood: 1, impact: 3, count: 5, score: 3, level: "Low" as const, riskIds: [11, 12, 13, 14, 15] },
    ];
    expect(summarizeHeatmap(cells)).toEqual({
      totalAssessments: 15,
      critical: 3, // 25 (x2) + 15 (x1)
      high: 4, // 12 (x3) + 8 (x1)
      medium: 3, // 6 (x2) + 4 (x1)
      low: 5,
    });
  });

  it("returns zeros for an empty matrix", () => {
    expect(summarizeHeatmap([])).toEqual({
      totalAssessments: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    });
  });
});

// ---------------------------------------------------------------------------
// BACKEND-DEP: buildHeatmapContract / buildTreatmentPlans (added in parallel)
// ---------------------------------------------------------------------------

const buildHeatmapContractAvailable = typeof riskHeatmapModule.buildHeatmapContract === "function";
const buildTreatmentPlansAvailable = typeof riskHeatmapModule.buildTreatmentPlans === "function";

describe.skipIf(!buildHeatmapContractAvailable)("buildHeatmapContract (BACKEND-DEP)", () => {
  const buildHeatmapContract = riskHeatmapModule.buildHeatmapContract!;

  it("maps summary fields onto the totals shape", () => {
    const result = {
      type: "inherent" as const,
      matrix: [{ likelihood: 5, impact: 5, count: 2, score: 25, level: "Critical" as const, riskIds: [1, 2] }],
      summary: {
        totalAssessments: 10,
        critical: 2,
        high: 3,
        medium: 3,
        low: 2,
        treatmentProgressPct: 45,
        treatmentsByStatus: { implemented: 4, planned: 6 },
      },
      assessments: [],
    };
    const out = buildHeatmapContract(result);
    expect(out.totals).toEqual({
      totalRisks: 10,
      criticalCount: 2,
      highCount: 3,
      mediumCount: 3,
      lowCount: 2,
      treatmentProgress: 45,
    });
    expect(out.matrix).toBe(result.matrix);
  });

  it("always stamps updatedAt with a fresh ISO timestamp", () => {
    const out = buildHeatmapContract({
      type: "inherent",
      matrix: [],
      summary: {
        totalAssessments: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        treatmentProgressPct: 0,
        treatmentsByStatus: {},
      },
      assessments: [],
    });
    expect(typeof out.updatedAt).toBe("string");
    expect(out.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(out.totals).toEqual({
      totalRisks: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      treatmentProgress: 0,
    });
  });
});

describe.skipIf(!buildTreatmentPlansAvailable)("buildTreatmentPlans (BACKEND-DEP)", () => {
  const buildTreatmentPlans = riskHeatmapModule.buildTreatmentPlans!;

  // Backend signature: assessmentsById is a Map<number, RiskAssessmentLike>.
  const assessmentsById = new Map<
    number,
    { id: number; title: string; likelihood: number | string; impact: number | string }
  >([
    [10, { id: 10, title: "XSS in admin panel", likelihood: 4, impact: 3 }],
    [11, { id: 11, title: "Ransomware exposure", likelihood: 5, impact: 5 }],
  ]);

  const treatments = [
    { id: 1, riskAssessmentId: 10, strategy: "Migrate", status: "implemented", owner: "alice", dueDate: "2026-09-01T00:00:00.000Z" },
    { id: 2, riskAssessmentId: 11, strategy: "Accept", status: "accepted", owner: "bob", dueDate: null },
    { id: 3, riskAssessmentId: 10, strategy: "Mitigate", status: "in_progress", dueDate: "2026-08-20T00:00:00.000Z" },
    { id: 4, riskAssessmentId: 10, status: "planned" },
    { id: 5, riskAssessmentId: 99, status: "open" }, // assessment missing from map
  ];

  it("normalises statuses to open | in-progress | mitigated | accepted", () => {
    const rows = buildTreatmentPlans(treatments, assessmentsById);
    const byId = new Map(rows.map((r) => [r.id, r]));
    expect(byId.get(1)!.status).toBe("mitigated");
    expect(byId.get(2)!.status).toBe("accepted");
    expect(byId.get(3)!.status).toBe("in-progress");
    expect(byId.get(4)!.status).toBe("open");
    expect(byId.get(5)!.status).toBe("open");
  });

  it("joins riskId, riskTitle, likelihood and impact from the linked assessment", () => {
    const rows = buildTreatmentPlans(treatments, assessmentsById);
    const row = rows[0];
    expect(row).toMatchObject({
      id: 1,
      riskId: 10,
      riskTitle: "XSS in admin panel",
      strategy: "Migrate",
      owner: "alice",
      likelihood: 4,
      impact: 3,
      dueDate: "2026-09-01T00:00:00.000Z",
    });
  });

  it("falls back to Risk #<id> for missing assessments and nulls for missing fields", () => {
    const rows = buildTreatmentPlans(treatments, assessmentsById);
    const row = rows[4]; // riskAssessmentId 99 is not in the map
    expect(row).toMatchObject({
      id: 5,
      riskId: 99,
      riskTitle: "Risk #99",
      status: "open",
      strategy: null,
      owner: null,
      dueDate: null,
    });
    expect(row.likelihood).toBeUndefined();
    expect(row.impact).toBeUndefined();
  });

  it("prefers treatmentType over strategy and supports riskScenarioId as riskId fallback", () => {
    const rows = buildTreatmentPlans(
      [
        { id: 9, riskAssessmentId: 10, treatmentType: "Tooling", strategy: "Migrate", status: "planned" },
        { id: 10, riskScenarioId: 55, status: "implemented" },
      ],
      assessmentsById
    );
    const byId = new Map(rows.map((r) => [r.id, r]));
    expect(byId.get(9)!.strategy).toBe("Tooling");
    expect(byId.get(9)!.riskTitle).toBe("XSS in admin panel");
    expect(byId.get(10)!.riskId).toBe(55);
    expect(byId.get(10)!.riskTitle).toBe("Risk #55");
    expect(byId.get(10)!.status).toBe("mitigated");
    expect(byId.get(10)!.strategy).toBeNull();
  });

  it("treats verified and completed as mitigated and normalises case differences", () => {
    const rows = buildTreatmentPlans(
      [
        { id: 6, riskAssessmentId: 10, status: "Verified" },
        { id: 7, riskAssessmentId: 10, status: "completed" },
        { id: 8, riskAssessmentId: 10, status: "In-Progress" },
      ],
      assessmentsById
    );
    const byId = new Map(rows.map((r) => [r.id, r]));
    expect(byId.get(6)!.status).toBe("mitigated");
    expect(byId.get(7)!.status).toBe("mitigated");
    expect(byId.get(8)!.status).toBe("in-progress");
  });
});
