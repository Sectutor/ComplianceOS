/**
 * Credential Lifecycle Engine — expiration policies, OAuth rotation
 * scheduling and IP allowlist configuration (cycle 35, P0 security).
 * =====================================================================
 * Pure, deterministic, never-throws companion to
 * lib/security/credentialCrypto.ts behind the `credentialVault.*` tRPC
 * router (server/routers/credentialVault.ts). Closes the three open
 * checkboxes in plans/API-FIRST-INTEGRATION-PLAN.md (Security Checklist):
 *
 *   - Automatic credential rotation for OAuth tokens
 *     -> buildRotationPlan (schedule from lastRotatedAt + per-credential
 *        interval, refreshable gating, overdue accounting);
 *   - Credential expiration policies
 *     -> DEFAULT_EXPIRATION_POLICIES + evaluateCredentialExpiration /
 *        evaluateExpirationBatch (max-TTL + warn-window enforcement);
 *   - IP allowlisting configuration
 *     -> parseIpAllowlist / isIpAllowed (IPv4 exact + CIDR rules,
 *        fail-closed on empty or malformed allowlists).
 *
 * Hard rules (mirroring credentialCrypto.ts):
 *   - malformed input of any shape produces a structured result — this
 *     module NEVER throws (every public function is guarded);
 *   - clocks are injectable (Date | epoch-ms number | ISO string |
 *     nullish) and normalize through toVaultIso from ./credentialCrypto;
 *   - ordering is deterministic (batch results sorted by credential id
 *     ascending; allowlist matching is first-match in rule order);
 *   - no DB access, no network, no globals; node builtins only.
 */

import { toVaultIso, type VaultClockInput } from "./credentialCrypto";

/* ------------------------------------------------------------------ */
/* Shared constants & helpers                                          */
/* ------------------------------------------------------------------ */

/** One day in milliseconds. */
const DAY_MS = 86_400_000;
/** ECMA-262 maximum representable date offset from epoch (±8.64e15 ms). */
const MAX_DATE_MS = 8_640_000_000_000;

/** Maximum number of reasons retained on an expiration result. */
const MAX_REASONS = 5;

/**
 * Strict timestamp parser: accepts Date, epoch-ms number or ISO/date
 * string; returns epoch ms or null when missing/unparsable/out of the
 * ECMAScript date range. Unlike toVaultIso this NEVER falls back to the
 * current time — callers decide what "absent" means.
 */
function parseTimestampMs(value: unknown): number | null {
  let ms: number;
  if (value instanceof Date) {
    ms = value.getTime();
  } else if (typeof value === "number") {
    ms = value;
  } else if (typeof value === "string" && value.length > 0) {
    ms = Date.parse(value);
  } else {
    return null;
  }
  if (!Number.isFinite(ms) || Math.abs(ms) > MAX_DATE_MS) return null;
  return ms;
}

/** Resolve an injectable clock to epoch ms (falls back to now). */
function resolveClockMs(clock?: VaultClockInput): number {
  const parsed = parseTimestampMs(clock);
  return parsed ?? Date.now();
}

/** Extract a usable string id from an unknown record (never throws). */
function extractId(record: unknown): string {
  if (record && typeof record === "object" && !Array.isArray(record)) {
    const id = (record as Record<string, unknown>).id;
    if (typeof id === "string" && id.length > 0) return id;
  }
  return "unknown";
}

/** Stable id-ascending comparator for deterministic batch ordering. */
function compareById(a: { id: string }, b: { id: string }): number {
  if (a.id < b.id) return -1;
  if (a.id > b.id) return 1;
  return 0;
}

/* ------------------------------------------------------------------ */
/* 1) Expiration policy enforcement                                    */
/* ------------------------------------------------------------------ */

/** Credential classifications covered by default expiration policies. */
export type CredentialLifecycleClassification =
  | "oauth_token"
  | "access_key"
  | "api_key"
  | "password"
  | "certificate";

/** Per-classification expiration policy (days). */
export interface CredentialExpirationPolicy {
  /** Maximum time-to-live in days before a credential must be replaced. */
  maxTtlDays: number;
  /** Start warning this many days before the TTL runs out. */
  warnBeforeDays: number;
}

/**
 * Default expiration policies per classification (cycle 35 contract).
 * Frozen — callers pass overrides through opts, never mutation.
 */
export const DEFAULT_EXPIRATION_POLICIES: Readonly<
  Record<CredentialLifecycleClassification, CredentialExpirationPolicy>
> = Object.freeze({
  oauth_token: Object.freeze({ maxTtlDays: 90, warnBeforeDays: 14 }),
  access_key: Object.freeze({ maxTtlDays: 365, warnBeforeDays: 30 }),
  api_key: Object.freeze({ maxTtlDays: 730, warnBeforeDays: 30 }),
  password: Object.freeze({ maxTtlDays: 180, warnBeforeDays: 14 }),
  certificate: Object.freeze({ maxTtlDays: 397, warnBeforeDays: 30 }),
});

/** Expiration verdict for a single credential. */
export type CredentialExpirationStatus = "valid" | "expiring" | "expired" | "unknown";

/** Structured result of evaluateCredentialExpiration (never throws). */
export interface CredentialExpirationResult {
  id: string;
  classification: CredentialLifecycleClassification | "unknown";
  status: CredentialExpirationStatus;
  /** Whole days until expiry (negative once expired); null when unknowable. */
  daysRemaining: number | null;
  /** Effective max TTL for the classification; null when no policy applies. */
  maxTtlDays: number | null;
  /** Normalized ISO expiry timestamp; null when missing/unparsable. */
  expiresAt: string | null;
  /** Human-readable evaluation notes, capped at 5 entries. */
  reasons: string[];
}

export interface CredentialExpirationSummary {
  total: number;
  valid: number;
  expiring: number;
  expired: number;
  unknown: number;
}

export interface CredentialExpirationBatch {
  /** Sorted by id ascending (stable for duplicate ids). */
  results: CredentialExpirationResult[];
  summary: CredentialExpirationSummary;
}

/** Partial per-classification policy overrides (invalid fields ignored). */
export type CredentialExpirationPolicyOverrides = Partial<
  Record<CredentialLifecycleClassification, Partial<CredentialExpirationPolicy>>
>;

export interface CredentialExpirationOptions {
  /** Injectable clock: Date | epoch-ms | ISO string | nullish (default now). */
  clock?: VaultClockInput;
  /** Policy overrides merged over DEFAULT_EXPIRATION_POLICIES. */
  policies?: CredentialExpirationPolicyOverrides | null;
}

