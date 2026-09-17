import { describe, it, expect } from "vitest";

/**
 * NIS2 Security Metrics & Reporting engine (lib/nis2/securityMetrics.ts) —
 * engine tests (QA cycle 20, NIS2 Phase 4 Task 4.2 / ENISA Measure 7.1).
 *
 * Mirrors vulnerabilityMgmt.test.ts / thirdPartyRisk.test.ts: the engine is
 * pure and deterministic, never throws, and accepts an injectable `now` clock
 * where time matters. Every function is exercised at its band boundaries, on
 * malformed input, on clock injection, and for input determinism (same input
 * twice => deep-equal).
 *
 * Contract under test:
 *   computeMttr(incidents, opts?)       -> { bySeverity, overall, totalResolved }
 *   trackVulnerabilityAge(vulns, opts?) -> { bySeverity, overall, totalOpen }
 *   detectComplianceDrift(areas, opts?) -> { alerts, counts, totalAreas }
 *   buildExecutiveSummary(input, opts?) -> { postureScore, mttrTrend, status, topAreasAtRisk, ... }
 *
 * MTTR model (computeMttr):
 *   Only rows with BOTH a valid detectedAt and resolvedAt (resolvedAt >=
 *   detectedAt) count; everything else is skipped, never errors. Severity
 *   buckets critical|high|medium|low|info|unknown; anything invalid ->
 *   "unknown". mttrHours/minHours/maxHours are 1 decimal, mttrDays 2
 *   decimals. Empty/malformed input -> EMPTY_MTTR_RESULT (zeroed).
 *
 * Vulnerability-age model (trackVulnerabilityAge):
 *   ageDays = max(0, floor((now - discoveredAt) / 24h)). Terminal statuses
 *   (patched / risk-accepted / false-positive, case-insensitive) are excluded
 *   from the register and can never be overdue. Overdue thresholds per
 *   severity: critical 30d, high 60d, medium 90d, low 120d, info 180d,
 *   unknown 180d (overall applies each row's own severity threshold). Age
 *   bands 0-7 | 8-30 | 31-60 | 61-90 | 90+. avgAgeDays 1 decimal. Deterministic
 *   tie-break: id ascending within a bucket.
 *
 * Compliance-drift model (detectComplianceDrift):
 *   driftPts = currentScore - baselineScore (scores clamped 0-100, 1
 *   decimal). Alert bands (driftPts <= threshold): -20 critical, -10 high,
 *   -5 medium, -0.05 low. driftPts >= 0.05 -> "improved"; else "stable".
 *   Alerts carry a catalog recommendation; stable/improved carry "". Areas
 *   deduped by areaId (last wins); alerts sorted driftPts asc, areaId asc.
 *
 * Executive-summary model (buildExecutiveSummary):
 *   postureScore clamped 0-100 (1 decimal); counts whole non-negative;
 *   overallMttrHours 1 decimal. MTTR trend vs priorMttrHours: pctChange =
 *   ((prior - current) / prior) * 100 (1 decimal), improved/worsened/flat, or
 *   n-a when prior is missing or 0. Status bands: Critical when
 *   driftAlertCount >= 5 OR overdueVulns >= 10 OR postureScore < 50; Watch
 *   when driftAlertCount >= 1 OR overdueVulns >= 1 OR postureScore < 75; else
 *   Good. topAreasAtRisk: dedup by areaId, driftPts asc then areaId asc,
 *   sliced to 3.
 */

