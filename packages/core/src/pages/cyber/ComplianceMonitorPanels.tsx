/**
 * NIS2 Continuous Compliance Monitoring - panels
 * ===============================================
 * Renders the `complianceMonitor.*` contract (see
 * `packages/core/src/pages/complianceMonitorApi.ts`) as a monitoring
 * section for NIS2 Phase 5 Task 5.2 - continuous compliance monitoring
 * (Art. 21(2)(f), ENISA Measure 7.1):
 *
 *   1. Compliance posture scorecard  <- complianceMonitor.posture
 *   2. Evidence coverage            <- complianceMonitor.evidenceCoverage
 *   3. Audit report preview         <- complianceMonitor.auditReport
 *
 * Every panel follows UI-STANDARD 16 graceful degradation: skeleton while
 * loading (checked before empty, never a spinner-forever), EmptyState
 * ("Connect the complianceMonitor.<proc> API") on error or missing endpoint,
 * token-only colors (2) - no raw slate/sky hexes, dark-mode safe. Demo mode
 * (17) renders a persistent amber banner whenever sample data is shown and
 * is ON by default only when no live data props are supplied; live endpoint
 * data always wins over demo data.
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
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileText,
  FlaskConical,
  Gauge,
  Hourglass,
  Layers,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import {
  buildDemoAuditReport,
  buildDemoAuditReportInput,
  buildDemoCompliancePosture,
  buildDemoCompliancePostureInput,
  buildDemoEvidenceCoverage,
  buildDemoEvidenceCoverageInput,
  coverageBarClass,
  EVIDENCE_STATUS_META,
  formatDriftPts,
  formatRate,
  formatScore,
  POSTURE_STATUS_META,
  POSTURE_STATUS_ORDER,
  postureBandClass,
  TREND_META,
  trendGlyph,
  useAuditReport,
  useCompliancePosture,
  useEvidenceCoverage,
  type AuditReportInput,
  type AuditReportResponse,
  type AuditSectionStatus,
  type ComplianceBadgeVariant,
  type CompliancePostureInput,
  type CompliancePostureResponse,
  type ComplianceTrend,
  type EvidenceCoverageInput,
  type EvidenceCoverageResponse,
} from "@/pages/complianceMonitorApi";

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
            ? `The ${procedure} endpoint is not live yet. It appears once the complianceMonitor router is deployed.`
            : emptyHint
        }
        action={onEnableDemo ? { label: "Preview with Demo Data", onClick: onEnableDemo } : undefined}
      />
    );
  }
  return <div className="space-y-3">{children}</div>;
}

/** Score bar (UI-STANDARD 18) - token colors via .progress-* classes. */
function ScoreBar({ value, barClass }: { value: number; barClass: "progress-success" | "progress-warning" | "progress-error" }) {
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

/** Trend pill for a metric (score semantics - up = improved). */
function TrendPill({ trend }: { trend: ComplianceTrend }) {
  const meta = TREND_META[trend];
  return (
    <Badge variant={meta.badgeVariant} className="gap-1">
      <span aria-hidden="true">{trendGlyph(trend)}</span>
      {meta.label}
    </Badge>
  );
}

/** Audit section status -> badge label/variant. */
const AUDIT_SECTION_STATUS_META: Record<AuditSectionStatus, { label: string; badgeVariant: ComplianceBadgeVariant }> = {
  pass: { label: "Pass", badgeVariant: "success" },
  warn: { label: "Warn", badgeVariant: "warning" },
  fail: { label: "Fail", badgeVariant: "error" },
  info: { label: "Info", badgeVariant: "info" },
};

/* ------------------------------------------------------------------ */
/* Posture scorecard panel                                             */
/* ------------------------------------------------------------------ */

function PostureScorecardPanel({
  posture,
  demoMode,
  onEnableDemo,
}: {
  posture: CompliancePostureResponse | null;
  demoMode: boolean;
  onEnableDemo: () => void;
}) {
  const input = useMemo<CompliancePostureInput | null>(
    () => (demoMode ? buildDemoCompliancePostureInput() : null),
    [demoMode]
  );
  const query = useCompliancePosture(input);
  const data: CompliancePostureResponse | undefined = demoMode
    ? (query.data ?? buildDemoCompliancePosture())
    : (posture ?? query.data);

  return (
    <Card className="rounded-xl shadow-sm border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Gauge className="h-5 w-5 text-muted-foreground" />
          Compliance posture scorecard
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Overall NIS2 posture, trend, drift and the five lowest-scoring measures (Art. 21(2)(f)).
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Degrade
          isLoading={query.isLoading}
          hasData={!!data}
          isError={query.isError}
          procedure="complianceMonitor.posture"
          icon={Gauge}
          emptyHint="The posture scorecard appears once the complianceMonitor router is deployed. Enable demo mode to preview the monitoring view."
          onEnableDemo={onEnableDemo}
          skeleton={
            <>
              <Skeleton className="h-28 w-full rounded-lg" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-20 rounded-full" />
                ))}
              </div>
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </>
          }
        >
          {data ? (
            <div className="space-y-5">
              {/* Big score + status band */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-muted/30 px-4 py-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Overall posture
                  </div>
                  <div className={cn("mt-1 text-3xl font-bold tabular-nums", postureBandClass(data.status))}>
                    {formatScore(data.overallScore)}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      Coverage{" "}
                      <span className="font-semibold tabular-nums text-foreground">
                        {formatRate(data.coverageRate)}
                      </span>
                    </span>
                    <span>
                      Drift{" "}
                      <span className="font-semibold tabular-nums text-foreground">
                        {formatDriftPts(data.driftPts)}
                      </span>
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Badge variant={POSTURE_STATUS_META[data.status].badgeVariant} className="px-3 py-1">
                    {POSTURE_STATUS_META[data.status].label}
                  </Badge>
                  <TrendPill trend={data.trend} />
                </div>
              </div>

              {/* Status band chips */}
              <div className="flex flex-wrap gap-2">
                {POSTURE_STATUS_ORDER.map((status) => {
                  const meta = POSTURE_STATUS_META[status];
                  const count = data.statusCounts[status === "At Risk" ? "atRisk" : status === "No Data" ? "noData" : status.toLowerCase() as keyof typeof data.statusCounts];
                  return (
                    <span
                      key={status}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-semibold",
                        count > 0 ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", meta.dotClass)} />
                      {meta.label}
                      <span className="tabular-nums">{count}</span>
                    </span>
                  );
                })}
              </div>

              {/* Verdict */}
              <p className="text-sm text-muted-foreground">{data.verdict}</p>

              {/* Top gaps */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Top gaps
                </h3>
                {data.topGaps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/10 px-6 py-8 text-center">
                    <CheckCircle2 className="h-8 w-8 text-[var(--success-foreground)]" />
                    <p className="mt-3 text-sm font-semibold text-foreground">No gaps detected</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      All assessed measures meet the target band.
                    </p>
                  </div>
                ) : (
                  <ul className="space-y-2">
                    {data.topGaps.map((gap) => {
                      const meta = POSTURE_STATUS_META[gap.status] ?? POSTURE_STATUS_META["No Data"];
                      return (
                        <li
                          key={String(gap.measureId)}
                          className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--warning-foreground)]" />
                            <span className="truncate text-sm font-medium text-foreground">
                              {gap.name}
                            </span>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="text-sm font-semibold tabular-nums text-muted-foreground">
                              {formatScore(gap.score)}
                            </span>
                            <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <p className="text-xs text-muted-foreground tabular-nums">
                {data.assessedMeasures} of {data.totalMeasures} measures assessed ·{" "}
                {data.statusCounts.noData} with no data
              </p>
            </div>
          ) : null}
        </Degrade>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Evidence coverage panel                                             */
/* ------------------------------------------------------------------ */

function EvidenceCoveragePanel({
  evidence,
  demoMode,
  onEnableDemo,
}: {
  evidence: EvidenceCoverageResponse | null;
  demoMode: boolean;
  onEnableDemo: () => void;
}) {
  const input = useMemo<EvidenceCoverageInput | null>(
    () => (demoMode ? buildDemoEvidenceCoverageInput() : null),
    [demoMode]
  );
  const query = useEvidenceCoverage(input);
  const data: EvidenceCoverageResponse | undefined = demoMode
    ? (query.data ?? buildDemoEvidenceCoverage())
    : (evidence ?? query.data);

  return (
    <Card className="rounded-xl shadow-sm border-border h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
          Evidence coverage
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Controls with current evidence, expiring/expired items and coverage per NIS2 measure.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Degrade
          isLoading={query.isLoading}
          hasData={!!data}
          isError={query.isError}
          procedure="complianceMonitor.evidenceCoverage"
          icon={ClipboardCheck}
          emptyHint="Evidence coverage appears once the complianceMonitor router is deployed. Enable demo mode to preview the coverage table."
          onEnableDemo={onEnableDemo}
          skeleton={
            <>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 rounded-xl" />
                ))}
              </div>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-2 flex-1 rounded-full" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </>
          }
        >
          {data ? (
            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard
                  label="Coverage rate"
                  value={<span className="tabular-nums">{formatRate(data.coverageRate)}</span>}
                  icon={ClipboardCheck}
                  tone={data.coverageRate >= 80 ? "green" : data.coverageRate >= 50 ? "amber" : "red"}
                >
                  <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                    {data.coveredCount} of {data.totalItems} controls
                  </p>
                </StatCard>
                <StatCard
                  label="Missing"
                  value={<span className="tabular-nums">{data.missingCount}</span>}
                  icon={AlertTriangle}
                  tone={data.missingCount > 0 ? "red" : "green"}
                >
                  <p className="mt-0.5 text-xs text-muted-foreground">No evidence attached</p>
                </StatCard>
                <StatCard
                  label="Expiring ≤ 90d"
                  value={<span className="tabular-nums">{data.expiringCount}</span>}
                  icon={Clock}
                  tone={data.expiringCount > 0 ? "amber" : "green"}
                >
                  <p className="mt-0.5 text-xs text-muted-foreground">Renewal window open</p>
                </StatCard>
                <StatCard
                  label="Expired"
                  value={<span className="tabular-nums">{data.expiredCount}</span>}
                  icon={Hourglass}
                  tone={data.expiredCount > 0 ? "red" : "green"}
                >
                  <p className="mt-0.5 text-xs text-muted-foreground">Past expiry date</p>
                </StatCard>
                <StatCard
                  label="Current"
                  value={<span className="tabular-nums">{data.currentCount}</span>}
                  icon={CheckCircle2}
                  tone="green"
                >
                  <p className="mt-0.5 text-xs text-muted-foreground">Within validity window</p>
                </StatCard>
                <StatCard
                  label="Avg evidence / control"
                  value={<span className="tabular-nums">{data.avgEvidencePerControl.toFixed(1)}</span>}
                  icon={Layers}
                  tone="green"
                >
                  <p className="mt-0.5 text-xs text-muted-foreground">Across all tracked controls</p>
                </StatCard>
              </div>

              {/* Coverage per measure */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Coverage by measure
                </h3>
                {data.byMeasure.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No measures tracked yet.</p>
                ) : (
                  <ul className="space-y-2">
                    {data.byMeasure.map((measure) => (
                      <li key={String(measure.measureId)} className="flex items-center gap-3">
                        <span className="w-40 shrink-0 truncate text-sm text-foreground">
                          {measure.name}
                        </span>
                        <div className="flex-1 min-w-0">
                          <ScoreBar value={measure.coverageRate} barClass={coverageBarClass(measure.coverageRate)} />
                        </div>
                        <span className="w-14 shrink-0 text-right text-sm font-semibold tabular-nums text-foreground">
                          {formatRate(measure.coverageRate)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Control-level detail */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Control-level detail
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="h-12 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <th className="px-4 text-left font-semibold">Control</th>
                        <th className="px-4 text-left font-semibold">Name</th>
                        <th className="px-4 text-right font-semibold">Status</th>
                        <th className="px-4 text-right font-semibold">Expiry</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.items.map((item) => (
                        <tr key={String(item.controlId)} className="border-b border-border hover:bg-muted/50">
                          <td className="p-4 text-sm font-semibold tabular-nums text-muted-foreground">
                            {item.controlId}
                          </td>
                          <td className="p-4 text-sm text-foreground">{item.name}</td>
                          <td className="p-4 text-right">
                            <Badge variant={EVIDENCE_STATUS_META[item.status].badgeVariant}>
                              {EVIDENCE_STATUS_META[item.status].label}
                            </Badge>
                          </td>
                          <td className="p-4 text-right">
                            <Badge variant={EVIDENCE_STATUS_META[item.expiry].badgeVariant}>
                              {EVIDENCE_STATUS_META[item.expiry].label}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </Degrade>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Audit report preview panel                                          */
/* ------------------------------------------------------------------ */

function AuditReportPreviewPanel({
  audit,
  demoMode,
  onEnableDemo,
}: {
  audit: AuditReportResponse | null;
  demoMode: boolean;
  onEnableDemo: () => void;
}) {
  const input = useMemo<AuditReportInput | null>(
    () => (demoMode ? buildDemoAuditReportInput() : null),
    [demoMode]
  );
  const query = useAuditReport(input);
  const data: AuditReportResponse | undefined = demoMode
    ? (query.data ?? buildDemoAuditReport())
    : (audit ?? query.data);

  return (
    <Card className="rounded-xl shadow-sm border-border h-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <FileText className="h-5 w-5 text-muted-foreground" />
          Audit report preview
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Generated NIS2 audit snapshot with section statuses (display only).
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Degrade
          isLoading={query.isLoading}
          hasData={!!data}
          isError={query.isError}
          procedure="complianceMonitor.auditReport"
          icon={FileText}
          emptyHint="The audit preview appears once the complianceMonitor router is deployed. Enable demo mode to preview the report."
          onEnableDemo={onEnableDemo}
          skeleton={
            <>
              <Skeleton className="h-6 w-1/2" />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-24 rounded-full" />
                ))}
              </div>
              <Skeleton className="h-44 w-full rounded-lg" />
            </>
          }
        >
          {data ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
                <div className="text-sm">
                  <span className="text-muted-foreground">Posture </span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {formatScore(data.postureScore)}
                  </span>
                  <span className="mx-2 text-muted-foreground">·</span>
                  <span className="text-muted-foreground">Coverage </span>
                  <span className="font-semibold tabular-nums text-foreground">
                    {formatRate(data.coverageRate)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" />
                    {data.recommendationCount} recommendations
                  </span>
                  {data.generatedAt ? (
                    <span className="tabular-nums">
                      · generated {new Date(data.generatedAt).toLocaleString()}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Section statuses */}
              <div className="flex flex-wrap gap-2">
                {data.sections.map((section) => (
                  <span
                    key={section.key}
                    className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs font-semibold text-foreground"
                  >
                    {section.title}
                    <Badge variant={AUDIT_SECTION_STATUS_META[section.status].badgeVariant}>
                      {AUDIT_SECTION_STATUS_META[section.status].label}
                    </Badge>
                  </span>
                ))}
              </div>

              {/* Markdown preview (display only) */}
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-4 font-mono text-xs leading-relaxed text-foreground/70">
                {data.report || "No report generated yet."}
              </pre>
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

export interface ComplianceMonitorPanelsProps {
  /** Live posture response (optional - demo mode takes over when absent). */
  posture?: CompliancePostureResponse | null;
  /** Live evidence-coverage response (optional). */
  evidence?: EvidenceCoverageResponse | null;
  /** Live audit-report response (optional). */
  audit?: AuditReportResponse | null;
}

export function ComplianceMonitorPanels({
  posture = null,
  evidence = null,
  audit = null,
}: ComplianceMonitorPanelsProps) {
  const [demoMode, setDemoMode] = useState(
    () => posture == null && evidence == null && audit == null
  );

  return (
    <section className="space-y-6">
      {/* Header + demo toggle (UI-STANDARD 17) */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              NIS2 Continuous Compliance Monitoring
            </h2>
            <p className="text-sm text-muted-foreground">
              Art. 21(2)(f) — ENISA Measure 7.1
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
            <code className="text-xs">complianceMonitor.*</code> APIs to see live monitoring.
          </span>
        </div>
      )}

      {/* Posture scorecard */}
      <PostureScorecardPanel
        posture={posture}
        demoMode={demoMode}
        onEnableDemo={() => setDemoMode(true)}
      />

      {/* Evidence coverage + audit preview side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EvidenceCoveragePanel
          evidence={evidence}
          demoMode={demoMode}
          onEnableDemo={() => setDemoMode(true)}
        />
        <AuditReportPreviewPanel
          audit={audit}
          demoMode={demoMode}
          onEnableDemo={() => setDemoMode(true)}
        />
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5" />
        Posture, evidence coverage and audit previews are derived from NIS2 Art. 21(2)(f) and ENISA
        Measure 7.1 - continuous compliance monitoring.
      </p>
    </section>
  );
}

export default ComplianceMonitorPanels;
