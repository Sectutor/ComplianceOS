/**
 * NIS2 Security Metrics & Reporting - panels
 * ===========================================
 * Renders the `securityMetrics.*` contract (see
 * `packages/core/src/pages/securityMetricsApi.ts`) as an executive
 * dashboard for NIS2 Art. 21(2)(f) / ENISA Measure 7.1 (measuring the
 * effectiveness of the risk-management measures):
 *
 *   1. Executive summary strip   <- securityMetrics.executiveSummary
 *   2. MTTR per severity         <- securityMetrics.mttr
 *   3. Vulnerability age         <- securityMetrics.vulnerabilityAge
 *   4. Compliance drift alerts   <- securityMetrics.complianceDrift
 *
 * Every panel follows UI-STANDARD 16 graceful degradation: skeleton while
 * loading (checked before empty, never a spinner-forever), EmptyState
 * ("Connect the securityMetrics.<proc> API") on error or missing endpoint,
 * token-only colors (2) - no raw slate/sky hexes, dark-mode safe. Severity /
 * trend / status pills use the Badge component; score bars use the documented
 * data-viz exception (18). Demo mode (17) is gated behind the "Demo data"
 * switch, off by default, and renders a persistent amber banner whenever
 * sample data is shown. Live endpoint data always wins over demo data.
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
import { Switch } from "@complianceos/ui/ui/switch";
import { EmptyState } from "@complianceos/ui/ui/EmptyState";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { StatCard } from "@complianceos/ui/ui/StatCard";
import { cn } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  FlaskConical,
  Gauge,
  Hourglass,
  Layers,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import {
  AGE_BAND_META,
  AGE_BAND_ORDER,
  buildDemoComplianceDrift,
  buildDemoComplianceDriftInput,
  buildDemoExecutiveSummary,
  buildDemoExecutiveSummaryInput,
  buildDemoMttr,
  buildDemoMttrInput,
  buildDemoVulnerabilityAge,
  buildDemoVulnerabilityAgeInput,
  DRIFT_SEVERITY_META,
  formatMetricHours,
  METRIC_SEVERITY_ORDER,
  MTTR_SEVERITY_META,
  POSTURE_STATUS_META,
  TREND_META,
  trendGlyph,
  useComplianceDrift,
  useExecutiveSummary,
  useMttr,
  useVulnerabilityAge,
  type ComplianceDriftInput,
  type ComplianceDriftResponse,
  type DriftSeverity,
  type ExecutiveSummaryInput,
  type ExecutiveSummaryResponse,
  type MetricTrend,
  type MttrInput,
  type MttrResponse,
  type VulnerabilityAgeInput,
  type VulnerabilityAgeResponse,
} from "@/pages/securityMetricsApi";

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

/**
 * Degradation helper (UI-STANDARD 13/16): skeleton -> EmptyState -> children.
 * `isLoading` is always checked before "empty" so nothing flashes.
 */
function Degrade({
  isLoading,
  hasData,
  isError,
  procedure,
  icon,
  emptyHint,
  onEnableDemo,
  skeleton,
  children,
}: {
  isLoading: boolean;
  hasData: boolean;
  isError: boolean;
  procedure: string;
  icon: LucideIcon;
  emptyHint: string;
  onEnableDemo?: () => void;
  skeleton: React.ReactNode;
  children: React.ReactNode;
}) {
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
            ? `The ${procedure} endpoint is not live yet. It appears once the securityMetrics router is deployed.`
            : emptyHint
        }
        action={onEnableDemo ? { label: "Preview with Demo Data", onClick: onEnableDemo } : undefined}
      />
    );
  }
  return <div className="space-y-3">{children}</div>;
}

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

/** Left-accent border per drift severity (semantic token, UI-STANDARD 2). */
const DRIFT_ACCENT: Record<DriftSeverity, string> = {
  critical: "border-l-[var(--error)]",
  high: "border-l-[var(--warning)]",
  medium: "border-l-[var(--warning)]",
  low: "border-l-[var(--info)]",
  none: "border-l-border",
};

