/**
 * NIS2 Third-Party Risk Scoring - panels
 * ======================================
 * Three cards rendering the `thirdPartyRisk.*` contract (see
 * `packages/core/src/pages/thirdPartyRiskApi.ts`):
 *
 *   1. Aggregated supplier risk scorecard  -> thirdPartyRisk.aggregateRisk
 *   2. Supplier security certificate       -> thirdPartyRisk.certificates
 *      tracker
 *   3. Supply chain map summary            -> thirdPartyRisk.supplyChainMap
 *
 * Every card follows UI-STANDARD 16 graceful degradation: skeleton while
 * loading, EmptyState ("Connect the thirdPartyRisk.<proc> API") on error,
 * token-only colors (2) - no raw slate/sky hexes, dark-mode safe. Data-viz
 * tier bars use the documented exception (18) with dark: variants.
 * Demo mode (17) is gated behind the section toggle, off by default, and
 * renders a persistent amber banner whenever sample data is shown.
 */

import React, { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { Button } from "@complianceos/ui/ui/button";
import { EmptyState } from "@complianceos/ui/ui/EmptyState";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  AlertTriangle,
  ArrowRight,
  FileCheck2,
  FlaskConical,
  GitBranch,
  Layers,
  ShieldCheck,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import {
  useAggregateRiskQuery,
  useCertificatesQuery,
  useSupplyChainMapQuery,
  RISK_TIER_META,
  RISK_TIER_ORDER,
  CERT_STATUS_META,
  getVerdictMeta,
  buildDemoAggregateRisk,
  buildDemoAggregateRiskInput,
  buildDemoCertificates,
  buildDemoCertificatesInput,
  buildDemoSupplyChainMap,
  buildDemoSupplyChainMapInput,
  type AggregateRiskInput,
  type AggregateRiskResponse,
  type CertificatesInput,
  type CertificatesResponse,
  type SupplyChainMapInput,
  type SupplyChainMapResponse,
  type ThirdPartyRiskTier,
} from "@/pages/thirdPartyRiskApi";

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

/** Score bar (UI-STANDARD 18) - token colors via .progress-* classes. */
function ScoreBar({
  value,
  barClass,
}: {
  value: number;
  barClass: "progress-success" | "progress-warning" | "progress-error";
}) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", barClass)}>
      <div
        data-slot="progress-indicator"
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

/** Data-viz tier bar fill (UI-STANDARD 18 exception, dark-mode safe). */
const TIER_BAR_FILL: Record<ThirdPartyRiskTier, string> = {
  critical: "bg-red-500 dark:bg-red-400",
  high: "bg-orange-500 dark:bg-orange-400",
  medium: "bg-amber-500 dark:bg-amber-400",
  low: "bg-emerald-500 dark:bg-emerald-400",
};

/** Tier count text accent (semantic tokens, UI-STANDARD 2). */
const TIER_COUNT_TEXT: Record<ThirdPartyRiskTier, string> = {
  critical: "text-[var(--error-foreground)]",
  high: "text-[var(--warning-foreground)]",
  medium: "text-foreground",
  low: "text-[var(--success-foreground)]",
};

interface PanelResultProps {
  isLoading: boolean;
  hasData: boolean;
  isError: boolean;
  procedure: string;
  icon: LucideIcon;
  emptyHint: string;
  /** Optional CTA that flips the section into demo mode (UI-STANDARD 17). */
  onEnableDemo?: () => void;
  /** 1:1 skeleton replacement for this card while loading (UI-STANDARD 13). */
  skeleton: React.ReactNode;
  children: React.ReactNode;
}

/** Degradation helper: skeleton -> EmptyState -> children. */
function PanelResult({
  isLoading,
  hasData,
  isError,
  procedure,
  icon,
  emptyHint,
  onEnableDemo,
  skeleton,
  children,
}: PanelResultProps) {
  if (isLoading && !hasData) {
    return <div className="space-y-3">{skeleton}</div>;
  }
  if (isError || !hasData) {
    return (
      <EmptyState
        icon={icon}
        title={`Connect the ${procedure} API`}
        description={
          isError
            ? `The ${procedure} endpoint is not live yet. It appears once the thirdPartyRisk router is deployed.`
            : emptyHint
        }
        action={onEnableDemo ? { label: "Preview with Demo Data", onClick: onEnableDemo } : undefined}
      />
    );
  }
  return <div className="space-y-3">{children}</div>;
}

interface PanelCardProps {
  clientId: number;
  demoMode: boolean;
  onEnableDemo: () => void;
}

/** Compact stat tile used by the scorecard and certificate summary rows. */
function StatTile({
  label,
  value,
  valueClass = "text-foreground",
}: {
  label: string;
  value: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-center">
      <div className={cn("text-xl font-bold tabular-nums", valueClass)}>{value}</div>
      <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Card 1 - Aggregated supplier risk scorecard                         */
/* ------------------------------------------------------------------ */

export function AggregatedRiskScorecard({ clientId, demoMode, onEnableDemo }: PanelCardProps) {
  const input = useMemo<AggregateRiskInput | null>(
    () => (demoMode ? buildDemoAggregateRiskInput() : null),
    [demoMode]
  );
  const query = useAggregateRiskQuery(clientId, input);
  const data: AggregateRiskResponse | undefined = demoMode
    ? (query.data ?? buildDemoAggregateRisk())
    : query.data;
  const totals = data?.totals;

  return (
    <Card className="rounded-xl shadow-sm border-border h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <Layers className="h-5 w-5 text-muted-foreground" />
          Aggregated supplier risk scorecard
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Art. 21(2)(d) - portfolio residual risk per third-party provider and overall exposure.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PanelResult
          isLoading={query.isLoading}
          hasData={!!data}
          isError={query.isError}
          procedure="thirdPartyRisk.aggregateRisk"
          icon={Layers}
          emptyHint="Enable demo mode to preview the aggregated scoring engine with sample suppliers."
          onEnableDemo={onEnableDemo}
          skeleton={
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
                ))}
              </div>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2 border-t border-border pt-3">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              ))}
            </>
          }
        >
          {data && totals ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                <StatTile label="Suppliers" value={totals.count} />
                <StatTile
                  label="Critical"
                  value={totals.criticalCount}
                  valueClass="text-[var(--error-foreground)]"
                />
                <StatTile
                  label="High"
                  value={totals.highCount}
                  valueClass="text-[var(--warning-foreground)]"
                />
                <StatTile label="Medium" value={totals.mediumCount} />
                <StatTile
                  label="Low"
                  value={totals.lowCount}
                  valueClass="text-[var(--success-foreground)]"
                />
                <StatTile label="Avg score" value={`${totals.avgCompositeScore}`} />
              </div>

              <div className="space-y-1 border-t border-border pt-3">
                {data.items.map((item) => {
                  const tierMeta = RISK_TIER_META[item.riskTier];
                  const verdictMeta = getVerdictMeta(item.verdict);
                  const actions = item.recommendedActions ?? [];
                  return (
                    <div key={String(item.supplierId)} className="border-b border-border py-3 last:border-0">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            {item.supplierName}
                          </span>
                          <Badge variant={tierMeta.badgeVariant}>{tierMeta.label}</Badge>
                          <Badge variant={verdictMeta.badgeVariant}>{verdictMeta.label}</Badge>
                        </div>
                        <span className="text-sm font-bold tabular-nums text-foreground">
                          {item.compositeScore}/100
                        </span>
                      </div>
                      <div className="mt-2">
                        <ScoreBar value={item.compositeScore} barClass={tierMeta.barClass} />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="capitalize">
                          Criticality: {item.criticality}
                        </span>
                        <span className="capitalize">Posture: {item.postureReadiness}</span>
                        {item.verdict ? <span>{item.verdict}</span> : null}
                      </div>
                      {actions.length > 0 ? (
                        <ul className="mt-2 space-y-1 pl-5 list-disc">
                          {actions.slice(0, 2).map((action, index) => (
                            <li key={index} className="text-sm text-muted-foreground">
                              {action}
                            </li>
                          ))}
                          {actions.length > 2 ? (
                            <li className="text-xs text-muted-foreground">
                              +{actions.length - 2} more recommended actions
                            </li>
                          ) : null}
                        </ul>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
        </PanelResult>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Card 2 - Supplier security certificate tracker                      */
/* ------------------------------------------------------------------ */

export function CertificateTracker({ clientId, demoMode, onEnableDemo }: PanelCardProps) {
  const input = useMemo<CertificatesInput | null>(
    () => (demoMode ? buildDemoCertificatesInput() : null),
    [demoMode]
  );
  const query = useCertificatesQuery(clientId, input);
  const data: CertificatesResponse | undefined = demoMode
    ? (query.data ?? buildDemoCertificates())
    : query.data;
  const summary = data?.summary;

  return (
    <Card className="rounded-xl shadow-sm border-border h-full lg:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <FileCheck2 className="h-5 w-5 text-muted-foreground" />
          Supplier security certificate tracker
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Validity coverage of security attestations (SOC 2, ISO 27001, PCI DSS, ...).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PanelResult
          isLoading={query.isLoading}
          hasData={!!data}
          isError={query.isError}
          procedure="thirdPartyRisk.certificates"
          icon={FileCheck2}
          emptyHint="Enable demo mode to preview certificate coverage with sample attestations."
          onEnableDemo={onEnableDemo}
          skeleton={
            <>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
                ))}
              </div>
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </>
          }
        >
          {data && summary ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <StatTile label="Certificates" value={summary.total} />
                <StatTile
                  label="Valid"
                  value={summary.valid}
                  valueClass="text-[var(--success-foreground)]"
                />
                <StatTile
                  label="Expiring"
                  value={summary.expiring}
                  valueClass="text-[var(--warning-foreground)]"
                />
                <StatTile
                  label="Expired"
                  value={summary.expired}
                  valueClass="text-[var(--error-foreground)]"
                />
                <StatTile label="Coverage" value={`${summary.coverageRate}%`} />
              </div>

              <div className="overflow-x-auto border-t border-border pt-3">
                <table className="w-full">
                  <thead>
                    <tr className="h-12 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 text-left font-semibold">Supplier</th>
                      <th className="px-4 text-left font-semibold">Certificate</th>
                      <th className="px-4 text-left font-semibold">Issuer</th>
                      <th className="px-4 text-left font-semibold">Valid from</th>
                      <th className="px-4 text-left font-semibold">Valid to</th>
                      <th className="px-4 text-left font-semibold">Status</th>
                      <th className="px-4 text-right font-semibold">Expiry</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.map((item, index) => {
                      const certMeta = CERT_STATUS_META[item.status];
                      const isMissing = item.status === "missing";
                      return (
                        <tr key={`${String(item.supplierId)}-${index}`} className="border-b border-border hover:bg-muted/50">
                          <td className="p-4 text-sm font-medium text-foreground whitespace-nowrap">
                            {item.supplierName}
                          </td>
                          <td className="p-4 text-sm text-foreground">
                            {item.name}
                            {isMissing ? (
                              <span className="ml-2 text-xs text-muted-foreground">
                                (coverage gap)
                              </span>
                            ) : null}
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">{item.issuer ?? "-"}</td>
                          <td className="p-4 text-sm tabular-nums text-muted-foreground whitespace-nowrap">
                            {item.validFrom ? format(new Date(item.validFrom), "MMM d, yyyy") : "-"}
                          </td>
                          <td className="p-4 text-sm tabular-nums text-muted-foreground whitespace-nowrap">
                            {item.validTo ? format(new Date(item.validTo), "MMM d, yyyy") : "-"}
                          </td>
                          <td className="p-4">
                            <Badge variant={certMeta.badgeVariant}>{certMeta.label}</Badge>
                          </td>
                          <td
                            className={cn(
                              "p-4 text-sm tabular-nums text-right whitespace-nowrap",
                              item.status === "expired"
                                ? "text-[var(--error-foreground)]"
                                : item.status === "expiring"
                                  ? "text-[var(--warning-foreground)]"
                                  : "text-muted-foreground"
                            )}
                          >
                            {item.daysUntilExpiry === null
                              ? "-"
                              : item.daysUntilExpiry < 0
                                ? `${Math.abs(item.daysUntilExpiry)}d ago`
                                : `${item.daysUntilExpiry}d left`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </PanelResult>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Card 3 - Supply chain map summary                                   */
/* ------------------------------------------------------------------ */

export function SupplyChainMapSummary({ clientId, demoMode, onEnableDemo }: PanelCardProps) {
  const input = useMemo<SupplyChainMapInput | null>(
    () => (demoMode ? buildDemoSupplyChainMapInput() : null),
    [demoMode]
  );
  const query = useSupplyChainMapQuery(clientId, input);
  const data: SupplyChainMapResponse | undefined = demoMode
    ? (query.data ?? buildDemoSupplyChainMap())
    : query.data;
  const summary = data?.summary;
  const totalNodes = data?.nodes.length ?? 0;

  return (
    <Card className="rounded-xl shadow-sm border-border h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-muted-foreground" />
          Supply chain map summary
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Tier distribution and weighted dependency edges across your third-party network.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <PanelResult
          isLoading={query.isLoading}
          hasData={!!data}
          isError={query.isError}
          procedure="thirdPartyRisk.supplyChainMap"
          icon={GitBranch}
          emptyHint="Enable demo mode to preview the dependency map with sample suppliers and edges."
          onEnableDemo={onEnableDemo}
          skeleton={
            <>
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-[72px] w-full rounded-lg" />
                ))}
              </div>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2 border-t border-border pt-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-2 w-full" />
                </div>
              ))}
            </>
          }
        >
          {data && summary ? (
            <>
              <div className="grid grid-cols-3 gap-2">
                <StatTile label="Nodes" value={totalNodes} />
                <StatTile label="Edges" value={summary.edgeCount} />
                <StatTile label="Avg score" value={`${summary.avgCompositeScore}`} />
              </div>

              <div className="space-y-3 border-t border-border pt-3">
                {RISK_TIER_ORDER.map((tier) => {
                  const count = summary.tierCounts[tier] ?? 0;
                  const pct = totalNodes > 0 ? Math.round((count / totalNodes) * 100) : 0;
                  return (
                    <div key={tier} className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {RISK_TIER_META[tier].label}
                        </span>
                        <span className={cn("text-sm font-bold tabular-nums", TIER_COUNT_TEXT[tier])}>
                          {count}
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={cn("h-full rounded-full transition-all", TIER_BAR_FILL[tier])}
                          style={{ width: `${Math.max(count > 0 ? 6 : 0, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2 border-t border-border pt-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Dependency highlights
                </div>
                {data.edges.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No dependency edges reported yet.
                  </p>
                ) : (
                  data.edges.map((edge, index) => {
                    const fromName =
                      data.nodes.find((n) => String(n.id) === String(edge.from))?.name ??
                      String(edge.from);
                    const toName =
                      data.nodes.find((n) => String(n.id) === String(edge.to))?.name ??
                      String(edge.to);
                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2"
                      >
                        <span className="flex min-w-0 items-center gap-1.5 text-sm text-foreground">
                          <span className="truncate">{fromName}</span>
                          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate">{toName}</span>
                        </span>
                        <Badge
                          variant={
                            edge.weight >= 70 ? "error" : edge.weight >= 45 ? "warning" : "secondary"
                          }
                        >
                          {edge.weight}%
                        </Badge>
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : null}
        </PanelResult>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Section wrapper                                                     */
/* ------------------------------------------------------------------ */

export function ThirdPartyRiskSection({ clientId }: { clientId: number }) {
  const [demoMode, setDemoMode] = useState(false);

  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Workflow className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Third-Party Risk Scoring
            </h2>
            <p className="text-sm text-muted-foreground">
              Art. 21(2)(d) - aggregate supplier risk, certificate coverage and the dependency map.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDemoMode((v) => !v)}
          className={cn(demoMode && "border-amber-500/40 text-amber-700 dark:text-amber-400")}
        >
          <FlaskConical className="h-4 w-4 mr-2" />
          {demoMode ? "Exit Demo Mode" : "Demo Mode"}
        </Button>
      </div>

      {/* Demo mode banner - persistent while sample data is shown (UI-STANDARD 17) */}
      {demoMode && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          <FlaskConical className="h-4 w-4 shrink-0" />
          <span>
            <strong>Demo mode:</strong> showing sample data. Connect the{" "}
            <code className="text-xs">thirdPartyRisk.*</code> APIs to see live scoring.
          </span>
        </div>
      )}

      <AggregatedRiskScorecard
        clientId={clientId}
        demoMode={demoMode}
        onEnableDemo={() => setDemoMode(true)}
      />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <CertificateTracker
          clientId={clientId}
          demoMode={demoMode}
          onEnableDemo={() => setDemoMode(true)}
        />
        <SupplyChainMapSummary
          clientId={clientId}
          demoMode={demoMode}
          onEnableDemo={() => setDemoMode(true)}
        />
      </div>
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" />
        Scores are computed from supplier criticality, posture readiness and residual vendor risk
        per NIS2 Art. 21(2)(d).
      </p>
    </section>
  );
}
