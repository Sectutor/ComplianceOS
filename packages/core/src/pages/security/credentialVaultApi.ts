/**
 * Credential Vault — data contract + hooks (cycle 31)
 * ===================================================
 * UI-side typed view of the `credentialVault.*` tRPC procedures that the
 * backend agent lands in
 * `packages/core/src/server/routers/credentialVault.ts`
 * (factory `createCredentialVaultRouter`, registered as `credentialVault:`
 * on the AppRouter in `packages/core/src/routers.ts`).
 *
 * Powers the "Credential Vault Security" section on Settings → Security
 * (`pages/settings/SecuritySettings.tsx` via
 * `pages/security/CredentialVaultPanels.tsx`).
 *
 * COORDINATION BY CONVENTION (UI-STANDARD 16) — if a procedure is not live
 * yet the tRPC HTTP call 404s (NOT_FOUND) and the query surfaces an error;
 * the panels degrade to a graceful Skeleton while loading and an EmptyState
 * ("Connect the credentialVault.status API") on failure. Demo mode
 * (UI-STANDARD 17) is gated behind the header "Demo data" switch / the
 * EmptyState CTA, renders a persistent amber banner, and never wins over a
 * live payload.
 *
 * ---------------------------------------------------------------------------
 * Expected procedures (factory createCredentialVaultRouter):
 *
 * 1) credentialVault.status  (public query — vault is workspace-global)
 *    input:  (none)
 *    output: { available: boolean,
 *              algorithm: string            // "aes-256-gcm"
 *              kdf: string                  // "scrypt"
 *              envelope: string             // "cosv1"
 *              twoFactorRequired: boolean,
 *              credentialsCount?: number | null,
 *              connectionsCount?: number | null,
 *              lastRotatedAt?: string | null,   // ISO-8601
 *              updatedAt?: string | null,       // ISO-8601
 *              checklist: Array<{ id, label, description?, implemented }>
 *              // exactly 8 posture controls with implemented states }
 *
 * 2) credentialVault.policyCheck  (query)
 *    input:  { clientId?: number | null,
 *              action?: 'read' | 'write' | 'rotate' | 'delete' }
 *    output: { allowed: boolean, reason?: string | null,
 *              requiresTwoFactor?: boolean, policyVersion?: string | null }
 *
 * 3) credentialVault.rateLimitCheck  (query)
 *    input:  { clientId?: number | null }
 *    output: { limited: boolean, limitPerMinute: number,
 *              remaining: number, resetAt?: string | null }
 *
 * 4) credentialVault.auditVerify  (query — hash-chain integrity check)
 *    input:  { clientId?: number | null, limit?: number | null }
 *    output: { verified: boolean, entriesChecked: number,
 *              anomalies?: number, chainHead?: string | null,
 *              lastEntryAt?: string | null }
 *
 * 5) credentialVault.selfTest  (mutation — on-demand integrity probe)
 *    input:  (none)
 *    output: { ok: boolean, ranAt: string,
 *              checks: Array<{ id, label, passed, detail? }> }
 * ---------------------------------------------------------------------------
 */

import { trpc } from "@/lib/trpc";

/* ------------------------------------------------------------------ */
/* Types (mirror the backend contract 1:1, defensive on optionals)     */
/* ------------------------------------------------------------------ */

/** Badge variants actually supported by the Badge component. */
export type VaultBadgeVariant =
  | "default"
  | "secondary"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "outline"
  | "destructive";

/** Vault operation a policy check can be scoped to. */
export type VaultAccessAction = "read" | "write" | "rotate" | "delete";

/** One posture control of the fixed 8-item security checklist. */
export interface CredentialVaultChecklistItem {
  /** Stable slug, e.g. "encryption-at-rest". */
  id: string;
  /** Human label rendered in the checklist row. */
  label: string;
  /** Optional one-liner explaining the control. */
  description?: string;
  /** Whether the control is implemented by the live vault. */
  implemented: boolean;
}

/** Output of credentialVault.status. */
export interface CredentialVaultStatusResult {
  /** Vault service reachable and unlocked for capability checks. */
  available: boolean;
  /** Cipher, e.g. "aes-256-gcm". */
  algorithm: string;
  /** Key derivation function, e.g. "scrypt". */
  kdf: string;
  /** Envelope format version, e.g. "cosv1". */
  envelope: string;
  /** Whether unlock/write operations require two-factor auth. */
  twoFactorRequired: boolean;
  /** Number of stored credentials (optional telemetry). */
  credentialsCount?: number | null;
  /** Number of collector connections using the vault (optional). */
  connectionsCount?: number | null;
  /** ISO timestamp of the most recent rotation (optional). */
  lastRotatedAt?: string | null;
  /** ISO timestamp of this status snapshot (optional). */
  updatedAt?: string | null;
  /** The fixed 8-item security checklist with implemented states. */
  checklist: CredentialVaultChecklistItem[];
}

/* --- credentialVault.policyCheck ------------------------------------- */

/** Input of credentialVault.policyCheck. */
export interface PolicyCheckQueryInput {
  clientId?: number | null;
  action?: VaultAccessAction | null;
}

/** Output of credentialVault.policyCheck. */
export interface PolicyCheckResult {
  allowed: boolean;
  reason?: string | null;
  requiresTwoFactor?: boolean;
  policyVersion?: string | null;
}

/* --- credentialVault.rateLimitCheck ---------------------------------- */

/** Input of credentialVault.rateLimitCheck. */
export interface RateLimitCheckQueryInput {
  clientId?: number | null;
}

/** Output of credentialVault.rateLimitCheck. */
export interface RateLimitCheckResult {
  limited: boolean;
  limitPerMinute: number;
  remaining: number;
  resetAt?: string | null;
}

/* --- credentialVault.auditVerify ------------------------------------- */

/** Input of credentialVault.auditVerify. */
export interface AuditVerifyQueryInput {
  clientId?: number | null;
  limit?: number | null;
}

/** Output of credentialVault.auditVerify. */
export interface AuditVerifyResult {
  verified: boolean;
  entriesChecked: number;
  anomalies?: number;
  chainHead?: string | null;
  lastEntryAt?: string | null;
}

/* --- credentialVault.selfTest ---------------------------------------- */

/** One check inside a self-test run. */
export interface SelfTestCheck {
  id: string;
  label: string;
  passed: boolean;
  detail?: string | null;
}

/** Output of credentialVault.selfTest. */
export interface SelfTestResult {
  ok: boolean;
  ranAt: string;
  checks: SelfTestCheck[];
}

/* ------------------------------------------------------------------ */
/* Narrowed tRPC query/mutation result shapes (runtime is a superset)  */
/* ------------------------------------------------------------------ */

