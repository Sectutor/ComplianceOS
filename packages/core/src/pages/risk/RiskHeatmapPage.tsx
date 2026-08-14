import React, { useMemo, useState } from "react";
import { useParams, useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Breadcrumb } from "@/components/Breadcrumb";
import { PageHeader } from "@complianceos/ui/ui/PageHeader";
import { StatCard } from "@complianceos/ui/ui/StatCard";
import { EmptyState } from "@complianceos/ui/ui/EmptyState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { Button } from "@complianceos/ui/ui/button";
import { Progress } from "@complianceos/ui/ui/progress";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@complianceos/ui/ui/sheet";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Shield,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Grid3x3,
  Loader2,
  FlaskConical,
  Calendar,
  User,
  FileText,
  LayoutGrid,
} from "lucide-react";
import {
  useRiskHeatmapData,
  useTreatmentPlans,
  buildDemoHeatmapData,
  DEMO_TREATMENT_PLANS,
  type HeatmapCell,
  type RiskHeatmapData,
  type TreatmentPlan,
} from "./riskHeatmapApi";

/* ------------------------------------------------------------------ */
/* Severity color scale (documented exception to token-only colors:    */
/* data-viz heat map scale, consistent with components/risk/RiskHeatmap.tsx) */
/* ------------------------------------------------------------------ */

function cellClasses(likelihood: number, impact: number, count: number, active: boolean) {
  const score = likelihood * impact;
  const fill =
    count > 0
      ? score >= 15
        ? "bg-red-500 text-white dark:bg-red-600"
        : score >= 8
          ? "bg-orange-500 text-white dark:bg-orange-600"
          : score >= 4
            ? "bg-amber-400 text-amber-950 dark:bg-amber-500 dark:text-amber-50"
            : "bg-emerald-400 text-emerald-950 dark:bg-emerald-500 dark:text-emerald-50"
      : "bg-muted/60 text-muted-foreground/60 dark:bg-muted";
  return cn(
    "aspect-[4/3] min-h-[44px] md:min-h-[56px] rounded-lg flex items-center justify-center",
    "text-sm md:text-base font-bold tabular-nums cursor-pointer select-none",
    "transition-all hover:brightness-95 hover:shadow-sm focus-visible:outline-none",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    fill,
    active && "ring-2 ring-ring ring-offset-2 scale-[1.04] z-10 shadow-md"
  );
}

const SCALE_LABELS = ["1 · Very Low", "2 · Low", "3 · Medium", "4 · High", "5 · Very High"];

/* ------------------------------------------------------------------ */
/* Treatment status chip — open / in-progress / mitigated / accepted  */
/* ------------------------------------------------------------------ */

