/**
 * Credential Vault Security — live panels (cycle 31)
 * ==================================================
 * "Credential Vault Security" section rendered on Settings → Security
 * (`pages/settings/SecuritySettings.tsx`).
 *
 * Data source: typed contract layer `pages/security/credentialVaultApi.ts`
 * wrapping the `credentialVault.*` tRPC procedures
 * (`createCredentialVaultRouter`: status, policyCheck, rateLimitCheck,
 * auditVerify, selfTest). On a successful `status` the section shows live
 * vault capability data — cipher (aes-256-gcm), KDF (scrypt), envelope
 * format (cosv1), two-factor requirement and the fixed 8-item security
 * checklist with implemented states.
 *
 * UI-STANDARD compliance:
 *  - sec.16.2 graceful degradation: while loading, content is replaced 1:1
 *    by Skeletons; on error an EmptyState ("Connect the credentialVault.*
 *    API") renders — no spinner-forever, no crash.
 *  - sec.16.3 / sec.17 demo mode: off by default, gated behind the header
 *    "Demo data" switch or the EmptyState CTA; sample data lives in the API
 *    module and always loses to a live payload; a persistent amber banner
 *    labels every demo render.
 *  - sec.2 token purity: token-only colors (`text-foreground`,
 *    `bg-muted`, `border-border`, status Badge variants), dark-mode safe,
 *    no raw slate/gray/white/indigo surface tokens.
 *
 * Cycle 37 adds three lifecycle sections over the same contract layer:
 * rotation schedule (credentialVault.rotationSchedule), expiration
 * policies (credentialVault.expiryCheck) and IP allowlist evaluation
 * (credentialVault.allowlistEvaluate) - identical degradation, skeleton,
 * EmptyState and demo-banner rules as the status panel above.
 */

