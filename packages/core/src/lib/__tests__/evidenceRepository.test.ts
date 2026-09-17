import { describe, it, expect } from "vitest";

/**
 * NIS2 Evidence Repository engine (lib/nis2/evidenceRepository.ts) — engine
 * tests (QA cycle 24, NIS2 Phase 6 Task 6.2 / ENISA evidence measures).
 *
 * Mirrors securityMetrics.test.ts / policyTemplates.test.ts: the engine is
 * pure and deterministic, never throws, and accepts an injectable `now` clock
 * (Date | epoch-ms number | ISO-8601 string) or a `clock` factory where time
 * matters. Every function is exercised at its band boundaries, on malformed
 * input, on clock injection, and for input determinism (same input twice =>
 * deep-equal).
 *
 * Contract under test:
 *   EVIDENCE_SUGGESTION_CATALOG        -> 13 frozen ENISA measures
 *   suggestEvidence(input?)            -> ranked suggestions (score desc,
 *                                         measureId numeric asc, title asc)
 *   buildEvidenceAuditTrail(input?)    -> event trail + summary
 *   analyzeEvidenceQuality(input?)     -> quality analysis + overall rollup
 *
 * Suggest model: catalog baseScore 60-85; +1 per matched requirementText
 * term (word tokens len >= 3 or keyword phrase) capped +15; score clamped
 * 0-100; measureId exact-match (case-insensitive) filter; category
 * case-insensitive substring over title + collectionMethod + evidenceTypes;
 * positive-int limit applied last. Malformed -> EMPTY_EVIDENCE_SUGGESTIONS.
 *
 * Audit-trail model: per-row event { id, evidenceId (row.evidenceId ??
 * String(row.id) ?? ""), status coerced to the 6-value enum (invalid ->
 * "pending"), type (default "evidence"), owner (null unless non-empty
 * trimmed), fileCount (max(0, floor)), updatedAt (Date|null),
 * daysSinceUpdate (floor whole days vs clock, min 0, null when missing) }.
 * Sorted updatedAt desc (nulls last) then id asc. Summary totals with every
 * enum key zeroed, withOwner / withFiles. Malformed -> EMPTY_EVIDENCE_AUDIT_TRAIL.
 *
 * Analysis model: freshness precedence expired (expiry in the past) ->
 * expiring (<= 90 days remain) -> stale (never verified OR past the
 * interval, strict >) -> fresh. Cadence: "n-a" without an interval, overdue
 * (never verified OR strictly past the interval), due-soon (>= 75% of the
 * interval), else on-track. qualityScore = clamp(0,100) of statusBase
 * (verified 50 / collected 35 / pending 20 / not_applicable 15 / rejected 0
 * / expired 0) + freshnessBonus (fresh 30 / expiring 15 / stale 5 / expired
 * 0) + cadenceBonus (on-track 15 / due-soon 5 / overdue 0 / n-a 5) +
 * fileBonus (fileCount > 0 ? 5 : 0); band >= 80 strong, >= 55 adequate,
 * else weak. nextAction weakest-signal precedence: expired, rejected,
 * overdue, stale, due-soon, else "Evidence healthy — no action needed".
 * overall.avgQualityScore 1dp, coverageRate = verified/total*100 1dp, up to
 * 5 recommendations in fixed order (expired, stale, overdue, dueSoon,
 * unverified — only when > 0). Malformed -> EMPTY_EVIDENCE_ANALYSIS.
 */

