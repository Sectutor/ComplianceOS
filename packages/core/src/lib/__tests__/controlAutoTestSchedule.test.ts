import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Control auto-test schedule configuration — unit tests.
 *
 * The engine functions import `getDb` from `../db` (a module that wires up a
 * postgres pool at load time) plus the schema modules. Following the
 * addonScheduler/controlAutoTestEngine pattern, all three modules are mocked
 * via vi.hoisted + vi.mock.
 *
 * DB mock strategy: a STATEFUL in-memory client so upsert semantics are
 * observable end-to-end without asserting exact SQL. The client supports
 *   select().from().where()...   → resolves to current rows
 *   insert(t).values(row)...     → upserts the row into state
 *   update(t).set(partial)...    → merges the partial into the matching row
 * Root-level execute()/query() are stubbed so any DDL/relational reads the
 * engine issues resolve harmlessly. `calls` records every chain method for
 * SQL-level assertions, and `state` lets tests verify persisted values.
 */
const scheduleMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  clientAutoTestSchedules: {
    clientId: "clientAutoTestSchedules.clientId",
    enabled: "clientAutoTestSchedules.enabled",
    intervalHours: "clientAutoTestSchedules.intervalHours",
    lastRunAt: "clientAutoTestSchedules.lastRunAt",
  },
}));

vi.mock("../../db", () => ({ getDb: scheduleMocks.getDb }));
vi.mock("../../schema", () => ({
  clientControls: { id: "clientControls.id", clientId: "clientControls.clientId" },
  controls: { id: "controls.id" },
  evidence: { id: "evidence.id" },
  clientAutoTestSchedules: scheduleMocks.clientAutoTestSchedules,
}));
vi.mock("../../schema_monitor", () => ({
  controlTestRuns: { id: "controlTestRuns.id" },
  complianceMonitorEvents: { id: "complianceMonitorEvents.id" },
  clientAutoTestSchedules: scheduleMocks.clientAutoTestSchedules,
}));

type Engine = typeof import("../controlAutoTestEngine");
let engine: Engine;

const NOW = new Date("2026-01-15T12:00:00.000Z");
const HOUR_MS = 3600 * 1000;

type ScheduleRow = {
  clientId: number;
  enabled: boolean;
  intervalHours: number;
  lastRunAt: Date | null;
};

/**
 * Best-effort clientId extraction from a drizzle where() argument (eq() SQL
 * wrapper serializes the raw value as a bare integer param).
 */
function extractClientId(whereArgs: unknown[]): number | undefined {
  const s = JSON.stringify(whereArgs);
  if (!s) return undefined;
  const matches = s.match(/(?<!")\b\d{1,15}\b(?!")/g);
  if (!matches || matches.length === 0) return undefined;
  return Number(matches[matches.length - 1]);
}

function makeDb(initial: ScheduleRow[] = []) {
  const state: ScheduleRow[] = initial.map((r) => ({ ...r }));
  const calls: Record<string, unknown[][]> = {};
  for (const m of [
    "select", "from", "where", "limit", "orderBy",
    "insert", "values", "set", "update",
    "onConflictDoUpdate", "returning", "execute",
  ]) {
    calls[m] = [];
  }
  const record = (name: string, ...args: unknown[]) => {
    calls[name].push(args);
  };

  const byClient = (id: number) => state.find((r) => r.clientId === id);

  const upsert = (partial: Record<string, unknown>): ScheduleRow => {
    const clientId = Number(partial.clientId);
    const existing = byClient(clientId);
    const merged: ScheduleRow = {
      enabled: true,
      intervalHours: 6,
      lastRunAt: null,
      ...(existing ? { ...existing } : {}),
      ...(partial as Partial<ScheduleRow>),
      clientId,
    };
    if (existing) {
      Object.assign(existing, merged);
      return existing;
    }
    state.push(merged);
    return merged;
  };

  let lastWritten: ScheduleRow[] = [];

  // select chain: every terminal resolves to the current row set.
  const selectChain: any = {};
  for (const m of ["select", "from", "where", "limit", "orderBy"]) {
    selectChain[m] = (...args: unknown[]) => {
      record(m, ...args);
      return selectChain;
    };
  }
  selectChain.then = (ok?: any, err?: any) =>
    Promise.resolve(state.map((r) => ({ ...r }))).then(ok, err);

  // insert chain: values() upserts into state; terminals resolve to the row.
  const insertChain: any = {};
  for (const m of ["insert", "onConflictDoUpdate", "returning", "execute"]) {
    insertChain[m] = (...args: unknown[]) => {
      record(m, ...args);
      return insertChain;
    };
  }
  insertChain.values = (...args: unknown[]) => {
    record("values", ...args);
    lastWritten = [upsert((args[0] ?? {}) as Record<string, unknown>)];
    return insertChain;
  };
  insertChain.then = (ok?: any, err?: any) =>
    Promise.resolve(lastWritten.map((r) => ({ ...r }))).then(ok, err);

  // update chain: set() records the partial, where() applies it to the row.
  let pendingSet: Record<string, unknown> | null = null;
  const updateChain: any = {};
  for (const m of ["update", "where", "returning", "execute"]) {
    updateChain[m] = (...args: unknown[]) => {
      record(m, ...args);
      if (m === "where") {
        const clientId = extractClientId(args);
        if (pendingSet && clientId !== undefined) {
          const existing = byClient(clientId);
          if (existing) {
            Object.assign(existing, pendingSet);
            lastWritten = [existing];
          }
        }
        pendingSet = null;
      }
      return updateChain;
    };
  }
  updateChain.set = (...args: unknown[]) => {
    record("set", ...args);
    pendingSet = (args[0] ?? {}) as Record<string, unknown>;
    return updateChain;
  };
  updateChain.then = (ok?: any, err?: any) =>
    Promise.resolve(lastWritten.map((r) => ({ ...r }))).then(ok, err);

  const db: any = {
    select: () => selectChain,
    insert: () => insertChain,
    update: () => updateChain,
    // DDL / relational reads issued by the engine resolve harmlessly.
    execute: vi.fn(() => Promise.resolve(undefined)),
    query: {
      clientAutoTestSchedules: {
        findFirst: vi.fn(() => Promise.resolve(state[0] ? { ...state[0] } : undefined)),
      },
    },
  };
  return { db, state, calls };
}

