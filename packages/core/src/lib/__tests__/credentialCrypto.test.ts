import { describe, it, expect, vi, afterEach } from "vitest";
import {
  CREDENTIAL_VAULT_ALGORITHM,
  CREDENTIAL_VAULT_ENVELOPE_VERSION,
  CREDENTIAL_VAULT_KDF,
  CREDENTIAL_VAULT_POLICY_VERSION,
  VAULT_AUDIT_GENESIS_HASH,
  VAULT_CHECKLIST_IDS,
  appendAuditEntry,
  buildVaultChecklist,
  checkRateLimit,
  decryptCredential,
  deriveCredentialKey,
  encryptCredential,
  evaluatePolicy,
  isVaultKeyConfigured,
  resolveVaultKeySource,
  runVaultSelfTest,
  verifyAuditChain,
} from "../security/credentialCrypto";

/**
 * Credential Vault engine (lib/security/credentialCrypto.ts) — unit tests.
 * Covers the P0 security block: cosv1 envelope roundtrip, tamper + wrong-key
 * rejection, AAD binding, KDF determinism, audit hash-chain integrity
 * (entry + link tampering), sliding-window rate limiting with an injected
 * clock, the cvp1 policy matrix, the fixed 8-item checklist and the
 * injectable self-test. All probes use deterministic injected clocks/random
 * sources where determinism matters; malformed-input never-throws is
 * asserted by fuzzing every public entry point.
 */

const KEY = "unit-test-master-key-material";
const KEY_ALT = "a-completely-different-master-key";
const FIXED_NOW = new Date("2026-08-22T09:30:00.000Z");

/** Queue-based random source: returns queued buffers, then zero-filled. */
function queueRandom(buffers: Buffer[]) {
  const queue = [...buffers];
  return (n: number) => queue.shift() ?? Buffer.alloc(n);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("cosv1 envelope format", () => {
  it("produces a base64 envelope with version, kdf and createdAt fields", () => {
    const result = encryptCredential("s3cret", KEY, { id: "cred-1", now: FIXED_NOW });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const payload = JSON.parse(Buffer.from(result.envelope, "base64").toString("utf8"));
    expect(payload.v).toBe(CREDENTIAL_VAULT_ENVELOPE_VERSION);
    expect(payload.v).toBe("cosv1");
    expect(payload.kdf).toBe(CREDENTIAL_VAULT_KDF);
    expect(payload.createdAt).toBe(FIXED_NOW.toISOString());
    expect(payload.id).toBe("cred-1");
    for (const field of ["salt", "iv", "tag", "ct", "kh"]) {
      expect(typeof payload[field], `field ${field}`).toBe("string");
      expect(payload[field].length).toBeGreaterThan(0);
    }
  });

  it("roundtrips plaintext through encrypt -> decrypt", () => {
    const secret = "hunter2-with-üñíçødé-and-quotes\"'";
    const sealed = encryptCredential(secret, KEY, { id: "cred-42", now: FIXED_NOW });
    expect(sealed.ok).toBe(true);
    if (!sealed.ok) return;
    const opened = decryptCredential(sealed.envelope, KEY);
    expect(opened.ok).toBe(true);
    if (!opened.ok) return;
    expect(opened.plainText).toBe(secret);
    expect(opened.credentialId).toBe("cred-42");
  });

  it("is byte-deterministic given an injected random source and clock", () => {
    const build = () => {
      const random = queueRandom([Buffer.alloc(16, 7), Buffer.alloc(12, 9)]);
      return encryptCredential("deterministic", KEY, { id: "det-1", now: FIXED_NOW, random });
    };
    const a = build();
    const b = build();
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.envelope).toBe(b.envelope);
    expect(a.createdAt).toBe(b.createdAt);
  });

  it("binds the credential id as AAD — swapping ids breaks decryption", () => {
    const sealed = encryptCredential("aad-bound", KEY, { id: "credential-A", now: FIXED_NOW });
    expect(sealed.ok).toBe(true);
    if (!sealed.ok) return;
    const payload = JSON.parse(Buffer.from(sealed.envelope, "base64").toString("utf8"));
    payload.id = "credential-B";
    const swapped = Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
    const opened = decryptCredential(swapped, KEY);
    expect(opened.ok).toBe(false);
    if (opened.ok) return;
    expect(opened.code).toBe("TAMPERED");
  });
});

