/**
 * Credential Vault — crypto, audit-chain, rate-limit & policy engine (P0)
 * ======================================================================
 * Pure, deterministic-where-possible, never-throws-on-malformed-input
 * engine behind the `credentialVault.*` tRPC router
 * (server/routers/credentialVault.ts) and the cycle-31 UI contract layer
 * (pages/security/credentialVaultApi.ts).
 *
 * Security posture (API-FIRST-INTEGRATION-PLAN P0 security block):
 *   - AES-256-GCM envelope encryption at rest ("cosv1" envelope format);
 *   - scrypt-derived per-credential subkeys (N=16384, r=8, p=1);
 *   - decrypt-only-at-request: raw secrets never leave the vault process,
 *     callers receive envelopes / masked results, never key material;
 *   - SHA-256 append-only audit hash chain (same construction family as
 *     lib/agent/provenanceLedger.ts) with tamper detection at entry and
 *     link level;
 *   - sliding-window rate limiting (pure state in/out, no globals);
 *   - declarative access policy (2FA gating, delete confirmation, IP
 *     allowlist) with a stable policy version ("cvp1");
 *   - fixed 8-item posture checklist + injectable self-test.
 *
 * Hard rules enforced by construction:
 *   - master key material is only ever accepted as a function argument or
 *     read from env (CREDENTIAL_VAULT_KEY, fallback VAULT_MASTER_KEY); it
 *     is NEVER logged, echoed or embedded in envelopes or results;
 *   - malformed input of any shape produces a discriminated "not ok"
 *     result or a frozen EMPTY_* zero-shape — this module never throws;
 *   - no DB access, no network, no globals for crypto state (the router
 *     owns the mutable audit chain / rate windows).
 *
 * Envelope format "cosv1": base64(JSON) of
 *   { v: "cosv1", kdf: "scrypt", salt, iv, tag, ct, createdAt,
 *     id, kh }
 * where salt/iv/tag/ct are base64, `id` is the credential id (bound as
 * GCM AAD so envelopes cannot be replayed across credentials) and `kh`
 * is a one-way SHA-256 key-confirmation digest of the derived subkey
 * (used solely to distinguish WRONG_KEY from TAMPERED — it never
 * reveals key material).
 */

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "crypto";

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

/** Symmetric cipher used for every envelope. */
export const CREDENTIAL_VAULT_ALGORITHM = "aes-256-gcm";
/** Key derivation function identifier embedded in envelopes. */
export const CREDENTIAL_VAULT_KDF = "scrypt";
/** Envelope format version. */
export const CREDENTIAL_VAULT_ENVELOPE_VERSION = "cosv1";
/** Access-policy version returned by evaluatePolicy. */
export const CREDENTIAL_VAULT_POLICY_VERSION = "cvp1";
/** Sliding rate-limit window (ms). */
export const VAULT_RATE_LIMIT_WINDOW_MS = 60_000;
/** Default rate-limit budget per window. */
export const VAULT_RATE_LIMIT_PER_MINUTE = 30;
/** scrypt cost parameters (N=16384 per the P0 plan). */
export const VAULT_SCRYPT_PARAMS = Object.freeze({ N: 16384, r: 8, p: 1, keyLen: 32 });
/** Prev-head value of the very first audit entry (all-zero SHA-256). */
export const VAULT_AUDIT_GENESIS_HASH = "0".repeat(64);

/** Vault actions covered by the access policy. */
export type VaultAction = "read" | "write" | "rotate" | "delete";

/** Discriminated failure codes for envelope decryption. */
export type VaultCryptoErrorCode =
  | "TAMPERED"
  | "WRONG_KEY"
  | "MALFORMED"
  | "UNSUPPORTED_VERSION";

/** Injectable random source (defaults to crypto.randomBytes). */
export type VaultRandomSource = (byteLength: number) => Buffer;

/** Clock input accepted anywhere: Date, epoch-ms number or ISO string. */
export type VaultClockInput = Date | number | string | null | undefined;

/* ------------------------------------------------------------------ */
/* Small pure helpers                                                  */
/* ------------------------------------------------------------------ */

/** Normalize any accepted clock input to an ISO-8601 string. */
export function toVaultIso(now?: VaultClockInput): string {
  if (now instanceof Date && !Number.isNaN(now.getTime())) return now.toISOString();
  if (typeof now === "number" && Number.isFinite(now)) return new Date(now).toISOString();
  if (typeof now === "string" && now.length > 0 && !Number.isNaN(Date.parse(now))) {
    return new Date(now).toISOString();
  }
  return new Date().toISOString();
}

/** Coerce unknown -> boolean with a default (never throws). */
function boolOr(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/** Strict base64 validation (Buffer.from is far too forgiving). */
function isStrictBase64(value: unknown, allowEmpty = false): value is string {
  if (typeof value !== "string") return false;
  if (value.length === 0) return allowEmpty;
  if (value.length % 4 !== 0) return false;
  return /^[A-Za-z0-9+/]+={0,2}$/.test(value);
}

function decodeBase64(value: string): Buffer {
  return Buffer.from(value, "base64");
}

/** One-way SHA-256 hex digest of any string (audit + key confirmation). */
export function vaultSha256Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex");
}

