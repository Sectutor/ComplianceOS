import { Card, CardContent, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { PlugZap, CheckCircle2, XCircle, RefreshCw } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface EvidenceCollectionDashboardProps {
  clientId: number;
}

export function EvidenceCollectionDashboard({
  clientId,
}: EvidenceCollectionDashboardProps) {
  const { data: stats, isLoading } = trpc.connectors.getStats.useQuery(
    { clientId },
    { enabled: clientId > 0 }
  );
  const { data: installed, isLoading: installedLoading } =
    trpc.connectors.listInstalled.useQuery(
      { clientId },
      { enabled: clientId > 0 }
    );

  if (isLoading || installedLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Evidence Collection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-24" />
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.totalConnectors === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <PlugZap className="h-5 w-5" />
            Evidence Collection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No evidence connectors configured.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Install connectors to automate evidence collection.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <PlugZap className="h-5 w-5" />
          Evidence Collection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{stats.totalConnectors}</p>
            <p className="text-xs text-muted-foreground">Connectors</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {stats.enabledConnectors}
            </p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">
              {stats.failedConnectors}
            </p>
            <p className="text-xs text-muted-foreground">Failed</p>
          </div>
        </div>

        {/* Per-connector status */}
        {installed && installed.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Connector Status
            </p>
            {installed.map((conn: any) => (
              <div
                key={conn.id}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  {conn.lastRunStatus === "success" ||
                  conn.lastRunStatus === "connected" ? (
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                  ) : conn.lastRunStatus === "failed" ||
                    conn.lastRunStatus === "error" ? (
                    <XCircle className="h-3.5 w-3.5 text-red-500" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5 text-gray-400" />
                  )}
                  <span>{conn.name}</span>
                  <Badge variant="outline" className="text-[10px] px-1 py-0">
                    {conn.type}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {conn.lastRunAt
                    ? new Date(conn.lastRunAt).toLocaleDateString()
                    : "Never"}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Last collection time */}
        {stats.lastRunAt && (
          <p className="text-xs text-muted-foreground pt-2 border-t">
            Last collection: {new Date(stats.lastRunAt).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
