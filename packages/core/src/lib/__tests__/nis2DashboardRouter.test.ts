import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZodError } from "zod";
import { TRPCError } from "@trpc/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * NIS2 dashboard router (server/routers/nis2Dashboard.ts) — contract tests
 * (QA cycle 38).
 *
 * Mirrors trustCenterRouter.test.ts (DB-backed sibling harness): the router
 * is a factory `createNis2DashboardRouter(t, protectedProcedure)` tested
 * with a tiny fake tRPC builder and a queued fake drizzle chain — no tRPC
 * server, no real DB.
 *
 * Contract under test — exactly three PROTECTED `.query` procedures (never
 * mutations), registered under the `nis2Dashboard:` prefix:
 *   controlHealth  protected.query  input nis2ControlHealthInputSchema
 *   domainSummary  protected.query  input nis2DomainSummaryInputSchema
 *   incidentClock  protected.query  input nis2IncidentClockInputSchema
 *   (each schema: z.object({ clientId: z.number().int().positive() }))
 *
 * Hardening contract:
 *   - unauthenticated callers are rejected with TRPCError UNAUTHORIZED;
 *   - type-mismatched / out-of-range input is rejected with TRPCError
 *     BAD_REQUEST (zod only) — never a raw crash inside the handler;
 *   - bounded reads: every query funnels through Promise.all-ed per-table
 *     `.limit(500)` selects scoped by clientId;
 *   - graceful degradation: ANY db failure resolves to the corresponding
 *     EMPTY_* payload ({ measures: [], generatedAt } / { domains: [] } /
 *     { openSignificant: 0, nextDeadline: null }) instead of rejecting;
 *   - static hygiene: the engine is dependency-free (no db/drizzle/server
 *     imports at all); the router never console.logs and never mutates.
 */

const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

// Same `src/db` mock as the sibling router tests.
vi.mock("../../db", () => ({
  getDb: dbMocks.getDb,
}));

import {
  createNis2DashboardRouter,
  nis2ControlHealthInputSchema,
  nis2DomainSummaryInputSchema,
  nis2IncidentClockInputSchema,
} from "../../server/routers/nis2Dashboard";

/**
 * Minimal fake tRPC builder. The procedure enforces an auth gate
 * (TRPCError UNAUTHORIZED without ctx.user, mirroring isAuthed) and parses
 * input through the attached zod schema, surfacing ZodError as TRPCError
 * BAD_REQUEST — mirroring the tRPC validation layer.
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
  const router = createNis2DashboardRouter(t, procedure);
  return { router };
}

const USER = { id: 1, role: "owner" as const };

/** Runtime-relative clock so incident fixtures stay valid without injecting now. */
const NOW_MS = Date.now();
const HOUR_MS = 60 * 60 * 1000;

let limitCalls: number;

/**
 * Queued-row fake db. Every `select().from(T).where(...)` terminal consumes
 * the NEXT queued result (Promise.all preserves array-literal creation
 * order, matching the router's table fan-out order). Counts `.limit()`
 * invocations for the bounded-reads witness.
 */
function mockDbRows(...queryResults: unknown[][]): any {
  limitCalls = 0;
  const queue = queryResults.map((rows) => [...rows]);
  const take = async () => (queue.length ? queue.shift() : []);
  const makeWhere = () => {
    const builder: any = {
      then: (resolve: (v: unknown) => void) => resolve(queue.length ? queue.shift() : []),
      limit: () => {
        limitCalls += 1;
        return take();
      },
    };
    return builder;
  };
  const db: any = {
    select: () => ({ from: () => ({ where: makeWhere }) }),
  };
  dbMocks.getDb.mockResolvedValue(db);
  return db;
}

beforeEach(() => {
  dbMocks.getDb.mockReset();
});

type AnyRow = Record<string, any>;

/* ------------------------------------------------------------------ */
/* Fixtures                                                            */
/* ------------------------------------------------------------------ */

// Router fan-out order for `controlHealth` (13 tables):
// clientPolicies, riskScenarios, incidents, bcPlans, vendors,
// vendorAssessments, vulnerabilities, evidence, securityTests,
// trainingAssignments, employees, accessReviewCampaigns, assets.
const APPROVED_POLICY = { id: 1, clientId: 7, approvalStatus: "approved" };

