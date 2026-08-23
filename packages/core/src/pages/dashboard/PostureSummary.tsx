import React, { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { Progress } from "@complianceos/ui/ui/progress";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { CircularProgress } from "@complianceos/ui/ui/circular-progress";
import { EmptyState } from "@complianceos/ui/ui/EmptyState";
import { ShieldCheck, Database, TrendingUp, Loader2, AlertTriangle } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import {
  useDashboardStats,
  derivePostureStats,
  emptyPostureStats,
  type PostureStats,
  type PostureStatus,
} from "./postureStatsApi";

const STATUS_CONFIG: Record<PostureStatus, { label: string; variant: "success" | "warning" | "error"; ring: string }> = {
  strong: { label: "Strong", variant: "success", ring: "#10b981" },
  attention: { label: "Needs Attention", variant: "warning", ring: "#f59e0b" },
  critical: { label: "Critical", variant: "error", ring: "#ef4444" },
};

interface PostureSummaryProps {
  clientId?: string | number;
  framework?: string;
  /** Fallback payloads from the parent Dashboard query */
  enhancedStats?: any;
  complianceScores?: Array<{ date?: string; score?: number }>;
}

/**
 * Vanta-style posture summary: score ring, framework pass-rate bars,
 * evidence coverage and a trend sparkline. Prefers `dashboard.getStats`
 * (backend agent, may not be live yet) and falls back to deriving the same
 * numbers from the existing `dashboard.enhanced` payload.
 */
export function PostureSummary({ clientId, framework, enhancedStats, complianceScores }: PostureSummaryProps) {
  const { t } = useTranslation(['dashboard', 'common', 'compliance']);
  const statsQuery = useDashboardStats(clientId, framework, true);
  const isLive = !!statsQuery.data && !statsQuery.isError;

  const summary: PostureStats = useMemo(() => {
    if (isLive && statsQuery.data) return statsQuery.data;
    if (!statsQuery.isLoading && !isLive && enhancedStats) {
      return derivePostureStats(enhancedStats, complianceScores) ?? emptyPostureStats();
    }
    return emptyPostureStats();
  }, [isLive, statsQuery.data, statsQuery.isLoading, enhancedStats, complianceScores]);

  const status = STATUS_CONFIG[summary.status] ?? STATUS_CONFIG.attention;
  const statusLabel = summary.status === 'strong' ? t('common.strong', 'Strong') : summary.status === 'critical' ? t('common.critical', 'Critical') : t('common.needsAttention', 'Needs Attention');
  const sortedFrameworks = useMemo(
    () => [...(summary.frameworks ?? [])].sort((a, b) => b.passRate - a.passRate).slice(0, 6),
    [summary.frameworks]
  );
  const hasTrend = (summary.trend?.length ?? 0) >= 2;

  if (statsQuery.isLoading && !isLive && !enhancedStats) {
    return (
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i} className="shadow-sm">
            <CardContent className="p-6">
              <Skeleton className="h-4 w-28 mb-4" />
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <section className="space-y-4" aria-label="Posture summary">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">{t('dashboard.postureSummary', 'Posture Summary')}</h2>
        <div className="flex items-center gap-2">
          {isLive ? (
            <Badge variant="info" className="gap-1.5">
              <Loader2 className="h-3 w-3" /> Live API
            </Badge>
          ) : (
            <Badge variant="outline" className="text-muted-foreground border-border">
              Derived from workspace data
            </Badge>
          )}
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-4">
        {/* Score ring */}
        <Card className="shadow-sm h-full">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight">
              <ShieldCheck className="h-4 w-4 text-muted-foreground" />
              {t('dashboard.complianceScore', 'Compliance Score')}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-4 pb-6">
            <CircularProgress value={summary.postureScore} size={150} strokeWidth={12} color={status.ring} />
            <Badge variant={status.variant} className="mt-4">
              {statusLabel}
            </Badge>
            <p className="text-xs text-muted-foreground mt-2">
              {summary.controls.implemented} {t('common.of', 'of')} {summary.controls.total} {t('dashboard.controlsImplemented', 'controls implemented')}
            </p>
          </CardContent>
        </Card>

        {/* Framework pass-rate bars */}
        <Card className="shadow-sm h-full">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              {t('dashboard.frameworkPassRate', 'Framework Pass Rate')}
            </CardTitle>
            <CardDescription>{t('dashboard.frameworkPassRateDesc', 'Share of controls passing per framework')}</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {sortedFrameworks.length === 0 ? (
              <EmptyState
                icon={Database}
                title="No framework data"
                description="Framework coverage will appear once controls are mapped."
                className="p-4"
              />
            ) : (
              <ul className="space-y-3.5">
                {sortedFrameworks.map((fw) => (
                  <li key={fw.framework}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-foreground truncate pr-2">{fw.framework}</span>
                      <span className="tabular-nums text-muted-foreground">{fw.passRate}%</span>
                    </div>
                    <Progress
                      value={fw.passRate}
                      indicatorClassName={fw.passRate >= 80 ? "bg-emerald-500" : fw.passRate >= 50 ? "bg-amber-500" : "bg-red-500"}
                    />
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {fw.totalControls} control{fw.totalControls === 1 ? "" : "s"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Evidence coverage */}
        <Card className="shadow-sm h-full">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight">
              <Database className="h-4 w-4 text-muted-foreground" />
              {t('dashboard.evidenceCoverage', 'Evidence Coverage')}
            </CardTitle>
            <CardDescription>{t('dashboard.evidenceCoverageDesc', 'Verified evidence across the workspace')}</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-2xl font-bold tabular-nums tracking-tight text-foreground">{summary.evidence.coverage}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {summary.evidence.verified} {t('dashboard.verifiedOf', 'verified of')} {summary.evidence.total} {t('common.total', 'total')}
                </p>
              </div>
              <CircularProgress value={summary.evidence.coverage} size={64} strokeWidth={7} color={status.ring} />
            </div>
            <div className="mt-4">
              <Progress
                value={summary.evidence.coverage}
                indicatorClassName={cn(
                  summary.evidence.coverage >= 80 ? "bg-emerald-500" : summary.evidence.coverage >= 50 ? "bg-amber-500" : "bg-red-500"
                )}
              />
              <p className={cn("text-[11px] mt-2 flex items-center gap-1", summary.evidence.expiringSoon > 0 ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground")}>
                {summary.evidence.expiringSoon > 0 ? (
                  <>
                    <AlertTriangle className="h-3 w-3" /> {summary.evidence.expiringSoon} {t('dashboard.expiringSoon', 'expiring soon')}
                  </>
                ) : (
                  t('dashboard.noExpiringEvidence', 'No evidence expiring soon')
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Trend sparkline */}
        <Card className="shadow-sm h-full">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              {t('dashboard.scoreTrend', 'Score Trend')}
            </CardTitle>
            <CardDescription>{t('dashboard.scoreTrendDesc', 'Compliance score over time')}</CardDescription>
          </CardHeader>
          <CardContent className="pt-2">
            {hasTrend ? (
              <div className="h-36 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={summary.trend}>
                    <XAxis dataKey="date" hide />
                    <YAxis hide domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--card)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      labelStyle={{ fontWeight: 600 }}
                    />
                    <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-36 w-full flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/20 text-center">
                <TrendingUp className="h-6 w-6 text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground max-w-[160px]">Complete assessments to start seeing a trend.</p>
              </div>
            )}
            <p className="text-[11px] text-muted-foreground mt-2">
              {hasTrend ? `${summary.trend.length} data points` : "Awaiting trend data"}
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
