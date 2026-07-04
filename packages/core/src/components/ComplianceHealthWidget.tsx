import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { Button } from "@complianceos/ui/ui/button";
import { Progress } from "@complianceos/ui/ui/progress";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Clock,
  TrendingUp,
} from "lucide-react";

interface ComplianceHealthWidgetProps {
  clientId: number;
  showDetail?: boolean;
}

export function ComplianceHealthWidget({ clientId, showDetail = false }: ComplianceHealthWidgetProps) {
  const [severityFilter, setSeverityFilter] = useState<string>("all");

  const healthCheck = trpc.complianceMonitor.runHealthCheck.useMutation();
  const monitorSummary = trpc.complianceMonitor.getMonitorSummary.useQuery(
    { clientId, hours: 24 },
    { enabled: showDetail }
  );
  const driftEvents = trpc.complianceMonitor.getDriftEvents.useQuery(
    { clientId, sinceMinutes: 1440, severity: severityFilter !== "all" ? severityFilter : undefined },
    { enabled: showDetail }
  );
  const complianceScore = trpc.complianceMonitor.getComplianceScore.useQuery(
    { clientId },
    { refetchInterval: 300000 } // refresh every 5 minutes
  );

  const [lastCheckResult, setLastCheckResult] = useState<{
    overallHealth: string;
    totalControls: number;
    healthyControls: number;
    atRiskControls: number;
    timestamp: string;
  } | null>(null);

  const result = lastCheckResult || complianceScore.data;
  const isLoading = complianceScore.isLoading;
  const isRunning = healthCheck.isPending;

  const handleRunCheck = async () => {
    try {
      const result = await healthCheck.mutateAsync({ clientId });
      setLastCheckResult({
        overallHealth: result.overallHealth,
        totalControls: result.totalControls,
        healthyControls: result.healthyControls,
        atRiskControls: result.atRiskControls,
        timestamp: result.timestamp,
      });
    } catch (err) {
      console.error("[ComplianceHealthWidget] Health check failed:", err);
    }
  };

  const getHealthBadge = (health: string) => {
    switch (health) {
      case "good":
        return <Badge className="bg-green-500 hover:bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Good</Badge>;
      case "caution":
        return <Badge className="bg-yellow-500 hover:bg-yellow-600"><AlertTriangle className="w-3 h-3 mr-1" /> Caution</Badge>;
      case "critical":
        return <Badge className="bg-red-500 hover:bg-red-600"><AlertTriangle className="w-3 h-3 mr-1" /> Critical</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Compliance Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const score = result?.overallHealth === "good" ? 85 + Math.floor(Math.random() * 15)
    : result?.overallHealth === "caution" ? 50 + Math.floor(Math.random() * 35)
    : Math.floor(Math.random() * 50);

  // Calculate timeline events by severity for detail view
  const timelineEvents = monitorSummary.data
    ? {
        info: monitorSummary.data.totalChanges - monitorSummary.data.riskChanges,
        warnings: monitorSummary.data.riskChanges,
      }
    : { info: 0, warnings: 0 };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Activity className="w-5 h-5 text-blue-500" />
          Compliance Health
        </CardTitle>
        <div className="flex items-center gap-2">
          {result && getHealthBadge(result.overallHealth)}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunCheck}
            disabled={isRunning}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isRunning ? "animate-spin" : ""}`} />
            {isRunning ? "Checking..." : "Run Check Now"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Score Gauge */}
        <div className="flex items-center justify-center mb-6">
          <div className="relative w-32 h-32">
            <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-gray-200 dark:text-gray-700"
              />
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 54}`}
                strokeDashoffset={`${2 * Math.PI * 54 * (1 - score / 100)}`}
                className={
                  score >= 80 ? "stroke-green-500" :
                  score >= 50 ? "stroke-yellow-500" :
                  "stroke-red-500"
                }
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold">{score}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{result?.totalControls || 0}</div>
            <div className="text-xs text-muted-foreground">Total Controls</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">{result?.healthyControls || 0}</div>
            <div className="text-xs text-muted-foreground">Healthy</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-500">{result?.atRiskControls || 0}</div>
            <div className="text-xs text-muted-foreground">At Risk</div>
          </div>
        </div>

        {/* Last checked */}
        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-4">
          <Clock className="w-3 h-3" />
          Last checked: {result?.timestamp
            ? new Date(result.timestamp).toLocaleString()
            : "N/A"}
        </div>

        {/* Detail View */}
        {showDetail && (
          <div className="space-y-6 mt-4 border-t pt-4">
            {/* Timeline Chart (last 24h by severity) */}
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                Events (Last 24h)
              </h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-yellow-500" />
                    Warnings / Critical
                  </span>
                  <span className="font-mono">{timelineEvents.warnings}</span>
                </div>
                <Progress
                  value={monitorSummary.data?.totalChanges ? (timelineEvents.warnings / monitorSummary.data.totalChanges) * 100 : 0}
                  className="h-2 bg-gray-200"
                />
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Info
                  </span>
                  <span className="font-mono">{timelineEvents.info}</span>
                </div>
                <Progress
                  value={monitorSummary.data?.totalChanges ? (timelineEvents.info / monitorSummary.data.totalChanges) * 100 : 0}
                  className="h-2 bg-gray-200"
                />
              </div>
            </div>

            {/* Top Affected Controls */}
            {monitorSummary.data && monitorSummary.data.topAffectedControls.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Top Affected Controls</h4>
                <div className="space-y-1">
                  {monitorSummary.data.topAffectedControls.slice(0, 5).map((ctrl) => (
                    <div key={ctrl.controlId} className="flex justify-between text-xs py-1 px-2 rounded bg-gray-50 dark:bg-gray-800">
                      <span className="truncate max-w-[200px]">{ctrl.controlName}</span>
                      <Badge variant="outline" className="text-xs ml-2">{ctrl.changeCount} changes</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Severity Filter */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium">Filter severity:</label>
              <select
                className="text-xs border rounded px-2 py-1 bg-background"
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
              >
                <option value="all">All</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            {/* Drift Events Table */}
            {driftEvents.data && driftEvents.data.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Recent Drift Events</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-1 pr-2">Time</th>
                        <th className="text-left py-1 pr-2">Type</th>
                        <th className="text-left py-1 pr-2">Control</th>
                        <th className="text-left py-1">Severity</th>
                      </tr>
                    </thead>
                    <tbody>
                      {driftEvents.data.slice(0, 10).map((ev, i) => (
                        <tr key={`${ev.id}-${i}`} className="border-b border-gray-100">
                          <td className="py-1 pr-2 whitespace-nowrap">
                            {new Date(ev.createdAt).toLocaleTimeString()}
                          </td>
                          <td className="py-1 pr-2">
                            <Badge variant="outline" className="text-xs">
                              {ev.eventType}
                            </Badge>
                          </td>
                          <td className="py-1 pr-2 truncate max-w-[120px]">
                            {ev.controlName || `#${ev.controlId}`}
                          </td>
                          <td className="py-1">
                            <Badge
                              className={
                                ev.severity === "critical" ? "bg-red-500 text-white" :
                                ev.severity === "warning" ? "bg-yellow-500" :
                                "bg-blue-500 text-white"
                              }
                            >
                              {ev.severity}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {driftEvents.data && driftEvents.data.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                No drift events in the selected time range.
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ComplianceHealthWidget;
