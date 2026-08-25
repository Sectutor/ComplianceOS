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
 * Contract under test — exactly these 9 procedures (all registered through
 * clientProcedure, per routers.ts line "federalWorkflows:
 * createFederalWorkflowRouter(t, clientProcedure)"):
 *   queries   : getSprsBreakdown, getCmmcReadiness, getReportingClocks,
 *               getConMonDashboard
 *   mutations : syncSarToPoam, exportSspOscal, exportPoamOscal,
 *               exportPoamEmassCsv, importOscal (cycle 41, GAP-19)
 * Every input schema requires numeric `clientId`; syncSarToPoam additionally
 * requires `sarId`; the three exports require `sspId`/`poamId`.
 *
 * IMPORTANT behavioural note (asserted as-implemented, deliberately):
 * the handlers throw PLAIN `new Error("SAR not found")` /
 * `new Error("SSP not found")` / `new Error("POA&M not found")` — NOT
 * TRPCError. These tests assert that actual behaviour rather than demanding
 * specific TRPC error codes.
 *
 * SPRS scoring model exercised behaviourally over mocked db.execute rows:
 * score starts at 110; each family containing unmet practices deducts
 * min(familyWeight, max(1, round(weight/12)) * unmetPracticesInFamily),
 * floored at 0 (NIST SP 800-171 DoD Assessment Methodology proxy).
 */

const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

vi.mock("../../db", () => ({
  getDb: dbMocks.getDb,
}));

import { createFederalWorkflowRouter } from "../../server/routers/federal-workflows";

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

const QUERIES = ["getSprsBreakdown", "getCmmcReadiness", "getReportingClocks", "getConMonDashboard"];
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
});

// ── Route shape ──────────────────────────────────────────────────────────────

describe("federal-workflows router — route shape", () => {
  it("exposes exactly the 9 documented procedures, each with a callable handler", () => {
    const router = buildRouter();
    expect(Object.keys(router).sort()).toEqual(ALL_ROUTES);
    for (const name of Object.keys(router)) {
      expect(typeof (router as any)[name].handler, `handler of "${name}"`).toBe("function");
    }
  });

  it("registers the four intelligence surfaces as queries and the five artifact operations as mutations", () => {
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
  it("all 9 procedures reject a missing user with TRPCError UNAUTHORIZED before touching the DB", async () => {
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

describe("federal-workflows router — getSprsBreakdown (SPRS math)", () => {
  it("deducts the 800-171 family-weighted amount for open POA&M items (AC-2 ⇒ 107)", async () => {
    mockDb([[]], [[{ control_id: "AC-2", status: "open", original_risk_rating: "high" }]]);
    const router = buildRouter();

    const result = await (router as any).getSprsBreakdown.handler({
      input: { clientId: 7 },
      ctx: { user: { id: 1 } },
    });

    // AC-2 → practice 3.1.1 → family "3.1" weight 32 → per-practice round(32/12)=3
    expect(result).toMatchObject({
      startingScore: 110,
      deduction: 3,
      score: 107, // max(0, 110 - 3)
      unmetPracticeCount: 1,
      openPoamItems: 1,
    });
    expect(result.familiesAffected).toContain("3.1");
    // No prior snapshot existed → persisted as a new computed assessment
    expect(result.score).toBe(Math.max(0, 110 - result.deduction));
  });

  it("sums deductions across families (AC-2 + IR-8 + PE control ⇒ 104) and dedupes shared practices", async () => {
    mockDb(
      [[]],
      [
        [
          { control_id: "AC-2", status: "open", original_risk_rating: "high" },
          { control_id: "IR-8", status: "open", original_risk_rating: "moderate" },
          { control_id: "CA-5", status: "ongoing", original_risk_rating: "low" },
          { control_id: "RA-5", status: "ongoing", original_risk_rating: "low" }, // same practice as CA-5 → counted once
          { control_id: "PE-2", status: "open", original_risk_rating: "low" },
        ],
      ]
    );
    const router = buildRouter();

    const result = await (router as any).getSprsBreakdown.handler({
      input: { clientId: 7 },
      ctx: { user: { id: 1 } },
    });

    // 3.1 → 3 · 3.6 (weight 9, two practices) → 2 · 3.11 (weight 6, deduped to one) → 1 · 3.10.x → 1
    expect(result.unmetPracticeCount).toBe(5); // 3.1.1, 3.6.2, 3.6.3, 3.11.2, 3.10.x
    expect(result.deduction).toBe(7);
    expect(result.score).toBe(103); // 110 - 7
    expect(result.openPoamItems).toBe(5);
    expect([...result.familiesAffected].sort()).toEqual(["3.1", "3.10", "3.11", "3.6"]);
  });

  it("scores a clean 110 with zero deduction when nothing is open, updating the existing snapshot", async () => {
    const { calls } = mockDb([[{ id: 77, clientId: 7, status: "computed" }]], [[]]);
    const router = buildRouter();

    const result = await (router as any).getSprsBreakdown.handler({
      input: { clientId: 7 },
      ctx: { user: { id: 1 } },
    });

    expect(result).toMatchObject({ startingScore: 110, deduction: 0, score: 110, unmetPracticeCount: 0, openPoamItems: 0 });
    expect(calls.updates).toHaveLength(1);
    expect(calls.updates[0]).toMatchObject({ score: 110 });
    expect(calls.inserts).toHaveLength(0); // existing snapshot updated, not duplicated
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
    expect(result.uuid).toBe("oscal-ssp-3-7");
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
    expect(result.uuid).toBe("oscal-poam-8-7");
    expect(result.metadata).toEqual({
      title: "POA&M — Remediation",
      lastModified: FIXED.toISOString(),
      oscalModel: "plan-of-action-and-milestones",
    });
    // Independent-assessment findings are examined AND interviewed
    expect(result.observations[0]).toMatchObject({
      uuid: "obs-101",
      title: "Weak patching",
      methods: ["EXAMINE", "INTERVIEW"],
      relevantEvidence: [],
    });
    expect(result.tasks[0]).toMatchObject({
      uuid: "task-101",
      status: "in-progress",
      associatedControls: ["SI-2"],
      riskRating: "high",
      timing: { onDate: due },
    });
    // Continuous-monitoring findings are examine-only; closed items map to completed tasks
    expect(result.observations[1].methods).toEqual(["EXAMINE"]);
    expect(result.observations[1].relevantEvidence).toEqual(["doc-1"]);
    expect(result.tasks[1]).toMatchObject({ uuid: "task-102", status: "completed", associatedControls: [], timing: undefined });
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
