/**
 * Credential Vault Router — tRPC facade over the pure vault engine
 * (lib/security/credentialCrypto.ts).
 *
 * Cycle 32 (API-FIRST-INTEGRATION-PLAN P0 security block): lands the
 * backend contract the cycle-31 UI layer
 * (pages/security/credentialVaultApi.ts) expects — AES-256-GCM envelopes
 * at rest ("cosv1"), decrypt-only-at-request, SHA-256 audit hash chain,
 * sliding-window rate limiting and "cvp1" access policy.
 *
 * The engine is pure — this router owns only in-module mutable state (the
 * audit chain seeded with a genesis entry, per-client rate windows and a
 * 30s availability-probe cache). No database access anywhere; counts are
 * reported as null until a DB-backed layer lands. Handlers never throw —
 * the only intentional errors are zod BAD_REQUEST failures from input
 * validation. No secrets or key material are ever echoed.
 *
 * Procedures:
 *   status         PUBLIC   query    vault capability snapshot + 8-item checklist
 *   policyCheck    protected query  evaluatePolicy ("cvp1")
 *   rateLimitCheck protected query  sliding-window rate budget
 *   auditVerify    protected query  audit hash-chain integrity
 *   selfTest       protected mutation  on-demand integrity probe
 *   expirationCheck   protected query  expiration-policy evaluation (cycle 35)
 *   rotationPlan      protected query  OAuth rotation scheduling (cycle 35)
 *   ipAllowlistCheck  protected query  IPv4 allowlist verdict (cycle 35)
 *   rotationSchedule protected query  per-credential rotation bands (cycle 37)
 *   expiryCheck      protected query  credential expiry evaluation (cycle 37)
 *   allowlistEvaluate protected query IP allowlist normalize + evaluate (cycle 37)
 *
 * Cycle 35 (API-FIRST-INTEGRATION-PLAN security checklist) adds the three
 * remaining P0 controls as pure passthroughs over the new lifecycle engine
 * lib/security/credentialLifecycle.ts: expiration policies, OAuth rotation
 * scheduling and IP allowlist configuration. Still no DB access; the new
 * queries are stateless and never echo secrets.
 */

import { z } from "zod";
import {
  CREDENTIAL_VAULT_ALGORITHM,
  CREDENTIAL_VAULT_KDF,
  CREDENTIAL_VAULT_ENVELOPE_VERSION,
  VAULT_RATE_LIMIT_PER_MINUTE,
  appendAuditEntry,
  buildVaultChecklist,
  checkRateLimit,
  decryptCredential,
  encryptCredential,
  evaluatePolicy,
  isVaultKeyConfigured,
  runVaultSelfTest,
  verifyAuditChain,
} from "../../lib/security/credentialCrypto";
import {
  buildRotationPlan,
  buildRotationSchedule,
  evaluateCredentialExpiry,
  evaluateExpirationBatch,
  evaluateIpAgainstAllowlist,
  isIpAllowed,
  normalizeAllowlist,
} from "../../lib/security/credentialLifecycle";

/* ------------------------------------------------------------------ */
/* Exported zod schemas (part of the contract — reused by UI/QA)        */
/* ------------------------------------------------------------------ */

/** Vault access actions covered by the cvp1 policy (strict enum everywhere). */
export const credentialVaultActionSchema = z.enum(["read", "write", "rotate", "delete"]);

/** Input schema for `policyCheck`. */
export const credentialVaultPolicyCheckInputSchema = z.object({
  clientId: z.number().int().nullish(),
  action: credentialVaultActionSchema.nullish(),
});

/** Input schema for `rateLimitCheck`. */
export const credentialVaultRateLimitCheckInputSchema = z.object({
  clientId: z.number().int().nullish(),
});

/** Input schema for `auditVerify` (`limit` truncates the verification window). */
export const credentialVaultAuditVerifyInputSchema = z.object({
  clientId: z.number().int().nullish(),
  limit: z.number().int().nullish(),
});

/** Input schema for `selfTest` (no meaningful input; tolerant empty object). */
export const credentialVaultSelfTestInputSchema = z.object({}).nullish();

/** Input schema for `expirationCheck` (cycle 35 — pure policy evaluation). */
export const credentialVaultExpirationCheckInputSchema = z.object({
  credentials: z.array(z.unknown()),
  clock: z.union([z.string(), z.number()]).nullish(),
});