beforeEach(async () => {
  vi.resetModules();
  engine = await import("../controlAutoTestEngine");
  scheduleMocks.getDb.mockReset();
});

describe("isAutoTestDue", () => {
  it("returns false when the schedule is disabled", () => {
    expect(
      engine.isAutoTestDue({ enabled: false, intervalHours: 6, lastRunAt: null }, NOW),
    ).toBe(false);
    expect(
      engine.isAutoTestDue(
        { enabled: false, intervalHours: 6, lastRunAt: new Date(NOW.getTime() - 1000) },
        NOW,
      ),
    ).toBe(false);
  });

  it("returns true when lastRunAt is null (never run)", () => {
    expect(
      engine.isAutoTestDue({ enabled: true, intervalHours: 6, lastRunAt: null }, NOW),
    ).toBe(true);
  });

  it("returns true when the full interval has elapsed", () => {
    const lastRunAt = new Date(NOW.getTime() - 6 * HOUR_MS);
    expect(
      engine.isAutoTestDue({ enabled: true, intervalHours: 6, lastRunAt }, NOW),
    ).toBe(true);
  });

  it("returns false when the interval has not yet elapsed", () => {
    // 6h minus 1ms → not due
    const lastRunAt = new Date(NOW.getTime() - 6 * HOUR_MS + 1);
    expect(
      engine.isAutoTestDue({ enabled: true, intervalHours: 6, lastRunAt }, NOW),
    ).toBe(false);
  });

  it("returns true exactly at the interval boundary (>= semantics)", () => {
    const lastRunAt = new Date(NOW.getTime() - 6 * HOUR_MS);
    expect(
      engine.isAutoTestDue({ enabled: true, intervalHours: 6, lastRunAt }, NOW),
    ).toBe(true);
  });

  it("respects the configured intervalHours (1h and 168h/7d)", () => {
    const hourly = new Date(NOW.getTime() - 1 * HOUR_MS);
    expect(engine.isAutoTestDue({ enabled: true, intervalHours: 1, lastRunAt: hourly }, NOW)).toBe(true);

    const notHourly = new Date(NOW.getTime() - 1 * HOUR_MS + 1);
    expect(engine.isAutoTestDue({ enabled: true, intervalHours: 1, lastRunAt: notHourly }, NOW)).toBe(false);

    const weekly = new Date(NOW.getTime() - 168 * HOUR_MS);
    expect(engine.isAutoTestDue({ enabled: true, intervalHours: 168, lastRunAt: weekly }, NOW)).toBe(true);
  });
});

