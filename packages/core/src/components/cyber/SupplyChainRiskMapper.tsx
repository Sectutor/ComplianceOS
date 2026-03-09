
import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { Progress } from "@complianceos/ui/ui/progress";
import { Shield, AlertTriangle, Cloud, Lock, Server, Network, ExternalLink } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useClientContext } from "@/contexts/ClientContext";
import { Skeleton } from "@complianceos/ui/ui/skeleton";

export interface SupplyChainVendor {
    id: number;
    name: string;
    nis2Category: string | null;
    isEssentialService: boolean;
    supplyChainImpact: number;
    trustScore: number | null;
    status: string;
}

export function SupplyChainRiskMapper() {
    const { selectedClientId } = useClientContext();
    const { data: subprocessors, isLoading } = trpc.subprocessors.list.useQuery({ clientId: selectedClientId || 0 });

    const riskLevelColor = (impact: number) => {
        if (impact >= 4) return 'bg-rose-500';
        if (impact >= 3) return 'bg-amber-500';
        return 'bg-emerald-500';
    };

    const riskLevelText = (impact: number) => {
        if (impact >= 4) return 'Critical';
        if (impact >= 3) return 'Significant';
        return 'Standard';
    };

    const getCategoryIcon = (category: string | null) => {
        const cat = category?.toLowerCase() || '';
        if (cat.includes('cloud')) return <Cloud className="w-4 h-4" />;
        if (cat.includes('security')) return <Lock className="w-4 h-4" />;
        if (cat.includes('ict')) return <Server className="w-4 h-4" />;
        return <Network className="w-4 h-4" />;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-slate-900">Supply Chain Risk Mapper</h2>
                    <p className="text-slate-500 font-medium">Article 21(2)(d): Security in ICT Supply Chains.</p>
                </div>
                <Badge variant="outline" className="bg-sky-50 text-sky-700 border-sky-200 font-bold px-4 py-1">
                    {subprocessors?.length || 0} Critical Entities Identified
                </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    Array(6).fill(0).map((_, i) => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader>
                            <CardContent><Skeleton className="h-20 w-full" /></CardContent>
                        </Card>
                    ))
                ) : (
                    subprocessors?.map((vendor: any) => {
                        const score = vendor.trustScore ?? 75;
                        const impact = vendor.supplyChainImpact || 1;
                        const finalRisk = Math.min(100, Math.round(((impact * 20) + (100 - score)) / 2));

                        return (
                            <Card key={vendor.id} className="border-none shadow-xl shadow-slate-200/50 rounded-2xl bg-white overflow-hidden ring-1 ring-slate-200/50 hover:ring-sky-200 transition-all group">
                                <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-6">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="h-10 w-10 flex items-center justify-center bg-white rounded-xl shadow-sm ring-1 ring-slate-200 text-slate-400 group-hover:text-sky-600 group-hover:ring-sky-200 transition-all">
                                            {getCategoryIcon(vendor.nis2Category)}
                                        </div>
                                        <div className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest", riskLevelColor(impact), "text-white")}>
                                            {riskLevelText(impact)} IMPACT
                                        </div>
                                    </div>
                                    <CardTitle className="text-xl font-bold tracking-tight">{vendor.name}</CardTitle>
                                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mt-1">
                                        {vendor.nis2Category || 'Uncategorized Vendor'}
                                    </p>
                                </CardHeader>
                                <CardContent className="p-6 space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end">
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Composite Risk Score</span>
                                            <span className={cn("text-lg font-black", finalRisk > 60 ? "text-rose-600" : "text-emerald-600")}>
                                                {finalRisk}%
                                            </span>
                                        </div>
                                        <Progress value={finalRisk} className="h-2 rounded-full bg-slate-100" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        <div className="p-3 bg-slate-50 rounded-xl">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Trust Score</span>
                                            <span className="text-sm font-black text-slate-700">{score}%</span>
                                        </div>
                                        <div className="p-3 bg-slate-50 rounded-xl text-center">
                                            {vendor.isEssentialService ? (
                                                <>
                                                    <span className="text-[10px] font-bold text-sky-600 uppercase block mb-1">Status</span>
                                                    <span className="text-xs font-black text-sky-900">Essential Entity</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Impact Factor</span>
                                                    <span className="text-sm font-black text-slate-700">{impact}/5</span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 pt-2">
                                        {impact >= 4 && (
                                            <Badge variant="destructive" className="w-full justify-center py-2 rounded-lg gap-2">
                                                <AlertTriangle className="w-3 h-3" />
                                                Requires Direct Audit
                                            </Badge>
                                        )}
                                        {impact < 4 && (
                                            <Badge variant="outline" className="w-full justify-center py-2 rounded-lg border-sky-200 text-sky-700 bg-sky-50 font-bold gap-2">
                                                <Shield className="w-4 h-4" />
                                                Contractually Verified
                                            </Badge>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>

            <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-slate-900 overflow-hidden ring-1 ring-slate-200/50 p-8">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <Badge className="bg-emerald-500 text-white border-none font-black text-[10px] px-3 py-1">NIS2 COMPLIANCE ENABLED</Badge>
                            <h3 className="text-2xl font-black text-white">Automated Risk Cascading</h3>
                        </div>
                        <p className="text-slate-400 max-w-xl font-medium tracking-tight">
                            The system automatically calculates the potential impact of a vendor breach on your organization's NIS2 status based on dependencies, data access, and trust center documentation.
                        </p>
                    </div>
                    <Button size="lg" className="bg-[#3ABEF9] hover:bg-[#1C4D8D] text-white font-bold h-16 px-8 rounded-2xl shadow-xl shadow-sky-900/50 transition-all flex items-center gap-3">
                        Launch VRM Deep Dive <ExternalLink className="w-5 h-5" />
                    </Button>
                </div>
            </Card>
        </div>
    );
}

function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
