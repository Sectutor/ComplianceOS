import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * policyAck tests — fully mocked DB, no live connection.
 *
 * Follows the controlAutoTestEngine.test.ts pattern (chainable thenable db
 * builder + vi.mock of ../../db and ../../schema). Each fresh module re-runs
 * the 4 DDL statements in ensurePolicyAckTableExists before any query.
 */

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  policyAcknowledgements: {
    id: "pa.id",
    policyId: "pa.policyId",
    userId: "pa.userId",
    clientId: "pa.clientId",
    status: "pa.status",
    acknowledgedAt: "pa.acknowledgedAt",
    createdAt: "pa.createdAt",
  },
  clientPolicies: { id: "cp.id", name: "cp.name", clientId: "cp.clientId" },
  userClients: { userId: "uc.userId", clientId: "uc.clientId" },
  users: { id: "u.id", name: "u.name" },
}));

vi.mock("../../db", () => ({ getDb: mocks.getDb }));
vi.mock("../../schema", () => ({
  policyAcknowledgements: mocks.policyAcknowledgements,
  clientPolicies: mocks.clientPolicies,
  userClients: mocks.userClients,
  users: mocks.users,
}));

type Ack = typeof import("../policyAck");
let ack: Ack;
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

const CHAIN_METHODS = [
  "select",
  "from",
  "innerJoin",
  "where",
  "orderBy",
  "limit",
  "insert",
  "values",
  "update",
  "set",
  "returning",
  "execute",
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

  const db = makeChain();
  delete db.then;
  return { db, queue, calls };
}

function rejectQueue(err: Error) {
  return { __reject: err };
}

/** ensurePolicyAckTableExists issues 1 CREATE TABLE + 3 CREATE INDEX. */
function seedDdl(queue: unknown[]) {
  queue.push(...Array(4).fill(undefined));
}

beforeEach(async () => {
  vi.resetModules();
  ack = await import("../policyAck");
  mocks.getDb.mockReset();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy?.mockRestore();
});

// ---------------------------------------------------------------------------
// Pure: ack flow logic
// ---------------------------------------------------------------------------

describe("canAcknowledge", () => {
  it("allows pending and declined rows to be acknowledged", () => {
    expect(ack.canAcknowledge("pending")).toBe(true);
    expect(ack.canAcknowledge("declined")).toBe(true);
    expect(ack.canAcknowledge(null)).toBe(true);
    expect(ack.canAcknowledge("PENDING")).toBe(true);
  });

  it("rejects already acknowledged and unknown statuses", () => {
    expect(ack.canAcknowledge("acknowledged")).toBe(false);
    expect(ack.canAcknowledge("bogus")).toBe(false);
  });
});

describe("resolveAcknowledgeTransition", () => {
  it("is idempotent for acknowledged rows", () => {
    const res = ack.resolveAcknowledgeTransition("acknowledged");
    expect(res).toEqual({ allowed: true, nextStatus: "acknowledged" });
  });

  it("flips pending/declined to acknowledged", () => {
    expect(ack.resolveAcknowledgeTransition("pending").nextStatus).toBe("acknowledged");
    expect(ack.resolveAcknowledgeTransition("declined").nextStatus).toBe("acknowledged");
    expect(ack.resolveAcknowledgeTransition(null).nextStatus).toBe("acknowledged");
  });

  it("rejects unknown statuses", () => {
    const res = ack.resolveAcknowledgeTransition("bogus");
    expect(res.allowed).toBe(false);
    expect(res.reason).toContain("Unknown status");
  });
});

// ---------------------------------------------------------------------------
// DB-backed: listPendingAcks
// ---------------------------------------------------------------------------