export interface QueryLike<T> {
  data?: T;
  isLoading: boolean;
  isError: boolean;
  isFetching?: boolean;
  error?: unknown;
  refetch: () => unknown;
}

export interface MutationLike<TInput, TResult> {
  mutate: (
    input: TInput,
    options?: {
      onSuccess?: (data: TResult) => void;
      onError?: (error: unknown) => void;
    }
  ) => void;
  isPending: boolean;
  isSuccess: boolean;
  isError: boolean;
  error?: unknown;
}

interface QueryOptions {
  enabled?: boolean;
  retry?: boolean | number;
  staleTime?: number;
}

interface CredentialVaultTrpc {
  credentialVault: {
    status: {
      useQuery: (opts?: QueryOptions) => QueryLike<CredentialVaultStatusResult>;
    };
    policyCheck: {
      useQuery: (
        input: PolicyCheckQueryInput,
        opts?: QueryOptions
      ) => QueryLike<PolicyCheckResult>;
    };
    rateLimitCheck: {
      useQuery: (
        input: RateLimitCheckQueryInput,
        opts?: QueryOptions
      ) => QueryLike<RateLimitCheckResult>;
    };
    auditVerify: {
      useQuery: (
        input: AuditVerifyQueryInput,
        opts?: QueryOptions
      ) => QueryLike<AuditVerifyResult>;
    };
    rotationSchedule: {
      useQuery: (
        input: RotationScheduleQueryInput,
        opts?: QueryOptions
      ) => QueryLike<RotationScheduleResult>;
    };
    expiryCheck: {
      useQuery: (
        input: ExpiryCheckQueryInput,
        opts?: QueryOptions
      ) => QueryLike<ExpiryCheckResult>;
    };
    allowlistEvaluate: {
      useQuery: (
        input: AllowlistEvaluateQueryInput,
        opts?: QueryOptions
      ) => QueryLike<AllowlistEvaluateResult>;
    };
    selfTest: {
      useMutation: () => MutationLike<void, SelfTestResult>;
    };
  };
}

const credentialVaultApi = trpc as unknown as CredentialVaultTrpc;

/* ------------------------------------------------------------------ */
/* Hooks - retry: false everywhere (UI-STANDARD 16)                    */
/* ------------------------------------------------------------------ */

/**
 * Vault capability snapshot (cipher, KDF, envelope, 2FA, checklist). Global
 * procedure - no client scoping, safe to call unconditionally; a missing
 * endpoint surfaces as `isError` and consumers render the degraded state.
 */
export function useCredentialVaultStatus(enabled = true): QueryLike<CredentialVaultStatusResult> {
  return credentialVaultApi.credentialVault.status.useQuery({
    enabled,
    retry: false,
    staleTime: 30_000,
  });
}

/**
 * Policy verdict for a vault access action. Client-scoped - pass `null` for
 * `input` to keep the query disabled.
 */
export function useCredentialVaultPolicyCheck(
  clientId: number,
  input: PolicyCheckQueryInput | null,
  enabled = true
): QueryLike<PolicyCheckResult> {
  return credentialVaultApi.credentialVault.policyCheck.useQuery(
    input ?? { clientId },
    {
      enabled: enabled && clientId > 0 && input !== null,
      retry: false,
      staleTime: 30_000,
    }
  );
}

/**
 * Collector rate-limit budget for the vault. Client-scoped - pass `null`
 * for `input` to keep the query disabled.
 */
export function useCredentialVaultRateLimitCheck(
  clientId: number,
  input: RateLimitCheckQueryInput | null,
  enabled = true
): QueryLike<RateLimitCheckResult> {
  return credentialVaultApi.credentialVault.rateLimitCheck.useQuery(
    input ?? { clientId },
    {
      enabled: enabled && clientId > 0 && input !== null,
      retry: false,
      staleTime: 30_000,
    }
  );
}

/**
 * Audit-trail hash-chain verification. Client-scoped - pass `null` for
 * `input` to keep the query disabled.
 */
export function useCredentialVaultAuditVerify(
  clientId: number,
  input: AuditVerifyQueryInput | null,
  enabled = true
): QueryLike<AuditVerifyResult> {
  return credentialVaultApi.credentialVault.auditVerify.useQuery(
    input ?? { clientId },
    {
      enabled: enabled && clientId > 0 && input !== null,
      retry: false,
      staleTime: 30_000,
    }
  );
}

/**
 * On-demand vault integrity self-test (mutation - fires when the user
 * triggers it, never automatically).
 */
export function useCredentialVaultSelfTestMutation(): MutationLike<void, SelfTestResult> {
  return credentialVaultApi.credentialVault.selfTest.useMutation();
}

/* ------------------------------------------------------------------ */
/* Empty shapes - stable defaults for degraded rendering (16)          */
/* ------------------------------------------------------------------ */

/**
 * Expected number of checklist items returned by `status`. Backend contract
 * fixes the list at 8 controls.
 */
export const CHECKLIST_EXPECTED_COUNT = 8;

export const EMPTY_CREDENTIAL_VAULT_STATUS: CredentialVaultStatusResult = {
  available: false,
  algorithm: "",
  kdf: "",
  envelope: "",
  twoFactorRequired: false,
  credentialsCount: null,
  connectionsCount: null,
  lastRotatedAt: null,
  updatedAt: null,
  checklist: [],
};

export const EMPTY_POLICY_CHECK_RESULT: PolicyCheckResult = {
  allowed: false,
  reason: null,
  requiresTwoFactor: false,
  policyVersion: null,
};

export const EMPTY_RATE_LIMIT_RESULT: RateLimitCheckResult = {
  limited: false,
  limitPerMinute: 0,
  remaining: 0,
  resetAt: null,
};

export const EMPTY_AUDIT_VERIFY_RESULT: AuditVerifyResult = {
  verified: false,
  entriesChecked: 0,
  anomalies: 0,
  chainHead: null,
  lastEntryAt: null,
};

export const EMPTY_SELF_TEST_RESULT: SelfTestResult = {
  ok: false,
  ranAt: "",
  checks: [],
};

/* ------------------------------------------------------------------ */
/* Normalizers - tolerate shape drift until the router settles          */
/* ------------------------------------------------------------------ */

/** Coerce an unknown checklist payload into typed items (max 8). */
export function normalizeVaultChecklist(raw: unknown): CredentialVaultChecklistItem[] {
  if (!Array.isArray(raw)) return [];
  const items: CredentialVaultChecklistItem[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const id = typeof record.id === "string" ? record.id.trim() : "";
    const label = typeof record.label === "string" ? record.label.trim() : "";
    if (!id && !label) continue;
    items.push({
      id: id || label.toLowerCase().replace(/\s+/g, "-"),
      label: label || id,
      description:
        typeof record.description === "string" && record.description.trim()
          ? record.description.trim()
          : undefined,
      implemented: record.implemented === true,
    });
  }
  return items.slice(0, CHECKLIST_EXPECTED_COUNT);
}

