import React, { useState } from 'react';
import { useParams, Link } from 'wouter';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@complianceos/ui/ui/card';
import { Badge } from '@complianceos/ui/ui/badge';
import { Button } from '@complianceos/ui/ui/button';
import { Progress } from '@complianceos/ui/ui/progress';
import { format } from 'date-fns';
import { AssignProgramTaskModal } from '@/components/AssignProgramTaskModal';
import {
    CheckCircle2, Server, Flame, Activity, Stethoscope, BarChart3,
    ArrowRight, BookOpen, ArrowLeft, Info, CircleDashed, Users, Calendar,
    Globe, Building, Target, Search, ShieldCheck, RefreshCw, Layers,
    Settings, ClipboardCheck, CheckSquare, ActivitySquare, GitMerge,
    AlertTriangle, Clock, DollarSign
} from 'lucide-react';
import { trpc } from '@/lib/trpc';

const FRAMEWORKS = {
    iso: {
        id: 'iso',
        label: 'ISO/IEC 27005:2022',
        shortLabel: 'ISO 27005',
        subtitle: 'Global Risk Standard',
        icon: Globe,
        color: 'text-indigo-700',
        bg: 'bg-indigo-50',
        border: 'border-indigo-200',
        badge: 'bg-indigo-100 text-indigo-800',
        accent: 'from-indigo-600 to-violet-600',
        tabActive: 'bg-indigo-600 text-white shadow-md',
        tabInactive: 'text-indigo-700 bg-indigo-50/50 border border-indigo-200 hover:bg-indigo-100',
        overview: `ISO/IEC 27005:2022 provides flexible guidelines for managing information security risks, primarily supporting an ISO/IEC 27001 ISMS. It emphasizes a structured yet adaptable process focused on context, assessment, treatment, and ongoing review. The 2022 revision streamlined the core risk management process into five main steps.`,
        highlightNote: `📌 Highly flexible and business-oriented. Ideal for global or private sector use, especially when tied to ISO 27001 certification. Adapt the methods (qualitative/quantitative) to fit your organization's context.`,
        timeline: '6 – 12 months',
        cost: '$50K – $300K+',
        steps: [
            {
                id: 'assets',
                step: 1,
                title: 'Establish the Context',
                subtitle: 'Scope & Foundations',
                description: 'Define the organization\'s risk management foundation and boundaries. Identify internal/external issues, stakeholders, scope (e.g., assets, processes), risk criteria (likelihood/impact scales), and risk appetite/tolerance.',
                icon: Target,
                color: 'text-indigo-600',
                bgColor: 'bg-indigo-50',
                accent: 'from-indigo-600 to-violet-600',
                bestPractices: [
                    'Align with business objectives and ISMS (if applicable).',
                    'Document in a risk management policy or context statement.',
                    'Define clear risk criteria before starting assessments.'
                ],
                link: `risks/assets`,
                cta: 'Define Context & Assets',
                keyActions: [
                    'Identify internal/external issues and stakeholders.',
                    'Define scope (assets, processes) and risk criteria.',
                    'Establish risk appetite and tolerance.'
                ]
            },
            {
                id: 'threats',
                step: 2,
                title: 'Risk Identification',
                subtitle: 'Discover Potential Risks',
                description: 'Systematically discover potential risks. Use asset-based (focus on assets, threats, vulnerabilities) or event-based (focus on threat scenarios/events) approaches. Inventory assets, identify threats, vulnerabilities, and consequences.',
                icon: Search,
                color: 'text-violet-600',
                bgColor: 'bg-violet-50',
                accent: 'from-violet-500 to-teal-500',
                bestPractices: [
                    'Involve cross-functional teams to identify risks.',
                    'Use both top-down (strategic) and bottom-up (operational) approaches.',
                    'Document all identified risks in a centralized risk register.'
                ],
                link: `risks/threats`,
                cta: 'Identify Risks & Threats',
                keyActions: [
                    'Inventory assets.',
                    'Identify threats, vulnerabilities, and consequences.',
                    'Document in a risk register.'
                ]
            },
            {
                id: 'assess',
                step: 3,
                title: 'Risk Analysis & Evaluation',
                subtitle: 'Analyze & Evaluate',
                description: 'Estimate the nature and level of each risk (likelihood and impact). Compare risks against criteria to decide actions. Determine which require treatment (unacceptable risks).',
                icon: Activity,
                color: 'text-pink-600',
                bgColor: 'bg-pink-50',
                accent: 'from-pink-600 to-rose-600',
                bestPractices: [
                    'Use consistent likelihood and impact scales.',
                    'Consider existing controls when analyzing risk levels.',
                    'Involve decision-makers in evaluating and accepting risks.'
                ],
                link: `risks/assessments`,
                cta: 'Analyze & Evaluate Risks',
                keyActions: [
                    'Assess likelihood and impact (qualitative/quantitative).',
                    'Review analyzed risks for acceptability against criteria.',
                    'Document rationale for acceptance or escalation.'
                ]
            },
            {
                id: 'treat',
                step: 4,
                title: 'Risk Treatment',
                subtitle: 'Address Unacceptable Risks',
                description: 'Select and implement options to address risks. Choose strategies: avoid, mitigate (via controls), transfer (e.g., insurance), accept. Develop treatment plans with owners, timelines, residual risk assessment.',
                icon: ShieldCheck,
                color: 'text-emerald-600',
                bgColor: 'bg-emerald-50',
                accent: 'from-emerald-500 to-teal-500',
                bestPractices: [
                    'Select controls that balance risk reduction with cost.',
                    'Develop actionable treatment plans with clear ownership.',
                    'Update risk register and create Statement of Applicability (if ISO 27001-aligned).'
                ],
                link: `risks/treatment-plan`,
                cta: 'Develop Treatment Plans',
                keyActions: [
                    'Choose strategies (avoid, mitigate, transfer, accept).',
                    'Develop treatment plans with owners, timelines, and residual risk.',
                    'Update risk register.'
                ]
            },
            {
                id: 'monitor',
                step: 5,
                title: 'Monitor & Review',
                subtitle: 'Continual Improvement',
                description: 'Ensure continual improvement. Communicate risks and decisions to stakeholders. Monitor changes (threats, controls, incidents). Review periodically or after events; update the process iteratively.',
                icon: RefreshCw,
                color: 'text-blue-600',
                bgColor: 'bg-blue-50',
                accent: 'from-blue-600 to-cyan-600',
                bestPractices: [
                    'Establish regular reporting cycles for stakeholders.',
                    'Monitor internal and external context changes continuously.',
                    'Use incidents as learning opportunities to refine the risk process.'
                ],
                link: `risks/report`,
                cta: 'Monitor & Review',
                keyActions: [
                    'Communicate risks/decisions to stakeholders.',
                    'Monitor changes (threats, controls, incidents).',
                    'Review periodically or post-incident and update iteratively.'
                ]
            }
        ]
    },
    nist: {
        id: 'nist',
        label: 'NIST RMF (SP 800-37 Rev. 2)',
        shortLabel: 'NIST RMF',
        subtitle: 'Federal Risk Standard',
        icon: Building,
        color: 'text-sky-700',
        bg: 'bg-sky-50',
        border: 'border-sky-200',
        badge: 'bg-sky-100 text-sky-800',
        accent: 'from-sky-600 to-cyan-600',
        tabActive: 'bg-sky-600 text-white shadow-md',
        tabInactive: 'text-sky-700 bg-sky-50/50 border border-sky-200 hover:bg-sky-100',
        overview: `NIST Risk Management Framework (RMF) from SP 800-37 Rev. 2 offers a disciplined, lifecycle-based approach for integrating security and privacy risk management into systems and organizations. It is mandatory for U.S. federal agencies and widely adopted in defense/contractor environments.`,
        highlightNote: `📌 Highly structured, control-focused (aligning with NIST 800-53), and includes explicit authorization and continuous monitoring. Best for compliance-heavy environments.`,
        timeline: '6 – 12 months',
        cost: '$50K – $300K+',
        steps: [
            {
                id: 'assets',
                step: 1,
                title: 'Prepare & Categorize',
                subtitle: 'Readiness & Classification',
                description: 'Establish organizational readiness. Define roles, governance, and priorities. Classify the system and information based on impact using FIPS 199 (low/moderate/high).',
                icon: Layers,
                color: 'text-sky-600',
                bgColor: 'bg-sky-50',
                accent: 'from-sky-600 to-blue-600',
                bestPractices: [
                    'Define risk management roles and integrate with enterprise risk processes.',
                    'Determine impact for confidentiality, integrity, availability.',
                    'Document in System Security Plan (SSP); define boundaries and data flows.'
                ],
                link: `risks/assets`,
                cta: 'Prepare & Categorize',
                keyActions: [
                    'Establish readiness, governance, and roles.',
                    'Use FIPS 199 for impact categorization.',
                    'Document in SSP with boundaries.'
                ]
            },
            {
                id: 'treat',
                step: 2,
                title: 'Select & Implement',
                subtitle: 'Control Deployment',
                description: 'Choose and tailor security/privacy controls (e.g., NIST SP 800-53). Custom-tailor the baseline, then deploy and document the controls.',
                icon: Settings,
                color: 'text-blue-600',
                bgColor: 'bg-blue-50',
                accent: 'from-blue-600 to-indigo-600',
                bestPractices: [
                    'Select baseline controls and tailor them actively.',
                    'Apply controls in the system/environment and provide implementation descriptions.',
                    'Update SSP with how controls actually function.'
                ],
                link: `risks/treatment-plan`,
                cta: 'Select & Implement Controls',
                keyActions: [
                    'Select baseline from NIST SP 800-53 (tailor overlays).',
                    'Conduct risk assessment to customize controls.',
                    'Deploy controls and update SSP with implementation details.'
                ]
            },
            {
                id: 'assess',
                step: 3,
                title: 'Assess',
                subtitle: 'Evaluate Effectiveness',
                description: 'Develop an assessment plan and evaluate if controls are implemented correctly, operating as intended, and producing the desired outcomes.',
                icon: ClipboardCheck,
                color: 'text-cyan-600',
                bgColor: 'bg-cyan-50',
                accent: 'from-cyan-500 to-teal-500',
                bestPractices: [
                    'Conduct independent testing using assessors.',
                    'Document findings clearly.',
                    'Create POA&Ms for discovered deficiencies.'
                ],
                link: `risks/assessments`,
                cta: 'Assess Controls',
                keyActions: [
                    'Develop assessment plan.',
                    'Conduct independent testing.',
                    'Document findings in Security Assessment Report (SAR) and POA&M.'
                ]
            },
            {
                id: 'threats', // Re-mapped loosely to authorize/review package logic where appropriate
                step: 4,
                title: 'Authorize',
                subtitle: 'Formal Risk Acceptance',
                description: 'Obtain formal risk acceptance from the Authorizing Official (AO). Compile an authorization package (SSP, SAR, POA&M) for AO review to issue an Authority to Operate (ATO).',
                icon: CheckSquare,
                color: 'text-emerald-600',
                bgColor: 'bg-emerald-50',
                accent: 'from-emerald-600 to-green-600',
                bestPractices: [
                    'Ensure the authorization package is comprehensive and accurate.',
                    'Brief the AO on residual risks and POA&M plans.',
                    'Formally accept residual risks before going live.'
                ],
                link: `federal/ssp-171`,
                cta: 'Review Package',
                keyActions: [
                    'Compile authorization package (SSP, SAR, POA&M).',
                    'Authorizing Official reviews package.',
                    'AO issues Authority to Operate (ATO) or denial.'
                ]
            },
            {
                id: 'monitor',
                step: 5,
                title: 'Monitor',
                subtitle: 'Continuous Authorization',
                description: 'Continuously track and respond to changes. Implement continuous monitoring strategy, report on control effectiveness, handle incidents, and manage changes.',
                icon: ActivitySquare,
                color: 'text-amber-600',
                bgColor: 'bg-amber-50',
                accent: 'from-amber-500 to-orange-500',
                bestPractices: [
                    'Automate monitoring where possible for near real-time visibility.',
                    'Report regularly on control effectiveness and incidents.',
                    'Reassess and reauthorize as needed; feed findings back into the Prepare step.'
                ],
                link: `risks/report`,
                cta: 'Continuous Monitoring',
                keyActions: [
                    'Implement continuous monitoring strategy (automated).',
                    'Report on control effectiveness, incidents, changes.',
                    'Reassess/authorize as needed and loop back to Prepare.'
                ]
            }
        ]
    }
} as const;

