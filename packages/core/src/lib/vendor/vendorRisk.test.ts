/**
 * TPRM per-vendor risk tiering — unit tests for the pure risk engine
 * (packages/core/src/lib/vendor/vendorRisk.ts, scorecard row #5).
 *
 * The engine is deliberately side-effect free: all inputs are passed in, the
 * clock is injectable (`now`), and identical inputs produce identical outputs.
 * Every test passes a fixed `now` (except the two clock-injection tests) so the
 * suite is fully deterministic.
 *
 * Scoring model under test (documented for auditors):
 *   residual = 100
 *     - 20                                     if no clean SOC 2 (default)
 *     - min(60 - scanScore, 60)                if latestScanRiskScore < 60
 *     - min(openHighCritical, 3) * 8           (cap -24)
 *     + 5                                      if contract on file
 *     + 8                                      if DPA signed
 *     - min(max(subprocessors - 2, 0), 4) * 3  (cap -12)
 *   residual = clamp(residual, 0, 100), rounded to integer
 *   tier: <50 => Tier 1 (Critical, Quarterly) | <75 => Tier 2 (High, Semi-Annual)
 *         else Tier 3 (Medium, Annual)
 */

import { describe, it, expect } from "vitest";
import {
  computeVendorRiskTier,
  buildVendorRiskOverview,
  type DataAccessType,
  type InherentRiskLevel,
  type ReviewFrequency,
  type RiskTier,
  type VendorRiskInput,
  type VendorRiskResult,
} from "./vendorRisk";

const FIXED_NOW = new Date("2026-08-18T12:00:00.000Z");

/** Build a canonical input with defaults: no SOC2, no gaps provided, fixed clock. */
function makeInput(overrides: Partial<VendorRiskInput> = {}): VendorRiskInput {
  return {
    now: FIXED_NOW,
    ...overrides,
    vendor: { id: 1, name: "Acme Corp", ...(overrides.vendor ?? {}) },
  };
}

/**
 * Assert a nextReviewDate by LOCAL calendar fields. The engine preserves the
 * local wall-clock time of `now` while shifting the month (setMonth), so the
 * UTC ISO can move by an hour when the shift crosses a DST boundary (e.g.
 * 2026-08-18 12:00Z + 3 months => 2026-11-18 13:00Z on a UTC+2/+1 machine).
 * Asserting local fields keeps the suite timezone-agnostic while still pinning
 * the month arithmetic and the day-of-month overflow semantics.
 */
function expectLocalDate(iso: string, now: Date, year: number, month: number, day: number) {
  const d = new Date(iso);
  expect(d.getFullYear()).toBe(year);
  expect(d.getMonth() + 1).toBe(month);
  expect(d.getDate()).toBe(day);
  expect(d.getHours()).toBe(now.getHours());
  expect(d.getMinutes()).toBe(now.getMinutes());
}

