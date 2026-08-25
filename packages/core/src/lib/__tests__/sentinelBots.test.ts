import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Sentinel Bots (server/runtime/bots/*) — unit tests for the PURE parts
 * (QA build-cycle 38, Sentinel Bots / Agent Runtime Phase 1).
 *
 * Contract under test:
 *
 * 1. bots/types.ts — SCHEDULE_MIN_HOURS mapping used by the runtime's
 *    due-ness check: hourly → 1h, daily → 24h, weekly → 168h. Exact shape.
 *
 * 2. complianceSentinel.detectScoreDrop(previousScore, currentScore) — pure
 *    banding function:
 *      - either score null            → null (no observation)
 *      - drop < 5                     → null (exactly at boundaries: 4 null,
 *                                       5 flagged)
 *      - 5 <= drop <= 14              → severity "warning"
 *      - drop >= 15                   → severity "critical"
 *    Title carries both scores; dedupeKey is day-scoped so the same drop does
 *    not re-alert within one day; metadata echoes previous/current/drop.
 *
 * 3. SentinelBot contract — every bot in the roster exposes
 *    { id, name, moduleKey, defaultSchedule, description, observe() } with a
 *    defaultSchedule drawn from SCHEDULE_MIN_HOURS and module keys matching the
 *    autopilot_configs.modules jsonb flags the runtime reads.
 *
 * 4. Graceful degradation — observe() returns [] when getDb() yields null.
 *
 * The db module is mocked at the boundary (../../db style used by sibling
 * tests); bot modules also import the real drizzle schema, which is inert as
 * long as no query builder is driven.
 */

const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

// Resolves to packages/core/src/db — the same module every bot imports via
// "../../../db" from server/runtime/bots/.
vi.mock("../../db", () => ({
  getDb: dbMocks.getDb,
}));

vi.setConfig({ testTimeout: 60_000 });

import { SCHEDULE_MIN_HOURS } from "../../server/runtime/bots/types";
import type { SentinelBot } from "../../server/runtime/bots/types";
import { complianceSentinel } from "../../server/runtime/bots/complianceSentinel";
import { slaHound } from "../../server/runtime/bots/slaHound";
import {
  riskWatchdog,
  vulnerabilitySentinel,
  policySteward,
  bcGuardian,
  anomalySpotter,
} from "../../server/runtime/bots/roster";
// Real schema objects are used as table-identity keys when faking the db
// select chain below (same module the bots import via "../../../schema").
import { incidents, bcPlans, bcTrainingRecords } from "../../schema";
import { PgDialect } from "drizzle-orm/pg-core";

const ALL_BOTS: SentinelBot[] = [
  complianceSentinel,
  slaHound,
  riskWatchdog,
  vulnerabilitySentinel,
  policySteward,
  bcGuardian,
  anomalySpotter,
];

beforeEach(() => {
  dbMocks.getDb.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

// ── SCHEDULE_MIN_HOURS ───────────────────────────────────────────────────────

describe("sentinel bots — SCHEDULE_MIN_HOURS mapping", () => {
  it("maps hourly→1, daily→24, weekly→168 exactly", () => {
    expect(SCHEDULE_MIN_HOURS).toEqual({
      hourly: 1,
      daily: 24,
      weekly: 24 * 7,
    });
    expect(SCHEDULE_MIN_HOURS.weekly).toBe(168);
  });

  it("covers exactly the three defaultSchedule values any bot may declare", () => {
    const schedules = new Set(ALL_BOTS.map((b) => b.defaultSchedule));
    for (const schedule of schedules) {
      expect(
        SCHEDULE_MIN_HOURS[schedule],
        `defaultSchedule "${schedule}" must have a minimum-hours entry`
      ).toBeDefined();
    }
    expect([...schedules].every((s) => ["hourly", "daily", "weekly"].includes(s))).toBe(true);
  });
});

// ── complianceSentinel.detectScoreDrop — pure banding ────────────────────────

describe("sentinel bots — complianceSentinel.detectScoreDrop band boundaries", () => {
  beforeEach(() => {
    // Freeze the clock: dedupeKey embeds today's date.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-24T12:00:00.000Z"));
  });

  it.each([
    [80, 76], // drop 4 — largest silent drop
    [50, 46],
    [72, 71],
    [90, 90], // no change
    [60, 65], // improvement (negative drop)
  ])("returns null below the threshold (%d → %d)", (prev, curr) => {
    expect(complianceSentinel.detectScoreDrop(prev, curr)).toBeNull();
  });

  it("is exactly null at drop=4 and non-null at drop=5 (boundary)", () => {
    expect(complianceSentinel.detectScoreDrop(80, 76)).toBeNull(); // drop 4
    const at5 = complianceSentinel.detectScoreDrop(80, 75);
    expect(at5).not.toBeNull();
    expect(at5!.severity).toBe("warning");
  });

  it.each([
    [80, 75], // drop 5  — first warning
    [80, 70], // drop 10
    [80, 66], // drop 14 — largest warning
  ])("bands drops of 5..14 as warning (%d → %d)", (prev, curr) => {
    const obs = complianceSentinel.detectScoreDrop(prev, curr);
    expect(obs).not.toBeNull();
    expect(obs!.severity).toBe("warning");
  });

  it("is still warning at drop=14 and critical at drop=15 (boundary)", () => {
    expect(complianceSentinel.detectScoreDrop(80, 66)!.severity).toBe("warning"); // 14
    expect(complianceSentinel.detectScoreDrop(80, 65)!.severity).toBe("critical"); // 15
  });

  it.each([
    [80, 65], // drop 15 — first critical
    [100, 80], // drop 20
    [40, 0], // total collapse
  ])("bands drops >= 15 as critical (%d → %d)", (prev, curr) => {
    const obs = complianceSentinel.detectScoreDrop(prev, curr);
    expect(obs).not.toBeNull();
    expect(obs!.severity).toBe("critical");
  });

  it("returns null when either score is missing (first run / unavailable snapshot)", () => {
    expect(complianceSentinel.detectScoreDrop(null, 50)).toBeNull();
    expect(complianceSentinel.detectScoreDrop(50, null)).toBeNull();
    expect(complianceSentinel.detectScoreDrop(null, null)).toBeNull();
  });

  it("carries both scores in the title and echoes previous/current/drop in metadata", () => {
    const obs = complianceSentinel.detectScoreDrop(82, 63)!;
    expect(obs.title).toContain("82");
    expect(obs.title).toContain("63");
    expect(obs.metadata).toEqual({ previousScore: 82, currentScore: 63, drop: 19 });
    expect(obs.rationale).toContain("19");
    expect(obs.entityType).toBe("compliance_score");
    expect(obs.proposedAction).toMatchObject({ kind: "notify_only" });
  });

  it("scopes dedupeKey to the current UTC date so identical drops do not re-alert within a day", () => {
    const obs = complianceSentinel.detectScoreDrop(80, 60)!;
    const today = new Date("2026-08-24T12:00:00.000Z").toISOString().slice(0, 10);
    expect(obs.dedupeKey).toBe(`score-drop:${today}`);
  });

  it("is pure: never consults the database", () => {
    complianceSentinel.detectScoreDrop(90, 40);
    complianceSentinel.detectScoreDrop(null, null);
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });
});

// ── SentinelBot contract ─────────────────────────────────────────────────────

describe("sentinel bots — SentinelBot contract shape", () => {
  it("every rostered bot exposes id/name/moduleKey/defaultSchedule/description and an observe() function", () => {
    for (const bot of ALL_BOTS) {
      expect(typeof bot.id, `${bot.id}.id`).toBe("string");
      expect(bot.id.length).toBeGreaterThan(0);
      expect(typeof bot.name, `${bot.id}.name`).toBe("string");
      expect(bot.name.length).toBeGreaterThan(0);
      expect(typeof bot.moduleKey, `${bot.id}.moduleKey`).toBe("string");
      expect(["hourly", "daily", "weekly"]).toContain(bot.defaultSchedule);
      expect(typeof bot.description, `${bot.id}.description`).toBe("string");
      expect(bot.description.length).toBeGreaterThan(0);
      expect(typeof bot.observe, `${bot.id}.observe`).toBe("function");
    }
  });

  it("ids and moduleKeys are unique across the roster", () => {
    const ids = ALL_BOTS.map((b) => b.id);
    const moduleKeys = ALL_BOTS.map((b) => b.moduleKey);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(moduleKeys).size).toBe(moduleKeys.length);
  });

  it("moduleKeys match the autopilot_configs.modules flags enabled by runNow", () => {
    // Mirrors the modules jsonb written by routers/sentinel.ts runNow.
    const runNowEnabledModules = [
      "complianceSentinel",
      "slaHound",
      "riskWatchdog",
      "vulnerabilitySentinel",
      "policySteward",
      "bcGuardian",
      "anomalySpotter",
    ];
    expect([...moduleKeysSorted(ALL_BOTS)].sort()).toEqual([...runNowEnabledModules].sort());
  });

  it("declares the documented identity fields per bot", () => {
    expect(complianceSentinel).toMatchObject({ id: "compliance-sentinel", name: "Compliance Sentinel", moduleKey: "complianceSentinel" });
    expect(slaHound).toMatchObject({ id: "sla-hound", name: "SLA Hound", moduleKey: "slaHound" });
    expect(riskWatchdog).toMatchObject({ id: "risk-watchdog", name: "Risk Watchdog", moduleKey: "riskWatchdog" });
    expect(vulnerabilitySentinel).toMatchObject({ id: "vulnerability-sentinel", name: "Vulnerability Sentinel", moduleKey: "vulnerabilitySentinel" });
    expect(policySteward).toMatchObject({ id: "policy-steward", name: "Policy Steward", moduleKey: "policySteward" });
    expect(bcGuardian).toMatchObject({ id: "bc-guardian", name: "BC Guardian", moduleKey: "bcGuardian" });
    expect(anomalySpotter).toMatchObject({ id: "anomaly-spotter", name: "Anomaly Spotter", moduleKey: "anomalySpotter" });
  });

  function moduleKeysSorted(bots: SentinelBot[]): string[] {
    return bots.map((b) => b.moduleKey);
  }
});

// ── Graceful degradation without a database ──────────────────────────────────

describe("sentinel bots — observe() degrades gracefully when getDb() yields null", () => {
  beforeEach(() => {
    dbMocks.getDb.mockResolvedValue(null);
  });

  it("every bot returns [] instead of throwing", async () => {
    const ctx = { clientId: 1, now: new Date() };
    const results = await Promise.all(ALL_BOTS.map((bot) => bot.observe(ctx)));
    results.forEach((observations, i) => {
      expect(Array.isArray(observations), `${ALL_BOTS[i].id}.observe result is an array`).toBe(true);
      expect(observations, `${ALL_BOTS[i].id}.observe should be empty without a DB`).toEqual([]);
    });
    expect(dbMocks.getDb).toHaveBeenCalledTimes(ALL_BOTS.length);
  });
});

// ---------------------------------------------------------------------------
// slaHound -- NIS2 Article 23 incident clocks (section 6, build cycle 41 WIP)
//
// Contract under test (the incidents scan inside slaHound.observe()):
//   * SQL-level gate: the incidents query filters status != 'resolved'.
//   * 24h Early Warning -- only while !earlyWarningSentAt AND (isSignificant
//     OR severity critical/high). Past the deadline -> critical BREACH with
//     stable key `nis2-24h-breach:<id>` + escalate action; inside the final
//     <=6h -> warning due-soon with the slice-stable key
//     `nis2-24h-warn:<id>:<Math.floor(hoursSinceDetection / 6)>` -- constant
//     within each 6-hour slice of time-since-detection, so re-runs do not
//     churn alerts inside the window; otherwise silent.
//   * 72h Notification -- only once earlyWarningSentAt exists AND
//     !intermediateReportSentAt (same significance gate); past 72h -> critical
//     BREACH `nis2-72h-breach:<id>`; silent while the window is still open.
//   * Robustness: null db -> []; malformed/null dates never throw.
//
// All Art.23 timing derives exclusively from ctx.now, so these tests pass
// explicit instants instead of faking global timers.
// ---------------------------------------------------------------------------

const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;
const NIS2_NOW = new Date("2026-08-25T12:00:00.000Z");

type IncidentRow = Record<string, unknown>;

function incidentRow(overrides: Partial<IncidentRow> = {}): IncidentRow {
  return {
    id: 501,
    title: "Ransomware outbreak on file server",
    status: "open",
    severity: "critical",
    detectedAt: new Date(NIS2_NOW.getTime() - 25 * HOUR_MS),
    isSignificant: true,
    earlyWarningSentAt: null,
    intermediateReportSentAt: null,
    ...overrides,
  };
}

/** Fake db: every select().from(table).where(...) resolves to rows mapped by schema-table identity. */
function dbReturningRows(rowsByTable: Array<[unknown, unknown[]]>) {
  const map = new Map(rowsByTable);
  return {
    select: () => ({
      from: (table: unknown) => ({
        where: () => Promise.resolve(map.get(table) ?? []),
      }),
    }),
  };
}

/** Fake db that additionally records each where() condition next to its source table. */
function dbRecordingWhere(incidentRows: unknown[]) {
  const captured: Array<{ table: unknown; condition: unknown }> = [];
  return {
    captured,
    db: {
      select: () => ({
        from: (table: unknown) => ({
          where: (condition: unknown) => {
            captured.push({ table, condition });
            return Promise.resolve(table === incidents ? incidentRows : []);
          },
        }),
      }),
    },
  };
}

/** observe() with only the incidents table populated, reduced to the Art.23 findings. */
async function art23Findings(rows: IncidentRow[], now: Date = NIS2_NOW) {
  dbMocks.getDb.mockResolvedValue(dbReturningRows([[incidents, rows]]));
  const observations = await slaHound.observe({ clientId: 7, now });
  return observations.filter((o) => o.dedupeKey.startsWith("nis2-"));
}

describe("sentinel bots -- slaHound NIS2 Art.23: 24h Early Warning", () => {
  it("raises a critical BREACH once a significant incident hits 24h without an early warning, keyed stably on the incident id", async () => {
    const rows = [
      incidentRow(), // 25h since detection
      incidentRow({ id: 505, detectedAt: new Date(NIS2_NOW.getTime() - 24 * HOUR_MS) }), // exactly at the limit
    ];
    const findings = await art23Findings(rows);
    expect(findings.map((f) => f.dedupeKey)).toEqual([
      "nis2-24h-breach:501",
      "nis2-24h-breach:505",
    ]);
    const [breach] = findings;
    expect(breach.severity).toBe("critical");
    expect(breach.title).toContain("NIS2 24h Early Warning DEADLINE BREACHED");
    expect(breach.title).toContain("Ransomware outbreak on file server");
    expect(breach.rationale).toContain("Article 23");
    expect(breach.entityType).toBe("task");
    expect(breach.entityId).toBe(501);
    expect(breach.proposedAction).toEqual({ kind: "escalate", priority: "critical", dueInDays: 1 });
    expect(breach.confidence).toBe(99);
    expect(breach.metadata).toMatchObject({ incidentId: 501 });
    // Re-running later must reproduce identical dedupe keys (no alert churn).
    const rerun = await art23Findings(rows, new Date(NIS2_NOW.getTime() + 2 * HOUR_MS));
    expect(rerun.map((f) => f.dedupeKey)).toEqual(["nis2-24h-breach:501", "nis2-24h-breach:505"]);
  });

  it.each([
    ["critical severity alone", { severity: "critical", isSignificant: false }],
    ["high severity alone", { severity: "high", isSignificant: false }],
    ["the significant flag alone", { severity: "medium", isSignificant: true }],
  ])("gates the 24h clock on %s even without the other marker", async (_label, overrides) => {
    const findings = await art23Findings([
      incidentRow({
        ...(overrides as Partial<IncidentRow>),
        id: 502,
        detectedAt: new Date(NIS2_NOW.getTime() - 30 * HOUR_MS),
      }),
    ]);
    expect(findings.map((f) => f.dedupeKey)).toEqual(["nis2-24h-breach:502"]);
    expect(findings[0].severity).toBe("critical");
  });

  it("warns inside the final <=6h before the deadline (inclusive) instead of breaching", async () => {
    const rows = [
      incidentRow({ detectedAt: new Date(NIS2_NOW.getTime() - 20 * HOUR_MS) }), // 4h remain
      incidentRow({ id: 506, detectedAt: new Date(NIS2_NOW.getTime() - 18 * HOUR_MS) }), // exactly 6h remain
    ];
    const findings = await art23Findings(rows);
    expect(findings.map((f) => f.dedupeKey)).toEqual([
      "nis2-24h-warn:501:3", // 20h since detection -> floor(20 / 6) = 3
      "nis2-24h-warn:506:3", // exactly 18h since detection -> floor(18 / 6) = 3
    ]);
    // Shape pin: the due-soon key is slice-suffixed `<incidentId>:<slice>`.
    for (const f of findings) {
      expect(f.dedupeKey).toMatch(/^nis2-24h-warn:\d+:\d+$/);
    }
    expect(findings.every((f) => f.severity === "warning")).toBe(true);
    expect(findings[0].title).toContain("due in 4 hour(s)");
    expect(findings[0].proposedAction).toEqual({
      kind: "create_task",
      taskType: "review",
      priority: "high",
      dueInDays: 1,
    });
    expect(findings[0].metadata).toMatchObject({ incidentId: 501, hoursRemaining: 4 });
  });

  it.each([0, 12])("stays silent while more than 6h remain until the 24h deadline (%dh since detection)", async (hoursSince) => {
    const findings = await art23Findings([
      incidentRow({ detectedAt: new Date(NIS2_NOW.getTime() - hoursSince * HOUR_MS) }),
    ]);
    expect(findings).toEqual([]);
  });

  it("fires the due-soon warning at exactly 18h since detection (slice suffix 3) and stays silent one hour earlier", async () => {
    const atBoundary = await art23Findings([
      incidentRow({ id: 507, detectedAt: new Date(NIS2_NOW.getTime() - 18 * HOUR_MS) }),
    ]);
    expect(atBoundary.map((f) => f.dedupeKey)).toEqual(["nis2-24h-warn:507:3"]); // floor(18 / 6) === 3
    expect(atBoundary[0].title).toContain("due in 6 hour(s)");
    expect(atBoundary[0].severity).toBe("warning");
    const beforeWindow = await art23Findings([
      incidentRow({ id: 507, detectedAt: new Date(NIS2_NOW.getTime() - 17 * HOUR_MS) }), // 7h remain
    ]);
    expect(beforeWindow).toEqual([]);
  });

  it("keeps one stable due-soon dedupeKey across the whole final-6h window and hands over to the BREACH key afterwards", async () => {
    const detectedAt = new Date(NIS2_NOW.getTime() - 40 * HOUR_MS);
    const row = [incidentRow({ detectedAt })];
    for (const hoursSince of [18.2, 20.5, 23.5]) {
      const run = await art23Findings(row, new Date(detectedAt.getTime() + hoursSince * HOUR_MS));
      expect(run, `${hoursSince}h since detection`).toHaveLength(1);
      // Every instant of the final-6h window lies in slice floor(h/6) === 3,
      // so the suffixed key is stable across repeated observations there.
      expect(run[0].dedupeKey, `${hoursSince}h since detection`).toBe("nis2-24h-warn:501:3");
    }
    const pastDeadline = await art23Findings(row, new Date(detectedAt.getTime() + 24.5 * HOUR_MS));
    expect(pastDeadline.map((f) => f.dedupeKey)).toEqual(["nis2-24h-breach:501"]);
  });

  it("suppresses all 24h findings once earlyWarningSentAt is recorded", async () => {
    const findings = await art23Findings([
      incidentRow({ earlyWarningSentAt: new Date(NIS2_NOW.getTime() - 20 * HOUR_MS) }), // 25h since detection
    ]);
    expect(findings).toEqual([]); // 72h clock not breached yet either
  });
});

describe("sentinel bots -- slaHound NIS2 Art.23: 72h Notification", () => {
  // Early warning filed shortly after detection; intermediate report still missing.
  const postEarlyWarning = {
    detectedAt: new Date(NIS2_NOW.getTime() - 80 * HOUR_MS),
    earlyWarningSentAt: new Date(NIS2_NOW.getTime() - 78 * HOUR_MS),
  };

  it("raises exactly one critical 72h BREACH when the intermediate report is missing past 72h after an early warning", async () => {
    const findings = await art23Findings([incidentRow(postEarlyWarning)]);
    expect(findings).toHaveLength(1); // no residual 24h alert once warned
    const [breach] = findings;
    expect(breach.severity).toBe("critical");
    expect(breach.title).toContain("NIS2 72h Incident Notification DEADLINE BREACHED");
    expect(breach.rationale).toContain("Article 23");
    expect(breach.dedupeKey).toBe("nis2-72h-breach:501");
    expect(breach.proposedAction).toEqual({ kind: "escalate", priority: "critical", dueInDays: 1 });
    expect(breach.confidence).toBe(99);
    expect(breach.metadata).toMatchObject({ incidentId: 501 });
  });

  it.each([
    ["significance only", { severity: "medium", isSignificant: true }],
    ["high severity only", { severity: "high", isSignificant: false }],
  ])("gates the 72h clock on %s", async (_label, overrides) => {
    const findings = await art23Findings([
      incidentRow({
        ...postEarlyWarning,
        ...(overrides as Partial<IncidentRow>),
        id: 503,
        detectedAt: new Date(NIS2_NOW.getTime() - 75 * HOUR_MS),
        earlyWarningSentAt: new Date(NIS2_NOW.getTime() - 73 * HOUR_MS),
      }),
    ]);
    expect(findings.map((f) => f.dedupeKey)).toEqual(["nis2-72h-breach:503"]);
  });

  it.each([48, 71])("stays silent while the 72h window is still open (%dh since detection)", async (hoursSince) => {
    const findings = await art23Findings([
      incidentRow({
        ...postEarlyWarning,
        detectedAt: new Date(NIS2_NOW.getTime() - hoursSince * HOUR_MS),
        earlyWarningSentAt: new Date(NIS2_NOW.getTime() - (hoursSince + 1) * HOUR_MS),
      }),
    ]);
    expect(findings).toEqual([]);
  });

  it("goes quiet once intermediateReportSentAt is recorded", async () => {
    const findings = await art23Findings([
      incidentRow({
        ...postEarlyWarning,
        intermediateReportSentAt: new Date(NIS2_NOW.getTime() - 60 * HOUR_MS),
      }),
    ]);
    expect(findings).toEqual([]);
  });

  it("never raises the 72h finding without a prior early warning -- the 24h breach stands in instead", async () => {
    const findings = await art23Findings([
      incidentRow({ detectedAt: new Date(NIS2_NOW.getTime() - 100 * HOUR_MS) }), // no earlyWarningSentAt
    ]);
    expect(findings.map((f) => f.dedupeKey)).toEqual(["nis2-24h-breach:501"]);
  });
});

describe("sentinel bots -- slaHound NIS2 Art.23 gating", () => {
  it("excludes resolved incidents via the SQL filter (where clause carries status != 'resolved')", async () => {
    const { db, captured } = dbRecordingWhere([]);
    dbMocks.getDb.mockResolvedValue(db);
    await slaHound.observe({ clientId: 7, now: NIS2_NOW });
    const incidentCall = captured.find((c) => c.table === incidents);
    expect(incidentCall, "slaHound must query the incidents table").toBeDefined();
    // Render the drizzle condition to verify the resolved-status gate exists in SQL
    // (rows returned by a real DB would already be filtered, so this cannot be
    // asserted behaviorally through a fake that bypasses the WHERE clause).
    const rendered = new PgDialect().sqlToQuery(incidentCall!.condition as never);
    expect(rendered.sql).toContain('"status"');
    expect(rendered.params).toContain("resolved");
  });

  it("skips incidents without detectedAt entirely", async () => {
    const findings = await art23Findings([
      incidentRow({ id: 601, detectedAt: null }),
      incidentRow({ id: 602 }), // control: otherwise identical and dated -> fires
    ]);
    expect(findings.map((f) => f.dedupeKey)).toEqual(["nis2-24h-breach:602"]);
  });

  it.each(["low", "medium"])("produces no Art.23 findings for non-significant %s-severity incidents on any clock state", async (severity) => {
    const findings = await art23Findings([
      incidentRow({ severity, isSignificant: false }),
      incidentRow({
        severity,
        isSignificant: false,
        detectedAt: new Date(NIS2_NOW.getTime() - 96 * HOUR_MS),
        earlyWarningSentAt: new Date(NIS2_NOW.getTime() - 90 * HOUR_MS),
      }),
    ]);
    expect(findings).toEqual([]);
  });
});

describe("sentinel bots -- slaHound NIS2 Art.23 robustness", () => {
  it("returns [] when getDb() yields null (DB unavailable)", async () => {
    dbMocks.getDb.mockResolvedValue(null);
    await expect(slaHound.observe({ clientId: 7, now: NIS2_NOW })).resolves.toEqual([]);
  });

  it("does not throw on malformed or null date fields", async () => {
    const findings = await art23Findings([
      incidentRow({ id: 701, detectedAt: new Date("not-a-date") }), // NaN math fires neither branch
      incidentRow({ id: 702, detectedAt: null }), // skipped outright
      incidentRow({
        id: 703, // truthy garbage timestamp suppresses 24h; 72h not yet due
        detectedAt: new Date(NIS2_NOW.getTime() - 30 * HOUR_MS),
        earlyWarningSentAt: new Date("bogus"),
      }),
      incidentRow({ id: 705, detectedAt: new Date(NIS2_NOW.getTime() + 2 * HOUR_MS) }), // future detection -> >24h remain
      // Hardened coercion paths: drivers may return strings / epoch numbers.
      incidentRow({ id: 706, detectedAt: new Date(NIS2_NOW.getTime() - 30 * HOUR_MS).toISOString() }), // ISO string, 30h ago -> fires
      incidentRow({ id: 707, detectedAt: "garbage" }), // unparseable string -> skipped, no throw
      incidentRow({ id: 704, detectedAt: NIS2_NOW.getTime() - 25 * HOUR_MS }), // epoch-ms number -> fires
    ]);
    expect(findings.map((f) => f.dedupeKey)).toEqual([
      "nis2-24h-breach:706",
      "nis2-24h-breach:704",
    ]);
  });

  it("FIXED (cycle 41): a rejected db.select degrades to [] per the graceful-degradation contract", async () => {
    // slaHound now wraps its Art. 23 incident-clock select in try/catch
    // (cf. riskWatchdog's appetite query). The mock rejects ONLY the incidents
    // select — sections 1-5 are pre-existing unwrapped selects (follow-up:
    // wrap those too) and still resolve empty here, so any rejection escaping
    // observe() would come from the unwrapped section-6 chain.
    dbMocks.getDb.mockResolvedValue({
      select: () => ({
        from: (table: unknown) => ({
          where: () =>
            table === incidents
              ? Promise.reject(new Error("db down"))
              : Promise.resolve([]),
        }),
      }),
    });
    await expect(slaHound.observe({ clientId: 7, now: NIS2_NOW })).resolves.toEqual([]);
  });
});

describe("sentinel bots -- bcGuardian NIS2 Article 21(2)(c) citation (cycle 41 copy change)", () => {
  function bcDb(plans: unknown[], trainings: unknown[] = []) {
    return {
      select: () => ({
        from: (table: unknown) => ({
          where: () =>
            Promise.resolve(
              table === bcPlans ? plans : table === bcTrainingRecords ? trainings : [],
            ),
        }),
      }),
    };
  }

  async function bcObservations(plans: unknown[], trainings: unknown[] = []) {
    dbMocks.getDb.mockResolvedValue(bcDb(plans, trainings));
    return bcGuardian.observe({ clientId: 7, now: NIS2_NOW });
  }

  const overduePlan = (overrides: Partial<Record<string, unknown>> = {}) => ({
    id: 900,
    title: "Payment continuity plan",
    lastTestedDate: new Date(NIS2_NOW.getTime() - 400 * DAY_MS),
    nextTestDate: new Date(NIS2_NOW.getTime() - 30 * DAY_MS),
    ...overrides,
  });

  it("tags overdue-test findings with nis2Article '21.2.c' metadata and cites NIS2 Article 21(2)(c)", async () => {
    const obs = await bcObservations([overduePlan()]);
    const finding = obs.find((o) => o.dedupeKey === "bc-test-overdue:900");
    expect(finding, "expected one overdue-test finding for plan 900").toBeDefined();
    expect(finding!.entityType).toBe("bc_plan");
    expect(finding!.severity).toBe("info"); // tested before, only 30 days overdue
    expect(finding!.metadata).toMatchObject({ nis2Article: "21.2.c", neverTested: false });
    expect(finding!.rationale).toContain("NIS2 Article 21(2)(c)");
    expect(finding!.rationale).toContain("ISO 22301"); // companion standard reference retained
  });

  it("flags never-tested plans with warning severity and the same NIS2 Article 21(2)(c) citation", async () => {
    const obs = await bcObservations([overduePlan({ lastTestedDate: null })]);
    const finding = obs.find((o) => o.dedupeKey === "bc-test-overdue:900")!;
    expect(finding.severity).toBe("warning");
    expect(finding.title).toContain("(never tested)");
    expect(finding.rationale).toContain("NEVER been tested");
    expect(finding.rationale).toContain("NIS2 Article 21(2)(c)");
    expect(finding.metadata).toMatchObject({ nis2Article: "21.2.c", neverTested: true });
  });
});
