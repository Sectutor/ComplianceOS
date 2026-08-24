import React from "react";
import { useNavigate } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@complianceos/ui/ui/sheet";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { Separator } from "@complianceos/ui/ui/separator";
import { ScrollArea } from "@complianceos/ui/ui/scroll-area";
import { Progress } from "@complianceos/ui/ui/progress";
import { toast } from "sonner";
import {
  X,
  ExternalLink,
  Play,
  FileText,
  Shield,
  Activity,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ListChecks,
  TrendingDown,
  Gauge,
} from "lucide-react";

interface ClientDetailDrawerProps {
  clientId: number | null;
  onClose: () => void;
}

interface ClientHealthSummary {
  id: number;
  name: string;
  status: "active" | "at_risk" | "critical" | "inactive";
  complianceScore: number;
  totalControls: number;
  implementedPercentage: number;
  overdueActions: number;
  lastAutopilotRun: string | null;
  evidenceHealth: "good" | "warning" | "critical";
}

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  active: {
    label: "Active",
    color: "bg-green-100 text-green-800 border-green-200",
    dot: "🟢",
  },
  at_risk: {
    label: "At Risk",
    color: "bg-amber-100 text-amber-800 border-amber-200",
    dot: "🟡",
  },
  critical: {
    label: "Critical",
    color: "bg-red-100 text-red-800 border-red-200",
    dot: "🔴",
  },
  inactive: {
    label: "Inactive",
    color: "bg-slate-100 text-slate-600 border-slate-200",
    dot: "⚪",
  },
};

function ComplianceScoreGauge({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;
  const strokeColor =
    score >= 80 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="flex flex-col items-center">
      <svg width="88" height="88" viewBox="0 0 88 88" className="-rotate-90">
        <circle
          cx="44"
          cy="44"
          r="36"
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="6"
        />
        <circle
          cx="44"
          cy="44"
          r="36"
          fill="none"
          stroke={strokeColor}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <span className="absolute mt-[30px] text-xl font-bold" style={{ color: strokeColor }}>
        {score}%
      </span>
    </div>
  );
}

