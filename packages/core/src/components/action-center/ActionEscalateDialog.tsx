import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@complianceos/ui/ui/dialog";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { AlertTriangle, ShieldAlert, Shield, Building2, User, Loader2, ArrowUpRight } from "lucide-react";
import { toast } from "sonner";

interface ActionEscalateDialogProps {
  action: any | null;
  clientId: number;
  clientInfo?: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ActionEscalateDialog({
  action,
  clientId,
  clientInfo,
  open,
  onOpenChange,
  onSuccess,
}: ActionEscalateDialogProps) {
  const [selectedTier, setSelectedTier] = useState<number>(2);
  const [targetRole, setTargetRole] = useState<string>("Compliance Manager / DPO");
  const [targetName, setTargetName] = useState<string>("");
  const [escalationReason, setEscalationReason] = useState<string>("");
  const [elevateToCritical, setElevateToCritical] = useState<boolean>(false);

  const cisoName = clientInfo?.cisoName || "Chief Information Security Officer";
  const dpoName = clientInfo?.dpoName || "Data Protection Officer";
  const adminName = clientInfo?.primaryContactName || "Compliance Administrator";

  // Auto-select recommended tier when action changes
  useEffect(() => {
    if (!action) return;
    const isCrit = action.priority === "critical";
    if (isCrit) {
      setSelectedTier(3);
      setTargetRole("Chief Information Security Officer (CISO)");
      setTargetName(cisoName);
      setElevateToCritical(true);
    } else {
      setSelectedTier(2);
      setTargetRole("Compliance Manager / DPO");
      setTargetName(dpoName);
      setElevateToCritical(false);
    }
    setEscalationReason("");
  }, [action, cisoName, dpoName]);

  const escalateMutation = trpc.sentinel.escalateAction.useMutation({
    onSuccess: () => {
      toast.success("Action escalated successfully", {
        description: `Elevated to Tier ${selectedTier} (${targetRole}: ${targetName}) for immediate oversight.`,
      });
      onSuccess();
      onOpenChange(false);
    },
    onError: (err) => {
      toast.error("Failed to escalate action", { description: err.message });
    },
  });

  const handleSelectTier = (tier: number, role: string, defaultName: string) => {
    setSelectedTier(tier);
    setTargetRole(role);
    setTargetName(defaultName);
  };

  const handleSubmit = () => {
    if (!action || !escalationReason.trim()) {
      toast.error("Please provide a reason for escalation");
      return;
    }
    escalateMutation.mutate({
      clientId,
      actionId: action.id,
      targetTier: selectedTier,
      targetRole,
      targetName: targetName || targetRole,
      reason: escalationReason.trim(),
      priority: elevateToCritical ? "critical" : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-6 shadow-xl">
        <DialogHeader className="space-y-1.5 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4.5 h-4.5" />
            </div>
            Escalate Finding Oversight
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-600 dark:text-slate-400">
            Escalate this finding through the standardized 4-tier hierarchy (NIST SP 800-61 / ITIL 4) to bypass operational blockers and mandate executive resolution.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Action Context Box */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">Target Finding:</span>
              <Badge
                className={`text-[10px] uppercase font-bold px-2 py-0.5 ${
                  action?.priority === "critical"
                    ? "bg-red-600 text-white"
                    : action?.priority === "high"
                    ? "bg-amber-500 text-white"
                    : "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200"
                }`}
              >
                {action?.priority || "MEDIUM"}
              </Badge>
            </div>
            <p className="text-slate-900 dark:text-white font-semibold text-xs leading-snug line-clamp-2">
              {action?.title}
            </p>
          </div>

          {/* Tier Matrix Selection */}
          <div className="space-y-2">
            <label className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center justify-between">
              <span>Select Escalation Tier & Recipient:</span>
              <span className="text-[11px] font-normal text-slate-500">Based on Incident Response Matrix</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Tier 1 */}
              <div
                onClick={() => handleSelectTier(1, "Operational Lead / Control Owner", adminName)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                  selectedTier === 1
                    ? "border-blue-500 bg-blue-50/70 dark:bg-blue-950/40 ring-2 ring-blue-500/20"
                    : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-slate-900 dark:text-white">Tier 1: Operational</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">Functional</Badge>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Control Owner / Admin</p>
                <p className="text-[10px] text-slate-500 mt-1 truncate">Recipient: {adminName}</p>
              </div>

              {/* Tier 2 */}
              <div
                onClick={() => handleSelectTier(2, "Compliance Manager / DPO", dpoName)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                  selectedTier === 2
                    ? "border-amber-500 bg-amber-50/70 dark:bg-amber-950/40 ring-2 ring-amber-500/20"
                    : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-slate-900 dark:text-white">Tier 2: Tactical</span>
                  <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0">Recommended</Badge>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">DPO / Compliance Lead</p>
                <p className="text-[10px] text-slate-500 mt-1 truncate">Recipient: {dpoName}</p>
              </div>

              {/* Tier 3 */}
              <div
                onClick={() => handleSelectTier(3, "Chief Information Security Officer (CISO)", cisoName)}
                className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                  selectedTier === 3
                    ? "border-rose-500 bg-rose-50/70 dark:bg-rose-950/40 ring-2 ring-rose-500/20"
                    : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-slate-900 dark:text-white">Tier 3: Strategic</span>
                  <Badge className="bg-rose-600 text-white text-[10px] px-1.5 py-0">Executive</Badge>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">CISO / VP of Security</p>
                <p className="text-[10px] text-slate-500 mt-1 truncate">Recipient: {cisoName}</p>
              </div>

              {/* Tier 4 */}
              <div
                onClick={() => handleSelectTier(4, "Governance Committee / Board", "Board Audit & Risk Committee")}
                className={`p-3 rounded-2xl border transition-all cursor-pointer ${
                  selectedTier === 4
                    ? "border-purple-500 bg-purple-50/70 dark:bg-purple-950/40 ring-2 ring-purple-500/20"
                    : "border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs text-slate-900 dark:text-white">Tier 4: Governance</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">Board</Badge>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">Audit & Risk Committee</p>
                <p className="text-[10px] text-slate-500 mt-1 truncate">Systemic / Catastrophic</p>
              </div>
            </div>
          </div>

          {/* Reason for Escalation */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-900 dark:text-slate-100 text-xs block">
              Escalation Justification & Urgency <span className="text-rose-500">*</span>:
            </label>
            <Textarea
              value={escalationReason}
              onChange={(e) => setEscalationReason(e.target.value)}
              placeholder="State why this finding cannot be resolved at the current operational level (e.g. SLA breach imminent, cross-departmental friction, budget needed, risk appetite exceeded)..."
              className="text-xs min-h-[90px] rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 font-normal leading-relaxed"
            />
          </div>

          {/* Elevate Priority Checkbox */}
          <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={elevateToCritical}
              onChange={(e) => setElevateToCritical(e.target.checked)}
              className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 h-4 w-4"
            />
            <div className="text-xs">
              <span className="font-bold text-slate-900 dark:text-white block">Elevate Priority to Critical</span>
              <span className="text-slate-500 text-[11px]">Triggers high-priority alerts and tightens SLA response window to 4–8 hours.</span>
            </div>
          </label>
        </div>

        <DialogFooter className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl h-9 px-4 text-xs font-bold"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={escalateMutation.isPending || !escalationReason.trim()}
            className="bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs px-4 py-2 flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            {escalateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
            Confirm Escalation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
