import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * controlAutoTestEngine tests — fully mocked DB, no live connection.
 *
 * The engine imports `getDb` from `../db` (a module that wires up a postgres
 * pool at load time) plus the `schema` / `schema_monitor` table definitions.
 * Following the addonScheduler.test.ts pattern, all three modules are mocked:
 *   - `vi.hoisted` defines the mock getDb fn + schema/table stubs.
 *   - `vi.mock` redirects the module specifiers the engine resolves
 *     (`../../db`, `../../schema`, `../../schema_monitor` from this dir all
 *     resolve to the same files as the engine's `../db` etc.).
 *
 * The mocked db client is a chainable builder where every query method
 * (select/from/innerJoin/where/orderBy/limit/insert/values/execute) returns a
 * fresh chain node. Each node is ALSO a thenable whose `.then` shifts the next
 * value out of a FIFO queue, so tests control query results by pushing entries
 * in the exact order the engine awaits them. The root db object itself is NOT
 * a thenable — otherwise `await getDb()` would assimilate it and resolve to a
 * queue entry instead of the client.
 *
 * `vi.resetModules()` + dynamic import in beforeEach gives every test a fresh
 * engine module, so the module-level `tableEnsured` flag is reset and the 7
 * DDL `execute` calls it triggers can be asserted in every test.
 *
 * `safeDispatchWebhookEvent` (from ./webhooks/webhookEvents) is mocked as a
 * no-op spy: the engine fires it fire-and-forget on failed runs, and the real
 * dispatcher would trigger extra async getDb() calls + console noise that are
 * irrelevant to this engine's contract.
 */

const engineMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  // Table stubs — only the columns the engine references matter.
  clientControls: {
    id: "clientControls.id",
    clientId: "clientControls.clientId",
    controlId: "clientControls.controlId",
    owner: "clientControls.owner",
    status: "clientControls.status",
  },
  controls: {
    id: "controls.id",
    owner: "controls.owner",
    frequency: "controls.frequency",
    controlId: "controls.controlId",
    name: "controls.name",
  },
  evidence: {
    clientId: "evidence.clientId",
    clientControlId: "evidence.clientControlId",
    status: "evidence.status",
    lastVerified: "evidence.lastVerified",
    updatedAt: "evidence.updatedAt",
  },
  controlTestRuns: {
    clientId: "controlTestRuns.clientId",
    clientControlId: "controlTestRuns.clientControlId",
    controlCode: "controlTestRuns.controlCode",
    testType: "controlTestRuns.testType",
    status: "controlTestRuns.status",
    score: "controlTestRuns.score",
    message: "controlTestRuns.message",
    findings: "controlTestRuns.findings",
    executedAt: "controlTestRuns.executedAt",
  },
  complianceMonitorEvents: {
    clientId: "cme.clientId",
    eventType: "cme.eventType",
    controlId: "cme.controlId",
    controlName: "cme.controlName",
    oldValue: "cme.oldValue",
    newValue: "cme.newValue",
    severity: "cme.severity",
    details: "cme.details",
  },
  // Fire-and-forget webhook dispatcher (the engine fires it on failed runs).
  // Mocked as a no-op spy so this suite stays decoupled from webhook internals
  // and the getDb call count remains exactly deterministic.
  safeDispatchWebhookEvent: vi.fn(),
}));

vi.mock("../../db", () => ({ getDb: engineMocks.getDb }));
vi.mock("../../schema", () => ({
  clientControls: engineMocks.clientControls,
  controls: engineMocks.controls,
  evidence: engineMocks.evidence,
}));
vi.mock("../../schema_monitor", () => ({
  controlTestRuns: engineMocks.controlTestRuns,
  complianceMonitorEvents: engineMocks.complianceMonitorEvents,
}));
// The engine imports safeDispatchWebhookEvent from ./webhooks/webhookEvents
// (resolves to ../webhooks/webhookEvents from this dir). Mocking it here keeps
// the engine test from invoking the real webhook dispatch path (which would
// call getDb() again asynchronously and destabilize the call-count assertions).
vi.mock("../webhooks/webhookEvents", () => ({
  safeDispatchWebhookEvent: engineMocks.safeDispatchWebhookEvent,
}));

