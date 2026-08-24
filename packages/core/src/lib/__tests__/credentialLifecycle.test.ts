import { describe, expect, it } from "vitest";
import {
  DEFAULT_EXPIRATION_POLICIES,
  MAX_ALLOWLIST_ENTRIES,
  evaluateCredentialExpiration,
  evaluateExpirationBatch,
  buildRotationPlan,
  buildRotationSchedule,
  evaluateCredentialExpiry,
  normalizeAllowlist,
  evaluateIpAgainstAllowlist,
  parseIpAllowlist,
  isIpAllowed,
} from "../security/credentialLifecycle";

/**
 * Credential lifecycle engine (lib/security/credentialLifecycle.ts) — unit
 * tests (cycle 35, P0 security block follow-up).
 *
 * Covers: the frozen default expiration policy table, expiry/band boundaries
 * (strict `expiresAt < clock` expiry, whole-day flooring, warn-window edges),
 * missing/unparsable dates, malformed-input never-throws guarantees (with the
 * 5-reason cap), injected-clock forms (ISO string / epoch number / Date),
 * partial policy overrides, batch summaries with id-ascending determinism,
 * the rotation planner (rotatability, interval precedence item > default >
 * 30, due/overdue boundaries incl. the 1ms overshoot and daysOverdue math,
 * tracking flag) and the IPv4 allowlist parser/matcher (array + delimited
 * string forms, octet/prefix validation, fail-closed empty allowlists,
 * first-match-wins precedence).
 *
 * Every public entry point is probed with hostile inputs and must return a
 * structured "unknown"/decision value instead of throwing.
 */

const DAY_MS = 86_400_000;
const CLOCK = new Date("2026-09-01T12:00:00.000Z");

const iso = (d: Date): string => d.toISOString();
const shift = (base: Date, days: number, extraMs = 0): Date =>
  new Date(base.getTime() + days * DAY_MS + extraMs);

const evalCred = (input: unknown, opts?: unknown) =>
  evaluateCredentialExpiration(input as never, opts as never);

/**
 * Spec types `matchedRule` as string|null; the engine currently returns the
 * normalized rule object {kind, value, prefix}. Accept either representation
 * and always compare on the rule value (reported as deviation D1).
 */
const ruleValue = (matched: unknown): unknown =>
  typeof matched === "string" ? matched : (matched as { value?: unknown } | null)?.value;

const POLICY_TABLE: Record<string, { maxTtlDays: number; warnBeforeDays: number }> = {
  oauth_token: { maxTtlDays: 90, warnBeforeDays: 14 },
  access_key: { maxTtlDays: 365, warnBeforeDays: 30 },
  api_key: { maxTtlDays: 730, warnBeforeDays: 30 },
  password: { maxTtlDays: 180, warnBeforeDays: 14 },
  certificate: { maxTtlDays: 397, warnBeforeDays: 30 },
};

const cred = (id: string, classification: string, daysFromClock: number, extraMs = 0) => ({
  id,
  classification,
  expiresAt: iso(shift(CLOCK, daysFromClock, extraMs)),
});

describe("DEFAULT_EXPIRATION_POLICIES", () => {
  it("matches the contracted classification -> {maxTtlDays, warnBeforeDays} table", () => {
    for (const [classification, policy] of Object.entries(POLICY_TABLE)) {
      expect(DEFAULT_EXPIRATION_POLICIES[classification], classification).toEqual(policy);
    }
    expect(Object.keys(DEFAULT_EXPIRATION_POLICIES).sort()).toEqual(Object.keys(POLICY_TABLE).sort());
  });

  it("is frozen against mutation", () => {
    expect(Object.isFrozen(DEFAULT_EXPIRATION_POLICIES)).toBe(true);
  });

  it("keeps every warning window strictly inside its max TTL", () => {
    for (const [classification, policy] of Object.entries(POLICY_TABLE)) {
      expect(policy.warnBeforeDays, classification).toBeGreaterThan(0);
      expect(policy.maxTtlDays, classification).toBeGreaterThan(policy.warnBeforeDays);
    }
  });
});

describe("evaluateCredentialExpiration — policy lookup", () => {
  it("echoes id/classification/maxTtlDays for each known classification", () => {
    for (const [classification, policy] of Object.entries(POLICY_TABLE)) {
      const r = evalCred(cred(`id-${classification}`, classification, policy.maxTtlDays), { clock: CLOCK });
      expect(r.id).toBe(`id-${classification}`);
      expect(r.classification).toBe(classification);
      expect(r.maxTtlDays).toBe(policy.maxTtlDays);
      expect(r.status).toBe("valid"); // max TTL always sits beyond the warn window
    }
  });

  it('reports an unrecognised classification as "unknown" with no maxTtlDays', () => {
    const r = evalCred(
      { id: "odd", classification: "totem_pole", expiresAt: iso(shift(CLOCK, 30)) },
      { clock: CLOCK }
    );
    expect(r.classification).toBe("unknown");
    expect(r.maxTtlDays).toBeNull();
  });

  it("floors fractional remaining time to whole days", () => {
    const expiresAt = shift(CLOCK, 89, 12 * 60 * 60 * 1000); // 89.5 days out
    const r = evalCred({ id: "frac", classification: "certificate", expiresAt: iso(expiresAt) }, { clock: CLOCK });
    expect(r.daysRemaining).toBe(89);
    expect(Number.isInteger(r.daysRemaining)).toBe(true);
  });
});

describe("evaluateCredentialExpiration — expiry boundary", () => {
  it("treats expiresAt == clock as NOT expired (0 whole days left lands in the expiring band)", () => {
    const r = evalCred(cred("edge-eq", "oauth_token", 0), { clock: CLOCK });
    expect(r.status).toBe("expiring");
    expect(r.daysRemaining).toBe(0);
  });

  it("marks a credential expired once the clock sits 1ms past expiresAt (strict expiresAt < clock)", () => {
    const r = evalCred(cred("edge-past", "oauth_token", 0, -1), { clock: CLOCK }); // expiresAt = clock - 1ms
    expect(r.status).toBe("expired");
  });

  it("stays un-expired while expiresAt is still 1ms ahead of the clock (floors down to 0 days remaining)", () => {
    const r = evalCred(cred("edge-until", "oauth_token", 0, 1), { clock: CLOCK }); // expiresAt = clock + 1ms
    expect(r.status).toBe("expiring");
    expect(r.daysRemaining).toBe(0);
  });

  it("reports a long-expired credential without throwing", () => {
    const r = evalCred(cred("long-gone", "password", -5), { clock: CLOCK });
    expect(r.status).toBe("expired");
    expect(r.daysRemaining === null || r.daysRemaining < 0).toBe(true);
  });
});

