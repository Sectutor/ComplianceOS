import { describe, it, expect } from "vitest";

/**
 * NIS2 Policy Center engine (lib/nis2/policyTemplates.ts) — engine tests
 * (QA cycle 23, NIS2 Implementation Plan Phase 6 Task 6.1 / ENISA Measures
 * 1.1..12.1 / NIS2 Art. 21).
 *
 * Mirrors complianceMonitor.test.ts / securityTesting.test.ts: the engine is
 * pure and deterministic, never throws, and accepts an injectable clock via
 * `now` (ISO string | epoch number | Date) OR a `clock` factory. Every
 * function is exercised at its boundaries, on malformed input, on clock
 * injection, and for input determinism (same input twice => deep-equal).
 *
 * Contract under test:
 *   getNis2PolicyTemplates(input) -> { total, category?, measureId?,
 *       items: Array<{ id, title, article21Category ('a'..'j'),
 *       article21Title, enisaMeasureId ('1.1'..'12.1'), enisaMeasureTitle,
 *       isoControls: string[], summary, requiredSections: string[],
 *       reviewCadenceDays, ownerRole, applicability: string[] }> }
 *     - catalog = 13 templates, one per ENISA measure 1.1, 2.1, 3.1, 4.1,
 *       5.1, 6.2, 6.7, 7.1, 8.1, 9.1, 10.1, 11.1, 12.1 (measures asc);
 *     - filters: category exact, measureId exact, search case-insensitive
 *       substring over title/summary/enisaMeasureTitle, limit positive int
 *       applied last; malformed -> EMPTY_POLICY_TEMPLATE_LIST.
 *   analyzePolicyGap(input) -> { coverageRate (1dp), totalTemplates,
 *       coveredCount, gapCount, gaps[] (enisaMeasureId asc then title asc),
 *       byIsoControl[] (isoControl asc), recommendations (<=5),
 *       totalImplementedPolicies }
 *     - COVERED = any implemented policy with non-empty isoControls ∩
 *       template.isoControls OR a policy title sharing >=1 word (>=3 chars,
 *       case-insensitive) with the template title;
 *     - malformed -> zeroed EMPTY_POLICY_GAP_ANALYSIS.
 *   runPolicyApproval(input) -> { policyId, policyTitle, currentStatus,
 *       nextAction, verdict, approvalCount, rejectionCount,
 *       changesRequestedCount, pendingCount, reviewProgress (1dp),
 *       complete, overdue, daysInReview, steps[4], reviewers[] }
 *     - verdict precedence approved > rejected > changes_requested, then
 *       status-derived; overdue strict boundary at submittedAt + slaDays*
 *       86400000; malformed -> EMPTY_POLICY_APPROVAL.
 *   trackPolicyVersions(input) -> { policyId, totalVersions, latestVersion,
 *       currentVersion, draftCount, approvedCount, supersededCount,
 *       versions[] (createdAt asc, nulls last, label asc; last is 'current',
 *       others 'superseded', draft-normalized stay 'draft'), changes[] }
 *     - malformed -> EMPTY_POLICY_VERSION_HISTORY.
 */

const NOW = new Date("2026-08-19T00:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const iso = (msOffset: number) => new Date(NOW.getTime() + msOffset).toISOString();

import {
  getNis2PolicyTemplates,
  analyzePolicyGap,
  runPolicyApproval,
  trackPolicyVersions,
  EMPTY_POLICY_TEMPLATE_LIST,
  EMPTY_POLICY_GAP_ANALYSIS,
  EMPTY_POLICY_APPROVAL,
  EMPTY_POLICY_VERSION_HISTORY,
} from "../nis2/policyTemplates";

const CATALOG_MEASURE_IDS = [
  "1.1", "2.1", "3.1", "4.1", "5.1", "6.2", "6.7", "7.1", "8.1", "9.1", "10.1", "11.1", "12.1",
];

/** Full-shape custom template builder for gap-analysis fixtures. */
const tpl = (
  id: string,
  title: string,
  enisaMeasureId: string,
  isoControls: string[],
  overrides: Record<string, unknown> = {}
) => ({
  id,
  title,
  article21Category: "a",
  article21Title: `Article 21 title for ${title}`,
  enisaMeasureId,
  enisaMeasureTitle: `ENISA measure ${enisaMeasureId}`,
  isoControls,
  summary: `Summary for ${title}`,
  requiredSections: ["Purpose", "Scope"],
  reviewCadenceDays: 180,
  ownerRole: "CISO",
  applicability: ["All employees"],
  ...overrides,
});

/* ================================================================== */
/* getNis2PolicyTemplates — catalog completeness and ordering          */
/* ================================================================== */

describe("getNis2PolicyTemplates — catalog completeness and ordering", () => {
  it("returns exactly 13 templates, one per ENISA measure, sorted ascending (numeric ENISA order)", () => {
    const result = getNis2PolicyTemplates({});
    expect(result.total).toBe(13);
    expect(result.items).toHaveLength(13);
    expect(result.items.map((t) => t.enisaMeasureId)).toEqual(CATALOG_MEASURE_IDS);
  });

  it("every catalog item carries the full template contract shape", () => {
    const { items } = getNis2PolicyTemplates({});
    for (const t of items) {
      expect(typeof t.id).toBe("string");
      expect(t.id.length).toBeGreaterThan(0);
      expect(typeof t.title).toBe("string");
      expect(t.title.length).toBeGreaterThan(0);
      expect(t.article21Category).toMatch(/^[a-j]$/);
      expect(typeof t.article21Title).toBe("string");
      expect(t.article21Title.length).toBeGreaterThan(0);
      expect(t.enisaMeasureId).toMatch(/^\d+\.\d+$/);
      expect(typeof t.enisaMeasureTitle).toBe("string");
      expect(t.enisaMeasureTitle.length).toBeGreaterThan(0);
      expect(Array.isArray(t.isoControls)).toBe(true);
      expect(t.isoControls.length).toBeGreaterThan(0);
      expect(typeof t.summary).toBe("string");
      expect(t.summary.length).toBeGreaterThan(0);
      expect(Array.isArray(t.requiredSections)).toBe(true);
      expect(typeof t.reviewCadenceDays).toBe("number");
      expect(Number.isFinite(t.reviewCadenceDays)).toBe(true);
      expect(t.reviewCadenceDays).toBeGreaterThan(0);
      expect(typeof t.ownerRole).toBe("string");
      expect(t.ownerRole.length).toBeGreaterThan(0);
      expect(Array.isArray(t.applicability)).toBe(true);
    }
  });

  it("carries the documented ISO control references (1.1, 3.1, 5.1, 7.1)", () => {
    const byMeasure = Object.fromEntries(
      getNis2PolicyTemplates({}).items.map((t) => [t.enisaMeasureId, t])
    );
    expect(byMeasure["1.1"].isoControls).toEqual(expect.arrayContaining(["5.2", "A.5.1", "A.5.36", "A.5.4"]));
    expect(byMeasure["3.1"].isoControls).toEqual(expect.arrayContaining(["A.5.24", "A.5.25", "A.5.26"]));
    expect(byMeasure["5.1"].isoControls).toEqual(expect.arrayContaining(["A.5.19", "A.5.20", "A.5.21", "A.8.30"]));
    expect(byMeasure["7.1"].isoControls).toEqual(expect.arrayContaining(["9.1", "9.2", "9.3"]));
  });

  it("carries the documented ISO control references (9.1, 11.1, 12.1)", () => {
    const byMeasure = Object.fromEntries(
      getNis2PolicyTemplates({}).items.map((t) => [t.enisaMeasureId, t])
    );
    expect(byMeasure["9.1"].isoControls).toEqual(expect.arrayContaining(["A.5.31", "A.8.24"]));
    expect(byMeasure["11.1"].isoControls).toEqual(expect.arrayContaining(["A.5.15", "A.5.18", "A.8.3"]));
    expect(byMeasure["12.1"].isoControls).toEqual(expect.arrayContaining(["A.5.9", "A.5.12", "A.5.13"]));
  });

  it("every measure id is unique (13 distinct ENISA measures)", () => {
    const ids = getNis2PolicyTemplates({}).items.map((t) => t.enisaMeasureId);
    expect(new Set(ids).size).toBe(13);
  });

  it("is deterministic: identical input twice yields deep-equal output", () => {
    expect(getNis2PolicyTemplates({})).toEqual(getNis2PolicyTemplates({}));
    expect(getNis2PolicyTemplates({ search: "risk", limit: 3 })).toEqual(
      getNis2PolicyTemplates({ search: "risk", limit: 3 })
    );
  });

  it("accepts now/clock options without throwing and stays deterministic", () => {
    const baseline = getNis2PolicyTemplates({});
    expect(getNis2PolicyTemplates({ now: NOW.toISOString() })).toEqual(baseline);
    expect(getNis2PolicyTemplates({ now: NOW.getTime() })).toEqual(baseline);
    expect(getNis2PolicyTemplates({ now: NOW as never })).toEqual(baseline);
    expect(getNis2PolicyTemplates({ clock: () => NOW })).toEqual(baseline);
    expect(
      getNis2PolicyTemplates({
        clock: () => {
          throw new Error("boom");
        },
      })
    ).toEqual(baseline);
  });

  it("treats a plain empty object as a valid full-catalog request (not EMPTY)", () => {
    const result = getNis2PolicyTemplates({});
    expect(result.total).toBe(13);
    expect(result).not.toEqual(EMPTY_POLICY_TEMPLATE_LIST);
  });
});

/* ================================================================== */
/* getNis2PolicyTemplates — filters                                    */
/* ================================================================== */

describe("getNis2PolicyTemplates — category filter", () => {
  it("filters by an exact article21Category and echoes the active filter", () => {
    const catalog = getNis2PolicyTemplates({}).items;
    const category = catalog[0].article21Category;
    const expected = catalog.filter((t) => t.article21Category === category);
    const result = getNis2PolicyTemplates({ category });
    expect(result.total).toBe(expected.length);
    expect(result.items).toHaveLength(expected.length);
    expect(result.category).toBe(category);
    for (const item of result.items) {
      expect(item.article21Category).toBe(category);
    }
  });

  it("returns an empty list for a category with no templates", () => {
    const result = getNis2PolicyTemplates({ category: "zz" });
    expect(result.total).toBe(0);
    expect(result.items).toEqual([]);
  });

  it("does not echo a category when no category filter is supplied", () => {
    const result = getNis2PolicyTemplates({});
    expect(result.category).toBeUndefined();
  });
});

describe("getNis2PolicyTemplates — measureId filter", () => {
  it("returns exactly one template for a known measure id", () => {
    const result = getNis2PolicyTemplates({ measureId: "1.1" });
    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].enisaMeasureId).toBe("1.1");
    expect(result.measureId).toBe("1.1");
  });

  it("returns an empty list for an unknown measure id", () => {
    const result = getNis2PolicyTemplates({ measureId: "13.1" });
    expect(result.total).toBe(0);
    expect(result.items).toEqual([]);
  });

  it("combines measureId with category (intersection)", () => {
    const catalog = getNis2PolicyTemplates({}).items;
    const t = catalog.find((x) => x.enisaMeasureId === "1.1")!;
    const result = getNis2PolicyTemplates({ measureId: "1.1", category: t.article21Category });
    expect(result.total).toBe(1);
    expect(result.items[0].enisaMeasureId).toBe("1.1");
  });
});

