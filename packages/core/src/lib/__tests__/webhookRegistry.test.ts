import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";

/**
 * Webhook Registry — unit tests (QA cycle 8, scorecard #15).
 *
 * The registry (packages/core/src/lib/webhooks/webhookRegistry.ts) talks to
 * the DB exclusively through `getDb` from "../../db" and to endpoints through
 * fetch (global, or an injected `fetchImpl` once the hardened options arg
 * lands). Every test below mocks `getDb` (vi.mock) and injects canned fetch
 * responses, so no DB or network is ever touched.
 *
 * The hardened implementation (landed mid-cycle by the backend agent) adds
 * the 4th `options` argument ({ maxRetries?, retryDelaysMs?, fetchImpl? })
 * with bounded exponential backoff, recursive payload secret-scrubbing,
 * graceful DB-down degradation, plus updateWebhookSubscription /
 * deleteWebhookSubscription / listWebhookEventCatalog. The module-level
 * `tablesEnsured` flag makes call ordering stateful, so each test re-imports
 * a fresh module instance (vi.resetModules + dynamic import — the same
 * pattern as controlAutoTestEngine.test.ts).
 */

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

vi.mock("../../db", () => ({ getDb: mocks.getDb }));

// --- Feature probes ---------------------------------------------------------
// A probe import detects which API surface has landed (functions stay valid
// across vi.resetModules). Tests themselves re-import a fresh module instance
// in beforeEach. Note: dispatchWebhookEvent declares `options = {}` as a
// default parameter, so `Function.length` is 3 — the presence of the
// management functions is the reliable "hardening pass landed" signal.
let probe: any = null;
try {
  probe = await import("../webhooks/webhookRegistry");
} catch {
  probe = null;
}
const HARDENED =
  !!probe &&
  (probe.dispatchWebhookEvent.length >= 4 ||
    typeof probe.updateWebhookSubscription === "function");
const HAS_MANAGEMENT = !!probe && typeof probe.updateWebhookSubscription === "function";
const HAS_CATALOG = !!probe && typeof probe.listWebhookEventCatalog === "function";

// Intended final dispatch signature (options arg).
type DispatchOptions = {
  maxRetries?: number;
  retryDelaysMs?: number[];
  fetchImpl?: typeof fetch;
};
type DispatchSummary = {
  event: string;
  dispatchedCount: number;
  successCount: number;
  failureCount: number;
};
type DispatchFn = (
  clientId: number,
  event: string,
  data: unknown,
  options?: DispatchOptions
) => Promise<DispatchSummary>;

// --- Helpers ----------------------------------------------------------------

let registry: typeof import("../webhooks/webhookRegistry");
let consoleErrorSpy: ReturnType<typeof vi.spyOn> | undefined;

beforeEach(async () => {
  vi.resetModules();
  registry = await import("../webhooks/webhookRegistry");
  mocks.getDb.mockReset();
  consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy?.mockRestore();
});

/**
 * Fake db whose `execute` dispatches on the embedded SQL text (drizzle `sql`
 * templates JSON-stringify with their interpolated params inline). CREATE
 * statements (ensureWebhookTablesExist) resolve with empty rows; SELECT /
 * RETURNING statements consume the next queued result set. This is resilient
 * to DDL-count and INSERT-count changes in the implementation.
 */
function makeDb() {
  const queue: unknown[][] = [];
  const execute = vi.fn(async (sqlArg: any) => {
    const sqlText = JSON.stringify(sqlArg);
    if (sqlText.includes("CREATE")) return { rows: [] };
    if (sqlText.includes("SELECT") || sqlText.includes("RETURNING")) {
      return { rows: queue.shift() ?? [] };
    }
    return { rows: [] };
  });
  return { db: { execute }, execute, queue };
}

function subRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    clientId: 7,
    name: "Alpha",
    targetUrl: "https://hooks.example.com/alpha",
    secret: "test-secret-1",
    events: ["test.ping"],
    status: "active",
    createdAt: "2026-08-14T10:00:00.000Z",
    ...overrides,
  };
}

function okResponse(status = 200, body = "ok") {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
  };
}

function withGlobalFetch<T>(fetchImpl: typeof fetch, run: () => Promise<T>): Promise<T> {
  const realFetch = globalThis.fetch;
  (globalThis as { fetch: unknown }).fetch = fetchImpl;
  return run().finally(() => {
    (globalThis as { fetch: unknown }).fetch = realFetch;
  });
}

