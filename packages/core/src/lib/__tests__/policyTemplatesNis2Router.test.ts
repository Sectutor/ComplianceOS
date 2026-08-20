import { describe, it, expect, vi, beforeEach } from "vitest";
import { ZodError } from "zod";
import { TRPCError } from "@trpc/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * NIS2 Policy Center router (server/routers/policyTemplatesNis2.ts) —
 * contract tests (QA cycle 23, NIS2 Implementation Plan Phase 6 Task 6.1 /
 * ENISA Measures 1.1..12.1 / NIS2 Art. 21).
 *
 * Mirrors complianceMonitorRouter.test.ts / securityTestingNis2Router.test.ts:
 * the router is a factory `createPolicyTemplatesNis2Router(t, protectedProcedure)`
 * tested with a tiny fake tRPC builder — no tRPC server, no DB. The engines
 * underneath (lib/nis2/policyTemplates.ts) are pure; the router only validates
 * input with zod and forwards to the engine.
 *
 * Contract under test — exactly four `.query` procedures (never mutations),
 * registered by the app router under the `policyTemplatesNis2:` prefix:
 *   templates         protected.query  input policyTemplatesNis2TemplatesInputSchema
 *   gapAnalysis       protected.query  input policyTemplatesNis2GapAnalysisInputSchema
 *   approvalWorkflow  protected.query  input policyTemplatesNis2ApprovalInputSchema
 *   versionHistory    protected.query  input policyTemplatesNis2VersionsInputSchema
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
 *     date fields (ISO strings or epoch numbers only) and surface as
 *     BAD_REQUEST;
 *   - valid (incl. degenerate) input is forwarded to the engine untouched;
 *   - the router is pure: it never touches the DB, never fetches over the
 *     network and never uses Math.random (source-text scan).
 *
 * Exported zod schemas are part of the contract so callers can reuse
 * validation: policyTemplatesNis2TemplatesInputSchema,
 * policyTemplatesNis2PolicyItemSchema, policyTemplatesNis2GapAnalysisInputSchema,
 * policyTemplatesNis2ReviewerSchema, policyTemplatesNis2ApprovalInputSchema,
 * policyTemplatesNis2VersionItemSchema, policyTemplatesNis2VersionsInputSchema.
 */

const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

// Same `src/db` mock as the sibling router tests — the NIS2 Policy Center
// router never touches it, and this asserts that fact.
vi.mock("../../db", () => ({
  getDb: dbMocks.getDb,
}));

import { createPolicyTemplatesNis2Router } from "../../server/routers/policyTemplatesNis2";

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
  const router = createPolicyTemplatesNis2Router(t, procedure);
  return { router };
}

