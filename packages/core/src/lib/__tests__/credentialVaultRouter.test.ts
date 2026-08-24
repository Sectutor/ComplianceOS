import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ZodError } from "zod";
import { TRPCError } from "@trpc/server";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Credential Vault router (server/routers/credentialVault.ts) — contract
 * tests (cycle 32, API-FIRST-INTEGRATION-PLAN P0 security block).
 *
 * Mirrors securityMetricsRouter.test.ts: the router is a factory
 * `createCredentialVaultRouter(t, protectedProcedure, publicProcedure)`
 * tested with a tiny fake tRPC builder — no tRPC server, no DB. The engine
 * underneath (lib/security/credentialCrypto.ts) is pure; the router only
 * validates input with zod and forwards to the engine.
 *
 * Contract under test (mirrors pages/security/credentialVaultApi.ts):
 *   status         PUBLIC     query     no input
 *   policyCheck    protected  query     credentialVaultPolicyCheckInputSchema
 *   rateLimitCheck protected  query     credentialVaultRateLimitCheckInputSchema
 *   auditVerify    protected  query     credentialVaultAuditVerifyInputSchema
 *   selfTest       protected  mutation  credentialVaultSelfTestInputSchema
 *
 * Hardening contract:
 *   - status is public (no auth gate); every other procedure rejects a
 *     missing user with TRPCError UNAUTHORIZED;
 *   - type-mismatched input is rejected with TRPCError BAD_REQUEST (zod) —
 *     never a raw crash inside the handler;
 *   - the router is pure with respect to persistence: no DB imports
 *     (behavioural via the db mock AND a source-text scan);
 *   - status always exposes the fixed 8-item checklist (witness for the
 *     cycle-31 UI contract CHECKLIST_EXPECTED_COUNT).
 */

const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
}));

// Same `src/db` mock as the sibling router tests — the credential vault
// router never touches it, and this asserts that fact.
vi.mock("../../db", () => ({
  getDb: dbMocks.getDb,
}));

import {
  CREDENTIAL_VAULT_DEFAULT_RATE_LIMIT_PER_MINUTE,
  createCredentialVaultRouter,
  credentialVaultActionSchema,
  credentialVaultPolicyCheckInputSchema,
  credentialVaultRateLimitCheckInputSchema,
  credentialVaultAuditVerifyInputSchema,
  credentialVaultSelfTestInputSchema,
  credentialVaultRotationScheduleInputSchema,
  credentialVaultExpiryCheckInputSchema,
  credentialVaultAllowlistEvaluateInputSchema,
} from "../../server/routers/credentialVault";
import { VAULT_CHECKLIST_IDS } from "../../lib/security/credentialCrypto";

/**
 * Minimal fake tRPC builder. Procedures enforce an optional auth gate
 * (TRPCError UNAUTHORIZED without ctx.user, mirroring protectedProcedure/
 * isAuthed), parse input through the attached zod schema and surface
 * ZodError as TRPCError BAD_REQUEST, mirroring the tRPC validation layer.
 */
function makeProcedure(auth: boolean) {
  let currentSchema: unknown;
  const procedure: any = {
    input: (schema: unknown) => {
      currentSchema = schema;
      return procedure;
    },
    query: (handler: any) => finalize("query", handler),
    mutation: (handler: any) => finalize("mutation", handler),
  };
  function finalize(type: "query" | "mutation", handler: any) {
    const schema = currentSchema;
    const wrapped = async ({ input, ctx }: { input?: unknown; ctx?: any }) => {
      if (auth && !ctx?.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required. Please sign in.",
        });
      }
      if (schema) {
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
    return { type, handler: wrapped, schema };
  }
  return procedure;
}

function buildFakeTRPC() {
  const t: any = { router: (routes: any) => routes };
  const router = createCredentialVaultRouter(t, makeProcedure(true), makeProcedure(false));
  return { router };
}

const USER = { id: 1, role: "owner" as const };