/** Merge policy overrides over the frozen defaults (never mutates them). */
function resolveExpirationPolicies(
  overrides?: CredentialExpirationPolicyOverrides | null
): Record<CredentialLifecycleClassification, CredentialExpirationPolicy> {
  const merged: Record<CredentialLifecycleClassification, CredentialExpirationPolicy> = {
    oauth_token: { ...DEFAULT_EXPIRATION_POLICIES.oauth_token },
    access_key: { ...DEFAULT_EXPIRATION_POLICIES.access_key },
    api_key: { ...DEFAULT_EXPIRATION_POLICIES.api_key },
    password: { ...DEFAULT_EXPIRATION_POLICIES.password },
    certificate: { ...DEFAULT_EXPIRATION_POLICIES.certificate },
  };
  if (overrides && typeof overrides === "object" && !Array.isArray(overrides)) {
    const source = overrides as Record<string, unknown>;
    for (const key of Object.keys(merged) as CredentialLifecycleClassification[]) {
      const patch = source[key];
      if (!patch || typeof patch !== "object" || Array.isArray(patch)) continue;
      const fields = patch as Record<string, unknown>;
      const ttl = fields.maxTtlDays;
      if (typeof ttl === "number" && Number.isFinite(ttl) && ttl > 0) {
        merged[key].maxTtlDays = Math.floor(ttl);
      }
      const warn = fields.warnBeforeDays;
      if (typeof warn === "number" && Number.isFinite(warn) && warn > 0) {
        merged[key].warnBeforeDays = Math.floor(warn);
      }
    }
  }
  return merged;
}

/**
 * Evaluate one credential against the expiration policies. Status rules:
 *   - expired  when expiresAt < clock;
 *   - expiring when 0 <= daysRemaining <= warnBeforeDays;
 *   - valid    otherwise;
 *   - unknown  when expiresAt is missing or unparsable.
 * Unknown classifications still get date-based evaluation (with a reason),
 * but carry maxTtlDays:null. Malformed input never throws — the worst case
 * is a structured `{status:"unknown"}` result.
 */
export function evaluateCredentialExpiration(
  input: unknown,
  opts?: CredentialExpirationOptions
): CredentialExpirationResult {
  try {
    const policies = resolveExpirationPolicies(opts?.policies);
    const clockMs = resolveClockMs(opts?.clock);
    const id = extractId(input);
    const record =
      input && typeof input === "object" && !Array.isArray(input)
        ? (input as Record<string, unknown>)
        : {};
    const reasons: string[] = [];

    // Classification (unknown values degrade gracefully, never throw).
    let classification: CredentialLifecycleClassification | "unknown" = "unknown";
    const rawClassification = record.classification;
    if (
      typeof rawClassification === "string" &&
      (rawClassification as CredentialLifecycleClassification) in policies
    ) {
      classification = rawClassification as CredentialLifecycleClassification;
    } else {
      reasons.push(
        typeof rawClassification === "string" && rawClassification.length > 0
          ? `unknown classification: ${rawClassification}`
          : "classification missing or invalid"
      );
      if (reasons.length >= MAX_REASONS) reasons.length = MAX_REASONS;
    }
    const policy = classification === "unknown" ? null : policies[classification];
    const maxTtlDays = policy ? policy.maxTtlDays : null;

    // Expiry timestamp (strict — absent/unparsable => status unknown).
    const rawExpiresAt = record.expiresAt;
    let expiryMs: number | null = null;
    if (rawExpiresAt == null || (typeof rawExpiresAt === "string" && rawExpiresAt.length === 0)) {
      reasons.push("expiresAt missing");
    } else {
      expiryMs = parseTimestampMs(rawExpiresAt);
      if (expiryMs == null) reasons.push("expiresAt unparsable");
    }

    let status: CredentialExpirationStatus = "unknown";
    let daysRemaining: number | null = null;
    if (expiryMs != null) {
      daysRemaining = Math.floor((expiryMs - clockMs) / DAY_MS);
      if (expiryMs < clockMs) {
        status = "expired";
        reasons.push("expired");
      } else if (policy && daysRemaining <= policy.warnBeforeDays) {
        // daysRemaining >= 0 is guaranteed here because expiryMs >= clockMs.
        status = "expiring";
        reasons.push(`expiring within ${policy.warnBeforeDays}d warn window`);
      } else if (!policy && daysRemaining <= 0) {
        // No policy to define a warn window: treat "today" as expiring.
        status = "expiring";
        reasons.push("expiring (no policy warn window)");
      } else {
        status = "valid";
        reasons.push("valid");
      }
    }

    return {
      id,
      classification,
      status,
      daysRemaining,
      maxTtlDays,
      expiresAt: expiryMs != null ? toVaultIso(expiryMs) : null,
      reasons: reasons.slice(0, MAX_REASONS),
    };
  } catch {
    return {
      id: "unknown",
      classification: "unknown",
      status: "unknown",
      daysRemaining: null,
      maxTtlDays: null,
      expiresAt: null,
      reasons: ["evaluation failed"],
    };
  }
}

/**
 * Evaluate a batch of credentials: every entry passes through
 * evaluateCredentialExpiration; results are sorted by id ascending and
 * summarized. Non-array input is treated as an empty batch. Never throws.
 */
export function evaluateExpirationBatch(
  inputs: unknown,
  opts?: CredentialExpirationOptions
): CredentialExpirationBatch {
  const list = Array.isArray(inputs) ? inputs : [];
  const results = list.map((entry) => evaluateCredentialExpiration(entry, opts));
  results.sort(compareById);
  const summary: CredentialExpirationSummary = {
    total: results.length,
    valid: 0,
    expiring: 0,
    expired: 0,
    unknown: 0,
  };
  for (const result of results) summary[result.status] += 1;
  return { results, summary };
}

/* ------------------------------------------------------------------ */
/* 2) OAuth rotation scheduling                                        */
/* ------------------------------------------------------------------ */

/** Rotation verdict for a single credential. */
export type CredentialRotationStatus = "current" | "due" | "overdue" | "not_rotatable";

