import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Input } from "@complianceos/ui/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@complianceos/ui/ui/select";
import { Badge } from "@complianceos/ui/ui/badge";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  Plug,
  PlugZap,
  RefreshCw,
  Trash2,
  Plus,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ConnectorManagerProps {
  clientId: number;
}

type ConnectorType = {
  id: string;
  name: string;
  description: string;
  icon: string;
  configSchema: Record<string, any>;
};

type InstalledConnector = {
  id: string;
  name: string;
  type: string;
  enabled: boolean;
  schedule: string;
  lastRunAt?: string;
  lastRunStatus?: string;
};

/** Map mutation failures to user-facing copy. Connector mutations are
 *  admin-gated (cycle 36b): surface a permission message for auth errors
 *  instead of the raw UNAUTHORIZED/FORBIDDEN code. */
const describeConnectorError = (err: { message?: string }): string => {
  const msg = String(err?.message ?? "");
  if (/401|403|UNAUTHORIZED|FORBIDDEN/i.test(msg)) {
    return "You don't have permission to manage connectors.";
  }
  return msg || "Connector action failed.";
};

/** Local typed data-contract layer (UI-STANDARD §16). The connectors router
 *  is built through a factory with loosely-typed procedures (cycle 36b auth
 *  hardening), which collapses client-side inference; this page therefore
 *  consumes it exclusively through this typed surface - never raw
 *  trpc.connectors.* access. Shapes mirror createConnectorsRouter exactly. */
interface ConnectorsQuery<TInput, TData> {
  useQuery: (
    input?: TInput,
    opts?: Record<string, unknown>
  ) => {
    data?: TData;
    isLoading?: boolean;
    refetch: () => Promise<unknown>;
  };
}

interface MutationLike<TInput, TResult> {
  useMutation: (opts?: {
    onSuccess?: (data: TResult) => void;
    onError?: (error: { message?: string }) => void;
  }) => {
    mutate: (input: TInput) => void;
    mutateAsync?: (input: TInput) => Promise<unknown>;
    isPending?: boolean;
    isLoading?: boolean;
  };
}

interface ConnectorsApi {
  listTypes: ConnectorsQuery<void, ConnectorType[]>;
  listInstalled: ConnectorsQuery<{ clientId: number }, InstalledConnector[]>;
  getRunHistory: ConnectorsQuery<
    { clientId: number; limit?: number },
    Array<Record<string, any>>
  >;
  install: MutationLike<
    {
      clientId: number;
      type: string;
      name: string;
      credentials?: Record<string, string>;
      settings?: Record<string, unknown>;
      schedule?: string;
    },
    unknown
  >;
  uninstall: MutationLike<{ id: string | null }, unknown>;
  run: MutationLike<
    { id: string },
    { success: boolean; evidenceCollected?: number; errors?: string[] }
  >;
}

const connectorsApi = trpc as unknown as { connectors: ConnectorsApi };

