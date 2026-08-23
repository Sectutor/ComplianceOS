import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Readiness scoring engine (lib/readinessScoring.ts) — unit tests.
 *
 * The engine fetches its inputs through four tRPC queries; following the
 * established repo pattern (cf. vfsMemoryEngineDb.test.ts mocking ../../db)
 * the transport layer is replaced with fixture-returning query fns while ALL
 * scoring/aggregation logic under test runs for real. getAuditRiskAlerts is
 * genuinely pure and tested without any mocks.
 */

const trpcMocks = vi.hoisted(() => ({
  clientControlsList: vi.fn(),
  evidenceList: vi.fn(),
  risksList: vi.fn(),
  auditListUpcoming: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    clientControls: { list: { query: trpcMocks.clientControlsList } },
    evidence: { list: { query: trpcMocks.evidenceList } },
    risks: { list: { query: trpcMocks.risksList } },
    audit: { listUpcoming: { query: trpcMocks.auditListUpcoming } },
  },
}));

import {
  calculateReadinessScore,
  generateRiskHeatmap,
  getAuditRiskAlerts,
} from "../readinessScoring";

const DAY_MS = 24 * 60 * 60 * 1000;
const FRESH_DATE = "2999-01-01T00:00:00.000Z"; // far future -> not expired
const STALE_DATE = "2000-01-01T00:00:00.000Z"; // far past -> expired

const control = (over: Record<string, any> = {}) => ({
  id: 1,
  status: "implemented",
  clientControlId: "CC-1",
  control: { controlId: "AC-1", name: "Access Control", framework: "ISO 27001" },
  ...over,
});

const evidenceRow = (over: Record<string, any> = {}) => ({
  clientControlId: 1,
  status: "verified",
  expirationDate: null,
  ...over,
});

const riskRow = (over: Record<string, any> = {}) => ({
  controlId: null,
  likelihood: 2,
  impact: 2,
  ...over,
});

/** Queue the four parallel query results consumed by calculateReadinessScore. */
function queueReadinessInputs(
  controls: any[],
  evidence: any[],
  risks: any[],
  audits: any[] = [],
) {
  trpcMocks.clientControlsList.mockResolvedValue(controls);
  trpcMocks.evidenceList.mockResolvedValue(evidence);
  trpcMocks.risksList.mockResolvedValue(risks);
  trpcMocks.auditListUpcoming.mockResolvedValue(audits);
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default: no upcoming audits -> the "no deadline pressure" ladder.
  trpcMocks.auditListUpcoming.mockResolvedValue([]);
});

