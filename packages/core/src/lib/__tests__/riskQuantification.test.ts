import { describe, it, expect } from "vitest";

/**
 * NIS2 Risk Quantification engine (lib/nis2/riskQuantification.ts) — unit
 * tests (QA cycle 26, NIS2 Phase 1 Task 1.2 "Risk Quantification Engine").
 *
 * Contract under test:
 *   computeRiskAppetite   — quantitative appetite verdicts (within /
 *                           tolerance / exceeded, strict > comparisons),
 *                           EUR loss appetite, utilization clamp, breaches
 *                           sort + cap, deterministic recommendations.
 *   buildQuantitativeMatrix — fixed 25-cell 5x5 grid (likelihood desc,
 *                           impact asc), band boundaries 4/5, 9/10, 15/16,
 *                           top-5 risks.
 *   trackResidualRisk     — inherent/residual derivation (override vs LxI,
 *                           controlEffectiveness vs controls-count map),
 *                           delta/reductionPct/direction, strict
 *                           above-appetite, worst-5.
 *   generateTreatmentPlans — threshold eligibility, strategy ladder
 *                           (mitigate/transfer keyword match), P0-P3 bands,
 *                           P0 escalation + action cap, P0/P1 deadlines from
 *                           the injectable clock, deterministic ordering.
 *
 * Cross-cutting: never throws on malformed input (frozen EMPTY_* shapes),
 * deterministic outputs, injectable clock (ISO string / epoch number /
 * Date / factory / throwing factory).
 */

import {
  computeRiskAppetite,
  buildQuantitativeMatrix,
  trackResidualRisk,
  generateTreatmentPlans,
  EMPTY_RISK_APPETITE,
  EMPTY_RISK_MATRIX,
  EMPTY_RESIDUAL_TRACKING,
  EMPTY_TREATMENT_PLAN_RESULT,
} from "../nis2/riskQuantification";
import type {
  QuantRiskRow,
  RiskAppetiteResult,
  RiskMatrixResult,
  ResidualTrackingResult,
  TreatmentPlanResult,
} from "../nis2/riskQuantification";

