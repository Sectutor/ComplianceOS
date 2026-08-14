/**
 * CollectorConnectionsPanel
 * =========================
 * Functional "Automated evidence sources" panel for the Evidence page
 * (scorecard P0 #1). Lets users connect cloud/API evidence sources, manage
 * credentials, test connections and trigger collection runs.
 *
 * COORDINATION BY CONVENTION (UI-STANDARD.md §16) — the backend agent builds
 * the `evidenceCollectors.*` tRPC router in parallel. This module declares the
 * expected input/output contract inline and casts the tRPC client once, so the
 * UI compiles before the router lands. If the procedures are not live yet the
 * queries 404 and the panel degrades to a graceful message — it never crashes
 * or spins forever. Token-only styling per plans/pipeline/UI-STANDARD.md.
 */

import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { AlertCircle, Cable, Loader2, Play, Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { Input } from "@complianceos/ui/ui/input";
import { Label } from "@complianceos/ui/ui/label";
import { Checkbox } from "@complianceos/ui/ui/checkbox";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@complianceos/ui/ui/alert-dialog";

/* ------------------------------------------------------------------ */
/* Data contract — mirrors packages/core/src/routers/evidenceCollectors.ts */
/* ------------------------------------------------------------------ */

export type ProviderSlug = "aws" | "azure" | "gcp" | "github" | "http-api";

export interface ManifestField {
  key: string;
  /** 'text' | 'password' | 'number' | 'select' | 'boolean' | ... */
  type: string;
  label: string;
  description?: string;
  required?: boolean;
  placeholder?: string;
  sensitive?: boolean;
  /** only used when type === 'select' */
  options?: { value: string; label: string }[];
}

export interface IntegrationManifest {
  slug: string;
  name: string;
  description: string;
  category?: string;
  authentication: {
    type: string;
    fields: ManifestField[];
  };
}

export type CollectorStatus = "connected" | "error" | "disconnected";

export interface CollectorRunSummary {
  total: number;
  passed: number;
  warning: number;
  failed: number;
  error: number;
}

export interface CollectorConnection {
  id: string;
  clientId: number;
  provider: string;
  name: string;
  status: CollectorStatus;
  lastRunAt: string | null;
  lastRunSummary: CollectorRunSummary | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TestConnectionInput {
  id: string;
  clientId: number;
}

export interface TestConnectionResult {
  ok: boolean;
  message: string;
  checkedAt: string;
}

export interface RunConnectionInput {
  id: string;
  clientId: number;
}

export interface RunConnectionResult {
  connectionId: string;
  provider: string;
  ok: boolean;
  total: number;
  passed: number;
  warning: number;
  failed: number;
  error: number;
  message: string;
  completedAt: string;
  evidence: {
    id: string;
    controlId: string;
    type: string;
    status: string;
    title: string;
    collectedAt: string;
  }[];
}

export interface SaveConnectionInput {
  clientId: number;
  provider: ProviderSlug;
  name: string;
  credentials: Record<string, string>;
  settings?: Record<string, unknown>;
}

export interface RemoveConnectionInput {
  id: string;
  clientId: number;
}

/* ------------------------------------------------------------------ */
/* Narrowed tRPC hook shapes (runtime is a superset)                   */
/* ------------------------------------------------------------------ */

interface QueryLike<T> {
  data?: T;
  isLoading: boolean;
  isError: boolean;
  isFetching?: boolean;
  error?: unknown;
  refetch: () => unknown;
}

interface MutationLike<TInput, TResult> {
  mutate: (input: TInput) => void;
  mutateAsync: (input: TInput) => Promise<TResult>;
  isPending: boolean;
  isError: boolean;
  error?: unknown;
  reset: () => void;
}

interface EvidenceCollectorsApi {
  evidenceCollectors: {
    listProviders: {
      useQuery: (
        input?: undefined,
        opts?: { enabled?: boolean; retry?: boolean | number; staleTime?: number }
      ) => QueryLike<IntegrationManifest[]>;
    };
    list: {
      useQuery: (
        input: { clientId: number },
        opts?: { enabled?: boolean; retry?: boolean | number; staleTime?: number }
      ) => QueryLike<CollectorConnection[]>;
    };
    save: { useMutation: () => MutationLike<SaveConnectionInput, CollectorConnection> };
    remove: { useMutation: () => MutationLike<RemoveConnectionInput, boolean> };
    test: { useMutation: () => MutationLike<TestConnectionInput, TestConnectionResult> };
    run: { useMutation: () => MutationLike<RunConnectionInput, RunConnectionResult> };
  };
}

const collectorApi = trpc as unknown as EvidenceCollectorsApi;

/**
 * Canonical built-in providers — used ONLY as a name lookup when the
 * listProviders endpoint is not live yet. Never fake connection data:
 * chip statuses always come from the real evidenceCollectors.list result.
 */
const FALLBACK_PROVIDERS: IntegrationManifest[] = [
  { slug: "github", name: "GitHub", description: "", authentication: { type: "token", fields: [] } },
  { slug: "http-api", name: "HTTP API", description: "", authentication: { type: "token", fields: [] } },
  { slug: "aws", name: "AWS", description: "", authentication: { type: "credentials", fields: [] } },
  { slug: "azure", name: "Azure", description: "", authentication: { type: "credentials", fields: [] } },
  { slug: "gcp", name: "GCP", description: "", authentication: { type: "credentials", fields: [] } },
];

/* ------------------------------------------------------------------ */
/* Small presentational helpers                                        */
/* ------------------------------------------------------------------ */

type ProviderChipVariant = "success" | "error" | "outline";

function providerChipStatus(connections: CollectorConnection[], slug: string) {
  const conns = connections.filter((c) => c.provider === slug);
  const hasConnected = conns.some((c) => c.status === "connected");
  const hasError = conns.some((c) => c.status === "error");
  const variant: ProviderChipVariant = hasConnected ? "success" : hasError ? "error" : "outline";
  return { count: conns.length, variant };
}

function dotClass(variant: ProviderChipVariant): string {
  if (variant === "success") return "bg-[var(--success)]";
  if (variant === "error") return "bg-[var(--error)]";
  return "bg-muted-foreground/50";
}

function formatLastRun(value: string | null): string {
  if (!value) return "Never run";
  const then = new Date(value).getTime();
  if (Number.isNaN(then)) return value;
  const minutes = Math.floor((Date.now() - then) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(value).toLocaleDateString();
}

function formatSummary(summary: CollectorRunSummary | null): string {
  if (!summary) return "No runs yet";
  const parts = [`${summary.total} total`];
  if (summary.passed > 0) parts.push(`${summary.passed} pass`);
  if (summary.warning > 0) parts.push(`${summary.warning} warn`);
  if (summary.failed > 0) parts.push(`${summary.failed} fail`);
  return parts.join(" · ");
}

const STATUS_META: Record<CollectorStatus, { variant: ProviderChipVariant; label: string }> = {
  connected: { variant: "success", label: "Connected" },
  error: { variant: "error", label: "Error" },
  disconnected: { variant: "outline", label: "Disconnected" },
};

function StatusPill({ status }: { status: CollectorStatus }) {
  const meta = STATUS_META[status];
  return (
    <Badge variant={meta.variant} className="gap-1 capitalize">
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass(meta.variant)}`} />
      {meta.label}
    </Badge>
  );
}

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

interface CollectorConnectionsPanelProps {
  clientId: number;
}

export default function CollectorConnectionsPanel({ clientId }: CollectorConnectionsPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("");
  const [connectionName, setConnectionName] = useState("");
  const [credentialValues, setCredentialValues] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [connectionToDelete, setConnectionToDelete] = useState<CollectorConnection | null>(null);

  const connectionsQuery = collectorApi.evidenceCollectors.list.useQuery(
    { clientId },
    { enabled: clientId > 0, retry: false, staleTime: 30_000 }
  );
  const providersQuery = collectorApi.evidenceCollectors.listProviders.useQuery(undefined, {
    retry: false,
    staleTime: 5 * 60_000,
  });

  const saveMutation = collectorApi.evidenceCollectors.save.useMutation();
  const removeMutation = collectorApi.evidenceCollectors.remove.useMutation();
  const testMutation = collectorApi.evidenceCollectors.test.useMutation();
  const runMutation = collectorApi.evidenceCollectors.run.useMutation();

  const connections = connectionsQuery.data ?? [];

  const providers = useMemo<IntegrationManifest[]>(() => {
    if (providersQuery.data && providersQuery.data.length > 0) return providersQuery.data;
    return FALLBACK_PROVIDERS;
  }, [providersQuery.data]);

  const selectedManifest = useMemo(
    () => providers.find((p) => p.slug === selectedProvider) ?? null,
    [providers, selectedProvider]
  );
  const authFields = selectedManifest?.authentication?.fields ?? [];

  /* ---- handlers ---- */

  const handleProviderChange = (value: string) => {
    setSelectedProvider(value);
    setCredentialValues({});
  };

  const handleSave = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedManifest) {
      toast.error("Select a provider");
      return;
    }
    if (!connectionName.trim()) {
      toast.error("Enter a connection name");
      return;
    }
    const credentials: Record<string, string> = {};
    for (const field of authFields) {
      const value = credentialValues[field.key];
      if (field.required && (value === undefined || value === "")) {
        toast.error(`${field.label} is required`);
        return;
      }
      if (value !== undefined && value !== "") credentials[field.key] = value;
    }
    setBusyKey("save");
    try {
      await saveMutation.mutateAsync({
        clientId,
        provider: selectedManifest.slug as ProviderSlug,
        name: connectionName.trim(),
        credentials,
      });
      toast.success("Source connected");
      setDialogOpen(false);
      setSelectedProvider("");
      setConnectionName("");
      setCredentialValues({});
      connectionsQuery.refetch();
    } catch (err) {
      toast.error((err as { message?: string })?.message || "Failed to connect source");
    } finally {
      setBusyKey(null);
    }
  };

  const handleTest = async (conn: CollectorConnection) => {
    setBusyKey(`test:${conn.id}`);
    try {
      const result = await testMutation.mutateAsync({ id: conn.id, clientId });
      if (result.ok) toast.success(result.message || "Connection test passed");
      else toast.error(result.message || "Connection test failed");
      connectionsQuery.refetch();
    } catch (err) {
      toast.error((err as { message?: string })?.message || "Connection test failed");
    } finally {
      setBusyKey(null);
    }
  };

  const handleRun = async (conn: CollectorConnection) => {
    setBusyKey(`run:${conn.id}`);
    try {
      const result = await runMutation.mutateAsync({ id: conn.id, clientId });
      toast.success(
        result.message ||
          `Collected ${result.total} evidence items (${result.passed} pass, ${result.warning} warning, ${result.error} error)`
      );
      connectionsQuery.refetch();
    } catch (err) {
      toast.error((err as { message?: string })?.message || "Collection run failed");
    } finally {
      setBusyKey(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!connectionToDelete) return;
    setBusyKey(`delete:${connectionToDelete.id}`);
    try {
      await removeMutation.mutateAsync({ id: connectionToDelete.id, clientId });
      toast.success("Source removed");
      setConnectionToDelete(null);
      connectionsQuery.refetch();
    } catch (err) {
      toast.error((err as { message?: string })?.message || "Failed to remove source");
    } finally {
      setBusyKey(null);
    }
  };

  const resetDialog = () => {
    setDialogOpen(false);
    setSelectedProvider("");
    setConnectionName("");
    setCredentialValues({});
  };

  /* ---- render ---- */

  return (
    <div className="bg-card/60 backdrop-blur-xl rounded-2xl border border-border shadow-sm p-4">
      {/* Header row: label + chips (left) · Connect source (right) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-1">
            <Cable className="h-4 w-4" />
            Automated evidence sources
          </span>
          {providersQuery.isLoading && connectionsQuery.isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-24 rounded-full" />
            ))
          ) : (
            providers.map((p) => {
              const st = providerChipStatus(connections, p.slug);
              return (
                <Badge key={p.slug} variant={st.variant} className="gap-1.5 capitalize">
                  <span className={`h-1.5 w-1.5 rounded-full ${dotClass(st.variant)}`} />
                  {p.name}
                  {st.count > 0 && <span className="opacity-70">· {st.count}</span>}
                </Badge>
              );
            })
          )}
          {providersQuery.isError && (
            <span
              className="text-xs text-muted-foreground ml-auto"
              title="Provider catalog unavailable — evidenceCollectors.listProviders not live yet"
            >
              catalog unavailable
            </span>
          )}
        </div>

        <Button size="sm" className="gap-1.5 w-full sm:w-auto" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Connect source
        </Button>
      </div>

      {/* Body: loading skeleton / API unavailable / empty / connection list */}
      {connectionsQuery.isLoading ? (
        <div className="mt-3 space-y-2">
          <Skeleton className="h-14 w-full rounded-xl" />
          <Skeleton className="h-14 w-full rounded-xl" />
        </div>
      ) : connectionsQuery.isError ? (
        <div className="mt-3 flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/10 px-6 py-8 text-center">
          <AlertCircle className="h-6 w-6 text-muted-foreground mb-2" />
          <p className="text-sm font-medium text-foreground">Collector connections API unavailable</p>
          <p className="text-xs text-muted-foreground mt-1">
            Connect the evidenceCollectors.list API to manage evidence sources.
          </p>
        </div>
      ) : connections.length === 0 ? (
        <div className="mt-3 flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/10 px-6 py-8 text-center">
          <Cable className="h-6 w-6 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground max-w-md">
            No sources connected yet — connect GitHub, HTTP API, AWS, Azure or GCP to begin
            collecting evidence.
          </p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setDialogOpen(true)}>
            Connect a source
          </Button>
        </div>
      ) : (
        <div className="mt-3 divide-y divide-border rounded-xl border border-border bg-card/40">
          {connections.map((conn) => (
            <div key={conn.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
              <div className="min-w-0 flex-1 basis-56">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">{conn.name}</span>
                  <Badge variant="outline" className="capitalize">
                    {conn.provider}
                  </Badge>
                  <StatusPill status={conn.status} />
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span>Last run: {formatLastRun(conn.lastRunAt)}</span>
                  <span>{formatSummary(conn.lastRunSummary)}</span>
                  {conn.status === "error" && conn.errorMessage && (
                    <span className="text-destructive truncate max-w-full" title={conn.errorMessage}>
                      {conn.errorMessage}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={busyKey !== null}
                  onClick={() => handleTest(conn)}
                  title="Test connection"
                  aria-label={`Test connection ${conn.name}`}
                >
                  {busyKey === `test:${conn.id}` ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3.5 w-3.5" />
                  )}
                  Test
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5"
                  disabled={busyKey !== null}
                  onClick={() => handleRun(conn)}
                  title="Run collection now"
                  aria-label={`Run collection for ${conn.name}`}
                >
                  {busyKey === `run:${conn.id}` ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  Run now
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  disabled={busyKey !== null}
                  onClick={() => setConnectionToDelete(conn)}
                  title="Delete source"
                  aria-label={`Delete source ${conn.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Connect source dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) resetDialog();
          else setDialogOpen(true);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Connect an evidence source</DialogTitle>
            <DialogDescription>
              Connect a cloud or API source to begin collecting compliance evidence automatically.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cc-provider">
                Provider <span className="text-destructive">*</span>
              </Label>
              <Select value={selectedProvider} onValueChange={handleProviderChange}>
                <SelectTrigger id="cc-provider">
                  <SelectValue placeholder="Select a provider" />
                </SelectTrigger>
                <SelectContent>
                  {providers.map((p) => (
                    <SelectItem key={p.slug} value={p.slug}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedManifest?.description && (
                <p className="text-xs text-muted-foreground">{selectedManifest.description}</p>
              )}
              {providersQuery.isError && (
                <p className="text-xs text-muted-foreground">
                  Provider catalog unavailable — the evidenceCollectors.listProviders API is not
                  live yet.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="cc-name">
                Connection name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="cc-name"
                value={connectionName}
                onChange={(e) => setConnectionName(e.target.value)}
                placeholder="e.g. prod-github-org"
              />
            </div>

            {authFields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label htmlFor={`cc-cred-${field.key}`}>
                  {field.label}
                  {field.required && <span className="text-destructive ml-0.5">*</span>}
                </Label>
                {field.type === "boolean" ? (
                  <div className="flex items-center gap-2 pt-1">
                    <Checkbox
                      id={`cc-cred-${field.key}`}
                      checked={credentialValues[field.key] === "true"}
                      onCheckedChange={(checked) =>
                        setCredentialValues((prev) => ({
                          ...prev,
                          [field.key]: checked === true ? "true" : "false",
                        }))
                      }
                    />
                    <span className="text-sm text-muted-foreground">{field.label}</span>
                  </div>
                ) : field.type === "select" && (field.options ?? []).length > 0 ? (
                  <Select
                    value={credentialValues[field.key] ?? ""}
                    onValueChange={(value) =>
                      setCredentialValues((prev) => ({ ...prev, [field.key]: value }))
                    }
                  >
                    <SelectTrigger id={`cc-cred-${field.key}`}>
                      <SelectValue placeholder={field.placeholder ?? `Select ${field.label}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {(field.options ?? []).map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label ?? opt.value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    id={`cc-cred-${field.key}`}
                    type={
                      field.type === "number"
                        ? "number"
                        : field.sensitive || field.type === "password"
                          ? "password"
                          : "text"
                    }
                    value={credentialValues[field.key] ?? ""}
                    onChange={(e) =>
                      setCredentialValues((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    placeholder={field.placeholder}
                    required={field.required}
                  />
                )}
                {field.description && (
                  <p className="text-xs text-muted-foreground">{field.description}</p>
                )}
              </div>
            ))}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => resetDialog()}
                disabled={busyKey === "save"}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="gap-1.5"
                disabled={busyKey === "save" || !selectedManifest}
              >
                {busyKey === "save" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {busyKey === "save" ? "Connecting..." : "Connect source"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!connectionToDelete}
        onOpenChange={(open) => {
          if (!open) setConnectionToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove evidence source?</AlertDialogTitle>
            <AlertDialogDescription>
              This will disconnect &quot;{connectionToDelete?.name ?? "this source"}&quot; and stop
              automated evidence collection. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busyKey !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="gap-1.5 bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={busyKey !== null}
              onClick={(e) => {
                e.preventDefault();
                handleDeleteConfirm();
              }}
            >
              {busyKey?.startsWith("delete:") ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
