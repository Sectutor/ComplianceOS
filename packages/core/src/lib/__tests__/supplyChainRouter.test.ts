import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZodError } from "zod";

/**
 * NIS2 supply-chain router (server/routers/supplyChain.ts) — contract tests
 * (QA cycle 17, NIS2 Phase 3 Task 3.1 / ENISA Measure 5.1).
 *
 * Mirrors incidentClassifierRouter.test.ts: the router is a factory
 * `createSupplyChainRouter(t, protectedProcedure)` tested with a tiny fake
 * tRPC builder — no tRPC server, no DB. The engine underneath
 * (lib/nis2/supplyChain.ts) is pure; the router only validates input with zod
 * and forwards to the engine.
 *
 * Contract under test — all four are `.query` procedures (never mutations):
 *   classifySupplier protected.query  input supplyChainClassifySchema
 *   scorePosture     protected.query  input supplyChainPostureSchema
 *   trackIncident    protected.query  input supplyChainIncidentSchema
 *   monitorSla       protected.query  input supplyChainSlaSchema
 *
 * Hardening contract:
 *   - handlers never throw for valid (incl. degenerate) input — the only
 *     intentional rejection is zod BAD_REQUEST (ZodError at the schema layer);
 *   - the router is pure: it never touches the DB.
 */

const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

// Same `src/db` mock as the sibling router tests — the supply-chain router
// never touches it, and this asserts that fact.
vi.mock("../../db", () => ({
  getDb: dbMocks.getDb,
}));

import { createSupplyChainRouter } from "../../server/routers/supplyChain";

/** Minimal fake tRPC builder that attaches the input schema to each route. */
function buildFakeTRPC() {
  let currentSchema: unknown = null;
  const procedure: any = {
    input: (schema: unknown) => {
      currentSchema = schema;
      return procedure;
    },
    query: (handler: any) => ({ type: "query", handler, schema: currentSchema }),
    mutation: (handler: any) => ({ type: "mutation", handler, schema: currentSchema }),
  };
  const t: any = { router: (routes: any) => routes };
  const router = createSupplyChainRouter(t, procedure);
  return { router };
}

const NOW = new Date("2026-08-19T08:00:00.000Z");

beforeEach(() => {
  dbMocks.getDb.mockReset();
});

describe("supplyChain router — route shape", () => {
  it("exposes classifySupplier, scorePosture, trackIncident and monitorSla, all as query procedures (no mutations)", () => {
    const { router } = buildFakeTRPC();
    for (const name of ["classifySupplier", "scorePosture", "trackIncident", "monitorSla"]) {
      expect(router[name], `route "${name}"`).toBeDefined();
      expect(typeof router[name].handler, `route "${name}" handler`).toBe("function");
      expect(router[name].type, `route "${name}" type`).toBe("query");
    }
    // the router must not expose any mutation routes
    expect(Object.values(router).every((route: any) => route?.type !== "mutation")).toBe(true);
  });
});

describe("supplyChain router — classifySupplier", () => {
  it("returns the documented engine shape for a representative input", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.classifySupplier.handler({
      input: {
        supplierName: "CloudCo",
        servicesEssentialToCriticalFunctions: true,
        processesSensitiveData: true,
        networkAccessLevel: "broad",
        now: NOW,
      },
      ctx: {},
    });

    expect(result.supplierName).toBe("CloudCo");
    expect(result.criticalityScore).toBe(100);
    expect(["critical", "high", "medium", "low"]).toContain(result.criticality);
    expect(["Quarterly", "Semi-Annual", "Annual", "Biennial"]).toContain(result.reviewFrequency);
    expect(Array.isArray(result.rationale)).toBe(true);
    expect(typeof result.nextReviewDate).toBe("string");
  });

  it("never throws for minimal valid input (empty object)", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.classifySupplier.handler({ input: {}, ctx: {} });
    expect(result.supplierName).toBe("Unnamed supplier");
    expect(result.criticality).toBe("low");
  });

  it("never touches the DB", async () => {
    const { router } = buildFakeTRPC();
    await router.classifySupplier.handler({
      input: { supplierName: "CloudCo", networkAccessLevel: "broad", now: NOW },
      ctx: {},
    });
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });
});

describe("supplyChain router — scorePosture", () => {
  it("returns the weighted score and readiness for a partial answer set", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.scorePosture.handler({
      input: {
        supplierName: "CloudCo",
        answers: { securityRequirementsInAgreement: true, auditRights: true },
      },
      ctx: {},
    });
    expect(result.score).toBe(32); // 20 + 12
    expect(result.readiness).toBe("At Risk");
    expect(Array.isArray(result.areas)).toBe(true);
    expect(result.areas).toHaveLength(8);
    expect(Array.isArray(result.gaps)).toBe(true);
    expect(result.recommendedActions.length).toBeGreaterThanOrEqual(3);
  });

  it("never throws for degenerate-but-valid input (empty object)", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.scorePosture.handler({ input: {}, ctx: {} });
    expect(result.score).toBe(0);
    expect(result.readiness).toBe("No Data");
  });

  it("never touches the DB", async () => {
    const { router } = buildFakeTRPC();
    await router.scorePosture.handler({
      input: { supplierName: "CloudCo", answers: { auditRights: true } },
      ctx: {},
    });
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });
});

