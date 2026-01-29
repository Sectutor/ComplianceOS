import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { AlertTriangle, Plus, Search, ArrowLeft } from 'lucide-react';
import { useClientContext } from '@/contexts/ClientContext';
import { trpc } from '@/lib/trpc';
import { Button } from '@complianceos/ui/ui/button';
import { Input } from '@complianceos/ui/ui/input';
import { AddThreatDialog } from '@/components/risk/AddThreatDialog';
import { Breadcrumb } from '@/components/Breadcrumb';

import { useParams, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';

export default function RiskThreatsPage() {
    const params = useParams();
    const routeClientId = params.id ? Number(params.id) : null;
    const { user } = useAuth();
    const [location, setLocation] = useLocation();
    const [searchQuery, setSearchQuery] = useState('');

    // Use Client Context for reliable state
    const { selectedClientId } = useClientContext();
    const effectiveClientId = routeClientId || selectedClientId;

    const { data: client, isLoading: loadingClientDetails } = trpc.clients.get.useQuery(
        { id: effectiveClientId || 0 },
        { enabled: !!effectiveClientId }
    );

    const clientId = client?.id || 0;

    const { data: threats, isLoading, refetch } = trpc.risks.getThreats.useQuery(
        { clientId },
        { enabled: !!clientId }
    );

    const filteredThreats = threats?.filter(t =>
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.threatId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleOpenAddDialog = () => {
        setLocation(`/clients/${clientId}/risks/threats/new`);
    };

    const handleEditThreat = (threat: any) => {
        setLocation(`/clients/${clientId}/risks/threats/${threat.id}`);
    };

    return (
        <DashboardLayout>
            <div className="space-y-6 w-full max-w-full p-6">
                <div className="mb-2">
                    <Breadcrumb
                        items={[
                            { label: "Clients", href: "/clients" },
                            { label: client?.name || "Client", href: `/clients/${clientId}` },
                            { label: "Risk Management", href: `/clients/${clientId}/risks` },
                            { label: "Threat Library", href: `/clients/${clientId}/risks/threats` },
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
                        <h1 className="text-2xl font-bold tracking-tight">Threat Library</h1>
                        <p className="text-muted-foreground mt-1">Manage standard threat scenarios and categories.</p>
                    </div>
                    <Button onClick={handleOpenAddDialog} className="bg-orange-600 hover:bg-orange-700 text-white">
                        <Plus className="w-4 h-4 mr-2" />
                        Record Threat
                    </Button>
                </div>

                <div className="flex gap-4 items-center bg-card p-4 rounded-xl border shadow-sm">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search threats..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead>
                                <tr className="bg-[#1C4D8D]">
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">ID</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Threat Name</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Category</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Source/Actor</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Likelihood</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Impact</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Owner</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Last Review</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {isLoading ? (
                                    <tr><td colSpan={9} className="p-8 text-center text-gray-500 bg-white">Loading threats...</td></tr>
                                ) : filteredThreats?.length === 0 ? (
                                    <tr><td colSpan={9} className="p-8 text-center text-gray-500 bg-white">No threats found.</td></tr>
                                ) : (
                                    filteredThreats?.map((threat) => (
                                        <tr
                                            key={threat.id}
                                            className="bg-white border-b border-slate-200 transition-all duration-200 hover:bg-slate-50 hover:shadow-sm cursor-pointer group"
                                            onDoubleClick={() => handleEditThreat(threat)}
                                        >
                                            <td className="px-6 py-4 text-sm font-mono text-gray-500">{threat.threatId}</td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-black">{threat.name}</div>
                                                <div className="text-xs text-gray-500 truncate max-w-[200px]" title={threat.description || ''}>{threat.description}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                                                    {threat.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {threat.source} <span className="text-gray-400 text-xs">({threat.intent})</span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {threat.likelihood}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate" title={threat.potentialImpact || ''}>
                                                {threat.potentialImpact || '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize border ${threat.status === 'active' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                                    threat.status === 'monitored' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                        'bg-gray-50 text-gray-700 border-gray-200'
                                                    }`}>
                                                    {threat.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{threat.owner || '-'}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {threat.lastReviewDate ? new Date(threat.lastReviewDate).toLocaleDateString() : '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Threat Editor Dialog removed since it's now a standalone page */}
        </DashboardLayout>
    );
}
