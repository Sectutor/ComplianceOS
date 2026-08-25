/**
 * NIS2 Cyber Resilience Hub
 * 
 * Navigation launcher & cross-module orchestration for NIS2 compliance
 * Bridges Business Continuity (Art. 21.2.c), Incident Reporting (Art. 23),
 * Risk Management (Art. 21.2.a), and Supply Chain (Art. 21.2.d).
 * 
 * NIS2 Directive (EU) 2022/2555
 */

import React from 'react';
import { useParams, useLocation } from 'wouter';
import { useClientContext } from '@/contexts/ClientContext';
import { trpc } from '@/lib/trpc';
import {
    Shield,
    Globe,
    Users,
    FileText,
    Building2,
    AlertTriangle,
    CheckCircle,
    Clock,
    ArrowRight,
    Scale,
    Briefcase,
    Flag,
    Activity,
    LifeBuoy,
    Compass,
    Zap,
    TrendingUp,
    ShieldAlert,
    Network
} from 'lucide-react';
import { useCyberIncidents, useCyberNis2Mappings } from '@/pages/cyber/cyberApi';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Progress } from "@complianceos/ui/ui/progress";

export default function NIS2CyberResilienceHub() {
    const params = useParams<{ id?: string }>();
    const { selectedClientId } = useClientContext();
    const [, setLocation] = useLocation();
    
    // Dynamically resolve active clientId with fallbacks
    const clientId = params.id
        ? parseInt(params.id, 10)
        : (selectedClientId || (typeof window !== 'undefined' ? parseInt(localStorage.getItem('selectedClientId') || '1', 10) : 1) || 1);

    // Fetch NIS2 compliance data
    const { data: nis2Mappings, isLoading: loadingMappings } = useCyberNis2Mappings(clientId, 'NIS2');

    // Fetch Incident data (Art. 21.2.b & Art. 23)
    const { data: incidents } = useCyberIncidents(clientId);

    // Fetch BCP & Disaster Recovery metrics (Art. 21.2.c)
    const { data: bcpMetrics } = (trpc.businessContinuity as any)?.getDashboardMetrics?.useQuery(
        { clientId },
        { enabled: !!clientId }
    );

    // Fetch Risk metrics (Art. 21.2.a)
    const { data: risksData } = (trpc.risks as any)?.getRiskAssessments?.useQuery(
        { clientId },
        { enabled: !!clientId }
    );

    // Fetch Vendor / Supply Chain metrics (Art. 21.2.d)
    const { data: vendorStats } = (trpc.vendors as any)?.getStats?.useQuery(
        { clientId },
        { enabled: !!clientId }
    );

    // Calculate NIS2 Article 21 compliance score
    const implementedCount = nis2Mappings?.filter((m: any) => m.status === 'implemented').length || 0;
    const totalMappings = nis2Mappings?.length || 0;
    const complianceScore = totalMappings > 0 ? Math.round((implementedCount / totalMappings) * 100) : 0;

    // Derived cross-module metrics
    const activeIncidents = incidents?.filter((i: any) => i.status === 'open' || i.status === 'investigating') || [];
    const criticalIncidents = activeIncidents.filter((i: any) => i.severity === 'critical' || i.severity === 'high');
    const highRisks = risksData?.filter((r: any) => (r.residualScore || r.inherentScore || 0) >= 15 || r.status === 'open') || [];

    // Core NIS2 Modules
    const hubModules = [
        {
            id: 'entity-classification',
            title: 'Entity Classification',
            description: 'Determine if you are an Essential or Important entity under NIS2 (Article 2/3)',
            icon: Building2,
            path: `/clients/${clientId}/nis2/entity-classification`,
            color: 'from-purple-500 to-indigo-600',
            article: 'Article 2 & 3'
        },
        {
            id: 'security-measures',
            title: 'Security Measures (Art. 21)',
            description: 'Technical, operational & organizational measures across 10 mandatory domains',
            icon: Shield,
            path: `/clients/${clientId}/nis2/security-measures`,
            color: 'from-green-500 to-emerald-600',
            article: 'Article 21'
        },
        {
            id: 'incident-reporting',
            title: 'Incident Reporting (Art. 23)',
            description: '24h early warning, 72h notification, and final report regulatory deadlines',
            icon: AlertTriangle,
            path: `/clients/${clientId}/cyber/incidents`,
            color: 'from-red-500 to-orange-600',
            article: 'Article 23'
        },
        {
            id: 'supply-chain',
            title: 'Supply Chain Security',
            description: 'Direct supplier risk mapping, DPA enforcement & critical vendor assessments',
            icon: Network,
            path: `/clients/${clientId}/nis2/supply-chain`,
            color: 'from-cyan-500 to-blue-600',
            article: 'Article 21(2)(d)'
        },
        {
            id: 'management-liability',
            title: 'Management Oversight',
            description: 'Track management body approval, liability governance & training obligations',
            icon: Users,
            path: `/clients/${clientId}/nis2/management-liability`,
            color: 'from-blue-500 to-indigo-700',
            article: 'Article 20'
        },
        {
            id: 'cross-border',
            title: 'Cross-Border Compliance',
            description: 'EU member state regulatory requirements and competent CSIRT authorities',
            icon: Globe,
            path: `/clients/${clientId}/nis2/cross-border`,
            color: 'from-amber-500 to-yellow-600',
            article: 'Articles 25-26'
        },
        {
            id: 'audit-bundle',
            title: 'Audit Documentation Bundle',
            description: 'One-click compiled evidence package for competent authorities and auditors',
            icon: FileText,
            path: `/clients/${clientId}/nis2/audit-bundle`,
            color: 'from-primary-cta to-primary-cta/70',
            article: 'Articles 20-29'
        }
    ];

    return (
        <DashboardLayout fullWidth={true}>
            <div className="container mx-auto py-8 space-y-8 animate-in fade-in duration-500">
                {/* Header with Cross-Module Navigation Pills */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3.5 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/20 text-white">
                            <Shield className="h-8 w-8" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">NIS2 Cyber Resilience Hub</h1>
                                <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-semibold">EU Directive 2022/2555</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                                Unified regulatory management bridging Art. 21 controls, BCP, Incident Clocks, and Risk Governance.
                            </p>
                        </div>
                    </div>
                    
                    {/* Quick Cross-Module Switches */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation(`/clients/${clientId}/cyber/overview`)}
                            className="text-xs font-semibold hover:bg-muted"
                        >
                            <Activity className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                            Cyber Overview
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation(`/clients/${clientId}/business-continuity/plans`)}
                            className="text-xs font-semibold hover:bg-muted"
                        >
                            <LifeBuoy className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                            BCP Plans
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation(`/clients/${clientId}/cyber/incidents`)}
                            className="text-xs font-semibold hover:bg-muted"
                        >
                            <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-rose-500" />
                            Incidents ({activeIncidents.length})
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation(`/clients/${clientId}/risks/overview`)}
                            className="text-xs font-semibold hover:bg-muted"
                        >
                            <TrendingUp className="w-3.5 h-3.5 mr-1.5 text-purple-500" />
                            Risk Register
                        </Button>
                    </div>
                </div>

                {/* Primary High-Level Compliance Score Cards */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card className="border-border/80 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground">NIS2 Readiness Score</CardDescription>
                            <CardTitle className="text-3xl font-black text-primary">{complianceScore}%</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Progress value={complianceScore} className="h-2 bg-muted" />
                            <p className="text-[11px] text-muted-foreground mt-2">Article 20-29 composite posture</p>
                        </CardContent>
                    </Card>

                    <Card className="border-border/80 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Art. 21 Security Controls</CardDescription>
                            <CardTitle className="text-3xl font-black text-foreground">
                                {implementedCount}
                                <span className="text-sm font-semibold text-muted-foreground ml-1">/ {totalMappings || 10}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                                <CheckCircle className="h-3.5 w-3.5" />
                                <span>{totalMappings > 0 ? `${Math.round((implementedCount / totalMappings) * 100)}% verified implemented` : "Requires baseline scan"}</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/80 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Art. 23 Active Incidents</CardDescription>
                            <CardTitle className="text-3xl font-black text-foreground">
                                {activeIncidents.length}
                                {criticalIncidents.length > 0 && (
                                    <span className="text-sm font-bold text-rose-500 ml-2">({criticalIncidents.length} High/Crit)</span>
                                )}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-[11px] text-muted-foreground">
                                {criticalIncidents.length > 0 ? "⚠️ CSIRT 24h reporting clock active" : "All reporting clocks compliant"}
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="border-border/80 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Regulatory Standing</CardDescription>
                            <CardTitle className="text-2xl font-black text-foreground">
                                {complianceScore >= 80 ? 'Audit-Ready' : complianceScore >= 50 ? 'Substantial Gap' : 'Action Required'}
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-1.5 text-xs">
                                {complianceScore >= 80 ? (
                                    <Badge className="bg-emerald-100 text-emerald-800 border-0 text-[10px]">Compliant</Badge>
                                ) : complianceScore >= 50 ? (
                                    <Badge className="bg-amber-100 text-amber-800 border-0 text-[10px]">Remediation Ongoing</Badge>
                                ) : (
                                    <Badge className="bg-rose-100 text-rose-800 border-0 text-[10px]">Non-Compliant</Badge>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Cross-Module Orchestration & Telemetry Bridge */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                                <Zap className="w-4 h-4 text-amber-500" />
                                Cross-Module Orchestration & Telemetry
                            </h3>
                            <p className="text-xs text-muted-foreground">Live operational data bridged directly from BCP, Incident Management, Risk, and Supply Chain.</p>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3">
                        {/* BCP Bridge (Art. 21.2.c) */}
                        <Card className="border-emerald-200/70 bg-gradient-to-br from-emerald-50/40 to-white shadow-sm">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px]">Art. 21(2)(c) Continuity</Badge>
                                    <LifeBuoy className="w-4 h-4 text-emerald-600" />
                                </div>
                                <CardTitle className="text-base font-bold text-foreground mt-2">Business Continuity & DR</CardTitle>
                                <CardDescription className="text-xs text-muted-foreground">BIA, Disaster Recovery & emergency call trees</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="bg-card p-2.5 rounded-lg border border-border">
                                        <span className="text-muted-foreground block text-[10px]">Active Plans</span>
                                        <span className="font-bold text-foreground text-sm">{bcpMetrics?.approvedPlans ?? 0} Approved</span>
                                    </div>
                                    <div className="bg-card p-2.5 rounded-lg border border-border">
                                        <span className="text-muted-foreground block text-[10px]">BCP Readiness</span>
                                        <span className="font-bold text-emerald-600 text-sm">{bcpMetrics?.readinessScore ?? 0}%</span>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setLocation(`/clients/${clientId}/business-continuity/plans`)}
                                    className="w-full text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200 cursor-pointer"
                                >
                                    Open Continuity Hub <ArrowRight className="w-3 h-3 ml-1.5" />
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Incident Management Bridge (Art. 21.2.b & Art. 23) */}
                        <Card className="border-rose-200/70 bg-gradient-to-br from-rose-50/40 to-white shadow-sm">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <Badge variant="outline" className="bg-rose-100 text-rose-800 border-rose-300 text-[10px]">Art. 23 CSIRT Clock</Badge>
                                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                                </div>
                                <CardTitle className="text-base font-bold text-foreground mt-2">Incident Response Ladder</CardTitle>
                                <CardDescription className="text-xs text-muted-foreground">24h Early Warning & 72h Notification deadlines</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="bg-card p-2.5 rounded-lg border border-border">
                                        <span className="text-muted-foreground block text-[10px]">Open Incidents</span>
                                        <span className="font-bold text-foreground text-sm">{activeIncidents.length} Under Triage</span>
                                    </div>
                                    <div className="bg-card p-2.5 rounded-lg border border-border">
                                        <span className="text-muted-foreground block text-[10px]">Critical SLA</span>
                                        <span className="font-bold text-rose-600 text-sm">
                                            {criticalIncidents.length > 0 ? "Action Due" : "All Clear"}
                                        </span>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setLocation(`/clients/${clientId}/cyber/incidents`)}
                                    className="w-full text-xs text-rose-700 hover:text-rose-800 hover:bg-rose-50 border-rose-200 cursor-pointer"
                                >
                                    View Incident Workbench <ArrowRight className="w-3 h-3 ml-1.5" />
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Risk Governance Bridge (Art. 21.2.a) */}
                        <Card className="border-purple-200/70 bg-gradient-to-br from-purple-50/40 to-white shadow-sm">
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300 text-[10px]">Art. 21(2)(a) Risk Analysis</Badge>
                                    <TrendingUp className="w-4 h-4 text-purple-600" />
                                </div>
                                <CardTitle className="text-base font-bold text-foreground mt-2">Risk Register & FAIR</CardTitle>
                                <CardDescription className="text-xs text-muted-foreground">Quantitative analysis & board risk appetite</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="bg-card p-2.5 rounded-lg border border-border">
                                        <span className="text-muted-foreground block text-[10px]">Tracked Risks</span>
                                        <span className="font-bold text-foreground text-sm">{risksData?.length || 0} Registered</span>
                                    </div>
                                    <div className="bg-card p-2.5 rounded-lg border border-border">
                                        <span className="text-muted-foreground block text-[10px]">High Severity</span>
                                        <span className="font-bold text-purple-600 text-sm">{highRisks.length} Scenarios</span>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setLocation(`/clients/${clientId}/risks/overview`)}
                                    className="w-full text-xs text-purple-700 hover:text-purple-800 hover:bg-purple-50 border-purple-200 cursor-pointer"
                                >
                                    Open Risk Governance <ArrowRight className="w-3 h-3 ml-1.5" />
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Core NIS2 Compliance Modules Grid */}
                <div>
                    <h3 className="text-base font-bold text-foreground mb-3">NIS2 Regulatory Modules (Directives 2022/2555)</h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {hubModules.map((module) => (
                            <Card
                                key={module.id}
                                className="border-border/80 shadow-sm hover:shadow-md hover:border-primary/50 transition-all cursor-pointer group"
                                onClick={() => setLocation(module.path)}
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between">
                                        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${module.color} shadow-sm text-white`}>
                                            <module.icon className="h-5 w-5" />
                                        </div>
                                        <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground border-border">
                                            {module.article}
                                        </Badge>
                                    </div>
                                    <CardTitle className="text-base font-bold text-foreground mt-3 group-hover:text-primary transition-colors">
                                        {module.title}
                                    </CardTitle>
                                    <CardDescription className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                                        {module.description}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pt-0">
                                    <div className="flex items-center text-xs font-semibold text-primary group-hover:text-primary/80 transition-colors">
                                        Access Module
                                        <ArrowRight className="h-3.5 w-3.5 ml-1 group-hover:translate-x-0.5 transition-transform" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
