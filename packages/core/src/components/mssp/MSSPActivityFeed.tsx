import React from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { ScrollArea } from "@complianceos/ui/ui/scroll-area";
import {
  Activity,
  Zap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingDown,
  UserPlus,
  Clock,
} from "lucide-react";

interface MSSPActivityFeedProps {
  limit?: number;
}

interface ActivityEvent {
  id: string;
  clientName: string;
  clientId: number;
  eventType:
    | "autopilot_completed"
    | "autopilot_failed"
    | "score_drop"
    | "evidence_collected"
    | "evidence_failed"
    | "client_onboarded"
    | "status_changed";
  summary: string;
  timestamp: string;
}

const eventIcons: Record<string, React.ReactNode> = {
  autopilot_completed: <Zap className="h-4 w-4 text-green-500" />,
  autopilot_failed: <XCircle className="h-4 w-4 text-red-500" />,
  score_drop: <TrendingDown className="h-4 w-4 text-amber-500" />,
  evidence_collected: <CheckCircle2 className="h-4 w-4 text-blue-500" />,
  evidence_failed: <AlertTriangle className="h-4 w-4 text-red-500" />,
  client_onboarded: <UserPlus className="h-4 w-4 text-indigo-500" />,
  status_changed: <Activity className="h-4 w-4 text-purple-500" />,
};

const eventColors: Record<string, string> = {
  autopilot_completed: "bg-green-50 border-green-200",
  autopilot_failed: "bg-red-50 border-red-200",
  score_drop: "bg-amber-50 border-amber-200",
  evidence_collected: "bg-blue-50 border-blue-200",
  evidence_failed: "bg-red-50 border-red-200",
  client_onboarded: "bg-indigo-50 border-indigo-200",
  status_changed: "bg-purple-50 border-purple-200",
};

function getRelativeTime(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

export function MSSPActivityFeed({ limit = 10 }: MSSPActivityFeedProps) {
  const { data: runs, isLoading, error, refetch } = trpc.autopilot.listAllRuns.useQuery(
    { limit },
    { refetchInterval: 60000 }
  );

  // Build synthetic activity feed from autopilot runs and other sources
  const activities: ActivityEvent[] = React.useMemo(() => {
    const events: ActivityEvent[] = [];

    if (runs) {
      for (const run of runs) {
        const clientName = `Client #${run.clientId}`;
        const results = run.results as {
          evidenceCollected?: number;
          healthIssuesFound?: number;
          gapsDetected?: number;
          tasksCreated?: number;
        } | null;

        if (run.status === "completed") {
          const evidenceCount = results?.evidenceCollected ?? 0;
          const gapCount = results?.gapsDetected ?? 0;
          events.push({
            id: `ap-${run.id}`,
            clientName,
            clientId: run.clientId,
            eventType: "autopilot_completed",
            summary: `Autopilot completed: ${evidenceCount} evidence, ${gapCount} gaps`,
            timestamp: run.completedAt
              ? new Date(run.completedAt).toISOString()
              : new Date(run.startedAt).toISOString(),
          });
        } else if (run.status === "failed") {
          events.push({
            id: `ap-fail-${run.id}`,
            clientName,
            clientId: run.clientId,
            eventType: "autopilot_failed",
            summary: run.errorMessage || "Autopilot run failed",
            timestamp: new Date(run.completedAt || run.startedAt).toISOString(),
          });
        }
      }
    }

    // Sort by timestamp descending
    events.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return events.slice(0, limit);
  }, [runs, limit]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" />
            Client Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" />
            Client Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle className="h-8 w-8 text-red-400 mb-2" />
            <p className="text-sm text-slate-500 mb-4">
              Failed to load activity feed
            </p>
            <button
              onClick={() => refetch()}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Try again
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5" />
            Client Activity Feed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Clock className="h-8 w-8 text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">
              No recent activity across clients
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Activity will appear as autopilot runs complete
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5" />
          Client Activity Feed
          <Badge variant="outline" className="ml-auto text-xs font-normal">
            Last 24h
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-[400px]">
          <div className="px-6 pb-4 space-y-1">
            {activities.map((event) => (
              <div
                key={event.id}
                className={`flex items-start gap-3 p-3 rounded-lg border ${eventColors[event.eventType] || "bg-slate-50 border-slate-200"}`}
              >
                <div className="mt-0.5 shrink-0">
                  {eventIcons[event.eventType] || (
                    <Activity className="h-4 w-4 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-900 truncate">
                      {event.clientName}
                    </span>
                    <span className="text-xs text-slate-400 shrink-0">
                      {getRelativeTime(event.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mt-0.5 line-clamp-2">
                    {event.summary}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
