import { describe, expect, it } from "vitest";
import {
  DEFAULT_EXPIRATION_POLICIES,
  evaluateCredentialExpiration,
  evaluateExpirationBatch,
  buildRotationPlan,
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