const NOW = new Date("2026-08-19T00:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const iso = (daysFromNow: number) => new Date(NOW.getTime() + daysFromNow * DAY_MS).toISOString();

import {
  computeMttr,
  trackVulnerabilityAge,
  detectComplianceDrift,
  buildExecutiveSummary,
  EMPTY_MTTR_RESULT,
  EMPTY_VULNERABILITY_AGE_RESULT,
  EMPTY_COMPLIANCE_DRIFT_RESULT,
  EMPTY_EXECUTIVE_SUMMARY,
} from "../nis2/securityMetrics";

/* ================================================================== */
/* computeMttr                                                        */
/* ================================================================== */

describe("computeMttr — empty / malformed input yields the zeroed safe shape", () => {
  it("returns EMPTY_MTTR_RESULT for undefined / null / non-array input", () => {
    expect(computeMttr(undefined)).toEqual(EMPTY_MTTR_RESULT);
    expect(computeMttr(null)).toEqual(EMPTY_MTTR_RESULT);
    expect(computeMttr(42 as never)).toEqual(EMPTY_MTTR_RESULT);
    expect(computeMttr("nope" as never)).toEqual(EMPTY_MTTR_RESULT);
    expect(computeMttr({} as never)).toEqual(EMPTY_MTTR_RESULT);
  });

  it("returns EMPTY_MTTR_RESULT for an empty array", () => {
    const result = computeMttr([]);
    expect(result).toEqual(EMPTY_MTTR_RESULT);
    expect(result.totalResolved).toBe(0);
    expect(result.overall.count).toBe(0);
  });

  it("never throws on garbage rows (non-objects, missing/invalid dates, reversed dates)", () => {
    const result = computeMttr([
      null,
      42,
      "x",
      {},
      { id: 1 },
      { id: 2, detectedAt: "not-a-date", resolvedAt: iso(-1) },
      { id: 3, detectedAt: iso(-2), resolvedAt: "not-a-date" },
      { id: 4, detectedAt: iso(-2), resolvedAt: iso(-3) }, // resolved < detected
      { id: 5, detectedAt: Number.NaN, resolvedAt: iso(-1) },
      { id: 6, detectedAt: null, resolvedAt: null },
    ]);
    expect(result.totalResolved).toBe(0);
    expect(result.overall).toMatchObject({ count: 0, mttrHours: 0, mttrDays: 0 });
    for (const bucket of result.bySeverity) {
      expect(bucket.count).toBe(0);
    }
  });
});

describe("computeMttr — aggregation math, bucketing and rounding", () => {
  it("computes per-severity MTTR with 1-decimal hours and 2-decimal days", () => {
    const result = computeMttr([
      { id: 1, severity: "critical", detectedAt: iso(-3), resolvedAt: iso(-2) }, // 24h
      { id: 2, severity: "critical", detectedAt: iso(-1), resolvedAt: iso(-0.5) }, // 12h
      { id: 3, severity: "high", detectedAt: iso(-2), resolvedAt: iso(-1.75) }, // 6h
      { id: 4, severity: "low", detectedAt: iso(-5), resolvedAt: iso(-3) }, // 48h
    ]);
    expect(result.totalResolved).toBe(4);

    const critical = result.bySeverity.find((b) => b.severity === "critical")!;
    expect(critical.count).toBe(2);
    expect(critical.mttrHours).toBe(18);
    expect(critical.mttrDays).toBe(0.75);
    expect(critical.minHours).toBe(12);
    expect(critical.maxHours).toBe(24);

    const high = result.bySeverity.find((b) => b.severity === "high")!;
    expect(high.count).toBe(1);
    expect(high.mttrHours).toBe(6);
    expect(high.mttrDays).toBe(0.25);

    const low = result.bySeverity.find((b) => b.severity === "low")!;
    expect(low.count).toBe(1);
    expect(low.mttrHours).toBe(48);
    expect(low.mttrDays).toBe(2);

    // overall aggregates across all severities: (24+12+6+48)/4 = 22.5h
    expect(result.overall.count).toBe(4);
    expect(result.overall.mttrHours).toBe(22.5);
    expect(result.overall.mttrDays).toBe(0.94); // 22.5/24 = 0.9375 -> 0.94
    expect(result.overall.minHours).toBe(6);
    expect(result.overall.maxHours).toBe(48);
  });

  it("rounds fractional hours to 1 decimal (4h20m -> 4.3h, 0.18d)", () => {
    const result = computeMttr([
      { id: 1, severity: "medium", detectedAt: NOW.getTime() - 6 * HOUR_MS, resolvedAt: NOW.getTime() - 1.6666667 * HOUR_MS },
    ]);
    const medium = result.bySeverity.find((b) => b.severity === "medium")!;
    expect(medium.count).toBe(1);
    expect(medium.mttrHours).toBe(4.3);
    expect(medium.mttrDays).toBe(0.18);
    expect(medium.minHours).toBe(4.3);
    expect(medium.maxHours).toBe(4.3);
  });

  it("counts zero-duration rows (resolvedAt === detectedAt) as valid", () => {
    const result = computeMttr([
      { id: 1, severity: "high", detectedAt: iso(-1), resolvedAt: iso(-1) },
    ]);
    const high = result.bySeverity.find((b) => b.severity === "high")!;
    expect(high.count).toBe(1);
    expect(high.mttrHours).toBe(0);
    expect(result.totalResolved).toBe(1);
  });

  it("emits buckets in deterministic severity order critical..unknown, zeroed when empty", () => {
    const result = computeMttr([
      { id: 1, severity: "critical", detectedAt: iso(-1), resolvedAt: iso(-0.9) },
    ]);
    expect(result.bySeverity.map((b) => b.severity)).toEqual([
      "critical",
      "high",
      "medium",
      "low",
      "info",
      "unknown",
    ]);
    for (const bucket of result.bySeverity) {
      expect(bucket.severity).not.toBe("overall");
      expect(bucket.count).toBe(bucket.severity === "critical" ? 1 : 0);
    }
    // unknown bucket is populated for an invalid severity token
    const unknownResult = computeMttr([
      { id: 1, severity: "bogus", detectedAt: iso(-1), resolvedAt: iso(-0.9) },
    ]);
    const unknown = unknownResult.bySeverity.find((b) => b.severity === "unknown")!;
    expect(unknown.count).toBe(1);
  });

  it("is deterministic: same input twice yields deep-equal output", () => {
    const input = [
      { id: 1, severity: "critical", detectedAt: iso(-3), resolvedAt: iso(-2) },
      { id: 2, severity: "high", detectedAt: iso(-1), resolvedAt: iso(-0.5) },
      { id: 3, severity: "bogus", detectedAt: iso(-5), resolvedAt: iso(-3) },
    ];
    expect(computeMttr(input)).toEqual(computeMttr(input));
  });
});

/* ================================================================== */
/* trackVulnerabilityAge                                              */
/* ================================================================== */

describe("trackVulnerabilityAge — empty / malformed input yields the zeroed safe shape", () => {
  it("returns EMPTY_VULNERABILITY_AGE_RESULT for undefined / null / non-array input", () => {
    expect(trackVulnerabilityAge(undefined)).toEqual(EMPTY_VULNERABILITY_AGE_RESULT);
    expect(trackVulnerabilityAge(null)).toEqual(EMPTY_VULNERABILITY_AGE_RESULT);
    expect(trackVulnerabilityAge(7 as never)).toEqual(EMPTY_VULNERABILITY_AGE_RESULT);
    expect(trackVulnerabilityAge("x" as never)).toEqual(EMPTY_VULNERABILITY_AGE_RESULT);
    expect(trackVulnerabilityAge({} as never)).toEqual(EMPTY_VULNERABILITY_AGE_RESULT);
  });

  it("never throws on garbage rows (non-objects, invalid dates, NaN)", () => {
    const result = trackVulnerabilityAge(
      [
        null,
        42,
        {},
        { id: 1, discoveredAt: "nope" },
        { id: 2, discoveredAt: null },
        { id: 3, discoveredAt: Number.NaN },
      ],
      { now: NOW }
    );
    expect(result.totalOpen).toBe(0);
    expect(result.overall).toMatchObject({ count: 0, avgAgeDays: 0, maxAgeDays: 0, overdueCount: 0 });
  });
});

describe("trackVulnerabilityAge — clock injection", () => {
  it("honors opts.now as an ISO string, epoch number and Date", () => {
    const rows = [{ id: 1, severity: "critical", discoveredAt: new Date(NOW.getTime() - 10 * DAY_MS).toISOString() }];
    expect(trackVulnerabilityAge(rows, { now: NOW.toISOString() }).overall.avgAgeDays).toBe(10);
    expect(trackVulnerabilityAge(rows, { now: NOW.getTime() }).overall.avgAgeDays).toBe(10);
    expect(trackVulnerabilityAge(rows, { now: NOW }).overall.avgAgeDays).toBe(10);
  });

  it("honors opts.clock factory when now is absent", () => {
    const rows = [{ id: 1, severity: "critical", discoveredAt: new Date(NOW.getTime() - 10 * DAY_MS).toISOString() }];
    const result = trackVulnerabilityAge(rows, { clock: () => NOW });
    expect(result.overall.avgAgeDays).toBe(10);
  });

  it("falls back to a real clock when neither now nor clock is usable (never throws)", () => {
    const rows = [
      // discovered 10 years in the future -> age clamps to 0 regardless of clock
      { id: 1, severity: "critical", discoveredAt: new Date(NOW.getTime() + 3650 * DAY_MS).toISOString() },
    ];
    const result = trackVulnerabilityAge(rows);
    expect(result.overall.count).toBe(1);
    expect(result.overall.maxAgeDays).toBe(0);
  });

  it("tolerates a throwing clock factory (falls back to real clock, never throws)", () => {
    const rows = [{ id: 1, severity: "high", discoveredAt: new Date(NOW.getTime() - 5 * DAY_MS).toISOString() }];
    const result = trackVulnerabilityAge(rows, {
      clock: () => {
        throw new Error("boom");
      },
    });
    expect(result.overall.count).toBe(1);
  });
});

describe("trackVulnerabilityAge — age math, bands and overdue thresholds", () => {
  const row = (id: string | number, severity: string, daysAgo: number, status?: string) => ({
    id,
    severity,
    discoveredAt: iso(-daysAgo),
    status,
  });

  it("computes whole-day ages (floor) against the pinned clock", () => {
    const result = trackVulnerabilityAge(
      [
        row(1, "critical", 10),
        row(2, "critical", 31.9), // floor -> 31 days
      ],
      { now: NOW }
    );
    expect(result.overall.count).toBe(2);
    expect(result.overall.maxAgeDays).toBe(31);
  });

  it("buckets ages into 0-7 | 8-30 | 31-60 | 61-90 | 90+ bands", () => {
    const result = trackVulnerabilityAge(
      [
        row(1, "critical", 5),
        row(2, "high", 20),
        row(3, "medium", 45),
        row(4, "low", 75),
        row(5, "info", 120),
        row(6, "unknown", 200),
      ],
      { now: NOW }
    );
    expect(result.overall.ageBandCounts).toEqual({ "0-7": 1, "8-30": 1, "31-60": 1, "61-90": 1, "90+": 2 });
    const critical = result.bySeverity.find((b) => b.severity === "critical")!;
    expect(critical.ageBandCounts["0-7"]).toBe(1);
  });

  it("flags overdue only when ageDays STRICTLY exceeds the severity threshold", () => {
    const result = trackVulnerabilityAge(
      [
        row(1, "critical", 30), // not overdue (30 <= 30)
        row(2, "critical", 31), // overdue
        row(3, "high", 60), // not overdue
        row(4, "high", 61), // overdue
        row(5, "medium", 90), // not overdue
        row(6, "medium", 91), // overdue
        row(7, "low", 120), // not overdue
        row(8, "low", 121), // overdue
        row(9, "info", 180), // not overdue
        row(10, "info", 181), // overdue
        row(11, "unknown", 181), // overdue (unknown threshold 180)
        row(12, "bogus", 10), // unknown bucket, not overdue
      ],
      { now: NOW }
    );
    const critical = result.bySeverity.find((b) => b.severity === "critical")!;
    expect(critical.overdueCount).toBe(1);
    const high = result.bySeverity.find((b) => b.severity === "high")!;
    expect(high.overdueCount).toBe(1);
    const medium = result.bySeverity.find((b) => b.severity === "medium")!;
    expect(medium.overdueCount).toBe(1);
    const low = result.bySeverity.find((b) => b.severity === "low")!;
    expect(low.overdueCount).toBe(1);
    const info = result.bySeverity.find((b) => b.severity === "info")!;
    expect(info.overdueCount).toBe(1);
    const unknown = result.bySeverity.find((b) => b.severity === "unknown")!;
    expect(unknown.overdueCount).toBe(1); // 181d overdue; bogus 10d coerces to unknown but is not overdue
  });

  it("applies each row's own severity threshold in the overall rollup", () => {
    const result = trackVulnerabilityAge(
      [
        row(1, "critical", 31), // overdue (30)
        row(2, "info", 181), // overdue (180)
        row(3, "low", 5), // not overdue
      ],
      { now: NOW }
    );
    expect(result.overall.count).toBe(3);
    expect(result.overall.overdueCount).toBe(2);
  });

  it("excludes terminal statuses (patched / risk-accepted / false-positive) case-insensitively", () => {
    const result = trackVulnerabilityAge(
      [
        row(1, "critical", 200, "patched"),
        row(2, "critical", 200, "risk-accepted"),
        row(3, "critical", 200, "false-positive"),
        row(4, "critical", 200, "PATCHED"), // uppercase -> still excluded
        row(5, "critical", 10, "open"), // included
        row(6, "critical", 5), // included
      ],
      { now: NOW }
    );
    expect(result.overall.count).toBe(2);
    expect(result.overall.overdueCount).toBe(0); // 10d and 5d both under 30
    const critical = result.bySeverity.find((b) => b.severity === "critical")!;
    expect(critical.count).toBe(2);
  });

  it("skips rows without a valid discoveredAt", () => {
    const result = trackVulnerabilityAge(
      [
        { id: 1, severity: "critical", discoveredAt: null },
        { id: 2, severity: "critical" },
        { id: 3, severity: "critical", discoveredAt: "bad-date" },
        row(4, "critical", 3),
      ],
      { now: NOW }
    );
    expect(result.overall.count).toBe(1);
    expect(result.totalOpen).toBe(1);
  });

  it("computes avgAgeDays (1 decimal) and maxAgeDays per bucket", () => {
    const result = trackVulnerabilityAge(
      [
        row(1, "critical", 10),
        row(2, "critical", 31),
        row(3, "high", 7),
      ],
      { now: NOW }
    );
    const critical = result.bySeverity.find((b) => b.severity === "critical")!;
    expect(critical.count).toBe(2);
    expect(critical.avgAgeDays).toBe(20.5);
    expect(critical.maxAgeDays).toBe(31);
    const high = result.bySeverity.find((b) => b.severity === "high")!;
    expect(high.avgAgeDays).toBe(7);
  });

  it("is deterministic: same input twice yields deep-equal output (incl. id tie-break)", () => {
    const input = [
      row(2, "high", 20),
      row(1, "high", 20),
      row(3, "critical", 40),
      row("b", "medium", 5),
      row("a", "medium", 5),
    ];
    expect(trackVulnerabilityAge(input, { now: NOW })).toEqual(trackVulnerabilityAge(input, { now: NOW }));
  });
});

/* ================================================================== */
/* detectComplianceDrift                                              */
/* ================================================================== */

describe("detectComplianceDrift — empty / malformed input yields the zeroed safe shape", () => {
  it("returns EMPTY_COMPLIANCE_DRIFT_RESULT for undefined / null / non-array input", () => {
    expect(detectComplianceDrift(undefined)).toEqual(EMPTY_COMPLIANCE_DRIFT_RESULT);
    expect(detectComplianceDrift(null)).toEqual(EMPTY_COMPLIANCE_DRIFT_RESULT);
    expect(detectComplianceDrift(5 as never)).toEqual(EMPTY_COMPLIANCE_DRIFT_RESULT);
    expect(detectComplianceDrift("x" as never)).toEqual(EMPTY_COMPLIANCE_DRIFT_RESULT);
    expect(detectComplianceDrift({} as never)).toEqual(EMPTY_COMPLIANCE_DRIFT_RESULT);
  });

  it("never throws on garbage rows and coerces missing fields to safe defaults", () => {
    const result = detectComplianceDrift([null, 42, {}, { areaId: null, name: 5 }]);
    expect(result.totalAreas).toBe(1); // all malformed rows collapse to the "" id, deduped
    expect(result.counts.stable).toBe(1); // 0 - 0 = 0 -> stable
    expect(result.alerts).toEqual([]);
  });
});

describe("detectComplianceDrift — band boundaries and counts", () => {
  const area = (id: string | number, baseline: number, current: number, name = "Area") => ({
    areaId: id,
    name,
    baselineScore: baseline,
    currentScore: current,
  });

  it("maps drift deltas to alert severities at the exact band thresholds", () => {
    const result = detectComplianceDrift([
      area(1, 100, 80), // -20  -> critical
      area(2, 90, 80), // -10  -> high
      area(3, 85, 80), // -5   -> medium
      area(4, 80, 79), // -1   -> low
    ]);
    expect(result.alerts.map((a) => [a.areaId, a.severity])).toEqual([
      [1, "critical"],
      [2, "high"],
      [3, "medium"],
      [4, "low"],
    ]);
    expect(result.counts).toEqual({ critical: 1, high: 1, medium: 1, low: 1, stable: 0, improved: 0, totalAlerts: 4 });
    expect(result.totalAreas).toBe(4);
  });

  it("classifies stable (0 drift) and improved (positive drift) areas without alerts", () => {
    const result = detectComplianceDrift([
      area(1, 80, 80), // 0    -> stable
      area(2, 80, 85), // +5   -> improved
      area(3, 80, 80.02), // +0.02 -> stable (below 0.05)
    ]);
    expect(result.alerts).toEqual([]);
    expect(result.counts.stable).toBe(2);
    expect(result.counts.improved).toBe(1);
    expect(result.counts.totalAlerts).toBe(0);
  });

  it("uses the strict -20/-10/-5 boundaries (one point above the threshold drops a band)", () => {
    const result = detectComplianceDrift([
      area(1, 100, 80.1), // -19.9 -> high (not critical)
      area(2, 90, 80.5), // -9.5  -> medium (not high)
      area(3, 85, 80.5), // -4.5  -> low (not medium)
    ]);
    expect(result.alerts.map((a) => [a.areaId, a.severity])).toEqual([
      [1, "high"], // -19.9 (most negative first)
      [2, "medium"], // -9.5
      [3, "low"], // -4.5
    ]);
    expect(result.counts).toEqual({ critical: 0, high: 1, medium: 1, low: 1, stable: 0, improved: 0, totalAlerts: 3 });
  });

  it("clamps scores to 0-100 and coerces NaN/null baselines to 0", () => {
    const result = detectComplianceDrift([
      area(1, 150, -5), // clamped 100 -> 0 = -100 -> critical
      area(2, null as never, 60), // baseline 0, current 60 = +60 -> improved
    ]);
    const critical = result.alerts.find((a) => a.areaId === 1)!;
    expect(critical.baselineScore).toBe(100);
    expect(critical.currentScore).toBe(0);
    expect(critical.driftPts).toBe(-100);
    expect(critical.severity).toBe("critical");
    expect(result.counts.improved).toBe(1);
  });

  it("attaches a catalog recommendation to every alert and '' to stable/improved", () => {
    const result = detectComplianceDrift([
      area(1, 100, 50), // critical
      area(2, 80, 80), // stable
      area(3, 70, 80), // improved
    ]);
    const critical = result.alerts.find((a) => a.areaId === 1)!;
    expect(critical.recommendation.length).toBeGreaterThan(10);
    expect(result.counts.stable).toBe(1);
    expect(result.counts.improved).toBe(1);
  });
});

describe("detectComplianceDrift — dedup, sorting and determinism", () => {
  const area = (id: string | number, baseline: number, current: number, name = "Area") => ({
    areaId: id,
    name,
    baselineScore: baseline,
    currentScore: current,
  });

  it("dedupes by areaId with last-wins semantics", () => {
    const result = detectComplianceDrift([
      area("a", 80, 90), // improved (first)
      area("a", 80, 60), // -20 critical (last wins)
    ]);
    expect(result.totalAreas).toBe(1);
    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0]).toMatchObject({ areaId: "a", severity: "critical", driftPts: -20 });
    expect(result.counts.improved).toBe(0);
    expect(result.counts.critical).toBe(1);
  });

  it("sorts alerts by driftPts asc then areaId asc", () => {
    const result = detectComplianceDrift([
      area("b", 100, 95), // -5
      area("a", 100, 95), // -5 (tie -> areaId asc)
      area("c", 100, 70), // -30
      area("d", 100, 90), // -10
    ]);
    expect(result.alerts.map((a) => a.areaId)).toEqual(["c", "d", "a", "b"]);
  });

  it("is deterministic: same input twice yields deep-equal output", () => {
    const input = [area("b", 90, 70), area("a", 80, 85), area("c", 75, 60), area("a", 95, 90)];
    expect(detectComplianceDrift(input)).toEqual(detectComplianceDrift(input));
  });
});

