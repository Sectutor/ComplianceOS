import { describe, it, expect } from "vitest";

/**
 * NIS2 Advanced Security Testing engine (lib/nis2/securityTesting.ts) —
 * engine tests (QA cycle 21, NIS2 Phase 5 Task 5.1 / ENISA Measure 6.7 /
 * NIS2 Art. 21(2)(e)).
 *
 * Mirrors securityMetrics.test.ts / vulnerabilityMgmt.test.ts: the engine is
 * pure and deterministic, never throws, and accepts an injectable `now` clock
 * (opts.now as ISO string | epoch number | Date, or opts.clock factory) where
 * time matters. Every function is exercised at its band boundaries, on
 * malformed input, on clock injection, and for input determinism (same input
 * twice => deep-equal).
 *
 * Contract under test:
 *   planPenetrationTest(tests, opts?)     -> { total, countsByStatus, countsByType, overdueCount, overdueTests, tests[] }
 *   runRedTeamExercise(exercise, opts?)   -> { name, status, verdict, startAt, endAt, phases[], participants[], participantCounts, summary }
 *   assessSecurityBenchmarks(assessments, opts?) -> { overallScore, passRate, totalApplicable, totalPass, totalFail, totalNa, categories[], topGaps[] }
 *   trackScanCoverage(assets, opts?)      -> { totalAssets, coveredCount, overdueCount, coverageRate, byClass[], assets[] }
 *
 * Pen-test plan model (planPenetrationTest):
 *   Type catalog (input field testType): external / internal / web-app / api /
 *   mobile / wireless / social-engineering / physical / red-team; output
 *   countsByType keys are kebab->camel (webApp, socialEngineering, redTeam).
 *   Status catalog: draft / scheduled / in_progress / completed / reported;
 *   output countsByStatus key inProgress. A test is OVERDUE only when status
 *   is scheduled OR in_progress AND scheduledDate + windowHours < now
 *   (windowHours default 336, per-test override; strict `<`, so exactly at the
 *   boundary is not overdue). Tests without a scheduledDate are never
 *   overdue. Non-object rows are filtered. Risk tier (critical/high/medium/
 *   low/info) drives the frequency recommendation: critical -> quarterly 91d,
 *   high -> semi-annual 182d, medium -> annual 365d, low/info -> biennial
 *   730d, unknown -> annual 365d; nextDueDate = lastCompletedAt + frequency
 *   days, falling back to scheduledDate when lastCompletedAt is missing.
 *   tests[] is sorted (status asc, testType asc, id asc); overdueTests are
 *   sorted scheduledDate asc then id asc.
 *   QA FLAGS vs the terse task spec (conductor to reconcile): the spec text
 *   named the output buckets `byStatus`/`byType` (implementation:
 *   countsByStatus/countsByType) and the test-type input field `type`
 *   (implementation: testType); the spec's "frequency by riskTier: quarterly
 *   91d/..." reads as if riskTier were the frequency name, the implementation
 *   instead maps asset-risk tiers (critical..info) to those frequencies.
 *
 * Red-team model (runRedTeamExercise):
 *   Output phases always follow the 7-phase catalog in order (ids: recon /
 *   weaponization / delivery / exploitation / lateral-movement / exfiltration /
 *   reporting) with tacticCodes arrays — recon TA0043, weaponization TA0001,
 *   delivery TA0001+TA0042, exploitation TA0002, lateral-movement TA0008,
 *   exfiltration TA0010, reporting []. Input phases are matched to the catalog
 *   by `id` (case-insensitive, last wins); phase status coerced to pending |
 *   active | completed (invalid -> pending). isOverdue when active AND due <
 *   clock, where due = exercise.endAt else phase.estimatedEndAt. Overall
 *   status precedence: completed (all phases completed) > paused (explicit
 *   exercise.status) > active (any active) > not-started. Verdict is read only
 *   when the exercise is completed (no-breach | contained | breached,
 *   case-insensitive), else "unknown". participantCounts buckets by role
 *   operator | observer | decision-maker (invalid -> observer), no total key.
 *   summary: totalPhases/completedPhases/activePhases/pendingPhases/
 *   overduePhases.
 *   QA FLAGS vs the task spec (conductor to reconcile): the spec named phases
 *   with `dueAt` inputs — the implementation uses estimatedEndAt/endAt; the
 *   spec's red-team/blue-team role wording is not the implementation's role
 *   catalog; `reporting` has no ATT&CK tactic (empty tacticCodes).
 *
 * Benchmark model (assessSecurityBenchmarks):
 *   Category catalog (benchmark + category fields): cis/ig1..ig3 then
 *   nist/govern..recover (benchmark aliases: nist-csf, nistcsf, csf). Status:
 *   pass | fail | not-applicable | na | n-a (case-insensitive). categoryScore
 *   = pass / (pass + fail) * 100 (1 decimal; n/a excluded from the
 *   denominator; 0 when no applicable controls). overallScore = passRate =
 *   total pass / total applicable * 100 (1 decimal). Rows with unknown
 *   benchmark / category / status are skipped. topGaps: failing controls
 *   sorted by category catalog order then controlId asc, capped 5, each with
 *   remediation from the stable keyword catalog (matched against controlId,
 *   generic fallback otherwise).
 *   QA FLAGS vs the task spec (conductor to reconcile): rows carry
 *   benchmark+category+status (not a combined "cis-ig1" benchmark token /
 *   `result` field), and the remediation keyword match runs over controlId
 *   rather than a control title.
 *
 * Scan-coverage model (trackScanCoverage):
 *   Class catalog (input field assetClass): external-ip / internal-host /
 *   web-app / api / cloud-asset; unknown classes are filtered. Effective due =
 *   dueAt (when present) else lastScanAt + scanFrequencyHours; an asset is in
 *   SLA when due >= now (boundary inclusive); rows without any timing are
 *   filtered. coverageRate = covered/total*100 (1 decimal, 0 on empty). Each
 *   asset is enriched with inSla / isOverdue / daysOverdue = floor(whole days
 *   past due, signed: positive when overdue, <= 0 when still in SLA). byClass
 *   is an ARRAY of per-class rollups in catalog order; assets are sorted
 *   class order, name asc, id asc.
 *   QA FLAGS vs the task spec (conductor to reconcile): the spec said input
 *   field `class` and an object-shaped byClass; the implementation uses
 *   assetClass and an array of rollups, and dueAt OVERRIDES the scan-derived
 *   due (precedence, not the OR-combination the spec text suggested).
 */

