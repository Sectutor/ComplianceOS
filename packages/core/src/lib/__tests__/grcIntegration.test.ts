import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * GRC Cross-Module Integration (cycle 7) — lib unit tests, fully mocked DB.
 *
 * Contract (source of truth): lib/grc-integration exposes
 *   findOrCreateTask(input)                 -> { task, created } (idempotent)
 *   hasRecentNotification(type, entityType, entityId, lookbackHours = 20)
 *   notifyClientOnce(clientId, payload)     -> boolean (deduped, daily window)
 *   severityToTaskPriority(severity)
 * and is DB-backed via drizzle getDb. Unlike lib/accessReviews there is NO
 * in-memory fallback in this module — DB errors propagate to the caller
 * (schedulers such as dsarDeadlineScheduler catch per item). The tests below
 * pin that contract, including the propagation behavior.
 *
 * This suite mocks ../../db and ../../schema (chainable thenable db builder,
 * same pattern as accessReviews.test.ts) and ../notificationService so nothing
 * touches a live database or a live notification channel.
 */

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  createInAppNotification: vi.fn(),
}));

vi.mock("../../db", () => ({ getDb: mocks.getDb }));
vi.mock("../../schema", () => {
  const stubs: Record<string, unknown> = {
    tasks: { tableName: "tasks" },
    notificationLog: { tableName: "notificationLog" },
  };
  return new Proxy(stubs, {
    get: (t, prop) => {
      if (typeof prop !== "string") return undefined;
      if (!(prop in t)) t[prop] = { tableName: prop };
      return t[prop];
    },
  });
});
vi.mock("../notificationService", () => ({
  createInAppNotification: mocks.createInAppNotification,
}));

type GrcLib = typeof import("../grc-integration");
let grc: GrcLib;

const CHAIN_METHODS = [
  "select",
  "selectDistinct",
  "from",
  "innerJoin",
  "leftJoin",
  "where",
  "orderBy",
  "groupBy",
  "limit",
  "offset",
  "insert",
  "values",
  "update",
  "set",
  "delete",
  "returning",
  "execute",
] as const;

/** Chainable thenable db mock — every awaited query consumes the next queued value. */
function makeDb() {
  const queue: unknown[] = [];
  const calls: Record<string, unknown[][]> = {};
  for (const name of CHAIN_METHODS) calls[name] = [];

  function makeChain(): any {
    const chain: any = {};
    for (const name of CHAIN_METHODS) {
      chain[name] = vi.fn((...args: unknown[]) => {
        calls[name].push(args);
        return makeChain();
      });
    }
    chain.then = (
      onFulfilled?: (value: unknown) => unknown,
      onRejected?: (reason?: unknown) => unknown,
    ) => {
      const entry = queue.shift();
      const promise =
        entry && typeof entry === "object" && "__reject" in entry
          ? Promise.reject((entry as { __reject: unknown }).__reject)
          : Promise.resolve(entry);
      return promise.then(onFulfilled, onRejected);
    };
    return chain;
  }

  const db: any = makeChain();
  db.query = new Proxy({} as any, {
    get: (_t, table) => ({
      findMany: vi.fn(async () => (queue.shift() ?? [])),
      findFirst: vi.fn(async () => (queue.shift() ?? null)),
    }),
  });
  db.transaction = vi.fn(async (cb: any) => cb(db));
  delete db.then;
  return { db, queue, calls };
}

