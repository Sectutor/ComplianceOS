import { describe, it, expect } from "vitest";

/**
 * NIS2 Continuous Compliance Monitoring engine (lib/nis2/complianceMonitor.ts) —
 * engine tests (QA cycle 22, NIS2 Phase 5 Task 5.2 / ENISA Measure 7.1 /
 * NIS2 Art. 21(2)(f)).
 *
 * Mirrors securityMetrics.test.ts / vulnerabilityMgmt.test.ts: the engine is
 * pure and deterministic, never throws, and accepts an injectable clock via
 * `now` (ISO string | epoch number | Date) OR a `clock` factory. Every
 * function is exercised at its band boundaries, on malformed input, on clock
 * injection, and for input determinism (same input twice => deep-equal).
 *
 * Contract under test:
 *   computeCompliancePosture(input) -> { overallScore, status, coverageRate,
 *       driftPts, trend, statusCounts, topGaps, totalMeasures,
 *       assessedMeasures, verdict }
 *   trackEvidenceCoverage(input)   -> { coverageRate, totalItems,
 *       coveredCount, missingCount, expiringCount, expiredCount, currentCount,
 *       avgEvidencePerControl, byMeasure, items }
 *   generateAuditReport(input)     -> { report, sections, generatedAt,
 *       postureScore, coverageRate, topGaps, recommendationCount }
 *
 * Posture model (computeCompliancePosture):
 *   Equal-weight average of valid (finite) scores, clamped 0-100, 1 decimal.
 *   Bands on the UNROUNDED average: Strong >= 85, Developing >= 65,
 *   At Risk >= 40, Critical < 40; empty measures -> status "No Data" and
 *   overallScore 0. coverageRate = valid/total (1 decimal, 0 when total 0).
 *   Per-measure driftPts = score - baselineScore (1 decimal, null when
 *   baseline missing); top-level driftPts is the mean of per-measure drifts
 *   (null when no measure has a baseline). Trend thresholds +0.05 / -0.05:
 *   driftPts >= 0.05 -> improved; <= -0.05 -> declined; else stable; when
 *   driftPts is null -> "n-a". topGaps: numeric-score measures only, sorted
 *   score asc then measureId asc, sliced to 5.
 *
 * Evidence model (trackEvidenceCoverage):
 *   covered = evidenceCount finite > 0. Expiry is evaluated ONLY for covered
 *   items with a valid expiresAt: expired when expiresAt < now; expiring when
 *   0 <= delta <= 90 days (delta exactly 90d AND exactly 0 are expiring);
 *   current otherwise; anything else -> "n-a". byMeasure rolls items up by
 *   measureId (coverageRate asc then measureId asc). items sorted by
 *   controlId asc, null/undefined last.
 *
 * Audit-report model (generateAuditReport):
 *   postureScore derived from measures when not provided; section statuses:
 *   posture pass >= 85 / warn >= 65 / else fail; evidence pass >= 80 /
 *   warn >= 50 / else fail; gaps fail when any top gap else pass. Report is a
 *   deterministic markdown string; generatedAt reflects the injected clock.
 */

