import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZodError } from "zod";
import { TRPCError } from "@trpc/server";

/**
 * NIS2 third-party risk router (server/routers/thirdPartyRisk.ts) — contract
 * tests (QA cycle 18, NIS2 Phase 3 Task 3.2).
 *
 * Mirrors supplyChainRouter.test.ts / incidentClassifierRouter.test.ts: the
 * router is a factory `createThirdPartyRiskRouter(t, protectedProcedure)`
 * tested with a tiny fake tRPC builder — no tRPC server, no DB. The engines
 * underneath (lib/nis2/thirdPartyRisk.ts) are pure; the router only validates
 * input with zod and forwards to the engine.
 *
 * Contract under test — all three are `.query` procedures (never mutations):
 *   aggregateRisk  protected.query  input thirdPartyAggregateRiskSchema
 *   certificates   protected.query  input thirdPartyCertificatesSchema
 *   supplyChainMap protected.query  input thirdPartySupplyChainMapSchema
 *
 * The fake protectedProcedure mirrors the real `isAuthed` middleware (TRPCError
 * UNAUTHORIZED when ctx.user is missing) and the tRPC input-parsing layer
 * (ZodError surfaced as TRPCError code "BAD_REQUEST"), so the suite proves the
 * routes are wired through a protected, zod-validated procedure — never a raw
 * public handler.
 *
 * Hardening contract:
 *   - unauthenticated callers are rejected (TRPCError UNAUTHORIZED);
 *   - invalid input is rejected with TRPCError BAD_REQUEST (zod) — never a
 *     raw crash inside the handler;
 *   - valid (incl. degenerate) input is forwarded to the engine untouched;
 *   - the router is pure: it never touches the DB.
 *
 * Exported zod schemas are part of the contract so callers can reuse
 * validation: thirdPartySupplierSchema, thirdPartyAggregateRiskSchema,
 * thirdPartyCertificateSupplierSchema, thirdPartyCertificatesSchema,
 * thirdPartyDependencySchema, thirdPartySupplyChainMapSchema.
 */

const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

// Same `src/db` mock as the sibling router tests — the third-party risk router
// never touches it, and this asserts that fact.
vi.mock("../../db", () => ({
  getDb: dbMocks.getDb,
}));

import { createThirdPartyRiskRouter } from "../../server/routers/thirdPartyRisk";

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
  const router = createThirdPartyRiskRouter(t, procedure);
  return { router };
}