type Engine = typeof import("../controlAutoTestEngine");
let engine: Engine;
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

const DAY = 24 * 60 * 60 * 1000;
const CLIENT_ID = 7;
const CC_ID = 42;

const CHAIN_METHODS = [
  "select",
  "from",
  "innerJoin",
  "where",
  "orderBy",
  "limit",
  "insert",
  "values",
  "execute",
] as const;

/**
 * Chainable drizzle-like db mock.
 * - `calls[name]` records every invocation of that method across ALL chains
 *   (root + returned nodes) as `[args]` arrays.
 * - `queue` holds the values terminal awaits resolve to, in engine call order.
 *   Use `rejectQueue(err)` to make a terminal reject.
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
      onRejected?: (reason?: unknown) => unknown
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

  const db = makeChain();
  // The db client itself must NOT be a thenable: `await getDb()` must return
  // the client, not resolve through the queue.
  delete db.then;
  return { db, queue, calls };
}

/** Sentinel to make a queued terminal reject instead of resolve. */
function rejectQueue(err: Error) {
  return { __reject: err };
}

/**
 * Seeds the queue for one `runControlAutoTest` call: the engine first runs
 * ensureTableExists (6 DDL executes on a fresh module), then the queries/inserts
 * supplied as `entries` in await order (joined select, evidence select, insert
 * values, optional monitor-event values).
 */
function seedRun(queue: unknown[], entries: unknown[]) {
  // ensureTableExists issues 7 DDL statements: 2 CREATE TABLE + 5 CREATE INDEX
  queue.push(...Array(7).fill(undefined));
  queue.push(...entries);
}

/** Builds the row resolved by the joined client-control/master-control select. */
function joinedRow(
  overrides: {
    clientControl?: Record<string, unknown>;
    masterControl?: Record<string, unknown>;
  } = {}
) {
  return [
    {
      clientControl: {
        id: CC_ID,
        clientId: CLIENT_ID,
        owner: "Alice",
        status: "implemented",
        ...overrides.clientControl,
      },
      masterControl: {
        id: 5,
        controlId: "CC-1",
        name: "Access Control",
        owner: "Bob",
        frequency: "Monthly",
        ...overrides.masterControl,
      },
    },
  ];
}

/** Fresh verified evidence (1 day old — inside the 35d Monthly threshold). */
function freshVerifiedEvidence() {
  return [
    {
      id: 9,
      clientId: CLIENT_ID,
      clientControlId: CC_ID,
      status: "verified",
      lastVerified: new Date(Date.now() - DAY),
    },
  ];
}

beforeEach(async () => {
  vi.resetModules();
  engine = await import("../controlAutoTestEngine");
  engineMocks.getDb.mockReset();
  engineMocks.safeDispatchWebhookEvent.mockReset();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy?.mockRestore();
});

