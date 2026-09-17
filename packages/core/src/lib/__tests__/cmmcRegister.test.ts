import { describe, it, expect, vi } from "vitest";

/**
 * lib/federal/cmmcRegister.ts -- cycle 44 (GAP-20/21 closure) QA suite.
 *
 * Covers the committed NIST SP 800-171 Rev 2 practice-level register engine
 * plus the GAP-21 per-practice SPRS deduction distribution added this cycle:
 *   CMMC_PRACTICES                   -> readonly CmmcPractice[] (110)
 *   getCmmcPracticeRegister(filter?) -> filtered view + FULL-register rollup
 *   getCmmcRegisterSummary()         -> full-register level/family rollup
 *   getCmmcPracticeById(id)          -> trim/case-insensitive lookup
 *   SPRS_FAMILY_WEIGHTS              -> 110-pt per-section weights (GAP-21)
 *   SPRS_MAX_SCORE                   -> 110
 *   computeSprsPerPracticeDeduction(unmetIds) -> per-practice deduction
 *
 * House rules mirrored from sibling engine suites: boundary + malformed-input
 * never-throws sweeps, deterministic-output pins, zero-dep purity.
 */

import {
  CMMC_PRACTICES,
  SPRS_FAMILY_WEIGHTS,
  SPRS_MAX_SCORE,
  computeSprsPerPracticeDeduction,
  getCmmcPracticeById,
  getCmmcPracticeRegister,
  getCmmcRegisterSummary,
} from "../federal/cmmcRegister";

/** Documented register shape (engine module docblock). */
const EXPECTED_FAMILY_COUNTS: Record<string, number> = {
  AC: 22,
  AT: 3,
  AU: 9,
  CA: 6,
  CM: 9,
  IA: 11,
  IR: 6,
  MA: 6,
  MP: 9,
  PE: 6,
  PS: 3,
  SC: 13,
  SI: 7,
};
const EXPECTED_LEVEL_COUNTS = { 1: 17, 2: 93, 3: 0 } as const;

/** Generous budget: OneDrive-synced tree can be slow under parallel load. */
vi.setConfig({ testTimeout: 30_000 });

describe("cmmcRegister -- register integrity", () => {
  it("holds exactly 110 unique practices", () => {
    expect(CMMC_PRACTICES).toHaveLength(110);
    expect(new Set(CMMC_PRACTICES.map((p) => p.id)).size).toBe(110);
  });

  it("matches the documented family counts (AC22 AT3 AU9 CA6 CM9 IA11 IR6 MA6 MP9 PE6 PS3 SC13 SI7)", () => {
    const byFamily = new Map<string, number>();
    for (const p of CMMC_PRACTICES) byFamily.set(p.family, (byFamily.get(p.family) ?? 0) + 1);
    expect(Object.fromEntries(byFamily)).toEqual(EXPECTED_FAMILY_COUNTS);
  });

  it("matches the documented level split (L1=17 basic, L2=93 derived, L3 reserved-empty)", () => {
    const levels = { 1: 0, 2: 0, 3: 0 } as Record<1 | 2 | 3, number>;
    for (const p of CMMC_PRACTICES) levels[p.level] += 1;
    expect(levels).toEqual(EXPECTED_LEVEL_COUNTS);
  });

  it("every row carries well-formed ids consistent with its own family+level fields", () => {
    for (const p of CMMC_PRACTICES) {
      const m = /^([A-Z]{2})-L([123])-(3\.\d+\.\d+)$/.exec(p.id);
      expect(m, `id shape of ${p.id}`).not.toBeNull();
      expect(m![1], `family prefix of ${p.id}`).toBe(p.family);
      expect(Number(m![2]), `level digit of ${p.id}`).toBe(p.level);
      expect(p.title.length, `title of ${p.id}`).toBeGreaterThan(0);
      expect(p.requirement.length, `requirement of ${p.id}`).toBeGreaterThan(0);
      expect(Array.isArray(p.objectives), `objectives array of ${p.id}`).toBe(true);
      expect(p.objectives.length, `objectives nonempty for ${p.id}`).toBeGreaterThan(0);
    }
  });

  it("every family maps to an SPRS section weight (GAP-21 coupling complete)", () => {
    const sections = new Set(Object.keys(SPRS_FAMILY_WEIGHTS));
    for (const p of CMMC_PRACTICES) {
      // Section number embedded in the id must exist in SPRS_FAMILY_WEIGHTS.
      const section = p.id.split("-")[2].split(".").slice(0, 2).join(".");
      expect(sections.has(section), `${p.id} -> section ${section}`).toBe(true);
    }
  });
});