/** All SQL text passed to db.execute so far (for payload/log assertions). */
function allSql(execute: ReturnType<typeof makeDb>["execute"]): string {
  return execute.mock.calls.map((c) => JSON.stringify(c[0])).join("\n");
}

/**
 * Raw string params embedded in the drizzle `sql` templates passed to
 * db.execute (e.g. the webhook payload JSON). JSON.stringify of a Sql object
 * escapes inner quotes, so these raw values are what payload assertions need.
 */
function payloadStrings(execute: ReturnType<typeof makeDb>["execute"]): string[] {
  const out: string[] = [];
  for (const call of execute.mock.calls) {
    const chunks: unknown[] = (call[0] as any)?.queryChunks ?? [];
    for (const chunk of chunks) {
      if (typeof chunk === "string") out.push(chunk);
    }
  }
  return out;
}

/**
 * All interpolated values embedded in the drizzle `sql` templates passed to
 * db.execute, in call order (e.g. the LIMIT value of a paged query).
 *
 * In drizzle-orm 0.30 the Sql.queryChunks representation is: string literal
 * segments are StringChunk objects ({ value: string[] }) while every
 * interpolated value (string/number/boolean) is inlined as a raw chunk value
 * — so this helper flattens StringChunk.value arrays and keeps raw values.
 */
function sqlParamValues(execute: ReturnType<typeof makeDb>["execute"]): unknown[] {
  const out: unknown[] = [];
  for (const call of execute.mock.calls) {
    const chunks: unknown[] = (call[0] as any)?.queryChunks ?? [];
    for (const chunk of chunks) {
      if (
        chunk &&
        typeof chunk === "object" &&
        "value" in (chunk as Record<string, unknown>)
      ) {
        const value = (chunk as { value: unknown }).value;
        if (Array.isArray(value)) out.push(...value);
      } else {
        out.push(chunk);
      }
    }
  }
  return out;
}

// --- generateWebhookSignature -----------------------------------------------

describe("generateWebhookSignature", () => {
  it("produces a deterministic HMAC-SHA256 hex for a known payload and secret", () => {
    const payload = JSON.stringify({
      event: "test.ping",
      timestamp: "2026-08-14T10:00:00.000Z",
      clientId: 7,
      data: { ok: true },
    });
    const secret = "known-secret-42";
    const signature = registry.generateWebhookSignature(payload, secret);
    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    expect(signature).toBe(expected);
    expect(signature).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic for the same input and differs across secrets", () => {
    const payload = JSON.stringify({ event: "risk.created", clientId: 7 });
    expect(registry.generateWebhookSignature(payload, "a")).toBe(
      registry.generateWebhookSignature(payload, "a")
    );
    expect(registry.generateWebhookSignature(payload, "a")).not.toBe(
      registry.generateWebhookSignature(payload, "b")
    );
  });
});

// --- getActiveSubscriptionsForEvent -----------------------------------------