describe("getNis2PolicyTemplates — case-insensitive search", () => {
  it("matches a case-insensitive substring of the title", () => {
    const catalog = getNis2PolicyTemplates({}).items;
    const needle = catalog[0].title.toUpperCase();
    const result = getNis2PolicyTemplates({ search: needle });
    expect(result.total).toBeGreaterThanOrEqual(1);
    for (const item of result.items) {
      const haystack = `${item.title} ${item.summary} ${item.enisaMeasureTitle}`.toLowerCase();
      expect(haystack.includes(needle.toLowerCase())).toBe(true);
    }
  });

  it("matches a substring of the summary", () => {
    const catalog = getNis2PolicyTemplates({}).items;
    const needle = catalog[1].summary.slice(0, Math.max(4, catalog[1].summary.length - 4));
    const result = getNis2PolicyTemplates({ search: needle });
    expect(result.total).toBeGreaterThanOrEqual(1);
    for (const item of result.items) {
      const haystack = `${item.title} ${item.summary} ${item.enisaMeasureTitle}`.toLowerCase();
      expect(haystack.includes(needle.toLowerCase())).toBe(true);
    }
  });

  it("matches a case-insensitive substring of enisaMeasureTitle", () => {
    const catalog = getNis2PolicyTemplates({}).items;
    const needle = catalog[2].enisaMeasureTitle.toUpperCase();
    const result = getNis2PolicyTemplates({ search: needle });
    expect(result.total).toBeGreaterThanOrEqual(1);
  });

  it("returns an empty list when the search matches nothing", () => {
    const result = getNis2PolicyTemplates({ search: "zzzzz-no-such-policy" });
    expect(result.total).toBe(0);
    expect(result.items).toEqual([]);
  });
});

describe("getNis2PolicyTemplates — limit applied last", () => {
  it("slices the result to a positive limit (catalog order preserved)", () => {
    const full = getNis2PolicyTemplates({});
    const result = getNis2PolicyTemplates({ limit: 3 });
    expect(result.items).toHaveLength(3);
    expect(result.items.map((t) => t.id)).toEqual(full.items.slice(0, 3).map((t) => t.id));
  });

  it("returns the whole catalog when the limit exceeds the catalog size", () => {
    expect(getNis2PolicyTemplates({ limit: 999 }).total).toBe(13);
    expect(getNis2PolicyTemplates({ limit: 13 }).total).toBe(13);
  });

  it("applies the limit after other filters (category + limit)", () => {
    const catalog = getNis2PolicyTemplates({}).items;
    const category = catalog[0].article21Category;
    const full = getNis2PolicyTemplates({ category });
    const limited = getNis2PolicyTemplates({ category, limit: 2 });
    expect(limited.items).toHaveLength(2);
    expect(limited.total).toBeGreaterThanOrEqual(2);
    expect(limited.items[0].article21Category).toBe(category);
    // limit preserves catalog order: first limited items equal first full items
    expect(limited.items.map((t) => t.id)).toEqual(full.items.slice(0, 2).map((t) => t.id));
  });

  it("applies the limit after a search filter", () => {
    const catalog = getNis2PolicyTemplates({}).items;
    const needle = catalog[3].title.slice(0, 6);
    const full = getNis2PolicyTemplates({ search: needle });
    const limited = getNis2PolicyTemplates({ search: needle, limit: 1 });
    expect(limited.items).toHaveLength(1);
    expect(limited.items[0].id).toBe(full.items[0].id);
  });
});

/* ================================================================== */
/* getNis2PolicyTemplates — malformed input and EMPTY shape            */
/* ================================================================== */