/* ------------------------------------------------------------------ */
/* Master key handling (names only — never values)                     */
/* ------------------------------------------------------------------ */

/** Where the master key material came from (source NAME, never a value). */
export type VaultKeySource =
  | "explicit"
  | "env:CREDENTIAL_VAULT_KEY"
  | "env:VAULT_MASTER_KEY"
  | "unconfigured";

/**
 * Whether usable master key material exists (explicit argument wins, then
 * env CREDENTIAL_VAULT_KEY, then env VAULT_MASTER_KEY). Empty strings do
 * not count as configured.
 */
export function isVaultKeyConfigured(explicit?: string | null): boolean {
  if (typeof explicit === "string" && explicit.length > 0) return true;
  const envKey = process.env.CREDENTIAL_VAULT_KEY;
  if (typeof envKey === "string" && envKey.length > 0) return true;
  const fallbackKey = process.env.VAULT_MASTER_KEY;
  return typeof fallbackKey === "string" && fallbackKey.length > 0;
}

/** Resolve the key source name (never the material itself). */
export function resolveVaultKeySource(explicit?: string | null): VaultKeySource {
  if (typeof explicit === "string" && explicit.length > 0) return "explicit";
  if (typeof process.env.CREDENTIAL_VAULT_KEY === "string" && process.env.CREDENTIAL_VAULT_KEY.length > 0) {
    return "env:CREDENTIAL_VAULT_KEY";
  }
  if (typeof process.env.VAULT_MASTER_KEY === "string" && process.env.VAULT_MASTER_KEY.length > 0) {
    return "env:VAULT_MASTER_KEY";
  }
  return "unconfigured";
}

/** Internal: fetch the actual material (stays inside the process). */
function readKeyMaterial(explicit?: string | null): string | null {
  if (typeof explicit === "string" && explicit.length > 0) return explicit;
  const envKey = process.env.CREDENTIAL_VAULT_KEY;
  if (typeof envKey === "string" && envKey.length > 0) return envKey;
  const fallbackKey = process.env.VAULT_MASTER_KEY;
  if (typeof fallbackKey === "string" && fallbackKey.length > 0) return fallbackKey;
  return null;
}

/* ------------------------------------------------------------------ */
/* KDF — deterministic per-credential subkeys                          */
/* ------------------------------------------------------------------ */

/**
 * Derive the per-credential AES-256 subkey: scrypt(masterMaterial, salt,
 * 32, N=16384/r=8/p=1). Deterministic — the same key material + salt
 * always yield the same subkey. Returns null on malformed input; the
 * subkey is for crypto internals only and must never be logged.
 */