describe("evaluateCredentialExpiration — expiring band edges", () => {
  it("classifies daysRemaining == warnBeforeDays as expiring", () => {
    expect(evalCred(cred("band-eq", "oauth_token", 14), { clock: CLOCK }).status).toBe("expiring");
  });

  it("classifies daysRemaining == warnBeforeDays + 1 as valid", () => {
    expect(evalCred(cred("band-plus", "oauth_token", 15), { clock: CLOCK }).status).toBe("valid");
  });

  it("honours each policy's own warn window (access_key warns at 30 days)", () => {
    expect(evalCred(cred("ak-eq", "access_key", 30), { clock: CLOCK }).status).toBe("expiring");
    expect(evalCred(cred("ak-plus", "access_key", 31), { clock: CLOCK }).status).toBe("valid");
  });

  it("counts sub-day remnants as 0 days remaining (expiring, not yet expired)", () => {
    const r = evalCred(
      { id: "hours", classification: "api_key", expiresAt: iso(shift(CLOCK, 0, 6 * 3600_000)) },
      { clock: CLOCK }
    );
    expect(r.status).toBe("expiring");
    expect(r.daysRemaining).toBe(0);
  });
});

describe("evaluateCredentialExpiration — missing/unparsable dates", () => {
  const CASES: unknown[] = [undefined, null, "", "not-a-date", "2026-13-45T99:99:99Z"];
  for (const expiresAt of CASES) {
    it(`yields status "unknown" for expiresAt ${String(JSON.stringify(expiresAt))}`, () => {
      const r = evalCred({ id: "u", classification: "api_key", expiresAt }, { clock: CLOCK });
      expect(r.status).toBe("unknown");
      expect(r.reasons.length).toBeGreaterThanOrEqual(1);
    });
  }

  it("leaves daysRemaining/expiresAt null when no usable expiry exists", () => {
    const r = evalCred({ id: "nodate", classification: "api_key" }, { clock: CLOCK });
    expect(r.status).toBe("unknown");
    expect(r.daysRemaining).toBeNull();
    expect(r.expiresAt).toBeNull();
  });
});

describe("evaluateCredentialExpiration — malformed inputs never throw", () => {
  const HOSTILE: unknown[] = [
    null,
    undefined,
    42,
    -7,
    "a string",
    true,
    [],
    [{}],
    {},
    { id: 1 },
    { id: null, classification: {}, expiresAt: [] },
    { id: "partial", classification: 77, expiresAt: { iso: "nope" } },
    { id: "garbage", classification: "api_key", expiresAt: "  invalid  " },
  ];

  it("returns a structured unknown verdict for every hostile input", () => {
    for (const input of HOSTILE) {
      let r: unknown;
      expect(() => {
        r = evalCred(input, { clock: CLOCK });
      }, String(JSON.stringify(input))).not.toThrow();
      expect((r as { status?: string }).status, String(JSON.stringify(input))).toBe("unknown");
    }
  });

  it("caps reasons at 5 string entries", () => {
    const worst = {
      id: {},
      classification: [],
      expiresAt: {},
      extra: "junk",
      nested: { deeper: [1, 2, 3] },
    };
    const r = evalCred(worst, { clock: CLOCK });
    expect(r.reasons.length).toBeLessThanOrEqual(5);
    for (const reason of r.reasons) expect(typeof reason).toBe("string");
  });

  it("tolerates a missing clock option without throwing", () => {
    const r = evalCred({ id: "noclock", classification: "api_key", expiresAt: "2999-01-01T00:00:00.000Z" });
    expect(["valid", "expiring", "expired", "unknown"]).toContain(r.status);
  });

  it("never throws on hostile clock options", () => {
    for (const clock of [null, undefined, "junk", {}, []]) {
      expect(() => evalCred(cred("clocked", "api_key", 60), { clock })).not.toThrow();
    }
  });
});

describe("evaluateCredentialExpiration — injectable clock forms", () => {
  const target = { id: "clk", classification: "api_key", expiresAt: iso(shift(CLOCK, 45)) };

  it("accepts an ISO string, an epoch-millis number and a Date interchangeably", () => {
    const viaIso = evalCred(target, { clock: CLOCK.toISOString() });
    const viaNum = evalCred(target, { clock: CLOCK.getTime() });
    const viaDate = evalCred(target, { clock: CLOCK });
    expect(viaIso.status).toBe("valid"); // 45 > 30 warn window
    expect(viaIso).toEqual(viaNum);
    expect(viaIso).toEqual(viaDate);
  });

  it("compares against the injected clock, not Date.now()", () => {
    // advancing the injected clock by 20 days leaves 25 days <= warn window 30
    expect(evalCred(target, { clock: shift(CLOCK, 20) }).status).toBe("expiring");
  });
});

describe("evaluateCredentialExpiration — policy overrides", () => {
  it("lets opts.policies widen the warn window into expiring", () => {
    const r = evalCred(cred("widen", "access_key", 40), {
      clock: CLOCK,
      policies: { access_key: { warnBeforeDays: 45 } },
    });
    expect(r.status).toBe("expiring"); // 40 <= overridden 45
  });

  it("lets opts.policies tighten the warn window back to valid", () => {
    const r = evalCred(cred("tighten", "oauth_token", 10), {
      clock: CLOCK,
      policies: { oauth_token: { warnBeforeDays: 5 } },
    });
    expect(r.status).toBe("valid"); // 10 > 5
  });

  it("reflects a maxTtlDays override in the verdict", () => {
    const r = evalCred(cred("ttl", "api_key", 45), {
      clock: CLOCK,
      policies: { api_key: { maxTtlDays: 60 } },
    });
    expect(r.maxTtlDays).toBe(60);
    expect(r.status).toBe("valid"); // warn window unchanged at 30
  });
});

describe("evaluateExpirationBatch", () => {
  const SAMPLE = [
    cred("z-valid", "api_key", 400),
    cred("m-expired", "api_key", -9),
    cred("b-expiring", "oauth_token", 10),
    { id: "a-unknown", classification: "password" },
  ];

  it("summarises all four statuses with exact counts", () => {
    const batch = evaluateExpirationBatch(SAMPLE as never, { clock: CLOCK });
    expect(batch.summary).toEqual({ total: 4, valid: 1, expiring: 1, expired: 1, unknown: 1 });
    expect(batch.results).toHaveLength(4);
  });

  it("sorts results by id ascending regardless of input order", () => {
    const shuffled = [...SAMPLE].reverse();
    const batch = evaluateExpirationBatch(shuffled as never, { clock: CLOCK });
    expect(batch.results.map((r: { id: string }) => r.id)).toEqual([
      "a-unknown",
      "b-expiring",
      "m-expired",
      "z-valid",
    ]);
  });

  it("is deterministic for equal inputs given shuffled arrival order", () => {
    const a = evaluateExpirationBatch([...SAMPLE] as never, { clock: CLOCK });
    const b = evaluateExpirationBatch([...SAMPLE].reverse() as never, { clock: CLOCK });
    expect(a).toEqual(b);
  });

  it("handles an empty batch and survives a hostile batch argument", () => {
    const empty = evaluateExpirationBatch([] as never, { clock: CLOCK });
    expect(empty.results).toEqual([]);
    expect(empty.summary.total).toBe(0);

    for (const hostile of [null, undefined, 42, "nope", {}]) {
      let out: unknown;
      expect(() => {
        out = evaluateExpirationBatch(hostile as never, { clock: CLOCK });
      }).not.toThrow();
      expect(Array.isArray((out as { results?: unknown }).results)).toBe(true);
    }
  });
});

