import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZodError } from "zod";
import { TRPCError } from "@trpc/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * NIS2 Security Metrics & Reporting router (server/routers/securityMetrics.ts)
 * — contract tests (QA cycle 20, NIS2 Phase 4 Task 4.2 / ENISA Measure 7.1).
 *
 * Mirrors vulnerabilityMgmtRouter.test.ts / thirdPartyRiskRouter.test.ts: the
 * router is a factory `createSecurityMetricsRouter(t, protectedProcedure)`
 * tested with a tiny fake tRPC builder — no tRPC server, no DB. The engines
 * underneath (lib/nis2/securityMetrics.ts) are pure; the router only
 * validates input with zod and forwards to the engine.
 *
 * Contract under test — all four are `.query` procedures (never mutations):
 *   mttr             protected.query  input securityMetricsMttrInputSchema
 *   vulnerabilityAge protected.query  input securityMetricsVulnerabilityAgeInputSchema
 *   complianceDrift  protected.query  input securityMetricsComplianceDriftInputSchema
 *   executiveSummary protected.query  input securityMetricsExecutiveSummaryInputSchema
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
 *     never a raw crash inside the handler. NOTE (QA flag): enum-ish fields
 *     (severity / status) stay loose as z.string() — unknown enum strings are
 *     accepted by zod and engine-coerced instead of rejected;
 *   - valid (incl. degenerate) input is forwarded to the engine untouched;
 *   - the router is pure: it never touches the DB (behavioural via the db
 *     mock AND a source-text scan for db imports).
 *
 * Exported zod schemas are part of the contract so callers can reuse
 * validation: securityMetricsIncidentSchema,
 * securityMetricsMttrInputSchema, securityMetricsVulnerabilityAgeItemSchema,
 * securityMetricsVulnerabilityAgeInputSchema, securityMetricsComplianceAreaSchema,
 * securityMetricsComplianceDriftInputSchema, securityMetricsAreaAtRiskSchema,
 * securityMetricsExecutiveSummaryInputSchema.
 *
 * Clock: the shared clockOptionSchema accepts `now` (string | number) and
 * `clock` (function) — Date objects are NOT accepted by zod and surface as
 * BAD_REQUEST (asserted below).
 */

const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

// Same `src/db` mock as the sibling router tests — the security metrics
// router never touches it, and this asserts that fact.
vi.mock("../../db", () => ({
  getDb: dbMocks.getDb,
}));

import { createSecurityMetricsRouter } from "../../server/routers/securityMetrics";

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
  const router = createSecurityMetricsRouter(t, procedure);
  return { router };
}