describe("getActiveSubscriptionsForEvent", () => {
  it("returns only subscriptions whose events include the event or '*' (active filter lives in SQL)", async () => {
    const { db, execute, queue } = makeDb();
    // The SELECT embeds `status = 'active'` — the DB performs the active
    // filter — so the mocked rows emulate what the query would return for a
    // client whose subscriptions are all active.
    queue.push([
      subRow({ id: 1, events: ["test.ping"] }),
      subRow({ id: 2, events: ["*"] }),
      subRow({ id: 4, events: ["control.failed"] }),
      subRow({ id: 5, events: '["test.ping"]' }), // events stored as JSON string
    ]);
    mocks.getDb.mockResolvedValue(db);

    const subs = await registry.getActiveSubscriptionsForEvent(7, "test.ping");

    // event filtering happens in JS: only the event itself or the "*" wildcard
    expect(subs.map((s) => s.id).sort()).toEqual([1, 2, 5]);
    expect(subs.every((s) => s.status === "active")).toBe(true);
    expect(subs[2].events).toEqual(["test.ping"]); // JSON-string events normalized
    expect(subs[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    // the active-only filter is enforced at the query level
    expect(allSql(execute)).toContain("status = 'active'");
  });

  it("returns an empty list when nothing matches the event", async () => {
    const { db, queue } = makeDb();
    queue.push([subRow({ id: 1, events: ["evidence.expired"] })]);
    mocks.getDb.mockResolvedValue(db);

    const subs = await registry.getActiveSubscriptionsForEvent(7, "risk.created");
    expect(subs).toEqual([]);
  });
});

// --- dispatchWebhookEvent: success path --------------------------------------

describe("dispatchWebhookEvent — success path", () => {
  it("dispatches to every matching subscription with the contract payload and headers", async () => {
    const { db, execute, queue } = makeDb();
    queue.push([
      subRow({ id: 1, secret: "sec-a" }),
      subRow({ id: 2, events: ["*"], targetUrl: "https://hooks.example.com/star", secret: "sec-b" }),
    ]);
    mocks.getDb.mockResolvedValue(db);
    const fetchMock = vi.fn(async () => okResponse(200, "ack"));

    const result = await withGlobalFetch(fetchMock as unknown as typeof fetch, () =>
      registry.dispatchWebhookEvent(7, "test.ping", { hello: "world" })
    );

    expect(result).toEqual({
      event: "test.ping",
      dispatchedCount: 2,
      successCount: 2,
      failureCount: 0,
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit & { body: string }];
    expect(url).toBe("https://hooks.example.com/alpha");
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      "Content-Type": "application/json",
      "X-ComplianceOS-Event": "test.ping",
    });

    // payload shape { event, timestamp, clientId, data }
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      event: "test.ping",
      clientId: 7,
      data: { hello: "world" },
    });
    expect(typeof body.timestamp).toBe("string");
    expect(Number.isNaN(Date.parse(body.timestamp))).toBe(false);

    // HMAC signature header verifies against the raw body + subscription secret
    const headers = init.headers as Record<string, string>;
    expect(headers["X-ComplianceOS-Signature"]).toBe(
      `sha256=${registry.generateWebhookSignature(init.body, "sec-a")}`
    );
    expect(headers["X-ComplianceOS-Timestamp"]).toBe(body.timestamp);

    // every delivery attempt is logged with the payload
    expect(execute).toHaveBeenCalled();
    const sqlText = allSql(execute);
    expect(sqlText).toContain("INSERT INTO webhook_deliveries");
    const loggedPayloads = payloadStrings(execute).filter((s) => s.includes('"event":"test.ping"'));
    expect(loggedPayloads).toHaveLength(2); // one INSERT per subscription
    expect(loggedPayloads[0]).toContain('"hello":"world"');
  });

  it("does not call subscriptions whose events do not include the dispatched event", async () => {
    const { db, queue } = makeDb();
    queue.push([
      subRow({ id: 1, events: ["evidence.expired"] }),
      subRow({ id: 2, events: ["*"], targetUrl: "https://hooks.example.com/star" }),
    ]);
    mocks.getDb.mockResolvedValue(db);
    const fetchMock = vi.fn(async () => okResponse(200));

    const result = await withGlobalFetch(fetchMock as unknown as typeof fetch, () =>
      registry.dispatchWebhookEvent(7, "test.ping", {})
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = fetchMock.mock.calls[0][0];
    expect(url).toBe("https://hooks.example.com/star");
    expect(result).toMatchObject({ dispatchedCount: 1, successCount: 1, failureCount: 0 });
  });

  it("returns a zero-count summary when there are no matching subscriptions", async () => {
    const { db, queue, execute } = makeDb();
    queue.push([]);
    mocks.getDb.mockResolvedValue(db);
    const fetchMock = vi.fn(async () => okResponse(200));

    const result = await withGlobalFetch(fetchMock as unknown as typeof fetch, () =>
      registry.dispatchWebhookEvent(7, "test.ping", {})
    );

    expect(result).toEqual({
      event: "test.ping",
      dispatchedCount: 0,
      successCount: 0,
      failureCount: 0,
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(execute).toHaveBeenCalled();
  });

  it("records a failed delivery for 4xx responses without retrying", async () => {
    const { db, execute, queue } = makeDb();
    queue.push([subRow({ id: 1, secret: "sec-a" })]);
    mocks.getDb.mockResolvedValue(db);
    const fetchMock = vi.fn(async () => okResponse(400, "bad request"));

    const result = await withGlobalFetch(fetchMock as unknown as typeof fetch, () =>
      registry.dispatchWebhookEvent(7, "test.ping", {})
    );

    expect(result).toMatchObject({ dispatchedCount: 1, successCount: 0, failureCount: 1 });
    expect(fetchMock).toHaveBeenCalledTimes(1); // 4xx is permanent — no retry
    expect(allSql(execute)).toContain("INSERT INTO webhook_deliveries");
  });
});

// --- dispatchWebhookEvent: retries (hardened options arg) ---------------------

describe.skipIf(!HARDENED)("dispatchWebhookEvent retry & options (BACKEND-DEP)", () => {
  const dispatch = () => registry.dispatchWebhookEvent as unknown as DispatchFn;

  it("retries 5xx responses with the injected zero delays and succeeds on a later attempt", async () => {
    const { db, queue } = makeDb();
    queue.push([subRow({ id: 1, secret: "sec-a" })]);
    mocks.getDb.mockResolvedValue(db);
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(okResponse(503, "busy"))
      .mockResolvedValueOnce(okResponse(200, "recovered"));

    const result = await dispatch()(
      7,
      "test.ping",
      { n: 1 },
      { maxRetries: 2, retryDelaysMs: [0, 0], fetchImpl: fetchImpl as unknown as typeof fetch }
    );

    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ dispatchedCount: 1, successCount: 1, failureCount: 0 });
  });

  it("does not retry 4xx responses", async () => {
    const { db, queue } = makeDb();
    queue.push([subRow({ id: 1, secret: "sec-a" })]);
    mocks.getDb.mockResolvedValue(db);
    const fetchImpl = vi.fn(async () => okResponse(400, "bad request"));

    const result = await dispatch()(
      7,
      "test.ping",
      {},
      { maxRetries: 3, retryDelaysMs: [0, 0], fetchImpl: fetchImpl as unknown as typeof fetch }
    );

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({ dispatchedCount: 1, successCount: 0, failureCount: 1 });
  });

  it("retries network errors up to maxRetries then reports a failure", async () => {
    const { db, queue } = makeDb();
    queue.push([subRow({ id: 1, secret: "sec-a" })]);
    mocks.getDb.mockResolvedValue(db);
    const fetchImpl = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    });

    const result = await dispatch()(
      7,
      "test.ping",
      {},
      { maxRetries: 2, retryDelaysMs: [0, 0], fetchImpl: fetchImpl as unknown as typeof fetch }
    );

    expect(fetchImpl).toHaveBeenCalledTimes(3); // 1 attempt + 2 retries
    expect(result).toMatchObject({ dispatchedCount: 1, successCount: 0, failureCount: 1 });
  });

  it("recovers when fetchImpl fails twice and then succeeds", async () => {
    const { db, queue } = makeDb();
    queue.push([subRow({ id: 1, secret: "sec-a" })]);
    mocks.getDb.mockResolvedValue(db);
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom 1"))
      .mockRejectedValueOnce(new Error("boom 2"))
      .mockResolvedValueOnce(okResponse(200, "finally"));

    const result = await dispatch()(
      7,
      "test.ping",
      {},
      { maxRetries: 3, retryDelaysMs: [0, 0], fetchImpl: fetchImpl as unknown as typeof fetch }
    );

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(result).toMatchObject({ dispatchedCount: 1, successCount: 1, failureCount: 0 });
  });

  it("respects maxRetries (bounded retry)", async () => {
    const { db, queue } = makeDb();
    queue.push([subRow({ id: 1, secret: "sec-a" })]);
    mocks.getDb.mockResolvedValue(db);
    const fetchImpl = vi.fn(async () => okResponse(500, "err"));

    const result = await dispatch()(
      7,
      "test.ping",
      {},
      { maxRetries: 1, retryDelaysMs: [0, 0], fetchImpl: fetchImpl as unknown as typeof fetch }
    );

    expect(fetchImpl).toHaveBeenCalledTimes(2); // 1 attempt + 1 retry
    expect(result).toMatchObject({ dispatchedCount: 1, successCount: 0, failureCount: 1 });
  });
});