/* ================================================================== */
/* buildExecutiveSummary                                              */
/* ================================================================== */

describe("buildExecutiveSummary — empty / malformed input", () => {
  it("returns EMPTY_EXECUTIVE_SUMMARY for non-object input", () => {
    expect(buildExecutiveSummary(null)).toEqual(EMPTY_EXECUTIVE_SUMMARY);
    expect(buildExecutiveSummary(undefined)).toEqual(EMPTY_EXECUTIVE_SUMMARY);
    expect(buildExecutiveSummary(42 as never)).toEqual(EMPTY_EXECUTIVE_SUMMARY);
    expect(buildExecutiveSummary("x" as never)).toEqual(EMPTY_EXECUTIVE_SUMMARY);
    expect(buildExecutiveSummary([] as never)).toEqual(EMPTY_EXECUTIVE_SUMMARY);
  });

  it("returns a zeroed shape for an empty object (status follows the bands over zeroed metrics)", () => {
    const result = buildExecutiveSummary({});
    expect(result.postureScore).toBe(0);
    expect(result.openCriticalVulns).toBe(0);
    expect(result.overdueVulns).toBe(0);
    expect(result.driftAlertCount).toBe(0);
    expect(result.incidentsLast30d).toBe(0);
    expect(result.mttrTrend).toEqual({ direction: "n-a", pctChange: 0 });
    expect(result.topAreasAtRisk).toEqual([]);
    // zeroed metrics still run the status bands: postureScore 0 < 50 -> Critical
    expect(result.status).toBe("Critical");
  });
});

