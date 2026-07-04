import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { Button } from "@complianceos/ui/ui/button";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  TrendingUp,
} from "lucide-react";

interface ComplianceDebtWidgetProps {
  clientId: number;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#22c55e"; // green
  if (score >= 50) return "#f59e0b"; // amber
  if (score >= 25) return "#f97316"; // orange
  return "#ef4444"; // red
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Healthy";
  if (score >= 50) return "Moderate";
  if (score >= 25) return "Concerning";
  return "Critical";
}

function buildGaugeConic(score: number): string {
  const color = getScoreColor(score);
  const percentage = score;
  return `conic-gradient(${color} ${percentage}%, #e5e7eb ${percentage}%)`;
}

export function ComplianceDebtWidget({ clientId }: ComplianceDebtWidgetProps) {
  const {
    data: debtData,
    isLoading: debtLoading,
    isError: debtError,
    refetch: refetchDebt,
  } = trpc.complianceDebt.getDebt.useQuery(
    { clientId },
    { staleTime: 30000 }
  );

  const {
    data: historyData = [],
    isLoading: historyLoading,
    isError: historyError,
    refetch: refetchHistory,
  } = trpc.complianceDebt.getHistory.useQuery(
    { clientId, limit: 5 },
    { staleTime: 30000 }
  );

  const isLoading = debtLoading || historyLoading;
  const isError = debtError || historyError;

  const handleRetry = () => {
    refetchDebt();
    refetchHistory();
  };

  // ── Error State ──
  if (isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-destructive" />
            Compliance Debt
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-3 py-8">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-muted-foreground">
            Failed to load compliance data
          </p>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Loading State ──
  if (isLoading || !debtData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            Compliance Debt
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center py-4">
            <Skeleton className="h-28 w-28 rounded-full" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const { debtScore, breakdown, summary } = debtData;
  const scoreColor = getScoreColor(debtScore);
  const scoreLabel = getScoreLabel(debtScore);
  const hasHistory = historyData.length > 0;
  const sortedHistory = [...historyData].reverse();

  const breakdownEntries: Array<{
    label: string;
    count: number;
    icon: React.ReactNode;
    color: string;
  }> = [
    {
      label: "Overdue Controls",
      count: breakdown.overdueControls,
      icon: <Clock className="h-3.5 w-3.5" />,
      color: "text-orange-500",
    },
    {
      label: "Missing Evidence",
      count: breakdown.missingEvidence,
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      color: "text-yellow-500",
    },
    {
      label: "Expired Evidence",
      count: breakdown.expiredEvidence,
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      color: "text-red-500",
    },
    {
      label: "Overdue Tasks",
      count: breakdown.overdueTasks,
      icon: <Clock className="h-3.5 w-3.5" />,
      color: "text-orange-500",
    },
    {
      label: "Expired Exceptions",
      count: breakdown.expiredExceptions,
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
      color: "text-red-500",
    },
    {
      label: "Active Exceptions",
      count: breakdown.activeExceptions,
      icon: <Shield className="h-3.5 w-3.5" />,
      color: "text-blue-500",
    },
  ];

  const nonZeroEntries = breakdownEntries.filter((e) => e.count > 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Compliance Debt
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score Gauge */}
        <div className="flex items-center gap-4">
          <div
            className="relative h-24 w-24 flex-shrink-0 rounded-full flex items-center justify-center"
            style={{
              background: buildGaugeConic(debtScore),
            }}
          >
            <div className="h-[84px] w-[84px] rounded-full bg-card flex flex-col items-center justify-center">
              <span
                className="text-2xl font-bold leading-none"
                style={{ color: scoreColor }}
              >
                {debtScore}
              </span>
              <span className="text-[10px] text-muted-foreground mt-0.5">
                /100
              </span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <Badge
              className="text-xs font-medium"
              style={{
                backgroundColor: `${scoreColor}20`,
                color: scoreColor,
                border: `1px solid ${scoreColor}40`,
              }}
            >
              {scoreLabel}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {summary}
            </p>
          </div>
        </div>

        {/* Breakdown List */}
        {nonZeroEntries.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Debt Drivers
            </p>
            {nonZeroEntries.map((entry) => (
              <div
                key={entry.label}
                className="flex items-center justify-between py-1"
              >
                <div className="flex items-center gap-2 text-sm">
                  <span className={entry.color}>{entry.icon}</span>
                  <span className="text-muted-foreground">{entry.label}</span>
                </div>
                <Badge variant="secondary" className="text-xs font-mono">
                  {entry.count}
                </Badge>
              </div>
            ))}
          </div>
        )}

        {/* History Chart */}
        {hasHistory && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <TrendingUp className="h-3 w-3" />
              Trend
            </div>
            <div className="h-14 flex items-end gap-1.5">
              {sortedHistory.map((snapshot, idx) => {
                const score = snapshot.complianceScore ?? 0;
                const height = Math.max(4, score); // Minimum 4px bar
                const barColor = getScoreColor(score);
                return (
                  <div
                    key={snapshot.id ?? idx}
                    className="flex-1 rounded-t relative group cursor-pointer transition-all hover:opacity-80"
                    style={{
                      height: `${height}%`,
                      backgroundColor: barColor,
                      minHeight: "4px",
                    }}
                    title={`${new Date(snapshot.snapshotDate).toLocaleDateString()}: ${score}/100`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>
                {sortedHistory[0] &&
                  new Date(sortedHistory[0].snapshotDate).toLocaleDateString()}
              </span>
              <span>
                {sortedHistory[sortedHistory.length - 1] &&
                  new Date(
                    sortedHistory[sortedHistory.length - 1].snapshotDate
                  ).toLocaleDateString()}
              </span>
            </div>
          </div>
        )}

        {/* Empty history */}
        {!hasHistory && !isLoading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground/50" />
            No historical snapshots yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}