const NOW = new Date("2026-08-21T00:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const iso = (daysFromNow: number) => new Date(NOW.getTime() + daysFromNow * DAY_MS).toISOString();
const epoch = (daysFromNow: number) => NOW.getTime() + daysFromNow * DAY_MS;

import {
  EVIDENCE_SUGGESTION_CATALOG,
  suggestEvidence,
  buildEvidenceAuditTrail,
  analyzeEvidenceQuality,
  EMPTY_EVIDENCE_SUGGESTIONS,
  EMPTY_EVIDENCE_AUDIT_TRAIL,
  EMPTY_EVIDENCE_ANALYSIS,
} from "../nis2/evidenceRepository";

/* ================================================================== */
/* EVIDENCE_SUGGESTION_CATALOG integrity                               */
/* ================================================================== */

describe("EVIDENCE_SUGGESTION_CATALOG — 13 ENISA measures, frozen and well-formed", () => {
  it("contains exactly the 13 plan measures in ascending numeric order", () => {
    expect(EVIDENCE_SUGGESTION_CATALOG.map((e) => e.measureId)).toEqual([
      "1.1", "2.1", "3.1", "4.1", "5.1", "6.7", "6.2", "7.1", "8.1", "9.1", "10.1", "11.1", "12.1",
    ]);
    expect(EVIDENCE_SUGGESTION_CATALOG).toHaveLength(13);
  });

  it("has no duplicate measureIds", () => {
    const ids = EVIDENCE_SUGGESTION_CATALOG.map((e) => e.measureId);
    expect(new Set(ids).size).toBe(13);
  });

  it("is deeply frozen (read-only catalog contract)", () => {
    expect(Object.isFrozen(EVIDENCE_SUGGESTION_CATALOG)).toBe(true);
    expect(Object.isFrozen(EVIDENCE_SUGGESTION_CATALOG[0])).toBe(true);
    expect(Object.isFrozen(EVIDENCE_SUGGESTION_CATALOG[0].evidenceTypes)).toBe(true);
  });

  it("each entry is well-formed: article, evidenceTypes (2-4), freshnessDays, baseScore 60-85", () => {
    for (const entry of EVIDENCE_SUGGESTION_CATALOG) {
      expect(entry.article).toMatch(/^21\(2\)\([a-j]\)$/);
      expect(entry.title.length).toBeGreaterThan(0);
      expect(entry.evidenceTypes.length).toBeGreaterThanOrEqual(2);
      expect(entry.evidenceTypes.length).toBeLessThanOrEqual(4);
      expect(entry.collectionMethod.length).toBeGreaterThan(0);
      expect(entry.exampleEvidence.length).toBeGreaterThan(0);
      expect(Number.isInteger(entry.freshnessDays)).toBe(true);
      expect(entry.freshnessDays).toBeGreaterThan(0);
      expect(entry.baseScore).toBeGreaterThanOrEqual(60);
      expect(entry.baseScore).toBeLessThanOrEqual(85);
      expect(Array.isArray(entry.keywords)).toBe(true);
    }
  });

  it("maps articles across the NIS2 Art. 21(2) categories a-j", () => {
    const articles = EVIDENCE_SUGGESTION_CATALOG.map((e) => e.article);
    expect(articles).toContain("21(2)(a)");
    expect(articles).toContain("21(2)(j)");
    expect(new Set(articles).size).toBeGreaterThanOrEqual(10);
  });
});

/* ================================================================== */
/* EMPTY shapes — frozen safe defaults                                 */
/* ================================================================== */

describe("EMPTY_* shapes — frozen safe defaults (UI-STANDARD 16)", () => {
  it("EMPTY_EVIDENCE_SUGGESTIONS matches the contract and is frozen", () => {
    expect(EMPTY_EVIDENCE_SUGGESTIONS).toEqual({ suggestions: [] });
    expect(Object.isFrozen(EMPTY_EVIDENCE_SUGGESTIONS)).toBe(true);
  });

  it("EMPTY_EVIDENCE_AUDIT_TRAIL matches the contract and is frozen", () => {
    expect(EMPTY_EVIDENCE_AUDIT_TRAIL).toEqual({
      events: [],
      summary: { totals: { total: 0, byStatus: {} }, withOwner: 0, withFiles: 0 },
    });
    expect(Object.isFrozen(EMPTY_EVIDENCE_AUDIT_TRAIL)).toBe(true);
  });

  it("EMPTY_EVIDENCE_ANALYSIS matches the contract and is frozen", () => {
    expect(EMPTY_EVIDENCE_ANALYSIS).toEqual({
      rows: [],
      overall: {
        avgQualityScore: 0,
        coverageRate: 0,
        counts: { total: 0, verified: 0, expired: 0, stale: 0, fresh: 0, expiring: 0, dueSoon: 0, overdue: 0 },
        recommendations: [],
      },
    });
    expect(Object.isFrozen(EMPTY_EVIDENCE_ANALYSIS)).toBe(true);
    expect(Object.isFrozen(EMPTY_EVIDENCE_ANALYSIS.overall.counts)).toBe(true);
  });
});

/* ================================================================== */
/* suggestEvidence                                                     */
/* ================================================================== */

describe("suggestEvidence — empty / malformed input yields the zeroed safe shape", () => {
  it("returns EMPTY_EVIDENCE_SUGGESTIONS for undefined / null / non-object input", () => {
    expect(suggestEvidence(undefined)).toEqual(EMPTY_EVIDENCE_SUGGESTIONS);
    expect(suggestEvidence(null)).toEqual(EMPTY_EVIDENCE_SUGGESTIONS);
    expect(suggestEvidence(42 as never)).toEqual(EMPTY_EVIDENCE_SUGGESTIONS);
    expect(suggestEvidence("nope" as never)).toEqual(EMPTY_EVIDENCE_SUGGESTIONS);
    expect(suggestEvidence([] as never)).toEqual(EMPTY_EVIDENCE_SUGGESTIONS);
  });

  it("never throws on garbage filter values", () => {
    expect(() =>
      suggestEvidence({ measureId: 42 as never, category: true as never, requirementText: 7 as never, limit: "x" as never })
    ).not.toThrow();
  });
});

describe("suggestEvidence — default ranking (score desc, then measureId numeric asc)", () => {
  it("returns all 13 catalog suggestions sorted by base score desc when no filters", () => {
    const result = suggestEvidence({});
    expect(result.suggestions).toHaveLength(13);
    const scores = result.suggestions.map((s) => s.score);
    // non-increasing scores
    for (let i = 1; i < scores.length; i++) expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
    // expected order from base scores (ties 2.1/7.1 broken by measureId numeric asc)
    expect(result.suggestions.map((s) => s.measureId)).toEqual([
      "4.1", "6.7", "11.1", "3.1", "9.1", "5.1", "2.1", "7.1", "6.2", "12.1", "1.1", "8.1", "10.1",
    ]);
  });

  it("emits the full suggestion item contract for every entry", () => {
    const result = suggestEvidence({});
    for (const item of result.suggestions) {
      expect(typeof item.measureId).toBe("string");
      expect(item.article).toMatch(/^21\(2\)\([a-j]\)$/);
      expect(item.title.length).toBeGreaterThan(0);
      expect(Array.isArray(item.evidenceTypes)).toBe(true);
      expect(item.collectionMethod.length).toBeGreaterThan(0);
      expect(item.freshnessDays).toBeGreaterThan(0);
      expect(item.exampleEvidence.length).toBeGreaterThan(0);
      expect(item.score).toBeGreaterThanOrEqual(0);
      expect(item.score).toBeLessThanOrEqual(100);
      expect(item.matchReason).toContain(`ENISA measure ${item.measureId}`);
    }
  });

  it("without matched requirement text every score equals the catalog base score", () => {
    const result = suggestEvidence({ requirementText: "zzz qqq www" });
    expect(result.suggestions).toHaveLength(13);
    const byId = new Map(result.suggestions.map((s) => [s.measureId, s]));
    for (const entry of EVIDENCE_SUGGESTION_CATALOG) {
      expect(byId.get(entry.measureId)!.score).toBe(entry.baseScore);
      expect(byId.get(entry.measureId)!.matchReason).not.toContain("Requirement text matched");
    }
  });
});

describe("suggestEvidence — measureId filter", () => {
  it("exact match narrows to a single measure", () => {
    const result = suggestEvidence({ measureId: "4.1" });
    expect(result.suggestions.map((s) => s.measureId)).toEqual(["4.1"]);
  });

  it("measureId filter is case-insensitive and trimmed", () => {
    const result = suggestEvidence({ measureId: " 4.1 " });
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].measureId).toBe("4.1");
  });

  it("non-matching measureId yields an empty list", () => {
    expect(suggestEvidence({ measureId: "4.2" }).suggestions).toEqual([]);
    expect(suggestEvidence({ measureId: "04.1" }).suggestions).toEqual([]);
    expect(suggestEvidence({ measureId: "" }).suggestions).toHaveLength(13);
  });

  it("measureId filter works with requirementText scoring (combined filters)", () => {
    const result = suggestEvidence({ measureId: "11.1", requirementText: "access control review" });
    expect(result.suggestions).toHaveLength(1);
    expect(result.suggestions[0].measureId).toBe("11.1");
    expect(result.suggestions[0].score).toBeGreaterThanOrEqual(76);
  });
});

