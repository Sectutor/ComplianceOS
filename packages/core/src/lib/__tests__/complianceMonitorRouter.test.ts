import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZodError } from "zod";
import { TRPCError } from "@trpc/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * NIS2 Continuous Compliance Monitoring router (server/routers/complianceMonitor.ts)
 * — contract tests (QA cycle 22, NIS2 Phase 5 Task 5.2 / ENISA Measure 7.1 /
 * NIS2 Art. 21(2)(f)).
 *
 * Mirrors securityTestingNis2Router.test.ts / vulnerabilityMgmtRouter.test.ts:
 * the router is a factory `createComplianceMonitorRouter(t, protectedProcedure)`
 * tested with a tiny fake tRPC builder — no tRPC server, no DB. The engines
 * underneath (lib/nis2/complianceMonitor.ts) are pure; the router only
 * validates input with zod and forwards to the engine.
 *
 * Contract under test — exactly three `.query` procedures (never mutations),
 * registered by the app router under the `complianceMonitor:` prefix:
 *   posture          protected.query  input complianceMonitorPostureInputSchema
 *   evidenceCoverage protected.query  input complianceMonitorEvidenceCoverageInputSchema
 *   auditReport      protected.query  input complianceMonitorAuditReportInputSchema
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
 * validation: clockOptionSchema, complianceMonitorMeasureSchema,
 * complianceMonitorEvidenceItemSchema, complianceMonitorPostureInputSchema,
 * complianceMonitorEvidenceCoverageInputSchema,
 * complianceMonitorAuditReportInputSchema.
 */

const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

// Same `src/db` mock as the sibling router tests — the compliance monitoring
// router never touches it, and this asserts that fact.
vi.mock("../../db", () => ({
  getDb: dbMocks.getDb,
}));

import { createComplianceMonitorRouter } from "../../server/routers/complianceMonitor";

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
  const router = createComplianceMonitorRouter(t, procedure);
  return { router };
}