/** Input schema for `rotationPlan` (cycle 35 — OAuth rotation scheduling). */
export const credentialVaultRotationPlanInputSchema = z.object({
  credentials: z.array(z.unknown()),
  clock: z.union([z.string(), z.number()]).nullish(),
  defaultIntervalDays: z.number().int().positive().max(3650).nullish(),
});

/** Input schema for `ipAllowlistCheck` (cycle 35 — IPv4 allowlist verdict). */
export const credentialVaultIpAllowlistCheckInputSchema = z.object({
  ip: z.string(),
  allowlist: z.union([z.array(z.string()), z.string()]),
});

/** Shape of the `rotationSchedule` input (cycle 37 — per-credential rotation bands). */
export const credentialVaultRotationScheduleShape = {
  credentials: z.array(z.unknown()),
  policy: z
    .object({
      defaultIntervalDays: z.number().int().positive().max(3650).nullish(),
      warnWithinDays: z.number().int().min(0).max(3650).nullish(),
      overrides: z.record(z.string(), z.number()).nullish(),
    })
    .nullish(),
  clock: z.union([z.string(), z.number()]).nullish(),
};

/** Input schema for `rotationSchedule` (single source of truth: the shape above). */
export const credentialVaultRotationScheduleInputSchema = z.object(credentialVaultRotationScheduleShape);
export type CredentialVaultRotationScheduleInput = z.infer<typeof credentialVaultRotationScheduleInputSchema>;

/** Shape of the `expiryCheck` input (cycle 37 — credential expiry evaluation). */
export const credentialVaultExpiryCheckShape = {
  credentials: z.array(z.unknown()),
  policy: z
    .object({
      warningWindowDays: z.number().int().min(0).max(3650).nullish(),
    })
    .nullish(),
  clock: z.union([z.string(), z.number()]).nullish(),
};

/** Input schema for `expiryCheck` (single source of truth: the shape above). */
export const credentialVaultExpiryCheckInputSchema = z.object(credentialVaultExpiryCheckShape);
export type CredentialVaultExpiryCheckInput = z.infer<typeof credentialVaultExpiryCheckInputSchema>;

/** Shape of the `allowlistEvaluate` input (cycle 37 — IP allowlist normalize + evaluate). */
export const credentialVaultAllowlistEvaluateShape = {
  ip: z.string(),
  entries: z.array(z.unknown()),
};

/** Input schema for `allowlistEvaluate` (single source of truth: the shape above). */
export const credentialVaultAllowlistEvaluateInputSchema = z.object(credentialVaultAllowlistEvaluateShape);
export type CredentialVaultAllowlistEvaluateInput = z.infer<typeof credentialVaultAllowlistEvaluateInputSchema>;

/* ------------------------------------------------------------------ */
/* In-module mutable state (no DB, no globals outside this module)      */
/* ------------------------------------------------------------------ */

const PROBE_TTL_MS = 30_000;

/** Per-client sliding-window rate state, keyed by clientId or "global". */
const rateWindows = new Map<string, number[]>();

/** The append-only audit chain, seeded at module init with a genesis entry. */
const auditChain: Array<ReturnType<typeof appendAuditEntry>["record"]> = [];

let nextAuditSeq = 1;

function seedAuditGenesis() {
  const genesis = appendAuditEntry("0".repeat(64), {
    id: "genesis",
    seq: nextAuditSeq,
    action: "vault.init",
    credentialRef: "",
    outcome: "success",
    now: new Date(),
  });
  nextAuditSeq += 1;
  auditChain.push(genesis.record);
}
seedAuditGenesis();

function appendVaultAudit(action: string, outcome: "success" | "failure", credentialRef = "") {
  const appended = appendAuditEntry(auditChain[auditChain.length - 1]?.hash ?? "0".repeat(64), {
    id: `${action}-${nextAuditSeq}`,
    seq: nextAuditSeq,
    action,
    credentialRef,
    outcome,
    now: new Date(),
  });
  nextAuditSeq += 1;
  auditChain.push(appended.record);
}

/**
 * Whether write/rotate/delete require a second factor. Config-driven via
 * env so deployments can opt in without code changes.
 */
function twoFactorEnabled(): boolean {
  return process.env.CREDENTIAL_VAULT_REQUIRE_2FA === "true";
}

