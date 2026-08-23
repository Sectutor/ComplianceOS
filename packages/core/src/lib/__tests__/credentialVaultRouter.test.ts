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
  createCredentialVaultRouter,
  credentialVaultActionSchema,
  credentialVaultPolicyCheckInputSchema,
  credentialVaultRateLimitCheckInputSchema,
  credentialVaultAuditVerifyInputSchema,
  credentialVaultSelfTestInputSchema,
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
