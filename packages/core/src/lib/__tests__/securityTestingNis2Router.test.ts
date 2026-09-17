import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZodError } from "zod";
import { TRPCError } from "@trpc/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * NIS2 Advanced Security Testing router (server/routers/securityTestingNis2.ts)
 * — contract tests (QA cycle 21, NIS2 Phase 5 Task 5.1 / ENISA Measure 6.7 /
 * NIS2 Art. 21(2)(e)).
 *
 * Mirrors securityMetricsRouter.test.ts / vulnerabilityMgmtRouter.test.ts: the
 * router is a factory `createSecurityTestingNis2Router(t, protectedProcedure)`
 * tested with a tiny fake tRPC builder — no tRPC server, no DB. The engines
 * underneath (lib/nis2/securityTesting.ts) are pure; the router only
 * validates input with zod and forwards to the engine.
 *
 * Contract under test — all four are `.query` procedures (never mutations),
 * registered by the app router under the `securityTestingNis2:` prefix:
 *   planTest      protected.query  input securityTestingNis2PlanInputSchema
 *   redTeam       protected.query  input securityTestingNis2RedTeamInputSchema
 *   benchmarks    protected.query  input securityTestingNis2BenchmarksInputSchema
 *   scanCoverage  protected.query  input securityTestingNis2ScanCoverageInputSchema
 *
 * The fake protectedProcedure mirrors the real `isAuthed` middleware (TRPCError
 * UNAUTHORIZED when ctx.user is missing) and the tRPC input-parsing layer
 * (ZodError surfaced as TRPCError code "BAD_REQUEST"), so the suite proves the
 * routes are wired through a protected, zod-validated procedure — never a raw
 * public handler.
 *
 * Hardening contract:
 *   - unauthenticated callers are rejected (TRPCError UNAUTHORIZED);
 *   - type-mismatched input is rejected with TRPCError BAD_REQUEST (zod) —
 *     never a raw crash inside the handler. Date objects are NOT accepted by
 *     the clock option (now: string | number, clock: function) nor by item
 *     date fields (ISO strings only) and surface as BAD_REQUEST;
 *   - valid (incl. degenerate) input is forwarded to the engine untouched;
 *   - the router is pure: it never touches the DB (behavioural via the db
 *     mock AND a source-text scan for db imports / getDb / db.select).
 *
 * Exported zod schemas are part of the contract so callers can reuse
 * validation: securityTestingNis2PlanInputSchema,
 * securityTestingNis2RedTeamInputSchema,
 * securityTestingNis2BenchmarksInputSchema,
 * securityTestingNis2ScanCoverageInputSchema, plus per-item schemas
 * (detected dynamically below).
 */

const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

// Same `src/db` mock as the sibling router tests — the security testing NIS2
// router never touches it, and this asserts that fact.
vi.mock("../../db", () => ({
  getDb: dbMocks.getDb,
}));

import { createSecurityTestingNis2Router } from "../../server/routers/securityTestingNis2";

/**
 * Minimal fake tRPC builder. The returned procedure:
 *   - attaches the input schema to each query route (router.<route>.schema);
 *   - enforces an auth gate (TRPCError UNAUTHORIZED without ctx.user), mirroring
 *     the real protectedProcedure/isAuthed middleware;
 *   - parses input through the attached zod schema and surfaces ZodError as
 *     TRPCError BAD_REQUEST, mirroring the tRPC input-validation layer.
 */
function buildFakeTRPC() {
  let currentSchema: unknown = null;
  const procedure: any = {
    input: (schema: unknown) => {
      currentSchema = schema;
      return procedure;
    },
    query: (handler: any) => {
      const schema = currentSchema;
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
      return { type: "query", handler: wrapped, schema };
    },
    mutation: (handler: any) => ({ type: "mutation", handler, schema: currentSchema }),
  };
  const t: any = { router: (routes: any) => routes };
  const router = createSecurityTestingNis2Router(t, procedure);
  return { router };
}

const NOW = new Date("2026-08-19T08:00:00.000Z");
const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const iso = (msOffset: number) => new Date(NOW.getTime() + msOffset).toISOString();
const USER = { id: 1, role: "owner" as const };

const VALID_PLAN_INPUT = {
  tests: [
    {
      id: 1,
      testType: "external",
      status: "scheduled",
      scheduledDate: iso(-10 * DAY_MS),
      riskTier: "medium",
      lastCompletedAt: iso(-200 * DAY_MS),
    },
    {
      id: 2,
      testType: "web-app",
      status: "in_progress",
      scheduledDate: iso(-30 * DAY_MS),
      riskTier: "high",
    },
  ],
  now: NOW.toISOString(),
};

