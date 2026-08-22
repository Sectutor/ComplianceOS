import { describe, it, expect, beforeEach, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

vi.mock("../../db", () => ({ getDb: dbMocks.getDb }));

// The live schema module MUST be mocked alongside ../../db (established repo
// pattern, cf. dashboardStats.test.ts / controlAutoTestEngine.test.ts).
// Importing the real schema while only ../../db is mocked leaves the engine's
// mocked getDb binding broken under vitest's SSR module graph (every method
// then fails with "db.select/.execute is not a function").
vi.mock("../../schema", () => ({
  companyMemoryNodes: {
    id: "cmn.id",
    clientId: "cmn.clientId",
    path: "cmn.path",
    parentPath: "cmn.parentPath",
    nodeType: "cmn.nodeType",
    title: "cmn.title",
    summaryL0: "cmn.summaryL0",
    contentL2: "cmn.contentL2",
    metadata: "cmn.metadata",
    isActive: "cmn.isActive",
    createdAt: "cmn.createdAt",
    updatedAt: "cmn.updatedAt",
  },
  companyMemoryRelations: {
    id: "cmr.id",
    clientId: "cmr.clientId",
    sourceNodeId: "cmr.sourceNodeId",
    targetNodeId: "cmr.targetNodeId",
    relationType: "cmr.relationType",
    description: "cmr.description",
    createdAt: "cmr.createdAt",
  },
}));

// NOTE: SUT imported AFTER the vi.mock calls (matches the established sibling
// pattern, e.g. dashboardStats.test.ts) so the engine's `../../db` binding
// resolves to the mock.
import { VfsMemoryEngine } from "../memory/vfsMemoryEngine";

/**
 * VfsMemoryEngine — DB-backed method coverage (QA cycle 31).
 *
 * Companion to vfsMemoryEngine.test.ts (which covers the pure helpers:
 * normalizePath / getParentPath / generateL0Summary and the fact/web-intel
 * extraction logic via writeNode spies). This file focuses on the clearly
 * untested exported surface that talks to drizzle: ensureTables (success +
 * idempotence + failure-swallow), listDirectory, readNode, writeNode,
 * deleteNode, getVfsTree, searchMemory and bootstrapDefaultVfsTree.
 *
 * The db is fully mocked with a minimal chainable drizzle stub (same spirit
 * as frameworkSeed.test.ts). Await styles used by the current engine:
 *   - bare-awaited terminators:  .where(...) (readNode relations),
 *     .orderBy(...) / .limit(...) / .returning(...)
 *   - chained terminators:       .where(...).orderBy/.limit/.returning(...)
 *
 * IMPLEMENTATION NOTE (conductor, cycle 31): the whole chain must NOT be a
 * thenable. A previous revision put `.then` on the chain itself; because
 * `getDb` resolves WITH the chain, promise adoption unwrapped it one level
 * too far and every method received the RESULT ARRAY instead of the db
 * ("db.select/.execute is not a function"). Awaitability therefore lives on
 * the object returned by `where` (and on the terminal helpers), never on the
 * shared chain.
 */

/**
 * NOTE (QA observation, cycle 31): bootstrapDefaultVfsTree's idempotence
 * check runs against the LIVE db through listDirectory; under this mock the
 * auto-created parent folders are re-inserted on every seeded write because
 * nothing persists between mocked selects. Assertions therefore target the
 * set of canonical seeded paths, not exact insert counts.
 */

/** Minimal chainable drizzle stub with a FIFO of result sets. */
function makeDb(results: any[][] = []) {
  const queue = [...results];
  const take = () => (queue.length ? queue.shift() : []);
  const chain: any = {};
  for (const m of ["select", "from", "innerJoin", "on", "insert", "values", "update", "set", "delete"]) {
    chain[m] = vi.fn(() => chain);
  }
  // `where` ends most engine chains with a bare `await`, but must still chain
  // into orderBy/limit/returning for the other call shapes (listDirectory,
  // writeNode update, deleteNode). Each terminator consumes exactly one
  // queued result set.
  const terminator = () => {
    const t: any = {};
    t.orderBy = vi.fn(() => Promise.resolve(take()));
    t.limit = vi.fn(() => Promise.resolve(take()));
    t.returning = vi.fn(() => Promise.resolve(take()));
    t.then = (resolve: any, reject: any) => Promise.resolve(take()).then(resolve, reject);
    return t;
  };
  chain.where = vi.fn(() => terminator());
  // Safety nets for direct terminal calls (not used by the current engine).
  chain.orderBy = vi.fn(() => Promise.resolve(take()));
  chain.limit = vi.fn(() => Promise.resolve(take()));
  chain.returning = vi.fn(() => Promise.resolve(take()));
  chain.execute = vi.fn(async () => undefined);
  return chain;
}

let currentDb: ReturnType<typeof makeDb>;
const insertedValues = () =>
  currentDb.values.mock.calls.map((args: any[]) => (Array.isArray(args[0]) ? args[0][0] : args[0]));
const updatedSets = () => currentDb.set.mock.calls.map((args: any[]) => args[0]);

beforeEach(() => {
  currentDb = makeDb();
  dbMocks.getDb.mockReset();
  dbMocks.getDb.mockImplementation(async () => currentDb);
});

const NODE_ROW = (over: Partial<Record<string, any>> = {}) => ({
  id: 1,
  clientId: 1,
  path: "/policies",
  parentPath: "/",
  nodeType: "folder",
  title: "Policies",
  summaryL0: "Policy directory",
  contentL2: "",
  metadata: {},
  isActive: true,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-02-01T00:00:00Z"),
  ...over,
});

describe("VfsMemoryEngine.ensureTables", () => {
  it("executes the DDL exactly once even across repeated operations (idempotent)", async () => {
    const engine = new VfsMemoryEngine();
    await engine.listDirectory(1, "/");
    await engine.deleteNode(1, "/x");
    expect(currentDb.execute).toHaveBeenCalledTimes(1);
  });

  it("never throws when the db is unreachable — and retries DDL on the next operation", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const engine = new VfsMemoryEngine();
      dbMocks.getDb.mockRejectedValueOnce(new Error("ECONNREFUSED"));

      await expect(engine.ensureTables()).resolves.toBeUndefined();

      // failure leaves the engine uninitialized -> DDL is attempted again
      await engine.listDirectory(1, "/");
      expect(currentDb.execute).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });
});

