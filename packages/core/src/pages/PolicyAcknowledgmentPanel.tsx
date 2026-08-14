import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { Button } from "@complianceos/ui/ui/button";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { EmptyState } from "@complianceos/ui/ui/EmptyState";
import { Label } from "@complianceos/ui/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@complianceos/ui/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@complianceos/ui/ui/dialog";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  User,
  Calendar,
  Handshake,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  usePolicyAcks,
  useAcknowledgePolicy,
  useAssignPolicy,
  useClientPolicies,
  useClientEmployees,
  type PolicyAckRecord,
} from "./policyAckApi";

function formatDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

/* ------------------------------------------------------------------ */
/* Local "assigned at" ledger — drives the pending > 3 days highlight  */
/* while the backend has not yet exposed `createdAt` on ack records.    */
/* ------------------------------------------------------------------ */

const LEDGER_KEY_PREFIX = "complianceos:policyAck:assignedAt";

function ledgerKey(clientId: number) {
  return `${LEDGER_KEY_PREFIX}:${clientId}`;
}

function readLedger(clientId: number): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(ledgerKey(clientId)) || "{}");
  } catch {
    return {};
  }
}

function writeLedgerEntry(clientId: number, policyId: number) {
  try {
    const key = `${policyId}:last`;
    const next = { ...readLedger(clientId), [key]: new Date().toISOString() };
    localStorage.setItem(ledgerKey(clientId), JSON.stringify(next));
  } catch {
    /* storage unavailable — highlight falls back to createdAt when provided */
  }
}

/** Days a pending ack has been waiting (null when unknown). */
function pendingForDays(ack: PolicyAckRecord, clientId: number): number | null {
  if (ack.createdAt) {
    const created = new Date(ack.createdAt).getTime();
    if (!isNaN(created)) return Math.floor((Date.now() - created) / 86_400_000);
  }
  const ledger = readLedger(clientId);
  const lastAssigned = ledger[`${ack.policyId}:last`];
  if (lastAssigned) {
    const assigned = new Date(lastAssigned).getTime();
    if (!isNaN(assigned)) return Math.floor((Date.now() - assigned) / 86_400_000);
  }
  return null;
}

const OVERDUE_AFTER_DAYS = 3;

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

interface PolicyAcknowledgmentPanelProps {
  clientId: number;
}

/**
 * Pending policy acknowledgment surface (Vanta-class "employee sign-off").
 * Calls `policyAck.list` / `policyAck.acknowledge` / `policyAck.assign`;
 * degrades to a graceful EmptyState when the backend router is not live yet.
 */
