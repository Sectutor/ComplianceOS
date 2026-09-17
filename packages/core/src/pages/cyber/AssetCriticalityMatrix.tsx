import React, { useState } from 'react';
import { useParams, Link } from 'wouter';
import DashboardLayout from '@/components/DashboardLayout';
import { PageGuide } from '@/components/PageGuide';
import { Button } from '@complianceos/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@complianceos/ui/ui/card';
import { Badge } from '@complianceos/ui/ui/badge';
import {
    Server,
    Shield,
    ShieldLock,
    ShieldCheck,
    AlertCircle,
    Info,
    Search,
    Filter,
    ArrowUpDown,
    Save,
    RefreshCw,
    HardDrive,
    Database,
    Users,
    Network,
    Terminal,
    ChevronRight,
    Lock,
    Eye,
    Zap,
    Scale
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";
import { Slider } from "@complianceos/ui/ui/slider";
import { Input } from "@complianceos/ui/ui/input";

export function AssetCriticalityMatrix() {
    const params = useParams();
    const clientId = parseInt(params.id || '0');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAssetId, setSelectedAssetId] = useState<number | null>(null);

    const utils = trpc.useUtils();

    // Fetch assets
    const { data: assets, isLoading } = trpc.assets.list.useQuery(
        { clientId },
        { enabled: !!clientId }
    );

    // Update mutation
    const updateAsset = trpc.assets.update.useMutation({
        onSuccess: () => {
            toast.success('Asset criticality updated');
            utils.assets.list.invalidate();
        },
        onError: (err) => toast.error(err.message)
    });

    const filteredAssets = assets?.filter(a => 
        a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedAsset = assets?.find(a => a.id === selectedAssetId);

    const handleValuationChange = (field: 'valuationC' | 'valuationI' | 'valuationA', value: number[]) => {
        if (!selectedAssetId) return;
        updateAsset.mutate({
            clientId,
            id: selectedAssetId,
            [field]: value[0]
        });
    };

    const getCriticalityLevel = (c: number, i: number, a: number) => {
        const score = (c + i + a) / 3;
        if (score >= 4.5) return { label: 'Extremely Critical', color: 'bg-rose-600', text: 'text-rose-600', bg: 'bg-rose-50' };
        if (score >= 3.5) return { label: 'High Criticality', color: 'bg-orange-500', text: 'text-orange-600', bg: 'bg-orange-50' };
        if (score >= 2.5) return { label: 'Medium Criticality', color: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50' };
        return { label: 'Standard Asset', color: 'bg-slate-400', text: 'text-slate-500', bg: 'bg-slate-50' };
    };

    const getIcon = (type: string) => {
        const t = type.toLowerCase();
        if (t.includes('server') || t.includes('hardware')) return <Server className="w-4 h-4" />;
        if (t.includes('data') || t.includes('info')) return <Database className="w-4 h-4" />;
        if (t.includes('people')) return <Users className="w-4 h-4" />;
        if (t.includes('network')) return <Network className="w-4 h-4" />;
        return <Terminal className="w-4 h-4" />;
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1">
                    <Link href={`/clients/${clientId}/cyber`} className="text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-sky-600 transition-colors flex items-center gap-2 mb-2">
                         <Server className="w-3 h-3" /> Cyber Resilience Dashboard
                    </Link>
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 flex items-center gap-3">
                        Asset Criticality Matrix
                        <Badge className="bg-slate-900 text-white border-none font-black text-[10px] tracking-widest px-3 py-1">
                            NIS2 SYSTEMIC TRACKING
                        </Badge>
                    </h1>
                    <p className="text-slate-500 font-medium text-lg leading-relaxed">
                        Identify and categorize essential ICT assets based on CIA valuation to prioritize protective measures.
                    </p>
                </div>
                <PageGuide
                    title="Asset Criticality Scoring"
                    description="The criticality matrix helps you identify 'Essential' and 'Important' systems as defined by NIS2."
                    rationale="Article 21 requires a risk-based approach. You cannot protect everything equally; prioritizing assets based on their impact on service continuity is vital."
                    howToUse={[
                        {
                            step: "Confidentiality (C)",
                            description: "Scale of 1-5: How much damage if unauthorized parties access this data/asset?",
                            targetId: "cia-sliders"
                        },
                        {
                            step: "Integrity (I)",
                            description: "Scale of 1-5: How harmful is it if this information or system is manipulated?",
                            targetId: "cia-sliders"
                        },
                        {
                            step: "Availability (A)",
                            description: "Scale of 1-5: Impact on service delivery if this asset is offline?",
                            targetId: "cia-sliders"
                        }
                    ]}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Asset List */}
                <div className="lg:col-span-7 space-y-6">
                    <Card className="border-none shadow-xl shadow-slate-200/50 rounded-3xl bg-white ring-1 ring-slate-100 overflow-hidden">
                        <CardHeader className="p-8 pb-4 border-b border-slate-50">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-xl font-black text-slate-900 flex items-center gap-2">
                                    <Layers className="w-5 h-5 text-indigo-500" />
                                    ICT Asset Inventory
                                </CardTitle>
                                <div className="relative w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input 
                                        placeholder="Search assets..." 
                                        className="pl-10 h-10 rounded-xl bg-slate-50 border-none text-sm ring-0 focus-visible:ring-2 focus-visible:ring-indigo-500/20"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="max-h-[600px] overflow-y-auto">
                                {filteredAssets?.map((asset) => {
                                    const crit = getCriticalityLevel(asset.valuationC || 3, asset.valuationI || 3, asset.valuationA || 3);
                                    return (
                                        <div 
                                            key={asset.id}
                                            onClick={() => setSelectedAssetId(asset.id)}
                                            className={cn(
                                                "p-6 flex items-center justify-between border-b border-slate-50 cursor-pointer transition-all hover:bg-slate-50/80",
                                                selectedAssetId === asset.id ? "bg-indigo-50/50 border-indigo-100" : ""
                                            )}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={cn(
                                                    "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm",
                                                    selectedAssetId === asset.id ? "bg-white text-indigo-600 scale-110" : "bg-slate-50 text-slate-400"
                                                )}>
                                                    {getIcon(asset.type)}
                                                </div>
                                                <div>
                                                    <h3 className="font-black text-slate-900 text-sm">{asset.name}</h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{asset.type}</span>
                                                        <span className="text-slate-300">•</span>
                                                        <Badge variant="outline" className={cn("text-[8px] font-black tracking-widest border-none px-2", crit.bg, crit.text)}>
                                                            {crit.label}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[9px] font-bold text-slate-400">C{asset.valuationC}</span>
                                                    <span className="text-[9px] font-bold text-slate-400">I{asset.valuationI}</span>
                                                    <span className="text-[9px] font-bold text-slate-400">A{asset.valuationA}</span>
                                                </div>
                                                <ChevronRight className={cn(
                                                    "w-4 h-4 transition-transform",
                                                    selectedAssetId === asset.id ? "text-indigo-600 translate-x-1" : "text-slate-300"
                                                )} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Scoring Panel */}
                <div className="lg:col-span-5 space-y-6">
                    {selectedAsset ? (
                        <Card id="cia-sliders" className="border-none shadow-2xl shadow-indigo-200/50 rounded-[2.5rem] bg-white ring-1 ring-slate-100 overflow-hidden sticky top-8">
                             <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 to-sky-500" />
                             <CardHeader className="p-10 pb-6">
                                <CardTitle className="text-2xl font-black text-slate-900">Valuation Workshop</CardTitle>
                                <CardDescription className="font-medium text-slate-500">Assess the systemic impact of <strong>{selectedAsset.name}</strong></CardDescription>
                             </CardHeader>
                             <CardContent className="p-10 pt-0 space-y-10">
                                {/* CIA Sliders */}
                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-black text-xs">C</div>
                                                <label className="text-xs font-black uppercase tracking-widest text-slate-700">Confidentiality</label>
                                            </div>
                                            <span className="text-lg font-black text-slate-900">{selectedAsset.valuationC || 3}</span>
                                        </div>
                                        <Slider 
                                            defaultValue={[selectedAsset.valuationC || 3]} 
                                            max={5} 
                                            min={1} 
                                            step={1} 
                                            onValueChange={(v) => handleValuationChange('valuationC', v)}
                                            className="[&_[role=slider]]:bg-rose-600"
                                        />
                                        <p className="text-[10px] text-slate-400 font-medium italic">Impact of unauthorized information disclosure.</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xs">I</div>
                                                <label className="text-xs font-black uppercase tracking-widest text-slate-700">Integrity</label>
                                            </div>
                                            <span className="text-lg font-black text-slate-900">{selectedAsset.valuationI || 3}</span>
                                        </div>
                                        <Slider 
                                            defaultValue={[selectedAsset.valuationI || 3]} 
                                            max={5} 
                                            min={1} 
                                            step={1} 
                                            onValueChange={(v) => handleValuationChange('valuationI', v)}
                                            className="[&_[role=slider]]:bg-emerald-600"
                                        />
                                        <p className="text-[10px] text-slate-400 font-medium italic">Damage if data is modified or system state is altered.</p>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center font-black text-xs">A</div>
                                                <label className="text-xs font-black uppercase tracking-widest text-slate-700">Availability</label>
                                            </div>
                                            <span className="text-lg font-black text-slate-900">{selectedAsset.valuationA || 3}</span>
                                        </div>
                                        <Slider 
                                            defaultValue={[selectedAsset.valuationA || 3]} 
                                            max={5} 
                                            min={1} 
                                            step={1} 
                                            onValueChange={(v) => handleValuationChange('valuationA', v)}
                                            className="[&_[role=slider]]:bg-sky-600"
                                        />
                                        <p className="text-[10px] text-slate-400 font-medium italic">Cost of downtime and service disruption.</p>
                                    </div>
                                </div>

                                {/* Result Preview */}
                                <div className={cn(
                                    "p-8 rounded-3xl transition-all duration-500 flex items-center gap-6 ring-1 ring-inset",
                                    getCriticalityLevel(selectedAsset.valuationC || 3, selectedAsset.valuationI || 3, selectedAsset.valuationA || 3).bg,
                                    getCriticalityLevel(selectedAsset.valuationC || 3, selectedAsset.valuationI || 3, selectedAsset.valuationA || 3).bg.replace('50', '200').replace('bg-', 'ring-')
                                )}>
                                    <div className={cn(
                                        "w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg",
                                        getCriticalityLevel(selectedAsset.valuationC || 3, selectedAsset.valuationI || 3, selectedAsset.valuationA || 3).color
                                    )}>
                                        <Zap className="w-8 h-8 text-white" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Calculated Impact</div>
                                        <h4 className={cn(
                                            "text-2xl font-black",
                                            getCriticalityLevel(selectedAsset.valuationC || 3, selectedAsset.valuationI || 3, selectedAsset.valuationA || 3).text
                                        )}>
                                            {getCriticalityLevel(selectedAsset.valuationC || 3, selectedAsset.valuationI || 3, selectedAsset.valuationA || 3).label}
                                        </h4>
                                    </div>
                                </div>

                                <div className="pt-4 flex items-center gap-4">
                                    <Info className="w-5 h-5 text-indigo-400 shrink-0" />
                                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                        Scores are saved automatically. High criticality assets will be flagged in the 
                                        <strong> Resilience Dashboard</strong> for prioritize monitoring.
                                    </p>
                                </div>
                             </CardContent>
                        </Card>
                    ) : (
                        <div className="h-full min-h-[400px] border-2 border-dashed border-slate-200 rounded-[3rem] flex items-center justify-center p-12 text-center group">
                            <div className="max-w-xs space-y-6">
                                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform duration-500 ring-1 ring-slate-100">
                                    <Scale className="w-10 h-10 text-slate-300" />
                                </div>
                                <div>
                                    <h4 className="text-xl font-black text-slate-900">Valuation Required</h4>
                                    <p className="text-slate-500 font-medium text-sm">Select an asset from the inventory to begin assessing its systemic criticality for NIS2 compliance.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AssetCriticalityMatrix;