/** One row of the rotation plan. */
export interface RotationItem {
  id: string;
  rotatable: boolean;
  /** Effective interval in days (item override or defaultIntervalDays). */
  intervalDays: number;
  /** Normalized ISO last-rotation stamp; null when missing/unparsable. */
  lastRotatedAt: string | null;
  /** Normalized ISO due stamp (= lastRotatedAt + intervalDays); null when unknown. */
  dueAt: string | null;
  status: CredentialRotationStatus;
  /** Whole days past due (0 unless status is "overdue"). */
  daysOverdue: number;
}

export interface RotationPlanSummary {
  total: number;
  rotatable: number;
  due: number;
  overdue: number;
}

export interface RotationPlan {
  /** Sorted by id ascending (stable for duplicate ids). */
  items: RotationItem[];
  summary: RotationPlanSummary;
  /** True when at least one credential participates in rotation tracking. */
  trackingEnabled: boolean;
}

export interface RotationPlanOptions {
  /** Injectable clock: Date | epoch-ms | ISO string | nullish (default now). */
  clock?: VaultClockInput;
  /** Fallback rotation interval in days when an item has none (default 30). */
  defaultIntervalDays?: number | null;
}

/** Resolve the effective rotation interval (positive finite int or default). */
function resolveIntervalDays(value: unknown, defaultIntervalDays: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.floor(value);
  }
  return defaultIntervalDays;
}

/**
 * Build the OAuth rotation plan. Rules:
 *   - rotatable = kind === "oauth" && refreshable !== false;
 *   - dueAt = lastRotatedAt + intervalDays;
 *   - missing/unparsable lastRotatedAt => status "due" with dueAt:null
 *     (the credential must be rotated to start the schedule);
 *   - now > dueAt => "overdue" (whole days past due reported);
 *   - now === dueAt exactly => "due"; otherwise "current";
 *   - non-rotatable credentials => "not_rotatable".
 * trackingEnabled is true when at least one item is rotatable. Output is
 * sorted by id ascending and never throws.
 */
export function buildRotationPlan(
  inputs: unknown,
  opts?: RotationPlanOptions
): RotationPlan {
  try {
    const defaultOpt = opts?.defaultIntervalDays;
    const defaultIntervalDays =
      typeof defaultOpt === "number" && Number.isFinite(defaultOpt) && defaultOpt > 0
        ? Math.floor(defaultOpt)
        : 30;
    const nowMs = resolveClockMs(opts?.clock);
    const list = Array.isArray(inputs) ? inputs : [];
    const items: RotationItem[] = list.map((entry) => {
      const record =
        entry && typeof entry === "object" && !Array.isArray(entry)
          ? (entry as Record<string, unknown>)
          : {};
      const id = extractId(entry);
      const rotatable = record.kind === "oauth" && record.refreshable !== false;
      const intervalDays = resolveIntervalDays(record.intervalDays, defaultIntervalDays);

      const rawLastRotated = record.lastRotatedAt;
      const lastRotatedMs =
        rawLastRotated == null ||
        (typeof rawLastRotated === "string" && rawLastRotated.length === 0)
          ? null
          : parseTimestampMs(rawLastRotated);
      const lastRotatedAt = lastRotatedMs != null ? toVaultIso(lastRotatedMs) : null;

      let dueAt: string | null = null;
      let status: CredentialRotationStatus;
      let daysOverdue = 0;
      if (!rotatable) {
        status = "not_rotatable";
      } else if (lastRotatedMs == null) {
        status = "due";
      } else {
        const dueAtMs = lastRotatedMs + intervalDays * DAY_MS;
        if (!Number.isFinite(dueAtMs) || Math.abs(dueAtMs) > MAX_DATE_MS) {
          status = "due";
        } else {
          dueAt = toVaultIso(dueAtMs);
          if (nowMs > dueAtMs) {
            status = "overdue";
            daysOverdue = Math.max(0, Math.floor((nowMs - dueAtMs) / DAY_MS));
          } else if (nowMs === dueAtMs) {
            status = "due";
          } else {
            status = "current";
          }
        }
      }

      return { id, rotatable, intervalDays, lastRotatedAt, dueAt, status, daysOverdue };
    });
    items.sort(compareById);
    const summary: RotationPlanSummary = {
      total: items.length,
      rotatable: 0,
      due: 0,
      overdue: 0,
    };
    for (const item of items) {
      if (item.rotatable) summary.rotatable += 1;
      if (item.status === "due") summary.due += 1;
      if (item.status === "overdue") summary.overdue += 1;
    }
    return { items, summary, trackingEnabled: summary.rotatable > 0 };
  } catch {
    return {
      items: [],
      summary: { total: 0, rotatable: 0, due: 0, overdue: 0 },
      trackingEnabled: false,
    };
  }
}

/* ------------------------------------------------------------------ */
/* 3) IP allowlist configuration                                       */
/* ------------------------------------------------------------------ */

/** Allowlist rule kinds: bare address ("exact") or CIDR block ("cidr"). */
export type IpAllowlistRuleKind = "exact" | "cidr";

/** One parsed allowlist rule (IPv4 only). */
export interface IpAllowlistRule {
  kind: IpAllowlistRuleKind;
  /** Original trimmed entry ("192.168.1.1" or "10.0.0.0/8"). */
  value: string;
  /** CIDR prefix length; null for exact rules. */
  prefix: number | null;
}

export interface ParsedIpAllowlist {
  /** Valid rules in input order (first-match wins during evaluation). */
  rules: IpAllowlistRule[];
  /** Entries rejected during parsing, in input order. */
  invalid: string[];
}

export type IpAllowDecisionReason =
  | "exact_match"
  | "cidr_match"
  | "allowlist_empty"
  | "no_match"
  | "invalid_ip"
  | "invalid_allowlist";

/** Fail-closed allowlist verdict. */
export interface IpAllowDecision {
  allowed: boolean;
  matchedRule: IpAllowlistRule | null;
  reason: IpAllowDecisionReason;
}

interface AllowlistParseOutcome {
  containerValid: boolean;
  rules: IpAllowlistRule[];
  invalid: string[];
}

/** Strict dotted-quad IPv4 validator -> unsigned 32-bit int (or null). */
function ipv4ToInt(value: string): number | null {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(value.trim());
  if (!match) return null;
  let out = 0;
  for (let index = 1; index <= 4; index += 1) {
    const octet = Number(match[index]);
    if (octet > 255) return null;
    out = out * 256 + octet;
  }
  return out >>> 0;
}