/** Coerce an unknown `status` payload into the typed result shape. */
export function normalizeVaultStatus(raw: unknown): CredentialVaultStatusResult {
  if (!raw || typeof raw !== "object") return { ...EMPTY_CREDENTIAL_VAULT_STATUS };
  const record = raw as Record<string, unknown>;
  const finiteNumber = (value: unknown): number | null =>
    typeof value === "number" && Number.isFinite(value) ? value : null;
  const isoString = (value: unknown): string | null =>
    typeof value === "string" && value.length > 0 ? value : null;
  return {
    available: record.available === true,
    algorithm: typeof record.algorithm === "string" ? record.algorithm : "",
    kdf: typeof record.kdf === "string" ? record.kdf : "",
    envelope: typeof record.envelope === "string" ? record.envelope : "",
    twoFactorRequired: record.twoFactorRequired === true,
    credentialsCount: finiteNumber(record.credentialsCount),
    connectionsCount: finiteNumber(record.connectionsCount),
    lastRotatedAt: isoString(record.lastRotatedAt),
    updatedAt: isoString(record.updatedAt),
    checklist: normalizeVaultChecklist(record.checklist),
  };
}

/* ------------------------------------------------------------------ */
/* Meta helpers (all token-based, dark-mode safe - UI-STANDARD 2)       */
/* ------------------------------------------------------------------ */

export interface ChecklistStateMeta {
  label: string;
  badgeVariant: VaultBadgeVariant;
}

/** Checklist control state -> badge label/variant. */
export const CHECKLIST_STATE_META: Record<"implemented" | "pending", ChecklistStateMeta> = {
  implemented: { label: "Implemented", badgeVariant: "success" },
  pending: { label: "Planned", badgeVariant: "warning" },
};

/** State meta for one checklist item. */
export function checklistItemStateMeta(item: CredentialVaultChecklistItem): ChecklistStateMeta {
  return item.implemented ? CHECKLIST_STATE_META.implemented : CHECKLIST_STATE_META.pending;
}

/** Stable crypto chip definition (render order + eyebrow label). */
export interface CryptoChipDef {
  key: "algorithm" | "kdf" | "envelope";
  label: string;
}

/** Cipher/KDF/envelope chips in stable render order. */
export const CRYPTO_CHIP_ORDER: CryptoChipDef[] = [
  { key: "algorithm", label: "Cipher" },
  { key: "kdf", label: "KDF" },
  { key: "envelope", label: "Envelope" },
];

/** Chip value for one crypto field ("—" placeholder when absent). */
export function cryptoChipValue(
  status: CredentialVaultStatusResult,
  key: CryptoChipDef["key"]
): string {
  return status[key] || "";
}

/** Formatted chip value (em-dash keeps the grid aligned when empty). */
export function formatCryptoValue(value: string): string {
  return value.trim() ? value : "—";
}

export interface AvailabilityMeta {
  label: string;
  badgeVariant: VaultBadgeVariant;
}

/** Vault availability -> header pill label/variant. */
export function vaultAvailabilityMeta(available: boolean): AvailabilityMeta {
  return available
    ? { label: "Operational", badgeVariant: "success" }
    : { label: "Locked", badgeVariant: "warning" };
}

/** Two-factor requirement -> badge label/variant. */
export function twoFactorBadgeMeta(required: boolean): AvailabilityMeta {
  return required
    ? { label: "2FA required", badgeVariant: "info" }
    : { label: "2FA optional", badgeVariant: "secondary" };
}

/** Count checklist items that are implemented. */
export function countImplementedChecks(checklist: CredentialVaultChecklistItem[]): number {
  return checklist.reduce((count, item) => count + (item.implemented ? 1 : 0), 0);
}

/** Implemented share of the checklist (0-100, rounded). */
export function implementedCoveragePct(checklist: CredentialVaultChecklistItem[]): number {
  if (checklist.length === 0) return 0;
  return Math.round((countImplementedChecks(checklist) / checklist.length) * 100);
}

export type CoverageBarClass = "progress-success" | "progress-warning" | "progress-error";

/** Coverage pct -> score-bar fill (index.css .progress-* classes). */
export function coverageBarClass(pct: number): CoverageBarClass {
  if (pct >= 80) return "progress-success";
  if (pct >= 50) return "progress-warning";
  return "progress-error";
}

/** ISO timestamp -> localized "Aug 22, 2026, 12:24" or null when invalid. */
export function formatVaultTimestamp(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(
    new Date(ms)
  );
}

/* ------------------------------------------------------------------ */
/* Demo mode (UI-STANDARD 17) - sample data, never fake primary state  */
/* ------------------------------------------------------------------ */

/**
 * Fixed demo clock so the vault demo is deterministic: rotation age and the
 * status footer are computed from this instant.
 */
export const DEMO_VAULT_BASE_DATE = new Date("2026-08-22T00:00:00.000Z");

const DAY_MS = 86_400_000;

/** Demo security checklist: 7 of the 8 controls implemented. */
const DEMO_CHECKLIST_ITEMS: CredentialVaultChecklistItem[] = [
  {
    id: "encryption-at-rest",
    label: "Envelope encryption at rest",
    description:
      "Every secret is sealed with AES-256-GCM inside a cosv1 envelope before it touches disk.",
    implemented: true,
  },
  {
    id: "masked-api-responses",
    label: "Masked API responses",
    description:
      "API responses return masked values only - raw secrets never leave the vault process.",
    implemented: true,
  },
  {
    id: "kdf-hardening",
    label: "Hardened key derivation",
    description: "Master keys are derived with scrypt and a per-vault random salt.",
    implemented: true,
  },
  {
    id: "capability-token-delivery",
    label: "Capability-token delivery",
    description: "Collectors receive scoped capability tokens, never the underlying secret.",
    implemented: true,
  },
  {
    id: "audit-chain-verification",
    label: "Scheduled audit-chain verification",
    description: "Periodic re-verification of the append-only audit hash chain.",
    implemented: false,
  },
  {
    id: "rotation-tracking",
    label: "Rotation tracking",
    description: "Connections track last-rotated timestamps so stale credentials surface early.",
    implemented: true,
  },
  {
    id: "two-factor-unlock",
    label: "Two-factor unlock",
    description: "Unlock and write operations require a second factor.",
    implemented: true,
  },
  {
    id: "scheduled-self-test",
    label: "Automated self-tests",
    description: "Scheduled encrypt/decrypt round-trip probes with alerting on failure.",
    implemented: false,
  },
];