describe("tamper & wrong-key rejection", () => {
  const sealOnce = () => {
    const sealed = encryptCredential("tamper-probe", KEY, { id: "cred-t", now: FIXED_NOW });
    if (!sealed.ok) throw new Error("seal failed");
    return sealed.envelope;
  };

  function mutateField(envelope: string, field: string, mutate: (buf: Buffer) => Buffer): string {
    const payload = JSON.parse(Buffer.from(envelope, "base64").toString("utf8"));
    payload[field] = mutate(Buffer.from(payload[field], "base64")).toString("base64");
    return Buffer.from(JSON.stringify(payload), "utf8").toString("base64");
  }

  it("rejects a flipped ciphertext byte as TAMPERED", () => {
    const flipped = mutateField(sealOnce(), "ct", (ct) => {
      ct[0] = ct[0] ^ 0x01;
      return ct;
    });
    const result = decryptCredential(flipped, KEY);
    expect(result).toMatchObject({ ok: false, code: "TAMPERED" });
  });

  it("rejects a flipped IV byte as TAMPERED", () => {
    const flipped = mutateField(sealOnce(), "iv", (iv) => {
      iv[3] = iv[3] ^ 0x80;
      return iv;
    });
    expect(decryptCredential(flipped, KEY)).toMatchObject({ ok: false, code: "TAMPERED" });
  });

  it("rejects a flipped auth-tag byte as TAMPERED", () => {
    const flipped = mutateField(sealOnce(), "tag", (tag) => {
      tag[15] = tag[15] ^ 0xff;
      return tag;
    });
    expect(decryptCredential(flipped, KEY)).toMatchObject({ ok: false, code: "TAMPERED" });
  });

  it("rejects a different master key as WRONG_KEY (not TAMPERED)", () => {
    const result = decryptCredential(sealOnce(), KEY_ALT);
    expect(result).toMatchObject({ ok: false, code: "WRONG_KEY" });
  });

  it("reports MALFORMED when key material is missing", () => {
    const result = decryptCredential(sealOnce(), "");
    expect(result).toMatchObject({ ok: false, code: "MALFORMED" });
  });
});

describe("malformed input & unsupported versions (never throws)", () => {
  it.each([
    ["empty string", ""],
    ["not base64", "definitely not base64!!!"],
    ["base64 of non-JSON", Buffer.from("plain text, not json").toString("base64")],
    ["json without required fields", Buffer.from(JSON.stringify({ hello: "world" }), "utf8").toString("base64")],
    ["json array payload", Buffer.from(JSON.stringify(["v", "cosv1"]), "utf8").toString("base64")],
  ])("classifies %s as MALFORMED", (_label, envelope) => {
    const result = decryptCredential(envelope, KEY);
    expect(result).toMatchObject({ ok: false, code: "MALFORMED" });
  });

  it("classifies unknown envelope versions as UNSUPPORTED_VERSION", () => {
    const legacyPayload = {
      v: "oldv0",
      kdf: "pbkdf2",
      salt: Buffer.alloc(16, 1).toString("base64"),
      iv: Buffer.alloc(12, 2).toString("base64"),
      tag: Buffer.alloc(16, 3).toString("base64"),
      ct: "",
      createdAt: FIXED_NOW.toISOString(),
      id: "legacy",
      kh: "0".repeat(64),
    };
    const envelope = Buffer.from(JSON.stringify(legacyPayload), "utf8").toString("base64");
    const result = decryptCredential(envelope, KEY);
    expect(result).toMatchObject({ ok: false, code: "UNSUPPORTED_VERSION" });
    if (result.ok) return;
    expect(result.reason).toContain("oldv0");
  });

  it("never throws on garbage inputs to encrypt/decrypt", () => {
    const garbage: unknown[] = [null, undefined, 42, {}, [], true, Symbol("x")];
    for (const value of garbage) {
      expect(() =>
        decryptCredential(value as string, KEY)
      ).not.toThrow();
      expect(decryptCredential(value as string, KEY).ok).toBe(false);
      expect(() =>
        encryptCredential(value as string, KEY, { id: String(value) })
      ).not.toThrow();
    }
    // bad options shapes are equally safe
    expect(() => encryptCredential("x", KEY, null as never)).not.toThrow();
    expect(() => encryptCredential("x", "", { id: "" })).not.toThrow();
  });
});

