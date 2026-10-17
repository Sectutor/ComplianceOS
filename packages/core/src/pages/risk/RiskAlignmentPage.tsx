import React, { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useClientContext } from '@/contexts/ClientContext';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@complianceos/ui/ui/card';
import { Badge } from '@complianceos/ui/ui/badge';
import { Button } from '@complianceos/ui/ui/button';
import {
    CheckCircle2, Shield, AlertTriangle, Activity, Search, Scale, FileText,
    BarChart3, TrendingUp, BookOpen, ArrowLeft, ArrowRight, Target, Compass,
    Sparkles, ExternalLink, Database, Bug, FileSpreadsheet
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@complianceos/ui/ui/tabs';
import { cn } from '@/lib/utils';
import { PageGuide } from '@/components/PageGuide';
import { Breadcrumb } from '@/components/Breadcrumb';

export default function RiskAlignmentPage() {
    const params = useParams<{ id?: string }>();
    const { selectedClientId } = useClientContext();
    const clientId = params?.id ? parseInt(params.id) : (selectedClientId || 0);
    const [, setLocation] = useLocation();

    const [framework, setFramework] = useState<'iso' | 'nist'>('iso');

    const isoAreas = [
        {
            id: 'identification',
            title: 'Risk Identification',
            standard: 'ISO 27005 Clause 8.2',
            icon: Search,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200',
            primaryAction: {
                label: 'Open Asset Inventory',
                path: `/clients/${clientId}/risks/assets`,
                subActions: [
                    { label: 'Asset Inventory', path: `/clients/${clientId}/risks/assets` },
                    { label: 'Threat Catalog', path: `/clients/${clientId}/risks/threats` },
                    { label: 'Vulnerabilities', path: `/clients/${clientId}/risks/vulnerabilities` },
                ]
            },
            requirements: [
                'Identify assets essential to information security and business operations',
                'Identify threats and vulnerabilities associated with scoped assets',
                'Identify existing security controls and their operational effectiveness'
            ],
            implementation: [
                {
                    feature: 'Asset Register',
                    status: 'complete',
                    detail: 'Centralized inventory of information assets with CIA criticality ratings',
                    action: { label: 'Open Asset Inventory', path: `/clients/${clientId}/risks/assets` }
                },
                {
                    feature: 'Threat Library',
                    status: 'complete',
                    detail: 'Pre-populated catalog of threat events, adversarial actors, and attack vectors',
                    action: { label: 'Explore Threat Catalog', path: `/clients/${clientId}/risks/threats` }
                },
                {
                    feature: 'Vulnerability Register',
                    status: 'complete',
                    detail: 'Catalog of technical flaws, CVE matches, and NVD automated feeds',
                    action: { label: 'Open Vulnerabilities', path: `/clients/${clientId}/risks/vulnerabilities` }
                }
            ]
        },
        {
            id: 'assessment',
            title: 'Risk Assessment',
            standard: 'ISO 27005 Clause 8.3',
            icon: Activity,
            color: 'text-amber-600',
            bgColor: 'bg-amber-50',
            borderColor: 'border-amber-200',
            primaryAction: {
                label: 'Launch Risk Assessments',
                path: `/clients/${clientId}/risks/assessments`,
                subActions: [
                    { label: 'Risk Assessments', path: `/clients/${clientId}/risks/assessments` },
                    { label: 'Risk Register', path: `/clients/${clientId}/risks/register` },
                    { label: 'Scoring Framework', path: `/clients/${clientId}/risks/framework` },
                ]
            },
            requirements: [
                'Assess consequences (impact) and likelihood of risk scenarios',
                'Determine the inherent and residual level of risk across business units',
                'Compare calculated risk levels against organizational risk acceptance criteria'
            ],
            implementation: [
                {
                    feature: 'Risk Matrix & Criteria',
                    status: 'complete',
                    detail: 'Configurable 5x5 impact and likelihood calculation engine with criteria thresholds',
                    action: { label: 'Configure Framework', path: `/clients/${clientId}/risks/framework` }
                },
                {
                    feature: 'Inherent vs Residual Assessment',
                    status: 'complete',
                    detail: 'Detailed scenario evaluations calculating risk before and after controls',
                    action: { label: 'Conduct Assessment', path: `/clients/${clientId}/risks/assessments` }
                },
                {
                    feature: 'Risk Register & Scoring',
                    status: 'complete',
                    detail: 'High-density spreadsheet registry with quantitative risk prioritization',
                    action: { label: 'Open Risk Register', path: `/clients/${clientId}/risks/register` }
                }
            ]
        },
        {
            id: 'treatment',
            title: 'Risk Treatment',
            standard: 'ISO 27005 Clause 9',
            icon: Shield,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
            borderColor: 'border-emerald-200',
            primaryAction: {
                label: 'Open Treatment Plan',
                path: `/clients/${clientId}/risks/treatment-plan`,
                subActions: [
                    { label: 'Treatment Plan', path: `/clients/${clientId}/risks/treatment-plan` },
                    { label: 'Controls Library', path: `/clients/${clientId}/controls` },
                    { label: 'Risk Reports', path: `/clients/${clientId}/risks/report` },
                ]
            },
            requirements: [
                'Select risk treatment options (Modify / Mitigate, Retain / Accept, Avoid, Share / Transfer)',
                'Prepare and maintain a formal Risk Treatment Plan (RTP) with assigned owners and budgets',
                'Determine necessary controls to implement the chosen treatment strategy'
            ],
            implementation: [
                {
                    feature: 'Treatment Action Plan',
                    status: 'complete',
                    detail: 'Structured workflows for Mitigation, Acceptance, Avoidance, and Transfer with cost tracking',
                    action: { label: 'Manage Treatment Plan', path: `/clients/${clientId}/risks/treatment-plan` }
                },
                {
                    feature: 'Mitigating Control Linking',
                    status: 'complete',
                    detail: 'Direct mapping of compensating controls from the standard library to mitigate risks',
                    action: { label: 'Browse Controls Library', path: `/clients/${clientId}/controls` }
                },
                {
                    feature: 'RTP & Executive Reporting',
                    status: 'complete',
                    detail: 'Automated generation of ISO-compliant Risk Treatment Plans and audit documentation',
                    action: { label: 'Generate Risk Reports', path: `/clients/${clientId}/risks/report` }
                }
            ]
        },
        {
            id: 'monitoring',
            title: 'Monitoring & Review',
            standard: 'ISO 27005 Clause 12',
            icon: TrendingUp,
            color: 'text-teal-600',
            bgColor: 'bg-teal-50',
            borderColor: 'border-teal-200',
            primaryAction: {
                label: 'Open Risk Dashboard',
                path: `/clients/${clientId}/risks`,
                subActions: [
                    { label: 'Risk Dashboard', path: `/clients/${clientId}/risks` },
                    { label: 'Critical Risks', path: `/clients/${clientId}/risks/critical` },
                    { label: 'Threat Intel / CVEs', path: `/clients/${clientId}/risks/vulnerability-workbench` },
                ]
            },
            requirements: [
                'Continuously monitor risk factors, threat intelligence, and residual risks',
                'Monitor the operational effectiveness of implemented risk treatments',
                'Review and update risk assessments periodically and following major incidents'
            ],
            implementation: [
                {
                    feature: 'Executive Risk Dashboard',
                    status: 'complete',
                    detail: 'Real-time visualizations of risk profile, heatmaps, and posture trends',
                    action: { label: 'Open Risk Dashboard', path: `/clients/${clientId}/risks` }
                },
                {
                    feature: 'Critical & Overdue Monitoring',
                    status: 'complete',
                    detail: 'Automated oversight for unmitigated critical risks and overdue assessment reviews',
                    action: { label: 'Review Critical Risks', path: `/clients/${clientId}/risks/critical` }
                },
                {
                    feature: 'Automated Threat Intelligence',
                    status: 'complete',
                    detail: 'Continuous CISA KEV and NVD vulnerability triage workbench against tech assets',
                    action: { label: 'Open CVE Workbench', path: `/clients/${clientId}/risks/vulnerability-workbench` }
                }
            ]
        }
    ];

    const nistAreas = [
        {
            id: 'prep',
            title: 'Prepare',
            standard: 'NIST SP 800-30 Step 1',
            icon: FileText,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-200',
            primaryAction: {
                label: 'Configure Framework & Scope',
                path: `/clients/${clientId}/risks/framework`,
                subActions: [
                    { label: 'Risk Framework', path: `/clients/${clientId}/risks/framework` },
                    { label: 'Asset Scoping', path: `/clients/${clientId}/risks/assets` },
                    { label: 'Overview & Roles', path: `/clients/${clientId}/risks/overview` },
                ]
            },
            requirements: [
                'Identify the purpose, scope, and assumptions of the risk assessment',
                'Identify organizational risk appetite, tolerance thresholds, and assessment constraints',
                'Establish roles, responsibilities, and analytical approaches for risk evaluations'
            ],
            implementation: [
                {
                    feature: 'Context & Framework Builder',
                    status: 'complete',
                    detail: 'Documentation of organizational context, tolerance bands, and calculation models',
                    action: { label: 'Open Risk Framework', path: `/clients/${clientId}/risks/framework` }
                },
                {
                    feature: 'Scope & Asset Definition',
                    status: 'complete',
                    detail: 'Asset boundaries, authorization scope, and system categorization',
                    action: { label: 'Manage Asset Scope', path: `/clients/${clientId}/risks/assets` }
                },
                {
                    feature: 'Roles & Governance Overview',
                    status: 'complete',
                    detail: 'Assignment of Risk Managers, asset owners, and oversight responsibilities',
                    action: { label: 'Risk Program Overview', path: `/clients/${clientId}/risks/overview` }
                }
            ]
        },
        {
            id: 'conduct',
            title: 'Conduct Assessment',
            standard: 'NIST SP 800-30 Step 2',
            icon: Activity,
            color: 'text-amber-600',
            bgColor: 'bg-amber-50',
            borderColor: 'border-amber-200',
            primaryAction: {
                label: 'Conduct Risk Assessment',
                path: `/clients/${clientId}/risks/assessments`,
                subActions: [
                    { label: 'Risk Assessments', path: `/clients/${clientId}/risks/assessments` },
                    { label: 'Threat Catalog', path: `/clients/${clientId}/risks/threats` },
                    { label: 'Vulnerabilities', path: `/clients/${clientId}/risks/vulnerabilities` },
                ]
            },
            requirements: [
                'Identify threat sources, threat events, and attack vectors',
                'Identify vulnerabilities, system flaws, and predisposing conditions',
                'Determine likelihood of occurrence and potential adverse impact across CIA triad'
            ],
            implementation: [
                {
                    feature: 'Threat Event Catalog',
                    status: 'complete',
                    detail: 'Comprehensive catalog of adversarial, environmental, and structural threat vectors',
                    action: { label: 'View Threat Catalog', path: `/clients/${clientId}/risks/threats` }
                },
                {
                    feature: 'Vulnerability Analysis',
                    status: 'complete',
                    detail: 'Predisposing security weaknesses mapped to critical information assets',
                    action: { label: 'View Vulnerabilities', path: `/clients/${clientId}/risks/vulnerabilities` }
                },
                {
                    feature: 'Likelihood & Impact Scoring',
                    status: 'complete',
                    detail: 'Scenario-based likelihood estimation combined with multi-factor impact scoring',
                    action: { label: 'Conduct Assessment', path: `/clients/${clientId}/risks/assessments` }
                }
            ]
        },
        {
            id: 'communicate',
            title: 'Communicate',
            standard: 'NIST SP 800-30 Step 3',
            icon: Search,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
            borderColor: 'border-emerald-200',
            primaryAction: {
                label: 'Open Risk Register',
                path: `/clients/${clientId}/risks/register`,
                subActions: [
                    { label: 'Risk Register', path: `/clients/${clientId}/risks/register` },
                    { label: 'Executive Reports', path: `/clients/${clientId}/risks/report` },
                    { label: 'Risk Dashboard', path: `/clients/${clientId}/risks` },
                ]
            },
            requirements: [
                'Communicate risk assessment results and findings clearly to decision makers',
                'Share actionable risk information across internal operational and executive teams',
                'Support risk-informed authorization decisions and budget allocation'
            ],
            implementation: [
                {
                    feature: 'Executive Risk Register',
                    status: 'complete',
                    detail: 'Auditable, exportable registry of all assessed organizational risks',
                    action: { label: 'Open Risk Register', path: `/clients/${clientId}/risks/register` }
                },
                {
                    feature: 'Audit & Stakeholder Reports',
                    status: 'complete',
                    detail: 'Formal risk reports and summaries prepared for authorizing officials and auditors',
                    action: { label: 'View Risk Reports', path: `/clients/${clientId}/risks/report` }
                },
                {
                    feature: 'Stakeholder Dashboarding',
                    status: 'complete',
                    detail: 'Interactive visual representations of residual risk posture for leadership review',
                    action: { label: 'Open Dashboard', path: `/clients/${clientId}/risks` }
                }
            ]
        },
        {
            id: 'maintain',
            title: 'Maintain',
            standard: 'NIST SP 800-30 Step 4',
            icon: TrendingUp,
            color: 'text-teal-600',
            bgColor: 'bg-teal-50',
            borderColor: 'border-teal-200',
            primaryAction: {
                label: 'Monitor Continuous Posture',
                path: `/clients/${clientId}/risks`,
                subActions: [
                    { label: 'Risk Dashboard', path: `/clients/${clientId}/risks` },
                    { label: 'Treatment Plan', path: `/clients/${clientId}/risks/treatment-plan` },
                    { label: 'Threat Intel Feeds', path: `/clients/${clientId}/risks/vulnerability-workbench` },
                ]
            },
            requirements: [
                'Continuously monitor risk factors and evaluate changes in the operating environment',
                'Update risk assessments as system architectures, threats, or vulnerabilities evolve',
                'Verify ongoing compliance with risk acceptance criteria and mitigation SLAs'
            ],
            implementation: [
                {
                    feature: 'Continuous Risk Monitoring',
                    status: 'complete',
                    detail: 'Automated re-evaluation triggers, real-time heatmaps, and mitigation efficiency tracking',
                    action: { label: 'Monitor Live Dashboard', path: `/clients/${clientId}/risks` }
                },
                {
                    feature: 'Remediation & Action Tracking',
                    status: 'complete',
                    detail: 'Tracking progress and SLA deadlines for risk mitigation plans and controls',
                    action: { label: 'Track Treatments', path: `/clients/${clientId}/risks/treatment-plan` }
                },
                {
                    feature: 'Active CVE & Feed Triage',
                    status: 'complete',
                    detail: 'Cross-referencing live vulnerability disclosures against inventory technologies',
                    action: { label: 'Open CVE Workbench', path: `/clients/${clientId}/risks/vulnerability-workbench` }
                }
            ]
        }
    ];

    const benefits = [
        {
            title: 'Decision Support',
            description: 'Data-driven insights for prioritizing security investments',
            icon: BarChart3,
            action: { label: 'Go to Assessments', path: `/clients/${clientId}/risks/assessments` }
        },
        {
            title: 'Compliance Evidence',
            description: 'Automatically generated reports for ISO 27001 & NIST audits',
            icon: FileText,
            action: { label: 'View Risk Reports', path: `/clients/${clientId}/risks/report` }
        },
        {
            title: 'Proactive Security',
            description: 'Identify and address vulnerabilities before they are exploited',
            icon: Shield,
            action: { label: 'CVE Workbench', path: `/clients/${clientId}/risks/vulnerability-workbench` }
        },
        {
            title: 'Cost Optimization',
            description: 'Focus resources on risks that exceed tolerance levels',
            icon: Scale,
            action: { label: 'Treatment Plan', path: `/clients/${clientId}/risks/treatment-plan` }
        }
    ];

    const currentAreas = framework === 'iso' ? isoAreas : nistAreas;

    return (
        <DashboardLayout>
            <div className="min-h-screen bg-slate-50/50 p-6 lg:p-8">
                <div className="max-w-7xl mx-auto space-y-6">
                    {/* Navigation Header */}
                    <div className="mb-2">
                        <Breadcrumb
                            items={[
                                { label: 'Risk Management', href: `/clients/${clientId}/risks` },
                                { label: 'Alignment Guide' }
                            ]}
                        />
                        <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2 -ml-3 text-muted-foreground hover:text-foreground text-xs"
                            onClick={() => setLocation(`/clients/${clientId}/risks`)}
                        >
                            <ArrowLeft className="w-4 h-4 mr-1" /> Back to Risk Dashboard
                        </Button>
                    </div>

                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-2xs">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2.5">
                                <div className="h-10 w-10 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
                                    <Activity className="h-5 w-5" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                                        Risk Management Alignment Guide
                                    </h1>
                                    <p className="text-xs text-muted-foreground">
                                        Systematic lifecycle alignment with ISO 27005 and NIST SP 800-30 standards.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Framework Toggle Tabs */}
                            <div className="inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setFramework('iso')}
                                    className={cn(
                                        "px-4 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
                                        framework === 'iso'
                                            ? "bg-brand text-white shadow-2xs"
                                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                                    )}
                                >
                                    ISO 27005 Aligned
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFramework('nist')}
                                    className={cn(
                                        "px-4 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
                                        framework === 'nist'
                                            ? "bg-brand text-white shadow-2xs"
                                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                                    )}
                                >
                                    NIST 800-30 Ready
                                </button>
                            </div>

                            <PageGuide
                                title="Framework Alignment"
                                description="Visualize how your risk management program aligns with international standards."
                                rationale="Demonstrating alignment with ISO 27005 or NIST 800-30 is critical for external audits and stakeholder confidence."
                                howToUse={[
                                    { step: "Choose Framework", description: "Toggle between ISO and NIST views to see specific requirements." },
                                    { step: "Take Action", description: "Click any direct action button to immediately navigate to the relevant workflow." },
                                    { step: "Explain to Auditors", description: "Use this page during external assessments to demonstrate compliance." }
                                ]}
                            />
                        </div>
                    </div>

                    {/* Quick Action Hub: Direct Links to All Lifecycle Stages */}
                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-3">
                            <div>
                                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                                    <Target className="w-3.5 h-3.5 text-brand" />
                                    Risk Management Quick Actions
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Launch any core component of the risk lifecycle in 1 click:
                                </p>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs gap-1.5 border-slate-200 hover:border-brand hover:text-brand text-slate-700"
                                    onClick={() => setLocation(`/clients/${clientId}/risks/overview`)}
                                >
                                    <Compass className="w-3.5 h-3.5 text-slate-500" />
                                    Program Overview
                                </Button>
                                <Button
                                    size="sm"
                                    className="h-7 text-xs gap-1.5 bg-brand hover:bg-[#153B6D] text-white shadow-2xs"
                                    onClick={() => setLocation(`/clients/${clientId}/risks`)}
                                >
                                    <BarChart3 className="w-3.5 h-3.5" />
                                    Live Risk Dashboard
                                </Button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                            {/* Step 1: Identification */}
                            <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">1. Identification</span>
                                        <Search className="w-3.5 h-3.5 text-blue-600" />
                                    </div>
                                    <p className="text-[11px] text-blue-800/80 mb-2.5">Scope assets, catalog threats, and log vulnerabilities.</p>
                                </div>
                                <div className="flex items-center gap-1 flex-wrap">
                                    <Button size="sm" variant="outline" className="h-6 px-2 text-[11px] font-medium bg-white hover:bg-blue-100 text-blue-900 border-blue-200 cursor-pointer" onClick={() => setLocation(`/clients/${clientId}/risks/assets`)}>Assets</Button>
                                    <Button size="sm" variant="outline" className="h-6 px-2 text-[11px] font-medium bg-white hover:bg-blue-100 text-blue-900 border-blue-200 cursor-pointer" onClick={() => setLocation(`/clients/${clientId}/risks/threats`)}>Threats</Button>
                                    <Button size="sm" variant="outline" className="h-6 px-2 text-[11px] font-medium bg-white hover:bg-blue-100 text-blue-900 border-blue-200 cursor-pointer" onClick={() => setLocation(`/clients/${clientId}/risks/vulnerabilities`)}>Vulns</Button>
                                </div>
                            </div>

                            {/* Step 2: Assessment */}
                            <div className="p-3 bg-amber-50/60 rounded-lg border border-amber-100 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">2. Assessment</span>
                                        <Activity className="w-3.5 h-3.5 text-amber-600" />
                                    </div>
                                    <p className="text-[11px] text-amber-800/80 mb-2.5">Calculate likelihood × impact and review scoring.</p>
                                </div>
                                <div className="flex items-center gap-1 flex-wrap">
                                    <Button size="sm" variant="outline" className="h-6 px-2 text-[11px] font-medium bg-white hover:bg-amber-100 text-amber-900 border-amber-200 cursor-pointer" onClick={() => setLocation(`/clients/${clientId}/risks/assessments`)}>Assessments</Button>
                                    <Button size="sm" variant="outline" className="h-6 px-2 text-[11px] font-medium bg-white hover:bg-amber-100 text-amber-900 border-amber-200 cursor-pointer" onClick={() => setLocation(`/clients/${clientId}/risks/register`)}>Risk Register</Button>
                                    <Button size="sm" variant="outline" className="h-6 px-2 text-[11px] font-medium bg-white hover:bg-amber-100 text-amber-900 border-amber-200 cursor-pointer" onClick={() => setLocation(`/clients/${clientId}/risks/framework`)}>Framework</Button>
                                </div>
                            </div>

                            {/* Step 3: Treatment */}
                            <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-100 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">3. Treatment</span>
                                        <Shield className="w-3.5 h-3.5 text-emerald-600" />
                                    </div>
                                    <p className="text-[11px] text-emerald-800/80 mb-2.5">Mitigate, accept, avoid, or transfer risks with controls.</p>
                                </div>
                                <div className="flex items-center gap-1 flex-wrap">
                                    <Button size="sm" variant="outline" className="h-6 px-2 text-[11px] font-medium bg-white hover:bg-emerald-100 text-emerald-900 border-emerald-200 cursor-pointer" onClick={() => setLocation(`/clients/${clientId}/risks/treatment-plan`)}>Treatment Plan</Button>
                                    <Button size="sm" variant="outline" className="h-6 px-2 text-[11px] font-medium bg-white hover:bg-emerald-100 text-emerald-900 border-emerald-200 cursor-pointer" onClick={() => setLocation(`/clients/${clientId}/controls`)}>Controls</Button>
                                </div>
                            </div>

                            {/* Step 4: Monitoring */}
                            <div className="p-3 bg-teal-50/60 rounded-lg border border-teal-100 flex flex-col justify-between">
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[11px] font-bold text-teal-900 uppercase tracking-wider">4. Monitoring</span>
                                        <TrendingUp className="w-3.5 h-3.5 text-teal-600" />
                                    </div>
                                    <p className="text-[11px] text-teal-800/80 mb-2.5">Track real-time heatmaps, trends, and KRI indicators.</p>
                                </div>
                                <div className="flex items-center gap-1 flex-wrap">
                                    <Button size="sm" variant="outline" className="h-6 px-2 text-[11px] font-medium bg-white hover:bg-teal-100 text-teal-900 border-teal-200 cursor-pointer" onClick={() => setLocation(`/clients/${clientId}/risks`)}>Dashboard</Button>
                                    <Button size="sm" variant="outline" className="h-6 px-2 text-[11px] font-medium bg-white hover:bg-teal-100 text-teal-900 border-teal-200 cursor-pointer" onClick={() => setLocation(`/clients/${clientId}/risks/critical`)}>Critical</Button>
                                    <Button size="sm" variant="outline" className="h-6 px-2 text-[11px] font-medium bg-white hover:bg-teal-100 text-teal-900 border-teal-200 cursor-pointer" onClick={() => setLocation(`/clients/${clientId}/risks/report`)}>Reports</Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Overview Card */}
                    <Card className="border border-slate-200 bg-white shadow-2xs">
                        <CardHeader className="py-4 px-6 border-b border-slate-100 bg-slate-50/50">
                            <CardTitle className="text-lg font-bold text-slate-900">
                                {framework === 'iso' ? 'Information Security Risk Management (ISO 27005)' : 'NIST Risk Assessment Guide (SP 800-30)'}
                            </CardTitle>
                            <CardDescription className="text-xs text-slate-600 mt-0.5">
                                {framework === 'iso'
                                    ? "ISO 27005 provides systematic guidelines for risk identification, assessment, evaluation, and treatment. Every clause maps directly to an active workflow in ComplianceOS."
                                    : "NIST SP 800-30 guides the risk assessment process across Preparing, Conducting, Communicating, and Maintaining security postures."
                                }
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                <div className="text-center p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                                    <div className="text-2xl font-bold text-brand">4</div>
                                    <div className="text-xs text-slate-600 font-medium">Core Lifecycle Steps</div>
                                </div>
                                <div className="text-center p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                                    <div className="text-2xl font-bold text-emerald-600">100%</div>
                                    <div className="text-xs text-slate-600 font-medium">Audit-Ready Workflows</div>
                                </div>
                                <div className="text-center p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                                    <div className="text-2xl font-bold text-blue-600">Automated</div>
                                    <div className="text-xs text-slate-600 font-medium">Scoring & Evidence Linking</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Compliance Areas Tabs */}
                    <Tabs defaultValue={currentAreas[0].id} className="space-y-4" key={framework}>
                        <TabsList className="grid grid-cols-2 lg:grid-cols-4 gap-2 h-auto bg-transparent p-0">
                            {currentAreas.map((area) => (
                                <TabsTrigger
                                    key={area.id}
                                    value={area.id}
                                    className="data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-slate-900 data-[state=active]:border-slate-300 data-[state=inactive]:text-slate-600 flex flex-col items-center gap-1.5 p-3 border border-slate-200 bg-white/70 hover:bg-white transition-all rounded-lg cursor-pointer"
                                >
                                    <area.icon className={cn("w-5 h-5", area.color)} />
                                    <span className="text-xs font-bold">{area.title}</span>
                                </TabsTrigger>
                            ))}
                        </TabsList>

                        {currentAreas.map((area) => (
                            <TabsContent key={area.id} value={area.id} className="space-y-4 mt-2">
                                <Card className="border border-slate-200 shadow-2xs overflow-hidden bg-white">
                                    <CardHeader className={`${area.bgColor} border-b border-slate-200 py-4 px-6`}>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2.5 rounded-lg bg-white shadow-2xs border border-slate-200">
                                                        <area.icon className={`w-5 h-5 ${area.color}`} />
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <CardTitle className="text-xl font-bold text-slate-900">{area.title}</CardTitle>
                                                            <Badge variant="default" className="bg-emerald-600 text-white text-[10px] font-semibold h-5">
                                                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                                                Supported
                                                            </Badge>
                                                        </div>
                                                        <CardDescription className="text-xs font-medium text-slate-600 mt-0.5">{area.standard}</CardDescription>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <Button
                                                    size="sm"
                                                    className="bg-brand hover:bg-[#153B6D] text-white shadow-2xs text-xs font-semibold h-8 gap-1.5 cursor-pointer"
                                                    onClick={() => setLocation(area.primaryAction.path)}
                                                >
                                                    {area.primaryAction.label}
                                                    <ArrowRight className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Sub Action Links */}
                                        {area.primaryAction.subActions && (
                                            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-slate-200/60 flex-wrap">
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">Direct Workflows:</span>
                                                {area.primaryAction.subActions.map((sub, sIdx) => (
                                                    <Button
                                                        key={sIdx}
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-6 px-2 text-[11px] bg-white hover:bg-slate-50 text-slate-700 hover:text-brand border-slate-200 shadow-2xs gap-1 cursor-pointer font-medium"
                                                        onClick={() => setLocation(sub.path)}
                                                    >
                                                        {sub.label}
                                                        <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
                                                    </Button>
                                                ))}
                                            </div>
                                        )}
                                    </CardHeader>
                                    <CardContent className="p-6 space-y-6">
                                        {/* Requirements */}
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2 uppercase tracking-wide">
                                                <BookOpen className="w-4 h-4 text-slate-600" />
                                                Standard Requirements
                                            </h3>
                                            <ul className="space-y-2">
                                                {area.requirements.map((req, idx) => (
                                                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-700">
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mt-0.5 flex-shrink-0" />
                                                        <span>{req}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        {/* Implementation */}
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2 uppercase tracking-wide">
                                                <Shield className="w-4 h-4 text-brand" />
                                                Platform Implementation & Workflows
                                            </h3>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                                                {area.implementation.map((impl, idx) => (
                                                    <div key={idx} className="p-4 bg-slate-50/70 rounded-lg border border-slate-200 hover:border-brand hover:bg-white hover:shadow-xs transition-all flex flex-col justify-between">
                                                        <div>
                                                            <div className="flex items-start justify-between mb-1.5">
                                                                <h4 className="font-semibold text-xs text-slate-900">{impl.feature}</h4>
                                                                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 font-medium">
                                                                    ✓ Ready
                                                                </Badge>
                                                            </div>
                                                            <p className="text-xs text-slate-600 mb-3 leading-relaxed">{impl.detail}</p>
                                                        </div>
                                                        {impl.action && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="w-full text-xs h-7 text-brand hover:text-white hover:bg-brand hover:border-brand border-slate-200 transition-all font-medium justify-between group cursor-pointer bg-white"
                                                                onClick={() => setLocation(impl.action.path)}
                                                            >
                                                                <span>{impl.action.label}</span>
                                                                <ArrowRight className="w-3 h-3 text-brand group-hover:text-white transition-colors" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        ))}
                    </Tabs>

                    {/* Strategic Value / Benefits Section */}
                    <Card className="border border-slate-200 bg-white shadow-2xs">
                        <CardHeader className="py-4 px-6 border-b border-slate-100">
                            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                                <BarChart3 className="w-5 h-5 text-brand" />
                                Strategic Value & Decision Support
                            </CardTitle>
                            <CardDescription className="text-xs text-slate-500 mt-0.5">
                                Maximize security ROI and compliance maturity with data-driven workflows.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                {benefits.map((benefit, idx) => (
                                    <div key={idx} className="p-4 bg-slate-50/70 rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-2xs transition-all flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-start gap-2.5 mb-2">
                                                <div className="p-2 bg-brand/10 text-brand rounded-lg">
                                                    <benefit.icon className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold text-xs text-slate-900 mb-1">{benefit.title}</h4>
                                                    <p className="text-xs text-slate-600 leading-relaxed">{benefit.description}</p>
                                                </div>
                                            </div>
                                        </div>
                                        {benefit.action && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="w-full text-xs h-7 text-brand hover:text-[#153B6D] hover:bg-slate-100 justify-between font-semibold mt-2 pt-1 border-t border-slate-200/60 cursor-pointer"
                                                onClick={() => setLocation(benefit.action.path)}
                                            >
                                                <span>{benefit.action.label}</span>
                                                <ArrowRight className="w-3 h-3" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
