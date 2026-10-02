import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@complianceos/ui/ui/dialog";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Input } from "@complianceos/ui/ui/input";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";
import { CheckCircle2, FileText, ArrowRight, ShieldCheck, CheckCheck, Loader2, Sparkles, Layers, ListTodo } from "lucide-react";
import { toast } from "sonner";

interface ActionApproveDialogProps {
  action: any | null;
  clientId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (result: { resolutionName: string; destination: string; workItemId?: number | null }) => void;
}

export function ActionApproveDialog({
  action,
  clientId,
  open,
  onOpenChange,
  onSuccess,
}: ActionApproveDialogProps) {
  const meta = action?.metadata ? (typeof action.metadata === "string" ? JSON.parse(action.metadata || "{}") : action.metadata) : {};
  const hasConcretePatch = !!(meta.proposedFix || meta.suggestedAddition);

  const [resolutionMode, setResolutionMode] = useState<"direct_patch" | "create_task" | "compliance_signoff">("create_task");
  const [resolutionName, setResolutionName] = useState<string>("");
  const [dueInDays, setDueInDays] = useState<number>(14);
  const [customNotes, setCustomNotes] = useState<string>("");

  useEffect(() => {
    if (!action) return;
    const initialMode = hasConcretePatch ? "direct_patch" : "create_task";
    setResolutionMode(initialMode);

    // Auto-generate an intelligent remediation title
    if (hasConcretePatch && meta.clauseTitle) {
      setResolutionName(`Policy Addition: ${meta.clauseTitle}`);
    } else if (action.title) {
      setResolutionName(`[Remediation] ${action.title}`);
    } else {
      setResolutionName("Compliance Remediation Task");
    }

    setDueInDays(14);
    setCustomNotes("");
  }, [action, hasConcretePatch]);

  const reviewMutation = trpc.sentinel.reviewSentinelAction.useMutation({
    onSuccess: (res: any) => {
      onOpenChange(false);
      onSuccess({
        resolutionName: res?.resolutionName || resolutionName,
        destination: res?.destination || (resolutionMode === "direct_patch" ? "Updated Live Policy" : "Work Items Inbox"),
        workItemId: res?.workItemId,
      });
    },
    onError: (err) => {
      toast.error("Remediation execution failed", { description: err.message });
    },
  });

  const handleSubmit = () => {
    if (!action) return;
    if (!resolutionName.trim()) {
      toast.error("Please enter a name for this remediation record.");
      return;
    }

    reviewMutation.mutate({
      clientId,
      actionId: action.id,
      decision: "approved",
      resolutionName: resolutionName.trim(),
      resolutionMode,
      dueInDays,
      customNotes: customNotes.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white p-6 shadow-xl">
        <DialogHeader className="space-y-1.5 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Approve &amp; Apply Remediation
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Define what happens to this information upon approval, customize the resulting record name, and route it to your governance registry.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Finding Reference Box */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
              Target Finding:
            </span>
            <div className="font-semibold text-slate-900 dark:text-slate-100 text-xs sm:text-sm leading-snug">
              {action?.title}
            </div>
          </div>

          {/* Resolution Mode Selector */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-900 dark:text-slate-100 text-xs block">
              What should happen to this information?
            </label>
            <div className="grid grid-cols-1 gap-2">
              {hasConcretePatch && (
                <label
                  onClick={() => setResolutionMode("direct_patch")}
                  className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                    resolutionMode === "direct_patch"
                      ? "bg-emerald-50/70 border-emerald-500 ring-1 ring-emerald-500 dark:bg-emerald-950/40"
                      : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="resolutionMode"
                    checked={resolutionMode === "direct_patch"}
                    onChange={() => setResolutionMode("direct_patch")}
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-emerald-600" />
                      Apply Staged Patch Directly to Document
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Immediately appends the staged clause or update to the source document in the live database.
                    </p>
                  </div>
                </label>
              )}

              <label
                onClick={() => setResolutionMode("create_task")}
                className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                  resolutionMode === "create_task"
                    ? "bg-blue-50/70 border-blue-500 ring-1 ring-blue-500 dark:bg-blue-950/40"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="resolutionMode"
                  checked={resolutionMode === "create_task"}
                  onChange={() => setResolutionMode("create_task")}
                  className="mt-0.5 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <ListTodo className="w-3.5 h-3.5 text-blue-600" />
                    Create Tracked Governance Work Item
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Routes this finding into your organization's Work Items inbox as an actionable task with an SLA deadline.
                  </p>
                </div>
              </label>

              <label
                onClick={() => setResolutionMode("compliance_signoff")}
                className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                  resolutionMode === "compliance_signoff"
                    ? "bg-slate-100 border-slate-400 ring-1 ring-slate-400 dark:bg-slate-800"
                    : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300"
                }`}
              >
                <input
                  type="radio"
                  name="resolutionMode"
                  checked={resolutionMode === "compliance_signoff"}
                  onChange={() => setResolutionMode("compliance_signoff")}
                  className="mt-0.5 text-slate-600 focus:ring-slate-500"
                />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
                    Sign-Off as Addressed / Mitigated
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Closes the alert and permanently records your sign-off remarks in the compliance audit history.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Name / Title of the Resulting Remediation Record */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-900 dark:text-slate-100 text-xs block">
              Name this Remediation Record / Task:
            </label>
            <Input
              value={resolutionName}
              onChange={(e) => setResolutionName(e.target.value)}
              placeholder="e.g. [Remediation] Updated Supply Chain Review Policy"
              className="text-xs h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white font-medium"
            />
            <p className="text-[11px] text-slate-500 pt-0.5">
              This name will be saved in your Work Items register, policy history, and audit log.
            </p>
          </div>

          {/* SLA selection if creating work item */}
          {resolutionMode === "create_task" && (
            <div className="space-y-1.5">
              <label className="font-bold text-slate-900 dark:text-slate-100 text-xs block">
                Target Remediation SLA:
              </label>
              <Select value={String(dueInDays)} onValueChange={(val) => setDueInDays(parseInt(val, 10))}>
                <SelectTrigger className="text-xs h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 Days (Urgent)</SelectItem>
                  <SelectItem value="14">14 Days (Standard)</SelectItem>
                  <SelectItem value="30">30 Days (Extended)</SelectItem>
                  <SelectItem value="60">60 Days (Strategic)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Reviewer Sign-Off Notes / Implementation Instructions */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-900 dark:text-slate-100 text-xs block">
              Approval Justification / Reviewer Notes:
            </label>
            <Textarea
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              placeholder="Add sign-off rationale or specific instructions for external auditors..."
              className="text-xs min-h-[75px] rounded-xl"
            />
          </div>

          {/* Destination Routing Clarification Box */}
          <div className="p-3 rounded-2xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/60 space-y-1.5 text-[11px]">
            <div className="font-bold text-blue-950 dark:text-blue-200 flex items-center gap-1.5">
              <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
              Where will this information go?
            </div>
            <ul className="space-y-1 text-slate-600 dark:text-slate-400 pl-4 list-disc">
              <li>
                <strong>Destination:</strong> {resolutionMode === "direct_patch" ? "Saved to live Document & archived in Remediated view" : resolutionMode === "create_task" ? "Added to Work Items queue & tracked in Remediated view" : "Archived in Action Center Remediated view with sign-off signature"}
              </li>
              <li>
                <strong>Audit Trail:</strong> Permanently stamped with your user ID and timestamp in <code>autopilot_action_history</code>.
              </li>
              <li>
                <strong>Alert Deduplication:</strong> Sentinel bots will not re-flag this finding for 7 days.
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl h-9 px-4 text-xs font-semibold cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={reviewMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs h-9 px-4 flex items-center gap-1.5 shadow-xs cursor-pointer"
          >
            {reviewMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCheck className="w-3.5 h-3.5" />}
            Confirm &amp; Apply Remediation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