describe("VfsMemoryEngine.listDirectory (mocked db)", () => {
  it("maps rows to VfsNodeSummary entries and synthesizes L0 summaries when missing", async () => {
    const engine = new VfsMemoryEngine();
    const updatedAt = new Date("2026-03-01T12:00:00Z");
    currentDb = makeDb([
      [
        NODE_ROW({ id: 10, path: "/policies/a.md", parentPath: "/policies", title: "A", summaryL0: null, updatedAt }),
        NODE_ROW({
          id: 11,
          path: "/policies/b.md",
          parentPath: "/policies",
          title: "B",
          summaryL0: "Stored L0",
          contentL2: "Body text",
        }),
      ],
    ]);
    dbMocks.getDb.mockImplementation(async () => currentDb);

    const out = await engine.listDirectory(3, "policies/");

    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ id: 10, path: "/policies/a.md", title: "A" });
    expect(out[0].summaryL0).toBe("A entry."); // generateL0Summary fallback
    expect(out[1].summaryL0).toBe("Stored L0"); // stored summary wins over content
    expect(out[0].updatedAt).toBe(updatedAt);
  });

  it("returns [] for an empty directory and never throws on degenerate paths", async () => {
    const engine = new VfsMemoryEngine();
    currentDb = makeDb([[]]);
    dbMocks.getDb.mockImplementation(async () => currentDb);

    expect(await engine.listDirectory(1, "")).toEqual([]);
    expect(await engine.listDirectory(1, "")).toEqual([]);
  });
});

describe("VfsMemoryEngine.readNode (mocked db)", () => {
  it("returns the node plus mapped relations (null description -> undefined)", async () => {
    const engine = new VfsMemoryEngine();
    const node = NODE_ROW({
      id: 7,
      path: "/company/profile.md",
      parentPath: "/company",
      nodeType: "document",
      title: "Profile",
    });
    currentDb = makeDb([
      [node],
      [
        { targetId: 9, targetPath: "/facts/f1", relationType: "supports", description: "evidence" },
        { targetId: 11, targetPath: "/facts/f2", relationType: "mentions", description: null },
      ],
    ]);
    dbMocks.getDb.mockImplementation(async () => currentDb);

    const out = await engine.readNode(1, "company/profile.md");

    expect(out).not.toBeNull();
    expect(out!.node.path).toBe("/company/profile.md");
    expect(out!.relations).toEqual([
      { targetId: 9, targetPath: "/facts/f1", relationType: "supports", description: "evidence" },
      { targetId: 11, targetPath: "/facts/f2", relationType: "mentions", description: undefined },
    ]);
  });

  it("returns null (not a throw) when the path does not exist", async () => {
    const engine = new VfsMemoryEngine();
    currentDb = makeDb([[]]);
    dbMocks.getDb.mockImplementation(async () => currentDb);

    expect(await engine.readNode(1, "/ghost")).toBeNull();
  });
});

