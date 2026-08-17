import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Compliance Snapshot Scheduler (cycle 7) — unit tests with mocked DB.
 *
 * Contract under test (lib/complianceSnapshotScheduler):
 *   - one snapshot per client per week (skip when a snapshot exists within
 *     the last 6 days)
 *   - complianceScore = round(implemented / (total - not_applicable) * 100)
 *   - riskScore = round(openRisks / totalRisks * 100) (0 when no risks)
 *   - controlsClosedThisPeriod = max(0, implemented - prev.implemented)
 *   - per-client failures count into errors and don't abort the sweep
 *
 * Query order per client (chainable mock consumes one queued value per await):
 *   [recent] -> [controls] -> [risks] -> [prevSnapshot] -> [insert result]
 */

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

vi.mock("../../db", () => ({ getDb: mocks.getDb }));
vi.mock("../../schema", () => {
  const stubs: Record<string, unknown> = {
    clients: { tableName: "clients" },
    complianceSnapshots: { tableName: "complianceSnapshots" },
    clientControls: { tableName: "clientControls" },
    riskAssessments: { tableName: "riskAssessments" },
  };
  return new Proxy(stubs, {
    get: (t, prop) => {
      if (typeof prop !== "string") return undefined;
      if (!(prop in t)) t[prop] = { tableName: prop };
      return t[prop];
    },
  });
});

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

type Scheduler = typeof import("../../server/services/complianceSnapshotScheduler");
let sched: Scheduler;
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

function lastInsertValues(calls: Record<string, unknown[][]>): Record<string, unknown> {
  const valuesCalls = calls.values as unknown[][];
  return valuesCalls[valuesCalls.length - 1][0] as Record<string, unknown>;
}

beforeEach(async () => {
  vi.resetModules();
  sched = await import("../../server/services/complianceSnapshotScheduler");
  mocks.getDb.mockReset();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  sched.stop();
  consoleErrorSpy?.mockRestore();
});

describe("captureSnapshotsForAllClients", () => {
  it("creates one snapshot per client and computes scores", async () => {
    const { db, queue, calls } = makeDb();
    queue.push([{ id: 1 }]); // clients list
    queue.push([]); // no recent snapshot
    queue.push([
      { status: "implemented" },
      { status: "implemented" },
      { status: "not_applicable" },
    ]); // controls: 2/3 implemented, 1 n/a
    queue.push([
      { status: "treated" },
      { status: "open" },
    ]); // risks: 1/2 mitigated
    queue.push([]); // no previous snapshot
    queue.push([{ id: 11 }]); // insert result
    mocks.getDb.mockResolvedValue(db);

    const result = await sched.captureSnapshotsForAllClients();

    expect(result).toEqual({ created: 1, skipped: 0, errors: 0 });
    const values = lastInsertValues(calls);
    expect(values).toMatchObject({
      clientId: 1,
      totalControls: 3,
      implementedControls: 2,
      notApplicableControls: 1,
      complianceScore: 100, // 2 / (3 - 1) * 100
      totalRisks: 2,
      mitigatedRisks: 1,
      riskScore: 50, // 1 open / 2 * 100
      controlsClosedThisPeriod: 0,
    });
  });

  it("skips a client that already has a snapshot within the last 6 days", async () => {
    const { db, queue, calls } = makeDb();
    queue.push([{ id: 1 }, { id: 2 }]); // clients list
    queue.push([{ id: 9 }]); // client 1 has a recent snapshot -> skip
    queue.push([]); // client 2: no recent snapshot
    queue.push([{ status: "implemented" }]);
    queue.push([]);
    queue.push([]);
    queue.push([{ id: 12 }]);
    mocks.getDb.mockResolvedValue(db);

    const result = await sched.captureSnapshotsForAllClients();

    expect(result).toEqual({ created: 1, skipped: 1, errors: 0 });
    expect(lastInsertValues(calls)).toMatchObject({ clientId: 2 });
  });

  it("counts per-client errors and continues with the next client", async () => {
    const { db, queue, calls } = makeDb();
    queue.push([{ id: 1 }, { id: 2 }]); // clients list
    queue.push([]); // client 1: no recent snapshot
    queue.push({ __reject: new Error("controls query failed") }); // client 1 fails
    queue.push([]); // client 2: no recent snapshot
    queue.push([{ status: "implemented" }]);
    queue.push([]);
    queue.push([]);
    queue.push([{ id: 13 }]);
    mocks.getDb.mockResolvedValue(db);

    const result = await sched.captureSnapshotsForAllClients();

    expect(result).toEqual({ created: 1, skipped: 0, errors: 1 });
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(lastInsertValues(calls)).toMatchObject({ clientId: 2 });
  });

  it("computes controlsClosedThisPeriod from the previous snapshot", async () => {
    const { db, queue, calls } = makeDb();
    queue.push([{ id: 1 }]);
    queue.push([]); // no recent snapshot
    queue.push([{ status: "implemented" }, { status: "implemented" }, { status: "implemented" }]);
    queue.push([]); // no risks -> riskScore 0 (no NaN)
    queue.push([{ implementedControls: 1 }]); // previous snapshot
    queue.push([{ id: 14 }]);
    mocks.getDb.mockResolvedValue(db);

    const result = await sched.captureSnapshotsForAllClients();

    expect(result).toEqual({ created: 1, skipped: 0, errors: 0 });
    expect(lastInsertValues(calls)).toMatchObject({
      implementedControls: 3,
      complianceScore: 100,
      riskScore: 0,
      controlsClosedThisPeriod: 2, // max(0, 3 - 1)
    });
  });

  it("returns zeroes when the clients query fails", async () => {
    const { db, queue } = makeDb();
    queue.push({ __reject: new Error("clients query failed") });
    mocks.getDb.mockResolvedValue(db);

    const result = await sched.captureSnapshotsForAllClients();

    expect(result).toEqual({ created: 0, skipped: 0, errors: 0 });
  });
});