const NOW = new Date("2026-08-19T08:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const USER = { id: 1, role: "owner" as const };

/** Criticality factors -> critical band; posture answers -> 100. */
const CRITICAL_FACTORS = {
  servicesEssentialToCriticalFunctions: true,
  processesSensitiveData: true,
  networkAccessLevel: "broad",
};
const POSTURE_100 = {
  securityRequirementsInAgreement: true,
  incidentNotificationCommitment: true,
  vulnerabilityHandlingProcess: true,
  auditRights: true,
  subcontractingConstraints: true,
  terminationExitProvisions: true,
  dataProtectionMeasures: true,
  businessContinuityProvisions: true,
};

const VALID_AGGREGATE_INPUT = {
  suppliers: [
    {
      supplierId: 1,
      supplierName: "CloudCo",
      ...CRITICAL_FACTORS,
      answers: POSTURE_100,
      vendorResidualScore: 100,
    },
  ],
};

const VALID_CERTIFICATES_INPUT = {
  now: NOW,
  suppliers: [
    {
      supplierId: 1,
      supplierName: "CloudCo",
      certificates: [
        { name: "ISO 27001", issuer: "TÜV", validFrom: NOW, validTo: new Date(NOW.getTime() + 200 * DAY_MS) },
      ],
    },
    { supplierId: 2, supplierName: "NoCerts Inc" },
  ],
};

const VALID_MAP_INPUT = {
  suppliers: [
    { supplierId: 1, supplierName: "Acme", ...CRITICAL_FACTORS, answers: POSTURE_100 }, // 95 critical
    {
      supplierId: 2,
      supplierName: "Zeta",
      processesSensitiveData: true,
      networkAccessLevel: "broad",
      annualSpendEur: 2_000_000, // high band
      answers: { securityRequirementsInAgreement: true, incidentNotificationCommitment: true, vulnerabilityHandlingProcess: true, subcontractingConstraints: true }, // 60 -> 65 high
    },
  ],
  dependencies: [
    { from: 1, to: 2 },
    { from: 2, to: 1, weight: 0.42 },
  ],
};

beforeEach(() => {
  dbMocks.getDb.mockReset();
});

describe("thirdPartyRisk router — route shape", () => {
  it("exposes aggregateRisk, certificates and supplyChainMap, all as query procedures (no mutations)", () => {
    const { router } = buildFakeTRPC();
    for (const name of ["aggregateRisk", "certificates", "supplyChainMap"]) {
      expect(router[name], `route "${name}"`).toBeDefined();
      expect(typeof router[name].handler, `route "${name}" handler`).toBe("function");
      expect(router[name].type, `route "${name}" type`).toBe("query");
      expect(router[name].schema, `route "${name}" schema`).toBeDefined();
    }
    // the router must not expose any mutation routes
    expect(Object.values(router).every((route: any) => route?.type !== "mutation")).toBe(true);
  });
});

describe("thirdPartyRisk router — protected procedures reject unauthenticated callers", () => {
  it("aggregateRisk / certificates / supplyChainMap all reject a missing user with TRPCError UNAUTHORIZED", async () => {
    const { router } = buildFakeTRPC();
    const calls = [
      router.aggregateRisk.handler({ input: VALID_AGGREGATE_INPUT, ctx: {} }),
      router.certificates.handler({ input: VALID_CERTIFICATES_INPUT, ctx: {} }),
      router.supplyChainMap.handler({ input: VALID_MAP_INPUT, ctx: {} }),
    ];
    for (const call of calls) {
      await expect(call).rejects.toBeInstanceOf(TRPCError);
      await expect(call).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    }
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });
});

describe("thirdPartyRisk router — aggregateRisk", () => {
  it("forwards valid input and returns the engine's { items, totals } contract", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.aggregateRisk.handler({
      input: VALID_AGGREGATE_INPUT,
      ctx: { user: USER },
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].compositeScore).toBe(96);
    expect(result.items[0].riskTier).toBe("critical");
    expect(result.items[0].criticality).toBe("critical");
    expect(result.items[0].postureReadiness).toBe("Strong");
    expect(typeof result.items[0].verdict).toBe("string");
    expect(Array.isArray(result.items[0].recommendedActions)).toBe(true);
    expect(result.totals).toMatchObject({
      count: 1,
      criticalCount: 1,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
    });
    expect(typeof result.totals.avgCompositeScore).toBe("number");
  });

  it("never throws for degenerate-but-valid input (empty object)", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.aggregateRisk.handler({ input: {}, ctx: { user: USER } });
    expect(result.items).toEqual([]);
    expect(result.totals).toEqual({
      count: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      avgCompositeScore: 0,
    });
  });

  it("never touches the DB", async () => {
    const { router } = buildFakeTRPC();
    await router.aggregateRisk.handler({ input: VALID_AGGREGATE_INPUT, ctx: { user: USER } });
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });
});

describe("thirdPartyRisk router — certificates", () => {
  it("forwards valid input and returns per-certificate statuses plus coverage summary", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.certificates.handler({
      input: VALID_CERTIFICATES_INPUT,
      ctx: { user: USER },
    });

    expect(result.items.map((i: any) => i.status)).toEqual(["valid", "missing"]);
    expect(result.items[0].daysUntilExpiry).toBe(200);
    expect(result.summary).toMatchObject({
      total: 2,
      valid: 1,
      expiring: 0,
      expired: 0,
      coverageRate: 0.5,
    });
  });

  it("never throws for degenerate-but-valid input (empty object)", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.certificates.handler({ input: {}, ctx: { user: USER } });
    expect(result.items).toEqual([]);
    expect(result.summary).toEqual({ total: 0, valid: 0, expiring: 0, expired: 0, coverageRate: 0 });
  });

  it("never touches the DB", async () => {
    const { router } = buildFakeTRPC();
    await router.certificates.handler({ input: VALID_CERTIFICATES_INPUT, ctx: { user: USER } });
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });
});

describe("thirdPartyRisk router — supplyChainMap", () => {
  it("forwards valid input and returns nodes, edges and summary", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.supplyChainMap.handler({
      input: VALID_MAP_INPUT,
      ctx: { user: USER },
    });

    expect(result.nodes.map((n: any) => n.name)).toEqual(["Acme", "Zeta"]);
    expect(result.nodes.map((n: any) => n.compositeScore)).toEqual([95, 65]);
    expect(result.edges).toHaveLength(2);
    expect(result.edges.find((e: any) => e.from === 1 && e.to === 2)?.weight).toBe(1.0);
    expect(result.edges.find((e: any) => e.from === 2 && e.to === 1)?.weight).toBe(0.42);
    expect(result.summary).toMatchObject({
      tierCounts: { critical: 1, high: 1, medium: 0, low: 0 },
      avgCompositeScore: 80, // (95 + 65) / 2
      edgeCount: 2,
    });
  });

  it("never throws for degenerate-but-valid input (empty object)", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.supplyChainMap.handler({ input: {}, ctx: { user: USER } });
    expect(result.nodes).toEqual([]);
    expect(result.edges).toEqual([]);
    expect(result.summary.edgeCount).toBe(0);
  });

  it("never touches the DB", async () => {
    const { router } = buildFakeTRPC();
    await router.supplyChainMap.handler({ input: VALID_MAP_INPUT, ctx: { user: USER } });
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });
});