export function ConnectorManager({ clientId }: ConnectorManagerProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string>("");
  const [connectorName, setConnectorName] = useState("");
  const [credentialFields, setCredentialFields] = useState<Record<string, string>>({});
  const [settingsFields, setSettingsFields] = useState<Record<string, string>>({});
  const [schedule, setSchedule] = useState<"hourly" | "daily" | "weekly">("daily");

  // Queries
  const { data: types, isLoading: typesLoading } = connectorsApi.connectors.listTypes.useQuery();
  const { data: installed, isLoading: installedLoading, refetch: refetchInstalled } =
    connectorsApi.connectors.listInstalled.useQuery({ clientId });
  const { data: runHistory, refetch: refetchHistory } =
    connectorsApi.connectors.getRunHistory.useQuery({ clientId, limit: 10 });

  // Mutations
  const installMutation = connectorsApi.connectors.install.useMutation({
    onSuccess: () => {
      toast.success("Connector installed successfully");
      refetchInstalled();
      setAddDialogOpen(false);
      resetForm();
    },
    onError: (err) => toast.error(describeConnectorError(err)),
  });

  const uninstallMutation = connectorsApi.connectors.uninstall.useMutation({
    onSuccess: () => {
      toast.success("Connector removed");
      refetchInstalled();
      setDeleteConfirmId(null);
    },
    onError: (err) => toast.error(describeConnectorError(err)),
  });

  const runMutation = connectorsApi.connectors.run.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        toast.success(`Collected ${result.evidenceCollected} evidence items`);
      } else {
        toast.error(`Run completed with errors: ${result.errors?.join(", ")}`);
      }
      refetchInstalled();
      refetchHistory();
    },
    onError: (err) => toast.error(describeConnectorError(err)),
  });

  const resetForm = () => {
    setSelectedType("");
    setConnectorName("");
    setCredentialFields({});
    setSettingsFields({});
    setSchedule("daily");
  };

  const selectedConnectorType: ConnectorType | undefined = types?.find(
    (t) => t.id === selectedType
  );

  const handleInstall = () => {
    if (!selectedType || !connectorName) {
      toast.error("Please select a connector type and enter a name");
      return;
    }
    installMutation.mutate({
      clientId,
      type: selectedType,
      name: connectorName,
      credentials: credentialFields,
      settings: settingsFields,
      schedule,
    });
  };

  const getStatusDot = (status?: string) => {
    if (status === "success" || status === "connected") {
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    }
    if (status === "failed" || status === "error") {
      return <XCircle className="h-4 w-4 text-red-500" />;
    }
    return <Plug className="h-4 w-4 text-muted-foreground" />;
  };

  if (typesLoading || installedLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Evidence Connectors</h2>
          <p className="text-sm text-muted-foreground">
            Automate evidence collection from your infrastructure
          </p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Connector
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Install Connector</DialogTitle>
              <DialogDescription>
                Configure a new evidence collection connector
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Type selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Connector Type</label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select connector type" />
                  </SelectTrigger>
                  <SelectContent>
                    {types?.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedConnectorType && (
                <>
                  <p className="text-sm text-muted-foreground">
                    {selectedConnectorType.description}
                  </p>

                  {/* Name */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      placeholder="My AWS Connector"
                      value={connectorName}
                      onChange={(e) => setConnectorName(e.target.value)}
                    />
                  </div>

                  {/* Credential fields (from configSchema required fields) */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Credentials</label>
                    <Input
                      placeholder="API Token / Access Key"
                      type="password"
                      value={credentialFields["token"] || credentialFields["accessKeyId"] || ""}
                      onChange={(e) => {
                        const key =
                          selectedType === "aws" ? "accessKeyId" : "token";
                        setCredentialFields({ ...credentialFields, [key]: e.target.value });
                      }}
                    />
                    {(selectedType === "aws" || selectedType === "github") && (
                      <Input
                        placeholder={
                          selectedType === "aws"
                            ? "Secret Access Key"
                            : "Organization"
                        }
                        type={selectedType === "aws" ? "password" : "text"}
                        value={
                          credentialFields["secretAccessKey"] ||
                          credentialFields["organization"] ||
                          ""
                        }
                        onChange={(e) => {
                          const key =
                            selectedType === "aws"
                              ? "secretAccessKey"
                              : "organization";
                          setCredentialFields({
                            ...credentialFields,
                            [key]: e.target.value,
                          });
                        }}
                      />
                    )}
                  </div>

                  {/* Settings */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Settings</label>
                    <Input
                      placeholder={
                        selectedType === "aws"
                          ? "Region (e.g. us-east-1)"
                          : selectedType === "google_workspace"
                          ? "Domain (e.g. example.com)"
                          : selectedType === "okta"
                          ? "Okta Domain (e.g. mycompany.okta.com)"
                          : selectedType === "docker"
                          ? "Host (e.g. /var/run/docker.sock)"
                          : "Settings"
                      }
                      value={settingsFields["region"] || settingsFields["domain"] || settingsFields["host"] || settingsFields["organization"] || ""}
                      onChange={(e) => {
                        const key =
                          selectedType === "aws"
                            ? "region"
                            : selectedType === "google_workspace" || selectedType === "okta"
                            ? "domain"
                            : selectedType === "docker"
                            ? "host"
                            : "organization";
                        setSettingsFields({ ...settingsFields, [key]: e.target.value });
                      }}
                    />
                  </div>

                  {/* Schedule */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Collection Schedule</label>
                    <Select
                      value={schedule}
                      onValueChange={(v: "hourly" | "daily" | "weekly") =>
                        setSchedule(v)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleInstall} disabled={installMutation.isLoading}>
                {installMutation.isLoading ? "Installing..." : "Install"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Installed Connectors */}
      <div className="space-y-3">
        {(!installed || installed.length === 0) ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Plug className="mx-auto h-8 w-8 mb-2 opacity-50" />
              <p>No connectors installed yet.</p>
              <p className="text-sm">Click "Add Connector" to get started.</p>
            </CardContent>
          </Card>
        ) : (
          installed.map((conn) => (
            <Card key={conn.id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-3">
                  {getStatusDot(conn.lastRunStatus)}
                  <div>
                    <p className="font-medium">{conn.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {conn.type} &middot; {conn.schedule}
                      {conn.lastRunAt && (
                        <>
                          {" "}&middot; Last run:{" "}
                          {new Date(conn.lastRunAt).toLocaleString()}
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {conn.enabled && (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Active
                    </Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => runMutation.mutate({ id: conn.id })}
                    disabled={runMutation.isLoading}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Run Now
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setDeleteConfirmId(conn.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Run History */}
      {runHistory && runHistory.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-2">Recent Runs</h3>
          <div className="space-y-1">
            {runHistory.slice(0, 5).map((run: any) => (
              <div
                key={run.id}
                className="flex items-center justify-between text-sm py-1"
              >
                <span>{run.name} ({run.provider})</span>
                <span className="text-muted-foreground">
                  {run.lastRunAt
                    ? new Date(run.lastRunAt).toLocaleString()
                    : "Never"}
                  {run.status === "error" && (
                    <Badge variant="destructive" className="ml-2 text-xs">
                      Failed
                    </Badge>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Connector?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this connector configuration. Evidence
              already collected will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                deleteConfirmId &&
                uninstallMutation.mutate({ id: deleteConfirmId })
              }
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
