import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { Button } from "@complianceos/ui/ui/button";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { EmptyState } from "@complianceos/ui/ui/EmptyState";
import { CheckCircle2, ClipboardCheck, Loader2, User, Calendar, Handshake } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePolicyAcks, useAcknowledgePolicy, type PolicyAckRecord } from "./policyAckApi";

function formatDate(value?: string | null) {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

interface PolicyAcknowledgmentPanelProps {
  clientId: number;
}

/**
 * Pending policy acknowledgment surface (Vanta-class "employee sign-off").
 * Calls `policyAck.list` / `policyAck.acknowledge`; degrades to a graceful
 * EmptyState when the backend router is not live yet.
 */
export function PolicyAcknowledgmentPanel({ clientId }: PolicyAcknowledgmentPanelProps) {
  const acksQuery = usePolicyAcks(clientId);

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

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold tracking-tight">
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            Policy Acknowledgments
          </CardTitle>
          {!acksQuery.isLoading && !acksQuery.isError && acks.length > 0 && (
            <Badge variant={pendingCount > 0 ? "warning" : "success"} className="gap-1">
              {pendingCount} pending
            </Badge>
          )}
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
            description="Distribute a policy to assignees to start tracking sign-off."
          />
        ) : (
          <ul className="space-y-3">
            {acks.map((ack) => {
              const isAcknowledged = ack.status === "acknowledged";
              return (
                <li
                  key={ack.id}
                  className={cn(
                    "rounded-xl border p-4 transition-colors",
                    isAcknowledged ? "border-border bg-muted/30" : "border-border bg-card shadow-sm"
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
                      </div>
                    </div>
                    {isAcknowledged ? (
                      <Badge variant="success" className="shrink-0 gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Acknowledged
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 gap-1.5"
                        disabled={ackMutation.isPending}
                        onClick={() => ackMutation.mutate({ acknowledgmentId: ack.id })}
                      >
                        {ackMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Handshake className="h-3.5 w-3.5" />}
                        Acknowledge
                      </Button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {!acksQuery.isLoading && !acksQuery.isError && acknowledgedCount > 0 && (
          <p className="text-xs text-muted-foreground mt-3">
            {acknowledgedCount} of {acks.length} acknowledged
          </p>
        )}
      </CardContent>
    </Card>
  );
}