const NOW = new Date("2026-08-19T00:00:00.000Z");
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** ISO string for a fixed clock offset. */
const iso = (msOffset: number) => new Date(NOW.getTime() + msOffset).toISOString();

import {
  planPenetrationTest,
  runRedTeamExercise,
  assessSecurityBenchmarks,
  trackScanCoverage,
  EMPTY_PEN_TEST_PLAN,
  EMPTY_RED_TEAM_EXERCISE,
  EMPTY_BENCHMARK_ASSESSMENT,
  EMPTY_SCAN_COVERAGE,
} from "../nis2/securityTesting";

/* ================================================================== */
/* planPenetrationTest                                                 */
/* ================================================================== */

/** Minimal pen-test row factory (defaults keep the row valid & non-overdue). */
const planRow = (over: Record<string, unknown> = {}): any => ({
  id: 1,
  testType: "external",
  status: "scheduled",
  scheduledDate: iso(-10 * DAY_MS),
  riskTier: "medium",
  lastCompletedAt: iso(-200 * DAY_MS),
  ...over,
});

describe("planPenetrationTest — empty / malformed input yields the zeroed safe shape", () => {
  it("returns EMPTY_PEN_TEST_PLAN for undefined / null / non-array input", () => {
    expect(planPenetrationTest(undefined)).toEqual(EMPTY_PEN_TEST_PLAN);
    expect(planPenetrationTest(null)).toEqual(EMPTY_PEN_TEST_PLAN);
    expect(planPenetrationTest(42 as never)).toEqual(EMPTY_PEN_TEST_PLAN);
    expect(planPenetrationTest("nope" as never)).toEqual(EMPTY_PEN_TEST_PLAN);
    expect(planPenetrationTest({} as never)).toEqual(EMPTY_PEN_TEST_PLAN);
  });

  it("returns a zeroed shape for an empty array", () => {
    const result = planPenetrationTest([], { now: NOW });
    expect(result.total).toBe(0);
    expect(result.overdueCount).toBe(0);
    expect(result.tests).toEqual([]);
    expect(result.overdueTests).toEqual([]);
    expect(Object.values(result.countsByStatus).every((count) => count === 0)).toBe(true);
    expect(Object.values(result.countsByType).every((count) => count === 0)).toBe(true);
  });

  it("never throws and filters non-object rows", () => {
    const result = planPenetrationTest([null, 42, "x", true] as never, { now: NOW });
    expect(result.total).toBe(0);
    expect(result.tests).toEqual([]);
  });
});

describe("planPenetrationTest — type & status buckets", () => {
  it("maps every catalog type to its kebab->camel bucket", () => {
    const types = [
      "external",
      "internal",
      "web-app",
      "api",
      "mobile",
      "wireless",
      "social-engineering",
      "physical",
      "red-team",
    ];
    const result = planPenetrationTest(
      types.map((testType, i) => planRow({ id: i + 1, testType, scheduledDate: iso(-i * DAY_MS) })),
      { now: NOW }
    );
    expect(result.total).toBe(9);
    expect(result.countsByType).toMatchObject({
      external: 1,
      internal: 1,
      webApp: 1,
      api: 1,
      mobile: 1,
      wireless: 1,
      socialEngineering: 1,
      physical: 1,
      redTeam: 1,
    });
  });

  it("coerces status case-insensitively and buckets unknown statuses", () => {
    const result = planPenetrationTest(
      [
        planRow({ id: 1, status: "DRAFT" }),
        planRow({ id: 2, status: "SCHEDULED" }),
        planRow({ id: 3, status: "in_progress" }),
        planRow({ id: 4, status: "In_Progress" }),
        planRow({ id: 5, status: "completed" }),
        planRow({ id: 6, status: "REPORTED" }),
        planRow({ id: 7, status: "bogus" }),
      ],
      { now: NOW }
    );
    expect(result.total).toBe(7);
    expect(result.countsByStatus).toMatchObject({
      draft: 1,
      scheduled: 1,
      inProgress: 2,
      completed: 1,
      reported: 1,
      unknown: 1,
    });
  });

  it("coerces non-string enum fields into the unknown buckets without throwing", () => {
    const result = planPenetrationTest(
      [planRow({ id: 1, testType: 42 as never, status: null as never }), planRow({ id: 2 })],
      { now: NOW }
    );
    expect(result.total).toBe(2);
    expect(result.countsByType.unknown).toBe(1);
    expect(result.countsByStatus.unknown).toBe(1);
  });
});

describe("planPenetrationTest — overdue windows", () => {
  it("flags scheduled tests overdue only when scheduledDate + 336h < now (strict boundary)", () => {
    const result = planPenetrationTest(
      [
        planRow({ id: 1, status: "scheduled", scheduledDate: iso(-335 * HOUR_MS) }), // 335h -> not overdue
        planRow({ id: 2, status: "scheduled", scheduledDate: iso(-336 * HOUR_MS) }), // exactly 336h -> not overdue
        planRow({ id: 3, status: "scheduled", scheduledDate: iso(-337 * HOUR_MS) }), // 337h -> overdue
      ],
      { now: NOW }
    );
    expect(result.overdueCount).toBe(1);
    expect(result.overdueTests.map((t) => t.id)).toEqual([3]);
  });

  it("honors a per-test windowHours override", () => {
    const result = planPenetrationTest(
      [
        planRow({ id: 1, scheduledDate: iso(-25 * HOUR_MS), windowHours: 24 }), // 25h > 24h -> overdue
        planRow({ id: 2, scheduledDate: iso(-23 * HOUR_MS), windowHours: 24 }), // 23h < 24h -> not
      ],
      { now: NOW }
    );
    expect(result.overdueCount).toBe(1);
    expect(result.overdueTests.map((t) => t.id)).toEqual([1]);
  });

  it("only scheduled|in_progress tests can ever be overdue", () => {
    const result = planPenetrationTest(
      [
        planRow({ id: 1, status: "draft", scheduledDate: iso(-100 * DAY_MS) }),
        planRow({ id: 2, status: "in_progress", scheduledDate: iso(-100 * DAY_MS) }),
        planRow({ id: 3, status: "completed", scheduledDate: iso(-100 * DAY_MS) }),
        planRow({ id: 4, status: "reported", scheduledDate: iso(-100 * DAY_MS) }),
      ],
      { now: NOW }
    );
    expect(result.overdueCount).toBe(1);
    expect(result.overdueTests.map((t) => t.id)).toEqual([2]);
  });

  it("treats tests without a scheduledDate as never overdue", () => {
    const result = planPenetrationTest(
      [
        planRow({ id: 1, status: "scheduled", scheduledDate: undefined }),
        planRow({ id: 2, status: "in_progress", scheduledDate: null as never }),
      ],
      { now: NOW }
    );
    expect(result.overdueCount).toBe(0);
    expect(result.tests).toHaveLength(2);
  });
});