describe("suggestEvidence — category filter", () => {
  it("matches evidenceType tokens as case-insensitive substrings", () => {
    const result = suggestEvidence({ category: "training-record" });
    expect(result.suggestions.map((s) => s.measureId)).toEqual(["8.1"]);
    expect(suggestEvidence({ category: "iam-export" }).suggestions.map((s) => s.measureId)).toEqual(["11.1"]);
    expect(suggestEvidence({ category: "risk-register" }).suggestions.map((s) => s.measureId)).toEqual(["2.1"]);
  });

  it("no-match category yields an empty list", () => {
    expect(suggestEvidence({ category: "zzz-no-such-category" }).suggestions).toEqual([]);
  });

  it("category is case-insensitive", () => {
    const result = suggestEvidence({ category: "TRAINING-RECORD" });
    expect(result.suggestions.map((s) => s.measureId)).toEqual(["8.1"]);
  });
});

describe("suggestEvidence — limit applied last after sorting", () => {
  it("limit 3 keeps the top-3 default ranking", () => {
    const result = suggestEvidence({ limit: 3 });
    expect(result.suggestions.map((s) => s.measureId)).toEqual(["4.1", "6.7", "11.1"]);
  });

  it("limit 1 keeps the single best match", () => {
    expect(suggestEvidence({ limit: 1 }).suggestions.map((s) => s.measureId)).toEqual(["4.1"]);
  });

  it("limit combines with filters (applied to the filtered set)", () => {
    const result = suggestEvidence({ category: "policy-document", limit: 2 });
    expect(result.suggestions).toHaveLength(2);
    for (const item of result.suggestions) {
      const haystack = `${item.title} ${item.collectionMethod} ${item.evidenceTypes.join(" ")}`.toLowerCase();
      expect(haystack).toContain("policy-document");
    }
  });

  it("non-positive / non-finite limits are ignored (all suggestions returned)", () => {
    expect(suggestEvidence({ limit: 0 }).suggestions).toHaveLength(13);
    expect(suggestEvidence({ limit: -5 }).suggestions).toHaveLength(13);
    expect(suggestEvidence({ limit: Number.NaN }).suggestions).toHaveLength(13);
    expect(suggestEvidence({ limit: Number.POSITIVE_INFINITY }).suggestions).toHaveLength(13);
  });

  it("fractional positive limits round to the nearest integer", () => {
    expect(suggestEvidence({ limit: 2.6 }).suggestions).toHaveLength(3);
  });
});

describe("suggestEvidence — requirementText scoring", () => {
  it("matched title terms raise the score above the base and cite the match", () => {
    const result = suggestEvidence({ requirementText: "business continuity disaster recovery plan" });
    const top = result.suggestions[0];
    // 4.1 (BC & Disaster Recovery Plan) has the strongest overlap
    expect(top.measureId).toBe("4.1");
    expect(top.score).toBeGreaterThanOrEqual(83); // 80 base + >= 3 matched terms
    expect(top.matchReason).toContain("Requirement text matched");
  });

  it("scores are clamped to 100 even with heavy overlap", () => {
    const result = suggestEvidence({
      requirementText: "policy document approval incident handling cryptography encryption access control supply chain network security risk assessment awareness hygiene asset classification hr security effectiveness continuity disaster recovery secure development",
    });
    for (const item of result.suggestions) {
      expect(item.score).toBeLessThanOrEqual(100);
      expect(item.score).toBeGreaterThanOrEqual(0);
    }
  });

  it("scores are deterministic for the same input", () => {
    const input = { requirementText: "business continuity disaster recovery plan", limit: 5 };
    expect(suggestEvidence(input)).toEqual(suggestEvidence(input));
  });

  it("returned evidenceTypes arrays are fresh copies (catalog stays immutable)", () => {
    const result = suggestEvidence({});
    result.suggestions[0].evidenceTypes.push("mutated");
    expect(EVIDENCE_SUGGESTION_CATALOG.find((e) => e.measureId === result.suggestions[0].measureId)!.evidenceTypes).not.toContain("mutated");
  });
});

/* ================================================================== */
/* buildEvidenceAuditTrail                                             */
/* ================================================================== */

describe("buildEvidenceAuditTrail — empty / malformed input yields the safe shape", () => {
  it("returns EMPTY_EVIDENCE_AUDIT_TRAIL for undefined / null / non-object / non-array rows", () => {
    expect(buildEvidenceAuditTrail(undefined)).toEqual(EMPTY_EVIDENCE_AUDIT_TRAIL);
    expect(buildEvidenceAuditTrail(null)).toEqual(EMPTY_EVIDENCE_AUDIT_TRAIL);
    expect(buildEvidenceAuditTrail(42 as never)).toEqual(EMPTY_EVIDENCE_AUDIT_TRAIL);
    expect(buildEvidenceAuditTrail("nope" as never)).toEqual(EMPTY_EVIDENCE_AUDIT_TRAIL);
    expect(buildEvidenceAuditTrail({ rows: "nope" as never })).toEqual(EMPTY_EVIDENCE_AUDIT_TRAIL);
    expect(buildEvidenceAuditTrail({ rows: {} as never })).toEqual(EMPTY_EVIDENCE_AUDIT_TRAIL);
  });

  it("empty rows list yields zeroed events and summary with all 6 status keys", () => {
    const result = buildEvidenceAuditTrail({ rows: [] });
    expect(result.events).toEqual([]);
    expect(result.summary.totals.total).toBe(0);
    expect(result.summary.totals.byStatus).toEqual({
      pending: 0, collected: 0, verified: 0, rejected: 0, expired: 0, not_applicable: 0,
    });
    expect(result.summary.withOwner).toBe(0);
    expect(result.summary.withFiles).toBe(0);
  });

  it("never throws on garbage rows (null, primitives, non-objects)", () => {
    expect(() =>
      buildEvidenceAuditTrail({ rows: [null, 42, "x", {}, { id: "k", updatedAt: "not-a-date" }] })
    ).not.toThrow();
  });
});

