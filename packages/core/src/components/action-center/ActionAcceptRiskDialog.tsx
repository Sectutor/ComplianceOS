import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@complianceos/ui/ui/dialog";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { ShieldAlert, ShieldCheck, Loader2, Calendar, FileText } from "lucide-react";
import { toast } from "sonner";

interface ActionAcceptRiskDialogProps {
  action: any | null;
  clientId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ActionAcceptRiskDialog({
  action,
  clientId,
  open,
  onOpenChange,
  onSuccess,
}: ActionAcceptRiskDialogProps) {
  const [expiryDays, setExpiryDays] = useState<number>(90);
  const [rationale, setRationale] = useState<string>("");
  const [compensatingControls, setCompensatingControls] = useState<string>("");

  const acceptRiskMutation = trpc.sentinel.acceptRiskAction.useMutation({
    onSuccess: (res) => {
      toast.success("Risk formally accepted", {
        description: `Logged in audit trail. Re-evaluation scheduled for ${new Date(res.acceptedUntil).toLocaleDateString()}.`,
      });
      onSuccess();
      onOpenChange(false);
      setRationale("");
      setCompensatingControls("");
    },
    onError: (err) => {
      toast.error("Failed to accept risk", { description: err.message });
    },
  });

  const handleSubmit = () => {
    if (!action || !rationale.trim()) {
      toast.error("Please provide a business justification for risk acceptance");
      return;
    }
    acceptRiskMutation.mutate({
      clientId,
      actionId: action.id,
      rationale: rationale.trim(),
      compensatingControls: compensatingControls.trim(),
      expiryDays,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-6 shadow-xl">
        <DialogHeader className="space-y-1.5 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4.5 h-4.5" />
            </div>
            Formal Risk Acceptance Sign-off
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-600 dark:text-slate-400">
            Compliant with ISO 27005 Clause 12 and NIST CSF. Formal risk acceptance documents the business justification, compensating controls, and sunset date for audit defensibility.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Target Finding */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <span className="font-bold text-slate-700 dark:text-slate-300 text-xs block mb-1">Target Finding:</span>
            <p className="text-slate-900 dark:text-white font-semibold text-xs leading-snug line-clamp-2">
              {action?.title}
            </p>
          </div>

          {/* Sunset / Expiration Period */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-900 dark:text-slate-100 text-xs flex items-center justify-between">
              <span>Risk Acceptance Validity Period:</span>
              <span className="text-[11px] font-normal text-slate-500">Auto-expires for re-evaluation</span>
            </label>
            <Select value={String(expiryDays)} onValueChange={(v) => setExpiryDays(Number(v))}>
              <SelectTrigger className="text-xs h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <SelectItem value="30">30 Days (Temporary Exception)</SelectItem>
                <SelectItem value="60">60 Days (Short-term Waiver)</SelectItem>
                <SelectItem value="90">90 Days (Quarterly Audit Cycle — Recommended)</SelectItem>
                <SelectItem value="180">180 Days (Semi-annual Waiver)</SelectItem>
                <SelectItem value="365">1 Year (Annual Executive Acceptance)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Business Justification */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-900 dark:text-slate-100 text-xs block">
              Business Justification <span className="text-rose-500">*</span>:
            </label>
            <Textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="Explain the technical, commercial, or operational reason why immediate remediation is deferred (e.g. legacy system dependency, scheduled Q3 migration, disproportionate remediation cost)..."
              className="text-xs min-h-[85px] rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 font-normal leading-relaxed"
            />
          </div>

          {/* Compensating Controls */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-900 dark:text-slate-100 text-xs block">
              Compensating Controls (Mitigating Safeguards):
            </label>
            <Textarea
              value={compensatingControls}
              onChange={(e) => setCompensatingControls(e.target.value)}
              placeholder="Describe any secondary security controls in place to reduce likelihood or impact (e.g. enhanced network segmentation, dedicated WAF rules, weekly manual log review)..."
              className="text-xs min-h-[75px] rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 font-normal leading-relaxed"
            />
          </div>

          <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 text-[11px] text-blue-800 dark:text-blue-300 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Accepting this risk will remove it from the active inbox and stage it under the <strong>Risk Accepted</strong> register. The audit log preserves the timestamp and approver credentials for SOC 2 / ISO 27001 auditor review.
            </span>
          </div>
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
            disabled={acceptRiskMutation.isPending || !rationale.trim()}
            className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 font-bold rounded-xl text-xs px-4 py-2 flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            {acceptRiskMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
            Confirm Risk Acceptance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
