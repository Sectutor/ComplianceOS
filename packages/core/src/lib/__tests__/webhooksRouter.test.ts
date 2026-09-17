import { describe, it, expect, vi, beforeEach } from "vitest";
import { initTRPC, TRPCError } from "@trpc/server";

/**
 * Webhooks router — contract tests (QA cycle 8, scorecard #15).
 *
 * The router is a factory `createWebhooksRouter(t, clientProcedure)` (same
 * pattern as createEvidenceCollectorsRouter), so it is fully testable with a
 * tiny fake `t.router` + chainable `clientProcedure` — no tRPC server setup.
 * The webhookRegistry lib module is mocked (vi.mock interception), letting us
 * verify zod input validation, argument delegation and result forwarding
 * without a database or network.
 *
 * The fake procedure attaches the zod schema captured by `.input()` to each
 * route ({ type, handler, schema }), so schema assertions are robust to route
 * insertion order. listEventCatalog is a no-input query (schema undefined).
 *
 * The backend landed updateSubscription / deleteSubscription / listEventCatalog
 * in this cycle; their suites are still gated behind feature probes (house
 * convention — see riskHeatmapContract.test.ts) so they stay green if the
 * router is ever reverted mid-cycle.
 */
const routerMocks = vi.hoisted(() => ({
  createWebhookSubscription: vi.fn(),
  getClientWebhookSubscriptions: vi.fn(),
  getClientWebhookDeliveries: vi.fn(),
  dispatchWebhookEvent: vi.fn(),
  updateWebhookSubscription: vi.fn(),
  deleteWebhookSubscription: vi.fn(),
  listWebhookEventCatalog: vi.fn(),
}));

vi.mock("../webhooks/webhookRegistry", () => ({
  createWebhookSubscription: routerMocks.createWebhookSubscription,
  getClientWebhookSubscriptions: routerMocks.getClientWebhookSubscriptions,
  getClientWebhookDeliveries: routerMocks.getClientWebhookDeliveries,
  dispatchWebhookEvent: routerMocks.dispatchWebhookEvent,
  updateWebhookSubscription: routerMocks.updateWebhookSubscription,
  deleteWebhookSubscription: routerMocks.deleteWebhookSubscription,
  listWebhookEventCatalog: routerMocks.listWebhookEventCatalog,
}));

import { createWebhooksRouter } from "../../server/routers/webhooks";

/** Minimal fake tRPC builder that captures input schemas on each route. */
function buildFakeTRPC() {
  const clientProcedure: any = {
    _schema: undefined,
    input: (schema: unknown) => {
      clientProcedure._schema = schema;
      return clientProcedure;
    },
    query: (handler: any) => {
      const schema = clientProcedure._schema;
      clientProcedure._schema = undefined;
      return { type: "query", handler, schema };
    },
    mutation: (handler: any) => {
      const schema = clientProcedure._schema;
      clientProcedure._schema = undefined;
      return { type: "mutation", handler, schema };
    },
  };
  const t: any = { router: (routes: any) => routes };
  const router = createWebhooksRouter(t, clientProcedure);
  return { router };
}

// Feature probes (built with mocked lib — no side effects during construction)
const { router: probeRouter } = buildFakeTRPC();
const HAS_UPDATE = typeof probeRouter.updateSubscription === "object";
const HAS_DELETE = typeof probeRouter.deleteSubscription === "object";
const HAS_CATALOG = typeof probeRouter.listEventCatalog === "object";

const SUBSCRIBE_INPUT = {
  clientId: 1,
  name: "Prod Hook",
  targetUrl: "https://hooks.example.com/prod",
  events: ["test.ping", "risk.created"],
};

const SUBSCRIPTION = {
  id: 1,
  clientId: 1,
  name: "Prod Hook",
  targetUrl: "https://hooks.example.com/prod",
  secret: "s3cret",
  events: ["test.ping", "risk.created"],
  status: "active",
  createdAt: "2026-08-14T10:00:00.000Z",
};

beforeEach(() => {
  for (const mock of Object.values(routerMocks)) mock.mockReset();
});

