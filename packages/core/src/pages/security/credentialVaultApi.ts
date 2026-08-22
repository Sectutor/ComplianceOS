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