describe("planPenetrationTest — risk-tier frequency mapping and nextDueDate math", () => {
  const BASE = iso(-100 * DAY_MS);

  it("maps critical risk tier to a 91-day (quarterly) cadence from lastCompletedAt", () => {
    const result = planPenetrationTest([planRow({ id: 1, riskTier: "critical", lastCompletedAt: BASE })], {
      now: NOW,
    });
    expect(result.tests[0].frequency).toBe("quarterly");
    expect(result.tests[0].nextDueDate).toBe(iso((-100 + 91) * DAY_MS));
  });

  it("maps high risk tier to a 182-day (semi-annual) cadence from lastCompletedAt", () => {
    const result = planPenetrationTest([planRow({ id: 1, riskTier: "high", lastCompletedAt: BASE })], {
      now: NOW,
    });
    expect(result.tests[0].frequency).toBe("semi-annual");
    expect(result.tests[0].nextDueDate).toBe(iso((-100 + 182) * DAY_MS));
  });

  it("maps medium risk tier to a 365-day (annual) cadence from lastCompletedAt", () => {
    const result = planPenetrationTest([planRow({ id: 1, riskTier: "medium", lastCompletedAt: BASE })], {
      now: NOW,
    });
    expect(result.tests[0].frequency).toBe("annual");
    expect(result.tests[0].nextDueDate).toBe(iso((-100 + 365) * DAY_MS));
  });

  it("maps low/info risk tiers to a 730-day (biennial) cadence from lastCompletedAt", () => {
    const result = planPenetrationTest(
      [
        planRow({ id: 1, riskTier: "low", lastCompletedAt: BASE }),
        planRow({ id: 2, riskTier: "info", lastCompletedAt: BASE }),
      ],
      { now: NOW }
    );
    expect(result.tests[0].frequency).toBe("biennial");
    expect(result.tests[1].frequency).toBe("biennial");
    expect(result.tests[0].nextDueDate).toBe(iso((-100 + 730) * DAY_MS));
    expect(result.tests[1].nextDueDate).toBe(iso((-100 + 730) * DAY_MS));
  });

  it("falls back to scheduledDate when lastCompletedAt is missing", () => {
    const result = planPenetrationTest(
      [planRow({ id: 1, riskTier: "critical", scheduledDate: iso(-10 * DAY_MS), lastCompletedAt: undefined })],
      { now: NOW }
    );
    expect(result.tests[0].nextDueDate).toBe(iso((-10 + 91) * DAY_MS));
  });

  it("coerces riskTier case-insensitively and falls back to annual for unknown tiers", () => {
    const result = planPenetrationTest(
      [
        planRow({ id: 1, riskTier: "CRITICAL", lastCompletedAt: BASE }),
        planRow({ id: 2, riskTier: "bogus", lastCompletedAt: BASE }),
      ],
      { now: NOW }
    );
    expect(result.tests[0].frequency).toBe("quarterly");
    expect(result.tests[0].nextDueDate).toBe(iso((-100 + 91) * DAY_MS));
    expect(result.tests[1].frequency).toBe("annual");
    expect(result.tests[1].nextDueDate).toBe(iso((-100 + 365) * DAY_MS));
  });
});

describe("planPenetrationTest — sorting, key order and determinism", () => {
  it("sorts tests by status asc, test type asc, then id asc", () => {
    const result = planPenetrationTest(
      [
        planRow({ id: 3, status: "draft", testType: "external" }),
        planRow({ id: 1, status: "scheduled", testType: "external" }),
        planRow({ id: 2, status: "scheduled", testType: "api" }),
        planRow({ id: 4, status: "completed", testType: "external" }),
      ],
      { now: NOW }
    );
    // draft(0) < scheduled(1) < completed(3); within scheduled external(0) < api(3)
    expect(result.tests.map((t) => t.id)).toEqual([3, 1, 2, 4]);
  });

  it("sorts overdueTests by scheduledDate asc then id asc", () => {
    const result = planPenetrationTest(
      [
        // All three are overdue under the default 336h window (date + 14d < clock):
        // b/a share a date (-15d) -> id tie-break; c is earliest (-20d).
        planRow({ id: "b", scheduledDate: iso(-15 * DAY_MS) }),
        planRow({ id: "a", scheduledDate: iso(-15 * DAY_MS) }),
        planRow({ id: "c", scheduledDate: iso(-20 * DAY_MS) }),
      ],
      { now: NOW }
    );
    expect(result.overdueTests.map((t) => t.id)).toEqual(["c", "a", "b"]);
  });

  it("emits countsByStatus / countsByType keys in deterministic catalog order (unknown last)", () => {
    const result = planPenetrationTest([planRow({ id: 1 })], { now: NOW });
    expect(Object.keys(result.countsByStatus)).toEqual([
      "draft",
      "scheduled",
      "inProgress",
      "completed",
      "reported",
      "unknown",
    ]);
    expect(Object.keys(result.countsByType)).toEqual([
      "external",
      "internal",
      "webApp",
      "api",
      "mobile",
      "wireless",
      "socialEngineering",
      "physical",
      "redTeam",
      "unknown",
    ]);
  });

  it("is deterministic: same input twice yields deep-equal output", () => {
    const input = [
      planRow({ id: 2, testType: "web-app", status: "in_progress", scheduledDate: iso(-30 * DAY_MS), riskTier: "critical" }),
      planRow({ id: 1, testType: "external", status: "scheduled", scheduledDate: iso(-5 * DAY_MS) }),
      planRow({ id: "x", testType: "bogus", status: "bogus" }),
    ];
    expect(planPenetrationTest(input, { now: NOW })).toEqual(planPenetrationTest(input, { now: NOW }));
  });
});

