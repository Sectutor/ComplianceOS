import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZodError } from "zod";
import { TRPCError } from "@trpc/server";

/**
 * Federal Workflow Intelligence router (server/routers/federal-workflows.ts)
 * — contract tests (QA build-cycle 39, Federal Workflows Phase 2).
 *
 * Mirrors sentinelRouter.test.ts / questionnaireRouter.test.ts: the router is
 * a factory `createFederalWorkflowRouter(t, clientProcedure)` tested with a
 * tiny fake tRPC builder — no tRPC server, no DB (`../../db` is mocked).
 *
 * Contract under test — exactly these 10 procedures (all registered through
 * clientProcedure, per routers.ts line "federalWorkflows:
 * createFederalWorkflowRouter(t, clientProcedure)"):
 *   queries   : getSprsBreakdown, getCmmcReadiness, getReportingClocks,
 *               getConMonDashboard, cmmcPractices (cycle 44, GAP-20 — CMMC
 *               800-171 practice register query; pure passthrough over
 *               lib/federal/cmmcRegister, NO DB access)
 *   mutations : syncSarToPoam, exportSspOscal, exportPoamOscal,
 *               exportPoamEmassCsv, importOscal (cycle 41, GAP-19)
 * Every input schema requires numeric `clientId` except cmmcPractices
 * (family/level/search all optional); syncSarToPoam additionally requires
 * `sarId`; the three exports require `sspId`/`poamId`.
 *
 * IMPORTANT behavioural note (asserted as-implemented, deliberately):
 * the handlers throw PLAIN `new Error("SAR not found")` /
 * `new Error("SSP not found")` / `new Error("POA&M not found")` — NOT
 * TRPCError. These tests assert that actual behaviour rather than demanding
 * specific TRPC error codes.
 *
 * SPRS scoring model exercised behaviourally over mocked db.execute rows +
 * mocked lib/federal/cmmcRegister engine spies (cycle 45, GAP-21 rewiring):
 * open POA&M controls map onto bare NIST SP 800-171 practice ids,
 * getPracticesBy800171Id resolves them onto canonical register entries, and
 * computeSprsPerPracticeDeduction returns the per-practice DoD Assessment
 * Methodology deductions from a 110-point start. These tests pin the ROUTER
 * WIRING; the exact per-practice point math is pinned against the real
 * engine in cmmcSprsDeduction.test.ts.
 */

const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

vi.mock("../../db", () => ({
  getDb: dbMocks.getDb,
}));

/**
 * Cycle-44 pinning: cmmcPractices is a PURE passthrough over
 * lib/federal/cmmcRegister. The register engine is replaced by this spy so
 * handler tests can assert wiring + zero DB access without coupling to the
 * static register content (covered by cmmcSprsDeduction.test.ts).
 */
const cmmcRegisterMocks = vi.hoisted(() => ({
  getCmmcPracticeRegister: vi.fn(),
  // Cycle 45 (GAP-21 rewiring): getSprsBreakdown now resolves bare 800-171
  // ids onto canonical register entries and delegates the per-practice DoD
  // Assessment Methodology math to the engine, so both exports must exist on
  // the mock or the module import itself fails.
  getPracticesBy800171Id: vi.fn(),
  computeSprsPerPracticeDeduction: vi.fn(),
}));

vi.mock("../../lib/federal/cmmcRegister", () => ({
  getCmmcPracticeRegister: cmmcRegisterMocks.getCmmcPracticeRegister,
  getPracticesBy800171Id: cmmcRegisterMocks.getPracticesBy800171Id,
  computeSprsPerPracticeDeduction: cmmcRegisterMocks.computeSprsPerPracticeDeduction,
}));

import {
  createFederalWorkflowRouter,
  oscalImportInputSchema,
} from "../../server/routers/federal-workflows";
import { OSCAL_MAX_SERIALIZED_LENGTH, validateOscalDocument } from "../../lib/federal/oscalImport";

/**
 * Cycle-43 pinning: strict RFC-4122 v4 matcher (lowercase hex, version nibble
 * '4' at index 14, variant nibble ∈ {8,9,a,b} at index 19). Every uuid the
 * OSCAL exports emit — root, observations and tasks alike — must satisfy it,
 * because the documents must survive re-import through the real engine.
 */
const UUID_V4_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

/** Generous budget: OneDrive-synced tree can be slow under parallel load. */
vi.setConfig({ testTimeout: 60_000 });

/** Fixed "now" for every clock-sensitive case (DFARS 72h windows, eMASS filename). */
const NOW = new Date("2026-08-24T12:00:00.000Z");
const HOUR = 3600_000;

// ── Fake tRPC builder (house pattern, client surface only) ───────────────────

type RouteDef = {
  type: "query" | "mutation";
  handler: (args: { input?: unknown; ctx?: any }) => any;
  schema: unknown;
};

/**
 * Minimal fake clientProcedure: captures the pending zod schema at
 * .input() time, enforces the auth gate (UNAUTHORIZED without ctx.user) and
 * surfaces ZodError as TRPCError BAD_REQUEST exactly like the real
 * protectedProcedure layers do — without touching trpc-base internals.
 */
function makeClientProcedure() {
  let currentSchema: unknown = null;
  const proc: any = {
    input: (schema: unknown) => {
      currentSchema = schema;
      return proc;
    },
    query: (handler: any): RouteDef => {
      const schema = currentSchema;
      currentSchema = null;
      return { type: "query", handler: wrap(handler, schema), schema };
    },
    mutation: (handler: any): RouteDef => {
      const schema = currentSchema;
      currentSchema = null;
      return { type: "mutation", handler: wrap(handler, schema), schema };
    },
  };
  return proc;
}