describe("VfsMemoryEngine.writeNode (mocked db)", () => {
  it("inserts a new node with derived defaults (path normalization, document type, generated L0)", async () => {
    const engine = new VfsMemoryEngine();
    const saved = NODE_ROW({ id: 20 });
    // queue: parent-dir existence check -> none; leaf existing-check -> none;
    // insert returning -> [saved]  (engine auto-creates /notes before the leaf)
    currentDb = makeDb([[], [], [saved]]);
    dbMocks.getDb.mockImplementation(async () => currentDb);

    const out = await engine.writeNode(1, { path: "notes/hello.md", title: "Hello", contentL2: "World body" });

    expect(out).toBe(saved);
    const values = insertedValues();
    const value = values[values.length - 1]; // last insert = the leaf (first = auto-created /notes folder)
    expect(value).toMatchObject({
      clientId: 1,
      path: "/notes/hello.md",
      parentPath: "/notes",
      nodeType: "document",
      title: "Hello",
      summaryL0: "World body",
      isActive: true,
      metadata: {},
    });
    expect(currentDb.update).not.toHaveBeenCalled();
  });

  it("updates an existing node and merges metadata on top of the stored record", async () => {
    const engine = new VfsMemoryEngine();
    const existing = NODE_ROW({ id: 30, metadata: { owner: "sec", stale: true } });
    const updated = NODE_ROW({ id: 30, title: "New" });
    currentDb = makeDb([[existing], [updated]]); // existing-check -> hit; update returning
    dbMocks.getDb.mockImplementation(async () => currentDb);

    const out = await engine.writeNode(1, {
      path: "/policies",
      title: "New",
      metadata: { owner: "grc" },
    });

    expect(out).toBe(updated);
    expect(currentDb.insert).not.toHaveBeenCalled();
    const patch = updatedSets()[0];
    expect(patch.metadata).toEqual({ owner: "grc", stale: true }); // merged, incoming wins
    expect(patch.isActive).toBe(true);
    expect(patch.title).toBe("New");
    expect(patch.updatedAt).toBeInstanceOf(Date);
  });

  it("auto-creates missing ancestor folders before inserting the leaf", async () => {
    const engine = new VfsMemoryEngine();
    const leaf = NODE_ROW({ id: 40, path: "/a/b/c.md" });
    currentDb = makeDb([[], [], [], [leaf]]); // /a/b check, /a check, existing check, insert
    dbMocks.getDb.mockImplementation(async () => currentDb);

    await engine.writeNode(1, { path: "/a/b/c.md", title: "C" });

    const paths = insertedValues().map((v: any) => v.path);
    expect(paths).toEqual(["/a", "/a/b", "/a/b/c.md"]);
    const folders = insertedValues().filter((v: any) => v.nodeType === "folder");
    expect(folders.map((f: any) => f.path)).toEqual(["/a", "/a/b"]);
    // folder titles are humanized from the segment
    expect(folders.map((f: any) => f.title)).toEqual(["A", "B"]);
  });
});

describe("VfsMemoryEngine.deleteNode (mocked db)", () => {
  it("reports deletedCount from the affected rows and normalizes raw paths", async () => {
    const engine = new VfsMemoryEngine();
    currentDb = makeDb([[{ id: 1 }, { id: 2 }, { id: 3 }]]);
    dbMocks.getDb.mockImplementation(async () => currentDb);

    const out = await engine.deleteNode(1, "vendors/");
    expect(out).toEqual({ deletedCount: 3 });
  });

  it("returns deletedCount 0 for unknown paths and never throws on empty input", async () => {
    const engine = new VfsMemoryEngine();
    currentDb = makeDb([[]]);
    dbMocks.getDb.mockImplementation(async () => currentDb);

    expect(await engine.deleteNode(1, "")).toEqual({ deletedCount: 0 });
  });
});

describe("VfsMemoryEngine.getVfsTree (mocked db)", () => {
  it("builds a nested tree, hoisting orphans whose parent is missing to the root", async () => {
    const engine = new VfsMemoryEngine();
    currentDb = makeDb([
      [
        // rows arrive in SQL `ORDER BY path` order (the mock does not sort)
        NODE_ROW({ id: 4, path: "/deep", parentPath: "/deep/missing", title: "Deep" }),
        NODE_ROW({ id: 3, path: "/orphan.md", parentPath: "/ghost", title: "Orphan" }),
        NODE_ROW({ id: 1, path: "/policies", parentPath: "/", title: "Policies", nodeType: "folder" }),
        NODE_ROW({
          id: 2, path: "/policies/soc2.md", parentPath: "/policies", title: "SOC2", nodeType: "document",
          summaryL0: null,
        }),
      ],
    ]);
    dbMocks.getDb.mockImplementation(async () => currentDb);

    const tree = await engine.getVfsTree(1);

    // deterministic: roots follow db path order (/deep, /orphan.md, /policies)
    expect(tree.map((n) => n.path)).toEqual(["/deep", "/orphan.md", "/policies"]);
    const policies = tree.find((n) => n.path === "/policies")!;
    expect(policies.children.map((c) => c.path)).toEqual(["/policies/soc2.md"]);
    expect(policies.children[0].children).toEqual([]);
    // null summaryL0 becomes undefined on tree nodes
    expect(policies.children[0].summaryL0).toBeUndefined();
  });
});