describe("planPenetrationTest — clock injection", () => {
  const OVERDUE_ROWS = () => [planRow({ id: 1, scheduledDate: iso(-337 * HOUR_MS) })];

  it("honors opts.now as an ISO string, epoch number and Date", () => {
    expect(planPenetrationTest(OVERDUE_ROWS(), { now: NOW.toISOString() }).overdueCount).toBe(1);
    expect(planPenetrationTest(OVERDUE_ROWS(), { now: NOW.getTime() }).overdueCount).toBe(1);
    expect(planPenetrationTest(OVERDUE_ROWS(), { now: NOW }).overdueCount).toBe(1);
  });

  it("honors opts.clock factory and tolerates a throwing clock factory", () => {
    expect(planPenetrationTest(OVERDUE_ROWS(), { clock: () => NOW }).overdueCount).toBe(1);
    const ancient = [planRow({ id: 1, scheduledDate: iso(-1000 * DAY_MS) })];
    const result = planPenetrationTest(ancient, {
      clock: () => {
        throw new Error("boom");
      },
    });
    expect(result.total).toBe(1);
    expect(result.overdueCount).toBe(1); // real-clock fallback still sees it overdue
  });
});

/* ================================================================== */
/* runRedTeamExercise                                                  */
/* ================================================================== */

/** Minimal phase factory — phases are matched to the catalog by `id`. */
const phase = (over: Record<string, unknown> = {}): any => ({ id: "recon", status: "pending", estimatedEndAt: null, ...over });

const PHASE_CATALOG_IDS = [
  "recon",
  "weaponization",
  "delivery",
  "exploitation",
  "lateral-movement",
  "exfiltration",
  "reporting",
];

const ALL_COMPLETED_PHASES = PHASE_CATALOG_IDS.map((id) => phase({ id, status: "completed" }));

describe("runRedTeamExercise — empty / malformed input yields the safe shape", () => {
  it("returns EMPTY_RED_TEAM_EXERCISE for undefined / null / non-object input", () => {
    expect(runRedTeamExercise(undefined)).toEqual(EMPTY_RED_TEAM_EXERCISE);
    expect(runRedTeamExercise(null)).toEqual(EMPTY_RED_TEAM_EXERCISE);
    expect(runRedTeamExercise(42 as never)).toEqual(EMPTY_RED_TEAM_EXERCISE);
    expect(runRedTeamExercise("x" as never)).toEqual(EMPTY_RED_TEAM_EXERCISE);
    expect(EMPTY_RED_TEAM_EXERCISE.phases).toHaveLength(7);
    expect(EMPTY_RED_TEAM_EXERCISE.participantCounts).toEqual({ operator: 0, observer: 0, decisionMaker: 0 });
  });

  it("never throws on malformed phases / participants (catalog defaults are used)", () => {
    const result = runRedTeamExercise({ phases: "nope", participants: 42 } as never, { now: NOW });
    expect(result.phases).toHaveLength(7);
    expect(result.status).toBe("not-started");
    expect(result.participants).toEqual([]);
  });
});

describe("runRedTeamExercise — phase catalog and tactics", () => {
  it("emits the 7-phase catalog in exact order, all pending by default", () => {
    const result = runRedTeamExercise({});
    expect(result.phases.map((p) => p.id)).toEqual(PHASE_CATALOG_IDS);
    expect(result.phases.every((p) => p.status === "pending")).toBe(true);
    // display names come from the catalog when no per-phase name is given
    expect(result.phases[0].name).toBe("Reconnaissance");
    expect(result.phases[6].name).toBe("Reporting");
  });

  it("attaches the correct ATT&CK tactic code arrays", () => {
    const result = runRedTeamExercise({});
    const byId = Object.fromEntries(result.phases.map((p) => [p.id, p]));
    expect(byId.recon.tacticCodes).toEqual(["TA0043"]);
    expect(byId.weaponization.tacticCodes).toEqual(["TA0001"]);
    expect(byId.exploitation.tacticCodes).toEqual(["TA0002"]);
    expect(byId["lateral-movement"].tacticCodes).toEqual(["TA0008"]);
    expect(byId.exfiltration.tacticCodes).toEqual(["TA0010"]);
    expect(byId.delivery.tacticCodes).toEqual(["TA0001", "TA0042"]);
  });

  it("emits an empty tactic code list for the reporting phase", () => {
    const result = runRedTeamExercise({});
    const reporting = result.phases.find((p) => p.id === "reporting")!;
    expect(reporting.tacticCodes).toEqual([]);
  });

  it("coerces phase status case-insensitively and falls back to pending for unknown values", () => {
    const result = runRedTeamExercise({
      phases: [
        phase({ id: "recon", status: "ACTIVE" }),
        phase({ id: "exploitation", status: "Completed" }),
        phase({ id: "delivery", status: "bogus" }),
      ],
    });
    const byId = Object.fromEntries(result.phases.map((p) => [p.id, p]));
    expect(byId.recon.status).toBe("active");
    expect(byId.exploitation.status).toBe("completed");
    expect(byId.delivery.status).toBe("pending");
  });

  it("flags a phase overdue only when active AND due < now (strict boundary)", () => {
    const result = runRedTeamExercise(
      {
        phases: [
          phase({ id: "recon", status: "active", estimatedEndAt: iso(-1 * HOUR_MS) }), // overdue
          phase({ id: "exploitation", status: "active", estimatedEndAt: iso(0) }), // exactly now -> not overdue
          phase({ id: "delivery", status: "active", estimatedEndAt: iso(2 * HOUR_MS) }), // not overdue
          phase({ id: "lateral-movement", status: "pending", estimatedEndAt: iso(-1 * HOUR_MS) }), // pending -> never
          phase({ id: "exfiltration", status: "completed", estimatedEndAt: iso(-1 * HOUR_MS) }), // completed -> never
        ],
      },
      { now: NOW }
    );
    const byId = Object.fromEntries(result.phases.map((p) => [p.id, p]));
    expect(byId.recon.isOverdue).toBe(true);
    expect(byId.exploitation.isOverdue).toBe(false);
    expect(byId.delivery.isOverdue).toBe(false);
    expect(byId["lateral-movement"].isOverdue).toBe(false);
    expect(byId.exfiltration.isOverdue).toBe(false);
  });

  it("uses the exercise endAt as the phase due time when estimatedEndAt is missing", () => {
    const result = runRedTeamExercise(
      { endAt: iso(-1 * HOUR_MS), phases: [{ id: "recon", status: "active" }] },
      { now: NOW }
    );
    expect(result.phases.find((p) => p.id === "recon")!.isOverdue).toBe(true);
  });
});