describe("buildRotationPlan — rotatability & intervals", () => {
  const oauth = (id: string, rotatedDaysAgo: number, extra: Record<string, unknown> = {}) => ({
    id,
    kind: "oauth",
    refreshable: true,
    lastRotatedAt: iso(shift(CLOCK, -rotatedDaysAgo)),
    ...extra,
  });

  it("treats kind=oauth with refreshable!==false as rotatable and current before due", () => {
    const plan = buildRotationPlan([oauth("r1", 10)] as never, { clock: CLOCK });
    const item = plan.items[0];
    expect(item.rotatable).toBe(true);
    expect(item.intervalDays).toBe(30);
    expect(item.status).toBe("current");
    expect(new Date(item.dueAt).getTime()).toBe(shift(CLOCK, 20).getTime()); // -10d + 30d
    expect(plan.trackingEnabled).toBe(true);
  });

  it("marks refreshable=false as not_rotatable", () => {
    const plan = buildRotationPlan([oauth("r2", 10, { refreshable: false })] as never, { clock: CLOCK });
    expect(plan.items[0]).toMatchObject({ rotatable: false, status: "not_rotatable" });
  });

  it("only rotates oauth credentials (other kinds are not_rotatable)", () => {
    const plan = buildRotationPlan(
      [{ id: "r3", kind: "api_key", refreshable: true, lastRotatedAt: iso(shift(CLOCK, -1)) }] as never,
      { clock: CLOCK }
    );
    expect(plan.items[0]).toMatchObject({ rotatable: false, status: "not_rotatable" });
    expect(plan.trackingEnabled).toBe(false);
  });

  it("prefers item interval override over opts.defaultIntervalDays over the 30-day default", () => {
    const intervalWith = (itemOverrides: Record<string, unknown>, planOpts: Record<string, unknown> = {}) =>
      buildRotationPlan([oauth("ri", 1, itemOverrides)] as never, { clock: CLOCK, ...planOpts }).items[0]
        .intervalDays;

    expect(intervalWith({ intervalDays: 10 })).toBe(10); // item beats everything
    expect(intervalWith({}, { defaultIntervalDays: 45 })).toBe(45); // default beats 30
    expect(intervalWith({})).toBe(30); // bare default
  });

  it("flags a rotatable credential with no lastRotatedAt as due with null dueAt", () => {
    const plan = buildRotationPlan([{ id: "fresh", kind: "oauth" }] as never, { clock: CLOCK });
    const item = plan.items[0];
    expect(item.rotatable).toBe(true);
    expect(item.status).toBe("due");
    expect(item.dueAt).toBeNull();
    expect(plan.summary.due).toBeGreaterThanOrEqual(1);
  });
});

describe("buildRotationPlan — due/overdue boundaries", () => {
  const rotAt = (id: string, rotatedDaysAgo: number, extraPastMs = 0) => ({
    id,
    kind: "oauth",
    refreshable: true,
    lastRotatedAt: iso(shift(CLOCK, -rotatedDaysAgo, -extraPastMs)),
  });

  it('keeps status "due" (not overdue) when now == dueAt', () => {
    const plan = buildRotationPlan([rotAt("rb", 30)] as never, { clock: CLOCK });
    expect(plan.items[0].status).toBe("due"); // dueAt == clock, overdue needs now > dueAt
  });

  it('flips to "overdue" 1ms past dueAt', () => {
    const plan = buildRotationPlan([rotAt("ro", 30, 1)] as never, { clock: CLOCK }); // dueAt = clock - 1ms
    expect(plan.items[0].status).toBe("overdue");
  });

  it("computes whole-day daysOverdue for a clearly overdue credential", () => {
    const plan = buildRotationPlan([rotAt("rm", 33)] as never, { clock: CLOCK }); // due 3 days ago
    const item = plan.items[0];
    expect(item.status).toBe("overdue");
    expect(item.daysOverdue).toBe(3);
    expect(plan.summary.overdue).toBe(1);
  });

  it("never reports positive daysOverdue while still current", () => {
    const item = buildRotationPlan([rotAt("rc", 10)] as never, { clock: CLOCK }).items[0];
    expect(item.status).toBe("current");
    expect(item.daysOverdue === null || item.daysOverdue <= 0).toBe(true);
  });
});

describe("buildRotationPlan — summary, determinism, robustness", () => {
  const MIX = [
    { id: "d-current", kind: "oauth", refreshable: true, lastRotatedAt: iso(shift(CLOCK, -10)) },
    { id: "a-blocked", kind: "api_key", lastRotatedAt: iso(shift(CLOCK, -10)) },
    { id: "c-due", kind: "oauth", refreshable: true },
    { id: "b-overdue", kind: "oauth", refreshable: true, lastRotatedAt: iso(shift(CLOCK, -40)) },
  ];

  it("summarises totals and tracks whether rotation tracking applies", () => {
    const plan = buildRotationPlan(MIX as never, { clock: CLOCK });
    expect(plan.summary).toMatchObject({ total: 4, rotatable: 3, due: 1, overdue: 1 });
    expect(plan.trackingEnabled).toBe(true);
  });

  it("sorts items by id ascending and is deterministic under shuffling", () => {
    const a = buildRotationPlan(MIX as never, { clock: CLOCK });
    const b = buildRotationPlan([...MIX].reverse() as never, { clock: CLOCK });
    expect(b.items.map((i: { id: string }) => i.id)).toEqual([
      "a-blocked",
      "b-overdue",
      "c-due",
      "d-current",
    ]);
    expect(a).toEqual(b);
  });

  it("sets trackingEnabled=false when nothing is rotatable", () => {
    const plan = buildRotationPlan(
      [
        { id: "n1", kind: "password", lastRotatedAt: iso(shift(CLOCK, -5)) },
        { id: "n2", kind: "oauth", refreshable: false, lastRotatedAt: iso(shift(CLOCK, -5)) },
      ] as never,
      { clock: CLOCK }
    );
    expect(plan.trackingEnabled).toBe(false);
    expect(plan.summary.rotatable).toBe(0);
  });

  it("tolerates a nonsensical defaultIntervalDays without throwing", () => {
    expect(() =>
      buildRotationPlan([{ id: "x", kind: "oauth", lastRotatedAt: iso(shift(CLOCK, -1)) }] as never, {
        clock: CLOCK,
        defaultIntervalDays: -5,
      })
    ).not.toThrow();
  });

  it("never throws on hostile inputs", () => {
    for (const hostile of [null, undefined, 42, "nope", {}, [null], [undefined], [{ id: 1 }], [{ kind: "oauth" }]]) {
      let plan: unknown;
      expect(() => {
        plan = buildRotationPlan(hostile as never, { clock: CLOCK });
      }).not.toThrow();
      expect(Array.isArray((plan as { items?: unknown }).items ?? [])).toBe(true);
    }
  });
});