describe("computeVendorRiskTier", () => {
  describe("inherent risk from dataAccessType", () => {
    it.each([
      ["PII", "critical"],
      ["ePHI", "critical"],
      ["Infrastructure", "critical"],
      ["None", "medium"],
    ] as Array<[DataAccessType, InherentRiskLevel]>)(
      "dataAccessType %s => inherent risk %s (and echoed verbatim)",
      (dax, expected) => {
        const result = computeVendorRiskTier(makeInput({ vendor: { dataAccessType: dax } }));
        expect(result.inherentRisk).toBe(expected);
        expect(result.dataAccessType).toBe(dax);
      }
    );

    it("treats omitted dataAccessType as medium and echoes null", () => {
      const result = computeVendorRiskTier(makeInput());
      expect(result.inherentRisk).toBe("medium");
      expect(result.dataAccessType).toBeNull();
    });
  });

  describe("residual score signals", () => {
    it("defaults to no clean SOC 2 (conservative): baseline residual 80", () => {
      const result = computeVendorRiskTier(makeInput());
      expect(result.residualScore).toBe(80);
      expect(result.tier).toBe("Tier 3 (Medium)");
      expect(result.reviewFrequency).toBe("Annual");
      expect(result.riskFactors.hasCleanSoc2).toBe(false);
    });

    it.each([
      [false, 80],
      [true, 100],
    ] as Array<[boolean, number]>)(
      "hasCleanSoc2=%p => residual %p (no other signals)",
      (soc2, expected) => {
        const result = computeVendorRiskTier(makeInput({ vendor: { hasCleanSoc2: soc2 } }));
        expect(result.residualScore).toBe(expected);
      }
    );

    it.each([
      [59, 79], // just under 60: -1
      [60, 80], // exactly 60: no deduction
      [0, 20], // worst scan: -60 (capped)
      [100, 80], // safe scan: no deduction (HIGHER = safer)
      [undefined, 80], // absent: no deduction
      [null, 80], // null guarded like absent (engine checks !== null)
    ] as Array<[number | null | undefined, number]>)(
      "latestScanRiskScore=%p (no SOC2) => residual %p",
      (score, expected) => {
        const result = computeVendorRiskTier(
          makeInput({ latestScanRiskScore: score as unknown as number | undefined })
        );
        expect(result.residualScore).toBe(expected);
        expect(result.riskFactors.latestScanRiskScore).toBe(score ?? null);
      }
    );

    it.each([
      [0, 80],
      [1, 72], // -8
      [3, 56], // -24
      [4, 56], // capped at 3: still -24
    ] as Array<[number, number]>)(
      "openHighCriticalAssessments=%i => residual %i",
      (count, expected) => {
        expect(computeVendorRiskTier(makeInput({ openHighCriticalAssessments: count })).residualScore).toBe(expected);
      }
    );

    it.each([
      [{ hasContract: true }, 85],
      [{ hasDpa: true }, 88],
      [{ hasContract: true, hasDpa: true }, 93],
    ] as Array<[Partial<VendorRiskInput>, number]>)("contract/DPA modifiers %o => residual %i", (mods, expected) => {
      expect(computeVendorRiskTier(makeInput(mods)).residualScore).toBe(expected);
    });

    it.each([
      [0, 80],
      [2, 80], // first two subprocessors are free
      [3, 77], // -3
      [6, 68], // capped at 4 beyond 2: -12
    ] as Array<[number, number]>)("subprocessorCount=%i => residual %i", (count, expected) => {
      expect(computeVendorRiskTier(makeInput({ subprocessorCount: count })).residualScore).toBe(expected);
    });
  });

  describe("tier boundaries and review cadence", () => {
    const cases: Array<{
      name: string;
      overrides: Partial<VendorRiskInput>;
      score: number;
      tier: RiskTier;
      frequency: ReviewFrequency;
    }> = [
      {
        name: "residual 49 (scan 56, 3 open, 3 subs)",
        overrides: { latestScanRiskScore: 56, openHighCriticalAssessments: 3, subprocessorCount: 3 },
        score: 49,
        tier: "Tier 1 (Critical)",
        frequency: "Quarterly",
      },
      {
        name: "residual 50 (scan 57, 3 open, 3 subs)",
        overrides: { latestScanRiskScore: 57, openHighCriticalAssessments: 3, subprocessorCount: 3 },
        score: 50,
        tier: "Tier 2 (High)",
        frequency: "Semi-Annual",
      },
      {
        name: "residual 74 (scan 54)",
        overrides: { latestScanRiskScore: 54 },
        score: 74,
        tier: "Tier 2 (High)",
        frequency: "Semi-Annual",
      },
      {
        name: "residual 75 (scan 55)",
        overrides: { latestScanRiskScore: 55 },
        score: 75,
        tier: "Tier 3 (Medium)",
        frequency: "Annual",
      },
      {
        name: "residual 74 with clean SOC 2 (scan 45, 1 open, 3 subs)",
        overrides: { vendor: { hasCleanSoc2: true }, latestScanRiskScore: 45, openHighCriticalAssessments: 1, subprocessorCount: 3 },
        score: 74,
        tier: "Tier 2 (High)",
        frequency: "Semi-Annual",
      },
      {
        name: "residual 75 with clean SOC 2 (scan 54, 2 open, 3 subs)",
        overrides: { vendor: { hasCleanSoc2: true }, latestScanRiskScore: 54, openHighCriticalAssessments: 2, subprocessorCount: 3 },
        score: 75,
        tier: "Tier 3 (Medium)",
        frequency: "Annual",
      },
    ];

    it.each(cases)("$name => score $score, $tier ($frequency)", ({ overrides, score, tier, frequency }) => {
      const result = computeVendorRiskTier(makeInput(overrides));
      expect(result.residualScore).toBe(score);
      expect(result.tier).toBe(tier);
      expect(result.reviewFrequency).toBe(frequency);
    });
  });

  describe("clamping", () => {
    it("clamps residual at 0 for the worst case (no SOC2, scan 0, 3 open, 6 subs)", () => {
      const result = computeVendorRiskTier(
        makeInput({ latestScanRiskScore: 0, openHighCriticalAssessments: 3, subprocessorCount: 6 })
      );
      // 100 - 20 - 60 - 24 - 12 = -16 -> clamped to 0
      expect(result.residualScore).toBe(0);
      expect(result.tier).toBe("Tier 1 (Critical)");
    });

    it("clamps residual at 100 for the best case (SOC2, safe scan, contract + DPA)", () => {
      const result = computeVendorRiskTier(
        makeInput({ vendor: { hasCleanSoc2: true }, latestScanRiskScore: 100, hasContract: true, hasDpa: true })
      );
      // 100 + 5 + 8 = 113 -> clamped to 100
      expect(result.residualScore).toBe(100);
      expect(result.tier).toBe("Tier 3 (Medium)");
    });
  });

  describe("nextReviewDate (injectable clock)", () => {
    const tier1Input = { latestScanRiskScore: 0, openHighCriticalAssessments: 3, subprocessorCount: 6 }; // -> 0 -> Tier 1
    const tier2Input = { latestScanRiskScore: 57, openHighCriticalAssessments: 3, subprocessorCount: 3 }; // -> 50 -> Tier 2
    const tier3Input = { latestScanRiskScore: 55 }; // -> 75 -> Tier 3

    const cases: Array<{
      name: string;
      now: Date;
      input: Partial<VendorRiskInput>;
      year: number;
      month: number;
      day: number;
    }> = [
      {
        name: "Tier 1 adds 3 months",
        now: FIXED_NOW,
        input: tier1Input,
        year: 2026,
        month: 11,
        day: 18,
      },
      {
        name: "Tier 2 adds 6 months",
        now: FIXED_NOW,
        input: tier2Input,
        year: 2027,
        month: 2,
        day: 18,
      },
      {
        name: "Tier 3 adds 12 months",
        now: FIXED_NOW,
        input: tier3Input,
        year: 2027,
        month: 8,
        day: 18,
      },
      {
        name: "Oct 31 + 3 months => Jan 31 (month overflow, day fits)",
        now: new Date("2026-10-31T12:00:00.000Z"),
        input: tier1Input,
        year: 2027,
        month: 1,
        day: 31,
      },
      {
        name: "Jan 31 + 3 months => May 1 (April has 30 days; day rolls over)",
        now: new Date("2026-01-31T12:00:00.000Z"),
        input: tier1Input,
        year: 2026,
        month: 5,
        day: 1,
      },
    ];

    it.each(cases)("$name", ({ now, input, year, month, day }) => {
      const result = computeVendorRiskTier({ vendor: { id: 1, name: "V" }, now, ...input });
      expectLocalDate(result.nextReviewDate, now, year, month, day);
    });
  });

  describe("recommendedActions", () => {
    it("recommends the 3 maintenance fallbacks for a fully compliant vendor", () => {
      const result = computeVendorRiskTier(
        makeInput({ vendor: { hasCleanSoc2: true }, latestScanRiskScore: 100, hasContract: true, hasDpa: true })
      );
      expect(result.recommendedActions).toEqual([
        "Reassess at next review window",
        "Maintain accurate vendor inventory and contacts",
        "Keep vendor security documentation (SOC 2 / DPA) current",
      ]);
    });

    it("derives one gap action per finding in stable order (SOC2, DPA, assessments, scan)", () => {
      const result = computeVendorRiskTier(makeInput({ latestScanRiskScore: 0, openHighCriticalAssessments: 3 }));
      expect(result.recommendedActions).toEqual([
        "Mandate annual SOC 2 Type II submission",
        "Execute DPA with SCCs",
        "Follow up on outstanding assessments",
        "Review threat-intel scan findings (CVE/breach matches)",
      ]);
    });

    it("pads a single gap with fallbacks to exactly 3 actions", () => {
      const result = computeVendorRiskTier(makeInput({ vendor: { hasCleanSoc2: true }, latestScanRiskScore: 100 }));
      expect(result.recommendedActions).toEqual([
        "Execute DPA with SCCs",
        "Reassess at next review window",
        "Maintain accurate vendor inventory and contacts",
      ]);
    });

    it("keeps 3-5 actions for any signal combination", () => {
      const inputs = [
        makeInput(),
        makeInput({ vendor: { hasCleanSoc2: true }, latestScanRiskScore: 100, hasDpa: true }),
        makeInput({ latestScanRiskScore: 0, openHighCriticalAssessments: 4 }),
        makeInput({ vendor: { hasCleanSoc2: true }, hasDpa: true, hasContract: true, latestScanRiskScore: 70 }),
      ];
      for (const input of inputs) {
        const actions = computeVendorRiskTier(input).recommendedActions;
        expect(actions.length).toBeGreaterThanOrEqual(3);
        expect(actions.length).toBeLessThanOrEqual(5);
      }
    });
  });

  describe("determinism and echo", () => {
    it("produces deep-equal results for identical inputs with a fixed clock", () => {
      const input = makeInput({
        latestScanRiskScore: 42,
        openHighCriticalAssessments: 2,
        hasContract: true,
        subprocessorCount: 5,
      });
      expect(computeVendorRiskTier(input)).toEqual(computeVendorRiskTier(input));
    });

    it("is deterministic without an injected clock (scores/actions stable; only the date varies)", () => {
      const base = { vendor: { id: 1, name: "X" }, latestScanRiskScore: 42, openHighCriticalAssessments: 2 };
      const a = computeVendorRiskTier(base);
      const b = computeVendorRiskTier(base);
      expect(a.residualScore).toBe(b.residualScore);
      expect(a.tier).toBe(b.tier);
      expect(a.recommendedActions).toEqual(b.recommendedActions);
      expect(a.riskFactors).toEqual(b.riskFactors);
      expect(typeof a.nextReviewDate).toBe("string");
      expect(typeof b.nextReviewDate).toBe("string");
    });

    it("echoes vendor identity, dataAccessType and defaulted risk factors", () => {
      const result = computeVendorRiskTier(makeInput({ vendor: { id: 7, name: "Zeta" } }));
      expect(result.vendorId).toBe(7);
      expect(result.vendorName).toBe("Zeta");
      expect(result.dataAccessType).toBeNull();
      expect(result.riskFactors).toEqual({
        latestScanRiskScore: null,
        openHighCriticalAssessments: 0,
        hasContract: false,
        hasDpa: false,
        subprocessorCount: 0,
        hasCleanSoc2: false,
      });
    });

    it("echoes provided risk factors verbatim (including low scan scores)", () => {
      const result = computeVendorRiskTier(
        makeInput({
          latestScanRiskScore: 33,
          openHighCriticalAssessments: 2,
          hasContract: true,
          hasDpa: true,
          subprocessorCount: 9,
          vendor: { hasCleanSoc2: true },
        })
      );
      expect(result.riskFactors).toEqual({
        latestScanRiskScore: 33,
        openHighCriticalAssessments: 2,
        hasContract: true,
        hasDpa: true,
        subprocessorCount: 9,
        hasCleanSoc2: true,
      });
    });
  });
});