describe("calculateReadinessScore", () => {
  it("computes all sub-scores and the weighted overall from fixture data", async () => {
    // 2 of 3 controls implemented (impl 66.67%), both evidenced (coverage 100%),
    // 1 of 2 verified evidences fresh (freshness 50%), 1 of 3 risks high (exposure 66.67%).
    // Coverage counts ANY evidence row on an implemented control; staleness is
    // measured separately by freshness.
    queueReadinessInputs(
      [
        control({ id: 1 }),
        control({ id: 2 }), // implemented, no evidence
        control({ id: 3, status: "planned" }),
      ],
      [
        evidenceRow({ clientControlId: 1, expirationDate: FRESH_DATE }),
        evidenceRow({ clientControlId: 2, expirationDate: STALE_DATE }),
        evidenceRow({ clientControlId: 3, status: "pending" }),
      ],
      [
        riskRow({ likelihood: 4, impact: 4 }), // 16 >= 12 -> high
        riskRow({ likelihood: 2, impact: 3 }), // 6
        riskRow({ likelihood: undefined, impact: undefined }), // treated as 0
      ],
    );

    const score = await calculateReadinessScore(42);
    expect(score.overall).toBe(74); // round(.35*100 + .25*50 + .25*(200/3) + .15*(200/3))
    expect(score.evidenceCoverage).toBe(100);
    expect(score.evidenceFreshness).toBe(50);
    expect(score.controlImplementation).toBe(67);
    expect(score.riskExposure).toBe(67);
    expect(score.auditRisk).toBe("low"); // no audit scheduled; 74 >= 70
    expect(score.lastUpdated).toBeInstanceOf(Date);
  });

  it("returns the documented EMPTY state when the client has no data at all", async () => {
    queueReadinessInputs([], [], [], []);
    const score = await calculateReadinessScore(1);
    expect(score).toMatchObject({
      evidenceCoverage: 0,
      evidenceFreshness: 0,
      controlImplementation: 0,
      riskExposure: 100, // no risks -> full exposure headroom
      overall: 15, // round(.15 * 100)
      auditRisk: "high",
    });
  });

  it("scores evidence coverage 0 when implemented controls have no evidence", async () => {
    queueReadinessInputs([control({ id: 1 }), control({ id: 2 })], [], []);
    const score = await calculateReadinessScore(1);
    expect(score.evidenceCoverage).toBe(0);
  });

  it("ignores non-implemented controls when computing coverage", async () => {
    queueReadinessInputs(
      [control({ id: 1, status: "planned" })],
      [evidenceRow({ clientControlId: 1 })], // evidence exists but control not implemented
      [],
    );
    const score = await calculateReadinessScore(1);
    expect(score.evidenceCoverage).toBe(0);
  });

  it("scores freshness 0 when there is no verified evidence (pending ignored)", async () => {
    queueReadinessInputs(
      [],
      [
        evidenceRow({ status: "pending", expirationDate: FRESH_DATE }),
        evidenceRow({ status: "expired", expirationDate: FRESH_DATE }),
      ],
      [],
    );
    const score = await calculateReadinessScore(1);
    expect(score.evidenceFreshness).toBe(0);
  });

  it("treats likelihood*impact >= 12 as high risk and counts missing factors as 0", async () => {
    queueReadinessInputs(
      [],
      [],
      [
        riskRow({ likelihood: 3, impact: 4 }), // exactly 12 -> high
        riskRow({ likelihood: 3, impact: 3 }), // 9 -> not high
      ],
    );
    const score = await calculateReadinessScore(1);
    expect(score.riskExposure).toBe(50);

    queueReadinessInputs(
      [],
      [],
      [riskRow({ likelihood: 3, impact: 3 })], // boundary just below threshold
    );
    const below = await calculateReadinessScore(1);
    expect(below.riskExposure).toBe(100);
  });

  it("maps near-term audits (<=30 days) onto the stricter 80/60/40 ladder", async () => {
    const soon = new Date(Date.now() + 10 * DAY_MS).toISOString();

    // overall 100 -> low
    queueReadinessInputs(
      [control()],
      [evidenceRow({ expirationDate: FRESH_DATE })],
      [],
      [{ scheduledDate: soon }],
    );
    expect((await calculateReadinessScore(1)).auditRisk).toBe("low");

    // overall round(.35*100 + 0 + .25*50 + .15*100) = 63 -> medium (stale evidence kills freshness)
    queueReadinessInputs(
      [control(), control({ id: 2, status: "planned" })],
      [evidenceRow({ expirationDate: STALE_DATE })],
      [],
      [{ scheduledDate: soon }],
    );
    expect((await calculateReadinessScore(1)).auditRisk).toBe("medium");

    // overall 40 (round(0 + 0 + .25*100 + .15*100)) -> high
    queueReadinessInputs([control()], [], [], [{ scheduledDate: soon }]);
    expect((await calculateReadinessScore(1)).auditRisk).toBe("high");

    // overall 25 (<40) with an overdue audit -> critical
    queueReadinessInputs(
      [control()],
      [],
      [riskRow({ likelihood: 4, impact: 4 })],
      [{ scheduledDate: new Date(Date.now() - 5 * DAY_MS).toISOString() }],
    );
    expect((await calculateReadinessScore(1)).auditRisk).toBe("critical");
  });

  it("uses the relaxed 70/50 ladder when the audit is far away or absent", async () => {
    const far = new Date(Date.now() + 180 * DAY_MS).toISOString();

    // overall 88 -> low
    queueReadinessInputs(
      [control(), control({ id: 2, status: "planned" })],
      [evidenceRow({ expirationDate: FRESH_DATE })],
      [],
      [{ scheduledDate: far }],
    );
    expect((await calculateReadinessScore(1)).auditRisk).toBe("low");

    // boundary: raw weighted score lands on exactly 70 -> still low
    // (coverage 50, freshness 50, implementation 100, exposure 100)
    queueReadinessInputs(
      [control(), control({ id: 2 })],
      [
        evidenceRow({ clientControlId: 1, expirationDate: FRESH_DATE }),
        evidenceRow({ clientControlId: 99, expirationDate: STALE_DATE }),
      ],
      [],
      [{ scheduledDate: far }],
    );
    const boundary = await calculateReadinessScore(1);
    expect(boundary.overall).toBe(70);
    expect(boundary.auditRisk).toBe("low");

    // overall round(.35*50 + .25*50 + .25*100 + 0) = 55 -> medium
    queueReadinessInputs(
      [control(), control({ id: 2 })],
      [
        evidenceRow({ clientControlId: 1, expirationDate: FRESH_DATE }),
        evidenceRow({ clientControlId: 99, expirationDate: STALE_DATE }),
      ],
      [riskRow({ likelihood: 4, impact: 4 })],
      [{ scheduledDate: far }],
    );
    expect((await calculateReadinessScore(1)).auditRisk).toBe("medium");

    // overall 40 -> high
    queueReadinessInputs([control()], [], [], [{ scheduledDate: far }]);
    expect((await calculateReadinessScore(1)).auditRisk).toBe("high");
  });

  it("is deterministic for identical inputs (modulo lastUpdated)", async () => {
    const makeInputs = () => [
      [control(), control({ id: 2, status: "planned" })],
      [evidenceRow({ expirationDate: FRESH_DATE })],
      [riskRow({ likelihood: 4, impact: 4 })],
      [{ scheduledDate: new Date(Date.now() + 10 * DAY_MS).toISOString() }],
    ];
    queueReadinessInputs(...(makeInputs() as any));
    const a = await calculateReadinessScore(7);
    queueReadinessInputs(...(makeInputs() as any));
    const b = await calculateReadinessScore(7);
    const { lastUpdated: _a, ...restA } = a;
    const { lastUpdated: _b, ...restB } = b;
    expect(restA).toEqual(restB);
  });
});