export function deriveCredentialKey(keyMaterial: string, saltB64: string): Buffer | null {
  if (typeof keyMaterial !== "string" || keyMaterial.length === 0) return null;
  if (!isStrictBase64(saltB64)) return null;
  const salt = decodeBase64(saltB64);
  if (salt.length < 8) return null;
  try {
    return scryptSync(keyMaterial, salt, VAULT_SCRYPT_PARAMS.keyLen, {
      N: VAULT_SCRYPT_PARAMS.N,
      r: VAULT_SCRYPT_PARAMS.r,
      p: VAULT_SCRYPT_PARAMS.p,
    });
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Envelope crypto (cosv1)                                             */
/* ------------------------------------------------------------------ */

export interface VaultEncryptOptions {
  /** Credential id — bound as GCM AAD (required, non-empty). */
  id: string;
  /** Clock input for the createdAt stamp (default: current time). */
  now?: VaultClockInput;
  /** Injectable random source (default crypto.randomBytes). */
  random?: VaultRandomSource;
}

export type VaultEncryptResult =
  | { ok: true; envelope: string; credentialId: string; createdAt: string }
  | { ok: false; code: VaultCryptoErrorCode; reason: string };

export type VaultDecryptResult =
  | { ok: true; plainText: string; credentialId: string }
  | { ok: false; code: VaultCryptoErrorCode; reason: string };

interface VaultEnvelopePayload {
  v: string;
  kdf: string;
  salt: string;
  iv: string;
  tag: string;
  ct: string;
  createdAt: string;
  id: string;
  kh: string;
}

/**
 * Encrypt a credential secret into a cosv1 envelope. The credential id is
 * bound as GCM AAD, so an envelope minted for credential A can never be
 * decrypted as credential B. Never throws — malformed input yields
 * { ok:false, code:"MALFORMED" }.
 */
export function encryptCredential(
  plainText: string,
  keyMaterial: string,
  opts: VaultEncryptOptions
): VaultEncryptResult {
  if (typeof plainText !== "string") {
    return { ok: false, code: "MALFORMED", reason: "Credential secret must be a string" };
  }
  if (typeof keyMaterial !== "string" || keyMaterial.length === 0) {
    return { ok: false, code: "MALFORMED", reason: "Master key material is required" };
  }
  if (typeof opts?.id !== "string" || opts.id.length === 0) {
    return { ok: false, code: "MALFORMED", reason: "Credential id is required for AAD binding" };
  }
  const random = typeof opts.random === "function" ? opts.random : randomBytes;
  try {
    const salt = random(16);
    const iv = random(12);
    if (!Buffer.isBuffer(salt) || !Buffer.isBuffer(iv)) {
      return { ok: false, code: "MALFORMED", reason: "Random source must produce Buffers" };
    }
    const saltB64 = salt.toString("base64");
    const subkey = deriveCredentialKey(keyMaterial, saltB64);
    if (!subkey) {
      return { ok: false, code: "MALFORMED", reason: "Key derivation failed" };
    }
    const cipher = createCipheriv(CREDENTIAL_VAULT_ALGORITHM, subkey, iv);
    cipher.setAAD(Buffer.from(opts.id, "utf8"));
    const ct = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    const createdAt = toVaultIso(opts.now);
    // Fixed key order keeps envelopes byte-deterministic for fixed inputs.
    const payload: VaultEnvelopePayload = {
      v: CREDENTIAL_VAULT_ENVELOPE_VERSION,
      kdf: CREDENTIAL_VAULT_KDF,
      salt: saltB64,
      iv: iv.toString("base64"),
      tag: tag.toString("base64"),
      ct: ct.toString("base64"),
      createdAt,
      id: opts.id,
      // Key confirmation: one-way digest of the subkey (never the key).
      kh: vaultSha256Hex(subkey.toString("base64")),
    };
    const envelope = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
    return { ok: true, envelope, credentialId: opts.id, createdAt };
  } catch {
    return { ok: false, code: "MALFORMED", reason: "Encryption failed" };
  }
}

/**
 * Decrypt a cosv1 envelope back to the plaintext secret. Discriminated
 * result — tampered ciphertext/tag/iv/AAD -> TAMPERED, a different master
 * key -> WRONG_KEY, structurally broken input -> MALFORMED, unknown
 * envelope version -> UNSUPPORTED_VERSION. Never throws.
 */
export function decryptCredential(envelope: string, keyMaterial: string): VaultDecryptResult {
  if (typeof envelope !== "string" || envelope.length === 0) {
    return { ok: false, code: "MALFORMED", reason: "Envelope must be a non-empty base64 string" };
  }
  if (typeof keyMaterial !== "string" || keyMaterial.length === 0) {
    return { ok: false, code: "MALFORMED", reason: "Master key material is required" };
  }
  if (!isStrictBase64(envelope)) {
    return { ok: false, code: "MALFORMED", reason: "Envelope is not valid base64" };
  }
  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(envelope, "base64").toString("utf8"));
  } catch {
    return { ok: false, code: "MALFORMED", reason: "Envelope payload is not valid JSON" };
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, code: "MALFORMED", reason: "Envelope payload is not an object" };
  }
  const rec = payload as Record<string, unknown>;
  if (typeof rec.v !== "string" || rec.v.length === 0) {
    return { ok: false, code: "MALFORMED", reason: "Envelope version field is missing" };
  }
  if (rec.v !== CREDENTIAL_VAULT_ENVELOPE_VERSION) {
    return {
      ok: false,
      code: "UNSUPPORTED_VERSION",
      reason: `Unsupported envelope version: ${rec.v}`,
    };
  }
  if (
    rec.kdf !== CREDENTIAL_VAULT_KDF ||
    !isStrictBase64(rec.salt) ||
    !isStrictBase64(rec.iv) ||
    !isStrictBase64(rec.tag) ||
    !isStrictBase64(rec.ct, true) ||
    typeof rec.createdAt !== "string" ||
    typeof rec.id !== "string" ||
    rec.id.length === 0 ||
    typeof rec.kh !== "string" ||
    !/^[0-9a-f]{64}$/.test(rec.kh)
  ) {
    return { ok: false, code: "MALFORMED", reason: "Envelope fields are missing or malformed" };
  }
  const iv = decodeBase64(rec.iv);
  const tag = decodeBase64(rec.tag);
  if (iv.length !== 12 || tag.length !== 16) {
    return { ok: false, code: "MALFORMED", reason: "Envelope IV/tag have unexpected lengths" };
  }
  const subkey = deriveCredentialKey(keyMaterial, rec.salt);
  if (!subkey) {
    return { ok: false, code: "MALFORMED", reason: "Key derivation failed for envelope salt" };
  }
  // Key confirmation first: a different master key never reaches the
  // decipher, so WRONG_KEY is reported distinctly from TAMPERED.
  const expectedKh = Buffer.from(rec.kh, "hex");
  const actualKh = Buffer.from(vaultSha256Hex(subkey.toString("base64")), "hex");
  if (!timingSafeEqual(expectedKh, actualKh)) {
    return { ok: false, code: "WRONG_KEY", reason: "Master key material does not match this envelope" };
  }
  try {
    const decipher = createDecipheriv(CREDENTIAL_VAULT_ALGORITHM, subkey, iv);
    decipher.setAAD(Buffer.from(rec.id, "utf8"));
    decipher.setAuthTag(tag);
    const plainText = Buffer.concat([decipher.update(decodeBase64(rec.ct)), decipher.final()]);
    return { ok: true, plainText: plainText.toString("utf8"), credentialId: rec.id };
  } catch {
    return {
      ok: false,
      code: "TAMPERED",
      reason: "Envelope authentication failed (tampered or AAD mismatch)",
    };
  }
}