const VALID_RED_TEAM_INPUT = {
  name: "Q3 breach simulation",
  status: "active",
  startAt: iso(-2 * DAY_MS),
  endAt: iso(7 * DAY_MS),
  phases: [
    { id: "recon", name: "Reconnaissance", status: "active", estimatedEndAt: iso(2 * HOUR_MS) },
    { id: "weaponization", name: "Weaponization", status: "pending" },
  ],
  participants: [
    { id: 1, name: "A. Kessler", role: "operator" },
    { id: 2, name: "J. Okafor", role: "observer" },
  ],
  now: NOW.toISOString(),
};

const VALID_BENCHMARKS_INPUT = {
  assessments: [
    { benchmark: "cis", category: "ig1", controlId: "1.1", controlName: "Password policy", status: "pass" },
    { benchmark: "cis", category: "ig1", controlId: "1.2", controlName: "Firewall config", status: "fail" },
  ],
  now: NOW.toISOString(),
};

const VALID_SCAN_COVERAGE_INPUT = {
  assets: [
    { id: 1, assetName: "203.0.113.10", assetClass: "external-ip", lastScanAt: iso(-6 * HOUR_MS), scanFrequencyHours: 24 },
    { id: 2, assetName: "svr-db-01.corp", assetClass: "internal-host", lastScanAt: iso(-200 * DAY_MS), scanFrequencyHours: 24 },
  ],
  now: NOW.toISOString(),
};

beforeEach(() => {
  dbMocks.getDb.mockReset();
});

describe("securityTestingNis2 router — route shape", () => {
  it("exposes planTest, redTeam, benchmarks and scanCoverage, all as query procedures (no mutations)", () => {
    const { router } = buildFakeTRPC();
    for (const name of ["planTest", "redTeam", "benchmarks", "scanCoverage"]) {
      expect(router[name], `route "${name}"`).toBeDefined();
      expect(typeof router[name].handler, `route "${name}" handler`).toBe("function");
      expect(router[name].type, `route "${name}" type`).toBe("query");
      expect(router[name].schema, `route "${name}" schema`).toBeDefined();
    }
    // the router must not expose any mutation routes
    expect(Object.values(router).every((route: any) => route?.type !== "mutation")).toBe(true);
  });
});

describe("securityTestingNis2 router — protected procedures reject unauthenticated callers", () => {
  it("all four procedures reject a missing user with TRPCError UNAUTHORIZED", async () => {
    const { router } = buildFakeTRPC();
    const calls = [
      router.planTest.handler({ input: VALID_PLAN_INPUT, ctx: {} }),
      router.redTeam.handler({ input: VALID_RED_TEAM_INPUT, ctx: {} }),
      router.benchmarks.handler({ input: VALID_BENCHMARKS_INPUT, ctx: {} }),
      router.scanCoverage.handler({ input: VALID_SCAN_COVERAGE_INPUT, ctx: {} }),
    ];
    for (const call of calls) {
      await expect(call).rejects.toBeInstanceOf(TRPCError);
      await expect(call).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    }
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });
});