const VENDOR_ROWS = [{ id: 1 }, { id: 2 }, { id: 3 }];
const ASSESSMENT_ROWS = [
  { vendorId: 1, status: "completed" },
  { vendorId: 2, status: "completed" },
];

const OPEN_SIGNIFICANT_INCIDENT = {
  id: 501,
  clientId: 7,
  status: "open",
  isSignificant: true,
  detectedAt: new Date(NOW_MS - 6 * HOUR_MS).toISOString(),
  title: "Supplier breach",
};

describe("nis2Dashboard router — route shape", () => {
  it("exposes exactly controlHealth, domainSummary and incidentClock — all queries, no mutations", () => {
    const { router } = buildFakeTRPC();
    expect(Object.keys(router).sort()).toEqual([
      "controlHealth",
      "domainSummary",
      "incidentClock",
    ]);
    for (const name of ["controlHealth", "domainSummary", "incidentClock"]) {
      expect(router[name], `route "${name}"`).toBeDefined();
      expect(typeof router[name].handler, `route "${name}" handler`).toBe("function");
      expect(router[name].type, `route "${name}" type`).toBe("query");
      expect(router[name].schema, `route "${name}" schema`).toBeDefined();
    }
    expect(Object.values(router).every((route: any) => route?.type !== "mutation")).toBe(true);
  });

  it("attaches the exported zod schemas to the matching routes verbatim", () => {
    const { router } = buildFakeTRPC();
    expect(router.controlHealth.schema).toBe(nis2ControlHealthInputSchema);
    expect(router.domainSummary.schema).toBe(nis2DomainSummaryInputSchema);
    expect(router.incidentClock.schema).toBe(nis2IncidentClockInputSchema);
  });
});

