import React, { useState } from 'react';
import { useParams, Link, useLocation } from 'wouter';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@complianceos/ui/ui/card';
import { Badge } from '@complianceos/ui/ui/badge';
import { Button } from '@complianceos/ui/ui/button';
import {
    CheckCircle2, Shield, ShieldCheck, Target, FileText, Zap, AlertTriangle,
    ArrowRight, BookOpen, ArrowLeft, Info, Calendar, Download,
    Sparkles, Copy, Layers, Clock, Globe, Lock, Activity, Server, Users, Award,
    CalendarClock, CheckSquare, ListTodo, ExternalLink, HeartPulse
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Progress } from '@complianceos/ui/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Framework90DayRoadmap } from '@/components/roadmap/Framework90DayRoadmap';
import { getHipaaRoadmap } from '@/data/frameworkRoadmaps';

export default function HIPAAProgramGuide() {
    const params = useParams();
    const clientId = parseInt(params.id || params.clientId || "0", 10);
    const [, setLocation] = useLocation();

    // Read ?tab= query parameter
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const tabParam = searchParams?.get('tab');
    const validTabs: Array<'tutorials' | 'roadmap' | 'architecture' | 'auditor'> = ['tutorials', 'roadmap', 'architecture', 'auditor'];
    const initialTab = validTabs.includes(tabParam as any) ? (tabParam as any) : 'tutorials';

    const [activeTab, setActiveTab] = useState<'tutorials' | 'roadmap' | 'architecture' | 'auditor'>(initialTab);

    // Fetch real system telemetry
    const { data: clientPolicies } = trpc.clientPolicies.list.useQuery({ clientId }, { enabled: !!clientId });
    const { data: controlsData } = trpc.clientControls.list.useQuery({ clientId }, { enabled: !!clientId });
    const { data: employeesData } = trpc.employees.list.useQuery({ clientId }, { enabled: !!clientId });
    const { data: vendorsData } = trpc.vendors.list.useQuery({ clientId }, { enabled: !!clientId });

    const safePolicies = Array.isArray(clientPolicies) ? clientPolicies : [];
    const safeControls = Array.isArray(controlsData) ? controlsData : [];
    const safeEmployees = Array.isArray(employeesData) ? employeesData : [];
    const safeVendors = Array.isArray(vendorsData) ? vendorsData : [];

    const approvedPolicies = safePolicies.filter((p: any) => p?.clientPolicy?.status === 'approved' || p?.status === 'approved' || p?.clientPolicy?.status === 'published').length;
    const activeControls = safeControls.filter((c: any) => c.status === 'implemented' || c.status === 'active').length;

    const completedPillars = [
        approvedPolicies >= 3,
        activeControls >= 8,
        safeEmployees.length >= 2,
        safeVendors.length >= 1
    ].filter(Boolean).length;

    const progressPercentage = Math.min(100, Math.round((completedPillars / 4) * 100));

    const pillars = [
        {
            id: 'admin_safeguards',
            number: 1,
            title: 'Administrative Safeguards & Security Management',
            ruleRef: '45 CFR §164.308',
            status: approvedPolicies >= 3 ? 'active' : 'pending',
            countLabel: `${approvedPolicies} Policies Approved`,
            icon: Target,
            color: 'text-cyan-600',
            bgLight: 'bg-cyan-50/70',
            borderColor: 'border-cyan-200',
            gradient: 'from-cyan-600 to-blue-600',
            summary: 'Execute comprehensive Security Risk Analysis (SRA), appoint Privacy & Security Officers, enforce sanction policies, and administer workforce training.',
            whyItMatters: 'The HHS Office for Civil Rights (OCR) mandates an annual documented SRA. The absence of an SRA is the #1 cause of major OCR enforcement penalties.',
            link: `/clients/${clientId}/risks/assessments`,
            cta: 'Conduct Risk Analysis'
        },
        {
            id: 'technical_safeguards',
            number: 2,
            title: 'Technical Safeguards & ePHI Encryption',
            ruleRef: '45 CFR §164.312',
            status: activeControls >= 5 ? 'active' : 'pending',
            countLabel: 'Encryption Enforced',
            icon: Lock,
            color: 'text-blue-600',
            bgLight: 'bg-blue-50/70',
            borderColor: 'border-blue-200',
            gradient: 'from-blue-600 to-indigo-600',
            summary: 'Enforce AES-256 encryption at rest and TLS 1.3 in transit, unique user identification, emergency access procedures, and automated session logoff.',
            whyItMatters: 'Loss or theft of unencrypted laptops or databases containing ePHI creates an automatic presumption of breach with mandatory public reporting.',
            link: `/clients/${clientId}/risks/assets`,
            cta: 'Verify Safeguards'
        },
        {
            id: 'physical_safeguards',
            number: 3,
            title: 'Physical Safeguards & Facility Controls',
            ruleRef: '45 CFR §164.310',
            status: 'active',
            countLabel: 'Device Controls Active',
            icon: Server,
            color: 'text-indigo-600',
            bgLight: 'bg-indigo-50/70',
            borderColor: 'border-indigo-200',
            gradient: 'from-indigo-600 to-violet-600',
            summary: 'Regulate physical workstation use, device media controls, hardware sanitization and destruction logs, and server room access controls.',
            whyItMatters: 'Auditors require documented device disposal logs proving cryptographic wipe or certified physical shredding of drives holding ePHI.',
            link: `/clients/${clientId}/risks/assets`,
            cta: 'Device Asset Register'
        },
        {
            id: 'baa_oversight',
            number: 4,
            title: 'Business Associate Agreements (BAA) & TPRM',
            ruleRef: '45 CFR §164.502(e) / §164.504(e)',
            status: safeVendors.length > 0 ? 'active' : 'pending',
            countLabel: `${safeVendors.length} BAAs Executed`,
            icon: Globe,
            color: 'text-emerald-600',
            bgLight: 'bg-emerald-50/70',
            borderColor: 'border-emerald-200',
            gradient: 'from-emerald-600 to-teal-600',
            summary: 'Ensure signed Business Associate Agreements are executed with all cloud hosts, billing systems, SaaS tools, and managed service providers handling ePHI.',
            whyItMatters: 'Transmitting ePHI to any cloud service (AWS, Google Workspace, Twilio) without a countersigned BAA constitutes a direct HIPAA violation.',
            link: `/clients/${clientId}/vendors`,
            cta: 'Review BAA Ledger'
        },
        {
            id: 'breach_notification',
            number: 5,
            title: 'Breach Notification Rule & Incident Response',
            ruleRef: '45 CFR §164.400–414',
            status: 'active',
            countLabel: '60-Day SLA Ready',
            icon: AlertTriangle,
            color: 'text-amber-600',
            bgLight: 'bg-amber-50/70',
            borderColor: 'border-amber-200',
            gradient: 'from-amber-600 to-orange-600',
            summary: 'Deploy standardized 4-factor risk assessment protocol to evaluate ePHI acquisition, and maintain 60-day individual/HHS notification playbooks.',
            whyItMatters: 'Breaches affecting 500+ individuals must be reported to HHS OCR and local media within 60 days without unreasonable delay.',
            link: `/clients/${clientId}/cyber/incidents`,
            cta: 'Breach Notification Center'
        }
    ];

    return (
        <DashboardLayout fullWidth={true}>
            <div className="space-y-6 pb-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
                
                {/* Header Breadcrumb & Back */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                        <Link href={`/clients/${clientId}/start-here`}>
                            <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-slate-600 dark:text-slate-300">
                                <ArrowLeft className="w-4 h-4" />
                                Back to Start Here
                            </Button>
                        </Link>
                        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            HIPAA Security & Privacy Rule Program Guide
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link href={`/clients/${clientId}/readiness/wizard/HIPAA`}>
                            <Button variant="outline" size="sm" className="gap-2 text-xs font-bold">
                                <HeartPulse className="w-3.5 h-3.5 text-cyan-600" />
                                Scoping Wizard
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Hero Banner */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 p-6 md:p-8 text-white shadow-xl">
                    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="space-y-3 max-w-3xl">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-400/30 text-xs font-bold uppercase tracking-wider">
                                    45 CFR Parts 160 & 164
                                </Badge>
                                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-xs font-bold">
                                    HHS OCR Audit Ready
                                </Badge>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                                HIPAA Compliance Program Guide & 90-Day Roadmap
                            </h1>
                            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                                Complete operational guide covering the HIPAA Security Rule (Administrative, Physical & Technical Safeguards), Privacy Rule, Business Associate Agreements (BAA), and OCR audit binder.
                            </p>
                        </div>

                        {/* Readiness Metric Card */}
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 shrink-0 w-full lg:w-72 space-y-3">
                            <div className="flex justify-between items-center text-xs font-bold text-slate-300">
                                <span>HIPAA Safeguards Score</span>
                                <span className="text-white text-base">{progressPercentage}%</span>
                            </div>
                            <Progress value={progressPercentage} className="h-2.5 bg-slate-700" />
                            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 pt-1">
                                <div>Policies: <strong className="text-white">{approvedPolicies}</strong></div>
                                <div>Safeguards: <strong className="text-white">{activeControls}</strong></div>
                                <div>Workforce: <strong className="text-white">{safeEmployees.length}</strong></div>
                                <div>BAA Vendors: <strong className="text-white">{safeVendors.length}</strong></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                    <Button
                        variant={activeTab === 'tutorials' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('tutorials')}
                        className={cn("font-bold text-xs rounded-xl", activeTab === 'tutorials' ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:text-slate-900")}
                    >
                        <BookOpen className="w-4 h-4 mr-1.5" />
                        Implementation Safeguards
                    </Button>
                    <Button
                        variant={activeTab === 'roadmap' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('roadmap')}
                        className={cn("font-bold text-xs rounded-xl", activeTab === 'roadmap' ? "bg-cyan-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900")}
                    >
                        <CalendarClock className="w-4 h-4 mr-1.5" />
                        90-Day Implementation Roadmap
                    </Button>
                    <Button
                        variant={activeTab === 'architecture' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('architecture')}
                        className={cn("font-bold text-xs rounded-xl", activeTab === 'architecture' ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:text-slate-900")}
                    >
                        <Layers className="w-4 h-4 mr-1.5" />
                        ePHI Data Flow Boundary
                    </Button>
                    <Button
                        variant={activeTab === 'auditor' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('auditor')}
                        className={cn("font-bold text-xs rounded-xl", activeTab === 'auditor' ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:text-slate-900")}
                    >
                        <ShieldCheck className="w-4 h-4 mr-1.5" />
                        OCR Audit Clean Room
                    </Button>
                </div>

                {/* TAB 1: Implementation Safeguards */}
                {activeTab === 'tutorials' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Core HIPAA Safeguard Domains</h2>
                                <p className="text-sm text-slate-500">Enforce statutory requirements across Administrative, Physical, and Technical safeguard categories.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {pillars.map((p) => {
                                const IconComponent = p.icon;
                                return (
                                    <Card key={p.id} className="border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <Badge variant="outline" className="text-[11px] font-bold">
                                                    {p.ruleRef}
                                                </Badge>
                                                <Badge className={cn("text-[10px] font-semibold", p.status === 'active' ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800")}>
                                                    {p.countLabel}
                                                </Badge>
                                            </div>
                                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                                <div className={cn("p-1.5 rounded-lg bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30")}>
                                                    <IconComponent className="w-4 h-4" />
                                                </div>
                                                {p.title}
                                            </CardTitle>
                                            <CardDescription className="text-xs line-clamp-2 mt-1">
                                                {p.summary}
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4 pt-0">
                                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 text-xs space-y-1.5 border border-slate-100 dark:border-slate-800">
                                                <div className="font-bold text-slate-700 dark:text-slate-300">Why Regulators Care:</div>
                                                <p className="text-slate-600 dark:text-slate-400 text-[11px]">{p.whyItMatters}</p>
                                            </div>
                                            <Link href={p.link}>
                                                <Button className="w-full text-xs font-bold gap-2" variant="outline">
                                                    {p.cta}
                                                    <ArrowRight className="w-3.5 h-3.5" />
                                                </Button>
                                            </Link>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* TAB 2: 90-Day Roadmap */}
                {activeTab === 'roadmap' && (
                    <div className="space-y-4">
                        <Framework90DayRoadmap
                            spec={getHipaaRoadmap(clientId)}
                            clientId={clientId}
                        />
                    </div>
                )}

                {/* TAB 3: Architecture Boundary */}
                {activeTab === 'architecture' && (
                    <Card className="border border-slate-200 dark:border-slate-800 p-6 space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">ePHI Data Flow & Designated Record Set Boundary</h2>
                            <p className="text-sm text-slate-500">Document the perimeter where Electronic Protected Health Information (ePHI) is created, received, stored, or transmitted.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                                <h3 className="font-bold text-sm text-cyan-700 flex items-center gap-2">
                                    <Server className="w-4 h-4" /> ePHI Data Repositories
                                </h3>
                                <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
                                    <li>Production RDS Postgres (Encrypted with AWS KMS)</li>
                                    <li>AWS S3 Patient Document Vault (SSE-KMS)</li>
                                    <li>Audit Log Archival (Read-Only Write-Once)</li>
                                    <li>Disaster Recovery Snapshot Multi-Region Replica</li>
                                </ul>
                            </div>
                            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                                <h3 className="font-bold text-sm text-blue-700 flex items-center gap-2">
                                    <Lock className="w-4 h-4" /> Access & Transit Security
                                </h3>
                                <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
                                    <li>Strict TLS 1.3 in Transit (HTTPS, mTLS)</li>
                                    <li>Unique User IDs & Automatic Session Termination</li>
                                    <li>Role-Based Access (Need-to-Know / Minimum Necessary)</li>
                                    <li>Emergency "Break-Glass" Access Audit Trail</li>
                                </ul>
                            </div>
                            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                                <h3 className="font-bold text-sm text-emerald-700 flex items-center gap-2">
                                    <Globe className="w-4 h-4" /> Business Associate (BA) Perimeter
                                </h3>
                                <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
                                    <li>AWS Cloud Hosting (Active BAA on File)</li>
                                    <li>Twilio / SendGrid Notifications (Active BAA)</li>
                                    <li>Datadog Monitoring (Sanitized Log Masking)</li>
                                    <li>External Legal & Compliance Counsel</li>
                                </ul>
                            </div>
                        </div>
                    </Card>
                )}

                {/* TAB 4: OCR Audit Clean Room */}
                {activeTab === 'auditor' && (
                    <Card className="border border-slate-200 dark:border-slate-800 p-6 space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">HHS OCR Audit Clean Room</h2>
                                <p className="text-sm text-slate-500">Comprehensive evidence package ready for OCR compliance audits and healthcare partner due diligence.</p>
                            </div>
                            <Button onClick={() => toast.success("Exporting complete HIPAA OCR Compliance Dossier...")} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold gap-2">
                                <Download className="w-4 h-4" />
                                Export HIPAA Compliance Binder (ZIP)
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
                                <h4 className="font-bold text-sm text-slate-900">Security Risk Analysis (SRA) Documentation</h4>
                                <p className="text-xs text-slate-600">Download complete threat analysis, vulnerability correlation, and management risk treatment plan per NIST SP 800-30.</p>
                                <Button size="sm" variant="outline" className="text-xs font-bold gap-1" onClick={() => toast.success("SRA report exported!")}>
                                    Export SRA Executive Summary
                                </Button>
                            </div>
                            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
                                <h4 className="font-bold text-sm text-slate-900">Executed BAA Repository & Training Attestations</h4>
                                <p className="text-xs text-slate-600">Export signed Business Associate Agreements and timestamped workforce HIPAA training completion certificates.</p>
                                <Button size="sm" variant="outline" className="text-xs font-bold gap-1" onClick={() => toast.success("BAA binder exported!")}>
                                    Export BAA Ledger CSV
                                </Button>
                            </div>
                        </div>
                    </Card>
                )}

            </div>
        </DashboardLayout>
    );
}