// --- dispatchWebhookEvent: secret scrubbing ----------------------------------

describe.skipIf(!HARDENED)("dispatchWebhookEvent secret scrubbing (BACKEND-DEP)", () => {
  const dispatch = () => registry.dispatchWebhookEvent as unknown as DispatchFn;

  it("redacts sensitive values recursively in the dispatched and logged payloads", async () => {
    const { db, execute, queue } = makeDb();
    queue.push([subRow({ id: 1, secret: "sec-a" })]);
    mocks.getDb.mockResolvedValue(db);
    const fetchImpl = vi.fn(async () => okResponse(200));

    const data = {
      apiKey: "AKIA-SECRET-1",
      token: "tok-12345",
      password: "pw-67890",
      secret: "deep-secret-abc",
      keep: "visible-field",
      nested: { apiKey: "AKIA-NESTED", fine: true },
      arr: [{ password: "pw-in-array" }],
    };
    const result = await dispatch()(
      7,
      "test.ping",
      data,
      { fetchImpl: fetchImpl as unknown as typeof fetch }
    );

    expect(result).toMatchObject({ successCount: 1, failureCount: 0 });

    // dispatched payload has the raw values replaced with [REDACTED]
    const sentBody = JSON.parse(
      (fetchImpl.mock.calls[0][1] as RequestInit & { body: string }).body
    );
    const sentRaw = JSON.stringify(sentBody);
    for (const leak of ["AKIA-SECRET-1", "tok-12345", "pw-67890", "deep-secret-abc", "AKIA-NESTED", "pw-in-array"]) {
      expect(sentRaw).not.toContain(leak);
    }
    expect(sentBody.data.apiKey).toBe("[REDACTED]");
    expect(sentBody.data.token).toBe("[REDACTED]");
    expect(sentBody.data.password).toBe("[REDACTED]");
    expect(sentBody.data.secret).toBe("[REDACTED]");
    expect(sentBody.data.nested.apiKey).toBe("[REDACTED]");
    expect(sentBody.data.arr[0].password).toBe("[REDACTED]");
    expect(sentBody.data.keep).toBe("visible-field");
    expect(sentBody.data.nested.fine).toBe(true);

    // logged delivery payload is scrubbed too
    const sqlText = allSql(execute);
    for (const leak of ["AKIA-SECRET-1", "tok-12345", "pw-67890", "deep-secret-abc", "AKIA-NESTED", "pw-in-array"]) {
      expect(sqlText).not.toContain(leak);
    }
    expect(sqlText).toContain("INSERT INTO webhook_deliveries");
    expect(sqlText).toContain("[REDACTED]");
    expect(sqlText).toContain("visible-field");
  });
});