describe("scrypt KDF", () => {
  it("derives identical 32-byte subkeys for the same salt+key (deterministic)", () => {
    const salt = Buffer.alloc(16, 11).toString("base64");
    const a = deriveCredentialKey(KEY, salt);
    const b = deriveCredentialKey(KEY, salt);
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect(a!.length).toBe(32);
    expect(Buffer.compare(a!, b!)).toBe(0);
  });

  it("derives different subkeys for different salts or keys", () => {
    const saltA = Buffer.alloc(16, 1).toString("base64");
    const saltB = Buffer.alloc(16, 2).toString("base64");
    const kA = deriveCredentialKey(KEY, saltA)!;
    const kB = deriveCredentialKey(KEY, saltB)!;
    const kAlt = deriveCredentialKey(KEY_ALT, saltA)!;
    expect(Buffer.compare(kA, kB)).not.toBe(0);
    expect(Buffer.compare(kA, kAlt)).not.toBe(0);
  });

  it("returns null on malformed salts/keys instead of throwing", () => {
    expect(deriveCredentialKey("", "AAAA")).toBeNull();
    expect(deriveCredentialKey(KEY, "not-base64!")).toBeNull();
    expect(deriveCredentialKey(KEY, Buffer.alloc(4).toString("base64"))).toBeNull(); // salt < 8 bytes
  });
});

describe("master key configuration", () => {
  it("prefers explicit material, then CREDENTIAL_VAULT_KEY, then VAULT_MASTER_KEY", () => {
    vi.stubEnv("CREDENTIAL_VAULT_KEY", "");
    vi.stubEnv("VAULT_MASTER_KEY", "");
    expect(isVaultKeyConfigured()).toBe(false);
    expect(resolveVaultKeySource()).toBe("unconfigured");

    vi.stubEnv("VAULT_MASTER_KEY", "fallback-material");
    expect(isVaultKeyConfigured()).toBe(true);
    expect(resolveVaultKeySource()).toBe("env:VAULT_MASTER_KEY");

    vi.stubEnv("CREDENTIAL_VAULT_KEY", "primary-material");
    expect(resolveVaultKeySource()).toBe("env:CREDENTIAL_VAULT_KEY");
    expect(resolveVaultKeySource("explicit-material")).toBe("explicit");
  });

  it("treats empty-string env values as unconfigured and never echoes values", () => {
    vi.stubEnv("CREDENTIAL_VAULT_KEY", "   ");
    expect(isVaultKeyConfigured()).toBe(true); // non-empty whitespace still counts as set
    const source = resolveVaultKeySource();
    expect(source).toBe("env:CREDENTIAL_VAULT_KEY");
    expect(JSON.stringify(source)).not.toContain("   ");
  });
});

