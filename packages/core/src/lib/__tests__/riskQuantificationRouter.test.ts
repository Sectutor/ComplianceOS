import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZodError } from "zod";
import { TRPCError } from "@trpc/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * NIS2 Risk Quantification router (server/routers/riskQuantification.ts)
 * — contract tests (QA cycle 26, NIS2 Phase 1 Task 1.2 "Risk Quantification
 * Engine").
 *
 * Mirrors threatLandscapeRouter.test.ts / securityMetricsRouter.test.ts:
 * the router is a factory `createRiskQuantificationRouter(t, protectedProcedure)`
 * tested with a tiny fake tRPC builder — no tRPC server, no DB. The engine
 * underneath (lib/nis2/riskQuantification.ts) is pure; the router only
 * validates input with zod and forwards to the engine.
 *
 * Contract under test — exactly four `.query` procedures (never mutations),
 * registered by the app router under the `riskQuantification:` prefix:
 *   appetite       protected.query  input riskQuantificationAppetiteInputSchema
 *   matrix         protected.query  input riskQuantificationMatrixInputSchema
 *   residual       protected.query  input riskQuantificationResidualInputSchema
 *   treatmentPlans protected.query  input riskQuantificationTreatmentPlansInputSchema
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
 *     never a raw crash inside the handler;
 *   - scale fields stay loose at the boundary (likelihood/impact accept any
 *     string | number — unknown values are engine-coerced to safe neutral
 *     results internally, see riskQuantification.test.ts), while structural
 *     types are strict (risks must be an array, rows must be objects,
 *     controls must be a string array);
 *   - clock options: `now` accepts string | number only (Date objects are
 *     rejected -> BAD_REQUEST at the boundary even though the pure engine
 *     accepts them), `clock` accepts a factory function;
 *   - nullish collections fall through to the engine's safe EMPTY_* shapes;
 *   - the router and the engine are pure: no DB imports, no Math.random, no
 *     Date.now (source-text scan, comments stripped).
 *
 * Exported zod schemas are part of the contract so callers can reuse
 * validation: riskQuantificationClockOptionSchema,
 * riskQuantificationRiskRowSchema, riskQuantificationAppetiteConfigSchema,
 * riskQuantificationAppetiteInputSchema, riskQuantificationMatrixInputSchema,
 * riskQuantificationResidualInputSchema,
 * riskQuantificationTreatmentPlansInputSchema.
 */

const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

// Same `src/db` mock as the sibling router tests — the risk quantification
// router never touches it, and this asserts that fact.
vi.mock("../../db", () => ({
  getDb: dbMocks.getDb,
}));

import { createRiskQuantificationRouter } from "../../server/routers/riskQuantification";

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
  const router = createRiskQuantificationRouter(t, procedure);
  return { router };
}

