import React, { useState } from 'react';
import { useParams, Link } from 'wouter';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@complianceos/ui/ui/card';
import { Badge } from '@complianceos/ui/ui/badge';
import { Button } from '@complianceos/ui/ui/button';
import { CheckCircle2, Database, FileText, Activity, Users, AlertTriangle, ArrowRight, BookOpen, ArrowLeft, Info, CircleDashed, Calendar, Globe } from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Progress } from '@complianceos/ui/ui/progress';
import { format } from 'date-fns';
import { AssignProgramTaskModal } from '@/components/AssignProgramTaskModal';

export default function PrivacyProgramGuide() {
    const params = useParams();
    const clientId = parseInt(params.id || "0");

    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedStep, setSelectedStep] = useState<any>(null);

    // Fetch data for dynamic progress tracking
    const { data: assignments, refetch: refetchAssignments } = trpc.programGuides.getAssignments.useQuery({
        clientId,
        guideType: 'privacy'
    }, { enabled: !!clientId });

    const { data: assessments } = trpc.privacy.listAssessments.useQuery({ clientId }, { enabled: !!clientId });
    const { data: dsars } = trpc.privacy.getDsarRequests.useQuery({ clientId }, { enabled: !!clientId });

    // Determine completion logic per step
    const hasAssessments = !!assessments && assessments.length > 0;
    const hasDsars = !!dsars && dsars.length > 0;

    const getStatus = (stepId: string) => {
        switch (stepId) {
            case 'inventory': return 'pending'; // Requires inventory integration
            case 'ropa': return 'pending'; // Requires ROPA integration
            case 'dpia': return hasAssessments ? 'completed' : 'pending';
            case 'dsar': return hasDsars ? 'completed' : 'pending';
            case 'breach': return 'pending'; // Requires incidents integration
            default: return 'pending';
        }
    };

    const steps = [
        {
            id: 'inventory',
            step: 1,
            title: 'Data Inventory',
            subtitle: 'Data Mapping',
            description: 'The foundation of privacy compliance is knowing what personal data you collect, where it resides, and how it flows through your systems.',
            icon: Database,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            accent: 'from-blue-600 to-cyan-600',
            bestPractices: [
                'Map data across all environments including cloud, on-premise, and third-party vendors.',
                'Categorize data to identify sensitive categories (PII, PHI, financial data).',
                'Implement automated data discovery tools where possible to maintain accuracy.'
            ],
            link: `/clients/${clientId}/privacy/dashboard`,
            cta: 'View Data Map',
            downloadText: 'Download Data Discovery Checklist'
        },
        {
            id: 'ropa',
            step: 2,
            title: 'Record of Processing Activities (ROPA)',
            subtitle: 'Legal Basis Documentation',
            description: 'Under GDPR and similar laws, you must formally document your processing activities, the purpose for processing, the legal basis, and retention periods.',
            icon: FileText,
            color: 'text-indigo-600',
            bgColor: 'bg-indigo-50',
            accent: 'from-indigo-600 to-purple-600',
            bestPractices: [
                'Ensure every processing activity has a clear, documented legal basis.',
                'Identify cross-border data transfers and ensure appropriate safeguards (e.g., SCCs) are in place.',
                'Maintain a distinct controller vs. processor ROPA where necessary.'
            ],
            link: `/clients/${clientId}/privacy/ropa`,
            cta: 'Manage ROPA',
            downloadText: 'Download ROPA Template'
        },
        {
            id: 'dpia',
            step: 3,
            title: 'Impact Assessments (DPIA/PIA)',
            subtitle: 'Risk Evaluation',
            description: 'Conduct Data Protection Impact Assessments (DPIAs) before initiating new high-risk processing activities or deploying new technologies.',
            icon: Activity,
            color: 'text-amber-600',
            bgColor: 'bg-amber-50',
            accent: 'from-amber-500 to-orange-500',
            bestPractices: [
                'Embed DPIAs into your SDLC / product development lifecycle early.',
                'Consult the Data Protection Officer (DPO) and relevant stakeholders during the assessment.',
                'Document clear mitigating controls for any identified high privacy risks.'
            ],
            link: `/clients/${clientId}/privacy/assessments`,
            cta: 'Conduct DPIA',
            downloadText: 'Download DPIA Questionnaire'
        },
        {
            id: 'dsar',
            step: 4,
            title: 'Data Subject Requests (DSARs)',
            subtitle: 'Individuals\' Rights',
            description: 'Establish processes to handle requests from individuals seeking to access, correct, delete, or port their personal data within legally mandated timeframes.',
            icon: Users,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
            accent: 'from-emerald-500 to-teal-500',
            bestPractices: [
                'Implement a secure portal for subjects to submit requests and verify their identity.',
                'Automate the retrieval of subject data across your complex data ecosystem.',
                'Train frontline staff on how to recognize and route privacy requests.'
            ],
            link: `/clients/${clientId}/privacy/dsar`,
            cta: 'Manage DSARs',
            downloadText: 'Download DSAR Playbook'
        },
        {
            id: 'breach',
            step: 5,
            title: 'Breach Readiness',
            subtitle: 'Incident Response',
            description: 'Prepare for data breaches by establishing rapid response protocols to minimize harm and meet the strict 72-hour notification deadlines required by regulators.',
            icon: AlertTriangle,
            color: 'text-red-600',
            bgColor: 'bg-red-50',
            accent: 'from-red-500 to-rose-600',
            bestPractices: [
                'Create and regularly test your data breach incident response plan.',
                'Maintain templates for regulator notifications and public communications.',
                'Determine clear internal escalation paths for suspected privacy incidents.'
            ],
            link: `/clients/${clientId}/privacy/incidents`,
            cta: 'Incident Readiness',
            downloadText: 'Download Incident Response Plan'
        }
    ];

    const completedSteps = steps.filter(s => getStatus(s.id) === 'completed').length;
    const progressPercentage = Math.round((completedSteps / steps.length) * 100);

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-slate-50 flex flex-col">
                <div className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between flex-wrap gap-3 shrink-0">
                    <div className="flex items-center gap-2 text-sm">
                        <Link href={`/clients/${clientId}/privacy/dashboard`}>
                            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-slate-900 -ml-2 h-8">
                                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Privacy Dashboard
                            </Button>
                        </Link>
                        <span className="text-slate-300">/</span>
                        <div className="flex items-center gap-1.5 text-slate-600 font-medium">
                            <BookOpen className="w-4 h-4 text-slate-400" />
                            Program Guide
                        </div>
                    </div>
                    <div className="flex gap-2 flex-wrap items-center">
                        {progressPercentage === 100 && (
                            <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Program Fully Initialized
                            </Badge>
                        )}
                        <button className="px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 text-indigo-700 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100">
                            GDPR / CCPA
                        </button>
                    </div>
                </div>

                <div className="p-6 lg:p-10 space-y-8">
                    <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 rounded-3xl p-8 lg:p-12 text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="bg-white/10 backdrop-blur-sm p-3 rounded-xl">
                                    <Globe className="w-8 h-8" />
                                </div>
                                <div>
                                    <h1 className="text-3xl lg:text-4xl font-black tracking-tight">Privacy Program Guide</h1>
                                    <p className="text-indigo-200 font-medium">Data Protection and Compliance Roadmap</p>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-3 gap-6 mt-8">
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                                    <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">Timeline</p>
                                    <p className="text-2xl font-black">1 – 3 months</p>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                                    <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">Standard</p>
                                    <p className="text-2xl font-black">GDPR & CCPA</p>
                                </div>
                                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/10">
                                    <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">Phases</p>
                                    <p className="text-2xl font-black">5 Key Phases</p>
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
                                <p className="text-slate-700 leading-relaxed">
                                    A dynamic, step-by-step roadmap to navigate Data Privacy regulations like GDPR, CCPA, and CPRA.
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
                                    Completion based on real-time privacy records. Complete all stages to fully initialize the program.
                                </p>
                            </div>

                            <div className="space-y-12 relative pb-12">
                                <div className="absolute top-12 bottom-12 left-[31px] w-0.5 bg-slate-200 z-0 hidden sm:block"></div>

                                {steps.map((step) => {
                                    const status = getStatus(step.id);
                                    return (
                                        <div key={step.id} className="relative z-10 flex flex-col sm:flex-row gap-6 lg:gap-8 group">
                                            <div className="flex-shrink-0 flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-md border-2 border-white ring-1 ring-slate-100 group-hover:ring-indigo-200 transition-all duration-300">
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
                                <Link href={`/clients/${clientId}/privacy/dashboard`}>
                                    <Button size="lg" className="bg-slate-900 hover:bg-slate-800 text-white px-8 h-14 rounded-full shadow-lg hover:shadow-xl transition-all">
                                        Return to Dashboard
                                    </Button>
                                </Link>
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
                    guideType="privacy"
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