describe("parseIpAllowlist", () => {
  it("parses an array of exact IPs and CIDR blocks in order", () => {
    const parsed = parseIpAllowlist(["10.0.0.1", "192.168.0.0/16"]);
    expect(parsed.invalid).toEqual([]);
    expect(parsed.rules).toEqual([
      { kind: "exact", value: "10.0.0.1", prefix: null },
      { kind: "cidr", value: "192.168.0.0/16", prefix: 16 },
    ]);
  });

  it("parses newline/comma-delimited strings into the same rules", () => {
    const parsed = parseIpAllowlist("10.0.0.1\n192.168.0.0/16, 172.16.5.5\n");
    expect(parsed.invalid).toEqual([]);
    expect(parsed.rules.map((r: { value: string }) => r.value)).toEqual([
      "10.0.0.1",
      "192.168.0.0/16",
      "172.16.5.5",
    ]);
  });

  it("routes out-of-range octets and bad prefixes to the invalid bucket", () => {
    const raw = ["256.1.1.1", "1.2.3.4/33", "300.300.300.300", "nope", "1.2.3"];
    const parsed = parseIpAllowlist(raw);
    expect(parsed.rules).toEqual([]);
    expect(parsed.invalid).toEqual(raw);
  });

  it("accepts the /0 and /32 prefix edges", () => {
    const parsed = parseIpAllowlist(["0.0.0.0/0", "255.255.255.255/32"]);
    expect(parsed.invalid).toEqual([]);
    expect(parsed.rules.map((r: { prefix: number | null }) => r.prefix)).toEqual([0, 32]);
  });

  it("preserves duplicate entries in rule order", () => {
    const parsed = parseIpAllowlist(["10.0.0.1", "10.0.0.1", "10.0.0.2"]);
    expect(parsed.rules.map((r: { value: string }) => r.value)).toEqual([
      "10.0.0.1",
      "10.0.0.1",
      "10.0.0.2",
    ]);
  });

  it("never throws on hostile containers", () => {
    for (const raw of [null, undefined, 42, { rules: [] }, [["10.0.0.1"]], [42], ""]) {
      let parsed: unknown;
      expect(() => {
        parsed = parseIpAllowlist(raw as never);
      }).not.toThrow();
      expect(Array.isArray((parsed as { rules?: unknown })?.rules)).toBe(true);
      expect(Array.isArray((parsed as { invalid?: unknown })?.invalid)).toBe(true);
    }
  });
});

describe("isIpAllowed", () => {
  it("fails closed on an empty allowlist (array or string form)", () => {
    for (const empty of [[], ""]) {
      const decision = isIpAllowed("10.0.0.1", empty as never);
      expect(decision.allowed).toBe(false);
      expect(decision.matchedRule).toBeNull();
      expect(decision.reason).toBe("allowlist_empty");
    }
  });

  it("reports invalid_ip for malformed requester addresses", () => {
    for (const ip of ["not-an-ip", "10.0.0", "10.0.0.256", ""]) {
      const decision = isIpAllowed(ip, ["10.0.0.1"]);
      expect(decision.allowed, ip).toBe(false);
      expect(decision.reason, ip).toBe("invalid_ip");
    }
  });

  it("reports invalid_allowlist for malformed containers", () => {
    for (const allowlist of [null, undefined, 42, { rules: [] }]) {
      const decision = isIpAllowed("10.0.0.1", allowlist as never);
      expect(decision.allowed).toBe(false);
      expect(decision.reason).toBe("invalid_allowlist");
    }
  });

  it("allows exact matches and names the matched rule", () => {
    const decision = isIpAllowed("10.0.0.1", ["10.0.0.2", "10.0.0.1"]);
    expect(decision.allowed).toBe(true);
    expect(decision.reason).toBe("exact_match");
    expect(ruleValue(decision.matchedRule)).toBe("10.0.0.1");
  });

  it("matches CIDR ranges and rejects addresses outside them", () => {
    const inside = isIpAllowed("10.1.2.3", ["10.0.0.0/8"]);
    expect(inside.allowed).toBe(true);
    expect(inside.reason).toBe("cidr_match");

    const outside = isIpAllowed("11.0.0.1", ["10.0.0.0/8"]);
    expect(outside.allowed).toBe(false);
    expect(outside.reason).toBe("no_match");
    expect(outside.matchedRule).toBeNull();
  });

  it("wins with the FIRST matching rule in allowlist order (exact vs cidr precedence)", () => {
    const cidrFirst = isIpAllowed("10.5.5.5", ["10.0.0.0/8", "10.5.5.5"]);
    expect(ruleValue(cidrFirst.matchedRule)).toBe("10.0.0.0/8");
    const exactFirst = isIpAllowed("10.5.5.5", ["10.5.5.5", "10.0.0.0/8"]);
    expect(ruleValue(exactFirst.matchedRule)).toBe("10.5.5.5");
  });

  it("treats /0 as allow-everything and /32 as a single-host lock", () => {
    expect(isIpAllowed("203.0.113.9", ["0.0.0.0/0"]).allowed).toBe(true);
    expect(isIpAllowed("203.0.113.9", ["203.0.113.8/32"]).allowed).toBe(false);
    expect(isIpAllowed("203.0.113.8", ["203.0.113.8/32"]).allowed).toBe(true);
  });

  it("never throws on hostile ip/allowlist combinations", () => {
    for (const ip of [null, undefined, 42, {}, []]) {
      for (const allowlist of [null, undefined, 42, ["10.0.0.1"], "10.0.0.1"]) {
        expect(() => isIpAllowed(ip as never, allowlist as never)).not.toThrow();
      }
    }
  });
});

/* ==========================================================================
 * Cycle 37 — Section-A scheduling/expiry/allowlist engines (ADDITIVE
 * EXTENSION; every suite above is untouched). Four NEW pure entry points on
 * lib/security/credentialLifecycle.ts:
 *   buildRotationSchedule        per-credential rotation bands (A1)
 *   evaluateCredentialExpiry     expiry states vs a warning window (A2)
 *   normalizeAllowlist           validate/dedupe/sort/cap raw entries (A3)
 *   evaluateIpAgainstAllowlist   exact > cidr > wildcard > deny verdicts (A4)
 * Same conventions as the suites above: injectable clocks (ISO string /
 * epoch ms / Date), hostile-input never-throw sweeps and deterministic
 * ordering guarantees. The capacity test asserts against the exported
 * MAX_ALLOWLIST_ENTRIES constant instead of a hardcoded magic number.
 * ========================================================================== */

/** Rotation-schedule row last rotated `rotatedDaysAgo` days before CLOCK. */
const rotRow = (id: string, rotatedDaysAgo: number, extra: Record<string, unknown> = {}) => ({
  id,
  provider: "prov",
  lastRotatedAt: iso(new Date(CLOCK.getTime() - rotatedDaysAgo * DAY_MS)),
  ...extra,
});

/** Expiry row expiring `daysFromClock` days after CLOCK (null -> no date). */
const expRow = (id: string, daysFromClock: number | null, extra: Record<string, unknown> = {}) => ({
  id,
  provider: "prov",
  status: "active",
  ...(daysFromClock == null
    ? {}
    : { expiryAt: iso(new Date(CLOCK.getTime() + daysFromClock * DAY_MS)) }),
  ...extra,
});