describe("audit hash chain", () => {
  const buildChain = (length: number) => {
    const records: ReturnType<typeof appendAuditEntry>["record"][] = [];
    let head = VAULT_AUDIT_GENESIS_HASH;
    for (let i = 1; i <= length; i += 1) {
      const appended = appendAuditEntry(head, {
        id: `entry-${i}`,
        seq: i,
        clientId: i === 2 ? 7 : null,
        action: "vault.read",
        credentialRef: `cred-${i}`,
        outcome: "success",
        now: new Date(FIXED_NOW.getTime() + i * 1000),
      });
      head = appended.hash;
      records.push(appended.record);
    }
    return records;
  };

  it("appends linked entries whose hash covers contents + prevHead", () => {
    const first = appendAuditEntry(VAULT_AUDIT_GENESIS_HASH, {
      id: "e1",
      seq: 1,
      action: "vault.write",
      credentialRef: "cred-9",
      outcome: "success",
      now: FIXED_NOW,
    });
    expect(first).toMatchObject({ seq: 1, at: FIXED_NOW.toISOString() });
    expect(first.record.prevHead).toBe(VAULT_AUDIT_GENESIS_HASH);
    expect(first.hash).toMatch(/^[0-9a-f]{64}$/);

    const second = appendAuditEntry(first.hash, {
      id: "e2",
      seq: 2,
      clientId: 5,
      action: "vault.rotate",
      credentialRef: "cred-9",
      outcome: "failure",
      now: FIXED_NOW,
    });
    expect(second.record.prevHead).toBe(first.hash);
    expect(second.record.clientId).toBe("5");

    // changing any covered field changes the hash (deterministically)
    const mutated = appendAuditEntry(first.hash, {
      id: "e2",
      seq: 2,
      clientId: 5,
      action: "vault.rotate",
      credentialRef: "cred-9",
      outcome: "success",
      now: FIXED_NOW,
    });
    expect(mutated.hash).not.toBe(second.hash);
  });

  it("verifies an intact chain end-to-end", () => {
    const records = buildChain(5);
    const verdict = verifyAuditChain(records);
    expect(verdict.verified).toBe(true);
    expect(verdict.anomalies).toBe(0);
    expect(verdict.entriesChecked).toBe(5);
    expect(verdict.chainHead).toBe(records[records.length - 1].hash);
    expect(verdict.lastEntryAt).toBe(records[records.length - 1].at);
  });

  it("detects tampered entry contents (outcome rewritten after the fact)", () => {
    const records = buildChain(3).map((r) => ({ ...r }));
    records[1].outcome = "failure"; // rewrite history
    const verdict = verifyAuditChain(records);
    expect(verdict.verified).toBe(false);
    expect(verdict.anomalies).toBeGreaterThan(0);
    expect(verdict.details.some((d) => d.kind === "hash")).toBe(true);
  });

  it("detects tampered links (prevHead severed from the chain)", () => {
    const records = buildChain(3).map((r) => ({ ...r }));
    records[2].prevHead = "f".repeat(64);
    const verdict = verifyAuditChain(records);
    expect(verdict.verified).toBe(false);
    expect(verdict.details.some((d) => d.kind === "link" && d.index === 2)).toBe(true);
  });

  it("detects sequence gaps and malformed entries", () => {
    const gapped = buildChain(3).filter((_, i) => i !== 1); // seq 1, 3
    const gapVerdict = verifyAuditChain(gapped);
    expect(gapVerdict.verified).toBe(false);
    expect(gapVerdict.details.some((d) => d.kind === "sequence")).toBe(true);

    const broken = [{ nope: true }, ...buildChain(2)];
    const malformedVerdict = verifyAuditChain(broken);
    expect(malformedVerdict.verified).toBe(false);
    expect(malformedVerdict.details[0].kind).toBe("malformed");
  });

  it("honours the limit parameter deterministically", () => {
    const records = buildChain(4);
    expect(verifyAuditChain(records, 2)).toMatchObject({ verified: true, entriesChecked: 2, anomalies: 0 });
    expect(verifyAuditChain(records, 99)).toMatchObject({ entriesChecked: 4 });
    expect(verifyAuditChain(records, 0)).toMatchObject({ entriesChecked: 0, anomalies: 0 });
    expect(verifyAuditChain(records, null)).toMatchObject({ entriesChecked: 4 });
    // limit truncates the walk but keeps chain order (oldest first)
    const limited = verifyAuditChain(records, 1);
    expect(limited.chainHead).toBe(records[0].hash);
  });

  it("handles empty/malformed chains safely", () => {
    expect(verifyAuditChain([])).toMatchObject({ verified: true, entriesChecked: 0, chainHead: null, lastEntryAt: null });
    expect(verifyAuditChain(null)).toMatchObject({ verified: false, entriesChecked: 0 });
    expect(verifyAuditChain("nope")).toMatchObject({ verified: false, entriesChecked: 0 });
  });
});