describe("buildEvidenceAuditTrail — per-event normalization", () => {
  it("evidenceId falls back to String(id) and to '' when both missing", () => {
    const result = buildEvidenceAuditTrail({
      rows: [
        { id: 7 },
        { id: 8, evidenceId: "EVD-8" },
        { id: 9, evidenceId: "   " },
        {},
      ],
    });
    const byId = new Map(result.events.map((e) => [e.id, e]));
    expect(byId.get(7)!.evidenceId).toBe("7");
    expect(byId.get(8)!.evidenceId).toBe("EVD-8");
    expect(byId.get(9)!.evidenceId).toBe("9");
    expect(result.events.find((e) => e.id === "")!.evidenceId).toBe("");
  });

  it("coerces status to the 6-value enum; invalid/missing -> pending", () => {
    const result = buildEvidenceAuditTrail({
      rows: [
        { id: 1, status: "VERIFIED" },
        { id: 2, status: "bogus" },
        { id: 3 },
        { id: 4, status: "not_applicable" },
        { id: 5, status: 42 as never },
      ],
    });
    const byId = new Map(result.events.map((e) => [e.id, e]));
    expect(byId.get(1)!.status).toBe("verified");
    expect(byId.get(2)!.status).toBe("pending");
    expect(byId.get(3)!.status).toBe("pending");
    expect(byId.get(4)!.status).toBe("not_applicable");
    expect(byId.get(5)!.status).toBe("pending");
  });

  it("type defaults to 'evidence'; owner null unless a non-empty trimmed string", () => {
    const result = buildEvidenceAuditTrail({
      rows: [
        { id: 1 },
        { id: 2, type: "policy-document", owner: "  S. Rehman  " },
        { id: 3, type: "  ", owner: "" },
        { id: 4, type: "audit-log", owner: 42 as never },
      ],
    });
    const byId = new Map(result.events.map((e) => [e.id, e]));
    expect(byId.get(1)!.type).toBe("evidence");
    expect(byId.get(1)!.owner).toBeNull();
    expect(byId.get(2)!.type).toBe("policy-document");
    expect(byId.get(2)!.owner).toBe("S. Rehman");
    expect(byId.get(3)!.type).toBe("evidence");
    expect(byId.get(3)!.owner).toBeNull();
    expect(byId.get(4)!.type).toBe("audit-log");
    expect(byId.get(4)!.owner).toBeNull();
  });

  it("fileCount = max(0, floor); non-number -> 0", () => {
    const result = buildEvidenceAuditTrail({
      rows: [
        { id: 1, fileCount: 3.9 },
        { id: 2, fileCount: -5 },
        { id: 3, fileCount: Number.NaN },
        { id: 4, fileCount: "3" as never },
        { id: 5 },
      ],
    });
    const byId = new Map(result.events.map((e) => [e.id, e]));
    expect(byId.get(1)!.fileCount).toBe(3);
    expect(byId.get(2)!.fileCount).toBe(0);
    expect(byId.get(3)!.fileCount).toBe(0);
    expect(byId.get(4)!.fileCount).toBe(0);
    expect(byId.get(5)!.fileCount).toBe(0);
  });

  it("updatedAt parses ISO strings, epoch numbers and Date objects; invalid -> null", () => {
    const result = buildEvidenceAuditTrail({
      rows: [
        { id: 1, updatedAt: iso(-2) },
        { id: 2, updatedAt: epoch(-3) },
        { id: 3, updatedAt: new Date(epoch(-4)) },
        { id: 4, updatedAt: "not-a-date" },
        { id: 5 },
      ],
      now: NOW.toISOString(),
    });
    const byId = new Map(result.events.map((e) => [e.id, e]));
    expect(byId.get(1)!.updatedAt!.getTime()).toBe(epoch(-2));
    expect(byId.get(2)!.updatedAt!.getTime()).toBe(epoch(-3));
    expect(byId.get(3)!.updatedAt!.getTime()).toBe(epoch(-4));
    expect(byId.get(4)!.updatedAt).toBeNull();
    expect(byId.get(5)!.updatedAt).toBeNull();
  });

  it("daysSinceUpdate = floor whole days vs the clock; min 0; null when updatedAt missing", () => {
    const result = buildEvidenceAuditTrail({
      rows: [
        { id: 1, updatedAt: iso(-1) }, // exactly 1 day
        { id: 2, updatedAt: iso(-2.2) }, // floor(2.2) = 2
        { id: 3, updatedAt: iso(2) }, // future -> negative -> 0
        { id: 4 },
      ],
      now: NOW.toISOString(),
    });
    const byId = new Map(result.events.map((e) => [e.id, e]));
    expect(byId.get(1)!.daysSinceUpdate).toBe(1);
    expect(byId.get(2)!.daysSinceUpdate).toBe(2);
    expect(byId.get(3)!.daysSinceUpdate).toBe(0);
    expect(byId.get(4)!.daysSinceUpdate).toBeNull();
  });
});

