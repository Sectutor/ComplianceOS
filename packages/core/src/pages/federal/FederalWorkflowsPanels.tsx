/**
 * Federal Workflow Intelligence — live panels (GAP-22)
 * ====================================================
 * Trailing section of the Federal Compliance Hub
 * (`pages/federal/FederalHub.tsx`), wired to the typed contract layer
 * `pages/federal/federalWorkflowsApi.ts` over the `federalWorkflows.*`
 * tRPC procedures (createFederalWorkflowRouter).
 *
 * Panels shipped:
 *  - SPRS score card          → getSprsBreakdown   (family deduction bars)
 *  - Reporting clocks         → getReportingClocks (DFARS 7012 / CIRCIA 72h)
 *  - Continuous monitoring    → getConMonDashboard (posture tiles + POA&M aging)
 *  - CMMC readiness           → getCmmcReadiness   (band + gaps)
 *  - Export actions row       → exportSspOscal / exportPoamOscal /
 *                               exportPoamEmassCsv (Blob downloads) +
 *                               syncSarToPoam
 *
 * UI-STANDARD compliance:
 *  - §16.2 graceful degradation: every query renders a 1:1 Skeleton while
 *    loading and an EmptyState ("Connect the federalWorkflows.* API") on
 *    error — no spinner-forever, no crash on a missing endpoint.
 *  - §16.3 / §17 demo mode: off by default, gated behind the section-header
 *    "Demo data" switch or the EmptyState CTA; sample data lives in the API
 *    module behind a fixed clock and always loses to a live payload; every
 *    demo render shows a persistent amber banner.
 *  - §2 token purity: token-only colors (`text-foreground`, `bg-muted`,
 *    `border-border`, Badge variants), dark-mode safe, no raw slate/gray/
 *    white/indigo surface tokens.
 */

import { useState } from "react";
import {
  FileJson,
  FileSpreadsheet,
  FlaskConical,
  Gauge,
  Radar,
  RefreshCw,
  ShieldCheck,
  Timer,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { Button } from "@complianceos/ui/ui/button";
import { Input } from "@complianceos/ui/ui/input";
import { EmptyState } from "@complianceos/ui/ui/EmptyState";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { Switch } from "@complianceos/ui/ui/switch";
import {
  buildDemoCmmcReadiness,
  buildDemoConMonDashboard,
  buildDemoReportingClocks,
  buildDemoSprsBreakdown,
  CIRCIA_STATUS_META,
  cmmcBandMeta,
  CMMC_EMPTY_TITLE,
  CONMON_EMPTY_TITLE,
  CLOCKS_EMPTY_TITLE,
  dibnetBadgeLabel,
  DIBNET_STATUS_META,
  downloadStringAsFile,
  familyWeight,
  formatWorkflowTimestamp,
  isEmptyCmmcReadiness,
  isEmptyConMonDashboard,
  isEmptyReportingClocks,
  normalizeCirciaStatus,
  normalizeDibnetStatus,
  normalizeReportingClocks,
  normalizeConMonDashboard,
  normalizeCmmcReadiness,
  normalizeSprsBreakdown,
  oscalFilename,
  riskRatingMeta,
  severityMeta,
  sprsBandMeta,
  useCmmcReadiness,
  useConMonDashboard,
  useExportPoamEmassCsv,
  useExportPoamOscal,
  useExportSspOscal,
  useReportingClocks,
  useSprsBreakdown,
  useSyncSarToPoam,
  type EmassCsvExportResult,
  type FederalBadgeVariant,
  type OscalExportPayload,
} from "./federalWorkflowsApi";

/* ------------------------------------------------------------------ */
/* Shared building blocks                                              */
/* ------------------------------------------------------------------ */

interface PanelProps {
  clientId: number;
  demoMode: boolean;
  /** Enable-only CTA used by the degraded EmptyStates (§17). */
  onEnableDemo: () => void;
  /** Full toggle driving the shared demo gate from a panel header switch. */
  onToggleDemo: (next: boolean) => void;
  className?: string;
}

/** Header pill shared by every panel: live / demo / syncing / pending. */
function sectionPill(
  live: boolean,
  showDemo: boolean,
  isLoading: boolean
): { label: string; badgeVariant: FederalBadgeVariant } {
  if (live) return { label: "Live", badgeVariant: "success" };
  if (showDemo) return { label: "Demo data", badgeVariant: "warning" };
  if (isLoading) return { label: "Syncing…", badgeVariant: "outline" };
  return { label: "API pending", badgeVariant: "outline" };
}

/** Demo-data switch in each panel header (UI-STANDARD §17). */
function DemoToggle({
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

/** Persistent amber banner rendered whenever a panel shows sample data. */
function WorkflowDemoBanner({ context }: { context: string }) {
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

/** Small summary tile reused across panels. */
function StatTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{value}</p>
    </div>
  );
}

function mutationErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim() !== "") return message;
  }
  return "Request failed";
}