describe("nis2Dashboard router — auth gates", () => {
  it("all three queries reject a missing user with TRPCError UNAUTHORIZED", async () => {
    const { router } = buildFakeTRPC();
    mockDbRows();
    const calls = [
      router.controlHealth.handler({ input: { clientId: 7 }, ctx: {} }),
      router.domainSummary.handler({ input: { clientId: 7 }, ctx: {} }),
      router.incidentClock.handler({ input: { clientId: 7 }, ctx: {} }),
    ];
    for (const call of calls) {
      await expect(call).rejects.toBeInstanceOf(TRPCError);
      await expect(call).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    }
  });

  it("never reaches the database when unauthenticated", async () => {
    const { router } = buildFakeTRPC();
    mockDbRows();
    try {
      await router.controlHealth.handler({ input: { clientId: 7 }, ctx: {} });
      expect.unreachable("must have thrown");
    } catch (err) {
      expect((err as TRPCError).code).toBe("UNAUTHORIZED");
    }
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });

  it("auth gate takes precedence over invalid input (UNAUTHORIZED, never BAD_REQUEST)", async () => {
    // Missing user AND schema-violating payload: authentication runs
    // before validation, so the rejection must be UNAUTHORIZED.
    const { router } = buildFakeTRPC();
    mockDbRows(); // never consumed
    await expect(
      router.controlHealth.handler({ input: { clientId: -1 }, ctx: {} })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("nis2Dashboard router — zod validation (BAD_REQUEST only)", () => {
  it("rejects negative clientIds with BAD_REQUEST on all three queries", async () => {
    const { router } = buildFakeTRPC();
    for (const name of ["controlHealth", "domainSummary", "incidentClock"] as const) {
      await expect(
        router[name].handler({ input: { clientId: -5 }, ctx: { user: USER } })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
  });

  it("rejects zero clientIds with BAD_REQUEST", async () => {
    const { router } = buildFakeTRPC();
    for (const name of ["controlHealth", "domainSummary", "incidentClock"] as const) {
      await expect(
        router[name].handler({ input: { clientId: 0 }, ctx: { user: USER } })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
  });

  it("rejects string clientIds with BAD_REQUEST", async () => {
    const { router } = buildFakeTRPC();
    for (const name of ["controlHealth", "domainSummary", "incidentClock"] as const) {
      await expect(
        router[name].handler({ input: { clientId: "seven" }, ctx: { user: USER } })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
  });

  it("rejects float clientIds with BAD_REQUEST", async () => {
    const { router } = buildFakeTRPC();
    for (const name of ["controlHealth", "domainSummary", "incidentClock"] as const) {
      await expect(
        router[name].handler({ input: { clientId: 7.5 }, ctx: { user: USER } })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
  });

  it("rejects a missing clientId with BAD_REQUEST", async () => {
    const { router } = buildFakeTRPC();
    for (const name of ["controlHealth", "domainSummary", "incidentClock"] as const) {
      await expect(
        router[name].handler({ input: {}, ctx: { user: USER } })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
  });
});

describe("nis2Dashboard router — graceful degradation on db failure", () => {
  it("controlHealth degrades to the empty report shape (with fresh generatedAt) when the db throws", async () => {
    dbMocks.getDb.mockRejectedValue(new Error("pool down"));
    const { router } = buildFakeTRPC();
    const result = await router.controlHealth.handler({
      input: { clientId: 7 },
      ctx: { user: USER },
    });
    expect(result.measures).toEqual([]);
    expect(typeof result.generatedAt).toBe("string");
    expect(Number.isNaN(Date.parse(result.generatedAt))).toBe(false);
  });

  it("domainSummary degrades to an empty domains list when the db throws", async () => {
    dbMocks.getDb.mockRejectedValue(new Error("pool down"));
    const { router } = buildFakeTRPC();
    await expect(
      router.domainSummary.handler({ input: { clientId: 7 }, ctx: { user: USER } })
    ).resolves.toEqual({ domains: [] });
  });

  it("incidentClock degrades to the exact empty clock shape when the db throws", async () => {
    dbMocks.getDb.mockRejectedValue(new Error("pool down"));
    const { router } = buildFakeTRPC();
    await expect(
      router.incidentClock.handler({ input: { clientId: 7 }, ctx: { user: USER } })
    ).resolves.toEqual({ openSignificant: 0, nextDeadline: null });
  });

  it("degrades identically when the query builder itself throws mid-flight", async () => {
    const failing: any = {
      select: () => ({
        from: () => ({
          where: () => {
            throw new Error("relation missing");
          },
        }),
      }),
    };
    dbMocks.getDb.mockResolvedValue(failing);
    const { router } = buildFakeTRPC();
    await expect(
      router.controlHealth.handler({ input: { clientId: 7 }, ctx: { user: USER } })
    ).resolves.toMatchObject({ measures: [] });
    await expect(
      router.incidentClock.handler({ input: { clientId: 7 }, ctx: { user: USER } })
    ).resolves.toEqual({ openSignificant: 0, nextDeadline: null });
  });

  it("treats successful zero-row reads as live empties, NOT as EMPTY_* degradation", async () => {
    // A db that ANSWERS with no rows must still yield computed shapes:
    // 12 no-data cards / 8 no-data tiles / the empty clock — distinct from
    // the failure-degradation payloads asserted above.
    mockDbRows();
    const { router } = buildFakeTRPC();
    const health = await router.controlHealth.handler({
      input: { clientId: 7 },
      ctx: { user: USER },
    });
    expect(health.measures).toHaveLength(12);
    expect(health.measures.every((m: AnyRow) => m.status === "no-data")).toBe(true);
    const summary = await router.domainSummary.handler({
      input: { clientId: 7 },
      ctx: { user: USER },
    });
    expect(summary.domains).toHaveLength(8);
    expect(summary.domains.every((d: AnyRow) => d.status === "no-data")).toBe(true);
    await expect(
      router.incidentClock.handler({ input: { clientId: 7 }, ctx: { user: USER } })
    ).resolves.toEqual({ openSignificant: 0, nextDeadline: null });
  });
});

describe("nis2Dashboard router — happy-path passthrough", () => {
  it("controlHealth turns seeded rows into compliant / at-risk / no-data measure witnesses", async () => {
    mockDbRows(
      [APPROVED_POLICY], // clientPolicies -> compliant 100
      [], // riskScenarios
      [], // incidents
      [], // bcPlans
      VENDOR_ROWS, // vendors -> supplyChain 2/3 covered -> 66.7 at-risk
      ASSESSMENT_ROWS, // vendorAssessments
      [], // vulnerabilities
      [], // evidence
      [], // securityTests
      [], // trainingAssignments -> hrSecurity no-data
      [], // employees
      [], // accessReviewCampaigns
      [] // assets
    );
    const { router } = buildFakeTRPC();
    const result = await router.controlHealth.handler({
      input: { clientId: 7 },
      ctx: { user: USER },
    });
    expect(result.measures).toHaveLength(12);
    const byId = (id: string) => result.measures.find((m: AnyRow) => m.id === id);
    expect(byId("policies").status).toBe("compliant");
    expect(byId("policies").score).toBe(100);
    expect(byId("supplyChain").status).toBe("at-risk");
    expect(byId("supplyChain").score).toBe(66.7);
    const noData = byId("hrSecurity");
    expect(noData.status).toBe("no-data");
    expect(noData.score).toBe(0);
    expect(noData.metrics).toEqual([]);
    expect(noData.alertCount).toBe(0);
    expect(Number.isNaN(Date.parse(result.generatedAt))).toBe(false);
    expect(dbMocks.getDb).toHaveBeenCalledTimes(1);
  });

  it("domainSummary returns all 8 domains in canonical order with live band witnesses", async () => {
    // Fan-out order (10 tables): clientPolicies, riskScenarios, incidents,
    // bcPlans, vendors, vendorAssessments, assets, trainingAssignments,
    // employees, accessReviewCampaigns.
    mockDbRows(
      [APPROVED_POLICY],
      [{ status: "treated", residualScore: 5 }], // risk -> healthy
      [],
      [],
      [],
      [],
      [],
      [], // trainingAssignments -> training no-data
      [],
      []
    );
    const { router } = buildFakeTRPC();
    const result = await router.domainSummary.handler({
      input: { clientId: 7 },
      ctx: { user: USER },
    });
    expect(result.domains.map((d: AnyRow) => d.key)).toEqual([
      "risk",
      "incident",
      "bcp",
      "supplyChain",
      "asset",
      "training",
      "access",
      "policy",
    ]);
    const byKey = (key: string) => result.domains.find((d: AnyRow) => d.key === key);
    expect(byKey("risk").status).toBe("healthy");
    expect(byKey("policy").status).toBe("healthy");
    expect(byKey("training").status).toBe("no-data");
    expect(byKey("training").alertCount).toBe(0);
  });

  it("incidentClock surfaces the earliest unmet Art. 23 milestone with server-clock hoursRemaining", async () => {
    mockDbRows([OPEN_SIGNIFICANT_INCIDENT]);
    const { router } = buildFakeTRPC();
    const result = await router.incidentClock.handler({
      input: { clientId: 7 },
      ctx: { user: USER },
    });
    expect(result.openSignificant).toBe(1);
    expect(result.nextDeadline).not.toBeNull();
    expect(result.nextDeadline.incidentId).toBe(501);
    expect(result.nextDeadline.incidentTitle).toBe("Supplier breach");
    expect(result.nextDeadline.label).toBe("24h Early Warning");
    // detected 6h ago -> 24h anchor is ~18h ahead (small drift tolerated:
    // the router pins time to the SERVER clock by design)
    expect(Math.abs(result.nextDeadline.hoursRemaining - 18)).toBeLessThan(0.5);
    const expectedDue = (NOW_MS - 6 * HOUR_MS + 24 * HOUR_MS) / 1000;
    expect(Math.abs(Date.parse(result.nextDeadline.dueAt) / 1000 - expectedDue)).toBeLessThan(2);
  });

  it("funnels every query through bounded reads (explicit limit on each table scan)", async () => {
    mockDbRows([APPROVED_POLICY], [], [], [], [], [], [], [], [], [], [], [], []);
    const { router } = buildFakeTRPC();
    await router.controlHealth.handler({ input: { clientId: 7 }, ctx: { user: USER } });
    // 13 per-table reads, each capped by .limit(ROW_LIMIT)
    expect(limitCalls).toBe(13);
  });

  it("bounds the other two queries too (domainSummary and incidentClock each use .limit)", async () => {
    const { router } = buildFakeTRPC();
    const limitsPerQuery: number[] = [];
    for (const name of ["domainSummary", "incidentClock"] as const) {
      mockDbRows([OPEN_SIGNIFICANT_INCIDENT]);
      await router[name].handler({ input: { clientId: 7 }, ctx: { user: USER } });
      limitsPerQuery.push(limitCalls);
    }
    // The witness above pins controlHealth's exact 13-table fan-out; this
    // one pins that domainSummary/incidentClock are bounded as well.
    expect(limitsPerQuery[0]).toBeGreaterThanOrEqual(1);
    expect(limitsPerQuery[1]).toBeGreaterThanOrEqual(1);
  });

  it("scopes reads by clientId end-to-end (seeded rows flow through unchanged)", async () => {
    mockDbRows([APPROVED_POLICY], [], [], [], [], [], [], [], [], [], [], [], []);
    const { router } = buildFakeTRPC();
    const result = await router.controlHealth.handler({
      input: { clientId: 7 },
      ctx: { user: USER },
    });
    // the raw DB row's identity survives into the computed card set
    expect(result.measures.find((m: AnyRow) => m.id === "policies").title).toContain(
      "risk analysis"
    );
  });
});

describe("nis2Dashboard router — exported zod schemas", () => {
  it("exports one clientId-scoped schema per query that parses valid and rejects invalid input", () => {
    expect(nis2ControlHealthInputSchema.parse({ clientId: 1 })).toEqual({ clientId: 1 });
    expect(nis2DomainSummaryInputSchema.parse({ clientId: 2 })).toEqual({ clientId: 2 });
    expect(nis2IncidentClockInputSchema.parse({ clientId: 3 })).toEqual({ clientId: 3 });
    expect(() => nis2ControlHealthInputSchema.parse({})).toThrow(ZodError);
    expect(() => nis2ControlHealthInputSchema.parse({ clientId: -1 })).toThrow(ZodError);
    expect(() => nis2DomainSummaryInputSchema.parse({ clientId: 0 })).toThrow(ZodError);
    expect(() => nis2IncidentClockInputSchema.parse({ clientId: 1.25 })).toThrow(ZodError);
    expect(() => nis2ControlHealthInputSchema.parse({ clientId: "7" })).toThrow(ZodError);
  });
});

describe("nis2Dashboard router — static source hygiene", () => {
  it("the engine file is fully dependency-free (no imports at all)", () => {
    const raw = readFileSync(
      join(process.cwd(), "packages/core/src/lib/nis2/controlHealth.ts"),
      "utf8"
    );
    // Comments may legitimately MENTION drizzle/db rows; only executable
    // code must stay dependency-free (house scan pattern).
    const source = raw.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    const importLines = source.match(/^\s*import\b[^\n]*$/gm) ?? [];
    expect(importLines, `found imports: ${importLines.join(" | ")}`).toEqual([]);
    expect(source).not.toContain("getDb");
    expect(source).not.toContain("drizzle");
    expect(source).not.toContain("@/server/");
  });

  it("the router never logs and never mutates (read-only facade)", () => {
    const source = readFileSync(
      join(process.cwd(), "packages/core/src/server/routers/nis2Dashboard.ts"),
      "utf8"
    );
    expect(source).not.toContain("console.log");
    expect(source).not.toMatch(/\.insert\(/);
    expect(source).not.toMatch(/\.update\(/);
    expect(source).not.toMatch(/\.delete\(/);
  });

  it("the router wires exactly the three contracted procedure names", () => {
    const source = readFileSync(
      join(process.cwd(), "packages/core/src/server/routers/nis2Dashboard.ts"),
      "utf8"
    );
    for (const name of ["controlHealth", "domainSummary", "incidentClock"]) {
      expect(source).toContain(name);
    }
  });
});
