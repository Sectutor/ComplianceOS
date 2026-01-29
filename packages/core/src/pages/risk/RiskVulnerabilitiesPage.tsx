import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Bug, Plus, Search, Filter } from 'lucide-react';
import { useClientContext } from '@/contexts/ClientContext';
import { trpc } from '@/lib/trpc';
import { Button } from '@complianceos/ui/ui/button';
import { Input } from '@complianceos/ui/ui/input';
import { AddVulnerabilityDialog } from '@/components/risk/AddVulnerabilityDialog';

import { useParams, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';

export default function RiskVulnerabilitiesPage() {
    const params = useParams();
    const routeClientId = params.id ? Number(params.id) : null;
    const { user, client: authClient } = useAuth();
    const [location, setLocation] = useLocation();
    const [searchQuery, setSearchQuery] = useState('');

    // Determine effective client ID
    const effectiveClientId = routeClientId || authClient?.id;

    const { data: fetchedClient, isLoading: loadingClientDetails } = trpc.clients.get.useQuery(
        { id: effectiveClientId || 0 },
        { enabled: !!effectiveClientId && !authClient }
    );

    const client = authClient || fetchedClient;
    const clientId = client?.id || 0;

    const { data: vulnerabilities, isLoading, refetch } = trpc.risks.getVulnerabilities.useQuery(
        { clientId: clientId },
        { enabled: !!clientId }
    );

    const filteredVulns = vulnerabilities?.filter(v =>
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.vulnerabilityId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.cveId?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleOpenAddDialog = () => {
        setLocation(`/clients/${clientId}/risks/vulnerabilities/new`);
    };

    const handleEditVuln = (vuln: any) => {
        setLocation(`/clients/${clientId}/risks/vulnerabilities/${vuln.id}`);
    };

    return (
        <DashboardLayout>
            <div className="space-y-6 w-full max-w-full p-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Vulnerability Management</h1>
                        <p className="text-muted-foreground mt-1">Track and manage vulnerabilities across your assets.</p>
                    </div>
                    <Button onClick={handleOpenAddDialog} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Record Vulnerability
                    </Button>
                </div>

                <div className="flex gap-4 items-center bg-card p-4 rounded-xl border shadow-sm">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                            placeholder="Search vulnerabilities..."
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
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Name</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Severity</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">CVSS</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Affected Assets</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Discovery</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Owner</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Due Date</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {isLoading ? (
                                    <tr><td colSpan={9} className="p-8 text-center text-gray-500 bg-white">Loading vulnerabilities...</td></tr>
                                ) : filteredVulns?.length === 0 ? (
                                    <tr><td colSpan={9} className="p-8 text-center text-gray-500 bg-white">No vulnerabilities found.</td></tr>
                                ) : (
                                    filteredVulns?.map((vuln) => (
                                        <tr
                                            key={vuln.id}
                                            className="bg-white border-b border-slate-200 transition-all duration-200 hover:bg-slate-50 hover:shadow-sm cursor-pointer group"
                                            onDoubleClick={() => handleEditVuln(vuln)}
                                        >
                                            <td className="px-6 py-4 text-sm font-mono text-gray-500">{vuln.vulnerabilityId}</td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-black">{vuln.name}</div>
                                                {vuln.cveId && <div className="text-xs text-gray-500">{vuln.cveId}</div>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${vuln.severity === 'Critical' ? 'bg-red-50 text-red-700 border-red-200' :
                                                    vuln.severity === 'High' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                                        vuln.severity === 'Medium' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                                                            'bg-green-50 text-green-700 border-green-200'
                                                    }`}>
                                                    {vuln.severity || 'Unknown'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-bold text-gray-800">
                                                {vuln.cvssScore}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate" title={typeof vuln.affectedAssets === 'string' ? JSON.parse(vuln.affectedAssets).join(', ') : (vuln.affectedAssets as string[])?.join(', ')}>
                                                {typeof vuln.affectedAssets === 'string' ? JSON.parse(vuln.affectedAssets).join(', ') : (vuln.affectedAssets as string[])?.join(', ') || '-'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize border ${vuln.status === 'open' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                    vuln.status === 'remediated' ? 'bg-green-50 text-green-700 border-green-200' :
                                                        'bg-gray-50 text-gray-700 border-gray-200'
                                                    }`}>
                                                    {vuln.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {vuln.discoveryDate ? new Date(vuln.discoveryDate).toLocaleDateString() : '-'}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-gray-600">{vuln.owner || '-'}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {vuln.dueDate ? new Date(vuln.dueDate).toLocaleDateString() : '-'}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Vulnerability Editor Dialog removed since it's now a standalone page */}
        </DashboardLayout>
    );
}
