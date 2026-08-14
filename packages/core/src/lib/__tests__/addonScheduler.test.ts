import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * The scheduler module imports @complianceos/core/db, which creates a postgres
 * pool at module load, plus addon runtime/schema modules. All of those are
 * mocked here so the pure `calculateNextRun` helper (and the db-driven
 * `processDueScans` flow) can be tested in isolation without touching a live
 * database.
 *
 * Regression note: `getDb()` in @complianceos/core/db is async — it returns a
 * Promise<drizzle client>. The scheduler used to call it WITHOUT await, which
 * made `db` a Promise and produced "db.select is not a function". These tests
 * verify processDueScans awaits getDb() and therefore receives a real
 * (mocked) client with .select()/.update().
 */
const schedulerMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getExecutor: vi.fn(),
}));

vi.mock("@complianceos/core/db", () => ({
  getDb: schedulerMocks.getDb,
}));

vi.mock("@complianceos/addons/shared/schema", () => ({
  addonSubscriptions: {},
  addonRunLogs: {},
}));

vi.mock("@complianceos/addons/runtime/executor-instance", () => ({
  getExecutor: schedulerMocks.getExecutor,
}));

import { calculateNextRun, processDueScans } from "../../../../addons/src/scheduler";

const DAY = 24 * 60 * 60 * 1000;
const BASE = new Date("2026-01-15T10:30:00.000Z").getTime();
const NOW = new Date(BASE);

describe("addonScheduler.calculateNextRun", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("schedules daily runs 24 hours ahead", () => {
    expect(calculateNextRun("daily").getTime()).toBe(BASE + 1 * DAY);
  });

  it("schedules weekly runs 7 days ahead", () => {
    expect(calculateNextRun("weekly").getTime()).toBe(BASE + 7 * DAY);
  });

  it("schedules monthly runs 30 days ahead", () => {
    expect(calculateNextRun("monthly").getTime()).toBe(BASE + 30 * DAY);
  });

  it("falls back to weekly for unknown or empty schedules", () => {
    for (const schedule of ["hourly", "quarterly", "yearly", "", "garbage"]) {
      expect(calculateNextRun(schedule).getTime()).toBe(BASE + 7 * DAY);
    }
  });

  it("returns a real Date instance", () => {
    expect(calculateNextRun("daily")).toBeInstanceOf(Date);
  });
});

describe("addonScheduler.processDueScans", () => {
  const executor = { execute: vi.fn() };

  /**
   * Build a chainable drizzle-like db mock:
   *   select().from().where().limit() -> rows
   *   update().set(payload).where()   -> captures payload, resolves
   */
  function makeDb(rows: unknown[]) {
    const updates: Array<Record<string, unknown>> = [];
    const selectChain = {
      from: () => selectChain,
      where: () => selectChain,
      limit: () => Promise.resolve(rows),
    };
    const updateChain = {
      set: (data: Record<string, unknown>) => {
        updates.push(data);
        return updateChain;
      },
      where: () => Promise.resolve(undefined),
    };
    return {
      select: () => selectChain,
      update: () => updateChain,
      updates,
    };
  }

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    schedulerMocks.getDb.mockReset();
    schedulerMocks.getExecutor.mockReset().mockReturnValue(executor);
    executor.execute.mockReset().mockResolvedValue({});
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("awaits getDb() and executes due subscriptions (regression: db.select is not a function)", async () => {
    const db = makeDb([
      {
        id: 1,
        clientId: 42,
        addonSlug: "cloud-scanner",
        status: "active",
        settings: { schedule: "weekly" },
      },
    ]);
    schedulerMocks.getDb.mockResolvedValue(db);

    await processDueScans();

    // Bug regression: the scheduler must await getDb(), so the mocked client
    // (with .select) is received instead of a Promise.
    expect(schedulerMocks.getDb).toHaveBeenCalledTimes(1);
    expect(executor.execute).toHaveBeenCalledWith(42, "cloud-scanner", "scheduled");
    expect(db.updates).toHaveLength(1);
    // weekly => next run 7 days from the fake now
    expect(db.updates[0]).toMatchObject({
      nextScheduledRun: new Date(BASE + 7 * DAY),
    });
  });

  it("does nothing when no subscriptions are due", async () => {
    schedulerMocks.getDb.mockResolvedValue(makeDb([]));

    await processDueScans();

    expect(executor.execute).not.toHaveBeenCalled();
  });

  it("schedules a 1-hour retry when execution fails", async () => {
    const db = makeDb([
      {
        id: 1,
        clientId: 42,
        addonSlug: "cloud-scanner",
        status: "active",
        settings: { schedule: "weekly" },
      },
    ]);
    schedulerMocks.getDb.mockResolvedValue(db);
    executor.execute.mockRejectedValue(new Error("scan exploded"));

    await processDueScans();

    expect(db.updates).toHaveLength(1);
    expect(db.updates[0]).toMatchObject({
      nextScheduledRun: new Date(BASE + 60 * 60 * 1000), // now + 1h
    });
  });
});
