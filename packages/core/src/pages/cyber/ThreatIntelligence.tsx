
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { 
    Shield, 
    ArrowLeft, 
    Zap, 
    AlertTriangle, 
    Target, 
    Info, 
    TrendingUp,
    ShieldAlert,
    ExternalLink
} from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useClientContext } from "@/contexts/ClientContext";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { cn } from "@/lib/utils";

export default function ThreatIntelligence() {
    const { selectedClientId } = useClientContext();
    const [, setLocation] = useLocation();

    const { data: taxonomy, isLoading: loadingTaxonomy } = trpc.cyber.getThreatTaxonomy.useQuery();
    const { data: scenarios, isLoading: loadingScenarios } = trpc.cyber.getThreatScenarios.useQuery({ 
        clientId: selectedClientId || 0 
    }, {
        enabled: !!selectedClientId
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <button
                        onClick={() => setLocation(`/clients/${selectedClientId}/cyber`)}
                        className="flex items-center text-sm font-bold text-slate-500 hover:text-sky-600 transition-colors mb-4 group"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                        Back to Dashboard
                    </button>
                    <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                        <ShieldAlert className="w-8 h-8 text-indigo-600" />
                        Threat Intelligence Hub
                        <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 font-black uppercase text-[10px] tracking-widest px-3 py-1">
                            ENISA Taxomony
                        </Badge>
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-3xl">
                        Scenario-based threat analysis designed for NIS2 Article 21 risk management.
                    </p>
                </div>
            </div>

            {/* Top Stats / Overview */}
            <div className="grid md:grid-cols-3 gap-6">
                <Card className="border-none shadow-xl shadow-slate-200/50 rounded-3xl bg-indigo-600 text-white overflow-hidden relative">
                    <div className="absolute right-0 top-0 opacity-10 transform translate-x-4 -translate-y-4">
                        <Target className="w-32 h-32" />
                    </div>
                    <CardContent className="p-8 space-y-4">
                        <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <Zap className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <div className="text-3xl font-black">{scenarios?.length || 0}</div>
                            <div className="text-indigo-100/80 font-bold uppercase text-[10px] tracking-widest">Active Scenarios</div>
                        </div>
                        <p className="text-indigo-100/70 text-sm font-medium">
                            Tailored threats detected for your sector.
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl shadow-slate-200/50 rounded-3xl bg-white ring-1 ring-slate-100 p-8 space-y-4">
                    <div className="h-10 w-10 bg-rose-50 rounded-xl flex items-center justify-center">
                        <AlertTriangle className="w-5 h-5 text-rose-500" />
                    </div>
                    <div>
                        <div className="text-3xl font-black text-slate-900">Critical</div>
                        <div className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Risk Appetite</div>
                    </div>
                    <p className="text-slate-500 text-sm font-medium leading-relaxed">
                        Currently tracking {taxonomy?.filter(t => t.impactLevel === 'Critical').length || 0} critical ENISA threats.
                    </p>
                </Card>

                <Card className="border-none shadow-xl shadow-slate-200/50 rounded-3xl bg-white ring-1 ring-slate-100 p-8 space-y-4">
                    <div className="h-10 w-10 bg-sky-50 rounded-xl flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-sky-500" />
                    </div>
                    <div>
                        <div className="text-3xl font-black text-slate-900">100%</div>
                        <div className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Article 21 Coverage</div>
                    </div>
                    <p className="text-slate-500 text-sm font-medium leading-relaxed">
                        Full mapping to NIS2 Technical Implementation Guidance.
                    </p>
                </Card>
            </div>

            {/* Targeted Scenarios */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black text-slate-900">Sector-Specific Scenarios</h2>
                    <Button variant="outline" className="rounded-xl font-bold border-slate-200">
                        Generate New Scenario
                    </Button>
                </div>
                
                <div className="grid md:grid-cols-2 gap-6">
                    {loadingScenarios ? (
                        Array(2).fill(0).map((_, i) => <Skeleton key={i} className="h-64 rounded-3xl" />)
                    ) : (
                        scenarios?.map((s) => (
                            <Card key={s.id} className="border-none shadow-xl shadow-slate-200/50 rounded-[2.5rem] bg-white ring-1 ring-slate-100 overflow-hidden hover:ring-indigo-200 transition-all group">
                                <CardContent className="p-0">
                                    <div className="p-8 space-y-6">
                                        <div className="flex justify-between items-start">
                                            <Badge className={cn(
                                                "font-black tracking-widest uppercase text-[10px] px-3 py-1",
                                                s.likelihood === 'High' ? "bg-rose-100 text-rose-700" :
                                                s.likelihood === 'Medium' ? "bg-amber-100 text-amber-700" :
                                                "bg-emerald-100 text-emerald-700"
                                            )}>
                                                {s.likelihood} LIKELIHOOD
                                            </Badge>
                                            <div className="text-slate-400 font-bold text-xs">{s.id}</div>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            <h3 className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{s.title}</h3>
                                            <p className="text-slate-500 font-medium leading-relaxed">{s.description}</p>
                                        </div>

                                        <div className="p-4 bg-slate-50 rounded-2xl space-y-2">
                                            <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Potential Impact</div>
                                            <p className="text-xs font-bold text-slate-700">{s.potentialImpact}</p>
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {s.recommendedControls.map(ctrl => (
                                                <Badge key={ctrl} variant="secondary" className="bg-white border border-slate-200 text-slate-600 font-bold px-3 py-1 rounded-lg">
                                                    {ctrl}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 px-8 py-4 border-t border-slate-100 flex justify-between items-center">
                                        <span className="text-xs font-bold text-slate-500">Industry: {s.industrySector.join(', ')}</span>
                                        <Button variant="ghost" size="sm" className="text-indigo-600 font-bold hover:bg-indigo-50">
                                            Run Assessment <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>

            {/* ENISA Taxonomy Table */}
            <Card className="border-none shadow-2xl shadow-slate-200/50 rounded-[2.5rem] bg-white ring-1 ring-slate-100 overflow-hidden">
                <CardHeader className="bg-slate-900 p-8">
                    <CardTitle className="text-white flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Info className="w-6 h-6 text-indigo-400" />
                            <span>ENISA Threat Taxonomy 2024</span>
                        </div>
                        <Badge className="bg-white/10 text-white border-none font-bold">Standard Reference</Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50">
                                    <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Threat Name</th>
                                    <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Category</th>
                                    <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Impact</th>
                                    <th className="px-8 py-4 text-xs font-black uppercase tracking-widest text-slate-500">NIS2 Art. 21</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loadingTaxonomy ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <tr key={i}><td colSpan={4}><Skeleton className="h-12 m-4" /></td></tr>
                                    ))
                                ) : (
                                    taxonomy?.map(t => (
                                        <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900">{t.name}</span>
                                                    <span className="text-xs text-slate-500 font-medium italic mt-0.5">{t.description}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <Badge variant="outline" className="border-slate-200 text-slate-600 font-bold">{t.category}</Badge>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2">
                                                    <div className={cn(
                                                        "w-2 h-2 rounded-full",
                                                        t.impactLevel === 'Critical' ? "bg-rose-500" :
                                                        t.impactLevel === 'High' ? "bg-orange-500" : "bg-amber-500"
                                                    )} />
                                                    <span className="text-sm font-bold text-slate-700">{t.impactLevel}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-wrap gap-1">
                                                    {t.nis2ArticleMapping.map(art => (
                                                        <Badge key={art} className="bg-indigo-50 text-indigo-600 border-none font-bold text-[10px]">
                                                            {art}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