describe("getClientAutoTestSchedule", () => {
  it("returns defaults when no schedule row exists", async () => {
    const { db, calls } = makeDb();
    scheduleMocks.getDb.mockResolvedValue(db);

    const schedule = await engine.getClientAutoTestSchedule(7);

    expect(schedule).toEqual({ enabled: true, intervalHours: 6, lastRunAt: null });
    // reads come from the schedule table
    expect(
      calls.from.some((args) => args[0] === scheduleMocks.clientAutoTestSchedules) ||
        calls.select.length > 0,
    ).toBe(true);
  });

  it("returns the stored schedule when a row exists", async () => {
    const lastRunAt = new Date("2026-01-10T08:00:00.000Z");
    const { db } = makeDb([
      { clientId: 7, enabled: false, intervalHours: 12, lastRunAt },
    ]);
    scheduleMocks.getDb.mockResolvedValue(db);

    const schedule = await engine.getClientAutoTestSchedule(7);

    expect(schedule).toEqual({ enabled: false, intervalHours: 12, lastRunAt });
  });
});

describe("touchClientAutoTestRun", () => {
  it("records the injected run timestamp for the client", async () => {
    const { db, calls, state } = makeDb();
    scheduleMocks.getDb.mockResolvedValue(db);

    await engine.touchClientAutoTestRun(7, NOW);

    expect(scheduleMocks.getDb).toHaveBeenCalledTimes(1);
    // the write path (insert-values or update-set) carried lastRunAt === NOW
    const writes = [...calls.values, ...calls.set];
    expect(writes.length).toBeGreaterThan(0);
    const stamped = writes.find((args) => {
      const payload = args[0] as Record<string, unknown>;
      const ts = payload?.lastRunAt;
      return ts && new Date(ts as string).getTime() === NOW.getTime();
    });
    expect(stamped).toBeDefined();
    // upsert semantics: state now holds the timestamp
    expect(state.find((r) => r.clientId === 7)?.lastRunAt).toEqual(NOW);
  });

  it("defaults the timestamp to the current time when not provided", async () => {
    const { db, calls, state } = makeDb();
    scheduleMocks.getDb.mockResolvedValue(db);

    await engine.touchClientAutoTestRun(7);

    const writes = [...calls.values, ...calls.set];
    const stamped = writes.find(
      (args) => (args[0] as Record<string, unknown>)?.lastRunAt instanceof Date,
    );
    expect(stamped).toBeDefined();
    expect(state.find((r) => r.clientId === 7)?.lastRunAt).toBeInstanceOf(Date);
  });
});

describe("setClientAutoTestSchedule", () => {
  it("upserts a schedule with partial changes for a new client", async () => {
    const { db, calls, state } = makeDb();
    scheduleMocks.getDb.mockResolvedValue(db);

    const result = await engine.setClientAutoTestSchedule(7, {
      enabled: false,
      intervalHours: 12,
    });

    const writes = [...calls.values, ...calls.set].map(
      (args) => args[0] as Record<string, unknown>,
    );
    expect(writes.some((p) => p.enabled === false)).toBe(true);
    expect(writes.some((p) => p.intervalHours === 12)).toBe(true);

    // upsert semantics: a row now exists for the client with merged values
    expect(state.find((r) => r.clientId === 7)).toMatchObject({
      enabled: false,
      intervalHours: 12,
    });
    expect(result).toBeDefined();
  });

  it("keeps unspecified fields from the existing row", async () => {
    const lastRunAt = new Date("2026-01-10T08:00:00.000Z");
    const { db, state } = makeDb([
      { clientId: 7, enabled: true, intervalHours: 6, lastRunAt },
    ]);
    scheduleMocks.getDb.mockResolvedValue(db);

    await engine.setClientAutoTestSchedule(7, { intervalHours: 24 });

    expect(state.find((r) => r.clientId === 7)).toMatchObject({
      enabled: true,
      intervalHours: 24,
      lastRunAt,
    });
  });

  it("persists a partial enabled-only change without clobbering the interval", async () => {
    const { db, state } = makeDb([
      { clientId: 7, enabled: true, intervalHours: 24, lastRunAt: null },
    ]);
    scheduleMocks.getDb.mockResolvedValue(db);

    await engine.setClientAutoTestSchedule(7, { enabled: false });

    expect(state.find((r) => r.clientId === 7)).toMatchObject({
      enabled: false,
      intervalHours: 24,
    });
  });

  it("is reflected by getClientAutoTestSchedule after upsert", async () => {
    const { db } = makeDb();
    scheduleMocks.getDb.mockResolvedValue(db);

    await engine.setClientAutoTestSchedule(7, { enabled: false });
    const schedule = await engine.getClientAutoTestSchedule(7);

    expect(schedule).toMatchObject({
      enabled: false,
      intervalHours: 6,
      lastRunAt: null,
    });
  });
});