describe("listPendingAcks", () => {
  it("returns pending acks joined with the policy title, newest first", async () => {
    const { db, queue, calls } = makeDb();
    seedDdl(queue);
    queue.push([
      { id: 1, policyId: 5, userId: 9, clientId: 7, status: "pending", acknowledgedAt: null, createdAt: new Date(), policyTitle: "Acceptable Use" },
      { id: 2, policyId: 6, userId: 9, clientId: 7, status: "pending", acknowledgedAt: null, createdAt: new Date(), policyTitle: null },
    ]);
    mocks.getDb.mockResolvedValue(db);

    const rows = await ack.listPendingAcks(7, 9);

    expect(db.execute).toHaveBeenCalledTimes(4);
    expect(calls.from[0][0]).toBe(mocks.policyAcknowledgements);
    expect(calls.innerJoin[0][0]).toBe(mocks.clientPolicies);
    expect(rows).toHaveLength(2);
    expect(rows[0].policyTitle).toBe("Acceptable Use");
    expect(rows[1].policyTitle).toBe("Policy #6"); // fallback title
    expect(rows.every((r) => r.status === "pending")).toBe(true);
  });

  it("continues even when the DDL bootstrap fails", async () => {
    const { db, queue } = makeDb();
    queue.push(rejectQueue(new Error("permission denied")));
    queue.push([
      { id: 1, policyId: 5, userId: 9, clientId: 7, status: "pending", acknowledgedAt: null, createdAt: new Date(), policyTitle: "AUP" },
    ]);
    mocks.getDb.mockResolvedValue(db);

    const rows = await ack.listPendingAcks(7, 9);
    expect(rows).toHaveLength(1);
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// DB-backed: acknowledgePolicy
// ---------------------------------------------------------------------------

describe("acknowledgePolicy", () => {
  it("inserts a new acknowledged row when none exists", async () => {
    const { db, queue, calls } = makeDb();
    seedDdl(queue);
    queue.push([]); // existing lookup -> none
    queue.push([
      {
        id: 10,
        policyId: 5,
        userId: 9,
        clientId: 7,
        status: "acknowledged",
        acknowledgedAt: new Date(),
        createdAt: new Date(),
      },
    ]); // insert returning
    mocks.getDb.mockResolvedValue(db);

    const row = await ack.acknowledgePolicy({ clientId: 7, userId: 9, policyId: 5 });

    expect(row.status).toBe("acknowledged");
    expect(calls.insert[0][0]).toBe(mocks.policyAcknowledgements);
    const values = calls.values[0][0];
    expect(values).toMatchObject({ clientId: 7, userId: 9, policyId: 5, status: "acknowledged" });
    expect(values.acknowledgedAt).toBeInstanceOf(Date);
  });

  it("updates an existing pending row in place", async () => {
    const { db, queue, calls } = makeDb();
    seedDdl(queue);
    queue.push([
      {
        id: 10,
        policyId: 5,
        userId: 9,
        clientId: 7,
        status: "pending",
        acknowledgedAt: null,
        createdAt: new Date(),
      },
    ]);
    queue.push([
      {
        id: 10,
        policyId: 5,
        userId: 9,
        clientId: 7,
        status: "acknowledged",
        acknowledgedAt: new Date(),
        createdAt: new Date(),
      },
    ]);
    mocks.getDb.mockResolvedValue(db);

    const row = await ack.acknowledgePolicy({ clientId: 7, userId: 9, policyId: 5 });

    expect(row.status).toBe("acknowledged");
    expect(calls.update[0][0]).toBe(mocks.policyAcknowledgements);
    expect(calls.set[0][0]).toMatchObject({ status: "acknowledged" });
    expect(calls.set[0][0].acknowledgedAt).toBeInstanceOf(Date);
    expect(calls.insert).toHaveLength(0);
  });

  it("re-acknowledges a declined row", async () => {
    const { db, queue } = makeDb();
    seedDdl(queue);
    queue.push([
      {
        id: 10,
        policyId: 5,
        userId: 9,
        clientId: 7,
        status: "declined",
        acknowledgedAt: null,
        createdAt: new Date(),
      },
    ]);
    queue.push([
      {
        id: 10,
        policyId: 5,
        userId: 9,
        clientId: 7,
        status: "acknowledged",
        acknowledgedAt: new Date(),
        createdAt: new Date(),
      },
    ]);
    mocks.getDb.mockResolvedValue(db);

    const row = await ack.acknowledgePolicy({ clientId: 7, userId: 9, policyId: 5 });
    expect(row.status).toBe("acknowledged");
  });

  it("is idempotent when already acknowledged (no write)", async () => {
    const { db, queue, calls } = makeDb();
    seedDdl(queue);
    queue.push([
      {
        id: 10,
        policyId: 5,
        userId: 9,
        clientId: 7,
        status: "acknowledged",
        acknowledgedAt: new Date(),
        createdAt: new Date(),
      },
    ]);
    mocks.getDb.mockResolvedValue(db);

    const row = await ack.acknowledgePolicy({ clientId: 7, userId: 9, policyId: 5 });

    expect(row.status).toBe("acknowledged");
    expect(calls.insert).toHaveLength(0);
    expect(calls.update).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// DB-backed: listAcksForPolicy
// ---------------------------------------------------------------------------

describe("listAcksForPolicy", () => {
  it("returns all acks for a policy scoped to the client", async () => {
    const { db, queue, calls } = makeDb();
    seedDdl(queue);
    queue.push([
      { id: 1, policyId: 5, userId: 9, clientId: 7, status: "acknowledged", acknowledgedAt: new Date(), createdAt: new Date(), policyTitle: "AUP" },
      { id: 2, policyId: 5, userId: 10, clientId: 7, status: "pending", acknowledgedAt: null, createdAt: new Date(), policyTitle: "AUP" },
    ]);
    mocks.getDb.mockResolvedValue(db);

    const rows = await ack.listAcksForPolicy(5, 7);

    expect(calls.from[0][0]).toBe(mocks.policyAcknowledgements);
    expect(rows).toHaveLength(2);
    expect(rows.map((r) => r.status)).toEqual(["acknowledged", "pending"]);
  });
});

// ---------------------------------------------------------------------------
// DB-backed: getAckSummary
// ---------------------------------------------------------------------------

describe("getAckSummary", () => {
  it("rolls up per-policy acknowledgment stats", async () => {
    const { db, queue } = makeDb();
    seedDdl(queue);
    queue.push([
      { policyId: 5, policyTitle: "AUP", status: "acknowledged" },
      { policyId: 5, policyTitle: "AUP", status: "acknowledged" },
      { policyId: 5, policyTitle: "AUP", status: "pending" },
      { policyId: 6, policyTitle: null, status: "pending" },
    ]);
    mocks.getDb.mockResolvedValue(db);

    const summary = await ack.getAckSummary(7);

    expect(summary).toHaveLength(2);
    const aup = summary.find((s) => s.policyId === 5)!;
    expect(aup).toMatchObject({
      policyTitle: "AUP",
      total: 3,
      acknowledgedCount: 2,
      pendingCount: 1,
      acknowledgmentRatePct: 67,
    });
    const p6 = summary.find((s) => s.policyId === 6)!;
    expect(p6.policyTitle).toBe("Policy #6");
    expect(p6.acknowledgmentRatePct).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Cycle-6 (P1 #4): reminder selection (pure) + assignment (db-backed)
// ---------------------------------------------------------------------------

describe("selectAcksDueForReminder", () => {
  const NOW = new Date("2026-01-15T10:00:00.000Z");

  it("flags only pending acks older than the default 3-day threshold", () => {
    const flagged = ack.selectAcksDueForReminder(
      [
        { id: 1, status: "pending", createdAt: new Date("2026-01-11T00:00:00.000Z") }, // > 3 days
        { id: 2, status: "pending", createdAt: new Date("2026-01-12T10:00:00.000Z") }, // exactly 3 days
        { id: 3, status: "pending", createdAt: new Date("2026-01-13T00:00:00.000Z") }, // < 3 days
        { id: 4, status: "acknowledged", createdAt: new Date("2026-01-01T00:00:00.000Z") },
        { id: 5, status: "declined", createdAt: new Date("2026-01-01T00:00:00.000Z") },
      ],
      NOW
    );
    expect(flagged.map((f) => f.id)).toEqual([1, 2]);
    expect(flagged.every((f) => f.overdueDays === 3)).toBe(true);
  });

  it("respects a custom threshold and skips rows without createdAt", () => {
    const flagged = ack.selectAcksDueForReminder(
      [
        { id: 1, status: "pending", createdAt: new Date("2026-01-13T00:00:00.000Z") }, // 2 days
        { id: 2, status: "pending", createdAt: null },
        { id: 3, status: "pending", createdAt: "2026-01-10T00:00:00.000Z" }, // ISO string
      ],
      NOW,
      2
    );
    expect(flagged.map((f) => f.id)).toEqual([1, 3]);
  });

  it("returns [] for empty input", () => {
    expect(ack.selectAcksDueForReminder([], NOW)).toEqual([]);
  });
});

describe("assignPolicy", () => {
  it("assigns to every linked client user when allUsers is set (idempotent inserts)", async () => {
    const { db, queue, calls } = makeDb();
    seedDdl(queue);
    queue.push([
      { userId: 11 },
      { userId: 12 },
      { userId: 13 },
    ]); // user_clients links
    queue.push([]); // existing acks -> none
    queue.push(undefined); // insert resolution
    mocks.getDb.mockResolvedValue(db);

    const result = await ack.assignPolicy({ clientId: 7, policyId: 5, allUsers: true });

    expect(result).toEqual({ assigned: 3, existing: 0, userIds: [11, 12, 13] });
    expect(calls.from[0][0]).toBe(mocks.userClients);
    expect(calls.from[1][0]).toBe(mocks.policyAcknowledgements);
    const values = calls.values[0][0];
    expect(values).toHaveLength(3);
    expect(values[0]).toMatchObject({ clientId: 7, policyId: 5, userId: 11, status: "pending" });
  });

  it("assigns explicit userIds without touching user_clients", async () => {
    const { db, queue, calls } = makeDb();
    seedDdl(queue);
    queue.push([]); // existing acks -> none
    queue.push(undefined); // insert resolution
    mocks.getDb.mockResolvedValue(db);

    const result = await ack.assignPolicy({ clientId: 7, policyId: 5, userIds: [21, 22] });

    expect(result).toEqual({ assigned: 2, existing: 0, userIds: [21, 22] });
    expect(calls.from).toHaveLength(1); // only the existing-acks query
    expect(calls.from[0][0]).toBe(mocks.policyAcknowledgements);
  });

  it("skips users who already have an ack row (idempotent)", async () => {
    const { db, queue, calls } = makeDb();
    seedDdl(queue);
    queue.push([{ userId: 21 }, { userId: 22 }]); // existing acks
    mocks.getDb.mockResolvedValue(db);

    const result = await ack.assignPolicy({ clientId: 7, policyId: 5, userIds: [21, 22] });

    expect(result).toEqual({ assigned: 0, existing: 2, userIds: [21, 22] });
    expect(calls.insert).toHaveLength(0);
    expect(calls.values).toHaveLength(0);
  });

  it("returns zeroes when there are no target users", async () => {
    const { db, queue } = makeDb();
    seedDdl(queue);
    queue.push([]); // user_clients links -> none
    mocks.getDb.mockResolvedValue(db);

    const result = await ack.assignPolicy({ clientId: 7, policyId: 5 });
    expect(result).toEqual({ assigned: 0, existing: 0, userIds: [] });
  });
});

describe("runPolicyAckReminders", () => {
  it("flags overdue pending acks via the onFlag hook", async () => {
    const { db, queue, calls } = makeDb();
    seedDdl(queue);
    queue.push([
      { id: 1, policyId: 5, userId: 9, clientId: 7, status: "pending", acknowledgedAt: null, createdAt: new Date("2026-01-01T00:00:00.000Z"), policyTitle: "AUP" },
      { id: 2, policyId: 5, userId: 10, clientId: 7, status: "pending", acknowledgedAt: null, createdAt: new Date("2026-01-01T00:00:00.000Z"), policyTitle: null },
    ]);
    mocks.getDb.mockResolvedValue(db);
    const onFlag = vi.fn();

    const summary = await ack.runPolicyAckReminders({
      db,
      now: new Date("2026-01-15T10:00:00.000Z"),
      overdueDays: 3,
      onFlag,
    });

    expect(calls.innerJoin[0][0]).toBe(mocks.clientPolicies);
    expect(summary).toMatchObject({ flagged: 2, overdueDays: 3, skipped: false });
    expect(onFlag).toHaveBeenCalledTimes(2);
    expect(onFlag.mock.calls[0][0]).toMatchObject({ id: 1, policyTitle: "AUP" });
    expect(onFlag.mock.calls[1][0].policyTitle).toBe("Policy #5"); // fallback title
  });

  it("returns zero flagged when nothing is overdue", async () => {
    const { db, queue } = makeDb();
    seedDdl(queue);
    queue.push([]);
    mocks.getDb.mockResolvedValue(db);

    const summary = await ack.runPolicyAckReminders({
      db,
      now: new Date("2026-01-15T10:00:00.000Z"),
    });
    expect(summary.flagged).toBe(0);
  });
});