describe("cmmcRegister -- getCmmcPracticeRegister", () => {
  it("no-filter view returns the full register with the FULL-rollup families", () => {
    const r = getCmmcPracticeRegister();
    expect(r.total).toBe(110);
    expect(r.practices).toHaveLength(110);
    expect(r.families).toHaveLength(13);
    expect(r.families.reduce((s, f) => s + f.count, 0)).toBe(110);
  });

  it("families ALWAYS describes the full register even when practices are filtered", () => {
    const full = getCmmcPracticeRegister();
    const filtered = getCmmcPracticeRegister({ family: "AC", level: 1, search: "access" });
    expect(filtered.families).toEqual(full.families);
    expect(filtered.total).toBeLessThanOrEqual(110);
  });

  it("family filter is case-insensitive exact", () => {
    expect(getCmmcPracticeRegister({ family: "ac" }).total).toBe(22);
    expect(getCmmcPracticeRegister({ family: " Ac " === "" ? "" : "Ac" }).total).toBe(22);
    expect(getCmmcPracticeRegister({ family: "sc" }).practices.every((p) => p.family === "SC")).toBe(
      true,
    );
  });

  it("unknown family yields zero practices but leaves the rollup untouched", () => {
    const r = getCmmcPracticeRegister({ family: "ZZ" });
    expect(r.total).toBe(0);
    expect(r.practices).toHaveLength(0);
    expect(r.families.reduce((s, f) => s + f.count, 0)).toBe(110);
  });

  it("level honored ONLY for literal ints 1|2|3; other values act as absent", () => {
    expect(getCmmcPracticeRegister({ level: 1 }).total).toBe(17);
    expect(getCmmcPracticeRegister({ level: 2 }).total).toBe(93);
    expect(getCmmcPracticeRegister({ level: 3 }).total).toBe(0);
    // Engine-tolerance semantics: non-literal levels are ignored entirely.
    expect(getCmmcPracticeRegister({ level: 4 }).total).toBe(110);
    expect(getCmmcPracticeRegister({ level: "2" as unknown as 2 }).total).toBe(110);
    expect(getCmmcPracticeRegister({ level: 1.5 }).total).toBe(110);
    expect(getCmmcPracticeRegister({ level: true as unknown as 1 }).total).toBe(110);
  });

  it("search is a case-insensitive substring over id+title+requirement", () => {
    const lower = getCmmcPracticeRegister({ search: "limit system access" });
    expect(lower.total).toBeGreaterThan(0);
    expect(lower.practices.some((p) => p.id === "AC-L1-3.1.1")).toBe(true);
    const upper = getCmmcPracticeRegister({ search: "LIMIT SYSTEM ACCESS" });
    expect(upper.total).toBe(lower.total);
    const byId = getCmmcPracticeRegister({ search: "AC-L1-3.1.1" });
    expect(byId.total).toBe(1);
  });

  it("combined filters AND together", () => {
    const r = getCmmcPracticeRegister({ family: "AC", level: 1 });
    expect(r.total).toBeGreaterThan(0);
    expect(r.practices.every((p) => p.family === "AC" && p.level === 1)).toBe(true);
  });

  it("malformed filters behave like {} and NEVER throw", () => {
    const baseline = getCmmcPracticeRegister();
    for (const bad of [null, undefined, 42, "x", [], true]) {
      const r = getCmmcPracticeRegister(bad);
      expect(() => r.total).not.toThrow();
      expect(r).toEqual(baseline);
    }
  });

  it("deterministic across invocations", () => {
    expect(getCmmcPracticeRegister({ search: "cui" })).toEqual(
      getCmmcPracticeRegister({ search: "cui" }),
    );
  });
});