/** Demo status fixture (UI-STANDARD 17: lives here, never inline in JSX). */
export const DEMO_CREDENTIAL_VAULT_STATUS: CredentialVaultStatusResult = {
  available: true,
  algorithm: "aes-256-gcm",
  kdf: "scrypt",
  envelope: "cosv1",
  twoFactorRequired: true,
  credentialsCount: 24,
  connectionsCount: 6,
  lastRotatedAt: new Date(DEMO_VAULT_BASE_DATE.getTime() - 9 * DAY_MS).toISOString(),
  updatedAt: DEMO_VAULT_BASE_DATE.toISOString(),
  checklist: DEMO_CHECKLIST_ITEMS,
};

/** Fresh deep clone of the demo status (callers may not mutate the const). */
export function buildDemoCredentialVaultStatus(): CredentialVaultStatusResult {
  return {
    ...DEMO_CREDENTIAL_VAULT_STATUS,
    checklist: DEMO_CREDENTIAL_VAULT_STATUS.checklist.map((item) => ({ ...item })),
  };
}

/** Demo self-test run mirroring the demo checklist states. */
export function buildDemoSelfTestResult(): SelfTestResult {
  return {
    ok: true,
    ranAt: DEMO_VAULT_BASE_DATE.toISOString(),
    checks: [
      { id: "envelope-roundtrip", label: "Encrypt/decrypt round-trip", passed: true },
      { id: "kdf-derivation", label: "KDF derives expected key length", passed: true },
      { id: "masking", label: "API responses fully masked", passed: true },
    ],
  };
}

/* ================================================================== */
/* Cycle 37 — lifecycle queries                                        */
/*                                                                     */
/* Three new credentialVault procedures wired by the backend this      */
/* cycle, consumed with the same coordination-by-convention pattern    */
/* as above (UI-STANDARD 16): typed contracts, retry:false hooks,      */
/* stable EMPTY_* shapes, tolerant normalizers and clearly-labeled     */
/* demo fixtures (UI-STANDARD 17).                                     */
/*                                                                     */
/* 6) credentialVault.rotationSchedule (query)                         */
/*    input:  { credentials: unknown[],                                */
/*              policy?: { defaultIntervalDays?: int 1..3650 | null,   */
/*                        warnWithinDays?: int 0..3650 | null,         */
/*                        overrides?: Record<string, number> | null }, */
/*              clock?: string | number | null }                       */
/*    output: { generatedAt, policyVersion, items[], summary }         */
/*                                                                     */
/* 7) credentialVault.expiryCheck (query)                              */
/*    input:  { credentials: unknown[],                                */
/*              policy?: { warningWindowDays?: int 0..3650 | null },   */
/*              clock?: string | number | null }                       */
/*    output: { generatedAt, policyVersion, items[], summary }         */
/*                                                                     */
/* 8) credentialVault.allowlistEvaluate (query)                        */
/*    input:  { ip: string, entries: unknown[] }                       */
/*    output: { normalized: { entries[], invalid[], accepted,          */
/*                            rejected, truncated, version },          */
/*              decision: { allowed, matchedBy, matchedEntry, reason }}*/
/* ================================================================== */

/* ------------------------------------------------------------------ */
/* Types - rotation schedule                                           */
/* ------------------------------------------------------------------ */

/** Rotation band of one credential against the rotation policy. */
export type RotationBandStatus = "ok" | "due-soon" | "due" | "overdue" | "never";

/** One credential's rotation outlook. */
export interface RotationScheduleItem {
  /** Vault credential id. */
  id: string;
  /** Provider slug, e.g. "slack", "aws", "github". */
  provider: string;
  /** Effective rotation interval in days (null when untracked). */
  intervalDays: number | null;
  /** ISO timestamp of the last rotation (null when never rotated). */
  lastRotatedAt: string | null;
  /** ISO timestamp of the next due rotation (null when never rotated). */
  dueAt: string | null;
  /** Computed band for this credential. */
  status: RotationBandStatus;
  /** Days until due (negative means overdue); null when not computable. */
  daysUntil: number | null;
  /** Days past due; non-null only for the "overdue" band. */
  daysOverdue: number | null;
}

/** Aggregate counters across all scheduled items. */
export interface RotationScheduleSummary {
  total: number;
  ok: number;
  dueSoon: number;
  due: number;
  overdue: number;
  never: number;
  /** ISO timestamp of the earliest upcoming dueAt, if any. */
  nextDueAt: string | null;
}

/** Workspace rotation policy overrides accepted by the procedure. */
export interface RotationSchedulePolicyInput {
  defaultIntervalDays?: number | null;
  warnWithinDays?: number | null;
  overrides?: Record<string, number> | null;
}

/** Input of credentialVault.rotationSchedule. */
export interface RotationScheduleQueryInput {
  /**
   * Credential payloads to evaluate. An empty array is the documented
   * convention for "evaluate every credential stored in the workspace
   * vault server-side".
   */
  credentials: unknown[];
  policy?: RotationSchedulePolicyInput | null;
  /** Optional fixed clock (ISO string or epoch ms) for deterministic runs. */
  clock?: string | number | null;
}

/** Output of credentialVault.rotationSchedule. */
export interface RotationScheduleResult {
  generatedAt: string;
  policyVersion?: string | null;
  items: RotationScheduleItem[];
  summary: RotationScheduleSummary;
}

/* ------------------------------------------------------------------ */
/* Types - expiration check                                            */
/* ------------------------------------------------------------------ */

/** Expiration state of one credential against the expiry policy. */
export type ExpiryState = "valid" | "expiring" | "expired" | "no-expiry" | "inactive";

/** One credential's expiry outlook. */
export interface ExpiryCheckItem {
  id: string;
  provider: string;
  /** Declared vault status, e.g. "active" | "revoked" (null when absent). */
  declaredStatus: string | null;
  /** ISO timestamp when the credential expires (null = no expiry). */
  expiryAt: string | null;
  status: ExpiryState;
  /** Days until expiry (negative = already expired); null when N/A. */
  daysUntil: number | null;
}

/** Aggregate counters across all checked items. */
export interface ExpiryCheckSummary {
  total: number;
  valid: number;
  expiring: number;
  expired: number;
  noExpiry: number;
  inactive: number;
  /** ISO timestamp of the earliest future expiry among active items. */
  soonestExpiry: string | null;
  /** Share of active credentials that declare an expiry (0-100). */
  coverageRate: number;
}

/** Expiry warning policy accepted by the procedure. */
export interface ExpiryCheckPolicyInput {
  warningWindowDays?: number | null;
}

