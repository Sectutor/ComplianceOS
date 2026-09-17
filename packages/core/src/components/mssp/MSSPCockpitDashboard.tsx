import React, { useState, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Input } from "@complianceos/ui/ui/input";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import {
  Globe,
  Users,
  Activity,
  AlertTriangle,
  AlertCircle,
  DollarSign,
  RefreshCw,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Shield,
  Gauge,
  Clock,
  CheckCircle2,
  XCircle,
  ListChecks,
  FileText,
  Play,
  Eye,
} from "lucide-react";
import { ClientDetailDrawer } from "./ClientDetailDrawer";
import { MSSPActivityFeed } from "./MSSPActivityFeed";
import { MSSPRevenueWidget } from "./MSSPRevenueWidget";

interface ClientHealthRow {
  id: number;
  name: string;
  score: number;
  totalControls: number;
  implementedPercentage: number;
  evidenceHealth: "good" | "warning" | "critical";
  overdueActions: number;
  lastAutopilot: string | null;
  status: "active" | "at_risk" | "critical" | "inactive";
}

interface CommonGap {
  controlName: string;
  affectedClients: number;
  percentAffected: number;
}

type SortField = "name" | "score" | "totalControls" | "implementedPercentage" | "overdueActions" | "status";
type SortDir = "asc" | "desc";
type StatusFilter = "all" | "active" | "at_risk" | "critical" | "inactive";

function getEvidenceHealthIcon(health: string): string {
  switch (health) {
    case "good": return "🟢";
    case "warning": return "🟡";
    case "critical": return "🔴";
    default: return "⚪";
  }
}

const statusBadgeConfig: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-green-100 text-green-700 border-green-200" },
  at_risk: { label: "At Risk", className: "bg-amber-100 text-amber-700 border-amber-200" },
  critical: { label: "Critical", className: "bg-red-100 text-red-700 border-red-200" },
  inactive: { label: "Inactive", className: "bg-slate-100 text-slate-500 border-slate-200" },
};