export function PolicyAcknowledgmentPanel({ clientId }: PolicyAcknowledgmentPanelProps) {
  const acksQuery = usePolicyAcks(clientId);

  /* ---- Assign-policy dialog state ---- */
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedPolicyId, setSelectedPolicyId] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");

  const { data: clientPolicies } = useClientPolicies(clientId);
  const { data: employees } = useClientEmployees(clientId);

  const assignMutation = useAssignPolicy({
    onSuccess: (created) => {
      const count = Array.isArray(created) ? created.length : 0;
      toast.success(count > 0 ? `Policy assigned to ${count} assignee${count === 1 ? "" : "s"}` : "Policy assigned");
      setAssignOpen(false);
      setSelectedPolicyId("");
      setSelectedUserId("");
      acksQuery.refetch();
    },
    onError: (err) => {
      toast.error(
        `Assignment failed — ${(err as Error)?.message ?? "policyAck.assign is not live yet"}`
      );
    },
  });

  const ackMutation = useAcknowledgePolicy({
    onSuccess: (updated) => {
      toast.success(updated?.policyTitle ? `"${updated.policyTitle}" acknowledged` : "Policy acknowledged");
      acksQuery.refetch();
    },
    onError: (err) => {
      toast.error(`Acknowledgment failed: ${(err as Error)?.message ?? "unknown error"}`);
    },
  });

  const acks: PolicyAckRecord[] = (acksQuery.data ?? []).filter((a) => a?.id != null);
  const pendingCount = acks.filter((a) => a.status !== "acknowledged").length;
  const acknowledgedCount = acks.length - pendingCount;

  /* Pending > 3 days highlight + reminders */
  const pendingAcks = acks.filter((a) => a.status !== "acknowledged");
  const overdueAcks = useMemo(
    () => pendingAcks.filter((a) => (pendingForDays(a, clientId) ?? 0) > OVERDUE_AFTER_DAYS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [acks, clientId]
  );

  const canAssign = !!clientPolicies && clientPolicies.length > 0;

  const handleAssignSubmit = () => {
    const policyId = parseInt(selectedPolicyId, 10);
    if (!policyId || isNaN(policyId)) {
      toast.error("Select a policy to assign");
      return;
    }
    const userId = selectedUserId ? parseInt(selectedUserId, 10) : undefined;
    if (selectedUserId && (isNaN(userId as number) || !userId)) {
      toast.error("Select an assignee");
      return;
    }
    assignMutation.mutate({ policyId, clientId, userId });
    // Local ledger for the >3-day highlight (until createdAt is exposed).
    writeLedgerEntry(clientId, policyId);
  };

  const userOptions = useMemo(() => {
    if (!employees) return [];
    return employees.map((emp: any) => ({
      id: emp.id,
      label: `${emp.firstName ?? ""} ${emp.lastName ?? ""}`.trim() || `User #${emp.id}`,
    }));
  }, [employees]);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            Policy Acknowledgments
          </CardTitle>
          <div className="flex items-center gap-2">
            {!acksQuery.isLoading && !acksQuery.isError && acks.length > 0 && (
              <Badge variant={pendingCount > 0 ? "warning" : "success"} className="gap-1">
                {pendingCount} pending
              </Badge>
            )}
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setAssignOpen(true)}>
              <UserPlus className="h-3.5 w-3.5" />
              Assign policy
            </Button>
          </div>
        </div>
        <CardDescription>Track and record sign-off of distributed policies.</CardDescription>
      </CardHeader>
      <CardContent>
        {acksQuery.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : acksQuery.isError ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Connect the policy acknowledgment API"
            description="The policyAck.* endpoint is not live yet. Acknowledgment tracking will appear here automatically."
          />
        ) : acks.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="No acknowledgments yet"
            description="Assign a policy to employees to start tracking sign-off."
            action={canAssign ? { label: "Assign a policy", onClick: () => setAssignOpen(true) } : undefined}
          />
        ) : (
          <>
            {/* Overdue reminder banner */}
            {overdueAcks.length > 0 && (
              <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2.5">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-700 dark:text-amber-400">
                    {overdueAcks.length} acknowledgment{overdueAcks.length === 1 ? "" : "s"} pending for over {OVERDUE_AFTER_DAYS} days
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Reminders are highlighted below; automated email reminders will be sent once the
                    policyAck.reminders endpoint is connected.
                  </p>
                </div>
              </div>
            )}

            <ul className="space-y-3">
              {acks.map((ack) => {
                const isAcknowledged = ack.status === "acknowledged";
                const daysPending = pendingForDays(ack, clientId);
                const isOverdue = !isAcknowledged && daysPending != null && daysPending > OVERDUE_AFTER_DAYS;
                return (
                  <li
                    key={ack.id}
                    className={cn(
                      "rounded-xl border p-4 transition-colors",
                      isOverdue
                        ? "border-amber-500/40 bg-amber-500/[0.06] shadow-sm"
                        : isAcknowledged
                          ? "border-border bg-muted/30"
                          : "border-border bg-card shadow-sm"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-snug">{ack.policyTitle || "Policy"}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          {ack.assigneeName && (
                            <span className="flex items-center gap-1">
                              <User className="h-3.5 w-3.5" /> {ack.assigneeName}
                            </span>
                          )}
                          {formatDate(ack.dueDate) && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" /> due {formatDate(ack.dueDate)}
                            </span>
                          )}
                          {isAcknowledged && formatDate(ack.acknowledgedAt) && (
                            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" /> acknowledged {formatDate(ack.acknowledgedAt)}
                            </span>
                          )}
                          {isOverdue && daysPending != null && (
                            <span className="flex items-center gap-1 font-medium text-amber-600 dark:text-amber-400">
                              <AlertTriangle className="h-3.5 w-3.5" /> pending {daysPending} days
                            </span>
                          )}
                        </div>
                      </div>
                      {isAcknowledged ? (
                        <Badge variant="success" className="shrink-0 gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Acknowledged
                        </Badge>
                      ) : (
                        <div className="flex shrink-0 items-center gap-2">
                          {isOverdue && (
                            <Badge variant="warning" className="gap-1">
                              <AlertTriangle className="h-3 w-3" /> 3+ days
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5"
                            disabled={ackMutation.isPending}
                            onClick={() => ackMutation.mutate({ acknowledgmentId: ack.id })}
                          >
                            {ackMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Handshake className="h-3.5 w-3.5" />}
                            Acknowledge
                          </Button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
        {!acksQuery.isLoading && !acksQuery.isError && acknowledgedCount > 0 && (
          <p className="text-xs text-muted-foreground mt-3">
            {acknowledgedCount} of {acks.length} acknowledged
          </p>
        )}
      </CardContent>

      {/* Assign policy dialog */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assign policy</DialogTitle>
            <DialogDescription>
              Distribute a policy for acknowledgment. Assign to one employee or everyone.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Policy *</Label>
              <Select value={selectedPolicyId} onValueChange={setSelectedPolicyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a policy" />
                </SelectTrigger>
                <SelectContent className="max-h-[260px]">
                  {clientPolicies?.map((policy: any) => (
                    <SelectItem key={policy.id} value={String(policy.id)}>
                      {policy.name || `Policy #${policy.id}`}
                    </SelectItem>
                  ))}
                  {(!clientPolicies || clientPolicies.length === 0) && (
                    <SelectItem value="__none__" disabled>
                      No policies available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Assignee</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="Everyone (all employees)" />
                </SelectTrigger>
                <SelectContent className="max-h-[260px]">
                  <SelectItem value="__all__">Everyone (all employees)</SelectItem>
                  {userOptions.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.label}
                    </SelectItem>
                  ))}
                  {userOptions.length === 0 && (
                    <SelectItem value="__no_users__" disabled>
                      No employees found
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Leave as "Everyone" to create acknowledgments for all employees.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignSubmit} disabled={assignMutation.isPending} className="gap-1.5">
              {assignMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Assign policy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