describe("securityTestingNis2 router — planTest", () => {
  it("forwards valid input and returns the engine's pen-test plan contract", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.planTest.handler({ input: VALID_PLAN_INPUT, ctx: { user: USER } });
    expect(result.total).toBe(2);
    expect(result.tests).toHaveLength(2);
    expect(result.countsByStatus).toMatchObject({ scheduled: 1, inProgress: 1 });
    expect(result.countsByType.webApp).toBe(1);
    // id 2 is in_progress with a 30-day-old scheduledDate -> past the 336h window
    expect(result.overdueCount).toBe(1);
    expect(result.overdueTests.map((t: any) => t.id)).toEqual([2]);
  });

  it("never throws for degenerate-but-valid input (empty object)", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.planTest.handler({ input: {}, ctx: { user: USER } });
    expect(result.total).toBe(0);
    expect(result.overdueCount).toBe(0);
    expect(result.tests).toEqual([]);
  });

  it("rejects type mismatches (tests as string) with BAD_REQUEST", async () => {
    const { router } = buildFakeTRPC();
    const schema = router.planTest.schema;
    expect(schema).toBeDefined();
    expect(() => schema.parse({ tests: "nope" })).toThrow(ZodError);
    expect(schema.parse({})).toBeDefined();
    expect(schema.parse({ tests: [] })).toBeDefined();

    const call = router.planTest.handler({ input: { tests: "nope" }, ctx: { user: USER } });
    await expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("securityTestingNis2 router — redTeam", () => {
  it("forwards valid input and returns the engine's red-team exercise contract", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.redTeam.handler({ input: VALID_RED_TEAM_INPUT, ctx: { user: USER } });
    expect(result.phases).toHaveLength(7);
    expect(result.status).toBe("active"); // recon phase is active
    expect(result.verdict).toBe("unknown"); // not completed, no explicit verdict
    expect(result.participantCounts.observer).toBe(1);
    expect(result.participantCounts.operator).toBe(1);
  });

  it("never throws for degenerate-but-valid input (empty exercise)", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.redTeam.handler({ input: {}, ctx: { user: USER } });
    expect(result.phases).toHaveLength(7);
    expect(result.status).toBe("not-started");
  });

  it("rejects type mismatches (name as number, phases as string) with BAD_REQUEST", async () => {
    const { router } = buildFakeTRPC();
    const schema = router.redTeam.schema;
    expect(schema).toBeDefined();
    expect(() => schema.parse({ name: 42 })).toThrow(ZodError);
    expect(() => schema.parse({ phases: "nope" })).toThrow(ZodError);
    expect(schema.parse({ name: "Q3 breach simulation" })).toBeDefined();

    const call = router.redTeam.handler({ input: { name: 42 }, ctx: { user: USER } });
    await expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("securityTestingNis2 router — benchmarks", () => {
  it("forwards valid input and returns the engine's benchmark contract", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.benchmarks.handler({ input: VALID_BENCHMARKS_INPUT, ctx: { user: USER } });
    expect(result.categories).toHaveLength(9);
    expect(result.totalApplicable).toBe(2);
    expect(result.overallScore).toBe(50);
    expect(result.topGaps).toHaveLength(1);
    expect(result.topGaps[0]).toMatchObject({ category: "ig1", controlId: "1.2" });
  });

  it("never throws for degenerate-but-valid input (empty object)", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.benchmarks.handler({ input: {}, ctx: { user: USER } });
    expect(result.totalApplicable).toBe(0);
    expect(result.overallScore).toBe(0);
  });

  it("rejects type mismatches (assessments as object, result as number) with BAD_REQUEST", async () => {
    const { router } = buildFakeTRPC();
    const schema = router.benchmarks.schema;
    expect(schema).toBeDefined();
    expect(() => schema.parse({ assessments: { a: 1 } })).toThrow(ZodError);
    expect(() => schema.parse({ assessments: [{ benchmark: "cis", category: "ig1", status: 42 }] })).toThrow(ZodError);
    expect(schema.parse({})).toBeDefined();

    const call = router.benchmarks.handler({ input: { assessments: "nope" }, ctx: { user: USER } });
    await expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("securityTestingNis2 router — scanCoverage", () => {
  it("forwards valid input and returns the engine's coverage contract", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.scanCoverage.handler({ input: VALID_SCAN_COVERAGE_INPUT, ctx: { user: USER } });
    expect(result.totalAssets).toBe(2);
    expect(result.coveredCount).toBe(1); // id 1 in SLA
    expect(result.overdueCount).toBe(1); // id 2 stale
    expect(result.coverageRate).toBe(50);
  });

  it("never throws for degenerate-but-valid input (empty object)", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.scanCoverage.handler({ input: {}, ctx: { user: USER } });
    expect(result.totalAssets).toBe(0);
    expect(result.coverageRate).toBe(0);
  });

  it("rejects type mismatches (assets as object, class as number) with BAD_REQUEST", async () => {
    const { router } = buildFakeTRPC();
    const schema = router.scanCoverage.schema;
    expect(schema).toBeDefined();
    expect(() => schema.parse({ assets: { a: 1 } })).toThrow(ZodError);
    expect(() => schema.parse({ assets: [{ id: 1, assetClass: 42 }] })).toThrow(ZodError);
    expect(schema.parse({})).toBeDefined();

    const call = router.scanCoverage.handler({ input: { assets: "nope" }, ctx: { user: USER } });
    await expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("securityTestingNis2 router — shared clock options and item date fields", () => {
  it("accepts string/number `now` and a `clock` factory; rejects Date objects", async () => {
    const { router } = buildFakeTRPC();
    for (const route of ["planTest", "redTeam", "benchmarks", "scanCoverage"]) {
      const schema = router[route].schema;
      expect(() => schema.parse({ now: "2026-08-19T00:00:00.000Z" }), `${route} ISO now`).not.toThrow();
      expect(() => schema.parse({ now: 12345 }), `${route} epoch now`).not.toThrow();
      expect(() => schema.parse({ clock: () => new Date() }), `${route} clock fn`).not.toThrow();
      expect(() => schema.parse({ now: new Date() }), `${route} Date now`).toThrow(ZodError);
      expect(() => schema.parse({ clock: "not-a-function" }), `${route} clock string`).toThrow(ZodError);
    }
  });

  it("rejects Date objects in item date fields (ISO strings only)", async () => {
    const { router } = buildFakeTRPC();
    expect(() =>
      router.planTest.schema.parse({ tests: [{ id: 1, scheduledDate: new Date() }] })
    ).toThrow(ZodError);
    expect(() =>
      router.planTest.schema.parse({ tests: [{ id: 1, lastCompletedAt: new Date() }] })
    ).toThrow(ZodError);
    expect(() =>
      router.scanCoverage.schema.parse({ assets: [{ id: 1, lastScanAt: new Date() }] })
    ).toThrow(ZodError);
    expect(() =>
      router.redTeam.schema.parse({ phases: [{ id: "recon", estimatedEndAt: new Date() }] })
    ).toThrow(ZodError);
  });

  it("planTest BAD_REQUEST propagates for Date-object input through the handler", async () => {
    const { router } = buildFakeTRPC();
    const call = router.planTest.handler({
      input: { tests: [{ id: 1, scheduledDate: new Date() }] },
      ctx: { user: USER },
    });
    await expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("securityTestingNis2 router — exported zod schemas", () => {
  const INPUT_SCHEMA_NAMES = [
    "securityTestingNis2PlanInputSchema",
    "securityTestingNis2RedTeamInputSchema",
    "securityTestingNis2BenchmarksInputSchema",
    "securityTestingNis2ScanCoverageInputSchema",
  ];

  it("exports all four input schemas plus per-item schemas for reuse", async () => {
    const mod = await import("../../server/routers/securityTestingNis2");
    for (const name of INPUT_SCHEMA_NAMES) {
      expect((mod as Record<string, unknown>)[name], `export "${name}"`).toBeDefined();
    }
    // per-item schemas are part of the export surface too
    const itemSchemas = Object.keys(mod).filter(
      (k) => /Schema$/.test(k) && !INPUT_SCHEMA_NAMES.includes(k)
    );
    expect(itemSchemas.length, `item schemas: ${itemSchemas.join(", ")}`).toBeGreaterThanOrEqual(1);
  });

  it("each exported input schema parses valid input and rejects type-mismatched input", async () => {
    const mod = (await import("../../server/routers/securityTestingNis2")) as any;
    expect(mod.securityTestingNis2PlanInputSchema.parse({ tests: [], now: 1 })).toBeDefined();
    expect(() => mod.securityTestingNis2PlanInputSchema.parse({ tests: 1 })).toThrow(ZodError);
    expect(mod.securityTestingNis2RedTeamInputSchema.parse({ name: "Q3 breach simulation" })).toBeDefined();
    expect(() => mod.securityTestingNis2RedTeamInputSchema.parse({ name: 42 })).toThrow(ZodError);
    expect(mod.securityTestingNis2BenchmarksInputSchema.parse({ assessments: [] })).toBeDefined();
    expect(() => mod.securityTestingNis2BenchmarksInputSchema.parse({ assessments: 42 })).toThrow(ZodError);
    expect(mod.securityTestingNis2ScanCoverageInputSchema.parse({ assets: [] })).toBeDefined();
    expect(() => mod.securityTestingNis2ScanCoverageInputSchema.parse({ assets: "x" })).toThrow(ZodError);
  });
});

describe("securityTestingNis2 router — no-db guarantee", () => {
  it("never touches the DB behaviorally", async () => {
    const { router } = buildFakeTRPC();
    await router.planTest.handler({ input: VALID_PLAN_INPUT, ctx: { user: USER } });
    await router.redTeam.handler({ input: VALID_RED_TEAM_INPUT, ctx: { user: USER } });
    await router.benchmarks.handler({ input: VALID_BENCHMARKS_INPUT, ctx: { user: USER } });
    await router.scanCoverage.handler({ input: VALID_SCAN_COVERAGE_INPUT, ctx: { user: USER } });
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });

  it("the router source has no db imports, getDb or db.select", () => {
    const source = readFileSync(
      join(process.cwd(), "packages/core/src/server/routers/securityTestingNis2.ts"),
      "utf8"
    );
    expect(source).not.toContain("getDb");
    expect(source).not.toContain("db.select");
    expect(source).not.toMatch(/from\s+["'][^"']*\/db["']/);
    expect(source).not.toContain("src/db");
  });
});
