import { describe, it, expect, vi } from "vitest";

/**
 * CMMC / SPRS per-practice deduction engine (GAP-21, lib/federal/cmmcRegister.ts)
 * — pure-function contract tests (QA build-cycle 44).
 *
 * Covers the static 110-point SPRS catalog (SPRS_FAMILY_WEIGHTS keyed by
 * 800-171 assessment section) and computeSprsPerPracticeDeduction:
 *
 *   - Static integrity : exactly 13 sections ("3.1".."3.14" minus "3.9"),
 *                        weights sum EXACTLY to 110 = SPRS_MAX_SCORE.
 *   - Distribution     : every family's per-practice deductions sum EXACTLY
 *                        to its weight (integer largest-remainder rounding,
 *                        remainder units to lexicographically-lowest ids);
 *                        the whole register deducts exactly 110 -> score 0.
 *   - Liberal input    : arrays / Set / Map-keys iterables of id strings and
 *                        `{ id }` objects; trim + case-insensitive lookup;
 *                        duplicates collapse; unknown & garbage entries are
 *                        counted (unknownIdCount) but never break the run;
 *                        malformed containers yield the zeroed shape.
 *   - Determinism      : stable ordering (breakdown family asc, then id asc;
 *                        familiesAffected sorted + deduped); same input ->
 *                        deep-equal output. No Math.random, no Date.now.
 */

vi.setConfig({ testTimeout: 60_000 }); // generous budget: OneDrive-synced tree

import {
  SPRS_FAMILY_WEIGHTS,
  SPRS_MAX_SCORE,
  computeSprsPerPracticeDeduction,
  getCmmcPracticeById,
  getCmmcPracticeRegister,
} from "../../lib/federal/cmmcRegister";
import type { SprsPracticeDeductionResult } from "../../lib/federal/cmmcRegister";

// ———— Register-derived fixtures (static content — no DB, no randomness) ————

const register = getCmmcPracticeRegister();
const ALL_IDS: string[] = register.practices.map((p) => p.id);

/** "AC-L1-3.1.1" -> assessment section "3.1"; "PE-L2-3.10.4" -> "3.10". */
const SECTION_OF = (id: string): string => {
  const req = id.split("-")[2] ?? "";
  return req.split(".").slice(0, 2).join(".");
};

/** Section number -> all register practice ids in that section. */
const IDS_BY_SECTION: Record<string, string[]> = (() => {
  const acc: Record<string, string[]> = {};
  for (const id of ALL_IDS) {
    const section = SECTION_OF(id);
    (acc[section] ??= []).push(id);
  }
  return acc;
})();

/** First register id of a given two-letter family (e.g. "SC"). */
const firstIdOfFamily = (family: string): string =>
  register.practices.find((p) => p.family === family)?.id ??
  (() => {
    throw new Error(`register unexpectedly has no "${family}" practices`);
  })();

const zeroedShape = (): SprsPracticeDeductionResult => ({
  deductedPoints: 0,
  score: SPRS_MAX_SCORE,
  unmetCount: 0,
  unknownIdCount: 0,
  familiesAffected: [],
  breakdown: [],
});

// ———— Static catalog integrity (GAP-21 constants) ——————————————————————————

describe("cmmcRegister GAP-21 — SPRS static catalog", () => {
  it("SPRS_FAMILY_WEIGHTS covers exactly the 13 register-bearing sections ('3.1'..'3.14' minus '3.9')", () => {
    const keys = Object.keys(SPRS_FAMILY_WEIGHTS);
    const expected = Array.from({ length: 14 }, (_, i) => `3.${i + 1}`).filter((s) => s !== "3.9");
    expect([...keys].sort()).toEqual([...expected].sort());
    expect(keys).toHaveLength(13);
  });

  it("family weights are positive integers summing EXACTLY to 110", () => {
    const values = Object.values(SPRS_FAMILY_WEIGHTS);
    for (const w of values) {
      expect(Number.isInteger(w), `weight ${w} is an integer`).toBe(true);
      expect(w, `weight ${w} is positive`).toBeGreaterThan(0);
    }
    expect(values.reduce((a, b) => a + b, 0)).toBe(110);
  });

  it("SPRS_MAX_SCORE === 110", () => {
    expect(SPRS_MAX_SCORE).toBe(110);
  });
});

// ———— Distribution invariant: families sum exactly to their weights ————————
// The engine spreads each family's SPRS_FAMILY_WEIGHTS entry across its
// register practices with integer largest-remainder rounding, remainder
// units going to the lexicographically-lowest ids.

