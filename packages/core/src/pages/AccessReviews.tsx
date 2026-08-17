import React, { useState } from "react";
import { useParams } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Breadcrumb } from "@/components/Breadcrumb";
import { PageHeader } from "@complianceos/ui/ui/PageHeader";
import { StatCard } from "@complianceos/ui/ui/StatCard";
import { EmptyState } from "@complianceos/ui/ui/EmptyState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { Button } from "@complianceos/ui/ui/button";
import { Input } from "@complianceos/ui/ui/input";
import { Label } from "@complianceos/ui/ui/label";
import { Progress } from "@complianceos/ui/ui/progress";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { cn } from "@/lib/utils";
import { useClientContext } from "@/contexts/ClientContext";
import { toast } from "sonner";
import {
  UserCheck,
  ShieldCheck,
  ShieldX,
  AlertTriangle,
  Loader2,
  Plus,
  PlayCircle,
  History,
  KeyRound,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  User,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import {
  useAccessReviewSummary,
  useAccessReviewCycles,
  useAccessReviewTasks,
  useAccessReviewHistory,
  useCreateCycleMutation,
  useProvisionTasksMutation,
  useCertifyTaskMutation,
  useRevokeTaskMutation,
  useRunOverdueCheckMutation,
  type AccessReviewCycle,
  type AccessReviewTask,
} from "./accessReviewsApi";

/* ------------------------------------------------------------------ */
/* Status chips — translucent token tints (standard pill pattern)     */
/* ------------------------------------------------------------------ */

const TASK_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  overdue: {
    label: "Overdue",
    className: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
  },
  certified: {
    label: "Certified",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  revoked: {
    label: "Revoked",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  },
  completed: {
    label: "Completed",
    className: "bg-muted text-muted-foreground border-border",
  },
};

export function TaskStatusBadge({ status }: { status: string }) {
  const key = (status || "pending").toLowerCase();
  const config = TASK_STATUS_CONFIG[key] ?? TASK_STATUS_CONFIG.pending;
  return (
    <Badge variant="outline" className={cn("font-semibold border", config.className)}>
      {config.label}
    </Badge>
  );
}

function formatDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function isActionable(status?: string) {
  const key = (status || "").toLowerCase();
  return key === "pending" || key === "overdue";
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function AccessReviews() {
  const params = useParams<{ id: string }>();
  const { selectedClientId } = useClientContext();
  const urlClientId = params.id ? parseInt(params.id, 10) : 0;
  const clientId = urlClientId > 0 ? urlClientId : (selectedClientId ?? 0);

  const [expandedCycleId, setExpandedCycleId] = useState<number | null>(null);
  const [cycleName, setCycleName] = useState("");
  const [cycleDueDate, setCycleDueDate] = useState("");
  const [cycleDescription, setCycleDescription] = useState("");

  const summaryQuery = useAccessReviewSummary(clientId);
  const cyclesQuery = useAccessReviewCycles(clientId);
  const historyQuery = useAccessReviewHistory(clientId);
  const tasksQuery = useAccessReviewTasks(expandedCycleId ?? 0, undefined, expandedCycleId !== null);

  const createCycle = useCreateCycleMutation();
  const provision = useProvisionTasksMutation();
  const certify = useCertifyTaskMutation();
  const revoke = useRevokeTaskMutation();
  const overdueCheck = useRunOverdueCheckMutation();

  const refreshAll = () => {
    summaryQuery.refetch();
    cyclesQuery.refetch();
    historyQuery.refetch();
    if (expandedCycleId !== null) tasksQuery.refetch();
  };

  const handleCreateCycle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cycleName.trim()) return;
    createCycle.mutate(
      {
        clientId,
        name: cycleName.trim(),
        dueDate: cycleDueDate ? new Date(cycleDueDate) : undefined,
        description: cycleDescription.trim() || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Review cycle created");
          setCycleName("");
          setCycleDueDate("");
          setCycleDescription("");
          cyclesQuery.refetch();
          summaryQuery.refetch();
        },
        onError: () => toast.error("Could not create the review cycle — accessReviews.createCycle is not live yet."),
      }
    );
  };

  const handleProvision = (cycle: AccessReviewCycle) => {
    provision.mutate(
      { clientId, cycleId: cycle.id },
      {
        onSuccess: () => {
          toast.success(`Tasks provisioned for "${cycle.name}"`);
          cyclesQuery.refetch();
          summaryQuery.refetch();
          if (expandedCycleId === cycle.id) tasksQuery.refetch();
        },
        onError: () => toast.error("Could not provision tasks — accessReviews.provision is not live yet."),
      }
    );
  };

  const handleCertify = (task: AccessReviewTask) => {
    const note = window.prompt(`Optional note for certifying ${task.userName ?? "this access"} (leave empty to skip):`);
    if (note === null) return;
    certify.mutate(
      { taskId: task.id, note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Access certified");
          tasksQuery.refetch();
          summaryQuery.refetch();
          historyQuery.refetch();
        },
        onError: () => toast.error("Could not certify — accessReviews.certify is not live yet."),
      }
    );
  };

  const handleRevoke = (task: AccessReviewTask) => {
    const note = window.prompt(`Optional note for revoking ${task.userName ?? "this access"} (leave empty to skip):`);
    if (note === null) return;
    revoke.mutate(
      { taskId: task.id, note: note.trim() || undefined },
      {
        onSuccess: () => {
          toast.success("Access revoked");
          tasksQuery.refetch();
          summaryQuery.refetch();
          historyQuery.refetch();
        },
        onError: () => toast.error("Could not revoke — accessReviews.revoke is not live yet."),
      }
    );
  };

  const handleOverdueCheck = () => {
    overdueCheck.mutate(
      { clientId },
      {
        onSuccess: (result) => {
          const count = result?.overdue ?? 0;
          toast.success(count > 0 ? `${count} task${count === 1 ? "" : "s"} marked overdue` : "No overdue tasks found");
          refreshAll();
        },
        onError: () => toast.error("Could not run the overdue check — accessReviews.runOverdueCheck is not live yet."),
      }
    );
  };

  const summary = summaryQuery.data;
  const cycles = cyclesQuery.data ?? [];
  const history = historyQuery.data ?? [];
  const expandedTasks = tasksQuery.data ?? [];

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full max-w-full">
        <Breadcrumb
          items={[
            { label: "Controls", href: `/clients/${clientId}/controls` },
            { label: "Access Reviews" },
          ]}
        />

        <PageHeader
          title="Access Reviews"
          subtitle="Certify or revoke user access with periodic review cycles (SOC 2 CC6.1 / ISO 27001 A.5.15)."
          actions={
            <Button variant="outline" size="sm" onClick={handleOverdueCheck} disabled={overdueCheck.isPending || clientId <= 0}>
              {overdueCheck.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Run Overdue Check
            </Button>
          }
        />

        {clientId <= 0 && (
          <EmptyState
            icon={UserCheck}
            title="Select a client to get started"
            description="Open a client workspace from the Clients page to manage its access review cycles."
          />
        )}

        {clientId > 0 && (
          <>
            {/* Summary stats */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {summaryQuery.isLoading ? (
                <>
                  <Skeleton className="h-[92px] w-full rounded-xl" />
                  <Skeleton className="h-[92px] w-full rounded-xl" />
                  <Skeleton className="h-[92px] w-full rounded-xl" />
                  <Skeleton className="h-[92px] w-full rounded-xl" />
                </>
              ) : summaryQuery.isError ? (
                <Card className="lg:col-span-4">
                  <CardContent className="p-0">
                    <EmptyState
                      icon={UserCheck}
                      title="Connect the accessReviews.getSummary API"
                      description="accessReviews.getSummary is not live yet. Summary counters will appear here automatically once the endpoint is wired up."
                    />
                  </CardContent>
                </Card>
              ) : (
                <>
                  <StatCard label="Pending" value={summary?.pending ?? "—"} icon={UserCheck} tone="blue" />
                  <StatCard label="Overdue" value={summary?.overdue ?? "—"} icon={AlertTriangle} tone="red" />
                  <StatCard label="Certified" value={summary?.certified ?? "—"} icon={ShieldCheck} tone="green" />
                  <StatCard label="Revoked" value={summary?.revoked ?? "—"} icon={ShieldX} tone="amber" />
                </>
              )}
            </div>

            {/* New review cycle form */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                  <Plus className="h-5 w-5 text-muted-foreground" />
                  New Review Cycle
                </CardTitle>
                <CardDescription>
                  Create a cycle and auto-provision certification tasks for active users.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateCycle} className="grid gap-4 md:grid-cols-[1fr_200px_1fr_auto] md:items-end">
                  <div className="space-y-2">
                    <Label htmlFor="cycle-name">Cycle name</Label>
                    <Input
                      id="cycle-name"
                      placeholder="e.g. Q3 2026 Access Review"
                      value={cycleName}
                      onChange={(e) => setCycleName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cycle-due">Due date</Label>
                    <Input
                      id="cycle-due"
                      type="date"
                      value={cycleDueDate}
                      onChange={(e) => setCycleDueDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cycle-desc">Description</Label>
                    <Input
                      id="cycle-desc"
                      placeholder="Optional context"
                      value={cycleDescription}
                      onChange={(e) => setCycleDescription(e.target.value)}
                    />
                  </div>
                  <Button type="submit" disabled={createCycle.isPending || !cycleName.trim()}>
                    {createCycle.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                    Create
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Cycles */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                  <KeyRound className="h-5 w-5 text-muted-foreground" />
                  Review Cycles
                </CardTitle>
                <CardDescription>
                  Each cycle tracks certification progress across the workspace.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {cyclesQuery.isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-28 w-full rounded-xl" />
                    <Skeleton className="h-28 w-full rounded-xl" />
                  </div>
                ) : cyclesQuery.isError ? (
                  <EmptyState
                    icon={KeyRound}
                    title="Connect the accessReviews.list API"
                    description="accessReviews.list is not live yet. Review cycles will appear here once the endpoint is wired up."
                  />
                ) : cycles.length === 0 ? (
                  <EmptyState
                    icon={KeyRound}
                    title="No review cycles yet"
                    description="Create your first cycle above to start tracking access certification."
                  />
                ) : (
                  <ul className="space-y-4">
                    {cycles.map((cycle) => {
                      const counts = cycle.taskCounts ?? {
                        total: 0,
                        pending: 0,
                        overdue: 0,
                        certified: 0,
                        revoked: 0,
                      };
                      const total = counts.total || 0;
                      const certifiedCount = counts.certified || 0;
                      const progressPct = total > 0 ? Math.round((certifiedCount / total) * 100) : 0;
                      const isExpanded = expandedCycleId === cycle.id;
                      return (
                        <li key={cycle.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                          <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                            <div className="min-w-0 space-y-1.5">
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-base font-semibold text-foreground tracking-tight">{cycle.name}</h3>
                                <TaskStatusBadge status={cycle.status ?? "active"} />
                              </div>
                              {cycle.description && (
                                <p className="text-sm text-muted-foreground">{cycle.description}</p>
                              )}
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                {formatDate(cycle.dueDate) && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5" /> Due {formatDate(cycle.dueDate)}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <User className="h-3.5 w-3.5" /> {total} task{total === 1 ? "" : "s"}
                                </span>
                                <span className="flex items-center gap-1">
                                  <CheckCircle2 className="h-3.5 w-3.5" /> {certifiedCount} certified
                                </span>
                                {counts.overdue > 0 && (
                                  <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                                    <AlertTriangle className="h-3.5 w-3.5" /> {counts.overdue} overdue
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleProvision(cycle)}
                                disabled={provision.isPending}
                              >
                                {provision.isPending ? (
                                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                                ) : (
                                  <PlayCircle className="h-4 w-4 mr-1.5" />
                                )}
                                Provision tasks
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setExpandedCycleId(isExpanded ? null : cycle.id)}>
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                Tasks
                              </Button>
                            </div>
                          </div>
                          {total > 0 && (
                            <div className="mt-3 flex items-center gap-3">
                              <Progress value={progressPct} className="h-1.5 flex-1" />
                              <span className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
                                {progressPct}% certified
                              </span>
                            </div>
                          )}
                          {isExpanded && (
                            <div className="mt-4 border-t border-border pt-4">
                              {tasksQuery.isLoading ? (
                                <div className="space-y-2">
                                  <Skeleton className="h-14 w-full rounded-xl" />
                                  <Skeleton className="h-14 w-full rounded-xl" />
                                </div>
                              ) : tasksQuery.isError ? (
                                <EmptyState
                                  icon={KeyRound}
                                  title="Connect the accessReviews.listTasks API"
                                  description="accessReviews.listTasks is not live yet. Task rows will appear here once the endpoint is wired up."
                                />
                              ) : expandedTasks.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                  No tasks yet — provision tasks for this cycle to generate certification assignments.
                                </p>
                              ) : (
                                <ul className="space-y-2.5">
                                  {expandedTasks.map((task) => (
                                    <li
                                      key={task.id}
                                      className="rounded-xl border border-border bg-card p-4 shadow-sm"
                                    >
                                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                        <div className="min-w-0 space-y-1">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <p className="text-sm font-semibold text-foreground">
                                              {task.userName ?? "Unassigned user"}
                                            </p>
                                            <TaskStatusBadge status={task.status} />
                                          </div>
                                          {task.roleName && (
                                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                              <User className="h-3 w-3" /> {task.roleName}
                                            </p>
                                          )}
                                          {task.note && (
                                            <p className="text-xs text-muted-foreground italic">“{task.note}”</p>
                                          )}
                                        </div>
                                        {isActionable(task.status) && (
                                          <div className="flex items-center gap-2 shrink-0">
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300"
                                              onClick={() => handleCertify(task)}
                                              disabled={certify.isPending}
                                            >
                                              <ShieldCheck className="h-4 w-4 mr-1.5" />
                                              Certify
                                            </Button>
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                              onClick={() => handleRevoke(task)}
                                              disabled={revoke.isPending}
                                            >
                                              <ShieldX className="h-4 w-4 mr-1.5" />
                                              Revoke
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* History */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                  <History className="h-5 w-5 text-muted-foreground" />
                  Review History
                </CardTitle>
                <CardDescription>Recently certified and revoked access decisions.</CardDescription>
              </CardHeader>
              <CardContent>
                {historyQuery.isLoading ? (
                  <Skeleton className="h-24 w-full rounded-xl" />
                ) : historyQuery.isError ? (
                  <EmptyState
                    icon={History}
                    title="Connect the accessReviews.listHistory API"
                    description="accessReviews.listHistory is not live yet. Decisions will appear here once the endpoint is wired up."
                  />
                ) : history.length === 0 ? (
                  <EmptyState
                    icon={History}
                    title="No decisions recorded yet"
                    description="Certify or revoke a task to start the access review audit trail."
                  />
                ) : (
                  <ul className="divide-y divide-border">
                    {history.map((item) => (
                      <li key={item.id} className="flex items-start justify-between gap-3 py-3">
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-sm font-semibold text-foreground">
                            {item.userName ?? "Unassigned user"}
                            {item.roleName && <span className="font-normal text-muted-foreground"> · {item.roleName}</span>}
                          </p>
                          {item.note && <p className="text-xs text-muted-foreground italic">“{item.note}”</p>}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {formatDate(item.reviewedAt) && (
                            <span className="text-xs text-muted-foreground">{formatDate(item.reviewedAt)}</span>
                          )}
                          <TaskStatusBadge status={item.action} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