describe("buildExecutiveSummary — score / count coercion", () => {
  it("clamps postureScore to 0-100 and rounds to 1 decimal", () => {
    expect(buildExecutiveSummary({ postureScore: 82.34 }).postureScore).toBe(82.3);
    expect(buildExecutiveSummary({ postureScore: 150 }).postureScore).toBe(100);
    expect(buildExecutiveSummary({ postureScore: -5 }).postureScore).toBe(0);
    expect(buildExecutiveSummary({ postureScore: Number.NaN }).postureScore).toBe(0);
  });

  it("coerces counts to whole non-negative numbers", () => {
    const result = buildExecutiveSummary({
      openCriticalVulns: 3.7,
      overdueVulns: -2,
      driftAlertCount: Number.NaN,
      incidentsLast30d: 4,
    });
    expect(result.openCriticalVulns).toBe(4);
    expect(result.overdueVulns).toBe(0);
    expect(result.driftAlertCount).toBe(0);
    expect(result.incidentsLast30d).toBe(4);
  });

  it("rounds overallMttrHours to 1 decimal non-negative", () => {
    expect(buildExecutiveSummary({ overallMttrHours: 24.567 }).overallMttrHours).toBe(24.6);
    expect(buildExecutiveSummary({ overallMttrHours: -10 }).overallMttrHours).toBe(0);
  });
});