/** Cheap availability probe: one encrypt→decrypt roundtrip (~2 scrypt calls). */
function cheapRoundTripProbe(): boolean {
  try {
    if (!isVaultKeyConfigured()) return false;
    // Key material stays inside this closure — never returned or logged.
    const probeId = "vault-status-probe";
    const sealed = encryptCredential("vault-status-probe-secret", resolveProbeKey(), { id: probeId });
    if (!sealed.ok) return false;
    const opened = decryptCredential(sealed.envelope, resolveProbeKey());
    return opened.ok && opened.plainText === "vault-status-probe-secret";
  } catch {
    return false;
  }
}

/** Internal helper — re-reads env material for the probe (never logged). */
function resolveProbeKey(): string {
  return process.env.CREDENTIAL_VAULT_KEY || process.env.VAULT_MASTER_KEY || "";
}

/** Memoized probe result keyed by keyConfigured so env flips recompute. */
let probeCache: { keyConfigured: boolean; checkedAt: number; available: boolean } | null = null;

function currentAvailability(): boolean {
  const keyConfigured = isVaultKeyConfigured();
  if (!keyConfigured) return false;
  const nowMs = Date.now();
  if (probeCache && probeCache.keyConfigured === keyConfigured && nowMs - probeCache.checkedAt < PROBE_TTL_MS) {
    return probeCache.available;
  }
  const available = cheapRoundTripProbe();
  probeCache = { keyConfigured, checkedAt: nowMs, available };
  return available;
}

/* ------------------------------------------------------------------ */
/* Factory                                                              */
/* ------------------------------------------------------------------ */

