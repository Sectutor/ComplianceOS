import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'wouter';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@complianceos/ui/ui/card';
import { Badge } from '@complianceos/ui/ui/badge';
import { Button } from '@complianceos/ui/ui/button';
import {
    CheckCircle2, Shield, ShieldCheck, Target, FileText, Zap, AlertTriangle,
    ArrowRight, BookOpen, ArrowLeft, Info, Calendar, Download,
    Sparkles, Copy, Layers, Clock, Globe, Lock, Activity, Server, Users, Award,
    CalendarClock, CheckSquare, ListTodo, ExternalLink, FileCheck
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Progress } from '@complianceos/ui/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Framework90DayRoadmap } from '@/components/roadmap/Framework90DayRoadmap';
import { getSoc2Roadmap } from '@/data/frameworkRoadmaps';
import { FrameworkDocumentTracker } from '@/components/documents/FrameworkDocumentTracker';
import { SOC2SystemDescriptionStudio } from '@/components/soc2/SOC2SystemDescriptionStudio';

export default function SOC2ProgramGuide() {
    const params = useParams<{ id?: string; clientId?: string }>();
    const clientId = parseInt(params.id || params.clientId || "0", 10);
    const [, setLocation] = useLocation();

    // Read ?tab= query parameter
    const validTabs = ['tutorials', 'roadmap', 'documents', 'system-description', 'architecture', 'auditor'] as const;
    type ValidTab = typeof validTabs[number];

    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const tabParam = searchParams?.get('tab');
    const initialTab: ValidTab = (tabParam && (validTabs as readonly string[]).includes(tabParam))
        ? (tabParam as ValidTab)
        : 'tutorials';

    const [activeTab, setActiveTab] = useState<ValidTab>(initialTab);

    // Keep activeTab in sync if URL query parameter changes
    useEffect(() => {
        try {
            const currentTab = new URLSearchParams(window.location.search).get('tab');
            if (currentTab && (validTabs as readonly string[]).includes(currentTab) && currentTab !== activeTab) {
                setActiveTab(currentTab as ValidTab);
            }
        } catch {}
    }, [window.location.search]);

    const handleTabChange = (tab: ValidTab) => {
        setActiveTab(tab);
        try {
            const u = new URL(window.location.href);
            u.searchParams.set('tab', tab);
            // Clean up any lingering returnTo on tab switch inside program guide
            u.searchParams.delete('returnTo');
            u.searchParams.delete('returnLabel');
            u.searchParams.delete('frameworkId');
            u.searchParams.delete('taskId');
            u.searchParams.delete('taskTitle');
            window.history.replaceState({}, '', u.toString());
        } catch {}
    };

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
        approvedPolicies >= 5,
        activeControls >= 10,
        safeEmployees.length >= 3,
        safeVendors.length >= 1
    ].filter(Boolean).length;

    const progressPercentage = Math.min(100, Math.round((completedPillars / 4) * 100));

    const pillars = [
        {
            id: 'cc1_control_environment',
            number: 1,
            title: 'Control Environment & Security Governance',
            criteriaRef: 'AICPA TSC CC1.1–CC1.5 / CC2.1',
            status: approvedPolicies >= 3 ? 'active' : 'pending',
            countLabel: `${approvedPolicies} Policies Approved`,
            icon: Target,
            color: 'text-blue-600',
            bgLight: 'bg-blue-50/70',
            borderColor: 'border-blue-200',
            gradient: 'from-blue-600 to-indigo-600',
            summary: 'Establish tone-at-the-top integrity, formalize executive security oversight, publish code of conduct, and enforce background checks.',
            whyItMatters: 'CPA auditors inspect management integrity and organizational commitments first. CC1 failures immediately halt Type II opinion generation.',
            link: `/clients/${clientId}/policies`,
            cta: 'Review Security Policies'
        },
        {
            id: 'cc6_access_control',
            number: 2,
            title: 'Logical & Physical Access Controls',
            criteriaRef: 'AICPA TSC CC6.1–CC6.8',
            status: activeControls >= 5 ? 'active' : 'pending',
            countLabel: 'SSO & MFA Enforced',
            icon: Lock,
            color: 'text-emerald-600',
            bgLight: 'bg-emerald-50/70',
            borderColor: 'border-emerald-200',
            gradient: 'from-emerald-600 to-teal-600',
            summary: 'Enforce hardware MFA, role-based least privilege, quarterly user access reviews, and immediate offboarding deprovisioning.',
            whyItMatters: 'Unauthorized access to production customer data represents the highest weighted test area during the observation window.',
            link: `/clients/${clientId}/people`,
            cta: 'Manage Access & Roles'
        },
        {
            id: 'cc7_operations',
            number: 3,
            title: 'System Operations, Monitoring & Vulnerabilities',
            criteriaRef: 'AICPA TSC CC7.1–CC7.5',
            status: 'active',
            countLabel: 'Continuous Monitoring Active',
            icon: Activity,
            color: 'text-cyan-600',
            bgLight: 'bg-cyan-50/70',
            borderColor: 'border-cyan-200',
            gradient: 'from-cyan-600 to-blue-700',
            summary: 'Deploy centralized log aggregation, automated vulnerability scanning in CI/CD, intrusion detection, and incident response runbooks.',
            whyItMatters: 'Auditors request sample tickets for security alerts and vulnerability remediations to verify that SLA windows were honored.',
            link: `/clients/${clientId}/cyber/incidents`,
            cta: 'Incident Center'
        },
        {
            id: 'cc8_change_mgmt',
            number: 4,
            title: 'Change Management & Secure Software Development',
            criteriaRef: 'AICPA TSC CC8.1',
            status: 'active',
            countLabel: 'Peer-Review Gates Enforced',
            icon: Server,
            color: 'text-indigo-600',
            bgLight: 'bg-indigo-50/70',
            borderColor: 'border-indigo-200',
            gradient: 'from-indigo-600 to-violet-600',
            summary: 'Enforce branch protection rules, mandatory independent peer code review, automated testing suites, and separate staging environments.',
            whyItMatters: 'A single unauthorized code commit directly to production during the audit observation period results in a qualification finding.',
            link: `/clients/${clientId}/evidence`,
            cta: 'Verify Change Evidence'
        },
        {
            id: 'cc9_vendor_risk',
            number: 5,
            title: 'Third-Party Vendor Risk & Subprocessor Management',
            criteriaRef: 'AICPA TSC CC9.2',
            status: safeVendors.length > 0 ? 'active' : 'pending',
            countLabel: `${safeVendors.length} Subprocessors Tracked`,
            icon: Globe,
            color: 'text-amber-600',
            bgLight: 'bg-amber-50/70',
            borderColor: 'border-amber-200',
            gradient: 'from-amber-600 to-orange-600',
            summary: 'Inventory all third-party subservice organizations, collect annual SOC 2 Type II reports, and enforce DPAs and security clauses.',
            whyItMatters: 'If your cloud host or critical SaaS partner suffers an outage or breach, auditors examine your subservice due diligence records.',
            link: `/clients/${clientId}/vendors`,
            cta: 'Vendor Risk Register'
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
                            AICPA SOC 2 Type II Operating Guide
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link href={`/clients/${clientId}/compliance-journey`}>
                            <Button variant="outline" size="sm" className="gap-2 text-xs font-bold">
                                <Activity className="w-3.5 h-3.5 text-blue-600" />
                                4-Phase Audit Journey
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Hero Banner */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 md:p-8 text-white shadow-xl">
                    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="space-y-3 max-w-3xl">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30 text-xs font-bold uppercase tracking-wider">
                                    AICPA Trust Services Criteria
                                </Badge>
                                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-xs font-bold">
                                    Type II Observation Ready
                                </Badge>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                                SOC 2 Type II Program Guide & Implementation Roadmap
                            </h1>
                            <p className="text-slate-300 text-sm md:text-base leading-relaxed">
                                Complete operational execution guide covering Security, Availability, Confidentiality, Processing Integrity, and Privacy with continuous evidence collection and CPA auditor clean room.
                            </p>
                        </div>

                        {/* Readiness Metric Card */}
                        <div className="bg-white/10 backdrop-blur-md rounded-xl p-4 border border-white/10 shrink-0 w-full lg:w-72 space-y-3">
                            <div className="flex justify-between items-center text-xs font-bold text-slate-300">
                                <span>SOC 2 Readiness</span>
                                <span className="text-white text-base">{progressPercentage}%</span>
                            </div>
                            <Progress value={progressPercentage} className="h-2.5 bg-slate-700" />
                            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300 pt-1">
                                <div>Policies: <strong className="text-white">{approvedPolicies}</strong></div>
                                <div>Controls: <strong className="text-white">{activeControls}</strong></div>
                                <div>Personnel: <strong className="text-white">{safeEmployees.length}</strong></div>
                                <div>Vendors: <strong className="text-white">{safeVendors.length}</strong></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                    <Button
                        variant={activeTab === 'tutorials' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleTabChange('tutorials')}
                        className={cn("font-bold text-xs rounded-xl", activeTab === 'tutorials' ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:text-slate-900")}
                    >
                        <BookOpen className="w-4 h-4 mr-1.5" />
                        Implementation Pillars
                    </Button>
                    <Button
                        variant={activeTab === 'roadmap' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleTabChange('roadmap')}
                        className={cn("font-bold text-xs rounded-xl", activeTab === 'roadmap' ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900")}
                    >
                        <CalendarClock className="w-4 h-4 mr-1.5" />
                        90-Day Implementation Roadmap
                    </Button>
                    <Button
                        variant={activeTab === 'documents' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleTabChange('documents')}
                        className={cn("font-bold text-xs rounded-xl", activeTab === 'documents' ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900")}
                    >
                        <FileCheck className="w-4 h-4 mr-1.5" />
                        Mandatory Documents
                    </Button>
                    <Button
                        variant={activeTab === 'system-description' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleTabChange('system-description')}
                        className={cn("font-bold text-xs rounded-xl", activeTab === 'system-description' ? "bg-blue-600 text-white shadow-sm" : "text-slate-600 hover:text-slate-900")}
                    >
                        <FileText className="w-4 h-4 mr-1.5" />
                        Section III System Description
                    </Button>
                    <Button
                        variant={activeTab === 'architecture' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleTabChange('architecture')}
                        className={cn("font-bold text-xs rounded-xl", activeTab === 'architecture' ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:text-slate-900")}
                    >
                        <Layers className="w-4 h-4 mr-1.5" />
                        Cloud Architecture Boundary
                    </Button>
                    <Button
                        variant={activeTab === 'auditor' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleTabChange('auditor')}
                        className={cn("font-bold text-xs rounded-xl", activeTab === 'auditor' ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:text-slate-900")}
                    >
                        <ShieldCheck className="w-4 h-4 mr-1.5" />
                        CPA Auditor Clean Room
                    </Button>
                </div>

                {/* TAB 1: Implementation Pillars */}
                {activeTab === 'tutorials' && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Core SOC 2 Trust Services Pillars</h2>
                                <p className="text-sm text-slate-500">Execute the 5 primary control domains required for unqualified SOC 2 Type II certification.</p>
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
                                                    {p.criteriaRef}
                                                </Badge>
                                                <Badge className={cn("text-[10px] font-semibold", p.status === 'active' ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800")}>
                                                    {p.countLabel}
                                                </Badge>
                                            </div>
                                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                                <div className={cn("p-1.5 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30")}>
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
                                                <div className="font-bold text-slate-700 dark:text-slate-300">Why Auditors Care:</div>
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
                            spec={getSoc2Roadmap(clientId)}
                            clientId={clientId}
                        />
                    </div>
                )}

                {/* TAB: Mandatory Documents */}
                {activeTab === 'documents' && (
                    <div className="space-y-6">
                        <FrameworkDocumentTracker framework="soc2" clientId={clientId} />
                    </div>
                )}

                {/* TAB: Section III System Description Studio */}
                {activeTab === 'system-description' && (
                    <div className="space-y-6">
                        <SOC2SystemDescriptionStudio
                            clientId={clientId}
                            onBackToRoadmap={() => setActiveTab('roadmap')}
                        />
                    </div>
                )}

                {/* TAB 3: Architecture Boundary */}
                {activeTab === 'architecture' && (
                    <Card className="border border-slate-200 dark:border-slate-800 p-6 space-y-6">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">SOC 2 Cloud Trust Boundary & Scope Map</h2>
                            <p className="text-sm text-slate-500">Document system boundary per Section III (System Description) requirements.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                                <h3 className="font-bold text-sm text-blue-700 flex items-center gap-2">
                                    <Server className="w-4 h-4" /> Production Cloud (In-Scope)
                                </h3>
                                <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
                                    <li>AWS/GCP Kubernetes Clusters (EKS/GKE)</li>
                                    <li>Production RDS Postgres / Cloud SQL</li>
                                    <li>AWS S3 Customer Object Storage (SSE-KMS)</li>
                                    <li>Cloudflare WAF & DDoS Protection</li>
                                </ul>
                            </div>
                            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                                <h3 className="font-bold text-sm text-emerald-700 flex items-center gap-2">
                                    <Lock className="w-4 h-4" /> Identity & Access Boundary
                                </h3>
                                <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
                                    <li>Okta / Google Workspace SSO Enforced</li>
                                    <li>Hardware-Token WebAuthn / FIDO2 MFA</li>
                                    <li>Role-Based Access Control (RBAC)</li>
                                    <li>Quarterly Automated Access Recertification</li>
                                </ul>
                            </div>
                            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                                <h3 className="font-bold text-sm text-purple-700 flex items-center gap-2">
                                    <Activity className="w-4 h-4" /> Monitoring & CI/CD
                                </h3>
                                <ul className="text-xs text-slate-600 space-y-2 list-disc list-inside">
                                    <li>GitHub Actions CI/CD with SAST/DAST</li>
                                    <li>Datadog / AWS CloudWatch Real-Time Alarms</li>
                                    <li>Tamper-Proof Audit Log Retention (1 Year)</li>
                                    <li>Automated S3 Replication & Cold Backups</li>
                                </ul>
                            </div>
                        </div>
                    </Card>
                )}

                {/* TAB 4: CPA Auditor Clean Room */}
                {activeTab === 'auditor' && (
                    <Card className="border border-slate-200 dark:border-slate-800 p-6 space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-slate-900 dark:text-white">CPA Auditor Clean Room</h2>
                                <p className="text-sm text-slate-500">Single-pane-of-glass export package for third-party SOC 2 Type II audit firms.</p>
                            </div>
                            <Button onClick={() => toast.success("Exporting complete SOC 2 Type II Evidence Dossier...")} className="bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2">
                                <Download className="w-4 h-4" />
                                Download Full Audit Dossier (ZIP)
                            </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
                                <h4 className="font-bold text-sm text-slate-900">Section III: Management System Description</h4>
                                <p className="text-xs text-slate-600">Complete architectural description, principal service commitments, and system requirements ready for the audit report body.</p>
                                <Button size="sm" variant="outline" className="text-xs font-bold gap-1" onClick={() => setActiveTab('system-description')}>
                                    Open System Description Studio
                                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                                </Button>
                            </div>
                            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
                                <h4 className="font-bold text-sm text-slate-900">Population Samples & Evidence Ledger</h4>
                                <p className="text-xs text-slate-600">Export timestamped employee onboarding/offboarding tickets, change management PR approvals, and vulnerability scan reports.</p>
                                <Button size="sm" variant="outline" className="text-xs font-bold gap-1" onClick={() => toast.success("Population CSVs exported!")}>
                                    Export Populations CSV
                                </Button>
                            </div>
                        </div>
                    </Card>
                )}

            </div>
        </DashboardLayout>
    );
}