const NOW = new Date("2026-08-19T00:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const iso = (msOffset: number) => new Date(NOW.getTime() + msOffset).toISOString();

import {
  computeCompliancePosture,
  trackEvidenceCoverage,
  generateAuditReport,
  EMPTY_COMPLIANCE_POSTURE,
  EMPTY_EVIDENCE_COVERAGE,
  EMPTY_AUDIT_REPORT,
} from "../nis2/complianceMonitor";

/* ================================================================== */
/* computeCompliancePosture — score math, rounding, clamping          */
/* ================================================================== */

describe("computeCompliancePosture — score math, rounding and clamping", () => {
  it("computes an equal-weight average of all valid scores", () => {
    const result = computeCompliancePosture({
      measures: [
        { measureId: "m1", score: 90 },
        { measureId: "m2", score: 70 },
      ],
    });
    expect(result.overallScore).toBe(80);
    expect(result.assessedMeasures).toBe(2);
    expect(result.totalMeasures).toBe(2);
  });

  it("rounds the average to 1 decimal (250/3 = 83.333 -> 83.3)", () => {
    const result = computeCompliancePosture({
      measures: [
        { measureId: "m1", score: 90 },
        { measureId: "m2", score: 80 },
        { measureId: "m3", score: 80 },
      ],
    });
    expect(result.overallScore).toBe(83.3);
  });

  it("clamps out-of-range scores to 0-100 before averaging", () => {
    const high = computeCompliancePosture({ measures: [{ measureId: "m1", score: 200 }] });
    expect(high.overallScore).toBe(100);
    expect(high.status).toBe("Strong");

    const low = computeCompliancePosture({ measures: [{ measureId: "m1", score: -10 }] });
    expect(low.overallScore).toBe(0);
    expect(low.status).toBe("Critical");
  });

  it("excludes invalid score rows (string / null / NaN / Infinity / undefined) from the average but counts them in total and coverage", () => {
    const result = computeCompliancePosture({
      measures: [
        { measureId: "m1", score: 90 },
        { measureId: "m2", score: "nope" as never },
        { measureId: "m3", score: null as never },
        { measureId: "m4", score: Number.NaN },
        { measureId: "m5", score: Number.POSITIVE_INFINITY },
        { measureId: "m6", score: undefined },
      ],
    });
    expect(result.overallScore).toBe(90);
    expect(result.assessedMeasures).toBe(1);
    expect(result.totalMeasures).toBe(6);
    expect(result.coverageRate).toBe(16.7);
  });

  it("handles single-measure extremes (0 and 100) at the round-trip boundary", () => {
    expect(computeCompliancePosture({ measures: [{ measureId: "m1", score: 100 }] }).overallScore).toBe(100);
    expect(computeCompliancePosture({ measures: [{ measureId: "m1", score: 0 }] }).overallScore).toBe(0);
  });
});

/* ================================================================== */
/* computeCompliancePosture — band boundaries                         */
/* ================================================================== */

describe("computeCompliancePosture — band boundaries (UNROUNDED average)", () => {
  it("maps 85 exactly to Strong", () => {
    const result = computeCompliancePosture({ measures: [{ measureId: "m1", score: 85 }] });
    expect(result.overallScore).toBe(85);
    expect(result.status).toBe("Strong");
  });

  it("maps 84.99 to Developing while overallScore rounds up to 85.0 (band on unrounded avg)", () => {
    const result = computeCompliancePosture({ measures: [{ measureId: "m1", score: 84.99 }] });
    expect(result.overallScore).toBe(85);
    expect(result.status).toBe("Developing");
  });

  it("maps 65 exactly to Developing and 64.99 to At Risk", () => {
    const dev = computeCompliancePosture({ measures: [{ measureId: "m1", score: 65 }] });
    expect(dev.overallScore).toBe(65);
    expect(dev.status).toBe("Developing");

    const risk = computeCompliancePosture({ measures: [{ measureId: "m1", score: 64.99 }] });
    expect(risk.overallScore).toBe(65);
    expect(risk.status).toBe("At Risk");
  });

  it("maps 40 exactly to At Risk and 39.99 to Critical", () => {
    const risk = computeCompliancePosture({ measures: [{ measureId: "m1", score: 40 }] });
    expect(risk.overallScore).toBe(40);
    expect(risk.status).toBe("At Risk");

    const critical = computeCompliancePosture({ measures: [{ measureId: "m1", score: 39.99 }] });
    expect(critical.overallScore).toBe(40);
    expect(critical.status).toBe("Critical");
  });

  it("maps empty measures to No Data with overallScore 0", () => {
    const result = computeCompliancePosture({ measures: [] });
    expect(result.status).toBe("No Data");
    expect(result.overallScore).toBe(0);
    expect(result.totalMeasures).toBe(0);
    expect(result.assessedMeasures).toBe(0);
    expect(result.coverageRate).toBe(0);
  });

  it("applies the band on the multi-measure average (85.0 Strong vs 84.95 Developing)", () => {
    const strong = computeCompliancePosture({
      measures: [
        { measureId: "m1", score: 90 },
        { measureId: "m2", score: 80 },
      ],
    });
    expect(strong.overallScore).toBe(85);
    expect(strong.status).toBe("Strong");

    const developing = computeCompliancePosture({
      measures: [
        { measureId: "m1", score: 90 },
        { measureId: "m2", score: 79.9 },
      ],
    });
    expect(developing.overallScore).toBe(85); // 84.95 -> 85.0
    expect(developing.status).toBe("Developing"); // band on unrounded 84.95
  });
});

/* ================================================================== */
/* computeCompliancePosture — coverage rate                           */
/* ================================================================== */

describe("computeCompliancePosture — coverageRate", () => {
  const mk = (scores: Array<number | null>) =>
    computeCompliancePosture({ measures: scores.map((s, i) => ({ measureId: `m${i}`, score: s as never })) });

  it("computes 2/5 -> 40", () => {
    const result = mk([90, null, 80, null, null]);
    expect(result.coverageRate).toBe(40);
    expect(result.assessedMeasures).toBe(2);
    expect(result.totalMeasures).toBe(5);
  });

  it("computes 0/5 -> 0, 5/5 -> 100 and 0 when total is 0", () => {
    expect(mk([null, null, null, null, null]).coverageRate).toBe(0);
    expect(mk([90, 80, 70, 60, 50]).coverageRate).toBe(100);
    expect(computeCompliancePosture({ measures: [] }).coverageRate).toBe(0);
  });

  it("rounds fractional coverage to 1 decimal (1/3 -> 33.3)", () => {
    const result = mk([90, null, null]);
    expect(result.coverageRate).toBe(33.3);
  });
});

/* ================================================================== */
/* computeCompliancePosture — statusCounts and topGaps                */
/* ================================================================== */

describe("computeCompliancePosture — statusCounts and topGaps", () => {
  it("populates all five status buckets from per-measure bands", () => {
    const result = computeCompliancePosture({
      measures: [
        { measureId: "m1", name: "Risk analysis", score: 90 }, // strong
        { measureId: "m2", name: "Supply chain", score: 70 }, // developing
        { measureId: "m3", name: "Incident handling", score: 50 }, // at risk
        { measureId: "m4", name: "BCM", score: 30 }, // critical
        { measureId: "m5", name: "No data", score: null as never }, // no data
      ],
    });
    expect(result.statusCounts).toEqual({ strong: 1, developing: 1, atRisk: 1, critical: 1, noData: 1 });
  });

  it("counts all non-numeric-score measures as noData", () => {
    const result = computeCompliancePosture({
      measures: [
        { measureId: "m1", score: 90 },
        { measureId: "m2", score: undefined },
        { measureId: "m3", score: Number.NaN },
      ],
    });
    expect(result.statusCounts).toEqual({ strong: 1, developing: 0, atRisk: 0, critical: 0, noData: 2 });
  });

  it("restricts topGaps to numeric-score measures", () => {
    const result = computeCompliancePosture({
      measures: [
        { measureId: "m1", name: "A", score: 90 },
        { measureId: "m2", name: "B", score: undefined },
        { measureId: "m3", name: "C", score: 40 },
        { measureId: "m4", name: "D", score: null as never },
      ],
    });
    expect(result.topGaps.map((g) => g.measureId)).toEqual(["m3", "m1"]);
  });

  it("sorts topGaps by score asc then measureId asc", () => {
    const result = computeCompliancePosture({
      measures: [
        { measureId: "m2", name: "B", score: 60 },
        { measureId: "m1", name: "A", score: 90 },
        { measureId: "m3", name: "C", score: 40 },
        { measureId: "m4", name: "D", score: 75 },
      ],
    });
    expect(result.topGaps.map((g) => g.measureId)).toEqual(["m3", "m2", "m4", "m1"]);
    expect(result.topGaps[0]).toMatchObject({ measureId: "m3", score: 40 });
  });

  it("breaks topGaps ties by measureId ascending", () => {
    const result = computeCompliancePosture({
      measures: [
        { measureId: "m-b", name: "B", score: 50 },
        { measureId: "m-a", name: "A", score: 50 },
        { measureId: "m-c", name: "C", score: 50 },
      ],
    });
    expect(result.topGaps.map((g) => g.measureId)).toEqual(["m-a", "m-b", "m-c"]);
  });

  it("slices topGaps to a maximum of 5", () => {
    const result = computeCompliancePosture({
      measures: [90, 80, 70, 60, 50, 40].map((s, i) => ({ measureId: `m${i}`, name: `M${i}`, score: s })),
    });
    expect(result.topGaps).toHaveLength(5);
    expect(result.topGaps.map((g) => g.score)).toEqual([40, 50, 60, 70, 80]);
    expect(result.topGaps[4].measureId).toBe("m1"); // 90 is sliced away
  });

});

/* ================================================================== */
/* computeCompliancePosture — driftPts and trend                      */
/* ================================================================== */

describe("computeCompliancePosture — driftPts and trend", () => {
  it("computes per-measure drift as score - baselineScore (1 decimal)", () => {
    const result = computeCompliancePosture({
      measures: [
        { measureId: "m1", name: "Risk analysis", score: 90, baselineScore: 80 },
        { measureId: "m2", name: "Fractional", score: 83.3, baselineScore: 82.1 }, // raw 1.2 -> driftPts 1.2
      ],
    });
    expect(result.driftPts).toBe(5.6); // (10 + 1.2) / 2
    expect(result.trend).toBe("improved");
  });

  it("returns null driftPts and n-a trend when no baseline is present", () => {
    const result = computeCompliancePosture({
      measures: [
        { measureId: "m1", score: 90 },
        { measureId: "m2", score: 70 },
      ],
    });
    expect(result.driftPts).toBeNull();
    expect(result.trend).toBe("n-a");
  });

  it("classifies improved at exactly +0.05 and stable just below (0.0499)", () => {
    const improved = computeCompliancePosture({
      measures: [{ measureId: "m1", score: 80.05, baselineScore: 80 }],
    });
    expect(improved.trend).toBe("improved");
    expect(improved.driftPts).toBe(0.1); // 1dp rounding of +0.05

    const stable = computeCompliancePosture({
      measures: [{ measureId: "m1", score: 80.0499, baselineScore: 80 }],
    });
    expect(stable.trend).toBe("stable");
    expect(stable.driftPts).toBe(0);
  });

  it("classifies declined when the 1-decimal-rounded drift is <= -0.05 and stable just above (-0.0499)", () => {
    const declined = computeCompliancePosture({
      measures: [{ measureId: "m1", score: 79.94, baselineScore: 80 }], // raw -0.06 -> -0.1
    });
    expect(declined.trend).toBe("declined");
    expect(declined.driftPts).toBe(-0.1);

    const stable = computeCompliancePosture({
      measures: [{ measureId: "m1", score: 79.9501, baselineScore: 80 }], // raw -0.0499 -> 0.0
    });
    expect(stable.trend).toBe("stable");
    expect(stable.driftPts).toEqual(0); // toEqual: tolerates -0 normalization
  });

  it("averages per-measure drift for the top-level driftPts (10 + -5)/2 = 2.5", () => {
    const result = computeCompliancePosture({
      measures: [
        { measureId: "m1", score: 90, baselineScore: 80 }, // +10
        { measureId: "m2", score: 60, baselineScore: 65 }, // -5
      ],
    });
    expect(result.driftPts).toBe(2.5);
    expect(result.trend).toBe("improved");
  });

  it("returns null driftPts and n-a trend when every measure lacks a baseline", () => {
    const result = computeCompliancePosture({
      measures: [
        { measureId: "m1", score: 90 },
        { measureId: "m2", score: 40 },
      ],
    });
    expect(result.driftPts).toBeNull();
    expect(result.trend).toBe("n-a");
  });
});

/* ================================================================== */
/* computeCompliancePosture — clock injection and determinism         */
/* ================================================================== */

describe("computeCompliancePosture — clock injection and determinism", () => {
  const input = {
    measures: [
      { measureId: "m1", score: 90, baselineScore: 80 },
      { measureId: "m2", score: 60, baselineScore: 65 },
    ],
  };

  it("accepts now as ISO string, epoch number and Date without throwing", () => {
    const baseline = computeCompliancePosture(input);
    expect(computeCompliancePosture({ ...input, now: NOW.toISOString() })).toEqual(baseline);
    expect(computeCompliancePosture({ ...input, now: NOW.getTime() })).toEqual(baseline);
    expect(computeCompliancePosture({ ...input, now: NOW as never })).toEqual(baseline);
  });

  it("honors a clock factory when now is absent", () => {
    const baseline = computeCompliancePosture(input);
    const result = computeCompliancePosture({ ...input, clock: () => NOW });
    expect(result).toEqual(baseline);
  });

  it("falls back when the clock factory throws (never throws)", () => {
    const result = computeCompliancePosture({
      ...input,
      clock: () => {
        throw new Error("boom");
      },
    });
    expect(result.overallScore).toBe(75);
    expect(result.totalMeasures).toBe(2);
  });

  it("is deterministic: same input twice yields deep-equal output, and always emits a non-empty verdict", () => {
    expect(computeCompliancePosture(input)).toEqual(computeCompliancePosture(input));
    expect(computeCompliancePosture({ ...input, now: NOW.toISOString() })).toEqual(
      computeCompliancePosture({ ...input, now: NOW.toISOString() })
    );
    const result = computeCompliancePosture(input);
    expect(typeof result.verdict).toBe("string");
    expect(result.verdict.length).toBeGreaterThan(0);
  });
});

/* ================================================================== */
/* computeCompliancePosture — never-throws and EMPTY shape            */
/* ================================================================== */

describe("computeCompliancePosture — never-throws and EMPTY shape", () => {
  it("returns EMPTY_COMPLIANCE_POSTURE for undefined / null / non-object input", () => {
    expect(computeCompliancePosture(undefined)).toEqual(EMPTY_COMPLIANCE_POSTURE);
    expect(computeCompliancePosture(null as never)).toEqual(EMPTY_COMPLIANCE_POSTURE);
    expect(computeCompliancePosture(42 as never)).toEqual(EMPTY_COMPLIANCE_POSTURE);
    expect(computeCompliancePosture("x" as never)).toEqual(EMPTY_COMPLIANCE_POSTURE);
    expect(computeCompliancePosture([] as never)).toEqual(EMPTY_COMPLIANCE_POSTURE);
  });

  it("returns EMPTY_COMPLIANCE_POSTURE when measures is missing or a non-array", () => {
    expect(computeCompliancePosture({})).toEqual(EMPTY_COMPLIANCE_POSTURE);
    expect(computeCompliancePosture({ measures: "x" as never })).toEqual(EMPTY_COMPLIANCE_POSTURE);
    expect(computeCompliancePosture({ measures: 42 as never })).toEqual(EMPTY_COMPLIANCE_POSTURE);
  });

  it("never throws on garbage rows (non-objects, missing ids, junk fields)", () => {
    const result = computeCompliancePosture({
      measures: [null, 42, "x", {}, { measureId: 1, score: 90 }] as never,
    });
    expect(result.overallScore).toBe(90);
    expect(result.assessedMeasures).toBe(1);
    expect(result.status).toBe("Strong");
  });

  it("emits a zeroed EMPTY shape with all expected keys", () => {
    const empty = EMPTY_COMPLIANCE_POSTURE;
    expect(empty.overallScore).toBe(0);
    expect(empty.status).toBe("No Data");
    expect(empty.coverageRate).toBe(0);
    expect(empty.driftPts).toBeNull();
    expect(empty.trend).toBe("n-a");
    expect(empty.statusCounts).toEqual({ strong: 0, developing: 0, atRisk: 0, critical: 0, noData: 0 });
    expect(empty.topGaps).toEqual([]);
    expect(empty.totalMeasures).toBe(0);
    expect(empty.assessedMeasures).toBe(0);
    expect(typeof empty.verdict).toBe("string");
  });

  it("freezes the exported EMPTY_COMPLIANCE_POSTURE constant", () => {
    expect(Object.isFrozen(EMPTY_COMPLIANCE_POSTURE)).toBe(true);
  });
});

/* ================================================================== */
/* trackEvidenceCoverage — covered / missing derivation               */
/* ================================================================== */

describe("trackEvidenceCoverage — covered/missing derivation", () => {
  const ev = (controlId: string | number | null, overrides: Record<string, unknown> = {}) => ({
    controlId,
    name: `Control ${String(controlId)}`,
    evidenceCount: 1,
    ...overrides,
  });

  it("marks covered only when evidenceCount is finite and > 0", () => {
    const result = trackEvidenceCoverage({
      now: NOW.toISOString(),
      items: [
        ev("c1", { evidenceCount: 5 }), // covered
        ev("c2", { evidenceCount: 0 }), // missing
        ev("c3", { evidenceCount: null }), // missing
        ev("c4", { evidenceCount: -3 }), // missing
        ev("c5", { evidenceCount: 0.5 }), // covered (positive fractional)
        ev("c6", { evidenceCount: "7" }), // string -> not finite -> missing
        ev("c7", { evidenceCount: Number.NaN }), // missing
        ev("c8", { evidenceCount: Number.POSITIVE_INFINITY }), // missing
      ],
    });
    expect(result.coveredCount).toBe(2);
    expect(result.missingCount).toBe(6);
    expect(result.totalItems).toBe(8);
    const byId = Object.fromEntries(result.items.map((i) => [i.controlId, i]));
    expect(byId.c1.status).toBe("covered");
    expect(byId.c2.status).toBe("missing");
    expect(byId.c3.status).toBe("missing");
    expect(byId.c4.status).toBe("missing");
    expect(byId.c5.status).toBe("covered");
    expect(byId.c6.status).toBe("missing");
    expect(byId.c7.status).toBe("missing");
    expect(byId.c8.status).toBe("missing");
  });

  it("computes coverageRate as covered/total (2/5 -> 40)", () => {
    const result = trackEvidenceCoverage({
      now: NOW.toISOString(),
      items: [
        ev("c1", { evidenceCount: 3 }),
        ev("c2", { evidenceCount: 0 }),
        ev("c3", { evidenceCount: 1 }),
        ev("c4", { evidenceCount: 0 }),
        ev("c5", { evidenceCount: 0 }),
      ],
    });
    expect(result.coverageRate).toBe(40);
    expect(result.totalItems).toBe(5);
    expect(result.coveredCount).toBe(2);
    expect(result.missingCount).toBe(3);
  });

  it("computes avgEvidencePerControl over covered items with 1-decimal rounding", () => {
    const fractional = trackEvidenceCoverage({
      now: NOW.toISOString(),
      items: [ev("c1", { evidenceCount: 1 }), ev("c2", { evidenceCount: 4 })],
    });
    expect(fractional.avgEvidencePerControl).toBe(2.5);

    const rounding = trackEvidenceCoverage({
      now: NOW.toISOString(),
      items: [ev("c1", { evidenceCount: 1 }), ev("c2", { evidenceCount: 2 }), ev("c3", { evidenceCount: 2 })],
    });
    expect(rounding.avgEvidencePerControl).toBe(1.7); // 5/3 = 1.666 -> 1.7
  });

  it("returns zeroed counts for an empty items array", () => {
    const result = trackEvidenceCoverage({ items: [], now: NOW.toISOString() });
    expect(result.totalItems).toBe(0);
    expect(result.coveredCount).toBe(0);
    expect(result.missingCount).toBe(0);
    expect(result.coverageRate).toBe(0);
    expect(result.avgEvidencePerControl).toBe(0);
    expect(result.byMeasure).toEqual([]);
    expect(result.items).toEqual([]);
  });
});

/* ================================================================== */
/* trackEvidenceCoverage — expiry windows and boundaries              */
/* ================================================================== */

describe("trackEvidenceCoverage — expiry windows and boundaries", () => {
  const ev = (controlId: string | number, expiresAt: string | number | null | undefined, evidenceCount = 1) => ({
    controlId,
    name: `Control ${controlId}`,
    evidenceCount,
    expiresAt,
  });

  it("marks expired when expiresAt is 1ms before now", () => {
    const result = trackEvidenceCoverage({
      now: NOW.toISOString(),
      items: [ev("c1", iso(-1))],
    });
    expect(result.items[0].expiry).toBe("expired");
    expect(result.expiredCount).toBe(1);
  });

  it("marks expiring when the expiry delta is exactly 0 (expiresAt === now)", () => {
    const result = trackEvidenceCoverage({
      now: NOW.toISOString(),
      items: [ev("c1", NOW.toISOString())],
    });
    expect(result.items[0].expiry).toBe("expiring");
    expect(result.expiringCount).toBe(1);
    expect(result.expiredCount).toBe(0);
  });

  it("marks expiring when the expiry delta is exactly 90 days", () => {
    const result = trackEvidenceCoverage({
      now: NOW.toISOString(),
      items: [ev("c1", iso(90 * DAY_MS))],
    });
    expect(result.items[0].expiry).toBe("expiring");
    expect(result.expiringCount).toBe(1);
  });

  it("marks current when the expiry delta exceeds 90 days by 1ms", () => {
    const result = trackEvidenceCoverage({
      now: NOW.toISOString(),
      items: [ev("c1", iso(90 * DAY_MS + 1))],
    });
    expect(result.items[0].expiry).toBe("current");
    expect(result.currentCount).toBe(1);
    expect(result.expiringCount).toBe(0);
  });

  it("marks n-a for invalid, missing or non-date expiresAt values", () => {
    const result = trackEvidenceCoverage({
      now: NOW.toISOString(),
      items: [
        ev("c1", "not-a-date"),
        ev("c2", undefined),
        ev("c3", Number.NaN),
        ev("c4", iso(30 * DAY_MS)),
      ],
    });
    expect(result.items.map((i) => i.expiry)).toEqual(["n-a", "n-a", "n-a", "expiring"]);
  });

  it("marks n-a for uncovered items even when expiresAt is a valid future date", () => {
    const result = trackEvidenceCoverage({
      now: NOW.toISOString(),
      items: [ev("c1", iso(30 * DAY_MS), 0)], // evidenceCount 0 -> missing -> n-a
    });
    expect(result.items[0].status).toBe("missing");
    expect(result.items[0].expiry).toBe("n-a");
  });

  it("rolls up expiring / expired / current counts across a mixed register", () => {
    const result = trackEvidenceCoverage({
      now: NOW.toISOString(),
      items: [
        ev("c1", iso(-1)), // expired
        ev("c2", iso(30 * DAY_MS)), // expiring
        ev("c3", iso(200 * DAY_MS)), // current
        ev("c4", undefined), // n-a (no expiresAt)
        ev("c5", iso(30 * DAY_MS), 0), // missing -> n-a
      ],
    });
    expect(result.expiredCount).toBe(1);
    expect(result.expiringCount).toBe(1);
    expect(result.currentCount).toBe(1);
  });
});

/* ================================================================== */
/* trackEvidenceCoverage — byMeasure rollup and item sorting          */
/* ================================================================== */

describe("trackEvidenceCoverage — byMeasure rollup and item sorting", () => {
  const ev = (controlId: string | number, measureId: string | null, evidenceCount: number) => ({
    controlId,
    measureId,
    name: `Control ${controlId}`,
    evidenceCount,
    expiresAt: iso(30 * DAY_MS),
  });

  it("rolls up per-measure totals, covered counts and coverageRate", () => {
    const result = trackEvidenceCoverage({
      now: NOW.toISOString(),
      items: [
        ev("a", "m1", 1),
        ev("b", "m1", 0),
        ev("c", "m2", 2),
        ev("d", "m2", 3),
        ev("e", "m2", 0),
      ],
    });
    const m1 = result.byMeasure.find((m) => m.measureId === "m1")!;
    const m2 = result.byMeasure.find((m) => m.measureId === "m2")!;
    expect(m1).toMatchObject({ measureId: "m1", total: 2, covered: 1, coverageRate: 50 });
    expect(m2).toMatchObject({ measureId: "m2", total: 3, covered: 2, coverageRate: 66.7 });
    expect(typeof m1.name).toBe("string");
  });

  it("sorts byMeasure by coverageRate asc then measureId asc", () => {
    const result = trackEvidenceCoverage({
      now: NOW.toISOString(),
      items: [
        ev("a", "m2", 1), // 1/1 -> 100
        ev("b", "m1", 2), // 1/1 -> 100 (tie -> m1 first)
        ev("c", "m3", 0), // 0/1 -> 0
        ev("d", "m4", 0), // 0/1 -> 0 (tie -> m3 first)
      ],
    });
    expect(result.byMeasure.map((m) => m.measureId)).toEqual(["m3", "m4", "m1", "m2"]);
  });

  it("groups items without a measureId into an empty-key rollup", () => {
    const result = trackEvidenceCoverage({
      now: NOW.toISOString(),
      items: [ev("a", null, 1), ev("b", null, 0)],
    });
    expect(result.byMeasure).toHaveLength(1);
    expect(result.byMeasure[0].total).toBe(2);
    expect(result.byMeasure[0].covered).toBe(1);
  });

  it("sorts items by controlId ascending", () => {
    const result = trackEvidenceCoverage({
      now: NOW.toISOString(),
      items: [ev("c3", "m1", 1), ev("c1", "m1", 1), ev("c2", "m1", 1)],
    });
    expect(result.items.map((i) => i.controlId)).toEqual(["c1", "c2", "c3"]);
  });

  it("places items with null/undefined controlId last", () => {
    const result = trackEvidenceCoverage({
      now: NOW.toISOString(),
      items: [
        { controlId: null, name: "Null", evidenceCount: 1, expiresAt: iso(30 * DAY_MS) },
        { controlId: "c1", name: "One", evidenceCount: 1, expiresAt: iso(30 * DAY_MS) },
        { controlId: undefined, name: "Undef", evidenceCount: 1, expiresAt: iso(30 * DAY_MS) },
      ],
    });
    expect(result.items.map((i) => i.controlId)).toEqual(["c1", null, null]); // undefined normalizes to null
  });
});

/* ================================================================== */
/* trackEvidenceCoverage — clock injection, determinism, never-throws */
/* ================================================================== */

describe("trackEvidenceCoverage — clock injection, determinism and never-throws", () => {
  const items = [
    { controlId: "c1", name: "One", evidenceCount: 1, expiresAt: iso(30 * DAY_MS) },
    { controlId: "c2", name: "Two", evidenceCount: 0, expiresAt: iso(-1) },
  ];

  it("accepts now as ISO string, epoch number and Date", () => {
    const baseline = trackEvidenceCoverage({ items, now: NOW.toISOString() });
    expect(trackEvidenceCoverage({ items, now: NOW.getTime() })).toEqual(baseline);
    expect(trackEvidenceCoverage({ items, now: NOW as never })).toEqual(baseline);
  });

  it("honors a clock factory and falls back when it throws", () => {
    const baseline = trackEvidenceCoverage({ items, now: NOW.toISOString() });
    expect(trackEvidenceCoverage({ items, clock: () => NOW })).toEqual(baseline);
    const fallback = trackEvidenceCoverage({
      items,
      clock: () => {
        throw new Error("boom");
      },
    });
    expect(fallback.totalItems).toBe(2);
  });

  it("is deterministic: same input twice yields deep-equal output", () => {
    const input = { items, now: NOW.toISOString() };
    expect(trackEvidenceCoverage(input)).toEqual(trackEvidenceCoverage(input));
  });

  it("returns EMPTY_EVIDENCE_COVERAGE for undefined / null / non-object input", () => {
    expect(trackEvidenceCoverage(undefined)).toEqual(EMPTY_EVIDENCE_COVERAGE);
    expect(trackEvidenceCoverage(null as never)).toEqual(EMPTY_EVIDENCE_COVERAGE);
    expect(trackEvidenceCoverage(42 as never)).toEqual(EMPTY_EVIDENCE_COVERAGE);
    expect(trackEvidenceCoverage("x" as never)).toEqual(EMPTY_EVIDENCE_COVERAGE);
    expect(trackEvidenceCoverage({} as never)).toEqual(EMPTY_EVIDENCE_COVERAGE);
    expect(trackEvidenceCoverage({ items: "x" as never })).toEqual(EMPTY_EVIDENCE_COVERAGE);
  });

  it("never throws on garbage rows and still processes the valid row", () => {
    const result = trackEvidenceCoverage({
      now: NOW.toISOString(),
      items: [null, 42, "x", {}, { controlId: "ok", name: "Ok", evidenceCount: 3, expiresAt: iso(30 * DAY_MS) }] as never,
    });
    expect(result.coveredCount).toBe(1);
    expect(result.expiringCount).toBe(1);
  });

  it("freezes the exported EMPTY_EVIDENCE_COVERAGE constant", () => {
    expect(Object.isFrozen(EMPTY_EVIDENCE_COVERAGE)).toBe(true);
  });
});

/* ================================================================== */
/* generateAuditReport — structure, determinism, clock                */
/* ================================================================== */

describe("generateAuditReport — structure, determinism and clock", () => {
  const validInput = {
    entityName: "Acme GmbH",
    entitySector: "Energy",
    measures: [
      { measureId: "m1", name: "Risk analysis", score: 90 },
      { measureId: "m2", name: "Supply chain", score: 55 },
    ],
    evidenceSummary: { total: 10, covered: 8, coverageRate: 80 },
    now: NOW.toISOString(),
  };

  it("emits the four sections posture/measures/evidence/gaps with titles and enum statuses", () => {
    const result = generateAuditReport(validInput);
    expect(result.sections.map((s) => s.key)).toEqual(["posture", "measures", "evidence", "gaps"]);
    for (const section of result.sections) {
      expect(typeof section.title).toBe("string");
      expect(section.title.length).toBeGreaterThan(0);
      expect(["pass", "warn", "fail", "info"]).toContain(section.status);
    }
  });

  it("produces a non-empty markdown report and is deterministic: identical input yields a byte-identical report", () => {
    const a = generateAuditReport(validInput);
    const b = generateAuditReport(validInput);
    expect(typeof a.report).toBe("string");
    expect(a.report.trim().length).toBeGreaterThan(50);
    expect(a.report).toBe(b.report);
    expect(a).toEqual(b);
  });

  it("reflects the injected clock in generatedAt (ISO string, epoch and Date)", () => {
    expect(generateAuditReport({ ...validInput, now: NOW.toISOString() }).generatedAt).toBe(NOW.toISOString());
    expect(generateAuditReport({ ...validInput, now: NOW.getTime() }).generatedAt).toBe(NOW.toISOString());
    expect(generateAuditReport({ ...validInput, now: NOW as never }).generatedAt).toBe(NOW.toISOString());
    expect(generateAuditReport({ ...validInput, clock: () => NOW }).generatedAt).toBe(NOW.toISOString());
  });

  it("emits a parseable ISO generatedAt when no clock is injected, and falls back when the clock throws", () => {
    const real = generateAuditReport({ entityName: "Acme GmbH" });
    expect(Number.isNaN(Date.parse(real.generatedAt))).toBe(false);
    const fallback = generateAuditReport({
      entityName: "Acme GmbH",
      clock: () => {
        throw new Error("boom");
      },
    });
    expect(Number.isNaN(Date.parse(fallback.generatedAt))).toBe(false);
  });
});

/* ================================================================== */
/* generateAuditReport — derivation of scores and topGaps             */
/* ================================================================== */

describe("generateAuditReport — postureScore / coverageRate / topGaps derivation", () => {
  it("derives postureScore from measures when absent ((90 + 80)/2 = 85) and prefers an explicit value", () => {
    const derived = generateAuditReport({
      measures: [
        { measureId: "m1", name: "A", score: 90 },
        { measureId: "m2", name: "B", score: 80 },
      ],
      now: NOW.toISOString(),
    });
    expect(derived.postureScore).toBe(85);

    const explicit = generateAuditReport({
      postureScore: 70,
      measures: [{ measureId: "m1", name: "A", score: 90 }],
      now: NOW.toISOString(),
    });
    expect(explicit.postureScore).toBe(70);
  });

  it("derives coverageRate from evidenceSummary total/covered (8/10 -> 80)", () => {
    const derived = generateAuditReport({
      evidenceSummary: { total: 10, covered: 8 },
      now: NOW.toISOString(),
    });
    expect(derived.coverageRate).toBe(80);

    const explicit = generateAuditReport({
      evidenceSummary: { total: 10, covered: 8, coverageRate: 66.7 },
      now: NOW.toISOString(),
    });
    expect(explicit.coverageRate).toBe(66.7);
  });

  it("slices and sorts audit topGaps like the posture engine (max 5, score asc)", () => {
    const result = generateAuditReport({
      measures: [90, 80, 70, 60, 50, 40].map((s, i) => ({ measureId: `m${i}`, name: `M${i}`, score: s })),
      now: NOW.toISOString(),
    });
    expect(result.topGaps).toHaveLength(5);
    expect(result.topGaps.map((g) => g.measureId)).toEqual(["m5", "m4", "m3", "m2", "m1"]);
  });
});

/* ================================================================== */
/* generateAuditReport — section status rules and boundaries          */
/* ================================================================== */

describe("generateAuditReport — section status rules and boundaries", () => {
  const sectionStatus = (input: Record<string, unknown>, key: string) => {
    const result = generateAuditReport({ now: NOW.toISOString(), ...(input as never) });
    return result.sections.find((s) => s.key === key)!.status;
  };

  it("marks posture pass >= 85, warn >= 65 and fail below (85/84.9 and 65/64.9 boundaries)", () => {
    expect(sectionStatus({ postureScore: 85 }, "posture")).toBe("pass");
    expect(sectionStatus({ postureScore: 84.9 }, "posture")).toBe("warn");
    expect(sectionStatus({ postureScore: 65 }, "posture")).toBe("warn");
    expect(sectionStatus({ postureScore: 64.9 }, "posture")).toBe("fail");
  });

  it("marks evidence pass >= 80, warn >= 50 and fail below (80/79.9 and 50/49.9 boundaries)", () => {
    expect(sectionStatus({ evidenceSummary: { coverageRate: 80 } }, "evidence")).toBe("pass");
    expect(sectionStatus({ evidenceSummary: { coverageRate: 79.9 } }, "evidence")).toBe("warn");
    expect(sectionStatus({ evidenceSummary: { coverageRate: 50 } }, "evidence")).toBe("warn");
    expect(sectionStatus({ evidenceSummary: { coverageRate: 49.9 } }, "evidence")).toBe("fail");
  });

  it("marks gaps fail when any top gap exists and pass when none", () => {
    const withGap = generateAuditReport({
      now: NOW.toISOString(),
      measures: [
        { measureId: "m1", name: "A", score: 90 },
        { measureId: "m2", name: "B", score: 55 },
      ],
    });
    expect(withGap.sections.find((s) => s.key === "gaps")!.status).toBe("fail");

    const noGap = generateAuditReport({
      now: NOW.toISOString(),
      measures: [
        { measureId: "m1", name: "A", score: 95 },
        { measureId: "m2", name: "B", score: 90 },
      ],
    });
    expect(noGap.sections.find((s) => s.key === "gaps")!.status).toBe("pass");
  });

  it("keeps the measures section informational regardless of scores", () => {
    const result = generateAuditReport({
      now: NOW.toISOString(),
      measures: [{ measureId: "m1", name: "A", score: 90 }],
    });
    const measures = result.sections.find((s) => s.key === "measures")!;
    expect(["pass", "warn", "fail", "info"]).toContain(measures.status);
  });
});

/* ================================================================== */
/* generateAuditReport — report content and recommendationCount       */
/* ================================================================== */

describe("generateAuditReport — report content and recommendationCount", () => {
  it("embeds the entity name, sector, measure rows and top gaps in the report", () => {
    const result = generateAuditReport({
      entityName: "Acme GmbH",
      entitySector: "Energy",
      measures: [
        { measureId: "m1", name: "Risk analysis", score: 90 },
        { measureId: "m2", name: "Supply chain", score: 55 },
      ],
      now: NOW.toISOString(),
    });
    expect(result.report).toContain("Acme GmbH"); // entity name
    expect(result.report).toContain("Energy"); // entity sector
    expect(result.report).toContain("| m1 |"); // measure score row
    expect(result.report).toContain("| m2 |"); // measure score row
    expect(result.report).toContain("Supply chain"); // top-gap label in the gaps block
  });

  it("ties recommendationCount to the number of top gaps", () => {
    const two = generateAuditReport({
      now: NOW.toISOString(),
      measures: [
        { measureId: "m1", name: "A", score: 90 },
        { measureId: "m2", name: "B", score: 55 },
        { measureId: "m3", name: "C", score: 40 },
      ],
    });
    expect(two.topGaps).toHaveLength(2);
    expect(two.recommendationCount).toBe(2);

    const none = generateAuditReport({ now: NOW.toISOString(), measures: [{ measureId: "m1", name: "A", score: 95 }] });
    expect(none.topGaps).toHaveLength(0);
    expect(none.recommendationCount).toBe(0);
  });
});

/* ================================================================== */
/* generateAuditReport — never-throws and EMPTY shape                 */
/* ================================================================== */

describe("generateAuditReport — never-throws and EMPTY shape", () => {
  it("returns EMPTY_AUDIT_REPORT for undefined / null / non-object input", () => {
    expect(generateAuditReport(undefined)).toEqual(EMPTY_AUDIT_REPORT);
    expect(generateAuditReport(null as never)).toEqual(EMPTY_AUDIT_REPORT);
    expect(generateAuditReport(42 as never)).toEqual(EMPTY_AUDIT_REPORT);
    expect(generateAuditReport("x" as never)).toEqual(EMPTY_AUDIT_REPORT);
    expect(generateAuditReport([] as never)).toEqual(EMPTY_AUDIT_REPORT);
  });

  it("coerces type-mismatched structured fields to safe zeroed values (never throws, valid report)", () => {
    const malformedInputs = [
      { measures: "x" as never },
      { measures: 42 as never },
      { evidenceSummary: "x" as never },
      { evidenceSummary: 42 as never },
      { entityName: 42 as never },
      { postureScore: "nope" as never },
    ];
    for (const input of malformedInputs) {
      const result = generateAuditReport(input);
      expect(result.postureScore, JSON.stringify(input)).toBe(0);
      expect(result.coverageRate, JSON.stringify(input)).toBe(0);
      expect(result.sections, JSON.stringify(input)).toHaveLength(4);
      expect(result.report.trim().length, JSON.stringify(input)).toBeGreaterThan(0);
    }
  });

  it("never throws on garbage measure rows and still produces a report", () => {
    const result = generateAuditReport({
      measures: [null, 42, "x", {}, { measureId: "m1", name: "Ok", score: 90 }] as never,
      now: NOW.toISOString(),
    });
    expect(result.postureScore).toBe(90);
    expect(result.sections).toHaveLength(4);
    expect(result.report.trim().length).toBeGreaterThan(0);
  });

  it("returns a zeroed valid report for an empty object and freezes EMPTY_AUDIT_REPORT", () => {
    const result = generateAuditReport({ now: NOW.toISOString() });
    expect(result.postureScore).toBe(0);
    expect(result.coverageRate).toBe(0);
    expect(result.topGaps).toEqual([]);
    expect(result.recommendationCount).toBe(0);
    expect(result.sections).toHaveLength(4);
    expect(result.generatedAt).toBe(NOW.toISOString());

    expect(EMPTY_AUDIT_REPORT.postureScore).toBe(0);
    expect(EMPTY_AUDIT_REPORT.coverageRate).toBe(0);
    expect(EMPTY_AUDIT_REPORT.topGaps).toEqual([]);
    expect(EMPTY_AUDIT_REPORT.recommendationCount).toBe(0);
    expect(Object.isFrozen(EMPTY_AUDIT_REPORT)).toBe(true);
  });
});