/* ------------------------------------------------------------------ */
/* Audit hash chain (SHA-256, provenanceLedger-style)                  */
/* ------------------------------------------------------------------ */

export interface VaultAuditEntryInput {
  id: string;
  seq?: number | null;
  clientId?: number | string | null;
  action: string;
  credentialRef: string;
  outcome: string;
  now?: VaultClockInput;
}

/** One immutable, hash-linked audit record. */
export interface VaultAuditRecord {
  seq: number;
  id: string;
  clientId: string;
  action: string;
  credentialRef: string;
  outcome: string;
  at: string;
  prevHead: string;
  hash: string;
}

export interface VaultAuditAppendResult {
  seq: number;
  hash: string;
  at: string;
  /** The complete record to persist (includes prevHead for link checks). */
  record: VaultAuditRecord;
}

/** Canonical preimage of one audit record (order-stable). */
export function auditRecordPreimage(record: Omit<VaultAuditRecord, "hash">): string {
  return [record.prevHead, record.seq, record.id, record.clientId, record.action, record.credentialRef, record.outcome, record.at].join("|");
}

/**
 * Append one entry onto the chain: hash = SHA-256(prevHead|seq|id|…|at).
 * Pure — callers own persistence; pass the previous head in and store the
 * returned record. Never throws on malformed input (fields are coerced).
 */
export function appendAuditEntry(
  prevHead: string,
  entry: VaultAuditEntryInput
): VaultAuditAppendResult {
  const head = typeof prevHead === "string" && prevHead.length > 0 ? prevHead : VAULT_AUDIT_GENESIS_HASH;
  const safe = (entry && typeof entry === "object" ? entry : {}) as Partial<VaultAuditEntryInput>;
  const seq = typeof safe.seq === "number" && Number.isFinite(safe.seq) && safe.seq > 0 ? Math.floor(safe.seq) : 1;
  const record: VaultAuditRecord = {
    seq,
    id: typeof safe.id === "string" && safe.id.length > 0 ? safe.id : "unknown",
    clientId: safe.clientId == null ? "" : String(safe.clientId),
    action: typeof safe.action === "string" && safe.action.length > 0 ? safe.action : "unknown",
    credentialRef: typeof safe.credentialRef === "string" ? safe.credentialRef : "",
    outcome: typeof safe.outcome === "string" && safe.outcome.length > 0 ? safe.outcome : "unknown",
    at: toVaultIso(safe.now),
    prevHead: head,
    hash: "",
  };
  record.hash = vaultSha256Hex(auditRecordPreimage(record));
  const frozen = Object.freeze(record);
  return { seq: frozen.seq, hash: frozen.hash, at: frozen.at, record: frozen };
}

/** One integrity anomaly found while walking the chain. */
export interface VaultAuditAnomaly {
  index: number;
  kind: "malformed" | "hash" | "link" | "sequence";
  detail?: string;
}

export interface VaultAuditVerifyResult {
  verified: boolean;
  entriesChecked: number;
  anomalies: number;
  chainHead: string | null;
  lastEntryAt: string | null;
  details: ReadonlyArray<VaultAuditAnomaly>;
}

export const EMPTY_VAULT_AUDIT_VERIFICATION: Readonly<VaultAuditVerifyResult> = Object.freeze({
  verified: false,
  entriesChecked: 0,
  anomalies: 0,
  chainHead: null,
  lastEntryAt: null,
  details: Object.freeze([]),
});

/**
 * Verify an append-only audit chain: recomputes every entry hash, checks
 * each prevHead link against the previous stored hash (genesis entries
 * must link to VAULT_AUDIT_GENESIS_HASH) and detects sequence gaps.
 * Pure and deterministic — entries are walked in (seq, at, input-order).
 * An empty chain verifies vacuously (0 checked, 0 anomalies).
 */