/** Input of credentialVault.expiryCheck. */
export interface ExpiryCheckQueryInput {
  credentials: unknown[];
  policy?: ExpiryCheckPolicyInput | null;
  clock?: string | number | null;
}

/** Output of credentialVault.expiryCheck. */
export interface ExpiryCheckResult {
  generatedAt: string;
  policyVersion?: string | null;
  items: ExpiryCheckItem[];
  summary: ExpiryCheckSummary;
}

/* ------------------------------------------------------------------ */
/* Types - IP allowlist evaluation                                     */
/* ------------------------------------------------------------------ */

/** How an allowlist entry matches. */
export type AllowlistEntryKind = "exact" | "cidr" | "wildcard";

/** One parsed allowlist entry. */
export interface AllowlistNormalizedEntry {
  value: string;
  label: string;
  kind: AllowlistEntryKind;
}

/** One rejected input entry with the parse failure reason. */
export interface AllowlistInvalidEntry {
  index: number;
  value: string;
  reason: string;
}

/** Normalization pass over the raw entry list. */
export interface AllowlistNormalization {
  entries: AllowlistNormalizedEntry[];
  invalid: AllowlistInvalidEntry[];
  accepted: number;
  rejected: number;
  truncated: boolean;
  version?: string | null;
}

/** Verdict for the evaluated IP. */
export interface AllowlistDecision {
  allowed: boolean;
  matchedBy: AllowlistEntryKind | null;
  matchedEntry: string | null;
  reason: string;
}

/** Input of credentialVault.allowlistEvaluate. */
export interface AllowlistEvaluateQueryInput {
  ip: string;
  entries: unknown[];
}

/** Output of credentialVault.allowlistEvaluate. */
export interface AllowlistEvaluateResult {
  normalized: AllowlistNormalization;
  decision: AllowlistDecision;
}

/* ------------------------------------------------------------------ */
/* Hooks - retry: false everywhere (UI-STANDARD 16)                    */
/* ------------------------------------------------------------------ */

/**
 * Rotation outlook for every workspace-vault credential. Global procedure -
 * sends the empty-credentials convention ("evaluate all stored secrets");
 * a missing endpoint surfaces as `isError` and consumers render degraded.
 */
export function useCredentialVaultRotationSchedule(
  enabled = true
): QueryLike<RotationScheduleResult> {
  return credentialVaultApi.credentialVault.rotationSchedule.useQuery(
    { credentials: [] },
    { enabled, retry: false, staleTime: 30_000 }
  );
}

/**
 * Expiry outlook for every workspace-vault credential. Global procedure -
 * same empty-credentials convention as rotationSchedule.
 */
export function useCredentialVaultExpiryCheck(
  enabled = true
): QueryLike<ExpiryCheckResult> {
  return credentialVaultApi.credentialVault.expiryCheck.useQuery(
    { credentials: [] },
    { enabled, retry: false, staleTime: 30_000 }
  );
}

/**
 * Evaluate one IP against a candidate allowlist. Pass `null` for either
 * argument to keep the query disabled until the evaluator form submits
 * usable inputs.
 */
export function useCredentialVaultAllowlistEvaluate(
  ip: string | null,
  entries: unknown[] | null
): QueryLike<AllowlistEvaluateResult> {
  const usable =
    typeof ip === "string" && ip.trim().length > 0 && Array.isArray(entries);
  return credentialVaultApi.credentialVault.allowlistEvaluate.useQuery(
    { ip: (ip ?? "").trim(), entries: entries ?? [] },
    { enabled: usable, retry: false, staleTime: 30_000 }
  );
}

/* ------------------------------------------------------------------ */
/* Empty shapes - stable defaults for degraded rendering               */
/* ------------------------------------------------------------------ */

export const EMPTY_ROTATION_SCHEDULE_RESULT: RotationScheduleResult = {
  generatedAt: "",
  policyVersion: null,
  items: [],
  summary: {
    total: 0,
    ok: 0,
    dueSoon: 0,
    due: 0,
    overdue: 0,
    never: 0,
    nextDueAt: null,
  },
};

export const EMPTY_EXPIRY_CHECK_RESULT: ExpiryCheckResult = {
  generatedAt: "",
  policyVersion: null,
  items: [],
  summary: {
    total: 0,
    valid: 0,
    expiring: 0,
    expired: 0,
    noExpiry: 0,
    inactive: 0,
    soonestExpiry: null,
    coverageRate: 0,
  },
};

export const EMPTY_ALLOWLIST_EVALUATE_RESULT: AllowlistEvaluateResult = {
  normalized: {
    entries: [],
    invalid: [],
    accepted: 0,
    rejected: 0,
    truncated: false,
    version: "",
  },
  decision: {
    allowed: false,
    matchedBy: null,
    matchedEntry: null,
    reason: "",
  },
};

/** True when the rotation payload has nothing to render yet. */
export function isEmptyRotationScheduleResult(result: RotationScheduleResult): boolean {
  return result.items.length === 0;
}

/** True when the expiry payload has nothing to render yet. */
export function isEmptyExpiryCheckResult(result: ExpiryCheckResult): boolean {
  return result.items.length === 0;
}

/** True when the allowlist evaluation produced neither entries nor rejects. */
export function isEmptyAllowlistEvaluateResult(result: AllowlistEvaluateResult): boolean {
  return result.normalized.entries.length === 0 && result.normalized.invalid.length === 0;
}

/* ------------------------------------------------------------------ */
/* Meta helpers (token-based badge mapping, dark-mode safe)            */
/* ------------------------------------------------------------------ */

/** Label + Badge variant pair shared by the lifecycle metas. */
export interface LifecycleStateMeta {
  label: string;
  badgeVariant: VaultBadgeVariant;
}

const ROTATION_STATUS_VALUES: readonly RotationBandStatus[] = [
  "ok",
  "due-soon",
  "due",
  "overdue",
  "never",
];

const EXPIRY_STATE_VALUES: readonly ExpiryState[] = [
  "valid",
  "expiring",
  "expired",
  "no-expiry",
  "inactive",
];

const ALLOWLIST_KIND_VALUES: readonly AllowlistEntryKind[] = ["exact", "cidr", "wildcard"];

/** Rotation band -> badge label/variant (success/warning/destructive/muted). */
export const ROTATION_BAND_META: Record<RotationBandStatus, LifecycleStateMeta> = {
  ok: { label: "OK", badgeVariant: "success" },
  "due-soon": { label: "Due soon", badgeVariant: "warning" },
  due: { label: "Due", badgeVariant: "warning" },
  overdue: { label: "Overdue", badgeVariant: "destructive" },
  never: { label: "Never rotated", badgeVariant: "secondary" },
};

