import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * DSAR Deadline Scheduler (cycle 7) — unit tests with mocked DB + mocked
 * grc-integration module.
 *
 * Contract under test (lib/dsarDeadlineScheduler.checkDsarDeadlines):
 *   - DSARs due within 7 days  -> warn notification (type "dsar_due_soon")
 *   - DSARs overdue            -> warn notification (type "dsar_overdue") AND
 *                                 one remediation task (priority critical)
 *   - notified/findOrCreateTask returning "already sent"/"already exists"
 *     (false) must NOT double-count
 *   - DSARs without dueDate or due beyond 7 days are skipped
 *   - per-DSAR failures count into errors and don't abort the sweep
 *
 * The DB query mock ignores where() clauses (documented pattern), so we only
 * feed rows that pass the SQL-level status/dueDate filter and exercise the
 * in-memory classification logic.
 */

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  notifyClientOnce: vi.fn(),
  findOrCreateTask: vi.fn(),
}));

vi.mock("../../db", () => ({ getDb: mocks.getDb }));
vi.mock("../../schema", () => {
  const stubs: Record<string, unknown> = { dsarRequests: { tableName: "dsarRequests" } };
  return new Proxy(stubs, {
    get: (t, prop) => {
      if (typeof prop !== "string") return undefined;
      if (!(prop in t)) t[prop] = { tableName: prop };
      return t[prop];
    },
  });
});
vi.mock("../../lib/grc-integration", () => ({
  findOrCreateTask: mocks.findOrCreateTask,
  notifyClientOnce: mocks.notifyClientOnce,
}));

const CHAIN_METHODS = [
  "select", "from", "where", "limit", "orderBy", "insert", "values", "returning",
] as const;

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
    chain.then = (onFulfilled?: (value: unknown) => unknown, onRejected?: (reason?: unknown) => unknown) => {
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
  delete db.then;
  return { db, queue, calls };
}

const NOW = new Date("2026-08-16T12:00:00.000Z");
const DAY = 24 * 60 * 60 * 1000;

function dsar(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    clientId: 5,
    requestId: "DSAR-001",
    requestType: "erasure",
    subjectName: "Alice",
    subjectEmail: "alice@example.com",
    status: "In Progress",
    dueDate: new Date(NOW.getTime() + 3 * DAY),
    ...overrides,
  };
}

type Scheduler = typeof import("../../server/services/dsarDeadlineScheduler");
let sched: Scheduler;
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(async () => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  sched = await import("../../server/services/dsarDeadlineScheduler");
  mocks.getDb.mockReset();
  mocks.notifyClientOnce.mockReset().mockResolvedValue(true);
  mocks.findOrCreateTask.mockReset().mockResolvedValue({ task: { id: 1 }, created: true });
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  sched.stop();
  vi.useRealTimers();
  consoleErrorSpy?.mockRestore();
});

describe("checkDsarDeadlines", () => {
  it("warns for due-soon and overdue, creates a task only for overdue", async () => {
    const { db, queue } = makeDb();
    queue.push([
      dsar({ id: 1, requestId: "DSAR-001", dueDate: new Date(NOW.getTime() + 3 * DAY) }), // due soon
      dsar({ id: 2, requestId: "DSAR-002", dueDate: new Date(NOW.getTime() - 1 * DAY) }), // overdue
      dsar({ id: 3, requestId: "DSAR-003", dueDate: new Date(NOW.getTime() + 30 * DAY) }), // too far out -> skip
      dsar({ id: 4, requestId: "DSAR-004", dueDate: null }), // no due date -> skip
    ]);
    mocks.getDb.mockResolvedValue(db);

    const result = await sched.checkDsarDeadlines();

    expect(result).toEqual({ warned: 2, overdueTasksCreated: 1, errors: 0 });
    expect(mocks.notifyClientOnce).toHaveBeenCalledTimes(2);
    expect(mocks.notifyClientOnce).toHaveBeenCalledWith(5, expect.objectContaining({ type: "dsar_due_soon", relatedEntityId: 1 }));
    expect(mocks.notifyClientOnce).toHaveBeenCalledWith(5, expect.objectContaining({ type: "dsar_overdue", relatedEntityId: 2 }));
    // Only the overdue DSAR gets a remediation task.
    expect(mocks.findOrCreateTask).toHaveBeenCalledTimes(1);
    expect(mocks.findOrCreateTask).toHaveBeenCalledWith(expect.objectContaining({
      clientId: 5,
      priority: "critical",
      relatedEntityType: "dsar_overdue",
      relatedEntityId: 2,
      dueDate: new Date(NOW.getTime() - 1 * DAY),
    }));
  });

  it("does not double-count when notifications/tasks already exist", async () => {
    const { db, queue } = makeDb();
    queue.push([
      dsar({ id: 1, dueDate: new Date(NOW.getTime() + 3 * DAY) }), // due soon
      dsar({ id: 2, dueDate: new Date(NOW.getTime() - 1 * DAY) }), // overdue
    ]);
    mocks.getDb.mockResolvedValue(db);
    mocks.notifyClientOnce.mockResolvedValue(false); // deduped
    mocks.findOrCreateTask.mockResolvedValue({ task: { id: 9 }, created: false }); // already exists

    const result = await sched.checkDsarDeadlines();

    expect(result).toEqual({ warned: 0, overdueTasksCreated: 0, errors: 0 });
    expect(mocks.notifyClientOnce).toHaveBeenCalledTimes(2);
    expect(mocks.findOrCreateTask).toHaveBeenCalledTimes(1);
  });

  it("counts per-DSAR failures into errors and keeps sweeping", async () => {
    const { db, queue } = makeDb();
    queue.push([
      dsar({ id: 1, dueDate: new Date(NOW.getTime() - 1 * DAY) }), // notify throws
      dsar({ id: 2, dueDate: new Date(NOW.getTime() - 1 * DAY) }), // ok
    ]);
    mocks.getDb.mockResolvedValue(db);
    mocks.notifyClientOnce
      .mockRejectedValueOnce(new Error("db down"))
      .mockResolvedValueOnce(true);

    const result = await sched.checkDsarDeadlines();

    expect(result).toEqual({ warned: 1, overdueTasksCreated: 1, errors: 1 });
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
  });

  it("returns zeroes when there are no DSARs", async () => {
    const { db, queue } = makeDb();
    queue.push([]);
    mocks.getDb.mockResolvedValue(db);

    const result = await sched.checkDsarDeadlines();

    expect(result).toEqual({ warned: 0, overdueTasksCreated: 0, errors: 0 });
    expect(mocks.notifyClientOnce).not.toHaveBeenCalled();
    expect(mocks.findOrCreateTask).not.toHaveBeenCalled();
  });

  it("is resilient when the initial query fails", async () => {
    const { db, queue } = makeDb();
    queue.push({ __reject: new Error("query failed") });
    mocks.getDb.mockResolvedValue(db);

    const result = await sched.checkDsarDeadlines();

    expect(result).toEqual({ warned: 0, overdueTasksCreated: 0, errors: 0 });
  });
});