describe("buildEvidenceAuditTrail — sorting and summary", () => {
  it("sorts events most-recent-first with null updatedAt last and id asc tie-break", () => {
    const result = buildEvidenceAuditTrail({
      rows: [
        { id: 2, updatedAt: iso(-2) },
        { id: 1, updatedAt: iso(-1) },
        { id: 3 },
        { id: 0, updatedAt: iso(-1) },
      ],
      now: NOW.toISOString(),
    });
    expect(result.events.map((e) => e.id)).toEqual([0, 1, 2, 3]);
    expect(result.events[3].updatedAt).toBeNull();
  });

  it("tie-break compares id ascending with numbers before strings", () => {
    const result = buildEvidenceAuditTrail({
      rows: [
        { id: "b", updatedAt: iso(-1) },
        { id: 5, updatedAt: iso(-1) },
        { id: "a", updatedAt: iso(-1) },
      ],
      now: NOW.toISOString(),
    });
    expect(result.events.map((e) => e.id)).toEqual([5, "a", "b"]);
  });

  it("summary totals, byStatus counts and withOwner/withFiles are accurate", () => {
    const result = buildEvidenceAuditTrail({
      rows: [
        { id: 1, status: "verified", owner: "A", fileCount: 2, updatedAt: iso(-1) },
        { id: 2, status: "verified", fileCount: 0, updatedAt: iso(-2) },
        { id: 3, status: "pending", owner: "B", fileCount: 1, updatedAt: iso(-3) },
        { id: 4, status: "expired", fileCount: 3, updatedAt: iso(-4) },
      ],
      now: NOW.toISOString(),
    });
    expect(result.summary.totals.total).toBe(4);
    expect(result.summary.totals.byStatus).toEqual({
      pending: 1, collected: 0, verified: 2, rejected: 0, expired: 1, not_applicable: 0,
    });
    expect(result.summary.withOwner).toBe(2);
    expect(result.summary.withFiles).toBe(3);
  });

  it("is deterministic for the same input", () => {
    const input = {
      rows: [
        { id: 1, status: "verified", updatedAt: iso(-1) },
        { id: 2, updatedAt: iso(-2) },
      ],
      now: NOW.toISOString(),
    };
    expect(buildEvidenceAuditTrail(input)).toEqual(buildEvidenceAuditTrail(input));
  });

  it("accepts an epoch-number now and a clock factory", () => {
    const a = buildEvidenceAuditTrail({ rows: [{ id: 1, updatedAt: epoch(-1) }], now: epoch(0) });
    const b = buildEvidenceAuditTrail({ rows: [{ id: 1, updatedAt: epoch(-1) }], clock: () => NOW });
    expect(a.events[0].daysSinceUpdate).toBe(1);
    expect(b.events[0].daysSinceUpdate).toBe(1);
  });
});

/* ================================================================== */
/* analyzeEvidenceQuality                                              */
/* ================================================================== */

describe("analyzeEvidenceQuality — empty / malformed input yields the safe shape", () => {
  it("returns EMPTY_EVIDENCE_ANALYSIS for undefined / null / non-object / non-array rows", () => {
    expect(analyzeEvidenceQuality(undefined)).toEqual(EMPTY_EVIDENCE_ANALYSIS);
    expect(analyzeEvidenceQuality(null)).toEqual(EMPTY_EVIDENCE_ANALYSIS);
    expect(analyzeEvidenceQuality(42 as never)).toEqual(EMPTY_EVIDENCE_ANALYSIS);
    expect(analyzeEvidenceQuality("nope" as never)).toEqual(EMPTY_EVIDENCE_ANALYSIS);
    expect(analyzeEvidenceQuality({ rows: 42 as never })).toEqual(EMPTY_EVIDENCE_ANALYSIS);
    expect(analyzeEvidenceQuality({ rows: {} as never })).toEqual(EMPTY_EVIDENCE_ANALYSIS);
  });

  it("empty rows list yields a fully zeroed rollup", () => {
    const result = analyzeEvidenceQuality({ rows: [] });
    expect(result.rows).toEqual([]);
    expect(result.overall.avgQualityScore).toBe(0);
    expect(result.overall.coverageRate).toBe(0);
    expect(result.overall.counts).toEqual({
      total: 0, verified: 0, expired: 0, stale: 0, fresh: 0, expiring: 0, dueSoon: 0, overdue: 0,
    });
    expect(result.overall.recommendations).toEqual([]);
  });

  it("never throws on garbage rows (null, primitives, invalid dates, NaN numbers)", () => {
    expect(() =>
      analyzeEvidenceQuality({
        rows: [
          null,
          42,
          {},
          { id: 1, lastVerified: "not-a-date", expirationDate: "nope", intervalDays: Number.NaN },
          { id: 2, status: 7 as never, fileCount: "x" as never },
        ],
      })
    ).not.toThrow();
  });
});

describe("analyzeEvidenceQuality — freshness banding", () => {
  const base = (over: Record<string, unknown>) => ({ id: 1, status: "verified", intervalDays: null, ...over });

  it("expired when the expiration date is in the past (1 day ago)", () => {
    const result = analyzeEvidenceQuality({
      rows: [base({ lastVerified: iso(-10), expirationDate: iso(-1) })],
      now: NOW.toISOString(),
    });
    expect(result.rows[0].freshness).toBe("expired");
    expect(result.rows[0].daysUntilExpiry).toBe(-1);
  });

  it("boundary: expiration exactly now -> expiring (0 days <= 90, not expired)", () => {
    const result = analyzeEvidenceQuality({
      rows: [base({ lastVerified: iso(-10), expirationDate: NOW.toISOString() })],
      now: NOW.toISOString(),
    });
    expect(result.rows[0].freshness).toBe("expiring");
    expect(result.rows[0].daysUntilExpiry).toBe(0);
  });

  it("boundary: 90 days until expiry -> expiring, 91 days -> not expiring", () => {
    const expiring = analyzeEvidenceQuality({
      rows: [base({ lastVerified: iso(-10), expirationDate: iso(90) })],
      now: NOW.toISOString(),
    });
    expect(expiring.rows[0].freshness).toBe("expiring");
    expect(expiring.rows[0].daysUntilExpiry).toBe(90);

    const fresh = analyzeEvidenceQuality({
      rows: [base({ lastVerified: iso(-10), expirationDate: iso(91) })],
      now: NOW.toISOString(),
    });
    expect(fresh.rows[0].freshness).toBe("fresh");
    expect(fresh.rows[0].daysUntilExpiry).toBe(91);
  });

  it("never verified -> stale (when not expiring/expired)", () => {
    const result = analyzeEvidenceQuality({
      rows: [base({ lastVerified: null, expirationDate: null, intervalDays: null })],
      now: NOW.toISOString(),
    });
    expect(result.rows[0].freshness).toBe("stale");
    expect(result.rows[0].daysUntilExpiry).toBeNull();
  });

  it("boundary: past the interval (strict >) -> stale; exactly at the interval -> fresh", () => {
    const stale = analyzeEvidenceQuality({
      rows: [base({ lastVerified: iso(-101), intervalDays: 100 })],
      now: NOW.toISOString(),
    });
    expect(stale.rows[0].freshness).toBe("stale");

    const fresh = analyzeEvidenceQuality({
      rows: [base({ lastVerified: iso(-100), intervalDays: 100 })],
      now: NOW.toISOString(),
    });
    expect(fresh.rows[0].freshness).toBe("fresh");
  });

  it("fresh when verified recently, expiry far away and interval not exceeded", () => {
    const result = analyzeEvidenceQuality({
      rows: [base({ lastVerified: iso(-10), expirationDate: iso(200), intervalDays: 100 })],
      now: NOW.toISOString(),
    });
    expect(result.rows[0].freshness).toBe("fresh");
  });
});