describe("buildExecutiveSummary — MTTR trend", () => {
  it("reports improved with a positive pctChange when current < prior", () => {
    const result = buildExecutiveSummary({ overallMttrHours: 24, priorMttrHours: 36 });
    expect(result.mttrTrend).toEqual({ direction: "improved", pctChange: 33.3 });
  });

  it("reports worsened with a negative pctChange when current > prior", () => {
    const result = buildExecutiveSummary({ overallMttrHours: 40, priorMttrHours: 32 });
    expect(result.mttrTrend).toEqual({ direction: "worsened", pctChange: -25 });
  });

  it("reports flat when current === prior", () => {
    const result = buildExecutiveSummary({ overallMttrHours: 24, priorMttrHours: 24 });
    expect(result.mttrTrend).toEqual({ direction: "flat", pctChange: 0 });
  });

  it("reports n-a when prior is missing, 0 or invalid", () => {
    expect(buildExecutiveSummary({ overallMttrHours: 24 }).mttrTrend).toEqual({ direction: "n-a", pctChange: 0 });
    expect(buildExecutiveSummary({ overallMttrHours: 24, priorMttrHours: 0 }).mttrTrend).toEqual({
      direction: "n-a",
      pctChange: 0,
    });
    expect(buildExecutiveSummary({ overallMttrHours: 24, priorMttrHours: -5 }).mttrTrend).toEqual({
      direction: "n-a",
      pctChange: 0,
    });
  });
});

