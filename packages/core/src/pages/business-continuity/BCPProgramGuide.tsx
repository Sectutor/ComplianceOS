import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'wouter';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@complianceos/ui/ui/card';
import { Badge } from '@complianceos/ui/ui/badge';
import { Button } from '@complianceos/ui/ui/button';
import {
    CheckCircle2, Activity, AlertTriangle, FileText, PhoneCall, PlayCircle,
    ArrowRight, BookOpen, ArrowLeft, Info, CircleDashed, Users, Calendar,
    Globe, CalendarClock, Download, ExternalLink, ShieldCheck, Layers,
    Lock, Server, GitMerge, Building, Target, CheckSquare, RefreshCw, BarChart3, Database, ShieldAlert, Cpu,
    Sparkles
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Progress } from '@complianceos/ui/ui/progress';
import { format } from 'date-fns';
import { AssignProgramTaskModal } from '@/components/AssignProgramTaskModal';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useClientContext } from '@/contexts/ClientContext';
import { Framework90DayRoadmap } from '@/components/roadmap/Framework90DayRoadmap';
import { getBcpRoadmap } from '@/data/frameworkRoadmaps';

interface BCPProgramGuideProps {
    id?: string | number;
    clientId?: string | number;
}

export default function BCPProgramGuide(props?: BCPProgramGuideProps) {
    const params = useParams<{ id?: string; clientId?: string }>();
    const [location, setLocation] = useLocation();
    const { selectedClientId } = useClientContext();
    const urlMatch = location.match(/\/clients\/(\d+)/);
    const idParam = props?.id || props?.clientId || params?.id || params?.clientId || (urlMatch ? urlMatch[1] : undefined);
    const clientId = typeof idParam === "number" ? idParam : parseInt(idParam || "0", 10) || selectedClientId || 0;

    // Read ?tab= query parameter
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const tabParam = searchParams?.get('tab');
    const validTabs: Array<'playbook' | 'roadmap' | 'architecture' | 'auditor'> = ['playbook', 'roadmap', 'architecture', 'auditor'];
    const initialTab = validTabs.includes(tabParam as any) ? (tabParam as any) : 'playbook';
    const [activeTab, setActiveTab] = useState<'playbook' | 'roadmap' | 'architecture' | 'auditor'>(initialTab);

    // Track origin if user navigated from Start Here
    const [returnToStartHere, setReturnToStartHere] = useState<string | null>(() => {
        if (typeof window === 'undefined') return null;
        try {
            const sp = new URLSearchParams(window.location.search);
            const returnTo = sp.get('returnTo');
            if (returnTo && returnTo.includes('/start-here')) {
                const payload = JSON.stringify({ url: returnTo, timestamp: Date.now() });
                sessionStorage.setItem(`bcp_start_here_origin_${clientId}`, payload);
                return returnTo;
            }
            if (document.referrer && document.referrer.includes('/start-here')) {
                const defaultUrl = `/clients/${clientId}/start-here`;
                const payload = JSON.stringify({ url: defaultUrl, timestamp: Date.now() });
                sessionStorage.setItem(`bcp_start_here_origin_${clientId}`, payload);
                return defaultUrl;
            }
            const stored = sessionStorage.getItem(`bcp_start_here_origin_${clientId}`);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed?.url && parsed.url.includes('/start-here')) {
                    return parsed.url;
                }
            }
            const startHereStored = sessionStorage.getItem(`start_here_origin_${clientId}`);
            if (startHereStored) {
                const parsed = JSON.parse(startHereStored);
                if (parsed?.url && parsed.url.includes('/start-here') && (Date.now() - (parsed.timestamp || 0)) < 2 * 60 * 60 * 1000) {
                    sessionStorage.setItem(`bcp_start_here_origin_${clientId}`, JSON.stringify({
                        url: parsed.url,
                        timestamp: Date.now()
                    }));
                    return parsed.url;
                }
            }
        } catch {}
        return null;
    });

    // Keep origin synced if query parameter changes or is re-introduced
    useEffect(() => {
        try {
            const sp = new URLSearchParams(window.location.search);
            const returnTo = sp.get('returnTo');
            if (returnTo && returnTo.includes('/start-here') && clientId > 0) {
                sessionStorage.setItem(`bcp_start_here_origin_${clientId}`, JSON.stringify({
                    url: returnTo,
                    timestamp: Date.now()
                }));
                setReturnToStartHere(returnTo);
            }
        } catch {}
    }, [clientId, location]);

    const handleTabChange = (newTab: 'playbook' | 'roadmap' | 'architecture' | 'auditor') => {
        setActiveTab(newTab);
        try {
            const u = new URL(window.location.href);
            u.searchParams.set('tab', newTab);
            if (returnToStartHere) {
                u.searchParams.set('returnTo', returnToStartHere);
                u.searchParams.set('returnLabel', 'Start Here');
            }
            window.history.replaceState({}, '', u.toString());
        } catch {}
    };

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const sp = new URLSearchParams(window.location.search);
            const currentTab = sp.get('tab');
            if (currentTab && validTabs.includes(currentTab as any) && currentTab !== activeTab) {
                setActiveTab(currentTab as any);
            }
        }
    }, [location]);

    const handleReturnToStartHere = () => {
        try {
            sessionStorage.removeItem(`bcp_start_here_origin_${clientId}`);
            sessionStorage.removeItem(`start_here_origin_${clientId}`);
        } catch {}
        const target = returnToStartHere || `/clients/${clientId}/start-here`;
        setReturnToStartHere(null);
        setLocation(target);
    };

    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedStep, setSelectedStep] = useState<any>(null);

    // Fetch data for dynamic progress tracking
    const { data: assignments, refetch: refetchAssignments } = trpc.programGuides.getAssignments.useQuery({
        clientId,
        guideType: 'business-continuity'
    }, { enabled: !!clientId });

    const { data: processes } = trpc.businessContinuity.processes.list.useQuery({ clientId }, { enabled: !!clientId });
    const { data: exercises } = trpc.businessContinuity.exercises.listAll.useQuery({ clientId }, { enabled: !!clientId });
    const { data: plans } = trpc.businessContinuity.plans.list.useQuery({ clientId }, { enabled: !!clientId });
    const { data: scenarios } = trpc.businessContinuity.scenarios.list.useQuery({ clientId }, { enabled: !!clientId });

    // Determine completion logic per step
    const hasProcesses = !!processes && processes.length > 0;
    const hasScenarios = !!scenarios && scenarios.length > 0;
    const hasPlans = !!plans && plans.length > 0;
    const hasExercises = !!exercises && exercises.length > 0;

    const getStatus = (stepId: string) => {
        switch (stepId) {
            case 'bia': return hasProcesses ? 'completed' : 'pending';
            case 'scenarios': return hasScenarios ? 'completed' : 'pending';
            case 'plans': return hasPlans ? 'completed' : 'pending';
            case 'calltrees': return 'pending'; // Requires call tree integration
            case 'exercises': return hasExercises ? 'completed' : 'pending';
            default: return 'pending';
        }
    };

    const steps = [
        {
            id: 'bia',
            step: 1,
            title: 'Business Impact Analysis (BIA)',
            subtitle: 'Identify Critical Functions',
            description: 'Determine which business functions are most critical to your organization. Establish Recovery Time Objectives (RTO) and Recovery Point Objectives (RPO) based on the cost of downtime.',
            icon: Activity,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            accent: 'from-blue-600 to-cyan-600',
            bestPractices: [
                'Involve department heads to accurately quantify financial and operational impacts.',
                'Identify upstream and downstream dependencies for each critical function.',
                'Prioritize functions into tiers (e.g., Tier 1: recovering within 24h).'
            ],
            link: `/clients/${clientId}/business-continuity/bia`,
            cta: 'Conduct BIA',
            downloadText: 'Download BIA Template'
        },
        {
            id: 'scenarios',
            step: 2,
            title: 'Disruptive Scenarios',
            subtitle: 'Risk Evaluation',
            description: 'Evaluate the likelihood and impact of specific disaster scenarios (e.g., ransomware, natural disasters, facility loss) that could disrupt your critical operations.',
            icon: AlertTriangle,
            color: 'text-amber-600',
            bgColor: 'bg-amber-50',
            accent: 'from-amber-500 to-orange-500',
            bestPractices: [
                'Consider both physical (facility loss) and digital (ransomware) threats.',
                'Evaluate supply chain disruptions and critical vendor failures.',
                'Use risk assessments to drive which scenarios require detailed recovery plans.'
            ],
            link: `/clients/${clientId}/business-continuity/scenarios`,
            cta: 'Analyze Risks',
            downloadText: 'Download Scenario Matrix'
        },
        {
            id: 'plans',
            step: 3,
            title: 'Recovery Plan Building',
            subtitle: 'Actionable BCP/DR Plans',
            description: 'Develop detailed Business Continuity Plans (BCP) and Disaster Recovery (DR) procedures targeting the recovery of the critical functions and IT systems identified in the BIA.',
            icon: FileText,
            color: 'text-indigo-600',
            bgColor: 'bg-indigo-50',
            accent: 'from-indigo-600 to-cyan-600',
            bestPractices: [
                'Ensure plans are concise, actionable, and checklist-based during a crisis.',
                'Designate alternate processing facilities and backup infrastructure.',
                'Store copies of the recovery plans in secure, off-network locations.'
            ],
            link: `/clients/${clientId}/business-continuity/plans`,
            cta: 'Build Plans',
            downloadText: 'Download Plan Outline'
        },
        {
            id: 'calltrees',
            step: 4,
            title: 'Call Trees & Communication',
            subtitle: 'Crisis Communications',
            description: 'Establish clear communication protocols to notify employees, management, customers, and regulators during an incident.',
            icon: PhoneCall,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
            accent: 'from-emerald-500 to-teal-500',
            bestPractices: [
                'Maintain up-to-date emergency contact information for all staff.',
                'Determine predefined spokespeople for internal and external communications.',
                'Implement an alternate communication channel if standard systems (like email) are down.'
            ],
            link: `/clients/${clientId}/business-continuity/call-tree`,
            cta: 'Configure Comm. Trees',
            downloadText: 'Download Call Tree Template'
        },
        {
            id: 'exercises',
            step: 5,
            title: 'Tabletop Exercises',
            subtitle: 'Testing & Maintenance',
            description: 'A plan is only as good as its last test. Regularly conduct tabletop exercises and simulations to validate the effectiveness of your BCP and train personnel.',
            icon: PlayCircle,
            color: 'text-cyan-600',
            bgColor: 'bg-cyan-50',
            accent: 'from-cyan-600 to-teal-600',
            bestPractices: [
                'Schedule tabletop exercises at least annually involving key executives.',
                'Use realistic, dynamic scenarios that test the limits of your recovery procedures.',
                'Document lessons learned in an After Action Report (AAR) and update plans accordingly.'
            ],
            link: `/clients/${clientId}/business-continuity/exercises`,
            cta: 'Schedule Exercises',
            downloadText: 'Download Exercise Ideas'
        }
    ];

    const completedSteps = steps.filter(s => getStatus(s.id) === 'completed').length;
    const progressPercentage = Math.round((completedSteps / steps.length) * 100);

    return (
        <DashboardLayout fullWidth={true}>
            <div className="space-y-6 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                {/* Breadcrumb & Navigation bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                        <Button
                            variant={returnToStartHere ? "outline" : "ghost"}
                            size="sm"
                            onClick={handleReturnToStartHere}
                            className={cn(
                                "h-8 gap-1.5 font-bold text-xs transition-colors",
                                returnToStartHere
                                    ? "border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 shadow-xs"
                                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                            )}
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Back to Start Here
                        </Button>
                        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Business Continuity Program (BCP) Guide
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link href={`/clients/${clientId}/business-continuity`}>
                            <Button variant="outline" size="sm" className="gap-2 text-xs font-bold">
                                <Activity className="w-3.5 h-3.5 text-emerald-600" />
                                Continuity Dashboard
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Start Here Return Banner */}
                {returnToStartHere && (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                                        Strategic Roadmap Workflow Active
                                    </span>
                                    <Badge className="bg-emerald-600/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/30 text-[10px] font-bold">
                                        Origin Saved
                                    </Badge>
                                </div>
                                <p className="text-xs text-foreground mt-0.5 font-medium">
                                    You navigated to this guide from the <strong>Start Here Command Center</strong>.
                                </p>
                            </div>
                        </div>
                        <Button
                            size="sm"
                            onClick={handleReturnToStartHere}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-9 px-4 rounded-xl shadow-xs gap-2 shrink-0 self-start sm:self-auto transition-all"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Start Here
                        </Button>
                    </div>
                )}

                {/* Hero Banner */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 p-6 md:p-8 text-white shadow-xl">
                    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="space-y-3 max-w-3xl">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-xs font-bold uppercase tracking-wider">
                                    ISO 22301:2019 Security & Resilience
                                </Badge>
                                <Badge className="bg-teal-500/20 text-teal-300 border-teal-400/30 text-xs font-bold">
                                    Disaster Recovery & BIA Ready
                                </Badge>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                                Business Continuity Program (BCP) Guide
                            </h1>
                            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                                End-to-end resilience and disruption recovery manual covering Business Impact Analysis (BIA), RTO/RPO tiering, disaster recovery procedures, crisis call tree escalation, and tabletop validation.
                            </p>

                            <div className="pt-2 flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider mr-1">Resilience Standard:</span>
                                <span className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 shadow-sm">
                                    ISO 22301:2019 (Business Continuity Management)
                                </span>
                            </div>
                        </div>

                        {/* Readiness Metric Card */}
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 shrink-0 w-full lg:w-80 space-y-3">
                            <div className="flex justify-between items-center text-xs font-bold text-slate-300">
                                <span>BCP Program Maturity Score</span>
                                <span className="text-white text-base font-black">{progressPercentage}%</span>
                            </div>
                            <Progress value={progressPercentage} className="h-2.5 bg-slate-700" />
                            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 pt-1">
                                <div>Critical Processes: <strong className="text-white">{processes?.length || 0}</strong></div>
                                <div>Recovery Plans: <strong className="text-white">{plans?.length || 0}</strong></div>
                                <div>Threat Scenarios: <strong className="text-white">{scenarios?.length || 0}</strong></div>
                                <div>Tabletop Drills: <strong className="text-white">{exercises?.length || 0}</strong></div>
                            </div>
                            <Button
                                size="sm"
                                onClick={() => handleTabChange('roadmap')}
                                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs mt-2 rounded-lg h-8 gap-1.5 shadow"
                            >
                                <CalendarClock className="w-3.5 h-3.5" />
                                Continue 90-Day Roadmap
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* 4 Tabs Navigation Bar */}
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                    <Button
                        variant={activeTab === 'playbook' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleTabChange('playbook')}
                        className={cn(
                            "gap-2 font-bold text-xs rounded-lg transition-all",
                            activeTab === 'playbook' ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                        )}
                    >
                        <BookOpen className="w-3.5 h-3.5" />
                        Continuity Implementation Playbook
                    </Button>

                    <Button
                        variant={activeTab === 'roadmap' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleTabChange('roadmap')}
                        className={cn(
                            "gap-2 font-bold text-xs rounded-lg transition-all",
                            activeTab === 'roadmap' ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                        )}
                    >
                        <CalendarClock className="w-3.5 h-3.5" />
                        90-Day BCP Roadmap
                    </Button>

                    <Button
                        variant={activeTab === 'architecture' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleTabChange('architecture')}
                        className={cn(
                            "gap-2 font-bold text-xs rounded-lg transition-all",
                            activeTab === 'architecture' ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                        )}
                    >
                        <Layers className="w-3.5 h-3.5" />
                        Failover & DR Architecture
                    </Button>

                    <Button
                        variant={activeTab === 'auditor' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleTabChange('auditor')}
                        className={cn(
                            "gap-2 font-bold text-xs rounded-lg transition-all",
                            activeTab === 'auditor' ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900" : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                        )}
                    >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Executive Resilience & Audit Binder
                    </Button>
                </div>

                {/* Tab 1 Content: Playbook */}
                {activeTab === 'playbook' && (
                    <div className="space-y-6">
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 lg:p-8 shadow-sm">
                                <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                                    <Globe className="w-5 h-5 text-indigo-600" />
                                    Framework Overview
                                </h2>
                                <p className="text-slate-700 leading-relaxed">
                                    A dynamic, structured guide to building resilience and preparing for organizational disruptions based on ISO 22301.
                                </p>
                            </div>

                            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 lg:p-8">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-lg text-slate-900 flex items-center gap-2">
                                        {progressPercentage === 100 && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                                        Program Implementation Progress
                                    </h3>
                                    <span className="text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">{progressPercentage}% Complete</span>
                                </div>
                                <Progress value={progressPercentage} className="h-3 rounded-full" />
                                <p className="text-xs text-slate-500 mt-4">
                                    Completion based on real-time BCP continuity records. Complete all stages to fully initialize the program.
                                </p>
                            </div>

                            <div className="space-y-12 relative pb-12">
                                <div className="absolute top-12 bottom-12 left-[31px] w-0.5 bg-slate-200 z-0 hidden sm:block"></div>

                                {steps.map((step) => {
                                    const status = getStatus(step.id);
                                    return (
                                        <div key={step.id} className="relative z-10 flex flex-col sm:flex-row gap-6 lg:gap-8 group">
                                            <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-md border-2 border-white ring-1 ring-slate-100 group-hover:ring-violet-200 transition-all duration-300">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br ${status === 'completed' ? 'from-emerald-500 to-green-600' : step.accent} text-white shadow-inner`}>
                                                    {status === 'completed' ? <CheckCircle2 className="w-6 h-6" /> : <span className="font-black text-xl">{step.step}</span>}
                                                </div>
                                            </div>

                                            <Card className={`flex-grow transition-shadow ${status === 'completed' ? 'border-emerald-200 shadow-emerald-100/50' : 'border-slate-200 hover:shadow-md'}`}>
                                                <CardHeader className={`${status === 'completed' ? 'bg-emerald-50/50' : step.bgColor} border-b border-white rounded-t-xl bg-opacity-50 pb-5`}>
                                                    <div className="flex items-start justify-between gap-4">
                                                        <div>
                                                            <Badge variant="outline" className={`mb-2 bg-white/80 ${status === 'completed' ? 'text-emerald-700 border-emerald-200' : step.color + ' border-current'}`}>
                                                                Phase {step.step}: {step.subtitle}
                                                            </Badge>
                                                            <CardTitle className="text-xl font-bold flex items-center gap-3">
                                                                <step.icon className={`w-5 h-5 ${status === 'completed' ? 'text-emerald-600' : step.color}`} />
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
                                                                Best Practices
                                                            </h4>
                                                            <ul className="space-y-2 text-sm">
                                                                {step.bestPractices.map((practice, i) => (
                                                                    <li key={i} className="flex items-start gap-3 text-slate-600">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-2 flex-shrink-0"></div>
                                                                        <span className="leading-relaxed">{practice}</span>
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>

                                                        <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
                                                            <div>
                                                                <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2 text-sm">
                                                                    <Users className="w-4 h-4 text-indigo-500" />
                                                                    Task Assignment
                                                                </h4>
                                                                <p className="text-sm text-slate-500 mb-4">Assign this phase to a team member and set a target deadline.</p>

                                                                <div className="space-y-3 border-t border-slate-100 pt-3">
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-xs font-medium text-slate-500 uppercase">Owner</span>
                                                                        <span className="text-sm text-slate-800 font-medium">{assignments?.[step.id]?.owner || 'Unassigned'}</span>
                                                                    </div>
                                                                    <div className="flex items-center justify-between">
                                                                        <span className="text-xs font-medium text-slate-500 uppercase flex items-center gap-1"><Calendar className="w-3 h-3" /> Target Date</span>
                                                                        <span className="text-sm text-slate-800 font-medium">{assignments?.[step.id]?.targetDate ? format(new Date(assignments[step.id].targetDate), 'MMM d, yyyy') : 'Not set'}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <div className="mt-4">
                                                                <Button variant="outline" size="sm" className="w-full text-sm font-semibold" onClick={() => { setSelectedStep(step); setIsAssignModalOpen(true); }}>
                                                                    Manage Assignment
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="pt-2 flex flex-wrap gap-3 items-center">
                                                        <Link href={step.link}>
                                                            <Button className={`bg-gradient-to-r ${status === 'completed' ? 'from-emerald-500 to-green-600' : step.accent} hover:opacity-90 text-white font-medium shadow-md transition-all group-hover:translate-x-1`}>
                                                                {step.cta} <ArrowRight className="w-4 h-4 ml-2" />
                                                            </Button>
                                                        </Link>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-12 text-center pb-8">
                                <Link href={`/clients/${clientId}/business-continuity`}>
                                    <Button size="lg" className="bg-slate-900 hover:bg-slate-800 text-white px-8 h-14 rounded-full shadow-lg hover:shadow-xl transition-all">
                                        Return to Continuity Dashboard
                                    </Button>
                                </Link>
                            </div>
                        </div>
                )}

                {/* TAB 2: 90-Day Roadmap */}
                {activeTab === 'roadmap' && (
                    <div className="space-y-4">
                        {returnToStartHere && (
                            <div className="flex items-center justify-between bg-card border border-border p-3.5 rounded-2xl shadow-xs">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Target className="w-4 h-4 text-emerald-600" />
                                    <span>Active 90-Day Roadmap Execution Mode</span>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleReturnToStartHere}
                                    className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-bold text-xs h-8 gap-1.5"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    Back to Start Here
                                </Button>
                            </div>
                        )}
                        <Framework90DayRoadmap
                            spec={getBcpRoadmap(clientId)}
                            clientId={clientId}
                        />
                    </div>
                )}

                {/* TAB 3: Failover & DR Architecture */}
                {activeTab === 'architecture' && (
                    <Card className="border border-slate-200 dark:border-slate-800 p-6 space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Failover & Disaster Recovery Architecture</h2>
                            <p className="text-sm text-slate-500">High-availability deployment topology, multi-region failover channels, RTO/RPO tolerance tiers, and crisis communication trees.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-5 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-sm text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                                        <Server className="w-4 h-4" /> Multi-Region Failover
                                    </h3>
                                    <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">Active / Hot-Standby</Badge>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400">Automated DNS failover routing with synthetic health checks across secondary cold/warm DR regions.</p>
                                <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc list-inside pt-1">
                                    <li>Primary Region: Multi-AZ Synchronous DB</li>
                                    <li>Secondary Region: Asynchronous WAL Replica</li>
                                    <li>Automated Route 53 latency/failover routing</li>
                                    <li>Container auto-scaling on backup cluster</li>
                                </ul>
                            </div>

                            <div className="border border-blue-200 dark:border-blue-900/50 rounded-xl p-5 bg-blue-50/50 dark:bg-blue-950/20 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-sm text-blue-800 dark:text-blue-300 flex items-center gap-2">
                                        <Target className="w-4 h-4" /> RTO & RPO Tiers
                                    </h3>
                                    <Badge className="bg-blue-100 text-blue-800 text-[10px] font-bold">BIA Aligned</Badge>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400">Strict SLA benchmarks based on organizational business impact analysis downtime cost.</p>
                                <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc list-inside pt-1">
                                    <li>Tier 0 (Core App): RTO &lt; 1h, RPO &lt; 15m</li>
                                    <li>Tier 1 (Client Services): RTO &lt; 4h, RPO &lt; 1h</li>
                                    <li>Tier 2 (Admin/Internal): RTO &lt; 24h, RPO &lt; 12h</li>
                                    <li>Tier 3 (Archival/BI): RTO &lt; 72h, RPO &lt; 24h</li>
                                </ul>
                            </div>

                            <div className="border border-cyan-200 dark:border-cyan-900/50 rounded-xl p-5 bg-cyan-50/50 dark:bg-cyan-950/20 space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-bold text-sm text-cyan-800 dark:text-cyan-300 flex items-center gap-2">
                                        <Database className="w-4 h-4" /> Immutable Backups
                                    </h3>
                                    <Badge className="bg-cyan-100 text-cyan-800 text-[10px] font-bold">WORM Storage</Badge>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400">Ransomware-resilient Write Once Read Many (WORM) storage vaults with air-gapped cryptographic signing.</p>
                                <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1.5 list-disc list-inside pt-1">
                                    <li>Daily encrypted snapshots (30-day retention)</li>
                                    <li>Weekly cold air-gapped glacier archive</li>
                                    <li>Monthly automated restore validation drills</li>
                                    <li>Role separation: Backups cannot be purged</li>
                                </ul>
                            </div>
                        </div>

                        {/* Crisis Escalation Call Tree Protocol */}
                        <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-slate-50 dark:bg-slate-900/50 space-y-4">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <div>
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                                        <PhoneCall className="w-4 h-4 text-emerald-600" />
                                        Crisis Communications & Incident Escalation Hierarchy
                                    </h4>
                                    <p className="text-xs text-slate-500">Established incident command system (ICS) and emergency notification roster during catastrophic system outages.</p>
                                </div>
                                <Link href={`/clients/${clientId}/business-continuity/call-tree`}>
                                    <Button size="sm" variant="outline" className="text-xs font-bold gap-1.5">
                                        <PhoneCall className="w-3.5 h-3.5" /> View Call Trees
                                    </Button>
                                </Link>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <span className="text-slate-500 block text-[11px] font-medium">Incident Commander</span>
                                    <strong className="text-slate-900 dark:text-white text-sm">CISO / VP Eng</strong>
                                    <span className="text-slate-400 block text-[10px] mt-0.5">Overall triage, disaster declaration</span>
                                </div>
                                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <span className="text-slate-500 block text-[11px] font-medium">Technical Recovery Lead</span>
                                    <strong className="text-slate-900 dark:text-white text-sm">Infrastructure Lead</strong>
                                    <span className="text-slate-400 block text-[10px] mt-0.5">Runbook execution, DB restore</span>
                                </div>
                                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <span className="text-slate-500 block text-[11px] font-medium">Communications & PR</span>
                                    <strong className="text-slate-900 dark:text-white text-sm">General Counsel / PR</strong>
                                    <span className="text-slate-400 block text-[10px] mt-0.5">Customer advisory, regulators</span>
                                </div>
                                <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <span className="text-slate-500 block text-[11px] font-medium">People & Facilities</span>
                                    <strong className="text-slate-900 dark:text-white text-sm">People Ops Lead</strong>
                                    <span className="text-slate-400 block text-[10px] mt-0.5">Employee safety, alternate site</span>
                                </div>
                            </div>
                        </div>
                    </Card>
                )}

                {/* TAB 4: Executive Resilience & Audit Binder */}
                {activeTab === 'auditor' && (
                    <Card className="border border-slate-200 dark:border-slate-800 p-6 space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Executive Resilience & Governance Audit Binder</h2>
                                <p className="text-sm text-slate-500">Official ISO 22301 compliance package, disaster recovery evidence, tabletop drill after-action reports, and BIA register.</p>
                            </div>
                            <Button
                                onClick={() => toast.success("Exporting complete BCP & DR Audit Dossier (ZIP)...")}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2"
                            >
                                <Download className="w-4 h-4" />
                                Download BCP Audit Dossier (ZIP)
                            </Button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 dark:bg-slate-900/50 space-y-2">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Master BCP & DR Policy (BCP-POL-01)</h4>
                                    <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">Verified</Badge>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400">Formal ISO 22301 Clause 5.2 compliant policy outlining leadership commitment, disaster roles, testing intervals, and governance cadence.</p>
                                <Button size="sm" variant="outline" className="text-xs font-bold gap-1" onClick={() => toast.success("BCP Policy exported!")}>
                                    Export BCP Policy (PDF)
                                </Button>
                            </div>

                            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 dark:bg-slate-900/50 space-y-2">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">BIA Criticality & RTO/RPO Register (BIA-REG-01)</h4>
                                    <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">{processes?.length || 0} Processes</Badge>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400">Granular analysis of organizational functions, financial disruption curves, maximum tolerable downtime (MTD), and minimum recovery staffing.</p>
                                <Button size="sm" variant="outline" className="text-xs font-bold gap-1" onClick={() => toast.success("BIA Register exported!")}>
                                    Export BIA Matrix (CSV)
                                </Button>
                            </div>

                            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 dark:bg-slate-900/50 space-y-2">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Technical Disaster Recovery Runbooks (DR-PROC-02)</h4>
                                    <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">{plans?.length || 0} Active Plans</Badge>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400">Step-by-step engineering recovery runbooks for database failover, cloud infrastructure spin-up, certificate rotation, and sanity checks.</p>
                                <Button size="sm" variant="outline" className="text-xs font-bold gap-1" onClick={() => toast.success("DR Runbooks exported!")}>
                                    Export Runbooks Dossier
                                </Button>
                            </div>

                            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 dark:bg-slate-900/50 space-y-2">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-bold text-sm text-slate-900 dark:text-white">Tabletop Simulation After-Action Report (TTX-AAR-2026)</h4>
                                    <Badge className="bg-emerald-100 text-emerald-800 text-[10px] font-bold">{exercises?.length || 0} Drills</Badge>
                                </div>
                                <p className="text-xs text-slate-600 dark:text-slate-400">Documented drill results simulating ransomware and cloud outage, including executive participation logs, observed gaps, and corrective action items.</p>
                                <Button size="sm" variant="outline" className="text-xs font-bold gap-1" onClick={() => toast.success("After-Action Report exported!")}>
                                    Export AAR Summary (PDF)
                                </Button>
                            </div>
                        </div>
                    </Card>
                )}
            </div>

            {selectedStep && (
                <AssignProgramTaskModal
                    isOpen={isAssignModalOpen}
                    onClose={() => setIsAssignModalOpen(false)}
                    clientId={clientId}
                    guideType="business-continuity"
                    stepId={selectedStep.id}
                    stepTitle={selectedStep.title}
                    currentUserId={assignments?.[selectedStep.id]?.ownerId}
                    currentTargetDate={assignments?.[selectedStep.id]?.targetDate}
                    onAssignmentUpdated={() => refetchAssignments()}
                />
            )}
        </DashboardLayout>
    );
}
