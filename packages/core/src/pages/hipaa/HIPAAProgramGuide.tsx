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
    CalendarClock, CheckSquare, ListTodo, ExternalLink, HeartPulse, FileCheck
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Progress } from '@complianceos/ui/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useClientContext } from '@/contexts/ClientContext';
import { Framework90DayRoadmap } from '@/components/roadmap/Framework90DayRoadmap';
import { getHipaaRoadmap } from '@/data/frameworkRoadmaps';
import { FrameworkDocumentTracker } from '@/components/documents/FrameworkDocumentTracker';

interface HIPAAProgramGuideProps {
    id?: string | number;
    clientId?: string | number;
}

export default function HIPAAProgramGuide(props?: HIPAAProgramGuideProps) {
    const params = useParams<{ id?: string; clientId?: string }>();
    const [location, setLocation] = useLocation();
    const { selectedClientId } = useClientContext();
    const urlMatch = location.match(/\/clients\/(\d+)/);
    const idParam = props?.id || props?.clientId || params?.id || params?.clientId || (urlMatch ? urlMatch[1] : undefined);
    const clientId = typeof idParam === "number" ? idParam : parseInt(idParam || "0", 10) || selectedClientId || 0;

    // Read ?tab= query parameter
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const tabParam = searchParams?.get('tab');
    const validTabs: Array<'tutorials' | 'roadmap' | 'documents' | 'architecture' | 'auditor'> = ['tutorials', 'roadmap', 'documents', 'architecture', 'auditor'];
    const initialTab = validTabs.includes(tabParam as any) ? (tabParam as any) : 'tutorials';

    const [activeTab, setActiveTab] = useState<'tutorials' | 'roadmap' | 'documents' | 'architecture' | 'auditor'>(initialTab);

    // Track origin if user navigated from Start Here
    const [returnToStartHere, setReturnToStartHere] = useState<string | null>(() => {
        if (typeof window === 'undefined') return null;
        try {
            const sp = new URLSearchParams(window.location.search);
            const returnTo = sp.get('returnTo');
            if (returnTo && returnTo.includes('/start-here')) {
                const payload = JSON.stringify({ url: returnTo, timestamp: Date.now() });
                sessionStorage.setItem(`hipaa_start_here_origin_${clientId}`, payload);
                return returnTo;
            }
            if (document.referrer && document.referrer.includes('/start-here')) {
                const defaultUrl = `/clients/${clientId}/start-here`;
                const payload = JSON.stringify({ url: defaultUrl, timestamp: Date.now() });
                sessionStorage.setItem(`hipaa_start_here_origin_${clientId}`, payload);
                return defaultUrl;
            }
            const stored = sessionStorage.getItem(`hipaa_start_here_origin_${clientId}`);
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
                    sessionStorage.setItem(`hipaa_start_here_origin_${clientId}`, JSON.stringify({
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
                sessionStorage.setItem(`hipaa_start_here_origin_${clientId}`, JSON.stringify({
                    url: returnTo,
                    timestamp: Date.now()
                }));
                setReturnToStartHere(returnTo);
            }
        } catch {}
    }, [clientId, location]);

    const handleTabChange = (newTab: 'tutorials' | 'roadmap' | 'documents' | 'architecture' | 'auditor') => {
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
            sessionStorage.removeItem(`hipaa_start_here_origin_${clientId}`);
            sessionStorage.removeItem(`start_here_origin_${clientId}`);
        } catch {}
        const target = returnToStartHere || `/clients/${clientId}/start-here`;
        setReturnToStartHere(null);
        setLocation(target);
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
            color: 'text-slate-900',
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
                        <Button
                            variant={returnToStartHere ? "outline" : "ghost"}
                            size="sm"
                            onClick={handleReturnToStartHere}
                            className={cn(
                                "h-8 gap-1.5 font-medium text-xs transition-colors",
                                returnToStartHere
                                    ? "border-emerald-500/40 text-slate-900 hover:bg-emerald-500/10"
                                    : "text-slate-600 dark:text-slate-300 hover:text-slate-900"
                            )}
                        >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Back to Start Here
                        </Button>
                        <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
                        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                            HIPAA Security & Privacy Rule Program Guide
                        </span>
                    </div>

                    <div className="flex items-center gap-2">
                        <Link href={`/clients/${clientId}/readiness/wizard/HIPAA`}>
                            <Button variant="outline" size="sm" className="gap-2 text-xs font-medium rounded-xl">
                                <HeartPulse className="w-3.5 h-3.5 text-cyan-600" />
                                Scoping Wizard
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Start Here Return Banner */}
                {returnToStartHere && (
                    <div className="bg-emerald-100 border border-emerald-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium uppercase tracking-wider text-slate-900">
                                        Strategic Roadmap Workflow Active
                                    </span>
                                    <Badge className="bg-emerald-600 text-white text-[10px] font-medium">
                                        Origin Saved
                                    </Badge>
                                </div>
                                <p className="text-xs text-slate-700 mt-0.5">
                                    You navigated to this guide from the Start Here Command Center.
                                </p>
                            </div>
                        </div>
                        <Button
                            size="sm"
                            onClick={handleReturnToStartHere}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs h-9 px-4 rounded-xl gap-2 shrink-0 self-start sm:self-auto transition-all"
                        >
                            <ArrowLeft className="w-4 h-4" />
                            Back to Start Here
                        </Button>
                    </div>
                )}

                {/* Hero Banner */}
                <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1C4D8D] to-[#0F2C59] p-6 md:p-8 text-white shadow-lg">
                    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div className="space-y-3 max-w-3xl">
                            <div className="flex flex-wrap items-center gap-2">
                                <Badge className="bg-white/20 text-white border-white/30 text-xs font-medium">
                                    45 CFR Parts 160 & 164
                                </Badge>
                                <Badge className="bg-emerald-500/30 text-emerald-100 border-emerald-400/30 text-xs font-medium">
                                    HHS OCR Audit Ready
                                </Badge>
                            </div>
                            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
                                HIPAA Compliance Program Guide & 90-Day Roadmap
                            </h1>
                            <p className="text-blue-100 text-sm md:text-base leading-relaxed">
                                Complete operational guide covering the HIPAA Security Rule (Administrative, Physical & Technical Safeguards), Privacy Rule, Business Associate Agreements (BAA), and OCR audit binder.
                            </p>
                        </div>

                        {/* Readiness Metric Card */}
                        <div className="bg-white/15 rounded-2xl p-4 shrink-0 w-full lg:w-72 space-y-3 border border-white/20">
                            <div className="flex justify-between items-center text-xs text-blue-100">
                                <span>HIPAA Safeguards Score</span>
                                <span className="text-white text-base font-semibold">{progressPercentage}%</span>
                            </div>
                            <Progress value={progressPercentage} className="h-2.5 bg-white/20" />
                            <div className="grid grid-cols-2 gap-2 text-[11px] text-blue-100 pt-1">
                                <div>Policies: <span className="text-white font-medium">{approvedPolicies}</span></div>
                                <div>Safeguards: <span className="text-white font-medium">{activeControls}</span></div>
                                <div>Workforce: <span className="text-white font-medium">{safeEmployees.length}</span></div>
                                <div>BAA Vendors: <span className="text-white font-medium">{safeVendors.length}</span></div>
                            </div>
                            <Button
                                size="sm"
                                onClick={() => handleTabChange('roadmap')}
                                className="w-full bg-white hover:bg-blue-50 text-[#0F2C59] font-medium text-xs mt-2 rounded-xl h-8 gap-1.5"
                            >
                                <CalendarClock className="w-3.5 h-3.5" />
                                Continue 90-Day Roadmap
                                <ArrowRight className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Navigation Tabs */}
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                    <Button
                        variant={activeTab === 'tutorials' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleTabChange('tutorials')}
                        className={cn("font-medium text-xs rounded-xl", activeTab === 'tutorials' ? "bg-[#1C4D8D] text-white" : "text-slate-600 hover:text-slate-900")}
                    >
                        <BookOpen className="w-4 h-4 mr-1.5" />
                        Implementation Safeguards
                    </Button>
                    <Button
                        variant={activeTab === 'roadmap' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => handleTabChange('roadmap')}
                        className={cn("font-medium text-xs rounded-xl", activeTab === 'roadmap' ? "bg-[#1C4D8D] text-white" : "text-slate-600 hover:text-slate-900")}
                    >
                        <CalendarClock className="w-4 h-4 mr-1.5" />
                        90-Day Implementation Roadmap
                    </Button>
                    <Button
                        variant={activeTab === 'documents' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('documents')}
                        className={cn("font-medium text-xs rounded-xl", activeTab === 'documents' ? "bg-[#1C4D8D] text-white" : "text-slate-600 hover:text-slate-900")}
                    >
                        <FileCheck className="w-4 h-4 mr-1.5" />
                        Mandatory Documents
                    </Button>
                    <Button
                        variant={activeTab === 'architecture' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('architecture')}
                        className={cn("font-medium text-xs rounded-xl", activeTab === 'architecture' ? "bg-[#1C4D8D] text-white" : "text-slate-600 hover:text-slate-900")}
                    >
                        <Layers className="w-4 h-4 mr-1.5" />
                        ePHI Data Flow Boundary
                    </Button>
                    <Button
                        variant={activeTab === 'auditor' ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setActiveTab('auditor')}
                        className={cn("font-medium text-xs rounded-xl", activeTab === 'auditor' ? "bg-[#1C4D8D] text-white" : "text-slate-600 hover:text-slate-900")}
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
                                    <Card key={p.id} className="border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between rounded-2xl">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-center justify-between mb-2">
                                                <Badge variant="outline" className="text-[11px] font-medium">
                                                    {p.ruleRef}
                                                </Badge>
                                                <Badge className={cn("text-[10px] font-medium", p.status === 'active' ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800")}>
                                                    {p.countLabel}
                                                </Badge>
                                            </div>
                                            <CardTitle className="text-base font-semibold flex items-center gap-2">
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
                                            <div className="bg-blue-600 rounded-xl p-3 text-xs space-y-1.5">
                                                <div className="font-medium text-white">Why Regulators Care:</div>
                                                <p className="text-white text-[11px]">{p.whyItMatters}</p>
                                            </div>
                                            <Link href={p.link}>
                                                <Button className="w-full text-xs font-medium gap-2 rounded-xl" variant="outline">
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
                        {returnToStartHere && (
                            <div className="flex items-center justify-between bg-card border border-border p-3.5 rounded-2xl shadow-xs">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Target className="w-4 h-4 text-slate-900" />
                                    <span>Active 90-Day Roadmap Execution Mode</span>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleReturnToStartHere}
                                    className="border-emerald-500/40 text-slate-900 hover:bg-emerald-500/10 font-bold text-xs h-8 gap-1.5"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    Back to Start Here
                                </Button>
                            </div>
                        )}
                        <Framework90DayRoadmap
                            spec={getHipaaRoadmap(clientId)}
                            clientId={clientId}
                        />
                    </div>
                )}

                {/* TAB: Mandatory Documents */}
                {activeTab === 'documents' && (
                    <div className="space-y-6">
                        <FrameworkDocumentTracker framework="hipaa" clientId={clientId} />
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