describe("buildRotationSchedule — bands vs the injected clock", () => {
  it("bands 90-day-interval credentials around the clock with an inclusive warn edge", () => {
    const r = buildRotationSchedule([rotRow("fresh", 10), rotRow("edge-warn", 83), rotRow("safe", 82)], null, CLOCK);
    const byId = new Map(r.items.map((item) => [item.id, item]));
    // 90 - 10 = 80 days until due -> far beyond the 7-day warn window
    expect(byId.get("fresh")).toMatchObject({ status: "ok", daysUntil: 80, daysOverdue: 0 });
    expect(byId.get("safe")).toMatchObject({ status: "ok", daysUntil: 8 }); // warn boundary +1
    // 90 - 83 = 7 == warnWithinDays -> due-soon (inclusive upper bound)
    expect(byId.get("edge-warn")).toMatchObject({ status: "due-soon", daysUntil: 7 });
  });

  it('lands exactly on "due" when dueAt == now (daysUntil 0, zero overdue)', () => {
    const item = buildRotationSchedule([rotRow("due-edge", 90)], null, CLOCK).items[0];
    expect(item.status).toBe("due");
    expect(item.daysUntil).toBe(0);
    expect(item.daysOverdue).toBe(0);
    expect(item.dueAt).toBe(iso(CLOCK));
  });

  it("flips to overdue past dueAt and floors fractional daysOverdue", () => {
    const whole = buildRotationSchedule([rotRow("late", 93)], null, CLOCK).items[0];
    expect(whole.status).toBe("overdue"); // dueAt sits 3 whole days in the past
    expect(whole.daysOverdue).toBe(3);
    expect(whole.daysUntil).toBe(0);

    const fractional = buildRotationSchedule([rotRow("late-half", 93.5)], null, CLOCK).items[0];
    expect(fractional.status).toBe("overdue"); // dueAt sits 3.5 days in the past
    expect(fractional.daysOverdue).toBe(3); // floored, never rounded up
  });

  it("rounds future remnants UP into the due-soon band (ceil daysUntil)", () => {
    // dueAt sits 6.5 days out -> ceil(6.5) = 7 <= default warnWithinDays 7
    const item = buildRotationSchedule([rotRow("frac", 83.5)], null, CLOCK).items[0];
    expect(item.status).toBe("due-soon");
    expect(item.daysUntil).toBe(7);
  });

  it("marks credentials without a usable lastRotatedAt as never (no dueAt)", () => {
    const r = buildRotationSchedule(
      [{ id: "virgin", provider: "prov" }, rotRow("undated", 10, { lastRotatedAt: "not-a-date" })],
      null,
      CLOCK
    );
    expect(r.items).toHaveLength(2);
    for (const item of r.items) {
      expect(item.status).toBe("never");
      expect(item.lastRotatedAt).toBeNull();
      expect(item.dueAt).toBeNull();
      expect(item.daysUntil).toBeNull();
      expect(item.daysOverdue).toBeNull();
    }
    expect(r.summary.never).toBe(2);
  });

  it("accepts ISO-string and epoch-ms clocks interchangeably with a Date", () => {
    const creds = [rotRow("clocked", 86)]; // 4 days until due -> inside the warn window
    const viaDate = buildRotationSchedule(creds, null, CLOCK);
    expect(viaDate.items[0].status).toBe("due-soon");
    expect(viaDate.generatedAt).toBe(iso(CLOCK));
    expect(viaDate.policyVersion).toBe("clp1");
    expect(buildRotationSchedule([...creds], null, CLOCK.toISOString())).toEqual(viaDate);
    expect(buildRotationSchedule([...creds], null, CLOCK.getTime())).toEqual(viaDate);
  });
});

describe("buildRotationSchedule — policy resolution", () => {
  it("defaults to the 90-day interval when no policy applies", () => {
    const item = buildRotationSchedule([rotRow("plain", 10)], null, CLOCK).items[0];
    expect(item.intervalDays).toBe(90);
    expect(item.dueAt).toBe(iso(new Date(CLOCK.getTime() + 80 * DAY_MS)));
  });

  it("honours defaultIntervalDays and widens/shrinks the warn lead time", () => {
    const r = buildRotationSchedule([rotRow("lead", 65)], { defaultIntervalDays: 90, warnWithinDays: 30 }, CLOCK);
    expect(r.items[0].status).toBe("due-soon"); // 25 days left <= widened 30
    // same row under the default 7-day warn stays ok
    expect(buildRotationSchedule([rotRow("lead", 65)], null, CLOCK).items[0].status).toBe("ok");
  });

  it("falls back to defaults for malformed policy day fields and clamps ranges", () => {
    for (const badDefault of [null, undefined, "garbage", {}]) {
      const item = buildRotationSchedule([rotRow("fallback", 10)], { defaultIntervalDays: badDefault } as never, CLOCK)
        .items[0];
      expect(item.intervalDays, String(JSON.stringify(badDefault))).toBe(90);
    }
    // documented clamp behaviour: day counts land inside [1, 36500]
    expect(
      buildRotationSchedule([rotRow("clamp-low", 10)], { defaultIntervalDays: -5 }, CLOCK).items[0].intervalDays
    ).toBe(1);
    // warn windows clamp at 0 -> nothing future ever lands in due-soon
    expect(buildRotationSchedule([rotRow("warn-clamp", 10)], { warnWithinDays: -3 }, CLOCK).items[0].status).toBe("ok");
  });

  it("resolves per-credential overrides by policyKey first, then provider", () => {
    const policy = { overrides: { teamA: 45, prov: 200 } };
    const byKey = buildRotationSchedule([rotRow("keyed", 10, { policyKey: "teamA" })], policy, CLOCK).items[0];
    expect(byKey.intervalDays).toBe(45);

    const byProvider = buildRotationSchedule([rotRow("providenced", 10)], policy, CLOCK).items[0];
    expect(byProvider.intervalDays).toBe(200);

    // when both resolve, policyKey wins over provider
    const both = buildRotationSchedule([rotRow("both", 10, { policyKey: "teamA" })], policy, CLOCK).items[0];
    expect(both.intervalDays).toBe(45);
  });

  it("drops malformed override values back to the policy default", () => {
    const policy = {
      defaultIntervalDays: 60,
      overrides: { badStr: "45", badZero: 0, badNeg: -10 } as Record<string, unknown>,
    };
    for (const key of ["badStr", "badZero", "badNeg"]) {
      const item = buildRotationSchedule([rotRow(`row-${key}`, 59, { policyKey: key })], policy as never, CLOCK)
        .items[0];
      expect(item.intervalDays, key).toBe(60);
    }
  });
});