describe("runRedTeamExercise — overall status and verdict", () => {
  it("reports not-started when no phase is active or completed", () => {
    expect(runRedTeamExercise({}).status).toBe("not-started");
  });

  it("reports active when any phase is active", () => {
    const result = runRedTeamExercise({
      phases: [
        phase({ id: "recon", status: "completed" }),
        phase({ id: "weaponization", status: "active" }),
      ],
    });
    expect(result.status).toBe("active");
  });

  it("reports completed only when every phase is completed (completed beats paused)", () => {
    const result = runRedTeamExercise({
      status: "paused",
      phases: ALL_COMPLETED_PHASES,
    });
    expect(result.status).toBe("completed");
  });

  it("honors an explicit paused status (case-insensitive) and paused beats active", () => {
    expect(runRedTeamExercise({ status: "paused" }).status).toBe("paused");
    expect(runRedTeamExercise({ status: "PAUSED" }).status).toBe("paused");
    const activeWithPause = runRedTeamExercise({
      status: "paused",
      phases: [phase({ id: "recon", status: "active" })],
    });
    expect(activeWithPause.status).toBe("paused");
  });

  it("defaults the verdict to unknown when the exercise is not completed", () => {
    const result = runRedTeamExercise({
      phases: [phase({ id: "recon", status: "active" })],
    });
    expect(result.verdict).toBe("unknown");
  });

  it("honors explicit verdicts (no-breach / contained / breached) once completed, case-insensitively", () => {
    expect(runRedTeamExercise({ verdict: "no-breach", phases: ALL_COMPLETED_PHASES }).verdict).toBe("no-breach");
    expect(runRedTeamExercise({ verdict: "contained", phases: ALL_COMPLETED_PHASES }).verdict).toBe("contained");
    expect(runRedTeamExercise({ verdict: "BREACHED", phases: ALL_COMPLETED_PHASES }).verdict).toBe("breached");
  });

  it("never emits an out-of-catalog verdict when completed without an explicit verdict", () => {
    const result = runRedTeamExercise({ phases: ALL_COMPLETED_PHASES });
    expect(["no-breach", "contained", "breached", "unknown"]).toContain(result.verdict);
  });
});

describe("runRedTeamExercise — participant counts and summary", () => {
  it("counts participants by role (case-insensitive) with observer as the fallback bucket", () => {
    const result = runRedTeamExercise({
      participants: [
        { id: 1, role: "operator" },
        { id: 2, role: "OPERATOR" }, // case-insensitive -> same bucket
        { id: 3, role: "observer" },
        { id: 4, role: "decision-maker" },
        { id: 5, role: "decision_maker" }, // underscore alias -> decision-maker
        { id: 6, role: "janitor" }, // unknown role -> observer fallback
        { id: 7 }, // missing role -> observer fallback
      ],
    });
    expect(result.participantCounts).toEqual({ operator: 2, observer: 3, decisionMaker: 2 });
    expect(result.participants).toHaveLength(7);
  });

  it("reports phase counts in the summary", () => {
    const result = runRedTeamExercise({
      phases: [
        phase({ id: "recon", status: "completed" }),
        phase({ id: "weaponization", status: "completed" }),
        phase({ id: "delivery", status: "active", estimatedEndAt: iso(-1 * HOUR_MS) }), // overdue too
      ],
    });
    expect(result.summary).toEqual({
      totalPhases: 7,
      completedPhases: 2,
      activePhases: 1,
      pendingPhases: 4,
      overduePhases: 1,
    });
  });

  it("is deterministic: same input twice yields deep-equal output", () => {
    const input = {
      status: "paused",
      phases: [
        phase({ id: "recon", status: "active", estimatedEndAt: iso(-2 * HOUR_MS) }),
        phase({ id: "exfiltration", status: "completed" }),
      ],
      participants: [
        { id: 1, role: "operator" },
        { id: 2, role: "bogus" },
      ],
    };
    expect(runRedTeamExercise(input, { now: NOW })).toEqual(runRedTeamExercise(input, { now: NOW }));
  });
});

describe("runRedTeamExercise — clock injection", () => {
  const OVERDUE_INPUT = () => ({
    phases: [phase({ id: "recon", status: "active", estimatedEndAt: iso(-1 * HOUR_MS) })],
  });

  it("honors opts.now as an ISO string, epoch number and Date", () => {
    expect(runRedTeamExercise(OVERDUE_INPUT(), { now: NOW.toISOString() }).phases[0].isOverdue).toBe(true);
    expect(runRedTeamExercise(OVERDUE_INPUT(), { now: NOW.getTime() }).phases[0].isOverdue).toBe(true);
    expect(runRedTeamExercise(OVERDUE_INPUT(), { now: NOW }).phases[0].isOverdue).toBe(true);
  });

  it("honors opts.clock factory and tolerates a throwing clock factory", () => {
    expect(runRedTeamExercise(OVERDUE_INPUT(), { clock: () => NOW }).phases[0].isOverdue).toBe(true);
    const ancient = { phases: [phase({ id: "recon", status: "active", estimatedEndAt: iso(-1000 * DAY_MS) })] };
    expect(
      runRedTeamExercise(ancient, {
        clock: () => {
          throw new Error("boom");
        },
      }).phases[0].isOverdue
    ).toBe(true);
  });
});

/* ================================================================== */
/* assessSecurityBenchmarks                                            */
/* ================================================================== */

/** Minimal benchmark assessment row factory. */
const bench = (over: Record<string, unknown> = {}): any => ({
  benchmark: "cis",
  category: "ig1",
  controlId: "1.1",
  controlName: "Control description",
  status: "pass",
  ...over,
});

const CATEGORY_COMBINED_ORDER = [
  "cis-ig1",
  "cis-ig2",
  "cis-ig3",
  "nist-govern",
  "nist-identify",
  "nist-protect",
  "nist-detect",
  "nist-respond",
  "nist-recover",
];

