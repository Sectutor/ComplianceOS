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
