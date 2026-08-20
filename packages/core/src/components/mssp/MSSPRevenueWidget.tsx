import React from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@complianceos/ui/ui/tooltip";
import { DollarSign, AlertTriangle, TrendingUp } from "lucide-react";

interface MSSPRevenueWidgetProps {
  defaultMonthlyRate?: number;
}

// Default billing rate per active client per month
const DEFAULT_MONTHLY_RATE = 500;

export function MSSPRevenueWidget({ defaultMonthlyRate = DEFAULT_MONTHLY_RATE }: MSSPRevenueWidgetProps) {
  // Cycle 22: revenue is computed from the client list (active / at-risk
  // counts). The DB-backed complianceMonitor procedures were removed when
  // the router migrated to the pure NIS2 posture engine. `as any` cast
  // follows the established tRPC client-type workaround (DecoratedQuery
  // backlog - see NIST80037Assess.tsx).
  const clientsQuery = (trpc as any).clients.list.useQuery(undefined, {
    enabled: true,
  });

  const revenue = React.useMemo(() => {
    const clients = clientsQuery.data || [];
    const totalClients = clients.length;
    const activeClients = clients.filter(
      (c: any) => c.status === "active"
    ).length;
    const atRiskClients = clients.filter(
      (c: any) => c.status === "at_risk" || c.status === "critical"
    ).length;

    const monthlyRate = defaultMonthlyRate;
    const totalMonthlyRevenue = activeClients * monthlyRate;
    const atRiskRevenue = atRiskClients * monthlyRate;
    const atRiskPercent =
      totalMonthlyRevenue > 0
        ? Math.round((atRiskRevenue / totalMonthlyRevenue) * 100)
        : 0;

    return {
      totalClients,
      activeClients,
      atRiskClients,
      totalMonthlyRevenue,
      atRiskRevenue,
      atRiskPercent,
      monthlyRate,
    };
  }, [clientsQuery.data, defaultMonthlyRate]);

  if (clientsQuery.isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <DollarSign className="h-4 w-4 text-emerald-500" />
            Revenue Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (clientsQuery.error) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <DollarSign className="h-4 w-4 text-emerald-500" />
            Revenue Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Revenue data unavailable
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <DollarSign className="h-4 w-4 text-emerald-500" />
          Revenue Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-900">
              ${revenue.totalMonthlyRevenue.toLocaleString()}
            </span>
            <span className="text-sm text-slate-500">/mo</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md bg-slate-50 p-2">
              <span className="text-slate-500">Active clients</span>
              <p className="font-semibold text-slate-800">
                {revenue.activeClients}
              </p>
            </div>
            <div className="rounded-md bg-slate-50 p-2">
              <span className="text-slate-500">Rate/client</span>
              <p className="font-semibold text-slate-800">
                ${revenue.monthlyRate}/mo
              </p>
            </div>
          </div>

          {revenue.atRiskRevenue > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2 rounded-md bg-red-50 border border-red-200 p-2.5 cursor-help">
                    <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                    <div className="text-xs">
                      <span className="font-medium text-red-700">
                        Revenue at Risk: ${revenue.atRiskRevenue.toLocaleString()}/mo
                      </span>
                      <span className="text-red-500 ml-1">
                        ({revenue.atRiskPercent}% of total)
                      </span>
                    </div>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[250px]">
                  <p className="text-xs">
                    Revenue from {revenue.atRiskClients} client
                    {revenue.atRiskClients !== 1 ? "s" : ""} classified as "At
                    Risk" or "Critical". Consider proactive engagement to
                    reduce churn risk.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {revenue.atRiskRevenue === 0 && revenue.totalMonthlyRevenue > 0 && (
            <div className="flex items-center gap-2 rounded-md bg-emerald-50 border border-emerald-200 p-2.5">
              <TrendingUp className="h-4 w-4 text-emerald-500 shrink-0" />
              <span className="text-xs font-medium text-emerald-700">
                No revenue at risk — all active clients healthy
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