function getRelativeTime(timestamp: string | null): string {
  if (!timestamp) return "Never";
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function ClientDetailDrawer({ clientId, onClose }: ClientDetailDrawerProps) {
  const navigate = useNavigate();
  const open = clientId !== null;

  // Fetch client details
  const clientQuery = trpc.clients.get.useQuery(
    { id: clientId! },
    { enabled: open }
  );

  const autopilotRunsQuery = trpc.autopilot.getRunHistory.useQuery(
    { clientId: clientId!, limit: 5 },
    { enabled: open }
  );

  const runAutopilotMutation = trpc.autopilot.runNow.useMutation({
    onSuccess: () => {
      toast.success("Autopilot run started for this client");
      autopilotRunsQuery.refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const client = clientQuery.data as ClientHealthSummary | undefined;
  const recentRuns = autopilotRunsQuery.data as any[] | undefined;

  if (!open) return null;

  const status = client?.status || "active";
  const config = statusConfig[status] || statusConfig.active;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center gap-2">
            {client?.name || "Client Details"}
            {client && (
              <Badge
                variant="outline"
                className={`text-xs ${config.color}`}
              >
                {config.dot} {config.label}
              </Badge>
            )}
          </SheetTitle>
          <SheetDescription>
            Compliance overview and quick actions
          </SheetDescription>
        </SheetHeader>

        {clientQuery.isLoading ? (
          <div className="space-y-4 py-4">
            <div className="flex justify-center py-4">
              <Skeleton className="h-24 w-24 rounded-full" />
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : clientQuery.error ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <XCircle className="h-8 w-8 text-red-400 mb-2" />
            <p className="text-sm text-slate-500">Failed to load client data</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => clientQuery.refetch()}
            >
              Retry
            </Button>
          </div>
        ) : client ? (
          <ScrollArea className="h-[calc(100vh-140px)] pr-4">
            <div className="space-y-6 py-4">
              {/* Score Gauge */}
              <div className="flex flex-col items-center py-4">
                <div className="relative flex items-center justify-center">
                  <ComplianceScoreGauge score={client.complianceScore} />
                </div>
                <p className="text-sm text-slate-500 mt-3">
                  Compliance Score
                </p>
              </div>

              <Separator />

              {/* Quick Stats */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Gauge className="h-4 w-4" />
                  Quick Stats
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Controls</p>
                    <p className="text-lg font-semibold text-slate-800">
                      {client.totalControls}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Implemented</p>
                    <p className="text-lg font-semibold text-slate-800">
                      {client.implementedPercentage}%
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Evidence Health</p>
                    <p className="text-lg font-semibold">
                      {client.evidenceHealth === "good" && (
                        <span className="text-green-600">🟢 Good</span>
                      )}
                      {client.evidenceHealth === "warning" && (
                        <span className="text-amber-600">🟡 Warning</span>
                      )}
                      {client.evidenceHealth === "critical" && (
                        <span className="text-red-600">🔴 Critical</span>
                      )}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">Overdue Actions</p>
                    <p
                      className={`text-lg font-semibold ${
                        client.overdueActions > 0
                          ? "text-red-600"
                          : "text-slate-800"
                      }`}
                    >
                      {client.overdueActions}
                    </p>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Recent Autopilot Runs */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Recent Autopilot Runs
                  <Badge variant="outline" className="ml-auto text-xs font-normal">
                    Last 5
                  </Badge>
                </h4>
                {autopilotRunsQuery.isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : recentRuns && recentRuns.length > 0 ? (
                  <div className="space-y-2">
                    {recentRuns.map((run: any) => (
                      <div
                        key={run.id}
                        className="flex items-start gap-3 rounded-lg border border-slate-200 p-3"
                      >
                        {run.status === "completed" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                        ) : run.status === "failed" ? (
                          <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                        ) : (
                          <Clock className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 capitalize">
                            {run.status}
                          </p>
                          <p className="text-xs text-slate-500">
                            {run.results
                              ? `${run.results.evidenceCollected || 0} evidence · ${run.results.gapsDetected || 0} gaps`
                              : "No results"}
                            {run.duration && ` · ${run.duration}s`}
                          </p>
                          <p className="text-xs text-slate-400 mt-0.5">
                            {getRelativeTime(
                              run.completedAt || run.startedAt
                            )}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-6 text-center rounded-lg border border-dashed border-slate-200">
                    <Clock className="h-6 w-6 text-slate-300 mb-2" />
                    <p className="text-sm text-slate-500">
                      No autopilot runs yet
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Run autopilot to see results here
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Top Gaps (placeholder - fetched in real scenario) */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                  <ListChecks className="h-4 w-4" />
                  Top Gaps
                </h4>
                <div className="flex flex-col items-center justify-center py-4 text-center rounded-lg border border-dashed border-slate-200">
                  <TrendingDown className="h-5 w-5 text-slate-300 mb-1" />
                  <p className="text-xs text-slate-500">
                    Run autopilot to detect gaps
                  </p>
                </div>
              </div>

              <Separator />

              {/* Quick Actions */}
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-3">
                  Quick Actions
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    className="justify-start"
                    onClick={() => navigate(`/client/${clientId}`)}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Dashboard
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start"
                    onClick={() =>
                      runAutopilotMutation.mutate({ clientId: clientId! })
                    }
                    disabled={runAutopilotMutation.isPending}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {runAutopilotMutation.isPending
                      ? "Running..."
                      : "Run Autopilot"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start"
                    onClick={() => toast.info("Report generation coming soon")}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="justify-start"
                    onClick={() => toast.info("Audit portal coming soon")}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    View Audit Portal
                  </Button>
                </div>
              </div>
            </div>
          </ScrollArea>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