describe("analyzeEvidenceQuality — cadence banding", () => {
  const base = (over: Record<string, unknown>) => ({ id: 1, status: "verified", ...over });

  it("n-a without an interval even when verified", () => {
    const result = analyzeEvidenceQuality({
      rows: [base({ lastVerified: iso(-10), intervalDays: null })],
      now: NOW.toISOString(),
    });
    expect(result.rows[0].cadence).toBe("n-a");
  });

  it("overdue when never verified but an interval is set", () => {
    const result = analyzeEvidenceQuality({
      rows: [base({ lastVerified: null, intervalDays: 90 })],
      now: NOW.toISOString(),
    });
    expect(result.rows[0].cadence).toBe("overdue");
  });

  it("boundary: strictly past the interval -> overdue; exactly at the interval -> due-soon", () => {
    const overdue = analyzeEvidenceQuality({
      rows: [base({ lastVerified: iso(-101), intervalDays: 100 })],
      now: NOW.toISOString(),
    });
    expect(overdue.rows[0].cadence).toBe("overdue");

    const dueSoon = analyzeEvidenceQuality({
      rows: [base({ lastVerified: iso(-100), intervalDays: 100 })],
      now: NOW.toISOString(),
    });
    expect(dueSoon.rows[0].cadence).toBe("due-soon");
  });

  it("boundary: 75% of the interval -> due-soon; just under -> on-track (whole-day floors)", () => {
    const dueSoon = analyzeEvidenceQuality({
      rows: [base({ lastVerified: iso(-75), intervalDays: 100 })],
      now: NOW.toISOString(),
    });
    expect(dueSoon.rows[0].cadence).toBe("due-soon");

    const onTrack = analyzeEvidenceQuality({
      rows: [base({ lastVerified: iso(-74), intervalDays: 100 })],
      now: NOW.toISOString(),
    });
    expect(onTrack.rows[0].cadence).toBe("on-track");
  });

  it("fractional 75% threshold rounds via whole-day floors (interval 90 -> 67.5)", () => {
    const dueSoon = analyzeEvidenceQuality({
      rows: [base({ lastVerified: iso(-68), intervalDays: 90 })],
      now: NOW.toISOString(),
    });
    expect(dueSoon.rows[0].cadence).toBe("due-soon");

    const onTrack = analyzeEvidenceQuality({
      rows: [base({ lastVerified: iso(-67), intervalDays: 90 })],
      now: NOW.toISOString(),
    });
    expect(onTrack.rows[0].cadence).toBe("on-track");
  });

  it("intervalDays invalid (NaN / <= 0 / string) disables cadence -> n-a", () => {
    const result = analyzeEvidenceQuality({
      rows: [
        { id: 1, lastVerified: iso(-10), intervalDays: Number.NaN },
        { id: 2, lastVerified: iso(-10), intervalDays: 0 },
        { id: 3, lastVerified: iso(-10), intervalDays: -30 },
        { id: 4, lastVerified: iso(-10), intervalDays: "90" as never },
      ],
      now: NOW.toISOString(),
    });
    for (const row of result.rows) expect(row.cadence).toBe("n-a");
  });
});

describe("analyzeEvidenceQuality — quality score composition", () => {
  const run = (rows: unknown[]) =>
    analyzeEvidenceQuality({ rows: rows as never[], now: NOW.toISOString() }).rows;

  it("verified + fresh + on-track + files clamps to 100; without files 95", () => {
    const rows = run([
      { id: 1, status: "verified", lastVerified: iso(-10), expirationDate: iso(200), intervalDays: 100, fileCount: 1 },
      { id: 2, status: "verified", lastVerified: iso(-10), expirationDate: iso(200), intervalDays: 100, fileCount: 0 },
    ]);
    expect(rows[0].qualityScore).toBe(100); // 50 + 30 + 15 + 5
    expect(rows[1].qualityScore).toBe(95); // 50 + 30 + 15 + 0
  });

  it("collects the documented base/bonus blend (collected + expiring + due-soon + files = 60)", () => {
    const rows = run([
      { id: 1, status: "collected", lastVerified: iso(-90), expirationDate: iso(60), intervalDays: 100, fileCount: 3 },
    ]);
    expect(rows[0].qualityScore).toBe(60); // 35 + 15 + 5 + 5
    expect(rows[0].qualityBand).toBe("adequate");
  });

  it("pending + stale + n-a + no files = 30 (stale via never verified, no interval)", () => {
    const rows = run([
      { id: 1, status: "pending", lastVerified: null, expirationDate: null, intervalDays: null, fileCount: 0 },
    ]);
    expect(rows[0].qualityScore).toBe(30); // 20 + 5 (stale) + 5 (n-a) + 0
    expect(rows[0].qualityBand).toBe("weak");
  });

  it("rejected + expired + overdue + no files floors at 0", () => {
    const rows = run([
      { id: 1, status: "rejected", lastVerified: null, expirationDate: iso(-2), intervalDays: 90, fileCount: 0 },
    ]);
    expect(rows[0].qualityScore).toBe(0); // 0 + 0 + 0 + 0
    expect(rows[0].qualityBand).toBe("weak");
  });

  it("not_applicable + fresh + n-a + files = 55 (adequate boundary)", () => {
    const rows = run([
      { id: 1, status: "not_applicable", lastVerified: iso(-5), expirationDate: null, intervalDays: null, fileCount: 1 },
    ]);
    expect(rows[0].qualityScore).toBe(55); // 15 + 30 + 5 + 5
    expect(rows[0].qualityBand).toBe("adequate");
  });

  it("band edges: 80 -> strong, 75 -> adequate, 55 -> adequate, 50 -> weak", () => {
    // Note: every score component is a multiple of 5, so 79/54 are unreachable;
    // the reachable edges are 80 (strong) / 75+55 (adequate) / 50 (largest weak).
    const rows = run([
      { id: 1, status: "verified", lastVerified: iso(-10), expirationDate: iso(60), intervalDays: 100, fileCount: 0 }, // 50+15+15+0 = 80
      { id: 2, status: "collected", lastVerified: iso(-10), expirationDate: null, intervalDays: null, fileCount: 1 }, // 35+30+5+5 = 75
      { id: 3, status: "not_applicable", lastVerified: iso(-5), expirationDate: null, intervalDays: null, fileCount: 1 }, // 15+30+5+5 = 55
      { id: 4, status: "pending", lastVerified: iso(-10), expirationDate: iso(60), intervalDays: 100, fileCount: 0 }, // 20+15+15+0 = 50
    ]);
    expect(rows[0].qualityScore).toBe(80);
    expect(rows[0].qualityBand).toBe("strong");
    expect(rows[1].qualityScore).toBe(75);
    expect(rows[1].qualityBand).toBe("adequate");
    expect(rows[2].qualityScore).toBe(55);
    expect(rows[2].qualityBand).toBe("adequate");
    expect(rows[3].qualityScore).toBe(50);
    expect(rows[3].qualityBand).toBe("weak");
  });

  it("rejected (not expired) with fresh + on-track + files = 50", () => {
    const rows = run([
      { id: 1, status: "rejected", lastVerified: iso(-10), expirationDate: iso(200), intervalDays: 100, fileCount: 2 },
    ]);
    expect(rows[0].qualityScore).toBe(50); // 0 + 30 + 15 + 5
  });
});