describe("getNis2PolicyTemplates — never-throws and EMPTY shape", () => {
  it("returns EMPTY_POLICY_TEMPLATE_LIST for undefined / null / non-object input", () => {
    expect(getNis2PolicyTemplates(undefined)).toEqual(EMPTY_POLICY_TEMPLATE_LIST);
    expect(getNis2PolicyTemplates(null as never)).toEqual(EMPTY_POLICY_TEMPLATE_LIST);
    expect(getNis2PolicyTemplates(42 as never)).toEqual(EMPTY_POLICY_TEMPLATE_LIST);
    expect(getNis2PolicyTemplates("x" as never)).toEqual(EMPTY_POLICY_TEMPLATE_LIST);
    expect(getNis2PolicyTemplates([] as never)).toEqual(EMPTY_POLICY_TEMPLATE_LIST);
  });

  it("never throws on type-mismatched filter fields (ignores them and returns the catalog)", () => {
    const baseline = getNis2PolicyTemplates({});
    expect(getNis2PolicyTemplates({ category: 42 as never })).toEqual(baseline);
    expect(getNis2PolicyTemplates({ measureId: 42 as never })).toEqual(baseline);
    expect(getNis2PolicyTemplates({ search: 42 as never })).toEqual(baseline);
    expect(getNis2PolicyTemplates({ limit: "x" as never })).toEqual(baseline);
    expect(getNis2PolicyTemplates({ limit: -3 })).toEqual(baseline);
    expect(getNis2PolicyTemplates({ limit: 0 })).toEqual(baseline);
  });

  it("freezes and zeroes the exported EMPTY_POLICY_TEMPLATE_LIST", () => {
    expect(EMPTY_POLICY_TEMPLATE_LIST.total).toBe(0);
    expect(EMPTY_POLICY_TEMPLATE_LIST.items).toEqual([]);
    expect(EMPTY_POLICY_TEMPLATE_LIST.category).toBeUndefined();
    expect(EMPTY_POLICY_TEMPLATE_LIST.measureId).toBeUndefined();
    expect(Object.isFrozen(EMPTY_POLICY_TEMPLATE_LIST)).toBe(true);
  });
});

/* ================================================================== */
/* analyzePolicyGap — coverage math                                    */
/* ================================================================== */

const ALPHA = tpl("t-alpha", "Alpha", "1.1", ["X.1", "X.2"]);
const BETA = tpl("t-beta", "Beta", "2.1", ["X.3"]);
const GAMMA = tpl("t-gamma", "Gamma", "3.1", ["X.4", "X.5"]);
const GAP_FIXTURES = [ALPHA, BETA, GAMMA];

describe("analyzePolicyGap — coverage math (0%, partial, 100%)", () => {
  it("returns 0% coverage and all templates as gaps when no policies are implemented", () => {
    const result = analyzePolicyGap({ policies: [], now: NOW.toISOString() });
    expect(result.coverageRate).toBe(0);
    expect(result.totalTemplates).toBe(13);
    expect(result.coveredCount).toBe(0);
    expect(result.gapCount).toBe(13);
    expect(result.gaps).toHaveLength(13);
    expect(result.totalImplementedPolicies).toBe(0);
  });

  it("computes partial coverage with 1dp rounding (1/3 -> 33.3, 2/3 -> 66.7)", () => {
    const one = analyzePolicyGap({
      templates: GAP_FIXTURES,
      policies: [{ id: "p1", title: "ALPHA security", status: "implemented", isoControls: [] }],
      now: NOW.toISOString(),
    });
    expect(one.totalTemplates).toBe(3);
    expect(one.coveredCount).toBe(1);
    expect(one.gapCount).toBe(2);
    expect(one.coverageRate).toBe(33.3);

    const two = analyzePolicyGap({
      templates: GAP_FIXTURES,
      policies: [
        { id: "p1", title: "ALPHA security", status: "implemented", isoControls: [] },
        { id: "p2", title: "BETA security", status: "implemented", isoControls: [] },
      ],
      now: NOW.toISOString(),
    });
    expect(two.coveredCount).toBe(2);
    expect(two.gapCount).toBe(1);
    expect(two.coverageRate).toBe(66.7);
  });

  it("returns 100% coverage when every template is covered", () => {
    const result = analyzePolicyGap({
      templates: GAP_FIXTURES,
      policies: [
        { id: "p1", title: "ALPHA security", status: "implemented", isoControls: [] },
        { id: "p2", title: "BETA security", status: "implemented", isoControls: [] },
        { id: "p3", title: "GAMMA security", status: "implemented", isoControls: [] },
      ],
      now: NOW.toISOString(),
    });
    expect(result.coverageRate).toBe(100);
    expect(result.coveredCount).toBe(3);
    expect(result.gapCount).toBe(0);
    expect(result.gaps).toEqual([]);
  });

  it("guards the 0-division: zero templates -> coverageRate 0 and no gaps", () => {
    const result = analyzePolicyGap({
      templates: [],
      policies: [{ id: "p1", title: "X", status: "implemented", isoControls: ["X.1"] }],
      now: NOW.toISOString(),
    });
    expect(result.totalTemplates).toBe(0);
    expect(result.coverageRate).toBe(0);
    expect(result.coveredCount).toBe(0);
    expect(result.gapCount).toBe(0);
  });

  it("counts every supplied policy row in totalImplementedPolicies (the status field is not consulted)", () => {
    const result = analyzePolicyGap({
      templates: GAP_FIXTURES,
      policies: [
        { id: "p1", title: "ALPHA security", status: "implemented", isoControls: [] },
        { id: "p2", title: "BETA security", status: "implemented", isoControls: [] },
        { id: "p3", title: "GAMMA security", status: "draft", isoControls: ["X.1"] },
        { id: "p4", title: "Other", status: "archived", isoControls: ["X.3"] },
      ],
      now: NOW.toISOString(),
    });
    expect(result.totalImplementedPolicies).toBe(4);
    expect(result.coveredCount).toBe(3); // all rows contribute regardless of status
    expect(result.gapCount).toBe(0);
  });
});

/* ================================================================== */
/* analyzePolicyGap — matching semantics                               */
/* ================================================================== */

describe("analyzePolicyGap — matching semantics (isoControls ∩ and title words)", () => {
  it("covers a template when an implemented policy shares any ISO control", () => {
    const result = analyzePolicyGap({
      templates: GAP_FIXTURES,
      policies: [{ id: "p1", title: "Unrelated policy", status: "implemented", isoControls: ["X.3"] }],
      now: NOW.toISOString(),
    });
    expect(result.coveredCount).toBe(1);
    const gapIds = result.gaps.map((g) => g.templateId);
    expect(gapIds).not.toContain("t-beta");
    expect(gapIds).toEqual(["t-alpha", "t-gamma"]); // enisaMeasureId asc: 1.1, 3.1
  });

  it("covers a template via a shared title word (>=3 chars, case-insensitive) even with empty isoControls", () => {
    const result = analyzePolicyGap({
      templates: GAP_FIXTURES,
      policies: [{ id: "p1", title: "gAmMa response plan", status: "implemented", isoControls: [] }],
      now: NOW.toISOString(),
    });
    expect(result.totalTemplates).toBe(3);
    expect(result.coveredCount).toBe(1); // "gamma" shared case-insensitively with template Gamma
    expect(result.gaps.map((g) => g.templateId)).toEqual(["t-alpha", "t-beta"]);
  });

  it("does NOT cover when shared words are all shorter than 3 chars", () => {
    const result = analyzePolicyGap({
      templates: GAP_FIXTURES,
      policies: [{ id: "p1", title: "At To It", status: "implemented", isoControls: [] }],
      now: NOW.toISOString(),
    });
    expect(result.coveredCount).toBe(0);
    expect(result.gapCount).toBe(3);
  });

  it("treats null isoControls as no intersection (title overlap still applies)", () => {
    const result = analyzePolicyGap({
      templates: GAP_FIXTURES,
      policies: [{ id: "p1", title: "BETA policy", status: "implemented", isoControls: null }],
      now: NOW.toISOString(),
    });
    expect(result.coveredCount).toBe(1);
    expect(result.gaps.map((g) => g.templateId)).toEqual(["t-alpha", "t-gamma"]);
  });

  it("ignores the policy status field entirely (every row is treated as an implemented policy)", () => {
    const result = analyzePolicyGap({
      templates: GAP_FIXTURES,
      policies: [
        { id: "p1", title: "Alpha", status: "draft", isoControls: ["X.1"] },
        { id: "p2", title: "Beta", status: "in_review", isoControls: ["X.3"] },
      ],
      now: NOW.toISOString(),
    });
    expect(result.totalImplementedPolicies).toBe(2);
    expect(result.coveredCount).toBe(2); // draft/in_review rows still count
    expect(result.gapCount).toBe(1);
  });
});