describe("thirdPartyRisk router — zod validation (BAD_REQUEST, never a raw crash)", () => {
  it("aggregateRisk rejects missing ids, invalid enums and wrong types", async () => {
    const { router } = buildFakeTRPC();
    const schema = router.aggregateRisk.schema;

    expect(schema).toBeDefined();
    expect(() => schema.parse({ suppliers: [{ networkAccessLevel: "super-broad" }] })).toThrow(ZodError);
    expect(() => schema.parse({ suppliers: [{ supplierId: 1, annualSpendEur: "1M" }] })).toThrow(ZodError);
    expect(() => schema.parse({ suppliers: [{ supplierId: 1, vendorResidualScore: "90" }] })).toThrow(ZodError);
    expect(() => schema.parse({ suppliers: [{ supplierId: 1, answers: { x: "yes" } }] })).toThrow(ZodError);
    expect(() => schema.parse({ suppliers: [{ answers: { x: true } }] })).toThrow(ZodError); // supplierId required
    // valid: empty object, or typed suppliers
    expect(schema.parse({})).toBeDefined();
    expect(schema.parse(VALID_AGGREGATE_INPUT).suppliers[0].vendorResidualScore).toBe(100);

    const call = router.aggregateRisk.handler({
      input: { suppliers: [{ supplierId: 1, networkAccessLevel: "super-broad" }] },
      ctx: { user: USER },
    });
    await expect(call).rejects.toBeInstanceOf(TRPCError);
    await expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("certificates rejects wrong date types and missing ids", async () => {
    const { router } = buildFakeTRPC();
    const schema = router.certificates.schema;

    expect(schema).toBeDefined();
    expect(() =>
      schema.parse({ suppliers: [{ supplierId: 1, certificates: [{ name: "X", validTo: "not-a-date" }] }] })
    ).toThrow(ZodError);
    expect(() => schema.parse({ now: "not-a-date" })).toThrow(ZodError);
    expect(() =>
      schema.parse({ suppliers: [{ supplierId: 1, certificates: [{ name: 42 }] }] })
    ).toThrow(ZodError);
    expect(() => schema.parse({ suppliers: [{ certificates: [{ name: "X" }] }] })).toThrow(ZodError); // supplierId required
    // valid: empty object, or typed dates
    expect(schema.parse({})).toBeDefined();
    expect(schema.parse(VALID_CERTIFICATES_INPUT).now).toBeInstanceOf(Date);

    const call = router.certificates.handler({
      input: { suppliers: [{ supplierId: 1, certificates: [{ name: "X", validTo: "not-a-date" }] }] },
      ctx: { user: USER },
    });
    await expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("supplyChainMap rejects dependencies without a target and wrong types", async () => {
    const { router } = buildFakeTRPC();
    const schema = router.supplyChainMap.schema;

    expect(schema).toBeDefined();
    expect(() => schema.parse({ dependencies: [{ from: 1 }] })).toThrow(ZodError); // to required
    expect(() => schema.parse({ dependencies: [{ from: 1, to: 2, weight: "x" }] })).toThrow(ZodError);
    expect(() =>
      schema.parse({ suppliers: [{ networkAccessLevel: "super-broad" }] })
    ).toThrow(ZodError);
    expect(() => schema.parse({ suppliers: [{}] })).toThrow(ZodError); // supplierId required
    // valid: empty object, or typed suppliers + dependencies
    expect(schema.parse({})).toBeDefined();
    expect(schema.parse(VALID_MAP_INPUT).dependencies[0].to).toBe(2);

    const call = router.supplyChainMap.handler({
      input: { dependencies: [{ from: 1 }] },
      ctx: { user: USER },
    });
    await expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("all schemas are exported for reuse", async () => {
    const schemas = await import("../../server/routers/thirdPartyRisk");
    for (const name of [
      "thirdPartySupplierSchema",
      "thirdPartyAggregateRiskSchema",
      "thirdPartyCertificateSupplierSchema",
      "thirdPartyCertificatesSchema",
      "thirdPartyDependencySchema",
      "thirdPartySupplyChainMapSchema",
    ]) {
      expect((schemas as Record<string, unknown>)[name], `export "${name}"`).toBeDefined();
    }
  });
});
