import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZodError } from "zod";
import { TRPCError } from "@trpc/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Company Memory Cortex router (server/routers/memoryRouter.ts) — contract
 * tests (QA cycle 31).
 *
 * Mirrors vulnerabilityMgmtRouter.test.ts / incidentClassifierRouter.test.ts:
 * the router is a factory `createMemoryRouter(t, procedure)` registered as
 * `memory:` on the AppRouter (see src/routers.ts:
 * `memory: createMemoryRouter(t, protectedProcedure)`). It is tested here
 * with a tiny fake tRPC builder — no tRPC server, NO DB.
 *
 * The engine layer (lib/memory/vfsMemoryEngine.ts + vfsSyncBridge.ts) is
 * fully mocked: the router's only jobs are (a) zod input validation,
 * (b) deriving clientId from ctx and delegating the fallback to the engine,
 * (c) wiring queries vs mutations. All three are asserted below.
 *
 * Contract under test — twelve procedures:
 *   queries:   getTree, getNode, listDirectory, search,
 *              getKnowledgeGraph, getCortexSnapshot (input-less)
 *   mutations: writeNode, deleteNode, extractFacts, ingestWeb,
 *              syncAppData, bootstrapDefaults
 *
 * Hardening contract:
 *   - unauthenticated callers are rejected (fake mirrors the real
 *     protectedProcedure/isAuthed middleware: TRPCError UNAUTHORIZED);
 *   - type-mismatched input is rejected with TRPCError BAD_REQUEST (zod) —
 *     never a raw crash inside the handler;
 *   - valid input is forwarded to the engine untouched (post-parse defaults
 *     applied: search limit -> 10, listDirectory path -> "/", extractFacts
 *     source -> "user_input");
 *   - getNode maps a falsy engine result to TRPCError NOT_FOUND;
 *   - the router never touches the DB itself (behavioural via the db mock
 *     AND a source-text scan for db imports).
 *
 * NOTE (QA flag): the router derives clientId as `ctx.user?.clientId || 1`
 * (falsy-or, not nullish ??) — a caller authenticated with clientId === 0 is
 * silently coerced to client 1. Documented in
 * "clientId fallback — QA flag" below; behaviour asserted matches the
 * implementation.
 */

const engineMocks = vi.hoisted(() => ({
  bootstrapDefaultVfsTree: vi.fn(),
  getVfsTree: vi.fn(),
  listDirectory: vi.fn(),
  readNode: vi.fn(),
  writeNode: vi.fn(),
  deleteNode: vi.fn(),
  searchMemory: vi.fn(),
  extractAndSaveFacts: vi.fn(),
  ingestWebIntel: vi.fn(),
}));

const bridgeMocks = vi.hoisted(() => ({
  syncAllAppDataToVfs: vi.fn(),
}));

const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

// The router never touches these modules' internals — both are stubbed so the
// suite proves the router is a thin validation/delegation layer.
vi.mock("../memory/vfsMemoryEngine", () => ({ vfsMemoryEngine: engineMocks }));
vi.mock("../memory/vfsSyncBridge", () => ({ vfsSyncBridge: bridgeMocks }));
// Same `src/db` mock as the sibling router tests — asserts the router itself
// never reaches the database (the engine does).
vi.mock("../../db", () => ({ getDb: dbMocks.getDb }));

import { createMemoryRouter } from "../../server/routers/memoryRouter";

/**
 * Minimal fake tRPC builder mirroring the real `protectedProcedure`
 * (`isAuthed` middleware + tRPC zod parsing layer):
 *   - attaches the input schema to each route (router.<route>.schema);
 *   - enforces an auth gate (TRPCError UNAUTHORIZED without ctx.user);
 *   - parses input through the attached zod schema and surfaces ZodError as
 *     TRPCError BAD_REQUEST.
 *
 * `procedure.input(schema)` returns a NEW chain (like real tRPC builders), so
 * routes defined without `.input(...)` (syncAppData, bootstrapDefaults) never
 * inherit a previous route's schema.
 */