describe("cmmcRegister GAP-21 — distribution invariant", () => {
  it("every section's register ids deduct EXACTLY its SPRS_FAMILY_WEIGHTS entry", () => {
    const sections = Object.keys(IDS_BY_SECTION);
    // Bidirectional coverage: every weighted section has register practices
    // and vice versa ("3.9" has no Rev 2 register family by design).
    expect([...sections].sort()).toEqual(Object.keys(SPRS_FAMILY_WEIGHTS).sort());
    for (const [section, ids] of Object.entries(IDS_BY_SECTION)) {
      const res = computeSprsPerPracticeDeduction(ids);
      expect(res.deductedPoints, `section ${section} (${ids.length} practices)`).toBe(
        SPRS_FAMILY_WEIGHTS[section]
      );
      expect(res.unmetCount, `section ${section} unmet count`).toBe(ids.length);
    }
  });

  it("the WHOLE register deducts exactly 110 points and floors the score at 0", () => {
    expect(register.total).toBe(110);
    const res = computeSprsPerPracticeDeduction(ALL_IDS);
    expect(res.deductedPoints).toBe(110);
    expect(res.score).toBe(0);
    expect(res.unmetCount).toBe(110);
    expect(res.unknownIdCount).toBe(0);
    expect(res.familiesAffected).toHaveLength(Object.keys(SPRS_FAMILY_WEIGHTS).length);
  });

  it("largest remainder (AC): weight 23 over 22 practices => one id carries 2 pts, the rest 1", () => {
    const acIds = [...IDS_BY_SECTION["3.1"]].sort();
    expect(acIds).toHaveLength(22);
    const res = computeSprsPerPracticeDeduction(acIds);
    expect(res.deductedPoints).toBe(23);

    const twos = res.breakdown.filter((r) => r.points === 2);
    const ones = res.breakdown.filter((r) => r.points === 1);
    expect(twos).toHaveLength(1);
    expect(ones).toHaveLength(21);
    // Remainder unit goes to the lexicographically-lowest id.
    expect(twos[0]!.id).toBe(acIds[0]);
    // Every row cross-checks against getCmmcPracticeById.
    for (const row of res.breakdown) {
      const practice = getCmmcPracticeById(row.id);
      expect(practice, `row ${row.id} resolves`).not.toBeNull();
      expect(practice!.family).toBe("AC");
      expect(row.family).toBe("AC");
    }
  });

  it("largest remainder (SC): weight 31 over 13 practices => 5 ids carry 3 pts, 8 carry 2", () => {
    const scIds = [...IDS_BY_SECTION["3.13"]].sort();
    expect(scIds).toHaveLength(13);
    const res = computeSprsPerPracticeDeduction(scIds);
    expect(res.deductedPoints).toBe(31);

    const threes = res.breakdown.filter((r) => r.points === 3);
    const twos = res.breakdown.filter((r) => r.points === 2);
    expect(threes).toHaveLength(5);
    expect(twos).toHaveLength(8);
    // Remainder units go to the 5 lexicographically-lowest ids, deterministically.
    expect(threes.map((r) => r.id)).toEqual(scIds.slice(0, 5));
    expect(twos.map((r) => r.id)).toEqual(scIds.slice(5));
  });
});

// ———— Behaviour: liberal input handling, never throws ———————————————————————