const TREATMENT_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  open: {
    label: "Open",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
  "in-progress": {
    label: "In Progress",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  mitigated: {
    label: "Mitigated",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  accepted: {
    label: "Accepted",
    className: "bg-muted text-muted-foreground border-border",
  },
};

export function TreatmentStatusBadge({ status }: { status: string }) {
  const key = (status || "open").toLowerCase();
  const config = TREATMENT_STATUS_CONFIG[key] ?? TREATMENT_STATUS_CONFIG.open;
  return (
    <Badge variant="outline" className={cn("font-semibold border", config.className)}>
      {config.label}
    </Badge>
  );
}

function formatDueDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/* ------------------------------------------------------------------ */
/* 5x5 matrix visualization                                            */
/* ------------------------------------------------------------------ */

interface MatrixProps {
  data: RiskHeatmapData;
  selectedCell: { likelihood: number; impact: number } | null;
  onSelectCell: (cell: { likelihood: number; impact: number } | null) => void;
}

function HeatmapMatrix({ data, selectedCell, onSelectCell }: MatrixProps) {
  const cellMap = useMemo(() => {
    const map = new Map<string, HeatmapCell>();
    (data.matrix || []).forEach((c) => map.set(`${c.likelihood}-${c.impact}`, c));
    return map;
  }, [data.matrix]);

  const isActive = (l: number, i: number) =>
    !!selectedCell && selectedCell.likelihood === l && selectedCell.impact === i;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        {/* Y axis label */}
        <div className="flex items-center justify-center w-6">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground -rotate-90 whitespace-nowrap">
            Likelihood
          </span>
        </div>
        <div className="flex-1 space-y-1.5">
          {[5, 4, 3, 2, 1].map((likelihood) => (
            <div key={likelihood} className="flex gap-1.5">
              <div className="w-20 flex items-center justify-end pr-2 text-xs text-muted-foreground font-medium whitespace-nowrap">
                {likelihood}
              </div>
              {[1, 2, 3, 4, 5].map((impact) => {
                const cell = cellMap.get(`${likelihood}-${impact}`);
                const count = cell?.count ?? 0;
                return (
                  <button
                    key={`${likelihood}-${impact}`}
                    type="button"
                    className={cn("flex-1", cellClasses(likelihood, impact, count, isActive(likelihood, impact)))}
                    title={`Likelihood ${likelihood} · Impact ${impact} — ${count} risk${count === 1 ? "" : "s"}`}
                    aria-label={`Likelihood ${likelihood}, impact ${impact}, ${count} risks`}
                    onClick={() => onSelectCell(isActive(likelihood, impact) ? null : { likelihood, impact })}
                  >
                    {count > 0 ? count : ""}
                  </button>
                );
              })}
            </div>
          ))}
          <div className="flex gap-1.5 pt-1">
            <div className="w-20" />
            {[1, 2, 3, 4, 5].map((impact) => (
              <div key={impact} className="flex-1 text-center text-xs text-muted-foreground font-medium">
                {impact}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Impact</span>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
        {[
          { label: "Critical", cls: "bg-red-500 dark:bg-red-600" },
          { label: "High", cls: "bg-orange-500 dark:bg-orange-600" },
          { label: "Medium", cls: "bg-amber-400 dark:bg-amber-500" },
          { label: "Low", cls: "bg-emerald-400 dark:bg-emerald-500" },
          { label: "No risks", cls: "bg-muted" },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn("h-3 w-3 rounded", item.cls)} />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function RiskHeatmapPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const clientId = params.id ? parseInt(params.id, 10) : 0;

  const [selectedCell, setSelectedCell] = useState<{ likelihood: number; impact: number } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [demoMode, setDemoMode] = useState(false);

  const heatmapQuery = useRiskHeatmapData(clientId, !demoMode);
  const plansQuery = useTreatmentPlans(clientId, selectedCell, !demoMode && drawerOpen);

  /* Resolve data: live endpoint first, demo mode second, never fake primary */
  const data = demoMode ? buildDemoHeatmapData() : heatmapQuery.data;
  const backendLive = !demoMode && !heatmapQuery.isError;

  const plans: TreatmentPlan[] = demoMode
    ? selectedCell
      ? DEMO_TREATMENT_PLANS.filter((p) => p.likelihood === selectedCell.likelihood && p.impact === selectedCell.impact)
      : DEMO_TREATMENT_PLANS
    : (plansQuery.data ?? []);

  const totals = data?.totals;
  const isLoading = !demoMode && heatmapQuery.isLoading;

  const handleOpenCell = (cell: { likelihood: number; impact: number } | null) => {
    setSelectedCell(cell);
    setDrawerOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full max-w-full">
        <Breadcrumb
          items={[
            { label: "Risk Management", href: `/clients/${clientId}/risks` },
            { label: "Risk Heat Map" },
          ]}
        />

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="-ml-3 text-muted-foreground hover:text-foreground" onClick={() => setLocation(`/clients/${clientId}/risks`)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Risk Dashboard
          </Button>
        </div>

        <PageHeader
          title="Risk Heat Map"
          subtitle="5×5 likelihood × impact matrix with treatment plan drill-down."
          actions={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDemoMode((v) => !v)}
                className={cn(demoMode && "border-amber-500/40 text-amber-700 dark:text-amber-400")}
              >
                <FlaskConical className="h-4 w-4 mr-2" />
                {demoMode ? "Exit Demo Mode" : "Demo Mode"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => setLocation(`/clients/${clientId}/risks/treatment-plan`)}>
                <LayoutGrid className="h-4 w-4 mr-2" />
                Treatment Plan
              </Button>
            </>
          }
        />

        {/* Demo mode banner — never hides behind real data */}
        {demoMode && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
            <FlaskConical className="h-4 w-4 shrink-0" />
            <span>
              <strong>Demo mode:</strong> showing sample data. Connect the <code className="text-xs">riskHeatmap.*</code>{" "}
              API to see live risk data.
            </span>
          </div>
        )}

        {/* Summary stats */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Risks" value={totals?.totalRisks ?? "—"} icon={Shield} tone="blue" />
          <StatCard label="Critical" value={totals?.criticalCount ?? "—"} icon={Flame} tone="red" />
          <StatCard label="High" value={totals?.highCount ?? "—"} icon={AlertTriangle} tone="amber" />
          <StatCard label="Treatment Progress" value={`${totals?.treatmentProgress ?? 0}%`} icon={CheckCircle2} tone="green">
            <Progress value={totals?.treatmentProgress ?? 0} className="mt-2 h-1.5" />
          </StatCard>
        </div>

        {/* Matrix */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
              <Grid3x3 className="h-5 w-5 text-muted-foreground" />
              Inherent Risk Matrix
            </CardTitle>
            <CardDescription>
              Click a cell to view its treatment plans. Higher likelihood × impact = greater priority.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[5, 4, 3, 2, 1].map((n) => (
                  <div key={n} className="flex gap-1.5">
                    <Skeleton className="h-12 w-20" />
                    <Skeleton className="h-12 flex-1" />
                  </div>
                ))}
              </div>
            ) : data ? (
              <HeatmapMatrix data={data} selectedCell={selectedCell} onSelectCell={handleOpenCell} />
            ) : (
              <EmptyState
                icon={Grid3x3}
                title="Connect the risk heat map API"
                description="The riskHeatmap.* endpoint is not live yet. Enable demo mode to preview the matrix."
                action={{ label: "Preview with Demo Data", onClick: () => setDemoMode(true) }}
              />
            )}
          </CardContent>
        </Card>

        {/* Treatment plan drawer */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                Treatment Plans
              </SheetTitle>
              <SheetDescription>
                {selectedCell
                  ? `Likelihood ${selectedCell.likelihood} × Impact ${selectedCell.impact} (${SCALE_LABELS[selectedCell.likelihood - 1]} × ${SCALE_LABELS[selectedCell.impact - 1]})`
                  : "All treatment plans for this workspace"}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-4 space-y-4">
              {selectedCell && (
                <div className="flex justify-between items-center">
                  <Badge variant="outline" className="border-border text-muted-foreground">
                    Filtered by cell
                  </Badge>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedCell(null)}>
                    Show all
                  </Button>
                </div>
              )}

              {plansQuery.isLoading && !demoMode ? (
                <div className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : plansQuery.isError && !demoMode ? (
                <EmptyState
                  icon={Grid3x3}
                  title="Connect the risk heat map API"
                  description="Treatment plans load from riskHeatmap.listTreatmentPlans once the endpoint is live."
                />
              ) : plans.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="No treatment plans here"
                  description="This cell has no treatment plans yet. Create one from the Treatment Plan page."
                />
              ) : (
                <ul className="space-y-3">
                  {plans.map((plan) => (
                    <li key={plan.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-foreground leading-snug">{plan.riskTitle}</p>
                          {plan.strategy && (
                            <p className="text-xs text-muted-foreground mt-1 capitalize">{plan.strategy} strategy</p>
                          )}
                        </div>
                        <TreatmentStatusBadge status={plan.status} />
                      </div>
                      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                        {plan.owner && (
                          <span className="flex items-center gap-1">
                            <User className="h-3.5 w-3.5" /> {plan.owner}
                          </span>
                        )}
                        {formatDueDate(plan.dueDate) && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" /> {formatDueDate(plan.dueDate)}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {!demoMode && heatmapQuery.isError && (
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" />
            Waiting for the riskHeatmap.* endpoint to come online — live data will appear here automatically.
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