export const createCredentialVaultRouter = (t: any, protectedProcedure: any, publicProcedure?: any) => {
  // status is workspace-global and public; fall back to the base t.procedure
  // when the host app does not pass an explicit publicProcedure.
  const publicRoute =
    publicProcedure ?? ((t && typeof t.procedure === "function" ? t.procedure : protectedProcedure) as any);

  return t.router({
    /**
     * Vault capability snapshot: cipher/KDF/envelope identity, 2FA stance,
     * optional telemetry counts (null until a DB layer exists) and the
     * fixed 8-item posture checklist. `available` requires configured key
     * material AND a passing roundtrip probe (memoized 30s).
     */
    status: publicRoute.query(async () => {
      const twoFactorRequired = twoFactorEnabled();
      const checklist = buildVaultChecklist({ twoFactorConfigured: twoFactorRequired });
      return {
        available: currentAvailability(),
        algorithm: CREDENTIAL_VAULT_ALGORITHM,
        kdf: CREDENTIAL_VAULT_KDF,
        envelope: CREDENTIAL_VAULT_ENVELOPE_VERSION,
        twoFactorRequired,
        // Cycle 35 additive capability flags (checklist ids/order unchanged).
        expirationPoliciesEnforced: true,
        rotationTrackingAvailable: true,
        ipAllowlistSupported: true,
        credentialsCount: null,
        connectionsCount: null,
        lastRotatedAt: null,
        updatedAt: new Date().toISOString(),
        checklist,
      };
    }),

    /**
     * Policy verdict ("cvp1") for a vault action. Delete additionally
     * requires explicit confirmation at mutation time, so it reports
     * allowed:false here until confirmed by the calling flow.
     */
    policyCheck: protectedProcedure
      .input(credentialVaultPolicyCheckInputSchema)
      .query(async ({ input }: any) => {
        const decision = evaluatePolicy(input?.action ?? "read", {
          twoFactorConfigured: twoFactorEnabled(),
        });
        return {
          allowed: decision.allowed,
          reason: decision.reason,
          requiresTwoFactor: decision.requiresTwoFactor,
          policyVersion: decision.policyVersion,
        };
      }),

    /**
     * Sliding-window rate budget (default 30/min) tracked per clientId in
     * module memory; accepted attempts advance the window.
     */
    rateLimitCheck: protectedProcedure
      .input(credentialVaultRateLimitCheckInputSchema)
      .query(async ({ input }: any) => {
        const key = input?.clientId == null ? "global" : String(input.clientId);
        const decision = checkRateLimit({ hits: rateWindows.get(key) ?? [] }, { now: Date.now() });
        rateWindows.set(key, [...decision.nextState.hits]);
        return {
          limited: decision.limited,
          limitPerMinute: decision.limitPerMinute,
          remaining: decision.remaining,
          resetAt: decision.resetAt,
        };
      }),

    /**
     * Audit hash-chain integrity walk. The chain is global (seeded with a
     * genesis entry at module init), so verification always covers the
     * whole chain; `limit` truncates from the tail (most recent entries).
     */
    auditVerify: protectedProcedure
      .input(credentialVaultAuditVerifyInputSchema)
      .query(async ({ input }: any) => {
        const verdict = verifyAuditChain(auditChain, input?.limit ?? null);
        return {
          verified: verdict.verified,
          entriesChecked: verdict.entriesChecked,
          anomalies: verdict.anomalies,
          chainHead: verdict.chainHead,
          lastEntryAt: verdict.lastEntryAt,
        };
      }),

    /**
     * On-demand integrity self-test (mutation — user triggered, never
     * automatic). Each run is recorded on the audit chain.
     */
    selfTest: protectedProcedure
      .input(credentialVaultSelfTestInputSchema)
      .mutation(async (): Promise<any> => {
        let result: ReturnType<typeof runVaultSelfTest>;
        try {
          result = runVaultSelfTest({});
        } catch {
          result = { ok: false, ranAt: new Date().toISOString(), checks: [] };
        }
        appendVaultAudit("vault.selftest", result.ok ? "success" : "failure");
        return result;
      }),

    /**
     * Expiration-policy evaluation over a caller-supplied credential list
     * (cycle 35). Pure passthrough to evaluateExpirationBatch — no DB, no
     * state, secrets never echoed (only ids/classifications/dates return).
     */
    expirationCheck: protectedProcedure
      .input(credentialVaultExpirationCheckInputSchema)
      .query(async ({ input }: any) =>
        evaluateExpirationBatch(input?.credentials ?? [], {
          clock: input?.clock ?? null,
        })
      ),

    /**
     * OAuth rotation schedule over a caller-supplied credential list
     * (cycle 35). Pure passthrough to buildRotationPlan.
     */
    rotationPlan: protectedProcedure
      .input(credentialVaultRotationPlanInputSchema)
      .query(async ({ input }: any) =>
        buildRotationPlan(input?.credentials ?? [], {
          clock: input?.clock ?? null,
          defaultIntervalDays: input?.defaultIntervalDays ?? null,
        })
      ),

    /**
     * IPv4 allowlist verdict for one address against a raw allowlist
     * (array of strings or newline/comma-separated string). Fail-closed:
     * empty or malformed allowlists deny. Pure passthrough to isIpAllowed.
     */
    ipAllowlistCheck: protectedProcedure
      .input(credentialVaultIpAllowlistCheckInputSchema)
      .query(async ({ input }: any) => isIpAllowed(input?.ip ?? "", input?.allowlist ?? [])),

    /**
     * Per-credential rotation bands (cycle 37). Pure passthrough — no DB,
     * secrets never echoed (ids/statuses/dates only).
     */
    rotationSchedule: protectedProcedure
      .input(credentialVaultRotationScheduleInputSchema)
      .query(async ({ input }: any) =>
        buildRotationSchedule(input?.credentials ?? [], input?.policy ?? null, input?.clock ?? null)
      ),

    /**
     * Credential expiry evaluation over a caller-supplied credential list
     * (cycle 37). Pure passthrough — no DB, secrets never echoed.
     */
    expiryCheck: protectedProcedure
      .input(credentialVaultExpiryCheckInputSchema)
      .query(async ({ input }: any) =>
        evaluateCredentialExpiry(input?.credentials ?? [], input?.policy ?? null, input?.clock ?? null)
      ),

    /**
     * IP allowlist normalize + evaluate for one address (cycle 37).
     * Pure passthrough — no DB, secrets never echoed.
     */
    allowlistEvaluate: protectedProcedure
      .input(credentialVaultAllowlistEvaluateInputSchema)
      .query(async ({ input }: any) => ({
        normalized: normalizeAllowlist(input?.entries ?? []),
        decision: evaluateIpAgainstAllowlist(input?.ip ?? "", input?.entries ?? []),
      })),
  });
};

/** Default budget surfaced to callers that want to preflight the limiter. */
export const CREDENTIAL_VAULT_DEFAULT_RATE_LIMIT_PER_MINUTE = VAULT_RATE_LIMIT_PER_MINUTE;