export function verifyAuditChain(
  entries: unknown,
  limit?: number | null
): VaultAuditVerifyResult {
  if (!Array.isArray(entries)) return EMPTY_VAULT_AUDIT_VERIFICATION;
  const records = entries as unknown[];
  const max =
    typeof limit === "number" && Number.isFinite(limit) && limit >= 0
      ? Math.min(Math.floor(limit), records.length)
      : records.length;
  const ordered = records
    .map((rec, index) => ({ rec, index }))
    .sort((a, b) => {
      const seqA = a.rec && typeof a.rec === "object" ? (a.rec as VaultAuditRecord).seq : NaN;
      const seqB = b.rec && typeof b.rec === "object" ? (b.rec as VaultAuditRecord).seq : NaN;
      const seqDiff = (Number.isFinite(seqA) ? seqA : Number.MAX_SAFE_INTEGER) - (Number.isFinite(seqB) ? seqB : Number.MAX_SAFE_INTEGER);
      if (seqDiff !== 0) return seqDiff;
      const atA = a.rec && typeof a.rec === "object" ? String((a.rec as VaultAuditRecord).at ?? "") : "";
      const atB = b.rec && typeof b.rec === "object" ? String((b.rec as VaultAuditRecord).at ?? "") : "";
      if (atA !== atB) return atA < atB ? -1 : 1;
      return a.index - b.index;
    });

  const anomalies: VaultAuditAnomaly[] = [];
  let runningHead = VAULT_AUDIT_GENESIS_HASH;
  let expectedSeq = 1;
  let chainHead: string | null = null;
  let lastEntryAt: string | null = null;
  let checked = 0;

  for (let position = 0; position < max; position += 1) {
    const { rec, index } = ordered[position];
    checked += 1;
    if (!rec || typeof rec !== "object" || Array.isArray(rec)) {
      anomalies.push({ index, kind: "malformed", detail: "Entry is not an object" });
      break;
    }
    const entry = rec as Record<string, unknown>;
    const id = entry.id;
    const action = entry.action;
    const outcome = entry.outcome;
    const at = entry.at;
    const seq = entry.seq;
    const prevHead = entry.prevHead;
    const hash = entry.hash;
    const structurallyValid =
      typeof id === "string" && id.length > 0 &&
      typeof action === "string" && action.length > 0 &&
      typeof outcome === "string" && outcome.length > 0 &&
      typeof at === "string" && at.length > 0 &&
      typeof seq === "number" && Number.isFinite(seq) && seq > 0 &&
      typeof prevHead === "string" && prevHead.length === 64 &&
      typeof hash === "string" && /^[0-9a-f]{64}$/.test(hash);
    if (!structurallyValid) {
      anomalies.push({ index, kind: "malformed", detail: "Entry fields are missing or malformed" });
      break;
    }
    const candidate: Omit<VaultAuditRecord, "hash"> = {
      seq,
      id,
      clientId: entry.clientId == null ? "" : String(entry.clientId),
      action,
      credentialRef: typeof entry.credentialRef === "string" ? entry.credentialRef : "",
      outcome,
      at,
      prevHead,
    };
    const recomputed = vaultSha256Hex(auditRecordPreimage(candidate));
    if (recomputed !== hash) {
      anomalies.push({ index, kind: "hash", detail: "Entry hash does not match its contents" });
    }
    if (prevHead !== runningHead) {
      anomalies.push({ index, kind: "link", detail: "Entry does not link to the previous chain head" });
    }
    if (seq !== expectedSeq) {
      anomalies.push({ index, kind: "sequence", detail: `Expected seq ${expectedSeq}, found ${seq}` });
    }
    runningHead = hash;
    expectedSeq = seq + 1;
    chainHead = hash;
    lastEntryAt = at;
  }

  return {
    verified: anomalies.length === 0,
    entriesChecked: checked,
    anomalies: anomalies.length,
    chainHead,
    lastEntryAt,
    details: Object.freeze(anomalies),
  };
}

/* ------------------------------------------------------------------ */
/* Sliding-window rate limiter (pure, state in/out)                    */
/* ------------------------------------------------------------------ */

export interface VaultRateState {
  readonly hits: ReadonlyArray<number>;
}

export interface VaultRateDecision {
  limited: boolean;
  limitPerMinute: number;
  remaining: number;
  resetAt: string;
  nextState: VaultRateState;
}

export const EMPTY_VAULT_RATE_STATE: VaultRateState = Object.freeze({ hits: Object.freeze([]) });

export const EMPTY_VAULT_RATE_LIMIT_RESULT: Readonly<{
  limited: boolean;
  limitPerMinute: number;
  remaining: number;
  resetAt: string | null;
}> = Object.freeze({ limited: false, limitPerMinute: 0, remaining: 0, resetAt: null });

/**
 * Sliding-window rate limit: hits within the last 60s count against the
 * budget. Pure — the input state is never mutated; the updated window is
 * returned as `nextState` (rejected attempts are not recorded). resetAt
 * is the moment the oldest hit in the window expires.
 */
