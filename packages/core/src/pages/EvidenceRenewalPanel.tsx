/**
 * EvidenceRenewalPanel — "Expiring & Renewal" section for the Evidence page.
 * =========================================================================
 * Lists evidence that is expired or expiring soon with status chips and a
 * "Run renewal now" action that triggers the automated renewal tick.
 *
 * COORDINATION BY CONVENTION (UI-STANDARD.md §16) — built against the on-disk
 * backend contract in `packages/core/src/routers/evidenceRenewal.ts`
 * (`getSummary { horizonDays? }` / `runNow { horizonDays? }`):
 *   - getSummary 404s → derive the view-model from the live
 *     `evidenceExpiry.getStats` endpoint and show a subtle
 *     "Derived from workspace data" badge (§16.4).
 *   - runNow     404s → graceful error toast.
 *   - setConfig is NOT part of the backend router, so the auto-renew toggle
 *     persists to localStorage with a visible note.
 * Never crashes, never spins forever. Token-only styling per UI-STANDARD.md.
 */

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, Calendar, Clock, Loader2, RefreshCw, ShieldCheck, User } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { Button } from "@complianceos/ui/ui/button";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { EmptyState } from "@complianceos/ui/ui/EmptyState";
import { Switch } from "@complianceos/ui/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@complianceos/ui/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  useEvidenceRenewalSummary,
  useEvidenceExpiryStats,
  useRunEvidenceRenewal,
  deriveRenewalSummary,
  type EvidenceRenewalItem,
  type EvidenceRenewalStatus,
  type RenewalRunSummary,
} from "./evidenceRenewalApi";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const STORAGE_KEY_PREFIX = "complianceos:evidence:autoRenew";

function storageKey(clientId: number) {
  return `${STORAGE_KEY_PREFIX}:${clientId}`;
}

function readLocalPref(clientId: number): boolean {
  try {
    return localStorage.getItem(storageKey(clientId)) === "1";
  } catch {
    return false;
  }
}

function formatExpiry(item: EvidenceRenewalItem): string {
  const days = item.daysUntilExpiry;
  if (days <= 0) {
    const ago = Math.abs(days);
    return `expired ${ago === 0 ? "today" : `${ago}d ago`}`;
  }
  if (days < 30) return `expires in ${days}d`;
  if (item.expirationDate) {
    const d = new Date(item.expirationDate);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    }
  }
  return `expires in ${days}d`;
}

