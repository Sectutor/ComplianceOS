// AutopilotWidget — Compact dashboard widget for Compliance Autopilot
import React from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { Button } from "@complianceos/ui/ui/button";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { Zap, Play, RefreshCw, ArrowRight, AlertTriangle } from "lucide-react";

interface AutopilotWidgetProps {
  clientId: number;
}

function getRelativeTime(dateStr?: string): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function AutopilotWidget({ clientId }: AutopilotWidgetProps) {
  const { data: config, isLoading, isError, refetch } = trpc.autopilot.getConfig.useQuery(
    { clientId },
    { enabled: clientId > 0 }
  );

  const { data: runHistory } = trpc.autopilot.getRunHistory.useQuery(
    { clientId, limit: 1 },
    { enabled: clientId > 0 && !!config }
  );

  const runNowMutation = trpc.autopilot.runNow.useMutation();

  const handleRunNow = () => {
    runNowMutation.mutate({ clientId });
  };

  // ── Loading ──
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <Skeleton className="h-3 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-7 w-20 rounded" />
            <Skeleton className="h-7 w-28 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Error ──
  if (isError) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm font-medium">Autopilot error</span>
            </div>
            <Button variant="ghost" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── Not configured ──
  if (!config) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Autopilot</span>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Not configured</p>
          <Button
            variant="link"
            size="sm"
            className="h-auto p-0 mt-2 text-xs"
            onClick={() => {
              window.location.href = `/client/${clientId}/autopilot`;
            }}
          >
            Configure Autopilot →
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Derive weekly evidence count from run history
  const latestRun = Array.isArray(runHistory) && runHistory.length > 0 ? runHistory[0] : null;
  const weeklyEvidence = latestRun?.evidenceCollected ?? 0;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className={`h-4 w-4 ${config.enabled ? "text-amber-500" : "text-muted-foreground"}`} />
            <span className="text-sm font-medium">Autopilot</span>
          </div>
          <Badge
            variant={config.enabled ? "default" : "secondary"}
            className="text-[10px] h-5 gap-1"
          >
            <span
              className={`inline-block h-1.5 w-1.5 rounded-full ${
                config.enabled ? "bg-green-400" : "bg-red-400"
              }`}
            />
            {config.enabled ? "On" : "Off"}
          </Badge>
        </div>

        {/* Last run & summary */}
        {config.enabled && (
          <>
            <div className="text-xs text-muted-foreground">
              {config.lastRunAt ? (
                <>Last run: {getRelativeTime(config.lastRunAt)}</>
              ) : (
                <>Not run yet</>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {weeklyEvidence > 0
                ? `${weeklyEvidence} evidence items collected this week`
                : "No evidence collected yet"}
            </p>
          </>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          {config.enabled && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={handleRunNow}
              disabled={runNowMutation.isPending}
            >
              {runNowMutation.isPending ? (
                <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Play className="h-3 w-3 mr-1" />
              )}
              Run Now
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs ml-auto"
            onClick={() => {
              window.location.href = `/client/${clientId}/autopilot`;
            }}
          >
            Open Autopilot
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