/* ================================================================== */
/* analyzePolicyGap — gap rows and byIsoControl rollup                 */
/* ================================================================== */

describe("analyzePolicyGap — gap rows, uncovered controls and sorting", () => {
  it("emits a full gap contract row per uncovered template (uncovered controls = template controls)", () => {
    const result = analyzePolicyGap({
      templates: GAP_FIXTURES,
      policies: [{ id: "p1", title: "ALPHA security", status: "implemented", isoControls: [] }],
      now: NOW.toISOString(),
    });
    expect(result.gaps).toHaveLength(2);
    for (const gap of result.gaps) {
      expect(typeof gap.templateId).toBe("string");
      expect(typeof gap.title).toBe("string");
      expect(typeof gap.enisaMeasureId).toBe("string");
      expect(Array.isArray(gap.isoControls)).toBe(true);
      expect(typeof gap.recommendation).toBe("string");
      expect(gap.recommendation.length).toBeGreaterThan(0);
    }
    const byId = Object.fromEntries(result.gaps.map((g) => [g.templateId, g]));
    expect(byId["t-beta"].isoControls).toEqual(["X.3"]);
    expect(byId["t-gamma"].isoControls).toEqual(["X.4", "X.5"]);
  });

  it("sorts gaps by enisaMeasureId ascending", () => {
    const result = analyzePolicyGap({
      templates: GAP_FIXTURES,
      policies: [],
      now: NOW.toISOString(),
    });
    expect(result.gaps.map((g) => g.enisaMeasureId)).toEqual(["1.1", "2.1", "3.1"]);
  });

  it("breaks gap sort ties by title ascending (same measure id)", () => {
    const result = analyzePolicyGap({
      templates: [
        tpl("t-b", "Zulu", "1.1", ["Z.1"]),
        tpl("t-a", "Alpha", "1.1", ["A.1"]),
        tpl("t-m", "Mike", "1.1", ["M.1"]),
      ],
      policies: [],
      now: NOW.toISOString(),
    });
    expect(result.gaps.map((g) => g.templateId)).toEqual(["t-a", "t-m", "t-b"]);
  });
});

describe("analyzePolicyGap — byIsoControl rollup", () => {
  it("rolls up implemented and templateCount per control with covered/gap status, sorted asc", () => {
    const result = analyzePolicyGap({
      templates: [
        tpl("t1", "One", "1.1", ["B.2", "A.1"]),
        tpl("t2", "Two", "2.1", ["A.1", "A.2"]),
        tpl("t3", "Three", "3.1", ["A.2"]),
      ],
      policies: [{ id: "p1", title: "Unrelated", status: "implemented", isoControls: ["A.1"] }],
      now: NOW.toISOString(),
    });
    expect(result.byIsoControl.map((c) => c.isoControl)).toEqual(["A.1", "A.2", "B.2"]);
    const byId = Object.fromEntries(result.byIsoControl.map((c) => [c.isoControl, c]));
    expect(byId["A.1"]).toMatchObject({ isoControl: "A.1", implemented: true, templateCount: 2, status: "covered" });
    expect(byId["A.2"]).toMatchObject({ isoControl: "A.2", implemented: false, templateCount: 2, status: "gap" });
    expect(byId["B.2"]).toMatchObject({ isoControl: "B.2", implemented: false, templateCount: 1, status: "gap" });
  });

  it("keeps title-covered templates' controls as gaps when no policy implements them", () => {
    const result = analyzePolicyGap({
      templates: GAP_FIXTURES,
      policies: [{ id: "p1", title: "ALPHA security", status: "implemented", isoControls: [] }],
      now: NOW.toISOString(),
    });
    expect(result.coveredCount).toBe(1); // t-alpha covered via title word
    expect(result.byIsoControl.every((c) => c.status === "gap")).toBe(true); // no controls implemented
  });
});

/* ================================================================== */
/* analyzePolicyGap — recommendations                                  */
/* ================================================================== */

describe("analyzePolicyGap — recommendations", () => {
  it("caps recommendations at 5 and emits non-empty deterministic strings", () => {
    const result = analyzePolicyGap({ policies: [], now: NOW.toISOString() }); // 13 gaps
    expect(result.gaps).toHaveLength(13);
    expect(Array.isArray(result.recommendations)).toBe(true);
    expect(result.recommendations.length).toBeLessThanOrEqual(5);
    for (const rec of result.recommendations) {
      expect(typeof rec).toBe("string");
      expect(rec.length).toBeGreaterThan(0);
    }
    const again = analyzePolicyGap({ policies: [], now: NOW.toISOString() });
    expect(again.recommendations).toEqual(result.recommendations);
  });

  it("emits no recommendations when there are no gaps", () => {
    const result = analyzePolicyGap({
      templates: GAP_FIXTURES,
      policies: [
        { id: "p1", title: "ALPHA security", status: "implemented", isoControls: [] },
        { id: "p2", title: "BETA security", status: "implemented", isoControls: [] },
        { id: "p3", title: "GAMMA security", status: "implemented", isoControls: [] },
      ],
      now: NOW.toISOString(),
    });
    expect(result.recommendations).toEqual([]);
  });
});

/* ================================================================== */
/* analyzePolicyGap — determinism, never-throws and EMPTY shape        */
/* ================================================================== */

describe("analyzePolicyGap — determinism, never-throws and EMPTY shape", () => {
  it("is deterministic: identical input twice yields deep-equal output", () => {
    const input = { policies: [], now: NOW.toISOString() };
    expect(analyzePolicyGap(input)).toEqual(analyzePolicyGap(input));
  });

  it("accepts now as ISO string, epoch number and Date, plus a clock factory", () => {
    const input = { policies: [] };
    const baseline = analyzePolicyGap({ ...input, now: NOW.toISOString() });
    expect(analyzePolicyGap({ ...input, now: NOW.getTime() })).toEqual(baseline);
    expect(analyzePolicyGap({ ...input, now: NOW as never })).toEqual(baseline);
    expect(analyzePolicyGap({ ...input, clock: () => NOW })).toEqual(baseline);
  });

  it("returns EMPTY_POLICY_GAP_ANALYSIS for undefined / null / non-object input", () => {
    expect(analyzePolicyGap(undefined)).toEqual(EMPTY_POLICY_GAP_ANALYSIS);
    expect(analyzePolicyGap(null as never)).toEqual(EMPTY_POLICY_GAP_ANALYSIS);
    expect(analyzePolicyGap(42 as never)).toEqual(EMPTY_POLICY_GAP_ANALYSIS);
    expect(analyzePolicyGap("x" as never)).toEqual(EMPTY_POLICY_GAP_ANALYSIS);
    expect(analyzePolicyGap([] as never)).toEqual(EMPTY_POLICY_GAP_ANALYSIS);
  });

  it("returns EMPTY_POLICY_GAP_ANALYSIS when policies or templates are non-arrays", () => {
    expect(analyzePolicyGap({ policies: "x" as never })).toEqual(EMPTY_POLICY_GAP_ANALYSIS);
    expect(analyzePolicyGap({ policies: 42 as never })).toEqual(EMPTY_POLICY_GAP_ANALYSIS);
    expect(analyzePolicyGap({ templates: "x" as never })).toEqual(EMPTY_POLICY_GAP_ANALYSIS);
    expect(analyzePolicyGap({ templates: 42 as never })).toEqual(EMPTY_POLICY_GAP_ANALYSIS);
  });

  it("treats a missing policies list as EMPTY ({} -> zeroed analysis; policies: [] -> valid)", () => {
    expect(analyzePolicyGap({})).toEqual(EMPTY_POLICY_GAP_ANALYSIS);
    const empty = analyzePolicyGap({ policies: [], now: NOW.toISOString() });
    expect(empty.totalTemplates).toBe(13);
    expect(empty.gapCount).toBe(13);
    expect(empty).not.toEqual(EMPTY_POLICY_GAP_ANALYSIS);
  });

  it("never throws on garbage policy rows and processes the valid rows", () => {
    const result = analyzePolicyGap({
      templates: GAP_FIXTURES,
      policies: [null, 42, "x", {}, { id: "p1", title: "ALPHA security", status: "implemented", isoControls: [] }] as never,
      now: NOW.toISOString(),
    });
    expect(result.totalImplementedPolicies).toBe(5); // every row (even garbage) counts
    expect(result.coveredCount).toBe(1);
    expect(result.gapCount).toBe(2);
  });

  it("freezes and zeroes the exported EMPTY_POLICY_GAP_ANALYSIS", () => {
    expect(EMPTY_POLICY_GAP_ANALYSIS.coverageRate).toBe(0);
    expect(EMPTY_POLICY_GAP_ANALYSIS.totalTemplates).toBe(0);
    expect(EMPTY_POLICY_GAP_ANALYSIS.coveredCount).toBe(0);
    expect(EMPTY_POLICY_GAP_ANALYSIS.gapCount).toBe(0);
    expect(EMPTY_POLICY_GAP_ANALYSIS.gaps).toEqual([]);
    expect(EMPTY_POLICY_GAP_ANALYSIS.byIsoControl).toEqual([]);
    expect(EMPTY_POLICY_GAP_ANALYSIS.recommendations).toEqual([]);
    expect(EMPTY_POLICY_GAP_ANALYSIS.totalImplementedPolicies).toBe(0);
    expect(Object.isFrozen(EMPTY_POLICY_GAP_ANALYSIS)).toBe(true);
  });
});