function StatusChip({ status }: { status: EvidenceRenewalStatus }) {
  const meta: Record<EvidenceRenewalStatus, { variant: "success" | "warning" | "error"; label: string; dot: string }> = {
    valid: { variant: "success", label: "Valid", dot: "bg-[var(--success)]" },
    "expiring-soon": { variant: "warning", label: "Expiring soon", dot: "bg-[var(--warning)]" },
    expired: { variant: "error", label: "Expired", dot: "bg-[var(--error)]" },
  };
  const m = meta[status];
  return (
    <Badge variant={m.variant} className="gap-1 capitalize whitespace-nowrap">
      <span className={cn("h-1.5 w-1.5 rounded-full", m.dot)} />
      {m.label}
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

interface EvidenceRenewalPanelProps {
  clientId: number;
}

export default function EvidenceRenewalPanel({ clientId }: EvidenceRenewalPanelProps) {
  // Live renewal API (global tick, counts-only) — 404s until the router lands.
  const renewalQuery = useEvidenceRenewalSummary();
  const isLiveSummary = !renewalQuery.isError && !!renewalQuery.data;

  // Item-level source: live evidenceExpiry.getStats (urgentItems). Works today.
  const expiryStatsQuery = useEvidenceExpiryStats(clientId);

  const runMutation = useRunEvidenceRenewal();

  const [autoRenew, setAutoRenew] = useState<boolean>(() => readLocalPref(clientId));
  const [renewing, setRenewing] = useState(false);

  useEffect(() => {
    setAutoRenew(readLocalPref(clientId));
  }, [clientId]);

  const derived = useMemo(() => deriveRenewalSummary(expiryStatsQuery.data as never), [expiryStatsQuery.data]);
  const items = useMemo(() => {
    const source = derived?.items ?? [];
    return [...source].sort((a, b) => {
      if (a.status === "expired" && b.status !== "expired") return -1;
      if (b.status === "expired" && a.status !== "expired") return 1;
      return a.daysUntilExpiry - b.daysUntilExpiry;
    });
  }, [derived]);

  const isDerived = !isLiveSummary && !!derived;
  const isLoading = renewalQuery.isLoading || expiryStatsQuery.isLoading;
  const isError = renewalQuery.isError && expiryStatsQuery.isError;
  const hasData = isLiveSummary || !!derived;

  /* ---- auto-renew toggle (local preference — backend has no setConfig) ---- */

  const handleAutoRenewChange = (checked: boolean) => {
    setAutoRenew(checked);
    try {
      localStorage.setItem(storageKey(clientId), checked ? "1" : "0");
    } catch {
      /* storage unavailable — preference is session-only */
    }
    toast.info(
      checked
        ? "Auto-renew preference saved locally — server-side scheduling arrives with the evidenceRenewal API."
        : "Auto-renew preference saved locally."
    );
  };

  /* ---- run renewal tick ---- */

  const handleRunNow = async () => {
    setRenewing(true);
    try {
      const result: RenewalRunSummary = await runMutation.mutateAsync({});
      if (result.renewedRows > 0) {
        toast.success(`${result.renewedRows} evidence item${result.renewedRows === 1 ? "" : "s"} renewed`);
      } else {
        toast.info(
          result.dueRows === 0
            ? "Nothing due for renewal right now."
            : `No automatic renewals ran (${result.failedRenewals ?? 0} failed, ${result.expiredRows ?? 0} expired).`
        );
      }
      if (result.failedRenewals > 0) {
        toast.warning(`${result.failedRenewals} renewal${result.failedRenewals === 1 ? "" : "s"} failed — review the remediation notes.`);
      }
      if (result.remediationNotes?.length) {
        console.warn("[EvidenceRenewal] remediation notes:", result.remediationNotes);
      }
      renewalQuery.refetch();
      expiryStatsQuery.refetch();
    } catch (err) {
      toast.error(
        `Renewal engine not connected yet — ${(err as { message?: string })?.message ?? "evidenceRenewal.runNow is not live"}`
      );
    } finally {
      setRenewing(false);
    }
  };

  const counts = useMemo(() => {
    if (isLiveSummary && renewalQuery.data) {
      const s = renewalQuery.data;
      return {
        verified: s.verified ?? 0,
        collected: s.collected ?? 0,
        dueForRenewal: s.dueForRenewal ?? 0,
        expired: s.expired ?? 0,
        horizonDays: s.horizonDays,
      };
    }
    return null;
  }, [isLiveSummary, renewalQuery.data]);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              Expiring &amp; Renewal
            </CardTitle>
            {isDerived && (
              <Badge variant="outline" className="text-[10px] font-medium text-muted-foreground border-border">
                Derived from workspace data
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {configNote()}
            <TooltipProvider delayDuration={200}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1.5">
                    <span className="text-xs font-medium text-muted-foreground">Auto-renew</span>
                    <Switch
                      checked={autoRenew}
                      onCheckedChange={handleAutoRenewChange}
                      aria-label="Auto-renew enabled"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {autoRenew
                    ? "Preference saved on this device; server-side scheduling arrives with the evidenceRenewal API."
                    : "Turn on to request automatic renewal of expiring evidence before it lapses."}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <CardDescription>Evidence that is expired or expiring soon — renew before it lapses.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : isError ? (
          <EmptyState
            icon={RefreshCw}
            title="Connect the evidence renewal API"
            description="The evidenceRenewal.* endpoints are not live yet. Expiring and expired evidence will appear here automatically."
          />
        ) : !hasData ? (
          <EmptyState
            icon={ShieldCheck}
            title="No renewal data yet"
            description="Once evidence has expiration dates, items at risk will be tracked here."
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Nothing expiring"
            description="All evidence is valid — nothing needs renewal right now."
          />
        ) : (
          <>
            {/* Summary chips — live renewal API counts when available */}
            <div className="flex flex-wrap items-center gap-2">
              {counts ? (
                <>
                  <Badge variant="success" className="gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
                    {counts.verified} verified
                  </Badge>
                  <Badge variant="info" className="gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--info)]" />
                    {counts.collected} collected
                  </Badge>
                  <Badge variant="warning" className="gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--warning)]" />
                    {counts.dueForRenewal} due for renewal
                  </Badge>
                  <Badge variant="error" className="gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--error)]" />
                    {counts.expired} expired
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-1">horizon {counts.horizonDays}d</span>
                </>
              ) : (
                <>
                  <Badge variant="success" className="gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
                    {derived?.valid ?? 0} valid
                  </Badge>
                  <Badge variant="warning" className="gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--warning)]" />
                    {derived?.expiringSoon ?? 0} expiring soon
                  </Badge>
                  <Badge variant="error" className="gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-[var(--error)]" />
                    {derived?.expired ?? 0} expired
                  </Badge>
                </>
              )}
            </div>

            {/* Renewal list */}
            <ul className="space-y-2">
              {items.map((item) => (
                <li
                  key={`${item.id}-${item.evidenceId}`}
                  className={cn(
                    "flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3.5",
                    item.status === "expired"
                      ? "border-[var(--error-foreground)]/25 bg-[var(--error-bg)]/40"
                      : "border-[var(--warning-foreground)]/25 bg-[var(--warning-bg)]/40"
                  )}
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-foreground/70">{item.evidenceId}</span>
                      <StatusChip status={item.status} />
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatExpiry(item)}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {item.controlName && (
                        <span className="flex items-center gap-1 truncate max-w-[260px]">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          {item.controlName}
                        </span>
                      )}
                      {item.owner && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" /> {item.owner}
                        </span>
                      )}
                      {item.expirationDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(item.expirationDate).toLocaleDateString(undefined, {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Renewal tick action */}
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Runs the automated renewal loop: re-collects evidence from connected sources and flags the rest for
                remediation.
              </p>
              <Button
                size="sm"
                className="shrink-0 gap-1.5"
                disabled={renewing}
                onClick={handleRunNow}
              >
                {renewing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Run renewal now
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  function configNote() {
    if (!autoRenew) return null;
    return (
      <span className="text-[11px] text-muted-foreground hidden sm:inline">
        Saved locally
      </span>
    );
  }
}