describe("buildExecutiveSummary — status bands", () => {
  it("is Critical when driftAlertCount >= 5 (and Watch, not Good, below that)", () => {
    expect(buildExecutiveSummary({ postureScore: 90, driftAlertCount: 5 }).status).toBe("Critical");
    expect(buildExecutiveSummary({ postureScore: 90, driftAlertCount: 4, overdueVulns: 0 }).status).toBe("Watch");
  });

  it("is Critical when overdueVulns >= 10", () => {
    expect(buildExecutiveSummary({ postureScore: 90, overdueVulns: 10 }).status).toBe("Critical");
    expect(buildExecutiveSummary({ postureScore: 90, overdueVulns: 9 }).status).toBe("Watch");
  });

  it("is Critical when postureScore < 50 (and Watch at 50, since 50 < 75)", () => {
    expect(buildExecutiveSummary({ postureScore: 49.9, driftAlertCount: 0, overdueVulns: 0 }).status).toBe("Critical");
    expect(buildExecutiveSummary({ postureScore: 50 }).status).toBe("Watch");
  });

  it("is Watch when driftAlertCount >= 1, overdueVulns >= 1 or postureScore < 75", () => {
    expect(buildExecutiveSummary({ postureScore: 90, driftAlertCount: 1 }).status).toBe("Watch");
    expect(buildExecutiveSummary({ postureScore: 90, overdueVulns: 1 }).status).toBe("Watch");
    expect(buildExecutiveSummary({ postureScore: 74.9 }).status).toBe("Watch");
  });

  it("is Good only when no alert pressure and postureScore >= 75", () => {
    expect(buildExecutiveSummary({ postureScore: 75 }).status).toBe("Good");
    expect(buildExecutiveSummary({ postureScore: 100, driftAlertCount: 0, overdueVulns: 0 }).status).toBe("Good");
  });
});

