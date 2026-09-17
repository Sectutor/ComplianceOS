import React from 'react';
import { Link, useParams } from 'wouter';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@complianceos/ui/ui/card';
import { Badge } from '@complianceos/ui/ui/badge';
import { Button } from '@complianceos/ui/ui/button';
import { ArrowLeft, ArrowRight, Brain, ClipboardCheck, ShieldCheck, Workflow, FileBarChart, BookOpen, Target, CheckCircle2, Layers } from 'lucide-react';

export default function AIGovernanceProgramGuide() {
    const params = useParams();
    const clientId = parseInt(params.id || "0", 10);

    const base = `/clients/${clientId}`;

    const steps = [
        {
            id: 'inventory',
            title: 'Register AI Systems (Inventory)',
            icon: Brain,
            why: 'You can’t govern what you can’t see. Inventory is the backbone for audit, risk, and accountability.',
            how: [
                'Add a system with a clear name, owner, purpose, data types, and deployment context.',
                'Capture autonomy tier, allowed tools, approval gates, kill switch, audit logging, sandbox testing, and guardrails prompt.'
            ],
            ctaLabel: 'Open AI Governance',
            href: `${base}/ai-governance`
        },
        {
            id: 'assessment',
            title: 'Perform AI Impact Assessments',
            icon: ClipboardCheck,
            why: 'Assessments create a documented risk narrative and a risk score that can be trended over time.',
            how: [
                'Use the rubric sliders (0–5) to rate Safety, Bias, Privacy, and Security.',
                'Use the suggested overall score, or override manually when you have justification.',
                'Write clear recommendations: what must be done before deployment and what must be monitored continuously.'
            ],
            ctaLabel: 'Review Assessments',
            href: `${base}/ai-governance`
        },
        {
            id: 'rmf',
            title: 'Map NIST AI RMF 1.0 Controls',
            icon: ShieldCheck,
            why: 'Mapping turns high-level governance intent into a structured checklist of what applies to this AI system, and proves coverage to auditors.',
            how: [
                'Use “All Controls” to decide scope: map what applies to the system.',
                'Use “Mapped Controls” as your work queue: move items from Mapped → Implemented → Verified.',
                'Use “Create Work Items” to generate assignable tasks with suggested actions, evidence, and measurement ideas.',
                'Aim for no unknowns: everything should end up either mapped (then implemented/verified) or explicitly not applicable.'
            ],
            ctaLabel: 'Map RMF Core',
            href: `${base}/ai-governance`
        },
        {
            id: 'workflow',
            title: 'Run the Safe Deployment Workflow (Gated)',
            icon: Workflow,
            why: 'Agents are risk-amplifiers. The workflow provides gates (approvals, sandboxing, permissions) so deployments are safe and repeatable.',
            how: [
                'Start the workflow for the system you’re deploying.',
                'Treat each step as a release gate (approvals + evidence).',
                'Use it for re-approval when autonomy, tools, or integrations change.'
            ],
            ctaLabel: 'Open Workflows',
            href: `${base}/workflows`
        },
        {
            id: 'reporting',
            title: 'Generate Auditor-Ready Outputs',
            icon: FileBarChart,
            why: 'Reports convert your inventory, assessments, and mappings into evidence packages for internal steering and external audits.',
            how: [
                'Generate AI Impact Assessment PDFs per system for formal review.',
                'Generate the AI Agent Governance Pack for an audit snapshot across the program.'
            ],
            ctaLabel: 'Open Reports',
            href: `${base}/reports`
        }
    ];

    return (
        <DashboardLayout fullWidth={true}>
            <div className="relative min-h-screen bg-slate-50 pl-0 pr-4 py-8 md:pl-0 md:pr-8 space-y-8 animate-in fade-in duration-500">
                <div className="w-full space-y-8">
                    <div className="flex justify-between items-center">
                        <Link href={`${base}/ai-governance`}>
                            <Button variant="ghost" className="text-slate-500 hover:text-slate-900">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to AI Governance
                            </Button>
                        </Link>
                        <Badge className="bg-indigo-100 text-indigo-800 border-indigo-200">
                            <BookOpen className="w-3 h-3 mr-1" />
                            Program Guide
                        </Badge>
                    </div>

                    <div className="text-center space-y-5">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 text-indigo-700 shadow-sm border border-indigo-200">
                            <Layers className="w-8 h-8" />
                        </div>
                        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">AI Governance Program Guide</h1>
                        <p className="text-xl text-slate-600 leading-relaxed max-w-3xl mx-auto">
                            A practical workflow to inventory AI systems, assess risk, map NIST AI RMF controls, and produce audit-ready evidence.
                        </p>
                        <p className="text-sm text-slate-500 max-w-3xl mx-auto">
                            This content is operational guidance and not legal advice.
                        </p>
                    </div>

                    <Card className="bg-white border border-slate-200 rounded-2xl shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Target className="w-5 h-5 text-indigo-700" />
                                Recommended Workflow
                            </CardTitle>
                            <CardDescription>
                                Use this sequence to go from “no program” to “auditor-ready program” with clear accountability.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {steps.map((s, idx) => {
                                const Icon = s.icon;
                                return (
                                    <div key={s.id} className="flex flex-col md:flex-row gap-4 md:items-start p-5 rounded-2xl border border-slate-200 bg-slate-50/40">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                                                <Icon className="w-5 h-5 text-indigo-700" />
                                            </div>
                                            <div className="pt-1">
                                                <div className="text-xs font-black tracking-widest text-slate-500">STEP {idx + 1}</div>
                                                <div className="text-lg font-bold text-slate-900">{s.title}</div>
                                            </div>
                                        </div>

                                        <div className="flex-1 space-y-3">
                                            <div>
                                                <div className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                    Why this matters
                                                </div>
                                                <div className="text-sm text-slate-600 leading-relaxed">{s.why}</div>
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-slate-800">How to do it</div>
                                                <ul className="list-disc pl-5 text-sm text-slate-600 space-y-1">
                                                    {s.how.map((h) => <li key={h}>{h}</li>)}
                                                </ul>
                                            </div>
                                        </div>

                                        <div className="md:self-center">
                                            <Link href={s.href}>
                                                <Button className="gap-2">
                                                    {s.ctaLabel}
                                                    <ArrowRight className="w-4 h-4" />
                                                </Button>
                                            </Link>
                                        </div>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