describe("VfsMemoryEngine.searchMemory (mocked db)", () => {
  const ROWS = () => [
    NODE_ROW({
      id: 100,
      path: "/infrastructure/aws_production.md",
      parentPath: "/infrastructure",
      nodeType: "document",
      title: "AWS Baseline",
      summaryL0: "Cloud baseline",
      contentL2: "EKS clusters",
    }),
    NODE_ROW({
      id: 101,
      path: "/vendors/vendorlist.md",
      parentPath: "/vendors",
      nodeType: "document",
      title: "Vendor List",
      summaryL0: "Subprocessors",
      contentL2: "hosted on aws somewhere",
    }),
    NODE_ROW({
      id: 102,
      path: "/policies/x.md",
      parentPath: "/policies",
      nodeType: "document",
      title: "Unrelated",
      summaryL0: "nothing relevant",
      contentL2: "no keywords here",
    }),
  ];

  it("scores title matches above content-only matches, case-insensitively, sorted desc", async () => {
    const engine = new VfsMemoryEngine();
    currentDb = makeDb([ROWS()]);
    dbMocks.getDb.mockImplementation(async () => currentDb);

    const results = await engine.searchMemory(1, "  AWS ");

    expect(results.map((r) => r.id)).toEqual([100, 101]); // title+path beats content-only
    expect(results[0].score).toBe(1); // 0.5 + 0.3 title + 0.2 path (capped)
    expect(results[1].score).toBeCloseTo(0.5);
    // snippet is the generated L0 of the content
    expect(results[0].snippet).toContain("EKS clusters");
    expect(results.every((r) => r.score <= 1)).toBe(true);
  });

  it("caps result count at limit and defaults the limit to 10", async () => {
    const engine = new VfsMemoryEngine();
    currentDb = makeDb([ROWS()]);
    dbMocks.getDb.mockImplementation(async () => currentDb);

    const limited = await engine.searchMemory(1, "aws", { limit: 1 });
    expect(limited).toHaveLength(1);
    expect(limited[0].id).toBe(100);

    const defaulted = await engine.searchMemory(1, "aws");
    expect(defaulted.length).toBeLessThanOrEqual(10);
  });

  it("returns [] without querying the db for blank queries (never throws)", async () => {
    const engine = new VfsMemoryEngine();
    const fresh = makeDb();
    dbMocks.getDb.mockImplementation(async () => fresh);

    expect(await engine.searchMemory(1, "")).toEqual([]);
    expect(await engine.searchMemory(1, "   ")).toEqual([]);
    expect(fresh.select).not.toHaveBeenCalled();
  });
});

describe("VfsMemoryEngine.bootstrapDefaultVfsTree (mocked db)", () => {
  const CANONICAL_SEEDS = [
    "/company",
    "/company/profile.md",
    "/infrastructure",
    "/infrastructure/aws_production.md",
    "/policies",
    "/vendors",
    "/facts",
    "/intel",
  ];

  it("seeds the full default architecture when the VFS root is empty", async () => {
    const engine = new VfsMemoryEngine();
    currentDb = makeDb([[]]); // root listing -> empty
    dbMocks.getDb.mockImplementation(async () => currentDb);

    await engine.bootstrapDefaultVfsTree(5);

    const seededPaths = new Set(insertedValues().map((v: any) => v.path));
    for (const p of CANONICAL_SEEDS) {
      expect(seededPaths.has(p), `seed "${p}"`).toBe(true);
    }
    const byPath = new Map(insertedValues().map((v: any) => [v.path, v]));
    expect(byPath.get("/company").nodeType).toBe("folder");
    expect(byPath.get("/company/profile.md").nodeType).toBe("document");
    expect(byPath.get("/company/profile.md").clientId).toBe(5);
  });

  it("is a no-op (zero writes) when the root directory already has content", async () => {
    const engine = new VfsMemoryEngine();
    currentDb = makeDb([[NODE_ROW()]]);
    dbMocks.getDb.mockImplementation(async () => currentDb);

    await engine.bootstrapDefaultVfsTree(1);

    expect(currentDb.insert).not.toHaveBeenCalled();
    expect(currentDb.values).not.toHaveBeenCalled();
  });
});