describe("cmmcRegister GAP-21 — computeSprsPerPracticeDeduction behaviour", () => {
  it("empty array yields the zeroed shape", () => {
    expect(computeSprsPerPracticeDeduction([])).toEqual(zeroedShape());
  });

  it("duplicate ids collapse into a single deduction", () => {
    const res = computeSprsPerPracticeDeduction([
      "ac-l1-3.1.1",
      "AC-L1-3.1.1",
      "  ac-l1-3.1.1  ",
    ]);
    expect(res.unmetCount).toBe(1);
    expect(res.deductedPoints).toBe(2); // AC-L1-3.1.1 carries the AC remainder point
    expect(res.breakdown).toHaveLength(1);
    expect(res.breakdown[0]).toEqual({ id: "AC-L1-3.1.1", family: "AC", points: 2 });
    expect(res.unknownIdCount).toBe(0);
    expect(res.familiesAffected).toEqual(["AC"]);
  });

  it('resolves "{ id }" object entries alongside plain strings', () => {
    const scId = firstIdOfFamily("SC");
    const atId = firstIdOfFamily("AT");
    const res = computeSprsPerPracticeDeduction([
      { id: scId.toLowerCase() },
      atId,
      { id: ALL_IDS[0] }, // any canonical register id as an object entry
    ]);
    expect(res.unmetCount).toBe(3);
    expect(res.breakdown.map((r) => r.id)).toContain(getCmmcPracticeById(scId)!.id);
    expect(res.unknownIdCount).toBe(0);
  });

  it("lookup is case-insensitive AND trimmed ('ac-l1-3.1.1' resolves)", () => {
    const res = computeSprsPerPracticeDeduction(["ac-l1-3.1.1"]);
    expect(res.unmetCount).toBe(1);
    expect(res.breakdown[0]!.id).toBe(getCmmcPracticeById("  Ac-L1-3.1.1  ")!.id);
    expect(res.breakdown[0]!.id).toBe("AC-L1-3.1.1");
  });

  it("unknown ids are counted in unknownIdCount and excluded from breakdown", () => {
    const known = firstIdOfFamily("IR");
    const res = computeSprsPerPracticeDeduction(["DEFINITELY-NOT-A-PRACTICE", "zz-l9-9.9.9", known]);
    expect(res.unknownIdCount).toBe(2);
    expect(res.unmetCount).toBe(1);
    expect(res.breakdown.map((r) => r.id)).toEqual([getCmmcPracticeById(known)!.id]);
    expect(res.familiesAffected).toEqual(["IR"]);
  });

  it("garbage entries (numbers/null/booleans/objects-without-id) are each counted as unknown", () => {
    const garbage: unknown[] = [42, null, true, undefined, {}, { nope: 1 }, { id: 42 }, [], ["x"]];
    const res = computeSprsPerPracticeDeduction(garbage);
    expect(res.unknownIdCount).toBe(garbage.length);
    expect(res.deductedPoints).toBe(0);
    expect(res.unmetCount).toBe(0);
    expect(res.breakdown).toEqual([]);
    expect(res.familiesAffected).toEqual([]);
  });

  it("malformed containers NEVER throw — they yield the zeroed shape", () => {
    for (const container of [null, undefined, 42, 0, NaN, "str", true, {}, () => "x"]) {
      expect(computeSprsPerPracticeDeduction(container), `container ${String(container)}`).toEqual(
        zeroedShape()
      );
    }
  });

  it("Set collections and Map key iterators are accepted like arrays", () => {
    const acLower = firstIdOfFamily("AC").toLowerCase();
    const siId = firstIdOfFamily("SI");
    const fromArray = computeSprsPerPracticeDeduction([acLower, siId]);

    const fromSet = computeSprsPerPracticeDeduction(new Set([acLower, siId]));
    expect(fromSet).toEqual(fromArray);

    const map = new Map<unknown, number>([[acLower, 1], [siId, 2]]);
    const fromMapKeys = computeSprsPerPracticeDeduction(map.keys());
    expect(fromMapKeys).toEqual(fromArray);
    expect(fromMapKeys.unmetCount).toBe(2);
  });

  it("familiesAffected is sorted ascending and deduplicated", () => {
    const picks = ["SI", "SC", "AU", "AC"].map(firstIdOfFamily);
    const res = computeSprsPerPracticeDeduction([...picks, picks[3], picks[3]]); // dupes on AC
    expect(res.familiesAffected).toEqual([...new Set(["SI", "SC", "AU", "AC"])].sort());
    expect(new Set(res.familiesAffected).size).toBe(res.familiesAffected.length);
  });

  it("breakdown rows are sorted family asc then id asc", () => {
    const scrambled = [
      firstIdOfFamily("SI"),
      firstIdOfFamily("SC"),
      firstIdOfFamily("AC"),
      ...IDS_BY_SECTION["3.1"].slice().reverse(),
      firstIdOfFamily("MA"),
    ];
    const res = computeSprsPerPracticeDeduction(scrambled);
    const sortedCopy = [...res.breakdown].sort((a, b) =>
      a.family < b.family ? -1 : a.family > b.family ? 1 : a.id < b.id ? -1 : a.id > b.id ? 1 : 0
    );
    expect(res.breakdown).toEqual(sortedCopy);
    for (let i = 1; i < res.breakdown.length; i++) {
      const prev = res.breakdown[i - 1]!;
      const curr = res.breakdown[i]!;
      expect(
        prev.family < curr.family || (prev.family === curr.family && prev.id < curr.id),
        `rows ${i - 1},${i} strictly ordered`
      ).toBe(true);
    }
  });

  it("determinism: identical input yields deep-equal output across calls", () => {
    const input = [...ALL_IDS.slice(0, 25).map((id) => ({ id })), ...IDS_BY_SECTION["3.13"]];
    const a = computeSprsPerPracticeDeduction(input);
    const b = computeSprsPerPracticeDeduction(input);
    expect(a).toEqual(b);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("score can never go negative even when every id is passed repeatedly", () => {
    const res = computeSprsPerPracticeDeduction([...ALL_IDS, ...ALL_IDS]);
    expect(res.deductedPoints).toBe(110); // duplicates still collapse...
    expect(res.score).toBe(0); // ...so the floor is exact, not negative
    expect(res.score).toBeGreaterThanOrEqual(0);
    expect(res.unmetCount).toBe(110);
  });
});
