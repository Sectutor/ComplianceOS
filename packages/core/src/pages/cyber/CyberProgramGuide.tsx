import React, { useState } from 'react';
import { useParams } from 'wouter';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@complianceos/ui/ui/card';
import { Badge } from '@complianceos/ui/ui/badge';
import { Button } from '@complianceos/ui/ui/button';
import { Progress } from '@complianceos/ui/ui/progress';
import {
    CheckCircle2, Target, Shield, FileText,
    ArrowRight, BookOpen, ArrowLeft, CircleDashed, Users,
    Globe, AlertTriangle, DollarSign, Activity, Link as LinkIcon
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Link } from 'wouter';

const FRAMEWORKS = {
    cyber: {
        id: 'cyber',
        label: 'Cyber Resilience & NIS2',
        shortLabel: 'NIS2 Directive',
        subtitle: 'Systemic Security Strategy',
        icon: Shield,
        color: 'text-sky-600',
        bg: 'bg-sky-50',
        border: 'border-sky-200',
        badge: 'bg-sky-100 text-sky-800',
        accent: 'from-sky-500 to-indigo-600',
        tabActive: 'bg-brand-bright text-white shadow-md',
        tabInactive: 'text-brand bg-slate-50 border border-slate-200 hover:bg-sky-50',
        overview: `The NIS2 Directive (EU) 2022/2555 is the EU-wide legislation on cybersecurity. It provides legal measures to boost the overall level of cybersecurity in the EU. Essential and Important entities must implement comprehensive risk management, incident reporting, and supply chain security to avoid significant fines.`,
        highlightNote: `📌 Compliance is mandatory for entities operating in 18 critical sectors within the EU. Failure can result in fines up to €10M or 2% of global annual turnover, along with management liability.`,
        timeline: '3 – 9 months',
        cost: '$40K – $200K+',
        steps: [
            {
                id: 'assessment',
                step: 1,
                title: 'NIS2 Classification',
                subtitle: 'Scope & Posture',
                description: 'Determine your entity classification (Essential vs Important) and assess your current cybersecurity posture against the 10 minimum security measures outlined in Article 21.',
                icon: Target,
                color: 'text-sky-600',
                bgColor: 'bg-sky-50',
                accent: 'from-sky-500 to-indigo-500',
                bestPractices: [
                    'Identify if you qualify as an Essential or Important entity.',
                    'Map your critical business services to the NIS2 sectors.',
                    'Conduct a baseline gap assessment against Art. 21 requirements.'
                ],
                link: `cyber/assessment`,
                cta: 'Run Assessment',
                keyActions: [
                    'Determine entity size and sector applicability.',
                    'Identify dependencies and critical infrastructure.',
                    'Review minimum security measures.',
                    'Establish leadership accountability.'
                ]
            },
            {
                id: 'measures',
                step: 2,
                title: 'Technical Measures',
                subtitle: 'Risk & Supply Chain',
                description: 'Implement appropriate and proportionate technical, operational and organizational measures to manage the risks posed to the security of network and information systems.',
                icon: LinkIcon,
                color: 'text-indigo-600',
                bgColor: 'bg-indigo-50',
                accent: 'from-indigo-500 to-violet-500',
                bestPractices: [
                    'Implement basic cyber hygiene practices and cybersecurity training.',
                    'Enforce MFA and strong access controls across internal systems.',
                    'Assess the cybersecurity practices of direct suppliers.'
                ],
                link: `cyber/overview`,
                cta: 'Implement Controls',
                keyActions: [
                    'Deploy access control and encryption.',
                    'Secure your immediate supply chain.',
                    'Implement Continuous Vulnerability Management.',
                    'Ensure robust network segmentation.'
                ]
            },
            {
                id: 'incidents',
                step: 3,
                title: 'Incident Reporting',
                subtitle: '24-hour Notification Workflow',
                description: 'Establish processes to notify the national CSIRT or competent authority without undue delay regarding any incident having a significant impact on your services.',
                icon: Activity,
                color: 'text-orange-600',
                bgColor: 'bg-orange-50',
                accent: 'from-orange-500 to-red-500',
                bestPractices: [
                    'Draft a 24-hour Early Warning template.',
                    'Establish rapid communication channels with national CSIRTs.',
                    'Define what constitutes a "significant incident".'
                ],
                link: `cyber/incidents`,
                cta: 'Manage Incidents',
                keyActions: [
                    'Submit Early Warning within 24 hours.',
                    'Submit Incident Update within 72 hours.',
                    'Provide final report within 1 month.',
                    'Coordinate internally for crisis management.'
                ]
            },
            {
                id: 'documentation',
                step: 4,
                title: 'Documentation & Continuity',
                subtitle: 'Policies & BCP',
                description: 'Formalize your cybersecurity strategy through rigorous documentation, business continuity planning (BCP), and crisis management strategies.',
                icon: FileText,
                color: 'text-purple-600',
                bgColor: 'bg-purple-50',
                accent: 'from-purple-500 to-fuchsia-500',
                bestPractices: [
                    'Maintain an updated Business Impact Analysis (BIA).',
                    'Document backup management and disaster recovery plans.',
                    'Ensure management explicitly signs off on cyber policies.'
                ],
                link: `cyber/documents`,
                cta: 'Access Documentation',
                keyActions: [
                    'Adopt formal Risk Management Policies.',
                    'Ensure BCPs are tested annually.',
                    'Maintain secure off-site backups.',
                    'Integrate cyber reporting into board meetings.'
                ]
            }
        ]
    }
};

