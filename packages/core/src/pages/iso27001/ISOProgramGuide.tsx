import React, { useState } from 'react';
import { useParams, Link } from 'wouter';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@complianceos/ui/ui/card';
import { Badge } from '@complianceos/ui/ui/badge';
import { Button } from '@complianceos/ui/ui/button';
import { Progress } from '@complianceos/ui/ui/progress';
import {
    CheckCircle2, Target, Database, Shield, Lock, FileText, ClipboardList,
    ArrowRight, BookOpen, ArrowLeft, Info, CircleDashed, Users, Calendar,
    Globe, Settings, AlertTriangle, DollarSign
} from 'lucide-react';
import { trpc } from '@/lib/trpc';

const FRAMEWORKS = {
    iso27001: {
        id: 'iso27001',
        label: 'ISO/IEC 27001:2022',
        shortLabel: 'ISO 27001',
        subtitle: 'ISMS Certification',
        icon: Globe,
        color: 'text-indigo-700',
        bg: 'bg-indigo-50',
        border: 'border-indigo-200',
        badge: 'bg-indigo-100 text-indigo-800',
        accent: 'from-indigo-600 to-violet-600',
        tabActive: 'bg-indigo-600 text-white shadow-md',
        tabInactive: 'text-indigo-700 bg-indigo-50/50 border border-indigo-200 hover:bg-indigo-100',
        overview: `ISO/IEC 27001:2022 is the global standard for Information Security Management Systems (ISMS). It provides a systematic approach to managing sensitive company information through risk assessment, treatment, and continuous improvement. Certification demonstrates your commitment to information security.`,
        highlightNote: `📌 Required for organizations seeking formal ISO 27001 certification. Start with the Statement of Applicability (SoA) to define scope, then systematically implement controls. Certification typically takes 6-12 months.`,
        timeline: '6 – 12 months',
        cost: '$50K – $300K+',
        steps: [
            {
                id: 'context',
                step: 1,
                title: 'Organization Context',
                subtitle: 'ISMS Scope & Leadership',
                description: 'Define the scope of your Information Security Management System (ISMS) and establish leadership commitment. Identify internal and external issues, interested parties, and boundaries.',
                icon: Target,
                color: 'text-indigo-600',
                bgColor: 'bg-indigo-50',
                accent: 'from-indigo-600 to-violet-600',
                bestPractices: [
                    'Define ISMS scope clearly - processes, locations, and assets.',
                    'Obtain explicit commitment from top management (C-level).',
                    'Document organizational context in the Statement of Applicability (SoA).'
                ],
                link: `iso27001/soa`,
                cta: 'Configure ISMS Context',
                keyActions: [
                    'Define ISMS scope and boundaries.',
                    'Identify interested parties and their requirements.',
                    'Obtain leadership commitment.',
                    'Establish information security policy.'
                ]
            },
            {
                id: 'assets',
                step: 2,
                title: 'Asset Inventory',
                subtitle: 'Information Asset Register',
                description: 'Identify and classify all information assets within the ISMS scope. Assets include hardware, software, data, and people that support business processes.',
                icon: Database,
                color: 'text-violet-600',
                bgColor: 'bg-violet-50',
                accent: 'from-violet-500 to-purple-500',
                bestPractices: [
                    'Classify assets by sensitivity and criticality.',
                    'Assign asset owners responsible for protecting each asset.',
                    'Include asset dependencies and data flows.'
                ],
                link: `iso27001/assets`,
                cta: 'Manage Assets',
                keyActions: [
                    'Inventory all information assets.',
                    'Classify assets (Confidential, Internal, Public).',
                    'Assign asset owners.',
                    'Document data flows and dependencies.'
                ]
            },
            {
                id: 'risks',
                step: 3,
                title: 'Risk Assessment',
                subtitle: 'ISO 27005 Risk Treatment',
                description: 'Conduct systematic risk assessments following ISO 27005 guidelines. Identify threats, vulnerabilities, and potential impacts to determine risk levels.',
                icon: Shield,
                color: 'text-pink-600',
                bgColor: 'bg-pink-50',
                accent: 'from-pink-600 to-rose-600',
                bestPractices: [
                    'Use a consistent risk assessment methodology.',
                    'Document risk owners and acceptance thresholds.',
                    'Review and update risk assessments annually.'
                ],
                link: `iso27001/risks`,
                cta: 'View Risk Register',
                keyActions: [
                    'Identify risks to information assets.',
                    'Analyze likelihood and impact.',
                    'Evaluate and prioritize risks.',
                    'Document risk treatment plans.'
                ]
            },
            {
                id: 'controls',
                step: 4,
                title: 'Annex A Controls',
                subtitle: 'Control Implementation',
                description: 'Implement the applicable controls from Annex A of ISO 27001. These controls address people, physical, technological, and organizational security aspects.',
                icon: Lock,
                color: 'text-purple-600',
                bgColor: 'bg-purple-50',
                accent: 'from-purple-600 to-indigo-600',
                bestPractices: [
                    'Complete the Statement of Applicability (SoA).',
                    'Map controls to specific assets and risks.',
                    'Document implementation evidence.'
                ],
                link: `iso27001/soa`,
                cta: 'Manage Controls',
                keyActions: [
                    'Review all 93 Annex A controls.',
                    'Justify inclusions and exclusions in SoA.',
                    'Implement applicable controls.',
                    'Document control implementation.'
                ]
            },
            {
                id: 'documentation',
                step: 5,
                title: 'Documentation',
                subtitle: 'Policies & Procedures',
                description: 'Create and maintain required documentation including Information Security Policy, procedures, and records mandated by ISO 27001.',
                icon: FileText,
                color: 'text-rose-600',
                bgColor: 'bg-rose-50',
                accent: 'from-rose-600 to-pink-600',
                bestPractices: [
                    'Follow ISO 27001 documented information requirements.',
                    'Ensure documents are approved and current.',
                    'Maintain records as evidence of conformance.'
                ],
                link: `iso27001/documents`,
                cta: 'Manage Documents',
                keyActions: [
                    'Develop information security policies.',
                    'Create required procedures and work instructions.',
                    'Establish record keeping requirements.',
                    'Implement document control.'
                ]
            },
            {
                id: 'audit',
                step: 6,
                title: 'Internal Audit',
                subtitle: 'Audit & Management Review',
                description: 'Conduct internal audits and management reviews to ensure the ISMS is functioning effectively and achieving its objectives.',
                icon: ClipboardList,
                color: 'text-teal-600',
                bgColor: 'bg-teal-50',
                accent: 'from-teal-600 to-cyan-600',
                bestPractices: [
                    'Plan internal audits with a multi-year schedule.',
                    'Document audit findings and corrective actions.',
                    'Conduct management reviews per ISO 27001 Clause 9.3.'
                ],
                link: `iso27001/audit-manager`,
                cta: 'Plan Audit',
                keyActions: [
                    'Develop internal audit program.',
                    'Conduct internal audits.',
                    'Document nonconformities and corrective actions.',
                    'Hold management review meetings.'
                ]
            }
        ]
    }
};