/** Expiry state -> badge label/variant. */
export const EXPIRY_STATE_META: Record<ExpiryState, LifecycleStateMeta> = {
  valid: { label: "Valid", badgeVariant: "success" },
  expiring: { label: "Expiring", badgeVariant: "warning" },
  expired: { label: "Expired", badgeVariant: "destructive" },
  "no-expiry": { label: "No expiry", badgeVariant: "outline" },
  inactive: { label: "Inactive", badgeVariant: "secondary" },
};

/**
 * Relative-day formatter for schedule/expiry columns:
 * `in N d` (future/today), `overdue by N d` (past), `—` (unknown).
 */
export function formatRelativeDays(days: number | null | undefined): string {
  if (typeof days !== "number" || !Number.isFinite(days)) return "—";
  const rounded = Math.round(days);
  if (rounded >= 0) return `in ${rounded} d`;
  return `overdue by ${Math.abs(rounded)} d`;
}

/* ------------------------------------------------------------------ */
/* Normalizers - tolerate shape drift until the router settles         */
/* ------------------------------------------------------------------ */

function toFiniteNumberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toIsoStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function toTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function toPolicyVersion(value: unknown): string | null {
  return toIsoStringOrNull(value);
}

function pickRotationStatus(
  record: Record<string, unknown>,
  lastRotatedAt: string | null,
  dueAt: string | null,
  daysUntil: number | null,
  daysOverdue: number | null
): RotationBandStatus {
  const raw = record.status;
  if (typeof raw === "string" && (ROTATION_STATUS_VALUES as readonly string[]).includes(raw)) {
    return raw as RotationBandStatus;
  }
  // Tolerant derivation when the backend has not settled its enum yet.
  if (!lastRotatedAt && !dueAt) return "never";
  if ((daysOverdue ?? 0) > 0 || (daysUntil ?? 1) < 0) return "overdue";
  return "ok";
}

function pickExpiryStatus(record: Record<string, unknown>): ExpiryState {
  const raw = record.status;
  if (typeof raw === "string" && (EXPIRY_STATE_VALUES as readonly string[]).includes(raw)) {
    return raw as ExpiryState;
  }
  if (typeof record.declaredStatus === "string" && record.declaredStatus !== "active") {
    return "inactive";
  }
  return record.expiryAt == null ? "no-expiry" : "valid";
}

function pickAllowlistKind(value: unknown): AllowlistEntryKind {
  return typeof value === "string" &&
    (ALLOWLIST_KIND_VALUES as readonly string[]).includes(value)
    ? (value as AllowlistEntryKind)
    : "exact";
}

function pickAllowlistMatchKind(value: unknown): AllowlistEntryKind | null {
  return typeof value === "string" &&
    (ALLOWLIST_KIND_VALUES as readonly string[]).includes(value)
    ? (value as AllowlistEntryKind)
    : null;
}

/** Coerce an unknown `rotationSchedule` payload into the typed shape. */
export function normalizeRotationScheduleResult(raw: unknown): RotationScheduleResult {
  if (!raw || typeof raw !== "object") return { ...EMPTY_ROTATION_SCHEDULE_RESULT };
  const record = raw as Record<string, unknown>;
  const rawItems = Array.isArray(record.items) ? record.items : [];
  const items: RotationScheduleItem[] = [];
  for (const entry of rawItems) {
    if (!entry || typeof entry !== "object") continue;
    const itemRecord = entry as Record<string, unknown>;
    const id = toTrimmedString(itemRecord.id);
    const provider = toTrimmedString(itemRecord.provider);
    if (!id && !provider) continue;
    const lastRotatedAt = toIsoStringOrNull(itemRecord.lastRotatedAt);
    const dueAt = toIsoStringOrNull(itemRecord.dueAt);
    const daysUntil = toFiniteNumberOrNull(itemRecord.daysUntil);
    const daysOverdue = toFiniteNumberOrNull(itemRecord.daysOverdue);
    items.push({
      id: id || provider,
      provider: provider || id,
      intervalDays: toFiniteNumberOrNull(itemRecord.intervalDays),
      lastRotatedAt,
      dueAt,
      status: pickRotationStatus(itemRecord, lastRotatedAt, dueAt, daysUntil, daysOverdue),
      daysUntil,
      daysOverdue,
    });
  }
  const summaryRecord =
    record.summary && typeof record.summary === "object"
      ? (record.summary as Record<string, unknown>)
      : {};
  const count = (value: unknown): number => toFiniteNumberOrNull(value) ?? 0;
  return {
    generatedAt: toIsoStringOrNull(record.generatedAt) ?? "",
    policyVersion: toPolicyVersion(record.policyVersion),
    items,
    summary: {
      total: count(summaryRecord.total),
      ok: count(summaryRecord.ok),
      dueSoon: count(summaryRecord.dueSoon),
      due: count(summaryRecord.due),
      overdue: count(summaryRecord.overdue),
      never: count(summaryRecord.never),
      nextDueAt: toIsoStringOrNull(summaryRecord.nextDueAt),
    },
  };
}

/** Coerce an unknown `expiryCheck` payload into the typed shape. */
export function normalizeExpiryCheckResult(raw: unknown): ExpiryCheckResult {
  if (!raw || typeof raw !== "object") return { ...EMPTY_EXPIRY_CHECK_RESULT };
  const record = raw as Record<string, unknown>;
  const rawItems = Array.isArray(record.items) ? record.items : [];
  const items: ExpiryCheckItem[] = [];
  for (const entry of rawItems) {
    if (!entry || typeof entry !== "object") continue;
    const itemRecord = entry as Record<string, unknown>;
    const id = toTrimmedString(itemRecord.id);
    const provider = toTrimmedString(itemRecord.provider);
    if (!id && !provider) continue;
    items.push({
      id: id || provider,
      provider: provider || id,
      declaredStatus: toIsoStringOrNull(itemRecord.declaredStatus),
      expiryAt: toIsoStringOrNull(itemRecord.expiryAt),
      status: pickExpiryStatus(itemRecord),
      daysUntil: toFiniteNumberOrNull(itemRecord.daysUntil),
    });
  }
  const summaryRecord =
    record.summary && typeof record.summary === "object"
      ? (record.summary as Record<string, unknown>)
      : {};
  const count = (value: unknown): number => toFiniteNumberOrNull(value) ?? 0;
  const coverageRaw = toFiniteNumberOrNull(summaryRecord.coverageRate) ?? 0;
  const coverageRate = Math.min(100, Math.max(0, Math.round(coverageRaw)));
  return {
    generatedAt: toIsoStringOrNull(record.generatedAt) ?? "",
    policyVersion: toPolicyVersion(record.policyVersion),
    items,
    summary: {
      total: count(summaryRecord.total),
      valid: count(summaryRecord.valid),
      expiring: count(summaryRecord.expiring),
      expired: count(summaryRecord.expired),
      noExpiry: count(summaryRecord.noExpiry),
      inactive: count(summaryRecord.inactive),
      soonestExpiry: toIsoStringOrNull(summaryRecord.soonestExpiry),
      coverageRate,
    },
  };
}