describe("generateRiskHeatmap", () => {
  /** Queue the three parallel query results consumed by generateRiskHeatmap. */
  function queueHeatmapInputs(controls: any[], evidence: any[], risks: any[]) {
    trpcMocks.clientControlsList.mockResolvedValue(controls);
    trpcMocks.evidenceList.mockResolvedValue(evidence);
    trpcMocks.risksList.mockResolvedValue(risks);
  }

  it.each([
    [25, "critical"],
    [20, "critical"], // boundary: >= 20
    [19, "high"],
    [12, "high"], // boundary: >= 12
    [11, "medium"],
    [6, "medium"], // boundary: >= 6
    [5, "low"],
    [0, "low"],
  ])("classifies a control with max risk score %p as %p", async (score, level) => {
    queueHeatmapInputs(
      [control({ id: 9 })],
      [],
      [riskRow({ controlId: 9, likelihood: 1, impact: score })],
    );
    const heatmap = await generateRiskHeatmap(1);
    expect(heatmap).toHaveLength(1);
    expect(heatmap[0].riskLevel).toBe(level);
  });

  it("keeps the maximum risk score when several risks map to one control", async () => {
    queueHeatmapInputs(
      [control({ id: 9 })],
      [],
      [
        riskRow({ controlId: 9, likelihood: 2, impact: 2 }), // 4
        riskRow({ controlId: 9, likelihood: 5, impact: 5 }), // 25
      ],
    );
    expect((await generateRiskHeatmap(1))[0].riskLevel).toBe("critical");
  });

  it("ignores risks without a controlId and marks unevidenced controls as missing", async () => {
    queueHeatmapInputs(
      [control({ id: 9 })],
      [],
      [riskRow({ controlId: null }), riskRow({ controlId: undefined })],
    );
    const heatmap = await generateRiskHeatmap(1);
    expect(heatmap[0].riskLevel).toBe("low");
    expect(heatmap[0].evidenceStatus).toBe("missing");
  });

  it("passes evidence status through, with the last entry winning per control", async () => {
    queueHeatmapInputs(
      [control({ id: 9, clientControlId: "CC-9" }), control({ id: 10, clientControlId: "CC-10" })],
      [
        evidenceRow({ clientControlId: 9, status: "verified" }),
        evidenceRow({ clientControlId: 9, status: "pending" }),
        evidenceRow({ clientControlId: 10, status: "expired" }),
      ],
      [],
    );
    const heatmap = await generateRiskHeatmap(1);
    expect(heatmap.find((h) => h.controlId === "CC-9")!.evidenceStatus).toBe("pending");
    expect(heatmap.find((h) => h.controlId === "CC-9")!.riskLevel).toBe("low");
    expect(heatmap.find((h) => h.controlId === "CC-10")!.evidenceStatus).toBe("expired");
  });

  it("falls back to global control metadata and CTL-<id> identifiers", async () => {
    queueHeatmapInputs(
      [
        control({ id: 11, clientControlId: "", control: null }), // no metadata at all
        control({
          id: 12,
          clientControlId: "",
          control: { controlId: "AC-12", name: "Named Control", framework: "NIS2" },
        }),
      ],
      [],
      [],
    );
    const heatmap = await generateRiskHeatmap(1);
    expect(heatmap[0]).toEqual({
      controlId: "CTL-11",
      controlName: "Unnamed Control",
      framework: "Unknown",
      riskLevel: "low",
      evidenceStatus: "missing",
    });
    expect(heatmap[1].controlId).toBe("AC-12");
    expect(heatmap[1].controlName).toBe("Named Control");
    expect(heatmap[1].framework).toBe("NIS2");
  });

  it("returns [] for a client with no controls (zero state)", async () => {
    queueHeatmapInputs([], [], [riskRow()]);
    expect(await generateRiskHeatmap(1)).toEqual([]);
  });
});

