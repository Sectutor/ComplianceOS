import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZodError } from "zod";
import { TRPCError } from "@trpc/server";

/**
 * Sentinel runtime router (server/routers/sentinel.ts) — contract tests
 * (QA build-cycle 38, Sentinel Bots / Agent Runtime Phase 1).
 *
 * Mirrors securityMetricsRouter.test.ts / teammatesRouter.test.ts: the router
 * is a factory `createSentinelRouter(t, clientProcedure, adminProcedure)`
 * tested with a tiny fake tRPC builder — no tRPC server, no DB.
 *
 * Contract under test — exactly these 8 procedures:
 *   queries   : listActions (client), runtimeStatus (admin)
 *   mutations : runNow, reviewSentinelAction, escalationSweep, sendDigestNow
 *               (client) · startRuntime, stopRuntime (admin)
 *
 * Wiring contract:
 *   - client-surface routes MUST be registered through clientProcedure
 *     (UNAUTHORIZED when ctx.user is missing);
 *   - startRuntime/stopRuntime/runtimeStatus MUST be registered through
 *     adminProcedure (FORBIDDEN for authenticated non-admin roles, mirroring
 *     trpc.ts isAdmin / PLATFORM_ADMIN_ROLES);
 *   - zod-validated inputs surface ZodError as TRPCError BAD_REQUEST,
 *     never a raw crash inside the handler.
 *
 * No-database degradation (as implemented, asserted behaviourally with the
 * mocked getDb resolving null — the REAL runtime/actionPipeline modules run):
 *   - listActions            → []
 *   - reviewSentinelAction   → { success: false }
 *   - runNow                 → throws Error("no database")
 *   - escalationSweep        → { success: true, escalated: 0 }
 *   - sendDigestNow          → { success: true }
 *   - runtime lifecycle      → independent of DB (start/status/stop flips flag)
 */

const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

// Same `src/db` mock as the sibling router tests. The router AND the runtime
// engine it delegates to (server/runtime/agentRuntime, actionPipeline — both
// reached via dynamic import inside handlers) resolve their getDb through this
// module, so a single mock keeps every path hermetic.
vi.mock("../../db", () => ({
  getDb: dbMocks.getDb,
}));

import { createSentinelRouter } from "../../server/routers/sentinel";

// Mirrors PLATFORM_ADMIN_ROLES in server/trpc.ts (kept in sync deliberately —
// see the "admin gating" describe block; if trpc adds a role, update here).
const PLATFORM_ADMIN_ROLES = ["admin", "owner", "super_admin", "super", "enterprise_admin", "ent_admin"];

/** Generous budget: OneDrive-synced tree can be slow under parallel load. */
vi.setConfig({ testTimeout: 60_000 });

type RouteDef = { type: "query" | "mutation"; handler: (args: { input?: unknown; ctx?: any }) => any; schema: unknown; auth: "client" | "admin" };

/**
 * Minimal fake tRPC builder producing TWO distinct procedure flavors, exactly
 * how the real app wires createSentinelRouter(t, clientProcedure, adminProcedure).
 *
 * Unlike the securityMetrics builder (whose mutations did not need schema
 * capture because that router is all-query), this router registers mostly
 * mutations, so BOTH wrappers capture the pending schema at route-build time
 * and reset it afterwards (startRuntime et al. register WITHOUT .input()).
 */
function makeProcedure(auth: "client" | "admin") {
  let currentSchema: unknown = null;
  const proc: any = {
    input: (schema: unknown) => {
      currentSchema = schema;
      return proc;
    },
    query: (handler: any): RouteDef => {
      const schema = currentSchema;
      currentSchema = null;
      return { type: "query", handler: wrap(handler, schema, auth), schema, auth };
    },
    mutation: (handler: any): RouteDef => {
      const schema = currentSchema;
      currentSchema = null;
      return { type: "mutation", handler: wrap(handler, schema, auth), schema, auth };
    },
  };
  return proc;
}