/** Coerce an unknown `allowlistEvaluate` payload into the typed shape. */
export function normalizeAllowlistEvaluateResult(raw: unknown): AllowlistEvaluateResult {
  if (!raw || typeof raw !== "object") return { ...EMPTY_ALLOWLIST_EVALUATE_RESULT };
  const record = raw as Record<string, unknown>;
  const normalizedRecord =
    record.normalized && typeof record.normalized === "object"
      ? (record.normalized as Record<string, unknown>)
      : {};

  const entries: AllowlistNormalizedEntry[] = [];
  const invalid: AllowlistInvalidEntry[] = [];
  let accepted = 0;
  let rejected = 0;
  let truncated = false;

  const rawEntries = Array.isArray(normalizedRecord.entries) ? normalizedRecord.entries : [];
  for (const entry of rawEntries) {
    if (!entry || typeof entry !== "object") continue;
    const entryRecord = entry as Record<string, unknown>;
    const value = toTrimmedString(entryRecord.value);
    if (!value) continue;
    entries.push({
      value,
      label: toTrimmedString(entryRecord.label) || value,
      kind: pickAllowlistKind(entryRecord.kind),
    });
  }
  const rawInvalid = Array.isArray(normalizedRecord.invalid) ? normalizedRecord.invalid : [];
  for (const entry of rawInvalid) {
    if (!entry || typeof entry !== "object") continue;
    const entryRecord = entry as Record<string, unknown>;
    const value = toTrimmedString(entryRecord.value);
    invalid.push({
      index: toFiniteNumberOrNull(entryRecord.index) ?? invalid.length,
      value,
      reason: toTrimmedString(entryRecord.reason) || "Unparseable allowlist entry.",
    });
  }
  accepted =
    toFiniteNumberOrNull(normalizedRecord.accepted) ??
    entries.length;
  rejected =
    toFiniteNumberOrNull(normalizedRecord.rejected) ??
    invalid.length;
  truncated = normalizedRecord.truncated === true;

  const decisionRecord =
    record.decision && typeof record.decision === "object"
      ? (record.decision as Record<string, unknown>)
      : {};
  return {
    normalized: {
      entries,
      invalid,
      accepted,
      rejected,
      truncated,
      version: toIsoStringOrNull(normalizedRecord.version),
    },
    decision: {
      allowed: decisionRecord.allowed === true,
      matchedBy: pickAllowlistMatchKind(decisionRecord.matchedBy),
      matchedEntry: toIsoStringOrNull(decisionRecord.matchedEntry),
      reason: toTrimmedString(decisionRecord.reason),
    },
  };
}

/* ------------------------------------------------------------------ */
/* Demo mode (UI-STANDARD 17) - sample data, never fake primary state  */
/* ------------------------------------------------------------------ */

/**
 * Demo rotation schedule over five fixture credentials (ids/providers only,
 * no secret material): one overdue Slack OAuth token, one AWS key due soon,
 * one Datadog key due today, one healthy GitHub PAT and one legacy agent
 * key that was never rotated. All dates derive from DEMO_VAULT_BASE_DATE.
 */
export function buildDemoRotationScheduleResult(): RotationScheduleResult {
  const at = (days: number): string =>
    new Date(DEMO_VAULT_BASE_DATE.getTime() + days * DAY_MS).toISOString();
  const items: RotationScheduleItem[] = [
    {
      id: "cred-slack-bot-oauth",
      provider: "slack",
      intervalDays: 90,
      lastRotatedAt: at(-200),
      dueAt: at(-110),
      status: "overdue",
      daysUntil: -110,
      daysOverdue: 110,
    },
    {
      id: "cred-aws-collector-key",
      provider: "aws",
      intervalDays: 90,
      lastRotatedAt: at(-82),
      dueAt: at(8),
      status: "due-soon",
      daysUntil: 8,
      daysOverdue: null,
    },
    {
      id: "cred-datadog-api",
      provider: "datadog",
      intervalDays: 90,
      lastRotatedAt: at(-90),
      dueAt: at(0),
      status: "due",
      daysUntil: 0,
      daysOverdue: null,
    },
    {
      id: "cred-github-pat",
      provider: "github",
      intervalDays: 180,
      lastRotatedAt: at(-10),
      dueAt: at(170),
      status: "ok",
      daysUntil: 170,
      daysOverdue: null,
    },
    {
      id: "cred-legacy-agent",
      provider: "internal",
      intervalDays: 90,
      lastRotatedAt: null,
      dueAt: null,
      status: "never",
      daysUntil: null,
      daysOverdue: null,
    },
  ];
  return {
    generatedAt: DEMO_VAULT_BASE_DATE.toISOString(),
    policyVersion: "demo-rotation-policy-v1",
    items,
    summary: {
      total: items.length,
      ok: 1,
      dueSoon: 1,
      due: 1,
      overdue: 1,
      never: 1,
      nextDueAt: at(0),
    },
  };
}

/**
 * Demo expiry check mirroring the same fixtures: GitHub PAT valid for ~5
 * months, a wildcard TLS cert expiring within the warning window, an SMTP
 * relay password already expired, an API key without any expiry and the
 * revoked legacy key counted as inactive.
 */
export function buildDemoExpiryCheckResult(): ExpiryCheckResult {
  const at = (days: number): string =>
    new Date(DEMO_VAULT_BASE_DATE.getTime() + days * DAY_MS).toISOString();
  const items: ExpiryCheckItem[] = [
    {
      id: "cred-github-pat",
      provider: "github",
      declaredStatus: "active",
      expiryAt: at(150),
      status: "valid",
      daysUntil: 150,
    },
    {
      id: "cert-demo-wildcard",
      provider: "tls-cert",
      declaredStatus: "active",
      expiryAt: at(12),
      status: "expiring",
      daysUntil: 12,
    },
    {
      id: "cred-smtp-relay",
      provider: "smtp",
      declaredStatus: "active",
      expiryAt: at(-30),
      status: "expired",
      daysUntil: -30,
    },
    {
      id: "cred-collector-api",
      provider: "internal",
      declaredStatus: "active",
      expiryAt: null,
      status: "no-expiry",
      daysUntil: null,
    },
    {
      id: "cred-legacy-agent",
      provider: "internal",
      declaredStatus: "revoked",
      expiryAt: null,
      status: "inactive",
      daysUntil: null,
    },
  ];
  return {
    generatedAt: DEMO_VAULT_BASE_DATE.toISOString(),
    policyVersion: "demo-expiry-policy-v1",
    items,
    summary: {
      total: items.length,
      valid: 1,
      expiring: 1,
      expired: 1,
      noExpiry: 1,
      inactive: 1,
      soonestExpiry: at(12),
      coverageRate: 75,
    },
  };
}

