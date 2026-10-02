import React from "react";
import { trpc } from "@/lib/trpc";
import { Badge } from "@complianceos/ui/ui/badge";
import { Loader2, Clock, CheckCircle2, AlertTriangle, UserCheck, ArrowUpRight, ShieldCheck, XCircle, Bot, User, History } from "lucide-react";

interface ActionAuditHistoryTimelineProps {
  actionId: number;
  clientId: number;
  initialCreatedAt?: string | null;
}

export function ActionAuditHistoryTimeline({ actionId, clientId, initialCreatedAt }: ActionAuditHistoryTimelineProps) {
  const { data: history, isLoading } = trpc.sentinel.getActionHistory.useQuery(
    { clientId, actionId },
    { enabled: !!actionId && !!clientId }
  );

  if (isLoading) {
    return (
      <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
        <span className="text-xs">Loading audit trail...</span>
      </div>
    );
  }

  const getEventBadge = (actionType: string) => {
    switch (actionType) {
      case "delegated_human":
        return { label: "Delegated to Human", icon: UserCheck, color: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300" };
      case "delegated_agent":
        return { label: "Delegated to AI Agent", icon: Bot, color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300" };
      case "escalated":
        return { label: "Escalated", icon: ArrowUpRight, color: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300" };
      case "risk_accepted":
        return { label: "Risk Accepted", icon: ShieldCheck, color: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200" };
      case "approved_fix":
      case "approved_task":
      case "approved":
        return { label: "Approved & Resolved", icon: CheckCircle2, color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" };
      case "compliance_signoff":
        return { label: "Compliance Sign-Off", icon: ShieldCheck, color: "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300" };
      case "rejected":
        return { label: "Dismissed / Rejected", icon: XCircle, color: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300" };
      case "promoted_to_incident":
        return { label: "Promoted to Incident", icon: AlertTriangle, color: "bg-rose-600 text-white" };
      default:
        return { label: actionType.replace(/_/g, " "), icon: History, color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" };
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-900 dark:text-white">
          <History className="w-4 h-4 text-blue-600" />
          <span>Non-Repudiable Audit Trail (SOC 2 CC7.3 / ISO 27001 A.5.28)</span>
        </div>
        <span className="text-[11px] text-slate-500">{history?.length || 1} recorded event(s)</span>
      </div>

      <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
        {/* Initial Detection Anchor */}
        <div className="relative group">
          <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-emerald-500 ring-4 ring-white dark:ring-slate-900" />
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Bot className="w-3.5 h-3.5 text-emerald-600" />
                Autonomous Patrol Detection
              </span>
              <span className="text-[10px] text-slate-500">
                {initialCreatedAt ? new Date(initialCreatedAt).toLocaleString() : "Initial Scan"}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              Identified by Sentinel audit engine during routine compliance checks.
            </p>
          </div>
        </div>

        {/* Timeline Events */}
        {history && history.map((item: any) => {
          const badge = getEventBadge(item.actionType);
          const BadgeIcon = badge.icon;
          return (
            <div key={item.id} className="relative group">
              <div className="absolute -left-6 top-1 w-3.5 h-3.5 rounded-full bg-blue-500 ring-4 ring-white dark:ring-slate-900" />
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
                <div className="flex items-center justify-between gap-2 mb-1 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${badge.color}`}>
                      <BadgeIcon className="w-3 h-3" />
                      {badge.label}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">
                      by {item.actorName || (item.actorType === 'agent' ? 'Autonomous Agent' : 'Authorized User')}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {item.createdAt ? new Date(item.createdAt).toLocaleString() : ""}
                  </span>
                </div>

                {item.notes && (
                  <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium mt-1.5 bg-white dark:bg-slate-900/80 p-2 rounded-lg border border-slate-200/80 dark:border-slate-700/60">
                    {item.notes}
                  </p>
                )}

                {item.previousStatus && item.newStatus && item.previousStatus !== item.newStatus && (
                  <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1.5">
                    <span>Status changed:</span>
                    <span className="font-mono uppercase px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {item.previousStatus}
                    </span>
                    <span>→</span>
                    <span className="font-mono uppercase px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {item.newStatus}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