describe("buildVendorRiskOverview", () => {
  const OVERVIEW_NOW = new Date("2026-07-02T00:00:00.000Z");
  const ANCHOR = new Date("2026-01-01T00:00:00.000Z"); // past review date -> drives due-for-review

  /** Tier 1 vendor anchored Jan 1 -> nextReviewDate Apr 1 2026. */
  function tier1Row(id: number): VendorRiskResult {
    return computeVendorRiskTier({
      vendor: { id, name: `Vendor ${id}` },
      latestScanRiskScore: 0,
      openHighCriticalAssessments: 3,
      subprocessorCount: 6,
      now: ANCHOR,
    });
  }

  /** Tier 2 vendor anchored Jan 1 -> nextReviewDate Jul 1 2026. */
  function tier2Row(id: number): VendorRiskResult {
    return computeVendorRiskTier({
      vendor: { id, name: `Vendor ${id}` },
      latestScanRiskScore: 57,
      openHighCriticalAssessments: 3,
      subprocessorCount: 3,
      now: ANCHOR,
    });
  }

  /** Tier 3 vendor anchored Jan 1 -> nextReviewDate Jan 1 2027. */
  function tier3Row(id: number): VendorRiskResult {
    return computeVendorRiskTier({
      vendor: { id, name: `Vendor ${id}` },
      latestScanRiskScore: 55,
      now: ANCHOR,
    });
  }

  function makeRow(overrides: Partial<VendorRiskResult> = {}): VendorRiskResult {
    return {
      vendorId: 1,
      vendorName: "Acme Corp",
      dataAccessType: null,
      inherentRisk: "medium",
      residualScore: 80,
      tier: "Tier 3 (Medium)",
      reviewFrequency: "Annual",
      nextReviewDate: "2027-01-01T00:00:00.000Z",
      recommendedActions: ["Reassess at next review window"],
      riskFactors: {
        latestScanRiskScore: null,
        openHighCriticalAssessments: 0,
        hasContract: false,
        hasDpa: false,
        subprocessorCount: 0,
        hasCleanSoc2: false,
      },
      ...overrides,
    };
  }

  it("returns a zeroed overview for an empty portfolio", () => {
    const overview = buildVendorRiskOverview([], OVERVIEW_NOW);
    expect(overview.totalVendors).toBe(0);
    expect(overview.tierCounts).toEqual({ tier1: 0, tier2: 0, tier3: 0 });
    expect(overview.avgResidualScore).toBe(0);
    expect(overview.vendorsDueForReview).toEqual([]);
    expect(overview.updatedAt).toBe(OVERVIEW_NOW.toISOString());
  });

  it("counts tiers and total vendors across the portfolio", () => {
    const rows = [tier1Row(1), tier1Row(4), tier2Row(2), tier2Row(5), tier2Row(6), tier3Row(3)];
    const overview = buildVendorRiskOverview(rows, OVERVIEW_NOW);
    expect(overview.totalVendors).toBe(6);
    expect(overview.tierCounts).toEqual({ tier1: 2, tier2: 3, tier3: 1 });
  });

  it.each([
    [[83, 83, 84], 83.3], // 250/3 = 83.333... -> 83.3 (rounds to 1 decimal)
    [[49, 50], 49.5], // exact .5 preserved
    [[0, 100], 50],
  ] as Array<[number[], number]>)(
    "averages residual scores %p to %p (1 decimal)",
    (scores, expected) => {
      const rows = scores.map((s, i) => makeRow({ vendorId: i + 1, residualScore: s }));
      expect(buildVendorRiskOverview(rows, OVERVIEW_NOW).avgResidualScore).toBe(expected);
    }
  );

  it("filters vendorsDueForReview to nextReviewDate <= now", () => {
    const mid = new Date("2026-06-15T00:00:00.000Z"); // between Apr 1 and Jul 1
    const overview = buildVendorRiskOverview([tier2Row(2), tier3Row(3), tier1Row(1)], mid);
    expect(overview.vendorsDueForReview.map((r) => r.vendorId)).toEqual([1]);
  });

  it("sorts vendorsDueForReview by nextReviewDate ascending", () => {
    const overview = buildVendorRiskOverview([tier2Row(2), tier3Row(3), tier1Row(1)], OVERVIEW_NOW);
    expect(overview.vendorsDueForReview.map((r) => r.vendorId)).toEqual([1, 2]);
  });

  it("sets updatedAt to the reference clock ISO string", () => {
    const overview = buildVendorRiskOverview([tier3Row(1)], OVERVIEW_NOW);
    expect(overview.updatedAt).toBe("2026-07-02T00:00:00.000Z");
  });
});