// --- dispatchWebhookEvent: graceful degradation ------------------------------

describe.skipIf(!HARDENED)("dispatchWebhookEvent graceful degradation (BACKEND-DEP)", () => {
  const dispatch = () => registry.dispatchWebhookEvent as unknown as DispatchFn;

  it("resolves with a zero-count summary instead of throwing when the DB is down", async () => {
    mocks.getDb.mockRejectedValue(new Error("connection refused"));

    await expect(dispatch()(7, "test.ping", {})).resolves.toEqual({
      event: "test.ping",
      dispatchedCount: 0,
      successCount: 0,
      failureCount: 0,
    });
  });

  it("still attempts HTTP delivery and logs a failed delivery when only the delivery-log insert fails", async () => {
    const { db, execute, queue } = makeDb();
    queue.push([subRow({ id: 1, secret: "sec-a" })]);
    mocks.getDb.mockResolvedValue(db);
    const fetchMock = vi.fn(async () => okResponse(200));
    // sabotage the delivery-log INSERT (after the SELECT consumed the queue)
    const realExecute = db.execute;
    db.execute = vi.fn(async (sqlArg: any) => {
      const sqlText = JSON.stringify(sqlArg);
      if (sqlText.includes("INSERT INTO webhook_deliveries")) {
        throw new Error("insert failed");
      }
      return realExecute(sqlArg);
    });

    const result = await withGlobalFetch(fetchMock as unknown as typeof fetch, () =>
      registry.dispatchWebhookEvent(7, "test.ping", {})
    );

    // dispatch still resolves with the successful HTTP outcome
    expect(result).toMatchObject({ dispatchedCount: 1, successCount: 1, failureCount: 0 });
    expect(execute).toHaveBeenCalled();
  });
});

// --- update / delete subscriptions -------------------------------------------

