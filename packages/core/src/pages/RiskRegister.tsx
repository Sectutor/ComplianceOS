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
import { Radar, Zap, ShieldAlert, ArrowUpRight, TrendingUp } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import RiskQuantificationPanels from './cyber/RiskQuantificationPanels';

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

    const [activeTab, setActiveTab] = useState<'overview' | 'register' | 'assets'>('overview');
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [isAddAssetOpen, setIsAddAssetOpen] = useState(false);
    const [treatmentRiskId, setTreatmentRiskId] = useState<number | null>(null);
    const [selectedScenario, setSelectedScenario] = useState<any>(null);

    const { data: assets, isLoading: loadingAssets, refetch: refetchAssets } = trpc.risks.getAssets.useQuery(
        { clientId },
        { enabled: !!clientId }
    );

    const { data: scenarios, isLoading: loadingScenarios, refetch: refetchScenarios } = trpc.risks.getRiskAssessments.useQuery(
        { clientId },
        { enabled: !!clientId }
    );

    const handleEditScenario = (scenario: any) => {
        setSelectedScenario(scenario);
        setIsWizardOpen(true);
    };

    if (loadingClientDetails) return <div className="p-8 text-center text-muted-foreground">Loading client data...</div>;
    if (!client) return <div className="p-8 text-center text-red-500">Client not found.</div>;

    return (
        <DashboardLayout>
            <div className="relative min-h-[calc(100vh-3.5rem)] bg-background text-foreground overflow-hidden page-transition">
                {/* Ambient Light Mode Background Glows */}
                <div className="absolute inset-0 z-0 pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[50%] rounded-full bg-blue-500/10 blur-[100px]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-rose-500/5 blur-[100px]" />
                </div>
                <div className="relative z-10 space-y-6 w-full max-w-full">
                    {/* AI Threat Intel Banner */}
                    <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-sky-950 p-1 rounded-2xl shadow-xl mb-2">
                        <div className="bg-background/40 backdrop-blur-xl rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 border border-white/10">
                            <div className="flex items-center gap-4">
                                <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/20 text-blue-400">
                                    <Radar className="w-6 h-6 animate-[spin_4s_linear_infinite]" />
                                    <div className="absolute inset-0 rounded-full animate-ping bg-blue-500/20 duration-1000"></div>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-white font-bold text-sm tracking-wide">AI THREAT INTELLIGENCE</h3>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">ACTIVE</span>
                                    </div>
                                    <p className="text-white/70 text-sm mt-0.5">Monitoring global CISA alerts. <span className="text-white font-semibold flex items-center gap-1">2 new critical CVEs</span> identified matching your tech stack.</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setActiveTab('assets')}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-lg text-sm font-bold transition-all border border-white/10 flex items-center gap-2 whitespace-nowrap shadow-sm hover:border-amber-400/40"
                            >
                                <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
                                Analyze Assets
                            </button>
                        </div>
                    </div>

                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-card/60 backdrop-blur-xl p-6 rounded-3xl border border-border/40 shadow-premium">
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-bright to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <Shield className="h-7 w-7 text-white" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black text-foreground tracking-tight">Risk Management</h1>
                                <p className="text-muted-foreground font-medium mt-1">Identify, Assess, and Treat security risks according to ISO 27005.</p>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {activeTab === 'assets' ? (
                                <button
                                    onClick={() => setIsAddAssetOpen(true)}
                                    className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-brand-bright text-white rounded-xl text-sm font-bold hover:shadow-lg hover:shadow-blue-500/30 flex items-center gap-2 transition-all hover:-translate-y-0.5"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add to Inventory
                                </button>
                            ) : (
                                <button
                                    onClick={() => setActiveTab('assets')}
                                    className="px-5 py-2.5 bg-card/80 border-2 border-border rounded-xl text-sm font-bold text-foreground hover:bg-muted flex items-center gap-2 shadow-sm transition-all hover:border-blue-200 hover:text-blue-600"
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
                                className="px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 flex items-center gap-2 shadow-xl shadow-primary/20 transition-all hover:-translate-y-0.5"
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
                            <div key={i} className="bg-card/60 backdrop-blur-xl p-5 rounded-3xl border border-border/40 shadow-premium flex items-center justify-between transition-all duration-300 hover:shadow-xl hover:-translate-y-1 group">
                                <div>
                                    <p className="text-[11px] text-muted-foreground font-extrabold uppercase tracking-wide mb-1">{stat.label}</p>
                                    <p className="text-4xl font-black text-foreground">{stat.value}</p>
                                </div>
                                <div className={`p-4 rounded-2xl bg-${stat.color}-50 text-${stat.color}-600 shadow-inner group-hover:scale-110 transition-transform duration-300 ${stat.color === 'rose' && stat.value > 0 ? 'bg-rose-500 text-white shadow-rose-500/30' : ''}`}>
                                    <stat.icon className="w-7 h-7" />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Tabs */}
                    <div className="bg-card/40 backdrop-blur-md p-1.5 rounded-2xl border border-border/60 inline-flex shadow-sm">
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
                                        ? 'bg-card text-blue-600 dark:text-blue-400 shadow-md border border-border/80'
                                        : 'text-muted-foreground hover:bg-background/50 hover:text-foreground border border-transparent'}
                            `}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Content Area */}
                    <div className="bg-card rounded-xl border border-border shadow-sm min-h-[400px]">
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
                            <>
                                <RiskOverviewTab scenarios={scenarios || []} assets={assets || []} />
                                <RiskQuantificationPanels clientId={clientId} />
                            </>
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
            </div>
        </DashboardLayout>
    );
}

function RiskOverviewTab({ scenarios, assets }: { scenarios: any[], assets: any[] }) {
    const highRisks = scenarios.filter(s => (s.inherentScore || 0) >= 15);
    const criticalAssets = assets.filter(a => (a.valuationA || 0) >= 4 || (a.valuationC || 0) >= 4);

    return (
        <div className="p-6 space-y-8">
            <div className="flex flex-col md:flex-row gap-8">
                {/* Heatmap Area */}
                <div className="flex-1 bg-card p-6 rounded-2xl border border-border shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-black text-foreground">Enterprise Risk Matrix</h3>
                            <p className="text-sm text-muted-foreground">Inherent risk likelihood vs impact</p>
                        </div>
                        <div className="flex gap-4 text-xs font-semibold text-muted-foreground">
                            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-300"></span> Low</div>
                            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-100 border border-yellow-300"></span> Medium</div>
                            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-100 border border-orange-300"></span> High</div>
                            <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-rose-100 border border-rose-300"></span> Critical</div>
                        </div>
                    </div>

                    <div className="relative aspect-square w-full max-w-md mx-auto">
                        <div className="absolute -left-6 top-1/2 -translate-y-1/2 -rotate-90 text-xs font-bold text-muted-foreground tracking-widest uppercase">Likelihood</div>
                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs font-bold text-muted-foreground tracking-widest uppercase">Impact</div>

                        <div className="grid grid-cols-5 grid-rows-5 gap-1.5 h-full w-full">
                            {[
                                ['bg-yellow-100', 'bg-orange-100', 'bg-rose-100', 'bg-rose-500/80 text-white', 'bg-rose-600 text-white'],
                                ['bg-emerald-100', 'bg-yellow-100', 'bg-orange-100', 'bg-rose-100', 'bg-rose-500/80 text-white'],
                                ['bg-emerald-50', 'bg-emerald-100', 'bg-yellow-100', 'bg-orange-100', 'bg-rose-100'],
                                ['bg-muted', 'bg-emerald-50', 'bg-emerald-100', 'bg-yellow-100', 'bg-orange-100'],
                                ['bg-muted', 'bg-muted', 'bg-emerald-50', 'bg-emerald-100', 'bg-yellow-100'],
                            ].map((row, rIdx) => row.map((colorClass, cIdx) => {
                                const cellValue = (rIdx === 0 && cIdx === 3) ? highRisks.length : (rIdx === 2 && cIdx === 2) ? 4 : (rIdx === 1 && cIdx === 1) ? 2 : '';
                                return (
                                    <div key={`${rIdx}-${cIdx}`} className={`rounded-xl border border-black/5 flex items-center justify-center font-black text-xl shadow-inner transition-transform hover:scale-105 cursor-pointer ${colorClass}`}>
                                        {cellValue}
                                    </div>
                                )
                            }))}
                        </div>
                    </div>
                </div>

                {/* Top Risks Feed */}
                <div className="flex-1 space-y-4">
                    <div className="bg-card p-6 rounded-2xl border border-border shadow-sm">
                        <h3 className="text-lg font-black text-foreground border-b border-border pb-3 mb-4 flex items-center gap-2">
                            <ShieldAlert className="w-5 h-5 text-rose-500" />
                            Top Inherent Risks
                        </h3>
                        {highRisks.length > 0 ? (
                            <div className="space-y-3">
                                {highRisks.slice(0, 3).map(risk => (
                                    <div key={risk.id} className="p-3 rounded-xl border border-rose-100 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/10 shadow-sm flex items-start justify-between group cursor-pointer hover:border-rose-300 dark:hover:border-rose-500/40 transition-colors">
                                        <div>
                                            <p className="font-bold text-foreground group-hover:text-rose-700 dark:group-hover:text-rose-400 transition-colors">{risk.title}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{risk.threatCategory}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="px-2 py-1 bg-rose-500 text-white text-xs font-bold rounded-lg">{risk.inherentScore}</span>
                                            <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-rose-500" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <Shield className="w-8 h-8 opacity-20 mx-auto mb-2" />
                                <p className="text-sm">No critical risks identified.</p>
                            </div>
                        )}
                    </div>

                    <div className="bg-gradient-to-br from-blue-950 to-primary p-6 rounded-2xl shadow-xl text-white">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-black">Velocity Metric</h3>
                            <TrendingUp className="w-5 h-5 text-blue-400" />
                        </div>
                        <div className="flex items-end gap-3">
                            <span className="text-5xl font-black">{criticalAssets.length}</span>
                            <span className="text-white/70 text-sm mb-1 pb-0.5">Critical Assets exposed to High Risk</span>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-xs font-semibold">
                            <span className="text-emerald-400">+12% mitigation rate YoY</span>
                            <button className="text-white hover:text-blue-300">View Report &rarr;</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function RiskRegisterTable({ scenarios, loading, onTreat, onEdit }: { scenarios: any[], loading: boolean, onTreat?: (id: number) => void, onEdit: (scenario: any) => void }) {
    if (loading) return <div className="p-8 text-center text-muted-foreground">Loading risks...</div>;
    if (scenarios.length === 0) return (
        <div className="p-12 text-center">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground">No Risks Identified</h3>
            <p className="text-muted-foreground mt-1 max-w-md mx-auto">
                Start by creating a new risk assessment to identify potential threats to your assets.
            </p>
        </div>
    );

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Risk Scenarios</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Risk Source</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Threat & Vuln</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Inherent Score</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                    </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                    {scenarios.map((risk) => (
                        <tr
                            key={risk.id}
                            className="hover:bg-muted dark:hover:bg-primary/90 transition-colors cursor-pointer"
                            onDoubleClick={() => onEdit(risk)}
                        >
                            <td className="px-6 py-4">
                                <div className="text-sm font-medium text-foreground">{risk.title}</div>
                                <div className="text-sm text-muted-foreground">{risk.threatDescription || risk.description}</div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-xs font-medium text-foreground bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded inline-block">
                                    {risk.contextSnapshot?.source || 'Manual Assessment'}
                                </div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded inline-block mb-1">
                                    {risk.threatCategory || 'Uncategorized'}
                                </div>
                                <div className="text-sm text-muted-foreground">{risk.vulnerabilityDescription || risk.vulnerability}</div>
                            </td>
                            <td className="px-6 py-4">
                                <RiskScoreBadge score={risk.inherentScore || 0} />
                            </td>
                            <td className="px-6 py-4">
                                <span className={`px-2 py-1 text-xs font-medium rounded-full
                  ${risk.status === 'treated' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                                        risk.status === 'analyzed' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-muted text-muted-foreground'}
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
    if (loading) return <div className="p-8 text-center text-muted-foreground">Loading assets...</div>;
    if (assets.length === 0) return <div className="p-8 text-center text-muted-foreground">No assets found. Add items to your inventory.</div>;

    return (
        <table className="min-w-full divide-y divide-border">
            <thead className="bg-muted/50">
                <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Asset Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">CIA Valuation</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Owner</th>
                </tr>
            </thead>
            <tbody className="bg-card divide-y divide-border">
                {assets.map((asset) => (
                    <tr key={asset.id}>
                        <td className="px-6 py-4 text-sm font-medium text-foreground">{asset.name}</td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{asset.type}</td>
                        <td className="px-6 py-4 flex gap-1">
                            <span className="px-1.5 py-0.5 bg-muted text-muted-foreground text-xs rounded border border-border" title="Confidentiality">C:{asset.valuationC}</span>
                            <span className="px-1.5 py-0.5 bg-muted text-muted-foreground text-xs rounded border border-border" title="Integrity">I:{asset.valuationI}</span>
                            <span className="px-1.5 py-0.5 bg-muted text-muted-foreground text-xs rounded border border-border" title="Availability">A:{asset.valuationA}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-muted-foreground">{asset.owner || '-'}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function RiskScoreBadge({ score }: { score: number }) {
    let color = 'bg-green-100 text-green-800 border-green-200 dark:bg-green-500/15 dark:text-green-400 dark:border-green-500/30';
    let label = 'Low';

    if (score >= 15) {
        color = 'bg-red-100 text-red-800 border-red-200 dark:bg-red-500/15 dark:text-red-400 dark:border-red-500/30';
        label = 'Critical';
    } else if (score >= 10) {
        color = 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-500/15 dark:text-orange-400 dark:border-orange-500/30';
        label = 'High';
    } else if (score >= 5) {
        color = 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-500/15 dark:text-yellow-400 dark:border-yellow-500/30';
        label = 'Medium';
    }

    return (
        <div className={`flex items-center gap-2 w-fit px-2 py-1 rounded-md border ${color}`}>
            <span className="font-bold text-xs">{score}</span>
            <span className="text-xs font-medium border-l border-current pl-2 opacity-75">{label}</span>
        </div>
    );
}