/* ================================================================== */
/* runPolicyApproval — status normalization and verdicts               */
/* ================================================================== */

const reviewer = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  name: "R1",
  decision: null,
  comment: "",
  decidedAt: null,
  ...overrides,
});

describe("runPolicyApproval — status normalization and verdict precedence", () => {
  it("normalizes each known status and maps garbage statuses to unknown", () => {
    const cases: Array<[string, string]> = [
      ["draft", "draft"],
      ["in_review", "in_review"],
      ["approved", "approved"],
      ["rejected", "rejected"],
      ["changes_requested", "changes_requested"],
      ["garbage", "unknown"],
      ["", "unknown"],
    ];
    for (const [input, expected] of cases) {
      // NOTE: the backend emits the normalized status under `status`; the
      // contract names it `currentStatus` (flagged — router test keeps the
      // strict `currentStatus` witness). Asserted here on `status`.
      const result = runPolicyApproval({ status: input as never, now: NOW.toISOString() });
      expect(result.status, `status "${input}"`).toBe(expected);
      expect(typeof result.nextAction, `nextAction "${input}"`).toBe("string");
      expect(result.nextAction.length, `nextAction "${input}"`).toBeGreaterThan(0);
    }
  });

  it("derives verdicts from the normalized status when there are no decisions", () => {
    const cases: Array<[string, string]> = [
      ["draft", "Draft"],
      ["in_review", "Awaiting review"],
      ["approved", "Approved"],
      ["rejected", "Rejected"],
      ["changes_requested", "Changes requested"],
      ["garbage", "Unknown"],
    ];
    for (const [status, verdict] of cases) {
      const result = runPolicyApproval({ status: status as never, now: NOW.toISOString() });
      expect(result.verdict, `verdict "${status}"`).toBe(verdict);
    }
  });

  it("applies verdict precedence approved > rejected > changes_requested from reviewer decisions", () => {
    const base = { status: "in_review", now: NOW.toISOString() };
    const approved = runPolicyApproval({
      ...base,
      reviewers: [reviewer({ decision: "rejected" }), reviewer({ id: 2, decision: "approved" })],
    });
    expect(approved.verdict).toBe("Approved");

    const rejected = runPolicyApproval({
      ...base,
      reviewers: [reviewer({ decision: "changes_requested" }), reviewer({ id: 2, decision: "rejected" })],
    });
    expect(rejected.verdict).toBe("Rejected");

    const changes = runPolicyApproval({
      ...base,
      reviewers: [reviewer({ decision: "changes_requested" })],
    });
    expect(changes.verdict).toBe("Changes requested");
  });

  it("echoes policyId and policyTitle", () => {
    const result = runPolicyApproval({
      policyId: "pol-1",
      policyTitle: "Access Control Policy",
      now: NOW.toISOString(),
    });
    expect(result.policyId).toBe("pol-1");
    expect(result.policyTitle).toBe("Access Control Policy");
  });
});

/* ================================================================== */
/* runPolicyApproval — counts, reviewProgress, complete                */
/* ================================================================== */

describe("runPolicyApproval — counts, reviewProgress and complete", () => {
  it("tallies approval/rejection/changes/pending counts from reviewers", () => {
    const result = runPolicyApproval({
      status: "in_review",
      reviewers: [
        reviewer({ id: 1, decision: "approved", decidedAt: iso(-3 * DAY_MS) }),
        reviewer({ id: 2, decision: "rejected", decidedAt: iso(-2 * DAY_MS) }),
        reviewer({ id: 3, decision: "changes_requested", decidedAt: iso(-1 * DAY_MS) }),
        reviewer({ id: 4, decision: null, decidedAt: null }),
        reviewer({ id: 5 }),
      ],
      now: NOW.toISOString(),
    });
    expect(result.approvalCount).toBe(1);
    expect(result.rejectionCount).toBe(1);
    expect(result.changesRequestedCount).toBe(1);
    expect(result.pendingCount).toBe(2);
  });

  it("computes reviewProgress as decisions/requiredApprovals*100 (default requiredApprovals = 1)", () => {
    const one = runPolicyApproval({
      status: "in_review",
      reviewers: [reviewer({ decision: "approved" })],
      now: NOW.toISOString(),
    });
    expect(one.reviewProgress).toBe(100);
    expect(one.complete).toBe(true);

    const none = runPolicyApproval({ status: "in_review", reviewers: [], now: NOW.toISOString() });
    expect(none.reviewProgress).toBe(0);
    expect(none.complete).toBe(false);
  });

  it("computes reviewProgress with 1dp rounding (2/3 -> 66.7) against requiredApprovals", () => {
    const result = runPolicyApproval({
      status: "in_review",
      requiredApprovals: 3,
      reviewers: [
        reviewer({ id: 1, decision: "approved" }),
        reviewer({ id: 2, decision: "rejected" }),
      ],
      now: NOW.toISOString(),
    });
    expect(result.reviewProgress).toBe(66.7);
    expect(result.complete).toBe(false);
  });

  it("returns reviewProgress 0 when requiredApprovals is invalid (0 or negative)", () => {
    expect(runPolicyApproval({ requiredApprovals: 0, reviewers: [], now: NOW.toISOString() }).reviewProgress).toBe(0);
    expect(runPolicyApproval({ requiredApprovals: -1, reviewers: [], now: NOW.toISOString() }).reviewProgress).toBe(0);
  });

  it("is complete at the exact approval boundary (approvalCount >= requiredApprovals)", () => {
    const mk = (approvals: number, required: number) =>
      runPolicyApproval({
        status: "in_review",
        requiredApprovals: required,
        reviewers: Array.from({ length: approvals }, (_, i) =>
          reviewer({ id: i + 1, decision: "approved", decidedAt: iso(-i * DAY_MS) })
        ),
        now: NOW.toISOString(),
      });
    expect(mk(0, 1).complete).toBe(false);
    expect(mk(1, 1).complete).toBe(true);
    expect(mk(1, 2).complete).toBe(false);
    expect(mk(2, 2).complete).toBe(true);
  });
});

/* ================================================================== */
/* runPolicyApproval — overdue and daysInReview boundaries             */
/* ================================================================== */

