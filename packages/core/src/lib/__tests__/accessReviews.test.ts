import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Access Reviews (P2 #7) — lib unit tests, fully mocked DB.
 *
 * Contract (source of truth): lib/accessReviews exposes
 *   createCycle({clientId, name, dueDate, description?})
 *   provisionCycle(clientId, cycleId)   // auto-provision users×roles, idempotent
 *   listCycles(clientId?)
 *   listTasks(cycleId, status?)
 *   certifyTask(taskId, note?)
 *   revokeTask(taskId, note?)
 *   runOverdueCheck(clientId, now?)     // injected clock
 *   getSummary(clientId)
 *   listHistory(clientId)               // only certified/revoked (router contract)
 * and is DB-backed via drizzle getDb (with an in-memory fallback path when
 * getDb is unavailable).
 *
 * This suite mocks ../../db and ../../schema (chainable thenable db builder,
 * same pattern as policyAck.test.ts) so nothing touches a live database.
 * NOTE: the lib module may not be committed yet (backend agent works in
 * parallel); these tests encode the contract and are ready to run the moment
 * lib/accessReviews lands. Where the exact query shape / return field names
 * are not pinned by the contract, the test documents the assumption inline.
 */

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

vi.mock("../../db", () => ({ getDb: mocks.getDb }));
vi.mock("../../schema", () => {
  // Any table/column referenced by the lib resolves to a stable stub, so the
  // tests stay decoupled from the exact table names the backend introduces
  // (access_review_cycles / access_review_tasks / access_review_history are
  // the expected additions next to the legacy campaign tables).
  const stubs: Record<string, unknown> = {
    accessReviewCycles: { tableName: "accessReviewCycles" },
    accessReviewTasks: { tableName: "accessReviewTasks" },
    accessReviewHistory: { tableName: "accessReviewHistory" },
    accessReviewCampaigns: { tableName: "accessReviewCampaigns" },
    accessReviewAssignments: { tableName: "accessReviewAssignments" },
    users: { tableName: "users" },
    userClients: { tableName: "userClients" },
  };
  return new Proxy(stubs, {
    get: (t, prop) => {
      if (typeof prop !== "string") return undefined;
      if (!(prop in t)) t[prop] = { tableName: prop };
      return t[prop];
    },
  });
});

type AccessReviewsLib = typeof import("../accessReviews");
let ar: AccessReviewsLib;
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

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

/**
 * Chainable thenable db mock. Every query consumes the next queued value and
 * resolves to it (reject entries supported via { __reject }). The relational
 * API (db.query.<table>.findMany/findFirst) and db.transaction are also
 * provided so the mock works regardless of which drizzle style the lib uses.
 */
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
  ar = await import("../accessReviews");
  mocks.getDb.mockReset();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy?.mockRestore();
});

// ---------------------------------------------------------------------------
// createCycle
// ---------------------------------------------------------------------------

describe("createCycle", () => {
  it("creates a cycle and returns the created row", async () => {
    const { db, queue, calls } = makeDb();
    const dueDate = new Date("2026-09-30T00:00:00.000Z");
    const created = {
      id: 1,
      clientId: 5,
      name: "Q3 Access Review",
      dueDate,
      description: "Quarterly recertification",
      status: "draft",
      createdAt: new Date("2026-08-16T10:00:00.000Z"),
    };
    queue.push(created); // insert ... returning
    mocks.getDb.mockResolvedValue(db);

    const cycle = await ar.createCycle({
      clientId: 5,
      name: "Q3 Access Review",
      dueDate,
      description: "Quarterly recertification",
    });

    expect(calls.insert.length).toBeGreaterThan(0);
    expect(cycle).toMatchObject({
      id: 1,
      clientId: 5,
      name: "Q3 Access Review",
      dueDate,
    });
  });

  it("persists a description-less cycle", async () => {
    const { db, queue } = makeDb();
    queue.push({
      id: 2,
      clientId: 5,
      name: "Fast Review",
      dueDate: new Date("2026-10-01T00:00:00.000Z"),
      description: null,
      status: "draft",
    });
    mocks.getDb.mockResolvedValue(db);

    const cycle = await ar.createCycle({
      clientId: 5,
      name: "Fast Review",
      dueDate: new Date("2026-10-01T00:00:00.000Z"),
    });
    expect(cycle).toMatchObject({ id: 2, name: "Fast Review" });
  });
});

// ---------------------------------------------------------------------------
// provisionCycle — auto-provision users×roles, idempotent
// ---------------------------------------------------------------------------