describe("analyzeEvidenceQuality — nextAction precedence", () => {
  it("expired beats rejected", () => {
    const result = analyzeEvidenceQuality({
      rows: [{ id: 1, status: "rejected", lastVerified: null, expirationDate: iso(-1), intervalDays: 90 }],
      now: NOW.toISOString(),
    });
    expect(result.rows[0].nextAction).toBe("Re-collect expired evidence");
  });

  it("rejected beats overdue", () => {
    const result = analyzeEvidenceQuality({
      rows: [{ id: 1, status: "rejected", lastVerified: iso(-200), expirationDate: iso(200), intervalDays: 90 }],
      now: NOW.toISOString(),
    });
    expect(result.rows[0].nextAction).toBe("Upload replacement evidence");
  });

  it("overdue cadence beats stale freshness", () => {
    const result = analyzeEvidenceQuality({
      rows: [{ id: 1, status: "verified", lastVerified: iso(-200), expirationDate: iso(200), intervalDays: 90 }],
      now: NOW.toISOString(),
    });
    expect(result.rows[0].freshness).toBe("stale");
    expect(result.rows[0].cadence).toBe("overdue");
    expect(result.rows[0].nextAction).toBe("Re-verify evidence (renewal due)");
  });

  it("stale without an interval -> Verify evidence freshness", () => {
    const result = analyzeEvidenceQuality({
      rows: [{ id: 1, status: "collected", lastVerified: null, expirationDate: null, intervalDays: null }],
      now: NOW.toISOString(),
    });
    expect(result.rows[0].freshness).toBe("stale");
    expect(result.rows[0].cadence).toBe("n-a");
    expect(result.rows[0].nextAction).toBe("Verify evidence freshness");
  });

  it("due-soon -> Schedule renewal verification", () => {
    const result = analyzeEvidenceQuality({
      rows: [{ id: 1, status: "verified", lastVerified: iso(-75), expirationDate: iso(200), intervalDays: 100 }],
      now: NOW.toISOString(),
    });
    expect(result.rows[0].cadence).toBe("due-soon");
    expect(result.rows[0].nextAction).toBe("Schedule renewal verification");
  });

  it("healthy row -> 'Evidence healthy — no action needed' (em dash)", () => {
    const result = analyzeEvidenceQuality({
      rows: [{ id: 1, status: "verified", lastVerified: iso(-10), expirationDate: iso(200), intervalDays: 100, fileCount: 2 }],
      now: NOW.toISOString(),
    });
    expect(result.rows[0].nextAction).toBe("Evidence healthy \u2014 no action needed");
  });

  it("rows keep input order and normalize evidenceId / id / daysUntilExpiry / owner", () => {
    const result = analyzeEvidenceQuality({
      rows: [
        { id: "z", evidenceId: "EVD-Z", owner: "  S. Rehman  ", lastVerified: iso(-10), expirationDate: iso(30) },
        { id: 2, lastVerified: iso(-10) },
      ],
      now: NOW.toISOString(),
    });
    expect(result.rows.map((r) => r.id)).toEqual(["z", 2]);
    expect(result.rows[0].evidenceId).toBe("EVD-Z");
    expect(result.rows[1].evidenceId).toBe("2");
    expect(result.rows[0].daysUntilExpiry).toBe(30);
    expect(result.rows[1].daysUntilExpiry).toBeNull();
    expect(result.rows[0].owner).toBe("S. Rehman");
    expect(result.rows[1].owner).toBeNull();
  });
});