const OVERLAP_NOTES = [
    {
        icon: GitMerge,
        title: 'Hybridizing ISO & NIST',
        desc: 'Many organizations use ISO 27005 for flexible risk assessment (Steps 1-5), informing NIST\'s Categorize, Select, and Assess steps.',
        color: 'text-teal-600',
        bg: 'bg-teal-50 border-teal-200',
    },
    {
        icon: Target,
        title: 'NIST for Controls & Compliance',
        desc: 'Use NIST RMF (Authorize/Monitor) to enforce structured control implementation (800-53) for compliance-heavy environments.',
        color: 'text-blue-600',
        bg: 'bg-blue-50 border-blue-200',
    }
];

export default function RiskProgramGuide() {
    const params = useParams();
    const clientId = parseInt(params.id || "0");
    const [activeFw, setActiveFw] = useState<'iso' | 'nist'>('iso');

    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedStep, setSelectedStep] = useState<any>(null);

    const { data: assignments, refetch: refetchAssignments } = trpc.programGuides.getAssignments.useQuery({
        clientId,
        guideType: 'risk'
    }, { enabled: !!clientId });

    const { data: assets } = trpc.risks.getAssets.useQuery({ clientId }, { enabled: !!clientId });
    const { data: threatModels } = trpc.threatModels.list.useQuery({ clientId }, { enabled: !!clientId });
    const { data: riskAssessments } = trpc.risks.getAll.useQuery({ clientId }, { enabled: !!clientId });

    const hasAssets = !!assets && assets.length > 0;
    const hasThreats = !!threatModels && threatModels.length > 0;
    const hasRisks = !!riskAssessments && riskAssessments.length > 0;
    const treatedRisks = riskAssessments?.filter((r: any) => r.treatmentOption && r.treatmentOption !== 'None').length || 0;
    const hasTreatments = treatedRisks > 0;
    const hasMonitored = !!riskAssessments && riskAssessments.some((r: any) => r.status === 'approved' || r.status === 'reviewed');

    const getStatus = (stepId: string) => {
        switch (stepId) {
            case 'assets': return hasAssets ? 'completed' : 'pending';
            case 'threats': return hasThreats ? 'completed' : 'pending';
            case 'assess': return hasRisks ? 'completed' : 'pending';
            case 'treat': return hasTreatments ? 'completed' : 'pending';
            case 'monitor': return hasMonitored ? 'completed' : 'pending';
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
                        <Link href={`/clients/${clientId}/risks/dashboard`}>
                            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900 -ml-2 h-8">
                                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Risk Dashboard
                            </Button>
                        </Link>
                        <span className="text-slate-300">/</span>
                        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                            <BookOpen className="w-4 h-4 text-slate-400" />
                            Risk Program Guides
                        </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {(Object.keys(FRAMEWORKS) as Array<keyof typeof FRAMEWORKS>).map(key => {
                            const f = FRAMEWORKS[key];
                            const isActive = activeFw === key;
                            return (
                                <button
                                    key={key}
                                    onClick={() => setActiveFw(key)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${isActive ? f.tabActive : f.tabInactive}`}
                                >
                                    {f.shortLabel}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-6 md:p-10 xl:px-12">
                    <div className="w-full mx-auto">
                        <div className="flex flex-col lg:flex-row gap-8 mb-12">
                            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg shrink-0 text-white mb-4 lg:mb-0 bg-gradient-to-br ${fw.accent}`} style={{ backgroundImage: `var(--tw-gradient-stops)` }}>
                                <FwIcon className="w-8 h-8" />
                            </div>
                            <div className="flex-1 space-y-2">
                                <div className="flex flex-wrap gap-2 items-center">
                                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900">{fw.label}</h1>
                                    <Badge className={fw.badge}>{fw.subtitle}</Badge>
                                </div>
                                <p className="text-slate-700 leading-relaxed text-sm max-w-4xl">{fw.overview}</p>
                                <div className="flex flex-wrap gap-4 pt-2">
                                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                                        Timeline: <strong>{fw.timeline}</strong>
                                    </div>
                                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                                        <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                                        Est. Cost: <strong>{fw.cost}</strong>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-start gap-3 bg-white border border-slate-200 shadow-sm rounded-xl p-5 mb-10">
                            <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
                            <p className="text-sm text-slate-700 leading-relaxed font-medium">{fw.highlightNote}</p>
                        </div>

                        {/* Progress Section */}
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 lg:p-8 mb-12">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-lg text-slate-900 flex items-center gap-2">
                                    {progressPercentage === 100 && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                                    Implementation Progress
                                </h3>
                                <span className="text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-full">{progressPercentage}% Complete</span>
                            </div>
                            <Progress value={progressPercentage} className="h-3 rounded-full" />
                            <p className="text-xs text-slate-500 mt-4">
                                Completion based on real-time data from your risk dashboard modules. Complete all stages to initialize the program.
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

                                                    <div className="bg-white p-5 rounded-xl border border-slate-200 flex flex-col justify-between">
                                                        <div>
                                                            <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2 text-sm">
                                                                <Users className="w-4 h-4 text-indigo-500" />
                                                                Task Assignment
                                                            </h4>
                                                            <p className="text-xs text-slate-500 mb-4">Assign this phase to a team member and set a target deadline.</p>

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
                                                            <Button variant="outline" size="sm" className="w-full text-xs font-semibold hover:bg-slate-50" onClick={() => { setSelectedStep(step); setIsAssignModalOpen(true); }}>
                                                                Manage Assignment
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="pt-2 border-t border-slate-50 flex items-center justify-end">
                                                    <Link href={`/clients/${clientId}/${step.link}`}>
                                                        <Button className={`bg-gradient-to-r ${status === 'completed' ? 'from-emerald-600 to-green-600' : step.accent} hover:opacity-90 text-white shadow-md transition-all group-hover:translate-x-1 font-semibold`}>
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

                        {/* ISO & NIST Relationship/Overlap Notes */}
                        <div className="mt-8 mb-16 pt-8 border-t border-slate-200">
                            <h3 className="text-lg font-extrabold text-slate-900 mb-6 flex items-center gap-2">
                                <GitMerge className="w-5 h-5 text-slate-400" />
                                Framework Synergy & Overlaps
                            </h3>
                            <div className="grid md:grid-cols-2 gap-4">
                                {OVERLAP_NOTES.map((note, idx) => (
                                    <div key={idx} className={`p-5 rounded-2xl border ${note.bg} flex items-start gap-4`}>
                                        <div className="bg-white p-2.5 rounded-xl shadow-sm shrink-0">
                                            <note.icon className={`w-5 h-5 ${note.color}`} />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-900 mb-1">{note.title}</h4>
                                            <p className="text-sm text-slate-700 leading-relaxed">{note.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {selectedStep && (
                <AssignProgramTaskModal
                    isOpen={isAssignModalOpen}
                    onClose={() => setIsAssignModalOpen(false)}
                    clientId={clientId}
                    guideType="risk"
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
