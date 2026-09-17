import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZodError } from "zod";
import { TRPCError } from "@trpc/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * NIS2 Evidence Repository router (server/routers/evidenceRepository.ts) —
 * contract tests (QA cycle 24, NIS2 Implementation Plan Phase 6 Task 6.2 /
 * ENISA evidence measures).
 *
 * Mirrors securityMetricsRouter.test.ts / policyTemplatesNis2Router.test.ts:
 * the router is a factory `createEvidenceRepositoryRouter(t, protectedProcedure)`
 * tested with a tiny fake tRPC builder — no tRPC server, no DB. The engines
 * underneath (lib/nis2/evidenceRepository.ts) are pure; the router only
 * validates input with zod and forwards to the engine.
 *
 * Contract under test — exactly three `.query` procedures (never mutations),
 * registered by the app router under the `evidenceRepository:` prefix:
 *   suggest    protected.query  input evidenceRepositorySuggestInputSchema
 *   auditTrail protected.query  input evidenceRepositoryAuditTrailInputSchema
 *   analyze    protected.query  input evidenceRepositoryAnalyzeInputSchema
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
 *     the clock option (now: string | number, clock: function) nor by row
 *     date fields (updatedAt / lastVerified / expirationDate accept ISO
 *     strings or epoch numbers only) and surface as BAD_REQUEST;
 *   - auditTrail/analyze row `id` is REQUIRED at the router layer (zod),
 *     while the engine tolerates its absence ("" fallback);
 *   - valid (incl. degenerate) input is forwarded to the engine untouched;
 *   - the router and the engine are pure: no DB imports, no Math.random
 *     (source-text scan).
 *
 * Exported zod schemas are part of the contract so callers can reuse
 * validation: evidenceRepositorySuggestInputSchema,
 * evidenceRepositoryAuditTrailRowSchema, evidenceRepositoryAuditTrailInputSchema,
 * evidenceRepositoryAnalysisRowSchema, evidenceRepositoryAnalyzeInputSchema.
 */

const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

// Same `src/db` mock as the sibling router tests — the evidence repository
// router never touches it, and this asserts that fact.
vi.mock("../../db", () => ({
  getDb: dbMocks.getDb,
}));

import { createEvidenceRepositoryRouter } from "../../server/routers/evidenceRepository";

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
  const router = createEvidenceRepositoryRouter(t, procedure);
  return { router };
}