const NOW = new Date("2026-08-19T08:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const USER = { id: 1, role: "owner" as const };

const VALID_MTTR_INPUT = {
  incidents: [
    { id: 1, severity: "critical", detectedAt: new Date(NOW.getTime() - 3 * DAY_MS).toISOString(), resolvedAt: new Date(NOW.getTime() - 2 * DAY_MS).toISOString() },
    { id: 2, severity: "high", detectedAt: new Date(NOW.getTime() - 1 * DAY_MS).toISOString(), resolvedAt: NOW.toISOString() },
  ],
  now: NOW.toISOString(),
};

const VALID_VULNERABILITY_AGE_INPUT = {
  vulns: [
    { id: 1, severity: "critical", discoveredAt: new Date(NOW.getTime() - 40 * DAY_MS).toISOString(), status: "open" },
    { id: 2, severity: "high", discoveredAt: new Date(NOW.getTime() - 10 * DAY_MS).toISOString(), status: "patched" },
  ],
  now: NOW.toISOString(),
};

const VALID_COMPLIANCE_DRIFT_INPUT = {
  areas: [
    { areaId: "a1", name: "Risk analysis", baselineScore: 92, currentScore: 64 },
    { areaId: "a2", name: "Incident handling", baselineScore: 88, currentScore: 88 },
  ],
  now: NOW.toISOString(),
};

const VALID_EXECUTIVE_SUMMARY_INPUT = {
  postureScore: 68,
  openCriticalVulns: 2,
  overdueVulns: 3,
  overallMttrHours: 41.2,
  priorMttrHours: 48,
  driftAlertCount: 2,
  incidentsLast30d: 5,
  areasAtRisk: [
    { areaId: "a1", name: "Risk analysis", driftPts: -28 },
    { areaId: "a2", name: "Supply chain", driftPts: -26 },
  ],
  now: NOW.toISOString(),
};

beforeEach(() => {
  dbMocks.getDb.mockReset();
});

describe("securityMetrics router — route shape", () => {
  it("exposes mttr, vulnerabilityAge, complianceDrift and executiveSummary, all as query procedures (no mutations)", () => {
    const { router } = buildFakeTRPC();
    for (const name of ["mttr", "vulnerabilityAge", "complianceDrift", "executiveSummary"]) {
      expect(router[name], `route "${name}"`).toBeDefined();
      expect(typeof router[name].handler, `route "${name}" handler`).toBe("function");
      expect(router[name].type, `route "${name}" type`).toBe("query");
      expect(router[name].schema, `route "${name}" schema`).toBeDefined();
    }
    // the router must not expose any mutation routes
    expect(Object.values(router).every((route: any) => route?.type !== "mutation")).toBe(true);
  });
});

describe("securityMetrics router — protected procedures reject unauthenticated callers", () => {
  it("all four procedures reject a missing user with TRPCError UNAUTHORIZED", async () => {
    const { router } = buildFakeTRPC();
    const calls = [
      router.mttr.handler({ input: VALID_MTTR_INPUT, ctx: {} }),
      router.vulnerabilityAge.handler({ input: VALID_VULNERABILITY_AGE_INPUT, ctx: {} }),
      router.complianceDrift.handler({ input: VALID_COMPLIANCE_DRIFT_INPUT, ctx: {} }),
      router.executiveSummary.handler({ input: VALID_EXECUTIVE_SUMMARY_INPUT, ctx: {} }),
    ];
    for (const call of calls) {
      await expect(call).rejects.toBeInstanceOf(TRPCError);
      await expect(call).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    }
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });
});

describe("securityMetrics router — mttr", () => {
  it("forwards valid input and returns the engine's MTTR contract", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.mttr.handler({ input: VALID_MTTR_INPUT, ctx: { user: USER } });
    expect(result.totalResolved).toBe(2);
    expect(result.overall.count).toBe(2);
    expect(result.overall.mttrHours).toBeGreaterThan(0);
    expect(result.bySeverity).toHaveLength(6);
    const critical = result.bySeverity.find((b: { severity: string }) => b.severity === "critical");
    expect(critical).toMatchObject({ count: 1, severity: "critical" });
  });

  it("accepts epoch-number timestamps and returns zeroed safe output for empty input", async () => {
    const { router } = buildFakeTRPC();
    const empty = await router.mttr.handler({
      input: { incidents: [], now: NOW.getTime() },
      ctx: { user: USER },
    });
    expect(empty.totalResolved).toBe(0);
    expect(empty.overall.mttrHours).toBe(0);
  });

  it("rejects type mismatches (incidents as string, detectedAt as Date object)", async () => {
    const { router } = buildFakeTRPC();
    const schema = router.mttr.schema;
    expect(schema).toBeDefined();
    expect(() => schema.parse({ incidents: "nope" })).toThrow(ZodError);
    expect(() => schema.parse({ incidents: [{ id: 1, detectedAt: new Date() }] })).toThrow(ZodError);
    expect(() => schema.parse({ incidents: [{ id: 1, severity: 42 }] })).toThrow(ZodError);
    // loose enum strings are accepted by zod (engine coerces them)
    expect(() => schema.parse({ incidents: [{ severity: "bogus" }] })).not.toThrow();
    expect(schema.parse({})).toBeDefined();
    expect(schema.parse({ incidents: [], now: 12345 })).toBeDefined();

    const call = router.mttr.handler({
      input: { incidents: "nope" },
      ctx: { user: USER },
    });
    await expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("securityMetrics router — vulnerabilityAge", () => {
  it("forwards valid input and returns the engine's age contract", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.vulnerabilityAge.handler({
      input: VALID_VULNERABILITY_AGE_INPUT,
      ctx: { user: USER },
    });
    expect(result.totalOpen).toBe(1); // patched row excluded by the engine
    expect(result.overall.count).toBe(1);
    expect(result.bySeverity).toHaveLength(6);
    expect(result.overall.ageBandCounts).toBeDefined();
  });

  it("rejects type mismatches (vulns as number, discoveredAt as boolean)", async () => {
    const { router } = buildFakeTRPC();
    const schema = router.vulnerabilityAge.schema;
    expect(schema).toBeDefined();
    expect(() => schema.parse({ vulns: 42 })).toThrow(ZodError);
    expect(() => schema.parse({ vulns: [{ id: 1, discoveredAt: true }] })).toThrow(ZodError);
    expect(() => schema.parse({ vulns: [{ id: 1, status: "bogus" }] })).not.toThrow();
    expect(schema.parse({})).toBeDefined();

    const call = router.vulnerabilityAge.handler({ input: { vulns: 42 }, ctx: { user: USER } });
    await expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("securityMetrics router — complianceDrift", () => {
  it("forwards valid input and returns the engine's drift contract", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.complianceDrift.handler({
      input: VALID_COMPLIANCE_DRIFT_INPUT,
      ctx: { user: USER },
    });
    expect(result.totalAreas).toBe(2);
    expect(result.alerts).toHaveLength(1);
    expect(result.alerts[0]).toMatchObject({ areaId: "a1", severity: "critical" });
    expect(result.counts).toMatchObject({ critical: 1, stable: 1, totalAlerts: 1 });
  });

  it("rejects type mismatches (areas as object, baselineScore as string)", async () => {
    const { router } = buildFakeTRPC();
    const schema = router.complianceDrift.schema;
    expect(schema).toBeDefined();
    expect(() => schema.parse({ areas: { a: 1 } })).toThrow(ZodError);
    expect(() => schema.parse({ areas: [{ areaId: 1, baselineScore: "80" }] })).toThrow(ZodError);
    expect(() => schema.parse({ areas: [{ areaId: 1, name: 42 }] })).toThrow(ZodError);
    expect(schema.parse({})).toBeDefined();

    const call = router.complianceDrift.handler({
      input: { areas: "nope" },
      ctx: { user: USER },
    });
    await expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("securityMetrics router — executiveSummary", () => {
  it("forwards valid input and returns the engine's summary contract", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.executiveSummary.handler({
      input: VALID_EXECUTIVE_SUMMARY_INPUT,
      ctx: { user: USER },
    });
    expect(result.postureScore).toBe(68);
    expect(result.mttrTrend).toEqual({ direction: "improved", pctChange: 14.2 });
    expect(result.status).toBe("Watch");
    expect(result.topAreasAtRisk).toHaveLength(2);
    expect(result.topAreasAtRisk[0]).toMatchObject({ areaId: "a1", driftPts: -28 });
  });

  it("rejects type mismatches (areasAtRisk as string, postureScore as string)", async () => {
    const { router } = buildFakeTRPC();
    const schema = router.executiveSummary.schema;
    expect(schema).toBeDefined();
    expect(() => schema.parse({ areasAtRisk: "nope" })).toThrow(ZodError);
    expect(() => schema.parse({ postureScore: "high" })).toThrow(ZodError);
    expect(() => schema.parse({ areasAtRisk: [{ areaId: 1, driftPts: "x" }] })).toThrow(ZodError);
    expect(schema.parse({})).toBeDefined();

    const call = router.executiveSummary.handler({
      input: { postureScore: "high" },
      ctx: { user: USER },
    });
    await expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("securityMetrics router — shared clock options", () => {
  it("accepts string/number `now` and a `clock` factory; rejects Date objects", async () => {
    const { router } = buildFakeTRPC();
    expect(() => router.mttr.schema.parse({ now: "2026-08-19T00:00:00.000Z" })).not.toThrow();
    expect(() => router.mttr.schema.parse({ now: 12345 })).not.toThrow();
    expect(() => router.mttr.schema.parse({ clock: () => new Date() })).not.toThrow();
    expect(() => router.mttr.schema.parse({ now: new Date() })).toThrow(ZodError);
    expect(() => router.mttr.schema.parse({ clock: "not-a-function" })).toThrow(ZodError);
  });
});

describe("securityMetrics router — exported zod schemas", () => {
  it("exports all eight input/item schemas for reuse", async () => {
    const mod = await import("../../server/routers/securityMetrics");
    for (const name of [
      "securityMetricsIncidentSchema",
      "securityMetricsMttrInputSchema",
      "securityMetricsVulnerabilityAgeItemSchema",
      "securityMetricsVulnerabilityAgeInputSchema",
      "securityMetricsComplianceAreaSchema",
      "securityMetricsComplianceDriftInputSchema",
      "securityMetricsAreaAtRiskSchema",
      "securityMetricsExecutiveSummaryInputSchema",
    ]) {
      expect((mod as Record<string, unknown>)[name], `export "${name}"`).toBeDefined();
    }
    // each exported schema parses valid input and rejects type-mismatched input
    const modAny = mod as any;
    expect(modAny.securityMetricsMttrInputSchema.parse({ incidents: [], now: 1 })).toBeDefined();
    expect(() => modAny.securityMetricsMttrInputSchema.parse({ incidents: 1 })).toThrow(ZodError);
    expect(modAny.securityMetricsVulnerabilityAgeInputSchema.parse({ vulns: [] })).toBeDefined();
    expect(() => modAny.securityMetricsVulnerabilityAgeInputSchema.parse({ vulns: "x" })).toThrow(ZodError);
    expect(modAny.securityMetricsComplianceDriftInputSchema.parse({ areas: [] })).toBeDefined();
    expect(() => modAny.securityMetricsComplianceDriftInputSchema.parse({ areas: 42 })).toThrow(ZodError);
    expect(modAny.securityMetricsExecutiveSummaryInputSchema.parse({ postureScore: 1 })).toBeDefined();
    expect(() => modAny.securityMetricsExecutiveSummaryInputSchema.parse({ areasAtRisk: 1 })).toThrow(ZodError);
    expect(modAny.securityMetricsIncidentSchema.parse({ id: 1, severity: "critical" })).toBeDefined();
    expect(() => modAny.securityMetricsIncidentSchema.parse({ id: true })).toThrow(ZodError);
    expect(modAny.securityMetricsVulnerabilityAgeItemSchema.parse({ id: "x", status: "open" })).toBeDefined();
    expect(() => modAny.securityMetricsVulnerabilityAgeItemSchema.parse({ discoveredAt: {} })).toThrow(ZodError);
    expect(modAny.securityMetricsComplianceAreaSchema.parse({ areaId: 1, baselineScore: 0 })).toBeDefined();
    expect(() => modAny.securityMetricsComplianceAreaSchema.parse({ baselineScore: "0" })).toThrow(ZodError);
    expect(modAny.securityMetricsAreaAtRiskSchema.parse({ areaId: "a", driftPts: -5 })).toBeDefined();
    expect(() => modAny.securityMetricsAreaAtRiskSchema.parse({ driftPts: "x" })).toThrow(ZodError);
  });
});

describe("securityMetrics router — no-db guarantee", () => {
  it("the router source has no imports from any db module", () => {
    const source = readFileSync(
      join(process.cwd(), "packages/core/src/server/routers/securityMetrics.ts"),
      "utf8"
    );
    expect(source).not.toMatch(/from\s+["'][^"']*\/db["']/);
    expect(source).not.toContain("src/db");
  });
});
