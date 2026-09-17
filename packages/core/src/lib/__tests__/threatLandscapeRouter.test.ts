import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZodError } from "zod";
import { TRPCError } from "@trpc/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * NIS2 Threat Landscape Integration router (server/routers/threatLandscape.ts)
 * — contract tests (QA cycle 25, NIS2 Phase 1 Task 1.1 / ENISA Threat
 * Landscape).
 *
 * Mirrors securityMetricsRouter.test.ts / evidenceRepositoryRouter.test.ts:
 * the router is a factory `createThreatLandscapeRouter(t, protectedProcedure)`
 * tested with a tiny fake tRPC builder — no tRPC server, no DB. The engines
 * underneath (lib/nis2/threatLandscape.ts) are pure; the router only
 * validates input with zod and forwards to the engine.
 *
 * Contract under test — exactly four `.query` procedures (never mutations),
 * registered by the app router under the `threatLandscape:` prefix:
 *   classify protected.query  input threatLandscapeClassifyInputSchema
 *   scenarios protected.query input threatLandscapeScenariosInputSchema
 *   tara      protected.query  input threatLandscapeTaraInputSchema
 *   summary   protected.query  input threatLandscapeSummaryInputSchema
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
 *   - enum-ish fields behave differently per route: summary `severity` stays
 *     loose (z.string(), unknown strings engine-coerced to "unknown") while
 *     tara `likelihood` / asset `criticality` are STRICT zod enums
 *     (["Low","Medium","High"] / ["Critical","High","Medium","Low"]) so loose
 *     enum strings are REJECTED at the router boundary — the engine itself
 *     still coerces unknown values internally (see threatLandscape.test.ts).
 *     `riskBand` is output-only: it is not an accepted tara input field (zod
 *     strips it) and is never read by the engine;
 *   - clock option: `now` accepts string | number only (Date objects are
 *     rejected -> BAD_REQUEST), `clock` accepts a factory; event
 *     `occurredAt` accepts ISO strings / epoch numbers but NOT Date objects
 *     at the router boundary;
 *   - the router and the engine are pure: no DB imports, no Math.random, no
 *     Date.now (source-text scan, comments stripped).
 *
 * Exported zod schemas are part of the contract so callers can reuse
 * validation: threatLandscapeClassifyInputSchema,
 * threatLandscapeScenariosInputSchema, threatLandscapeTaraAssetSchema,
 * threatLandscapeTaraInputSchema, threatLandscapeSummaryEventSchema,
 * threatLandscapeSummaryInputSchema.
 */

const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

// Same `src/db` mock as the sibling router tests — the threat landscape
// router never touches it, and this asserts that fact.
vi.mock("../../db", () => ({
  getDb: dbMocks.getDb,
}));

import { createThreatLandscapeRouter } from "../../server/routers/threatLandscape";

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
  const router = createThreatLandscapeRouter(t, procedure);
  return { router };
}