/** Parse a single allowlist token into a rule (or null when invalid). */
function parseAllowlistToken(token: string): IpAllowlistRule | null {
  const slashIndex = token.indexOf("/");
  if (slashIndex === -1) {
    return ipv4ToInt(token) != null
      ? { kind: "exact", value: token, prefix: null }
      : null;
  }
  const base = ipv4ToInt(token.slice(0, slashIndex));
  const prefixText = token.slice(slashIndex + 1);
  if (!/^\d+$/.test(prefixText)) return null;
  const prefix = Number(prefixText);
  if (base == null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) return null;
  return { kind: "cidr", value: token, prefix };
}

/** Internal parser retaining container validity for isIpAllowed. */
function parseAllowlistInternal(raw: unknown): AllowlistParseOutcome {
  const outcome: AllowlistParseOutcome = { containerValid: true, rules: [], invalid: [] };
  if (typeof raw === "string") {
    for (const piece of raw.split(/[\n,]+/)) {
      const token = piece.trim();
      if (token.length === 0) continue;
      const rule = parseAllowlistToken(token);
      if (rule) outcome.rules.push(rule);
      else outcome.invalid.push(token);
    }
    return outcome;
  }
  if (Array.isArray(raw)) {
    for (const entry of raw) {
      if (typeof entry === "string") {
        const token = entry.trim();
        if (token.length === 0) continue;
        const rule = parseAllowlistToken(token);
        if (rule) outcome.rules.push(rule);
        else outcome.invalid.push(token);
      } else if (entry != null) {
        outcome.invalid.push(String(entry));
      }
    }
    return outcome;
  }
  outcome.containerValid = false;
  return outcome;
}

/**
 * Parse an IP allowlist from an array of strings OR a newline/comma-
 * separated string. IPv4 only; CIDR prefixes must be integers in /0-/32.
 * Valid rules keep input order (first-match wins later); rejected entries
 * land in `invalid`. Never throws.
 */
export function parseIpAllowlist(raw: unknown): ParsedIpAllowlist {
  try {
    const outcome = parseAllowlistInternal(raw);
    return { rules: outcome.rules, invalid: outcome.invalid };
  } catch {
    return { rules: [], invalid: [] };
  }
}

/**
 * Evaluate an IP against a raw allowlist (same accepted shapes as
 * parseIpAllowlist). Semantics:
 *   - malformed ip                  => allowed:false, reason "invalid_ip";
 *   - malformed allowlist container => allowed:false, "invalid_allowlist";
 *   - empty/effectively-empty allowlist => allowed:false, fail-closed
 *     "allowlist_empty";
 *   - first matching rule wins ("exact_match" or "cidr_match");
 *   - otherwise => allowed:false, "no_match".
 * Never throws.
 */
export function isIpAllowed(ip: unknown, allowlist: unknown): IpAllowDecision {
  try {
    if (typeof ip !== "string" || ipv4ToInt(ip) == null) {
      return { allowed: false, matchedRule: null, reason: "invalid_ip" };
    }
    const outcome = parseAllowlistInternal(allowlist);
    if (!outcome.containerValid) {
      return { allowed: false, matchedRule: null, reason: "invalid_allowlist" };
    }
    if (outcome.rules.length === 0) {
      return { allowed: false, matchedRule: null, reason: "allowlist_empty" };
    }
    const ipInt = ipv4ToInt(ip as string) as number;
    for (const rule of outcome.rules) {
      if (rule.kind === "exact") {
        if ((ipv4ToInt(rule.value) as number) === ipInt) {
          return { allowed: true, matchedRule: rule, reason: "exact_match" };
        }
        continue;
      }
      const prefix = rule.prefix as number;
      const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
      const baseInt = ipv4ToInt(rule.value.split("/")[0]) as number;
      if ((baseInt & mask) === (ipInt & mask)) {
        return { allowed: true, matchedRule: rule, reason: "cidr_match" };
      }
    }
    return { allowed: false, matchedRule: null, reason: "no_match" };
  } catch {
    return { allowed: false, matchedRule: null, reason: "invalid_allowlist" };
  }
}

/* ==================================================================== */
/* SECTION A — rotation schedule bands / expiry windows / wildcard      */
/* allowlist (second cycle-35 surface; identifiers namespaced to avoid  */
/* collisions with the companion API above). Shares the same house      */
/* guarantees: pure, injectable clock, never throws on any input.       */
/* ==================================================================== */

/* ------------------------------------------------------------------ */
/* A. Constants & shared primitives                                    */
/* ------------------------------------------------------------------ */

/** Policy/result version surfaced by every Section-A payload. */
export const CREDENTIAL_LIFECYCLE_POLICY_VERSION = "clp1";

/** Fixed day length in ms — no DST/calendar arithmetic in this engine. */
export const LIFECYCLE_DAY_MS = 86_400_000;

/** Fallback rotation interval (days) when neither override nor policy. */
export const DEFAULT_ROTATION_INTERVAL_DAYS = 90;

/** Default "due soon" lead time (days) for rotation warnings. */
export const DEFAULT_ROTATION_WARN_WITHIN_DAYS = 7;

/** Default expiration warning window (days). */
export const DEFAULT_EXPIRY_WARNING_WINDOW_DAYS = 30;

/** Hard cap on Section-A allowlist size (deterministic truncation). */
export const MAX_ALLOWLIST_ENTRIES = 256;

/** Upper clamp for day-count policy inputs (~100 years). */
const MAX_POLICY_DAYS = 36_500;

/** Timestamps below this magnitude are interpreted as epoch SECONDS. */
const EPOCH_SECONDS_THRESHOLD = 100_000_000_000;

/** Injectable clock input: epoch-ms number, Date, thunk or ISO string. */
export type LifecycleClockInput =
  | number
  | Date
  | (() => number)
  | string
  | null
  | undefined;

/** Coarse credential record accepted by the Section-A evaluators. */
export interface LifecycleCredentialRecord {
  id?: string | number | null;
  provider?: string | number | null;
  policyKey?: string | number | null;
  lastRotatedAt?: string | number | Date | null;
  expiryAt?: string | number | Date | null;
  status?: string | null;
}

/** Resolve any accepted clock form to epoch ms (real clock fallback). */
function resolveLifecycleClockMs(now?: LifecycleClockInput): number {
  if (typeof now === "number" && Number.isFinite(now)) return now;
  if (typeof now === "function") {
    try {
      const value = now();
      if (typeof value === "number" && Number.isFinite(value)) return value;
    } catch {
      // fall through to the real clock
    }
  }
  if (now instanceof Date) {
    const ms = now.getTime();
    if (!Number.isNaN(ms)) return ms;
  }
  if (typeof now === "string" && now.trim().length > 0 && !Number.isNaN(Date.parse(now))) {
    return Date.parse(now);
  }
  return Date.now();
}