describe("sliding-window rate limiter", () => {
  const T0 = 1_700_000_000_000;

  it("allows up to the limit then flags limited with correct remaining", () => {
    let state = { hits: [] as number[] };
    for (let i = 1; i <= 5; i += 1) {
      const decision = checkRateLimit(state, { limitPerMinute: 5, now: T0 });
      expect(decision.limited).toBe(false);
      expect(decision.remaining).toBe(5 - i);
      state = { hits: [...decision.nextState.hits] };
    }
    const sixth = checkRateLimit(state, { limitPerMinute: 5, now: T0 + 1 });
    expect(sixth.limited).toBe(true);
    expect(sixth.remaining).toBe(0);
  });

  it("computes resetAt from the oldest hit in the window", () => {
    const state = { hits: [T0 - 10_000, T0 - 5_000] };
    const decision = checkRateLimit(state, { limitPerMinute: 1, now: T0 });
    expect(decision.limited).toBe(true);
    expect(decision.resetAt).toBe(new Date(T0 - 10_000 + 60_000).toISOString());
  });

  it("expires the window — capacity recovers once hits age out", () => {
    let state = { hits: [] as number[] };
    for (let i = 0; i < 3; i += 1) {
      state = { hits: [...checkRateLimit(state, { limitPerMinute: 3, now: T0 }).nextState.hits] };
    }
    expect(checkRateLimit(state, { limitPerMinute: 3, now: T0 + 1000 }).limited).toBe(true);
    // all three hits recorded at T0 leave the window after T0 + 60s
    const later = checkRateLimit(state, { limitPerMinute: 3, now: T0 + 60_001 });
    expect(later.limited).toBe(false);
    // capacity recovers; this fresh attempt consumes one of the three slots
    expect(later.remaining).toBe(2);
    expect(later.nextState.hits).toEqual([T0 + 60_001]);
  });

  it("is pure — the input state is never mutated", () => {
    const state = Object.freeze({ hits: Object.freeze([T0]) });
    const decision = checkRateLimit(state, { limitPerMinute: 2, now: T0 + 1 });
    expect(state.hits).toEqual([T0]);
    expect(decision.nextState.hits).toEqual([T0, T0 + 1]);
  });

  it("falls back to defaults and empty state on malformed input", () => {
    const decision = checkRateLimit(null, { now: T0 });
    expect(decision.limitPerMinute).toBe(30);
    // the accepted attempt itself consumes one slot of the default budget
    expect(decision.remaining).toBe(29);
    expect(decision.resetAt).toBe(new Date(T0 + 60_000).toISOString());
    expect(checkRateLimit({ hits: "nope" }, { limitPerMinute: 0, now: T0 }).limitPerMinute).toBe(30);
    expect(checkRateLimit({ hits: [NaN, "x", T0] }, { now: T0, limitPerMinute: 1 }).nextState.hits).toEqual([T0]);
  });
});

describe("cvp1 policy matrix", () => {
  it("always allows read regardless of 2FA", () => {
    expect(evaluatePolicy("read", {})).toMatchObject({
      allowed: true,
      requiresTwoFactor: false,
      policyVersion: CREDENTIAL_VAULT_POLICY_VERSION,
    });
    expect(evaluatePolicy("read", { twoFactorConfigured: true })).toMatchObject({ allowed: true });
  });

  it("gates write/rotate behind configured two-factor", () => {
    for (const action of ["write", "rotate"] as const) {
      expect(evaluatePolicy(action, { twoFactorConfigured: false })).toMatchObject({
        allowed: true,
        requiresTwoFactor: false,
      });
      const gated = evaluatePolicy(action, { twoFactorConfigured: true });
      expect(gated.allowed).toBe(false);
      expect(gated.requiresTwoFactor).toBe(true);
      expect(gated.reason.toLowerCase()).toContain("two-factor");
      // satisfied second factor unlocks the operation
      expect(
        evaluatePolicy(action, { twoFactorConfigured: true, twoFactorSatisfied: true }).allowed
      ).toBe(true);
    }
  });

  it("requires explicit confirmation for delete in addition to 2FA gating", () => {
    expect(evaluatePolicy("delete", { confirmed: true })).toMatchObject({ allowed: true });
    const unconfirmed = evaluatePolicy("delete", {});
    expect(unconfirmed.allowed).toBe(false);
    expect(unconfirmed.reason.toLowerCase()).toContain("confirmation");

    const bothGates = evaluatePolicy("delete", { twoFactorConfigured: true });
    expect(bothGates).toMatchObject({ allowed: false, requiresTwoFactor: true });

    const satisfiedAndConfirmed = evaluatePolicy("delete", {
      twoFactorConfigured: true,
      twoFactorSatisfied: true,
      confirmed: true,
    });
    expect(satisfiedAndConfirmed.allowed).toBe(true);
  });

  it("denies unknown or malformed actions", () => {
    for (const action of ["purge", "", "READ", 42, null, undefined, {}, ["read"]]) {
      const decision = evaluatePolicy(action as never);
      expect(decision.allowed, `action ${String(action)}`).toBe(false);
      expect(decision.policyVersion).toBe(CREDENTIAL_VAULT_POLICY_VERSION);
    }
  });

  it("denies callers known to be off the IP allowlist", () => {
    expect(
      evaluatePolicy("read", { ipAllowlisted: false, clientIp: "203.0.113.9" })
    ).toMatchObject({ allowed: false });
    // unknown allowlist state does not affect the verdict
    expect(evaluatePolicy("read", { clientIp: "203.0.113.9" }).allowed).toBe(true);
    expect(evaluatePolicy("read", { ipAllowlisted: true, clientIp: "198.51.100.4" }).allowed).toBe(true);
  });
});