export function checkRateLimit(
  state: unknown,
  opts?: { limitPerMinute?: number | null; now?: number | null }
): VaultRateDecision {
  const limit =
    typeof opts?.limitPerMinute === "number" && Number.isFinite(opts.limitPerMinute) && opts.limitPerMinute > 0
      ? Math.floor(opts.limitPerMinute)
      : VAULT_RATE_LIMIT_PER_MINUTE;
  const now =
    typeof opts?.now === "number" && Number.isFinite(opts.now) ? opts.now : Date.now();
  const rawHits = state && typeof state === "object" && Array.isArray((state as VaultRateState).hits)
    ? (state as VaultRateState).hits
    : [];
  const windowStart = now - VAULT_RATE_LIMIT_WINDOW_MS;
  const activeHits: number[] = [];
  for (const hit of rawHits) {
    if (typeof hit === "number" && Number.isFinite(hit) && hit > windowStart && hit <= now) {
      activeHits.push(hit);
    }
  }
  activeHits.sort((a, b) => a - b);
  const limited = activeHits.length >= limit;
  const nextHits = limited ? activeHits : [...activeHits, now];
  const oldest = activeHits.length > 0 ? activeHits[0] : now;
  return {
    limited,
    limitPerMinute: limit,
    // Post-consumption budget: an accepted attempt itself consumes one slot.
    remaining: Math.max(0, limit - (limited ? activeHits.length : activeHits.length + 1)),
    resetAt: new Date(oldest + VAULT_RATE_LIMIT_WINDOW_MS).toISOString(),
    nextState: Object.freeze({ hits: Object.freeze(nextHits) }),
  };
}

/* ------------------------------------------------------------------ */
/* Access policy (cvp1)                                                */
/* ------------------------------------------------------------------ */

export interface VaultPolicyOptions {
  /** Whether the workspace has 2FA configured. */
  twoFactorConfigured?: boolean | null;
  /** Whether the caller already satisfied the second factor. */
  twoFactorSatisfied?: boolean | null;
  /** Explicit confirmation flag (delete requires it). */
  confirmed?: boolean | null;
  /** Whether the caller IP passed the vault IP allowlist. */
  ipAllowlisted?: boolean | null;
  /** Caller IP (only used for deny reasoning when allowlist state known). */
  clientIp?: string | null;
  now?: VaultClockInput;
}

export interface VaultPolicyDecision {
  allowed: boolean;
  reason: string;
  requiresTwoFactor: boolean;
  policyVersion: string;
}

export const EMPTY_VAULT_POLICY_DECISION: Readonly<VaultPolicyDecision> = Object.freeze({
  allowed: false,
  reason: "Policy input malformed",
  requiresTwoFactor: false,
  policyVersion: CREDENTIAL_VAULT_POLICY_VERSION,
});

/**
 * Evaluate the vault access policy ("cvp1"):
 *   - read: allowed (2FA not required);
 *   - write/rotate: require the second factor when 2FA is configured;
 *   - delete: requires the second factor (when configured) AND an explicit
 *     confirmation flag;
 *   - a caller whose IP is known to be off the allowlist is denied;
 *   - unknown/malformed actions are always denied.
 * Pure and deterministic.
 */
export function evaluatePolicy(
  action: unknown,
  opts?: VaultPolicyOptions
): VaultPolicyDecision {
  const deny = (reason: string, requiresTwoFactor: boolean): VaultPolicyDecision => ({
    allowed: false,
    reason,
    requiresTwoFactor,
    policyVersion: CREDENTIAL_VAULT_POLICY_VERSION,
  });
  const knownAction: VaultAction | null =
    action === "read" || action === "write" || action === "rotate" || action === "delete"
      ? action
      : null;
  if (!knownAction) {
    return deny(`Unknown vault action: ${typeof action === "string" ? action : "(invalid)"}`, false);
  }
  const twoFactorConfigured = boolOr(opts?.twoFactorConfigured, false);
  const twoFactorSatisfied = boolOr(opts?.twoFactorSatisfied, false);
  if (
    opts?.ipAllowlisted === false &&
    typeof opts?.clientIp === "string" &&
    opts.clientIp.length > 0
  ) {
    return deny("Client IP is not on the vault IP allowlist", false);
  }
  if (knownAction === "read") {
    return {
      allowed: true,
      reason: "Read access permitted",
      requiresTwoFactor: false,
      policyVersion: CREDENTIAL_VAULT_POLICY_VERSION,
    };
  }
  const needsTwoFactor = twoFactorConfigured;
  if (needsTwoFactor && !twoFactorSatisfied) {
    return deny(`Two-factor authentication is required for ${knownAction} operations`, true);
  }
  if (knownAction === "delete" && !boolOr(opts?.confirmed, false)) {
    return deny("Explicit confirmation is required to delete a stored credential", needsTwoFactor);
  }
  return {
    allowed: true,
    reason: `${knownAction} operation permitted`,
    requiresTwoFactor: needsTwoFactor,
    policyVersion: CREDENTIAL_VAULT_POLICY_VERSION,
  };
}

/* ------------------------------------------------------------------ */
/* Posture checklist (exactly 8 stable controls)                       */
/* ------------------------------------------------------------------ */

