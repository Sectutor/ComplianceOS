import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Button } from "@complianceos/ui/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { EnhancedDialog } from "@complianceos/ui/ui/enhanced-dialog";
import { Input } from "@complianceos/ui/ui/input";
import { Label } from "@complianceos/ui/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@complianceos/ui/ui/table";
import { Badge } from "@complianceos/ui/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@complianceos/ui/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Plus, Cloud, Trash2, RefreshCw, CheckCircle2, AlertCircle, Clock, Server, Database, Users } from "lucide-react";

export default function CloudIntegrations() {
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [connectionToDelete, setConnectionToDelete] = useState<any>(null);

    const { data: connections, isLoading, refetch } = trpc.cloudConnections.list.useQuery({});
    const { data: clients } = trpc.clients.list.useQuery();

    const createMutation = trpc.cloudConnections.create.useMutation({
        onSuccess: () => {
            toast.success("Cloud connection added");
            setIsAddOpen(false);
            refetch();
        },
        onError: (err) => toast.error(err.message),
    });

    const deleteMutation = trpc.cloudConnections.delete.useMutation({
        onSuccess: () => {
            toast.success("Connection removed");
            setConnectionToDelete(null);
            refetch();
        },
        onError: (err) => toast.error(err.message),
    });

    const testMutation = trpc.cloudConnections.testConnection.useMutation({
        onSuccess: () => {
            toast.success("Connection verified!");
            refetch();
        },
        onError: (err) => toast.error(err.message),
    });

    const syncMutation = trpc.cloudAssets.sync.useMutation({
        onSuccess: (result) => {
            toast.success(`Synced ${result.assetsFound} assets`);
            refetch();
        },
        onError: (err) => toast.error(err.message),
    });

    const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedProvider || !selectedClientId) {
            toast.error("Please select provider and client");
            return;
        }
        const formData = new FormData(e.currentTarget);
        createMutation.mutate({
            clientId: parseInt(selectedClientId),
            provider: selectedProvider as "aws" | "azure" | "gcp",
            name: formData.get("name") as string,
            credentials: formData.get("credentials") as string,
            region: formData.get("region") as string,
        });
    };

    const getProviderIcon = (provider: string) => {
        switch (provider) {
            case "aws": return <Cloud className="h-5 w-5 text-orange-500" />;
            case "azure": return <Cloud className="h-5 w-5 text-blue-500" />;
            case "gcp": return <Cloud className="h-5 w-5 text-green-500" />;
            default: return <Cloud className="h-5 w-5" />;
        }
    };

    const getStatusBadge = (status: string | null) => {
        switch (status) {
            case "connected":
                return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"><CheckCircle2 className="h-3 w-3 mr-1" />Connected</Badge>;
            case "error":
                return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Error</Badge>;
            default:
                return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
        }
    };

    const getAssetIcon = (type: string) => {
        switch (type) {
            case "ec2":
            case "vm":
            case "compute_instance":
                return <Server className="h-4 w-4 text-blue-500" />;
            case "s3":
            case "storage_account":
            case "gcs_bucket":
                return <Database className="h-4 w-4 text-purple-500" />;
            case "iam_user":
                return <Users className="h-4 w-4 text-orange-500" />;
            default:
                return <Cloud className="h-4 w-4" />;
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <Breadcrumb items={[{ label: "Admin" }, { label: "Cloud Integrations" }]} />

                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold">Cloud Integrations</h1>
                        <p className="text-muted-foreground">Connect AWS, Azure, or GCP to auto-discover assets</p>
                    </div>
                    <EnhancedDialog
                        open={isAddOpen}
                        onOpenChange={setIsAddOpen}
                        trigger={
                            <Button><Plus className="mr-2 h-4 w-4" />Add Connection</Button>
                        }
                        title="Add Cloud Connection"
                        description="Connect a cloud provider to discover compliance-relevant assets."
                        footer={
                            <div className="flex justify-end gap-2 w-full">
                                <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                                <Button
                                    onClick={(e) => {
                                        const form = document.getElementById('add-connection-form') as HTMLFormElement;
                                        if (form) form.requestSubmit();
                                    }}
                                    disabled={createMutation.isPending}
                                >
                                    {createMutation.isPending ? "Adding..." : "Add Connection"}
                                </Button>
                            </div>
                        }
                    >
                        <form id="add-connection-form" onSubmit={handleCreate}>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label>Client *</Label>
                                    <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select client" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {clients?.map((c) => (
                                                <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Provider *</Label>
                                    <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select provider" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="aws">Amazon Web Services (AWS)</SelectItem>
                                            <SelectItem value="azure">Microsoft Azure</SelectItem>
                                            <SelectItem value="gcp">Google Cloud Platform</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label>Connection Name *</Label>
                                    <Input name="name" placeholder="e.g. Production AWS Account" required />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Credentials (Access Key / Service Account JSON) *</Label>
                                    <Input name="credentials" type="password" placeholder="Enter credentials" required />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Region</Label>
                                    <Input name="region" placeholder="e.g. us-east-1" />
                                </div>
                            </div>
                        </form>
                    </EnhancedDialog>
                </div>

                <Tabs defaultValue="connections">
                    <TabsList>
                        <TabsTrigger value="connections">Connections</TabsTrigger>
                        <TabsTrigger value="assets">Discovered Assets</TabsTrigger>
                    </TabsList>

                    <TabsContent value="connections" className="mt-4">
                        <Card>
                            <div className="rounded-xl border border-slate-200 shadow-lg overflow-hidden bg-white">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-[#1C4D8D] hover:bg-[#1C4D8D] border-none">
                                            <TableHead className="text-white font-semibold py-4">Provider</TableHead>
                                            <TableHead className="text-white font-semibold py-4">Name</TableHead>
                                            <TableHead className="text-white font-semibold py-4">Client</TableHead>
                                            <TableHead className="text-white font-semibold py-4">Region</TableHead>
                                            <TableHead className="text-white font-semibold py-4">Status</TableHead>
                                            <TableHead className="text-white font-semibold py-4">Last Sync</TableHead>
                                            <TableHead className="w-32 text-white font-semibold py-4">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {connections?.map((conn) => (
                                            <TableRow key={conn.id} className="bg-white border-b border-slate-200 transition-all duration-200 hover:bg-slate-50 hover:shadow-sm group">
                                                <TableCell className="py-4">
                                                    <div className="flex items-center gap-2">
                                                        {getProviderIcon(conn.provider)}
                                                        <span className="uppercase font-medium text-black">{conn.provider}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-medium text-black py-4">{conn.name}</TableCell>
                                                <TableCell className="text-gray-600 py-4">{clients?.find(c => c.id === conn.clientId)?.name || '-'}</TableCell>
                                                <TableCell className="text-gray-500 py-4">{conn.region || '-'}</TableCell>
                                                <TableCell className="py-4">{getStatusBadge(conn.status)}</TableCell>
                                                <TableCell className="text-gray-500 py-4">{conn.lastSyncAt ? new Date(conn.lastSyncAt).toLocaleDateString() : 'Never'}</TableCell>
                                                <TableCell className="py-4">
                                                    <div className="flex gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="hover:bg-[#1C4D8D]/10 hover:text-[#1C4D8D] transition-colors duration-200"
                                                            onClick={() => testMutation.mutate({ id: conn.id })}
                                                            disabled={testMutation.isPending}
                                                        >
                                                            <CheckCircle2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="hover:bg-[#1C4D8D]/10 hover:text-[#1C4D8D] transition-colors duration-200"
                                                            onClick={() => syncMutation.mutate({ connectionId: conn.id })}
                                                            disabled={syncMutation.isPending}
                                                        >
                                                            <RefreshCw className={`h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors duration-200"
                                                            onClick={() => setConnectionToDelete(conn)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {(!connections || connections.length === 0) && (
                                            <TableRow>
                                                <TableCell colSpan={7} className="text-center py-8 text-gray-500 bg-white">
                                                    No cloud connections configured
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </Card>
                    </TabsContent>

                    <TabsContent value="assets" className="mt-4">
                        <AssetsTab />
                    </TabsContent>
                </Tabs>

                <AlertDialog open={!!connectionToDelete} onOpenChange={(open) => !open && setConnectionToDelete(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will permanently delete the cloud connection <b>{connectionToDelete?.name}</b>.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                className="bg-red-600 hover:bg-red-700"
                                onClick={() => {
                                    if (connectionToDelete) delteMutation.mutate({ id: connectionToDelete.id });
                                }}
                                disabled={deleteMutation.isPending}
                            >
                                {deleteMutation.isPending ? "Deleting..." : "Delete Connection"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </DashboardLayout>
    );
}

function AssetsTab() {
    const { data: assets } = trpc.cloudAssets.list.useQuery({});

    const getAssetIcon = (type: string) => {
        switch (type) {
            case "ec2":
            case "vm":
            case "compute_instance":
                return <Server className="h-4 w-4 text-blue-500" />;
            case "s3":
            case "storage_account":
            case "gcs_bucket":
                return <Database className="h-4 w-4 text-purple-500" />;
            case "iam_user":
                return <Users className="h-4 w-4 text-orange-500" />;
            default:
                return <Cloud className="h-4 w-4" />;
        }
    };

    return (
        <Card>
            <div className="rounded-xl border border-slate-200 shadow-lg overflow-hidden bg-white">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-[#1C4D8D] hover:bg-[#1C4D8D] border-none">
                            <TableHead className="text-white font-semibold py-4">Type</TableHead>
                            <TableHead className="text-white font-semibold py-4">Name</TableHead>
                            <TableHead className="text-white font-semibold py-4">Asset ID</TableHead>
                            <TableHead className="text-white font-semibold py-4">Region</TableHead>
                            <TableHead className="text-white font-semibold py-4">Compliance</TableHead>
                            <TableHead className="text-white font-semibold py-4">Last Scanned</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {assets?.map((asset) => (
                            <TableRow key={asset.id} className="bg-white border-b border-slate-200 transition-all duration-200 hover:bg-slate-50 hover:shadow-sm group">
                                <TableCell className="py-4">
                                    <div className="flex items-center gap-2">
                                        {getAssetIcon(asset.assetType)}
                                        <span className="uppercase text-xs text-black">{asset.assetType}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="font-medium text-black py-4">{asset.name}</TableCell>
                                <TableCell className="font-mono text-sm text-gray-600 py-4">{asset.assetId}</TableCell>
                                <TableCell className="text-gray-500 py-4">{asset.region}</TableCell>
                                <TableCell className="py-4">
                                    <Badge variant="secondary">{asset.complianceStatus}</Badge>
                                </TableCell>
                                <TableCell className="text-gray-500 py-4">{asset.lastScannedAt ? new Date(asset.lastScannedAt).toLocaleString() : '-'}</TableCell>
                            </TableRow>
                        ))}
                        {(!assets || assets.length === 0) && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-gray-500 bg-white">
                                    No assets discovered. Sync a cloud connection first.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </Card>
    );
}
