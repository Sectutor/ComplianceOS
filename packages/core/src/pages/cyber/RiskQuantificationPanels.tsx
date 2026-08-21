/**
 * NIS2 Risk Quantification - panels
 * ==================================
 * Renders the `riskQuantification.*` contract (see
 * `packages/core/src/pages/riskQuantificationApi.ts`) as the "NIS2 Risk
 * Quantification" section on the Risk Heat Map page:
 *
 *   1. Quantitative appetite      <- riskQuantification.appetite
 *   2. 5x5 likelihood x impact    <- riskQuantification.matrix
 *   3. Inherent vs residual       <- riskQuantification.residual
 *   4. Treatment plan cards       <- riskQuantification.treatmentPlans
 *
 * Every panel follows UI-STANDARD 16 graceful degradation: skeleton while
 * loading (checked before empty, never a spinner-forever), EmptyState
 * ("Connect the riskQuantification.<proc> API") on error or missing endpoint,
 * token-only colors (2) - no raw slate/gray/indigo surfaces, dark-mode safe.
 * The heat-matrix fills use the documented data-viz exception (18) and stay
 * consistent with pages/risk/RiskHeatmapPage.tsx. Demo mode (17) is gated
 * behind the "Demo data" switch, off by default, and renders a persistent
 * amber banner whenever sample data is shown. Live endpoint data always wins
 * over demo data.
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
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Activity,
  AlertTriangle,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Circle,
  ClipboardList,
  FlaskConical,
  Gauge,
  Grid3x3,
  ListChecks,
  Scale,
  ShieldAlert,
  Target,
  TrendingDown,
  type LucideIcon,
} from "lucide-react";
import {
  APPETITE_VERDICT_META,
  APPETITE_VERDICT_ORDER,
  buildDemoResidualInput,
  buildDemoResidualTracking,
  buildDemoRiskAppetite,
  buildDemoRiskAppetiteInput,
  buildDemoRiskMatrix,
  buildDemoRiskMatrixInput,
  buildDemoTreatmentPlans,
  buildDemoTreatmentPlansInput,
  daysUntilDeadline,
  deadlineCountdownMeta,
  DEFAULT_APPETITE_SCORE,
  DEMO_APPETITE_CONFIG,
  DEMO_QUANT_BASE_DATE,
  DEMO_QUANT_RISKS,
  DEMO_TREATMENT_HORIZON_DAYS,
  DEMO_TREATMENT_THRESHOLD,
  deriveLossAppetiteCheck,
  formatEur,
  formatQuantScore,
  QUANT_BAND_META,
  QUANT_BAND_ORDER,
  QUANT_CELL_EMPTY_CLASS,
  reductionBarClass,
  RESIDUAL_DIRECTION_META,
  RESIDUAL_DIRECTION_ORDER,
  TREATMENT_PRIORITY_META,
  TREATMENT_PRIORITY_ORDER,
  TREATMENT_STRATEGY_META,
  TREATMENT_STRATEGY_ORDER,
  utilizationBarClass,
  useResidualTracking,
  useRiskAppetite,
  useRiskMatrix,
  useTreatmentPlans,
  type AppetiteVerdict,
  type LossAppetiteCheck,
  type QuantBandMeta,
  type QuantBarClass,
  type QuantRiskBand,
  type ResidualQueryInput,
  type ResidualTrackingResult,
  type RiskAppetiteQueryInput,
  type RiskAppetiteResult,
  type RiskMatrixQueryInput,
  type RiskMatrixResult,
  type TreatmentPlanItem,
  type TreatmentPlansQueryInput,
  type TreatmentPlanResult,
} from "@/pages/riskQuantificationApi";

/** Stable anchor id for the section (deep-link / internal links). */
export const NIS2_RISK_QUANTIFICATION_SECTION_ID = "nis2-risk-quantification";

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
            ? `The ${procedure} endpoint is not live yet. It appears once the riskQuantification router is deployed.`
            : emptyHint
        }
        action={onEnableDemo ? { label: "Preview with Demo Data", onClick: onEnableDemo } : undefined}
      />
    );
  }
  return <div className="space-y-3">{children}</div>;
}

