import React, { useState } from "react";
import { trpc } from "../lib/trpc";
import { Calendar, Clock, AlertTriangle, CheckCircle2, FileText, Filter, ShieldAlert } from "lucide-react";

export interface TimelineItem {
  id: number;
  description: string;
  framework: string;
  expirationDate: string;
  status: "verified" | "expired" | "pending";
  daysUntilExpiry: number;
  urgency: "critical" | "warning" | "good" | "expired";
}

export default function ComplianceTimelineView({ clientId = 1 }: { clientId?: number }) {
  const [filterUrgency, setFilterUrgency] = useState<string>("all");

  const { data: evidenceItems, isLoading } = trpc.evidence.list.useQuery({ clientId });

  const now = Date.now();

  const timelineItems: TimelineItem[] = (evidenceItems || []).map((ev: any) => {
    const expDate = ev.expirationDate ? new Date(ev.expirationDate).getTime() : now + 180 * 86400000;
    const daysUntil = Math.round((expDate - now) / 86400000);

    let urgency: TimelineItem["urgency"] = "good";
    if (ev.status === "expired" || daysUntil < 0) {
      urgency = "expired";
    } else if (daysUntil <= 14) {
      urgency = "critical";
    } else if (daysUntil <= 30) {
      urgency = "warning";
    }

    return {
      id: ev.id,
      description: ev.description || `Evidence #${ev.id}`,
      framework: ev.framework || "ISO 27001",
      expirationDate: ev.expirationDate
        ? new Date(ev.expirationDate).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
        : "No expiration set",
      status: ev.status || "pending",
      daysUntilExpiry: daysUntil,
      urgency,
    };
  });

  // Sort by earliest expiration
  timelineItems.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

  const filteredItems = timelineItems.filter((item) => {
    if (filterUrgency === "all") return true;
    return item.urgency === filterUrgency;
  });

  const getUrgencyBadge = (urgency: TimelineItem["urgency"], days: number) => {
    switch (urgency) {
      case "expired":
        return <span className="inline-flex items-center space-x-1 text-xs px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 font-medium"><ShieldAlert className="w-3.5 h-3.5" /><span>Expired ({Math.abs(days)}d ago)</span></span>;
      case "critical":
        return <span className="inline-flex items-center space-x-1 text-xs px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-medium"><AlertTriangle className="w-3.5 h-3.5" /><span>Critical ({days}d left)</span></span>;
      case "warning":
        return <span className="inline-flex items-center space-x-1 text-xs px-2.5 py-1 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 font-medium"><Clock className="w-3.5 h-3.5" /><span>Expires in {days}d</span></span>;
      default:
        return <span className="inline-flex items-center space-x-1 text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium"><CheckCircle2 className="w-3.5 h-3.5" /><span>Valid ({days}d remaining)</span></span>;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-100 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Compliance Expiry Timeline</h3>
            <p className="text-xs text-slate-400">Visual chronological forecast of evidence expirations and renewal milestones</p>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center space-x-2 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800 text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400 ml-2" />
          <button
            onClick={() => setFilterUrgency("all")}
            className={`px-3 py-1 rounded-lg transition font-medium ${filterUrgency === "all" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
          >
            All ({timelineItems.length})
          </button>
          <button
            onClick={() => setFilterUrgency("critical")}
            className={`px-3 py-1 rounded-lg transition font-medium ${filterUrgency === "critical" ? "bg-amber-600 text-white" : "text-slate-400 hover:text-amber-300"}`}
          >
            Critical
          </button>
          <button
            onClick={() => setFilterUrgency("expired")}
            className={`px-3 py-1 rounded-lg transition font-medium ${filterUrgency === "expired" ? "bg-rose-600 text-white" : "text-slate-400 hover:text-rose-300"}`}
          >
            Expired
          </button>
        </div>
      </div>

      {/* Timeline Stream */}
      {isLoading ? (
        <div className="py-12 text-center text-slate-400 text-sm animate-pulse">Loading compliance timeline forecast...</div>
      ) : filteredItems.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-sm bg-slate-950/40 rounded-xl border border-slate-800">
          No evidence items matching current timeline filters.
        </div>
      ) : (
        <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
          {filteredItems.map((item) => (
            <div key={item.id} className="relative flex items-start space-x-4 group">
              {/* Dot Node */}
              <div
                className={`absolute -left-6 top-1.5 w-3 h-3 rounded-full border-2 bg-slate-900 ${
                  item.urgency === "expired"
                    ? "border-rose-500 bg-rose-500"
                    : item.urgency === "critical"
                    ? "border-amber-500 bg-amber-500"
                    : item.urgency === "warning"
                    ? "border-yellow-500 bg-yellow-500"
                    : "border-emerald-500 bg-emerald-500"
                }`}
              />

              {/* Card */}
              <div className="flex-1 bg-slate-800/40 border border-slate-800 hover:border-slate-700/80 p-4 rounded-xl transition flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="flex items-start space-x-3">
                  <FileText className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-medium text-sm text-white">{item.description}</h4>
                    <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
                      <span className="px-2 py-0.5 bg-slate-800 rounded border border-slate-700 text-slate-300">{item.framework}</span>
                      <span>Expires: {item.expirationDate}</span>
                    </div>
                  </div>
                </div>

                <div className="shrink-0">{getUrgencyBadge(item.urgency, item.daysUntilExpiry)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