describe.skipIf(!HAS_MANAGEMENT)("update/deleteWebhookSubscription (BACKEND-DEP)", () => {
  it("updates an existing subscription and returns the refreshed row", async () => {
    const { db, queue } = makeDb();
    queue.push([subRow({ id: 3, clientId: 7, name: "Renamed", events: ["*"] })]);
    mocks.getDb.mockResolvedValue(db);

    const updated = await registry.updateWebhookSubscription(3, {
      name: "Renamed",
      events: ["*"],
    });

    expect(updated).toMatchObject({ id: 3, clientId: 7, name: "Renamed" });
    expect(updated!.events).toContain("*");
  });

  it("returns null when the subscription id does not exist", async () => {
    const { db, queue } = makeDb();
    queue.push([]); // UPDATE ... RETURNING yields no rows
    mocks.getDb.mockResolvedValue(db);

    const updated = await registry.updateWebhookSubscription(999, { name: "Ghost" });
    expect(updated).toBeNull();
  });

  it("deletes a subscription and reports true", async () => {
    const { db, queue } = makeDb();
    queue.push([subRow({ id: 3 })]); // DELETE ... RETURNING id
    mocks.getDb.mockResolvedValue(db);

    const deleted = await registry.deleteWebhookSubscription(3);
    expect(deleted).toBe(true);
  });

  it("reports false when there is nothing to delete", async () => {
    const { db, queue } = makeDb();
    queue.push([]); // DELETE ... RETURNING yields no rows
    mocks.getDb.mockResolvedValue(db);

    const deleted = await registry.deleteWebhookSubscription(999);
    expect(deleted).toBe(false);
  });
});

// --- listWebhookEventCatalog -------------------------------------------------

describe.skipIf(!HAS_CATALOG)("listWebhookEventCatalog (BACKEND-DEP)", () => {
  it("returns >=6 entries including the canonical events and '*'", () => {
    const catalog = registry.listWebhookEventCatalog();
    expect(Array.isArray(catalog)).toBe(true);
    expect(catalog.length).toBeGreaterThanOrEqual(6);

    const ids = catalog.map((e) => e.id);
    for (const id of [
      "test.ping",
      "evidence.expired",
      "control.autotest.failed",
      "risk.created",
      "policy.ack.overdue",
      "*",
    ]) {
      expect(ids).toContain(id);
    }

    // unique ids, each entry carries id + label + description
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of catalog) {
      expect(typeof entry.id).toBe("string");
      expect(typeof entry.label).toBe("string");
      expect(typeof entry.description).toBe("string");
    }
  });
});

// --- create / list helpers ---------------------------------------------------

describe("createWebhookSubscription", () => {
  it("inserts a row and returns the normalized subscription", async () => {
    const { db, queue } = makeDb();
    queue.push([
      subRow({
        id: 42,
        name: "New Hook",
        targetUrl: "https://hooks.example.com/new",
        secret: "generated-or-provided",
        events: ["risk.created"],
      }),
    ]);
    mocks.getDb.mockResolvedValue(db);

    const sub = await registry.createWebhookSubscription({
      clientId: 7,
      name: "New Hook",
      targetUrl: "https://hooks.example.com/new",
      events: ["risk.created"],
      secret: "generated-or-provided",
    });

    expect(sub).toMatchObject({
      id: 42,
      clientId: 7,
      name: "New Hook",
      targetUrl: "https://hooks.example.com/new",
      events: ["risk.created"],
      status: "active",
    });
    expect(typeof sub.createdAt).toBe("string");
    expect(Number.isNaN(Date.parse(sub.createdAt))).toBe(false);
  });
});

describe("getClientWebhookSubscriptions / getClientWebhookDeliveries", () => {
  it("lists all subscriptions for a client (active and disabled)", async () => {
    const { db, queue } = makeDb();
    queue.push([
      subRow({ id: 1, status: "active" }),
      subRow({ id: 2, status: "disabled", name: "Old" }),
    ]);
    mocks.getDb.mockResolvedValue(db);

    const subs = await registry.getClientWebhookSubscriptions(7);
    expect(subs.map((s) => s.id)).toEqual([1, 2]);
    expect(subs[1].status).toBe("disabled");
  });

  it("lists delivery history mapped to the delivery contract", async () => {
    const { db, queue } = makeDb();
    queue.push([
      {
        id: 11,
        subscriptionId: 1,
        event: "test.ping",
        payload: { event: "test.ping" },
        statusCode: 200,
        responseBody: "ack",
        durationMs: 12,
        success: true,
        executedAt: "2026-08-14T10:00:00.000Z",
      },
    ]);
    mocks.getDb.mockResolvedValue(db);

    const deliveries = await registry.getClientWebhookDeliveries(7, 10);
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0]).toMatchObject({
      id: 11,
      subscriptionId: 1,
      event: "test.ping",
      statusCode: 200,
      success: true,
      durationMs: 12,
    });
    expect(Number.isNaN(Date.parse(deliveries[0].executedAt))).toBe(false);
  });

  it("defaults the delivery limit to 50 when omitted", async () => {
    const { db, execute, queue } = makeDb();
    queue.push([]);
    mocks.getDb.mockResolvedValue(db);

    const deliveries = await registry.getClientWebhookDeliveries(7);

    expect(deliveries).toEqual([]);
    // The bound LIMIT value (50) is embedded in the paged SELECT
    expect(sqlParamValues(execute)).toContain(50);
  });
});