/** Trend pill for a metric, flipping the arrow when down = good (MTTR). */
function TrendPill({ trend, inverted = false, pct = null }: { trend: MetricTrend; inverted?: boolean; pct?: number | null }) {
  const meta = TREND_META[trend];
  return (
    <Badge variant={meta.badgeVariant} className="gap-1 tabular-nums">
      <span aria-hidden="true">{trendGlyph(trend, inverted)}</span>
      {pct !== null && pct !== undefined ? `${Math.abs(pct)}%` : null}
      {meta.label}
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/* Executive summary strip                                             */
/* ------------------------------------------------------------------ */

function ExecutiveSummaryPanel({
  clientId,
  demoMode,
  onEnableDemo,
}: {
  clientId: number;
  demoMode: boolean;
  onEnableDemo: () => void;
}) {
  const input = useMemo<ExecutiveSummaryInput | null>(
    () => (demoMode ? buildDemoExecutiveSummaryInput() : { clientId }),
    [demoMode, clientId]
  );
  const query = useExecutiveSummary(clientId, input);
  const data: ExecutiveSummaryResponse | undefined = demoMode
    ? (query.data ?? buildDemoExecutiveSummary())
    : query.data;
  const statusMeta = data ? POSTURE_STATUS_META[data.status] : undefined;

  return (
    <Card className="rounded-xl shadow-sm border-border">
      <CardHeader className="pb-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <Activity className="h-5 w-5 text-muted-foreground" />
              Executive security posture
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Overall NIS2 posture, remediation speed, overdue vulnerabilities and compliance drift
              alerts (Art. 21(2)(f), ENISA Measure 7.1).
            </CardDescription>
          </div>
          {data && statusMeta ? (
            <Badge variant={statusMeta.badgeVariant} className="self-start md:self-auto px-3 py-1">
              {statusMeta.label}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <Degrade
          isLoading={query.isLoading}
          hasData={!!data}
          isError={query.isError}
          procedure="securityMetrics.executiveSummary"
          icon={Gauge}
          emptyHint="The summary strip appears once the securityMetrics router is deployed. Enable demo mode to preview the executive view."
          onEnableDemo={onEnableDemo}
          skeleton={
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="rounded-xl shadow-sm border-border">
                  <CardContent className="p-6 flex items-center gap-5">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          }
        >
          {data ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard
                label="Posture score"
                value={
                  <span className="tabular-nums">
                    {data.postureScore}
                    <span className="text-base font-semibold text-muted-foreground">%</span>
                  </span>
                }
                icon={ShieldCheck}
                tone={data.postureScore >= 85 ? "green" : data.postureScore >= 60 ? "amber" : "red"}
              >
                <div
                  className={cn(
                    "mt-0.5 flex items-center gap-1 text-xs font-semibold",
                    TREND_META[data.postureTrend].textClass
                  )}
                >
                  <span aria-hidden="true">{trendGlyph(data.postureTrend)}</span>
                  <span className="tabular-nums">
                    {data.postureTrendPct !== null && data.postureTrendPct !== undefined
                      ? `${Math.abs(data.postureTrendPct)}%`
                      : TREND_META[data.postureTrend].label}
                  </span>
                  vs prior period
                </div>
              </StatCard>

              <StatCard
                label="Mean time to remediate"
                value={<span className="tabular-nums">{formatMetricHours(data.mttrHours)}</span>}
                icon={Clock}
                tone={data.mttrHours <= 72 ? "green" : data.mttrHours <= 168 ? "amber" : "red"}
              >
                <div
                  className={cn(
                    "mt-0.5 flex items-center gap-1 text-xs font-semibold",
                    TREND_META[data.mttrTrend].textClass
                  )}
                >
                  <span aria-hidden="true">{trendGlyph(data.mttrTrend, true)}</span>
                  <span className="tabular-nums">
                    {data.mttrTrendPct !== null && data.mttrTrendPct !== undefined
                      ? `${Math.abs(data.mttrTrendPct)}%`
                      : TREND_META[data.mttrTrend].label}
                  </span>
                  vs prior period
                </div>
              </StatCard>

              <StatCard
                label="Overdue vulnerabilities"
                value={<span className="tabular-nums">{data.overdueVulnerabilities}</span>}
                icon={AlertTriangle}
                tone={data.overdueVulnerabilities > 0 ? "red" : "green"}
              >
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Past their remediation due date
                </p>
              </StatCard>

              <StatCard
                label="Drift alerts"
                value={<span className="tabular-nums">{data.driftAlerts}</span>}
                icon={Layers}
                tone={data.driftAlerts > 0 ? "amber" : "green"}
              >
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Control areas beyond tolerance
                </p>
              </StatCard>
            </div>
          ) : null}
        </Degrade>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* MTTR panel                                                          */
/* ------------------------------------------------------------------ */

function MttrPanel({
  clientId,
  demoMode,
  onEnableDemo,
}: {
  clientId: number;
  demoMode: boolean;
  onEnableDemo: () => void;
}) {
  const input = useMemo<MttrInput | null>(
    () => (demoMode ? buildDemoMttrInput() : { clientId }),
    [demoMode, clientId]
  );
  const query = useMttr(clientId, input);
  const data: MttrResponse | undefined = demoMode ? (query.data ?? buildDemoMttr()) : query.data;
  const overall = data?.overall;
  const maxMttr = Math.max(
    1,
    ...METRIC_SEVERITY_ORDER.map((severity) => data?.bySeverity[severity]?.mttrHours ?? 0)
  );

  return (
    <Card className="rounded-xl shadow-sm border-border h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Clock className="h-5 w-5 text-muted-foreground" />
          Mean time to remediate
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Hours from detection to remediation, overall and per severity band.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Degrade
          isLoading={query.isLoading}
          hasData={!!data}
          isError={query.isError}
          procedure="securityMetrics.mttr"
          icon={Clock}
          emptyHint="MTTR appears once the securityMetrics router is deployed. Enable demo mode to preview remediation speed."
          onEnableDemo={onEnableDemo}
          skeleton={
            <>
              <Skeleton className="h-20 w-full rounded-lg" />
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-5 w-20 rounded-full" />
                  <Skeleton className="h-2 flex-1 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                </div>
              ))}
            </>
          }
        >
          {data && overall ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-4 rounded-lg border border-border bg-muted/30 px-4 py-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Overall MTTR
                  </div>
                  <div className="text-3xl font-bold tabular-nums text-foreground">
                    {formatMetricHours(overall.mttrHours)}
                  </div>
                  <div className="text-xs text-muted-foreground tabular-nums">
                    range {formatMetricHours(overall.minHours)} - {formatMetricHours(overall.maxHours)} ·{" "}
                    {overall.count} incidents
                  </div>
                </div>
                <TrendPill trend={overall.trend} inverted pct={overall.trendPct} />
              </div>

              <ul className="space-y-3">
                {METRIC_SEVERITY_ORDER.map((severity) => {
                  const stats = data.bySeverity[severity];
                  const meta = MTTR_SEVERITY_META[severity];
                  const hasIncidents = (stats?.count ?? 0) > 0;
                  return (
                    <li key={severity} className="flex items-center gap-3">
                      <Badge variant={meta.badgeVariant} className="w-24 justify-center shrink-0">
                        {meta.label}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <ScoreBar
                          value={hasIncidents ? ((stats.mttrHours / maxMttr) * 100) : 0}
                          barClass={meta.barClass}
                        />
                      </div>
                      <div className="w-28 text-right shrink-0">
                        <div
                          className={cn(
                            "text-sm font-semibold tabular-nums",
                            hasIncidents ? "text-foreground" : "text-muted-foreground"
                          )}
                        >
                          {hasIncidents ? formatMetricHours(stats.mttrHours) : "—"}
                        </div>
                        <div className="text-xs text-muted-foreground tabular-nums">
                          {hasIncidents
                            ? `${formatMetricHours(stats.minHours)}-${formatMetricHours(stats.maxHours)} · ${stats.count}`
                            : "no incidents"}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </Degrade>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Vulnerability age panel                                             */
/* ------------------------------------------------------------------ */

function VulnerabilityAgePanel({
  clientId,
  demoMode,
  onEnableDemo,
}: {
  clientId: number;
  demoMode: boolean;
  onEnableDemo: () => void;
}) {
  const input = useMemo<VulnerabilityAgeInput | null>(
    () => (demoMode ? buildDemoVulnerabilityAgeInput() : { clientId }),
    [demoMode, clientId]
  );
  const query = useVulnerabilityAge(clientId, input);
  const data: VulnerabilityAgeResponse | undefined = demoMode
    ? (query.data ?? buildDemoVulnerabilityAge())
    : query.data;

  return (
    <Card className="rounded-xl shadow-sm border-border h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Hourglass className="h-5 w-5 text-muted-foreground" />
          Vulnerability age
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Age distribution per severity with overdue counts and age-band buckets.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Degrade
          isLoading={query.isLoading}
          hasData={!!data}
          isError={query.isError}
          procedure="securityMetrics.vulnerabilityAge"
          icon={Hourglass}
          emptyHint="Age distribution appears once the securityMetrics router is deployed. Enable demo mode to preview the table."
          onEnableDemo={onEnableDemo}
          skeleton={
            <>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-20 rounded-full" />
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <tbody>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-b border-border">
                        <td className="p-4">
                          <Skeleton className="h-5 w-20 rounded-full" />
                        </td>
                        <td className="p-4">
                          <Skeleton className="h-4 w-8 ml-auto" />
                        </td>
                        <td className="p-4">
                          <Skeleton className="h-4 w-12 ml-auto" />
                        </td>
                        <td className="p-4">
                          <Skeleton className="h-4 w-12 ml-auto" />
                        </td>
                        <td className="p-4">
                          <Skeleton className="h-5 w-24 ml-auto rounded-full" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          }
        >
          {data ? (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {AGE_BAND_ORDER.map((band) => {
                  const count = data.ageBands[band] ?? 0;
                  return (
                    <span
                      key={band}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-semibold",
                        count > 0 ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {AGE_BAND_META[band].label}
                      <Badge variant={AGE_BAND_META[band].badgeVariant}>{count}</Badge>
                    </span>
                  );
                })}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="h-12 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 text-left font-semibold">Severity</th>
                      <th className="px-4 text-right font-semibold">Count</th>
                      <th className="px-4 text-right font-semibold">Avg age</th>
                      <th className="px-4 text-right font-semibold">Max age</th>
                      <th className="px-4 text-right font-semibold">Overdue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {METRIC_SEVERITY_ORDER.map((severity) => {
                      const stats = data.bySeverity[severity];
                      const meta = MTTR_SEVERITY_META[severity];
                      const hasItems = (stats?.count ?? 0) > 0;
                      return (
                        <tr key={severity} className="border-b border-border hover:bg-muted/50">
                          <td className="p-4">
                            <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
                          </td>
                          <td className="p-4 text-right text-sm tabular-nums text-foreground">
                            {stats?.count ?? 0}
                          </td>
                          <td className="p-4 text-right text-sm tabular-nums text-muted-foreground">
                            {hasItems ? `${stats.avgAgeDays}d` : "—"}
                          </td>
                          <td className="p-4 text-right text-sm tabular-nums text-muted-foreground">
                            {hasItems ? `${stats.maxAgeDays}d` : "—"}
                          </td>
                          <td className="p-4 text-right">
                            {(stats?.overdueCount ?? 0) > 0 ? (
                              <Badge variant="error" className="tabular-nums">
                                {stats.overdueCount} overdue
                              </Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-muted-foreground tabular-nums">
                {data.total} findings tracked · {data.overdueCount} overdue across all severities
              </p>
            </div>
          ) : null}
        </Degrade>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Compliance drift panel                                              */
/* ------------------------------------------------------------------ */

function ComplianceDriftPanel({
  clientId,
  demoMode,
  onEnableDemo,
}: {
  clientId: number;
  demoMode: boolean;
  onEnableDemo: () => void;
}) {
  const input = useMemo<ComplianceDriftInput | null>(
    () => (demoMode ? buildDemoComplianceDriftInput() : { clientId }),
    [demoMode, clientId]
  );
  const query = useComplianceDrift(clientId, input);
  const data: ComplianceDriftResponse | undefined = demoMode
    ? (query.data ?? buildDemoComplianceDrift())
    : query.data;

  return (
    <Card className="rounded-xl shadow-sm border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <TrendingDown className="h-5 w-5 text-muted-foreground" />
          Compliance drift
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Control areas whose effectiveness has slipped vs their baseline (ENISA Measure 7.1).
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Degrade
          isLoading={query.isLoading}
          hasData={!!data}
          isError={query.isError}
          procedure="securityMetrics.complianceDrift"
          icon={TrendingDown}
          emptyHint="Drift alerts appear once the securityMetrics router is deployed. Enable demo mode to preview the alert list."
          onEnableDemo={onEnableDemo}
          skeleton={
            <>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2 rounded-lg border border-border p-4">
                  <div className="flex items-center justify-between gap-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </>
          }
        >
          {data ? (
            <div className="space-y-4">
              {data.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/10 px-6 py-10 text-center">
                  <CheckCircle2 className="h-8 w-8 text-[var(--success-foreground)]" />
                  <p className="mt-3 text-sm font-semibold text-foreground">No drift alerts</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    All measured NIS2 control areas are within tolerance.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {data.items.map((item) => {
                    const meta = DRIFT_SEVERITY_META[item.severity] ?? DRIFT_SEVERITY_META.none;
                    return (
                      <li
                        key={String(item.areaId)}
                        className={cn(
                          "rounded-lg border border-border bg-card p-4 border-l-4",
                          DRIFT_ACCENT[item.severity]
                        )}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="truncate text-sm font-semibold text-foreground">
                              {item.areaName}
                            </span>
                            {item.measure ? (
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {item.measure}
                              </span>
                            ) : null}
                          </div>
                          <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                          <span className="text-muted-foreground">
                            Baseline{" "}
                            <span className="font-semibold tabular-nums text-foreground">
                              {item.baselineScore}
                            </span>
                          </span>
                          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            Current{" "}
                            <span className="font-semibold tabular-nums text-foreground">
                              {item.currentScore}
                            </span>
                          </span>
                          <span className="ml-auto font-semibold tabular-nums text-[var(--error-foreground)]">
                            -{Math.abs(item.driftPoints)} pts
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">{item.recommendation}</p>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[var(--success-foreground)]" />
                  {data.stableCount} stable
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 font-medium">
                  <TrendingUp className="h-3.5 w-3.5 text-[var(--success-foreground)]" />
                  {data.improvedCount} improved
                </span>
                <span className="tabular-nums">
                  {data.driftAlertCount} of {data.totalAreas} areas alerted
                </span>
              </div>
            </div>
          ) : null}
        </Degrade>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Section wrapper                                                     */
/* ------------------------------------------------------------------ */

export function SecurityMetricsPanels({ clientId }: { clientId: number }) {
  const [demoMode, setDemoMode] = useState(false);

  return (
    <section className="space-y-6">
      {/* Header + demo toggle (UI-STANDARD 17: off by default) */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              NIS2 Security Metrics & Reporting
            </h2>
            <p className="text-sm text-muted-foreground">
              ENISA Measure 7.1 / Art. 21(2)(f) - measuring the effectiveness of the risk-management
              measures.
            </p>
          </div>
        </div>
        <label className="flex cursor-pointer select-none items-center gap-2 text-sm font-medium text-muted-foreground">
          <FlaskConical className="h-4 w-4" />
          Demo data
          <Switch checked={demoMode} onCheckedChange={setDemoMode} aria-label="Toggle demo data" />
        </label>
      </div>

      {/* Demo banner - persistent while sample data is shown (UI-STANDARD 17) */}
      {demoMode && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
          <FlaskConical className="h-4 w-4 shrink-0" />
          <span>
            <strong>Demo mode:</strong> showing sample data. Connect the{" "}
            <code className="text-xs">securityMetrics.*</code> APIs to see live metrics.
          </span>
        </div>
      )}

      {/* Executive summary strip */}
      <ExecutiveSummaryPanel
        clientId={clientId}
        demoMode={demoMode}
        onEnableDemo={() => setDemoMode(true)}
      />

      {/* MTTR + vulnerability age side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MttrPanel clientId={clientId} demoMode={demoMode} onEnableDemo={() => setDemoMode(true)} />
        <VulnerabilityAgePanel
          clientId={clientId}
          demoMode={demoMode}
          onEnableDemo={() => setDemoMode(true)}
        />
      </div>

      {/* Compliance drift alerts */}
      <ComplianceDriftPanel
        clientId={clientId}
        demoMode={demoMode}
        onEnableDemo={() => setDemoMode(true)}
      />

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" />
        Metrics are derived from incidents, vulnerability findings and control assessments per NIS2
        Art. 21(2)(f) and ENISA Measure 7.1.
      </p>
    </section>
  );
}