function buildFakeTRPC() {
  const terminal = (type: "query" | "mutation", handler: any, schema: unknown) => {
    const wrapped = async ({ input, ctx }: { input?: unknown; ctx?: any }) => {
      if (!ctx?.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required. Please sign in.",
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
    return { type, handler: wrapped, schema };
  };

  const procedure: any = {
    input: (schema: unknown) => ({
      query: (handler: any) => terminal("query", handler, schema),
      mutation: (handler: any) => terminal("mutation", handler, schema),
    }),
    query: (handler: any) => terminal("query", handler, undefined),
    mutation: (handler: any) => terminal("mutation", handler, undefined),
  };
  const t: any = { router: (routes: any) => routes };
  const router = createMemoryRouter(t, procedure);
  return { router };
}

beforeEach(() => {
  for (const fn of Object.values(engineMocks)) fn.mockReset();
  for (const fn of Object.values(bridgeMocks)) fn.mockReset();
  dbMocks.getDb.mockReset();
});

const QUERIES = ["getTree", "getNode", "listDirectory", "search"] as const;
// Input-less queries added with the knowledge-graph/cortex-snapshot surface:
// registered like QUERIES but without an .input() schema to assert.
const INPUTLESS_QUERIES = ["getKnowledgeGraph", "getCortexSnapshot"] as const;
const MUTATIONS = [
  "writeNode",
  "deleteNode",
  "extractFacts",
  "ingestWeb",
  "syncAppData",
  "bootstrapDefaults",
] as const;

describe("memoryRouter — route shape", () => {
  it("exposes exactly the twelve documented procedures", () => {
    const { router } = buildFakeTRPC();
    expect(Object.keys(router).sort()).toEqual(
      [...QUERIES, ...INPUTLESS_QUERIES, ...MUTATIONS].sort()
    );
  });

  it("registers getKnowledgeGraph / getCortexSnapshot as input-less queries", () => {
    const { router } = buildFakeTRPC();
    for (const name of INPUTLESS_QUERIES) {
      expect(router[name], `route "${name}"`).toBeDefined();
      expect(typeof router[name].handler, `route "${name}" handler`).toBe("function");
      expect(router[name].type, `route "${name}" type`).toBe("query");
    }
  });

  it("registers getTree / getNode / listDirectory / search as queries", () => {
    const { router } = buildFakeTRPC();
    for (const name of QUERIES) {
      expect(router[name], `route "${name}"`).toBeDefined();
      expect(typeof router[name].handler, `route "${name}" handler`).toBe("function");
      expect(router[name].type, `route "${name}" type`).toBe("query");
      expect(router[name].schema, `route "${name}" schema`).toBeDefined();
    }
  });

  it("registers writeNode / deleteNode / extractFacts / ingestWeb / syncAppData / bootstrapDefaults as mutations", () => {
    const { router } = buildFakeTRPC();
    for (const name of MUTATIONS) {
      expect(router[name], `route "${name}"`).toBeDefined();
      expect(typeof router[name].handler, `route "${name}" handler`).toBe("function");
      expect(router[name].type, `route "${name}" type`).toBe("mutation");
    }
    expect(Object.keys(router).filter((n) => router[n].type === "mutation").sort()).toEqual(
      [...MUTATIONS].sort()
    );
  });

  it("input-less mutations (syncAppData, bootstrapDefaults) carry no inherited schema", () => {
    const { router } = buildFakeTRPC();
    // They are declared after ingestWeb in the factory; a naive shared-state
    // harness would leak ingestWeb's schema onto them.
    expect(router.syncAppData.schema).toBeUndefined();
    expect(router.bootstrapDefaults.schema).toBeUndefined();
  });

  it("rejects unauthenticated callers with UNAUTHORIZED on every route", async () => {
    const { router } = buildFakeTRPC();
    for (const name of Object.keys(router)) {
      const call = router[name].handler({ input: {}, ctx: {} });
      await expect(call, `route "${name}"`).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    }
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });
});

describe("memoryRouter — zod input validation (BAD_REQUEST, never a raw crash)", () => {
  it("getNode requires a path string", () => {
    const { router } = buildFakeTRPC();
    const schema = router.getNode.schema;
    expect(() => schema.parse({})).toThrow(ZodError);
    expect(() => schema.parse({ path: 42 })).toThrow(ZodError);
    expect(() => schema.parse({ path: null })).toThrow(ZodError);
    expect(schema.parse({ path: "/policies" }).path).toBe("/policies");

    const call = router.getNode.handler({ input: { path: 42 }, ctx: { user: { id: 1 } } });
    return expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("writeNode requires path + title; nodeType is a closed enum", () => {
    const { router } = buildFakeTRPC();
    const schema = router.writeNode.schema;
    expect(() => schema.parse({ path: "/x" })).toThrow(ZodError); // title missing
    expect(() => schema.parse({ title: "X" })).toThrow(ZodError); // path missing
    expect(() => schema.parse({ path: "/x", title: 9 })).toThrow(ZodError);
    expect(() => schema.parse({ path: "/x", title: "X", nodeType: "bogus" })).toThrow(ZodError);
    expect(() => schema.parse({ path: "/x", title: "X", metadata: "nope" })).toThrow(ZodError);
    // valid: minimal + full enum values
    expect(schema.parse({ path: "/x", title: "X" }).path).toBe("/x");
    for (const nt of ["folder", "document", "fact", "web_intel", "asset_profile"]) {
      expect(schema.parse({ path: "/x", title: "X", nodeType: nt }).nodeType).toBe(nt);
    }

    const call = router.writeNode.handler({ input: { path: "/x" }, ctx: { user: { id: 1 } } });
    return expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("ingestWeb requires url + title + content; url must be a well-formed URL", () => {
    const { router } = buildFakeTRPC();
    const schema = router.ingestWeb.schema;
    const valid = { url: "https://example.com/a", title: "T", content: "C" };
    expect(() => schema.parse({ title: "T", content: "C" })).toThrow(ZodError); // url missing
    expect(() => schema.parse({ ...valid, url: "not-a-url" })).toThrow(ZodError);
    expect(() => schema.parse({ url: "https://example.com/a", content: "C" })).toThrow(ZodError);
    expect(() => schema.parse({ url: "https://example.com/a", title: "T" })).toThrow(ZodError);
    expect(() => schema.parse({ ...valid, frameworks: "soc2" })).toThrow(ZodError); // must be array
    expect(schema.parse(valid)).toBeDefined();

    const call = router.ingestWeb.handler({
      input: { url: "nope", title: "T", content: "C" },
      ctx: { user: { id: 1 } },
    });
    return expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("search limit is int-bounded [1..50] and defaults to 10; query is required", () => {
    const { router } = buildFakeTRPC();
    const schema = router.search.schema;
    expect(schema.parse({ query: "q" }).limit).toBe(10); // default applied
    expect(schema.parse({ query: "q", limit: 1 }).limit).toBe(1);
    expect(schema.parse({ query: "q", limit: 50 }).limit).toBe(50);
    expect(() => schema.parse({ query: "q", limit: 0 })).toThrow(ZodError);
    expect(() => schema.parse({ query: "q", limit: -1 })).toThrow(ZodError);
    expect(() => schema.parse({ query: "q", limit: 51 })).toThrow(ZodError);
    expect(() => schema.parse({ query: "q", limit: "10" })).toThrow(ZodError);
    expect(() => schema.parse({ limit: 10 })).toThrow(ZodError); // query missing

    const call = router.search.handler({
      input: { query: "q", limit: 51 },
      ctx: { user: { id: 1 } },
    });
    return expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("extractFacts requires text and defaults source to 'user_input'", () => {
    const { router } = buildFakeTRPC();
    const schema = router.extractFacts.schema;
    expect(() => schema.parse({})).toThrow(ZodError);
    expect(() => schema.parse({ text: 42 })).toThrow(ZodError);
    expect(schema.parse({ text: "note" }).source).toBe("user_input");
    expect(schema.parse({ text: "note", source: "audit" }).source).toBe("audit");
  });

  it("deleteNode requires a path string", () => {
    const { router } = buildFakeTRPC();
    const schema = router.deleteNode.schema;
    expect(() => schema.parse({})).toThrow(ZodError);
    expect(() => schema.parse({ path: 7 })).toThrow(ZodError);
    expect(schema.parse({ path: "/x" }).path).toBe("/x");
  });

  it("getTree takes an entirely optional body; listDirectory defaults path to '/'", () => {
    const { router } = buildFakeTRPC();
    expect(router.getTree.schema.parse(undefined)).toBeUndefined();
    expect(router.getTree.schema.parse({})).toEqual({});
    expect(router.getTree.schema.parse({ rootPath: "/policies" }).rootPath).toBe("/policies");
    expect(() => router.getTree.schema.parse(42)).toThrow(ZodError);

    expect(router.listDirectory.schema.parse({}).path).toBe("/");
    expect(router.listDirectory.schema.parse({ path: "/facts" }).path).toBe("/facts");
    expect(() => router.listDirectory.schema.parse({ path: 3 })).toThrow(ZodError);
  });
});

describe("memoryRouter — delegation & forwarding", () => {
  it("getTree bootstraps the baseline tree then returns the engine tree", async () => {
    const { router } = buildFakeTRPC();
    engineMocks.bootstrapDefaultVfsTree.mockResolvedValue(undefined);
    engineMocks.getVfsTree.mockResolvedValue([{ id: 1, path: "/company", children: [] }]);

    const result = await router.getTree.handler({
      input: { rootPath: "/company" },
      ctx: { user: { id: 1, clientId: 7 } },
    });

    expect(result).toEqual([{ id: 1, path: "/company", children: [] }]);
    expect(engineMocks.bootstrapDefaultVfsTree).toHaveBeenCalledWith(7);
    expect(engineMocks.getVfsTree).toHaveBeenCalledWith(7, "/company");
  });

  it("getTree falls back to root '/' when rootPath is omitted", async () => {
    const { router } = buildFakeTRPC();
    engineMocks.bootstrapDefaultVfsTree.mockResolvedValue(undefined);
    engineMocks.getVfsTree.mockResolvedValue([]);

    await router.getTree.handler({ ctx: { user: { id: 1 } } });

    expect(engineMocks.getVfsTree).toHaveBeenCalledWith(1, "/");
  });

  it("listDirectory forwards the (defaulted) path", async () => {
    const { router } = buildFakeTRPC();
    engineMocks.listDirectory.mockResolvedValue([]);

    await router.listDirectory.handler({ input: { path: "/facts" }, ctx: { user: { id: 1 } } });
    expect(engineMocks.listDirectory).toHaveBeenLastCalledWith(1, "/facts");

    await router.listDirectory.handler({ input: {}, ctx: { user: { id: 1 } } });
    expect(engineMocks.listDirectory).toHaveBeenLastCalledWith(1, "/");
  });

  it("getNode maps a falsy engine result to NOT_FOUND (message names the path)", async () => {
    const { router } = buildFakeTRPC();
    engineMocks.readNode.mockResolvedValue(null);

    const call = router.getNode.handler({
      input: { path: "/ghost.md" },
      ctx: { user: { id: 1 } },
    });
    await expect(call).rejects.toBeInstanceOf(TRPCError);
    await expect(call).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(call).rejects.toMatchObject({ message: expect.stringContaining("/ghost.md") });
  });

  it("getNode returns the engine payload verbatim when found", async () => {
    const { router } = buildFakeTRPC();
    const payload = { node: { id: 3, path: "/policies/soc2.md" }, relations: [] };
    engineMocks.readNode.mockResolvedValue(payload);

    const result = await router.getNode.handler({
      input: { path: "/policies/soc2.md" },
      ctx: { user: { id: 1, clientId: 5 } },
    });
    expect(result).toBe(payload);
    expect(engineMocks.readNode).toHaveBeenCalledWith(5, "/policies/soc2.md");
  });

  it("writeNode / deleteNode / extractFacts / ingestWeb forward parsed input to the engine", async () => {
    const { router } = buildFakeTRPC();
    engineMocks.writeNode.mockResolvedValue({ id: 1 });
    engineMocks.deleteNode.mockResolvedValue({ deletedCount: 2 });
    engineMocks.extractAndSaveFacts.mockResolvedValue({ savedCount: 1, facts: ["f"] });
    engineMocks.ingestWebIntel.mockResolvedValue({ id: 9 });

    const writeInput = { path: "/x/y.md", title: "Y", metadata: { a: 1 } };
    await router.writeNode.handler({ input: writeInput, ctx: { user: { id: 1 } } });
    expect(engineMocks.writeNode).toHaveBeenCalledWith(
      1,
      expect.objectContaining(writeInput)
    );

    await router.deleteNode.handler({ input: { path: "/x" }, ctx: { user: { id: 1 } } });
    expect(engineMocks.deleteNode).toHaveBeenCalledWith(1, "/x");

    await router.extractFacts.handler({ input: { text: "some audit prose" }, ctx: { user: { id: 1 } } });
    expect(engineMocks.extractAndSaveFacts).toHaveBeenCalledWith(1, "some audit prose", "user_input");

    const webInput = {
      url: "https://example.com/nis2",
      title: "NIS2",
      content: "body",
      frameworks: ["NIS2"],
    };
    await router.ingestWeb.handler({ input: webInput, ctx: { user: { id: 1 } } });
    expect(engineMocks.ingestWebIntel).toHaveBeenCalledWith(1, webInput);

    // returned payloads pass through untouched
    const del = await router.deleteNode.handler({ input: { path: "/x" }, ctx: { user: { id: 1 } } });
    expect(del).toEqual({ deletedCount: 2 });
  });

  it("search forwards query + optional filters and applies the limit default", async () => {
    const { router } = buildFakeTRPC();
    engineMocks.searchMemory.mockResolvedValue([]);
    const ctx = { user: { id: 1 } };

    await router.search.handler({ input: { query: "aws" }, ctx });
    expect(engineMocks.searchMemory).toHaveBeenLastCalledWith(1, "aws", {
      pathPrefix: undefined,
      nodeType: undefined,
      limit: 10,
    });

    await router.search.handler({
      input: { query: "aws", pathPrefix: "/infrastructure", nodeType: "document", limit: 25 },
      ctx,
    });
    expect(engineMocks.searchMemory).toHaveBeenLastCalledWith(1, "aws", {
      pathPrefix: "/infrastructure",
      nodeType: "document",
      limit: 25,
    });
  });

  it("syncAppData delegates to vfsSyncBridge.syncAllAppDataToVfs", async () => {
    const { router } = buildFakeTRPC();
    bridgeMocks.syncAllAppDataToVfs.mockResolvedValue({ synced: 11 });

    const result = await router.syncAppData.handler({ ctx: { user: { id: 1, clientId: 3 } } });

    expect(result).toEqual({ synced: 11 });
    expect(bridgeMocks.syncAllAppDataToVfs).toHaveBeenCalledTimes(1);
    expect(bridgeMocks.syncAllAppDataToVfs).toHaveBeenCalledWith(3);
    expect(engineMocks.writeNode).not.toHaveBeenCalled();
  });

  it("bootstrapDefaults re-seeds via the engine and reports success", async () => {
    const { router } = buildFakeTRPC();
    engineMocks.bootstrapDefaultVfsTree.mockResolvedValue(undefined);

    const result = await router.bootstrapDefaults.handler({ ctx: { user: { id: 1 } } });

    expect(result).toEqual({ success: true });
    expect(engineMocks.bootstrapDefaultVfsTree).toHaveBeenCalledTimes(1);
    expect(engineMocks.bootstrapDefaultVfsTree).toHaveBeenCalledWith(1);
  });
});

describe("memoryRouter — clientId derivation delegated to the engine", () => {
  it("passes ctx.user.clientId through to the engine on every route", async () => {
    const { router } = buildFakeTRPC();
    for (const fn of Object.values(engineMocks)) fn.mockResolvedValue({ ok: true });
    bridgeMocks.syncAllAppDataToVfs.mockResolvedValue({});
    const ctx = { user: { id: 9, clientId: 42 } };

    await router.getTree.handler({ input: {}, ctx });
    await router.getNode.handler({ input: { path: "/p" }, ctx });
    await router.listDirectory.handler({ input: {}, ctx });
    await router.search.handler({ input: { query: "q" }, ctx });
    await router.writeNode.handler({ input: { path: "/p", title: "P" }, ctx });
    await router.deleteNode.handler({ input: { path: "/p" }, ctx });
    await router.extractFacts.handler({ input: { text: "text for fact extraction!" }, ctx });
    await router.ingestWeb.handler({ input: { url: "https://e.com/x", title: "T", content: "C" }, ctx });
    await router.syncAppData.handler({ ctx });
    await router.bootstrapDefaults.handler({ ctx });

    expect(engineMocks.bootstrapDefaultVfsTree).toHaveBeenCalledWith(42);
    expect(engineMocks.readNode).toHaveBeenCalledWith(42, "/p");
    expect(engineMocks.listDirectory).toHaveBeenCalledWith(42, "/");
    expect(engineMocks.searchMemory).toHaveBeenCalledWith(42, "q", expect.anything());
    expect(engineMocks.writeNode).toHaveBeenCalledWith(42, expect.objectContaining({ path: "/p" }));
    expect(engineMocks.deleteNode).toHaveBeenCalledWith(42, "/p");
    expect(engineMocks.extractAndSaveFacts).toHaveBeenCalledWith(42, expect.any(String), expect.any(String));
    expect(engineMocks.ingestWebIntel).toHaveBeenCalledWith(42, expect.objectContaining({ url: "https://e.com/x" }));
    expect(bridgeMocks.syncAllAppDataToVfs).toHaveBeenCalledWith(42);
  });

  it("falls back to clientId 1 when the session user carries no clientId", async () => {
    const { router } = buildFakeTRPC();
    for (const fn of Object.values(engineMocks)) fn.mockResolvedValue({ ok: true });
    bridgeMocks.syncAllAppDataToVfs.mockResolvedValue({});
    const ctx = { user: { id: 9 } }; // authenticated, no clientId claim

    await router.getTree.handler({ input: {}, ctx });
    await router.getNode.handler({ input: { path: "/p" }, ctx });
    await router.listDirectory.handler({ input: {}, ctx });
    await router.search.handler({ input: { query: "q" }, ctx });
    await router.writeNode.handler({ input: { path: "/p", title: "P" }, ctx });
    await router.deleteNode.handler({ input: { path: "/p" }, ctx });
    await router.extractFacts.handler({ input: { text: "enough text for a fact!!!" }, ctx });
    await router.ingestWeb.handler({ input: { url: "https://e.com/x", title: "T", content: "C" }, ctx });
    await router.syncAppData.handler({ ctx });
    await router.bootstrapDefaults.handler({ ctx });

    expect(engineMocks.bootstrapDefaultVfsTree).toHaveBeenLastCalledWith(1);
    expect(engineMocks.readNode).toHaveBeenLastCalledWith(1, "/p");
    expect(engineMocks.listDirectory).toHaveBeenLastCalledWith(1, "/");
    expect(engineMocks.searchMemory).toHaveBeenLastCalledWith(1, "q", expect.anything());
    expect(engineMocks.writeNode).toHaveBeenLastCalledWith(1, expect.anything());
    expect(engineMocks.deleteNode).toHaveBeenLastCalledWith(1, "/p");
    expect(engineMocks.extractAndSaveFacts).toHaveBeenLastCalledWith(1, expect.any(String), expect.any(String));
    expect(engineMocks.ingestWebIntel).toHaveBeenLastCalledWith(1, expect.anything());
    expect(bridgeMocks.syncAllAppDataToVfs).toHaveBeenLastCalledWith(1);
  });

  // QA FLAG: the implementation uses `ctx.user?.clientId || 1` (falsy-or).
  // Under a nullish-coalescing contract (`?? 1`) clientId 0 would stay 0;
  // here it is silently coerced to client 1. Recorded so a future switch to
  // `??` flips this test intentionally.
  it("QA flag: clientId 0 is coerced to the fallback 1 (|| semantics, not ??)", async () => {
    const { router } = buildFakeTRPC();
    engineMocks.listDirectory.mockResolvedValue([]);

    await router.listDirectory.handler({ input: {}, ctx: { user: { id: 1, clientId: 0 } } });

    expect(engineMocks.listDirectory).toHaveBeenCalledWith(1, "/");
  });
});

describe("memoryRouter — no-db guarantee", () => {
  it("never calls getDb during routing (engine owns persistence)", async () => {
    const { router } = buildFakeTRPC();
    for (const fn of Object.values(engineMocks)) fn.mockResolvedValue({ ok: true });
    bridgeMocks.syncAllAppDataToVfs.mockResolvedValue({});
    const ctx = { user: { id: 1, clientId: 2 } };

    await router.getTree.handler({ input: {}, ctx });
    await router.getNode.handler({ input: { path: "/p" }, ctx });
    await router.listDirectory.handler({ input: {}, ctx });
    await router.search.handler({ input: { query: "q" }, ctx });
    await router.writeNode.handler({ input: { path: "/p", title: "P" }, ctx });
    await router.deleteNode.handler({ input: { path: "/p" }, ctx });
    await router.extractFacts.handler({ input: { text: "text longer than fifteen chars" }, ctx });
    await router.ingestWeb.handler({ input: { url: "https://e.com/x", title: "T", content: "C" }, ctx });
    await router.syncAppData.handler({ ctx });
    await router.bootstrapDefaults.handler({ ctx });

    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });

  it("the router source has no imports from any db module", () => {
    const source = readFileSync(
      join(process.cwd(), "packages/core/src/server/routers/memoryRouter.ts"),
      "utf8"
    );
    expect(source).not.toMatch(/from\s+["'][^"']*\/db["']/);
    expect(source).not.toContain("src/db");
  });
});