/** Stable checklist ids, in render order. */
export const VAULT_CHECKLIST_IDS: ReadonlyArray<string> = Object.freeze([
  "encryption-at-rest",
  "decrypt-on-request-only",
  "audit-logging",
  "credential-rotation",
  "credential-expiration",
  "ip-allowlisting",
  "rate-limiting",
  "two-factor",
]);

export interface VaultChecklistItem {
  id: string;
  label: string;
  description: string;
  implemented: boolean;
}

export interface VaultCapabilities {
  encryptionAtRest?: boolean | null;
  decryptOnRequestOnly?: boolean | null;
  auditLogging?: boolean | null;
  rotationTracking?: boolean | null;
  expirationTracking?: boolean | null;
  ipAllowlistConfigured?: boolean | null;
  rateLimitingEnabled?: boolean | null;
  twoFactorConfigured?: boolean | null;
}

/**
 * Build the fixed 8-item posture checklist. implemented states derive from
 * real capabilities: this engine ships encryption-at-rest, decrypt-on-
 * request-only, audit-logging and rate-limiting (default true); rotation/
 * expiration tracking, IP allowlisting and two-factor default false until
 * configured (env/DB layers flip them). Frozen output.
 */
export function buildVaultChecklist(capabilities?: VaultCapabilities | null): ReadonlyArray<VaultChecklistItem> {
  const cap = capabilities && typeof capabilities === "object" ? capabilities : {};
  const items: Array<VaultChecklistItem & Record<string, unknown>> = [
    {
      id: "encryption-at-rest",
      label: "Envelope encryption at rest",
      description: "Secrets are sealed with AES-256-GCM inside cosv1 envelopes before storage.",
      implemented: boolOr(cap.encryptionAtRest, true),
    },
    {
      id: "decrypt-on-request-only",
      label: "Decrypt on request only",
      description: "Raw secrets are only unwrapped inside the vault process when a request needs them.",
      implemented: boolOr(cap.decryptOnRequestOnly, true),
    },
    {
      id: "audit-logging",
      label: "Audit hash-chain logging",
      description: "Vault access is recorded on a SHA-256 append-only audit chain.",
      implemented: boolOr(cap.auditLogging, true),
    },
    {
      id: "credential-rotation",
      label: "Credential rotation",
      description: "Stored credentials track rotation timestamps so stale secrets surface early.",
      implemented: boolOr(cap.rotationTracking, false),
    },
    {
      id: "credential-expiration",
      label: "Credential expiration",
      description: "Credentials carry expiry metadata and are flagged when overdue.",
      implemented: boolOr(cap.expirationTracking, false),
    },
    {
      id: "ip-allowlisting",
      label: "IP allowlisting",
      description: "Vault access is restricted to an explicit client IP allowlist.",
      implemented: boolOr(cap.ipAllowlistConfigured, false),
    },
    {
      id: "rate-limiting",
      label: "Rate limiting",
      description: "Vault requests pass a sliding-window rate limiter (default 30/min).",
      implemented: boolOr(cap.rateLimitingEnabled, true),
    },
    {
      id: "two-factor",
      label: "Two-factor unlock",
      description: "Write, rotate and delete operations require a second factor.",
      implemented: boolOr(cap.twoFactorConfigured, false),
    },
  ];
  return Object.freeze(items.map((item) => Object.freeze(item)));
}

/* ------------------------------------------------------------------ */
/* Self-test (injectable clock + random source)                        */
/* ------------------------------------------------------------------ */

export interface VaultSelfTestCheck {
  id: string;
  label: string;
  passed: boolean;
  detail?: string;
}

export interface VaultSelfTestResult {
  ok: boolean;
  ranAt: string;
  checks: ReadonlyArray<VaultSelfTestCheck>;
}

export const EMPTY_VAULT_SELF_TEST: Readonly<VaultSelfTestResult> = Object.freeze({
  ok: false,
  ranAt: "",
  checks: Object.freeze([]),
});

export interface VaultSelfTestDeps {
  /** Explicit master key material (falls back to env). */
  keyMaterial?: string | null;
  /** Injectable clock. */
  now?: VaultClockInput;
  /** Injectable random source (default crypto.randomBytes). */
  random?: VaultRandomSource;
}

/**
 * Live integrity probe of the vault engine: master-key presence, real
 * encrypt→decrypt roundtrip, ciphertext tamper detection, wrong-key
 * rejection, audit-chain append+verify and scrypt KDF determinism. With a
 * configured key every check passes; without one the crypto checks still
 * run against an ephemeral in-memory key (never persisted) and the
 * master-key check fails gracefully — ok:false, structured output, never
 * a throw.
 */