/** Normalize any accepted clock input to an ISO-8601 string. */
export function toLifecycleIso(now?: LifecycleClockInput): string {
  return new Date(resolveLifecycleClockMs(now)).toISOString();
}

/** Coerce unknown -> clamped integer within [min,max]; fallback otherwise. */
function intIn(value: unknown, fallback: number, min: number, max: number): number {
  const n =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim().length > 0
        ? Number(value)
        : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

/** Coerce a scalar (string/finite number) to a trimmed non-empty string. */
function scalarToString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

/** Parse a timestamp field to epoch ms; anything unusable -> null. */
function lifecycleParseTimestampMs(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const ms = Math.abs(value) < EPOCH_SECONDS_THRESHOLD ? value * 1000 : value;
    return Number.isNaN(new Date(ms).getTime()) ? null : ms;
  }
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isNaN(ms) ? null : ms;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;
    if (/^-?\d+$/.test(trimmed)) {
      const n = Number(trimmed);
      const ms = Math.abs(n) < EPOCH_SECONDS_THRESHOLD ? n * 1000 : n;
      return Number.isNaN(new Date(ms).getTime()) ? null : ms;
    }
    const parsed = Date.parse(trimmed);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* A1) Rotation scheduling                                             */
/* ------------------------------------------------------------------ */

export type LifecycleRotationBand = "ok" | "due-soon" | "due" | "overdue" | "never";

export interface RotationPolicyInput {
  defaultIntervalDays?: number | null;
  overrides?: Record<string, number> | null;
  warnWithinDays?: number | null;
}

export interface CredentialRotationRow {
  id: string;
  provider: string;
  /** Effective interval: override ?? policy default ?? 90. */
  intervalDays: number;
  lastRotatedAt: string | null;
  dueAt: string | null;
  status: LifecycleRotationBand;
  daysUntil: number | null;
  daysOverdue: number | null;
}

export interface RotationScheduleSummary {
  total: number;
  ok: number;
  dueSoon: number;
  due: number;
  overdue: number;
  never: number;
  nextDueAt: string | null;
}

export interface RotationScheduleResult {
  generatedAt: string;
  policyVersion: string;
  items: ReadonlyArray<CredentialRotationRow>;
  summary: RotationScheduleSummary;
}

export const EMPTY_ROTATION_SCHEDULE: Readonly<RotationScheduleResult> = Object.freeze({
  generatedAt: "",
  policyVersion: CREDENTIAL_LIFECYCLE_POLICY_VERSION,
  items: Object.freeze([]),
  summary: Object.freeze({
    total: 0,
    ok: 0,
    dueSoon: 0,
    due: 0,
    overdue: 0,
    never: 0,
    nextDueAt: null,
  }),
});

const LIFECYCLE_A_SEVERITY: Record<LifecycleRotationBand, number> = Object.freeze({
  never: 4,
  overdue: 3,
  due: 2,
  "due-soon": 1,
  ok: 0,
});

/** Sanitize the override table: finite positive numbers keyed by string. */
function sanitizeOverrides(overrides: unknown): Map<string, number> {
  const map = new Map<string, number>();
  if (!overrides || typeof overrides !== "object" || Array.isArray(overrides)) return map;
  for (const [key, value] of Object.entries(overrides as Record<string, unknown>)) {
    if (key.length === 0) continue;
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) continue;
    map.set(key, value);
  }
  return map;
}

/**
 * Build the per-credential rotation schedule. Bands versus `now`:
 * overdue when now > dueAt; "due" only at the exact dueAt instant
 * (0-day grace); "due-soon" when 0 < daysUntil <= warn; else "ok";
 * no lastRotatedAt -> "never". Deterministic ordering: severity desc
 * (never→overdue→due→due-soon→ok), then id asc. Garbage rows are
 * skipped; malformed policy fields fall back to defaults. Never throws.
 */
export function buildRotationSchedule(
  credentials: unknown,
  policy?: RotationPolicyInput | null,
  now?: LifecycleClockInput
): RotationScheduleResult {
  try {
    const nowMs = resolveLifecycleClockMs(now);
    const pol =
      policy && typeof policy === "object" && !Array.isArray(policy)
        ? (policy as Partial<RotationPolicyInput>)
        : {};
    const defaultIntervalDays = intIn(pol.defaultIntervalDays, DEFAULT_ROTATION_INTERVAL_DAYS, 1, MAX_POLICY_DAYS);
    const warnWithinDays = intIn(pol.warnWithinDays, DEFAULT_ROTATION_WARN_WITHIN_DAYS, 0, MAX_POLICY_DAYS);
    const overrides = sanitizeOverrides(pol.overrides);

    const rows = Array.isArray(credentials) ? credentials : [];
    const decorated: Array<{ row: CredentialRotationRow; index: number }> = [];
    let ok = 0;
    let dueSoon = 0;
    let due = 0;
    let overdue = 0;
    let never = 0;
    let nextDueMs: number | null = null;

    for (let index = 0; index < rows.length; index += 1) {
      const raw = rows[index];
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
      const rec = raw as Record<string, unknown>;
      const id = scalarToString(rec.id) ?? "unknown";
      const provider = scalarToString(rec.provider) ?? "unknown";
      const policyKey = scalarToString(rec.policyKey);
      const overrideDays =
        (policyKey != null ? overrides.get(policyKey) : undefined) ?? overrides.get(provider);
      const intervalDays =
        overrideDays != null ? intIn(overrideDays, defaultIntervalDays, 1, MAX_POLICY_DAYS) : defaultIntervalDays;
      const lastRotatedMs = lifecycleParseTimestampMs(rec.lastRotatedAt);

      if (lastRotatedMs == null) {
        never += 1;
        decorated.push({
          index,
          row: {
            id,
            provider,
            intervalDays,
            lastRotatedAt: null,
            dueAt: null,
            status: "never",
            daysUntil: null,
            daysOverdue: null,
          },
        });
        continue;
      }

      const dueMs = lastRotatedMs + intervalDays * LIFECYCLE_DAY_MS;
      const diff = dueMs - nowMs;
      let status: LifecycleRotationBand;
      let daysUntil: number;
      let daysOverdue: number;
      if (diff < 0) {
        status = "overdue";
        daysUntil = 0;
        daysOverdue = Math.floor(-diff / LIFECYCLE_DAY_MS);
      } else if (diff === 0) {
        status = "due";
        daysUntil = 0;
        daysOverdue = 0;
      } else {
        daysUntil = Math.ceil(diff / LIFECYCLE_DAY_MS);
        daysOverdue = 0;
        status = daysUntil <= warnWithinDays ? "due-soon" : "ok";
      }
      if (status === "ok") ok += 1;
      else if (status === "due-soon") dueSoon += 1;
      else if (status === "due") due += 1;
      else overdue += 1;
      if (status !== "ok") nextDueMs = nextDueMs == null ? dueMs : Math.min(nextDueMs, dueMs);

      decorated.push({
        index,
        row: {
          id,
          provider,
          intervalDays,
          lastRotatedAt: new Date(lastRotatedMs).toISOString(),
          dueAt: new Date(dueMs).toISOString(),
          status,
          daysUntil,
          daysOverdue,
        },
      });
    }

    decorated.sort((a, b) => {
      const severity = LIFECYCLE_A_SEVERITY[b.row.status] - LIFECYCLE_A_SEVERITY[a.row.status];
      if (severity !== 0) return severity;
      if (a.row.id !== b.row.id) return a.row.id < b.row.id ? -1 : 1;
      return a.index - b.index;
    });
    const items = decorated.map((entry) => entry.row);
    return Object.freeze({
      generatedAt: new Date(nowMs).toISOString(),
      policyVersion: CREDENTIAL_LIFECYCLE_POLICY_VERSION,
      items: Object.freeze(items),
      summary: Object.freeze({
        total: items.length,
        ok,
        dueSoon,
        due,
        overdue,
        never,
        nextDueAt: nextDueMs == null ? null : new Date(nextDueMs).toISOString(),
      }),
    });
  } catch {
    return { ...EMPTY_ROTATION_SCHEDULE, generatedAt: toLifecycleIso(now) };
  }
}