/**
 * Demo allowlist evaluation: RFC 5737 / RFC 1918 documentation addresses
 * only (no real-looking network data). The evaluated IP falls inside the
 * 10/8 CIDR entry, so the demo verdict is "allowed via cidr".
 */
export function buildDemoAllowlistEvaluateResult(): AllowlistEvaluateResult {
  const entries: AllowlistNormalizedEntry[] = [
    { value: "10.0.0.0/8", label: "10.0.0.0/8", kind: "cidr" },
    { value: "192.168.1.*", label: "192.168.1.*", kind: "wildcard" },
    { value: "203.0.113.7", label: "203.0.113.7", kind: "exact" },
  ];
  return {
    normalized: {
      entries,
      invalid: [],
      accepted: entries.length,
      rejected: 0,
      truncated: false,
      version: "demo-allowlist-v1",
    },
    decision: {
      allowed: true,
      matchedBy: "cidr",
      matchedEntry: "10.0.0.0/8",
      reason: "IP 10.42.7.15 is contained in CIDR entry 10.0.0.0/8.",
    },
  };
}

/* ------------------------------------------------------------------ */
/* Local allowlist evaluator - powers demo mode when the live          */
/* allowlistEvaluate endpoint is not available yet                     */
/* ------------------------------------------------------------------ */

/** Parse a dotted IPv4 into a uint32; null when not a valid IPv4. */
function ipv4ToUint32(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let out = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255) return null;
    out = out * 256 + octet;
  }
  return out >>> 0;
}

function isValidIpv4(ip: string): boolean {
  return ipv4ToUint32(ip) !== null;
}

/** True when `ip` (as uint32) falls inside `a.b.c.d/prefix`. */
function cidrContainsIp(cidr: string, ipUint: number): boolean {
  const slashIndex = cidr.indexOf("/");
  if (slashIndex < 0) return false;
  const base = ipv4ToUint32(cidr.slice(0, slashIndex));
  const prefix = Number(cidr.slice(slashIndex + 1));
  if (base === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;
  if (prefix === 0) return true;
  const mask = (0xffffffff << (32 - prefix)) >>> 0;
  return ((base ^ ipUint) & mask) === 0;
}

/** True when every dot-token of `pattern` is "*" or equal to the IP token. */
function wildcardMatchesIp(pattern: string, ip: string): boolean {
  const patternTokens = pattern.split(".");
  const ipTokens = ip.split(".");
  if (patternTokens.length !== 4 || ipTokens.length !== 4) return false;
  return patternTokens.every(
    (token, index) => token === "*" || token === ipTokens[index]
  );
}

/**
 * Client-side mirror of the allowlistEvaluate contract used for demo mode
 * and offline previews. Exact entries win over CIDR, CIDR over wildcard;
 * anything else is denied. Never use this for enforcement - it exists so
 * the panel can demonstrate the contract before the endpoint lands.
 */
export function evaluateAllowlistLocally(ip: string, entries: string[]): AllowlistEvaluateResult {
  const normalizedEntries: AllowlistNormalizedEntry[] = [];
  const invalid: AllowlistInvalidEntry[] = [];

  entries.forEach((rawValue, index) => {
    const value = rawValue.trim();
    if (!value) return;
    if (value.includes("/")) {
      const [addr, prefixRaw] = value.split("/");
      if (isValidIpv4(addr) && /^\d{1,2}$/.test(prefixRaw) && Number(prefixRaw) <= 32) {
        normalizedEntries.push({ value, label: value, kind: "cidr" });
        return;
      }
      invalid.push({ index, value, reason: "CIDR entries must look like 10.0.0.0/8." });
      return;
    }
    if (value.includes("*")) {
      const tokens = value.split(".");
      const okWildcard =
        tokens.length === 4 &&
        tokens.every((token) => token === "*" || /^\d{1,3}$/.test(token));
      if (okWildcard) {
        normalizedEntries.push({ value, label: value, kind: "wildcard" });
        return;
      }
      invalid.push({
        index,
        value,
        reason: "Wildcard entries must have four dot-separated octet tokens, e.g. 192.168.1.*.",
      });
      return;
    }
    if (/^[A-Za-z0-9._:-]+$/.test(value)) {
      normalizedEntries.push({ value, label: value, kind: "exact" });
      return;
    }
    invalid.push({
      index,
      value,
      reason: "Entries may only contain letters, digits, dots, underscores, colons and dashes.",
    });
  });

  const trimmedIp = ip.trim();
  const ipUint = isValidIpv4(trimmedIp) ? ipv4ToUint32(trimmedIp) : null;

  const exactHit = normalizedEntries.find(
    (entry) => entry.kind === "exact" && entry.value === trimmedIp
  );
  const cidrHit =
    ipUint !== null
      ? normalizedEntries.find(
          (entry) => entry.kind === "cidr" && cidrContainsIp(entry.value, ipUint)
        )
      : undefined;
  const wildcardHit =
    isValidIpv4(trimmedIp) &&
    normalizedEntries.find(
      (entry) => entry.kind === "wildcard" && wildcardMatchesIp(entry.value, trimmedIp)
    );

  const hit = exactHit ?? cidrHit ?? wildcardHit;
  const decision: AllowlistDecision = hit
    ? {
        allowed: true,
        matchedBy: hit.kind,
        matchedEntry: hit.value,
        reason:
          hit.kind === "exact"
            ? `IP ${trimmedIp} matched exact entry ${hit.value}.`
            : hit.kind === "cidr"
              ? `IP ${trimmedIp} is contained in CIDR entry ${hit.value}.`
              : `IP ${trimmedIp} matches wildcard pattern ${hit.value}.`,
      }
    : {
        allowed: false,
        matchedBy: null,
        matchedEntry: null,
        reason: `IP ${trimmedIp || "(none)"} does not match any allowlist entry.`,
      };

  return {
    normalized: {
      entries: normalizedEntries,
      invalid,
      accepted: normalizedEntries.length,
      rejected: invalid.length,
      truncated: false,
      version: "local-eval-v1",
    },
    decision,
  };
}