describe("getAuditRiskAlerts", () => {
  const HEALTHY_SCORE = {
    overall: 90,
    evidenceCoverage: 95,
    evidenceFreshness: 95,
    controlImplementation: 100,
    riskExposure: 100,
    auditRisk: "low" as const,
    lastUpdated: new Date(),
  };

  it("returns no alerts for a healthy score and clean heatmap", () => {
    expect(getAuditRiskAlerts(HEALTHY_SCORE, [])).toEqual([]);
  });

  it("thresholds are exclusive: exactly-at-limit values produce no alerts", () => {
    const score = { ...HEALTHY_SCORE, overall: 60, evidenceCoverage: 70, evidenceFreshness: 80 };
    expect(getAuditRiskAlerts(score, [])).toEqual([]);
    // one step below each limit flips every alert on
    const breached = { ...HEALTHY_SCORE, overall: 59, evidenceCoverage: 69, evidenceFreshness: 79 };
    expect(getAuditRiskAlerts(breached, [])).toHaveLength(3);
  });

  it("alerts once per breached metric, embedding the offending values", () => {
    const alerts = getAuditRiskAlerts(
      { ...HEALTHY_SCORE, overall: 55, evidenceCoverage: 40, evidenceFreshness: 10 },
      [],
    );
    expect(alerts).toHaveLength(3);
    expect(alerts[0]).toContain("Overall readiness score is critical (55%)");
    expect(alerts[1]).toContain("Evidence coverage is low (40%)");
    expect(alerts[2]).toContain("Evidence freshness is concerning (10%)");
  });

  it("counts only critical risks whose evidence is not verified", () => {
    const heatmap = [
      { controlId: "A", controlName: "A", framework: "F", riskLevel: "critical", evidenceStatus: "missing" },
      { controlId: "B", controlName: "B", framework: "F", riskLevel: "critical", evidenceStatus: "pending" },
      { controlId: "C", controlName: "C", framework: "F", riskLevel: "critical", evidenceStatus: "verified" }, // exempt
      { controlId: "D", controlName: "D", framework: "F", riskLevel: "high", evidenceStatus: "missing" }, // not critical
    ];
    const alerts = getAuditRiskAlerts(HEALTHY_SCORE, heatmap);
    expect(alerts).toEqual(["2 critical risks lack verified evidence. High audit exposure."]);
  });

  it("emits alerts in metric order: overall, coverage, freshness, critical risks", () => {
    const score = { ...HEALTHY_SCORE, overall: 10, evidenceCoverage: 0, evidenceFreshness: 0 };
    const heatmap = [
      { controlId: "A", controlName: "A", framework: "F", riskLevel: "critical", evidenceStatus: "expired" },
    ];
    const alerts = getAuditRiskAlerts(score, heatmap);
    expect(alerts).toHaveLength(4);
    expect(alerts[0]).toContain("Overall readiness");
    expect(alerts[1]).toContain("Evidence coverage");
    expect(alerts[2]).toContain("Evidence freshness");
    expect(alerts[3]).toContain("1 critical risks");
  });

  it("never throws on malformed scores or junk heatmap entries", () => {
    const garbageScore = {} as any; // all metrics undefined -> comparisons are NaN -> false
    expect(() => getAuditRiskAlerts(garbageScore, [])).not.toThrow();
    expect(getAuditRiskAlerts(garbageScore, [])).toEqual([]);
    const junkHeatmap = [null, 42, "x", {}, undefined] as any[];
    expect(() => getAuditRiskAlerts(garbageScore, junkHeatmap)).not.toThrow();
    expect(getAuditRiskAlerts(garbageScore, junkHeatmap)).toEqual([]);
  });
});