/* ------------------------------------------------------------------ */
/* A2) Expiration policies                                             */
/* ------------------------------------------------------------------ */

export type LifecycleExpiryState = "valid" | "expiring" | "expired" | "no-expiry" | "inactive";

export interface ExpiryPolicyInput {
  warningWindowDays?: number | null;
}

export interface CredentialExpiryItem {
  id: string;
  provider: string;
  declaredStatus: string | null;
  expiryAt: string | null;
  status: LifecycleExpiryState;
  daysUntil: number | null;
}

export interface CredentialExpirySummary {
  total: number;
  valid: number;
  expiring: number;
  expired: number;
  noExpiry: number;
  inactive: number;
  soonestExpiry: string | null;
  coverageRate: number;
}

export interface CredentialExpiryEvaluation {
  generatedAt: string;
  policyVersion: string;
  items: ReadonlyArray<CredentialExpiryItem>;
  summary: CredentialExpirySummary;
}

export const EMPTY_EXPIRY_EVALUATION: Readonly<CredentialExpiryEvaluation> = Object.freeze({
  generatedAt: "",
  policyVersion: CREDENTIAL_LIFECYCLE_POLICY_VERSION,
  items: Object.freeze([]),
  summary: Object.freeze({
    total: 0,
    valid: 0,
    expiring: 0,
    expired: 0,
    noExpiry: 0,
    inactive: 0,
    soonestExpiry: null,
    coverageRate: 0,
  }),
});

const LIFECYCLE_A_EXPIRY_SEVERITY: Record<LifecycleExpiryState, number> = Object.freeze({
  expired: 4,
  expiring: 3,
  inactive: 2,
  "no-expiry": 1,
  valid: 0,
});

const TERMINAL_CREDENTIAL_STATUSES: ReadonlyArray<string> = Object.freeze(["revoked", "disabled"]);

/**
 * Evaluate credential expiration against a warning-window policy.
 * Declared "revoked"/"disabled" (case-insensitive) -> "inactive"
 * regardless of dates; missing/unparsable expiryAt -> "no-expiry";
 * now >= expiryAt (boundary inclusive) -> "expired"; 0 < daysUntil <=
 * window -> "expiring"; otherwise "valid". Sorted expired→expiring→
 * inactive→no-expiry→valid, then id asc. Never throws.
 */
export function evaluateCredentialExpiry(
  credentials: unknown,
  policy?: ExpiryPolicyInput | null,
  now?: LifecycleClockInput
): CredentialExpiryEvaluation {
  try {
    const nowMs = resolveLifecycleClockMs(now);
    const pol =
      policy && typeof policy === "object" && !Array.isArray(policy)
        ? (policy as Partial<ExpiryPolicyInput>)
        : {};
    const warningWindowDays = intIn(pol.warningWindowDays, DEFAULT_EXPIRY_WARNING_WINDOW_DAYS, 0, MAX_POLICY_DAYS);

    const rows = Array.isArray(credentials) ? credentials : [];
    const counts: Record<LifecycleExpiryState, number> = {
      valid: 0,
      expiring: 0,
      expired: 0,
      "no-expiry": 0,
      inactive: 0,
    };
    const decorated: Array<{ item: CredentialExpiryItem; index: number }> = [];
    let soonestExpiryMs: number | null = null;
    let withExpiry = 0;

    for (let index = 0; index < rows.length; index += 1) {
      const raw = rows[index];
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) continue;
      const rec = raw as Record<string, unknown>;
      const id = scalarToString(rec.id) ?? "unknown";
      const provider = scalarToString(rec.provider) ?? "unknown";
      const declaredStatus = scalarToString(rec.status);
      const normalizedStatus = declaredStatus == null ? "" : declaredStatus.toLowerCase();
      const expiryMs = lifecycleParseTimestampMs(rec.expiryAt);

      let status: LifecycleExpiryState;
      if (TERMINAL_CREDENTIAL_STATUSES.includes(normalizedStatus)) {
        status = "inactive";
      } else if (expiryMs == null) {
        status = "no-expiry";
      } else {
        const diff = expiryMs - nowMs;
        if (diff <= 0) status = "expired";
        else status = Math.ceil(diff / LIFECYCLE_DAY_MS) <= warningWindowDays ? "expiring" : "valid";
      }

      if (expiryMs != null) {
        withExpiry += 1;
        soonestExpiryMs = soonestExpiryMs == null ? expiryMs : Math.min(soonestExpiryMs, expiryMs);
      }
      counts[status] += 1;
      decorated.push({
        index,
        item: {
          id,
          provider,
          declaredStatus,
          expiryAt: expiryMs == null ? null : new Date(expiryMs).toISOString(),
          status,
          daysUntil:
            expiryMs == null
              ? null
              : expiryMs - nowMs <= 0
                ? 0
                : Math.ceil((expiryMs - nowMs) / LIFECYCLE_DAY_MS),
        },
      });
    }

    decorated.sort((a, b) => {
      const severity = LIFECYCLE_A_EXPIRY_SEVERITY[b.item.status] - LIFECYCLE_A_EXPIRY_SEVERITY[a.item.status];
      if (severity !== 0) return severity;
      if (a.item.id !== b.item.id) return a.item.id < b.item.id ? -1 : 1;
      return a.index - b.index;
    });
    const items = decorated.map((entry) => entry.item);
    const coverageRate = items.length === 0 ? 0 : Math.round((withExpiry / items.length) * 100) / 100;
    return Object.freeze({
      generatedAt: new Date(nowMs).toISOString(),
      policyVersion: CREDENTIAL_LIFECYCLE_POLICY_VERSION,
      items: Object.freeze(items),
      summary: Object.freeze({
        total: items.length,
        valid: counts.valid,
        expiring: counts.expiring,
        expired: counts.expired,
        noExpiry: counts["no-expiry"],
        inactive: counts.inactive,
        soonestExpiry: soonestExpiryMs == null ? null : new Date(soonestExpiryMs).toISOString(),
        coverageRate,
      }),
    });
  } catch {
    return { ...EMPTY_EXPIRY_EVALUATION, generatedAt: toLifecycleIso(now) };
  }
}