const NOW = new Date("2026-08-19T00:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const iso = (msOffset: number) => new Date(NOW.getTime() + msOffset).toISOString();
const USER = { id: 1, role: "owner" as const };

const VALID_POSTURE_INPUT = {
  measures: [
    { measureId: "m1", name: "Risk analysis", score: 90, baselineScore: 85 }, // +5
    { measureId: "m2", name: "Supply chain", score: 60, baselineScore: 65 }, // -5
    { measureId: "m3", name: "Incident handling", score: 40, baselineScore: 40 }, // 0
  ],
  now: NOW.toISOString(),
};

const VALID_EVIDENCE_INPUT = {
  items: [
    { controlId: "c1", measureId: "m1", name: "Control 1", evidenceCount: 3, expiresAt: iso(30 * DAY_MS) },
    { controlId: "c2", measureId: "m1", name: "Control 2", evidenceCount: 0, expiresAt: iso(-1) },
  ],
  now: NOW.toISOString(),
};

const VALID_AUDIT_INPUT = {
  entityName: "Acme GmbH",
  entitySector: "Energy",
  measures: [
    { measureId: "m1", name: "Risk analysis", score: 90 },
    { measureId: "m2", name: "Supply chain", score: 55 },
  ],
  evidenceSummary: { total: 10, covered: 8, coverageRate: 80 },
  now: NOW.toISOString(),
};

beforeEach(() => {
  dbMocks.getDb.mockReset();
});

describe("complianceMonitor router — route shape", () => {
  it("exposes exactly posture, evidenceCoverage and auditReport, all as query procedures (no mutations)", () => {
    const { router } = buildFakeTRPC();
    expect(Object.keys(router).sort()).toEqual(["auditReport", "evidenceCoverage", "posture"]);
    for (const name of ["posture", "evidenceCoverage", "auditReport"]) {
      expect(router[name], `route "${name}"`).toBeDefined();
      expect(typeof router[name].handler, `route "${name}" handler`).toBe("function");
      expect(router[name].type, `route "${name}" type`).toBe("query");
    }
    // the router must not expose any mutation routes
    expect(Object.values(router).every((route: any) => route?.type !== "mutation")).toBe(true);
  });

  it("attaches a zod input schema to every query route", () => {
    const { router } = buildFakeTRPC();
    for (const name of ["posture", "evidenceCoverage", "auditReport"]) {
      expect(router[name].schema, `route "${name}" schema`).toBeDefined();
      expect(typeof router[name].schema.parse, `route "${name}" schema.parse`).toBe("function");
    }
  });
});

describe("complianceMonitor router — protected procedures reject unauthenticated callers", () => {
  it("all three procedures reject a missing user with TRPCError UNAUTHORIZED", async () => {
    const { router } = buildFakeTRPC();
    const calls = [
      router.posture.handler({ input: VALID_POSTURE_INPUT, ctx: {} }),
      router.evidenceCoverage.handler({ input: VALID_EVIDENCE_INPUT, ctx: {} }),
      router.auditReport.handler({ input: VALID_AUDIT_INPUT, ctx: {} }),
    ];
    for (const call of calls) {
      await expect(call).rejects.toBeInstanceOf(TRPCError);
      await expect(call).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    }
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });
});

describe("complianceMonitor router — posture", () => {
  it("forwards valid input and returns the engine's compliance-posture contract", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.posture.handler({ input: VALID_POSTURE_INPUT, ctx: { user: USER } });
    expect(result.overallScore).toBe(63.3); // (90 + 60 + 40) / 3
    expect(result.status).toBe("At Risk");
    expect(result.coverageRate).toBe(100);
    expect(result.totalMeasures).toBe(3);
    expect(result.assessedMeasures).toBe(3);
    expect(result.statusCounts).toEqual({ strong: 1, developing: 0, atRisk: 2, critical: 0, noData: 0 });
    expect(result.topGaps[0]).toMatchObject({ measureId: "m3", score: 40 }); // score asc
    expect(result.driftPts).toBe(0); // (5 + -5 + 0) / 3
    expect(result.trend).toBe("stable");
  });

  it("never throws for degenerate-but-valid input (empty object)", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.posture.handler({ input: {}, ctx: { user: USER } });
    expect(result.overallScore).toBe(0);
    expect(result.status).toBe("No Data");
    expect(result.totalMeasures).toBe(0);
  });

  it("rejects type mismatches (measures as string, score as string) with BAD_REQUEST", async () => {
    const { router } = buildFakeTRPC();
    const schema = router.posture.schema;
    expect(() => schema.parse({ measures: "nope" })).toThrow(ZodError);
    expect(() => schema.parse({ measures: [{ measureId: "m1", score: "90" }] })).toThrow(ZodError);
    expect(schema.parse({ measures: [] })).toBeDefined();

    const call = router.posture.handler({ input: { measures: "nope" }, ctx: { user: USER } });
    await expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("complianceMonitor router — evidenceCoverage", () => {
  it("forwards valid input and returns the engine's evidence-coverage contract", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.evidenceCoverage.handler({ input: VALID_EVIDENCE_INPUT, ctx: { user: USER } });
    expect(result.totalItems).toBe(2);
    expect(result.coveredCount).toBe(1);
    expect(result.missingCount).toBe(1);
    expect(result.coverageRate).toBe(50);
    expect(result.expiringCount).toBe(1); // c1 expires in 30d
    expect(result.expiredCount).toBe(0);
    expect(result.currentCount).toBe(0);
    expect(result.avgEvidencePerControl).toBe(1.5); // (3 + 0) / 2 items
    expect(result.items.map((i: any) => [i.controlId, i.status, i.expiry])).toEqual([
      ["c1", "covered", "expiring"],
      ["c2", "missing", "n-a"],
    ]);
  });

  it("never throws for degenerate-but-valid input (empty object)", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.evidenceCoverage.handler({ input: {}, ctx: { user: USER } });
    expect(result.totalItems).toBe(0);
    expect(result.coverageRate).toBe(0);
    expect(result.items).toEqual([]);
  });

  it("rejects type mismatches (items as string, evidenceCount as string) with BAD_REQUEST", async () => {
    const { router } = buildFakeTRPC();
    const schema = router.evidenceCoverage.schema;
    expect(() => schema.parse({ items: "nope" })).toThrow(ZodError);
    expect(() => schema.parse({ items: [{ controlId: "c1", evidenceCount: "3" }] })).toThrow(ZodError);
    expect(schema.parse({ items: [] })).toBeDefined();

    const call = router.evidenceCoverage.handler({ input: { items: "nope" }, ctx: { user: USER } });
    await expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("complianceMonitor router — auditReport", () => {
  it("forwards valid input and returns the engine's audit-report contract", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.auditReport.handler({ input: VALID_AUDIT_INPUT, ctx: { user: USER } });
    expect(result.postureScore).toBe(72.5); // (90 + 55) / 2
    expect(result.coverageRate).toBe(80);
    expect(result.topGaps).toHaveLength(1);
    expect(result.topGaps[0]).toMatchObject({ measureId: "m2", score: 55 });
    expect(result.recommendationCount).toBe(1);
    expect(result.sections).toHaveLength(4);
    expect(result.generatedAt).toBe(NOW.toISOString());
    expect(result.report).toContain("Acme GmbH");
  });

  it("never throws for degenerate-but-valid input (empty object)", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.auditReport.handler({ input: {}, ctx: { user: USER } });
    expect(result.postureScore).toBe(0);
    expect(result.coverageRate).toBe(0);
    expect(result.recommendationCount).toBe(0);
    expect(result.sections).toHaveLength(4);
  });

  it("rejects type mismatches (measures as string, evidenceSummary as number) with BAD_REQUEST", async () => {
    const { router } = buildFakeTRPC();
    const schema = router.auditReport.schema;
    expect(() => schema.parse({ measures: "nope" })).toThrow(ZodError);
    expect(() => schema.parse({ measures: [{ measureId: "m1", score: "90" }] })).toThrow(ZodError);
    expect(() => schema.parse({ evidenceSummary: 42 })).toThrow(ZodError);
    expect(() => schema.parse({ evidenceSummary: { coverageRate: "80" } })).toThrow(ZodError);
    expect(schema.parse({})).toBeDefined();

    const call = router.auditReport.handler({ input: { measures: "nope" }, ctx: { user: USER } });
    await expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("complianceMonitor router — shared clock options and item date fields", () => {
  it("accepts string/number `now` and a `clock` factory; rejects Date objects and non-function clocks", async () => {
    const { router } = buildFakeTRPC();
    for (const route of ["posture", "evidenceCoverage", "auditReport"]) {
      const schema = router[route].schema;
      expect(() => schema.parse({ now: "2026-08-19T00:00:00.000Z" }), `${route} ISO now`).not.toThrow();
      expect(() => schema.parse({ now: 12345 }), `${route} epoch now`).not.toThrow();
      expect(() => schema.parse({ clock: () => new Date() }), `${route} clock fn`).not.toThrow();
      expect(() => schema.parse({ now: new Date() }), `${route} Date now`).toThrow(ZodError);
      expect(() => schema.parse({ clock: "not-a-function" }), `${route} clock string`).toThrow(ZodError);
    }
  });

  it("rejects Date objects in item date fields and type-mismatched item fields (ISO strings only)", async () => {
    const { router } = buildFakeTRPC();
    expect(() =>
      router.evidenceCoverage.schema.parse({ items: [{ controlId: "c1", expiresAt: new Date() }] })
    ).toThrow(ZodError);
    expect(() =>
      router.evidenceCoverage.schema.parse({ items: [{ controlId: "c1", lastCollectedAt: new Date() }] })
    ).toThrow(ZodError);
    expect(() =>
      router.posture.schema.parse({ measures: [{ measureId: "m1", baselineScore: "80" }] })
    ).toThrow(ZodError);

    const call = router.evidenceCoverage.handler({
      input: { items: [{ controlId: "c1", expiresAt: new Date() }] },
      ctx: { user: USER },
    });
    await expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("complianceMonitor router — exported zod schemas", () => {
  const SCHEMA_NAMES = [
    "clockOptionSchema",
    "complianceMonitorMeasureSchema",
    "complianceMonitorEvidenceItemSchema",
    "complianceMonitorPostureInputSchema",
    "complianceMonitorEvidenceCoverageInputSchema",
    "complianceMonitorAuditReportInputSchema",
  ];

  it("exports all six schemas for reuse", async () => {
    const mod = await import("../../server/routers/complianceMonitor");
    for (const name of SCHEMA_NAMES) {
      expect((mod as Record<string, unknown>)[name], `export "${name}"`).toBeDefined();
      expect(typeof (mod as Record<string, unknown>)[name], `export "${name}" is a schema`).toBe("object");
    }
  });

  it("each exported schema parses valid fixtures and rejects type-mismatched input", async () => {
    const mod = (await import("../../server/routers/complianceMonitor")) as any;
    expect(mod.clockOptionSchema.parse({ now: "2026-08-19T00:00:00.000Z" })).toBeDefined();
    expect(mod.clockOptionSchema.parse({ now: 12345 })).toBeDefined();
    expect(mod.clockOptionSchema.parse({ clock: () => new Date() })).toBeDefined();
    expect(() => mod.clockOptionSchema.parse({ now: new Date() })).toThrow(ZodError);
    expect(() => mod.clockOptionSchema.parse({ clock: "nope" })).toThrow(ZodError);

    expect(
      mod.complianceMonitorMeasureSchema.parse({ measureId: "m1", name: "Risk analysis", score: 90, baselineScore: 80 })
    ).toBeDefined();
    expect(() => mod.complianceMonitorMeasureSchema.parse({ score: "90" })).toThrow(ZodError);

    expect(
      mod.complianceMonitorEvidenceItemSchema.parse({
        controlId: "c1",
        measureId: "m1",
        name: "Control 1",
        evidenceCount: 3,
        expiresAt: "2026-09-18T00:00:00.000Z",
      })
    ).toBeDefined();
    expect(() => mod.complianceMonitorEvidenceItemSchema.parse({ evidenceCount: "3" })).toThrow(ZodError);

    expect(mod.complianceMonitorPostureInputSchema.parse({ measures: [], now: 1 })).toBeDefined();
    expect(() => mod.complianceMonitorPostureInputSchema.parse({ measures: 1 })).toThrow(ZodError);
    expect(mod.complianceMonitorEvidenceCoverageInputSchema.parse({ items: [] })).toBeDefined();
    expect(() => mod.complianceMonitorEvidenceCoverageInputSchema.parse({ items: "x" })).toThrow(ZodError);
    expect(mod.complianceMonitorAuditReportInputSchema.parse({ entityName: "Acme GmbH" })).toBeDefined();
    expect(() => mod.complianceMonitorAuditReportInputSchema.parse({ measures: "x" })).toThrow(ZodError);
  });
});

describe("complianceMonitor router — no-db guarantee", () => {
  it("never touches the DB behaviorally", async () => {
    const { router } = buildFakeTRPC();
    await router.posture.handler({ input: VALID_POSTURE_INPUT, ctx: { user: USER } });
    await router.evidenceCoverage.handler({ input: VALID_EVIDENCE_INPUT, ctx: { user: USER } });
    await router.auditReport.handler({ input: VALID_AUDIT_INPUT, ctx: { user: USER } });
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });

  it("the router source has no db imports, getDb or db.select", () => {
    const source = readFileSync(
      join(process.cwd(), "packages/core/src/server/routers/complianceMonitor.ts"),
      "utf8"
    );
    expect(source).not.toContain("getDb");
    expect(source).not.toContain("db.select");
    expect(source).not.toMatch(/from\s+["'][^"']*\/db["']/);
    expect(source).not.toContain("src/db");
  });
});