describe("buildRotationSchedule — ordering, summary & robustness", () => {
  const SEVERITY_MIX = () => [
    rotRow("m-ok", 10),
    rotRow("a-never", 0, { lastRotatedAt: null }),
    rotRow("z-overdue", 100),
    rotRow("b-due", 90),
    rotRow("c-due-soon", 85),
  ];

  it("orders by severity desc (never>overdue>due>due-soon>ok) then id asc", () => {
    const r = buildRotationSchedule(SEVERITY_MIX(), null, CLOCK);
    expect(r.items.map((item) => `${item.id}:${item.status}`)).toEqual([
      "a-never:never",
      "z-overdue:overdue",
      "b-due:due",
      "c-due-soon:due-soon",
      "m-ok:ok",
    ]);
  });

  it("summarises band counts and points nextDueAt at the earliest non-ok dueAt", () => {
    const r = buildRotationSchedule(SEVERITY_MIX(), null, CLOCK);
    expect(r.summary).toEqual({
      total: 5,
      ok: 1,
      dueSoon: 1,
      due: 1,
      overdue: 1,
      never: 1,
      nextDueAt: iso(new Date(CLOCK.getTime() - 10 * DAY_MS)), // overdue row's dueAt
    });
  });

  it("skips garbage rows and never throws on hostile containers", () => {
    const mixed = buildRotationSchedule([null, 42, "nope", [], rotRow("keeper", 10)] as never, null, CLOCK);
    expect(mixed.items).toHaveLength(1);
    expect(mixed.items[0].id).toBe("keeper");
    expect(mixed.summary.total).toBe(1);

    // NOTE: an EMPTY-OBJECT row is not treated as garbage — it degrades into
    // a structured record with unknown id/provider and status never
    // (documented engine behaviour).
    const blankRow = buildRotationSchedule([{}], null, CLOCK).items[0];
    expect(blankRow).toMatchObject({ id: "unknown", provider: "unknown", status: "never" });
    expect(blankRow.intervalDays).toBe(90);

    for (const hostile of [null, undefined, 42, "nope", true, {}, [null], [undefined]]) {
      let out: unknown;
      expect(() => {
        out = buildRotationSchedule(hostile, null, CLOCK);
      }, String(JSON.stringify(hostile))).not.toThrow();
      expect((out as { items?: unknown }).items, String(JSON.stringify(hostile))).toEqual([]);
      expect((out as { summary?: { total?: number } }).summary?.total, String(JSON.stringify(hostile))).toBe(0);
    }
  });

  it("never throws on hostile clock inputs", () => {
    for (const now of [null, undefined, "junk", {}, []]) {
      expect(() => buildRotationSchedule([rotRow("tick", 10)], null, now as never)).not.toThrow();
    }
  });

  it("is deterministic — repeated and shuffled invocations deep-equal", () => {
    const first = buildRotationSchedule(SEVERITY_MIX(), null, CLOCK);
    expect(buildRotationSchedule(SEVERITY_MIX(), null, CLOCK)).toEqual(first);
    expect(buildRotationSchedule([...SEVERITY_MIX()].reverse(), null, CLOCK)).toEqual(first);
  });
});

describe("evaluateCredentialExpiry — declared-status short-circuit", () => {
  it("marks revoked/disabled credentials inactive regardless of dates (case-insensitive)", () => {
    for (const declared of ["revoked", "REVOKED", "Disabled", " disabled "]) {
      const r = evaluateCredentialExpiry(
        [expRow("future", 400, { status: declared }), expRow("long-gone", -30, { status: declared })],
        null,
        CLOCK
      );
      expect(r.summary.inactive, declared).toBe(2);
      for (const item of r.items) {
        expect(item.status, `${item.id} vs ${declared}`).toBe("inactive");
        expect(item.declaredStatus, declared).toBe(declared.trim()); // echoed trimmed, original case
      }
    }
  });
});

describe("evaluateCredentialExpiry — expiry bands vs the injected clock", () => {
  it("reports missing/unparsable expiryAt as no-expiry with null dates", () => {
    for (const bad of [undefined, null, "", "   ", "not-a-date", "2026-13-45T99:99:99Z", {}]) {
      const item = evaluateCredentialExpiry([expRow("blank", null, { expiryAt: bad as never })], null, CLOCK)
        .items[0];
      expect(item.status, String(JSON.stringify(bad))).toBe("no-expiry");
      expect(item.expiryAt, String(JSON.stringify(bad))).toBeNull();
      expect(item.daysUntil, String(JSON.stringify(bad))).toBeNull();
    }
    expect(evaluateCredentialExpiry([expRow("blank", null)], null, CLOCK).summary.noExpiry).toBe(1);
  });

  it("treats now == expiryAt as expired (boundary inclusive)", () => {
    const item = evaluateCredentialExpiry([expRow("edge", 0)], null, CLOCK).items[0];
    expect(item.status).toBe("expired");
    expect(item.daysUntil).toBe(0);
    expect(item.expiryAt).toBe(iso(CLOCK));
  });

  it("stays un-expired 1ms ahead of the clock and lands in the expiring band", () => {
    const item = evaluateCredentialExpiry(
      [{ id: "ms", provider: "prov", status: "active", expiryAt: iso(new Date(CLOCK.getTime() + 1)) }],
      null,
      CLOCK
    ).items[0];
    expect(item.status).toBe("expiring"); // ceil(1ms / day) = 1 <= default window 30
    expect(item.daysUntil).toBe(1);
  });

  it("brackets the default 30-day warning window", () => {
    expect(evaluateCredentialExpiry([expRow("win-eq", 30)], null, CLOCK).items[0].status).toBe("expiring");
    expect(evaluateCredentialExpiry([expRow("win-plus", 31)], null, CLOCK).items[0].status).toBe("valid");
    // sub-day remnants ceil to 1 remaining day
    expect(evaluateCredentialExpiry([expRow("hours", 0.5)], null, CLOCK).items[0].status).toBe("expiring");
  });

  it("honours, falls back and clamps policy.warningWindowDays", () => {
    expect(evaluateCredentialExpiry([expRow("tight", 15)], { warningWindowDays: 10 }, CLOCK).items[0].status).toBe(
      "valid"
    );
    expect(evaluateCredentialExpiry([expRow("wide", 15)], { warningWindowDays: 20 }, CLOCK).items[0].status).toBe(
      "expiring"
    );
    // null/malformed fall back to the 30-day default
    for (const badWindow of [null, "garbage"]) {
      expect(
        evaluateCredentialExpiry([expRow("fallback", 15)], { warningWindowDays: badWindow } as never, CLOCK).items[0]
          .status,
        String(JSON.stringify(badWindow))
      ).toBe("expiring");
    }
    // negatives clamp to 0 -> only already-past expiries stay expired
    const clamped = evaluateCredentialExpiry([expRow("clamped", 0.5)], { warningWindowDays: -3 }, CLOCK).items[0];
    expect(clamped.status).toBe("valid"); // 1 remaining day > 0-day window
  });

  it("accepts ISO-string and epoch-ms clocks interchangeably with a Date", () => {
    const creds = [expRow("clk", 10)];
    const viaDate = evaluateCredentialExpiry(creds, null, CLOCK);
    expect(viaDate.items[0].status).toBe("expiring");
    expect(viaDate.generatedAt).toBe(iso(CLOCK));
    expect(viaDate.policyVersion).toBe("clp1");
    expect(evaluateCredentialExpiry([...creds], null, CLOCK.toISOString())).toEqual(viaDate);
    expect(evaluateCredentialExpiry([...creds], null, CLOCK.getTime())).toEqual(viaDate);
  });
});