// --- Additional edge paths ------------------------------------------------

describe("createWebhookSubscription — generated secret", () => {
  it("auto-generates a 64-char hex secret when none is provided", async () => {
    const { db, execute, queue } = makeDb();
    queue.push([subRow({ id: 7, secret: "mocked-return" })]);
    mocks.getDb.mockResolvedValue(db);

    const sub = await registry.createWebhookSubscription({
      clientId: 7,
      name: "Auto Secret",
      targetUrl: "https://hooks.example.com/auto",
      events: ["test.ping"],
    });

    expect(sub.id).toBe(7);
    // The generated secret lands in the INSERT SQL as contiguous lowercase
    // hex (whether it is inlined as a string chunk or a bound Param value).
    const sqlText = allSql(execute);
    const generated = sqlText.match(/[0-9a-f]{64}/g) ?? [];
    expect(generated.length).toBeGreaterThanOrEqual(1);
    expect(sqlText).toContain("INSERT INTO webhook_subscriptions");
  });
});

describe("updateWebhookSubscription — empty patch", () => {
  it("fetches the current row without issuing an UPDATE when no fields change", async () => {
    const { db, execute, queue } = makeDb();
    queue.push([subRow({ id: 3, name: "Untouched" })]);
    mocks.getDb.mockResolvedValue(db);

    const updated = await registry.updateWebhookSubscription(3, {});

    expect(updated).toMatchObject({ id: 3, name: "Untouched" });
    const sqlText = allSql(execute);
    expect(sqlText).toContain("SELECT");
    expect(sqlText).not.toContain("UPDATE webhook_subscriptions");
  });
});

describe("deleteWebhookSubscription — cascade", () => {
  it("deletes the delivery history before the subscription row", async () => {
    const { db, execute, queue } = makeDb();
    queue.push([subRow({ id: 3 })]);
    mocks.getDb.mockResolvedValue(db);

    const deleted = await registry.deleteWebhookSubscription(3);

    expect(deleted).toBe(true);
    const sqlText = allSql(execute);
    const deliveriesAt = sqlText.indexOf("DELETE FROM webhook_deliveries");
    const subscriptionsAt = sqlText.indexOf("DELETE FROM webhook_subscriptions");
    expect(deliveriesAt).toBeGreaterThanOrEqual(0);
    expect(subscriptionsAt).toBeGreaterThan(deliveriesAt);
  });
});

describe("scrubSensitiveData", () => {
  it("redacts keys matching secret/password/api key/token/authorization recursively", () => {
    const scrubbed = registry.scrubSensitiveData({
      Authorization: "Bearer abc",
      authorization: "x",
      api_key: "y",
      apiKey: "z",
      nested: { secret: "s", token: "t", fine: 1 },
      arr: [{ password: "p" }],
    });

    expect(scrubbed).toEqual({
      Authorization: "[REDACTED]",
      authorization: "[REDACTED]",
      api_key: "[REDACTED]",
      apiKey: "[REDACTED]",
      nested: { secret: "[REDACTED]", token: "[REDACTED]", fine: 1 },
      arr: [{ password: "[REDACTED]" }],
    });
  });

  it("passes primitives, arrays and non-sensitive keys through untouched", () => {
    expect(registry.scrubSensitiveData("plain")).toBe("plain");
    expect(registry.scrubSensitiveData(42)).toBe(42);
    expect(registry.scrubSensitiveData(null)).toBeNull();
    expect(registry.scrubSensitiveData(["a", { keep: true }])).toEqual([
      "a",
      { keep: true },
    ]);
    expect(
      registry.scrubSensitiveData({ control: "CC-1", score: 100 })
    ).toEqual({ control: "CC-1", score: 100 });
  });
});
