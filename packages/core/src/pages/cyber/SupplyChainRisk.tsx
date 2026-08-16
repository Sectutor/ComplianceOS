
import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Link, useLocation } from "wouter";
import { useClientContext } from "@/contexts/ClientContext";
import { Button } from "@complianceos/ui/ui/button";
import { ArrowLeft, Shield, Network, Zap } from "lucide-react";
import { Badge } from "@complianceos/ui/ui/badge";
import { SupplyChainRiskMapper } from "@/components/cyber/SupplyChainRiskMapper";

export default function SupplyChainRisk() {
    const { selectedClientId } = useClientContext();
    const [, setLocation] = useLocation();

    return (
        <DashboardLayout>
            <div className="space-y-8 animate-in fade-in duration-500 max-w-[1400px] mx-auto p-8">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-4">
                        <Link 
                            to={`/clients/${selectedClientId}/cyber`} 
                            className="flex items-center text-sm font-bold text-slate-500 hover:text-sky-600 transition-colors group mb-4"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                            Return to NIS2 Overview
                        </Link>
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-600 shadow-sm ring-1 ring-sky-100">
                                <Network className="w-8 h-8" />
                            </div>
                            <div className="space-y-1">
                                <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                                    Supply Chain Risk Mapping
                                    <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 font-black text-[10px] tracking-widest px-3 py-1">
                                        ARTICLE 21(2)(d)
                                    </Badge>
                                </h1>
                                <p className="text-slate-500 font-medium text-lg leading-relaxed">
                                    Identify, assess, and mitigate risks arising from third-party ICT service providers and essential partners.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button 
                            variant="outline" 
                            className="h-14 px-8 rounded-2xl font-bold border-slate-200 hover:bg-white text-slate-600 hover:text-slate-900 transition-all flex items-center gap-3 active:scale-95 shadow-lg shadow-slate-100/50"
                        >
                            <Shield className="w-5 h-5 text-emerald-500 fill-emerald-100" />
                            Verify All Contracts
                        </Button>
                        <Button 
                            onClick={() => setLocation(`/clients/${selectedClientId}/vendors`)}
                            className="h-14 px-8 rounded-2xl font-bold bg-brand-bright hover:bg-brand text-white transition-all flex items-center gap-3 active:scale-95 shadow-xl shadow-sky-200/50"
                        >
                            <Zap className="w-5 h-5 fill-white" />
                            Onboard New Provider
                        </Button>
                    </div>
                </div>

                {/* Info Card - The NIS2 Context */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-8 rounded-[2rem] bg-white border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col justify-between group overflow-hidden relative">
                        <div className="absolute -top-12 -right-12 h-40 w-40 bg-sky-50 rounded-full blur-3xl opacity-50 transition-all group-hover:scale-110" />
                        <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                             <div className="w-2 h-8 bg-sky-200 rounded-full" />
                             Dependency Mapping
                        </h3>
                        <p className="text-slate-500 text-sm font-medium leading-relaxed mb-6">
                            Identify vendors that provide "Critical Information Infrastructure" services essential for your core operations.
                        </p>
                        <div className="text-3xl font-black text-slate-900">12% <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">High Dependence</span></div>
                    </div>

                    <div className="p-8 rounded-[2rem] bg-white border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col justify-between group overflow-hidden relative">
                        <div className="absolute -top-12 -right-12 h-40 w-40 bg-emerald-50 rounded-full blur-3xl opacity-50 transition-all group-hover:scale-110" />
                        <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                             <div className="w-2 h-8 bg-emerald-200 rounded-full" />
                             Security Standards
                        </h3>
                        <p className="text-slate-500 text-sm font-medium leading-relaxed mb-6">
                            Ensuring providers adhere to ENISA-standard cybersecurity measures and have appropriate audit rights.
                        </p>
                        <div className="text-3xl font-black text-emerald-600">84% <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Controls Validated</span></div>
                    </div>

                    <div className="p-8 rounded-[2rem] bg-white border border-slate-100 shadow-xl shadow-slate-200/50 flex flex-col justify-between group overflow-hidden relative">
                        <div className="absolute -top-12 -right-12 h-40 w-40 bg-amber-50 rounded-full blur-3xl opacity-50 transition-all group-hover:scale-110" />
                        <h3 className="text-lg font-black text-slate-900 mb-4 flex items-center gap-2">
                             <div className="w-2 h-8 bg-amber-200 rounded-full" />
                             Resilience Status
                        </h3>
                        <p className="text-slate-500 text-sm font-medium leading-relaxed mb-6">
                            Assessment of provider failover capabilities and incident notification windows for NIS2 reporting.
                        </p>
                        <div className="text-3xl font-black text-amber-600">6 <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Entities Requiring Audit</span></div>
                    </div>
                </div>

                {/* Main Component */}
                <div className="pt-8">
                    <SupplyChainRiskMapper />
                </div>
            </div>
        </DashboardLayout>
    );
}