export function runVaultSelfTest(deps?: VaultSelfTestDeps): VaultSelfTestResult {
  const ranAt = toVaultIso(deps?.now);
  const random = typeof deps?.random === "function" ? deps.random : randomBytes;
  const checks: VaultSelfTestCheck[] = [];
  const push = (id: string, label: string, passed: boolean, detail?: string) => {
    checks.push(detail ? { id, label, passed, detail } : { id, label, passed });
  };

  // 1) Master key configured?
  const configured = isVaultKeyConfigured(deps?.keyMaterial ?? null);
  const keyMaterial =
    typeof deps?.keyMaterial === "string" && deps.keyMaterial.length > 0
      ? deps.keyMaterial
      : readKeyMaterial(null) ?? random(32).toString("hex");
  push(
    "master-key-configured",
    "Master key material configured",
    configured,
    configured
      ? `Key source: ${resolveVaultKeySource(deps?.keyMaterial ?? null)}`
      : "No CREDENTIAL_VAULT_KEY/VAULT_MASTER_KEY set — probes ran with an ephemeral in-memory key"
  );

  // 2) Real roundtrip.
  const roundtrip = encryptCredential("vault-self-test-secret", keyMaterial, {
    id: "selftest-credential",
    now: deps?.now,
    random,
  });
  const decrypted = roundtrip.ok
    ? decryptCredential(roundtrip.envelope, keyMaterial)
    : { ok: false as const, code: "MALFORMED" as const, reason: "encryption failed" };
  const roundtripPassed =
    roundtrip.ok && decrypted.ok && decrypted.plainText === "vault-self-test-secret";
  push(
    "envelope-roundtrip",
    "AES-256-GCM envelope roundtrip",
    roundtripPassed,
    roundtripPassed ? `Envelope version ${CREDENTIAL_VAULT_ENVELOPE_VERSION}` : "Roundtrip did not restore the plaintext"
  );

  // 3) Tamper detection — flip one byte inside the ciphertext.
  let tamperPassed = false;
  if (roundtrip.ok) {
    try {
      const payload = JSON.parse(Buffer.from(roundtrip.envelope, "base64").toString("utf8")) as Record<string, string>;
      const ctBytes = Buffer.from(payload.ct, "base64");
      if (ctBytes.length > 0) {
        ctBytes[0] = ctBytes[0] ^ 0x01;
        payload.ct = ctBytes.toString("base64");
        const tamperedEnvelope = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
        const tampered = decryptCredential(tamperedEnvelope, keyMaterial);
        tamperPassed = !tampered.ok && tampered.code === "TAMPERED";
      }
    } catch {
      tamperPassed = false;
    }
  }
  push("tamper-detection", "Ciphertext tamper detection", tamperPassed, tamperPassed ? "Flipped ciphertext byte rejected as TAMPERED" : "Tampered envelope was not rejected");

  // 4) Wrong-key rejection.
  const wrongKey = roundtrip.ok
    ? decryptCredential(roundtrip.envelope, `${keyMaterial}#wrong`)
    : { ok: false as const, code: "MALFORMED" as const, reason: "encryption failed" };
  const wrongKeyPassed = !wrongKey.ok && wrongKey.code === "WRONG_KEY";
  push("wrong-key-rejection", "Wrong-key rejection", wrongKeyPassed, wrongKeyPassed ? "Alternate key rejected as WRONG_KEY" : "Alternate key was not rejected");

  // 5) Audit chain append + verify.
  const first = appendAuditEntry(VAULT_AUDIT_GENESIS_HASH, {
    id: "selftest-audit-1",
    seq: 1,
    action: "vault.selftest",
    credentialRef: "selftest",
    outcome: "success",
    now: deps?.now,
  });
  const second = appendAuditEntry(first.hash, {
    id: "selftest-audit-2",
    seq: 2,
    action: "vault.selftest",
    credentialRef: "selftest",
    outcome: "success",
    now: deps?.now,
  });
  const chainVerdict = verifyAuditChain([first.record, second.record]);
  const chainPassed = chainVerdict.verified && chainVerdict.entriesChecked === 2;
  push("audit-chain-integrity", "Audit hash-chain append + verify", chainPassed, chainPassed ? "2-entry chain verified" : "Chain verification reported anomalies");

  // 6) KDF determinism (same salt + key -> same subkey).
  if (roundtrip.ok) {
    const salt = JSON.parse(Buffer.from(roundtrip.envelope, "base64").toString("utf8")).salt as string;
    const k1 = deriveCredentialKey(keyMaterial, salt);
    const k2 = deriveCredentialKey(keyMaterial, salt);
    const kdfPassed = !!k1 && !!k2 && k1.length === 32 && timingSafeEqual(k1, k2);
    push("kdf-derivation", "scrypt KDF determinism", kdfPassed, kdfPassed ? "Same salt+key derived identical 32-byte subkeys" : "KDF output was not deterministic");
  } else {
    push("kdf-derivation", "scrypt KDF determinism", false, "Skipped — roundtrip envelope unavailable");
  }

  const ok = checks.every((check) => check.passed);
  return { ok, ranAt, checks: Object.freeze(checks) };
}
