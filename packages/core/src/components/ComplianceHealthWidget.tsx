import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { Button } from "@complianceos/ui/ui/button";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { Activity, AlertTriangle, CheckCircle2, RefreshCw, Clock, TrendingUp } from "lucide-react";
import {
  useCompliancePosture,
  buildDemoCompliancePostureInput,
  buildDemoCompliancePosture,
  POSTURE_STATUS_META,
  formatScore,
  type CompliancePostureResponse,
  type CompliancePostureStatus,
} from "@/pages/complianceMonitorApi";

interface ComplianceHealthWidgetProps {
  clientId: number;
  showDetail?: boolean;
}

/**
 * Compliance Health widget — NIS2 continuous-compliance posture.
 *
 * Cycle 22: migrated from the removed DB-backed `complianceMonitor`
 * procedures to the pure `complianceMonitor.posture` query via the
 * complianceMonitorApi contract layer. The engine is pure (no DB), so the
 * widget drives a deterministic demo input and degrades to the demo posture
 * shape when the server is unreachable.
 */
export function ComplianceHealthWidget({ clientId, showDetail = false }: ComplianceHealthWidgetProps) {
  const postureQuery = useCompliancePosture(buildDemoCompliancePostureInput());
  const demoPosture = buildDemoCompliancePosture();

  const posture: CompliancePostureResponse = postureQuery.data ?? demoPosture;
  const isLoading = postureQuery.isLoading && !postureQuery.data;
  const isRunning = postureQuery.isFetching ?? false;

  const score = posture.overallScore ?? 0;
  const status: CompliancePostureStatus = posture.status ?? "No Data";
  const statusMeta = POSTURE_STATUS_META[status];

  const getHealthBadge = () => {
    switch (status) {
      case "Strong":
        return <Badge variant="success"><CheckCircle2 className="w-3 h-3 mr-1" /> Good</Badge>;
      case "Developing":
        return <Badge variant="warning"><AlertTriangle className="w-3 h-3 mr-1" /> Caution</Badge>;
      case "At Risk":
      case "Critical":
        return <Badge variant="error"><AlertTriangle className="w-3 h-3 mr-1" /> {status === "Critical" ? "Critical" : "At Risk"}</Badge>;
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

  const totalControls = posture.totalMeasures ?? 0;
  const healthyControls = (posture.statusCounts?.strong ?? 0) + (posture.statusCounts?.developing ?? 0);
  const atRiskControls = (posture.statusCounts?.atRisk ?? 0) + (posture.statusCounts?.critical ?? 0);
  const gaps = posture.topGaps ?? [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Activity className="w-5 h-5 text-blue-500" />
          Compliance Health
        </CardTitle>
        <div className="flex items-center gap-2">
          {getHealthBadge()}
          <Button
            variant="outline"
            size="sm"
            onClick={() => postureQuery.refetch()}
            disabled={isRunning}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isRunning ? "animate-spin" : ""}`} />
            {isRunning ? "Checking..." : "Refresh"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Score gauge */}
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
              <span className={`text-3xl font-bold ${statusMeta.textClass}`}>{Math.round(score)}</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{totalControls}</div>
            <div className="text-xs text-muted-foreground">Total Measures</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">{healthyControls}</div>
            <div className="text-xs text-muted-foreground">Healthy</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-500">{atRiskControls}</div>
            <div className="text-xs text-muted-foreground">At Risk</div>
          </div>
        </div>

        {/* Posture line */}
        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-4">
          <Clock className="w-3 h-3" />
          {posture.verdict || "NIS2 continuous compliance posture"}
          <span className="mx-1">·</span>
          {formatScore(posture.coverageRate)} coverage
        </div>

        {/* Detail View */}
        {showDetail && (
          <div className="space-y-6 mt-4 border-t pt-4">
            {/* Top gaps */}
            <div>
              <h4 className="text-sm font-semibold mb-2 flex items-center gap-1">
                <TrendingUp className="w-4 h-4" />
                Top Gaps
              </h4>
              {gaps.length > 0 ? (
                <div className="space-y-1">
                  {gaps.slice(0, 5).map((gap, i) => (
                    <div key={`${gap.measureId ?? "gap"}-${i}`} className="flex justify-between text-xs py-1 px-2 rounded bg-gray-50 dark:bg-gray-800">
                      <span className="truncate max-w-[200px]">
                        {gap.name || gap.measureId || "Unknown measure"}
                      </span>
                      <Badge variant="outline" className="text-xs ml-2">
                        {formatScore(gap.score)} · {gap.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">
                  No gaps — all measures at or above the Strong bar.
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ComplianceHealthWidget;