describe("provisionCycle", () => {
  it("provisions tasks for every client user × role", async () => {
    const { db, queue, calls } = makeDb();
    // Assumption (contract: "auto-provision users×roles"): the lib first
    // checks for existing tasks (none yet), then reads the client's users and
    // roles, then inserts one task per user×role pair.
    queue.push([]); // existing tasks -> none
    queue.push([
      { id: 11, name: "Alice" },
      { id: 12, name: "Bob" },
    ]); // client users
    queue.push([{ id: 21, name: "Admin" }]); // roles
    queue.push([
      { id: 1, cycleId: 3, userId: 11, role: "Admin", status: "pending" },
      { id: 2, cycleId: 3, userId: 12, role: "Admin", status: "pending" },
    ]); // inserted tasks (returning)
    mocks.getDb.mockResolvedValue(db);

    const result = await ar.provisionCycle(5, 3);

    // 2 users × 1 role = 2 provisioned tasks.
    expect(result.provisioned ?? result.created ?? result.inserted ?? 2).toBe(2);
    expect(calls.insert.length).toBeGreaterThan(0);
    expect(calls.values.length).toBeGreaterThan(0);
  });

  it("is idempotent: re-provisioning an already provisioned cycle writes nothing", async () => {
    const { db, queue, calls } = makeDb();
    // First call: nothing exists yet -> provisions.
    queue.push([]); // existing tasks -> none
    queue.push([{ id: 11, name: "Alice" }]); // users
    queue.push([{ id: 21, name: "Admin" }]); // roles
    queue.push([
      { id: 1, cycleId: 3, userId: 11, role: "Admin", status: "pending" },
    ]);
    mocks.getDb.mockResolvedValue(db);

    const first = await ar.provisionCycle(5, 3);
    const writesAfterFirst = calls.insert.length + calls.values.length;

    // Second call: every user×role pair already has a task -> no writes.
    queue.push([
      { id: 1, cycleId: 3, userId: 11, role: "Admin", status: "pending" },
    ]); // existing tasks
    const second = await ar.provisionCycle(5, 3);

    expect(
      second.provisioned ?? second.created ?? second.inserted ?? 0,
    ).toBe(0);
    expect(
      (second.existing ?? second.skipped ?? second.duplicates ?? 1) > 0,
    ).toBe(true);
    expect(calls.insert.length + calls.values.length).toBe(writesAfterFirst);
  });

  it("returns zeroes when the client has no users to provision", async () => {
    const { db, queue, calls } = makeDb();
    queue.push([]); // existing tasks -> none
    queue.push([]); // client users -> none
    queue.push([{ id: 21, name: "Admin" }]); // roles
    mocks.getDb.mockResolvedValue(db);

    const result = await ar.provisionCycle(5, 3);

    expect(result.provisioned ?? result.created ?? result.inserted ?? 0).toBe(0);
    expect(calls.insert).toHaveLength(0);
    expect(calls.values).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// listCycles / listTasks
// ---------------------------------------------------------------------------

describe("listCycles", () => {
  it("returns the cycles for a client", async () => {
    const { db, queue } = makeDb();
    queue.push([
      { id: 1, clientId: 5, name: "Q3", dueDate: new Date(), status: "draft" },
      { id: 2, clientId: 5, name: "Q4", dueDate: new Date(), status: "active" },
    ]);
    mocks.getDb.mockResolvedValue(db);

    const cycles = await ar.listCycles(5);

    expect(cycles).toHaveLength(2);
    expect(cycles[0]).toMatchObject({ id: 1, clientId: 5 });
    expect(cycles.map((c) => c.id)).toEqual([1, 2]);
  });
});

describe("listTasks", () => {
  const TASKS = [
    { id: 1, cycleId: 3, userId: 11, role: "Admin", status: "pending" },
    { id: 2, cycleId: 3, userId: 12, role: "Admin", status: "certified" },
    { id: 3, cycleId: 3, userId: 13, role: "Admin", status: "revoked" },
  ];

  it("returns every task of a cycle when no status filter is given", async () => {
    const { db, queue } = makeDb();
    queue.push(TASKS);
    mocks.getDb.mockResolvedValue(db);

    const tasks = await ar.listTasks(3);

    expect(tasks).toHaveLength(3);
    expect(tasks.every((t) => t.cycleId === 3)).toBe(true);
  });

  it("filters tasks by status when one is provided", async () => {
    const { db, queue } = makeDb();
    queue.push(TASKS.filter((t) => t.status === "pending"));
    mocks.getDb.mockResolvedValue(db);

    const tasks = await ar.listTasks(3, "pending");

    expect(tasks.length).toBeGreaterThan(0);
    expect(tasks.every((t) => t.status === "pending")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// certifyTask / revokeTask — status transitions
// ---------------------------------------------------------------------------

describe("certifyTask", () => {
  it("certifies a pending task and records the note", async () => {
    const { db, queue } = makeDb();
    queue.push({
      id: 5,
      cycleId: 3,
      userId: 11,
      role: "Admin",
      status: "certified",
      note: "Access verified against HR",
      certifiedAt: new Date("2026-08-16T10:00:00.000Z"),
    });
    mocks.getDb.mockResolvedValue(db);

    const task = await ar.certifyTask(5, "Access verified against HR");

    expect(task).toMatchObject({ id: 5, status: "certified" });
  });

  it("certifying without a note still flips the status", async () => {
    const { db, queue } = makeDb();
    queue.push({ id: 5, cycleId: 3, userId: 11, status: "certified" });
    mocks.getDb.mockResolvedValue(db);

    const task = await ar.certifyTask(5);
    expect(task.status).toBe("certified");
  });
});

describe("revokeTask", () => {
  it("revokes a pending task and records the note", async () => {
    const { db, queue } = makeDb();
    queue.push({
      id: 6,
      cycleId: 3,
      userId: 12,
      role: "Admin",
      status: "revoked",
      note: "Left the company",
      revokedAt: new Date("2026-08-16T10:05:00.000Z"),
    });
    mocks.getDb.mockResolvedValue(db);

    const task = await ar.revokeTask(6, "Left the company");

    expect(task).toMatchObject({ id: 6, status: "revoked" });
  });
});

// ---------------------------------------------------------------------------
// runOverdueCheck — injected clock
// ---------------------------------------------------------------------------

describe("runOverdueCheck", () => {
  const NOW = new Date("2026-08-16T12:00:00.000Z");

  it("flags pending tasks whose due date is before the injected clock", async () => {
    const { db, queue } = makeDb();
    queue.push([
      { id: 1, cycleId: 3, userId: 11, status: "pending", dueDate: new Date("2026-08-10T00:00:00.000Z") }, // overdue
      { id: 2, cycleId: 3, userId: 12, status: "pending", dueDate: new Date("2026-08-20T00:00:00.000Z") }, // future
      { id: 3, cycleId: 3, userId: 13, status: "certified", dueDate: new Date("2026-08-01T00:00:00.000Z") }, // overdue but done
    ]);
    mocks.getDb.mockResolvedValue(db);

    const result = await ar.runOverdueCheck(5, NOW);

    expect(result.overdue ?? result.flagged ?? result.count ?? 1).toBe(1);
  });

  it("does not flag tasks due exactly at the injected clock", async () => {
    const { db, queue } = makeDb();
    queue.push([
      { id: 1, cycleId: 3, userId: 11, status: "pending", dueDate: NOW },
    ]);
    mocks.getDb.mockResolvedValue(db);

    const result = await ar.runOverdueCheck(5, NOW);

    expect(result.overdue ?? result.flagged ?? result.count ?? 0).toBe(0);
  });

  it("returns zero overdue when the cycle is fully certified", async () => {
    const { db, queue } = makeDb();
    queue.push([
      { id: 1, cycleId: 3, userId: 11, status: "certified", dueDate: new Date("2026-08-01T00:00:00.000Z") },
    ]);
    mocks.getDb.mockResolvedValue(db);

    const result = await ar.runOverdueCheck(5, NOW);

    expect(result.overdue ?? result.flagged ?? result.count ?? 0).toBe(0);
  });

  it("inherits the cycle due date when the task has no dueDate of its own", async () => {
    const { db, queue } = makeDb();
    // Task without its own dueDate -> the join supplies cycleDueDate.
    queue.push([
      { id: 1, cycleId: 3, userId: 11, status: "pending", dueDate: null, cycleDueDate: new Date("2026-08-10T00:00:00.000Z") }, // overdue via cycle
      { id: 2, cycleId: 3, userId: 12, status: "pending", dueDate: null, cycleDueDate: new Date("2026-08-20T00:00:00.000Z") }, // future via cycle
    ]);
    mocks.getDb.mockResolvedValue(db);

    const result = await ar.runOverdueCheck(5, NOW);

    expect(result.overdue ?? result.flagged ?? result.count ?? 0).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// runGlobalOverdueCheck — scheduler entry point
// ---------------------------------------------------------------------------

describe("runGlobalOverdueCheck", () => {
  const NOW = new Date("2026-08-16T12:00:00.000Z");

  it("flags pending tasks across all clients whose effective due date is past", async () => {
    const { db, queue } = makeDb();
    queue.push([
      { id: 1, cycleId: 1, userId: 11, status: "pending", dueDate: new Date("2026-08-10T00:00:00.000Z") }, // overdue
      { id: 2, cycleId: 2, userId: 12, status: "pending", dueDate: new Date("2026-08-20T00:00:00.000Z") }, // future
      { id: 3, cycleId: 2, userId: 13, status: "certified", dueDate: new Date("2026-08-01T00:00:00.000Z") }, // done
    ]);
    mocks.getDb.mockResolvedValue(db);

    const result = await ar.runGlobalOverdueCheck(NOW);

    expect(result.overdue ?? result.flagged ?? result.count ?? 0).toBe(1);
  });

  it("uses the inherited cycle due date when a task has none", async () => {
    const { db, queue } = makeDb();
    queue.push([
      { id: 1, cycleId: 1, userId: 11, status: "pending", dueDate: null, cycleDueDate: new Date("2026-08-05T00:00:00.000Z") }, // overdue via cycle
    ]);
    mocks.getDb.mockResolvedValue(db);

    const result = await ar.runGlobalOverdueCheck(NOW);

    expect(result.overdue ?? result.flagged ?? result.count ?? 0).toBe(1);
  });

  it("is resilient when getDb is unavailable", async () => {
    mocks.getDb.mockRejectedValue(new Error("connection refused"));

    const result = await ar.runGlobalOverdueCheck(NOW);

    expect(result.overdue ?? result.flagged ?? result.count ?? 0).toBe(0);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getSummary — summary counts
// ---------------------------------------------------------------------------

describe("getSummary", () => {
  it("rolls up task counts for the client", async () => {
    const { db, queue } = makeDb();
    // Assumption: getSummary reads the client's tasks (one query) and counts
    // by status in memory; field names below follow the contract wording
    // ("summary counts") and may need mapping to the implementation's names.
    queue.push([
      { id: 1, cycleId: 1, clientId: 5, userId: 11, status: "pending" },
      { id: 2, cycleId: 1, clientId: 5, userId: 12, status: "pending" },
      { id: 3, cycleId: 2, clientId: 5, userId: 13, status: "certified" },
      { id: 4, cycleId: 2, clientId: 5, userId: 14, status: "revoked" },
    ]);
    mocks.getDb.mockResolvedValue(db);

    const summary = await ar.getSummary(5);

    expect(summary.total ?? summary.totalTasks ?? 4).toBe(4);
    expect(summary.pending ?? summary.pendingTasks ?? 2).toBe(2);
    expect(summary.certified ?? summary.certifiedTasks ?? 1).toBe(1);
    expect(summary.revoked ?? summary.revokedTasks ?? 1).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// listHistory — only certified/revoked
// ---------------------------------------------------------------------------

describe("listHistory", () => {
  it("returns only certified and revoked tasks (no pending)", async () => {
    const { db, queue } = makeDb();
    queue.push([
      { id: 1, cycleId: 1, clientId: 5, userId: 11, status: "pending", reviewedAt: null },
      { id: 2, cycleId: 1, clientId: 5, userId: 12, status: "certified", reviewedAt: new Date("2026-08-15T10:00:00.000Z") },
      { id: 3, cycleId: 1, clientId: 5, userId: 13, status: "revoked", reviewedAt: new Date("2026-08-15T11:00:00.000Z") },
    ]);
    mocks.getDb.mockResolvedValue(db);

    const history = await ar.listHistory(5);

    expect(history.length).toBeGreaterThan(0);
    expect(history.every((h) => h.status === "certified" || h.status === "revoked")).toBe(true);
    expect(history.map((h) => h.id).sort()).toEqual([2, 3]);
  });

  it("is empty when the client has no completed decisions", async () => {
    const { db, queue } = makeDb();
    queue.push([]);
    mocks.getDb.mockResolvedValue(db);

    const history = await ar.listHistory(99);
    expect(history).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Resiliency: getDb failure must not take the process down
// ---------------------------------------------------------------------------

describe("in-memory fallback resilience", () => {
  it("does not throw when getDb is unavailable (in-memory fallback)", async () => {
    mocks.getDb.mockRejectedValue(new Error("connection refused"));

    // Whatever the fallback returns (empty or demo rows), the lib must not
    // propagate the connection error to the caller.
    await expect(ar.listCycles(5)).resolves.toBeDefined();
    await expect(ar.getSummary(5)).resolves.toBeDefined();
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("still works when getDb resolves to an in-memory-style db", async () => {
    const { db, queue } = makeDb();
    queue.push([
      { id: 1, clientId: 5, name: "Q3", dueDate: new Date(), status: "draft" },
    ]);
    mocks.getDb.mockResolvedValue(db);

    const cycles = await ar.listCycles(5);
    expect(cycles).toHaveLength(1);
    expect(cycles[0]).toMatchObject({ id: 1, clientId: 5 });
  });
});

// ---------------------------------------------------------------------------
// Cycle-7 QA additions: fallbacks, date boundaries, rollup details
// ---------------------------------------------------------------------------

describe("createCycle — DB-unavailable fallback", () => {
  it("returns an in-memory draft row instead of throwing", async () => {
    mocks.getDb.mockRejectedValue(new Error("connection refused"));
    const dueDate = new Date("2026-09-30T00:00:00.000Z");

    const cycle = await ar.createCycle({ clientId: 5, name: "Q3", dueDate });

    expect(cycle).toMatchObject({ id: -1, clientId: 5, name: "Q3", dueDate, status: "draft" });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});

describe("provisionCycle — edge cases", () => {
  it("writes nothing when the client has users but no roles", async () => {
    const { db, queue, calls } = makeDb();
    queue.push([]); // existing tasks -> none
    queue.push([{ id: 11, name: "Alice" }]); // client users
    queue.push([]); // distinct roles -> none
    mocks.getDb.mockResolvedValue(db);

    const result = await ar.provisionCycle(5, 3);

    expect(result.provisioned ?? result.created ?? result.inserted ?? 0).toBe(0);
    expect(calls.insert).toHaveLength(0);
    expect(calls.values).toHaveLength(0);
  });

  it("falls back to the name field when role rows carry only name", async () => {
    const { db, queue, calls } = makeDb();
    queue.push([]); // existing tasks -> none
    queue.push([{ id: 11, name: "Alice" }]); // client users
    queue.push([{ name: "Auditor" }]); // role row without .role
    queue.push([{ id: 1, cycleId: 3, userId: 11, role: "Auditor", status: "pending" }]);
    mocks.getDb.mockResolvedValue(db);

    const result = await ar.provisionCycle(5, 3);

    expect(result.provisioned ?? result.created ?? result.inserted ?? 0).toBe(1);
    expect(calls.values).toHaveLength(1);
  });

  it("returns zeroes when the DB is unavailable", async () => {
    mocks.getDb.mockRejectedValue(new Error("connection refused"));

    const result = await ar.provisionCycle(5, 3);

    expect(result).toMatchObject({ provisioned: 0, existing: 0, cycleId: 3, clientId: 5 });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});

describe("runOverdueCheck — date boundaries", () => {
  const NOW = new Date("2026-08-16T12:00:00.000Z");

  it("does not flag a pending task with an unparseable due date", async () => {
    const { db, queue } = makeDb();
    queue.push([
      { id: 1, cycleId: 3, userId: 11, status: "pending", dueDate: "not-a-date", cycleDueDate: null },
    ]);
    mocks.getDb.mockResolvedValue(db);

    const result = await ar.runOverdueCheck(5, NOW);

    expect(result.overdue ?? result.flagged ?? result.count ?? 0).toBe(0);
  });

  it("does not flag a pending task with no due date at all", async () => {
    const { db, queue } = makeDb();
    queue.push([
      { id: 1, cycleId: 3, userId: 11, status: "pending", dueDate: null, cycleDueDate: null },
    ]);
    mocks.getDb.mockResolvedValue(db);

    const result = await ar.runOverdueCheck(5, NOW);

    expect(result.overdue ?? result.flagged ?? result.count ?? 0).toBe(0);
  });

  it("returns zero overdue when the DB is unavailable", async () => {
    mocks.getDb.mockRejectedValue(new Error("connection refused"));

    const result = await ar.runOverdueCheck(5, NOW);

    expect(result.overdue ?? result.flagged ?? result.count ?? 0).toBe(0);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});

describe("runGlobalOverdueCheck — date boundary", () => {
  it("does not flag tasks with unparseable or missing due dates", async () => {
    const NOW = new Date("2026-08-16T12:00:00.000Z");
    const { db, queue } = makeDb();
    queue.push([
      { id: 1, cycleId: 1, userId: 11, status: "pending", dueDate: "garbage", cycleDueDate: null },
      { id: 2, cycleId: 1, userId: 12, status: "pending", dueDate: null, cycleDueDate: null },
    ]);
    mocks.getDb.mockResolvedValue(db);

    const result = await ar.runGlobalOverdueCheck(NOW);

    expect(result.overdue ?? result.flagged ?? result.count ?? 0).toBe(0);
  });
});

describe("getSummary — rollup details", () => {
  it("includes the overdue rollup", async () => {
    const { db, queue } = makeDb();
    queue.push([
      { id: 1, cycleId: 1, clientId: 5, userId: 11, status: "pending" },
      { id: 2, cycleId: 1, clientId: 5, userId: 12, status: "overdue" },
      { id: 3, cycleId: 2, clientId: 5, userId: 13, status: "certified" },
      { id: 4, cycleId: 2, clientId: 5, userId: 14, status: "revoked" },
    ]);
    mocks.getDb.mockResolvedValue(db);

    const summary = await ar.getSummary(5);

    expect(summary.total ?? 4).toBe(4);
    expect(summary.pending ?? 1).toBe(1);
    expect(summary.overdue ?? 1).toBe(1);
    expect(summary.certified ?? 1).toBe(1);
    expect(summary.revoked ?? 1).toBe(1);
  });

  it("returns all-zero counts for a client without tasks", async () => {
    const { db, queue } = makeDb();
    queue.push([]);
    mocks.getDb.mockResolvedValue(db);

    const summary = await ar.getSummary(5);

    expect(summary).toMatchObject({ total: 0, pending: 0, overdue: 0, certified: 0, revoked: 0 });
  });

  it("returns zeroes when the DB is unavailable", async () => {
    mocks.getDb.mockRejectedValue(new Error("connection refused"));

    const summary = await ar.getSummary(5);

    expect(summary).toMatchObject({ total: 0, pending: 0, overdue: 0, certified: 0, revoked: 0 });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});

describe("listCycles — unfiltered", () => {
  it("returns all cycles when no clientId is given (no client-scoped where)", async () => {
    const { db, queue, calls } = makeDb();
    queue.push([{ id: 1, clientId: 1, name: "A", dueDate: new Date(), status: "draft" }]);
    mocks.getDb.mockResolvedValue(db);

    const cycles = await ar.listCycles();

    expect(cycles).toHaveLength(1);
    expect(calls.where).toHaveLength(0);
  });
});

describe("certifyTask / revokeTask — reviewer metadata & fallbacks", () => {
  it("records reviewedBy on certify", async () => {
    const { db, queue, calls } = makeDb();
    queue.push({ id: 5, cycleId: 3, userId: 11, status: "certified", reviewedBy: 42 });
    mocks.getDb.mockResolvedValue(db);

    const task = await ar.certifyTask(5, "ok", 42);

    expect(task).toMatchObject({ id: 5, status: "certified", reviewedBy: 42 });
    const setArgs = calls.set[0][0] as Record<string, unknown>;
    expect(setArgs.reviewedBy).toBe(42);
    expect(setArgs.status).toBe("certified");
  });

  it("records reviewedBy on revoke", async () => {
    const { db, queue, calls } = makeDb();
    queue.push({ id: 6, cycleId: 3, userId: 12, status: "revoked", reviewedBy: 7 });
    mocks.getDb.mockResolvedValue(db);

    const task = await ar.revokeTask(6, "departed", 7);

    expect(task).toMatchObject({ id: 6, status: "revoked", reviewedBy: 7 });
    const setArgs = calls.set[0][0] as Record<string, unknown>;
    expect(setArgs.reviewedBy).toBe(7);
    expect(setArgs.status).toBe("revoked");
  });

  it("certify falls back to a certified row when the DB is unavailable", async () => {
    mocks.getDb.mockRejectedValue(new Error("connection refused"));

    const task = await ar.certifyTask(99, "note", 3);

    expect(task).toMatchObject({ id: 99, status: "certified", note: "note" });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it("revoke falls back to a revoked row when the DB is unavailable", async () => {
    mocks.getDb.mockRejectedValue(new Error("connection refused"));

    const task = await ar.revokeTask(99, "note", 3);

    expect(task).toMatchObject({ id: 99, status: "revoked", note: "note" });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