describe("assessSecurityBenchmarks — empty / malformed input yields the zeroed safe shape", () => {
  it("returns EMPTY_BENCHMARK_ASSESSMENT for undefined / null / non-array input", () => {
    expect(assessSecurityBenchmarks(undefined)).toEqual(EMPTY_BENCHMARK_ASSESSMENT);
    expect(assessSecurityBenchmarks(null)).toEqual(EMPTY_BENCHMARK_ASSESSMENT);
    expect(assessSecurityBenchmarks(42 as never)).toEqual(EMPTY_BENCHMARK_ASSESSMENT);
    expect(assessSecurityBenchmarks("x" as never)).toEqual(EMPTY_BENCHMARK_ASSESSMENT);
    expect(assessSecurityBenchmarks({} as never)).toEqual(EMPTY_BENCHMARK_ASSESSMENT);
  });

  it("returns a zeroed shape for an empty array (all 9 category buckets at score 0)", () => {
    const result = assessSecurityBenchmarks([]);
    expect(result.totalApplicable).toBe(0);
    expect(result.totalPass).toBe(0);
    expect(result.totalFail).toBe(0);
    expect(result.totalNa).toBe(0);
    expect(result.overallScore).toBe(0);
    expect(result.passRate).toBe(0);
    expect(result.categories).toHaveLength(9);
    expect(result.categories.every((c) => c.categoryScore === 0 && c.pass === 0 && c.fail === 0)).toBe(true);
    expect(result.topGaps).toEqual([]);
  });

  it("never throws on garbage rows (unknown benchmark / category / status are skipped)", () => {
    const result = assessSecurityBenchmarks([null, 42, {}, { benchmark: "nope" }] as never);
    expect(result.totalApplicable).toBe(0);
    expect(result.overallScore).toBe(0);
    expect(result.categories).toHaveLength(9);
    expect(result.topGaps).toEqual([]);
  });
});

describe("assessSecurityBenchmarks — score math and n/a handling", () => {
  it("computes categoryScore as pass/(pass+fail)*100 rounded to 1 decimal", () => {
    const result = assessSecurityBenchmarks([
      bench({ controlId: "1.1", status: "pass" }),
      bench({ controlId: "1.2", status: "pass" }),
      bench({ controlId: "1.3", status: "fail" }),
    ]);
    const ig1 = result.categories.find((c) => c.category === "ig1")!;
    expect(ig1.pass).toBe(2);
    expect(ig1.fail).toBe(1);
    expect(ig1.applicable).toBe(3);
    expect(ig1.categoryScore).toBe(66.7); // 2/3*100 = 66.666.. -> 66.7
  });

  it("excludes n/a results from the denominator and totalApplicable", () => {
    const result = assessSecurityBenchmarks([
      bench({ benchmark: "cis", category: "ig2", controlId: "2.1", status: "pass" }),
      bench({ benchmark: "cis", category: "ig2", controlId: "2.2", status: "n/a" }),
      bench({ benchmark: "cis", category: "ig2", controlId: "2.3", status: "n/a" }),
    ]);
    const ig2 = result.categories.find((c) => c.category === "ig2")!;
    expect(ig2.pass).toBe(1);
    expect(ig2.fail).toBe(0);
    expect(ig2.na).toBe(2);
    expect(ig2.applicable).toBe(1);
    expect(ig2.categoryScore).toBe(100);
    expect(result.totalApplicable).toBe(1);
    expect(result.totalNa).toBe(2);
    expect(result.overallScore).toBe(100);
    expect(result.passRate).toBe(100);
  });

  it("computes overallScore and passRate over all applicable controls (no n/a)", () => {
    const result = assessSecurityBenchmarks([
      bench({ controlId: "1.1", status: "pass" }),
      bench({ controlId: "1.2", status: "fail" }),
      bench({ benchmark: "nist", category: "protect", controlId: "PR.AC-1", status: "pass" }),
      bench({ benchmark: "nist", category: "protect", controlId: "PR.AC-2", status: "fail" }),
      bench({ benchmark: "nist", category: "protect", controlId: "PR.AC-3", status: "fail" }),
    ]);
    expect(result.totalApplicable).toBe(5);
    expect(result.totalPass).toBe(2);
    expect(result.totalFail).toBe(3);
    expect(result.overallScore).toBe(40); // 2/5
    expect(result.passRate).toBe(40);
  });

  it("coerces status values case-insensitively", () => {
    const result = assessSecurityBenchmarks([
      bench({ controlId: "1.1", status: "PASS" }),
      bench({ controlId: "1.2", status: "Fail" }),
      bench({ controlId: "1.3", status: "N/A" }), // -> not-applicable
    ]);
    const ig1 = result.categories.find((c) => c.category === "ig1")!;
    expect(ig1.pass).toBe(1);
    expect(ig1.fail).toBe(1);
    expect(ig1.na).toBe(1);
    expect(ig1.categoryScore).toBe(50);
  });

  it("accepts nist benchmark aliases (nist-csf / nistcsf / csf)", () => {
    const result = assessSecurityBenchmarks([
      bench({ benchmark: "csf", category: "govern", controlId: "GV.RM-1", status: "pass" }),
      bench({ benchmark: "NIST-CSF", category: "protect", controlId: "PR.AC-1", status: "pass" }),
    ]);
    expect(result.totalApplicable).toBe(2);
    expect(result.overallScore).toBe(100);
  });
});