describe("evaluateCredentialExpiry — summary & ordering", () => {
  const EXPIRY_MIX = () => [
    expRow("v-valid", 400),
    expRow("n-noexp", null),
    expRow("i-inact", 400, { status: "revoked" }),
    expRow("e-expired", -3),
    expRow("x-expiring", 10),
  ];

  it("sorts expired>expiring>inactive>no-expiry>valid, then id asc", () => {
    const r = evaluateCredentialExpiry(EXPIRY_MIX(), null, CLOCK);
    expect(r.items.map((item) => item.id)).toEqual(["e-expired", "x-expiring", "i-inact", "n-noexp", "v-valid"]);
  });

  it("summarises counts, soonest expiry and coverageRate", () => {
    const r = evaluateCredentialExpiry(EXPIRY_MIX(), null, CLOCK);
    expect(r.summary).toEqual({
      total: 5,
      valid: 1,
      expiring: 1,
      expired: 1,
      noExpiry: 1,
      inactive: 1,
      soonestExpiry: iso(new Date(CLOCK.getTime() - 3 * DAY_MS)), // even the expired row anchors the minimum
      coverageRate: 0.8, // 4 of 5 rows carry a parsable expiry (inactive included)
    });
  });

  it("rounds coverageRate to two decimals and yields 0 for empty batches", () => {
    const partial = evaluateCredentialExpiry([expRow("a", 10), expRow("b", 400), expRow("c", null)], null, CLOCK);
    expect(partial.summary.coverageRate).toBe(0.67); // round(2/3*100)/100
    const empty = evaluateCredentialExpiry([], null, CLOCK);
    expect(empty.summary.coverageRate).toBe(0);
    expect(empty.summary.soonestExpiry).toBeNull();
    expect(empty.items).toEqual([]);
  });

  it("skips garbage rows and never throws on hostile containers", () => {
    const mixed = evaluateCredentialExpiry([null, 42, "nope", expRow("keeper", 10)] as never, null, CLOCK);
    expect(mixed.items).toHaveLength(1);
    expect(mixed.items[0].id).toBe("keeper");

    for (const hostile of [null, undefined, 42, "nope", true, {}, [null], [undefined]]) {
      let out: unknown;
      expect(() => {
        out = evaluateCredentialExpiry(hostile, null, CLOCK);
      }).not.toThrow();
      expect((out as { items?: unknown }).items).toEqual([]);
      expect((out as { summary?: { total?: number } }).summary?.total).toBe(0);
    }
  });

  it("is deterministic — repeated and shuffled invocations deep-equal", () => {
    const first = evaluateCredentialExpiry(EXPIRY_MIX(), null, CLOCK);
    expect(evaluateCredentialExpiry(EXPIRY_MIX(), null, CLOCK)).toEqual(first);
    expect(evaluateCredentialExpiry([...EXPIRY_MIX()].reverse(), null, CLOCK)).toEqual(first);
  });
});

describe("normalizeAllowlist", () => {
  it("normalizes strings and {label,value} objects (trim + kind classification)", () => {
    const r = normalizeAllowlist([" 10.0.0.1 ", { label: " Office ", value: " 10.0.0.2 " }]);
    expect(r.invalid).toEqual([]);
    expect(r.entries).toEqual([
      { value: "10.0.0.1", label: null, kind: "exact" },
      { value: "10.0.0.2", label: "Office", kind: "exact" },
    ]);
    expect(r.accepted).toBe(2);
    expect(r.rejected).toBe(0);
    expect(r.truncated).toBe(false);
    expect(r.version).toBe("alw1");
  });

  it("classifies exact, cidr and trailing-* wildcard entries", () => {
    const r = normalizeAllowlist(["10.0.0.1", "10.0.0.0/8", "10.0.*"]);
    const byValue: Record<string, string> = {};
    for (const entry of r.entries) byValue[entry.value] = entry.kind;
    expect(byValue).toEqual({ "10.0.0.1": "exact", "10.0.0.0/8": "cidr", "10.0.*": "wildcard" });
  });

  it("routes malformed entries to invalid with indexed, stable reasons", () => {
    const RAW: unknown[] = [
      "10.0.0.1", // accepted anchor
      "*.*", // multi-star
      "10.0.*.5", // mid-string star
      "abc.*", // wildcard prefix not dotted-numeric
      "300.*", // wildcard prefix octet out of range
      "10.0.0.0/eight", // CIDR prefix non-numeric
      "10.0.0.0/33", // CIDR prefix > 32
      "300.0.0.0/8", // CIDR base not valid IPv4
      "not-an-ip", // plain value neither IPv4/CIDR/wildcard
      "", // empty
      "   ", // whitespace-only
      42, // non-string payload
    ];
    const r = normalizeAllowlist(RAW);
    expect(r.accepted).toBe(1);
    expect(r.rejected).toBe(11);
    expect(r.entries.map((entry) => entry.value)).toEqual(["10.0.0.1"]);
    expect(r.invalid.map((rejection) => [rejection.index, rejection.reason])).toEqual([
      [1, "Wildcard '*' must appear exactly once, at the end"],
      [2, "Wildcard '*' must appear exactly once, at the end"],
      [3, "Wildcard prefix must be a non-empty dotted numeric prefix like '10.0.'"],
      [4, "Wildcard prefix octet out of range"],
      [5, "CIDR prefix length must be numeric"],
      [6, "CIDR prefix length must be <= 32"],
      [7, "CIDR base address is not a valid IPv4 address"],
      [8, "Not a valid IPv4 address, CIDR or trailing-* wildcard"],
      [9, "Entry is empty"],
      [10, "Entry is empty"],
      [11, "Entry must be a string or an object with a string 'value'"],
    ]);
    expect(r.invalid[r.invalid.length - 1].value).toBeNull(); // non-string payloads report no value
  });

  it("dedupes case-insensitively, keeping the first occurrence's label", () => {
    const r = normalizeAllowlist(["10.0.0.5", " 10.0.0.5 ", { value: "10.0.0.5", label: "dupe" }]);
    expect(r.entries).toEqual([{ value: "10.0.0.5", label: null, kind: "exact" }]);
    expect(r.accepted).toBe(1);
    expect(r.truncated).toBe(false);
  });

  it("sorts accepted entries lexicographically", () => {
    const r = normalizeAllowlist(["192.168.1.1", "10.0.0.1", "172.16.0.1"]);
    expect(r.entries.map((entry) => entry.value)).toEqual(["10.0.0.1", "172.16.0.1", "192.168.1.1"]);
  });

  it(`caps capacity at MAX_ALLOWLIST_ENTRIES (${MAX_ALLOWLIST_ENTRIES}) and flags truncation`, () => {
    const genIps = (count: number) =>
      Array.from({ length: count }, (_, i) => `10.${Math.floor(i / 128)}.${i % 128}.1`);
    const oversized = normalizeAllowlist(genIps(MAX_ALLOWLIST_ENTRIES + 4));
    expect(oversized.entries).toHaveLength(MAX_ALLOWLIST_ENTRIES);
    expect(oversized.accepted).toBe(MAX_ALLOWLIST_ENTRIES);
    expect(oversized.rejected).toBe(0);
    expect(oversized.truncated).toBe(true);

    // exactly-at-capacity batches are NOT flagged
    expect(normalizeAllowlist(genIps(MAX_ALLOWLIST_ENTRIES)).truncated).toBe(false);
  });

  it("returns an empty alw1 result for hostile containers without throwing", () => {
    for (const hostile of [null, undefined, 42, "nope", true, {}]) {
      let out: unknown;
      expect(() => {
        out = normalizeAllowlist(hostile);
      }, String(JSON.stringify(hostile))).not.toThrow();
      expect(out).toMatchObject({
        entries: [],
        invalid: [],
        accepted: 0,
        rejected: 0,
        truncated: false,
        version: "alw1",
      });
    }
  });

  it("is deterministic for equal inputs", () => {
    const RAW: unknown[] = ["10.0.0.1", "10.0.0.0/8", "junk", "", { value: "10.1.*", label: "net" }];
    expect(normalizeAllowlist(RAW)).toEqual(normalizeAllowlist([...RAW]));
  });
});

