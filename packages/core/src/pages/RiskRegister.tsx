import React, { useState } from 'react';
import { useParams } from 'wouter';
import { trpc } from '../lib/trpc';
import { useAuth } from '../contexts/AuthContext';
import {
    Shield, AlertTriangle, Activity, Database, Plus, CheckCircle, XCircle, FileText
} from 'lucide-react';
import { RiskAssessmentWizard } from '../components/risk/RiskAssessmentWizard';
import { RiskTreatmentDialog } from '../components/risk/RiskTreatmentDialog';
import { AddAssetDialog } from '../components/risk/AddAssetDialog';
import DashboardLayout from '@/components/DashboardLayout';

// ... imports

export default function RiskRegister() {
    const params = useParams();
    const routeClientId = params.id ? Number(params.id) : null;
    const { user, client: authClient } = useAuth();

    // Determine effective client ID
    const effectiveClientId = routeClientId || authClient?.id;

    // Fetch client details if we don't have the object but have the ID (e.g. admin view)
    const { data: fetchedClient, isLoading: loadingClientDetails } = trpc.clients.get.useQuery(
        { id: effectiveClientId || 0 },
        { enabled: !!effectiveClientId && !authClient }
    );

    const client = authClient || fetchedClient;
    const clientId = client?.id || 0;

    const [activeTab, setActiveTab] = useState<'overview' | 'register' | 'assets'>('register');
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
    const [treatmentRiskId, setTreatmentRiskId] = useState<number | null>(null);
    const [selectedScenario, setSelectedScenario] = useState<any>(null);

    const { data: assets, isLoading: loadingAssets, refetch: refetchAssets } = trpc.risks.getAssets.useQuery(
        { clientId },
        { enabled: !!clientId }
    );

    const { data: scenarios, isLoading: loadingScenarios, refetch: refetchScenarios } = trpc.risks.getAssessments.useQuery(
        { clientId },
        { enabled: !!clientId }
    );

    const handleEditScenario = (scenario: any) => {
        setSelectedScenario(scenario);
        setIsWizardOpen(true);
    };

    if (loadingClientDetails) return <div className="p-8 text-center text-gray-500">Loading client data...</div>;
    if (!client) return <div className="p-8 text-center text-red-500">Client not found.</div>;

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/60 backdrop-blur-xl p-6 rounded-3xl border border-white/40 shadow-premium">
                    <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-[#3ABEF9] to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Shield className="h-7 w-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Risk Management</h1>
                            <p className="text-slate-500 font-medium mt-1">Identify, Assess, and Treat security risks according to ISO 27005.</p>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {activeTab === 'assets' ? (
                            <button
                                onClick={() => setIsAddAssetOpen(true)}
                                className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-[#3ABEF9] text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-blue-500/30 flex items-center gap-2 transition-all hover:-translate-y-0.5"
                            >
                                <Plus className="w-4 h-4" />
                                Add to Inventory
                            </button>
                        ) : (
                            <button
                                onClick={() => setActiveTab('assets')}
                                className="px-5 py-2.5 bg-white/80 border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-all hover:border-blue-200 hover:text-blue-600"
                            >
                                <Database className="w-4 h-4" />
                                Asset Inventory
                            </button>
                        )}

                        <button
                            onClick={() => {
                                setSelectedScenario(null);
                                setIsWizardOpen(true);
                            }}
                            className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 flex items-center gap-2 shadow-xl shadow-slate-900/20 transition-all hover:-translate-y-0.5"
                        >
                            <Shield className="w-4 h-4" />
                            Risk Assessment
                        </button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[
                        { label: 'Total Risks', value: scenarios?.length || 0, icon: Shield, color: 'blue' },
                        { label: 'High Risks', value: scenarios?.filter(s => (s.inherentScore || 0) >= 15).length || 0, icon: AlertTriangle, color: 'rose' },
                        { label: 'Mitigated', value: scenarios?.filter(s => s.status === 'treated').length || 0, icon: CheckCircle, color: 'emerald' },
                        { label: 'Critical Assets', value: assets?.filter(a => (a.valuationA || 0) >= 4).length || 0, icon: Database, color: 'purple' },
                    ].map((stat, i) => (
                        <div key={i} className="bg-white/60 backdrop-blur-xl p-5 rounded-3xl border border-white/40 shadow-premium flex items-center justify-between transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group">
                            <div>
                                <p className="text-[11px] text-slate-500 font-extrabold uppercase tracking-wide mb-1">{stat.label}</p>
                                <p className="text-4xl font-black text-slate-900">{stat.value}</p>
                            </div>
                            <div className={`p-4 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 shadow-inner group-hover:scale-110 transition-transform duration-300 ${stat.color === 'rose' && stat.value > 0 ? 'bg-rose-500 text-white shadow-rose-500/30' : ''}`}>
                                <stat.icon className="w-7 h-7" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Tabs */}
                <div className="bg-white/40 backdrop-blur-md p-1.5 rounded-2xl border border-white/60 inline-flex shadow-sm">
                    {[
                        { id: 'overview', label: 'Overview' },
                        { id: 'register', label: 'Risk Register' },
                        { id: 'assets', label: 'Asset Inventory' },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`
                                px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300
                                ${activeTab === tab.id
                                    ? 'bg-white text-[#5844ED] shadow-md border border-white/80'
                                    : 'text-slate-500 hover:bg-white/50 hover:text-slate-800 border border-transparent'}
                            `}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm min-h-[400px]">
                    {activeTab === 'register' && (
                        <RiskRegisterTable
                            scenarios={scenarios || []}
                            loading={loadingScenarios}
                            onTreat={(id) => setTreatmentRiskId(id)}
                            onEdit={handleEditScenario}
                        />
                    )}
                    {activeTab === 'assets' && (
                        <AssetInventoryTable assets={assets || []} loading={loadingAssets} />
                    )}
                    {activeTab === 'overview' && (
                        <div className="p-8 text-center text-gray-500 dark:text-slate-400">
                            <Activity className="w-12 h-12 mx-auto text-gray-300 dark:text-slate-700 mb-4" />
                            <p>Risk Dashboard and Heatmap visualization coming soon.</p>
                        </div>
                    )}
                </div>

                {client && (
                    <>
                        <RiskAssessmentWizard
                            open={isWizardOpen}
                            onOpenChange={(open) => {
                                setIsWizardOpen(open);
                                if (!open) setSelectedScenario(null);
                            }}
                            clientId={client.id}
                            initialData={selectedScenario}
                            onSuccess={() => {
                                refetchScenarios();
                            }}
                        />

                        {treatmentRiskId && (
                            <RiskTreatmentDialog
                                open={!!treatmentRiskId}
                                onOpenChange={(v) => !v && setTreatmentRiskId(null)}
                                riskId={treatmentRiskId}
                                clientId={client.id}
                                onSuccess={() => {
                                    refetchScenarios();
                                }}
                            />
                        )}

                        <AddAssetDialog
                            open={isAddAssetOpen}
                            onOpenChange={setIsAddAssetOpen}
                            clientId={client.id}
                            onSuccess={() => refetchAssets()}
                        />
                    </>
                )}
            </div>
        </DashboardLayout>
    );
}

function RiskRegisterTable({ scenarios, loading, onTreat, onEdit }: { scenarios: any[], loading: boolean, onTreat?: (id: number) => void, onEdit: (scenario: any) => void }) {
    if (loading) return <div className="p-8 text-center text-gray-500 dark:text-slate-400">Loading risks...</div>;
    if (scenarios.length === 0) return (
        <div className="p-12 text-center">
            <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-gray-400 dark:text-slate-500" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">No Risks Identified</h3>
            <p className="text-gray-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                Start by creating a new risk assessment to identify potential threats to your assets.
            </p>
        </div>
    );

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
                <thead className="bg-gray-50 dark:bg-slate-950">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Risk Scenarios</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Risk Source</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Threat & Vuln</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Inherent Score</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
                    {scenarios.map((risk) => (
                        <tr
                            key={risk.id}
                            className="hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            onDoubleClick={() => onEdit(risk)}
                        >
                            <td className="px-6 py-4">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">{risk.title}</div>
                                <div className="text-sm text-gray-500 dark:text-slate-400">{risk.threatDescription || risk.description}</div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-xs font-medium text-gray-700 dark:text-slate-300 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded inline-block">
                                    {risk.contextSnapshot?.source || 'Manual Assessment'}
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-xs text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 px-2 py-1 rounded inline-block mb-1">
                                    {risk.threatCategory || 'Uncategorized'}
                                </div>
                                <div className="text-sm text-gray-600 dark:text-slate-300">{risk.vulnerabilityDescription || risk.vulnerability}</div>
                            </td>
                            <td className="px-6 py-4">
                                <RiskScoreBadge score={risk.inherentScore || 0} />
                            </td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full
                  ${risk.status === 'treated' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                                        risk.status === 'analyzed' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-400'}
                `}>
                                    {risk.status?.toUpperCase()}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-right text-sm font-medium">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onTreat?.(risk.id);
                                    }}
                                    className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors"
                                >
                                    Treat Risk
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function AssetInventoryTable({ assets, loading }: { assets: any[], loading: boolean }) {
    if (loading) return <div className="p-8 text-center text-gray-500 dark:text-slate-400">Loading assets...</div>;
    if (assets.length === 0) return <div className="p-8 text-center text-gray-500 dark:text-slate-400">No assets found. Add items to your inventory.</div>;

    return (
        <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-800">
            <thead className="bg-gray-50 dark:bg-slate-950">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Asset Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">CIA Valuation</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider">Owner</th>
                </tr>
            </thead>
            <tbody className="bg-white dark:bg-slate-900 divide-y divide-gray-200 dark:divide-slate-800">
                {assets.map((asset) => (
                    <tr key={asset.id}>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">{asset.name}</td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">{asset.type}</td>
                        <td className="px-6 py-4 flex gap-1">
                            <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 text-xs rounded border border-gray-200 dark:border-slate-700" title="Confidentiality">C:{asset.valuationC}</span>
                            <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 text-xs rounded border border-gray-200 dark:border-slate-700" title="Integrity">I:{asset.valuationI}</span>
                            <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 text-xs rounded border border-gray-200 dark:border-slate-700" title="Availability">A:{asset.valuationA}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-slate-400">{asset.owner || '-'}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function RiskScoreBadge({ score }: { score: number }) {
    let color = 'bg-green-100 text-green-800 border-green-200';
    let label = 'Low';

    if (score >= 15) {
        color = 'bg-red-100 text-red-800 border-red-200';
        label = 'Critical';
    } else if (score >= 10) {
        color = 'bg-orange-100 text-orange-800 border-orange-200';
        label = 'High';
    } else if (score >= 5) {
        color = 'bg-yellow-100 text-yellow-800 border-yellow-200';
        label = 'Medium';
    }

    return (
        <div className={`flex items-center gap-2 w-fit px-2 py-1 rounded-md border ${color}`}>
            <span className="font-bold text-xs">{score}</span>
            <span className="text-xs font-medium border-l border-current pl-2 opacity-75">{label}</span>
        </div>
    );
}