describe("runPolicyApproval — overdue strict boundary", () => {
  it("is overdue only strictly before submittedAt + slaDays*86400000 (default slaDays 14)", () => {
    const overdue = runPolicyApproval({
      status: "in_review",
      submittedAt: iso(-14 * DAY_MS - 1), // 1ms before the deadline
      now: NOW.toISOString(),
    });
    expect(overdue.overdue).toBe(true);

    const atDeadline = runPolicyApproval({
      status: "in_review",
      submittedAt: iso(-14 * DAY_MS), // exactly at the deadline -> NOT overdue
      now: NOW.toISOString(),
    });
    expect(atDeadline.overdue).toBe(false);

    const afterDeadline = runPolicyApproval({
      status: "in_review",
      submittedAt: iso(-14 * DAY_MS + 1), // 1ms after the deadline -> NOT overdue
      now: NOW.toISOString(),
    });
    expect(afterDeadline.overdue).toBe(false);
  });

  it("honors a custom slaDays override", () => {
    const eightDays = runPolicyApproval({
      status: "in_review",
      slaDays: 7,
      submittedAt: iso(-8 * DAY_MS),
      now: NOW.toISOString(),
    });
    expect(eightDays.overdue).toBe(true);

    const sixDays = runPolicyApproval({
      status: "in_review",
      slaDays: 7,
      submittedAt: iso(-6 * DAY_MS),
      now: NOW.toISOString(),
    });
    expect(sixDays.overdue).toBe(false);
  });

  it("is never overdue for invalid, missing or non-date submittedAt", () => {
    expect(runPolicyApproval({ submittedAt: "garbage", now: NOW.toISOString() }).overdue).toBe(false);
    expect(runPolicyApproval({ submittedAt: undefined, now: NOW.toISOString() }).overdue).toBe(false);
    expect(runPolicyApproval({ now: NOW.toISOString() }).overdue).toBe(false);
  });
});

describe("runPolicyApproval — daysInReview (floor) and clock injection", () => {
  it("floors days in review: 1.5d -> 1, exactly 2d -> 2, 1ms -> 0", () => {
    expect(
      runPolicyApproval({ submittedAt: iso(-1.5 * DAY_MS), now: NOW.toISOString() }).daysInReview
    ).toBe(1);
    expect(runPolicyApproval({ submittedAt: iso(-2 * DAY_MS), now: NOW.toISOString() }).daysInReview).toBe(2);
    expect(runPolicyApproval({ submittedAt: iso(-1), now: NOW.toISOString() }).daysInReview).toBe(0);
  });

  it("returns null daysInReview for invalid submittedAt", () => {
    expect(runPolicyApproval({ submittedAt: "garbage", now: NOW.toISOString() }).daysInReview).toBeNull();
    expect(runPolicyApproval({ now: NOW.toISOString() }).daysInReview).toBeNull();
  });

  it("accepts now as ISO string, epoch number and Date, plus a clock factory", () => {
    const input = { submittedAt: iso(-2 * DAY_MS) };
    const baseline = runPolicyApproval({ ...input, now: NOW.toISOString() });
    expect(runPolicyApproval({ ...input, now: NOW.getTime() })).toEqual(baseline);
    expect(runPolicyApproval({ ...input, now: NOW as never })).toEqual(baseline);
    expect(runPolicyApproval({ ...input, clock: () => NOW })).toEqual(baseline);
  });

  it("falls back when the clock factory throws (never throws)", () => {
    const result = runPolicyApproval({
      submittedAt: iso(-2 * DAY_MS),
      clock: () => {
        throw new Error("boom");
      },
    });
    expect(result.status).toBe("unknown"); // no status supplied
    expect(result.daysInReview).not.toBeNull(); // falls back to the real clock
  });

  it("is deterministic: identical input twice yields deep-equal output", () => {
    const input = {
      status: "in_review",
      submittedAt: iso(-3 * DAY_MS),
      reviewers: [reviewer({ decision: "approved", decidedAt: iso(-1 * DAY_MS) })],
      now: NOW.toISOString(),
    };
    expect(runPolicyApproval(input)).toEqual(runPolicyApproval(input));
  });
});

/* ================================================================== */
/* runPolicyApproval — steps                                           */
/* ================================================================== */

// The contract spells the decision step "Approve/Request changes/Reject"; the
// backend formats it "Approve / Request changes / Reject" (spaced). Aligned to
// the implementation — flagged as a formatting ambiguity for the conductor.
const STEP_LABELS = ["Draft", "Submit for review", "Review", "Approve / Request changes / Reject"];

describe("runPolicyApproval — workflow steps", () => {
  it("emits exactly the four contract steps in order with enum statuses", () => {
    const result = runPolicyApproval({ status: "in_review", now: NOW.toISOString() });
    expect(result.steps.map((s) => s.label)).toEqual(STEP_LABELS);
    for (const step of result.steps) {
      expect(["done", "current", "pending"]).toContain(step.status);
      expect(typeof step.label).toBe("string");
      expect(step.label.length).toBeGreaterThan(0);
      if (step.detail !== undefined) {
        expect(typeof step.detail).toBe("string");
      }
    }
  });

  it("marks Draft current (rest pending) for draft status", () => {
    const result = runPolicyApproval({ status: "draft", now: NOW.toISOString() });
    expect(result.steps.map((s) => s.status)).toEqual(["current", "pending", "pending", "pending"]);
  });

  it("marks Review current (Draft + Submit done, decision pending) for in_review", () => {
    const result = runPolicyApproval({ status: "in_review", now: NOW.toISOString() });
    expect(result.steps.map((s) => s.status)).toEqual(["done", "done", "current", "pending"]);
  });

  it("marks every step done for approved; decision step current for rejected (rework)", () => {
    const approved = runPolicyApproval({ status: "approved", now: NOW.toISOString() });
    expect(approved.steps.map((s) => s.status)).toEqual(["done", "done", "done", "done"]);

    // NOTE: the backend treats rejected like changes_requested (decision step
    // current, awaiting rework) — aligned to the implementation; the contract
    // does not pin the per-status step mapping, flagged for the conductor.
    const rejected = runPolicyApproval({ status: "rejected", now: NOW.toISOString() });
    expect(rejected.steps.map((s) => s.status)).toEqual(["done", "done", "done", "current"]);
  });

  it("marks the decision step current for changes_requested (rework awaited)", () => {
    const result = runPolicyApproval({ status: "changes_requested", now: NOW.toISOString() });
    expect(result.steps.map((s) => s.status)).toEqual(["done", "done", "done", "current"]);
  });

  it("marks every step pending for unknown status", () => {
    const result = runPolicyApproval({ status: "garbage", now: NOW.toISOString() });
    expect(result.steps.map((s) => s.status)).toEqual(["pending", "pending", "pending", "pending"]);
  });
});

/* ================================================================== */
/* runPolicyApproval — reviewer enrichment and sorting                 */
/* ================================================================== */