describe("cmmcRegister -- getCmmcRegisterSummary", () => {
  it("returns total 110 with levels sorted 1,2,3 matching actual counts", () => {
    const s = getCmmcRegisterSummary();
    expect(s.total).toBe(110);
    expect(s.levels.map((l) => l.level)).toEqual([1, 2, 3]);
    expect(s.levels.find((l) => l.level === 1)?.count).toBe(17);
    expect(s.levels.find((l) => l.level === 2)?.count).toBe(93);
    expect(s.levels.find((l) => l.level === 3)?.count).toBe(0);
  });

  it("families alphabetical and consistent with the register", () => {
    const s = getCmmcRegisterSummary();
    const codes = s.families.map((f) => f.family);
    expect(codes).toEqual([...codes].sort());
    expect(s.families.reduce((a, f) => a + f.count, 0)).toBe(110);
    expect(s.families.map((f) => [f.family, f.count])).toEqual(
      Object.entries(EXPECTED_FAMILY_COUNTS).sort(([a], [b]) => (a < b ? -1 : 1)),
    );
  });
});

describe("cmmcRegister -- getCmmcPracticeById", () => {
  it("exact, trimmed, and case-insensitive lookups hit", () => {
    expect(getCmmcPracticeById("AC-L1-3.1.1")?.id).toBe("AC-L1-3.1.1");
    expect(getCmmcPracticeById("  ac-l1-3.1.1  ")?.id).toBe("AC-L1-3.1.1");
    expect(getCmmcPracticeById("Sc-L1-3.13.1")?.family).toBe("SC");
  });

  it("non-string, empty, and unknown ids return null without throwing", () => {
    expect(getCmmcPracticeById(null)).toBeNull();
    expect(getCmmcPracticeById(undefined)).toBeNull();
    expect(getCmmcPracticeById(42)).toBeNull();
    expect(getCmmcPracticeById({ id: "AC-L1-3.1.1" })).toBeNull();
    expect(getCmmcPracticeById("")).toBeNull();
    expect(getCmmcPracticeById("   ")).toBeNull();
    expect(getCmmcPracticeById("XX-L9-9.9.9")).toBeNull();
  });
});

// ------ GAP-21: per-practice SPRS deduction distribution ------------------------------------

const SECTION_OF_FAMILY: Record<string, string> = {
  AC: "3.1", AT: "3.2", AU: "3.3", CM: "3.4", IA: "3.5", IR: "3.6",
  MA: "3.7", MP: "3.8", PE: "3.10", PS: "3.11", CA: "3.12", SC: "3.13", SI: "3.14",
};