const NOW = new Date("2026-08-21T08:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const iso = (daysFromNow: number) => new Date(NOW.getTime() + daysFromNow * DAY_MS).toISOString();
const USER = { id: 1, role: "owner" as const };

const VALID_SUGGEST_INPUT = {
  measureId: "4.1",
  category: "continuity",
  requirementText: "disaster recovery plan",
  limit: 3,
};

const VALID_AUDIT_TRAIL_INPUT = {
  rows: [
    { id: 1, evidenceId: "EVD-101", status: "verified", type: "risk-assessment", owner: "S. Rehman", fileCount: 4, updatedAt: iso(-21) },
    { id: 2, evidenceId: "EVD-102", status: "pending", fileCount: 0, updatedAt: iso(-2) },
    { id: 3, status: "bogus", updatedAt: iso(-5) },
  ],
  now: NOW.toISOString(),
};

const VALID_ANALYZE_INPUT = {
  rows: [
    { id: 1, evidenceId: "EVD-101", status: "verified", type: "risk-assessment", owner: "S. Rehman", fileCount: 4, systemId: "SEC-CORE", lastVerified: iso(-21), expirationDate: iso(120), intervalDays: 365 },
    { id: 2, evidenceId: "EVD-102", status: "pending", lastVerified: iso(-80), expirationDate: iso(-5), intervalDays: 90 },
  ],
  now: NOW.toISOString(),
};

beforeEach(() => {
  dbMocks.getDb.mockReset();
});

describe("evidenceRepository router — route shape", () => {
  it("exposes suggest, auditTrail and analyze, all as query procedures (no mutations)", () => {
    const { router } = buildFakeTRPC();
    for (const name of ["suggest", "auditTrail", "analyze"]) {
      expect(router[name], `route "${name}"`).toBeDefined();
      expect(typeof router[name].handler, `route "${name}" handler`).toBe("function");
      expect(router[name].type, `route "${name}" type`).toBe("query");
      expect(router[name].schema, `route "${name}" schema`).toBeDefined();
    }
    // the router must not expose any mutation routes
    expect(Object.values(router).every((route: any) => route?.type !== "mutation")).toBe(true);
  });
});

describe("evidenceRepository router — protected procedures reject unauthenticated callers", () => {
  it("all three procedures reject a missing user with TRPCError UNAUTHORIZED", async () => {
    const { router } = buildFakeTRPC();
    const calls = [
      router.suggest.handler({ input: VALID_SUGGEST_INPUT, ctx: {} }),
      router.auditTrail.handler({ input: VALID_AUDIT_TRAIL_INPUT, ctx: {} }),
      router.analyze.handler({ input: VALID_ANALYZE_INPUT, ctx: {} }),
    ];
    for (const call of calls) {
      await expect(call).rejects.toBeInstanceOf(TRPCError);
      await expect(call).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    }
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });
});

describe("evidenceRepository router — suggest", () => {
  it("forwards valid input and returns the engine's suggestions contract", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.suggest.handler({ input: VALID_SUGGEST_INPUT, ctx: { user: USER } });
    expect(result.suggestions.length).toBeGreaterThan(0);
    expect(result.suggestions.length).toBeLessThanOrEqual(3);
    for (const item of result.suggestions) {
      expect(item).toMatchObject({ measureId: "4.1" });
      expect(typeof item.title).toBe("string");
      expect(Array.isArray(item.evidenceTypes)).toBe(true);
      expect(typeof item.score).toBe("number");
      expect(typeof item.matchReason).toBe("string");
    }
  });

  it("empty input returns the full ranked catalog (13 suggestions)", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.suggest.handler({ input: {}, ctx: { user: USER } });
    expect(result.suggestions).toHaveLength(13);
    const scores = result.suggestions.map((s: { score: number }) => s.score);
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
    }
  });

  it("rejects type mismatches (input as string, measureId as number, limit as string)", async () => {
    const { router } = buildFakeTRPC();
    const schema = router.suggest.schema;
    expect(schema).toBeDefined();
    expect(() => schema.parse("nope")).toThrow(ZodError);
    expect(() => schema.parse({ measureId: 42 })).toThrow(ZodError);
    expect(() => schema.parse({ category: 42 })).toThrow(ZodError);
    expect(() => schema.parse({ requirementText: 42 })).toThrow(ZodError);
    expect(() => schema.parse({ limit: "5" })).toThrow(ZodError);
    expect(schema.parse({})).toBeDefined();
    expect(schema.parse({ measureId: "4.1", limit: 5 })).toBeDefined();

    const call = router.suggest.handler({ input: { limit: "5" }, ctx: { user: USER } });
    await expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("evidenceRepository router — auditTrail", () => {
  it("forwards valid input and returns the engine's audit-trail contract", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.auditTrail.handler({
      input: VALID_AUDIT_TRAIL_INPUT,
      ctx: { user: USER },
    });
    expect(result.events).toHaveLength(3);
    expect(result.summary.totals.total).toBe(3);
    expect(result.summary.totals.byStatus).toMatchObject({ verified: 1, pending: 2 });
    expect(result.summary.withOwner).toBe(1);
    expect(result.summary.withFiles).toBe(1);
    // most-recent-first
    const times = result.events.map((e: { updatedAt: Date | null }) => e.updatedAt?.getTime());
    expect(times[0]!).toBeGreaterThanOrEqual(times[1]!);
    // loose enum strings pass zod and are engine-coerced ("bogus" -> pending)
    expect(result.events.find((e: { id: number }) => e.id === 3)!.status).toBe("pending");
  });

  it("accepts an empty rows list and returns the zeroed safe shape", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.auditTrail.handler({ input: { rows: [] }, ctx: { user: USER } });
    expect(result.events).toEqual([]);
    expect(result.summary.totals.total).toBe(0);
  });

  it("rejects type mismatches (rows as string, missing required id, Date object updatedAt, id as boolean)", async () => {
    const { router } = buildFakeTRPC();
    const schema = router.auditTrail.schema;
    expect(schema).toBeDefined();
    expect(() => schema.parse({ rows: "nope" })).toThrow(ZodError);
    expect(() => schema.parse({ rows: [{}] })).toThrow(ZodError); // id required
    expect(() => schema.parse({ rows: [{ id: 1, updatedAt: new Date() }] })).toThrow(ZodError);
    expect(() => schema.parse({ rows: [{ id: true }] })).toThrow(ZodError);
    expect(() => schema.parse({ rows: [{ id: 1, fileCount: "3" }] })).toThrow(ZodError);
    // loose enum strings accepted by zod (engine coerces them)
    expect(() => schema.parse({ rows: [{ id: 1, status: "bogus" }] })).not.toThrow();
    expect(schema.parse({})).toBeDefined();

    const call = router.auditTrail.handler({
      input: { rows: [{ id: 1, updatedAt: new Date() }] },
      ctx: { user: USER },
    });
    await expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("evidenceRepository router — analyze", () => {
  it("forwards valid input and returns the engine's analysis contract", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.analyze.handler({ input: VALID_ANALYZE_INPUT, ctx: { user: USER } });
    expect(result.rows).toHaveLength(2);
    expect(result.overall.counts.total).toBe(2);
    expect(result.overall.counts.verified).toBe(1);
    for (const row of result.rows) {
      expect(row).toMatchObject({
        id: expect.any(Number),
        status: expect.any(String),
        qualityScore: expect.any(Number),
        qualityBand: expect.any(String),
        freshness: expect.any(String),
        cadence: expect.any(String),
        nextAction: expect.any(String),
      });
    }
    expect(result.overall.avgQualityScore).toBeTypeOf("number");
    expect(result.overall.coverageRate).toBe(50); // 1 of 2 verified
    expect(Array.isArray(result.overall.recommendations)).toBe(true);
  });

  it("rejects type mismatches (rows as number, Date object lastVerified/expirationDate, id missing, intervalDays as string)", async () => {
    const { router } = buildFakeTRPC();
    const schema = router.analyze.schema;
    expect(schema).toBeDefined();
    expect(() => schema.parse({ rows: 42 })).toThrow(ZodError);
    expect(() => schema.parse({ rows: [{}] })).toThrow(ZodError); // id required
    expect(() => schema.parse({ rows: [{ id: 1, lastVerified: new Date() }] })).toThrow(ZodError);
    expect(() => schema.parse({ rows: [{ id: 1, expirationDate: new Date() }] })).toThrow(ZodError);
    expect(() => schema.parse({ rows: [{ id: 1, intervalDays: "90" }] })).toThrow(ZodError);
    expect(() => schema.parse({ rows: [{ id: 1, status: 7 }] })).toThrow(ZodError);
    // loose enum strings accepted by zod (engine coerces them)
    expect(() => schema.parse({ rows: [{ id: 1, status: "bogus" }] })).not.toThrow();
    expect(schema.parse({})).toBeDefined();

    const call = router.analyze.handler({
      input: { rows: [{ id: 1, lastVerified: new Date() }] },
      ctx: { user: USER },
    });
    await expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("evidenceRepository router — shared clock options", () => {
  it("accepts string/number `now` and a `clock` factory; rejects Date objects", async () => {
    const { router } = buildFakeTRPC();
    expect(() => router.auditTrail.schema.parse({ now: NOW.toISOString() })).not.toThrow();
    expect(() => router.auditTrail.schema.parse({ now: 12345 })).not.toThrow();
    expect(() => router.auditTrail.schema.parse({ clock: () => new Date() })).not.toThrow();
    expect(() => router.auditTrail.schema.parse({ now: new Date() })).toThrow(ZodError);
    expect(() => router.auditTrail.schema.parse({ clock: "not-a-function" })).toThrow(ZodError);
    expect(() => router.analyze.schema.parse({ now: new Date() })).toThrow(ZodError);
  });
});

describe("evidenceRepository router — exported zod schemas", () => {
  it("exports all five input/item schemas for reuse", async () => {
    const mod = await import("../../server/routers/evidenceRepository");
    for (const name of [
      "evidenceRepositorySuggestInputSchema",
      "evidenceRepositoryAuditTrailRowSchema",
      "evidenceRepositoryAuditTrailInputSchema",
      "evidenceRepositoryAnalysisRowSchema",
      "evidenceRepositoryAnalyzeInputSchema",
    ]) {
      expect((mod as Record<string, unknown>)[name], `export "${name}"`).toBeDefined();
    }
    const modAny = mod as any;
    expect(modAny.evidenceRepositorySuggestInputSchema.parse({ measureId: "1.1", limit: 2 })).toBeDefined();
    expect(() => modAny.evidenceRepositorySuggestInputSchema.parse({ limit: "x" })).toThrow(ZodError);
    expect(modAny.evidenceRepositoryAuditTrailRowSchema.parse({ id: 1, status: "verified" })).toBeDefined();
    expect(() => modAny.evidenceRepositoryAuditTrailRowSchema.parse({ status: "verified" })).toThrow(ZodError);
    expect(() => modAny.evidenceRepositoryAuditTrailRowSchema.parse({ id: 1, updatedAt: new Date() })).toThrow(ZodError);
    expect(modAny.evidenceRepositoryAuditTrailInputSchema.parse({ rows: [] })).toBeDefined();
    expect(() => modAny.evidenceRepositoryAuditTrailInputSchema.parse({ rows: 1 })).toThrow(ZodError);
    expect(modAny.evidenceRepositoryAnalysisRowSchema.parse({ id: "x", intervalDays: 90 })).toBeDefined();
    expect(() => modAny.evidenceRepositoryAnalysisRowSchema.parse({ intervalDays: 90 })).toThrow(ZodError);
    expect(() => modAny.evidenceRepositoryAnalysisRowSchema.parse({ id: 1, lastVerified: {} })).toThrow(ZodError);
    expect(modAny.evidenceRepositoryAnalyzeInputSchema.parse({ rows: [] })).toBeDefined();
    expect(() => modAny.evidenceRepositoryAnalyzeInputSchema.parse({ rows: "x" })).toThrow(ZodError);
  });
});

describe("evidenceRepository router — purity guarantee", () => {
  it("the router source has no imports from any db module and no Math.random", () => {
    const source = readFileSync(
      join(process.cwd(), "packages/core/src/server/routers/evidenceRepository.ts"),
      "utf8"
    );
    expect(source).not.toMatch(/from\s+["'][^"']*\/db["']/);
    expect(source).not.toContain("src/db");
    expect(source).not.toContain("Math.random");
  });

  it("the engine source has no imports from any db module, no network, no Math.random", () => {
    const source = readFileSync(
      join(process.cwd(), "packages/core/src/lib/nis2/evidenceRepository.ts"),
      "utf8"
    );
    // Strip comment blocks so rule *descriptions* (e.g. "no Math.random")
    // don't trip the scan; only executable code must stay pure.
    const codeOnly = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(codeOnly).not.toMatch(/from\s+["'][^"']*\/db["']/);
    expect(codeOnly).not.toContain("src/db");
    expect(codeOnly).not.toContain("Math.random");
    expect(codeOnly).not.toContain("fetch(");
  });
});