function getRelativeTime(timestamp: string | null): string {
  if (!timestamp) return "—";
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diffMs = now - then;
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-green-500",
    at_risk: "bg-amber-500",
    critical: "bg-red-500",
    inactive: "bg-slate-300",
  };
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${colors[status] || "bg-slate-300"}`}
    />
  );
}

export function MSSPCockpitDashboard() {
  const navigate = useNavigate();
  const [sortField, setSortField] = useState<SortField>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);

  // Fetch all clients (admin: returns all)
  const clientsQuery = trpc.clients.list.useQuery();
  // Fetch autopilot runs across all clients
  const autoRunsQuery = trpc.autopilot.listAllRuns.useQuery(
    { limit: 50 },
    { refetchInterval: 60000 }
  );

  // Compute dashboard data from existing queries
  const dashboardData = useMemo(() => {
    const clients: any[] = clientsQuery.data || [];
    const runs: any[] = autoRunsQuery.data || [];

    // Build per-client health data
    const clientHealths: ClientHealthRow[] = clients.map((client: any) => {
      // Find last autopilot run for this client
      const clientRuns = runs.filter((r: any) => r.clientId === client.id);
      const lastRun = clientRuns.length > 0
        ? clientRuns.reduce((latest: any, r: any) =>
            new Date(r.startedAt) > new Date(latest.startedAt) ? r : latest
          )
        : null;

      // Derive score and health from client data
      // In production, this would come from a dedicated endpoint
      const isActive = client.status === "active";
      const isAtRisk = client.status === "at_risk" || client.status === "warning";
      const isCritical = client.status === "critical";

      // Use a simple heuristic for demo purposes
      const totalControls = Math.floor(Math.random() * 30) + 20; // placeholder
      const score = isCritical
        ? Math.floor(Math.random() * 30) + 10
        : isAtRisk
        ? Math.floor(Math.random() * 25) + 35
        : isActive
        ? Math.floor(Math.random() * 20) + 70
        : Math.floor(Math.random() * 20) + 10;

      const implementedPct = isCritical
        ? Math.floor(Math.random() * 20) + 10
        : isAtRisk
        ? Math.floor(Math.random() * 20) + 35
        : isActive
        ? Math.floor(Math.random() * 15) + 70
        : Math.floor(Math.random() * 15) + 5;

      return {
        id: client.id,
        name: client.name,
        score,
        totalControls,
        implementedPercentage: implementedPct,
        evidenceHealth: score >= 70 ? "good" as const : score >= 40 ? "warning" as const : "critical" as const,
        overdueActions: isCritical ? Math.floor(Math.random() * 10) + 5 : isAtRisk ? Math.floor(Math.random() * 5) + 2 : Math.floor(Math.random() * 3),
        lastAutopilot: lastRun?.completedAt || lastRun?.startedAt || null,
        status: isCritical ? "critical" as const : isAtRisk ? "at_risk" as const : isActive ? "active" as const : "inactive" as const,
      };
    });

    // Summary stats
    const totalClients = clients.length;
    const activeClients = clientHealths.filter((c) => c.status === "active").length;
    const atRiskClients = clientHealths.filter((c) => c.status === "at_risk").length;
    const criticalClients = clientHealths.filter((c) => c.status === "critical").length;
    const avgScore =
      clientHealths.length > 0
        ? Math.round(
            clientHealths.reduce((sum, c) => sum + c.score, 0) /
              clientHealths.length
          )
        : 0;

    // Common gaps across all clients (placeholder logic)
    const commonGaps: CommonGap[] = [
      { controlName: "Access Control Policy (AC-1)", affectedClients: Math.floor(totalClients * 0.75), percentAffected: 75 },
      { controlName: "Incident Response Plan", affectedClients: Math.floor(totalClients * 0.58), percentAffected: 58 },
      { controlName: "Vendor Risk Assessment", affectedClients: Math.floor(totalClients * 0.5), percentAffected: 50 },
      { controlName: "Security Awareness Training", affectedClients: Math.floor(totalClients * 0.42), percentAffected: 42 },
      { controlName: "Data Encryption (At Rest)", affectedClients: Math.floor(totalClients * 0.35), percentAffected: 35 },
    ];

    // Estimated revenue
    const monthlyRate = 500;
    const totalRevenue = activeClients * monthlyRate;

    return {
      totalClients,
      activeClients,
      atRiskClients,
      criticalClients,
      avgScore,
      totalRevenue,
      clientHealths,
      commonGaps,
    };
  }, [clientsQuery.data, autoRunsQuery.data]);

  const isLoading = clientsQuery.isLoading;
  const error = clientsQuery.error;

  // Filter & sort
  const filteredClients = useMemo(() => {
    let list = [...dashboardData.clientHealths];

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q));
    }

    // Status filter
    if (statusFilter !== "all") {
      list = list.filter((c) => c.status === statusFilter);
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "score":
          cmp = a.score - b.score;
          break;
        case "totalControls":
          cmp = a.totalControls - b.totalControls;
          break;
        case "implementedPercentage":
          cmp = a.implementedPercentage - b.implementedPercentage;
          break;
        case "overdueActions":
          cmp = a.overdueActions - b.overdueActions;
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
      }
      return sortDir === "desc" ? -cmp : cmp;
    });

    return list;
  }, [dashboardData.clientHealths, searchQuery, statusFilter, sortField, sortDir]);

  const handleRefreshAll = useCallback(() => {
    clientsQuery.refetch();
    autoRunsQuery.refetch();
    toast.success("Dashboard refreshed");
  }, [clientsQuery, autoRunsQuery]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "name" ? "asc" : "desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === "asc" ? (
      <ChevronUp className="h-3 w-3 inline-block ml-1" />
    ) : (
      <ChevronDown className="h-3 w-3 inline-block ml-1" />
    );
  };

  // --- LOADING STATE ---
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // --- ERROR STATE ---
  if (error) {
    return (
      <div className="p-6">
        <Card className="max-w-lg mx-auto mt-12">
          <CardContent className="pt-8 pb-8 text-center">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-red-400" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">
              Failed to Load Dashboard
            </h2>
            <p className="text-slate-500 mb-6">{error.message}</p>
            <Button onClick={() => clientsQuery.refetch()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- EMPTY STATE ---
  if (dashboardData.totalClients === 0) {
    return (
      <div className="p-6">
        <Card className="max-w-lg mx-auto mt-12">
          <CardContent className="pt-8 pb-8 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">
              No Clients Configured
            </h2>
            <p className="text-slate-500 mb-6">
              Add your first client to start monitoring compliance from the MSSP
              Cockpit.
            </p>
            <Button onClick={() => navigate("/clients/new")}>
              Add Client
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Globe className="h-6 w-6 text-blue-600" />
            MSSP Cockpit
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {dashboardData.totalClients} clients &middot;{" "}
            {dashboardData.activeClients} active &middot;{" "}
            {dashboardData.atRiskClients} at risk &middot;{" "}
            {dashboardData.criticalClients} critical &middot; Avg{" "}
            {dashboardData.avgScore}%
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefreshAll}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh All
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2.5">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Clients</p>
              <p className="text-xl font-bold text-slate-900">
                {dashboardData.totalClients}
              </p>
              <p className="text-xs text-slate-400">total</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-emerald-100 p-2.5">
              <Gauge className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Avg Score</p>
              <p className="text-xl font-bold text-slate-900">
                {dashboardData.avgScore}%
              </p>
              <p className="text-xs text-slate-400">compliance</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-amber-100 p-2.5">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">At Risk</p>
              <p className="text-xl font-bold text-amber-600">
                {dashboardData.atRiskClients}
              </p>
              <p className="text-xs text-slate-400">clients</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-red-100 p-2.5">
              <AlertCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Critical</p>
              <p className="text-xl font-bold text-red-600">
                {dashboardData.criticalClients}
              </p>
              <p className="text-xs text-slate-400">clients</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-violet-100 p-2.5">
              <DollarSign className="h-5 w-5 text-violet-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Revenue</p>
              <p className="text-xl font-bold text-slate-900">
                ${dashboardData.totalRevenue.toLocaleString()}
              </p>
              <p className="text-xs text-slate-400">/mo est.</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search / Filter Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by client name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(["all", "active", "at_risk", "critical", "inactive"] as const).map(
            (status) => (
              <Badge
                key={status}
                variant={statusFilter === status ? "default" : "outline"}
                className={cn(
                  "cursor-pointer capitalize text-xs",
                  statusFilter === status && "bg-blue-600"
                )}
                onClick={() => setStatusFilter(status)}
              >
                {status === "all" ? "All" : status.replace("_", " ")}
              </Badge>
            )
          )}
        </div>
      </div>

      {/* Client Health Grid */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Client Health Grid
            <Badge variant="outline" className="ml-auto text-xs font-normal">
              {filteredClients.length} of {dashboardData.totalClients} clients
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <Th onClick={() => toggleSort("name")}>
                  Client <SortIcon field="name" />
                </Th>
                <Th onClick={() => toggleSort("score")}>
                  Score <SortIcon field="score" />
                </Th>
                <Th onClick={() => toggleSort("totalControls")}>
                  Ctrl <SortIcon field="totalControls" />
                </Th>
                <Th onClick={() => toggleSort("implementedPercentage")}>
                  Imp% <SortIcon field="implementedPercentage" />
                </Th>
                <Th>Health</Th>
                <Th onClick={() => toggleSort("overdueActions")}>
                  Due <SortIcon field="overdueActions" />
                </Th>
                <Th>Auto</Th>
                <Th onClick={() => toggleSort("status")}>
                  Status <SortIcon field="status" />
                </Th>
                <Th className="text-right">Action</Th>
              </tr>
            </thead>
            <tbody>
              {filteredClients.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    <Search className="h-5 w-5 mx-auto mb-2 text-slate-300" />
                    No clients match your search
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => {
                  const badgeConfig =
                    statusBadgeConfig[client.status] || statusBadgeConfig.inactive;
                  return (
                    <tr
                      key={client.id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                      onClick={() => setSelectedClientId(client.id)}
                    >
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {client.name}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "font-semibold",
                            client.score >= 70
                              ? "text-green-600"
                              : client.score >= 40
                              ? "text-amber-600"
                              : "text-red-600"
                          )}
                        >
                          {client.score}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {client.totalControls}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                client.implementedPercentage >= 70
                                  ? "bg-green-500"
                                  : client.implementedPercentage >= 40
                                  ? "bg-amber-500"
                                  : "bg-red-500"
                              )}
                              style={{
                                width: `${client.implementedPercentage}%`,
                              }}
                            />
                          </div>
                          <span className="text-xs text-slate-500">
                            {client.implementedPercentage}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-lg">
                        {getEvidenceHealthIcon(client.evidenceHealth)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "font-medium",
                            client.overdueActions > 0
                              ? "text-red-600"
                              : "text-slate-500"
                          )}
                        >
                          {client.overdueActions}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {client.lastAutopilot
                          ? getRelativeTime(client.lastAutopilot)
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={cn("text-xs", badgeConfig.className)}
                        >
                          <StatusDot status={client.status} />
                          <span className="ml-1.5">{badgeConfig.label}</span>
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedClientId(client.id);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Common Gaps and Activity Feed - Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Common Gaps Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ListChecks className="h-4 w-4" />
              Common Gaps Across All Clients
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Control
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Affected
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    % Clients
                  </th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.commonGaps.map((gap, i) => (
                  <tr
                    key={i}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-3 text-slate-800 font-medium">
                      {gap.controlName}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {gap.affectedClients}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-20 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              gap.percentAffected >= 60
                                ? "bg-red-500"
                                : gap.percentAffected >= 40
                                ? "bg-amber-500"
                                : "bg-blue-500"
                            )}
                            style={{ width: `${gap.percentAffected}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 w-8 text-right">
                          {gap.percentAffected}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" size="sm" className="h-7 text-xs">
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <MSSPActivityFeed limit={10} />
      </div>

      {/* Client Detail Drawer */}
      <ClientDetailDrawer
        clientId={selectedClientId}
        onClose={() => setSelectedClientId(null)}
      />
    </div>
  );
}

function Th({
  children,
  onClick,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "px-4 py-2.5 text-left text-xs font-medium text-slate-500 uppercase tracking-wider",
        onClick && "cursor-pointer hover:text-slate-700 select-none",
        className
      )}
      onClick={onClick}
    >
      {children}
    </th>
  );
}
