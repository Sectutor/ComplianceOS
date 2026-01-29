import React, { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Database, Search, ArrowLeft } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { AddAssetDialog } from '@/components/risk/AddAssetDialog';
import { Button } from '@complianceos/ui/ui/button';
import { Breadcrumb } from '@/components/Breadcrumb';

export default function RiskAssetsPage() {
    const params = useParams();
    const routeClientId = params.id ? Number(params.id) : null;
    const { user, client: authClient } = useAuth();

    // Determine effective client ID
    const effectiveClientId = routeClientId || authClient?.id;

    const { data: fetchedClient, isLoading: loadingClientDetails } = trpc.clients.get.useQuery(
        { id: effectiveClientId || 0 },
        { enabled: !!effectiveClientId && !authClient }
    );

    const client = authClient || fetchedClient;
    const clientId = client?.id || 0;

    const [location, setLocation] = useLocation();

    const { data: assets, isLoading: loadingAssets, refetch: refetchAssets } = trpc.risks.getAssets.useQuery(
        { clientId },
        { enabled: !!clientId }
    );

    const handleOpenAddDialog = () => {
        setLocation(`/clients/${clientId}/risks/assets/new`);
    };

    const handleEditAsset = (asset: any) => {
        setLocation(`/clients/${clientId}/risks/assets/${asset.id}`);
    };

    if (loadingClientDetails) return (
        <DashboardLayout>
            <div className="p-8 text-center text-muted-foreground">Loading client data...</div>
        </DashboardLayout>
    );

    if (!client) return (
        <DashboardLayout>
            <div className="p-8 text-center text-destructive">Client not found.</div>
        </DashboardLayout>
    );

    return (
        <DashboardLayout>
            <div className="space-y-6 w-full max-w-full p-6">
                <div className="mb-2">
                    <Breadcrumb
                        items={[
                            { label: "Clients", href: "/clients" },
                            { label: client?.name || "Client", href: `/clients/${clientId}` },
                            { label: "Risk Management", href: `/clients/${clientId}/risks` },
                            { label: "Asset Inventory", href: `/clients/${clientId}/risks/assets` },
                        ]}
                    />
                    <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 -ml-3 text-muted-foreground hover:text-foreground"
                        onClick={() => setLocation(`/clients/${clientId}/risks`)}
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to Risk Dashboard
                    </Button>
                </div>
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Asset Inventory</h1>
                        <p className="text-muted-foreground mt-1">Manage your organization's assets and their valuations.</p>
                    </div>
                    <button
                        onClick={handleOpenAddDialog}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-colors"
                    >
                        <Plus className="w-4 h-4" />
                        Add Asset
                    </button>
                </div>

                <div className="bg-card rounded-xl border shadow-sm min-h-[400px]">
                    <AssetInventoryTable assets={assets || []} loading={loadingAssets} onEdit={handleEditAsset} />
                </div>

                {/* Asset Editor Dialog removed since it's now a standalone page */}
            </div>
        </DashboardLayout>
    );
}

function AssetInventoryTable({ assets, loading, onEdit }: { assets: any[], loading: boolean, onEdit: (asset: any) => void }) {
    if (loading) return <div className="p-8 text-center text-muted-foreground">Loading assets...</div>;
    if (assets.length === 0) return (
        <div className="p-12 text-center">
            <div className="w-16 h-16 bg-secondary rounded-full flex items-center justify-center mx-auto mb-4">
                <Database className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">No Assets Found</h3>
            <p className="text-muted-foreground mt-1 max-w-md mx-auto">
                Start by adding assets to your inventory to begin risk assessment.
            </p>
        </div>
    );

    return (
        <div className="rounded-xl border border-slate-200 shadow-lg overflow-hidden bg-white">
            <div className="overflow-x-auto">
                <table className="min-w-full">
                    <thead>
                        <tr className="bg-[#1C4D8D]">
                            <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Asset ID</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Asset Name</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Type/Category</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Description</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Owner</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Location</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Status</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Acquisition Date</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Last Review</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Associated Risks</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">CIA Valuation</th>
                        </tr>
                    </thead>
                    <tbody>
                        {assets.map((asset) => (
                            <tr
                                key={asset.id}
                                className="bg-white border-b border-slate-200 transition-all duration-200 hover:bg-slate-50 hover:shadow-sm cursor-pointer group"
                                onDoubleClick={() => onEdit(asset)}
                            >
                                <td className="px-6 py-4 text-sm font-mono text-gray-500">#{asset.id}</td>
                                <td className="px-6 py-4 text-sm font-medium text-black">{asset.name}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">{asset.type}</td>
                                <td className="px-6 py-4 text-sm text-gray-500 max-w-[200px] truncate" title={asset.description}>{asset.description || '-'}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">{asset.owner || '-'}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{asset.location || '-'}</td>
                                <td className="px-6 py-4 text-sm">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${asset.status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                                        asset.status === 'archived' ? 'bg-gray-50 text-gray-700 border-gray-200' :
                                            'bg-red-50 text-red-700 border-red-200'
                                        }`}>
                                        {asset.status ? asset.status.charAt(0).toUpperCase() + asset.status.slice(1) : 'Active'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {asset.acquisitionDate ? new Date(asset.acquisitionDate).toLocaleDateString() : '-'}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {asset.lastReviewDate ? new Date(asset.lastReviewDate).toLocaleDateString() : '-'}
                                </td>
                                <td className="px-6 py-4 text-sm">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                        {asset.riskCount || 0} Risks
                                    </span>
                                </td>
                                <td className="px-6 py-4 flex gap-1">
                                    <span className="px-1.5 py-0.5 bg-white text-xs rounded border border-gray-300 text-gray-700" title="Confidentiality">C:{asset.valuationC}</span>
                                    <span className="px-1.5 py-0.5 bg-white text-xs rounded border border-gray-300 text-gray-700" title="Integrity">I:{asset.valuationI}</span>
                                    <span className="px-1.5 py-0.5 bg-white text-xs rounded border border-gray-300 text-gray-700" title="Availability">A:{asset.valuationA}</span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