describe("buildExecutiveSummary — top areas at risk", () => {
  it("dedupes by areaId (last wins), sorts driftPts asc then areaId asc, slices to 3", () => {
    const result = buildExecutiveSummary({
      areasAtRisk: [
        { areaId: "b", name: "B", driftPts: -5 },
        { areaId: "a", name: "A", driftPts: -30 },
        { areaId: "c", name: "C", driftPts: -12 },
        { areaId: "d", name: "D", driftPts: -8 },
        { areaId: "a", name: "A2", driftPts: -25 }, // last wins for "a"
      ],
    });
    expect(result.topAreasAtRisk).toEqual([
      { areaId: "a", name: "A2", driftPts: -25 },
      { areaId: "c", name: "C", driftPts: -12 },
      { areaId: "d", name: "D", driftPts: -8 },
    ]);
  });

  it("rounds driftPts to 1 decimal and coerces invalid entries", () => {
    const result = buildExecutiveSummary({
      areasAtRisk: [
        { areaId: 1, name: "X", driftPts: -10.34 },
        { areaId: null, name: "Y", driftPts: Number.NaN },
      ],
    });
    expect(result.topAreasAtRisk[0]).toMatchObject({ areaId: 1, name: "X", driftPts: -10.3 });
    expect(result.topAreasAtRisk[1]).toMatchObject({ areaId: "", name: "Y", driftPts: 0 });
  });
});

