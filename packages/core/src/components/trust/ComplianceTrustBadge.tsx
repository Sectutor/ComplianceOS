import React, { useState } from "react";
import { ShieldCheck, CheckCircle2, Award, ExternalLink, Activity, Lock, X } from "lucide-react";
import { trpc } from "../../utils/trpc";

interface ComplianceTrustBadgeProps {
  clientId: number;
  theme?: "dark" | "light" | "glass";
  compact?: boolean;
}

export const ComplianceTrustBadge: React.FC<ComplianceTrustBadgeProps> = ({
  clientId,
  theme = "dark",
  compact = false,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { data: badge, isLoading } = trpc.trustBadge.getBadgeData.useQuery(
    { clientId },
    { refetchOnWindowFocus: false }
  );

  if (isLoading) {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/60 border border-slate-700 animate-pulse text-xs text-slate-400">
        <ShieldCheck className="w-4 h-4 text-indigo-400" />
        Verifying Compliance Badge...
      </div>
    );
  }

  if (!badge) return null;

  const themeClasses =
    theme === "glass"
      ? "bg-slate-900/80 backdrop-blur-md border-indigo-500/40 text-slate-100 shadow-lg shadow-indigo-500/10"
      : theme === "light"
      ? "bg-white border-slate-200 text-slate-900 shadow-md"
      : "bg-slate-900 border-slate-800 text-slate-100 shadow-xl";

  return (
    <>
      {/* Clickable Badge Component */}
      <button
        onClick={() => setIsModalOpen(true)}
        className={`inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full border text-xs font-medium transition-all hover:scale-105 ${themeClasses}`}
      >
        <div className="relative flex items-center justify-center">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
        </div>
        <span>{badge.clientName} Compliance</span>
        <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
          {badge.passRate}%
        </span>
      </button>

      {/* Verification Drawer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl text-slate-100 space-y-5">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                <Award className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-1.5">
                  {badge.clientName}
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 inline" />
                </h3>
                <p className="text-xs text-slate-400">Continuous Security & Compliance Verification</p>
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                <div className="text-2xl font-extrabold text-emerald-400">{badge.passRate}%</div>
                <div className="text-xs text-slate-400 mt-0.5">Control Pass Rate</div>
              </div>
              <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                <div className="text-2xl font-extrabold text-sky-400">{badge.verifiedEvidenceCount}</div>
                <div className="text-xs text-slate-400 mt-0.5">Verified Evidence Proofs</div>
              </div>
            </div>

            {/* Active Framework Badges */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Active Verified Frameworks
              </label>
              <div className="flex flex-wrap gap-2">
                {badge.activeFrameworks.map((fw, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-md bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-medium"
                  >
                    {fw}
                  </span>
                ))}
              </div>
            </div>

            {/* Verification Footer */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Verified by ComplianceOS Engine</span>
              </div>
              <span>{new Date(badge.verifiedAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