/** Enforce the auth gate + zod input parsing the way the real layers do. */
function wrap(handler: any, schema: unknown, auth: "client" | "admin") {
  return async ({ input, ctx }: { input?: unknown; ctx?: any }) => {
    if (!ctx?.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authentication required. Please sign in.",
      });
    }
    if (auth === "admin" && !PLATFORM_ADMIN_ROLES.includes(ctx.user.role || "")) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Admin access required. Current role: " + (ctx.user.role || "none"),
      });
    }
    if (schema && input !== undefined) {
      let parsed: unknown;
      try {
        parsed = (schema as { parse: (v: unknown) => unknown }).parse(input);
      } catch (err) {
        if (err instanceof ZodError) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid input", cause: err });
        }
        throw err;
      }
      return handler({ input: parsed, ctx });
    }
    return handler({ input, ctx });
  };
}

function buildRouter() {
  return createSentinelRouter(
    { router: (routes: any) => routes } as any,
    makeProcedure("client"),
    makeProcedure("admin")
  );
}

const CLIENT_ROUTES = [
  "runNow",
  "listActions",
  "getActionDetail",
  "reviewSentinelAction",
  "escalationSweep",
  "sendDigestNow",
  "getStats",
  "updateCadence",
  "batchReviewActions",
];
const ADMIN_MUTATIONS = ["startRuntime", "stopRuntime"];
const ADMIN_QUERIES = ["runtimeStatus"];

beforeEach(() => {
  dbMocks.getDb.mockReset();
});

// ── Route shape ──────────────────────────────────────────────────────────────

describe("sentinel router — route shape", () => {
  it("exposes exactly the 12 documented procedures, each with a callable handler", () => {
    const router = buildRouter();
    expect(Object.keys(router).sort()).toEqual(
      [
        "batchReviewActions",
        "escalationSweep",
        "getActionDetail",
        "getStats",
        "listActions",
        "reviewSentinelAction",
        "runNow",
        "runtimeStatus",
        "sendDigestNow",
        "startRuntime",
        "stopRuntime",
        "updateCadence",
      ].sort()
    );
    for (const name of Object.keys(router)) {
      expect(typeof (router as any)[name].handler, `handler of "${name}"`).toBe("function");
    }
  });

  it("registers queries vs mutations through the stubbed procedure chain", () => {
    const router = buildRouter();
    for (const name of ["listActions", "runtimeStatus", "getStats", "getActionDetail"]) {
      expect((router as any)[name].type, `"${name}" type`).toBe("query");
    }
    for (const name of [
      "runNow",
      "reviewSentinelAction",
      "escalationSweep",
      "sendDigestNow",
      "startRuntime",
      "stopRuntime",
      "updateCadence",
      "batchReviewActions",
    ]) {
      expect((router as any)[name].type, `"${name}" type`).toBe("mutation");
    }
  });

  it("attaches zod input schemas to the input-taking routes (lifecycle routes take no input)", () => {
    const router = buildRouter();
    for (const name of [
      "runNow",
      "listActions",
      "getActionDetail",
      "reviewSentinelAction",
      "escalationSweep",
      "sendDigestNow",
      "getStats",
      "updateCadence",
      "batchReviewActions",
    ]) {
      expect((router as any)[name].schema, `schema of "${name}"`).toBeDefined();
    }
    for (const name of [...ADMIN_MUTATIONS, ...ADMIN_QUERIES]) {
      expect((router as any)[name].schema, `no-input route "${name}"`).toBeFalsy();
    }
  });

  it("wires the client surface through clientProcedure and the lifecycle through adminProcedure", () => {
    const router = buildRouter();
    for (const name of CLIENT_ROUTES) {
      expect((router as any)[name].auth, `"${name}" must be clientProcedure`).toBe("client");
    }
    for (const name of [...ADMIN_MUTATIONS, ...ADMIN_QUERIES]) {
      expect((router as any)[name].auth, `"${name}" must be adminProcedure`).toBe("admin");
    }
  });
});

// ── Authentication gates ─────────────────────────────────────────────────────