describe("posture checklist", () => {
  it("returns exactly 8 items with stable ids in stable order", () => {
    const checklist = buildVaultChecklist({});
    expect(checklist).toHaveLength(8);
    expect(checklist.map((item) => item.id)).toEqual([...VAULT_CHECKLIST_IDS]);
    expect(checklist.map((item) => item.id)).toEqual([
      "encryption-at-rest",
      "decrypt-on-request-only",
      "audit-logging",
      "credential-rotation",
      "credential-expiration",
      "ip-allowlisting",
      "rate-limiting",
      "two-factor",
    ]);
    for (const item of checklist) {
      expect(typeof item.label).toBe("string");
      expect(item.label.length).toBeGreaterThan(0);
      expect(typeof item.implemented).toBe("boolean");
    }
  });

  it("derives implemented states from real capabilities", () => {
    const defaults = buildVaultChecklist({});
    const byId = Object.fromEntries(defaults.map((i) => [i.id, i.implemented]));
    // engine-shipped controls default implemented:true
    expect(byId).toEqual({
      "encryption-at-rest": true,
      "decrypt-on-request-only": true,
      "audit-logging": true,
      "credential-rotation": false,
      "credential-expiration": false,
      "ip-allowlisting": false,
      "rate-limiting": true,
      "two-factor": false,
    });
    // configuration flips the pending ones
    const configured = buildVaultChecklist({
      rotationTracking: true,
      expirationTracking: true,
      ipAllowlistConfigured: true,
      twoFactorConfigured: true,
    });
    expect(configured.every((item) => item.implemented)).toBe(true);
  });

  it("returns frozen items and tolerates malformed capability objects", () => {
    const checklist = buildVaultChecklist(null as never);
    expect(Object.isFrozen(checklist)).toBe(true);
    for (const item of checklist) expect(Object.isFrozen(item)).toBe(true);
    expect(buildVaultChecklist("garbage" as never)).toHaveLength(8);
    expect(buildVaultChecklist(undefined)).toHaveLength(8);
  });
});

describe("self-test", () => {
  it("passes every probe with configured key material", () => {
    const result = runVaultSelfTest({
      keyMaterial: KEY,
      now: FIXED_NOW,
      random: queueRandom([]),
    });
    expect(result.ranAt).toBe(FIXED_NOW.toISOString());
    expect(result.checks.map((c) => c.id)).toEqual([
      "master-key-configured",
      "envelope-roundtrip",
      "tamper-detection",
      "wrong-key-rejection",
      "audit-chain-integrity",
      "kdf-derivation",
    ]);
    for (const check of result.checks) {
      expect(check.passed, `${check.id}: ${check.detail ?? ""}`).toBe(true);
    }
    expect(result.ok).toBe(true);
  });

  it("degrades gracefully without configured key material (no throw)", () => {
    vi.stubEnv("CREDENTIAL_VAULT_KEY", "");
    vi.stubEnv("VAULT_MASTER_KEY", "");
    let result: ReturnType<typeof runVaultSelfTest>;
    expect(() => {
      result = runVaultSelfTest({ now: FIXED_NOW });
    }).not.toThrow();
    expect(result!.ranAt).toBe(FIXED_NOW.toISOString());
    const masterKeyCheck = result!.checks.find((c) => c.id === "master-key-configured");
    expect(masterKeyCheck?.passed).toBe(false);
    // crypto machinery itself still validates via the ephemeral key
    for (const check of result!.checks) {
      if (check.id !== "master-key-configured") {
        expect(check.passed, `${check.id} should still pass`).toBe(true);
      }
    }
    expect(result!.ok).toBe(false);
  });

  it("uses env fallback material and stays deterministic per run", () => {
    vi.stubEnv("CREDENTIAL_VAULT_KEY", KEY);
    const a = runVaultSelfTest({ now: FIXED_NOW, random: queueRandom([]) });
    const b = runVaultSelfTest({ now: FIXED_NOW, random: queueRandom([]) });
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    expect(a.ranAt).toBe(b.ranAt);
    expect(a.checks.map((c) => c.passed)).toEqual(b.checks.map((c) => c.passed));
  });
});

describe("algorithm identity constants", () => {
  it("exposes the contracted cipher/kdf/envelope identifiers", () => {
    expect(CREDENTIAL_VAULT_ALGORITHM).toBe("aes-256-gcm");
    expect(CREDENTIAL_VAULT_KDF).toBe("scrypt");
    expect(CREDENTIAL_VAULT_ENVELOPE_VERSION).toBe("cosv1");
  });
});