describe("webhooks router — subscribe", () => {
  it("validates clientId, name length, target URL and a non-empty events array", () => {
    const { router } = buildFakeTRPC();
    const schema = router.subscribe.schema;

    expect(() => schema.parse({})).toThrow();
    expect(() => schema.parse({ ...SUBSCRIBE_INPUT, clientId: "x" })).toThrow();
    expect(() => schema.parse({ ...SUBSCRIBE_INPUT, name: "" })).toThrow();
    expect(() =>
      schema.parse({ ...SUBSCRIBE_INPUT, targetUrl: "not-a-url" })
    ).toThrow();
    expect(() => schema.parse({ ...SUBSCRIBE_INPUT, events: [] })).toThrow();
    expect(schema.parse(SUBSCRIBE_INPUT)).toMatchObject(SUBSCRIBE_INPUT);
    // secret is optional
    expect(schema.parse({ ...SUBSCRIBE_INPUT, secret: "abc" }).secret).toBe("abc");
  });

  it("forwards the full input to createWebhookSubscription and returns its result", async () => {
    const { router } = buildFakeTRPC();
    routerMocks.createWebhookSubscription.mockResolvedValue(SUBSCRIPTION);

    const result = await router.subscribe.handler({ input: SUBSCRIBE_INPUT });

    expect(routerMocks.createWebhookSubscription).toHaveBeenCalledWith(SUBSCRIBE_INPUT);
    expect(result).toEqual(SUBSCRIPTION);
  });

  it("wraps lib failures in a TRPCError", async () => {
    const { router } = buildFakeTRPC();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    routerMocks.createWebhookSubscription.mockRejectedValue(new Error("db down"));

    await expect(
      router.subscribe.handler({ input: SUBSCRIBE_INPUT })
    ).rejects.toBeInstanceOf(TRPCError);
    await expect(
      router.subscribe.handler({ input: SUBSCRIBE_INPUT })
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    consoleErrorSpy.mockRestore();
  });
});

describe("webhooks router — listSubscriptions", () => {
  it("validates a numeric clientId", () => {
    const { router } = buildFakeTRPC();
    expect(() => router.listSubscriptions.schema.parse({})).toThrow();
    expect(() => router.listSubscriptions.schema.parse({ clientId: "x" })).toThrow();
    expect(router.listSubscriptions.schema.parse({ clientId: 3 })).toMatchObject({
      clientId: 3,
    });
  });

  it("delegates to getClientWebhookSubscriptions with the clientId", async () => {
    const { router } = buildFakeTRPC();
    routerMocks.getClientWebhookSubscriptions.mockResolvedValue([SUBSCRIPTION]);

    const result = await router.listSubscriptions.handler({ input: { clientId: 3 } });

    expect(routerMocks.getClientWebhookSubscriptions).toHaveBeenCalledWith(3);
    expect(result).toEqual([SUBSCRIPTION]);
  });
});

describe("webhooks router — listDeliveries", () => {
  it("defaults limit to 50", () => {
    const { router } = buildFakeTRPC();
    expect(router.listDeliveries.schema.parse({ clientId: 3 })).toMatchObject({
      clientId: 3,
      limit: 50,
    });
    expect(router.listDeliveries.schema.parse({ clientId: 3, limit: 7 }).limit).toBe(7);
    expect(() => router.listDeliveries.schema.parse({})).toThrow();
  });

  it("delegates to getClientWebhookDeliveries with clientId and limit", async () => {
    const { router } = buildFakeTRPC();
    const delivery = {
      id: 11,
      subscriptionId: 1,
      event: "test.ping",
      statusCode: 200,
      success: true,
      durationMs: 12,
      executedAt: "2026-08-14T10:00:00.000Z",
    };
    routerMocks.getClientWebhookDeliveries.mockResolvedValue([delivery]);

    const result = await router.listDeliveries.handler({
      input: { clientId: 3, limit: 25 },
    });

    expect(routerMocks.getClientWebhookDeliveries).toHaveBeenCalledWith(3, 25);
    expect(result).toEqual([delivery]);
  });
});

describe("webhooks router — triggerTestEvent", () => {
  it("defaults event to 'test.ping' and accepts optional data", () => {
    const { router } = buildFakeTRPC();
    expect(router.triggerTestEvent.schema.parse({ clientId: 1 })).toMatchObject({
      clientId: 1,
      event: "test.ping",
    });
    expect(
      router.triggerTestEvent.schema.parse({ clientId: 1, event: "risk.created", data: { x: 1 } })
    ).toMatchObject({ event: "risk.created", data: { x: 1 } });
    expect(() => router.triggerTestEvent.schema.parse({})).toThrow();
  });

  it("delegates to dispatchWebhookEvent with clientId, event and provided data", async () => {
    const { router } = buildFakeTRPC();
    const summary = { event: "risk.created", dispatchedCount: 1, successCount: 1, failureCount: 0 };
    routerMocks.dispatchWebhookEvent.mockResolvedValue(summary);

    const result = await router.triggerTestEvent.handler({
      input: { clientId: 1, event: "risk.created", data: { x: 1 } },
    });

    expect(routerMocks.dispatchWebhookEvent).toHaveBeenCalledWith(1, "risk.created", { x: 1 });
    expect(result).toEqual(summary);
  });

  it("falls back to a default test payload when data is omitted", async () => {
    const { router } = buildFakeTRPC();
    routerMocks.dispatchWebhookEvent.mockResolvedValue({
      event: "test.ping",
      dispatchedCount: 1,
      successCount: 1,
      failureCount: 0,
    });

    await router.triggerTestEvent.handler({ input: { clientId: 1 } });

    const [, , data] = routerMocks.dispatchWebhookEvent.mock.calls[0];
    expect(data).toMatchObject({ test: true });
  });
});

// --- Backend-dependent endpoints (landed this cycle) -------------------------

describe.skipIf(!HAS_UPDATE)("webhooks router — updateSubscription (BACKEND-DEP)", () => {
  it("validates id plus optional updatable fields", () => {
    const { router } = buildFakeTRPC();
    const schema = router.updateSubscription.schema;
    expect(schema).toBeDefined();
    expect(() => schema.parse({})).toThrow();
    expect(() => schema.parse({ id: "x" })).toThrow();
    expect(schema.parse({ id: 3 })).toMatchObject({ id: 3 });
    expect(schema.parse({ id: 3, name: "Renamed", status: "disabled" })).toMatchObject({
      id: 3,
      name: "Renamed",
      status: "disabled",
    });
    expect(() => schema.parse({ id: 3, status: "bogus" })).toThrow();
  });

  it("delegates id + patch to updateWebhookSubscription and returns the updated row", async () => {
    const { router } = buildFakeTRPC();
    const updated = { ...SUBSCRIPTION, name: "Renamed" };
    routerMocks.updateWebhookSubscription.mockResolvedValue(updated);

    const result = await router.updateSubscription.handler({
      input: { id: 1, name: "Renamed" },
    });

    expect(routerMocks.updateWebhookSubscription).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ name: "Renamed" })
    );
    expect(result).toEqual(updated);
  });

  it("throws NOT_FOUND when the subscription does not exist", async () => {
    const { router } = buildFakeTRPC();
    routerMocks.updateWebhookSubscription.mockResolvedValue(null);

    await expect(
      router.updateSubscription.handler({ input: { id: 999, name: "Ghost" } })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe.skipIf(!HAS_DELETE)("webhooks router — deleteSubscription (BACKEND-DEP)", () => {
  it("validates a numeric id", () => {
    const { router } = buildFakeTRPC();
    expect(() => router.deleteSubscription.schema.parse({})).toThrow();
    expect(() => router.deleteSubscription.schema.parse({ id: "x" })).toThrow();
    expect(router.deleteSubscription.schema.parse({ id: 3 })).toMatchObject({ id: 3 });
  });

  it("delegates to deleteWebhookSubscription and returns { success, id }", async () => {
    const { router } = buildFakeTRPC();
    routerMocks.deleteWebhookSubscription.mockResolvedValue(true);

    const result = await router.deleteSubscription.handler({ input: { id: 1 } });

    expect(routerMocks.deleteWebhookSubscription).toHaveBeenCalledWith(1);
    expect(result).toEqual({ success: true, id: 1 });
  });

  it("throws NOT_FOUND when nothing was deleted", async () => {
    const { router } = buildFakeTRPC();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    routerMocks.deleteWebhookSubscription.mockResolvedValue(false);

    await expect(
      router.deleteSubscription.handler({ input: { id: 999 } })
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
    consoleErrorSpy.mockRestore();
  });
});

describe.skipIf(!HAS_CATALOG)("webhooks router — listEventCatalog (BACKEND-DEP)", () => {
  it("exposes a no-input query that returns the event catalog", async () => {
    const { router } = buildFakeTRPC();
    const catalog = [
      { id: "test.ping", label: "Test Ping", description: "Connectivity check" },
      { id: "*", label: "All events", description: "Subscribe to everything" },
    ];
    routerMocks.listWebhookEventCatalog.mockResolvedValue(catalog);

    const result = await router.listEventCatalog.handler({});

    expect(router.listEventCatalog.type).toBe("query");
    expect(routerMocks.listWebhookEventCatalog).toHaveBeenCalled();
    expect(result).toEqual(catalog);
  });
});

// --- Real tRPC wiring: zod validation failures surface as TRPCError ----------

describe("webhooks router — zod validation through real tRPC", () => {
  function makeCaller() {
    const t = initTRPC.create();
    const router = createWebhooksRouter(t, t.procedure);
    return router.createCaller({});
  }

  it("turns invalid input into TRPCError BAD_REQUEST on every input procedure", async () => {
    const caller = makeCaller();

    await expect(
      caller.subscribe({
        clientId: "x",
        name: "Hook",
        targetUrl: "https://e.com",
        events: ["test.ping"],
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.updateSubscription({ id: 1, status: "bogus" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.deleteSubscription({ id: "x" })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.listSubscriptions({})
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.listDeliveries({})
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      caller.triggerTestEvent({})
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("runs valid input through the handler end-to-end", async () => {
    const caller = makeCaller();
    routerMocks.createWebhookSubscription.mockResolvedValue(SUBSCRIPTION);

    const result = await caller.subscribe(SUBSCRIBE_INPUT);

    expect(routerMocks.createWebhookSubscription).toHaveBeenCalledWith(
      SUBSCRIBE_INPUT
    );
    expect(result).toEqual(SUBSCRIPTION);
  });
});

// --- update/delete error paths (BACKEND-DEP) ---------------------------------

describe.skipIf(!HAS_UPDATE)("webhooks router — updateSubscription error paths (BACKEND-DEP)", () => {
  it("rethrows TRPCErrors from the lib unchanged", async () => {
    const { router } = buildFakeTRPC();
    routerMocks.updateWebhookSubscription.mockRejectedValue(
      new TRPCError({ code: "FORBIDDEN", message: "nope" })
    );

    await expect(
      router.updateSubscription.handler({ input: { id: 1, name: "X" } })
    ).rejects.toMatchObject({ code: "FORBIDDEN", message: "nope" });
  });

  it("wraps generic lib failures in INTERNAL_SERVER_ERROR", async () => {
    const { router } = buildFakeTRPC();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    routerMocks.updateWebhookSubscription.mockRejectedValue(new Error("db down"));

    await expect(
      router.updateSubscription.handler({ input: { id: 1, name: "X" } })
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    consoleErrorSpy.mockRestore();
  });
});

describe.skipIf(!HAS_DELETE)("webhooks router — deleteSubscription error paths (BACKEND-DEP)", () => {
  it("wraps generic lib failures in INTERNAL_SERVER_ERROR", async () => {
    const { router } = buildFakeTRPC();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    routerMocks.deleteWebhookSubscription.mockRejectedValue(new Error("db down"));

    await expect(
      router.deleteSubscription.handler({ input: { id: 1 } })
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    consoleErrorSpy.mockRestore();
  });
});
