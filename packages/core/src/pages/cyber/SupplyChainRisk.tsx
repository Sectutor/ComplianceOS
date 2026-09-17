import React from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { Link, useLocation } from "wouter";
import { useClientContext } from "@/contexts/ClientContext";
import { Button } from "@complianceos/ui/ui/button";
import { ArrowLeft, Shield, Network, Zap } from "lucide-react";
import { Badge } from "@complianceos/ui/ui/badge";
import { SupplyChainRiskMapper } from "@/components/cyber/SupplyChainRiskMapper";
import { SupplierSecurityLifecycleSection } from "@/pages/cyber/SupplyChainLifecyclePanels";
import { ThirdPartyRiskSection } from "@/pages/cyber/ThirdPartyRiskPanels";

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
                            className="flex items-center text-sm font-bold text-muted-foreground hover:text-foreground transition-colors group mb-4"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                            Return to NIS2 Overview
                        </Link>
                        <div className="flex items-center gap-4">
                            <div className="h-14 w-14 bg-muted rounded-2xl flex items-center justify-center text-brand-bright shadow-sm ring-1 ring-border">
                                <Network className="w-8 h-8" />
                            </div>
                            <div className="space-y-1">
                                <h1 className="text-4xl font-black tracking-tight text-foreground flex items-center gap-3">
                                    Supply Chain Risk Mapping
                                    <Badge variant="success" className="font-black text-[10px] tracking-widest px-3 py-1">
                                        ARTICLE 21(2)(d)
                                    </Badge>
                                </h1>
                                <p className="text-muted-foreground font-medium text-lg leading-relaxed">
                                    Identify, assess, and mitigate risks arising from third-party ICT service providers and essential partners.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button 
                            variant="outline" 
                            className="h-14 px-8 rounded-2xl font-bold border-border hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-all flex items-center gap-3 active:scale-95 shadow-sm"
                        >
                            <Shield className="w-5 h-5 text-[var(--success)] fill-[var(--success-bg)]" />
                            Verify All Contracts
                        </Button>
                        <Button 
                            onClick={() => setLocation(`/clients/${selectedClientId}/vendors`)}
                            className="h-14 px-8 rounded-2xl font-bold bg-brand-bright hover:bg-brand text-white transition-all flex items-center gap-3 active:scale-95 shadow-sm"
                        >
                            <Zap className="w-5 h-5 fill-white" />
                            Onboard New Provider
                        </Button>
                    </div>
                </div>

                {/* Info Card - The NIS2 Context */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-8 rounded-[2rem] bg-card border border-border shadow-sm flex flex-col justify-between group overflow-hidden relative">
                        <div className="absolute -top-12 -right-12 h-40 w-40 bg-[var(--info-bg)] rounded-full blur-3xl opacity-50 transition-all group-hover:scale-110" />
                        <h3 className="text-lg font-black text-foreground mb-4 flex items-center gap-2">
                             <div className="w-2 h-8 bg-[var(--info)]/70 rounded-full" />
                             Dependency Mapping
                        </h3>
                        <p className="text-muted-foreground text-sm font-medium leading-relaxed mb-6">
                            Identify vendors that provide "Critical Information Infrastructure" services essential for your core operations.
                        </p>
                        <div className="text-3xl font-black text-foreground">12% <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">High Dependence</span></div>
                    </div>

                    <div className="p-8 rounded-[2rem] bg-card border border-border shadow-sm flex flex-col justify-between group overflow-hidden relative">
                        <div className="absolute -top-12 -right-12 h-40 w-40 bg-[var(--success-bg)] rounded-full blur-3xl opacity-50 transition-all group-hover:scale-110" />
                        <h3 className="text-lg font-black text-foreground mb-4 flex items-center gap-2">
                             <div className="w-2 h-8 bg-[var(--success)]/70 rounded-full" />
                             Security Standards
                        </h3>
                        <p className="text-muted-foreground text-sm font-medium leading-relaxed mb-6">
                            Ensuring providers adhere to ENISA-standard cybersecurity measures and have appropriate audit rights.
                        </p>
                        <div className="text-3xl font-black text-[var(--success-foreground)]">84% <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Controls Validated</span></div>
                    </div>

                    <div className="p-8 rounded-[2rem] bg-card border border-border shadow-sm flex flex-col justify-between group overflow-hidden relative">
                        <div className="absolute -top-12 -right-12 h-40 w-40 bg-[var(--warning-bg)] rounded-full blur-3xl opacity-50 transition-all group-hover:scale-110" />
                        <h3 className="text-lg font-black text-foreground mb-4 flex items-center gap-2">
                             <div className="w-2 h-8 bg-[var(--warning)]/70 rounded-full" />
                             Resilience Status
                        </h3>
                        <p className="text-muted-foreground text-sm font-medium leading-relaxed mb-6">
                            Assessment of provider failover capabilities and incident notification windows for NIS2 reporting.
                        </p>
                        <div className="text-3xl font-black text-[var(--warning-foreground)]">6 <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Entities Requiring Audit</span></div>
                    </div>
                </div>

                {/* Main Component */}
                <div className="pt-8">
                    <SupplyChainRiskMapper />
                </div>

                {/* NIS2 Supplier Security Lifecycle */}
                <div className="pt-8">
                    <SupplierSecurityLifecycleSection clientId={selectedClientId ?? 0} />
                </div>

                {/* NIS2 Third-Party Risk Scoring (Phase 3 Task 3.2) */}
                <div className="pt-8">
                    <ThirdPartyRiskSection clientId={selectedClientId ?? 0} />
                </div>
            </div>
        </DashboardLayout>
    );
}