describe("analyzeEvidenceQuality — overall rollup", () => {
  const healthy = { status: "verified", lastVerified: iso(-10), expirationDate: iso(200), intervalDays: 100, fileCount: 1 };
  const expiredRow = { status: "verified", lastVerified: iso(-300), expirationDate: iso(-5), intervalDays: 100, fileCount: 1 };
  const staleRow = { status: "collected", lastVerified: null, expirationDate: null, intervalDays: null, fileCount: 0 };
  const overdueRow = { status: "pending", lastVerified: null, expirationDate: iso(200), intervalDays: 90, fileCount: 0 };
  const dueSoonRow = { status: "verified", lastVerified: iso(-75), expirationDate: iso(200), intervalDays: 100, fileCount: 0 };

  it("counts total/verified/fresh/expiring/expired/stale/dueSoon/overdue", () => {
    const result = analyzeEvidenceQuality({
      rows: [healthy, expiredRow, staleRow, overdueRow, dueSoonRow],
      now: NOW.toISOString(),
    });
    // healthy: verified/fresh/on-track; expiredRow: verified+expired+overdue;
    // staleRow: stale/n-a; overdueRow: stale+overdue; dueSoonRow:
    // verified/fresh/due-soon (verified = rows with status "verified")
    expect(result.overall.counts).toEqual({
      total: 5,
      verified: 3, // healthy + expiredRow + dueSoonRow
      expired: 1, // expiredRow
      stale: 2, // staleRow + overdueRow
      fresh: 2, // healthy + dueSoonRow
      expiring: 0,
      dueSoon: 1, // dueSoonRow
      overdue: 2, // expiredRow (300 > 100 interval) + overdueRow
    });
  });

  it("avgQualityScore rounds to 1 decimal (100, 95, 85 -> 93.3)", () => {
    const result = analyzeEvidenceQuality({
      rows: [
        healthy, // 100
        { ...healthy, id: 2, fileCount: 0 }, // 95
        { ...healthy, id: 3, status: "collected" }, // 35+30+15+5 = 85
      ],
      now: NOW.toISOString(),
    });
    // (100 + 95 + 85) / 3 = 93.3333 -> 93.3
    expect(result.overall.avgQualityScore).toBe(93.3);
  });

  it("avgQualityScore averages fractional halves to .5 (95, 80 -> 87.5)", () => {
    const result = analyzeEvidenceQuality({
      rows: [
        { ...healthy, id: 1, fileCount: 0 }, // 95
        { ...healthy, id: 2, status: "collected", fileCount: 0 }, // 35+30+15+0 = 80
      ],
      now: NOW.toISOString(),
    });
    expect(result.overall.avgQualityScore).toBe(87.5);
  });

  it("coverageRate = verified/total*100 at 1 decimal (1 of 3 -> 33.3)", () => {
    const result = analyzeEvidenceQuality({
      rows: [healthy, staleRow, overdueRow],
      now: NOW.toISOString(),
    });
    expect(result.overall.coverageRate).toBe(33.3); // 1 of 3 verified
  });

  it("coverageRate is 0 when nothing is verified", () => {
    const result = analyzeEvidenceQuality({
      rows: [staleRow, overdueRow],
      now: NOW.toISOString(),
    });
    expect(result.overall.coverageRate).toBe(0);
  });

  it("recommendations appear in fixed order with literal counts and exact strings", () => {
    const result = analyzeEvidenceQuality({
      rows: [expiredRow, expiredRow, staleRow, overdueRow, dueSoonRow],
      now: NOW.toISOString(),
    });
    // expired 2 (both expiredRow), stale 2 (staleRow + overdueRow), overdue 3
    // (expiredRow x2 via 300d > 100d interval + overdueRow), dueSoon 1,
    // unverified = 5 total - 3 verified (expiredRow x2 + dueSoonRow) = 2
    expect(result.overall.recommendations).toEqual([
      "Re-collect 2 expired evidence item(s)",
      "Verify 2 stale evidence item(s)",
      "Renew 3 overdue item(s)",
      "Schedule renewal for 1 item(s)",
      "Collect evidence for 2 unverified item(s)",
    ]);
  });

  it("recommendations omit zero categories and are empty for a healthy rollup", () => {
    const mixed = analyzeEvidenceQuality({
      rows: [expiredRow, staleRow],
      now: NOW.toISOString(),
    });
    // expired 1, stale 1 (staleRow), overdue 1 (expiredRow 300d > 100d),
    // dueSoon 0 omitted, unverified = 2 - 1 verified (expiredRow) = 1
    expect(mixed.overall.recommendations).toEqual([
      "Re-collect 1 expired evidence item(s)",
      "Verify 1 stale evidence item(s)",
      "Renew 1 overdue item(s)",
      "Collect evidence for 1 unverified item(s)",
    ]);

    const healthyOnly = analyzeEvidenceQuality({ rows: [healthy], now: NOW.toISOString() });
    expect(healthyOnly.overall.recommendations).toEqual([]);
  });

  it("recommendations never exceed 5 entries", () => {
    const result = analyzeEvidenceQuality({
      rows: [expiredRow, staleRow, overdueRow, dueSoonRow, healthy, { ...healthy, id: 99, status: "pending" }],
      now: NOW.toISOString(),
    });
    expect(result.overall.recommendations.length).toBeLessThanOrEqual(5);
  });
});

describe("analyzeEvidenceQuality — clock injection and determinism", () => {
  it("accepts now as ISO string, epoch number, Date object and clock factory", () => {
    const row = { id: 1, status: "verified", lastVerified: iso(-95), intervalDays: 100 };
    const byIso = analyzeEvidenceQuality({ rows: [row], now: NOW.toISOString() });
    const byEpoch = analyzeEvidenceQuality({ rows: [row], now: NOW.getTime() });
    const byDate = analyzeEvidenceQuality({ rows: [row], now: NOW });
    const byClock = analyzeEvidenceQuality({ rows: [row], clock: () => NOW });
    expect(byIso.rows[0].cadence).toBe("due-soon"); // 95 >= 75
    expect(byEpoch).toEqual(byIso);
    expect(byDate).toEqual(byIso);
    expect(byClock).toEqual(byIso);
  });

  it("now takes precedence over clock; a throwing clock never breaks the engine", () => {
    const row = { id: 1, lastVerified: iso(-10), expirationDate: null, intervalDays: null };
    const result = analyzeEvidenceQuality({
      rows: [row],
      now: NOW.toISOString(),
      clock: () => new Date(epoch(999)),
    });
    expect(result.rows[0].daysUntilExpiry).toBeNull();
    expect(() =>
      analyzeEvidenceQuality({ rows: [row], clock: (() => { throw new Error("boom"); }) as never })
    ).not.toThrow();
  });

  it("row timestamps accept Date objects at engine level", () => {
    const result = analyzeEvidenceQuality({
      rows: [{ id: 1, lastVerified: new Date(epoch(-10)), expirationDate: new Date(epoch(60)), intervalDays: null }],
      now: NOW.toISOString(),
    });
    expect(result.rows[0].freshness).toBe("expiring");
    expect(result.rows[0].daysUntilExpiry).toBe(60);
  });

  it("is deterministic for the same input (analyze)", () => {
    const input = {
      rows: [
        { status: "verified", lastVerified: iso(-10), expirationDate: iso(200), intervalDays: 100, fileCount: 1 },
        { status: "verified", lastVerified: iso(-300), expirationDate: iso(-5), intervalDays: 100, fileCount: 1 },
        { status: "collected", lastVerified: null, expirationDate: null, intervalDays: null, fileCount: 0 },
      ],
      now: NOW.toISOString(),
    };
    expect(analyzeEvidenceQuality(input)).toEqual(analyzeEvidenceQuality(input));
  });
});