function parseEntityId(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const value = Number(trimmed);
  return Number.isInteger(value) && value >= 1 ? value : null;
}

/* ------------------------------------------------------------------ */
/* Panel 1 — SPRS score card                                           */
/* ------------------------------------------------------------------ */

function SprsScoreCard({ clientId, demoMode, onEnableDemo, onToggleDemo, className }: PanelProps) {
  const sprsQuery = useSprsBreakdown(clientId);

  const live = sprsQuery.data ? normalizeSprsBreakdown(sprsQuery.data) : null;
  const isLoading = !live && sprsQuery.isLoading;
  /** Error + no data → degraded EmptyState (UI-STANDARD 16.2). */
  const isDegraded = !live && !!sprsQuery.isError;
  /** Demo view only when the live endpoint has not delivered yet (§17). */
  const showDemo = !live && demoMode;
  const view = live ?? (showDemo ? buildDemoSprsBreakdown() : null);
  const pill = sectionPill(live !== null, showDemo, isLoading);

  const band = view ? sprsBandMeta(view.score) : null;
  const families = view
    ? [...view.familiesAffected].sort((a, b) => Number(a) - Number(b))
    : [];
  const maxFamilyWeight = Math.max(1, ...families.map((family) => familyWeight(family)));
  const perFamilyShare =
    view && families.length > 0 ? view.deduction / families.length : 0;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary shrink-0" />
            SPRS score
          </CardTitle>
          <CardDescription>
            DoD Assessment Methodology score computed live from open POA&amp;M items.
          </CardDescription>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Badge variant={pill.badgeVariant} className="text-xs">
            {pill.label}
          </Badge>
          <DemoToggle demoMode={demoMode} onToggle={onToggleDemo} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showDemo && <WorkflowDemoBanner context="federalWorkflows.getSprsBreakdown" />}

        {isLoading ? (
          /* Loading skeleton - replaces content 1:1 (UI-STANDARD 13) */
          <div className="space-y-4" aria-hidden="true">
            <Skeleton className="h-12 w-44 rounded-lg" />
            <Skeleton className="h-2 w-full rounded-full" />
            <div className="grid grid-cols-3 gap-3">
              {[0, 1, 2].map((index) => (
                <Skeleton key={index} className="h-16 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ) : isDegraded && !view ? (
          /* Degraded - endpoint not live yet (UI-STANDARD 16.2) */
          <EmptyState
            icon={Gauge}
            title="Connect the federalWorkflows.getSprsBreakdown API"
            description="The live SPRS score lands with packages/core/src/server/routers/federal-workflows.ts. Preview the panel with sample data meanwhile."
            action={{ label: "Preview with Demo Data", onClick: onEnableDemo }}
          />
        ) : view && band ? (
          <>
            {/* Score hero */}
            <div className="flex flex-wrap items-baseline gap-3">
              <p className="text-4xl font-bold tabular-nums text-foreground">
                {view.score}
                <span className="ml-1 text-base font-medium text-muted-foreground">
                  / {view.startingScore}
                </span>
              </p>
              <Badge variant={band.badgeVariant} className="text-xs">
                {band.label}
              </Badge>
              <span className="text-sm tabular-nums text-muted-foreground">
                −{view.deduction} pts deducted
              </span>
            </div>

            {/* Score bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${band.barClass}`}
                style={{
                  width: `${Math.min(100, Math.max(0, (view.score / Math.max(1, view.startingScore)) * 100))}%`,
                }}
              />
            </div>

            {/* Summary tiles */}
            <div className="grid grid-cols-3 gap-3">
              <StatTile label="Unmet practices" value={view.unmetPracticeCount} />
              <StatTile label="Open POA&M items" value={view.openPoamItems} />
              <StatTile label="Families affected" value={families.length} />
            </div>

            {/* Family deduction bars */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Deduction by 800-171 family
              </p>
              {families.length === 0 || view.deduction <= 0 ? (
                <p className="rounded-lg border border-dashed border-border bg-muted/10 p-3 text-xs text-muted-foreground">
                  No deductions recorded — full {view.startingScore}-point posture.
                </p>
              ) : (
                families.map((family) => (
                  <div key={family} className="flex items-center gap-3">
                    <span className="w-10 shrink-0 font-mono text-xs text-foreground/70">
                      {family}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full ${band.barClass}`}
                        style={{
                          width: `${Math.min(100, Math.max(4, (familyWeight(family) / maxFamilyWeight) * 100))}%`,
                        }}
                      />
                    </div>
                    <span className="w-16 shrink-0 text-right text-xs font-semibold tabular-nums text-foreground/70">
                      −{perFamilyShare.toFixed(1)} pts
                    </span>
                  </div>
                ))
              )}
              {families.length > 0 && view.deduction > 0 && (
                <p className="text-xs text-muted-foreground">
                  Bars scale against the heaviest control family; point shares are an equal split of
                  the {view.deduction}-point total.
                </p>
              )}
            </div>

            {view.note && <p className="text-xs text-muted-foreground">{view.note}</p>}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

/** Curried helper removed — panels receive `onToggleDemo` directly. */

/* ------------------------------------------------------------------ */
/* Panel 2 — reporting clocks                                          */
/* ------------------------------------------------------------------ */

function ReportingClocksPanel({ clientId, demoMode, onEnableDemo, onToggleDemo, className }: PanelProps) {
  const clocksQuery = useReportingClocks(clientId);

  const live = clocksQuery.data ? normalizeReportingClocks(clocksQuery.data) : null;
  const isLoading = !live && clocksQuery.isLoading;
  const isDegraded = !live && !!clocksQuery.isError;
  const showDemo = !live && demoMode;
  const view = live ?? (showDemo ? buildDemoReportingClocks() : null);
  const pill = sectionPill(live !== null, showDemo, isLoading);
  const isEmpty = view !== null && isEmptyReportingClocks(view);

  return (
    <Card className={className}>
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-primary shrink-0" />
            Incident reporting clocks
          </CardTitle>
          <CardDescription>
            DFARS 252.204-7012 (DIBNet) and CIRCIA 72-hour notification windows per incident.
          </CardDescription>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Badge variant={pill.badgeVariant} className="text-xs">
            {pill.label}
          </Badge>
          <DemoToggle demoMode={demoMode} onToggle={onToggleDemo} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showDemo && <WorkflowDemoBanner context="federalWorkflows.getReportingClocks" />}

        {isLoading ? (
          /* Loading skeleton - replaces content 1:1 (UI-STANDARD 13) */
          <div className="space-y-3" aria-hidden="true">
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : isDegraded && !view ? (
          /* Degraded - endpoint not live yet (UI-STANDARD 16.2) */
          <EmptyState
            icon={Timer}
            title="Connect the federalWorkflows.getReportingClocks API"
            description="Reporting deadlines land with packages/core/src/server/routers/federal-workflows.ts. Preview the panel with sample data meanwhile."
            action={{ label: "Preview with Demo Data", onClick: onEnableDemo }}
          />
        ) : isEmpty ? (
          <EmptyState
            icon={Timer}
            title={CLOCKS_EMPTY_TITLE}
            description="Reportable incident clocks appear here automatically once incidents are detected."
          />
        ) : view ? (
          <>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="h-12 border-b border-border bg-muted/30">
                    <th className="px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Incident
                    </th>
                    <th className="px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Severity
                    </th>
                    <th className="px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      DFARS 7012 · DIBNet
                    </th>
                    <th className="px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Report due by
                    </th>
                    <th className="px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      CIRCIA · CISA
                    </th>
                    <th className="px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Evidence until
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {view.clocks.map((clock) => {
                    const dibnetKey = normalizeDibnetStatus(clock.dibnetStatus);
                    const dibnetMeta = DIBNET_STATUS_META[dibnetKey];
                    const circiaMeta = CIRCIA_STATUS_META[normalizeCirciaStatus(clock.circiaStatus)];
                    const sevMeta = severityMeta(clock.severity);
                    const isOverdue = dibnetKey === "overdue";
                    return (
                      <tr
                        key={clock.incidentId}
                        className={`border-b border-border last:border-b-0 hover:bg-muted/50 ${
                          isOverdue ? "bg-destructive/5" : ""
                        }`}
                      >
                        <td className="p-4">
                          <p className={`font-semibold ${isOverdue ? "text-destructive" : "text-foreground"}`}>
                            {clock.title ?? `Incident #${clock.incidentId}`}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            #{clock.incidentId}
                            {clock.fismaFeedRequired ? " · FISMA feed required" : ""}
                          </p>
                        </td>
                        <td className="p-4">
                          <Badge variant={sevMeta.badgeVariant} className="text-xs">
                            {sevMeta.label}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Badge variant={dibnetMeta.badgeVariant} className="whitespace-nowrap text-xs">
                            {dibnetBadgeLabel(clock)}
                          </Badge>
                          {!clock.reportedToAuthorities && dibnetKey !== "reported" && (
                            <p className="mt-1 text-xs text-muted-foreground">Not yet reported</p>
                          )}
                        </td>
                        <td className="p-4 whitespace-nowrap tabular-nums text-foreground/70">
                          {formatWorkflowTimestamp(clock.dfarsReportDueBy) ?? "—"}
                        </td>
                        <td className="p-4">
                          <Badge variant={circiaMeta.badgeVariant} className="text-xs">
                            {circiaMeta.label}
                          </Badge>
                        </td>
                        <td className="p-4 whitespace-nowrap tabular-nums text-foreground/70">
                          {formatWorkflowTimestamp(clock.evidenceRetentionUntil) ?? "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {view.note && <p className="text-xs text-muted-foreground">{view.note}</p>}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Panel 3 — continuous monitoring dashboard                           */
/* ------------------------------------------------------------------ */

function ConMonDashboardPanel({ clientId, demoMode, onEnableDemo, onToggleDemo, className }: PanelProps) {
  const conMonQuery = useConMonDashboard(clientId);

  const live = conMonQuery.data ? normalizeConMonDashboard(conMonQuery.data) : null;
  const isLoading = !live && conMonQuery.isLoading;
  const isDegraded = !live && !!conMonQuery.isError;
  const showDemo = !live && demoMode;
  const view = live ?? (showDemo ? buildDemoConMonDashboard() : null);
  const pill = sectionPill(live !== null, showDemo, isLoading);
  const isEmpty = view !== null && isEmptyConMonDashboard(view);

  const posture = view?.controlPosture;
  const coveragePct =
    posture && posture.total > 0 ? Math.round((posture.implemented / posture.total) * 100) : 0;

  return (
    <Card className={className}>
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Radar className="h-5 w-5 text-primary shrink-0" />
            Continuous monitoring
          </CardTitle>
          <CardDescription>
            Control posture across SSPs and POA&amp;M aging with days-overdue tracking.
          </CardDescription>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Badge variant={pill.badgeVariant} className="text-xs">
            {pill.label}
          </Badge>
          <DemoToggle demoMode={demoMode} onToggle={onToggleDemo} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showDemo && <WorkflowDemoBanner context="federalWorkflows.getConMonDashboard" />}

        {isLoading ? (
          /* Loading skeleton - replaces content 1:1 (UI-STANDARD 13) */
          <div className="space-y-4" aria-hidden="true">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[0, 1, 2, 3].map((index) => (
                <Skeleton key={index} className="h-16 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-40 w-full rounded-xl" />
          </div>
        ) : isDegraded && !view ? (
          /* Degraded - endpoint not live yet (UI-STANDARD 16.2) */
          <EmptyState
            icon={Radar}
            title="Connect the federalWorkflows.getConMonDashboard API"
            description="Posture and POA&M aging land with packages/core/src/server/routers/federal-workflows.ts. Preview the panel with sample data meanwhile."
            action={{ label: "Preview with Demo Data", onClick: onEnableDemo }}
          />
        ) : isEmpty ? (
          <EmptyState
            icon={Radar}
            title={CONMON_EMPTY_TITLE}
            description="Create FISMA systems and SSP controls, then their posture and aging roll up here automatically."
          />
        ) : view && posture ? (
          <>
            {/* Control posture tiles */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatTile label="Total controls" value={posture.total} />
              <StatTile label="Implemented" value={posture.implemented} />
              <StatTile label="Partial" value={posture.partial} />
              <StatTile label="Inherited" value={posture.inherited} />
            </div>

            {/* Implementation coverage */}
            <div className="space-y-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-[var(--success-foreground)]"
                  style={{ width: `${Math.min(100, Math.max(0, coveragePct))}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {coveragePct}% of assessed controls fully implemented
                {view.significantChangePending ? " · significant change pending re-authorization" : ""}.
              </p>
            </div>

            {/* POA&M aging table */}
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="h-12 border-b border-border bg-muted/30">
                    <th className="px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Weakness
                    </th>
                    <th className="px-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Risk
                    </th>
                    <th className="px-4 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Days overdue
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {view.overduePoamItems.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-sm text-muted-foreground">
                        No past-due POA&amp;M items — aging is clear.
                      </td>
                    </tr>
                  ) : (
                    view.overduePoamItems.map((item) => {
                      const riskMeta = riskRatingMeta(item.risk);
                      const severe = item.daysOverdue >= 30;
                      return (
                        <tr
                          key={item.id}
                          className="border-b border-border last:border-b-0 hover:bg-muted/50"
                        >
                          <td className="p-4">
                            <p className="font-semibold text-foreground">
                              {item.weakness ?? `POA&M item #${item.id}`}
                            </p>
                            <p className="mt-0.5 font-mono text-xs text-muted-foreground">#{item.id}</p>
                          </td>
                          <td className="p-4">
                            <Badge variant={riskMeta.badgeVariant} className="text-xs">
                              {riskMeta.label}
                            </Badge>
                          </td>
                          <td
                            className={`p-4 text-right font-semibold tabular-nums whitespace-nowrap ${
                              severe ? "text-destructive" : "text-foreground/70"
                            }`}
                          >
                            {item.daysOverdue}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground">
              Items ≥30 days overdue are highlighted; close them to lift the SPRS score.
            </p>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Panel 4 — CMMC readiness band                                       */
/* ------------------------------------------------------------------ */

function CmmcReadinessPanel({ clientId, demoMode, onEnableDemo, onToggleDemo, className }: PanelProps) {
  const readinessQuery = useCmmcReadiness(clientId);

  const live = readinessQuery.data ? normalizeCmmcReadiness(readinessQuery.data) : null;
  const isLoading = !live && readinessQuery.isLoading;
  const isDegraded = !live && !!readinessQuery.isError;
  const showDemo = !live && demoMode;
  const view = live ?? (showDemo ? buildDemoCmmcReadiness() : null);
  const pill = sectionPill(live !== null, showDemo, isLoading);
  const isEmpty = view !== null && isEmptyCmmcReadiness(view);

  const band = view ? cmmcBandMeta(view.readinessPct) : null;
  const bandLabel = view?.ssPBProxy ?? band?.label ?? "";

  return (
    <Card className={className}>
      <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
            CMMC Level 2 readiness
          </CardTitle>
          <CardDescription>
            Per-control rollup scored against the SS/PB maturity proxy.
          </CardDescription>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Badge variant={pill.badgeVariant} className="text-xs">
            {pill.label}
          </Badge>
          <DemoToggle demoMode={demoMode} onToggle={onToggleDemo} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {showDemo && <WorkflowDemoBanner context="federalWorkflows.getCmmcReadiness" />}

        {isLoading ? (
          /* Loading skeleton - replaces content 1:1 (UI-STANDARD 13) */
          <div className="space-y-4" aria-hidden="true">
            <Skeleton className="h-12 w-64 rounded-lg" />
            <Skeleton className="h-2 w-full rounded-full" />
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <Skeleton key={index} className="h-16 rounded-lg" />
              ))}
            </div>
          </div>
        ) : isDegraded && !view ? (
          /* Degraded - endpoint not live yet (UI-STANDARD 16.2) */
          <EmptyState
            icon={ShieldCheck}
            title="Connect the federalWorkflows.getCmmcReadiness API"
            description="Readiness scoring lands with packages/core/src/server/routers/federal-workflows.ts. Preview the panel with sample data meanwhile."
            action={{ label: "Preview with Demo Data", onClick: onEnableDemo }}
          />
        ) : isEmpty ? (
          <EmptyState
            icon={ShieldCheck}
            title={CMMC_EMPTY_TITLE}
            description={
              (view?.reason ?? "") ||
              "Create a System Security Plan to compute CMMC Level 2 readiness."
            }
          />
        ) : view && band ? (
          <>
            {/* Band badge + readiness bar */}
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={band.badgeVariant}>{bandLabel}</Badge>
              <span className="text-2xl font-bold tabular-nums text-foreground">
                {view.readinessPct}%
              </span>
              <span className="text-sm text-muted-foreground">readiness</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${band.barClass}`}
                style={{ width: `${Math.min(100, Math.max(0, view.readinessPct))}%` }}
              />
            </div>

            {/* Per-control rollup summary */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <StatTile label="Assessed controls" value={view.assessedControls} />
              <StatTile label="Implemented" value={view.implemented} />
              <StatTile label="Partial" value={view.partial} />
              <StatTile label="Planned" value={view.planned} />
              <StatTile label="Evidence-backed" value={view.evidenceBackedControls} />
              <StatTile label="Open weaknesses" value={view.openWeaknesses} />
            </div>

            {/* Gaps to close */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Gaps to close
              </p>
              {view.gapsToClose.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border bg-muted/10 p-3 text-xs text-muted-foreground">
                  No outstanding gaps reported.
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {view.gapsToClose.map((gap) => (
                    <li key={gap} className="flex items-start gap-2 text-sm text-foreground/80">
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--warning-foreground)]"
                        aria-hidden="true"
                      />
                      {gap}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {view.cmmcL2Target && (
              <p className="text-xs text-muted-foreground">Target: {view.cmmcL2Target}</p>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Panel 5 — export actions row                                        */
/* ------------------------------------------------------------------ */

interface ActionStatus {
  tone: "ok" | "error";
  text: string;
}

function StatusLine({ status }: { status: ActionStatus | null }) {
  if (!status) return null;
  return (
    <p
      role="status"
      className={`text-xs leading-relaxed ${
        status.tone === "ok" ? "text-[var(--success-foreground)]" : "text-destructive"
      }`}
    >
      {status.text}
    </p>
  );
}

/**
 * Export actions row: OSCAL JSON downloads (SSP + POA&M), eMASS CSV download
 * and SAR → POA&M sync. Downloads are produced client-side from returned
 * strings/objects via Blob + objectURL — no server file streaming involved.
 */
function ExportActionsRow({ clientId, className }: { clientId: number; className?: string }) {
  const [sspIdText, setSspIdText] = useState("1");
  const [poamIdText, setPoamIdText] = useState("1");
  const [sarIdText, setSarIdText] = useState("1");
  const [oscalSspStatus, setOscalSspStatus] = useState<ActionStatus | null>(null);
  const [oscalPoamStatus, setOscalPoamStatus] = useState<ActionStatus | null>(null);
  const [emassStatus, setEmassStatus] = useState<ActionStatus | null>(null);
  const [syncStatus, setSyncStatus] = useState<ActionStatus | null>(null);

  const exportSspOscal = useExportSspOscal();
  const exportPoamOscal = useExportPoamOscal();
  const exportEmassCsv = useExportPoamEmassCsv();
  const syncSarToPoam = useSyncSarToPoam();

  const sspId = parseEntityId(sspIdText);
  const poamId = parseEntityId(poamIdText);
  const sarId = parseEntityId(sarIdText);

  const handleExportSspOscal = () => {
    if (!sspId) return;
    setOscalSspStatus(null);
    exportSspOscal.mutate(
      { clientId, sspId },
      {
        onSuccess: (payload: OscalExportPayload) => {
          const filename = oscalFilename(payload, `oscal_ssp_${sspId}`);
          downloadStringAsFile(filename, JSON.stringify(payload, null, 2), "application/json");
          setOscalSspStatus({ tone: "ok", text: `Downloaded ${filename}` });
        },
        onError: (error) =>
          setOscalSspStatus({ tone: "error", text: `SSP OSCAL export failed: ${mutationErrorMessage(error)}` }),
      }
    );
  };

  const handleExportPoamOscal = () => {
    if (!poamId) return;
    setOscalPoamStatus(null);
    exportPoamOscal.mutate(
      { clientId, poamId },
      {
        onSuccess: (payload: OscalExportPayload) => {
          const filename = oscalFilename(payload, `oscal_poam_${poamId}`);
          downloadStringAsFile(filename, JSON.stringify(payload, null, 2), "application/json");
          setOscalPoamStatus({ tone: "ok", text: `Downloaded ${filename}` });
        },
        onError: (error) =>
          setOscalPoamStatus({ tone: "error", text: `POA&M OSCAL export failed: ${mutationErrorMessage(error)}` }),
      }
    );
  };

  const handleExportEmassCsv = () => {
    if (!poamId) return;
    setEmassStatus(null);
    exportEmassCsv.mutate(
      { clientId, poamId },
      {
        onSuccess: (result: EmassCsvExportResult) => {
          if (!result.csv) {
            setEmassStatus({ tone: "error", text: "eMASS export returned no CSV content." });
            return;
          }
          const filename = result.filename || `emass_poam_${poamId}.csv`;
          downloadStringAsFile(filename, result.csv, "text/csv");
          setEmassStatus({
            tone: "ok",
            text: `Downloaded ${filename}${result.itemCount != null ? ` (${result.itemCount} items)` : ""}`,
          });
        },
        onError: (error) =>
          setEmassStatus({ tone: "error", text: `eMASS export failed: ${mutationErrorMessage(error)}` }),
      }
    );
  };

  const handleSyncSarToPoam = () => {
    if (!sarId) return;
    setSyncStatus(null);
    syncSarToPoam.mutate(
      { clientId, sarId },
      {
        onSuccess: (result) => {
          setSyncStatus({
            tone: "ok",
            text: `POA&M #${result.poamId}: created ${result.created} of ${result.actionable} actionable findings (${result.findingsTotal} findings scanned).`,
          });
        },
        onError: (error) =>
          setSyncStatus({ tone: "error", text: `SAR → POA&M sync failed: ${mutationErrorMessage(error)}` }),
      }
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileJson className="h-5 w-5 text-primary shrink-0" />
          Artifact exports &amp; sync
        </CardTitle>
        <CardDescription>
          Generate OSCAL 1.1.2 JSON, eMASS-compatible CSV and sync SAR findings into remediation
          POA&amp;Ms.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Export actions */}
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="space-y-1">
            <label htmlFor="fw-export-ssp-id" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              SSP ID
            </label>
            <Input
              id="fw-export-ssp-id"
              type="number"
              min={1}
              value={sspIdText}
              onChange={(event) => setSspIdText(event.target.value)}
              className="h-9 w-28 font-mono text-sm"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-2"
            onClick={handleExportSspOscal}
            disabled={!sspId || exportSspOscal.isPending || exportSspOscal.isLoading}
          >
            <FileJson className="h-4 w-4" />
            SSP OSCAL JSON
          </Button>

          <div className="space-y-1">
            <label htmlFor="fw-export-poam-id" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              POA&amp;M ID
            </label>
            <Input
              id="fw-export-poam-id"
              type="number"
              min={1}
              value={poamIdText}
              onChange={(event) => setPoamIdText(event.target.value)}
              className="h-9 w-28 font-mono text-sm"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-2"
            onClick={handleExportPoamOscal}
            disabled={!poamId || exportPoamOscal.isPending || exportPoamOscal.isLoading}
          >
            <FileJson className="h-4 w-4" />
            POA&amp;M OSCAL JSON
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-2"
            onClick={handleExportEmassCsv}
            disabled={!poamId || exportEmassCsv.isPending || exportEmassCsv.isLoading}
          >
            <FileSpreadsheet className="h-4 w-4" />
            eMASS CSV
          </Button>
        </div>
        <div className="space-y-1">
          <StatusLine status={oscalSspStatus} />
          <StatusLine status={oscalPoamStatus} />
          <StatusLine status={emassStatus} />
        </div>

        {/* SAR → POA&M sync */}
        <div className="flex flex-col lg:flex-row lg:items-end gap-4 border-t border-border pt-4">
          <div className="space-y-1">
            <label htmlFor="fw-sync-sar-id" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              SAR ID
            </label>
            <Input
              id="fw-sync-sar-id"
              type="number"
              min={1}
              value={sarIdText}
              onChange={(event) => setSarIdText(event.target.value)}
              className="h-9 w-28 font-mono text-sm"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 gap-2"
            onClick={handleSyncSarToPoam}
            disabled={!sarId || syncSarToPoam.isPending || syncSarToPoam.isLoading}
          >
            <RefreshCw
              className={`h-4 w-4 ${syncSarToPoam.isPending || syncSarToPoam.isLoading ? "animate-spin" : ""}`}
            />
            Sync SAR → POA&amp;M
          </Button>
          <StatusLine status={syncStatus} />
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Section root                                                        */
/* ------------------------------------------------------------------ */

/**
 * "Federal workflow intelligence" — trailing section of the Federal Hub.
 * One shared demo-mode gate drives every query panel (off by default, §17).
 */
export function FederalWorkflowsPanels({ clientId }: { clientId: number }) {
  const [demoMode, setDemoMode] = useState(false);
  const active = clientId > 0;

  return (
    <section aria-labelledby="federal-workflows-heading" className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h2
            id="federal-workflows-heading"
            className="text-xl md:text-2xl font-bold tracking-tight text-foreground"
          >
            Federal Workflow Intelligence
          </h2>
          <p className="text-sm text-muted-foreground">
            SPRS scoring, reporting clocks, continuous monitoring, CMMC readiness and artifact
            exports over the <code className="text-xs">federalWorkflows.*</code> APIs.
          </p>
        </div>
        <DemoToggle demoMode={demoMode} onToggle={setDemoMode} />
      </div>

      {!active ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/10 p-3 text-xs text-muted-foreground text-center">
          Select a workspace client to scope federal workflow intelligence to its artifacts.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <SprsScoreCard
            clientId={clientId}
            demoMode={demoMode}
            onEnableDemo={() => setDemoMode(true)}
            onToggleDemo={setDemoMode}
          />
          <CmmcReadinessPanel
            clientId={clientId}
            demoMode={demoMode}
            onEnableDemo={() => setDemoMode(true)}
            onToggleDemo={setDemoMode}
          />
          <ReportingClocksPanel
            clientId={clientId}
            demoMode={demoMode}
            onEnableDemo={() => setDemoMode(true)}
            onToggleDemo={setDemoMode}
            className="xl:col-span-2"
          />
          <ConMonDashboardPanel
            clientId={clientId}
            demoMode={demoMode}
            onEnableDemo={() => setDemoMode(true)}
            onToggleDemo={setDemoMode}
            className="xl:col-span-2"
          />
          <ExportActionsRow clientId={clientId} className="xl:col-span-2" />
        </div>
      )}
    </section>
  );
}

export default FederalWorkflowsPanels;