describe("runControlAutoTest", () => {
  it("passes when owner, implementation, verified evidence and freshness all check out", async () => {
    const { db, queue, calls } = makeDb();
    seedRun(queue, [joinedRow(), freshVerifiedEvidence(), {}]);
    engineMocks.getDb.mockResolvedValue(db);

    const res = await engine.runControlAutoTest(CLIENT_ID, CC_ID);

    expect(res.status).toBe("pass");
    expect(res.score).toBe(100);
    expect(res.controlCode).toBe("CC-1");
    expect(res.controlName).toBe("Access Control");
    expect(res.findings.map((f) => f.check)).toEqual([
      "Owner Assignment",
      "Implementation Status",
      "Evidence Verification",
      "Evidence Freshness",
    ]);
    expect(res.findings.every((f) => f.status === "pass")).toBe(true);
    expect(res.message).toContain("passed all automated verification checks");

    // ensureTableExists ran the 7 DDL statements before any query
    expect(db.execute).toHaveBeenCalledTimes(7);
    // The run was persisted exactly once
    expect(db.insert).toHaveBeenCalledWith(engineMocks.controlTestRuns);
    expect(calls.values).toHaveLength(1);
    const valuesCall = calls.values[0][0];
    expect(valuesCall).toMatchObject({
      clientId: CLIENT_ID,
      clientControlId: CC_ID,
      controlCode: "CC-1",
      testType: "AUTOMATED_RULE_ENGINE",
      status: "pass",
      score: 100,
    });
    expect(valuesCall.executedAt).toBeInstanceOf(Date);
    expect(valuesCall.findings).toHaveLength(4);
    // No monitor event on a pass
    expect(db.insert).not.toHaveBeenCalledWith(
      engineMocks.complianceMonitorEvents
    );
  });

  it("falls back to the master-control owner and warns on in_progress status", async () => {
    const { db, queue } = makeDb();
    seedRun(queue, [
      joinedRow({ clientControl: { owner: "", status: "in_progress" } }),
      freshVerifiedEvidence(),
      {},
    ]);
    engineMocks.getDb.mockResolvedValue(db);

    const res = await engine.runControlAutoTest(CLIENT_ID, CC_ID);

    const ownerFinding = res.findings.find(
      (f) => f.check === "Owner Assignment"
    )!;
    expect(ownerFinding.status).toBe("pass");
    expect(ownerFinding.detail).toContain("Bob");

    const implFinding = res.findings.find(
      (f) => f.check === "Implementation Status"
    )!;
    expect(implFinding.status).toBe("warning");

    // 100 - 20 = 80 -> warning
    expect(res.score).toBe(80);
    expect(res.status).toBe("warning");
    expect(db.insert).not.toHaveBeenCalledWith(
      engineMocks.complianceMonitorEvents
    );
  });

  it("clamps the score to 0 and fails when owner, implementation and evidence are all missing", async () => {
    const { db, queue, calls } = makeDb();
    // owner null on BOTH client and master control -> owner deduction applies
    seedRun(queue, [
      joinedRow({
        clientControl: { owner: null, status: "not_implemented" },
        masterControl: { owner: null },
      }),
      [], // no evidence
      {}, // insert test run
      {}, // insert monitor event
    ]);
    engineMocks.getDb.mockResolvedValue(db);

    const res = await engine.runControlAutoTest(CLIENT_ID, CC_ID);

    // 100 - 15 - 40 - 45 = 0, clamped at 0 (never negative)
    expect(res.score).toBe(0);
    expect(res.status).toBe("fail");
    expect(res.message).toContain("failed auto-testing checks");
    expect(res.findings.some((f) => f.status === "fail")).toBe(true);

    // Persisted with the derived status/score
    expect(calls.values[0][0]).toMatchObject({ status: "fail", score: 0 });
    // Failures also emit a monitor event
    expect(db.insert).toHaveBeenCalledWith(engineMocks.complianceMonitorEvents);
    const monitor = calls.values[1][0];
    expect(monitor).toMatchObject({
      clientId: CLIENT_ID,
      eventType: "control_auto_test_failed",
      controlId: CC_ID,
      controlName: "Access Control",
      oldValue: "healthy",
      newValue: "failed",
      severity: "critical",
    });
    expect(monitor.details).toMatchObject({ controlCode: "CC-1", score: 0 });
    // Failures also fire the fire-and-forget webhook event (mocked dispatcher)
    expect(engineMocks.safeDispatchWebhookEvent).toHaveBeenCalledWith(
      CLIENT_ID,
      "control.autotest.failed",
      expect.objectContaining({ controlId: CC_ID })
    );
  });

  it("fails when all evidence is expired", async () => {
    const { db, queue } = makeDb();
    seedRun(queue, [
      joinedRow(),
      [
        {
          id: 9,
          status: "expired",
          lastVerified: new Date(Date.now() - 500 * DAY),
        },
      ],
      {},
      {}, // monitor event
    ]);
    engineMocks.getDb.mockResolvedValue(db);

    const res = await engine.runControlAutoTest(CLIENT_ID, CC_ID);

    const ev = res.findings.find((f) => f.check === "Evidence Verification")!;
    expect(ev.status).toBe("fail");
    expect(ev.detail).toContain("EXPIRED");
    // 100 - 35 = 65; the fail finding forces overall fail
    expect(res.score).toBe(65);
    expect(res.status).toBe("fail");
    expect(db.insert).toHaveBeenCalledWith(engineMocks.complianceMonitorEvents);
  });

  it("warns when evidence exists but none is verified", async () => {
    const { db, queue } = makeDb();
    seedRun(queue, [
      joinedRow(),
      [
        {
          id: 9,
          status: "pending",
          lastVerified: null,
          updatedAt: new Date(Date.now() - DAY),
        },
      ],
      {},
    ]);
    engineMocks.getDb.mockResolvedValue(db);

    const res = await engine.runControlAutoTest(CLIENT_ID, CC_ID);

    const ev = res.findings.find((f) => f.check === "Evidence Verification")!;
    expect(ev.status).toBe("warning");
    expect(ev.detail).toContain("statuses: pending");
    // 100 - 20 = 80 -> warning
    expect(res.score).toBe(80);
    expect(res.status).toBe("warning");
    expect(db.insert).not.toHaveBeenCalledWith(
      engineMocks.complianceMonitorEvents
    );
  });

  it("warns when verified evidence is stale for the control frequency", async () => {
    const { db, queue } = makeDb();
    seedRun(queue, [
      joinedRow({ masterControl: { frequency: "Annual" } }),
      [
        {
          id: 9,
          status: "verified",
          lastVerified: new Date(Date.now() - 400 * DAY),
        },
      ],
      {},
    ]);
    engineMocks.getDb.mockResolvedValue(db);

    const res = await engine.runControlAutoTest(CLIENT_ID, CC_ID);

    const fresh = res.findings.find((f) => f.check === "Evidence Freshness")!;
    expect(fresh.status).toBe("warning");
    expect(fresh.detail).toContain("400 days old");
    // 100 - 20 = 80 -> warning
    expect(res.score).toBe(80);
    expect(res.status).toBe("warning");
  });

  it("uses updatedAt when lastVerified is missing and defaults unknown frequencies to 370 days", async () => {
    const { db, queue } = makeDb();
    // "Semester" is not in the engine's frequency map -> 370 day default
    seedRun(queue, [
      joinedRow({ masterControl: { frequency: "Semester" } }),
      [
        {
          id: 9,
          status: "verified",
          lastVerified: null,
          updatedAt: new Date(Date.now() - 5 * DAY),
        },
      ],
      {},
    ]);
    engineMocks.getDb.mockResolvedValue(db);

    const res = await engine.runControlAutoTest(CLIENT_ID, CC_ID);

    const fresh = res.findings.find((f) => f.check === "Evidence Freshness")!;
    expect(fresh.status).toBe("pass");
    expect(fresh.detail).toContain("5 days ago");
    expect(res.status).toBe("pass");
  });

  it("treats verified evidence with no dates at all as stale", async () => {
    const { db, queue } = makeDb();
    seedRun(queue, [
      joinedRow({ masterControl: { frequency: "Daily" } }),
      [{ id: 9, status: "verified", lastVerified: null, updatedAt: null }],
      {},
    ]);
    engineMocks.getDb.mockResolvedValue(db);

    const res = await engine.runControlAutoTest(CLIENT_ID, CC_ID);

    const fresh = res.findings.find((f) => f.check === "Evidence Freshness")!;
    expect(fresh.status).toBe("warning");
    expect(res.score).toBe(80);
    expect(res.status).toBe("warning");
  });

  it("derives warning from a warning finding even at the 85 score boundary", async () => {
    const { db, queue } = makeDb();
    // owner missing (-15) is the only deduction -> score 85, but a warning
    // finding exists, so overall status must be 'warning' (not 'pass')
    seedRun(queue, [
      joinedRow({
        clientControl: { owner: null },
        masterControl: { owner: null },
      }),
      freshVerifiedEvidence(),
      {},
    ]);
    engineMocks.getDb.mockResolvedValue(db);

    const res = await engine.runControlAutoTest(CLIENT_ID, CC_ID);

    expect(res.score).toBe(85);
    expect(
      res.findings.find((f) => f.check === "Owner Assignment")!.status
    ).toBe("warning");
    expect(res.status).toBe("warning");
  });

  it("returns an error result when the client control is not found", async () => {
    const { db, queue } = makeDb();
    seedRun(queue, [[]]); // joined select returns no rows
    engineMocks.getDb.mockResolvedValue(db);

    const res = await engine.runControlAutoTest(CLIENT_ID, CC_ID);

    expect(res.status).toBe("error");
    expect(res.score).toBe(0);
    expect(res.message).toContain("not found for client");
    expect(res.findings[0]).toMatchObject({
      check: "Control Existence",
      status: "fail",
    });
    // Nothing persisted, no monitor event
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("swallows ensureTableExists DDL failures and keeps testing", async () => {
    const { db, queue } = makeDb();
    // The first DDL statement rejects; ensureTableExists catches + logs and
    // bails immediately, so the remaining 5 DDL statements are never issued.
    queue.push(rejectQueue(new Error("connection refused")));
    queue.push(joinedRow());
    queue.push(freshVerifiedEvidence());
    queue.push({});
    engineMocks.getDb.mockResolvedValue(db);

    const res = await engine.runControlAutoTest(CLIENT_ID, CC_ID);

    // The DDL error is caught + logged; the test run still completes
    expect(res.status).toBe("pass");
    expect(db.execute).toHaveBeenCalledTimes(1);
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(db.insert).toHaveBeenCalledWith(engineMocks.controlTestRuns);
  });

  it("returns an error result when a query throws mid-execution", async () => {
    const { db, queue } = makeDb();
    seedRun(queue, [
      joinedRow(),
      rejectQueue(new Error("boom")), // evidence query fails
    ]);
    engineMocks.getDb.mockResolvedValue(db);

    const res = await engine.runControlAutoTest(CLIENT_ID, CC_ID);

    expect(res.status).toBe("error");
    expect(res.score).toBe(0);
    expect(res.message).toBe("Execution error: boom");
    expect(res.findings[0]).toMatchObject({
      check: "Engine Execution",
      status: "fail",
      detail: "boom",
    });
    expect(db.insert).not.toHaveBeenCalled();
  });
});

describe("runAllControlAutoTestsForClient", () => {
  it("aggregates counts, pass rate and average score across results", async () => {
    const { db, queue } = makeDb();
    const clientCtrls = [
      { id: 1, clientId: CLIENT_ID },
      { id: 2, clientId: CLIENT_ID },
      { id: 3, clientId: CLIENT_ID },
    ];
    queue.push(clientCtrls); // clientControls select
    // control 1 -> pass (first runControlAutoTest call also runs the 7 DDLs)
    queue.push(...Array(7).fill(undefined));
    queue.push(joinedRow({ clientControl: { id: 1 } }));
    queue.push(freshVerifiedEvidence());
    queue.push({});
    // control 2 -> warning (in_progress)
    queue.push(joinedRow({ clientControl: { id: 2, status: "in_progress" } }));
    queue.push(freshVerifiedEvidence());
    queue.push({});
    // control 3 -> fail (no owner on either level, no evidence)
    queue.push(
      joinedRow({
        clientControl: { id: 3, owner: null },
        masterControl: { owner: null },
      })
    );
    queue.push([]);
    queue.push({}); // insert test run
    queue.push({}); // insert monitor event
    engineMocks.getDb.mockResolvedValue(db);

    const { summary, results } =
      await engine.runAllControlAutoTestsForClient(CLIENT_ID);

    // Baseline: 1 (list client controls) + 1 per control tested. The webhook
    // dispatcher is mocked, so the failed control cannot leak extra getDb()
    // calls (or async console noise) into this test — the count is exact.
    expect(engineMocks.getDb).toHaveBeenCalledTimes(4); // 1 + one per control
    // The failed control fires exactly one fire-and-forget webhook event.
    expect(engineMocks.safeDispatchWebhookEvent).toHaveBeenCalledTimes(1);
    expect(engineMocks.safeDispatchWebhookEvent).toHaveBeenCalledWith(
      CLIENT_ID,
      "control.autotest.failed",
      expect.objectContaining({ controlId: 3, clientId: CLIENT_ID })
    );
    expect(results).toHaveLength(3);
    expect(results.map((r) => r.status)).toEqual(["pass", "warning", "fail"]);
    expect(summary).toMatchObject({
      clientId: CLIENT_ID,
      totalControlsTested: 3,
      passedCount: 1,
      warningCount: 1,
      failedCount: 1,
      overallPassRate: 33, // round(1/3 * 100)
      averageScore: 73, // round((100 + 80 + 40) / 3)
    });
    expect(summary.latestExecutionAt).toBeTruthy();
    expect(new Date(summary.latestExecutionAt).toString()).not.toBe(
      "Invalid Date"
    );
  });

  it("returns an empty summary with a 100% pass rate when a client has no controls", async () => {
    const { db, queue, calls } = makeDb();
    queue.push([]); // clientControls select -> no rows
    engineMocks.getDb.mockResolvedValue(db);

    const { summary, results } =
      await engine.runAllControlAutoTestsForClient(CLIENT_ID);

    expect(results).toEqual([]);
    expect(summary).toMatchObject({
      clientId: CLIENT_ID,
      totalControlsTested: 0,
      passedCount: 0,
      warningCount: 0,
      failedCount: 0,
      overallPassRate: 100,
      averageScore: 100,
    });
    // No per-control test was executed
    expect(calls.insert).toHaveLength(0);
  });
});

describe("getClientTestRunHistory", () => {
  it("returns rows ordered by executedAt desc and limited to the requested limit", async () => {
    const { db, queue, calls } = makeDb();
    queue.push(...Array(7).fill(undefined)); // ensureTableExists DDL (7 stmts)
    const rows = [
      {
        id: 3,
        clientId: CLIENT_ID,
        status: "pass",
        executedAt: new Date("2026-08-01T00:00:00Z"),
      },
      {
        id: 2,
        clientId: CLIENT_ID,
        status: "fail",
        executedAt: new Date("2026-07-01T00:00:00Z"),
      },
    ];
    queue.push(rows);
    engineMocks.getDb.mockResolvedValue(db);

    const result = await engine.getClientTestRunHistory(CLIENT_ID, 5);

    expect(result).toEqual(rows);
    expect(calls.from[0][0]).toBe(engineMocks.controlTestRuns);
    expect(calls.where).toHaveLength(1);
    expect(calls.orderBy).toHaveLength(1);
    expect(calls.limit[0][0]).toBe(5);
  });

  it("defaults to a limit of 50", async () => {
    const { db, queue, calls } = makeDb();
    queue.push(...Array(7).fill(undefined));
    queue.push([]);
    engineMocks.getDb.mockResolvedValue(db);

    const result = await engine.getClientTestRunHistory(CLIENT_ID);

    expect(result).toEqual([]);
    expect(calls.limit[0][0]).toBe(50);
    expect(calls.orderBy).toHaveLength(1);
    expect(db.execute).toHaveBeenCalledTimes(7); // table ensured in fresh module
  });
});