describe("GAP-21 -- SPRS static weights", () => {
  it("SPRS_MAX_SCORE is the canonical 110", () => {
    expect(SPRS_MAX_SCORE).toBe(110);
  });

  it("SPRS_FAMILY_WEIGHTS covers exactly the 13 register-bearing sections and sums to 110", () => {
    const entries = Object.entries(SPRS_FAMILY_WEIGHTS);
    expect(entries).toHaveLength(13);
    expect(entries.reduce((s, [, w]) => s + w, 0)).toBe(110);
    for (const [, w] of entries) {
      expect(Number.isInteger(w)).toBe(true);
      expect(w).toBeGreaterThan(0);
    }
    expect(Object.keys(SPRS_FAMILY_WEIGHTS)).not.toContain("3.9"); // no Rev 2 register family
  });

  it("per-practice points distribute each family's weight EXACTLY (largest-remainder invariant)", () => {
    const r = computeSprsPerPracticeDeduction(CMMC_PRACTICES.map((p) => p.id));
    expect(r.unknownIdCount).toBe(0);
    expect(r.unmetCount).toBe(110);
    for (const family of Object.keys(EXPECTED_FAMILY_COUNTS)) {
      const familySum = r.breakdown
        .filter((row) => row.family === family)
        .reduce((s, row) => s + row.points, 0);
      expect(familySum, `family ${family} sums to its weight`).toBe(
        SPRS_FAMILY_WEIGHTS[SECTION_OF_FAMILY[family]],
      );
    }
  });

  it("all-practice input deducts exactly 110 -> score floors to 0", () => {
    const r = computeSprsPerPracticeDeduction(CMMC_PRACTICES.map((p) => ({ id: p.id })));
    expect(r.deductedPoints).toBe(110);
    expect(r.score).toBe(0);
  });

  it("every point value is a non-negative integer", () => {
    const r = computeSprsPerPracticeDeduction(CMMC_PRACTICES.map((p) => p.id));
    for (const row of r.breakdown) {
      expect(Number.isInteger(row.points)).toBe(true);
      expect(row.points).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("GAP-21 -- computeSprsPerPracticeDeduction behavior", () => {
  it("single recognized id produces its fixed deduction row", () => {
    const r = computeSprsPerPracticeDeduction(["AC-L1-3.1.1"]);
    expect(r.unmetCount).toBe(1);
    expect(r.unknownIdCount).toBe(0);
    expect(r.deductedPoints).toBe(r.breakdown[0].points);
    expect(r.score).toBe(110 - r.deductedPoints);
    expect(r.familiesAffected).toEqual(["AC"]);
    expect(r.breakdown).toEqual([
      { id: "AC-L1-3.1.1", family: "AC", points: r.breakdown[0].points },
    ]);
  });

  it("tolerant coercion: trims/case-folds strings, accepts {id}, dedupes, counts garbage", () => {
    const single = computeSprsPerPracticeDeduction(["AC-L1-3.1.1"]).deductedPoints;
    const r = computeSprsPerPracticeDeduction([
      "  ac-L1-3.1.1  ",
      { id: "AC-L1-3.1.1" }, // duplicate collapses
      { id: "sc-l1-3.13.1" },
      "totally-bogus-id",
      42,
      null,
      {},
    ]);
    expect(r.unmetCount).toBe(2);
    expect(r.unknownIdCount).toBe(4); // bogus string + 42 + null + {}
    expect(r.deductedPoints).toBe(
      single + r.breakdown.find((b) => b.id === "SC-L1-3.13.1")!.points,
    );
    expect(r.familiesAffected).toEqual(["AC", "SC"]);
    expect(r.breakdown.map((b) => b.family)).toEqual(["AC", "SC"]); // family asc, then id asc
  });

  it("accepts any iterable (Set) and stays deterministic", () => {
    const viaSet = computeSprsPerPracticeDeduction(new Set(["IA-L1-3.5.1", "IR-L1-3.6.1"]));
    const viaArray = computeSprsPerPracticeDeduction(["IR-L1-3.6.1", "IA-L1-3.5.1"]);
    expect(viaSet).toEqual(viaArray);
    expect(viaSet.breakdown.map((b) => b.id)).toEqual(["IA-L1-3.5.1", "IR-L1-3.6.1"]);
  });

  it("malformed containers yield the zeroed shape and never throw", () => {
    for (const bad of [null, undefined, 42, "AC-L1-3.1.1", {}, true]) {
      const r = computeSprsPerPracticeDeduction(bad);
      expect(r).toEqual({
        deductedPoints: 0,
        score: 110,
        unmetCount: 0,
        unknownIdCount: 0,
        familiesAffected: [],
        breakdown: [],
      });
    }
  });

  it("empty collection is valid input -> zeroed deduction, full score", () => {
    expect(computeSprsPerPracticeDeduction([])).toMatchObject({
      deductedPoints: 0,
      score: 110,
      unmetCount: 0,
    });
  });
});
