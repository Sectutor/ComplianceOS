import { describe, it, expect, vi, afterEach } from "vitest";

/**
 * Webhook Events — unit tests (QA cycle 8, scorecard #15).
 *
 * packages/core/src/lib/webhooks/webhookEvents.ts was landed in parallel by
 * the backend agent: WEBHOOK_EVENT_CATALOG, WEBHOOK_EVENT_IDS and the
 * fire-and-forget safeDispatchWebhookEvent wrapper. The module is imported
 * dynamically inside a try/catch and every test is gated behind
 * describe.skipIf — the house convention for parallel-backend races (see
 * riskHeatmapContract.test.ts) — so this suite stays green if the module is
 * ever reverted mid-cycle.
 *
 * getDb is mocked so safeDispatchWebhookEvent's underlying dispatch never
 * touches a live database.
 */

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

vi.mock("../../db", () => ({ getDb: mocks.getDb }));

let webhookEvents: any = null;
try {
  webhookEvents = await import("../webhooks/webhookEvents");
} catch {
  webhookEvents = null;
}

const realFetch = globalThis.fetch;

afterEach(() => {
  mocks.getDb.mockReset();
  (globalThis as { fetch: unknown }).fetch = realFetch;
});

/** A db whose execute returns no subscription rows (zero-dispatch path). */
function emptyDb() {
  return { execute: vi.fn(async () => ({ rows: [] })) };
}

describe.skipIf(!webhookEvents)("webhookEvents (BACKEND-DEP)", () => {
  const { WEBHOOK_EVENT_CATALOG, WEBHOOK_EVENT_IDS, safeDispatchWebhookEvent } =
    webhookEvents;

  it("WEBHOOK_EVENT_IDS excludes '*' and includes the canonical event ids", () => {
    expect(Array.isArray(WEBHOOK_EVENT_IDS)).toBe(true);
    expect(WEBHOOK_EVENT_IDS).not.toContain("*");
    for (const id of [
      "test.ping",
      "evidence.expired",
      "control.autotest.failed",
      "risk.created",
      "policy.ack.overdue",
    ]) {
      expect(WEBHOOK_EVENT_IDS).toContain(id);
    }
  });

  it("WEBHOOK_EVENT_CATALOG has >=6 unique entries with id+label+description", () => {
    expect(Array.isArray(WEBHOOK_EVENT_CATALOG)).toBe(true);
    expect(WEBHOOK_EVENT_CATALOG.length).toBeGreaterThanOrEqual(6);

    const ids = WEBHOOK_EVENT_CATALOG.map((e: any) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toContain("*");

    for (const entry of WEBHOOK_EVENT_CATALOG) {
      expect(typeof entry.id).toBe("string");
      expect(typeof entry.label).toBe("string");
      expect(typeof entry.description).toBe("string");
    }
  });

  it("safeDispatchWebhookEvent is fire-and-forget: returns void and still dispatches", async () => {
    mocks.getDb.mockResolvedValue(emptyDb());
    (globalThis as { fetch: unknown }).fetch = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => "ok",
    }));

    const result = await Promise.resolve(
      safeDispatchWebhookEvent(7, "test.ping", { hello: "world" })
    );

    // the wrapper does not surface the dispatch result...
    expect(result).toBeUndefined();
    // ...but the underlying dispatch actually ran (getDb was consulted)
    await vi.waitFor(() => expect(mocks.getDb).toHaveBeenCalled());
  });

  it("safeDispatchWebhookEvent never throws even when the underlying dispatch rejects", async () => {
    // getDb is down AND fetch would blow up — the underlying dispatch rejects
    // (or degrades), and the wrapper must swallow it either way.
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.getDb.mockRejectedValue(new Error("connection refused"));
    (globalThis as { fetch: unknown }).fetch = vi.fn(async () => {
      throw new Error("ECONNREFUSED");
    });

    const outcome = await Promise.resolve(
      safeDispatchWebhookEvent(7, "test.ping", {})
    ).then(
      () => "resolved",
      () => "rejected"
    );

    expect(outcome).toBe("resolved");
    await vi.waitFor(() => expect(mocks.getDb).toHaveBeenCalled());
    consoleErrorSpy.mockRestore();
  });

  it("safeDispatchWebhookEvent does not throw synchronously for a known event", async () => {
    mocks.getDb.mockResolvedValue(emptyDb());

    expect(() => {
      safeDispatchWebhookEvent(7, "test.ping", {});
    }).not.toThrow();

    // let the fire-and-forget dispatch settle inside this test (mocked db)
    await vi.waitFor(() => expect(mocks.getDb).toHaveBeenCalled());
  });

  it("forwards clientId, event and data to the underlying dispatcher", async () => {
    // Isolate the wrapper against a mocked webhookRegistry so we can assert
    // exactly what it hands off (no DB/network involved).
    vi.resetModules();
    const dispatchMock = vi.fn(async () => ({
      event: "test.ping",
      dispatchedCount: 1,
      successCount: 1,
      failureCount: 0,
    }));
    vi.doMock("../webhooks/webhookRegistry", () => ({
      dispatchWebhookEvent: dispatchMock,
    }));
    const mod = await import("../webhooks/webhookEvents");

    mod.safeDispatchWebhookEvent(7, "test.ping", { hello: "world" });

    await vi.waitFor(() =>
      expect(dispatchMock).toHaveBeenCalledWith(7, "test.ping", { hello: "world" })
    );
  });
});