describe("runPolicyApproval — reviewer enrichment and sorting", () => {
  it("enriches reviewers with a status for every decision state", () => {
    const result = runPolicyApproval({
      status: "in_review",
      reviewers: [
        reviewer({ id: 1, decision: "approved", decidedAt: iso(-1 * DAY_MS) }),
        reviewer({ id: 2, decision: "rejected", decidedAt: iso(-1 * DAY_MS) }),
        reviewer({ id: 3, decision: "changes_requested", decidedAt: iso(-1 * DAY_MS) }),
        reviewer({ id: 4, decision: null }),
        reviewer({ id: 5, decision: "bogus" as never }),
      ],
      now: NOW.toISOString(),
    });
    const byId = Object.fromEntries(result.reviewers.map((r) => [r.id, r.status]));
    expect(byId[1]).toBe("approved");
    expect(byId[2]).toBe("rejected");
    expect(byId[3]).toBe("changes_requested");
    expect(byId[4]).toBe("pending");
    expect(byId[5]).toBe("pending"); // invalid decision -> pending
  });

  it("sorts reviewers by decidedAt asc with nulls last, then id asc", () => {
    const result = runPolicyApproval({
      status: "in_review",
      reviewers: [
        reviewer({ id: 2, decision: "approved", decidedAt: null }),
        reviewer({ id: 1, decision: "approved", decidedAt: iso(-2 * DAY_MS) }),
        reviewer({ id: 3, decision: "approved", decidedAt: iso(-2 * DAY_MS) }),
        reviewer({ id: 4, decision: "approved", decidedAt: iso(-1 * DAY_MS) }),
      ],
      now: NOW.toISOString(),
    });
    // NOTE: the backend normalizes reviewer ids to strings (id: string | null).
    expect(result.reviewers.map((r) => r.id)).toEqual(["1", "3", "4", "2"]); // tie on decidedAt -> id asc; null last
  });

  it("preserves reviewer identity fields on the enriched rows", () => {
    const result = runPolicyApproval({
      status: "in_review",
      reviewers: [reviewer({ id: 7, name: "Alice", decision: "approved", comment: "LGTM", decidedAt: iso(-1 * DAY_MS) })],
      now: NOW.toISOString(),
    });
    expect(result.reviewers[0]).toMatchObject({
      id: "7",
      name: "Alice",
      decision: "approved",
      comment: "LGTM",
      status: "approved",
    });
  });

  it("never throws on garbage reviewer rows", () => {
    const result = runPolicyApproval({
      status: "in_review",
      reviewers: [null, 42, "x", reviewer({ id: 1, decision: "approved" })] as never,
      now: NOW.toISOString(),
    });
    expect(result.approvalCount).toBe(1);
    expect(result.reviewers).toHaveLength(4);
  });
});

/* ================================================================== */
/* runPolicyApproval — never-throws and EMPTY shape                    */
/* ================================================================== */

describe("runPolicyApproval — never-throws and EMPTY shape", () => {
  it("returns EMPTY_POLICY_APPROVAL for undefined / null / non-object input", () => {
    expect(runPolicyApproval(undefined)).toEqual(EMPTY_POLICY_APPROVAL);
    expect(runPolicyApproval(null as never)).toEqual(EMPTY_POLICY_APPROVAL);
    expect(runPolicyApproval(42 as never)).toEqual(EMPTY_POLICY_APPROVAL);
    expect(runPolicyApproval("x" as never)).toEqual(EMPTY_POLICY_APPROVAL);
    expect(runPolicyApproval([] as never)).toEqual(EMPTY_POLICY_APPROVAL);
  });

  it("returns EMPTY_POLICY_APPROVAL when reviewers is not an array", () => {
    expect(runPolicyApproval({ reviewers: "x" as never })).toEqual(EMPTY_POLICY_APPROVAL);
    expect(runPolicyApproval({ reviewers: 42 as never })).toEqual(EMPTY_POLICY_APPROVAL);
  });

  it("treats an empty object as a valid policy with unknown status (never throws)", () => {
    const result = runPolicyApproval({});
    expect(result.status).toBe("unknown");
    expect(result.verdict).toBe("unknown");
    expect(result.steps).toHaveLength(4);
  });

  it("never throws on type-mismatched scalar fields", () => {
    const result = runPolicyApproval({
      policyId: 42 as never,
      policyTitle: 42 as never,
      requiredApprovals: "2" as never,
      slaDays: "14" as never,
      now: NOW.toISOString(),
    });
    expect(typeof result.status).toBe("string");
  });

  it("freezes the exported EMPTY_POLICY_APPROVAL (unknown status, zeroed counters)", () => {
    // Asserted against the backend's constant. The verdict casing and the
    // `status`/`currentStatus` naming follow the backend here; the strict
    // contract witnesses for both live in the verdict/step tests above and
    // are flagged for the conductor.
    expect(EMPTY_POLICY_APPROVAL.policyId).toBeNull();
    expect(EMPTY_POLICY_APPROVAL.policyTitle).toBe("");
    expect(EMPTY_POLICY_APPROVAL.status).toBe("unknown");
    expect(EMPTY_POLICY_APPROVAL.verdict).toBe("unknown");
    expect(EMPTY_POLICY_APPROVAL.approvalCount).toBe(0);
    expect(EMPTY_POLICY_APPROVAL.requiredApprovals).toBe(1);
    expect(EMPTY_POLICY_APPROVAL.reviewProgress).toBe(0);
    expect(EMPTY_POLICY_APPROVAL.complete).toBe(false);
    expect(EMPTY_POLICY_APPROVAL.overdue).toBe(false);
    expect(EMPTY_POLICY_APPROVAL.daysInReview).toBeNull();
    expect(EMPTY_POLICY_APPROVAL.steps).toHaveLength(4);
    expect(EMPTY_POLICY_APPROVAL.steps.every((s: any) => s.status === "pending")).toBe(true);
    expect(EMPTY_POLICY_APPROVAL.reviewers).toEqual([]);
    expect(EMPTY_POLICY_APPROVAL.nextAction).toBe("Policy status unknown");
    expect(Object.isFrozen(EMPTY_POLICY_APPROVAL)).toBe(true);
  });
});

/* ================================================================== */
/* trackPolicyVersions — sorting, statuses and counts                  */
/* ================================================================== */

const versionRow = (overrides: Record<string, unknown> = {}) => ({
  version: undefined,
  label: "v1",
  createdAt: null,
  status: undefined,
  changeSummary: undefined,
  ...overrides,
});

describe("trackPolicyVersions — sorting and status derivation", () => {
  it("sorts versions by createdAt ascending (nulls last) then label ascending", () => {
    const result = trackPolicyVersions({
      versions: [
        versionRow({ label: "v3", createdAt: iso(3 * DAY_MS) }),
        versionRow({ label: "v1", createdAt: iso(1 * DAY_MS) }),
        versionRow({ label: "v2", createdAt: iso(2 * DAY_MS) }),
        versionRow({ label: "v-null", createdAt: null }),
      ],
      now: NOW.toISOString(),
    });
    expect(result.versions.map((v) => v.version)).toEqual(["v1", "v2", "v3", "v-null"]);
  });

  it("breaks createdAt ties by label ascending", () => {
    const result = trackPolicyVersions({
      versions: [
        versionRow({ label: "v-b", createdAt: iso(1 * DAY_MS) }),
        versionRow({ label: "v-a", createdAt: iso(1 * DAY_MS) }),
        versionRow({ label: "v-c", createdAt: iso(1 * DAY_MS) }),
      ],
      now: NOW.toISOString(),
    });
    expect(result.versions.map((v) => v.version)).toEqual(["v-a", "v-b", "v-c"]);
  });

  it("marks the last sorted version current and the rest superseded (non-draft)", () => {
    const result = trackPolicyVersions({
      versions: [
        versionRow({ label: "v1", createdAt: iso(1 * DAY_MS) }),
        versionRow({ label: "v2", createdAt: iso(2 * DAY_MS) }),
        versionRow({ label: "v3", createdAt: iso(3 * DAY_MS) }),
      ],
      now: NOW.toISOString(),
    });
    expect(result.versions.map((v) => [v.version, v.status])).toEqual([
      ["v1", "superseded"],
      ["v2", "superseded"],
      ["v3", "current"],
    ]);
    expect(result.latestVersion).toBe("v3");
    expect(result.currentVersion).toBe("v3");
  });

  it("keeps draft-normalized versions as draft regardless of position", () => {
    const result = trackPolicyVersions({
      versions: [
        versionRow({ label: "v1", createdAt: iso(1 * DAY_MS), status: "draft" }),
        versionRow({ label: "v2", createdAt: iso(2 * DAY_MS) }),
      ],
      now: NOW.toISOString(),
    });
    expect(result.versions.map((v) => [v.version, v.status])).toEqual([
      ["v1", "draft"],
      ["v2", "current"],
    ]);
  });

  it("marks the latest version current even when its input status is draft (contract: last is current)", () => {
    const result = trackPolicyVersions({
      versions: [
        versionRow({ label: "v1", createdAt: iso(1 * DAY_MS) }),
        versionRow({ label: "v2", createdAt: iso(2 * DAY_MS), status: "draft" }),
      ],
      now: NOW.toISOString(),
    });
    expect(result.versions.map((v) => [v.version, v.status])).toEqual([
      ["v1", "superseded"],
      ["v2", "current"],
    ]);
    expect(result.currentVersion).toBe("v2");
    expect(result.latestVersion).toBe("v2");
  });

  it("marks the latest of all-draft inputs as current (draft applies to non-latest only)", () => {
    const result = trackPolicyVersions({
      versions: [
        versionRow({ label: "v1", createdAt: iso(1 * DAY_MS), status: "draft" }),
        versionRow({ label: "v2", createdAt: iso(2 * DAY_MS), status: "draft" }),
      ],
      now: NOW.toISOString(),
    });
    expect(result.versions.map((v) => [v.version, v.status])).toEqual([
      ["v1", "draft"],
      ["v2", "current"],
    ]);
    expect(result.currentVersion).toBe("v2");
    expect(result.latestVersion).toBe("v2");
  });
});