describe("sentinel router — unauthenticated callers are rejected", () => {
  it("all client procedures reject a missing user with TRPCError UNAUTHORIZED before touching the DB", async () => {
    dbMocks.getDb.mockResolvedValue(null);
    const router = buildRouter();
    const calls = [
      router.runNow.handler({ input: { clientId: 1 }, ctx: {} }),
      router.listActions.handler({ input: { clientId: 1 }, ctx: {} }),
      router.reviewSentinelAction.handler({ input: { actionId: 1, decision: "approved" }, ctx: {} }),
      router.escalationSweep.handler({ input: { clientId: 1 }, ctx: {} }),
      router.sendDigestNow.handler({ input: { clientId: 1 }, ctx: {} }),
    ];
    for (const call of calls) {
      await expect(call).rejects.toBeInstanceOf(TRPCError);
      await expect(call).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    }
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });

  it("the admin lifecycle procedures also reject a missing user with UNAUTHORIZED", async () => {
    dbMocks.getDb.mockResolvedValue(null);
    const router = buildRouter();
    const calls = [
      router.startRuntime.handler({ ctx: {} }),
      router.stopRuntime.handler({ ctx: {} }),
      router.runtimeStatus.handler({ ctx: {} }),
    ];
    for (const call of calls) {
      await expect(call).rejects.toBeInstanceOf(TRPCError);
      await expect(call).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    }
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });

  it("authenticated non-admin roles are FORBIDDEN on startRuntime/stopRuntime/runtimeStatus", async () => {
    dbMocks.getDb.mockResolvedValue(null);
    const router = buildRouter();
    const memberCtx = { user: { id: 7, role: "member" } };
    const calls = [
      router.startRuntime.handler({ ctx: memberCtx }),
      router.stopRuntime.handler({ ctx: memberCtx }),
      router.runtimeStatus.handler({ ctx: memberCtx }),
    ];
    for (const call of calls) {
      await expect(call).rejects.toBeInstanceOf(TRPCError);
      await expect(call).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });

  it("platform admin roles ARE allowed through the admin gate", async () => {
    dbMocks.getDb.mockResolvedValue(null);
    const router = buildRouter();
    // ensure clean slate, then flip the runtime flag through the real lifecycle
    await router.stopRuntime.handler({ ctx: { user: { id: 1, role: "owner" } } });
    const status = await router.runtimeStatus.handler({ ctx: { user: { id: 1, role: "super_admin" } } });
    expect(status).toEqual({ running: false });
    await router.stopRuntime.handler({ ctx: { user: { id: 1, role: "owner" } } });
  });
});

// ── Zod input validation ─────────────────────────────────────────────────────

describe("sentinel router — zod BAD_REQUEST on malformed input", () => {
  it("runNow requires a numeric clientId (missing or string-typed input is rejected)", async () => {
    dbMocks.getDb.mockResolvedValue(null);
    const router = buildRouter();

    expect(() => router.runNow.schema.parse({})).toThrow(ZodError);
    expect(() => router.runNow.schema.parse({ clientId: "5" })).toThrow(ZodError);
    expect(() => router.runNow.schema.parse({ clientId: 5 })).not.toThrow();

    const missing = router.runNow.handler({ input: {}, ctx: { user: { id: 1, role: "owner" } } });
    await expect(missing).rejects.toMatchObject({ code: "BAD_REQUEST" });
    const mistyped = router.runNow.handler({ input: { clientId: "5" }, ctx: { user: { id: 1, role: "owner" } } });
    await expect(mistyped).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMocks.getDb).not.toHaveBeenCalled(); // rejected before any handler ran
  });

  it("listActions validates the status enum against pending_review|executed|rejected|all and applies defaults", () => {
    const router = buildRouter();
    const parsed = router.listActions.schema.parse({ clientId: 9 });
    expect(parsed).toEqual({ clientId: 9, status: "all", limit: 50 });

    expect(() => router.listActions.schema.parse({ clientId: 9, status: "bogus" })).toThrow(ZodError);
    expect(() => router.listActions.schema.parse({ clientId: 9, limit: "50" })).toThrow(ZodError);
    for (const ok of ["pending_review", "executed", "rejected", "all"]) {
      expect(() => router.listActions.schema.parse({ clientId: 9, status: ok })).not.toThrow();
    }

    const routerBuilt = buildRouter();
    const call = routerBuilt.listActions.handler({
      input: { clientId: 9, status: "bogus" },
      ctx: { user: { id: 1, role: "owner" } },
    });
    return expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("reviewSentinelAction coerces actionId numbers, defaults optional clientId, and rejects bad decisions", async () => {
    const router = buildRouter();

    const parsed = router.reviewSentinelAction.schema.parse({ actionId: "42", decision: "approved" });
    expect(parsed.actionId).toBe(42);
    expect(typeof parsed.actionId).toBe("number");

    expect(() => router.reviewSentinelAction.schema.parse({ actionId: 1 })).toThrow(ZodError); // decision required
    expect(() => router.reviewSentinelAction.schema.parse({ actionId: 1, decision: "maybe" })).toThrow(ZodError);

    const badDecision = router.reviewSentinelAction.handler({
      input: { actionId: 1, decision: "maybe" },
      ctx: { user: { id: 1, role: "owner" } },
    });
    await expect(badDecision).rejects.toMatchObject({ code: "BAD_REQUEST" });

    const missingAction = router.reviewSentinelAction.handler({
      input: { decision: "approved" },
      ctx: { user: { id: 1, role: "owner" } },
    });
    await expect(missingAction).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("escalationSweep defaults ackAfterHours to 48 and rejects non-numeric values", async () => {
    const router = buildRouter();
    expect(router.escalationSweep.schema.parse({ clientId: 3 })).toEqual({ clientId: 3, ackAfterHours: 48 });
    expect(router.escalationSweep.schema.parse({ clientId: 3, ackAfterHours: 72 })).toEqual({
      clientId: 3,
      ackAfterHours: 72,
    });
    expect(() => router.escalationSweep.schema.parse({ clientId: 3, ackAfterHours: "soon" })).toThrow(ZodError);
    expect(() => router.escalationSweep.schema.parse({})).toThrow(ZodError);

    const call = router.escalationSweep.handler({
      input: { clientId: 3, ackAfterHours: "soon" },
      ctx: { user: { id: 1, role: "owner" } },
    });
    await expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("sendDigestNow requires a numeric clientId", async () => {
    const router = buildRouter();
    expect(() => router.sendDigestNow.schema.parse({})).toThrow(ZodError);
    expect(() => router.sendDigestNow.schema.parse({ clientId: true })).toThrow(ZodError);
    expect(() => router.sendDigestNow.schema.parse({ clientId: 4 })).not.toThrow();

    const call = router.sendDigestNow.handler({
      input: {},
      ctx: { user: { id: 1, role: "owner" } },
    });
    await expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

// ── Graceful degradation without a database (REAL runtime modules, mocked getDb) ──

describe("sentinel router — no-database degradation", () => {
  it("listActions returns [] instead of crashing", async () => {
    dbMocks.getDb.mockResolvedValue(null);
    const router = buildRouter();
    const rows = await router.listActions.handler({
      input: router.listActions.schema.parse({ clientId: 1 }),
      ctx: { user: { id: 1, role: "owner" } },
    });
    expect(rows).toEqual([]);
    expect(dbMocks.getDb).toHaveBeenCalled();
  });

  it("reviewSentinelAction returns { success: false } for approved AND rejected decisions", async () => {
    dbMocks.getDb.mockResolvedValue(null);
    const router = buildRouter();
    const approved = await router.reviewSentinelAction.handler({
      input: router.reviewSentinelAction.schema.parse({ actionId: "11", decision: "approved" }),
      ctx: { user: { id: 1, role: "owner" } },
    });
    expect(approved).toMatchObject({ success: false });

    const rejected = await router.reviewSentinelAction.handler({
      input: router.reviewSentinelAction.schema.parse({ clientId: 1, actionId: 11, decision: "rejected" }),
      ctx: { user: { id: 1, role: "owner" } },
    });
    expect(rejected).toMatchObject({ success: false });
  });

  it("runNow surfaces the implemented 'no database' error rather than pretending success", async () => {
    dbMocks.getDb.mockResolvedValue(null);
    const router = buildRouter();
    const call = router.runNow.handler({
      input: { clientId: 1 },
      ctx: { user: { id: 1, role: "owner" } },
    });
    await expect(call).rejects.toThrow(/no database/i);
  });

  it("escalationSweep reports success with escalated: 0 (pipeline sweep short-circuits)", async () => {
    dbMocks.getDb.mockResolvedValue(null);
    const router = buildRouter();
    const result = await router.escalationSweep.handler({
      input: router.escalationSweep.schema.parse({ clientId: 2, ackAfterHours: 24 }),
      ctx: { user: { id: 1, role: "owner" } },
    });
    expect(result).toEqual({ success: true, escalated: 0 });
  });

  it("sendDigestNow succeeds silently (digest loop early-returns without a DB)", async () => {
    dbMocks.getDb.mockResolvedValue(null);
    const router = buildRouter();
    const result = await router.sendDigestNow.handler({
      input: { clientId: 2 },
      ctx: { user: { id: 1, role: "owner" } },
    });
    expect(result).toEqual({ success: true });
  });
});

// ── Runtime lifecycle (admin surface) — DB-independent flag flipping ─────────

describe("sentinel router — runtime lifecycle", () => {
  it("startRuntime/runtimeStatus/stopRuntime flip and report the running flag without a database", async () => {
    dbMocks.getDb.mockResolvedValue(null);
    const router = buildRouter();
    vi.useFakeTimers(); // keep setInterval/setsetTimeout handles off the event loop
    try {
      const admin = { user: { id: 1, role: "owner" } };

      await router.stopRuntime.handler({ ctx: admin }); // deterministic starting point
      expect(await router.runtimeStatus.handler({ ctx: admin })).toEqual({ running: false });

      const started = await router.startRuntime.handler({ ctx: admin });
      expect(started).toEqual({ started: true });
      expect(await router.runtimeStatus.handler({ ctx: admin })).toEqual({ running: true });

      const stopped = await router.stopRuntime.handler({ ctx: admin });
      expect(stopped).toEqual({ started: false });
      expect(await router.runtimeStatus.handler({ ctx: admin })).toEqual({ running: false });

      // start is idempotent while already running
      await router.startRuntime.handler({ ctx: admin });
      await router.startRuntime.handler({ ctx: admin });
      expect(await router.runtimeStatus.handler({ ctx: admin })).toEqual({ running: true });
    } finally {
      await router.stopRuntime.handler({ ctx: { user: { id: 1, role: "owner" } } });
      vi.useRealTimers();
    }
  });
});

// ── reviewSentinelAction hardening (QA cycle 47) ─────────────────────────────

/**
 * Cycle-47 contracts for reviewSentinelAction:
 *   - a nonexistent actionId → TRPCError NOT_FOUND ("Sentinel action not found")
 *     for BOTH decisions — never a fabricated ghost-action success;
 *   - approve requires a resolvable clientId (metadata.clientId ?? input.clientId,
 *     integer > 0) → otherwise TRPCError BAD_REQUEST and NO work_items row is
 *     ever written with client_id <= 0 / missing;
 *   - success shapes are unchanged: approve { success:true, executed:true },
 *     reject { success:true, executed:false };
 *   - getDb() falsy → { success:false }, never throws (covered above, unchanged).
 *
 * Reconciliation note (cycle 47): NO pre-existing fixture in this file assumed
 * ghost-action success — the no-database block asserts { success:false } for
 * both decisions and every other describe block stops before the happy path,
 * so no reconciliations were required.
 */
describe("sentinel router — reviewSentinelAction ghost-action & clientId guards (cycle 47)", () => {
  /**
   * Fake db whose first autopilot_actions lookup returns `actionRow` (or [] when
   * null). Records every executed query as { text, params }: static SQL text is
   * reconstructed from the drizzle chunk tree, bound scalars land in params.
   */
  function makeSentinelDb(actionRow: Record<string, unknown> | null) {
    const queries: { text: string; params: unknown[] }[] = [];
    const describeQuery = (q: any): { text: string; params: unknown[] } => {
      const out = { text: "", params: [] as unknown[] };
      const walk = (chunk: any, depth: number): void => {
        if (chunk == null || depth > 4) return;
        const t = typeof chunk;
        if (t === "string") { out.text += chunk; return; }
        if (t === "number" || t === "boolean" || t === "bigint") { out.params.push(chunk); return; }
        if (Array.isArray(chunk)) { for (const c of chunk) walk(c, depth + 1); return; }
        if (t !== "object") return;
        if (Array.isArray((chunk as any).value) && typeof (chunk as any).value[0] === "string") {
          out.text += (chunk as any).value.join("");
          return;
        }
        if ("value" in chunk) { out.params.push((chunk as any).value); return; }
        if ((chunk as any).queryChunks) walk((chunk as any).queryChunks, depth + 1);
      };
      try { walk(q?.queryChunks ?? q, 0); } catch { /* opaque query shape — text stays empty */ }
      return out;
    };
    const execute = vi.fn(async (q: any) => {
      const d = describeQuery(q);
      queries.push(d);
      if (/FROM\s+autopilot_actions/i.test(d.text)) {
        return { rows: actionRow ? [structuredClone(actionRow)] : [] };
      }
      return { rows: [] };
    });
    return { execute, queries };
  }

  const USER_CTX = { user: { id: 5 } };

  /** A real-looking pending action with a resolvable metadata clientId. */
  const ACTION_ROW = {
    metadata: JSON.stringify({
      clientId: 7,
      proposedAction: { taskType: "policy_review", priority: "high", dueInDays: 10 },
    }),
    title: "Policy stale",
    ai_rationale: "not reviewed for 400 days",
    priority: "high",
  };

  const callReview = async (db: ReturnType<typeof makeSentinelDb>, input: Record<string, unknown>) => {
    dbMocks.getDb.mockResolvedValue(db);
    return buildRouter().reviewSentinelAction.handler({
      input: buildRouter().reviewSentinelAction.schema.parse(input),
      ctx: USER_CTX,
    });
  };

  it("approve on a nonexistent action id throws NOT_FOUND 'Sentinel action not found' and writes nothing", async () => {
    const db = makeSentinelDb(null);
    const call = callReview(db, { clientId: 1, actionId: 999, decision: "approved" });
    await expect(call).rejects.toBeInstanceOf(TRPCError);
    await expect(call).rejects.toMatchObject({ code: "NOT_FOUND", message: "Sentinel action not found" });
    expect(db.execute).toHaveBeenCalledTimes(1); // only the lookup ran
    expect(db.queries.every(q => !/INSERT\s+INTO\s+work_items/i.test(q.text))).toBe(true);
  });

  it("reject on a nonexistent action id ALSO throws NOT_FOUND instead of returning ghost success", async () => {
    const db = makeSentinelDb(null);
    const call = callReview(db, { clientId: 1, actionId: 999, decision: "rejected" });
    await expect(call).rejects.toBeInstanceOf(TRPCError);
    await expect(call).rejects.toMatchObject({ code: "NOT_FOUND", message: "Sentinel action not found" });
    expect(db.execute).toHaveBeenCalledTimes(1); // no status UPDATE either
  });

  it("approve without any resolvable clientId throws BAD_REQUEST and never inserts into work_items", async () => {
    const db = makeSentinelDb(
      structuredClone({ ...ACTION_ROW, metadata: JSON.stringify({ proposedAction: { taskType: "review" } }) })
    );
    const call = callReview(db, { actionId: 11, decision: "approved" }); // no input.clientId either
    await expect(call).rejects.toBeInstanceOf(TRPCError);
    await expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(call).rejects.toMatchObject({ message: /clientId/i });
    expect(db.execute).toHaveBeenCalledTimes(1); // lookup only — nothing written
    expect(db.queries.every(q => !/INSERT\s+INTO\s+work_items/i.test(q.text))).toBe(true);
  });

  it("approve with a non-positive resolvable clientId (metadata or input) throws BAD_REQUEST and never inserts into work_items", async () => {
    const cases: Array<[Record<string, unknown>, Record<string, unknown>]> = [
      [{ ...ACTION_ROW, metadata: JSON.stringify({ clientId: 0 }) }, { actionId: 12, decision: "approved" }],
      [{ ...ACTION_ROW, metadata: JSON.stringify({ clientId: -5 }) }, { actionId: 12, decision: "approved" }],
      [{ ...ACTION_ROW, metadata: JSON.stringify({}) }, { actionId: 12, decision: "approved", clientId: 0 }],
      [{ ...ACTION_ROW, metadata: JSON.stringify({}) }, { actionId: 12, decision: "approved", clientId: -1 }],
    ];
    for (const [row, input] of cases) {
      const db = makeSentinelDb(structuredClone(row));
      const call = callReview(db, input);
      await expect(call, JSON.stringify(input)).rejects.toBeInstanceOf(TRPCError);
      await expect(call, JSON.stringify(input)).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(db.execute, JSON.stringify(input)).toHaveBeenCalledTimes(1); // lookup only
      expect(db.queries.every(q => !/INSERT\s+INTO\s+work_items/i.test(q.text)), JSON.stringify(input)).toBe(true);
    }
  });

  it("reject needs no clientId: valid action rejects cleanly with the unchanged success shape", async () => {
    const db = makeSentinelDb(structuredClone({ ...ACTION_ROW, metadata: "{}" }));
    const result = await callReview(db, { actionId: 11, decision: "rejected" }); // no clientId anywhere
    expect(result).toEqual({ success: true, executed: false });
    expect(db.execute).toHaveBeenCalledTimes(2); // lookup + status update
    expect(db.queries[1].text).toMatch(/status\s*=\s*'rejected'/);
    expect(db.queries.every(q => !/INSERT\s+INTO\s+work_items/i.test(q.text))).toBe(true);
  });

  it("approve with valid metadata.clientId executes: unchanged shape, insert carries the METADATA clientId over the request's", async () => {
    const db = makeSentinelDb(structuredClone(ACTION_ROW)); // metadata.clientId === 7
    const result = await callReview(db, { clientId: 9, actionId: 11, decision: "approved" }); // input says 9
    expect(result).toEqual({ success: true, executed: true });

    const insert = db.queries.find(q => /INSERT\s+INTO\s+work_items/i.test(q.text));
    expect(insert, "a work_items INSERT must run").toBeDefined();
    expect(insert!.params[0]).toBe(7); // metadata.clientId wins over input.clientId

    const markExecuted = db.queries[db.queries.length - 1];
    expect(markExecuted.text).toMatch(/status\s*=\s*'executed'/);
    expect(db.execute).toHaveBeenCalledTimes(3); // lookup + INSERT + mark-executed UPDATE
  });

  it("approve falls back to input.clientId when the action metadata has none", async () => {
    const db = makeSentinelDb(structuredClone({ ...ACTION_ROW, metadata: "{}" }));
    const result = await callReview(db, { clientId: 9, actionId: 11, decision: "approved" });
    expect(result).toEqual({ success: true, executed: true });

    const insert = db.queries.find(q => /INSERT\s+INTO\s+work_items/i.test(q.text));
    expect(insert, "a work_items INSERT must run").toBeDefined();
    expect(insert!.params[0]).toBe(9); // fell back to the request clientId
  });

  describe("proactive Action Center endpoints", () => {
    it("getStats returns aggregated counts and schedule cadence", async () => {
      const countsRow = {
        totalPending: "5",
        criticalCount: "2",
        warningCount: "3",
        executedCount: "10",
        rejectedCount: "1",
      };
      const cfgRow = {
        schedule: "1h",
        lastRunAt: new Date("2026-09-18T10:00:00Z"),
      };

      const db = {
        execute: vi.fn()
          .mockResolvedValueOnce({ rows: [countsRow] })
          .mockResolvedValueOnce({ rows: [cfgRow] }),
      };
      dbMocks.getDb.mockResolvedValue(db);

      const router = buildRouter();
      const stats = await router.getStats.handler({
        input: { clientId: 42 },
        ctx: { user: { id: 1, role: "admin" } },
      });

      expect(stats).toEqual({
        totalPending: 5,
        criticalCount: 2,
        warningCount: 3,
        executedCount: 10,
        rejectedCount: 1,
        cadence: "1h",
        lastRunAt: expect.any(Date),
      });
    });

    it("updateCadence updates the client schedule cadence", async () => {
      const db = {
        execute: vi.fn().mockResolvedValue({ rows: [] }),
      };
      dbMocks.getDb.mockResolvedValue(db);

      const router = buildRouter();
      const res = await router.updateCadence.handler({
        input: { clientId: 42, schedule: "30m" },
        ctx: { user: { id: 1, role: "admin" } },
      });

      expect(res).toEqual({ success: true, schedule: "30m" });
      expect(db.execute).toHaveBeenCalled();
    });

    it("batchReviewActions updates multiple actions at once", async () => {
      const db = {
        execute: vi.fn().mockResolvedValue({ rows: [] }),
      };
      dbMocks.getDb.mockResolvedValue(db);

      const router = buildRouter();
      const res = await router.batchReviewActions.handler({
        input: { clientId: 42, actionIds: [101, 102, 103], decision: "approved" },
        ctx: { user: { id: 1, role: "admin" } },
      });

      expect(res).toEqual({ success: true, processed: 3 });
      expect(db.execute).toHaveBeenCalled();
    });
  });
});
