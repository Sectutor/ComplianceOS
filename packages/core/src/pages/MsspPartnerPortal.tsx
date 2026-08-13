import React from "react";
import { Building2, Shield, Users, ArrowUpRight, CheckCircle2, AlertTriangle, Layers, Plus } from "lucide-react";
import { trpc } from "../utils/trpc";

export default function MsspPartnerPortal() {
  const { data: rollup, isLoading } = trpc.mssp.getPortfolioRollup.useQuery(
    { partnerId: 1 },
    { refetchOnWindowFocus: false }
  );

  if (isLoading) {
    return (
      <div className="p-8 space-y-4 animate-pulse">
        <div className="h-8 bg-slate-800 rounded w-1/4" />
        <div className="grid grid-cols-4 gap-4">
          <div className="h-28 bg-slate-800 rounded-xl" />
          <div className="h-28 bg-slate-800 rounded-xl" />
          <div className="h-28 bg-slate-800 rounded-xl" />
          <div className="h-28 bg-slate-800 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full text-slate-100">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Building2 className="w-3.5 h-3.5" /> MSSP Partner & Multi-Tenant Governance Portal
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Client Portfolio Governance
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Aggregated compliance health scores, risk rollups, and centralized multi-tenant client management.
          </p>
        </div>

        <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/20">
          <Plus className="w-4 h-4" /> Add Client Sub-Organization
        </button>
      </div>

      {/* Portfolio Top Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Managed Clients</span>
            <Users className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-bold text-white">{rollup?.totalClients || 0}</div>
          <div className="text-xs text-slate-500">Active Sub-Organizations</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Average Pass Rate</span>
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-emerald-400">{rollup?.averagePassRate || 100}%</div>
          <div className="text-xs text-slate-500">Portfolio Compliance Average</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Controls Assessed</span>
            <Layers className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-3xl font-bold text-sky-400">{rollup?.totalControlsAssessed || 0}</div>
          <div className="text-xs text-slate-500">Total Active Control Assessments</div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Status</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400">ALL SYSTEMS HEALTHY</div>
          <div className="text-xs text-slate-500">Real-time Continuous Audit Engine</div>
        </div>
      </div>

      {/* Managed Client Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400" /> Managed Client Accounts
          </h2>
          <span className="text-xs text-slate-400">Showing {rollup?.clientSummaries?.length || 0} Clients</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-800/60 text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Client Name</th>
                <th className="py-3 px-4">Pass Rate</th>
                <th className="py-3 px-4">Implemented Controls</th>
                <th className="py-3 px-4">Open Risks</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {rollup?.clientSummaries?.map((client) => (
                <tr key={client.clientId} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-white flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold">
                      {client.clientName.substring(0, 2).toUpperCase()}
                    </div>
                    {client.clientName}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-400">
                      <CheckCircle2 className="w-4 h-4" /> {client.passRate}%
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300">
                    {client.implementedControls} / {client.totalControls}
                  </td>
                  <td className="py-3.5 px-4">
                    {client.openRisksCount > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" /> {client.openRisksCount} Open
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">0 Open Risks</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <a
                      href={`/clients/${client.clientId}/dashboard`}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
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