describe("assessSecurityBenchmarks — category catalog, gaps and remediation", () => {
  it("emits the 9-category catalog (cis IG1-IG3 then nist) in deterministic order", () => {
    const result = assessSecurityBenchmarks([bench({ controlId: "1.1", status: "pass" })]);
    expect(result.categories.map((c) => `${c.benchmark}-${c.category}`)).toEqual(CATEGORY_COMBINED_ORDER);
  });

  it("sorts topGaps by controlId asc within a category", () => {
    const result = assessSecurityBenchmarks([
      bench({ controlId: "1.3", status: "fail", controlName: "Alpha control" }),
      bench({ controlId: "1.1", status: "fail", controlName: "Beta control" }),
      bench({ controlId: "1.2", status: "fail", controlName: "Gamma control" }),
    ]);
    expect(result.topGaps.map((g) => g.controlId)).toEqual(["1.1", "1.2", "1.3"]);
    expect(result.topGaps[0]).toMatchObject({ benchmark: "cis", category: "ig1" });
  });

  it("orders topGaps by category catalog order first (cis before nist, govern before protect)", () => {
    const result = assessSecurityBenchmarks([
      bench({ benchmark: "nist", category: "protect", controlId: "PR.AC-1", status: "fail" }),
      bench({ controlId: "1.5", status: "fail" }),
      bench({ benchmark: "nist", category: "govern", controlId: "GV.RM-1", status: "fail" }),
    ]);
    expect(result.topGaps.map((g) => `${g.benchmark}-${g.category}`)).toEqual([
      "cis-ig1",
      "nist-govern",
      "nist-protect",
    ]);
  });

  it("caps topGaps at 5 and keeps the earliest controlIds", () => {
    const fails = Array.from({ length: 7 }, (_, i) =>
      bench({ benchmark: "cis", category: "ig3", controlId: `3.${i + 1}`, status: "fail" })
    );
    const result = assessSecurityBenchmarks(fails);
    expect(result.topGaps).toHaveLength(5);
    expect(result.topGaps.map((g) => g.controlId)).toEqual(["3.1", "3.2", "3.3", "3.4", "3.5"]);
  });

  it("attaches a remediation to every gap (keyword match vs generic fallback)", () => {
    const result = assessSecurityBenchmarks([
      bench({ controlId: "3.1-patch-management", status: "fail", controlName: "Patch management" }), // keyword "patch"
      bench({ controlId: "1.1", status: "fail", controlName: "Inventory" }), // no keyword -> generic
    ]);
    expect(result.topGaps).toHaveLength(2);
    expect(result.topGaps.every((g) => typeof g.remediation === "string" && g.remediation.length > 0)).toBe(true);
    // a keyword-matched remediation should differ from the generic fallback
    expect(result.topGaps[0].remediation).not.toBe(result.topGaps[1].remediation);
  });

  it("skips rows with an unknown benchmark, category or status", () => {
    const result = assessSecurityBenchmarks([
      bench({ benchmark: "bogus", controlId: "1.1", status: "fail" }),
      bench({ benchmark: "cis", category: "bogus", controlId: "1.2", status: "fail" }),
      bench({ benchmark: "cis", category: "ig1", controlId: "1.3", status: "maybe" }),
      bench({ benchmark: "nist", category: "govern", controlId: "GV.RM-1", status: "pass" }),
    ]);
    expect(result.totalApplicable).toBe(1);
    expect(result.overallScore).toBe(100);
    const govern = result.categories.find((c) => c.category === "govern")!;
    expect(govern.pass).toBe(1);
    expect(govern.fail).toBe(0);
  });

  it("is deterministic: same input twice yields deep-equal output", () => {
    const input = [
      bench({ controlId: "1.2", status: "fail", controlName: "Firewall configuration review" }),
      bench({ benchmark: "nist", category: "respond", controlId: "RS.RP-1", status: "pass" }),
      bench({ benchmark: "cis", category: "ig3", controlId: "3.1", status: "n/a" }),
      bench({ benchmark: "bogus", controlId: "9.9", status: "fail" }),
    ];
    expect(assessSecurityBenchmarks(input)).toEqual(assessSecurityBenchmarks(input));
  });
});

/* ================================================================== */
/* trackScanCoverage                                                   */
/* ================================================================== */

/** Minimal asset factory (defaults keep the asset comfortably in SLA). */
const asset = (over: Record<string, unknown> = {}): any => ({
  id: 1,
  assetName: "Asset",
  assetClass: "external-ip",
  lastScanAt: iso(-6 * HOUR_MS),
  scanFrequencyHours: 24,
  ...over,
});

describe("trackScanCoverage — empty / malformed input yields the zeroed safe shape", () => {
  it("returns EMPTY_SCAN_COVERAGE for undefined / null / non-array input", () => {
    expect(trackScanCoverage(undefined)).toEqual(EMPTY_SCAN_COVERAGE);
    expect(trackScanCoverage(null)).toEqual(EMPTY_SCAN_COVERAGE);
    expect(trackScanCoverage(42 as never)).toEqual(EMPTY_SCAN_COVERAGE);
    expect(trackScanCoverage("x" as never)).toEqual(EMPTY_SCAN_COVERAGE);
    expect(trackScanCoverage({} as never)).toEqual(EMPTY_SCAN_COVERAGE);
  });

  it("returns a zeroed shape for an empty array (coverageRate 0, 5 zeroed class rollups)", () => {
    const result = trackScanCoverage([], { now: NOW });
    expect(result.totalAssets).toBe(0);
    expect(result.coveredCount).toBe(0);
    expect(result.overdueCount).toBe(0);
    expect(result.coverageRate).toBe(0);
    expect(result.assets).toEqual([]);
    expect(result.byClass).toHaveLength(5);
    expect(result.byClass.every((c) => c.total === 0 && c.coverageRate === 0)).toBe(true);
  });

  it("never throws and filters garbage rows (null / non-objects / unknown class)", () => {
    const result = trackScanCoverage([null, 42, "x", {}, { assetClass: "bogus" }] as never, { now: NOW });
    expect(result.totalAssets).toBe(0);
    expect(result.assets).toEqual([]);
  });
});

describe("trackScanCoverage — SLA boundary and dueAt override", () => {
  it("treats an asset as in SLA at the exact deadline boundary (due >= now)", () => {
    const result = trackScanCoverage(
      [asset({ id: 1, lastScanAt: iso(-24 * HOUR_MS), scanFrequencyHours: 24 })], // due == now
      { now: NOW }
    );
    expect(result.coveredCount).toBe(1);
    expect(result.overdueCount).toBe(0);
  });

  it("flags an asset overdue as soon as the deadline is in the past", () => {
    const result = trackScanCoverage(
      [asset({ id: 1, lastScanAt: iso(-25 * HOUR_MS), scanFrequencyHours: 24 })], // due 1h ago
      { now: NOW }
    );
    expect(result.coveredCount).toBe(0);
    expect(result.overdueCount).toBe(1);
  });

  it("lets an explicit dueAt override the scan-derived due (precedence, not OR)", () => {
    const result = trackScanCoverage(
      [
        asset({ id: 1, lastScanAt: iso(-200 * DAY_MS), scanFrequencyHours: 24, dueAt: iso(5 * DAY_MS) }), // stale scan, future dueAt -> covered
        asset({ id: 2, lastScanAt: iso(-1 * HOUR_MS), scanFrequencyHours: 24, dueAt: iso(-5 * DAY_MS) }), // fresh scan, past dueAt -> OVERDUE (dueAt wins)
        asset({ id: 3, lastScanAt: iso(-200 * DAY_MS), scanFrequencyHours: 24, dueAt: iso(-5 * DAY_MS) }), // both stale -> overdue
      ],
      { now: NOW }
    );
    expect(result.coveredCount).toBe(1);
    expect(result.overdueCount).toBe(2);
  });
});

