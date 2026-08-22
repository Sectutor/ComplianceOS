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
 */

import { useState } from "react";
import { CircleDashed, FlaskConical, KeyRound, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { EmptyState } from "@complianceos/ui/ui/EmptyState";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { Switch } from "@complianceos/ui/ui/switch";
import {
  buildDemoCredentialVaultStatus,
  checklistItemStateMeta,
  countImplementedChecks,
  coverageBarClass,
  CRYPTO_CHIP_ORDER,
  cryptoChipValue,
  formatCryptoValue,
  formatVaultTimestamp,
  implementedCoveragePct,
  normalizeVaultStatus,
  twoFactorBadgeMeta,
  useCredentialVaultStatus,
  vaultAvailabilityMeta,
  type CredentialVaultStatusResult,
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
