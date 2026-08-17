import React from "react";
import { Building2, Shield, Users, ArrowUpRight, CheckCircle2, AlertTriangle, Layers, Plus } from "lucide-react";
import { Button } from "@complianceos/ui/ui/button";
import { trpc } from "@/lib/trpc";

export default function MsspPartnerPortal() {
  const { data: rollup, isLoading } = trpc.mssp.getPortfolioRollup.useQuery(
    { partnerId: 1 },
    { refetchOnWindowFocus: false }
  );

  if (isLoading) {
    return (
      <div className="p-8 space-y-4 animate-pulse">
        <div className="h-8 bg-muted rounded w-1/4" />
        <div className="grid grid-cols-4 gap-4">
          <div className="h-28 bg-muted rounded-xl" />
          <div className="h-28 bg-muted rounded-xl" />
          <div className="h-28 bg-muted rounded-xl" />
          <div className="h-28 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full text-foreground">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Building2 className="w-3.5 h-3.5" /> MSSP Partner & Multi-Tenant Governance Portal
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Client Portfolio Governance
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Aggregated compliance health scores, risk rollups, and centralized multi-tenant client management.
          </p>
        </div>

        <Button variant="default">
          <Plus className="w-4 h-4" /> Add Client Sub-Organization
        </Button>
      </div>

      {/* Portfolio Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Managed Clients</span>
            <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="text-3xl font-bold text-foreground">{rollup?.totalClients || 0}</div>
          <div className="text-xs text-muted-foreground">Active Sub-Organizations</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Average Pass Rate</span>
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-emerald-400">{rollup?.averagePassRate || 100}%</div>
          <div className="text-xs text-muted-foreground">Portfolio Compliance Average</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Controls Assessed</span>
            <Layers className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-3xl font-bold text-sky-400">{rollup?.totalControlsAssessed || 0}</div>
          <div className="text-xs text-muted-foreground">Total Active Control Assessments</div>
        </div>

        <div className="p-5 rounded-2xl bg-card border border-border shadow-sm space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Status</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400">ALL SYSTEMS HEALTHY</div>
          <div className="text-xs text-muted-foreground">Real-time Continuous Audit Engine</div>
        </div>
      </div>

      {/* Managed Client Table */}
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Managed Client Accounts
          </h2>
          <span className="text-xs text-muted-foreground">Showing {rollup?.clientSummaries?.length || 0} Clients</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-foreground">
            <thead className="bg-muted/60 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
              <tr>
                <th className="py-3 px-4">Client Name</th>
                <th className="py-3 px-4">Pass Rate</th>
                <th className="py-3 px-4">Implemented Controls</th>
                <th className="py-3 px-4">Open Risks</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rollup?.clientSummaries?.map((client) => (
                <tr key={client.clientId} className="hover:bg-muted/50 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-foreground flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                      {client.clientName.substring(0, 2).toUpperCase()}
                    </div>
                    {client.clientName}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" /> {client.passRate}%
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-foreground">
                    {client.implementedControls} / {client.totalControls}
                  </td>
                  <td className="py-3.5 px-4">
                    {client.openRisksCount > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" /> {client.openRisksCount} Open
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">0 Open Risks</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <a
                      href={`/clients/${client.clientId}/dashboard`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                    >
                      Open Dashboard <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
