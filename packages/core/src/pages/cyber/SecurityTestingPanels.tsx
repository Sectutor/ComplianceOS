/**
 * NIS2 Advanced Security Testing - panels
 * ========================================
 * Renders the `securityTestingNis2.*` contract (see
 * `packages/core/src/pages/securityTestingNis2Api.ts`) as an advanced
 * security testing section for NIS2 Art. 21(2)(e) / ENISA Measure 6.7
 * (systematic testing, auditing and security exercises):
 *
 *   1. Penetration test scheduler  <- securityTestingNis2.planTest
 *   2. Red team exercise tracker   <- securityTestingNis2.redTeam
 *   3. Benchmark compliance        <- securityTestingNis2.benchmarks
 *   4. Scan coverage               <- securityTestingNis2.scanCoverage
 *
 * Every panel follows UI-STANDARD 16 graceful degradation: skeleton while
 * loading (checked before empty, never a spinner-forever), EmptyState
 * ("Connect the securityTestingNis2.<proc> API") on error or missing
 * endpoint, token-only colors (2) - no raw slate/sky hexes, dark-mode safe.
 * Status / type / phase pills use the Badge component; score bars use the
 * documented data-viz exception (18). Demo mode (17) is gated behind the
 * "Demo data" switch, off by default, and renders a persistent amber banner
 * whenever sample data is shown. Live endpoint data always wins over demo
 * data.
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
  ArrowRight,
  BarChart3,
  CalendarClock,
  CheckCircle2,
  ClipboardCheck,
  Crosshair,
  FlaskConical,
  Radar,
  ShieldAlert,
  Target,
  Users,
  type LucideIcon,
} from "lucide-react";
import {
  ASSET_CLASS_META,
  ASSET_CLASS_ORDER,
  BENCHMARK_CATEGORY_META,
  BENCHMARK_CATEGORY_ORDER,
  BENCHMARK_META,
  buildDemoBenchmarkAssessment,
  buildDemoBenchmarkInput,
  buildDemoPenTestInput,
  buildDemoPenTestPlan,
  buildDemoRedTeamExercise,
  buildDemoRedTeamInput,
  buildDemoScanCoverage,
  buildDemoScanCoverageInput,
  coverageBarClass,
  EXERCISE_STATUS_META,
  formatNextDueDate,
  FREQUENCY_META,
  KILL_CHAIN_STEPS,
  penStatusMetaForLabel,
  PHASE_STATUS_META,
  RED_TEAM_PHASE_META,
  TEST_TYPE_META,
  useBenchmarkAssessment,
  usePenTestPlan,
  useRedTeamExercise,
  useScanCoverage,
  VERDICT_META,
  type AssetClass,
  type BenchmarkAssessmentResponse,
  type BenchmarkInput,
  type BenchmarkCategory,
  type PenTestPlanInput,
  type PenTestPlanResponse,
  type RedTeamExerciseResponse,
  type RedTeamInput,
  type RedTeamPhase,
  type ScanCoverageInput,
  type ScanCoverageResponse,
} from "@/pages/securityTestingNis2Api";

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
            ? `The ${procedure} endpoint is not live yet. It appears once the securityTestingNis2 router is deployed.`
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

/** Small labeled value tile used inside panels (token-only, calm surface). */
function MiniTile({
  icon: Icon,
  label,
  value,
  valueClass = "text-foreground",
}: {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <div className={cn("mt-1 text-2xl font-bold tabular-nums", valueClass)}>{value}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Penetration test scheduler                                          */
/* ------------------------------------------------------------------ */

function PenTestSchedulerPanel({
  clientId,
  demoMode,
  onEnableDemo,
}: {
  clientId: number;
  demoMode: boolean;
  onEnableDemo: () => void;
}) {
  const input = useMemo<PenTestPlanInput | null>(
    () => (demoMode ? buildDemoPenTestInput() : { clientId }),
    [demoMode, clientId]
  );
  const query = usePenTestPlan(clientId, input);
  const data: PenTestPlanResponse | undefined = demoMode
    ? (query.data ?? buildDemoPenTestPlan())
    : query.data;
  const overdueCount = data?.overdueCount ?? 0;

  return (
    <Card className="rounded-xl shadow-sm border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <CalendarClock className="h-5 w-5 text-muted-foreground" />
          Penetration test scheduler
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Planned systemic security audits with recurrence windows and overdue tracking
          (Art. 21(2)(e), ENISA Measure 6.7).
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Degrade
          isLoading={query.isLoading}
          hasData={!!data}
          isError={query.isError}
          procedure="securityTestingNis2.planTest"
          icon={Target}
          emptyHint="The scheduler appears once the securityTestingNis2 router is deployed. Enable demo mode to preview the test plan."
          onEnableDemo={onEnableDemo}
          skeleton={
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <tbody>
                    {Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-b border-border">
                        <td className="p-4">
                          <Skeleton className="h-4 w-48" />
                        </td>
                        <td className="p-4">
                          <Skeleton className="h-5 w-20 rounded-full" />
                        </td>
                        <td className="p-4">
                          <Skeleton className="h-5 w-20 rounded-full" />
                        </td>
                        <td className="p-4">
                          <Skeleton className="h-4 w-24" />
                        </td>
                        <td className="p-4">
                          <Skeleton className="h-4 w-24" />
                        </td>
                        <td className="p-4">
                          <Skeleton className="ml-auto h-5 w-20 rounded-full" />
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MiniTile
                  icon={Target}
                  label="Planned tests"
                  value={<span className="tabular-nums">{data.total}</span>}
                />
                <MiniTile
                  icon={CalendarClock}
                  label="Scheduled"
                  value={<span className="tabular-nums">{data.countsByStatus.scheduled}</span>}
                />
                <MiniTile
                  icon={ShieldAlert}
                  label="In progress"
                  value={<span className="tabular-nums">{data.countsByStatus.inProgress}</span>}
                  valueClass="text-[var(--warning-foreground)]"
                />
                <MiniTile
                  icon={AlertTriangle}
                  label="Overdue"
                  value={<span className="tabular-nums">{overdueCount}</span>}
                  valueClass={overdueCount > 0 ? "text-[var(--error-foreground)]" : undefined}
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="h-12 border-b border-border text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <th className="px-4 text-left font-semibold">Test</th>
                      <th className="px-4 text-left font-semibold">Type</th>
                      <th className="px-4 text-left font-semibold">Status</th>
                      <th className="px-4 text-left font-semibold">Frequency</th>
                      <th className="px-4 text-left font-semibold">Next due</th>
                      <th className="px-4 text-right font-semibold">SLA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.tests.map((test) => {
                      const typeMeta = TEST_TYPE_META[test.testType] ?? TEST_TYPE_META.unknown;
                      const statusMeta = penStatusMetaForLabel(test.statusLabel);
                      const freqMeta = test.frequency ? FREQUENCY_META[test.frequency] : null;
                      return (
                        <tr key={String(test.id)} className="border-b border-border hover:bg-muted/50">
                          <td className="p-4">
                            <span className="text-sm font-semibold text-foreground">
                              {test.testTypeLabel}
                            </span>
                          </td>
                          <td className="p-4">
                            <Badge variant={typeMeta.badgeVariant}>{typeMeta.label}</Badge>
                          </td>
                          <td className="p-4">
                            <Badge variant={statusMeta.badgeVariant}>{test.statusLabel}</Badge>
                          </td>
                          <td className="p-4">
                            {freqMeta ? (
                              <Badge variant={freqMeta.badgeVariant}>{freqMeta.label}</Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="p-4 whitespace-nowrap text-sm text-muted-foreground tabular-nums">
                            {formatNextDueDate(test.nextDueDate)}
                          </td>
                          <td className="p-4 text-right">
                            {test.isOverdue ? (
                              <Badge variant="error">Overdue</Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">In SLA</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <p className="text-xs text-muted-foreground tabular-nums">
                {data.countsByStatus.completed} completed · {data.countsByStatus.reported} reported ·{" "}
                {data.countsByStatus.draft} drafted · {overdueCount} overdue across the plan
              </p>
            </div>
          ) : null}
        </Degrade>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Red team exercise tracker                                           */
/* ------------------------------------------------------------------ */

/** One kill-chain step chip: index + status + MITRE tactic codes. */
function KillChainStep({
  step,
  phase,
  index,
}: {
  step: { name: string; tacticCodes: string[] };
  phase: RedTeamPhase | undefined;
  index: number;
}) {
  const meta = RED_TEAM_PHASE_META[step.name] ?? { label: step.name, badgeVariant: "outline" as const, tacticCodes: step.tacticCodes };
  const status = phase?.status ?? "pending";
  const statusMeta = PHASE_STATUS_META[status] ?? PHASE_STATUS_META.pending;
  const tacticCodes = phase && phase.tacticCodes.length > 0 ? phase.tacticCodes : meta.tacticCodes;

  return (
    <div
      className={cn(
        "relative flex-1 min-w-[150px] rounded-lg border border-border bg-card p-3",
        phase?.isCurrent && "border-l-4 border-l-[var(--warning)]",
        phase?.isOverdue && "border-l-4 border-l-[var(--error)]"
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold text-muted-foreground tabular-nums">
          {index + 1}
        </span>
        <Badge variant={statusMeta.badgeVariant}>{statusMeta.label}</Badge>
      </div>
      <div className="mt-2 text-sm font-semibold text-foreground">{meta.label}</div>
      {tacticCodes.length > 0 ? (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {tacticCodes.map((code) => (
            <span
              key={code}
              className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground"
            >
              {code}
            </span>
          ))}
        </div>
      ) : (
        <div className="mt-1.5 text-[10px] font-medium text-muted-foreground">no tactics</div>
      )}
      {phase?.isOverdue ? (
        <div className="mt-1.5 text-[10px] font-semibold text-[var(--error-foreground)]">
          Past due date
        </div>
      ) : null}
    </div>
  );
}

function RedTeamExercisePanel({
  clientId,
  demoMode,
  onEnableDemo,
}: {
  clientId: number;
  demoMode: boolean;
  onEnableDemo: () => void;
}) {
  const input = useMemo<RedTeamInput | null>(
    () => (demoMode ? buildDemoRedTeamInput() : { clientId }),
    [demoMode, clientId]
  );
  const query = useRedTeamExercise(clientId, input);
  const data: RedTeamExerciseResponse | undefined = demoMode
    ? (query.data ?? buildDemoRedTeamExercise())
    : query.data;
  const statusMeta = data ? EXERCISE_STATUS_META[data.status] : undefined;
  const verdictMeta = data ? VERDICT_META[data.verdict] : undefined;

  return (
    <Card className="rounded-xl shadow-sm border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Crosshair className="h-5 w-5 text-muted-foreground" />
          Red team exercise
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Kill-chain phase tracker with MITRE ATT&CK tactic codes and participant mix
          (Art. 21(2)(e), ENISA Measure 6.7).
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Degrade
          isLoading={query.isLoading}
          hasData={!!data}
          isError={query.isError}
          procedure="securityTestingNis2.redTeam"
          icon={Crosshair}
          emptyHint="The exercise tracker appears once the securityTestingNis2 router is deployed. Enable demo mode to preview a live exercise."
          onEnableDemo={onEnableDemo}
          skeleton={
            <>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-24 rounded-full" />
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-20 w-full rounded-lg" />
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-3">
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 w-full rounded-lg" />
                ))}
              </div>
            </>
          }
        >
          {data && statusMeta && verdictMeta ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={statusMeta.badgeVariant} className="px-3 py-1">
                  {statusMeta.label}
                </Badge>
                <Badge variant={verdictMeta.badgeVariant}>
                  Verdict: {verdictMeta.label}
                </Badge>
                <span className="text-sm font-semibold text-muted-foreground">
                  {data.summary.totalPhases} phases · {data.summary.activePhases} active ·{" "}
                  {data.summary.completedPhases} completed
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <MiniTile
                  icon={Users}
                  label="Operators"
                  value={<span className="tabular-nums">{data.participantCounts.operator}</span>}
                />
                <MiniTile
                  icon={Users}
                  label="Observers"
                  value={<span className="tabular-nums">{data.participantCounts.observer}</span>}
                />
                <MiniTile
                  icon={ShieldAlert}
                  label="Decision-makers"
                  value={<span className="tabular-nums">{data.participantCounts.decisionMaker}</span>}
                />
              </div>

              <div className="flex flex-wrap gap-3">
                {KILL_CHAIN_STEPS.map((step, index) => (
                  <KillChainStep
                    key={step.name}
                    step={step}
                    phase={data.phases.find((p) => p.name === step.name)}
                    index={index}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </Degrade>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Benchmark compliance panel                                          */
/* ------------------------------------------------------------------ */

/** Left-accent border per benchmark category (semantic token, UI-STANDARD 2). */
const GAP_ACCENT: Record<string, string> = {
  ig1: "border-l-[var(--error)]",
  ig2: "border-l-[var(--warning)]",
  ig3: "border-l-[var(--warning)]",
};

function BenchmarkCompliancePanel({
  clientId,
  demoMode,
  onEnableDemo,
}: {
  clientId: number;
  demoMode: boolean;
  onEnableDemo: () => void;
}) {
  const input = useMemo<BenchmarkInput | null>(
    () => (demoMode ? buildDemoBenchmarkInput() : { clientId }),
    [demoMode, clientId]
  );
  const query = useBenchmarkAssessment(clientId, input);
  const data: BenchmarkAssessmentResponse | undefined = demoMode
    ? (query.data ?? buildDemoBenchmarkAssessment())
    : query.data;

  return (
    <Card className="rounded-xl shadow-sm border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
          Benchmark compliance
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          CIS Controls v8 and NIST CSF 2.0 category scores with the top
          remediation gaps (Art. 21(2)(e), ENISA Measure 6.7).
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Degrade
          isLoading={query.isLoading}
          hasData={!!data}
          isError={query.isError}
          procedure="securityTestingNis2.benchmarks"
          icon={BarChart3}
          emptyHint="Benchmark scores appear once the securityTestingNis2 router is deployed. Enable demo mode to preview the assessment."
          onEnableDemo={onEnableDemo}
          skeleton={
            <>
              <div className="rounded-lg border border-border p-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="mt-3 h-2 w-full rounded-full" />
                <div className="mt-2 flex justify-between">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                ))}
              </div>
            </>
          }
        >
          {data ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Overall score
                  </div>
                  <div className="text-2xl font-bold tabular-nums text-foreground">
                    {Math.round(data.overallScore)}
                    <span className="text-base font-semibold text-muted-foreground">%</span>
                  </div>
                </div>
                <div className="mt-2">
                  <ScoreBar value={data.overallScore} barClass={coverageBarClass(data.overallScore)} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground tabular-nums">
                  <span>
                    Pass rate{" "}
                    <span className="font-semibold text-foreground">{data.passRate}%</span>
                  </span>
                  <span>
                    {data.totalApplicable} applicable controls
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                {BENCHMARK_CATEGORY_ORDER.map((category) => {
                  const score = data.categories.find((c) => c.category === category);
                  const meta = BENCHMARK_CATEGORY_META[category];
                  const value = score?.categoryScore ?? 0;
                  return (
                    <div key={category} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
                          <span className="text-xs font-semibold text-muted-foreground">
                            {score ? `${score.pass} pass · ${score.fail} fail · ${score.na} n/a` : "no controls assessed"}
                          </span>
                        </div>
                        <span className="text-sm font-semibold tabular-nums text-foreground">
                          {Math.round(value)}%
                        </span>
                      </div>
                      <ScoreBar value={value} barClass={coverageBarClass(value)} />
                    </div>
                  );
                })}
              </div>

              {data.topGaps.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Top remediation gaps
                  </h4>
                  <ul className="space-y-2">
                    {data.topGaps.map((gap, index) => {
                      const categoryMeta = BENCHMARK_CATEGORY_META[gap.category];
                      return (
                        <li
                          key={`${gap.category}-${gap.controlId}`}
                          className={cn(
                            "rounded-lg border border-border bg-card p-4 border-l-4",
                            GAP_ACCENT[gap.category] ?? "border-l-[var(--error)]"
                          )}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <Badge variant={categoryMeta.badgeVariant}>{categoryMeta.label}</Badge>
                              <span className="truncate text-sm font-semibold text-foreground">
                                {gap.controlName}
                              </span>
                            </div>
                            <span className="shrink-0 text-xs font-semibold text-muted-foreground tabular-nums">
                              {gap.controlId}
                            </span>
                          </div>
                          <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                            <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                            {gap.remediation}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-[var(--success-foreground)]" />
                  No failed controls - all assessed categories are within tolerance.
                </div>
              )}
            </div>
          ) : null}
        </Degrade>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Scan coverage panel                                                 */
/* ------------------------------------------------------------------ */

function ScanCoveragePanel({
  clientId,
  demoMode,
  onEnableDemo,
}: {
  clientId: number;
  demoMode: boolean;
  onEnableDemo: () => void;
}) {
  const input = useMemo<ScanCoverageInput | null>(
    () => (demoMode ? buildDemoScanCoverageInput() : { clientId }),
    [demoMode, clientId]
  );
  const query = useScanCoverage(clientId, input);
  const data: ScanCoverageResponse | undefined = demoMode
    ? (query.data ?? buildDemoScanCoverage())
    : query.data;
  const overdueAssets = useMemo(
    () => [...(data?.assets ?? [])].filter((a) => a.isOverdue).sort((a, b) => b.daysOverdue - a.daysOverdue),
    [data]
  );

  return (
    <Card className="rounded-xl shadow-sm border-border">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <Radar className="h-5 w-5 text-muted-foreground" />
          Scan coverage
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Assets scanned within their SLA window per asset class, with the
          overdue scan list (Art. 21(2)(e), ENISA Measure 6.7).
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <Degrade
          isLoading={query.isLoading}
          hasData={!!data}
          isError={query.isError}
          procedure="securityTestingNis2.scanCoverage"
          icon={Radar}
          emptyHint="Coverage appears once the securityTestingNis2 router is deployed. Enable demo mode to preview the scan register."
          onEnableDemo={onEnableDemo}
          skeleton={
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                ))}
              </div>
            </>
          }
        >
          {data ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <MiniTile
                  icon={Radar}
                  label="Total assets"
                  value={<span className="tabular-nums">{data.totalAssets}</span>}
                />
                <MiniTile
                  icon={CheckCircle2}
                  label="Covered (in SLA)"
                  value={<span className="tabular-nums">{data.coveredCount}</span>}
                  valueClass="text-[var(--success-foreground)]"
                />
                <MiniTile
                  icon={AlertTriangle}
                  label="Overdue scans"
                  value={<span className="tabular-nums">{data.overdueCount}</span>}
                  valueClass={data.overdueCount > 0 ? "text-[var(--error-foreground)]" : undefined}
                />
              </div>

              <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Coverage rate
                  </div>
                  <div className="text-2xl font-bold tabular-nums text-foreground">
                    {Math.round(data.coverageRate)}
                    <span className="text-base font-semibold text-muted-foreground">%</span>
                  </div>
                </div>
                <div className="mt-2">
                  <ScoreBar value={data.coverageRate} barClass={coverageBarClass(data.coverageRate)} />
                </div>
              </div>

              <div className="space-y-2">
                {ASSET_CLASS_ORDER.map((assetClass) => {
                  const coverage = data.byClass.find((c) => c.assetClass === assetClass);
                  const meta = ASSET_CLASS_META[assetClass];
                  return (
                    <div key={assetClass} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={meta.badgeVariant}>{meta.label}</Badge>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {coverage ? `${coverage.covered} of ${coverage.total} covered` : "0 of 0 covered"}
                          </span>
                        </div>
                        <span className="text-sm font-semibold tabular-nums text-foreground">
                          {coverage ? Math.round(coverage.coverageRate) : 0}%
                        </span>
                      </div>
                      <ScoreBar value={coverage?.coverageRate ?? 0} barClass={coverageBarClass(coverage?.coverageRate ?? 0)} />
                    </div>
                  );
                })}
              </div>

              {overdueAssets.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Overdue scan list
                  </h4>
                  <ul className="space-y-2">
                    {overdueAssets.map((asset) => {
                      const meta = ASSET_CLASS_META[asset.assetClass] ?? ASSET_CLASS_META["external-ip"];
                      return (
                        <li
                          key={String(asset.id)}
                          className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-4 py-3"
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--error-foreground)]" />
                            <span className="truncate text-sm font-semibold text-foreground">
                              {asset.assetName}
                            </span>
                            <Badge variant={meta.badgeVariant} className="shrink-0">
                              {meta.label}
                            </Badge>
                          </div>
                          <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--error-foreground)]">
                            {asset.daysOverdue}d overdue
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-[var(--success-foreground)]" />
                  No overdue scans - every asset is within its SLA window.
                </p>
              )}
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

export function SecurityTestingPanels({ clientId }: { clientId: number }) {
  const [demoMode, setDemoMode] = useState(false);

  return (
    <section className="space-y-6">
      {/* Header + demo toggle (UI-STANDARD 17: off by default) */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Crosshair className="h-5 w-5 text-muted-foreground" />
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              NIS2 Advanced Security Testing
            </h2>
            <p className="text-sm text-muted-foreground">
              ENISA Measure 6.7 / Art. 21(2)(e) - systematic testing, auditing and security exercises.
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
            <code className="text-xs">securityTestingNis2.*</code> APIs to see live testing data.
          </span>
        </div>
      )}

      {/* Penetration test scheduler */}
      <PenTestSchedulerPanel
        clientId={clientId}
        demoMode={demoMode}
        onEnableDemo={() => setDemoMode(true)}
      />

      {/* Red team exercise tracker */}
      <RedTeamExercisePanel
        clientId={clientId}
        demoMode={demoMode}
        onEnableDemo={() => setDemoMode(true)}
      />

      {/* Benchmark compliance + scan coverage side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BenchmarkCompliancePanel
          clientId={clientId}
          demoMode={demoMode}
          onEnableDemo={() => setDemoMode(true)}
        />
        <ScanCoveragePanel
          clientId={clientId}
          demoMode={demoMode}
          onEnableDemo={() => setDemoMode(true)}
        />
      </div>

      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldAlert className="h-3.5 w-3.5" />
        Testing cadence, exercise outcomes, benchmark scores and scan SLAs are assessed per NIS2
        Art. 21(2)(e) and ENISA Measure 6.7.
      </p>
    </section>
  );
}

export default SecurityTestingPanels;