const NOW = new Date("2026-03-01T00:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const iso = (ms: number) => new Date(ms).toISOString();
const USER = { id: 1, role: "owner" as const };

const VALID_APPETITE_INPUT = {
  risks: [
    { id: 1, name: "Ransomware", likelihood: 4, impact: 4 }, // 16 -> exceeded (12 * 1.1 = 13.2)
    { id: 2, name: "Phishing", likelihood: "likely", impact: "moderate" }, // 12 -> within
  ],
  config: { appetiteScore: 12, tolerancePct: 10, appetiteAnnualLossEur: 100000 },
};

const VALID_MATRIX_INPUT = {
  risks: [
    { id: 1, name: "Ransomware", likelihood: 5, impact: 5 }, // 25 critical
    { id: 2, name: "Data loss", likelihood: 2, impact: 2 }, // 4 low
  ],
};

const VALID_RESIDUAL_INPUT = {
  risks: [{ id: 1, name: "Ransomware", likelihood: 4, impact: 4, controls: ["a", "b"] }],
  appetiteScore: 12,
};

const VALID_TREATMENT_INPUT = {
  risks: [{ id: 1, name: "Ransomware", likelihood: 4, impact: 4, owner: "sec-team" }],
  horizonDays: 14,
  threshold: 10,
  now: NOW.getTime(),
};

beforeEach(() => {
  dbMocks.getDb.mockReset();
});

describe("riskQuantification router — route shape", () => {
  it("exposes appetite, matrix, residual and treatmentPlans, all as query procedures (no mutations)", () => {
    const { router } = buildFakeTRPC();
    for (const name of ["appetite", "matrix", "residual", "treatmentPlans"]) {
      expect(router[name], `route "${name}"`).toBeDefined();
      expect(typeof router[name].handler, `route "${name}" handler`).toBe("function");
      expect(router[name].type, `route "${name}" type`).toBe("query");
      expect(router[name].schema, `route "${name}" schema`).toBeDefined();
    }
    // the router must not expose any mutation routes
    expect(Object.values(router).every((route: any) => route?.type !== "mutation")).toBe(true);
  });
});

describe("riskQuantification router — protected procedures reject unauthenticated callers", () => {
  it("all four procedures reject a missing user with TRPCError UNAUTHORIZED", async () => {
    const { router } = buildFakeTRPC();
    const calls = [
      router.appetite.handler({ input: VALID_APPETITE_INPUT, ctx: {} }),
      router.matrix.handler({ input: VALID_MATRIX_INPUT, ctx: {} }),
      router.residual.handler({ input: VALID_RESIDUAL_INPUT, ctx: {} }),
      router.treatmentPlans.handler({ input: VALID_TREATMENT_INPUT, ctx: {} }),
    ];
    for (const call of calls) {
      await expect(call).rejects.toBeInstanceOf(TRPCError);
      await expect(call).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    }
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });
});

describe("riskQuantification router — appetite", () => {
  it("forwards valid input and returns the engine's appetite contract", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.appetite.handler({ input: VALID_APPETITE_INPUT, ctx: { user: USER } });
    expect(result).toMatchObject({
      totalRisks: 2,
      assessedCount: 2,
      withinCount: 1,
      exceededCount: 1,
      avgScore: 14,
    });
    expect(result.breaches).toEqual([{ id: 1, name: "Ransomware", score: 16, verdict: "exceeded" }]);
    expect(result.recommendations.some((r: string) => r.includes("exceed the risk appetite"))).toBe(true);
  });

  it("keeps scale fields loose at the boundary (unknown keywords pass zod, engine coerces)", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.appetite.handler({
      input: { risks: [{ id: 1, likelihood: "bogus", impact: 3 }] },
      ctx: { user: USER },
    });
    // invalid likelihood excluded from score math, never clamped
    expect(result.totalRisks).toBe(1);
    expect(result.assessedCount).toBe(0);
  });

  it("rejects type mismatches (risks as string, config as number, appetiteScore as string, tolerancePct as boolean)", async () => {
    const { router } = buildFakeTRPC();
    const schema = router.appetite.schema;
    expect(schema).toBeDefined();
    expect(() => schema.parse("nope")).toThrow(ZodError);
    expect(() => schema.parse({ risks: "nope" })).toThrow(ZodError);
    expect(() => schema.parse({ risks: {}, config: 42 })).toThrow(ZodError);
    expect(() => schema.parse({ risks: [], config: { appetiteScore: "12" } })).toThrow(ZodError);
    expect(() => schema.parse({ risks: [], config: { tolerancePct: true } })).toThrow(ZodError);
    expect(() => schema.parse({ risks: [{ id: 1, controls: "not-an-array" }] })).toThrow(ZodError);
    expect(() => schema.parse({ risks: [{ id: 1, name: 7 }] })).toThrow(ZodError);
    // loose fields + nullish collections accepted
    expect(schema.parse({})).toBeDefined();
    expect(schema.parse({ risks: null, config: null })).toBeDefined();
    expect(schema.parse({ risks: [{ id: 1, likelihood: "bogus" }] })).toBeDefined();

    const call = router.appetite.handler({ input: { risks: "nope" }, ctx: { user: USER } });
    await expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("riskQuantification router — matrix", () => {
  it("forwards valid input and returns the engine's matrix contract", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.matrix.handler({ input: VALID_MATRIX_INPUT, ctx: { user: USER } });
    expect(result.cells).toHaveLength(25); // fixed 5x5 grid
    expect(result.totalAssessed).toBe(2);
    expect(result.byBand).toEqual({ low: 1, medium: 0, high: 0, critical: 1 });
    expect(result.topRisks.map((r: { id: number }) => r.id)).toEqual([1, 2]);
  });

  it("rejects type mismatches (risks as number, row as array, impact as boolean)", async () => {
    const { router } = buildFakeTRPC();
    const schema = router.matrix.schema;
    expect(schema).toBeDefined();
    expect(() => schema.parse(42)).toThrow(ZodError);
    expect(() => schema.parse({ risks: 42 })).toThrow(ZodError);
    expect(() => schema.parse({ risks: [[1, 2]] })).toThrow(ZodError);
    expect(() => schema.parse({ risks: [{ id: 1, impact: true }] })).toThrow(ZodError);
    expect(schema.parse({})).toBeDefined();
    expect(schema.parse({ risks: [] })).toBeDefined();

    const call = router.matrix.handler({ input: { risks: 42 }, ctx: { user: USER } });
    await expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("riskQuantification router — residual", () => {
  it("forwards valid input and returns the engine's residual contract", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.residual.handler({ input: VALID_RESIDUAL_INPUT, ctx: { user: USER } });
    // inherent 16, two controls -> 35% effectiveness -> residual 10.4
    expect(result.rows[0]).toMatchObject({
      id: 1,
      inherent: 16,
      residual: 10.4,
      delta: 5.6,
      reductionPct: 35,
      direction: "reduced",
    });
    expect(result.aboveAppetiteCount).toBe(0);
    expect(result.worst).toHaveLength(1);
  });

  it("rejects type mismatches (appetiteScore as string, risks as boolean)", async () => {
    const { router } = buildFakeTRPC();
    const schema = router.residual.schema;
    expect(schema).toBeDefined();
    expect(() => schema.parse({ risks: true })).toThrow(ZodError);
    expect(() => schema.parse({ appetiteScore: "12" })).toThrow(ZodError);
    expect(() => schema.parse({ risks: [{ controlEffectiveness: "high" }] })).toThrow(ZodError);
    expect(schema.parse({})).toBeDefined();
    expect(schema.parse({ appetiteScore: null })).toBeDefined();

    const call = router.residual.handler({ input: { appetiteScore: "12" }, ctx: { user: USER } });
    await expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("riskQuantification router — treatmentPlans", () => {
  it("forwards valid input and returns the engine's treatment plan contract", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.treatmentPlans.handler({ input: VALID_TREATMENT_INPUT, ctx: { user: USER } });
    expect(result.plannedCount).toBe(1);
    expect(result.plans[0]).toMatchObject({
      id: 1,
      priority: "P0",
      strategy: "mitigate",
      owner: "sec-team",
      deadline: iso(NOW.getTime() + 14 * DAY_MS),
    });
    expect(result.plans[0].actions[0]).toContain("Escalate to the management board");
    expect(result.nextDeadline).toBe(iso(NOW.getTime() + 14 * DAY_MS));
  });

  it("accepts ISO-string now and clock factories; rejects Date objects for now", async () => {
    const { router } = buildFakeTRPC();
    const schema = router.treatmentPlans.schema;
    expect(() => schema.parse({ now: NOW.toISOString() })).not.toThrow();
    expect(() => schema.parse({ now: NOW.getTime() })).not.toThrow();
    expect(() => schema.parse({ clock: () => NOW })).not.toThrow();
    // the pure engine accepts Dates, but the router boundary rejects them
    expect(() => schema.parse({ now: NOW })).toThrow(ZodError);
    expect(() => schema.parse({ clock: "not-a-function" })).toThrow(ZodError);

    const fromIso = await router.treatmentPlans.handler({
      input: { risks: VALID_TREATMENT_INPUT.risks, now: NOW.toISOString(), horizonDays: 14 },
      ctx: { user: USER },
    });
    expect(fromIso.nextDeadline).toBe(iso(NOW.getTime() + 14 * DAY_MS));
  });

  it("rejects type mismatches (horizonDays as string, threshold as boolean, risks as string)", async () => {
    const { router } = buildFakeTRPC();
    const schema = router.treatmentPlans.schema;
    expect(schema).toBeDefined();
    expect(() => schema.parse({ risks: "nope" })).toThrow(ZodError);
    expect(() => schema.parse({ horizonDays: "14" })).toThrow(ZodError);
    expect(() => schema.parse({ threshold: true })).toThrow(ZodError);
    expect(schema.parse({})).toBeDefined();
    expect(schema.parse({ threshold: null, horizonDays: null })).toBeDefined();

    const call = router.treatmentPlans.handler({ input: { horizonDays: "14" }, ctx: { user: USER } });
    await expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("riskQuantification router — nullish input falls through to safe shapes", () => {
  it("empty input yields the engine's zeroed EMPTY_* shapes on every route", async () => {
    const { router } = buildFakeTRPC();
    const appetite = await router.appetite.handler({ input: {}, ctx: { user: USER } });
    expect(appetite).toMatchObject({ totalRisks: 0, assessedCount: 0, breaches: [] });

    const matrix = await router.matrix.handler({ input: {}, ctx: { user: USER } });
    expect(matrix.cells).toHaveLength(25);
    expect(matrix.totalAssessed).toBe(0);

    const residual = await router.residual.handler({ input: {}, ctx: { user: USER } });
    expect(residual).toMatchObject({ totalTracked: 0, rows: [], worst: [] });

    const plans = await router.treatmentPlans.handler({ input: {}, ctx: { user: USER } });
    expect(plans).toMatchObject({ plannedCount: 0, plans: [], nextDeadline: null });
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });
});

describe("riskQuantification router — exported zod schemas", () => {
  it("exports all seven schemas for reuse", async () => {
    const mod = await import("../../server/routers/riskQuantification");
    for (const name of [
      "riskQuantificationClockOptionSchema",
      "riskQuantificationRiskRowSchema",
      "riskQuantificationAppetiteConfigSchema",
      "riskQuantificationAppetiteInputSchema",
      "riskQuantificationMatrixInputSchema",
      "riskQuantificationResidualInputSchema",
      "riskQuantificationTreatmentPlansInputSchema",
    ]) {
      expect((mod as Record<string, unknown>)[name], `export "${name}"`).toBeDefined();
    }
  });

  it("row/config/input schemas parse valid input and reject type-mismatched input", async () => {
    const mod: any = await import("../../server/routers/riskQuantification");
    // row schema: loose scales, strict structure
    expect(mod.riskQuantificationRiskRowSchema.parse({ id: 1, likelihood: "bogus", impact: 9 })).toBeDefined();
    expect(() => mod.riskQuantificationRiskRowSchema.parse({ id: 1, likelihood: true })).toThrow(ZodError);
    expect(() => mod.riskQuantificationRiskRowSchema.parse({ controls: "x" })).toThrow(ZodError);
    expect(() => mod.riskQuantificationRiskRowSchema.parse({ inherentScore: "12" })).toThrow(ZodError);
    // config schema
    expect(mod.riskQuantificationAppetiteConfigSchema.parse({ appetiteScore: 12, tolerancePct: 0 })).toBeDefined();
    expect(() => mod.riskQuantificationAppetiteConfigSchema.parse({ appetiteScore: "12" })).toThrow(ZodError);
    // composite inputs
    expect(mod.riskQuantificationAppetiteInputSchema.parse({ risks: [], config: null })).toBeDefined();
    expect(() => mod.riskQuantificationAppetiteInputSchema.parse({ risks: "x" })).toThrow(ZodError);
    expect(mod.riskQuantificationMatrixInputSchema.parse({ risks: [] })).toBeDefined();
    expect(() => mod.riskQuantificationMatrixInputSchema.parse({ risks: 42 })).toThrow(ZodError);
    expect(mod.riskQuantificationResidualInputSchema.parse({ appetiteScore: 12 })).toBeDefined();
    expect(() => mod.riskQuantificationResidualInputSchema.parse({ appetiteScore: "12" })).toThrow(ZodError);
    expect(
      mod.riskQuantificationTreatmentPlansInputSchema.parse({ horizonDays: 30, threshold: 5, now: 1 }),
    ).toBeDefined();
    expect(() => mod.riskQuantificationTreatmentPlansInputSchema.parse({ threshold: "5" })).toThrow(ZodError);
  });

  it("exports the shared clock option pair (now: string|number|nullish, clock: factory|nullish)", async () => {
    const mod: any = await import("../../server/routers/riskQuantification");
    const { now, clock } = mod.riskQuantificationClockOptionSchema;
    expect(now).toBeDefined();
    expect(clock).toBeDefined();
    expect(now.parse("2026-03-01T00:00:00.000Z")).toBe("2026-03-01T00:00:00.000Z");
    expect(now.parse(1772313600000)).toBe(1772313600000);
    expect(now.parse(null)).toBeNull();
    expect(now.parse(undefined)).toBeUndefined();
    expect(() => now.parse(new Date())).toThrow(ZodError);
    const fn = () => new Date();
    expect(typeof clock.parse(fn)).toBe("function"); // zod v4 wraps functions
    expect(() => clock.parse("not-a-function")).toThrow(ZodError);
  });
});

describe("riskQuantification router — purity guarantee", () => {
  it("the router source has no imports from any db module, no Math.random, no Date.now", () => {
    const source = readFileSync(
      join(process.cwd(), "packages/core/src/server/routers/riskQuantification.ts"),
      "utf8"
    );
    const codeOnly = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(codeOnly).not.toMatch(/from\s+["'][^"']*\/db["']/);
    expect(codeOnly).not.toContain("src/db");
    expect(codeOnly).not.toContain("Math.random");
    expect(codeOnly).not.toContain("Date.now");
  });

  it("the engine source has no imports from any db module, no network, no Math.random, no Date.now", () => {
    const source = readFileSync(
      join(process.cwd(), "packages/core/src/lib/nis2/riskQuantification.ts"),
      "utf8"
    );
    // Strip comment blocks so rule *descriptions* (e.g. "no Math.random")
    // don't trip the scan; only executable code must stay pure.
    const codeOnly = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(codeOnly).not.toMatch(/from\s+["'][^"']*\/db["']/);
    expect(codeOnly).not.toContain("src/db");
    expect(codeOnly).not.toContain("Math.random");
    expect(codeOnly).not.toContain("Date.now");
    expect(codeOnly).not.toContain("fetch(");
  });
});