const NOW = new Date("2026-03-01T00:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const iso = (ms: number) => new Date(ms).toISOString();

/** risk(id, likelihood, impact, extra) helper — numbers or scale keywords. */
const risk = (
  id: string | number,
  likelihood: number | string,
  impact: number | string,
  extra: Partial<QuantRiskRow> = {},
): QuantRiskRow => ({ id, name: `risk-${id}`, likelihood, impact, ...extra });

describe("riskQuantification — computeRiskAppetite", () => {
  it("scores likelihood x impact from numbers and scale keywords", () => {
    const result = computeRiskAppetite([
      risk(1, 3, 4), // 12 -> within (default appetite 12, strict >)
      risk(2, "likely", "moderate"), // 4x3=12 -> within
      risk(3, "almost-certain", "severe"), // 25 -> exceeded
    ]);
    expect(result.assessedCount).toBe(3);
    expect(result.withinCount).toBe(2);
    expect(result.exceededCount).toBe(1);
    expect(result.avgScore).toBe(round1((12 + 12 + 25) / 3));
  });

  it("verdict boundaries are strict: exactly appetite -> within, just above -> tolerance, above appetite*(1+tol) -> exceeded", () => {
    // appetite 10, tolerance 50% -> exceeded threshold 15 (score 15 stays tolerance)
    const result = computeRiskAppetite(
      [risk(1, 2, 5), risk(2, 3, 5), risk(3, 3, 5)], // 10, 15, 15
      { appetiteScore: 10, tolerancePct: 50 },
    );
    expect(result.withinCount).toBe(1);
    expect(result.toleranceCount).toBe(2);
    expect(result.exceededCount).toBe(0);

    // tighten tolerance to 49% -> threshold 14.9 -> score 15 exceeds
    const tighter = computeRiskAppetite(
      [risk(1, 2, 5), risk(2, 3, 5)],
      { appetiteScore: 10, tolerancePct: 49 },
    );
    expect(tighter.toleranceCount).toBe(0);
    expect(tighter.exceededCount).toBe(1);
  });

  it("coerces keywords case-insensitively (trimmed) and accepts numeric strings", () => {
    const result = computeRiskAppetite([
      risk(1, "LIKELY", "Severe"), // 4x5=20
      risk(2, "  Almost-Certain  ", "negligible"), // 5x1=5
      risk(3, "almost certain", "MAJOR"), // 5x4=20 (space variant accepted)
      risk(4, "3", "4"), // numeric string -> 12
    ]);
    expect(result.assessedCount).toBe(4);
    expect(result.avgScore).toBe(round1((20 + 5 + 20 + 12) / 4));
  });

  it("counts invalid-scale rows in totalRisks but excludes them from scoring", () => {
    const result = computeRiskAppetite([
      risk(1, 6, 3), // likelihood out of range -> excluded, NOT clamped
      risk(2, "catastrophic", 4), // unknown keyword -> excluded
      risk(3, 0, 5), // 0 invalid -> excluded
      risk(4, 2, 2), // 4 -> within
    ]);
    expect(result.totalRisks).toBe(4);
    expect(result.assessedCount).toBe(1);
    expect(result.withinCount).toBe(1);
    expect(result.avgScore).toBe(4);
  });

  it("excludes NaN/Infinity/empty-string scales from score math (never clamped, never throws)", () => {
    const result = computeRiskAppetite([
      risk(1, Number.NaN, 4), // NaN likelihood -> invalid
      risk(2, 4, Number.POSITIVE_INFINITY), // Infinity impact -> invalid
      risk(3, "", 5), // empty string -> invalid
      risk(4, 2, 2, { annualLossEstimateEur: Number.NaN }), // NaN loss ignored
      risk(5, 3, 3), // 9 -> assessed
    ]);
    expect(result.totalRisks).toBe(5);
    // the NaN loss estimate is ignored but the row itself still scores 2x2=4
    expect(result.assessedCount).toBe(2);
    expect(result.avgScore).toBe(round1((4 + 9) / 2));
  });

  it("treats a null/undefined/garbage config as the documented defaults", () => {
    for (const config of [null, undefined, "nope", 42]) {
      // score 12 == default appetiteScore (strict >) -> within
      const result = computeRiskAppetite([risk(1, 3, 4)], config as never);
      expect(result.withinCount).toBe(1);
      expect(result.toleranceCount).toBe(0);
      expect(result.exceededCount).toBe(0);
    }
  });

  it("clamps appetiteUtilizationPct to 0-100", () => {
    const hot = computeRiskAppetite([risk(1, 5, 5)], { appetiteScore: 12 });
    expect(hot.avgScore).toBe(25);
    expect(hot.appetiteUtilizationPct).toBe(100); // 208.3 clamped

    const cold = computeRiskAppetite([risk(1, 1, 1)], { appetiteScore: 12 });
    expect(cold.appetiteUtilizationPct).toBe(round1((1 / 12) * 100));
  });

  it("sorts breaches by score desc then id asc and caps at 5", () => {
    const result = computeRiskAppetite([
      risk("b", 4, 4), // 16
      risk(2, 5, 5), // 25
      risk(1, 5, 5), // 25
      risk("a", 4, 4), // 16
      risk(5, 5, 4), // 20
      risk(6, 4, 5), // 20
      risk(7, 5, 3), // 15 -> also exceeded (threshold 12 * 1.1 = 13.2)
    ]);
    expect(result.exceededCount).toBe(7);
    expect(result.breaches.map((b) => b.id)).toEqual([1, 2, 5, 6, "a"]); // 25,25,20,20,16 (id asc), "b" capped out
    expect(result.breaches.every((b) => b.verdict === "exceeded")).toBe(true);
  });

  it("checks the EUR annual-loss appetite with the same tolerance band", () => {
    const result = computeRiskAppetite(
      [
        risk(1, 2, 2, { annualLossEstimateEur: 120000 }), // loss exceeds 110k threshold
        risk(2, 2, 2, { annualLossEstimateEur: 105000 }), // tolerance band
        risk(3, 2, 2, { annualLossEstimateEur: 50000 }), // within
        risk(4, 2, 2), // no loss estimate -> skipped
      ],
      { appetiteScore: 25, appetiteAnnualLossEur: 100000 },
    );
    expect(result.exceededCount).toBe(0);
    expect(result.recommendations.some((r) => r.includes("annual-loss appetite"))).toBe(true);
    expect(result.recommendations.some((r) => r.startsWith("1 risk"))).toBe(true);
  });

  it("builds deterministic recommendations and never exceeds 5", () => {
    const result = computeRiskAppetite([
      risk(1, 5, 5),
      risk(2, 4, 4),
      risk(3, 3, 4, { annualLossEstimateEur: 999999 }),
    ]);
    expect(result.recommendations.length).toBeLessThanOrEqual(5);
    expect(result.recommendations[0]).toContain("exceed the risk appetite");
    expect(result.recommendations[result.recommendations.length - 1]).toContain(
      "Review appetite thresholds",
    );
  });

  it("returns the frozen EMPTY shape on malformed input", () => {
    for (const bad of [null, undefined, "risks", 42]) {
      const result = computeRiskAppetite(bad as unknown[]);
      expect(result).toEqual(EMPTY_RISK_APPETITE);
    }
    // garbage rows are counted in totalRisks (house style, mirrors
    // threatLandscape.summarizeThreatLandscape) but excluded from scoring
    const garbage = computeRiskAppetite([null, 7, "x", { likelihood: "high" }]);
    expect(garbage).toEqual({ ...EMPTY_RISK_APPETITE, totalRisks: 1 });
    expect(Object.isFrozen(EMPTY_RISK_APPETITE)).toBe(true);
    expect(Object.isFrozen(EMPTY_RISK_APPETITE.breaches)).toBe(true);
    expect(Object.isFrozen(EMPTY_RISK_APPETITE.recommendations)).toBe(true);
  });

  it("is deterministic", () => {
    const input = [risk(1, 4, 4, { controls: ["a"] }), risk(2, "likely", "severe")];
    expect(computeRiskAppetite(input, { appetiteScore: 10 })).toEqual(
      computeRiskAppetite(input, { appetiteScore: 10 }),
    );
  });
});

describe("riskQuantification — buildQuantitativeMatrix", () => {
  it("always returns the fixed 25-cell grid ordered likelihood desc then impact asc", () => {
    const result = buildQuantitativeMatrix([risk(1, 5, 5)]);
    expect(result.cells).toHaveLength(25);
    expect(result.cells[0]).toMatchObject({ likelihood: 5, impact: 1, score: 5, band: "medium" });
    expect(result.cells[4]).toMatchObject({ likelihood: 5, impact: 5, score: 25 });
    expect(result.cells[24]).toMatchObject({ likelihood: 1, impact: 5, score: 5 });
  });

  it("places counts in the correct cells and rolls up bands", () => {
    const result = buildQuantitativeMatrix([
      risk(1, 5, 5), // 25 critical
      risk(2, 5, 5), // 25 critical
      risk(3, 4, 4), // 16 critical
      risk(4, 3, 3), // 9 medium
      risk(5, 2, 2), // 4 low
      risk(6, 3, 4), // 12 high
    ]);
    expect(result.totalAssessed).toBe(6);
    expect(result.cells.find((c) => c.likelihood === 5 && c.impact === 5)?.count).toBe(2);
    expect(result.cells.find((c) => c.likelihood === 3 && c.impact === 3)?.count).toBe(1);
    expect(result.byBand).toEqual({ low: 1, medium: 1, high: 1, critical: 3 });
    expect(result.avgScore).toBe(round1((25 + 25 + 16 + 9 + 4 + 12) / 6));
  });

  it("applies band boundaries 4/5, 9/10, 15/16 on the 1-25 score", () => {
    const result = buildQuantitativeMatrix([
      risk(1, 2, 2), // 4 low
      risk(2, 1, 5), // 5 medium
      risk(3, 3, 3), // 9 medium
      risk(4, 2, 5), // 10 high
      risk(5, 3, 5), // 15 high
      risk(6, 4, 4), // 16 critical
      risk(7, 5, 5), // 25 critical
    ]);
    const bandOf = (score: number) => result.cells.find((c) => c.score === score && c.count > 0)?.band;
    expect(bandOf(4)).toBe("low");
    expect(bandOf(5)).toBe("medium");
    expect(bandOf(9)).toBe("medium");
    expect(bandOf(10)).toBe("high");
    expect(bandOf(15)).toBe("high");
    expect(bandOf(16)).toBe("critical");
    expect(bandOf(25)).toBe("critical");
    expect(result.byBand).toEqual({ low: 1, medium: 2, high: 2, critical: 2 });
  });

  it("caps topRisks at 5 sorted score desc then id asc (numbers before strings)", () => {
    const result = buildQuantitativeMatrix([
      risk("z", 4, 4), // 16
      risk(1, 4, 4), // 16
      risk(2, 5, 5), // 25
      risk(3, 5, 4), // 20
      risk(4, 5, 3), // 15
      risk(5, 5, 5), // 25
    ]);
    expect(result.topRisks.map((r) => r.id)).toEqual([2, 5, 3, 1, "z"]);
  });

  it("returns the frozen EMPTY shape (empty 25-cell grid) on malformed input", () => {
    for (const bad of [null, "matrix", [{ likelihood: 9, impact: 9 }]]) {
      const result = buildQuantitativeMatrix(bad as unknown[]);
      expect(result).toEqual(EMPTY_RISK_MATRIX);
    }
    expect(Object.isFrozen(EMPTY_RISK_MATRIX)).toBe(true);
    expect(EMPTY_RISK_MATRIX.cells).toHaveLength(25);
    expect(Object.isFrozen(EMPTY_RISK_MATRIX.byBand)).toBe(true);
  });

  it("is deterministic", () => {
    const input = [risk(1, 4, 5), risk(2, "rare", "negligible")];
    expect(buildQuantitativeMatrix(input)).toEqual(buildQuantitativeMatrix(input));
  });
});

describe("riskQuantification — trackResidualRisk", () => {
  it("derives residual from controlEffectiveness and the controls-count map", () => {
    const result = trackResidualRisk([
      risk(1, 1, 1, { inherentScore: 100, controlEffectiveness: 50 }), // residual 50
      risk(2, 1, 1, { inherentScore: 100, controls: [] }), // eff 0 -> 100
      risk(3, 1, 1, { inherentScore: 100, controls: ["a"] }), // 20% -> 80
      risk(4, 1, 1, { inherentScore: 100, controls: ["a", "b"] }), // 35% -> 65
      risk(5, 1, 1, { inherentScore: 100, controls: ["a", "b", "c"] }), // 50% -> 50
      risk(6, 1, 1, { inherentScore: 100, controls: ["a", "b", "c", "d", "e"] }), // 60% -> 40
    ]);
    const residualOf = (id: string | number) => result.rows.find((r) => r.id === id)?.residual;
    expect(residualOf(1)).toBe(50);
    expect(residualOf(2)).toBe(100);
    expect(residualOf(3)).toBe(80);
    expect(residualOf(4)).toBe(65);
    expect(residualOf(5)).toBe(50);
    expect(residualOf(6)).toBe(40);
  });

  it("prefers explicit inherentScore/residualScore overrides and falls back to LxI", () => {
    const result = trackResidualRisk([
      risk(1, 3, 4), // inherent 12, no controls -> residual 12 (unchanged)
      risk(2, 3, 4, { inherentScore: 20 }), // inherent override wins over 12
      risk(3, 3, 4, { residualScore: 4, controls: ["x"] }), // residual override wins over derived
      risk(4, 9, 9), // invalid scales, no overrides -> unassessable
    ]);
    expect(result.totalTracked).toBe(3);
    const row2 = result.rows.find((r) => r.id === 2);
    expect(row2?.inherent).toBe(20);
    const row3 = result.rows.find((r) => r.id === 3);
    expect(row3?.residual).toBe(4);
  });

  it("computes delta, reductionPct and direction (reduced/unchanged/increased)", () => {
    const result = trackResidualRisk([
      risk(1, 1, 1, { inherentScore: 20, controls: ["a", "b"] }), // residual 13, delta 7, 35%
      risk(2, 1, 1, { inherentScore: 10 }), // residual 10, unchanged
      risk(3, 1, 1, { inherentScore: 10, residualScore: 50 }), // increased
    ]);
    const r1 = result.rows.find((r) => r.id === 1)!;
    expect(r1).toMatchObject({ inherent: 20, residual: 13, delta: 7, reductionPct: 35, direction: "reduced" });
    expect(result.rows.find((r) => r.id === 2)?.direction).toBe("unchanged");
    const r3 = result.rows.find((r) => r.id === 3)!;
    expect(r3).toMatchObject({ inherent: 10, residual: 50, delta: 0, reductionPct: 0, direction: "increased" });
    expect(result.increasedCount).toBe(1);
  });

  it("counts aboveAppetite strictly (residual == appetite is not above)", () => {
    const result = trackResidualRisk(
      [
        risk(1, 3, 4), // residual 12 == appetite
        risk(2, 3, 5), // residual 15 > 12
        risk(3, 2, 5), // residual 10
      ],
      { appetiteScore: 12 },
    );
    expect(result.aboveAppetiteCount).toBe(1);
  });

  it("sorts rows residual desc then id asc, caps worst at 5, averages reductionPct", () => {
    const result = trackResidualRisk([
      risk("b", 1, 1, { inherentScore: 100, controls: ["a"] }), // residual 80
      risk(1, 1, 1, { inherentScore: 100, controls: ["a"] }), // residual 80
      risk(2, 1, 1, { inherentScore: 100, controls: ["a", "b"] }), // 65
      risk(3, 1, 1, { inherentScore: 100, controls: ["a", "b", "c"] }), // 50
      risk(4, 1, 1, { inherentScore: 100, controls: ["1", "2", "3", "4"] }), // 40
      risk(5, 1, 1, { inherentScore: 100, controls: ["x", "y", "z", "w", "v"] }), // 40
    ]);
    expect(result.rows.map((r) => r.id)).toEqual([1, "b", 2, 3, 4, 5]);
    expect(result.worst.map((r) => r.id)).toEqual([1, "b", 2, 3, 4]);
    // avg of 20,20,35,50,60,60 = 40.833 -> 40.8
    expect(result.avgReductionPct).toBe(round1((20 + 20 + 35 + 50 + 60 + 60) / 6));
  });

  it("ignores NaN/Infinity overrides and effectiveness, falling back to documented derivation", () => {
    const result = trackResidualRisk([
      // inherent falls back to LxI 4; effectiveness falls back to the
      // controls map (none -> 0%) -> residual 4, unchanged
      risk(1, 2, 2, { inherentScore: Number.NaN, controlEffectiveness: Number.POSITIVE_INFINITY }),
      // residualScore NaN ignored -> derived: 4 * (1 - 0.2) = 3.2, reduced
      risk(2, 2, 2, { residualScore: Number.NaN, controls: ["a"] }),
    ]);
    expect(result.rows[0]).toMatchObject({ inherent: 4, residual: 4, delta: 0, direction: "unchanged" });
    expect(result.rows[1]).toMatchObject({ inherent: 4, residual: 3.2, delta: 0.8, reductionPct: 20, direction: "reduced" });
  });

  it("returns the frozen EMPTY shape on malformed input", () => {
    for (const bad of [null, 7, [{ residualScore: 3 }], [{ likelihood: "x", impact: "y" }]]) {
      const result = trackResidualRisk(bad as unknown[]);
      expect(result).toEqual(EMPTY_RESIDUAL_TRACKING);
    }
    expect(Object.isFrozen(EMPTY_RESIDUAL_TRACKING)).toBe(true);
    expect(Object.isFrozen(EMPTY_RESIDUAL_TRACKING.worst)).toBe(true);
  });

  it("is deterministic", () => {
    const input = [risk(1, 4, 4, { controls: ["a"] }), risk(2, 5, 5, { residualScore: 3 })];
    expect(trackResidualRisk(input, { appetiteScore: 10 })).toEqual(
      trackResidualRisk(input, { appetiteScore: 10 }),
    );
  });
});

describe("riskQuantification — generateTreatmentPlans", () => {
  it("only plans eligible risks at or above the threshold (default 10)", () => {
    const result = generateTreatmentPlans([
      risk(1, 3, 3), // 9 -> unplanned (P2 counted)
      risk(2, 2, 5), // 10 -> planned P1
      risk(3, 5, 5, { status: "closed" }), // 25 but closed -> unplanned (P0 counted)
      risk(4, 4, 4), // 16 -> planned P0
      risk(5, 1, 1), // 1 -> unplanned, P3 counted
    ]);
    expect(result.totalRisks).toBe(5);
    expect(result.plannedCount).toBe(2);
    expect(result.plans.map((p) => p.id)).toEqual([4, 2]);
    expect(result.byPriority).toEqual({ P0: 2, P1: 1, P2: 1, P3: 1 });
    expect(result.byStrategy).toEqual({ mitigate: 2, transfer: 0, accept: 0, avoid: 0 });
  });

  it("applies the strategy ladder: >=16 mitigate, 10-15 transfer on keyword controls", () => {
    const result = generateTreatmentPlans([
      risk(1, 5, 5), // 25 -> mitigate
      risk(2, 3, 5, { controls: ["Transfer to insurer via policy"] }), // 15 -> transfer
      risk(3, 2, 5, { controls: ["insurance coverage active"] }), // 10 -> transfer
      risk(4, 2, 5, { controls: ["contract clause 7"] }), // 10 -> transfer
      risk(5, 2, 5), // 10 -> mitigate (no keyword)
    ]);
    expect(result.plans.find((p) => p.id === 1)?.strategy).toBe("mitigate");
    expect(result.plans.find((p) => p.id === 2)?.strategy).toBe("transfer");
    expect(result.plans.find((p) => p.id === 3)?.strategy).toBe("transfer");
    expect(result.plans.find((p) => p.id === 4)?.strategy).toBe("transfer");
    expect(result.plans.find((p) => p.id === 5)?.strategy).toBe("mitigate");
    expect(result.byStrategy).toEqual({ mitigate: 2, transfer: 3, accept: 0, avoid: 0 });
  });

  it("prepends the escalation action for P0 and caps actions at 5", () => {
    const plan = generateTreatmentPlans([risk(1, 4, 4)]).plans[0]; // 16 -> P0
    expect(plan.priority).toBe("P0");
    expect(plan.actions[0]).toContain("Escalate to the management board");
    expect(plan.actions).toHaveLength(5);

    const p1 = generateTreatmentPlans([risk(2, 2, 5)]).plans[0]; // 10 -> P1
    expect(p1.priority).toBe("P1");
    expect(p1.actions[0]).not.toContain("Escalate");
  });

  it("sets P0/P1 deadlines from the injectable clock + horizonDays; P2/P3 get null", () => {
    const result = generateTreatmentPlans(
      [
        risk(1, 4, 4), // P0
        risk(2, 2, 5), // P1
      ],
      { now: NOW.getTime(), horizonDays: 14 },
    );
    const expected = iso(NOW.getTime() + 14 * DAY_MS);
    expect(result.plans.every((p) => p.deadline === expected)).toBe(true);
    expect(result.nextDeadline).toBe(expected);

    const withP2 = generateTreatmentPlans([risk(3, 2, 3)], { threshold: 5, now: NOW.toISOString() });
    expect(withP2.plans[0]?.priority).toBe("P2");
    expect(withP2.plans[0]?.deadline).toBeNull();
    expect(withP2.nextDeadline).toBeNull();
  });

  it("accepts ISO strings, epoch numbers, Date objects and clock factories; survives throwing factories", () => {
    const expected = iso(NOW.getTime() + 30 * DAY_MS);
    expect(generateTreatmentPlans([risk(1, 2, 5)], { now: NOW.toISOString() }).nextDeadline).toBe(expected);
    expect(generateTreatmentPlans([risk(1, 2, 5)], { now: NOW.getTime() }).nextDeadline).toBe(expected);
    expect(generateTreatmentPlans([risk(1, 2, 5)], { now: NOW }).nextDeadline).toBe(expected);
    expect(generateTreatmentPlans([risk(1, 2, 5)], { clock: () => NOW }).nextDeadline).toBe(expected);
    const before = Date.now();
    const fallback = generateTreatmentPlans([risk(1, 2, 5)], {
      clock: () => {
        throw new Error("boom");
      },
    });
    const after = Date.now();
    // the engine falls back to the current time — allow the millisecond the
    // fallback clock may have ticked between the engine call and this probe
    expect([iso(before + 30 * DAY_MS), iso(after + 30 * DAY_MS)]).toContain(fallback.nextDeadline);
  });

  it("sorts plans priority asc, then score desc, then id asc", () => {
    const result = generateTreatmentPlans([
      risk("b", 4, 4), // 16 P0
      risk(1, 4, 4), // 16 P0
      risk(2, 5, 5), // 25 P0
      risk(3, 2, 5), // 10 P1
      risk(4, 3, 5), // 15 P1
    ]);
    expect(result.plans.map((p) => p.id)).toEqual([2, 1, "b", 4, 3]);
  });

  it("passes the owner through or falls back to 'unassigned'", () => {
    const result = generateTreatmentPlans([
      risk(1, 4, 4, { owner: "alice" }),
      risk(2, 2, 5),
      risk(3, 2, 5, { owner: "   " }),
    ]);
    expect(result.plans.find((p) => p.id === 1)?.owner).toBe("alice");
    expect(result.plans.find((p) => p.id === 2)?.owner).toBe("unassigned");
    expect(result.plans.find((p) => p.id === 3)?.owner).toBe("unassigned");
  });

  it("falls back to documented defaults when horizonDays/threshold are NaN or non-finite", () => {
    // NaN/Infinity horizonDays and threshold coerce to the defaults
    // (30 days / threshold 10) — score 10 == default threshold -> planned
    const result = generateTreatmentPlans([risk(1, 2, 5)], {
      now: NOW.getTime(),
      horizonDays: Number.NaN,
      threshold: Number.POSITIVE_INFINITY,
    });
    expect(result.plannedCount).toBe(1);
    expect(result.nextDeadline).toBe(iso(NOW.getTime() + 30 * DAY_MS));
  });

  it("returns the frozen EMPTY shape on malformed input", () => {
    for (const bad of [null, "plans", [undefined]]) {
      const result = generateTreatmentPlans(bad as unknown[], { now: NOW.getTime() });
      expect(result).toEqual(EMPTY_TREATMENT_PLAN_RESULT);
    }
    // an object row without scales is counted in totalRisks but never planned
    const emptyish = generateTreatmentPlans([{ status: "open" }], { now: NOW.getTime() });
    expect(emptyish.totalRisks).toBe(1);
    expect(emptyish.plannedCount).toBe(0);
    expect(emptyish.byPriority).toEqual({ P0: 0, P1: 0, P2: 0, P3: 0 });
    expect(Object.isFrozen(EMPTY_TREATMENT_PLAN_RESULT)).toBe(true);
    expect(Object.isFrozen(EMPTY_TREATMENT_PLAN_RESULT.byStrategy)).toBe(true);
    expect(Object.isFrozen(EMPTY_TREATMENT_PLAN_RESULT.byPriority)).toBe(true);
  });

  it("is deterministic", () => {
    const input = [risk(1, 4, 4, { controls: ["transfer"] }), risk(2, 2, 5, { owner: "bob" })];
    const opts = { now: NOW.getTime(), horizonDays: 7, threshold: 8 };
    expect(generateTreatmentPlans(input, opts)).toEqual(generateTreatmentPlans(input, opts));
  });
});

/* ------------------------------------------------------------------ */
/* helpers                                                             */
/* ------------------------------------------------------------------ */

/** Round to 1 decimal, half-up, compensating floating-point error and -0. */
function round1(value: number): number {
  const rounded = Math.round((value + 1e-12) * 10) / 10;
  return rounded === 0 ? 0 : rounded;
}
