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
import { Checkbox } from "@complianceos/ui/ui/checkbox";
import { Switch } from "@complianceos/ui/ui/switch";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@complianceos/ui/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@complianceos/ui/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@complianceos/ui/ui/table";
import { cn } from "@/lib/utils";
import { useClientContext } from "@/contexts/ClientContext";
import { toast } from "sonner";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  Globe,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Webhook,
  XCircle,
} from "lucide-react";
import {
  useWebhookSubscriptions,
  useWebhookDeliveries,
  useWebhookEventCatalog,
  useSubscribeWebhook,
  useUpdateWebhook,
  useDeleteWebhook,
  useTriggerWebhookTest,
  WEBHOOK_EVENTS,
  type WebhookEventDefinition,
  type WebhookSubscription,
} from "./webhooksApi";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function isValidHttpUrl(value: string) {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function displayUrl(url: string) {
  const clean = url.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return clean.length > 42 ? `${clean.slice(0, 42)}…` : clean;
}

function formatRelativeTime(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  const diff = Date.now() - d.getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function eventLabel(event: string, options: WebhookEventDefinition[]) {
  if (event === "*") return "All events";
  return options.find((o) => o.id === event)?.label ?? event;
}

function isSubscriptionActive(status?: string) {
  return (status || "active").toLowerCase() !== "disabled";
}

/** Pretty-print a delivery payload for the expandable details row. */
function formatPayload(payload: unknown) {
  if (payload == null) return "—";
  if (typeof payload === "string") {
    try {
      return JSON.stringify(JSON.parse(payload), null, 2);
    } catch {
      return payload;
    }
  }
  try {
    return JSON.stringify(payload, null, 2);
  } catch {
    return String(payload);
  }
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function Webhooks() {
  const params = useParams<{ id: string }>();
  const { selectedClientId } = useClientContext();
  const urlClientId = params.id ? parseInt(params.id, 10) : 0;
  const clientId = urlClientId > 0 ? urlClientId : (selectedClientId ?? 0);

  /* Dialog state */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<WebhookSubscription | null>(null);
  const [revealedSecret, setRevealedSecret] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WebhookSubscription | null>(null);
  const [testPendingId, setTestPendingId] = useState<number | null>(null);
  const [expandedDelivery, setExpandedDelivery] = useState<string | null>(null);
  const [showSecret, setShowSecret] = useState(false);

  /* Form state */
  const [formName, setFormName] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formUrlError, setFormUrlError] = useState<string | null>(null);
  const [formEvents, setFormEvents] = useState<string[]>([]);
  const [formSecret, setFormSecret] = useState("");

  const subscriptionsQuery = useWebhookSubscriptions(clientId);
  const deliveriesQuery = useWebhookDeliveries(clientId, 50);
  const catalogQuery = useWebhookEventCatalog();

  const subscribe = useSubscribeWebhook();
  const update = useUpdateWebhook();
  const remove = useDeleteWebhook();
  const triggerTest = useTriggerWebhookTest();

  const subscriptions = subscriptionsQuery.data ?? [];
  const deliveries = deliveriesQuery.data ?? [];
  const eventOptions =
    catalogQuery.data && catalogQuery.data.length > 0 ? catalogQuery.data : WEBHOOK_EVENTS;
  const catalogIsFallback =
    catalogQuery.isError || (!catalogQuery.isLoading && !catalogQuery.data);

  /* Derived stats */
  const activeCount = subscriptions.filter((s) => isSubscriptionActive(s.status)).length;
  const now = Date.now();
  const last24h = deliveries.filter((d) => {
    const t = new Date(d.executedAt).getTime();
    return !isNaN(t) && now - t <= 24 * 60 * 60 * 1000;
  }).length;
  const successCount = deliveries.filter((d) => d.success).length;
  const successRate =
    deliveries.length > 0 ? Math.round((successCount / deliveries.length) * 100) : null;

  const refreshAll = () => {
    subscriptionsQuery.refetch();
    deliveriesQuery.refetch();
  };

  /* ---------------- Dialog actions ---------------- */

  const openCreateDialog = () => {
    setEditingSub(null);
    setRevealedSecret(null);
    setShowSecret(false);
    setFormName("");
    setFormUrl("");
    setFormUrlError(null);
    setFormEvents([]);
    setFormSecret("");
    setDialogOpen(true);
  };

  const openEditDialog = (sub: WebhookSubscription) => {
    setEditingSub(sub);
    setRevealedSecret(null);
    setShowSecret(false);
    setFormName(sub.name);
    setFormUrl(sub.targetUrl);
    setFormUrlError(null);
    setFormEvents(Array.isArray(sub.events) ? [...sub.events] : []);
    setFormSecret("");
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingSub(null);
    setRevealedSecret(null);
    setShowSecret(false);
  };

  const toggleEvent = (eventId: string, checked: boolean) => {
    if (eventId === "*") {
      // "All events" is exclusive — it replaces any specific selection.
      setFormEvents(checked ? ["*"] : []);
      return;
    }
    setFormEvents((prev) => {
      const withoutAll = prev.filter((e) => e !== "*");
      if (checked) return [...withoutAll, eventId];
      return withoutAll.filter((e) => e !== eventId);
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = formUrl.trim();
    if (!isValidHttpUrl(trimmedUrl)) {
      setFormUrlError("Enter a valid http(s) URL — e.g. https://hooks.example.com/callback");
      return;
    }
    if (!formName.trim()) {
      toast.error("Give this webhook a name.");
      return;
    }
    if (formEvents.length === 0) {
      toast.error("Select at least one event to subscribe to.");
      return;
    }

    if (editingSub) {
      update.mutate(
        {
          id: editingSub.id,
          name: formName.trim(),
          targetUrl: trimmedUrl,
          events: formEvents,
        },
        {
          onSuccess: () => {
            toast.success(`Webhook "${formName.trim()}" updated`);
            closeDialog();
            subscriptionsQuery.refetch();
          },
          onError: () =>
            toast.error("Could not update — webhooks.updateSubscription is not live yet."),
        }
      );
    } else {
      const providedSecret = formSecret.trim();
      subscribe.mutate(
        {
          clientId,
          name: formName.trim(),
          targetUrl: trimmedUrl,
          events: formEvents,
          secret: providedSecret || undefined,
        },
        {
          onSuccess: (sub) => {
            toast.success("Webhook created");
            subscriptionsQuery.refetch();
            if (sub?.secret && !providedSecret) {
              // Backend generated a secret — reveal it exactly once.
              setRevealedSecret(sub.secret);
            } else {
              closeDialog();
            }
          },
          onError: () =>
            toast.error("Could not create the webhook — webhooks.subscribe is not live yet."),
        }
      );
    }
  };

  const copySecret = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Signing secret copied");
    } catch {
      toast.error("Could not copy automatically — select the secret and copy manually.");
    }
  };

  /** Fill the create form with a fresh 256-bit hex secret (UI-only; no API call). */
  const generateSecret = () => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    setFormSecret(Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(""));
    setShowSecret(true);
  };

  const handleToggleStatus = (sub: WebhookSubscription, checked: boolean) => {
    const next = checked ? "active" : "disabled";
    update.mutate(
      { id: sub.id, status: next },
      {
        onSuccess: () => {
          toast.success(`"${sub.name}" ${next === "active" ? "enabled" : "disabled"}`);
          subscriptionsQuery.refetch();
        },
        onError: () =>
          toast.error("Could not update the status — webhooks.updateSubscription is not live yet."),
      }
    );
  };

  const handleSendTest = (sub: WebhookSubscription) => {
    setTestPendingId(sub.id);
    triggerTest.mutate(
      { clientId, event: "test.ping" },
      {
        onSuccess: (result) => {
          setTestPendingId(null);
          const dispatched = result?.dispatchedCount ?? 0;
          if (dispatched > 0) {
            toast.success(
              `Test ping delivered to ${dispatched} active subscription${dispatched === 1 ? "" : "s"}`
            );
          } else {
            toast.info("Test ping sent — no active subscription matched the test.ping event.");
          }
          deliveriesQuery.refetch();
        },
        onError: () => {
          setTestPendingId(null);
          toast.error("Could not send the test event — webhooks.triggerTestEvent is not live yet.");
        },
      }
    );
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    remove.mutate(
      { id: target.id },
      {
        onSuccess: () => {
          toast.success(`Deleted "${target.name}"`);
          setDeleteTarget(null);
          refreshAll();
        },
        onError: () =>
          toast.error("Could not delete — webhooks.deleteSubscription is not live yet."),
      }
    );
  };

  /* ---------------- Render ---------------- */

  return (
    <DashboardLayout>
      <div className="space-y-6 w-full max-w-full">
        <Breadcrumb items={[{ label: "Webhooks" }]} />

        <PageHeader
          title="Webhooks"
          subtitle="Deliver compliance events to your automation — evidence expiry, control failures, new risks and more."
          actions={
            <Button size="sm" onClick={openCreateDialog} disabled={clientId <= 0}>
              <Plus className="h-4 w-4 mr-2" />
              Add webhook
            </Button>
          }
        />

        {clientId <= 0 && (
          <EmptyState
            icon={Webhook}
            title="Select a client to get started"
            description="Open a client workspace from the Clients page to manage its webhook subscriptions."
          />
        )}

        {clientId > 0 && (
          <>
            {/* Stats */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {subscriptionsQuery.isLoading ? (
                <>
                  <Skeleton className="h-[92px] w-full rounded-xl" />
                  <Skeleton className="h-[92px] w-full rounded-xl" />
                  <Skeleton className="h-[92px] w-full rounded-xl" />
                </>
              ) : subscriptionsQuery.isError ? (
                <Card className="lg:col-span-3">
                  <CardContent className="p-0">
                    <EmptyState
                      icon={Webhook}
                      title="Connect the webhooks.listSubscriptions API"
                      description="webhooks.listSubscriptions is not live yet. Summary counters will appear here automatically once the endpoint is wired up."
                    />
                  </CardContent>
                </Card>
              ) : (
                <>
                  <StatCard
                    label="Active subscriptions"
                    value={activeCount}
                    icon={Webhook}
                    tone="blue"
                  />
                  {deliveriesQuery.isLoading ? (
                    <Skeleton className="h-[92px] w-full rounded-xl" />
                  ) : (
                    <StatCard
                      label="Deliveries (24h)"
                      value={deliveriesQuery.isError ? "—" : last24h}
                      icon={Send}
                      tone="purple"
                    />
                  )}
                  {deliveriesQuery.isLoading ? (
                    <Skeleton className="h-[92px] w-full rounded-xl" />
                  ) : (
                    <StatCard
                      label="Success rate"
                      value={deliveriesQuery.isError ? "—" : successRate === null ? "—" : `${successRate}%`}
                      icon={deliveriesQuery.isError ? XCircle : CheckCircle2}
                      tone={deliveriesQuery.isError ? "amber" : "green"}
                    />
                  )}
                </>
              )}
            </div>

            {/* Subscriptions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                  <Globe className="h-5 w-5 text-muted-foreground" />
                  Subscriptions
                </CardTitle>
                <CardDescription>
                  Outbound webhooks that receive ComplianceOS events via HMAC-signed POST requests.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {subscriptionsQuery.isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-14 w-full rounded-xl" />
                    <Skeleton className="h-14 w-full rounded-xl" />
                    <Skeleton className="h-14 w-full rounded-xl" />
                  </div>
                ) : subscriptionsQuery.isError ? (
                  <EmptyState
                    icon={Globe}
                    title="Connect the webhooks.listSubscriptions API"
                    description="webhooks.listSubscriptions is not live yet. Subscriptions will appear here once the endpoint is wired up."
                  />
                ) : subscriptions.length === 0 ? (
                  <EmptyState
                    icon={Globe}
                    title="No webhook subscriptions yet"
                    description="Add your first webhook to start receiving compliance events."
                    action={{ label: "Add webhook", onClick: openCreateDialog }}
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[28%]">Name</TableHead>
                        <TableHead className="w-[24%]">Target URL</TableHead>
                        <TableHead>Events</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subscriptions.map((sub) => {
                        const active = isSubscriptionActive(sub.status);
                        const testPending = testPendingId === sub.id;
                        return (
                          <TableRow key={sub.id}>
                            <TableCell>
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() => openEditDialog(sub)}
                                  className="text-sm font-semibold text-foreground hover:text-primary transition-colors text-left"
                                  title={`Edit ${sub.name}`}
                                >
                                  {sub.name}
                                </button>
                                {sub.createdAt && (
                                  <p className="text-xs text-muted-foreground mt-0.5">
                                    Created {formatRelativeTime(sub.createdAt)}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <span
                                className="block max-w-[260px] truncate text-sm text-muted-foreground"
                                title={sub.targetUrl}
                              >
                                {displayUrl(sub.targetUrl)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-wrap gap-1.5">
                                {(Array.isArray(sub.events) ? sub.events : []).map((ev) => (
                                  <Badge
                                    key={ev}
                                    variant={ev === "*" ? "info" : "outline"}
                                    className="font-medium"
                                  >
                                    {eventLabel(ev, eventOptions)}
                                  </Badge>
                                ))}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={active ? "success" : "outline"}
                                className={cn(!active && "bg-muted text-muted-foreground border-border")}
                              >
                                {active ? "Active" : "Disabled"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                                <Switch
                                  checked={active}
                                  onCheckedChange={(checked) => handleToggleStatus(sub, checked)}
                                  disabled={update.isPending}
                                  title={active ? "Disable webhook" : "Enable webhook"}
                                  aria-label={active ? "Disable webhook" : "Enable webhook"}
                                />
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="gap-1.5"
                                  onClick={() => handleSendTest(sub)}
                                  disabled={testPending || triggerTest.isPending}
                                  title="Send a test.ping event"
                                >
                                  {testPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Send className="h-4 w-4" />
                                  )}
                                  <span className="hidden lg:inline">Test</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => setDeleteTarget(sub)}
                                  title={`Delete ${sub.name}`}
                                  aria-label={`Delete ${sub.name}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Deliveries */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold tracking-tight">
                      <Send className="h-5 w-5 text-muted-foreground" />
                      Recent Deliveries
                    </CardTitle>
                    <CardDescription>
                      Latest webhook delivery attempts for this workspace.
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deliveriesQuery.refetch()}
                    disabled={deliveriesQuery.isFetching}
                  >
                    {deliveriesQuery.isFetching ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {deliveriesQuery.isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-full rounded-xl" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                  </div>
                ) : deliveriesQuery.isError ? (
                  <EmptyState
                    icon={Send}
                    title="Connect the webhooks.listDeliveries API"
                    description="webhooks.listDeliveries is not live yet. Delivery attempts will appear here once the endpoint is wired up."
                  />
                ) : deliveries.length === 0 ? (
                  <EmptyState
                    icon={Send}
                    title="No deliveries yet"
                    description="Send a test event from a subscription row to verify your endpoint."
                  />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10">
                          <span className="sr-only">Details</span>
                        </TableHead>
                        <TableHead>Event</TableHead>
                        <TableHead>Result</TableHead>
                        <TableHead className="text-right">Status</TableHead>
                        <TableHead className="text-right">Duration</TableHead>
                        <TableHead className="text-right">Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deliveries.map((d) => {
                        const dKey = String(d.id ?? `${d.subscriptionId}-${d.executedAt}`);
                        const isExpanded = expandedDelivery === dKey;
                        const eventName = eventLabel(d.event, eventOptions);
                        return (
                          <React.Fragment key={dKey}>
                            <TableRow>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                  onClick={() => setExpandedDelivery(isExpanded ? null : dKey)}
                                  title={
                                    isExpanded
                                      ? "Hide delivery details"
                                      : "Show delivery details"
                                  }
                                  aria-label={
                                    isExpanded
                                      ? `Hide delivery details for ${eventName}`
                                      : `Show delivery details for ${eventName}`
                                  }
                                  aria-expanded={isExpanded}
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm font-medium text-foreground">
                                  {eventName}
                                </span>
                              </TableCell>
                              <TableCell>
                                <Badge variant={d.success ? "success" : "error"}>
                                  {d.success ? "Success" : "Failed"}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <span
                                  className={cn(
                                    "inline-flex items-center rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums",
                                    d.success
                                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                      : "bg-red-500/10 text-red-600 dark:text-red-400"
                                  )}
                                >
                                  {d.statusCode || "—"}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <span className="text-sm text-muted-foreground tabular-nums">
                                  {d.durationMs} ms
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <span className="text-sm text-muted-foreground whitespace-nowrap">
                                  {formatRelativeTime(d.executedAt)}
                                </span>
                              </TableCell>
                            </TableRow>
                            {isExpanded && (
                              <TableRow>
                                <TableCell colSpan={6} className="bg-muted/30 p-4">
                                  <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="min-w-0">
                                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                                        Response body
                                      </p>
                                      <pre className="whitespace-pre-wrap break-words rounded-lg bg-card border border-border p-3 text-xs font-mono text-foreground/80 max-h-44 overflow-y-auto">
                                        {d.responseBody?.trim() || "—"}
                                      </pre>
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                                        Payload
                                      </p>
                                      <pre className="whitespace-pre-wrap break-words rounded-lg bg-card border border-border p-3 text-xs font-mono text-foreground/80 max-h-44 overflow-y-auto">
                                        {formatPayload(d.payload)}
                                      </pre>
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Create / edit dialog */}
        <Dialog open={dialogOpen} onOpenChange={(open) => !open && closeDialog()}>
          <DialogContent className="sm:max-w-lg">
            {revealedSecret ? (
              <div className="space-y-4 py-2">
                <DialogHeader>
                  <DialogTitle>Webhook created — copy the signing secret</DialogTitle>
                  <DialogDescription>
                    ComplianceOS signs every payload with HMAC-SHA256 using this secret. It is
                    shown only once.
                  </DialogDescription>
                </DialogHeader>
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                    Copy now — you won't see it again
                  </p>
                </div>
                <div className="flex gap-2">
                  <Input
                    readOnly
                    value={revealedSecret}
                    className="font-mono text-xs h-10"
                    onFocus={(e) => e.currentTarget.select()}
                    aria-label="Webhook signing secret"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    title="Copy signing secret"
                    aria-label="Copy signing secret"
                    onClick={() => copySecret(revealedSecret)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <DialogFooter>
                  <Button onClick={closeDialog}>Done</Button>
                </DialogFooter>
              </div>
            ) : (
              <form onSubmit={handleSave}>
                <DialogHeader>
                  <DialogTitle>
                    {editingSub ? `Edit "${editingSub.name}"` : "Add webhook"}
                  </DialogTitle>
                  <DialogDescription>
                    {editingSub
                      ? "Update the endpoint, events or name for this subscription."
                      : "We'll POST signed JSON payloads to your endpoint whenever a subscribed event fires."}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="webhook-name">Name</Label>
                    <Input
                      id="webhook-name"
                      placeholder="e.g. Slack alerting / SIEM ingest"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="h-10"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="webhook-url">Target URL</Label>
                    <Input
                      id="webhook-url"
                      type="url"
                      placeholder="https://hooks.example.com/complianceos"
                      value={formUrl}
                      onChange={(e) => {
                        setFormUrl(e.target.value);
                        if (formUrlError) setFormUrlError(null);
                      }}
                      className="h-10"
                      aria-invalid={!!formUrlError}
                    />
                    {formUrlError && (
                      <p className="text-xs text-red-600 dark:text-red-400">{formUrlError}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Events</Label>
                    <div className="rounded-xl border border-border bg-card p-3 space-y-2.5">
                      {eventOptions.map((opt) => {
                        const checked = formEvents.includes(opt.id);
                        const allSelected = formEvents.includes("*");
                        const isAll = opt.id === "*";
                        const disabled = !isAll && allSelected;
                        return (
                          <label
                            key={opt.id}
                            className={cn(
                              "flex items-start gap-3 cursor-pointer select-none",
                              disabled && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <Checkbox
                              checked={checked}
                              disabled={disabled}
                              onCheckedChange={(value) => toggleEvent(opt.id, !!value)}
                              className="mt-0.5"
                              aria-label={opt.label}
                            />
                            <span className="space-y-0.5 min-w-0">
                              <span className="block text-sm font-medium text-foreground">
                                {opt.id === "*" ? "All events (*)" : opt.label}
                              </span>
                              {opt.description && (
                                <span className="block text-xs text-muted-foreground">
                                  {opt.description}
                                </span>
                              )}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    {catalogIsFallback && !catalogQuery.data && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <KeyRound className="h-3 w-3" />
                        Using the bundled event catalog — webhooks.listEventCatalog is not live yet.
                      </p>
                    )}
                  </div>
                  {!editingSub ? (
                    <div className="space-y-2">
                      <Label htmlFor="webhook-secret">
                        Secret{" "}
                        <span className="font-normal text-muted-foreground">(optional)</span>
                      </Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            id="webhook-secret"
                            type={showSecret ? "text" : "password"}
                            placeholder="Leave blank to auto-generate a signing secret"
                            value={formSecret}
                            onChange={(e) => setFormSecret(e.target.value)}
                            className="h-10 pr-10"
                            autoComplete="new-password"
                            aria-describedby="webhook-secret-hint"
                          />
                          <button
                            type="button"
                            onClick={() => setShowSecret((v) => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title={showSecret ? "Hide secret" : "Show secret"}
                            aria-label={showSecret ? "Hide secret" : "Show secret"}
                          >
                            {showSecret ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-10 w-10 shrink-0"
                          onClick={generateSecret}
                          title="Generate a random signing secret"
                          aria-label="Generate a random signing secret"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                      <p id="webhook-secret-hint" className="text-xs text-muted-foreground">
                        If blank, a random secret is generated and shown once after creation.
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground rounded-xl border border-border bg-muted/30 p-3">
                      Signing secrets can't be rotated from the editor — delete and recreate this
                      webhook to issue a new secret.
                    </p>
                  )}
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeDialog}
                    disabled={subscribe.isPending || update.isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={subscribe.isPending || update.isPending}>
                    {subscribe.isPending || update.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    {editingSub ? "Save changes" : "Create webhook"}
                  </Button>
                </DialogFooter>
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <AlertDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this webhook?</AlertDialogTitle>
              <AlertDialogDescription>
                "{deleteTarget?.name}" will stop receiving ComplianceOS events immediately. This
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={remove.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {remove.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
