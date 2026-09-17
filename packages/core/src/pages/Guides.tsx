import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { Link, useParams } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@complianceos/ui/ui/card';
import { Button } from '@complianceos/ui/ui/button';
import { Badge } from '@complianceos/ui/ui/badge';
import { ArrowRight, BookOpen, Brain, Shield, AlertTriangle, Building2, Lock, Activity } from 'lucide-react';

export default function Guides() {
    const params = useParams();
    const clientId = parseInt(params.id || "0", 10);
    const base = `/clients/${clientId}`;

    const guides = [
        {
            id: 'iso27001',
            title: 'ISO/IEC 27001:2022 ISMS',
            description: 'The complete 7-pillar operational guide: Clauses 4–10, 93 Annex A controls, 90-day roadmap, and auditor clean room.',
            icon: Shield,
            badge: 'ISO 27001',
            href: `${base}/iso27001/guide`
        },
        {
            id: 'ai-governance',
            title: 'AI Governance',
            description: 'Inventory AI systems, assess risk, map NIST AI RMF, and run safe deployment gates.',
            icon: Brain,
            badge: 'AI & App Security',
            href: `${base}/ai-governance/program-guide`
        },
        {
            id: 'governance',
            title: 'Governance Program',
            description: 'Initialize a modern governance program: roles, controls, risks, policies, automations, and roadmap.',
            icon: Shield,
            badge: 'Governance',
            href: `${base}/governance/program-guide`
        },
        {
            id: 'risk',
            title: 'Risk Management',
            description: 'Step-by-step guide for risk identification, assessment, treatment, and monitoring.',
            icon: AlertTriangle,
            badge: 'Risk',
            href: `${base}/risks/program-guide`
        },
        {
            id: 'vendors',
            title: 'Vendor Management',
            description: 'How to run third-party risk: discovery, onboarding, questionnaires, and ongoing monitoring.',
            icon: Building2,
            badge: 'TPRM',
            href: `${base}/vendors/program-guide`
        },
        {
            id: 'privacy',
            title: 'Privacy',
            description: 'How to manage data inventory, ROPA, DSAR, transfers, and breach response.',
            icon: Lock,
            badge: 'Privacy',
            href: `${base}/privacy/program-guide`
        },
        {
            id: 'bcp',
            title: 'Business Continuity',
            description: 'Build continuity plans, scenarios, call trees, tasks, and recovery readiness.',
            icon: Activity,
            badge: 'BCP',
            href: `${base}/business-continuity/program-guide`
        },
        {
            id: 'federal',
            title: 'Federal Compliance',
            description: 'Navigate federal workflows and artifacts (RMF, SSP, SAR, POA&M) with a structured guide and 90-day roadmap.',
            icon: Building2,
            badge: 'Federal',
            href: `${base}/federal/program-guide`
        },
        {
            id: 'dora',
            title: 'DORA Digital Operational Resilience',
            description: 'Regulation (EU) 2022/2554: ICT risk, incident reporting, resilience testing, TPRM, and 90-day roadmap.',
            icon: Shield,
            badge: 'DORA',
            href: `${base}/dora`
        },
        {
            id: 'nis2',
            title: 'NIS2 Cyber Resilience',
            description: 'Directive (EU) 2022/2555: Entity classification, Art. 21 security measures, CSIRT 24h reporting, and 90-day roadmap.',
            icon: Shield,
            badge: 'NIS2',
            href: `${base}/nis2`
        }
    ];

    return (
        <DashboardLayout fullWidth={true}>
            <div className="relative min-h-screen bg-slate-50 pl-0 pr-4 py-8 md:pl-0 md:pr-8 space-y-8 animate-in fade-in duration-500">
                <div className="w-full space-y-8">
                    <div className="text-center space-y-5">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 text-indigo-700 shadow-sm border border-indigo-200">
                            <BookOpen className="w-8 h-8" />
                        </div>
                        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Guides</h1>
                        <p className="text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto">
                            Practical “how to run the program” playbooks for each module. Use these to onboard teams and build audit-ready workflows.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                        {guides.map((g) => {
                            const Icon = g.icon;
                            return (
                                <Card key={g.id} className="rounded-3xl border-slate-200 shadow-sm hover:shadow-md transition-all bg-white">
                                    <CardHeader className="space-y-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                                                <Icon className="w-6 h-6 text-indigo-700" />
                                            </div>
                                            <Badge variant="secondary" className="bg-slate-100 text-slate-700 border-slate-200">
                                                {g.badge}
                                            </Badge>
                                        </div>
                                        <CardTitle className="text-xl">{g.title}</CardTitle>
                                        <CardDescription className="text-sm text-slate-600">
                                            {g.description}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <Link href={g.href}>
                                            <Button className="w-full gap-2">
                                                Open Guide
                                                <ArrowRight className="w-4 h-4" />
                                            </Button>
                                        </Link>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}