beforeEach(() => {
  dbMocks.getDb.mockReset();
  // deterministic key state per test — values are test-only material and
  // never printed.
  vi.stubEnv("CREDENTIAL_VAULT_KEY", "router-test-master-key");
  vi.stubEnv("VAULT_MASTER_KEY", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("credentialVault router — route shape", () => {
  it("exposes status/policyCheck/rateLimitCheck/auditVerify as queries and selfTest as the only mutation", () => {
    const { router } = buildFakeTRPC();
    expect(router.status).toBeDefined();
    expect(router.status.type).toBe("query");
    for (const name of ["policyCheck", "rateLimitCheck", "auditVerify"]) {
      expect(router[name], `route "${name}"`).toBeDefined();
      expect(router[name].type, `route "${name}" type`).toBe("query");
      expect(router[name].schema, `route "${name}" schema`).toBeDefined();
    }
    expect(router.selfTest).toBeDefined();
    expect(router.selfTest.type).toBe("mutation");
    // selfTest is the ONLY mutation on the router
    expect(Object.values(router).filter((route: any) => route?.type === "mutation")).toHaveLength(1);
    for (const route of Object.values(router)) {
      expect(typeof (route as any).handler, "handler is a function").toBe("function");
    }
  });

  it("attaches the exported input schemas to the matching routes", () => {
    const { router } = buildFakeTRPC();
    expect(router.policyCheck.schema).toBe(credentialVaultPolicyCheckInputSchema);
    expect(router.rateLimitCheck.schema).toBe(credentialVaultRateLimitCheckInputSchema);
    expect(router.auditVerify.schema).toBe(credentialVaultAuditVerifyInputSchema);
    expect(router.selfTest.schema).toBe(credentialVaultSelfTestInputSchema);
  });
});

describe("credentialVault router — auth gates", () => {
  it("status is public — callable without a user", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.status.handler({ ctx: {} });
    expect(result.available).toBe(true);
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });

  it("protected procedures reject a missing user with TRPCError UNAUTHORIZED", async () => {
    const { router } = buildFakeTRPC();
    const calls = [
      router.policyCheck.handler({ input: {}, ctx: {} }),
      router.rateLimitCheck.handler({ input: {}, ctx: {} }),
      router.auditVerify.handler({ input: {}, ctx: {} }),
      router.selfTest.handler({ input: {}, ctx: {} }),
    ];
    for (const call of calls) {
      await expect(call).rejects.toBeInstanceOf(TRPCError);
      await expect(call).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    }
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });
});

describe("credentialVault router — status", () => {
  it("returns the contracted crypto identity, null telemetry and an 8-item checklist", async () => {
    const { router } = buildFakeTRPC();
    const status = await router.status.handler({ ctx: {} });
    expect(status).toMatchObject({
      available: true,
      algorithm: "aes-256-gcm",
      kdf: "scrypt",
      envelope: "cosv1",
      twoFactorRequired: false,
      credentialsCount: null,
      connectionsCount: null,
      lastRotatedAt: null,
    });
    expect(typeof status.updatedAt).toBe("string");
    expect(Number.isNaN(Date.parse(status.updatedAt))).toBe(false);
    expect(status.checklist).toHaveLength(8);
    expect(status.checklist.map((item: { id: string }) => item.id)).toEqual([...VAULT_CHECKLIST_IDS]);
  });

  it("reports unavailable when key material is not configured", async () => {
    vi.stubEnv("CREDENTIAL_VAULT_KEY", "");
    vi.stubEnv("VAULT_MASTER_KEY", "");
    const { router } = buildFakeTRPC();
    const status = await router.status.handler({ ctx: {} });
    expect(status.available).toBe(false);
    // checklist still renders (structure survives a locked vault)
    expect(status.checklist).toHaveLength(8);
  });
});

describe("credentialVault router — policyCheck", () => {
  it("returns the cvp1 policy verdict", async () => {
    const { router } = buildFakeTRPC();
    const read = await router.policyCheck.handler({ input: { clientId: 3 }, ctx: { user: USER } });
    expect(read).toMatchObject({
      allowed: true,
      requiresTwoFactor: false,
      policyVersion: "cvp1",
    });
    const del = await router.policyCheck.handler({
      input: { clientId: 3, action: "delete" },
      ctx: { user: USER },
    });
    expect(del.allowed).toBe(false);
    expect(del.reason.toLowerCase()).toContain("confirmation");
  });

  it("rejects type mismatches with TRPCError BAD_REQUEST", async () => {
    const { router } = buildFakeTRPC();
    const call = router.policyCheck.handler({ input: { action: 42 }, ctx: { user: USER } });
    await expect(call).rejects.toMatchObject({ code: "BAD_REQUEST" });
    // the action enum is strict: unknown actions are zod-rejected (BAD_REQUEST),
    // never forwarded to the policy engine
    expect(() => router.policyCheck.schema.parse({ action: "purge" })).toThrow(ZodError);
  });
});

describe("credentialVault router — rateLimitCheck", () => {
  it("hands out the sliding-window budget and eventually limits", async () => {
    const { router } = buildFakeTRPC();
    const first = await router.rateLimitCheck.handler({ input: { clientId: 9 }, ctx: { user: USER } });
    expect(first.limited).toBe(false);
    expect(first.limitPerMinute).toBe(30);
    expect(first.remaining).toBe(29);
    expect(Number.isNaN(Date.parse(first.resetAt ?? ""))).toBe(false);

    let last;
    for (let i = 0; i < 30; i += 1) {
      last = await router.rateLimitCheck.handler({ input: { clientId: 9 }, ctx: { user: USER } });
    }
    expect(last.limited).toBe(true);
    expect(last.remaining).toBe(0);
    // other clients keep their own budget
    const otherClient = await router.rateLimitCheck.handler({ input: { clientId: 10 }, ctx: { user: USER } });
    expect(otherClient.limited).toBe(false);
  });

  it("rejects non-numeric clientIds with BAD_REQUEST", async () => {
    const { router } = buildFakeTRPC();
    await expect(
      router.rateLimitCheck.handler({ input: { clientId: "abc" }, ctx: { user: USER } })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("credentialVault router — auditVerify", () => {
  it("verifies the module-seeded chain and honours limit", async () => {
    const { router } = buildFakeTRPC();
    const full = await router.auditVerify.handler({ input: {}, ctx: { user: USER } });
    expect(full.verified).toBe(true);
    expect(full.anomalies).toBe(0);
    expect(full.entriesChecked).toBeGreaterThanOrEqual(1); // genesis seeded at module init
    expect(full.chainHead).toMatch(/^[0-9a-f]{64}$/);
    expect(Number.isNaN(Date.parse(full.lastEntryAt ?? ""))).toBe(false);

    const limited = await router.auditVerify.handler({ input: { limit: 1 }, ctx: { user: USER } });
    expect(limited.entriesChecked).toBe(1);
  });

  it("records selfTest runs on the audit chain", async () => {
    const { router } = buildFakeTRPC();
    const before = await router.auditVerify.handler({ input: {}, ctx: { user: USER } });
    const selfTest = await router.selfTest.handler({ input: {}, ctx: { user: USER } });
    expect(selfTest.ok).toBe(true);
    const after = await router.auditVerify.handler({ input: {}, ctx: { user: USER } });
    expect(after.entriesChecked).toBe(before.entriesChecked + 1);
    expect(after.verified).toBe(true);
  });

  it("rejects malformed limits with BAD_REQUEST", async () => {
    const { router } = buildFakeTRPC();
    await expect(
      router.auditVerify.handler({ input: { limit: "5" }, ctx: { user: USER } })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("credentialVault router — selfTest", () => {
  it("runs the integrity probe with configured key material", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.selfTest.handler({ input: undefined, ctx: { user: USER } });
    expect(result.ok).toBe(true);
    expect(typeof result.ranAt).toBe("string");
    expect(result.checks.length).toBeGreaterThanOrEqual(5);
    for (const check of result.checks) {
      expect(check.passed, `${check.id}: ${check.detail ?? ""}`).toBe(true);
    }
  });

  it("degrades gracefully without configured key material (structured failure)", async () => {
    vi.stubEnv("CREDENTIAL_VAULT_KEY", "");
    vi.stubEnv("VAULT_MASTER_KEY", "");
    const { router } = buildFakeTRPC();
    const result = await router.selfTest.handler({ input: undefined, ctx: { user: USER } });
    expect(result.ok).toBe(false);
    expect(result.checks.find((c: { id: string }) => c.id === "master-key-configured")?.passed).toBe(false);
  });

  it("rejects non-object input with BAD_REQUEST", async () => {
    const { router } = buildFakeTRPC();
    await expect(
      router.selfTest.handler({ input: "nope", ctx: { user: USER } })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    // tolerant empty shapes are fine
    expect(() => router.selfTest.schema.parse(undefined)).not.toThrow();
    expect(() => router.selfTest.schema.parse(null)).not.toThrow();
    expect(() => router.selfTest.schema.parse({})).not.toThrow();
  });
});

describe("credentialVault router — exported zod schemas", () => {
  it("exports all five schemas that parse valid and reject invalid input", () => {
    expect(credentialVaultActionSchema.parse("rotate")).toBe("rotate");
    expect(() => credentialVaultActionSchema.parse("PURGE")).toThrow(ZodError);

    expect(credentialVaultPolicyCheckInputSchema.parse({ clientId: 1, action: "read" })).toBeDefined();
    expect(credentialVaultPolicyCheckInputSchema.parse({ clientId: null, action: null })).toBeDefined();
    expect(() => credentialVaultPolicyCheckInputSchema.parse({ clientId: "one" })).toThrow(ZodError);

    expect(credentialVaultRateLimitCheckInputSchema.parse({ clientId: 2 })).toBeDefined();
    expect(credentialVaultRateLimitCheckInputSchema.parse({})).toBeDefined();
    expect(() => credentialVaultRateLimitCheckInputSchema.parse({ clientId: true })).toThrow(ZodError);

    expect(credentialVaultAuditVerifyInputSchema.parse({ limit: 10 })).toBeDefined();
    expect(() => credentialVaultAuditVerifyInputSchema.parse({ limit: 1.5 })).toThrow(ZodError);
    expect(() => credentialVaultAuditVerifyInputSchema.parse({ limit: false })).toThrow(ZodError);

    expect(credentialVaultSelfTestInputSchema.parse({})).toEqual({});
    expect(() => credentialVaultSelfTestInputSchema.parse(7)).toThrow(ZodError);
  });
});

describe("credentialVault router — exported constants", () => {
  it("publishes the sliding-window budget as a stable contract constant", async () => {
    expect(CREDENTIAL_VAULT_DEFAULT_RATE_LIMIT_PER_MINUTE).toBe(30);
    // and the live route reports exactly that budget (fresh clientId: the
    // limiter is module-scoped, so tests never share buckets)
    const { router } = buildFakeTRPC();
    const first = await router.rateLimitCheck.handler({ input: { clientId: 777 }, ctx: { user: USER } });
    expect(first.limitPerMinute).toBe(CREDENTIAL_VAULT_DEFAULT_RATE_LIMIT_PER_MINUTE);
    expect(first.limited).toBe(false);
  });
});

describe("credentialVault router — no-db guarantee & checklist witness", () => {
  it("the router source has no imports from any db module", () => {
    const source = readFileSync(
      join(process.cwd(), "packages/core/src/server/routers/credentialVault.ts"),
      "utf8"
    );
    expect(source).not.toMatch(/from\s+["'][^"']*\/db["']/);
    expect(source).not.toContain("getDb");
    expect(source).not.toContain("drizzle-orm");
  });

  it("status exposes exactly the 8 stable checklist ids (UI contract witness)", async () => {
    const { router } = buildFakeTRPC();
    const status = await router.status.handler({ ctx: {} });
    expect(status.checklist.map((item: { id: string }) => item.id)).toEqual([
      "encryption-at-rest",
      "decrypt-on-request-only",
      "audit-logging",
      "credential-rotation",
      "credential-expiration",
      "ip-allowlisting",
      "rate-limiting",
      "two-factor",
    ]);
    expect(status.checklist).toHaveLength(8);
  });
});

/* ==========================================================================
 * Cycle 35 — credential-lifecycle queries (ADDITIVE EXTENSION; every suite
 * above is untouched). Three NEW protected queries forward to the pure
 * engine in lib/security/credentialLifecycle.ts:
 *   expirationCheck   protected query { credentials: unknown[], clock? }
 *   rotationPlan      protected query { credentials, clock?, defaultIntervalDays? }
 *   ipAllowlistCheck  protected query { ip: string, allowlist: string[] | string }
 * Same fake-tRPC harness as above: UNAUTHORIZED without a user, zod
 * BAD_REQUEST on malformed input, no DB anywhere and no secret material
 * ever echoed back.
 * ========================================================================== */

const LIFE_CLOCK = new Date("2026-09-01T12:00:00.000Z");
const lifeIso = (d: Date): string => d.toISOString();
const lifeShift = (days: number, extraMs = 0): Date =>
  new Date(LIFE_CLOCK.getTime() + days * 86_400_000 + extraMs);

describe("credentialVault router — lifecycle route shape (cycle 35)", () => {
  it("exposes expirationCheck/rotationPlan/ipAllowlistCheck as schema-bearing queries", () => {
    const { router } = buildFakeTRPC();
    for (const name of ["expirationCheck", "rotationPlan", "ipAllowlistCheck"]) {
      expect(router[name], `route "${name}"`).toBeDefined();
      expect(router[name].type, `route "${name}" type`).toBe("query");
      expect(router[name].schema, `route "${name}" schema`).toBeDefined();
    }
  });
});

describe("credentialVault router — lifecycle auth gates (cycle 35)", () => {
  it("rejects a missing user with TRPCError UNAUTHORIZED on all three lifecycle queries", async () => {
    const { router } = buildFakeTRPC();
    const calls = [
      router.expirationCheck.handler({ input: { credentials: [] }, ctx: {} }),
      router.rotationPlan.handler({ input: { credentials: [] }, ctx: {} }),
      router.ipAllowlistCheck.handler({
        input: { ip: "10.0.0.1", allowlist: ["10.0.0.1"] },
        ctx: {},
      }),
    ];
    for (const call of calls) {
      await expect(call).rejects.toBeInstanceOf(TRPCError);
      await expect(call).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    }
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });
});

describe("credentialVault router — expirationCheck (cycle 35)", () => {
  it("forwards the batch to the engine and returns id-ascending results with a summary", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.expirationCheck.handler({
      input: {
        credentials: [
          { id: "b-valid", classification: "api_key", expiresAt: lifeIso(lifeShift(400)) },
          { id: "a-expired", classification: "password", expiresAt: lifeIso(lifeShift(-3)) },
        ],
        clock: lifeIso(LIFE_CLOCK),
      },
      ctx: { user: USER },
    });
    expect(result.summary.total).toBe(2);
    expect(result.summary.valid).toBe(1);
    expect(result.summary.expired).toBe(1);
    expect(result.results.map((r: { id: string }) => r.id)).toEqual(["a-expired", "b-valid"]);
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });

  it("rejects a missing or non-array credentials payload with BAD_REQUEST", async () => {
    const { router } = buildFakeTRPC();
    await expect(
      router.expirationCheck.handler({ input: {}, ctx: { user: USER } })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      router.expirationCheck.handler({ input: { credentials: "nope" }, ctx: { user: USER } })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("credentialVault router — rotationPlan (cycle 35)", () => {
  it("returns a rotation plan with items, summary and a tracking flag", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.rotationPlan.handler({
      input: {
        credentials: [
          { id: "r-current", kind: "oauth", refreshable: true, lastRotatedAt: lifeIso(lifeShift(-10)) },
          { id: "s-static", kind: "api_key", lastRotatedAt: lifeIso(lifeShift(-1)) },
        ],
        clock: lifeIso(LIFE_CLOCK),
      },
      ctx: { user: USER },
    });
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items).toHaveLength(2);
    expect(result.summary.total).toBe(2);
    expect(result.summary.rotatable).toBe(1);
    expect(result.trackingEnabled).toBe(true);
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });

  it("rejects out-of-range defaultIntervalDays values with BAD_REQUEST", async () => {
    const { router } = buildFakeTRPC();
    for (const bad of [-5, 0, 1.5, 3651]) {
      await expect(
        router.rotationPlan.handler({
          input: { credentials: [], defaultIntervalDays: bad },
          ctx: { user: USER },
        })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" }, `defaultIntervalDays ${bad}`);
    }
  });
});

describe("credentialVault router — ipAllowlistCheck (cycle 35)", () => {
  it("passes allow/deny decisions through with the matched rule", async () => {
    const { router } = buildFakeTRPC();
    const inside = await router.ipAllowlistCheck.handler({
      input: { ip: "10.1.2.3", allowlist: ["10.0.0.0/8"] },
      ctx: { user: USER },
    });
    expect(inside.allowed).toBe(true);
    expect(inside.reason).toBe("cidr_match");

    const outside = await router.ipAllowlistCheck.handler({
      input: { ip: "203.0.113.9", allowlist: ["10.0.0.0/8"] },
      ctx: { user: USER },
    });
    expect(outside.allowed).toBe(false);
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });

  it("also accepts a delimited-string allowlist", async () => {
    const { router } = buildFakeTRPC();
    const decision = await router.ipAllowlistCheck.handler({
      input: { ip: "10.0.0.1", allowlist: "10.0.0.1\n192.168.0.0/16" },
      ctx: { user: USER },
    });
    expect(decision.allowed).toBe(true);
  });

  it("rejects a non-string or missing ip with BAD_REQUEST", async () => {
    const { router } = buildFakeTRPC();
    for (const ip of [42, null, undefined]) {
      await expect(
        router.ipAllowlistCheck.handler({
          input: { ip, allowlist: ["10.0.0.1"] },
          ctx: { user: USER },
        })
      ).rejects.toMatchObject({ code: "BAD_REQUEST" }, `ip ${String(JSON.stringify(ip))}`);
    }
  });
});

describe("credentialVault router — lifecycle no-secret-echo guarantee (cycle 35)", () => {
  it("never leaks key-material-shaped fields in lifecycle responses", async () => {
    const { router } = buildFakeTRPC();
    const SECRET_PATTERN =
      /(private[_-]?key|secret[_-]?value|ciphertext|plaintext|master[_-]?key|passphrase|envelope)/i;
    const responses = [
      await router.expirationCheck.handler({
        input: {
          credentials: [{ id: "c1", classification: "oauth_token", expiresAt: lifeIso(lifeShift(80)) }],
          clock: lifeIso(LIFE_CLOCK),
        },
        ctx: { user: USER },
      }),
      await router.rotationPlan.handler({
        input: {
          credentials: [{ id: "c2", kind: "oauth", refreshable: true, lastRotatedAt: lifeIso(lifeShift(-5)) }],
          clock: lifeIso(LIFE_CLOCK),
        },
        ctx: { user: USER },
      }),
      await router.ipAllowlistCheck.handler({
        input: { ip: "10.0.0.1", allowlist: ["10.0.0.1"] },
        ctx: { user: USER },
      }),
    ];
    for (const response of responses) {
      expect(JSON.stringify(response) ?? "").not.toMatch(SECRET_PATTERN);
    }
  });
});

/* ==========================================================================
 * Cycle 37 — Section-A passthrough queries (ADDITIVE EXTENSION; every suite
 * above is untouched). Three NEW protected queries forward to the pure
 * engine in lib/security/credentialLifecycle.ts:
 *   rotationSchedule   protected query { credentials, policy?, clock? }
 *   expiryCheck        protected query { credentials, policy?, clock? }
 *   allowlistEvaluate  protected query { ip: string, entries: unknown[] }
 * Same fake-tRPC harness as above: UNAUTHORIZED without a user, zod
 * BAD_REQUEST on malformed input (including Date-object clocks), no DB
 * anywhere and no secret material ever echoed back.
 * ========================================================================== */

describe("credentialVault router — section-A route shape (cycle 37)", () => {
  it("exposes rotationSchedule/expiryCheck/allowlistEvaluate as schema-bearing queries", () => {
    const { router } = buildFakeTRPC();
    for (const name of ["rotationSchedule", "expiryCheck", "allowlistEvaluate"]) {
      expect(router[name], `route "${name}"`).toBeDefined();
      expect(router[name].type, `route "${name}" type`).toBe("query");
      expect(router[name].schema, `route "${name}" schema`).toBeDefined();
    }
    // the exported schemas are attached verbatim
    expect(router.rotationSchedule.schema).toBe(credentialVaultRotationScheduleInputSchema);
    expect(router.expiryCheck.schema).toBe(credentialVaultExpiryCheckInputSchema);
    expect(router.allowlistEvaluate.schema).toBe(credentialVaultAllowlistEvaluateInputSchema);
    // the three additions stay queries — selfTest remains the only mutation
    for (const name of ["rotationSchedule", "expiryCheck", "allowlistEvaluate"]) {
      expect(router[name].type, `${name} must be a query, not a mutation`).not.toBe("mutation");
    }
  });
});

describe("credentialVault router — section-A auth gates (cycle 37)", () => {
  it("rejects a missing user with TRPCError UNAUTHORIZED on all three queries", async () => {
    const { router } = buildFakeTRPC();
    const calls = [
      router.rotationSchedule.handler({ input: { credentials: [] }, ctx: {} }),
      router.expiryCheck.handler({ input: { credentials: [] }, ctx: {} }),
      router.allowlistEvaluate.handler({ input: { ip: "10.0.0.1", entries: [] }, ctx: {} }),
    ];
    for (const call of calls) {
      await expect(call).rejects.toBeInstanceOf(TRPCError);
      await expect(call).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    }
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });
});

describe("credentialVault router — section-A zod schemas (cycle 37)", () => {
  it("rotationSchedule schema parses valid shapes and rejects type mismatches", () => {
    expect(
      credentialVaultRotationScheduleInputSchema.parse({
        credentials: [],
        policy: { defaultIntervalDays: 45, warnWithinDays: 7, overrides: { teamA: 30 } },
        clock: LIFE_CLOCK.toISOString(),
      })
    ).toBeDefined();
    expect(credentialVaultRotationScheduleInputSchema.parse({ credentials: [{ id: "x" }] })).toBeDefined();
    // a MISSING credentials key is a distinct shape rejection from a non-array payload
    expect(() => credentialVaultRotationScheduleInputSchema.parse({})).toThrow(ZodError);

    expect(() => credentialVaultRotationScheduleInputSchema.parse({ credentials: "nope" })).toThrow(ZodError);
    expect(() =>
      credentialVaultRotationScheduleInputSchema.parse({ credentials: [], clock: LIFE_CLOCK }) // Date clock
    ).toThrow(ZodError);
    expect(() =>
      credentialVaultRotationScheduleInputSchema.parse({ credentials: [], policy: { defaultIntervalDays: -5 } })
    ).toThrow(ZodError);
    expect(() =>
      credentialVaultRotationScheduleInputSchema.parse({ credentials: [], policy: { defaultIntervalDays: 3651 } })
    ).toThrow(ZodError); // schema caps at 3650 even though the engine clamps to 36500
    expect(() =>
      credentialVaultRotationScheduleInputSchema.parse({ credentials: [], policy: { warnWithinDays: -1 } })
    ).toThrow(ZodError);
    expect(() =>
      credentialVaultRotationScheduleInputSchema.parse({ credentials: [], policy: { warnWithinDays: 1.5 } })
    ).toThrow(ZodError);
    expect(() =>
      credentialVaultRotationScheduleInputSchema.parse({ credentials: [], policy: { overrides: { teamA: "30" } } })
    ).toThrow(ZodError);
  });

  it("expiryCheck schema parses valid shapes", () => {
    expect(
      credentialVaultExpiryCheckInputSchema.parse({
        credentials: [],
        policy: { warningWindowDays: 14 },
        clock: LIFE_CLOCK.getTime(),
      })
    ).toBeDefined();
    // bare-minimum shape: credentials is the only required key
    expect(credentialVaultExpiryCheckInputSchema.parse({ credentials: [{ id: "x" }] })).toBeDefined();
    // any string/number clock clears the schema gate (unparsable strings are
    // degraded to "now" by the engine, not rejected here)
    expect(credentialVaultExpiryCheckInputSchema.parse({ credentials: [], clock: "junk" })).toBeDefined();
  });

  it("expiryCheck schema rejects type mismatches and out-of-band windows", () => {
    expect(() => credentialVaultExpiryCheckInputSchema.parse({})).toThrow(ZodError); // credentials missing
    expect(() => credentialVaultExpiryCheckInputSchema.parse({ credentials: 42 })).toThrow(ZodError);
    expect(() => credentialVaultExpiryCheckInputSchema.parse({ credentials: { length: 0 } })).toThrow(ZodError);
    expect(() =>
      credentialVaultExpiryCheckInputSchema.parse({ credentials: [], policy: { warningWindowDays: -1 } })
    ).toThrow(ZodError);
    expect(() =>
      credentialVaultExpiryCheckInputSchema.parse({ credentials: [], policy: { warningWindowDays: 1.5 } })
    ).toThrow(ZodError);
    expect(() =>
      credentialVaultExpiryCheckInputSchema.parse({ credentials: [], policy: { warningWindowDays: 3651 } }) // schema cap 3650
    ).toThrow(ZodError);
    expect(() => credentialVaultExpiryCheckInputSchema.parse({ credentials: [], clock: new Date() })).toThrow(ZodError);
    expect(() => credentialVaultExpiryCheckInputSchema.parse({ credentials: [], clock: true })).toThrow(ZodError);
  });

  it("allowlistEvaluate schema requires a string ip and an entries array", () => {
    expect(credentialVaultAllowlistEvaluateInputSchema.parse({ ip: "10.0.0.1", entries: ["10.0.0.1"] })).toBeDefined();
    expect(credentialVaultAllowlistEvaluateInputSchema.parse({ ip: "10.0.0.1", entries: [{ value: "10.0.0.1" }] }))
      .toBeDefined();

    expect(() => credentialVaultAllowlistEvaluateInputSchema.parse({ entries: [] })).toThrow(ZodError); // ip missing
    expect(() => credentialVaultAllowlistEvaluateInputSchema.parse({ ip: 42, entries: [] })).toThrow(ZodError);
    expect(() => credentialVaultAllowlistEvaluateInputSchema.parse({ ip: "10.0.0.1" })).toThrow(ZodError); // entries missing
    // an empty ip STRING still passes the schema gate: emptiness is the
    // engine's denied-invalid verdict, not a zod concern
    expect(credentialVaultAllowlistEvaluateInputSchema.parse({ ip: "", entries: [] })).toEqual({
      ip: "",
      entries: [],
    });
    expect(() =>
      credentialVaultAllowlistEvaluateInputSchema.parse({ ip: "10.0.0.1", entries: "10.0.0.1" }) // non-array
    ).toThrow(ZodError);
  });
});

describe("credentialVault router — section-A validation errors (cycle 37)", () => {
  it("rejects missing or non-array credentials payloads with BAD_REQUEST", async () => {
    const { router } = buildFakeTRPC();
    await expect(
      router.rotationSchedule.handler({ input: {}, ctx: { user: USER } })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      router.rotationSchedule.handler({ input: { credentials: "nope" }, ctx: { user: USER } })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      router.expiryCheck.handler({ input: { credentials: 42 }, ctx: { user: USER } })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });

  it("rejects a non-string ip or non-array entries with BAD_REQUEST", async () => {
    const { router } = buildFakeTRPC();
    await expect(
      router.allowlistEvaluate.handler({ input: { ip: 42, entries: [] }, ctx: { user: USER } })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      router.allowlistEvaluate.handler({ input: { ip: "10.0.0.1", entries: {} }, ctx: { user: USER } })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });

  it("rejects Date-object clocks with BAD_REQUEST (clock must be ISO string or epoch ms)", async () => {
    const { router } = buildFakeTRPC();
    await expect(
      router.rotationSchedule.handler({
        input: { credentials: [], clock: LIFE_CLOCK },
        ctx: { user: USER },
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(
      router.expiryCheck.handler({
        input: { credentials: [], clock: LIFE_CLOCK },
        ctx: { user: USER },
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("credentialVault router — rotationSchedule (cycle 37)", () => {
  it("passes the rotation schedule through with the injected clock reflected", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.rotationSchedule.handler({
      input: {
        credentials: [
          { id: "a-ok", provider: "prov", lastRotatedAt: lifeIso(lifeShift(-10)) },
          { id: "b-overdue", provider: "prov", lastRotatedAt: lifeIso(lifeShift(-100)) },
          { id: "c-never", provider: "prov" },
        ],
        policy: { defaultIntervalDays: 90, warnWithinDays: 7 },
        clock: lifeIso(LIFE_CLOCK),
      },
      ctx: { user: USER },
    });
    expect(result.policyVersion).toBe("clp1");
    expect(result.generatedAt).toBe(lifeIso(LIFE_CLOCK)); // injected clock echoed
    expect(result.summary).toMatchObject({ total: 3, ok: 1, overdue: 1, never: 1 });
    expect(result.summary.nextDueAt).toBe(lifeIso(lifeShift(-10))); // earliest non-ok dueAt
    expect(result.items.map((item: { id: string; status: string }) => `${item.id}:${item.status}`)).toEqual([
      "c-never:never",
      "b-overdue:overdue",
      "a-ok:ok",
    ]);
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });

  it("forwards policy overrides into the engine (policyKey interval lands as due)", async () => {
    const { router } = buildFakeTRPC();
    const overridden = await router.rotationSchedule.handler({
      input: {
        credentials: [
          { id: "team", provider: "prov", policyKey: "teamA", lastRotatedAt: lifeIso(lifeShift(-45)) },
        ],
        policy: { defaultIntervalDays: 90, overrides: { teamA: 45 } },
        clock: lifeIso(LIFE_CLOCK),
      },
      ctx: { user: USER },
    });
    expect(overridden.items[0].intervalDays).toBe(45); // override applied
    expect(overridden.items[0].status).toBe("due"); // -45d rotated + 45d interval == now exactly
  });
});

describe("credentialVault router — expiryCheck (cycle 37)", () => {
  it("passes the expiry evaluation through with items and summary", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.expiryCheck.handler({
      input: {
        credentials: [
          { id: "e-expired", provider: "prov", status: "active", expiryAt: lifeIso(lifeShift(-3)) },
          { id: "v-valid", provider: "prov", status: "active", expiryAt: lifeIso(lifeShift(400)) },
          { id: "i-inactive", provider: "prov", status: "REVOKED", expiryAt: lifeIso(lifeShift(400)) },
          { id: "n-none", provider: "prov", status: "active" },
        ],
        policy: { warningWindowDays: 30 },
        clock: lifeIso(LIFE_CLOCK),
      },
      ctx: { user: USER },
    });
    expect(result.policyVersion).toBe("clp1");
    expect(result.generatedAt).toBe(lifeIso(LIFE_CLOCK));
    expect(result.summary).toMatchObject({
      total: 4,
      expired: 1,
      valid: 1,
      inactive: 1,
      noExpiry: 1,
      coverageRate: 0.75,
    });
    expect(result.summary.soonestExpiry).toBe(lifeIso(lifeShift(-3)));
    expect(result.items.map((item: { id: string }) => item.id)).toEqual([
      "e-expired",
      "i-inactive",
      "n-none",
      "v-valid",
    ]);
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });
});

describe("credentialVault router — allowlistEvaluate (cycle 37)", () => {
  it("returns normalized entries plus an exact-match allow decision", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.allowlistEvaluate.handler({
      input: { ip: "10.0.0.1", entries: [" 10.0.0.1 ", "10.0.0.0/8", "10.0.*", "bogus"] },
      ctx: { user: USER },
    });
    expect(result.normalized.version).toBe("alw1");
    expect(result.normalized.accepted).toBe(3);
    expect(result.normalized.rejected).toBe(1);
    expect(result.normalized.invalid[0]).toMatchObject({ index: 3 });
    expect(result.decision).toEqual({
      allowed: true,
      matchedBy: "exact",
      matchedEntry: "10.0.0.1",
      reason: "Allowed by exact allowlist match",
    });
    expect(dbMocks.getDb).not.toHaveBeenCalled();
  });

  it("denies non-matching addresses with the structured deny decision", async () => {
    const { router } = buildFakeTRPC();
    const result = await router.allowlistEvaluate.handler({
      input: { ip: "203.0.113.9", entries: ["10.0.0.0/8"] },
      ctx: { user: USER },
    });
    expect(result.normalized.entries.map((entry: { value: string }) => entry.value)).toEqual(["10.0.0.0/8"]);
    expect(result.decision.allowed).toBe(false);
    expect(result.decision.matchedBy).toBeNull();
    expect(result.decision.matchedEntry).toBeNull();
    expect(result.decision.reason).toBe("Denied: no matching allowlist entry");
  });
});

describe("credentialVault router — section-A no-db witness (cycle 37)", () => {
  it("source scan still shows no db imports while wiring the three new queries", () => {
    const source = readFileSync(
      join(process.cwd(), "packages/core/src/server/routers/credentialVault.ts"),
      "utf8"
    );
    // unchanged hardening guarantee (mirrors the cycle-32 scan above)
    expect(source).not.toMatch(/from\s+["'][^"']*\/db["']/);
    expect(source).not.toContain("getDb");
    expect(source).not.toContain("drizzle-orm");
    // the cycle-37 procedures are wired in that same db-free file
    for (const name of ["rotationSchedule", "expiryCheck", "allowlistEvaluate"]) {
      expect(source).toContain(name);
    }
  });
});