describe("evaluateIpAgainstAllowlist", () => {
  it("denies malformed requester IPs with reason denied-invalid", () => {
    for (const ip of ["", "   ", "not-an-ip", "10.0.0", "10.0.0.256", "10.0.0.1.1", 42, null, undefined, {}]) {
      const decision = evaluateIpAgainstAllowlist(ip as never, ["10.0.0.1"]);
      expect(decision.allowed, String(JSON.stringify(ip))).toBe(false);
      expect(decision.matchedBy, String(JSON.stringify(ip))).toBeNull();
      expect(decision.matchedEntry, String(JSON.stringify(ip))).toBeNull();
      expect(decision.reason, String(JSON.stringify(ip))).toBe("denied-invalid");
    }
  });

  it("fails closed on empty allowlists (raw and pre-normalized forms)", () => {
    for (const empty of [[], { entries: [] }]) {
      const decision = evaluateIpAgainstAllowlist("10.0.0.1", empty as never);
      expect(decision.allowed).toBe(false);
      expect(decision.matchedBy).toBeNull();
      expect(decision.matchedEntry).toBeNull();
      expect(decision.reason).toBe("Denied: allowlist is empty");
    }
  });

  it("allows exact matches and reports the matched entry", () => {
    const decision = evaluateIpAgainstAllowlist("10.0.0.1", ["10.0.0.2", "10.0.0.1"]);
    expect(decision.allowed).toBe(true);
    expect(decision.matchedBy).toBe("exact");
    expect(decision.matchedEntry).toBe("10.0.0.1");
    expect(decision.reason).toBe("Allowed by exact allowlist match");
  });

  it("applies CIDR containment math", () => {
    const inside = evaluateIpAgainstAllowlist("10.1.2.3", ["10.0.0.0/8"]);
    expect(inside.allowed).toBe(true);
    expect(inside.matchedBy).toBe("cidr");
    expect(inside.matchedEntry).toBe("10.0.0.0/8");

    const outside = evaluateIpAgainstAllowlist("11.0.0.1", ["10.0.0.0/8"]);
    expect(outside.allowed).toBe(false);
    expect(outside.matchedBy).toBeNull();
    expect(outside.reason).toBe("Denied: no matching allowlist entry");
  });

  it("matches trailing-* wildcards on their fixed leading octets", () => {
    // SPEC intent: "10.0.*" fixes the leading octets 10.0 and must contain
    // 10.0.9.9 while excluding 10.1.0.1. The engine's wildcard matcher packs
    // the fixed prefix at the LOW end of the uint32 (one shift stage short,
    // cf. ipv4ToUint32A), so only zero-leading-octet wildcards align with the
    // spec today — reported as deviation D2 (cf. the D1 convention above)
    // for the engine owner to reconcile.
    const exclusion = evaluateIpAgainstAllowlist("10.1.0.1", ["10.0.*"]);
    expect(exclusion.allowed).toBe(false); // wrong leading octets stay excluded

    // zero-prefixed wildcards agree under both interpretations:
    const aligned = evaluateIpAgainstAllowlist("0.0.9.9", ["0.0.*"]);
    expect(aligned.allowed).toBe(true);
    expect(aligned.matchedBy).toBe("wildcard");
    expect(aligned.matchedEntry).toBe("0.0.*");
    expect(evaluateIpAgainstAllowlist("0.1.0.1", ["0.0.*"]).allowed).toBe(false);

    // cycle 37 conductor fix: fixed prefixes are now packed at the HIGH end
    // of the uint32 (mask-aligned), so non-zero leading-octet wildcards match
    // their intended address family (deviation D2 reconciled):
    const wholeFamily = evaluateIpAgainstAllowlist("10.200.1.9", ["10.*"]);
    expect(wholeFamily.allowed).toBe(true);
    expect(wholeFamily.matchedBy).toBe("wildcard");
    expect(wholeFamily.matchedEntry).toBe("10.*");
    expect(evaluateIpAgainstAllowlist("11.200.1.9", ["10.*"]).allowed).toBe(false);

    const inclusion = evaluateIpAgainstAllowlist("10.0.9.9", ["10.0.*"]);
    expect(inclusion.allowed).toBe(true);
    expect(inclusion.matchedBy).toBe("wildcard");
    expect(inclusion.matchedEntry).toBe("10.0.*");
  });

  it("wins with kind precedence (exact > cidr > wildcard) regardless of entry order", () => {
    const permutations = [
      ["10.5.5.5", "10.0.0.0/8", "10.5.5.*"],
      ["10.5.5.*", "10.0.0.0/8", "10.5.5.5"],
      ["10.0.0.0/8", "10.5.5.5", "10.5.5.*"],
    ];
    for (const order of permutations) {
      const decision = evaluateIpAgainstAllowlist("10.5.5.5", order);
      expect(decision.matchedBy, order.join(",")).toBe("exact");
      expect(decision.matchedEntry, order.join(",")).toBe("10.5.5.5");
    }
    // cidr beats wildcard when no exact entry exists
    const cidrOverWildcard = evaluateIpAgainstAllowlist("10.5.5.5", ["10.5.5.*", "10.0.0.0/8"]);
    expect(cidrOverWildcard.matchedBy).toBe("cidr");
  });

  it("accepts raw arrays containing {value} objects and pre-normalized results", () => {
    const fromObjects = evaluateIpAgainstAllowlist("10.0.0.1", [{ value: " 10.0.0.1 " }, { value: "junk" }]);
    expect(fromObjects.allowed).toBe(true);
    expect(fromObjects.matchedBy).toBe("exact");
    expect(fromObjects.matchedEntry).toBe("10.0.0.1"); // entries arrive trimmed/lowercased

    const normalized = normalizeAllowlist(["10.0.0.0/8", "bogus-entry"]);
    const fromNormalized = evaluateIpAgainstAllowlist("10.44.1.2", normalized);
    expect(fromNormalized.allowed).toBe(true);
    expect(fromNormalized.matchedBy).toBe("cidr");

    const deniedByNormalized = evaluateIpAgainstAllowlist("192.0.2.9", normalized);
    expect(deniedByNormalized.allowed).toBe(false);
    expect(deniedByNormalized.reason).toBe("Denied: no matching allowlist entry");
  });

  it("treats /32 as a single-host lock and /0 as allow-everything", () => {
    expect(evaluateIpAgainstAllowlist("203.0.113.8", ["203.0.113.8/32"]).allowed).toBe(true);
    expect(evaluateIpAgainstAllowlist("203.0.113.9", ["203.0.113.8/32"]).allowed).toBe(false);
    expect(evaluateIpAgainstAllowlist("198.51.100.77", ["0.0.0.0/0"]).allowed).toBe(true);
  });

  it("trims surrounding whitespace from the requester IP before matching", () => {
    expect(evaluateIpAgainstAllowlist("  10.0.0.1  ", ["10.0.0.1"]).allowed).toBe(true);
  });

  it("never throws on hostile ip/allowlist combinations", () => {
    for (const ip of [null, undefined, 42, {}, []]) {
      for (const allowlist of [
        null,
        undefined,
        42,
        ["10.0.0.1"],
        { entries: [{ value: "10.0.0.1" }] },
        "10.0.0.1",
      ]) {
        expect(() => evaluateIpAgainstAllowlist(ip as never, allowlist as never)).not.toThrow();
      }
    }
  });
});