beforeEach(async () => {
  vi.resetModules();
  grc = await import("../grc-integration");
  mocks.getDb.mockReset();
  mocks.createInAppNotification.mockReset();
  mocks.createInAppNotification.mockResolvedValue({ success: true, count: 1 });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// findOrCreateTask — idempotent task creation
// ---------------------------------------------------------------------------

describe("findOrCreateTask", () => {
  it("creates a task with defaults when no open task exists", async () => {
    const { db, queue, calls } = makeDb();
    queue.push([]); // existing tasks -> none
    queue.push([
      { id: 1, clientId: 5, title: "Fix DSAR 7", status: "todo", relatedEntityType: "dsar_overdue", relatedEntityId: 7 },
    ]); // insert ... returning
    mocks.getDb.mockResolvedValue(db);

    const result = await grc.findOrCreateTask({
      clientId: 5,
      title: "Fix DSAR 7",
      relatedEntityType: "dsar_overdue",
      relatedEntityId: 7,
    });

    expect(result.created).toBe(true);
    expect(result.task).toMatchObject({ id: 1, clientId: 5, status: "todo" });
    // Insert payload uses documented defaults.
    expect(calls.insert.length).toBeGreaterThan(0);
    const values = calls.values[0][0] as Record<string, unknown>;
    expect(values).toMatchObject({
      clientId: 5,
      title: "Fix DSAR 7",
      priority: "medium", // default when not provided
      status: "todo",
      relatedEntityType: "dsar_overdue",
      relatedEntityId: 7,
      dueDate: null,
      createdBy: null,
    });
    expect(values.createdAt).toBeInstanceOf(Date);
    expect(values.updatedAt).toBeInstanceOf(Date);
  });

  it("returns the existing open task without inserting when one exists", async () => {
    const { db, queue, calls } = makeDb();
    const existing = {
      id: 9,
      clientId: 5,
      title: "Existing remediation",
      status: "in_progress",
      relatedEntityType: "dsar_overdue",
      relatedEntityId: 7,
    };
    queue.push([existing]); // select -> one open task
    mocks.getDb.mockResolvedValue(db);

    const result = await grc.findOrCreateTask({
      clientId: 5,
      title: "Fix DSAR 7",
      relatedEntityType: "dsar_overdue",
      relatedEntityId: 7,
    });

    expect(result.created).toBe(false);
    expect(result.task).toMatchObject({ id: 9, status: "in_progress" });
    expect(calls.insert).toHaveLength(0);
    expect(calls.values).toHaveLength(0);
  });

  it("honors explicit priority, dueDate and createdBy", async () => {
    const { db, queue, calls } = makeDb();
    const dueDate = new Date("2026-09-01T00:00:00.000Z");
    queue.push([]);
    queue.push([{ id: 2, clientId: 5, status: "todo", priority: "high" }]);
    mocks.getDb.mockResolvedValue(db);

    await grc.findOrCreateTask({
      clientId: 5,
      title: "Overdue DSAR",
      priority: "high",
      dueDate,
      createdBy: 42,
      relatedEntityType: "dsar_overdue",
      relatedEntityId: 8,
    });

    expect(calls.values[0][0]).toMatchObject({
      priority: "high",
      dueDate,
      createdBy: 42,
    });
  });
});

// ---------------------------------------------------------------------------
// hasRecentNotification — dedupe window lookups
// ---------------------------------------------------------------------------

describe("hasRecentNotification", () => {
  it("is true when a matching log entry exists within the window", async () => {
    const { db, queue } = makeDb();
    queue.push([{ id: 1 }]); // one recent log row
    mocks.getDb.mockResolvedValue(db);

    const recent = await grc.hasRecentNotification("dsar_overdue", "dsar_request", 7);
    expect(recent).toBe(true);
  });

  it("is false when no log entry exists", async () => {
    const { db, queue } = makeDb();
    queue.push([]);
    mocks.getDb.mockResolvedValue(db);

    const recent = await grc.hasRecentNotification("dsar_overdue", "dsar_request", 7);
    expect(recent).toBe(false);
  });

  it("accepts a custom lookback window", async () => {
    const { db, queue } = makeDb();
    queue.push([{ id: 1 }]);
    mocks.getDb.mockResolvedValue(db);

    // A 1-hour lookback still finds the (mocked) recent row.
    const recent = await grc.hasRecentNotification("dsar_due_soon", "dsar_request", 3, 1);
    expect(recent).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// notifyClientOnce — dedupe + send + error propagation
// ---------------------------------------------------------------------------

describe("notifyClientOnce", () => {
  const payload = {
    type: "dsar_overdue",
    title: "DSAR-001 is OVERDUE",
    message: "Statutory deadline breach.",
    link: "/clients/5/privacy/dsar",
    relatedEntityType: "dsar_request",
    relatedEntityId: 7,
  };

  it("dedupes: does not notify when a recent notification already exists", async () => {
    const { db, queue } = makeDb();
    queue.push([{ id: 1 }]); // hasRecentNotification -> true
    mocks.getDb.mockResolvedValue(db);

    const sent = await grc.notifyClientOnce(5, payload);

    expect(sent).toBe(false);
    expect(mocks.createInAppNotification).not.toHaveBeenCalled();
  });

  it("notifies once per client when nothing recent exists", async () => {
    const { db, queue } = makeDb();
    queue.push([]); // hasRecentNotification -> false
    mocks.getDb.mockResolvedValue(db);

    const sent = await grc.notifyClientOnce(5, payload);

    expect(sent).toBe(true);
    expect(mocks.createInAppNotification).toHaveBeenCalledTimes(1);
    expect(mocks.createInAppNotification).toHaveBeenCalledWith(5, payload);
  });

  it("propagates DB errors (no in-memory fallback; schedulers catch per item)", async () => {
    mocks.getDb.mockRejectedValue(new Error("connection refused"));

    // Documented behavior: the caller (e.g. dsarDeadlineScheduler) is
    // responsible for catching; this module has no silent fallback.
    await expect(grc.notifyClientOnce(5, payload)).rejects.toThrow("connection refused");
    expect(mocks.createInAppNotification).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// severityToTaskPriority — pure mapping
// ---------------------------------------------------------------------------

describe("severityToTaskPriority", () => {
  it("maps critical/high/medium severities to matching priorities", () => {
    expect(grc.severityToTaskPriority("critical")).toBe("critical");
    expect(grc.severityToTaskPriority("high")).toBe("high");
    expect(grc.severityToTaskPriority("medium")).toBe("medium");
  });

  it("is case-insensitive and treats unknown/empty as low", () => {
    expect(grc.severityToTaskPriority("CRITICAL")).toBe("critical");
    expect(grc.severityToTaskPriority("High")).toBe("high");
    expect(grc.severityToTaskPriority("urgent")).toBe("low");
    expect(grc.severityToTaskPriority("")).toBe("low");
    expect(grc.severityToTaskPriority(undefined as unknown as string)).toBe("low");
  });
});