describe("supplyChain router — trackIncident", () => {
  it("computes the notification deadline and status for a significant incident", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.trackIncident.handler({
      input: { supplierName: "CloudCo", incidentTitle: "Breach", detectedAt: NOW, significant: true, now: NOW },
      ctx: {},
    });
    expect(result.notificationDeadline.getTime()).toBe(NOW.getTime() + 24 * 60 * 60 * 1000);
    expect(result.status).toBe("pending");
    expect(result.incidentId).toBe("cloudco-breach");
  });

  it("never throws for degenerate-but-valid input (empty object)", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.trackIncident.handler({ input: {}, ctx: {} });
    expect(result.incidentId).toBe("unnamed-supplier-untitled-incident");
  });

  it("never touches the DB", async () => {
    const { router } = buildFakeTRPC();
    await router.trackIncident.handler({ input: { detectedAt: NOW, now: NOW }, ctx: {} });
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });
});

describe("supplyChain router — monitorSla", () => {
  it("returns per-item statuses and a summary", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.monitorSla.handler({
      input: {
        supplierName: "CloudCo",
        items: [
          { id: "a", title: "Pen test", cadenceDays: 30, lastVerifiedAt: NOW, passed: true },
          { id: "b", title: "SOC 2", cadenceDays: 365, lastVerifiedAt: undefined, passed: false },
        ],
        now: NOW,
      },
      ctx: {},
    });
    expect(result.items).toHaveLength(2);
    expect(result.items[0].status).toBe("compliant");
    expect(result.items[1].status).toBe("not-tested");
    expect(result.summary.total).toBe(2);
  });

  it("never throws for degenerate-but-valid input (empty object)", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.monitorSla.handler({ input: {}, ctx: {} });
    expect(result.items).toEqual([]);
    expect(result.summary.total).toBe(0);
  });

  it("never touches the DB", async () => {
    const { router } = buildFakeTRPC();
    await router.monitorSla.handler({ input: { items: [] }, ctx: {} });
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });
});

describe("supplyChain router — zod validation (BAD_REQUEST, never a raw crash)", () => {
  it("classifySupplier rejects an unknown networkAccessLevel and non-number spend", () => {
    const { router } = buildFakeTRPC();
    const schema = router.classifySupplier.schema;

    expect(schema).toBeDefined();
    expect(() => schema.parse({ networkAccessLevel: "super-broad" })).toThrow(ZodError);
    expect(() => schema.parse({ annualSpendEur: "1M" })).toThrow(ZodError);
    // valid: empty object, or with typed fields
    expect(schema.parse({})).toBeDefined();
    expect(schema.parse({ supplierName: "X", networkAccessLevel: "restricted", annualSpendEur: 500 }).networkAccessLevel).toBe("restricted");
  });

  it("scorePosture rejects non-boolean answer values", () => {
    const { router } = buildFakeTRPC();
    const schema = router.scorePosture.schema;

    expect(schema).toBeDefined();
    expect(() => schema.parse({ answers: { securityRequirementsInAgreement: "yes" } })).toThrow(ZodError);
    // valid: empty object, or boolean answers
    expect(schema.parse({})).toBeDefined();
    expect(schema.parse({ answers: { auditRights: true } }).answers.auditRights).toBe(true);
  });

  it("trackIncident rejects wrong date types", () => {
    const { router } = buildFakeTRPC();
    const schema = router.trackIncident.schema;

    expect(schema).toBeDefined();
    expect(() => schema.parse({ detectedAt: "not-a-date" })).toThrow(ZodError);
    expect(() => schema.parse({ notificationSlaHours: "24h" })).toThrow(ZodError);
    // valid: empty object, or typed dates
    expect(schema.parse({})).toBeDefined();
    expect(schema.parse({ detectedAt: NOW, now: NOW }).detectedAt).toBeInstanceOf(Date);
  });

  it("monitorSla rejects items missing required fields", () => {
    const { router } = buildFakeTRPC();
    const schema = router.monitorSla.schema;

    expect(schema).toBeDefined();
    expect(() => schema.parse({ items: [{ id: "a" }] })).toThrow(ZodError); // missing title/cadenceDays/passed
    expect(() => schema.parse({ items: [{ id: "a", title: "T", cadenceDays: "30", passed: true }] })).toThrow(ZodError);
    // valid: empty object, or well-formed items
    expect(schema.parse({})).toBeDefined();
    expect(
      schema.parse({ items: [{ id: "a", title: "T", cadenceDays: 30, passed: true, lastVerifiedAt: NOW }] }).items[0].cadenceDays
    ).toBe(30);
  });

  it("all schemas are exported for reuse", async () => {
    const schemas = await import("../../server/routers/supplyChain");
    for (const name of [
      "supplyChainClassifySchema",
      "supplyChainPostureSchema",
      "supplyChainIncidentSchema",
      "supplyChainSlaSchema",
    ]) {
      expect((schemas as Record<string, unknown>)[name]).toBeDefined();
    }
  });
});