export default function ISOProgramGuide() {
    const params = useParams();
    const clientId = parseInt(params.id || "0");
    const [activeFw] = useState<'iso27001'>('iso27001');

    // Fetch data for dynamic progress tracking
    const { data: assignments, refetch: refetchAssignments } = trpc.programGuides.getAssignments.useQuery({
        clientId,
        guideType: 'iso27001'
    }, { enabled: !!clientId });

    const { data: readinessData } = trpc.compliance.getReadinessData.useQuery({ clientId }, { enabled: !!clientId });
    const { data: riskAssessments } = trpc.risks.list.useQuery({ clientId }, { enabled: !!clientId });
    const { data: assets } = trpc.assets.list.useQuery({ clientId }, { enabled: !!clientId });
    const { data: policies } = trpc.clientPolicies.list.useQuery({ clientId }, { enabled: !!clientId });
    const { data: evidenceList } = trpc.evidence.list.useQuery({ clientId }, { enabled: !!clientId });

    const hasSoA = (readinessData?.coverage?.controlStats?.implemented || 0) > 0;
    const hasRisks = !!riskAssessments && riskAssessments.length > 0;
    const hasAssets = !!assets && assets.length > 0;
    const hasControls = (readinessData?.coverage?.controlStats?.implemented || 0) > 40;
    // For documentation and audit, we check if there's relevant data
    const hasDocs = !!policies && policies.length > 0;
    const hasAudit = !!evidenceList && evidenceList.length > 0;

    const getStatus = (stepId: string) => {
        switch (stepId) {
            case 'context': return hasSoA ? 'completed' : 'pending';
            case 'assets': return hasAssets ? 'completed' : 'pending';
            case 'risks': return hasRisks ? 'completed' : 'pending';
            case 'controls': return hasControls ? 'completed' : 'pending';
            case 'documentation': return hasDocs ? 'completed' : 'pending';
            case 'audit': return hasAudit ? 'completed' : 'pending';
            default: return 'pending';
        }
    };

    const fw = FRAMEWORKS[activeFw];
    const FwIcon = fw.icon;

    const completedSteps = fw.steps.filter(s => getStatus(s.id) === 'completed').length;
    const progressPercentage = Math.round((completedSteps / fw.steps.length) * 100);

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-slate-50 flex flex-col">
                <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between flex-wrap gap-3 shrink-0">
                    <div className="flex items-center gap-2 text-sm">
                        <Link href={`/clients/${clientId}/iso27001`}>
                            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900 -ml-2 h-8">
                                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> ISO 27001 Dashboard
                            </Button>
                        </Link>
                        <span className="text-slate-300">/</span>
                        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                            <BookOpen className="w-4 h-4 text-slate-400" />
                            ISO 27001 Program Guide
                        </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        <button
                            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${fw.tabActive}`}
                        >
                            {fw.shortLabel}
                        </button>
                    </div>
                </div>

                <div className="p-6 lg:p-10 space-y-8">
                    <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 rounded-3xl p-8 lg:p-12 text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl">
                                    <FwIcon className="w-8 h-8" />
                                </div>
                                <div>
                                    <h1 className="text-3xl lg:text-4xl font-black tracking-tight">{fw.label}</h1>
                                    <p className="text-indigo-200 font-medium">{fw.subtitle}</p>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-3 gap-6 mt-8">
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                                    <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">Timeline</p>
                                    <p className="text-2xl font-black">{fw.timeline}</p>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                                    <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">Controls</p>
                                    <p className="text-2xl font-black">93 Controls</p>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                                    <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">Est. Cost</p>
                                    <p className="text-2xl font-black">{fw.cost}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="w-full mx-auto">
                        <div className="space-y-6">
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-8 shadow-sm">
                                <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <Globe className="w-5 h-5 text-indigo-600" />
                                    Framework Overview
                                </h2>
                                <p className="text-slate-700 leading-relaxed">{fw.overview}</p>
                                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold mt-4">
                                    <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                                    Est. Cost: <strong>{fw.cost}</strong>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 bg-white border border-slate-200 shadow-sm rounded-xl p-5">
                                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                                <p className="text-sm text-slate-700 leading-relaxed font-medium">{fw.highlightNote}</p>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 lg:p-8">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-lg text-slate-900 flex items-center gap-2">
                                        {progressPercentage === 100 && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                                        Implementation Progress
                                    </h3>
                                    <span className="text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">{progressPercentage}% Complete</span>
                                </div>
                                <Progress value={progressPercentage} className="h-3 rounded-full" />
                                <p className="text-xs text-slate-500 mt-4">
                                    Completion based on real-time data from your ISO 27001 modules.
                                </p>
                            </div>

                            <div className="space-y-12 relative pb-12">
                                <div className="absolute top-12 bottom-12 left-[31px] w-0.5 bg-slate-200 z-0 hidden sm:block"></div>

                                {fw.steps.map((step) => {
                                    const status = getStatus(step.id);
                                    return (
                                        <div key={step.step} className="relative z-10 flex flex-col sm:flex-row gap-6 lg:gap-8 group">
                                            <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-md border-2 border-white ring-1 ring-slate-100 group-hover:ring-slate-300 transition-all duration-300">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${status === 'completed' ? 'from-emerald-500 to-green-600' : step.accent} text-white shadow-inner`}>
                                                    {status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> : <span className="font-black text-xl">{step.step}</span>}
                                                </div>
                                            </div>

                                            <Card className={`flex-grow transition-shadow ${status === 'completed' ? 'border-emerald-200 shadow-emerald-100/50' : 'border-slate-200 hover:shadow-md'}`}>
                                                <CardHeader className={`${status === 'completed' ? 'bg-emerald-50/50' : step.bgColor} border-b border-white rounded-t-xl bg-opacity-50 pb-5`}>
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div>
                                                            <Badge variant="outline" className={`mb-2 bg-white/80 ${status === 'completed' ? 'text-emerald-700 border-emerald-200' : fw.color + ' border-current'}`}>
                                                                Phase {step.step}: {step.subtitle}
                                                            </Badge>
                                                            <CardTitle className="text-xl font-bold flex items-center gap-3">
                                                                <step.icon className={`w-5 h-5 ${status === 'completed' ? 'text-emerald-600' : fw.color}`} />
                                                                {step.title}
                                                            </CardTitle>
                                                        </div>
                                                        {status === 'completed' ? (
                                                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 shrink-0">
                                                                Completed
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-100 flex items-center gap-1 shrink-0">
                                                                <CircleDashed className="w-3 h-3" /> Needs Attention
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="pt-6 space-y-6">
                                                    <p className="text-slate-700 leading-relaxed text-sm md:text-base">
                                                        {step.description}
                                                    </p>

                                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
                                                            <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2 text-sm">
                                                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                                Key Actions & Best Practices
                                                            </h4>
                                                            <ul className="space-y-2 text-sm">
                                                                {[...step.keyActions, ...step.bestPractices].map((practice, i) => (
                                                                    <li key={i} className="flex items-start gap-3 text-slate-600">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0"></div>
                                                                        <span className="leading-relaxed">{practice}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>

                                                        <div className="bg-white p-5 rounded-xl border border-slate-200">
                                                            <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2 text-sm">
                                                                <Users className="w-4 h-4 text-indigo-500" />
                                                                Quick Actions
                                                            </h4>
                                                            <p className="text-xs text-slate-500 mb-4">
                                                                Click the button below to navigate to this section.
                                                            </p>
                                                            <Link href={`/clients/${clientId}/${step.link}`} className="block">
                                                                <Button className={`w-full bg-gradient-to-r ${status === 'completed' ? 'from-emerald-600 to-green-600' : step.accent} hover:opacity-90 text-white shadow-md transition-all font-semibold`}>
                                                                    {step.cta} <ArrowRight className="w-4 h-4 ml-2" />
                                                                </Button>
                                                            </Link>
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