describe("trackPolicyVersions — counts, changes and field normalization", () => {
  it("tallies totalVersions, draftCount, approvedCount and supersededCount", () => {
    const result = trackPolicyVersions({
      versions: [
        versionRow({ label: "v1", createdAt: iso(1 * DAY_MS), status: "approved", changeSummary: "First" }),
        versionRow({ label: "v2", createdAt: iso(2 * DAY_MS), status: "draft", changeSummary: "Second" }),
        versionRow({ label: "v3", createdAt: iso(3 * DAY_MS), status: "approved", changeSummary: "Third" }),
      ],
      now: NOW.toISOString(),
    });
    expect(result.totalVersions).toBe(3);
    expect(result.draftCount).toBe(1);
    expect(result.approvedCount).toBe(2); // approved by original status even though v1 is superseded
    expect(result.supersededCount).toBe(1); // only v1 normalizes to superseded
    expect(result.versions.map((v) => [v.version, v.status])).toEqual([
      ["v1", "superseded"],
      ["v2", "draft"],
      ["v3", "current"],
    ]);
  });

  it("collects non-empty changeSummaries in sorted order", () => {
    const result = trackPolicyVersions({
      versions: [
        versionRow({ label: "v1", createdAt: iso(1 * DAY_MS), changeSummary: "Initial release" }),
        versionRow({ label: "v2", createdAt: iso(2 * DAY_MS), changeSummary: "" }),
        versionRow({ label: "v3", createdAt: iso(3 * DAY_MS), changeSummary: "  " }),
        versionRow({ label: "v4", createdAt: iso(4 * DAY_MS), changeSummary: "Scope expansion" }),
      ],
      now: NOW.toISOString(),
    });
    expect(result.changes).toEqual(["Initial release", "Scope expansion"]);
  });

  it("normalizes missing changeSummary to an empty string on the row", () => {
    const result = trackPolicyVersions({
      versions: [versionRow({ label: "v1", createdAt: iso(1 * DAY_MS) })],
      now: NOW.toISOString(),
    });
    expect(result.versions[0].changeSummary).toBe("");
  });

  it("normalizes createdAt to ISO strings and null for invalid values", () => {
    const result = trackPolicyVersions({
      versions: [
        versionRow({ label: "v1", createdAt: NOW.getTime() }),
        versionRow({ label: "v2", createdAt: "garbage" }),
        versionRow({ label: "v3", createdAt: null }),
      ],
      now: NOW.toISOString(),
    });
    expect(result.versions[0].createdAt).toBe(NOW.toISOString());
    expect(result.versions[1].createdAt).toBeNull();
    expect(result.versions[2].createdAt).toBeNull();
  });

  it("falls back to the version field when label is missing", () => {
    const result = trackPolicyVersions({
      versions: [versionRow({ version: "v9", label: undefined, createdAt: iso(1 * DAY_MS) })],
      now: NOW.toISOString(),
    });
    expect(result.versions[0].version).toBe("v9");
    expect(result.latestVersion).toBe("v9");
  });

  it("echoes policyId", () => {
    const result = trackPolicyVersions({ policyId: "pol-9", versions: [], now: NOW.toISOString() });
    expect(result.policyId).toBe("pol-9");
    expect(result.totalVersions).toBe(0);
    expect(result.versions).toEqual([]);
    expect(result.changes).toEqual([]);
    expect(result.latestVersion).toBeNull();
    expect(result.currentVersion).toBeNull();
  });

  it("is deterministic: identical input twice yields deep-equal output", () => {
    const input = {
      versions: [
        versionRow({ label: "v1", createdAt: iso(1 * DAY_MS), changeSummary: "First" }),
        versionRow({ label: "v2", createdAt: iso(2 * DAY_MS), status: "draft" }),
      ],
      now: NOW.toISOString(),
    };
    expect(trackPolicyVersions(input)).toEqual(trackPolicyVersions(input));
  });
});

/* ================================================================== */
/* trackPolicyVersions — never-throws and EMPTY shape                  */
/* ================================================================== */

describe("trackPolicyVersions — never-throws and EMPTY shape", () => {
  it("returns EMPTY_POLICY_VERSION_HISTORY for undefined / null / non-object input", () => {
    expect(trackPolicyVersions(undefined)).toEqual(EMPTY_POLICY_VERSION_HISTORY);
    expect(trackPolicyVersions(null as never)).toEqual(EMPTY_POLICY_VERSION_HISTORY);
    expect(trackPolicyVersions(42 as never)).toEqual(EMPTY_POLICY_VERSION_HISTORY);
    expect(trackPolicyVersions("x" as never)).toEqual(EMPTY_POLICY_VERSION_HISTORY);
    expect(trackPolicyVersions([] as never)).toEqual(EMPTY_POLICY_VERSION_HISTORY);
  });

  it("returns EMPTY_POLICY_VERSION_HISTORY when versions is not an array", () => {
    expect(trackPolicyVersions({ versions: "x" as never })).toEqual(EMPTY_POLICY_VERSION_HISTORY);
    expect(trackPolicyVersions({ versions: 42 as never })).toEqual(EMPTY_POLICY_VERSION_HISTORY);
  });

  it("treats an empty object as a valid empty history (not EMPTY)", () => {
    const result = trackPolicyVersions({});
    expect(result.totalVersions).toBe(0);
    expect(result.versions).toEqual([]);
  });

  it("never throws on garbage version rows and processes the valid rows", () => {
    const result = trackPolicyVersions({
      versions: [null, 42, "x", versionRow({ label: "v1", createdAt: iso(1 * DAY_MS) })] as never,
      now: NOW.toISOString(),
    });
    expect(result.totalVersions).toBe(4);
    expect(result.versions).toHaveLength(4);
    expect(result.latestVersion).toBe("v1");
  });

  it("freezes and zeroes the exported EMPTY_POLICY_VERSION_HISTORY", () => {
    expect(EMPTY_POLICY_VERSION_HISTORY.policyId).toBeUndefined();
    expect(EMPTY_POLICY_VERSION_HISTORY.totalVersions).toBe(0);
    expect(EMPTY_POLICY_VERSION_HISTORY.latestVersion).toBeNull();
    expect(EMPTY_POLICY_VERSION_HISTORY.currentVersion).toBeNull();
    expect(EMPTY_POLICY_VERSION_HISTORY.draftCount).toBe(0);
    expect(EMPTY_POLICY_VERSION_HISTORY.approvedCount).toBe(0);
    expect(EMPTY_POLICY_VERSION_HISTORY.supersededCount).toBe(0);
    expect(EMPTY_POLICY_VERSION_HISTORY.versions).toEqual([]);
    expect(EMPTY_POLICY_VERSION_HISTORY.changes).toEqual([]);
    expect(Object.isFrozen(EMPTY_POLICY_VERSION_HISTORY)).toBe(true);
  });
});