const NOW = new Date("2026-08-21T08:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const iso = (daysFromNow: number) => new Date(NOW.getTime() + daysFromNow * DAY_MS).toISOString();
const USER = { id: 1, role: "owner" as const };

const VALID_CLASSIFY_INPUT = {
  id: 1,
  title: "Ransomware attack on production",
  description: "Encryption of critical files",
  source: "SIEM",
};

const VALID_SCENARIOS_INPUT = {
  sector: "Finance",
  limit: 5,
};

const VALID_TARA_INPUT = {
  assets: [
    { id: 1, name: "Core Banking", criticality: "Critical" },
    { id: 2, name: "Web Portal", criticality: "High" },
  ],
  scenarios: [
    { id: "SC-FIN-01", title: "Financial Transaction Interception", likelihood: "Medium", recommendedControls: ["A.8.24", "A.8.16"], baseThreatId: "TH-002" },
    { id: "SC-GEN-01", title: "Phishing of High-Privilege Admin", likelihood: "High", recommendedControls: ["A.5.15", "A.8.5"], baseThreatId: "TH-005" },
  ],
};

const VALID_SUMMARY_INPUT = {
  events: [
    { id: 1, title: "Ransomware campaign", severity: "critical", occurredAt: iso(-5) },
    { id: 2, title: "DDoS flood", severity: "high", occurredAt: iso(-2) },
    { id: 3, title: "odd event", severity: "bogus", occurredAt: iso(-1) },
  ],
  now: NOW.toISOString(),
};

beforeEach(() => {
  dbMocks.getDb.mockReset();
});

describe("threatLandscape router — route shape", () => {
  it("exposes classify, scenarios, tara and summary, all as query procedures (no mutations)", () => {
    const { router } = buildFakeTRPC();
    for (const name of ["classify", "scenarios", "tara", "summary"]) {
      expect(router[name], `route "${name}"`).toBeDefined();
      expect(typeof router[name].handler, `route "${name}" handler`).toBe("function");
      expect(router[name].type, `route "${name}" type`).toBe("query");
      expect(router[name].schema, `route "${name}" schema`).toBeDefined();
    }
    // the router must not expose any mutation routes
    expect(Object.values(router).every((route: any) => route?.type !== "mutation")).toBe(true);
  });
});

describe("threatLandscape router — protected procedures reject unauthenticated callers", () => {
  it("all four procedures reject a missing user with TRPCError UNAUTHORIZED", async () => {
    const { router } = buildFakeTRPC();
    const calls = [
      router.classify.handler({ input: VALID_CLASSIFY_INPUT, ctx: {} }),
      router.scenarios.handler({ input: VALID_SCENARIOS_INPUT, ctx: {} }),
      router.tara.handler({ input: VALID_TARA_INPUT, ctx: {} }),
      router.summary.handler({ input: VALID_SUMMARY_INPUT, ctx: {} }),
    ];
    for (const call of calls) {
      await expect(call).rejects.toBeInstanceOf(TRPCError);
      await expect(call).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    }
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });
});

describe("threatLandscape router — classify", () => {
  it("forwards valid input and returns the engine's classification contract", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.classify.handler({ input: VALID_CLASSIFY_INPUT, ctx: { user: USER } });
    expect(result).toMatchObject({
      id: 1,
      title: "Ransomware attack on production",
      categoryId: "TH-001",
      categoryName: "Ransomware",
      impactLevel: "Critical",
    });
    expect(result.nis2Articles).toEqual(["21(2)(b)", "21(2)(c)"]);
    expect(Array.isArray(result.matchedKeywords)).toBe(true);
    expect(result.matchedKeywords).toContain("ransomware");
    expect(typeof result.confidence).toBe("number");
  });

  it("classifies unknown text via the engine fallback (TH-000 / Other)", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.classify.handler({
      input: { title: "mystery event" },
      ctx: { user: USER },
    });
    expect(result).toMatchObject({ categoryId: "TH-000", categoryName: "Other", impactLevel: "Medium", confidence: 0 });
  });

  it("rejects type mismatches (input as string, title as number, id as boolean)", async () => {
    const { router } = buildFakeTRPC();
    const schema = router.classify.schema;
    expect(schema).toBeDefined();
    expect(() => schema.parse("nope")).toThrow(ZodError);
    expect(() => schema.parse({ title: 42 })).toThrow(ZodError);
    expect(() => schema.parse({ description: {} })).toThrow(ZodError);
    expect(() => schema.parse({ source: true })).toThrow(ZodError);
    expect(() => schema.parse({ id: true })).toThrow(ZodError);
    expect(schema.parse({})).toBeDefined();
    expect(schema.parse({ title: "ransomware", id: 7 })).toBeDefined();

    const call = router.classify.handler({ input: { title: 42 }, ctx: { user: USER } });
    await expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("threatLandscape router — scenarios", () => {
  it("forwards valid input and returns the engine's scenario contract", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.scenarios.handler({ input: VALID_SCENARIOS_INPUT, ctx: { user: USER } });
    expect(result.total).toBe(2);
    expect(result.items.map((s: { id: string }) => s.id)).toEqual(["SC-FIN-01", "SC-GEN-01"]);
    for (const item of result.items) {
      expect(item).toMatchObject({
        id: expect.any(String),
        title: expect.any(String),
        description: expect.any(String),
        baseThreatId: expect.any(String),
        categoryId: expect.any(String),
        categoryName: expect.any(String),
        likelihood: expect.any(String),
        potentialImpact: expect.any(String),
        industrySector: expect.any(Array),
      });
      expect(Array.isArray(item.recommendedControls)).toBe(true);
    }
  });

  it("empty input falls back to the general Any scenarios", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.scenarios.handler({ input: {}, ctx: { user: USER } });
    expect(result.items.map((s: { id: string }) => s.id)).toEqual(["SC-GEN-01"]);
    expect(result.total).toBe(1);
  });

  it("rejects type mismatches (sector as number, limit as string, input as array)", async () => {
    const { router } = buildFakeTRPC();
    const schema = router.scenarios.schema;
    expect(schema).toBeDefined();
    expect(() => schema.parse([])).toThrow(ZodError);
    expect(() => schema.parse({ sector: 42 })).toThrow(ZodError);
    expect(() => schema.parse({ limit: "5" })).toThrow(ZodError);
    expect(() => schema.parse({ sector: true })).toThrow(ZodError);
    expect(schema.parse({})).toBeDefined();
    expect(schema.parse({ sector: "Finance", limit: 3 })).toBeDefined();

    const call = router.scenarios.handler({ input: { sector: 42 }, ctx: { user: USER } });
    await expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("threatLandscape router — tara", () => {
  it("forwards valid input and returns the engine's TARA template contract", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.tara.handler({ input: VALID_TARA_INPUT, ctx: { user: USER } });
    expect(result.rows).toHaveLength(4); // 2 assets x 2 scenarios
    expect(result.summary.totalRows).toBe(4);
    expect(result.summary.perBand).toMatchObject({ critical: expect.any(Number), high: expect.any(Number) });
    expect(result.summary.avgRiskScore).toBeTypeOf("number");
    expect(result.summary.topRisks.length).toBeGreaterThan(0);
    for (const row of result.rows) {
      expect(row).toMatchObject({
        assetId: expect.anything(),
        assetName: expect.any(String),
        scenarioId: expect.any(String),
        scenarioTitle: expect.any(String),
        riskScore: expect.any(Number),
        riskBand: expect.any(String),
      });
      expect(Array.isArray(row.mitigations)).toBe(true);
      expect(Array.isArray(row.nis2Articles)).toBe(true);
    }
  });

  it("rejects type mismatches (assets as string, scenarios as number, criticality as number)", async () => {
    const { router } = buildFakeTRPC();
    const schema = router.tara.schema;
    expect(schema).toBeDefined();
    expect(() => schema.parse({ assets: "nope" })).toThrow(ZodError);
    expect(() => schema.parse({ assets: 42 })).toThrow(ZodError);
    expect(() => schema.parse({ scenarios: "nope" })).toThrow(ZodError);
    expect(() => schema.parse({ assets: [{ id: 1, criticality: 4 }] })).toThrow(ZodError);
    expect(() => schema.parse({ assets: [{ id: 1, name: 5 }] })).toThrow(ZodError);
    expect(() => schema.parse({ scenarios: [{ id: "S", recommendedControls: "x" }] })).toThrow(ZodError);
    expect(schema.parse({})).toBeDefined();
    expect(schema.parse({ assets: [], scenarios: [] })).toBeDefined();

    const call = router.tara.handler({ input: { assets: "nope" }, ctx: { user: USER } });
    await expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects loose enum strings for likelihood / criticality at the router boundary (engine coerces internally)", async () => {
    const { router } = buildFakeTRPC();
    const schema = router.tara.schema;
    expect(() => schema.parse({ assets: [{ id: 1, criticality: "bogus" }] })).toThrow(ZodError);
    expect(() => schema.parse({ scenarios: [{ id: "S", likelihood: "bogus" }] })).toThrow(ZodError);
    expect(() => schema.parse({ assets: [{ id: 1, criticality: "critical" }] })).toThrow(ZodError); // case-sensitive enum
    expect(() => schema.parse({ assets: [{ id: 1, criticality: "Critical" }] })).not.toThrow();
    expect(() => schema.parse({ scenarios: [{ id: "S", likelihood: "High" }] })).not.toThrow();

    const call = router.tara.handler({
      input: { assets: [{ id: 1, criticality: "bogus" }], scenarios: [] },
      ctx: { user: USER },
    });
    await expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("treats riskBand as an output-only field (not accepted as input)", async () => {
    const { router } = buildFakeTRPC();
    const schema = router.tara.schema;
    // riskBand is stripped from the input (never read by the engine)
    const parsed = schema.parse({
      assets: [{ id: 1, name: "A", criticality: "Critical" }],
      scenarios: [{ id: "S", likelihood: "High" }],
      riskBand: "critical",
    });
    expect(parsed).not.toHaveProperty("riskBand");
    const result = await router.tara.handler({
      input: { assets: [{ id: 1, name: "A", criticality: "Critical" }], scenarios: [{ id: "S", likelihood: "High" }], riskBand: "low" },
      ctx: { user: USER },
    });
    expect(result.rows[0].riskBand).toBe("critical"); // computed, not client-supplied
  });
});

describe("threatLandscape router — summary", () => {
  it("forwards valid input and returns the engine's summary contract", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.summary.handler({ input: VALID_SUMMARY_INPUT, ctx: { user: USER } });
    expect(result.totalEvents).toBe(3);
    expect(result.severityCounts).toMatchObject({ critical: 1, high: 1, unknown: 1 });
    expect(result.recentEvents).toHaveLength(3);
    expect(result.trend).toMatchObject({ last30d: 3, prior30d: 0 });
    expect(result.exposureScore).toBeGreaterThan(0);
    expect(Array.isArray(result.recommendations)).toBe(true);
  });

  it("accepts an empty events list and returns the zeroed safe shape", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.summary.handler({ input: { events: [] }, ctx: { user: USER } });
    expect(result.totalEvents).toBe(0);
    expect(result.severityCounts).toEqual({ critical: 0, high: 0, medium: 0, low: 0, unknown: 0 });
    expect(result.recentEvents).toEqual([]);
    expect(result.recommendations).toEqual([]);
  });

  it("keeps severity loose (unknown strings pass zod and are engine-coerced)", async () => {
    const { router } = buildFakeTRPC();
    const schema = router.summary.schema;
    expect(() => schema.parse({ events: [{ id: 1, severity: "bogus" }] })).not.toThrow();
    const result = await router.summary.handler({
      input: { events: [{ id: 1, severity: "bogus", occurredAt: iso(-1) }], now: NOW.toISOString() },
      ctx: { user: USER },
    });
    expect(result.severityCounts.unknown).toBe(1);
  });

  it("rejects type mismatches (events as number, severity as number, occurredAt as Date object, id as boolean)", async () => {
    const { router } = buildFakeTRPC();
    const schema = router.summary.schema;
    expect(schema).toBeDefined();
    expect(() => schema.parse({ events: 42 })).toThrow(ZodError);
    expect(() => schema.parse({ events: [{ id: 1, severity: 7 }] })).toThrow(ZodError);
    expect(() => schema.parse({ events: [{ id: 1, occurredAt: new Date() }] })).toThrow(ZodError);
    expect(() => schema.parse({ events: [{ id: true }] })).toThrow(ZodError);
    expect(() => schema.parse({ events: [{ id: 1, title: {} }] })).toThrow(ZodError);
    // loose enum strings accepted (engine coerces to "unknown")
    expect(() => schema.parse({ events: [{ id: 1, severity: "bogus" }] })).not.toThrow();
    expect(schema.parse({})).toBeDefined();

    const call = router.summary.handler({
      input: { events: [{ id: 1, occurredAt: new Date() }] },
      ctx: { user: USER },
    });
    await expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("accepts epoch-number occurredAt alongside ISO strings (only Date objects rejected)", () => {
    const { router } = buildFakeTRPC();
    const schema = router.summary.schema;
    expect(() => schema.parse({ events: [{ id: 1, occurredAt: NOW.getTime() }] })).not.toThrow();
    expect(() => schema.parse({ events: [{ id: 1, occurredAt: iso(-1) }] })).not.toThrow();
  });
});

describe("threatLandscape router — shared clock options", () => {
  it("accepts string/number `now` and a `clock` factory; rejects Date objects", async () => {
    const { router } = buildFakeTRPC();
    expect(() => router.summary.schema.parse({ now: NOW.toISOString() })).not.toThrow();
    expect(() => router.summary.schema.parse({ now: 12345 })).not.toThrow();
    expect(() => router.summary.schema.parse({ clock: () => new Date() })).not.toThrow();
    expect(() => router.summary.schema.parse({ now: new Date() })).toThrow(ZodError);
    expect(() => router.summary.schema.parse({ clock: "not-a-function" })).toThrow(ZodError);
  });
});

describe("threatLandscape router — exported zod schemas", () => {
  it("exports all six input/item schemas for reuse", async () => {
    const mod = await import("../../server/routers/threatLandscape");
    for (const name of [
      "threatLandscapeClassifyInputSchema",
      "threatLandscapeScenariosInputSchema",
      "threatLandscapeTaraAssetSchema",
      "threatLandscapeTaraInputSchema",
      "threatLandscapeSummaryEventSchema",
      "threatLandscapeSummaryInputSchema",
    ]) {
      expect((mod as Record<string, unknown>)[name], `export "${name}"`).toBeDefined();
    }
    const modAny = mod as any;
    // each exported schema parses valid input and rejects type-mismatched input
    expect(modAny.threatLandscapeClassifyInputSchema.parse({ title: "ransomware" })).toBeDefined();
    expect(() => modAny.threatLandscapeClassifyInputSchema.parse({ title: 42 })).toThrow(ZodError);
    expect(modAny.threatLandscapeScenariosInputSchema.parse({ sector: "Finance", limit: 3 })).toBeDefined();
    expect(() => modAny.threatLandscapeScenariosInputSchema.parse({ limit: "x" })).toThrow(ZodError);
    expect(modAny.threatLandscapeTaraAssetSchema.parse({ id: 1, criticality: "High" })).toBeDefined();
    expect(() => modAny.threatLandscapeTaraAssetSchema.parse({ criticality: "bogus" })).toThrow(ZodError);
    expect(modAny.threatLandscapeTaraInputSchema.parse({ assets: [], scenarios: [] })).toBeDefined();
    expect(() => modAny.threatLandscapeTaraInputSchema.parse({ assets: 1 })).toThrow(ZodError);
    expect(modAny.threatLandscapeSummaryEventSchema.parse({ id: "x", severity: "critical", occurredAt: "2026-08-21T00:00:00.000Z" })).toBeDefined();
    expect(() => modAny.threatLandscapeSummaryEventSchema.parse({ id: 1, occurredAt: new Date() })).toThrow(ZodError);
    expect(modAny.threatLandscapeSummaryInputSchema.parse({ events: [], now: 1 })).toBeDefined();
    expect(() => modAny.threatLandscapeSummaryInputSchema.parse({ events: "x" })).toThrow(ZodError);
  });
});

describe("threatLandscape router — purity guarantee", () => {
  it("the router source has no imports from any db module, no Math.random, no Date.now", () => {
    const source = readFileSync(
      join(process.cwd(), "packages/core/src/server/routers/threatLandscape.ts"),
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
      join(process.cwd(), "packages/core/src/lib/nis2/threatLandscape.ts"),
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