describe("trackScanCoverage — coverage rate, by-class rollups and enrichment", () => {
  it("computes coverageRate to 1 decimal (1 of 3 -> 33.3)", () => {
    const result = trackScanCoverage(
      [
        asset({ id: 1, lastScanAt: iso(-1 * HOUR_MS), scanFrequencyHours: 24 }),
        asset({ id: 2, lastScanAt: iso(-100 * DAY_MS), scanFrequencyHours: 24 }),
        asset({ id: 3, lastScanAt: iso(-100 * DAY_MS), scanFrequencyHours: 24 }),
      ],
      { now: NOW }
    );
    expect(result.totalAssets).toBe(3);
    expect(result.coveredCount).toBe(1);
    expect(result.overdueCount).toBe(2);
    expect(result.coverageRate).toBe(33.3);
  });

  it("emits byClass rollups in catalog order with per-class totals", () => {
    const classes = ["external-ip", "internal-host", "web-app", "api", "cloud-asset"];
    const result = trackScanCoverage(
      classes.map((assetClass, i) => asset({ id: i + 1, assetClass, lastScanAt: iso(-1 * HOUR_MS), scanFrequencyHours: 24 })),
      { now: NOW }
    );
    expect(result.byClass.map((c) => c.assetClass)).toEqual(classes);
    const externalIp = result.byClass.find((c) => c.assetClass === "external-ip")!;
    expect(externalIp).toMatchObject({ total: 1, covered: 1, overdue: 0, coverageRate: 100 });
    expect(result.totalAssets).toBe(5);
  });

  it("filters rows with an unknown asset class (no unknown bucket)", () => {
    const result = trackScanCoverage(
      [
        asset({ id: 1, assetClass: "bogus" }),
        asset({ id: 2, assetClass: "api", lastScanAt: iso(-1 * HOUR_MS), scanFrequencyHours: 24 }),
      ],
      { now: NOW }
    );
    expect(result.totalAssets).toBe(1);
    expect(result.assets.map((a) => a.id)).toEqual([2]);
  });

  it("sorts assets by class catalog order, then name asc, then id asc", () => {
    const result = trackScanCoverage(
      [
        asset({ id: 2, assetClass: "api", assetName: "zeta" }),
        asset({ id: 1, assetClass: "external-ip", assetName: "beta" }),
        asset({ id: 3, assetClass: "external-ip", assetName: "gamma" }),
        asset({ id: 4, assetClass: "external-ip", assetName: "alpha" }),
      ],
      { now: NOW }
    );
    expect(result.assets.map((a) => a.id)).toEqual([4, 1, 3, 2]);
  });

  it("enriches assets with daysOverdue floored to whole days (positive when overdue)", () => {
    const result = trackScanCoverage(
      [
        asset({ id: 1, lastScanAt: iso(-(24 * HOUR_MS + 1.9 * DAY_MS)), scanFrequencyHours: 24 }), // overdue by 1.9d -> 1
        asset({ id: 2, lastScanAt: iso(-(24 * HOUR_MS + 2 * DAY_MS)), scanFrequencyHours: 24 }), // overdue by 2d -> 2
      ],
      { now: NOW }
    );
    expect(result.assets.find((a) => a.id === 1)!.daysOverdue).toBe(1);
    expect(result.assets.find((a) => a.id === 2)!.daysOverdue).toBe(2);
    expect(result.assets.find((a) => a.id === 1)!.isOverdue).toBe(true);
  });

  it("keeps daysOverdue signed: in-SLA assets are <= 0", () => {
    const result = trackScanCoverage(
      [
        asset({ id: 1, lastScanAt: iso(-1 * HOUR_MS), scanFrequencyHours: 24 }), // due 23h ahead -> negative
        asset({ id: 2, lastScanAt: iso(-24 * HOUR_MS), scanFrequencyHours: 24 }), // due == now -> 0
      ],
      { now: NOW }
    );
    expect(result.assets.find((a) => a.id === 1)!.daysOverdue).toBeLessThan(0);
    expect(result.assets.find((a) => a.id === 2)!.daysOverdue).toBe(0);
    expect(result.assets.find((a) => a.id === 1)!.inSla).toBe(true);
  });

  it("never throws on rows with invalid scan dates (they are filtered or simply not covered)", () => {
    const result = trackScanCoverage(
      [
        null,
        { id: 1, assetClass: "external-ip", lastScanAt: "not-a-date", scanFrequencyHours: 24 }, // no usable timing -> filtered
        asset({ id: 2, lastScanAt: iso(-100 * DAY_MS), scanFrequencyHours: 24 }), // stale -> overdue
        asset({ id: 3, lastScanAt: iso(-1 * HOUR_MS), scanFrequencyHours: 24 }), // covered
      ] as never,
      { now: NOW }
    );
    expect(result.coveredCount).toBe(1);
    expect(result.overdueCount).toBe(1);
    expect(result.assets.some((a) => a.id === 3)).toBe(true);
  });

  it("is deterministic: same input twice yields deep-equal output", () => {
    const input = [
      asset({ id: 2, assetClass: "internal-host", lastScanAt: iso(-100 * DAY_MS), scanFrequencyHours: 24 }),
      asset({ id: 1, assetClass: "external-ip", lastScanAt: iso(-1 * HOUR_MS), scanFrequencyHours: 24 }),
      asset({ id: 3, assetClass: "cloud-asset", lastScanAt: iso(-30 * DAY_MS), scanFrequencyHours: 168 }),
    ];
    expect(trackScanCoverage(input, { now: NOW })).toEqual(trackScanCoverage(input, { now: NOW }));
  });
});

describe("trackScanCoverage — clock injection", () => {
  const OVERDUE_ASSET = () => [asset({ id: 1, lastScanAt: iso(-25 * HOUR_MS), scanFrequencyHours: 24 })];

  it("honors opts.now as an ISO string, epoch number and Date", () => {
    expect(trackScanCoverage(OVERDUE_ASSET(), { now: NOW.toISOString() }).overdueCount).toBe(1);
    expect(trackScanCoverage(OVERDUE_ASSET(), { now: NOW.getTime() }).overdueCount).toBe(1);
    expect(trackScanCoverage(OVERDUE_ASSET(), { now: NOW }).overdueCount).toBe(1);
  });

  it("honors opts.clock factory and tolerates a throwing clock factory", () => {
    expect(trackScanCoverage(OVERDUE_ASSET(), { clock: () => NOW }).overdueCount).toBe(1);
    const ancient = [asset({ id: 1, lastScanAt: iso(-1000 * DAY_MS), scanFrequencyHours: 24 })];
    expect(
      trackScanCoverage(ancient, {
        clock: () => {
          throw new Error("boom");
        },
      }).overdueCount
    ).toBe(1);
  });
});