/* ------------------------------------------------------------------ */
/* A3) IP allowlist normalization + precedence matching                */
/* ------------------------------------------------------------------ */

export type AllowlistEntryKind = "exact" | "cidr" | "wildcard";

export interface NormalizedAllowlistEntry {
  value: string;
  label: string | null;
  kind: AllowlistEntryKind;
}

export interface AllowlistRejection {
  index: number;
  value: string | null;
  reason: string;
}

export interface NormalizeAllowlistResult {
  entries: ReadonlyArray<NormalizedAllowlistEntry>;
  invalid: ReadonlyArray<AllowlistRejection>;
  accepted: number;
  rejected: number;
  truncated: boolean;
  version: string;
}

export type IpAllowlistMatchKind = AllowlistEntryKind;

export interface IpAllowlistDecision {
  allowed: boolean;
  matchedBy: IpAllowlistMatchKind | null;
  matchedEntry: string | null;
  reason: string;
}

export interface AllowlistEvaluateOptions {
  /** Reserved for future policy flags; accepted and ignored today. */
  now?: LifecycleClockInput;
}

export const EMPTY_NORMALIZED_ALLOWLIST: Readonly<NormalizeAllowlistResult> = Object.freeze({
  entries: Object.freeze([]),
  invalid: Object.freeze([]),
  accepted: 0,
  rejected: 0,
  truncated: false,
  version: "alw1",
});

export const EMPTY_IP_ALLOWLIST_DECISION: Readonly<IpAllowlistDecision> = Object.freeze({
  allowed: false,
  matchedBy: null,
  matchedEntry: null,
  reason: "denied-invalid",
});

/** Strict dotted-quad IPv4 -> uint32 parser (null instead of throwing). */
function ipv4ToUint32A(value: string): number | null {
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  let out = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n > 255) return null;
    out = ((out << 8) | n) >>> 0;
  }
  return out >>> 0;
}

/** Contiguous-prefix mask: 0 for p<=0, full for p>=32 (spec formula). */
function lifecycleCidrMask(prefixLength: number): number {
  if (prefixLength <= 0) return 0;
  if (prefixLength >= 32) return 0xffffffff;
  return ~((1 << (32 - prefixLength)) - 1) >>> 0;
}

interface LifecycleAClassification {
  kind: AllowlistEntryKind | null;
  error: string | null;
}

/**
 * Classify one normalized entry: trailing-"*" wildcards must sit on a
 * non-empty dotted numeric prefix ("10.0."); CIDRs need an IPv4 base
 * plus 0-32 prefix length; everything else must be strict IPv4.
 */
function classifyAllowlistValueA(value: string): LifecycleAClassification {
  if (value.includes("*")) {
    const starCount = (value.match(/\*/g) ?? []).length;
    if (starCount !== 1 || !value.endsWith("*")) {
      return { kind: null, error: "Wildcard '*' must appear exactly once, at the end" };
    }
    const prefix = value.slice(0, -1);
    if (!/^\d{1,3}(\.\d{1,3})*\.$/.test(prefix)) {
      return { kind: null, error: "Wildcard prefix must be a non-empty dotted numeric prefix like '10.0.'" };
    }
    for (const octet of prefix.split(".")) {
      if (octet.length > 0 && Number(octet) > 255) {
        return { kind: null, error: "Wildcard prefix octet out of range" };
      }
    }
    return { kind: "wildcard", error: null };
  }
  if (value.includes("/")) {
    const slash = value.indexOf("/");
    const base = value.slice(0, slash);
    const prefixText = value.slice(slash + 1);
    if (!/^\d{1,2}$/.test(prefixText)) {
      return { kind: null, error: "CIDR prefix length must be numeric" };
    }
    if (Number(prefixText) > 32) {
      return { kind: null, error: "CIDR prefix length must be <= 32" };
    }
    if (ipv4ToUint32A(base) == null) {
      return { kind: null, error: "CIDR base address is not a valid IPv4 address" };
    }
    return { kind: "cidr", error: null };
  }
  if (ipv4ToUint32A(value) != null) return { kind: "exact", error: null };
  return { kind: null, error: "Not a valid IPv4 address, CIDR or trailing-* wildcard" };
}

/** Whether a CIDR entry contains the parsed client IP (uint32 math). */
function lifecycleCidrContains(entry: string, ipU32: number): boolean {
  const slash = entry.indexOf("/");
  const baseU32 = ipv4ToUint32A(entry.slice(0, slash));
  if (baseU32 == null) return false;
  const mask = lifecycleCidrMask(Number(entry.slice(slash + 1)));
  return (ipU32 & mask) === (baseU32 & mask);
}