import { useState } from "react";
import {
  CalendarClock,
  CircleDashed,
  FlaskConical,
  Hourglass,
  KeyRound,
  Network,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { Button } from "@complianceos/ui/ui/button";
import { Input } from "@complianceos/ui/ui/input";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { EmptyState } from "@complianceos/ui/ui/EmptyState";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { Switch } from "@complianceos/ui/ui/switch";
import {
  buildDemoAllowlistEvaluateResult,
  buildDemoCredentialVaultStatus,
  buildDemoExpiryCheckResult,
  buildDemoRotationScheduleResult,
  checklistItemStateMeta,
  countImplementedChecks,
  coverageBarClass,
  CRYPTO_CHIP_ORDER,
  cryptoChipValue,
  evaluateAllowlistLocally,
  EXPIRY_STATE_META,
  formatCryptoValue,
  formatRelativeDays,
  formatVaultTimestamp,
  implementedCoveragePct,
  isEmptyExpiryCheckResult,
  isEmptyRotationScheduleResult,
  normalizeAllowlistEvaluateResult,
  normalizeExpiryCheckResult,
  normalizeRotationScheduleResult,
  normalizeVaultStatus,
  ROTATION_BAND_META,
  twoFactorBadgeMeta,
  useCredentialVaultAllowlistEvaluate,
  useCredentialVaultExpiryCheck,
  useCredentialVaultRotationSchedule,
  useCredentialVaultStatus,
  vaultAvailabilityMeta,
  type AllowlistEvaluateResult,
  type CredentialVaultStatusResult,
  type ExpiryCheckResult,
  type RotationScheduleResult,
  type VaultBadgeVariant,
} from "./credentialVaultApi";

export function CredentialVaultSecuritySection({ clientId }: { clientId: number }) {
  const [demoMode, setDemoMode] = useState(false);
  const statusQuery = useCredentialVaultStatus();

  const live = statusQuery.data ? normalizeVaultStatus(statusQuery.data) : null;
  const isLoading = !live && statusQuery.isLoading;
  /** Error + no data → degraded EmptyState (UI-STANDARD 16.2). */
  const isDegraded = !live && statusQuery.isError;
  /** Demo view only when the live endpoint has not delivered yet (17). */
  const showDemo = !live && demoMode;
  const view: CredentialVaultStatusResult | null =
    live ?? (showDemo ? buildDemoCredentialVaultStatus() : null);

  const implementedCount = view ? countImplementedChecks(view.checklist) : 0;
  const coveragePct = view ? implementedCoveragePct(view.checklist) : 0;
  const updatedAtLabel = view ? formatVaultTimestamp(view.updatedAt) : null;
  const lastRotatedLabel = view ? formatVaultTimestamp(view.lastRotatedAt) : null;

  const headerPill: { label: string; badgeVariant: VaultBadgeVariant } = live
    ? vaultAvailabilityMeta(live.available)
    : showDemo
      ? { label: "Demo data", badgeVariant: "warning" }
      : isLoading
        ? { label: "Syncing…", badgeVariant: "outline" }
        : { label: "API pending", badgeVariant: "outline" };

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary shrink-0" />
            Credential Vault Security
          </CardTitle>
          <CardDescription>
            Cipher, key derivation, envelope format and control posture of the workspace credential
            vault.
          </CardDescription>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Badge variant={headerPill.badgeVariant} className="text-xs">
            {headerPill.label}
          </Badge>
          <label className="flex cursor-pointer select-none items-center gap-2 text-sm font-medium text-muted-foreground">
            <FlaskConical className="h-4 w-4" />
            Demo data
            <Switch
              checked={demoMode}
              onCheckedChange={setDemoMode}
              aria-label="Toggle demo data"
            />
          </label>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Demo banner - persistent while sample data is shown (UI-STANDARD 17) */}
        {showDemo && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            <FlaskConical className="h-4 w-4 shrink-0" />
            <span>
              <strong>Demo mode:</strong> showing sample data. Connect the{" "}
              <code className="text-xs">credentialVault.*</code> APIs to see live vault telemetry.
            </span>
          </div>
        )}

        {isLoading ? (
          /* Loading skeleton - replaces content 1:1 (UI-STANDARD 13) */
          <div className="space-y-4" aria-hidden="true">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((index) => (
                <Skeleton key={index} className="h-16 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
            <div className="grid gap-3 sm:grid-cols-2">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 rounded-lg border border-border p-3"
                >
                  <Skeleton className="h-8 w-8 shrink-0 rounded-md" />
                  <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-full max-w-[220px]" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : isDegraded && !view ? (
          /* Degraded - endpoint not live yet (UI-STANDARD 16.2) */
          <EmptyState
            icon={KeyRound}
            title="Connect the credentialVault.status API"
            description="Live vault capability metrics land with packages/core/src/server/routers/credentialVault.ts this cycle. Preview the panel with sample data meanwhile."
            action={{ label: "Preview with Demo Data", onClick: () => setDemoMode(true) }}
          />
        ) : view ? (
          <>
            {/* Summary pills */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={vaultAvailabilityMeta(view.available).badgeVariant} className="text-xs">
                {vaultAvailabilityMeta(view.available).label}
              </Badge>
              <Badge variant={twoFactorBadgeMeta(view.twoFactorRequired).badgeVariant} className="text-xs">
                {twoFactorBadgeMeta(view.twoFactorRequired).label}
              </Badge>
              <Badge variant="secondary" className="text-xs tabular-nums">
                {implementedCount}/{view.checklist.length || 8} controls implemented
              </Badge>
            </div>

            {/* Checklist coverage bar */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${coverageBarClass(coveragePct)}`}
                style={{ width: `${Math.min(100, Math.max(0, coveragePct))}%` }}
              />
            </div>

            {/* Crypto capability chips + 2FA */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {CRYPTO_CHIP_ORDER.map((chip) => (
                <div key={chip.key} className="rounded-lg border border-border bg-muted/20 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {chip.label}
                  </p>
                  <p className="mt-1 font-mono text-sm font-semibold text-foreground break-all">
                    {formatCryptoValue(cryptoChipValue(view, chip.key))}
                  </p>
                </div>
              ))}
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Two-factor unlock
                </p>
                <p className="mt-1 font-mono text-sm font-semibold text-foreground">
                  {view.twoFactorRequired ? "Required" : "Optional"}
                </p>
              </div>
            </div>

            {/* 8-item security checklist with implemented states */}
            <div className="grid gap-3 sm:grid-cols-2">
              {view.checklist.map((item) => {
                const state = checklistItemStateMeta(item);
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 rounded-lg border border-border bg-muted/20 p-3"
                  >
                    <div
                      className={`rounded-md border border-border p-2 shrink-0 ${
                        item.implemented
                          ? "bg-[var(--success-bg)]"
                          : "bg-background"
                      }`}
                    >
                      {item.implemented ? (
                        <ShieldCheck className="h-4 w-4 text-[var(--success-foreground)]" />
                      ) : (
                        <CircleDashed className="h-4 w-4 text-[var(--warning-foreground)]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-foreground">{item.label}</p>
                        <Badge variant={state.badgeVariant} className="shrink-0 text-xs">
                          {state.label}
                        </Badge>
                      </div>
                      {item.description && (
                        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Snapshot footer */}
            {(updatedAtLabel || lastRotatedLabel) && (
              <p className="text-xs text-muted-foreground">
                {updatedAtLabel && <>Status verified {updatedAtLabel}. </>}
                {lastRotatedLabel && <>Last rotation {lastRotatedLabel}.</>}
              </p>
            )}
          </>
        ) : null}

        {clientId <= 0 && (
          <div className="rounded-lg border border-dashed border-border bg-muted/10 p-3 text-xs text-muted-foreground text-center">
            Select a workspace client to scope collector connection metrics to its credentials.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Cycle 37 — lifecycle sections                                       */
/*                                                                     */
/* Shared building blocks below mirror the status panel's structure:   */
/* header pill + demo toggle, persistent amber banner while sample     */
/* data is shown, 1:1 loading skeletons and degraded EmptyStates       */
/* (UI-STANDARD 13/16/17).                                             */
/* ------------------------------------------------------------------ */

/** Small summary tile used by the rotation/expiry sections. */
function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

/** Persistent amber banner shown whenever a section renders demo data. */
function VaultDemoBanner({ context }: { context: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
      <FlaskConical className="h-4 w-4 shrink-0" />
      <span>
        <strong>Demo mode:</strong> showing sample data. Connect the{" "}
        <code className="text-xs">{context}</code> API to see live telemetry.
      </span>
    </div>
  );
}

/** Header pill shared by the three lifecycle sections. */
function lifecyclePill(
  live: boolean,
  showDemo: boolean,
  isLoading: boolean
): { label: string; badgeVariant: VaultBadgeVariant } {
  if (live) return { label: "Live", badgeVariant: "success" };
  if (showDemo) return { label: "Demo data", badgeVariant: "warning" };
  if (isLoading) return { label: "Syncing…", badgeVariant: "outline" };
  return { label: "API pending", badgeVariant: "outline" };
}

/** Demo-data switch reused by the lifecycle section headers. */
function VaultDemoToggle({
  demoMode,
  onToggle,
}: {
  demoMode: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer select-none items-center gap-2 text-sm font-medium text-muted-foreground">
      <FlaskConical className="h-4 w-4" />
      Demo data
      <Switch checked={demoMode} onCheckedChange={onToggle} aria-label="Toggle demo data" />
    </label>
  );
}

/**
 * "Credential rotation schedule" - per-credential cadence bands over
 * credentialVault.rotationSchedule with policy-driven ok/due-soon/due/
 * overdue/never tiles and a schedule table.
 */
export function CredentialRotationScheduleSection() {
  const [demoMode, setDemoMode] = useState(false);
  const scheduleQuery = useCredentialVaultRotationSchedule();

  const live = scheduleQuery.data
    ? normalizeRotationScheduleResult(scheduleQuery.data)
    : null;
  const isLoading = !live && scheduleQuery.isLoading;
  const isDegraded = !live && scheduleQuery.isError;
  const showDemo = !live && demoMode;
  const view: RotationScheduleResult | null =
    live ?? (showDemo ? buildDemoRotationScheduleResult() : null);
  const pill = lifecyclePill(live !== null, showDemo, isLoading);
  const isEmpty = view !== null && isEmptyRotationScheduleResult(view);

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary shrink-0" />
            Credential rotation schedule
          </CardTitle>
          <CardDescription>
            Rotation windows per credential against the workspace rotation policy.
          </CardDescription>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Badge variant={pill.badgeVariant} className="text-xs">
            {pill.label}
          </Badge>
          <VaultDemoToggle demoMode={demoMode} onToggle={setDemoMode} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showDemo && <VaultDemoBanner context="credentialVault.rotationSchedule" />}

        {isLoading ? (
          /* Loading skeleton - replaces content 1:1 (UI-STANDARD 13) */
          <div className="space-y-4" aria-hidden="true">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <Skeleton key={index} className="h-16 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : isDegraded && !view ? (
          /* Degraded - endpoint not live yet (UI-STANDARD 16.2) */
          <EmptyState
            icon={CalendarClock}
            title="Connect the credentialVault.rotationSchedule API"
            description="Rotation bands land with packages/core/src/server/routers/credentialVault.ts this cycle. Preview the panel with sample data meanwhile."
            action={{ label: "Preview with Demo Data", onClick: () => setDemoMode(true) }}
          />
        ) : isEmpty ? (
          <EmptyState
            icon={KeyRound}
            title="No credentials tracked yet"
            description="Once secrets are stored in the vault their rotation windows appear here automatically."
          />
        ) : view ? (
          <>
            {/* Summary tiles */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatTile label="OK" value={view.summary.ok} />
              <StatTile label="Due soon" value={view.summary.dueSoon} />
              <StatTile label="Due" value={view.summary.due} />
              <StatTile label="Overdue" value={view.summary.overdue} />
              <StatTile label="Never rotated" value={view.summary.never} />
              <div className="rounded-lg border border-border bg-muted/20 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Next due at
                </p>
                <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
                  {formatVaultTimestamp(view.summary.nextDueAt) ?? "—"}
                </p>
              </div>
            </div>

            {/* Schedule table */}
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="h-12 border-b border-border bg-muted/30">
                    <th className="px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Credential
                    </th>
                    <th className="px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Interval
                    </th>
                    <th className="px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Last rotated
                    </th>
                    <th className="px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Due at
                    </th>
                    <th className="px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Days
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {view.items.map((item) => {
                    const meta = ROTATION_BAND_META[item.status];
                    const relDays =
                      item.status === "overdue" && item.daysOverdue != null
                        ? -item.daysOverdue
                        : item.daysUntil;
                    return (
                      <tr
                        key={item.id}
                        className="border-b border-border last:border-b-0 hover:bg-muted/50"
                      >
                        <td className="p-4">
                          <p className="font-semibold text-foreground">{item.provider}</p>
                          <p className="font-mono text-xs text-muted-foreground break-all">
                            {item.id}
                          </p>
                        </td>
                        <td className="p-4 tabular-nums text-foreground/70">
                          {item.intervalDays != null ? `${item.intervalDays} d` : "—"}
                        </td>
                        <td className="p-4 tabular-nums whitespace-nowrap text-foreground/70">
                          {formatVaultTimestamp(item.lastRotatedAt) ?? "Never"}
                        </td>
                        <td className="p-4 tabular-nums whitespace-nowrap text-foreground/70">
                          {formatVaultTimestamp(item.dueAt) ?? "—"}
                        </td>
                        <td className="p-4">
                          <Badge variant={meta.badgeVariant} className="text-xs">
                            {meta.label}
                          </Badge>
                        </td>
                        <td className="p-4 text-right tabular-nums whitespace-nowrap text-foreground/70">
                          {formatRelativeDays(relDays)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-muted-foreground">
              Schedule generated {formatVaultTimestamp(view.generatedAt) ?? "—"}
              {view.policyVersion ? ` · policy ${view.policyVersion}` : ""}.
            </p>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * "Credential expiration policies" - expiry outlook over
 * credentialVault.expiryCheck with a coverage bar, state tiles and a
 * compact expiry table.
 */
export function CredentialExpirationPoliciesSection() {
  const [demoMode, setDemoMode] = useState(false);
  const expiryQuery = useCredentialVaultExpiryCheck();

  const live = expiryQuery.data ? normalizeExpiryCheckResult(expiryQuery.data) : null;
  const isLoading = !live && expiryQuery.isLoading;
  const isDegraded = !live && expiryQuery.isError;
  const showDemo = !live && demoMode;
  const view: ExpiryCheckResult | null =
    live ?? (showDemo ? buildDemoExpiryCheckResult() : null);
  const pill = lifecyclePill(live !== null, showDemo, isLoading);
  const isEmpty = view !== null && isEmptyExpiryCheckResult(view);
  const coveragePct =
    view != null
      ? Math.min(100, Math.max(0, Math.round(view.summary.coverageRate)))
      : 0;

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Hourglass className="h-5 w-5 text-primary shrink-0" />
            Credential expiration policies
          </CardTitle>
          <CardDescription>
            Declared expiries across vault credentials with warning-window states.
          </CardDescription>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Badge variant={pill.badgeVariant} className="text-xs">
            {pill.label}
          </Badge>
          <VaultDemoToggle demoMode={demoMode} onToggle={setDemoMode} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showDemo && <VaultDemoBanner context="credentialVault.expiryCheck" />}

        {isLoading ? (
          /* Loading skeleton - replaces content 1:1 (UI-STANDARD 13) */
          <div className="space-y-4" aria-hidden="true">
            <Skeleton className="h-1.5 w-full rounded-full" />
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[0, 1, 2, 3, 4].map((index) => (
                <Skeleton key={index} className="h-16 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        ) : isDegraded && !view ? (
          /* Degraded - endpoint not live yet (UI-STANDARD 16.2) */
          <EmptyState
            icon={Hourglass}
            title="Connect the credentialVault.expiryCheck API"
            description="Expiration states land with packages/core/src/server/routers/credentialVault.ts this cycle. Preview the panel with sample data meanwhile."
            action={{ label: "Preview with Demo Data", onClick: () => setDemoMode(true) }}
          />
        ) : isEmpty ? (
          <EmptyState
            icon={KeyRound}
            title="No expiration data yet"
            description="Store credentials with declared expiries to track their validity here."
          />
        ) : view ? (
          <>
            {/* Coverage bar */}
            <div className="space-y-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full ${coverageBarClass(coveragePct)}`}
                  style={{ width: `${coveragePct}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {coveragePct}% of active credentials declare an expiry window.
              </p>
            </div>

            {/* State tiles */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <StatTile label="Valid" value={view.summary.valid} />
              <StatTile label="Expiring" value={view.summary.expiring} />
              <StatTile label="Expired" value={view.summary.expired} />
              <StatTile label="No expiry" value={view.summary.noExpiry} />
              <StatTile label="Inactive" value={view.summary.inactive} />
            </div>

            {/* Compact expiry table */}
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="h-12 border-b border-border bg-muted/30">
                    <th className="px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Credential
                    </th>
                    <th className="px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Declared status
                    </th>
                    <th className="px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Expires at
                    </th>
                    <th className="px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      State
                    </th>
                    <th className="px-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Days
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {view.items.map((item) => {
                    const meta = EXPIRY_STATE_META[item.status];
                    return (
                      <tr
                        key={item.id}
                        className="border-b border-border last:border-b-0 hover:bg-muted/50"
                      >
                        <td className="p-4">
                          <p className="font-semibold text-foreground">{item.provider}</p>
                          <p className="font-mono text-xs text-muted-foreground break-all">
                            {item.id}
                          </p>
                        </td>
                        <td className="p-4 font-mono text-xs text-foreground/70">
                          {item.declaredStatus ?? "—"}
                        </td>
                        <td className="p-4 tabular-nums whitespace-nowrap text-foreground/70">
                          {formatVaultTimestamp(item.expiryAt) ?? "—"}
                        </td>
                        <td className="p-4">
                          <Badge variant={meta.badgeVariant} className="text-xs">
                            {meta.label}
                          </Badge>
                        </td>
                        <td className="p-4 text-right tabular-nums whitespace-nowrap text-foreground/70">
                          {formatRelativeDays(item.daysUntil)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer line */}
            <p className="text-xs text-muted-foreground">
              {view.summary.soonestExpiry
                ? `Soonest expiry: ${formatVaultTimestamp(view.summary.soonestExpiry)}.`
                : "No scheduled expiries."}
            </p>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

/**
 * "IP allowlist evaluation" - evaluator card driving
 * credentialVault.allowlistEvaluate; falls back to the local sample
 * evaluator while the endpoint is not live (demo mode only).
 */
export function IpAllowlistEvaluationSection() {
  const [demoMode, setDemoMode] = useState(false);
  const [draftIp, setDraftIp] = useState("10.42.7.15");
  const [draftEntriesText, setDraftEntriesText] = useState(
    "10.0.0.0/8\n192.168.1.*\n203.0.113.7"
  );
  const [submitted, setSubmitted] = useState<{ ip: string; entries: string[] } | null>(null);

  const evalQuery = useCredentialVaultAllowlistEvaluate(
    submitted?.ip ?? null,
    submitted?.entries ?? null
  );

  const live = evalQuery.data ? normalizeAllowlistEvaluateResult(evalQuery.data) : null;
  const isLoading = submitted !== null && !live && evalQuery.isLoading;
  const isDegraded = submitted !== null && !live && evalQuery.isError;
  const showDemo = !live && demoMode;
  const view: AllowlistEvaluateResult | null = live
    ? live
    : showDemo
      ? submitted
        ? evaluateAllowlistLocally(submitted.ip, submitted.entries)
        : buildDemoAllowlistEvaluateResult()
      : null;
  const pill = lifecyclePill(live !== null, showDemo, isLoading);

  /** Split the textarea into trimmed candidate entries (newline/comma). */
  const parseEntries = (text: string): string[] =>
    text
      .split(/[\n,]+/)
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0);

  const handleEvaluate = () => {
    setSubmitted({ ip: draftIp.trim(), entries: parseEntries(draftEntriesText) });
  };

  const decision = view?.decision;
  const allowed = decision?.allowed === true;

  return (
    <Card>
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5 text-primary shrink-0" />
            IP allowlist evaluation
          </CardTitle>
          <CardDescription>
            Test an IP against candidate collector allowlist entries (exact, CIDR, wildcard).
          </CardDescription>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Badge variant={pill.badgeVariant} className="text-xs">
            {pill.label}
          </Badge>
          <VaultDemoToggle demoMode={demoMode} onToggle={setDemoMode} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showDemo && <VaultDemoBanner context="credentialVault.allowlistEvaluate" />}

        {/* Evaluator form */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="vault-allowlist-ip"
              className="text-sm font-medium text-foreground"
            >
              IP under test
            </label>
            <Input
              id="vault-allowlist-ip"
              value={draftIp}
              onChange={(event) => setDraftIp(event.target.value)}
              placeholder="203.0.113.42"
              spellCheck={false}
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="vault-allowlist-entries"
              className="text-sm font-medium text-foreground"
            >
              Allowlist entries (newline or comma separated)
            </label>
            <Textarea
              id="vault-allowlist-entries"
              rows={3}
              value={draftEntriesText}
              onChange={(event) => setDraftEntriesText(event.target.value)}
              placeholder={"10.0.0.0/8\n192.168.1.*\n203.0.113.7"}
              spellCheck={false}
              className="font-mono text-xs"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" size="sm" onClick={handleEvaluate} disabled={!draftIp.trim()}>
            Evaluate
          </Button>
          <p className="text-xs text-muted-foreground">
            Runs against credentialVault.allowlistEvaluate when live; otherwise the sample
            evaluator mirrors the same contract.
          </p>
        </div>

        {isLoading ? (
          /* Loading skeleton while the evaluation request is in flight */
          <Skeleton className="h-16 w-full rounded-xl" aria-hidden="true" />
        ) : isDegraded && !view ? (
          /* Degraded - endpoint not live yet (UI-STANDARD 16.2) */
          <EmptyState
            icon={Network}
            title="Connect the credentialVault.allowlistEvaluate API"
            description="Live allowlist evaluation lands with packages/core/src/server/routers/credentialVault.ts this cycle. Preview the evaluator with sample data meanwhile."
            action={{ label: "Preview with Demo Data", onClick: () => setDemoMode(true) }}
          />
        ) : view && decision ? (
          <>
            {/* Verdict banner */}
            <div
              role="status"
              className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
                allowed
                  ? "border-[var(--success-foreground)]/30 bg-[var(--success-bg)] text-[var(--success-foreground)]"
                  : "border-[var(--error-foreground)]/30 bg-[var(--error-bg)] text-[var(--error-foreground)]"
              }`}
            >
              {allowed ? (
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
              ) : (
                <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="font-semibold">{allowed ? "Allowed" : "Denied"}</p>
                <p className="mt-0.5 text-xs leading-relaxed break-words">
                  {decision.reason || "No evaluation reason returned."}
                  {decision.matchedBy && decision.matchedEntry && (
                    <>
                      {" "}
                      Matched <span className="font-mono">{decision.matchedEntry}</span> (
                      {decision.matchedBy}).
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Normalized-entry chips */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Normalized entries
              </p>
              {view.normalized.entries.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {view.normalized.entries.map((entry) => (
                    <span
                      key={`${entry.kind}:${entry.value}`}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-0.5 text-xs"
                    >
                      <span className="font-mono text-foreground">{entry.value}</span>
                      <span className="text-muted-foreground">· {entry.kind}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No parseable entries.</p>
              )}
              <p className="text-xs tabular-nums text-muted-foreground">
                {view.normalized.accepted} accepted · {view.normalized.rejected} rejected
                {view.normalized.truncated ? " · entry list truncated" : ""}
              </p>
            </div>

            {/* Invalid-entry list with reasons */}
            {view.normalized.invalid.length > 0 && (
              <div className="space-y-1 rounded-lg border border-dashed border-border bg-muted/10 p-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Rejected entries
                </p>
                <ul className="space-y-1">
                  {view.normalized.invalid.map((entry, index) => (
                    <li key={`${entry.index}-${index}`} className="text-xs leading-relaxed">
                      <span className="font-mono text-destructive">{entry.value}</span>{" "}
                      <span className="text-muted-foreground">— {entry.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-muted/10 p-3 text-xs text-muted-foreground text-center">
            Set the IP under test and candidate entries above, then run Evaluate.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
