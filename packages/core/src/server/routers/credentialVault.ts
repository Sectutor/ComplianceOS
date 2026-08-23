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
  });
};

/** Default budget surfaced to callers that want to preflight the limiter. */
export const CREDENTIAL_VAULT_DEFAULT_RATE_LIMIT_PER_MINUTE = VAULT_RATE_LIMIT_PER_MINUTE;
