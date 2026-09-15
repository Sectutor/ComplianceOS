/**
 * DORA Digital Operational Resilience Hub
 * 
 * Central orchestration portal for Regulation (EU) 2022/2554 (DORA).
 * Encompasses ICT Risk Management, Incident Reporting, Resilience Testing,
 * ICT Third-Party Risk (TPRM), and the 90-day implementation roadmap.
 */

import React, { useState } from 'react';
import { useParams, useLocation, Link } from 'wouter';
import { useClientContext } from '@/contexts/ClientContext';
import { trpc } from '@/lib/trpc';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Progress } from "@complianceos/ui/ui/progress";
import {
    Shield,
    CalendarClock,
    AlertTriangle,
    LifeBuoy,
    TrendingUp,
    Building2,
    Activity,
    Layers,
    ArrowRight,
    Lock,
    CheckCircle2,
    Clock,
    Share2,
    FileCheck,
    Cpu,
    ExternalLink
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Framework90DayRoadmap } from '@/components/roadmap/Framework90DayRoadmap';
import { getDoraRoadmap } from '@/data/frameworkRoadmaps';

export default function DORAHub() {
    const params = useParams<{ id?: string }>();
    const { selectedClientId } = useClientContext();
    const [, setLocation] = useLocation();

    // Dynamically resolve active clientId
    const clientId = params.id
        ? parseInt(params.id, 10)
        : (selectedClientId || (typeof window !== 'undefined' ? parseInt(localStorage.getItem('selectedClientId') || '1', 10) : 1) || 1);

    const [activeTab, setActiveTab] = useState<'roadmap' | 'architecture' | 'telemetry'>('roadmap');

    // Fetch live system telemetry
    const { data: risksData } = (trpc.risks as any)?.getRiskAssessments?.useQuery(
        { clientId },
        { enabled: !!clientId }
    );
    const { data: vendorStats } = (trpc.vendors as any)?.getStats?.useQuery(
        { clientId },
        { enabled: !!clientId }
    );
    const { data: bcpMetrics } = (trpc.businessContinuity as any)?.getDashboardMetrics?.useQuery(
        { clientId },
        { enabled: !!clientId }
    );

    const safeRisks = Array.isArray(risksData) ? risksData : [];
    const totalRisks = safeRisks.length;
    const criticalRisks = safeRisks.filter((r: any) => (r.residualScore || r.inherentScore || 0) >= 15 || r.status === 'open').length;

    const doraPillars = [
        {
            pillar: 1,
            title: 'ICT Risk Management Framework',
            articles: 'Articles 5 – 16',
            description: 'Comprehensive strategies, governance policies, protocols, and ICT tools to protect all physical and digital information assets.',
            link: `/clients/${clientId}/risks/register`,
            cta: 'Open Risk Register',
            icon: Shield,
            color: 'from-emerald-500 to-teal-600',
            textColor: 'text-emerald-700',
            bgColor: 'bg-emerald-50'
        },
        {
            pillar: 2,
            title: 'ICT Incident Reporting & Classification',
            articles: 'Articles 17 – 23',
            description: 'Harmonized framework to classify, log, and submit 4h initial, 24h intermediate, and 1-month final major ICT incident reports.',
            link: `/clients/${clientId}/cyber/incidents`,
            cta: 'Incident Center',
            icon: AlertTriangle,
            color: 'from-amber-500 to-orange-600',
            textColor: 'text-amber-700',
            bgColor: 'bg-amber-50'
        },
        {
            pillar: 3,
            title: 'Digital Operational Resilience Testing',
            articles: 'Articles 24 – 27',
            description: 'Periodic vulnerability assessments, source code reviews, scenario tests, and advanced Threat-Led Penetration Testing (TLPT).',
            link: `/clients/${clientId}/gap-analysis`,
            cta: 'Resilience Testing',
            icon: Activity,
            color: 'from-blue-500 to-indigo-600',
            textColor: 'text-blue-700',
            bgColor: 'bg-blue-50'
        },
        {
            pillar: 4,
            title: 'Managing ICT Third-Party Risk (TPRM)',
            articles: 'Articles 28 – 44',
            description: 'Sound monitoring of third-party contracts, critical vendor concentration risk, and mandatory contractual exit strategies.',
            link: `/clients/${clientId}/vendors/overview`,
            cta: 'Vendor TPRM Hub',
            icon: Building2,
            color: 'from-purple-500 to-violet-600',
            textColor: 'text-purple-700',
            bgColor: 'bg-purple-50'
        },
        {
            pillar: 5,
            title: 'Information & Cyber Threat Sharing',
            articles: 'Article 45',
            description: 'Arrangements to exchange cyber threat intelligence and IOCs within trusted financial communities and regulatory bodies.',
            link: `/clients/${clientId}/cyber/overview`,
            cta: 'Threat Intel Hub',
            icon: Share2,
            color: 'from-cyan-500 to-blue-600',
            textColor: 'text-cyan-700',
            bgColor: 'bg-cyan-50'
        }
    ];

    return (
        <DashboardLayout fullWidth={true}>
            <div className="container mx-auto py-8 space-y-8 animate-in fade-in duration-500">
                {/* Header Banner */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3.5 bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl shadow-lg shadow-emerald-500/20 text-white">
                            <Shield className="h-8 w-8" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                                    DORA Digital Operational Resilience Hub
                                </h1>
                                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold">
                                    EU Regulation 2022/2554
                                </Badge>
                                <Badge variant="outline" className="text-xs font-semibold text-muted-foreground border-border">
                                    Financial Sector Mandate
                                </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                                Harmonized operational resilience orchestration spanning ICT risk governance, incident clocks, TLPT testing, and third-party risk.
                            </p>
                        </div>
                    </div>

                    {/* Quick Action Navigation */}
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation(`/clients/${clientId}/risks/register`)}
                            className="text-xs font-semibold hover:bg-muted"
                        >
                            <TrendingUp className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                            ICT Risk ({totalRisks})
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation(`/clients/${clientId}/cyber/incidents`)}
                            className="text-xs font-semibold hover:bg-muted"
                        >
                            <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                            Incidents
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation(`/clients/${clientId}/vendors/overview`)}
                            className="text-xs font-semibold hover:bg-muted"
                        >
                            <Building2 className="w-3.5 h-3.5 mr-1.5 text-purple-500" />
                            TPRM Vendors
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLocation(`/clients/${clientId}/business-continuity/overview`)}
                            className="text-xs font-semibold hover:bg-muted"
                        >
                            <LifeBuoy className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                            BCP / Failover
                        </Button>
                    </div>
                </div>

                {/* Primary Metric Highlights */}
                <div className="grid gap-4 md:grid-cols-4">
                    <Card className="border-border/80 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pillar 1: ICT Risk Posture</CardDescription>
                            <CardTitle className="text-3xl font-black text-foreground">
                                {totalRisks}
                                <span className="text-sm font-semibold text-muted-foreground ml-1">Risks</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <span className="font-bold text-amber-600">{criticalRisks} High/Critical</span>
                                <span>requiring treatment</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/80 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pillar 2: Incident Notification</CardDescription>
                            <CardTitle className="text-2xl font-black text-foreground">4h / 24h Clock</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span>Reporting pipelines active</span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border/80 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pillar 3: Resilience Testing</CardDescription>
                            <CardTitle className="text-2xl font-black text-foreground">Annual / TLPT</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-[11px] text-muted-foreground">TIBER-EU aligned threat scenarios</p>
                        </CardContent>
                    </Card>

                    <Card className="border-border/80 shadow-sm hover:shadow-md transition-shadow">
                        <CardHeader className="pb-2">
                            <CardDescription className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pillar 4: Third-Party ICT</CardDescription>
                            <CardTitle className="text-3xl font-black text-foreground">
                                {vendorStats?.totalVendors || 0}
                                <span className="text-sm font-semibold text-muted-foreground ml-1">Providers</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-[11px] text-muted-foreground">Information Register & exit plans active</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Tab Navigation */}
                <div className="flex gap-2 border-b border-border pb-2 flex-wrap">
                    <Button
                        variant={activeTab === 'roadmap' ? 'default' : 'ghost'}
                        onClick={() => setActiveTab('roadmap')}
                        className={cn("font-bold rounded-xl", activeTab === 'roadmap' ? "bg-emerald-600 text-white shadow-sm" : "text-muted-foreground")}
                    >
                        <CalendarClock className="w-4 h-4 mr-2" />
                        90-Day DORA Implementation Roadmap
                    </Button>
                    <Button
                        variant={activeTab === 'architecture' ? 'default' : 'ghost'}
                        onClick={() => setActiveTab('architecture')}
                        className={cn("font-bold rounded-xl", activeTab === 'architecture' ? "bg-slate-900 text-white shadow-sm" : "text-muted-foreground")}
                    >
                        <Layers className="w-4 h-4 mr-2" />
                        5-Pillar Resilience Architecture
                    </Button>
                </div>

                {/* Tab 1: 90-Day DORA Roadmap */}
                {activeTab === 'roadmap' && (
                    <Framework90DayRoadmap
                        spec={getDoraRoadmap(clientId)}
                        clientId={clientId}
                    />
                )}

                {/* Tab 2: 5-Pillar Architecture Grid */}
                {activeTab === 'architecture' && (
                    <div className="space-y-6">
                        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
                            <h3 className="text-xl font-bold text-foreground">The 5 Core Pillars of Regulation (EU) 2022/2554</h3>
                            <p className="text-xs text-muted-foreground mt-1">
                                DORA consolidates and upgrades information and communication technology (ICT) risk requirements across European financial entities.
                            </p>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {doraPillars.map((pillar) => (
                                <Card key={pillar.pillar} className="border-border/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                                    <CardHeader className="space-y-3 pb-3">
                                        <div className="flex items-center justify-between">
                                            <div className={`p-3 rounded-2xl bg-gradient-to-br ${pillar.color} text-white shadow-md`}>
                                                <pillar.icon className="w-6 h-6" />
                                            </div>
                                            <Badge variant="outline" className="text-xs font-bold border-border">
                                                {pillar.articles}
                                            </Badge>
                                        </div>
                                        <div>
                                            <Badge className={cn("text-[10px] font-bold mb-1.5", pillar.bgColor, pillar.textColor)}>
                                                Pillar {pillar.pillar}
                                            </Badge>
                                            <CardTitle className="text-lg font-bold text-foreground">
                                                {pillar.title}
                                            </CardTitle>
                                        </div>
                                        <CardDescription className="text-xs text-muted-foreground leading-relaxed">
                                            {pillar.description}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setLocation(pillar.link)}
                                            className="w-full text-xs font-semibold justify-between h-9"
                                        >
                                            <span>{pillar.cta}</span>
                                            <ArrowRight className="w-3.5 h-3.5 ml-1" />
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