/** Score bar (UI-STANDARD 18) - token colors via .progress-* classes. */
function ScoreBar({ value, barClass }: { value: number; barClass: QuantBarClass }) {
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

/** Compact health tile (UI-STANDARD 4: numbers tabular-nums). */
function HealthTile({
  icon: Icon,
  label,
  value,
  valueClass = "text-foreground",
  hint,
  children,
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  valueClass?: string;
  hint?: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className="rounded-xl shadow-sm border-border h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xs font-semibold tracking-tight text-muted-foreground">
          <Icon className="h-4 w-4" />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className={cn("text-2xl font-bold tabular-nums", valueClass)}>{value}</div>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        {children}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* 1. Quantitative appetite                                            */
/* ------------------------------------------------------------------ */

function AppetitePanel({
  appetite,
  appetiteQuery,
  lossCheck,
  appetiteScore,
  tolerancePct,
  onEnableDemo,
}: {
  appetite: RiskAppetiteResult | undefined;
  appetiteQuery: { isLoading: boolean; isError: boolean };
  lossCheck: LossAppetiteCheck | null;
  appetiteScore: number;
  tolerancePct: number;
  onEnableDemo: () => void;
}) {
  return (
    <Card className="rounded-xl shadow-sm border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Scale className="h-5 w-5 text-muted-foreground" />
          Quantitative risk appetite
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Score = likelihood x impact (1-25). Verdicts against the appetite threshold including the
          tolerance margin, plus the annual-loss (EUR) appetite check.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Degrade
          isLoading={appetiteQuery.isLoading && !appetite}
          hasData={(appetite?.assessedCount ?? 0) > 0}
          isError={appetiteQuery.isError && !appetite}
          procedure="riskQuantification.appetite"
          icon={Scale}
          emptyHint="No risks have been assessed against the appetite yet. Assess risks in the register, or enable demo mode to preview the panel."
          onEnableDemo={onEnableDemo}
          skeleton={
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="rounded-xl shadow-sm border-border">
                    <CardHeader className="pb-2">
                      <Skeleton className="h-4 w-24" />
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Skeleton className="h-7 w-14" />
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Skeleton className="h-24 w-full" />
            </div>
          }
        >
          {appetite ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <HealthTile
                  icon={ListChecks}
                  label="Assessed risks"
                  value={appetite.assessedCount}
                  hint={`${appetite.totalRisks} rows evaluated`}
                />
                <HealthTile
                  icon={Activity}
                  label="Avg score"
                  value={
                    <span className="tabular-nums">
                      {appetite.avgScore}
                      <span className="text-sm font-medium text-muted-foreground">/25</span>
                    </span>
                  }
                  hint={`Appetite ${appetiteScore} · tolerance ${tolerancePct}%`}
                />
                <HealthTile
                  icon={Gauge}
                  label="Appetite utilization"
                  value={
                    <span className="tabular-nums">
                      {appetite.appetiteUtilizationPct}
                      <span className="text-sm font-medium text-muted-foreground">%</span>
                    </span>
                  }
                  hint="Avg score relative to the appetite"
                >
                  <div className="mt-3">
                    <ScoreBar
                      value={appetite.appetiteUtilizationPct}
                      barClass={utilizationBarClass(appetite.appetiteUtilizationPct)}
                    />
                  </div>
                </HealthTile>
                <HealthTile
                  icon={AlertTriangle}
                  label="Exceeded"
                  value={appetite.exceededCount}
                  valueClass={
                    appetite.exceededCount > 0
                      ? "text-[var(--error-foreground)]"
                      : "text-foreground"
                  }
                  hint="Above appetite + tolerance"
                />
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                {APPETITE_VERDICT_ORDER.map((verdict: AppetiteVerdict) => {
                  const meta = APPETITE_VERDICT_META[verdict];
                  const count =
                    verdict === "within"
                      ? appetite.withinCount
                      : verdict === "tolerance"
                        ? appetite.toleranceCount
                        : appetite.exceededCount;
                  return (
                    <Badge key={verdict} variant={meta.badgeVariant} className="gap-1.5">
                      <span aria-hidden>{meta.glyph}</span>
                      {meta.label}
                      <span className="tabular-nums">{count}</span>
                    </Badge>
                  );
                })}
              </div>

              <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-xl border border-border p-4">
                  <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Appetite breaches (top 5)
                  </h4>
                  {appetite.breaches.length === 0 ? (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 text-[var(--success-foreground)]" />
                      No breaches - every assessed risk is within appetite.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {appetite.breaches.map((breach) => (
                        <li
                          key={String(breach.id)}
                          className="flex items-center gap-3 rounded-xl border border-border px-3 py-2"
                        >
                          <Badge variant="error" className="shrink-0 tabular-nums">
                            {formatQuantScore(breach.score)}
                          </Badge>
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                            {breach.name || "Unnamed risk"}
                          </span>
                          <span className="shrink-0 text-xs font-medium text-[var(--error-foreground)]">
                            Exceeded
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <ListChecks className="h-3.5 w-3.5" />
                    Recommendations
                  </h4>
                  <ul className="space-y-2">
                    {appetite.recommendations.slice(0, 5).map((recommendation, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-foreground">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/40" />
                        {recommendation}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* EUR annual-loss appetite check */}
              <div className="mt-5 rounded-xl border border-border p-4">
                <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <Banknote className="h-3.5 w-3.5" />
                  Annual-loss appetite check
                </h4>
                {lossCheck ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="gap-1.5 tabular-nums">
                      <Banknote className="h-3.5 w-3.5" />
                      Loss appetite {formatEur(lossCheck.appetiteEur)}/yr
                    </Badge>
                    {lossCheck.exceededCount > 0 ? (
                      <Badge variant="error" className="gap-1.5 tabular-nums">
                        ↑ {lossCheck.exceededCount} risk
                        {lossCheck.exceededCount === 1 ? "" : "s"} above the loss appetite
                      </Badge>
                    ) : (
                      <Badge variant="success" className="gap-1.5">
                        ✓ No loss estimates above the appetite
                      </Badge>
                    )}
                    <span className="text-xs text-muted-foreground">
                      Includes the {tolerancePct}% tolerance margin.
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Configure <code className="text-xs">appetiteAnnualLossEur</code> to enable the
                    quantitative EUR loss check.
                  </p>
                )}
              </div>
            </>
          ) : null}
        </Degrade>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* 2. 5x5 likelihood x impact heat matrix                              */
/* ------------------------------------------------------------------ */

function MatrixPanel({
  matrix,
  matrixQuery,
  onEnableDemo,
}: {
  matrix: RiskMatrixResult | undefined;
  matrixQuery: { isLoading: boolean; isError: boolean };
  onEnableDemo: () => void;
}) {
  const cellMap = useMemo(() => {
    const map = new Map<string, { count: number; band: QuantRiskBand }>();
    (matrix?.cells ?? []).forEach((cell) =>
      map.set(`${cell.likelihood}-${cell.impact}`, { count: cell.count, band: cell.band })
    );
    return map;
  }, [matrix?.cells]);

  const bandMetaFor = (band: QuantRiskBand): QuantBandMeta => QUANT_BAND_META[band];

  return (
    <Card className="rounded-xl shadow-sm border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Grid3x3 className="h-5 w-5 text-muted-foreground" />
          Likelihood x impact heat matrix
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Fixed 5x5 grid of assessed risks. Bands on the 1-25 score: low 1-4, medium 5-9, high
          10-15, critical 16-25.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Degrade
          isLoading={matrixQuery.isLoading && !matrix}
          hasData={(matrix?.totalAssessed ?? 0) > 0}
          isError={matrixQuery.isError && !matrix}
          procedure="riskQuantification.matrix"
          icon={Grid3x3}
          emptyHint="The matrix is built from assessed risks by the riskQuantification router. Enable demo mode to preview the grid."
          onEnableDemo={onEnableDemo}
          skeleton={
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((n) => (
                <div key={n} className="flex gap-1.5">
                  <Skeleton className="h-12 w-20" />
                  <Skeleton className="h-12 flex-1" />
                </div>
              ))}
            </div>
          }
        >
          {matrix ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <HealthTile
                  icon={ListChecks}
                  label="Assessed"
                  value={matrix.totalAssessed}
                  hint={`Avg score ${matrix.avgScore}/25`}
                />
                {QUANT_BAND_ORDER.map((band) => {
                  const meta = bandMetaFor(band);
                  return (
                    <HealthTile
                      key={band}
                      icon={band === "critical" || band === "high" ? AlertTriangle : Activity}
                      label={meta.label}
                      value={matrix.byBand[band] ?? 0}
                      valueClass={meta.textClass}
                    />
                  );
                })}
              </div>

              <div className="mt-6 flex flex-col gap-3">
                <div className="flex gap-2">
                  <div className="flex w-6 items-center justify-center">
                    <span className="-rotate-90 whitespace-nowrap text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Likelihood
                    </span>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {[5, 4, 3, 2, 1].map((likelihood) => (
                      <div key={likelihood} className="flex gap-1.5">
                        <div className="flex w-20 items-center justify-end whitespace-nowrap pr-2 text-xs font-medium text-muted-foreground">
                          {likelihood}
                        </div>
                        {[1, 2, 3, 4, 5].map((impact) => {
                          const entry = cellMap.get(`${likelihood}-${impact}`);
                          const count = entry?.count ?? 0;
                          const meta = entry ? bandMetaFor(entry.band) : undefined;
                          return (
                            <div
                              key={`${likelihood}-${impact}`}
                              className={cn(
                                "flex min-h-[44px] flex-1 items-center justify-center rounded-lg text-sm font-bold tabular-nums select-none md:min-h-[56px] md:text-base",
                                count > 0 && meta ? meta.cellClass : QUANT_CELL_EMPTY_CLASS
                              )}
                              title={`Likelihood ${likelihood} x Impact ${impact} = ${likelihood * impact} - ${count} risk${count === 1 ? "" : "s"}`}
                            >
                              {count > 0 ? count : ""}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    <div className="flex gap-1.5 pt-1">
                      <div className="w-20" />
                      {[1, 2, 3, 4, 5].map((impact) => (
                        <div
                          key={impact}
                          className="flex-1 text-center text-xs font-medium text-muted-foreground"
                        >
                          {impact}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Impact
                  </span>
                </div>

                {/* Legend - documented data-viz scale (UI-STANDARD 18) */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
                  {QUANT_BAND_ORDER.map((band) => (
                    <div
                      key={band}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground"
                    >
                      <span className={cn("h-3 w-3 rounded", QUANT_BAND_META[band].cellClass)} />
                      {QUANT_BAND_META[band].label}
                    </div>
                  ))}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className={cn("h-3 w-3 rounded", QUANT_CELL_EMPTY_CLASS)} />
                    No risks
                  </div>
                </div>
              </div>

              {matrix.topRisks.length > 0 ? (
                <div className="mt-5 rounded-xl border border-border bg-muted/30 p-4">
                  <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Top 5 risks by score
                  </h4>
                  <ul className="space-y-2">
                    {matrix.topRisks.map((risk) => {
                      const meta = bandMetaFor(risk.band);
                      return (
                        <li key={String(risk.id)} className="flex items-center gap-3 text-sm">
                          <Badge variant={meta.badgeVariant} className="shrink-0 tabular-nums">
                            {formatQuantScore(risk.score)}
                          </Badge>
                          <span className="min-w-0 flex-1 truncate text-foreground">
                            {risk.name || "Unnamed risk"}
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {meta.label} risk
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : null}
            </>
          ) : null}
        </Degrade>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* 3. Inherent vs residual tracking                                    */
/* ------------------------------------------------------------------ */

function ResidualPanel({
  residual,
  residualQuery,
  appetiteScore,
  onEnableDemo,
}: {
  residual: ResidualTrackingResult | undefined;
  residualQuery: { isLoading: boolean; isError: boolean };
  appetiteScore: number;
  onEnableDemo: () => void;
}) {
  const rows = residual?.rows ?? [];

  return (
    <Card className="rounded-xl shadow-sm border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <TrendingDown className="h-5 w-5 text-muted-foreground" />
          Inherent vs residual tracking
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Control effectiveness moves each risk from inherent to residual. Residuals strictly above
          the appetite ({appetiteScore}) are flagged.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Degrade
          isLoading={residualQuery.isLoading && !residual}
          hasData={(residual?.totalTracked ?? 0) > 0}
          isError={residualQuery.isError && !residual}
          procedure="riskQuantification.residual"
          icon={TrendingDown}
          emptyHint="Residual tracking appears once risks carry inherent/residual scores or controls. Enable demo mode to preview the table."
          onEnableDemo={onEnableDemo}
          skeleton={
            <div className="space-y-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i} className="rounded-xl shadow-sm border-border">
                    <CardContent className="pt-4">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="mt-2 h-6 w-10" />
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Skeleton className="h-40 w-full" />
            </div>
          }
        >
          {residual ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <HealthTile
                  icon={TrendingDown}
                  label="Avg reduction"
                  value={
                    <span className="tabular-nums">
                      {residual.avgReductionPct}
                      <span className="text-sm font-medium text-muted-foreground">%</span>
                    </span>
                  }
                  hint="Mean inherent -> residual drop"
                >
                  <div className="mt-3">
                    <ScoreBar
                      value={residual.avgReductionPct}
                      barClass={reductionBarClass(residual.avgReductionPct)}
                    />
                  </div>
                </HealthTile>
                {RESIDUAL_DIRECTION_ORDER.map((direction) => {
                  const meta = RESIDUAL_DIRECTION_META[direction];
                  const count =
                    direction === "reduced"
                      ? residual.reducedCount
                      : direction === "unchanged"
                        ? residual.unchangedCount
                        : residual.increasedCount;
                  return (
                    <HealthTile
                      key={direction}
                      icon={direction === "increased" ? AlertTriangle : Activity}
                      label={meta.label}
                      value={
                        <span className="flex items-center gap-1.5">
                          <span aria-hidden>{meta.glyph}</span>
                          <span className="tabular-nums">{count}</span>
                        </span>
                      }
                      valueClass={meta.textClass}
                    />
                  );
                })}
              </div>

              {residual.aboveAppetiteCount > 0 ? (
                <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-muted/30 px-4 py-3">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--error-foreground)]" />
                  <span className="text-sm text-foreground">
                    <span className="font-semibold tabular-nums">{residual.aboveAppetiteCount}</span>{" "}
                    risk{residual.aboveAppetiteCount === 1 ? "" : "s"} remain above the appetite
                    after controls.
                  </span>
                </div>
              ) : null}

              <div className="mt-5 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="h-12 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 text-left font-semibold">Risk</th>
                      <th className="px-4 text-right font-semibold">Inherent</th>
                      <th className="px-4 text-right font-semibold">Residual</th>
                      <th className="px-4 text-right font-semibold">Delta</th>
                      <th className="px-4 text-left font-semibold">Reduction</th>
                      <th className="px-4 text-left font-semibold">Direction</th>
                      <th className="px-4 text-left font-semibold">Appetite</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => {
                      const directionMeta = RESIDUAL_DIRECTION_META[row.direction];
                      const aboveAppetite = row.residual > appetiteScore;
                      return (
                        <tr
                          key={String(row.id)}
                          className="border-b border-border hover:bg-muted/50"
                        >
                          <td className="max-w-[280px] truncate p-4 text-sm font-semibold text-foreground">
                            {row.name || "Unnamed risk"}
                          </td>
                          <td className="p-4 text-right text-sm tabular-nums text-muted-foreground">
                            {row.inherent}
                          </td>
                          <td
                            className={cn(
                              "p-4 text-right text-sm font-semibold tabular-nums",
                              aboveAppetite
                                ? "text-[var(--error-foreground)]"
                                : "text-foreground"
                            )}
                          >
                            {row.residual}
                          </td>
                          <td className="p-4 text-right text-sm tabular-nums text-muted-foreground">
                            {row.delta}
                          </td>
                          <td className="p-4">
                            <div className="flex min-w-[120px] items-center gap-2">
                              <div className="w-20">
                                <ScoreBar
                                  value={row.reductionPct}
                                  barClass={reductionBarClass(row.reductionPct)}
                                />
                              </div>
                              <span className="text-xs tabular-nums text-muted-foreground">
                                {row.reductionPct}%
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge
                              variant={directionMeta.badgeVariant}
                              className="gap-1"
                            >
                              <span aria-hidden>{directionMeta.glyph}</span>
                              {directionMeta.label}
                            </Badge>
                          </td>
                          <td className="p-4">
                            {aboveAppetite ? (
                              <Badge variant="error" className="gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Above appetite
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">Within</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </Degrade>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* 4. Treatment plan cards                                             */
/* ------------------------------------------------------------------ */

function TreatmentPlansPanel({
  plans,
  plansQuery,
  nowMs,
  onEnableDemo,
}: {
  plans: TreatmentPlanResult | undefined;
  plansQuery: { isLoading: boolean; isError: boolean };
  nowMs: number;
  onEnableDemo: () => void;
}) {
  const items = plans?.plans ?? [];
  const nextDeadlineDays = daysUntilDeadline(plans?.nextDeadline ?? null, nowMs);

  return (
    <Card className="rounded-xl shadow-sm border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <ClipboardList className="h-5 w-5 text-muted-foreground" />
          Risk treatment plans
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Deterministic plans for open/mitigating risks scoring {DEMO_TREATMENT_THRESHOLD}+. P0/P1
          carry a deadline {DEMO_TREATMENT_HORIZON_DAYS} days out; P0 escalates to the board.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Degrade
          isLoading={plansQuery.isLoading && !plans}
          hasData={(plans?.plannedCount ?? 0) > 0}
          isError={plansQuery.isError && !plans}
          procedure="riskQuantification.treatmentPlans"
          icon={ClipboardList}
          emptyHint="Plans are generated for eligible risks above the score threshold. Enable demo mode to preview the cards."
          onEnableDemo={onEnableDemo}
          skeleton={
            <div className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2 rounded-xl border border-border p-4">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-24 rounded-full" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            </div>
          }
        >
          {plans ? (
            <>
              {/* Rollup strip */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="gap-1.5 tabular-nums">
                  <ClipboardList className="h-3.5 w-3.5" />
                  {plans.plannedCount}/{plans.totalRisks} risks planned
                </Badge>
                {TREATMENT_STRATEGY_ORDER.map((strategy) => {
                  const meta = TREATMENT_STRATEGY_META[strategy];
                  const count = plans.byStrategy[strategy] ?? 0;
                  if (count === 0) return null;
                  return (
                    <Badge key={strategy} variant={meta.badgeVariant} className="gap-1.5">
                      {meta.label}
                      <span className="tabular-nums">{count}</span>
                    </Badge>
                  );
                })}
                {TREATMENT_PRIORITY_ORDER.map((priority) => {
                  const meta = TREATMENT_PRIORITY_META[priority];
                  const count = plans.byPriority[priority] ?? 0;
                  if (count === 0) return null;
                  return (
                    <Badge key={priority} variant={meta.badgeVariant} className="gap-1.5 tabular-nums">
                      {priority}
                      <span>{count}</span>
                    </Badge>
                  );
                })}
                {plans.nextDeadline ? (
                  <Badge variant="outline" className="gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Next deadline{" "}
                    {format(new Date(plans.nextDeadline), "MMM d, yyyy")}
                    {nextDeadlineDays !== null ? (
                      <span className="tabular-nums">({nextDeadlineDays}d)</span>
                    ) : null}
                  </Badge>
                ) : null}
              </div>

              {/* Plan cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {items.map((plan: TreatmentPlanItem) => {
                  const priorityMeta = TREATMENT_PRIORITY_META[plan.priority];
                  const strategyMeta = TREATMENT_STRATEGY_META[plan.strategy];
                  const daysLeft = daysUntilDeadline(plan.deadline, nowMs);
                  const countdown = deadlineCountdownMeta(daysLeft);
                  return (
                    <div
                      key={String(plan.id)}
                      className="flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-sm"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={priorityMeta.badgeVariant}>{priorityMeta.label}</Badge>
                        <Badge variant={strategyMeta.badgeVariant}>{strategyMeta.label}</Badge>
                        <Badge variant="outline" className="tabular-nums">
                          {formatQuantScore(plan.score)}
                        </Badge>
                      </div>
                      <h4 className="mt-2 text-sm font-semibold leading-snug text-foreground">
                        {plan.name || "Unnamed risk"}
                      </h4>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>Owner: {plan.owner || "unassigned"}</span>
                        {plan.deadline ? (
                          <span className="flex items-center gap-1">
                            <CalendarClock className="h-3.5 w-3.5" />
                            {format(new Date(plan.deadline), "MMM d, yyyy")}
                          </span>
                        ) : null}
                      </div>
                      {plan.deadline ? (
                        <div className="mt-2">
                          <Badge variant={countdown.badgeVariant} className="gap-1 tabular-nums">
                            <CalendarClock className="h-3 w-3" />
                            {countdown.label}
                          </Badge>
                        </div>
                      ) : null}
                      <div className="mt-3 border-t border-border pt-3">
                        <h5 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          Actions
                        </h5>
                        <ul className="space-y-1.5">
                          {plan.actions.map((action, actionIndex) => {
                            const escalation = action.toLowerCase().startsWith("escalate");
                            return (
                              <li
                                key={actionIndex}
                                className={cn(
                                  "flex items-start gap-2 text-xs",
                                  escalation
                                    ? "font-semibold text-[var(--error-foreground)]"
                                    : "text-foreground"
                                )}
                              >
                                {escalation ? (
                                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                ) : (
                                  <Circle className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
                                )}
                                {action}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
        </Degrade>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Section wrapper                                                     */
/* ------------------------------------------------------------------ */

export default function RiskQuantificationPanels({ clientId }: { clientId: number }) {
  const [demoMode, setDemoMode] = useState(false);

  /* --- riskQuantification.appetite ---------------------------------- */
  const appetiteInput = useMemo<RiskAppetiteQueryInput | null>(
    () =>
      demoMode
        ? buildDemoRiskAppetiteInput()
        : { risks: [], config: { appetiteScore: DEFAULT_APPETITE_SCORE, tolerancePct: 10 } },
    [demoMode]
  );
  const appetiteQuery = useRiskAppetite(clientId, appetiteInput);
  const appetite: RiskAppetiteResult | undefined = demoMode
    ? appetiteQuery.data ?? buildDemoRiskAppetite()
    : appetiteQuery.data;

  /* --- riskQuantification.matrix ------------------------------------ */
  const matrixInput = useMemo<RiskMatrixQueryInput | null>(
    () => (demoMode ? buildDemoRiskMatrixInput() : { risks: [] }),
    [demoMode]
  );
  const matrixQuery = useRiskMatrix(clientId, matrixInput);
  const matrix: RiskMatrixResult | undefined = demoMode
    ? matrixQuery.data ?? buildDemoRiskMatrix()
    : matrixQuery.data;

  /* --- riskQuantification.residual ---------------------------------- */
  const residualInput = useMemo<ResidualQueryInput | null>(
    () => (demoMode ? buildDemoResidualInput() : { risks: [] }),
    [demoMode]
  );
  const residualQuery = useResidualTracking(clientId, residualInput);
  const residual: ResidualTrackingResult | undefined = demoMode
    ? residualQuery.data ?? buildDemoResidualTracking()
    : residualQuery.data;

  /* --- riskQuantification.treatmentPlans ---------------------------- */
  const plansInput = useMemo<TreatmentPlansQueryInput | null>(
    () =>
      demoMode
        ? buildDemoTreatmentPlansInput()
        : { risks: [], horizonDays: DEMO_TREATMENT_HORIZON_DAYS, threshold: DEMO_TREATMENT_THRESHOLD },
    [demoMode]
  );
  const plansQuery = useTreatmentPlans(clientId, plansInput);
  const plans: TreatmentPlanResult | undefined = demoMode
    ? plansQuery.data ?? buildDemoTreatmentPlans()
    : plansQuery.data;

  /** Countdown reference clock: fixed in demo mode (deterministic). */
  const nowMs = useMemo(
    () => (demoMode ? DEMO_QUANT_BASE_DATE.getTime() : Date.now()),
    [demoMode]
  );

  /** Appetite threshold/tolerance used for flags and copy (mirrors the query input). */
  const appetiteScore =
    (demoMode ? DEMO_APPETITE_CONFIG.appetiteScore : DEFAULT_APPETITE_SCORE) ??
    DEFAULT_APPETITE_SCORE;
  const tolerancePct = demoMode ? DEMO_APPETITE_CONFIG.tolerancePct ?? 10 : 10;

  /** EUR loss-appetite check (rows are known client-side in demo mode only). */
  const lossCheck = useMemo<LossAppetiteCheck | null>(
    () => (demoMode ? deriveLossAppetiteCheck(DEMO_QUANT_RISKS, DEMO_APPETITE_CONFIG) : null),
    [demoMode]
  );

  const enableDemo = () => setDemoMode(true);

  return (
    <section id={NIS2_RISK_QUANTIFICATION_SECTION_ID} className="space-y-6">
      {/* Header + demo toggle (UI-STANDARD 17: off by default) */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              NIS2 Risk Quantification
            </h2>
            <p className="text-sm text-muted-foreground">
              Quantitative appetite, 5x5 heat matrix, inherent-vs-residual tracking and treatment
              planning (Art. 21(2)(a)).
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
            <code className="text-xs">riskQuantification.*</code> APIs to see live quantified risk
            data.
          </span>
        </div>
      )}

      {/* 1. Quantitative appetite */}
      <AppetitePanel
        appetite={appetite}
        appetiteQuery={appetiteQuery}
        lossCheck={lossCheck}
        appetiteScore={appetiteScore}
        tolerancePct={tolerancePct}
        onEnableDemo={enableDemo}
      />

      {/* 2. 5x5 likelihood x impact heat matrix */}
      <MatrixPanel matrix={matrix} matrixQuery={matrixQuery} onEnableDemo={enableDemo} />

      {/* 3. Inherent vs residual tracking */}
      <ResidualPanel
        residual={residual}
        residualQuery={residualQuery}
        appetiteScore={appetiteScore}
        onEnableDemo={enableDemo}
      />

      {/* 4. Treatment plan cards */}
      <TreatmentPlansPanel
        plans={plans}
        plansQuery={plansQuery}
        nowMs={nowMs}
        onEnableDemo={enableDemo}
      />

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Target className="h-3.5 w-3.5" />
        Scores are likelihood x impact (1-25); bands low 1-4 / medium 5-9 / high 10-15 / critical
        16-25. Residuals derive from control effectiveness when no residual score is recorded, per
        ISO 27005 / NIS2 Measure 2.1.
      </p>
    </section>
  );
}