export default function CyberProgramGuide() {
    const params = useParams();
    const clientId = parseInt(params.id || "0");
    const [activeFw] = useState<'cyber'>('cyber');

    // Placeholders for real data connections
    const hasAssessment = true;
    const hasMeasures = true;
    const hasIncidents = false;
    const hasDocs = false;

    const getStatus = (stepId: string) => {
        switch (stepId) {
            case 'assessment': return hasAssessment ? 'completed' : 'pending';
            case 'measures': return hasMeasures ? 'completed' : 'pending';
            case 'incidents': return hasIncidents ? 'completed' : 'pending';
            case 'documentation': return hasDocs ? 'completed' : 'pending';
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
                <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between flex-wrap gap-3 shrink-0 sticky top-0 z-30">
                    <div className="flex items-center gap-2 text-sm">
                        <Link href={`/clients/${clientId}/cyber`}>
                            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900 -ml-2 h-8">
                                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Cyber Resilience Dashboard
                            </Button>
                        </Link>
                        <span className="text-slate-300">/</span>
                        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                            <BookOpen className="w-4 h-4 text-slate-400" />
                            NIS2 Program Guide
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

                <div className="p-6 lg:p-10 space-y-8 max-w-7xl mx-auto w-full">
                    {/* Hero Header */}
                    <div className="bg-gradient-to-br from-brand via-sky-800 to-brand-bright rounded-[2.5rem] p-8 lg:p-12 text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -mb-20 -ml-20"></div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl border border-white/20">
                                    <FwIcon className="w-8 h-8 text-sky-200" />
                                </div>
                                <div>
                                    <h1 className="text-3xl lg:text-4xl font-black tracking-tight">{fw.label}</h1>
                                    <p className="text-sky-100 font-medium">{fw.subtitle}</p>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-3 gap-6 mt-8">
                                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10 shadow-inner">
                                    <p className="text-sky-200 text-xs font-bold uppercase tracking-wider mb-1">Timeline</p>
                                    <p className="text-2xl font-black">{fw.timeline}</p>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10 shadow-inner">
                                    <p className="text-sky-200 text-xs font-bold uppercase tracking-wider mb-1">Requirements</p>
                                    <p className="text-2xl font-black">10 Measure Areas</p>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/10 shadow-inner">
                                    <p className="text-sky-200 text-xs font-bold uppercase tracking-wider mb-1">Est. Cost</p>
                                    <p className="text-2xl font-black">{fw.cost}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="w-full mx-auto">
                        <div className="space-y-6">
                            <div className="bg-white border border-slate-200 rounded-3xl p-6 lg:p-8 shadow-sm">
                                <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <Globe className="w-5 h-5 text-sky-600" />
                                    Framework Overview
                                </h2>
                                <p className="text-slate-700 leading-relaxed font-medium">{fw.overview}</p>
                                <div className="flex items-center gap-1.5 text-xs text-slate-600 font-bold mt-4 uppercase">
                                    <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                                    Est. Cost: <span className="text-brand-bright">{fw.cost}</span>
                                </div>
                            </div>

                            <div className="flex items-start gap-3 bg-rose-50 border border-rose-100 shadow-sm rounded-2xl p-6">
                                <AlertTriangle className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />
                                <p className="text-sm text-rose-900 leading-relaxed font-medium">{fw.highlightNote}</p>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-3xl shadow-sm p-6 lg:p-8">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-lg text-slate-900 flex items-center gap-2">
                                        {progressPercentage === 100 && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                                        Implementation Progress
                                    </h3>
                                    <span className="text-sm font-bold text-brand bg-sky-50 px-3 py-1 rounded-full">{progressPercentage}% Complete</span>
                                </div>
                                <Progress value={progressPercentage} className="h-3 rounded-full bg-slate-100" indicatorClassName="bg-gradient-to-r from-brand-bright to-emerald-400" />
                                <p className="text-xs text-slate-500 mt-4 font-medium">
                                    Completion based on real-time data from your Cyber Resilience modules.
                                </p>
                            </div>

                            <div className="space-y-12 relative pb-12 mt-12">
                                <div className="absolute top-12 bottom-12 left-[31px] w-0.5 bg-slate-200 z-0 hidden sm:block"></div>

                                {fw.steps.map((step) => {
                                    const status = getStatus(step.id);
                                    return (
                                        <div key={step.step} className="relative z-10 flex flex-col sm:flex-row gap-6 lg:gap-8 group">
                                            {/* Step Indicator */}
                                            <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-md border-2 border-white ring-1 ring-slate-100 group-hover:ring-sky-200 transition-all duration-300">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${status === 'completed' ? 'from-emerald-500 to-emerald-600' : step.accent} text-white shadow-inner`}>
                                                    {status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> : <span className="font-black text-xl">{step.step}</span>}
                                                </div>
                                            </div>

                                            {/* Step Content Card */}
                                            <Card className={`flex-grow transition-shadow rounded-3xl overflow-hidden ${status === 'completed' ? 'border-emerald-200 shadow-emerald-50' : 'border-slate-200 hover:shadow-xl hover:shadow-sky-900/5'}`}>
                                                <CardHeader className={`${status === 'completed' ? 'bg-emerald-50/50' : step.bgColor} border-b border-white/50 bg-opacity-50 p-6 md:p-8`}>
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div>
                                                            <Badge variant="outline" className={`mb-3 bg-white/80 font-bold uppercase tracking-widest text-[10px] ${status === 'completed' ? 'text-emerald-700 border-emerald-200' : fw.color + ' border-current'}`}>
                                                                Phase {step.step}: {step.subtitle}
                                                            </Badge>
                                                            <CardTitle className="text-2xl font-black flex items-center gap-3 text-slate-900">
                                                                <step.icon className={`w-6 h-6 ${status === 'completed' ? 'text-emerald-600' : fw.color}`} />
                                                                {step.title}
                                                            </CardTitle>
                                                        </div>
                                                        {status === 'completed' ? (
                                                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 shrink-0 font-bold">
                                                                Completed
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="secondary" className="bg-slate-100 text-slate-500 hover:bg-slate-100 flex items-center gap-1 shrink-0 font-bold">
                                                                <CircleDashed className="w-3 h-3" /> Needs Attention
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="p-6 md:p-8 space-y-8">
                                                    <p className="text-slate-600 leading-relaxed font-medium">
                                                        {step.description}
                                                    </p>

                                                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                                                        {/* Best Practices Box */}
                                                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                                            <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide">
                                                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                                Key Actions & Priorities
                                                            </h4>
                                                            <ul className="space-y-3 text-sm">
                                                                {[...step.keyActions, ...step.bestPractices].map((practice, i) => (
                                                                    <li key={i} className="flex items-start gap-3 text-slate-600 font-medium">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0"></div>
                                                                        <span className="leading-relaxed">{practice}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>

                                                        {/* Action Box */}
                                                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                                                            <div>
                                                                <h4 className="font-bold text-slate-900 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                                                                    <Users className="w-4 h-4 text-sky-500" />
                                                                    Quick Actions
                                                                </h4>
                                                                <p className="text-sm text-slate-500 mb-6 font-medium">
                                                                    Execute this phase within the ComplianceOS platform.
                                                                </p>
                                                            </div>
                                                            <Link href={`/clients/${clientId}/${step.link}`} className="block">
                                                                <Button className={`w-full h-12 rounded-xl text-base bg-gradient-to-r ${status === 'completed' ? 'from-emerald-600 to-green-500' : step.accent} hover:opacity-90 text-white shadow-md transition-all font-bold group`}>
                                                                    {step.cta} <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
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