function wrap(handler: any, schema: unknown) {
  return async ({ input, ctx }: { input?: unknown; ctx?: any }) => {
    if (!ctx?.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authentication required.",
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
}

function buildRouter() {
  return createFederalWorkflowRouter(
    { router: (routes: any) => routes } as any,
    makeClientProcedure()
  );
}

const QUERIES = ["getSprsBreakdown", "getCmmcReadiness", "getReportingClocks", "getConMonDashboard", "cmmcPractices"];
const MUTATIONS = ["syncSarToPoam", "exportSspOscal", "exportPoamOscal", "exportPoamEmassCsv", "importOscal"];
const ALL_ROUTES = [...QUERIES, ...MUTATIONS].sort();

/** Minimal valid input per route (for auth-gate sweeps). */
const MIN_INPUT: Record<string, any> = {
  syncSarToPoam: { clientId: 1, sarId: 1 },
  getSprsBreakdown: { clientId: 1 },
  exportSspOscal: { clientId: 1, sspId: 1 },
  exportPoamOscal: { clientId: 1, poamId: 1 },
  getCmmcReadiness: { clientId: 1 },
  getReportingClocks: { clientId: 1 },
  getConMonDashboard: { clientId: 1 },
  exportPoamEmassCsv: { clientId: 1, poamId: 1 },
  importOscal: { content: "{}" },
  cmmcPractices: {}, // all filter fields optional
};

// ── Mocked drizzle connection ────────────────────────────────────────────────

/**
 * Queue-based fake db covering every chain shape the router uses:
 *   select().from().where()                      (terminal thenable)
 *   select().from().where().limit(1)             (SPRS snapshot lookup)
 *   select().from().where().orderBy().limit(n)   (clocks / FISMA reports)
 *   insert().values(v)                           (thenable; poamItems)
 *   insert().values(v).returning()               (new POA&M row)
 *   update().set(v).where()
 *   execute(sql`)                                → { rows } from exec queue
 * Select results are consumed strictly in call order, which is deterministic
 * for each handler. Insert/update payloads are captured for assertions.
 */
function mockDb(selectResults: unknown[][] = [], execRows: unknown[][] = []) {
  const selQueue = selectResults.map((rows) => [...rows]);
  const execQueue = execRows.map((rows) => [...rows]);
  const calls = {
    inserts: [] as any[],
    updates: [] as any[],
    executed: [] as unknown[],
    selects: 0,
  };

  const takeSel = () => {
    calls.selects++;
    return selQueue.length ? (selQueue.shift() as unknown[]) : [];
  };

  const db: any = {
    select: () => {
      const rows = takeSel(); // captured at chain start so later inserts can't reorder
      return {
        from: () => ({
          where: () => {
            const resolveRows = (resolve: any, reject: any) => Promise.resolve(rows).then(resolve, reject);
            return {
              // terminal `.where(...)` (awaited directly by most handlers)
              then: resolveRows,
              // `.where(...).limit(n)`
              limit: async () => rows,
              // `.where(...).orderBy(...)` (clocks) and `.orderBy(...).limit(n)` (reports)
              orderBy: () => ({
                then: resolveRows,
                limit: async () => rows,
              }),
            };
          },
        }),
      };
    },
    insert: () => ({
      values: (vals: any) => {
        calls.inserts.push(vals);
        const res: any = {
          returning: async () => [{ id: 9000 + calls.inserts.length }],
        };
        res.then = (resolve: any, reject: any) => Promise.resolve([]).then(resolve, reject);
        return res;
      },
    }),
    update: () => ({
      set: (vals: any) => {
        calls.updates.push(vals);
        return { where: async () => {} };
      },
    }),
    execute: async (q?: unknown) => {
      calls.executed.push(q);
      return { rows: execQueue.length ? (execQueue.shift() as unknown[]) : [] };
    },
  };

  dbMocks.getDb.mockReset();
  dbMocks.getDb.mockResolvedValue(db);
  return { db, calls };
}

beforeEach(() => {
  dbMocks.getDb.mockReset();
  // Engine spies must not leak stubs between test cases (house pattern:
  // per-suite hygiene in one place instead of sprinkled mockReset() calls).
  cmmcRegisterMocks.getPracticesBy800171Id.mockReset();
  cmmcRegisterMocks.computeSprsPerPracticeDeduction.mockReset();
});

// ── Route shape ──────────────────────────────────────────────────────────────

describe("federal-workflows router — route shape", () => {
  it("exposes exactly the 10 documented procedures, each with a callable handler", () => {
    const router = buildRouter();
    expect(Object.keys(router).sort()).toEqual(ALL_ROUTES);
    for (const name of Object.keys(router)) {
      expect(typeof (router as any)[name].handler, `handler of "${name}"`).toBe("function");
    }
  });

  it("registers the five intelligence surfaces as queries and the five artifact operations as mutations", () => {
    const router = buildRouter();
    for (const name of QUERIES) {
      expect((router as any)[name].type, `"${name}" kind`).toBe("query");
    }
    for (const name of MUTATIONS) {
      expect((router as any)[name].type, `"${name}" kind`).toBe("mutation");
    }
  });

  it("attaches a zod input schema to every procedure (clientId-bearing routes enforce numeric clientId)", () => {
    const router = buildRouter();
    for (const name of ALL_ROUTES) {
      const schema = (router as any)[name].schema;
      expect(schema, `schema of "${name}"`).toBeDefined();
      if (name === "importOscal") {
        // importOscal takes raw JSON `content`, not clientId — its edges are
        // covered in the dedicated describe below.
        expect(() => schema.parse({})).toThrow(ZodError); // content missing
        expect(() => schema.parse(MIN_INPUT[name])).not.toThrow();
        continue;
      }
      if (name === "cmmcPractices") {
        // cmmcPractices carries NO clientId — family/level/search are all
        // optional, so an empty object parses; its edges are covered in the
        // dedicated describe below.
        expect(() => schema.parse({})).not.toThrow();
        expect(() => schema.parse(MIN_INPUT[name])).not.toThrow();
        continue;
      }
      expect(() => schema.parse({}), `"${name}" without clientId`).toThrow(ZodError);
      expect(
        () => schema.parse({ ...MIN_INPUT[name], clientId: "5" }),
        `"${name}" string clientId`
      ).toThrow(ZodError);
      expect(() => schema.parse(MIN_INPUT[name])).not.toThrow();
    }
  });
});

// ── Auth gate ────────────────────────────────────────────────────────────────

describe("federal-workflows router — authentication gate", () => {
  it("all 10 procedures reject a missing user with TRPCError UNAUTHORIZED before touching the DB", async () => {
    dbMocks.getDb.mockResolvedValue(null);
    const router = buildRouter();
    const calls = ALL_ROUTES.map((name) =>
      (router as any)[name].handler({ input: MIN_INPUT[name], ctx: {} })
    );
    for (const call of calls) {
      await expect(call).rejects.toBeInstanceOf(TRPCError);
      await expect(call).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    }
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });
});

// ── Zod validation edges ─────────────────────────────────────────────────────

describe("federal-workflows router — zod BAD_REQUEST edges", () => {
  it("syncSarToPoam requires a numeric sarId alongside clientId", () => {
    const router = buildRouter();
    const schema = (router as any).syncSarToPoam.schema;
    expect(() => schema.parse({ clientId: 1 })).toThrow(ZodError); // sarId missing
    expect(() => schema.parse({ clientId: 1, sarId: "9" })).toThrow(ZodError);
    expect(() => schema.parse({ sarId: 9 })).toThrow(ZodError); // clientId missing
    expect(schema.parse({ clientId: 1, sarId: 9 })).toEqual({ clientId: 1, sarId: 9 });
  });

  it("the OSCAL/eMASS exports require their artifact ids (sspId / poamId)", () => {
    const router = buildRouter();
    expect(() => (router as any).exportSspOscal.schema.parse({ clientId: 1 })).toThrow(ZodError);
    expect(() => (router as any).exportSspOscal.schema.parse({ clientId: 1, sspId: "x" })).toThrow(ZodError);
    expect(() =>
      (router as any).exportSspOscal.schema.parse({ clientId: 1, sspId: 3 })
    ).not.toThrow();

    for (const name of ["exportPoamOscal", "exportPoamEmassCsv"]) {
      const schema = (router as any)[name].schema;
      expect(() => schema.parse({ clientId: 1 }), `${name} without poamId`).toThrow(ZodError);
      expect(() => schema.parse({ clientId: 1, poamId: true }), `${name} boolean poamId`).toThrow(ZodError);
    }
  });

  it("malformed input is rejected as TRPCError BAD_REQUEST before any handler runs (no DB)", async () => {
    dbMocks.getDb.mockResolvedValue(null);
    const router = buildRouter();

    await expect(
      (router as any).getSprsBreakdown.handler({ input: {}, ctx: { user: { id: 1 } } })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      (router as any).syncSarToPoam.handler({ input: { clientId: 1 }, ctx: { user: { id: 1 } } })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      (router as any).getReportingClocks.handler({ input: { clientId: "seven" }, ctx: { user: { id: 1 } } })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });
});

// ── getSprsBreakdown ─────────────────────────────────────────────────────────

// ———— GAP-20: cmmcPractices — pure register passthrough (cycle 44) ————

describe("federal-workflows router — cmmcPractices (GAP-20 pure passthrough)", () => {
  it("calls getCmmcPracticeRegister with the PARSED input and returns its result by identity", async () => {
    const sentinel = {
      total: 2,
      families: [],
      practices: [
        { id: "AC-L1-3.1.1", family: "AC", level: 1 },
        { id: "SC-L2-3.13.1", family: "SC", level: 2 },
      ],
    };
    const spy = cmmcRegisterMocks.getCmmcPracticeRegister;
    spy.mockReset();
    spy.mockReturnValue(sentinel);
    const out = await (buildRouter() as any).cmmcPractices.handler({
      input: { family: " ac ", level: 2, search: "Encrypt" },
      ctx: { user: { id: 1 } },
    });
    // Passthrough identity: the handler returns the engine result object
    // itself, with no cloning, re-shaping or envelope.
    expect(out).toBe(sentinel);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith({ family: "AC", level: 2, search: "Encrypt" });
  });

  it("input schema: family normalizes trim+uppercase; search passes through; empty object parses", () => {
    const schema = (buildRouter() as any).cmmcPractices.schema;
    expect(schema.parse({ family: " ac " })).toEqual({ family: "AC" });
    expect(schema.parse({ family: "\tsc\n" })).toEqual({ family: "SC" });
    expect(schema.parse({ search: "  Encrypt CUI  " })).toEqual({ search: "  Encrypt CUI  " });
    // All fields optional: an empty filter parses to the empty object.
    expect(schema.parse({})).toEqual({});
    // Unknown keys are stripped by default z.object behaviour (as-implemented).
    expect(schema.parse({ rogue: "x", clientId: 7 })).toEqual({});
  });

  it("input schema: level accepts only literal 1|2|3 and rejects 4 / \"2\" / 0 / true with ZodError", () => {
    const schema = (buildRouter() as any).cmmcPractices.schema;
    for (const ok of [1, 2, 3]) {
      expect(() => schema.parse({ level: ok }), `level=${ok} accepted`).not.toThrow();
    }
    for (const bad of [4, "2", 0, true]) {
      let caught: unknown;
      try {
        schema.parse({ level: bad });
      } catch (err) {
        caught = err;
      }
      expect(caught, `level=${JSON.stringify(String(bad))} must be rejected`).toBeInstanceOf(ZodError);
    }
  });

  it("is pure: invoking the handler never touches the DB layer (getDb receives ZERO calls)", async () => {
    dbMocks.getDb.mockResolvedValue(null); // poisoned conn — must never even be fetched
    const spy = cmmcRegisterMocks.getCmmcPracticeRegister;
    spy.mockReset();
    spy.mockReturnValue({ total: 0, families: [], practices: [] });
    await expect(
      (buildRouter() as any).cmmcPractices.handler({
        input: { family: "ac", level: 3 },
        ctx: { user: { id: 1 } },
      })
    ).resolves.toEqual({ total: 0, families: [], practices: [] });
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });
});

// NOTE (cycle 45, GAP-21 rewiring): getSprsBreakdown no longer computes an
// inline family-weighted approximation. It maps open POA&M controls onto bare
// NIST SP 800-171 practice ids, resolves them onto canonical CMMC register
// entries via getPracticesBy800171Id, and delegates to
// computeSprsPerPracticeDeduction (per-practice DoD Assessment Methodology
// deductions). Both engine functions are SPIES here: these tests pin the
// ROUTER WIRING (bare ids in, canonical entries flowing into the engine,
// engine envelope projected verbatim onto the response + snapshot upsert),
// while the exact per-practice point math is pinned against the REAL engine
// in cmmcSprsDeduction.test.ts.
describe("federal-workflows router - getSprsBreakdown (SPRS math, GAP-21 engine delegation)", () => {
  /** Canonical register entry stub as produced by getPracticesBy800171Id. */
  const practice = (id: string, family: string, level: 1 | 2 | 3) => ({ id, family, level });

  it("maps an open POA&M control to its bare 800-171 id, resolves it on the register and projects the engine result verbatim (insert path)", async () => {
    const resolveSpy = cmmcRegisterMocks.getPracticesBy800171Id;
    const deductionSpy = cmmcRegisterMocks.computeSprsPerPracticeDeduction;

    const acL111 = practice("AC-L1-3.1.1", "AC", 1);
    // The bare id emitted by the router's AC-2 -> ["3.1.1"] control map
    // resolves onto its canonical register entry; anything else resolves to
    // nothing.
    resolveSpy.mockImplementation((bareId: unknown) =>
      bareId === "3.1.1" ? [acL111] : []
    );

    // Per-practice DoD Assessment Methodology result shaped exactly like the
    // real engine output (values stubbed - real point math lives in
    // cmmcSprsDeduction.test.ts).
    const engineResult = {
      deductedPoints: 2,
      score: 108,
      unmetCount: 1,
      unknownIdCount: 0,
      familiesAffected: ["AC"],
      breakdown: [{ id: "AC-L1-3.1.1", family: "AC", points: 2 }],
    };
    deductionSpy.mockReturnValue(engineResult);

    const { calls } = mockDb(
      [[]],
      [[{ control_id: "AC-2", status: "open", original_risk_rating: "high" }]]
    );
    const router = buildRouter();

    const result = await (router as any).getSprsBreakdown.handler({
      input: { clientId: 7 },
      ctx: { user: { id: 1 } },
    });

    // Wiring: bare id IN, resolved canonical entry flowing INTO the engine.
    expect(resolveSpy).toHaveBeenCalledTimes(1);
    expect(resolveSpy).toHaveBeenCalledWith("3.1.1");
    expect(deductionSpy).toHaveBeenCalledTimes(1);
    expect(deductionSpy).toHaveBeenCalledWith([acL111]);

    // Response contract: engine envelope projected onto the router shape.
    expect(result).toMatchObject({
      startingScore: 110,
      deduction: 2,
      score: 108,
      unmetPracticeCount: 1,
      unknownIdCount: 0,
      familiesAffected: ["AC"],
      openPoamItems: 1,
      model: "per-practice-dod-assessment-methodology",
    });
    expect(result.score).toBe(Math.max(0, 110 - result.deduction));
    expect(result.breakdown).toBe(engineResult.breakdown); // passthrough identity
    // No prior snapshot existed -> persisted as a NEW computed assessment.
    expect(calls.inserts).toHaveLength(1);
    expect(calls.inserts[0]).toMatchObject({ clientId: 7, score: 108, status: "computed" });
    expect(calls.updates).toHaveLength(0);
  });

  it("fans every open control out through the resolver, deduping shared practices before resolution while unmapped controls contribute nothing", async () => {
    const resolveSpy = cmmcRegisterMocks.getPracticesBy800171Id;
    const deductionSpy = cmmcRegisterMocks.computeSprsPerPracticeDeduction;

    const acL111 = practice("AC-L1-3.1.1", "AC", 1);
    const ir622 = practice("IR-L2-3.6.2", "IR", 2);
    const ir633 = practice("IR-L2-3.6.3", "IR", 2);
    const ps1122 = practice("PS-L2-3.11.2", "PS", 2);
    const registry: Record<string, unknown[]> = {
      "3.1.1": [acL111],
      "3.6.2": [ir622],
      "3.6.3": [ir633],
      "3.11.2": [ps1122],
    };
    resolveSpy.mockImplementation((bareId: unknown) => registry[bareId as string] ?? []);

    const engineResult = {
      deductedPoints: 12,
      score: 98,
      unmetCount: 4,
      unknownIdCount: 0,
      familiesAffected: ["AC", "IR", "PS"],
      breakdown: [
        { id: "AC-L1-3.1.1", family: "AC", points: 2 },
        { id: "IR-L2-3.6.2", family: "IR", points: 3 },
        { id: "IR-L2-3.6.3", family: "IR", points: 3 },
        { id: "PS-L2-3.11.2", family: "PS", points: 4 },
      ],
    };
    deductionSpy.mockReturnValue(engineResult);

    // CA-5 and RA-5 share practice 3.11.2 (collapsed by the bare-id Set);
    // PE-2 has NO entry in the router's control map -> contributes nothing.
    mockDb(
      [[]],
      [
        [
          { control_id: "AC-2", status: "open", original_risk_rating: "high" },
          { control_id: "IR-8", status: "open", original_risk_rating: "moderate" },
          { control_id: "CA-5", status: "ongoing", original_risk_rating: "low" },
          { control_id: "RA-5", status: "ongoing", original_risk_rating: "low" }, // same practice as CA-5 -> counted once
          { control_id: "PE-2", status: "open", original_risk_rating: "low" }, // unmapped -> ignored
        ],
      ]
    );
    const router = buildRouter();

    const result = await (router as any).getSprsBreakdown.handler({
      input: { clientId: 7 },
      ctx: { user: { id: 1 } },
    });

    // Exactly the 4 DISTINCT bare ids were resolved, one call each.
    expect(resolveSpy).toHaveBeenCalledTimes(4);
    for (const bare of ["3.1.1", "3.6.2", "3.6.3", "3.11.2"]) {
      expect(resolveSpy).toHaveBeenCalledWith(bare);
    }
    // Resolved canonical entries (first-seen order) feed the engine as ONE batch.
    expect(deductionSpy).toHaveBeenCalledTimes(1);
    expect(deductionSpy).toHaveBeenCalledWith([acL111, ir622, ir633, ps1122]);

    expect(result).toMatchObject({
      startingScore: 110,
      deduction: 12,
      score: 98,
      unmetPracticeCount: 4,
      unknownIdCount: 0,
      familiesAffected: ["AC", "IR", "PS"],
      openPoamItems: 5, // 5 open ROWS even though only 4 distinct practices map
    });
    expect(result.breakdown).toBe(engineResult.breakdown);
    expect(result.score).toBe(Math.max(0, 110 - result.deduction));
  });

  it("scores a clean 110 with zero deduction when nothing is open, updating the existing snapshot", async () => {
    const resolveSpy = cmmcRegisterMocks.getPracticesBy800171Id;
    const deductionSpy = cmmcRegisterMocks.computeSprsPerPracticeDeduction;

    // Zeroed engine shape for an empty resolution batch.
    const engineResult = {
      deductedPoints: 0,
      score: 110,
      unmetCount: 0,
      unknownIdCount: 0,
      familiesAffected: [],
      breakdown: [],
    };
    deductionSpy.mockReturnValue(engineResult);

    const { calls } = mockDb([[{ id: 77, clientId: 7, status: "computed" }]], [[]]);
    const router = buildRouter();

    const result = await (router as any).getSprsBreakdown.handler({
      input: { clientId: 7 },
      ctx: { user: { id: 1 } },
    });

    // No open items -> NO bare ids reach the resolver; the engine still runs,
    // but over an empty batch.
    expect(resolveSpy).not.toHaveBeenCalled();
    expect(deductionSpy).toHaveBeenCalledTimes(1);
    expect(deductionSpy).toHaveBeenCalledWith([]);

    expect(result).toMatchObject({
      startingScore: 110,
      deduction: 0,
      score: 110,
      unmetPracticeCount: 0,
      unknownIdCount: 0,
      openPoamItems: 0,
    });
    expect(result.familiesAffected).toEqual([]);
    expect(result.breakdown).toEqual([]);
    // Existing snapshot UPDATED in place, never duplicated.
    expect(calls.updates).toHaveLength(1);
    expect(calls.updates[0]).toMatchObject({ score: 110 });
    expect(calls.inserts).toHaveLength(0);
  });
});

// ── getCmmcReadiness ─────────────────────────────────────────────────────────

describe("federal-workflows router — getCmmcReadiness", () => {
  it("early-returns { ready: false, reason: 'No SSP on file' } when the client has no SSP (no further queries)", async () => {
    const { calls } = mockDb([[]]);
    const router = buildRouter();

    const result = await (router as any).getCmmcReadiness.handler({
      input: { clientId: 42 },
      ctx: { user: { id: 1 } },
    });

    expect(result).toEqual({ ready: false, reason: "No SSP on file" });
    expect(calls.selects).toBe(1); // only the SSP lookup ran
    expect(calls.executed).toHaveLength(0);
  });

  it("rolls controls up into a readiness percentage, SS/PB band, and gap list", async () => {
    const ctl = (id: number, implementationStatus: string, evidenceLinks: string[] | null) => ({
      id,
      sspId: 1,
      implementationStatus,
      evidenceLinks,
    });
    const controls = [
      ...Array.from({ length: 6 }, (_, i) => ctl(i + 1, "implemented", ["ev-link"])),
      ctl(7, "partial", ["partial-evidence"]),
      ctl(8, "partially_implemented", null),
      ctl(9, "planned", null),
      ctl(10, "planned", null),
    ];
    // select order: SSPs → controls · then execute order: open-POA&M count
    mockDb(
      [[{ id: 1 }, { id: 2 }], controls],
      [[{ n: 5 }]]
    );
    const router = buildRouter();

    const result = await (router as any).getCmmcReadiness.handler({
      input: { clientId: 7 },
      ctx: { user: { id: 1 } },
    });

    // assessed=10, raw = ((6 + 2*0.5)/10)*100 = 70; evidence penalty = (10-7)/10*15 = 4.5 → round(65.5) = 66
    expect(result).toMatchObject({
      assessedControls: 10,
      implemented: 6,
      partial: 2,
      planned: 2,
      evidenceBackedControls: 7,
      openWeaknesses: 5,
      readinessPct: 66,
      ssPBProxy: "SS/PB 3 (Generally Effective)",
    });
    expect(result.gapsToClose).toEqual([
      "2 partially-implemented controls need completion",
      "2 planned-only controls need implementation",
      "3 controls lack linked evidence",
      "5 open POA&M weaknesses",
    ]);
  });
});

// ── getReportingClocks ───────────────────────────────────────────────────────

describe("federal-workflows router — getReportingClocks (DFARS 72h clock)", () => {
  const T = NOW.getTime();

  function incident(over: Partial<Record<string, unknown>> = {}) {
    return {
      id: 1,
      title: "Incident",
      severity: "high",
      detectedAt: new Date(T),
      reportedToAuthorities: false,
      isSignificant: false,
      ...over,
    };
  }

  it("classifies reported / overdue / urgent / on-track clocks deterministically from injected incidents", async () => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    try {
      mockDb([
        [
          incident({ id: 11, title: "Contained", detectedAt: new Date(T - 96 * HOUR), reportedToAuthorities: true, isSignificant: true }),
          incident({ id: 12, title: "Stale", detectedAt: new Date(T - 60 * HOUR) }), // 12h past the 72h mark? no: 12h LEFT
          incident({ id: 13, title: "Fresh", detectedAt: new Date(T - 12 * HOUR) }),
        ],
      ]);
      const router = buildRouter();

      const { clocks, note } = await (router as any).getReportingClocks.handler({
        input: { clientId: 7 },
        ctx: { user: { id: 1 } },
      });

      expect(clocks).toHaveLength(3);

      // Reported to authorities → clock stopped
      expect(clocks[0]).toMatchObject({
        incidentId: 11,
        dibnetStatus: "reported",
        circiaStatus: "reported",
        hoursRemainingForDibNet: null,
        dfars7012Applies: true,
        dfarsReportDueBy: new Date(T - 96 * HOUR + 72 * HOUR).toISOString(),
        evidenceRetentionUntil: new Date(T - 96 * HOUR + 90 * 24 * HOUR).toISOString(),
        fismaFeedRequired: true,
      });

      // 60h elapsed of 72h → 12h remaining → URGENT
      expect(clocks[1]).toMatchObject({
        incidentId: 12,
        dibnetStatus: "URGENT (<24h)",
        circiaStatus: "pending",
        hoursRemainingForDibNet: 12,
        fismaFeedRequired: false,
      });

      // 12h elapsed → 60h remaining → on-track
      expect(clocks[2]).toMatchObject({
        incidentId: 13,
        dibnetStatus: "on-track",
        hoursRemainingForDibNet: 60,
      });

      // Fully overdue classification (detected > 72h ago, unreported)
      mockDb([[incident({ id: 14, detectedAt: new Date(T - 96 * HOUR) })]]);
      const { clocks: [overdue] } = await (router as any).getReportingClocks.handler({
        input: { clientId: 7 },
        ctx: { user: { id: 1 } },
      });
      expect(overdue.dibnetStatus).toBe("OVERDUE");
      expect(overdue.hoursRemainingForDibNet).toBe(0); // clamped, never negative
      expect(note).toMatch(/DFARS 252\.204-7012/);
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns an empty clock list with the DFARS guidance note for clients without incidents", async () => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    try {
      mockDb([[]]);
      const router = buildRouter();

      const result = await (router as any).getReportingClocks.handler({
        input: { clientId: 7 },
        ctx: { user: { id: 1 } },
      });

      expect(result.clocks).toEqual([]);
      expect(result.note).toMatch(/90 days/); // evidence-retention guidance present
    } finally {
      vi.useRealTimers();
    }
  });
});

// ── syncSarToPoam ────────────────────────────────────────────────────────────

describe("federal-workflows router — syncSarToPoam", () => {
  const SAR_ROW = {
    id: 9,
    clientId: 7,
    title: "2026 Annual Assessment",
    systemAcronym: "APEX-CORE",
    sspId: 3,
    fismaSystemId: 11,
    assessorName: "DCMA Assessor",
    assessmentDate: new Date("2026-08-01T00:00:00.000Z"),
  };

  it("throws the plain implemented Error 'SAR not found' (not TRPCError) for an unknown SAR", async () => {
    mockDb([[]]);
    const router = buildRouter();

    const call = (router as any).syncSarToPoam.handler({
      input: { clientId: 7, sarId: 999 },
      ctx: { user: { id: 1 } },
    });
    await expect(call).rejects.toBeInstanceOf(Error);
    await expect(call).rejects.not.toBeInstanceOf(TRPCError);
    await expect(call).rejects.toThrow("SAR not found");
  });

  it("creates a remediation POA&M and one POA&M item per actionable finding (satisfied/N/A skipped, risk mapped, due dates by risk)", async () => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    try {
      const findings = [
        { id: 1, controlId: "AC-2", result: "satisfied", riskLevel: "high", observation: "ok", remediationPlan: "" },
        {
          id: 2,
          controlId: "AC-2(3)",
          result: "deficient",
          riskLevel: "high",
          residualRiskLevel: "moderate",
          observation: "Automatic disablement missing",
          remediationPlan: "Deploy auto-disable",
        },
        {
          id: 3,
          controlId: "IR-8",
          result: "partially satisfied",
          riskLevel: "moderate",
          residualRiskLevel: null,
          observation: "IR plan outdated",
          remediationPlan: "Refresh IR plan",
        },
      ];
      const { calls } = mockDb([[SAR_ROW], findings, [], []]); // SAR, findings, existing POA&M lookup, dedupe lookup
      const router = buildRouter();

      const result = await (router as any).syncSarToPoam.handler({
        input: { clientId: 7, sarId: 9 },
        ctx: { user: { id: 1 } },
      });

      expect(result).toEqual({ poamId: 9001, findingsTotal: 3, actionable: 2, created: 2 });

      // Parent POA&M created with the deterministic title/acronym passthrough
      expect(calls.inserts[0]).toMatchObject({
        clientId: 7,
        status: "open",
        sspId: 3,
        fismaSystemId: 11,
        title: "POA&M — APEX-CORE Remediation (2026 Annual Assessme)",
      });

      // High-risk finding: +90 days, residual risk downgraded high → medium
      const hi = new Date(NOW);
      hi.setDate(hi.getDate() + 90);
      expect(calls.inserts[1]).toMatchObject({
        poamId: 9001,
        controlId: "AC-2(3)",
        sourceIdentifier: "SAR-9-AC-2(3)",
        status: "open",
        originalRiskRating: "high",
        adjustedRiskRating: "medium",
        weaknessDetectorSource: "Independent Assessment",
        pointOfContact: "DCMA Assessor",
      });
      expect((calls.inserts[1].scheduledCompletionDate as Date).getTime()).toBe(hi.getTime());

      // Moderate finding: +180 days
      const mod = new Date(NOW);
      mod.setDate(mod.getDate() + 180);
      expect(calls.inserts[2]).toMatchObject({
        controlId: "IR-8",
        sourceIdentifier: "SAR-9-IR-8",
        originalRiskRating: "medium",
        adjustedRiskRating: "medium",
      });
      expect((calls.inserts[2].scheduledCompletionDate as Date).getTime()).toBe(mod.getTime());
    } finally {
      vi.useRealTimers();
    }
  });
});

// ── OSCAL / eMASS exports ────────────────────────────────────────────────────

describe("federal-workflows router — OSCAL exports", () => {
  const FIXED = new Date("2026-08-24T09:30:00.000Z");

  it("exportSspOscal throws plain Error 'SSP not found' for an unknown SSP", async () => {
    mockDb([[]]);
    const router = buildRouter();
    await expect(
      (router as any).exportSspOscal.handler({ input: { clientId: 7, sspId: 999 }, ctx: { user: { id: 1 } } })
    ).rejects.toThrow("SSP not found");
  });

  it("exportSspOscal emits an OSCAL 1.1.2 system-security-plan envelope with normalized control statuses", async () => {
    const ssp = {
      id: 3,
      clientId: 7,
      title: "APEX Core SSP",
      systemName: "APEX Core",
      status: "operational",
      version: 2,
      boundaryDescription: "The APEX production boundary",
      content: null,
      updatedAt: FIXED,
    };
    const controls = [
      { controlId: "AC-2", implementationStatus: "implemented", implementationDescription: "Done", responsibleRole: "ISO", evidenceLinks: ["a"] },
      { controlId: "CM-6", implementationStatus: "partially_implemented", implementationDescription: "Half", responsibleRole: "Ops", evidenceLinks: [] },
      { controlId: "SC-28", implementationStatus: "planned", implementationDescription: "Later", responsibleRole: "CTO", evidenceLinks: null },
      { controlId: "PE-2", implementationStatus: "not_applicable", implementationDescription: "Cloud", responsibleRole: null, evidenceLinks: null },
      { controlId: "XX-1", implementationStatus: "something-new", implementationDescription: "?", responsibleRole: null, evidenceLinks: null },
    ];
    mockDb([[ssp], controls]);
    const router = buildRouter();

    const result = await (router as any).exportSspOscal.handler({
      input: { clientId: 7, sspId: 3 },
      ctx: { user: { id: 1 } },
    });

    expect(result.oscalVersion).toBe("1.1.2");
    // Cycle 43: the root uuid is now a deterministic RFC-4122 v4 digest of
    // `oscal-ssp-${ssp.id}-${clientId}` (was the raw "oscal-ssp-3-7" tag).
    expect(result.uuid).toMatch(UUID_V4_RE);
    expect(result.metadata).toEqual({
      title: "APEX Core SSP",
      lastModified: FIXED.toISOString(),
      version: "2",
      oscalModel: "system-security-plan",
    });
    expect(result.systemCharacteristics).toMatchObject({
      systemName: "APEX Core",
      description: "The APEX production boundary",
      securitySensitivityLevel: "moderate",
    });
    expect(result.controlImplementationSrc.map((c: any) => c.implementedRequirement.status)).toEqual([
      "implemented",
      "partial",
      "planned",
      "not-applicable",
      "planned", // unknown statuses fall back to planned
    ]);
    expect(result.controlImplementationSrc[0]).toMatchObject({
      controlId: "AC-2",
      implementedRequirement: { description: "Done", responsibleRole: "ISO", evidenceLinks: ["a"] },
    });
  });

  it("exportPoamOscal throws plain Error 'POA&M not found' for an unknown POA&M", async () => {
    mockDb([[]]);
    const router = buildRouter();
    await expect(
      (router as any).exportPoamOscal.handler({ input: { clientId: 7, poamId: 999 }, ctx: { user: { id: 1 } } })
    ).rejects.toThrow("POA&M not found");
  });

  it("exportPoamOscal maps items to observations/tasks with detector-derived methods and closure status", async () => {
    const poam = { id: 8, clientId: 7, title: "POA&M — Remediation", updatedAt: FIXED };
    const due = new Date("2026-09-30T00:00:00.000Z");
    const items = [
      {
        id: 101,
        poamId: 8,
        weaknessName: "Weak patching",
        weaknessDescription: "Servers unpatched",
        weaknessDetectorSource: "Independent Assessment",
        supportingDocuments: null,
        overallRemediationPlan: "Patch monthly",
        scheduledCompletionDate: due,
        controlId: "SI-2",
        status: "open",
        adjustedRiskRating: "high",
      },
      {
        id: 102,
        poamId: 8,
        weaknessName: "Old finding",
        weaknessDescription: "Fixed",
        weaknessDetectorSource: "Continuous Monitoring",
        supportingDocuments: ["doc-1"],
        overallRemediationPlan: "",
        scheduledCompletionDate: null,
        controlId: null,
        status: "closed",
        adjustedRiskRating: "low",
      },
    ];
    mockDb([[poam], items]);
    const router = buildRouter();

    const result = await (router as any).exportPoamOscal.handler({
      input: { clientId: 7, poamId: 8 },
      ctx: { user: { id: 1 } },
    });

    expect(result.oscalVersion).toBe("1.1.2");
    // Cycle 43: deterministic RFC-4122 v4 root uuid (was "oscal-poam-8-7").
    expect(result.uuid).toMatch(UUID_V4_RE);
    expect(result.metadata).toEqual({
      title: "POA&M — Remediation",
      lastModified: FIXED.toISOString(),
      version: "1", // C2/C3-added: String(poam.version ?? 1); stored poam has no version
      oscalModel: "plan-of-action-and-milestones",
    });
    // Independent-assessment findings are examined AND interviewed; every
    // emitted uuid (root, observations, tasks) is now a proper v4 uuid.
    expect(result.observations[0]).toMatchObject({
      uuid: expect.stringMatching(UUID_V4_RE),
      title: "Weak patching",
      methods: ["EXAMINE", "INTERVIEW"],
      relevantEvidence: [],
    });
    expect(result.tasks[0]).toMatchObject({
      uuid: expect.stringMatching(UUID_V4_RE),
      status: "in-progress",
      associatedControls: ["SI-2"],
      riskRating: "high",
      timing: { onDate: due },
    });
    // Continuous-monitoring findings are examine-only; closed items map to completed tasks
    expect(result.observations[1].methods).toEqual(["EXAMINE"]);
    expect(result.observations[1].relevantEvidence).toEqual(["doc-1"]);
    expect(result.tasks[1]).toMatchObject({
      uuid: expect.stringMatching(UUID_V4_RE),
      status: "completed",
      associatedControls: [],
      timing: undefined,
    });
  });
});

describe("federal-workflows router — exportPoamEmassCsv", () => {
  it("produces the eMASS-template header, RFC-safe quoting, and a dated filename", async () => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    try {
      const poam = { id: 8, clientId: 7, title: "POA&M — Remediation", updatedAt: NOW };
      const items = [
        {
          id: 101,
          poamId: 8,
          controlId: "SI-2",
          weaknessName: 'Patching "critical" gaps',
          weaknessDescription: 'Assessor said "patch now"; team agreed',
          pointOfContact: "Security Team",
          weaknessDetectorSource: "Independent Assessment",
          sourceIdentifier: "SAR-9-SI-2",
          status: "open",
          originalRiskRating: "high",
          adjustedRiskRating: "medium",
          scheduledCompletionDate: new Date("2026-09-30T00:00:00.000Z"),
          originalDetectionDate: new Date("2026-08-01T00:00:00.000Z"),
          milestones: [{ milestone: "Remediation plan approved", due: "2026-09-30T00:00:00.000Z" }],
          overallRemediationPlan: "Patch monthly",
          assetIdentifier: "srv-01",
          vendorDependency: "OS vendor",
          falsePositive: true,
        },
      ];
      mockDb([[poam], items]);
      const router = buildRouter();

      const result = await (router as any).exportPoamEmassCsv.handler({
        input: { clientId: 7, poamId: 8 },
        ctx: { user: { id: 1 } },
      });

      expect(result.itemCount).toBe(1);
      expect(result.filename).toBe(`emass_poam_8_${NOW.toISOString().slice(0, 10)}.csv`);

      const [header, row] = result.csv.split("\n");
      expect(header).toBe(
        [
          "POAM ID",
          "Control ID",
          "Weakness Name",
          "Weakness Description",
          "Point of Contact",
          "Detection Source",
          "Source Identifier",
          "Status",
          "Original Risk Rating",
          "Adjusted Risk Rating",
          "Scheduled Completion",
          "Detection Date",
          "Milestones",
          "Remediation Plan",
          "Asset Identifier",
          "Vendor Dependency",
          "False Positive",
        ].join(",")
      );
      // Quotes doubled per RFC 4180; booleans rendered Yes; dates cut to YYYY-MM-DD
      expect(row).toBe(
        [
          '"ACG-POAM-8-101"',
          '"SI-2"',
          '"Patching ""critical"" gaps"',
          '"Assessor said ""patch now""; team agreed"',
          '"Security Team"',
          '"Independent Assessment"',
          '"SAR-9-SI-2"',
          '"open"',
          '"high"',
          '"medium"',
          '"2026-09-30"',
          '"2026-08-01"',
          '"Remediation plan approved (due 2026-09-30T00:00:00.000Z)"',
          '"Patch monthly"',
          '"srv-01"',
          '"OS vendor"',
          '"Yes"',
        ].join(",")
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("throws plain Error 'POA&M not found' and renders empty CSV rows for a POA&M without items", async () => {
    mockDb([[{ id: 8, clientId: 7, title: "POA&M", updatedAt: NOW }], []]);
    const router = buildRouter();

    const result = await (router as any).exportPoamEmassCsv.handler({
      input: { clientId: 7, poamId: 8 },
      ctx: { user: { id: 1 } },
    });
    expect(result.itemCount).toBe(0);
    expect(result.csv).not.toContain(";"); // header only

    mockDb([[]]);
    await expect(
      (router as any).exportPoamEmassCsv.handler({ input: { clientId: 7, poamId: 404 }, ctx: { user: { id: 1 } } })
    ).rejects.toThrow("POA&M not found");
  });
});

// ── getConMonDashboard ───────────────────────────────────────────────────────

describe("federal-workflows router — getConMonDashboard", () => {
  it("assembles systems, control posture, POA&M aging, RMF steps and latest FISMA report", async () => {
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
    try {
      const yearAgo = new Date(NOW.getTime() - 365 * 24 * HOUR);
      const { calls } = mockDb(
        [
          // systems, sspRows, controls (via inArray), rmfWorkflows, inheritances, latest report
          [{ id: 1, name: "Apex Production", acronym: "APEX", fips199Overall: "moderate", status: "ATO", updatedAt: yearAgo }],
          [{ id: 51 }],
          [
            { implementationStatus: "implemented" },
            { implementationStatus: "implemented" },
            { implementationStatus: "partially_implemented" },
            { implementationStatus: "planned" },
          ],
          [{ systemName: "Apex Production", currentStep: 6, stepStatus: "complete" }],
          [{ id: 1 }],
          [{ id: 301, title: "FISMA Q3 feed", updatedAt: NOW }],
        ],
        [
          // poamAging rows
          [{ id: 5, weakness_name: "Overdue patching", original_risk_rating: "high", days_overdue: 42 }],
        ]
      );
      const router = buildRouter();

      const result = await (router as any).getConMonDashboard.handler({
        input: { clientId: 7 },
        ctx: { user: { id: 1 } },
      });

      expect(result.systems).toEqual([
        {
          id: 1,
          name: "Apex Production",
          acronym: "APEX",
          fips199: "moderate",
          status: "ATO",
          authorizationCycleEnds: new Date(yearAgo.getTime() + 3 * 365 * 24 * HOUR).toISOString(),
        },
      ]);
      expect(result.controlPosture).toEqual({ total: 4, implemented: 2, partial: 1, inherited: 1 });
      expect(result.overduePoamItems).toEqual([
        { id: 5, weakness: "Overdue patching", risk: "high", daysOverdue: 42 },
      ]);
      expect(result.rmfSteps).toEqual([{ system: "Apex Production", currentStep: 6, status: "complete" }]);
      expect(result.significantChangePending).toBe(false);
      expect(result.latestFismaReport).toMatchObject({ id: 301, title: "FISMA Q3 feed" });
      expect(calls.executed).toHaveLength(1); // single aging SQL round-trip
    } finally {
      vi.useRealTimers();
    }
  });
});

// ── importOscal (cycle 41, GAP-19) ───────────────────────────────────────────

const VALID_SSP = {
  oscalVersion: "1.1.2",
  uuid: "11111111-2222-3333-4444-555555555555",
  metadata: {
    title: "Apex SSP",
    lastModified: "2026-08-24T12:00:00.000Z",
    version: "3",
  },
  systemCharacteristics: { systemName: "Apex" },
  controls: [
    { controlId: "ac-2", statement: "Access control policy enforced.", status: "implemented" },
    { controlId: "au-6", description: "Audit review weekly.", status: "partial" },
  ],
};

describe("federal-workflows router — importOscal (GAP-19)", () => {
  it("zod schema requires string content; missing/non-string content is BAD_REQUEST-shaped ZodError", () => {
    const router = buildRouter();
    const schema = (router as any).importOscal.schema;
    expect(() => schema.parse({})).toThrow(ZodError);
    expect(() => schema.parse({ content: 42 })).toThrow(ZodError);
    expect(schema.parse({ content: "{}" })).toEqual({ content: "{}" });
  });

  it("validates + normalizes a well-formed SSP document without touching the DB", async () => {
    dbMocks.getDb.mockClear();
    const router = buildRouter();
    const result = await (router as any).importOscal.handler({
      input: { content: JSON.stringify(VALID_SSP) },
      ctx: { user: { id: 1 } },
    });
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.normalized).toMatchObject({
      oscalVersion: "1.1.2",
      docType: "system-security-plan",
      uuid: VALID_SSP.uuid,
      title: "Apex SSP",
      lastModified: "2026-08-24T12:00:00.000Z",
      version: "3",
    });
    expect(result.normalized.controls.map((c: any) => c.controlId)).toEqual(["ac-2", "au-6"]);
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });

  it("unparseable JSON returns an invalid-json issue list instead of throwing", async () => {
    const router = buildRouter();
    const result = await (router as any).importOscal.handler({
      input: { content: "{not json" },
      ctx: { user: { id: 1 } },
    });
    expect(result.valid).toBe(false);
    expect(result.normalized).toBeNull();
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe("invalid-json");
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });

  it("structurally-invalid OSCAL surfaces engine error codes with normalized null", async () => {
    const router = buildRouter();
    const result = await (router as any).importOscal.handler({
      input: { content: JSON.stringify({ results: [] }) },
      ctx: { user: { id: 1 } },
    });
    expect(result.valid).toBe(false);
    expect(result.normalized).toBeNull();
    const codes = result.errors.map((e: any) => e.code).sort();
    expect(codes.length).toBeGreaterThan(0);
    expect(codes.every((c: string) => c === c.toLowerCase())).toBe(true); // kebab-case convention
    // empty `results` array is a warning anomaly, not an error
    expect(result.warnings.some((w: any) => w.code === "empty-collection")).toBe(true);
  });

  it("rides clientProcedure as a mutation and rejects unauthenticated callers pre-DB", async () => {
    const router = buildRouter();
    expect((router as any).importOscal.type).toBe("mutation");
    await expect(
      (router as any).importOscal.handler({ input: { content: "{}" }, ctx: {} })
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

// ── importOscal contract edges (GAP-19 QA cycle) ─────────────────────────────

/** assessment-results fixture exercising the findings passthrough. */
const AR_DOC = {
  oscalVersion: "1.1.2",
  uuid: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
  metadata: { title: "AR", lastModified: "2026-08-24T12:00:00.000Z", version: "1" },
  results: [
    { uuid: "11111111-2222-3333-4444-555555555555", controlId: "cm-2", result: "fail", title: "CM-2 gap" },
    { uuid: "99999999-2222-3333-4444-555555555555", controlId: "ac-2", result: "pass", title: "AC-2 ok" },
  ],
};

describe("federal-workflows router — importOscal contract edges (GAP-19 QA)", () => {
  const invokeImport = (router: any, content: string): Promise<any> =>
    router.importOscal.handler({ input: { content }, ctx: { user: { id: 1 } } });

  it("exported-schema witness: oscalImportInputSchema IS the attached procedure schema and enforces string content", () => {
    const router = buildRouter();
    expect(oscalImportInputSchema).toBeDefined();
    // Single source of truth — the router registers this exact schema object.
    expect(router.importOscal.schema).toBe(oscalImportInputSchema);

    expect(oscalImportInputSchema.safeParse({ content: "{}" }).success).toBe(true);
    for (const badContent of [undefined, 42, true, null, ["{}"], {}]) {
      expect(
        oscalImportInputSchema.safeParse({ content: badContent }).success,
        `content=${JSON.stringify(badContent)}`,
      ).toBe(false);
    }
    expect(oscalImportInputSchema.safeParse({}).success).toBe(false); // content missing
  });

  it("handler-level zod gates: missing/non-string/array/null content is BAD_REQUEST before any work", async () => {
    dbMocks.getDb.mockResolvedValue(null);
    const router = buildRouter();
    for (const input of [{}, { content: 42 }, { content: ["{}"] }, { content: null }]) {
      await expect(
        router.importOscal.handler({ input, ctx: { user: { id: 1 } } })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });

  it("mutation-shape witness: every outcome returns exactly valid/errors/warnings/normalized", async () => {
    const router = buildRouter();
    const outcomes = [
      await invokeImport(router, "{not json"),        // parse failure
      await invokeImport(router, ""),                 // empty text is also unparseable
      await invokeImport(router, '"just a string"'),  // parses to a non-object
      await invokeImport(router, "null"),             // parses to null
      await invokeImport(router, JSON.stringify(VALID_SSP)), // success
    ];
    for (const r of outcomes) {
      expect(Object.keys(r).sort()).toEqual(["errors", "normalized", "valid", "warnings"]);
    }
    // Parse-failure branch carries its dedicated issue and no warnings
    expect(outcomes[0].errors[0].code).toBe("invalid-json");
    expect(outcomes[0].warnings).toEqual([]);
    expect(outcomes[0].normalized).toBeNull();
    expect(outcomes[1].errors[0].code).toBe("invalid-json");
    // Parsed-but-non-object falls through to the engine's not-an-object gate
    expect(outcomes[2].errors.map((e: any) => e.code)).toEqual(["not-an-object"]);
    expect(outcomes[2].normalized).toBeNull();
    expect(outcomes[3].valid).toBe(false);
    expect(outcomes[4].valid).toBe(true);
  });

  it("passthrough is deterministic: identical content yields deep-identical verdicts", async () => {
    const router = buildRouter();
    const good = JSON.stringify(VALID_SSP);
    expect(await invokeImport(router, good)).toEqual(await invokeImport(router, good));
    expect(await invokeImport(router, "{bad")).toEqual(await invokeImport(router, "{bad"));
  });

  it("router path enforces the engine's default 5_000_000-character cap (oversized -> size-exceeded)", async () => {
    dbMocks.getDb.mockClear();
    const router = buildRouter();
    const base = VALID_SSP as Record<string, unknown>;
    const overhead = JSON.stringify({ ...base, pad: "" }).length - JSON.stringify(base).length;
    const doc = {
      ...base,
      pad: "x".repeat(OSCAL_MAX_SERIALIZED_LENGTH + 1 - JSON.stringify(base).length - overhead),
    };
    const content = JSON.stringify(doc);
    expect(content.length).toBe(OSCAL_MAX_SERIALIZED_LENGTH + 1);

    const result = await invokeImport(router, content);
    expect(result.valid).toBe(false);
    expect(result.normalized).toBeNull();
    expect(result.errors.map((e: any) => e.code)).toEqual(["size-exceeded"]);
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });

  it("assessment-results content passes through with sorted findings and docType intact", async () => {
    dbMocks.getDb.mockClear();
    const router = buildRouter();
    const result = await invokeImport(router, JSON.stringify(AR_DOC));
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.normalized.docType).toBe("assessment-results");
    expect(result.normalized.findings.map((f: any) => f.controlId)).toEqual(["ac-2", "cm-2"]);
    expect(result.normalized.controls.map((c: any) => c.controlId)).toEqual(["ac-2", "cm-2"]);
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });
});

// ═══ GAP-19 cycle-43 pinning: OSCAL export ⇄ import round-trip (real engine) ══

describe("federal-workflows router — OSCAL export⇄import round-trip (cycle 43)", () => {
  const FIXED2 = new Date("2026-08-24T09:30:00.000Z");

  /** Root + every observation + every task uuid, in emission order. */
  const collectExportUuids = (doc: any): string[] => [
    doc.uuid,
    ...(doc.observations ?? []).map((o: any) => o.uuid),
    ...(doc.tasks ?? []).map((t: any) => t.uuid),
  ];

  it("exportSspOscal emits a v4 root uuid, unchanged mutation keys, and re-imports valid via the real engine", async () => {
    const ssp = {
      id: 3,
      clientId: 7,
      title: "APEX Core SSP",
      systemName: "APEX Core",
      status: "operational",
      version: 2,
      boundaryDescription: "The APEX production boundary",
      content: null,
      updatedAt: FIXED2,
    };
    const controls = [
      { controlId: "ac-2", implementationStatus: "implemented", implementationDescription: "Done", responsibleRole: "ISO", evidenceLinks: ["a"] },
      { controlId: "cm-6", implementationStatus: "planned", implementationDescription: "Later", responsibleRole: "CTO", evidenceLinks: null },
    ];
    mockDb([[ssp], controls]);
    const router = buildRouter();

    const result = await (router as any).exportSspOscal.handler({
      input: { clientId: 7, sspId: 3 },
      ctx: { user: { id: 1 } },
    });

    // Root identity is now a proper RFC-4122 v4 uuid…
    expect(typeof result.uuid).toBe("string");
    expect(result.uuid).toMatch(UUID_V4_RE);
    // …while the mutation surface keeps EXACTLY its documented keys.
    expect(Object.keys(result).sort()).toEqual([
      "controlImplementationSrc",
      "metadata",
      "oscalVersion",
      "systemCharacteristics",
      "uuid",
    ]);

    // Round-trip witness: exported text → wire → parsed document feeds the
    // REAL import engine completely green.
    const wire = JSON.stringify(result);
    const verdict = validateOscalDocument(JSON.parse(wire));
    expect(verdict.valid).toBe(true);
    expect(verdict.errors).toEqual([]);
    expect(verdict.warnings).toEqual([]);
  });

  it("exportPoamOscal stamps distinct v4 uuids on the root + every observation + every task, and re-imports valid", async () => {
    const poam = { id: 8, clientId: 7, title: "POA&M — Remediation", updatedAt: FIXED2 };
    const items = [
      {
        id: 101,
        poamId: 8,
        weaknessName: "Weak patching",
        weaknessDescription: "Servers unpatched",
        weaknessDetectorSource: "Independent Assessment",
        supportingDocuments: null,
        overallRemediationPlan: "Patch monthly",
        scheduledCompletionDate: new Date("2026-09-30T00:00:00.000Z"),
        controlId: "SI-2",
        status: "open",
        adjustedRiskRating: "high",
      },
      {
        id: 102,
        poamId: 8,
        weaknessName: "Old finding",
        weaknessDescription: "Fixed",
        weaknessDetectorSource: "Continuous Monitoring",
        supportingDocuments: ["doc-1"],
        overallRemediationPlan: "",
        scheduledCompletionDate: null,
        controlId: null,
        status: "closed",
        adjustedRiskRating: "low",
      },
    ];
    mockDb([[poam], items]);
    const router = buildRouter();

    const result = await (router as any).exportPoamOscal.handler({
      input: { clientId: 7, poamId: 8 },
      ctx: { user: { id: 1 } },
    });

    const uuids = collectExportUuids(result);
    expect(uuids).toHaveLength(1 + 2 + 2); // root + observations + tasks
    for (const u of uuids) expect(u, `uuid ${String(u)}`).toMatch(UUID_V4_RE);
    // Distinct seeds ⇒ distinct digests — no cross-entity collisions.
    expect(new Set(uuids).size).toBe(uuids.length);

    // Mutation keys unchanged otherwise.
    expect(Object.keys(result).sort()).toEqual([
      "metadata",
      "milestones",
      "observations",
      "oscalVersion",
      "tasks",
      "uuid",
    ]);

    // Round-trip through the real engine; empty milestones[] is warning-only.
    const verdict = validateOscalDocument(JSON.parse(JSON.stringify(result)));
    expect(verdict.valid).toBe(true);
    expect(verdict.errors).toEqual([]);
    expect(verdict.warnings.map((w) => w.path)).toContain("milestones");
  });

  it("exportPoamOscal writes metadata.version as a string with the '1' fallback for nullish poam.version", async () => {
    const items = [
      {
        id: 201,
        poamId: 5,
        weaknessName: "W",
        weaknessDescription: "D",
        weaknessDetectorSource: "Assessment",
        supportingDocuments: [],
        overallRemediationPlan: "",
        scheduledCompletionDate: null,
        controlId: "AC-2",
        status: "open",
        adjustedRiskRating: "medium",
      },
    ];
    for (const stored of [undefined, null]) {
      mockDb([[{ id: 5, clientId: 7, title: "P", updatedAt: FIXED2, version: stored }], items]);
      const router = buildRouter();
      const result = await (router as any).exportPoamOscal.handler({
        input: { clientId: 7, poamId: 5 },
        ctx: { user: { id: 1 } },
      });
      expect(typeof result.metadata.version, `stored=${String(stored)}`).toBe("string");
      expect(result.metadata.version, `stored=${String(stored)}`).toBe("1");
    }

    mockDb([[{ id: 5, clientId: 7, title: "P", updatedAt: FIXED2, version: 4 }], items]);
    const router = buildRouter();
    const result = await (router as any).exportPoamOscal.handler({
      input: { clientId: 7, poamId: 5 },
      ctx: { user: { id: 1 } },
    });
    expect(result.metadata.version).toBe("4");
  });

  it("both exports are deterministic: repeated invocations over identical state yield byte-identical documents", async () => {
    const sspRow = {
      id: 3,
      clientId: 7,
      title: "APEX Core SSP",
      systemName: "APEX Core",
      status: "operational",
      version: 2,
      boundaryDescription: "B",
      content: null,
      updatedAt: FIXED2,
    };
    const sspControls = [
      { controlId: "ac-2", implementationStatus: "implemented", implementationDescription: "Done", responsibleRole: "ISO", evidenceLinks: [] },
    ];
    mockDb([[sspRow], sspControls]);
    const sspA = await (buildRouter() as any).exportSspOscal.handler({
      input: { clientId: 7, sspId: 3 },
      ctx: { user: { id: 1 } },
    });
    mockDb([[sspRow], sspControls]);
    const sspB = await (buildRouter() as any).exportSspOscal.handler({
      input: { clientId: 7, sspId: 3 },
      ctx: { user: { id: 1 } },
    });
    expect(JSON.stringify(sspB)).toBe(JSON.stringify(sspA));

    const poamRow = { id: 8, clientId: 7, title: "POA&M — Remediation", updatedAt: FIXED2 };
    const poamItems = [
      {
        id: 101,
        poamId: 8,
        weaknessName: "W",
        weaknessDescription: "D",
        weaknessDetectorSource: "Independent Assessment",
        supportingDocuments: null,
        overallRemediationPlan: "P",
        scheduledCompletionDate: new Date("2026-09-30T00:00:00.000Z"),
        controlId: "SI-2",
        status: "open",
        adjustedRiskRating: "high",
      },
    ];
    mockDb([[poamRow], poamItems]);
    const poamA = await (buildRouter() as any).exportPoamOscal.handler({
      input: { clientId: 7, poamId: 8 },
      ctx: { user: { id: 1 } },
    });
    mockDb([[poamRow], poamItems]);
    const poamB = await (buildRouter() as any).exportPoamOscal.handler({
      input: { clientId: 7, poamId: 8 },
      ctx: { user: { id: 1 } },
    });
    expect(JSON.stringify(poamB)).toBe(JSON.stringify(poamA));
  });
});