describe("buildExecutiveSummary — full rollup and determinism", () => {
  it("produces a coherent full rollup", () => {
    const result = buildExecutiveSummary({
      postureScore: 68.4,
      openCriticalVulns: 2,
      overdueVulns: 3,
      overallMttrHours: 41.2,
      priorMttrHours: 48,
      driftAlertCount: 2,
      incidentsLast30d: 5,
      areasAtRisk: [
        { areaId: "a", name: "Risk analysis", driftPts: -28 },
        { areaId: "b", name: "Supply chain", driftPts: -26 },
      ],
    });
    expect(result).toMatchObject({
      postureScore: 68.4,
      openCriticalVulns: 2,
      overdueVulns: 3,
      overallMttrHours: 41.2,
      mttrTrend: { direction: "improved", pctChange: 14.2 }, // (48-41.2)/48*100 = 14.166.. -> 14.2
      driftAlertCount: 2,
      incidentsLast30d: 5,
      topAreasAtRisk: [
        { areaId: "a", name: "Risk analysis", driftPts: -28 },
        { areaId: "b", name: "Supply chain", driftPts: -26 },
      ],
      status: "Watch", // driftAlertCount 2 >= 1
    });
  });

  it("is deterministic: same input twice yields deep-equal output", () => {
    const input = {
      postureScore: 55.5,
      overdueVulns: 2,
      overallMttrHours: 30,
      priorMttrHours: 25,
      driftAlertCount: 1,
      areasAtRisk: [{ areaId: "x", name: "X", driftPts: -15 }],
    };
    expect(buildExecutiveSummary(input)).toEqual(buildExecutiveSummary(input));
  });
});
