import React from "react";
import { EnhancedDialog } from "@complianceos/ui/ui/enhanced-dialog";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Separator } from "@complianceos/ui/ui/separator";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  ClipboardPlus,
  Loader2,
} from "lucide-react";

export interface AutoTestFinding {
  check: string;
  status: "pass" | "warning" | "fail";
  detail: string;
}

export interface AutoTestRun {
  id: number;
  clientControlId: number;
  controlCode?: string | null;
  status: string;
  score?: number | null;
  message?: string | null;
  findings?: AutoTestFinding[] | null;
  executedAt?: string | Date | null;
}

/** Flat shape accepted by ControlDetailsSheet on the Controls page */
export interface FlatControlRef {
  id: number;
  controlId: string;
  name: string;
  description: string | null;
  framework: string;
  owner: string | null;
  status: string | null;
  evidenceType: string | null;
}

interface AutoTestResultDialogProps {
  run: AutoTestRun | null;
  clientId: number | undefined;
  onOpenChange: (open: boolean) => void;
  onViewControl: (control: FlatControlRef) => void;
  onOpenTasks: () => void;
}

const findingIcon = (status: AutoTestFinding["status"]) => {
  if (status === "pass") return <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />;
  if (status === "warning") return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
  return <XCircle className="h-4 w-4 text-destructive shrink-0" />;
};

/**
 * Drill-in for a single Control Auto-Test run: shows why the control
 * failed (per-check findings), and lets the user jump to the control
 * to fix it or create a remediation task in the client's task board.
 */
export function AutoTestResultDialog({
  run,
  clientId,
  onOpenChange,
  onViewControl,
  onOpenTasks,
}: AutoTestResultDialogProps) {
  const open = !!run;

  // Fetch the client control (with master control data) only while the dialog is open
  const controlQuery = trpc.clientControls.get.useQuery(
    { id: run?.clientControlId ?? 0 },
    { enabled: open && !!run, retry: false }
  );

  const createTaskMutation = trpc.actions.create.useMutation({
    onSuccess: () => {
      toast.success("Task created", {
        description: "Added to the client task board.",
        action: { label: "View tasks", onClick: onOpenTasks },
      });
      onOpenChange(false);
    },
    onError: (error: any) => toast.error(`Failed to create task: ${error?.message ?? "unknown error"}`),
  });

  if (!run) return null;

  const findings = Array.isArray(run.findings) ? run.findings : [];
  const failedChecks = findings.filter((f) => f.status !== "pass");

  const handleViewControl = () => {
    const data: any = controlQuery.data;
    const cc = data?.clientControl;
    const master = data?.control;
    if (!cc || !master) {
      toast.error("Control details are not available yet — try again in a moment.");
      return;
    }
    onViewControl({
      id: master.id,
      controlId: master.controlId ?? run.controlCode ?? String(run.clientControlId),
      name: master.name ?? "Control",
      description: master.description ?? null,
      framework: master.framework ?? "",
      owner: cc.owner || master.owner || null,
      status: cc.status ?? null,
      evidenceType: master.evidenceType ?? null,
    });
    onOpenChange(false);
  };

  const handleCreateTask = () => {
    if (!clientId) return;
    createTaskMutation.mutate({
      clientId,
      title: `Remediate control ${run.controlCode ?? `#${run.clientControlId}`} (auto-test ${run.status})`,
      description: [
        run.message,
        "",
        ...failedChecks.map((f) => `${f.status.toUpperCase()} — ${f.check}: ${f.detail}`),
        "",
        `Auto-test score: ${run.score ?? "n/a"}/100 · Executed: ${
          run.executedAt ? new Date(String(run.executedAt)).toLocaleString() : "-"
        }`,
        "Created from Control Auto-Tests (Controls page).",
      ].join("\n"),
      priority: run.status === "fail" ? "high" : "medium",
      relatedEntityType: "client_control",
      relatedEntityId: run.clientControlId,
    });
  };

  return (
    <EnhancedDialog
      open={open}
      onOpenChange={onOpenChange}
      title={
        <span className="flex items-center gap-2">
          <Badge
            variant={run.status === "pass" ? "success" : run.status === "fail" ? "destructive" : "warning"}
            className="capitalize"
          >
            {run.status}
          </Badge>
          {run.controlCode ?? `Control #${run.clientControlId}`}
        </span>
      }
      description={run.message ?? undefined}
      footer={
        <div className="flex flex-col sm:flex-row justify-end gap-2 w-full">
          <Button
            type="button"
            variant="outline"
            onClick={handleViewControl}
            disabled={controlQuery.isLoading || !controlQuery.data}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            {controlQuery.isLoading ? "Loading control..." : "View control"}
          </Button>
          <Button
            type="button"
            onClick={handleCreateTask}
            disabled={createTaskMutation.isPending || run.status === "pass"}
            title={run.status === "pass" ? "Passing controls don't need a remediation task" : undefined}
          >
            {createTaskMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ClipboardPlus className="h-4 w-4 mr-2" />
            )}
            Add to task board
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>
            Score: <span className="font-semibold text-foreground">{run.score ?? "n/a"}/100</span>
          </span>
          <span>
            Executed:{" "}
            {run.executedAt ? new Date(String(run.executedAt)).toLocaleString() : "-"}
          </span>
        </div>

        <Separator />

        <div className="space-y-2">
          <h4 className="text-sm font-semibold">Verification checks</h4>
          {findings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No check details recorded for this run.</p>
          ) : (
            <ul className="space-y-2">
              {findings.map((f, i) => (
                <li
                  key={`${f.check}-${i}`}
                  className="flex items-start gap-3 rounded-md border border-border bg-muted/40 px-3 py-2"
                >
                  {findingIcon(f.status)}
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{f.check}</div>
                    <div className="text-sm text-muted-foreground break-words">{f.detail}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {run.status !== "pass" && failedChecks.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Fix the failing checks on the control (assign an owner, mark it implemented, attach
            verified evidence), then re-run the auto-tests to confirm the control passes.
          </p>
        )}
      </div>
    </EnhancedDialog>
  );
}