const NOW = new Date("2026-08-19T00:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const iso = (msOffset: number) => new Date(NOW.getTime() + msOffset).toISOString();
const USER = { id: 1, role: "owner" as const };

const VALID_TEMPLATES_INPUT = {
  category: "a",
  measureId: "1.1",
  search: "risk",
  limit: 5,
  now: NOW.toISOString(),
};

const VALID_GAP_INPUT = {
  policies: [
    { id: "p1", title: "Access Control Policy", isoControls: ["A.5.1", "A.5.2"], status: "implemented", lastReviewedAt: iso(-30 * DAY_MS) },
    { id: "p2", title: "Incident Response Plan", isoControls: [], status: "draft" },
  ],
  now: NOW.toISOString(),
};

const VALID_APPROVAL_INPUT = {
  policyId: "pol-1",
  policyTitle: "Access Control Policy",
  status: "in_review",
  submittedAt: iso(-3 * DAY_MS),
  requiredApprovals: 2,
  slaDays: 14,
  reviewers: [
    { id: 1, name: "Alice", decision: "approved", comment: "LGTM", decidedAt: iso(-1 * DAY_MS) },
    { id: 2, name: "Bob", decision: null, comment: "", decidedAt: null },
  ],
  now: NOW.toISOString(),
};

const VALID_VERSIONS_INPUT = {
  policyId: "pol-1",
  versions: [
    { version: "v1", label: "v1", createdAt: iso(-30 * DAY_MS), status: "approved", changeSummary: "Initial release" },
    { version: "v2", label: "v2", createdAt: iso(-1 * DAY_MS), status: "draft", changeSummary: "Draft updates" },
  ],
  now: NOW.toISOString(),
};

beforeEach(() => {
  dbMocks.getDb.mockReset();
});

describe("policyTemplatesNis2 router — route shape", () => {
  it("exposes exactly templates, gapAnalysis, approvalWorkflow and versionHistory, all as query procedures (no mutations)", () => {
    const { router } = buildFakeTRPC();
    expect(Object.keys(router).sort()).toEqual(["approvalWorkflow", "gapAnalysis", "templates", "versionHistory"]);
    for (const name of ["templates", "gapAnalysis", "approvalWorkflow", "versionHistory"]) {
      expect(router[name], `route "${name}"`).toBeDefined();
      expect(typeof router[name].handler, `route "${name}" handler`).toBe("function");
      expect(router[name].type, `route "${name}" type`).toBe("query");
    }
    // the router must not expose any mutation routes
    expect(Object.values(router).every((route: any) => route?.type !== "mutation")).toBe(true);
  });

  it("attaches a zod input schema to every query route", () => {
    const { router } = buildFakeTRPC();
    for (const name of ["templates", "gapAnalysis", "approvalWorkflow", "versionHistory"]) {
      expect(router[name].schema, `route "${name}" schema`).toBeDefined();
      expect(typeof router[name].schema.parse, `route "${name}" schema.parse`).toBe("function");
    }
  });
});

describe("policyTemplatesNis2 router — protected procedures reject unauthenticated callers", () => {
  it("all four procedures reject a missing user with TRPCError UNAUTHORIZED", async () => {
    const { router } = buildFakeTRPC();
    const calls = [
      router.templates.handler({ input: VALID_TEMPLATES_INPUT, ctx: {} }),
      router.gapAnalysis.handler({ input: VALID_GAP_INPUT, ctx: {} }),
      router.approvalWorkflow.handler({ input: VALID_APPROVAL_INPUT, ctx: {} }),
      router.versionHistory.handler({ input: VALID_VERSIONS_INPUT, ctx: {} }),
    ];
    for (const call of calls) {
      await expect(call).rejects.toBeInstanceOf(TRPCError);
      await expect(call).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    }
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });
});

describe("policyTemplatesNis2 router — templates", () => {
  it("forwards valid input and returns the engine's template-catalog contract", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.templates.handler({ input: VALID_TEMPLATES_INPUT, ctx: { user: USER } });
    expect(Array.isArray(result.items)).toBe(true);
    expect(typeof result.total).toBe("number");
    for (const item of result.items) {
      expect(typeof item.id).toBe("string");
      expect(typeof item.title).toBe("string");
      expect(item.article21Category).toMatch(/^[a-j]$/);
      expect(typeof item.enisaMeasureId).toBe("string");
      expect(Array.isArray(item.isoControls)).toBe(true);
      expect(typeof item.summary).toBe("string");
      expect(Array.isArray(item.requiredSections)).toBe(true);
      expect(typeof item.reviewCadenceDays).toBe("number");
      expect(typeof item.ownerRole).toBe("string");
      expect(Array.isArray(item.applicability)).toBe(true);
    }
  });

  it("never throws for degenerate-but-valid input (empty object -> full catalog)", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.templates.handler({ input: {}, ctx: { user: USER } });
    expect(result.total).toBe(13);
    expect(result.items).toHaveLength(13);
  });

  it("forwards search and limit to the engine (search slices the catalog, limit keeps catalog order)", async () => {
    const { router } = buildFakeTRPC();
    const none = await router.templates.handler({ input: { search: "zzzzz-no-such-policy" }, ctx: { user: USER } });
    expect(none.total).toBe(0);
    expect(none.items).toEqual([]);

    const full = await router.templates.handler({ input: {}, ctx: { user: USER } });
    const limited = await router.templates.handler({ input: { limit: 3 }, ctx: { user: USER } });
    expect(limited.items).toHaveLength(3);
    expect(limited.items.map((i: any) => i.id)).toEqual(full.items.slice(0, 3).map((i: any) => i.id));
  });

  it("rejects type mismatches (category/measureId/search as numbers, limit as string) with BAD_REQUEST", async () => {
    const { router } = buildFakeTRPC();
    const schema = router.templates.schema;
    expect(() => schema.parse({ category: 42 })).toThrow(ZodError);
    expect(() => schema.parse({ measureId: 42 })).toThrow(ZodError);
    expect(() => schema.parse({ search: 42 })).toThrow(ZodError);
    expect(() => schema.parse({ limit: "5" })).toThrow(ZodError);
    expect(schema.parse({})).toBeDefined();

    const call = router.templates.handler({ input: { limit: "5" }, ctx: { user: USER } });
    await expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("policyTemplatesNis2 router — gapAnalysis", () => {
  it("forwards valid input and returns the engine's gap-analysis contract", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.gapAnalysis.handler({ input: VALID_GAP_INPUT, ctx: { user: USER } });
    expect(typeof result.coverageRate).toBe("number");
    expect(typeof result.totalTemplates).toBe("number");
    expect(typeof result.coveredCount).toBe("number");
    expect(typeof result.gapCount).toBe("number");
    expect(Array.isArray(result.gaps)).toBe(true);
    expect(Array.isArray(result.byIsoControl)).toBe(true);
    expect(Array.isArray(result.recommendations)).toBe(true);
    expect(result.recommendations.length).toBeLessThanOrEqual(5);
    expect(typeof result.totalImplementedPolicies).toBe("number");
  });

  it("never throws for degenerate input ({} -> zeroed analysis, never a raw crash)", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.gapAnalysis.handler({ input: {}, ctx: { user: USER } });
    expect(result.totalTemplates).toBe(0);
    expect(result.gapCount).toBe(0);
    expect(result.coverageRate).toBe(0);
    expect(result.gaps).toEqual([]);
  });

  it("returns gaps sorted by enisaMeasureId ascending (numeric ENISA order, 1.1..12.1)", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.gapAnalysis.handler({ input: { policies: [] }, ctx: { user: USER } });
    const ids = result.gaps.map((g: any) => g.enisaMeasureId);
    expect(ids).toHaveLength(13);
    expect(ids).toEqual(["1.1", "2.1", "3.1", "4.1", "5.1", "6.2", "6.7", "7.1", "8.1", "9.1", "10.1", "11.1", "12.1"]);
  });

  it("rejects type mismatches (policies as string, isoControls as string) with BAD_REQUEST", async () => {
    const { router } = buildFakeTRPC();
    const schema = router.gapAnalysis.schema;
    expect(() => schema.parse({ policies: "nope" })).toThrow(ZodError);
    expect(() => schema.parse({ policies: [{ isoControls: "nope" }] })).toThrow(ZodError);
    expect(schema.parse({ policies: [] })).toBeDefined();

    const call = router.gapAnalysis.handler({ input: { policies: "nope" }, ctx: { user: USER } });
    await expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("policyTemplatesNis2 router — approvalWorkflow", () => {
  it("forwards valid input and returns the engine's approval contract", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.approvalWorkflow.handler({ input: VALID_APPROVAL_INPUT, ctx: { user: USER } });
    expect(result.policyId).toBe("pol-1");
    expect(result.currentStatus).toBe("in_review");
    expect(typeof result.verdict).toBe("string");
    expect(typeof result.nextAction).toBe("string");
    expect(result.approvalCount).toBe(1);
    expect(result.pendingCount).toBe(1);
    expect(result.reviewProgress).toBe(50); // 1 of 2 decisions
    expect(typeof result.complete).toBe("boolean");
    expect(typeof result.overdue).toBe("boolean");
    expect(Array.isArray(result.steps)).toBe(true);
    expect(result.steps).toHaveLength(4);
    expect(Array.isArray(result.reviewers)).toBe(true);
    expect(result.reviewers).toHaveLength(2);
  });

  it("never throws for degenerate input ({} -> unknown status, never a raw crash)", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.approvalWorkflow.handler({ input: {}, ctx: { user: USER } });
    expect(result.status).toBe("unknown");
    expect(result.verdict).toBe("unknown");
    expect(result.steps).toHaveLength(4);
  });

  it("computes overdue and daysInReview from the injected clock", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.approvalWorkflow.handler({
      input: {
        status: "in_review",
        submittedAt: iso(-20 * DAY_MS),
        slaDays: 14,
        now: NOW.toISOString(),
      },
      ctx: { user: USER },
    });
    expect(result.overdue).toBe(true);
    expect(result.daysInReview).toBe(20);
    expect(result.status).toBe("in_review");
  });

  it("enriches reviewers with a decision status", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.approvalWorkflow.handler({ input: VALID_APPROVAL_INPUT, ctx: { user: USER } });
    // reviewer ids normalize to strings in the enriched output
    expect(result.reviewers[0]).toMatchObject({ id: "1", decision: "approved", status: "approved" });
    expect(result.reviewers[1]).toMatchObject({ id: "2", decision: null, status: "pending" });
  });

  it("rejects type mismatches (requiredApprovals/slaDays as strings, reviewers as string, bad decision) with BAD_REQUEST", async () => {
    const { router } = buildFakeTRPC();
    const schema = router.approvalWorkflow.schema;
    expect(() => schema.parse({ requiredApprovals: "2" })).toThrow(ZodError);
    expect(() => schema.parse({ slaDays: "14" })).toThrow(ZodError);
    expect(() => schema.parse({ reviewers: "nope" })).toThrow(ZodError);
    expect(() => schema.parse({ reviewers: [{ decision: "banana" }] })).toThrow(ZodError);
    expect(() => schema.parse({ submittedAt: new Date() })).toThrow(ZodError);
    expect(schema.parse({})).toBeDefined();

    const call = router.approvalWorkflow.handler({ input: { requiredApprovals: "2" }, ctx: { user: USER } });
    await expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("policyTemplatesNis2 router — versionHistory", () => {
  it("forwards valid input and returns the engine's version-history contract", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.versionHistory.handler({ input: VALID_VERSIONS_INPUT, ctx: { user: USER } });
    expect(result.policyId).toBe("pol-1");
    expect(result.totalVersions).toBe(2);
    expect(Array.isArray(result.versions)).toBe(true);
    expect(Array.isArray(result.changes)).toBe(true);
    expect(typeof result.latestVersion).toBe("string");
    // v1 (approved, 30d ago) is superseded; v2 (draft, 1d ago) is the latest
    // and therefore 'current' — the backend marks the last sorted entry
    // current unconditionally (contract: "last is current").
    expect(result.versions.map((v: any) => v.status)).toEqual(["superseded", "current"]);
    expect(result.draftCount).toBe(0);
    expect(result.approvedCount).toBe(1);
    expect(result.supersededCount).toBe(1);
  });

  it("never throws for degenerate-but-valid input (empty object -> empty history)", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.versionHistory.handler({ input: {}, ctx: { user: USER } });
    expect(result.totalVersions).toBe(0);
    expect(result.versions).toEqual([]);
    expect(result.changes).toEqual([]);
  });

  it("sorts forwarded versions by createdAt ascending and marks the latest current", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.versionHistory.handler({
      input: {
        versions: [
          { version: "v2", label: "v2", createdAt: iso(-1 * DAY_MS) },
          { version: "v1", label: "v1", createdAt: iso(-30 * DAY_MS) },
        ],
        now: NOW.toISOString(),
      },
      ctx: { user: USER },
    });
    expect(result.versions.map((v: any) => v.version)).toEqual(["v1", "v2"]);
    expect(result.versions.map((v: any) => v.status)).toEqual(["superseded", "current"]);
    expect(result.latestVersion).toBe("v2");
  });

  it("rejects type mismatches (versions as string, Date createdAt) with BAD_REQUEST", async () => {
    const { router } = buildFakeTRPC();
    const schema = router.versionHistory.schema;
    expect(() => schema.parse({ versions: "nope" })).toThrow(ZodError);
    expect(() => schema.parse({ versions: [{ createdAt: new Date() }] })).toThrow(ZodError);
    expect(schema.parse({ versions: [] })).toBeDefined();

    const call = router.versionHistory.handler({ input: { versions: "nope" }, ctx: { user: USER } });
    await expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("policyTemplatesNis2 router — shared clock options and item date fields", () => {
  it("accepts string/number `now` and a `clock` factory; rejects Date objects and non-function clocks", async () => {
    const { router } = buildFakeTRPC();
    for (const route of ["templates", "gapAnalysis", "approvalWorkflow", "versionHistory"]) {
      const schema = router[route].schema;
      expect(() => schema.parse({ now: "2026-08-19T00:00:00.000Z" }), `${route} ISO now`).not.toThrow();
      expect(() => schema.parse({ now: 12345 }), `${route} epoch now`).not.toThrow();
      expect(() => schema.parse({ clock: () => new Date() }), `${route} clock fn`).not.toThrow();
      expect(() => schema.parse({ now: new Date() }), `${route} Date now`).toThrow(ZodError);
      expect(() => schema.parse({ clock: "not-a-function" }), `${route} clock string`).toThrow(ZodError);
    }
  });

  it("rejects Date objects in item date fields (ISO strings / epoch numbers only)", async () => {
    const { router } = buildFakeTRPC();
    expect(() =>
      router.approvalWorkflow.schema.parse({ reviewers: [{ id: 1, decidedAt: new Date() }] })
    ).toThrow(ZodError);
    expect(() =>
      router.gapAnalysis.schema.parse({ policies: [{ id: "p1", lastReviewedAt: new Date() }] })
    ).toThrow(ZodError);

    const call = router.versionHistory.handler({
      input: { versions: [{ version: "v1", createdAt: new Date() }] },
      ctx: { user: USER },
    });
    await expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("policyTemplatesNis2 router — exported zod schemas", () => {
  const SCHEMA_NAMES = [
    "policyTemplatesNis2TemplatesInputSchema",
    "policyTemplatesNis2PolicyItemSchema",
    "policyTemplatesNis2GapAnalysisInputSchema",
    "policyTemplatesNis2ReviewerSchema",
    "policyTemplatesNis2ApprovalInputSchema",
    "policyTemplatesNis2VersionItemSchema",
    "policyTemplatesNis2VersionsInputSchema",
  ];

  it("exports all seven schemas for reuse", async () => {
    const mod = await import("../../server/routers/policyTemplatesNis2");
    for (const name of SCHEMA_NAMES) {
      expect((mod as Record<string, unknown>)[name], `export "${name}"`).toBeDefined();
      expect(typeof (mod as Record<string, unknown>)[name], `export "${name}" is a schema`).toBe("object");
    }
  });

  it("each exported schema parses valid fixtures and rejects type-mismatched input", async () => {
    const mod = (await import("../../server/routers/policyTemplatesNis2")) as any;

    expect(
      mod.policyTemplatesNis2TemplatesInputSchema.parse({
        category: "a",
        measureId: "1.1",
        search: "risk",
        limit: 5,
        now: "2026-08-19T00:00:00.000Z",
      })
    ).toBeDefined();
    expect(() => mod.policyTemplatesNis2TemplatesInputSchema.parse({ limit: "5" })).toThrow(ZodError);

    expect(
      mod.policyTemplatesNis2PolicyItemSchema.parse({
        id: "p1",
        title: "Access Control Policy",
        isoControls: ["A.5.1"],
        status: "implemented",
        lastReviewedAt: "2026-08-01T00:00:00.000Z",
      })
    ).toBeDefined();
    expect(() => mod.policyTemplatesNis2PolicyItemSchema.parse({ isoControls: "x" })).toThrow(ZodError);

    expect(mod.policyTemplatesNis2GapAnalysisInputSchema.parse({ policies: [] })).toBeDefined();
    expect(() => mod.policyTemplatesNis2GapAnalysisInputSchema.parse({ policies: "x" })).toThrow(ZodError);

    expect(
      mod.policyTemplatesNis2ReviewerSchema.parse({
        id: 1,
        name: "Alice",
        decision: "approved",
        comment: "LGTM",
        decidedAt: "2026-08-18T00:00:00.000Z",
      })
    ).toBeDefined();
    expect(() => mod.policyTemplatesNis2ReviewerSchema.parse({ decision: "banana" })).toThrow(ZodError);
    expect(() => mod.policyTemplatesNis2ReviewerSchema.parse({ decidedAt: new Date() })).toThrow(ZodError);

    expect(
      mod.policyTemplatesNis2ApprovalInputSchema.parse({
        policyId: "pol-1",
        status: "in_review",
        requiredApprovals: 2,
        slaDays: 14,
        reviewers: [{ id: 1, decision: "approved" }],
      })
    ).toBeDefined();
    expect(() => mod.policyTemplatesNis2ApprovalInputSchema.parse({ requiredApprovals: "2" })).toThrow(ZodError);
    expect(() => mod.policyTemplatesNis2ApprovalInputSchema.parse({ reviewers: "x" })).toThrow(ZodError);

    expect(
      mod.policyTemplatesNis2VersionItemSchema.parse({
        version: "v1",
        label: "v1",
        createdAt: 1234567890,
        status: "current",
        changeSummary: "Initial release",
      })
    ).toBeDefined();
    expect(() => mod.policyTemplatesNis2VersionItemSchema.parse({ createdAt: new Date() })).toThrow(ZodError);

    expect(mod.policyTemplatesNis2VersionsInputSchema.parse({ versions: [] })).toBeDefined();
    expect(() => mod.policyTemplatesNis2VersionsInputSchema.parse({ versions: "x" })).toThrow(ZodError);
    expect(() =>
      mod.policyTemplatesNis2VersionsInputSchema.parse({ versions: [{ createdAt: new Date() }] })
    ).toThrow(ZodError);
  });
});

describe("policyTemplatesNis2 router — no-db / no-network / no-random guarantee", () => {
  it("never touches the DB behaviorally", async () => {
    const { router } = buildFakeTRPC();
    await router.templates.handler({ input: VALID_TEMPLATES_INPUT, ctx: { user: USER } });
    await router.gapAnalysis.handler({ input: VALID_GAP_INPUT, ctx: { user: USER } });
    await router.approvalWorkflow.handler({ input: VALID_APPROVAL_INPUT, ctx: { user: USER } });
    await router.versionHistory.handler({ input: VALID_VERSIONS_INPUT, ctx: { user: USER } });
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });

  it("the router source has no db imports, getDb, db.select, network fetch or Math.random", () => {
    const source = readFileSync(
      join(process.cwd(), "packages/core/src/server/routers/policyTemplatesNis2.ts"),
      "utf8"
    );
    expect(source).not.toContain("getDb");
    expect(source).not.toContain("db.select");
    expect(source).not.toMatch(/from\s+["'][^"']*\/db["']/);
    expect(source).not.toContain("src/db");
    expect(source).not.toContain(".fetch(");
    expect(source).not.toContain("Math.random");
  });
});
