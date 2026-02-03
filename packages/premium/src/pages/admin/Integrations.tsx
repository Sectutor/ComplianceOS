
import React, { useState } from 'react';
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { toast } from "sonner";
import { Loader2, Plug, ExternalLink, Trash2, CheckCircle2, Settings } from "lucide-react";
import AdminLayout from "@/components/layouts/AdminLayout";
import { IntegrationIcon, getBrandConfig } from '@complianceos/ui/ui/IntegrationIcon';

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

export default function Integrations() {
    const [connectingProvider, setConnectingProvider] = useState<string | null>(null);
    const [disconnectProvider, setDisconnectProvider] = useState<string | null>(null);

    // Fetch data
    const availableQuery = trpc.integrations.listAvailable.useQuery();
    const activeQuery = trpc.integrations.listActive.useQuery({ clientId: 1 }); // Hardcoded generic clientId 1 for now or from context
    // Ideally clientId should come from context/auth

    // Mutations
    const getAuthUrlMutation = trpc.integrations.getAuthUrl.useMutation();
    const disconnectMutation = trpc.integrations.disconnect.useMutation({
        onSuccess: () => {
            activeQuery.refetch();
            toast.success("Disconnected", { description: "Integration removed successfully." });
        }
    });

    const handleConnect = async (provider: string) => {
        setConnectingProvider(provider);
        try {
            const { url } = await getAuthUrlMutation.mutateAsync({ clientId: 1, provider: provider as any });
            // Redirect to OAuth
            window.location.href = url;
        } catch (error: any) {
            toast.error("Connection Failed", {
                description: error.message || "Could not initiate connection."
            });
            setConnectingProvider(null);
        }
    };




    // Admin Mutation
    const configureMutation = trpc.integrations.configureProvider.useMutation({
        onSuccess: () => {
            toast.success("Configuration Saved", { description: "Provider settings updated successfully." });
            setEditingProvider(null);
            availableQuery.refetch();
        },
        onError: (err) => toast.error("Error", { description: err.message })
    });

    const [editingProvider, setEditingProvider] = useState<string | null>(null);

    const handleSaveConfig = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        configureMutation.mutate({
            provider: editingProvider || '',
            name: formData.get("name") as string,
            clientId: formData.get("clientId") as string,
            clientSecret: formData.get("clientSecret") as string,
            scopes: formData.get("scopes") as string,
            redirectUri: formData.get("redirectUri") as string,
        });
    };

    if (availableQuery.isLoading) {
        return (
            <AdminLayout>
                <div className="flex justify-center items-center h-96">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </AdminLayout>
        );
    }

    if (availableQuery.isError) {
        return (
            <AdminLayout>
                <div className="p-8 font-medium text-destructive">
                    <h2 className="text-xl font-bold mb-2">Error Loading Integrations</h2>
                    <p>{availableQuery.error.message}</p>
                    <p className="text-sm text-foreground mt-4">Tip: Ensure you have run <code>npm run db:push</code> to create the new database tables.</p>
                </div>
            </AdminLayout>
        );
    }

    const available = availableQuery.data || [];
    const active = activeQuery.data || [];

    // Helper to check status
    const getActiveConnection = (providerId: string) => active.find(a => a.provider === providerId);

    // Group by category
    const categories = Array.from(new Set(available.map(a => a.category)));

    return (
        <AdminLayout>
            <div className="space-y-8 p-6 mx-auto w-full">

                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Integrations Marketplace</h1>
                        <p className="text-muted-foreground mt-1">
                            Connect ComplianceOS with your existing tools to automate evidence collection.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {available.map(integration => {
                        const connection = getActiveConnection(integration.id);
                        const isConnected = !!connection;
                        const isConnecting = connectingProvider === integration.id;
                        const brand = getBrandConfig(integration.id);

                        return (
                            <div
                                key={integration.id}
                                className="relative group rounded-xl border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md hover:-translate-y-1 overflow-hidden"
                                style={{
                                    // Dynamic subtle glow on hover based on brand color
                                    borderColor: isConnected ? brand.color : undefined
                                }}
                            >
                                {/* Top Color Bar */}
                                <div className="absolute top-0 left-0 right-0 h-1.5 opacity-80" style={{ backgroundColor: brand.color }} />

                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <IntegrationIcon provider={integration.id} className="w-12 h-12 shadow-sm" />

                                        <div className="flex gap-2">
                                            {isConnected ? (
                                                <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">
                                                    <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                                                </Badge>
                                            ) : (
                                                integration.isComingSoon && <Badge variant="outline" className="text-muted-foreground">Soon</Badge>
                                            )}

                                            {/* Configure Button for Admins */}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setEditingProvider(integration.id)}
                                                className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Settings className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    <h3 className="font-semibold text-lg tracking-tight mb-1">{integration.name}</h3>
                                    <p className="text-sm text-muted-foreground line-clamp-2 h-10 mb-4 leading-relaxed">
                                        {integration.description}
                                    </p>

                                    <div className="mt-4 pt-4 border-t flex items-center justify-between">
                                        {isConnected ? (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10 -ml-2 h-8 px-3 text-xs"
                                                onClick={() => setDisconnectProvider(integration.id)}
                                            >
                                                Disconnect
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full justify-center group/btn border-dashed hover:border-solid hover:bg-primary/5 hover:text-primary transition-all rounded-lg"
                                                style={{ borderColor: isConnecting ? brand.color : undefined }}
                                                disabled={integration.isComingSoon || isConnecting}
                                                onClick={() => handleConnect(integration.id)}
                                            >
                                                {isConnecting ? (
                                                    <>
                                                        <Loader2 className="h-4 w-4 animate-spin mr-2" /> Connecting...
                                                    </>
                                                ) : (
                                                    <>
                                                        Connect <ExternalLink className="ml-2 h-3.5 w-3.5 opacity-50 group-hover/btn:opacity-100 transition-opacity" />
                                                    </>
                                                )}
                                            </Button>
                                        )}

                                        {isConnected && (
                                            <div className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                                Synced
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Configuration Modal */}
                {editingProvider && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                        <Card className="w-full max-w-lg bg-background shadow-2xl border-primary/20">
                            <CardHeader className="border-b bg-muted/50 pb-4">
                                <div className="flex items-center gap-3">
                                    <IntegrationIcon provider={editingProvider} className="w-10 h-10" />
                                    <div>
                                        <CardTitle>{available.find(a => a.id === editingProvider)?.name} Configuration</CardTitle>
                                        <CardDescription>Enter OAuth credentials to enable this provider.</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <form onSubmit={handleSaveConfig}>
                                <CardContent className="space-y-4 pt-6">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Display Name</label>
                                        <input className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" name="name" defaultValue={available.find(a => a.id === editingProvider)?.name} required />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Client ID</label>
                                            <input className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" name="clientId" required placeholder="From provider console" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Client Secret</label>
                                            <input className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" name="clientSecret" required type="password" placeholder="••••••••••••••" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Scopes (optional)</label>
                                        <input className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" name="scopes" placeholder="offline_access read:me ..." />
                                        <p className="text-[11px] text-muted-foreground">Space-separated list of scopes required.</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Redirect URI (optional)</label>
                                        <input className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" name="redirectUri" placeholder="Override default callback URL" />
                                    </div>
                                </CardContent>
                                <CardFooter className="flex justify-end gap-3 border-t bg-muted/50 pt-4">
                                    <Button variant="ghost" type="button" onClick={() => setEditingProvider(null)}>Cancel</Button>
                                    <Button type="submit" disabled={configureMutation.isLoading}>
                                        {configureMutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Save Configuration
                                    </Button>
                                </CardFooter>
                            </form>
                        </Card>
                    </div>
                )}

                <AlertDialog open={!!disconnectProvider} onOpenChange={(open) => !open && setDisconnectProvider(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will disconnect the integration. Automations relying on this connection may stop working.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                                onClick={() => {
                                    if (disconnectProvider) {
                                        disconnectMutation.mutateAsync({ clientId: 1, provider: disconnectProvider });
                                        setDisconnectProvider(null);
                                    }
                                }}
                            >
                                Disconnect
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </AdminLayout>
    );
}