/** Whether a trailing-* wildcard fixes whole leading octets of the IP. */
function lifecycleWildcardContains(entry: string, ipU32: number): boolean {
  const prefixOctets = entry
    .slice(0, -1)
    .split(".")
    .filter((part) => part.length > 0);
  if (prefixOctets.length === 0 || prefixOctets.length >= 4) return false;
  let prefixU32 = 0;
  for (const octet of prefixOctets) {
    prefixU32 = ((prefixU32 << 8) | Number(octet)) >>> 0;
  }
  const mask = lifecycleCidrMask(prefixOctets.length * 8);
  return (ipU32 & mask) === (prefixU32 & mask);
}

/**
 * Normalize raw allowlist input (strings or {label,value} objects):
 * trim, lowercase, validate, dedupe (first occurrence wins), sort
 * lexicographically and cap at MAX_ALLOWLIST_ENTRIES (first-come,
 * deterministic; overflow flags `truncated`). Malformed entries land in
 * `invalid` with stable reasons. Never throws.
 */
export function normalizeAllowlist(entries: unknown): NormalizeAllowlistResult {
  try {
    const raw = Array.isArray(entries) ? entries : [];
    const byValue = new Map<string, NormalizedAllowlistEntry>();
    const invalid: AllowlistRejection[] = [];
    let droppedForCapacity = 0;

    for (let index = 0; index < raw.length; index += 1) {
      const entry: unknown = raw[index];
      let value: unknown = entry;
      let label: unknown = null;
      if (entry && typeof entry === "object" && !Array.isArray(entry)) {
        const rec = entry as Record<string, unknown>;
        value = rec.value;
        label = rec.label;
      }
      if (typeof value !== "string") {
        invalid.push({ index, value: null, reason: "Entry must be a string or an object with a string 'value'" });
        continue;
      }
      const normalized = value.trim().toLowerCase();
      if (normalized.length === 0) {
        invalid.push({ index, value: null, reason: "Entry is empty" });
        continue;
      }
      const classified = classifyAllowlistValueA(normalized);
      if (classified.kind == null) {
        invalid.push({ index, value: normalized, reason: classified.error ?? "Invalid entry" });
        continue;
      }
      if (byValue.has(normalized)) continue;
      if (byValue.size >= MAX_ALLOWLIST_ENTRIES) {
        droppedForCapacity += 1;
        continue;
      }
      const labelText = typeof label === "string" && label.trim().length > 0 ? label.trim() : null;
      byValue.set(normalized, { value: normalized, label: labelText, kind: classified.kind });
    }

    const sorted = [...byValue.values()].sort((a, b) =>
      a.value < b.value ? -1 : a.value > b.value ? 1 : 0
    );
    return Object.freeze({
      entries: Object.freeze(sorted.map((item) => Object.freeze(item))),
      invalid: Object.freeze(invalid),
      accepted: sorted.length,
      rejected: invalid.length,
      truncated: raw.length > MAX_ALLOWLIST_ENTRIES || droppedForCapacity > 0,
      version: "alw1",
    });
  } catch {
    return EMPTY_NORMALIZED_ALLOWLIST;
  }
}

/** Flatten raw or pre-normalized allowlist input to validated strings. */
function resolveSectionAAllowlistValues(allowlist: unknown): string[] {
  if (allowlist && typeof allowlist === "object" && !Array.isArray(allowlist)) {
    const entries = (allowlist as { entries?: unknown }).entries;
    if (!Array.isArray(entries)) return [];
    return entries
      .map((entry) =>
        entry && typeof entry === "object" ? (entry as { value?: unknown }).value : entry
      )
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim().toLowerCase());
  }
  if (!Array.isArray(allowlist)) return [];
  const values: string[] = [];
  for (const entry of allowlist) {
    const candidate =
      typeof entry === "string"
        ? entry
        : entry && typeof entry === "object"
          ? (entry as { value?: unknown }).value
          : undefined;
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      values.push(candidate.trim().toLowerCase());
    }
  }
  return values;
}

/**
 * Evaluate one client IP against an allowlist with strict precedence:
 * exact match > CIDR match > wildcard match > deny. Accepts either raw
 * entries or a normalizeAllowlist() result. Malformed IPs yield
 * allowed:false with reason "denied-invalid"; malformed allowlist
 * entries are skipped (surface them via normalizeAllowlist). Never
 * throws.
 */
export function evaluateIpAgainstAllowlist(
  ip: unknown,
  allowlist: unknown,
  _options?: AllowlistEvaluateOptions
): IpAllowlistDecision {
  try {
    if (typeof ip !== "string") return EMPTY_IP_ALLOWLIST_DECISION;
    const normalizedIp = ip.trim().toLowerCase();
    if (normalizedIp.length === 0) return EMPTY_IP_ALLOWLIST_DECISION;
    const ipU32 = ipv4ToUint32A(normalizedIp);
    if (ipU32 == null) return EMPTY_IP_ALLOWLIST_DECISION;

    const values = resolveSectionAAllowlistValues(allowlist);
    if (values.length === 0) {
      return Object.freeze({
        allowed: false,
        matchedBy: null,
        matchedEntry: null,
        reason: "Denied: allowlist is empty",
      });
    }

    let exactHit: string | null = null;
    let cidrHit: string | null = null;
    let wildcardHit: string | null = null;
    for (const value of values) {
      const classified = classifyAllowlistValueA(value);
      if (classified.kind == null) continue;
      if (classified.kind === "exact") {
        if (exactHit == null && ipv4ToUint32A(value) === ipU32) exactHit = value;
      } else if (classified.kind === "cidr") {
        if (cidrHit == null && lifecycleCidrContains(value, ipU32)) cidrHit = value;
      } else if (wildcardHit == null && lifecycleWildcardContains(value, ipU32)) {
        wildcardHit = value;
      }
    }

    if (exactHit != null) {
      return Object.freeze({ allowed: true, matchedBy: "exact", matchedEntry: exactHit, reason: "Allowed by exact allowlist match" });
    }
    if (cidrHit != null) {
      return Object.freeze({ allowed: true, matchedBy: "cidr", matchedEntry: cidrHit, reason: "Allowed by CIDR allowlist match" });
    }
    if (wildcardHit != null) {
      return Object.freeze({ allowed: true, matchedBy: "wildcard", matchedEntry: wildcardHit, reason: "Allowed by wildcard allowlist match" });
    }
    return Object.freeze({
      allowed: false,
      matchedBy: null,
      matchedEntry: null,
      reason: "Denied: no matching allowlist entry",
    });
  } catch {
    return EMPTY_IP_ALLOWLIST_DECISION;
  }
}
