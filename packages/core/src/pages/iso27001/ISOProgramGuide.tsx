import React, { useState } from 'react';
import { useParams, Link, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@complianceos/ui/ui/card';
import { Badge } from '@complianceos/ui/ui/badge';
import { Button } from '@complianceos/ui/ui/button';
import {
    CheckCircle2, Database, FileText, Activity, Users, AlertTriangle,
    ArrowRight, BookOpen, ArrowLeft, Info, Calendar,
    Globe, Shield, Scale, Clock, Lock, Sparkles, Copy, ChevronRight,
    Check, Target, Layers, Compass, Award, ExternalLink, Printer,
    CheckSquare, CalendarClock, ListTodo
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Progress } from '@complianceos/ui/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ISOLayout } from './ISOLayout';
import { AuditDossierModal } from './AuditDossierModal';
import { Framework90DayRoadmap } from '@/components/roadmap/Framework90DayRoadmap';
import { getIso27001Roadmap } from '@/data/frameworkRoadmaps';

export default function ISOProgramGuide() {
    const params = useParams();
    const clientId = parseInt(params.id || params.clientId || "0");
    const [location, setLocation] = useLocation();
    
    // Read optional ?tab= query parameter
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const tabParam = searchParams?.get('tab');
    const validTabs: Array<'tutorials' | 'roadmap' | 'architecture' | 'auditor'> = ['tutorials', 'roadmap', 'architecture', 'auditor'];
    const initialTab = validTabs.includes(tabParam as any) ? (tabParam as any) : 'tutorials';

    const [activeTab, setActiveTab] = useState<'tutorials' | 'roadmap' | 'architecture' | 'auditor'>(initialTab);
    const [dossierOpen, setDossierOpen] = useState(false);

    const utils = trpc.useUtils();
    const seedStarterKit = trpc.iso27001.seedStarterKit.useMutation({
        onSuccess: (res) => {
            toast.success(res.message);
            utils.iso27001.getSoA.invalidate({ clientId });
            utils.risks.getRiskAssessments.invalidate({ clientId });
            utils.clientPolicies.list.invalidate({ clientId });
        },
        onError: (err) => {
            toast.error("Failed to initialize starter kit: " + err.message);
        }
    });

    // Local checklist progress state
    const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>(() => {
        try {
            const stored = localStorage.getItem(`iso27001_tasks_${clientId}`);
            return stored ? JSON.parse(stored) : {};
        } catch {
            return {};
        }
    });

    const toggleTask = (taskId: string) => {
        setCompletedTasks((prev) => {
            const next = { ...prev, [taskId]: !prev[taskId] };
            try {
                localStorage.setItem(`iso27001_tasks_${clientId}`, JSON.stringify(next));
            } catch {}
            return next;
        });
    };

    // Fetch live system telemetry safely
    const { data: soaData } = trpc.iso27001.getSoA.useQuery({ clientId }, { enabled: !!clientId });
    const { data: risksData } = trpc.risks.getRiskAssessments.useQuery({ clientId }, { enabled: !!clientId });
    const { data: clientPolicies } = trpc.clientPolicies.list.useQuery({ clientId }, { enabled: !!clientId });

    // Defensive array checks
    const safeSoa = Array.isArray(soaData) ? soaData : [];
    const safeRisks = Array.isArray(risksData) ? risksData : [];
    const safePolicies = Array.isArray(clientPolicies) ? clientPolicies : [];

    // Compute live progress stats
    const totalSoaControls = safeSoa.length || 93;
    const implementedSoaControls = safeSoa.filter((c: any) => c?.clientControl?.status === 'implemented' || c?.clientControl?.status === 'active').length;
    const inProgressSoaControls = safeSoa.filter((c: any) => c?.clientControl?.status === 'in_progress').length;
    
    const totalRisks = safeRisks.length;
    const treatedRisks = safeRisks.filter((r: any) => r?.status === 'treated' || r?.status === 'closed' || r?.status === 'mitigated').length;
    
    const totalPolicies = safePolicies.length;
    const approvedPolicies = safePolicies.filter((p: any) => p?.clientPolicy?.status === 'approved' || p?.status === 'approved' || p?.clientPolicy?.status === 'published').length;

    const completedPillars = [
        totalSoaControls > 0,
        implementedSoaControls > 0,
        totalRisks > 0,
        totalPolicies > 0,
        approvedPolicies > 0
    ].filter(Boolean).length;

    const progressPercentage = Math.min(100, Math.round(((implementedSoaControls / 93) * 0.5 + (completedPillars / 5) * 0.5) * 100));

    const pillars = [
        {
            id: 'context',
            number: 1,
            title: 'ISMS Context & Leadership Commitment',
            clauseRef: 'ISO 27001:2022 Clauses 4 & 5',
            status: 'active',
            countLabel: 'Scope & Governance',
            icon: Target,
            color: 'text-blue-600',
            bgLight: 'bg-blue-50/70',
            borderColor: 'border-blue-200',
            gradient: 'from-indigo-600 to-violet-600',
            summary: 'Define the boundary and applicability of the Information Security Management System (ISMS), identify interested parties, and formalize top management commitment.',
            whyItMatters: 'Lead auditors immediately review Clause 4.3 (Scope Statement) and Clause 5.2 (Information Security Policy). If your scope is ambiguous or lacks executive sign-off, the entire certification halts.',
            howToExecute: [
                '1. Navigate to Organization Context and define the ISMS Scope Statement (in-scope products, offices, cloud infrastructure, and departments).',
                '2. Catalogue Internal & External Issues (e.g. cloud migration risks, remote work security, regulatory compliance).',
                '3. Document Interested Parties (Customers, Regulators, Board, SaaS vendors) and their legal/contractual requirements.',
                '4. Ensure the C-Level Executive Team approves and publishes the Master Information Security Policy.'
            ],
            link: `/clients/${clientId}/iso27001/governance`,
            cta: 'Configure ISMS Scope'
        },
        {
            id: 'assets',
            number: 2,
            title: 'Information Asset Register & Classification',
            clauseRef: 'ISO 27001 Clause 8 / Annex A.5.9–A.5.14',
            status: 'active',
            countLabel: 'Asset Classification',
            icon: Database,
            color: 'text-blue-600',
            bgLight: 'bg-blue-50/70',
            borderColor: 'border-blue-200',
            gradient: 'from-blue-600 to-cyan-600',
            summary: 'Identify, classify, and assign ownership for all information assets, hardware systems, cloud services, and repositories handling sensitive data.',
            whyItMatters: 'You cannot assess risks on assets you have not identified. ISO 27001 requires an accurate asset inventory with defined ownership and handling rules.',
            howToExecute: [
                '1. Open Asset Inventory and review or register all organizational information assets.',
                '2. Classify each asset based on Confidentiality, Integrity, and Availability (CIA) impact (Confidential, Restricted, Internal, Public).',
                '3. Assign a designated Asset Owner responsible for maintaining security controls and lifecycle management.',
                '4. Map asset dependencies to key business processes and cloud infrastructure.'
            ],
            link: `/clients/${clientId}/iso27001/assets`,
            cta: 'Manage Asset Register'
        },
        {
            id: 'risks',
            number: 3,
            title: 'ISO 27005 Risk Assessment & Treatment Plan (RTP)',
            clauseRef: 'ISO 27001:2022 Clause 6.1',
            status: totalRisks > 0 ? 'active' : 'pending',
            countLabel: `${totalRisks} Risks Logged (${treatedRisks} Treated)`,
            icon: Shield,
            color: 'text-amber-600',
            bgLight: 'bg-amber-50/70',
            borderColor: 'border-amber-200',
            gradient: 'from-amber-500 to-orange-600',
            summary: 'Conduct systematic risk assessments to identify threats and vulnerabilities, evaluate likelihood and impact, and document formal Risk Treatment Plans.',
            whyItMatters: 'ISO 27001 is fundamentally a risk-driven standard. Every Annex A control in your SoA must be justified by an identified risk or legal obligation.',
            howToExecute: [
                '1. Open Risk Register and log identified information security threats (e.g. ransomware, credential stuffing, vendor outages, data leakage).',
                '2. Score Inherent Likelihood and Impact (1 to 5) to determine the overall Risk Severity Score.',
                '3. Select a Risk Treatment Option (Mitigate, Transfer, Avoid, Accept) and assign a Treatment Owner and deadline.',
                '4. Link the treatment plan directly to corresponding Annex A controls in the SoA.'
            ],
            link: `/clients/${clientId}/iso27001/risks`,
            cta: 'Open Risk Register'
        },
        {
            id: 'soa',
            number: 4,
            title: 'Statement of Applicability (SoA) & 93 Annex A Controls',
            clauseRef: 'ISO 27001:2022 Clause 6.1.3 & Annex A',
            status: implementedSoaControls > 0 ? 'active' : 'pending',
            countLabel: `${implementedSoaControls} / 93 Implemented`,
            icon: Lock,
            color: 'text-purple-600',
            bgLight: 'bg-purple-50/70',
            borderColor: 'border-purple-200',
            gradient: 'from-purple-600 to-indigo-600',
            summary: 'Review and document the applicability and implementation status of all 93 controls across the 4 modernized ISO 27001:2022 themes.',
            whyItMatters: 'The Statement of Applicability (SoA) is the single most critical document in your certification audit. External auditors examine every inclusion and exclusion justification.',
            howToExecute: [
                '1. Open SoA (Annex A) and review controls across the 4 Themes: Organizational (37), People (8), Physical (14), Technological (34).',
                '2. For each control, select Applicability (Applicable vs. Not Applicable) and provide formal business justification.',
                '3. Update Implementation Status (Not Implemented, In Progress, Implemented) and link supporting policy and technical evidence.',
                '4. Use the "Export SoA" feature to generate the formal audit deliverable.'
            ],
            link: `/clients/${clientId}/iso27001/soa`,
            cta: 'Manage SoA Controls'
        },
        {
            id: 'documents',
            number: 5,
            title: 'Mandatory ISMS Document Tracker & Policies',
            clauseRef: 'ISO 27001:2022 Clause 7.5',
            status: totalPolicies > 0 ? 'active' : 'pending',
            countLabel: `${totalPolicies} Policies (${approvedPolicies} Approved)`,
            icon: FileText,
            color: 'text-rose-600',
            bgLight: 'bg-rose-50/70',
            borderColor: 'border-rose-200',
            gradient: 'from-rose-500 to-pink-600',
            summary: 'Author, review, approve, and maintain version-controlled policies and mandatory records mandated by ISO 27001.',
            whyItMatters: 'Missing mandatory documented information (such as Access Control Policy, Incident Response Procedure, or Cryptography Policy) triggers immediate Major Non-Conformities in Stage 1.',
            howToExecute: [
                '1. Open Policy Center to author and customize mandatory ISO 27001 policies using pre-built templates or AI generation.',
                '2. Customize policies to reflect your technical environment (MFA enforcement, AWS/GCP access controls, data retention).',
                '3. Route policies for formal C-Level approval and distribute to employees for annual acknowledgment.',
                '4. Track document review cadences, owners, and version history in the ISMS Document Register (/iso27001/documents).'
            ],
            link: `/clients/${clientId}/policies`,
            cta: 'Open Policy Center'
        },
        {
            id: 'audit',
            number: 6,
            title: 'Internal Audit Program & Corrective Actions (CAPA)',
            clauseRef: 'ISO 27001:2022 Clauses 9.2 & 10.2',
            status: 'active',
            countLabel: 'Audit & Remediation',
            icon: Activity,
            color: 'text-emerald-600',
            bgLight: 'bg-emerald-50/70',
            borderColor: 'border-emerald-200',
            gradient: 'from-emerald-500 to-teal-600',
            summary: 'Plan and execute objective internal audits across all ISMS clauses and Annex A controls to detect non-conformities prior to external certification.',
            whyItMatters: 'You cannot achieve ISO 27001 certification without conducting at least one full internal audit covering the entire ISMS scope and demonstrating effective corrective actions.',
            howToExecute: [
                '1. Open Internal Audit and generate an Internal Audit Schedule covering Clauses 4–10 and Annex A.',
                '2. Sample evidence and log findings classified as Major Non-Conformity, Minor Non-Conformity, or Opportunity for Improvement (OFI).',
                '3. Perform Root Cause Analysis (RCA) for any non-conformities and assign Corrective and Preventive Actions (CAPA).',
                '4. Verify that corrective actions are implemented and validated before scheduling Stage 1 audit.'
            ],
            link: `/clients/${clientId}/iso27001/audit`,
            cta: 'Open Internal Audit'
        },
        {
            id: 'review',
            number: 7,
            title: 'Management Review & Certification Audit Readiness',
            clauseRef: 'ISO 27001:2022 Clause 9.3 & Stage 1 / Stage 2',
            status: 'active',
            countLabel: 'Executive Review & Cert',
            icon: Award,
            color: 'text-cyan-600',
            bgLight: 'bg-cyan-50/70',
            borderColor: 'border-cyan-200',
            gradient: 'from-cyan-600 to-blue-700',
            summary: 'Convene executive leadership to review ISMS performance, risk treatment results, audit findings, and finalize readiness for accredited certification.',
            whyItMatters: 'Clause 9.3 requires formal Management Review minutes with executive signatures before Stage 1 (Documentation Review) and Stage 2 (Certification Audit) can begin.',
            howToExecute: [
                '1. Open Mgmt Review and prepare the formal agenda covering ISMS metrics, audit results, security incidents, and risk posture.',
                '2. Record executive decisions regarding resource allocation, budget, and continuous improvement initiatives.',
                '3. Generate and archive the signed Management Review Meeting Minutes.',
                '4. Assemble the final Auditor Clean Room package for your accredited Certification Body (e.g. BSI, TÜV, SGS, Schellman).'
            ],
            link: `/clients/${clientId}/iso27001/management-review`,
            cta: 'Open Management Review'
        }
    ];

    const copyMasterManual = () => {
        const manualText = `COMPLIANCEOS ISO/IEC 27001:2022 ISMS OPERATING MANUAL\n` +
            `============================================================\n` +
            `Organization: Client #${clientId}\n` +
            `Standard: ISO/IEC 27001:2022 (Information Security Management System)\n` +
            `Generated: ${new Date().toLocaleDateString()}\n\n` +
            `1. ISMS CONTEXT & LEADERSHIP (Clauses 4 & 5)\n` +
            `   - ISMS Scope Statement, Internal/External context, and Top Management Security Policy.\n\n` +
            `2. ASSET INVENTORY & CLASSIFICATION (Clause 8 / A.5.9-A.5.14)\n` +
            `   - Hardware, Software, Cloud SaaS, and Information assets categorized by CIA sensitivity.\n\n` +
            `3. RISK ASSESSMENT & TREATMENT (Clause 6.1 / ISO 27005)\n` +
            `   - Inherent vs Residual risk evaluation, risk appetite, and assigned treatment plans (${totalRisks} risks logged).\n\n` +
            `4. STATEMENT OF APPLICABILITY - SoA (Clause 6.1.3 & Annex A)\n` +
            `   - 93 Annex A controls across 4 Themes: Organizational (37), People (8), Physical (14), Technological (34).\n` +
            `   - Implementation Progress: ${implementedSoaControls} of 93 controls implemented.\n\n` +
            `5. MANDATORY ISMS POLICIES & RECORDS (Clause 7.5)\n` +
            `   - ${totalPolicies} documented policies approved, versioned, and acknowledged by personnel.\n\n` +
            `6. INTERNAL AUDIT & CAPA (Clauses 9.2 & 10.2)\n` +
            `   - Full ISMS scope internal audit execution, non-conformity tracking, and corrective action verification.\n\n` +
            `7. MANAGEMENT REVIEW & CERTIFICATION AUDIT (Clause 9.3 & Stage 1/2)\n` +
            `   - Executive review meeting minutes, resource commitment, and certification audit package.`;

        navigator.clipboard.writeText(manualText);
        toast.success("Complete ISO 27001 ISMS Operating Manual copied to clipboard!");
    };

    return (
        <ISOLayout clientId={clientId} fullWidth>
            <div className="space-y-8 animate-in fade-in duration-500 pb-20 p-4 md:p-8">
                {/* Hero Header */}
                <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-8 lg:p-12 text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                    <div className="relative z-10 space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-blue-400">
                                    <BookOpen className="w-8 h-8 text-blue-400" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h1 className="text-3xl lg:text-4xl font-black tracking-tight">ISO 27001 Operating Guide & Manual</h1>
                                        <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30 text-xs font-bold">
                                            ISO/IEC 27001:2022 ISMS
                                        </Badge>
                                    </div>
                                    <p className="text-white/70 text-base mt-1">
                                        Complete implementation roadmap, Clauses 4–10 operational manual, and Annex A controls registry.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Button
                                    onClick={() => setActiveTab('roadmap')}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl h-11 px-5 shadow-lg flex items-center gap-2"
                                >
                                    <CalendarClock className="w-4 h-4" />
                                    Continue 90-Day Roadmap
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Progress Bar & Telemetry */}
                        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-white/80 flex items-center gap-2">
                                    <Shield className="w-4 h-4 text-emerald-400" />
                                    ISO 27001:2022 Implementation & Certification Maturity
                                </span>
                                <span className="text-sm font-black text-blue-300 bg-blue-950/60 px-3 py-1 rounded-full border border-blue-800/50">
                                    {progressPercentage}% Ready
                                </span>
                            </div>
                            <Progress value={progressPercentage} className="h-2.5 bg-white/10 rounded-full" />
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
                                <div className="text-white/70">
                                    <span className="font-bold text-white">{implementedSoaControls} / 93</span> Annex A Controls
                                </div>
                                <div className="text-white/70">
                                    <span className="font-bold text-white">{totalRisks}</span> Assessed Risks
                                </div>
                                <div className="text-white/70">
                                    <span className="font-bold text-white">{totalPolicies}</span> Documented Policies
                                </div>
                                <div className="text-white/70">
                                    <span className="font-bold text-white">{approvedPolicies}</span> Approved Policies
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Conditional Initial Setup Banner for Brand New / 0% Clients */}
                {totalRisks === 0 && implementedSoaControls === 0 && (
                    <div className="bg-gradient-to-r from-blue-950/60 via-indigo-950/40 to-slate-900/60 border border-blue-500/30 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-amber-400" />
                                <h4 className="font-bold text-sm text-foreground">New ISMS Setup: Seed Cloud Baseline</h4>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                Starting from scratch? Automatically pre-populate standard cloud assets (AWS, GitHub, Google Workspace, Laptops, DB) and initial ISO 27005 threat scenarios.
                            </p>
                        </div>
                        <Button
                            size="sm"
                            onClick={() => seedStarterKit.mutate({ clientId })}
                            disabled={seedStarterKit.isPending}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shrink-0 rounded-xl h-9 shadow"
                        >
                            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                            {seedStarterKit.isPending ? "Setting up..." : "Initialize Baseline Data"}
                        </Button>
                    </div>
                )}

                {/* Navigation Tabs */}
                <div className="flex flex-wrap gap-2 border-b border-border pb-2">
                    <Button
                        variant={activeTab === 'tutorials' ? 'default' : 'ghost'}
                        onClick={() => setActiveTab('tutorials')}
                        className={cn("font-bold rounded-xl", activeTab === 'tutorials' ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                    >
                        <BookOpen className="w-4 h-4 mr-2" />
                        7-Pillar Operating Manual
                    </Button>
                    <Button
                        variant={activeTab === 'roadmap' ? 'default' : 'ghost'}
                        onClick={() => setActiveTab('roadmap')}
                        className={cn("font-bold rounded-xl", activeTab === 'roadmap' ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                    >
                        <CalendarClock className="w-4 h-4 mr-2" />
                        90-Day Implementation Roadmap
                    </Button>
                    <Button
                        variant={activeTab === 'architecture' ? 'default' : 'ghost'}
                        onClick={() => setActiveTab('architecture')}
                        className={cn("font-bold rounded-xl", activeTab === 'architecture' ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                    >
                        <Layers className="w-4 h-4 mr-2" />
                        ISMS PDCA Architecture
                    </Button>
                    <Button
                        variant={activeTab === 'auditor' ? 'default' : 'ghost'}
                        onClick={() => setActiveTab('auditor')}
                        className={cn("font-bold rounded-xl", activeTab === 'auditor' ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                    >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Auditor Clean Room
                    </Button>
                </div>

                {/* TAB 1: Step-by-Step Operating Manual */}
                {activeTab === 'tutorials' && (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 gap-6">
                            {pillars.map((pillar) => {
                                const IconComponent = pillar.icon;
                                return (
                                    <Card
                                        key={pillar.id}
                                        className="border-border shadow-xl shadow-slate-200/40 rounded-2xl overflow-hidden hover:shadow-2xl transition-all group bg-card"
                                    >
                                        <CardHeader className={`${pillar.bgLight} border-b border-border p-4 sm:p-6`}>
                                            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                                                <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 flex-1 min-w-0">
                                                    <div className={cn("h-11 w-11 sm:h-12 sm:w-12 rounded-2xl flex items-center justify-center font-black text-base sm:text-lg text-white shadow-md shrink-0 bg-gradient-to-br", pillar.gradient)}>
                                                        {pillar.number}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <CardTitle className="text-lg sm:text-xl font-bold text-foreground">
                                                                {pillar.title}
                                                            </CardTitle>
                                                            <Badge className="bg-card border-border text-foreground/80 text-[10px] font-bold shrink-0">
                                                                {pillar.clauseRef}
                                                            </Badge>
                                                        </div>
                                                        <CardDescription className="text-foreground/80 text-xs sm:text-sm font-medium mt-1 leading-relaxed">
                                                            {pillar.summary}
                                                        </CardDescription>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 self-start xl:self-center flex-wrap sm:flex-nowrap">
                                                    <Badge className={cn("font-bold text-xs px-3 py-1 border-none shrink-0", pillar.status === 'active' ? "bg-emerald-100 text-emerald-800" : "bg-muted text-foreground/80")}>
                                                        {pillar.countLabel}
                                                    </Badge>
                                                    <Button
                                                        onClick={() => setLocation(pillar.link)}
                                                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl h-9 sm:h-10 px-3.5 sm:px-4 text-xs sm:text-sm transition-all whitespace-nowrap shrink-0 shadow-sm"
                                                    >
                                                        {pillar.cta}
                                                        <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1.5 shrink-0" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-6 grid md:grid-cols-2 gap-6">
                                            <div className="space-y-3 bg-muted/70 p-4 rounded-xl border border-border">
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                                    <Info className="w-3.5 h-3.5 text-primary" />
                                                    Why This Step Is Mandatory for Certification
                                                </h4>
                                                <p className="text-sm text-foreground/80 leading-relaxed font-medium">
                                                    {pillar.whyItMatters}
                                                </p>
                                            </div>

                                            <div className="space-y-3 bg-muted/70 p-4 rounded-xl border border-border">
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                                    How to Execute in ComplianceOS
                                                </h4>
                                                <ul className="space-y-1.5 text-xs text-foreground/80 leading-relaxed font-medium">
                                                    {pillar.howToExecute.map((step, idx) => (
                                                        <li key={idx} className="flex items-start gap-2">
                                                            <span className="text-primary font-bold shrink-0">•</span>
                                                            <span>{step}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* TAB: 90-Day Implementation Roadmap */}
                {activeTab === 'roadmap' && (
                    <Framework90DayRoadmap
                        spec={getIso27001Roadmap(clientId)}
                        clientId={clientId}
                        onCustomAction={(action) => {
                            if (action === 'open_dossier') setDossierOpen(true);
                        }}
                    />
                )}

                {/* TAB 3: ISMS PDCA Architecture */}
                {activeTab === 'architecture' && (
                    <div className="space-y-6">
                        <Card className="border-border shadow-xl rounded-2xl p-8 bg-card space-y-6">
                            <div className="space-y-2">
                                <h3 className="text-2xl font-bold text-foreground">The ISO 27001:2022 PDCA Architecture</h3>
                                <p className="text-foreground/80">
                                    ISO 27001 is structured around the Plan-Do-Check-Act (PDCA) management system cycle to achieve continuous information security improvement.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4">
                                <div className="p-6 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-3">
                                    <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                                        PLAN
                                    </div>
                                    <h4 className="font-bold text-foreground text-lg">Clauses 4, 5, 6, 7</h4>
                                    <p className="text-xs text-foreground/80 leading-relaxed">
                                        Define ISMS Scope, Leadership Policy, ISO 27005 Risk Assessment, and Statement of Applicability (SoA).
                                    </p>
                                </div>

                                <div className="p-6 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-3">
                                    <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                                        DO
                                    </div>
                                    <h4 className="font-bold text-foreground text-lg">Clause 8 & Annex A</h4>
                                    <p className="text-xs text-foreground/80 leading-relaxed">
                                        Deploy the 93 Annex A technical, physical, people, and organizational security controls across all assets.
                                    </p>
                                </div>

                                <div className="p-6 rounded-2xl bg-amber-50/60 border border-amber-100 space-y-3">
                                    <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                                        CHECK
                                    </div>
                                    <h4 className="font-bold text-foreground text-lg">Clause 9</h4>
                                    <p className="text-xs text-foreground/80 leading-relaxed">
                                        Execute independent <strong>Internal Audits (9.2)</strong>, monitor security metrics, and hold <strong>Management Reviews (9.3)</strong>.
                                    </p>
                                </div>

                                <div className="p-6 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-3">
                                    <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                                        ACT
                                    </div>
                                    <h4 className="font-bold text-foreground text-lg">Clause 10 & Cert</h4>
                                    <p className="text-xs text-foreground/80 leading-relaxed">
                                        Implement Corrective Actions (CAPA), remediate non-conformities, and achieve Stage 1 & Stage 2 certification.
                                    </p>
                                </div>
                            </div>

                            {/* 4 Annex A Themes Breakdown */}
                            <div className="pt-6 border-t border-border">
                                <h4 className="font-bold text-foreground text-lg mb-4">ISO/IEC 27001:2022 Annex A Control Structure (93 Controls)</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                                    <div className="p-4 rounded-xl bg-muted border border-border">
                                        <div className="font-bold text-foreground mb-1 text-sm">Theme 5: Organizational</div>
                                        <p className="text-muted-foreground font-semibold mb-2">37 Controls</p>
                                        <p className="text-foreground/80">Information security policies, asset management, cloud governance, supplier security, and incident management.</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-muted border border-border">
                                        <div className="font-bold text-foreground mb-1 text-sm">Theme 6: People</div>
                                        <p className="text-muted-foreground font-semibold mb-2">8 Controls</p>
                                        <p className="text-foreground/80">Background screening, employment terms, security awareness training, disciplinary process, and remote working.</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-muted border border-border">
                                        <div className="font-bold text-foreground mb-1 text-sm">Theme 7: Physical</div>
                                        <p className="text-muted-foreground font-semibold mb-2">14 Controls</p>
                                        <p className="text-foreground/80">Physical security perimeters, entry controls, office security, equipment protection, clear desk/screen, and secure disposal.</p>
                                    </div>
                                    <div className="p-4 rounded-xl bg-muted border border-border">
                                        <div className="font-bold text-foreground mb-1 text-sm">Theme 8: Technological</div>
                                        <p className="text-muted-foreground font-semibold mb-2">34 Controls</p>
                                        <p className="text-foreground/80">User endpoint security, privileged access, secure coding, cryptography, backup, network security, and vulnerability management.</p>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}

                {/* TAB 3: Auditor Clean Room */}
                {activeTab === 'auditor' && (
                    <div className="space-y-6">
                        <Card className="border-border shadow-xl rounded-2xl p-8 bg-card space-y-6">
                            <div className="space-y-2">
                                <h3 className="text-2xl font-bold text-foreground">Lead Auditor & Certification Body Clean Room</h3>
                                <p className="text-foreground/80">
                                    Direct access to all mandatory ISMS records and verification deliverables required for Stage 1 (Documentation Review) and Stage 2 (On-Site Certification).
                                </p>
                            </div>

                            {/* Dossier Generator Banner */}
                            <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg border border-indigo-800/40">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Shield className="w-5 h-5 text-emerald-400" />
                                        <h4 className="text-lg font-black text-white">Full ISO/IEC 27001:2022 Audit Dossier</h4>
                                    </div>
                                    <p className="text-xs text-slate-300 max-w-xl">
                                        Instantly compile Scope (Clause 4), 93 SoA Controls (Annex A), Risk Assessments (Clause 6), Documented Information Index (Clause 7), and Audit/Review status into an audit-ready package.
                                    </p>
                                </div>
                                <Button
                                    onClick={() => setDossierOpen(true)}
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-10 px-5 rounded-xl shadow-md shrink-0"
                                >
                                    <Printer className="w-4 h-4 mr-2" />
                                    Generate & Print Audit Dossier
                                </Button>
                            </div>

                            <div className="divide-y divide-border">
                                <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <h5 className="font-bold text-foreground">Statement of Applicability (SoA)</h5>
                                        <p className="text-xs text-muted-foreground">Formal document detailing the 93 Annex A controls, applicability justifications, and implementation evidence.</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={() => setLocation(`/clients/${clientId}/iso27001/soa`)}
                                        className="border-border font-bold text-xs shrink-0"
                                    >
                                        View & Export SoA
                                    </Button>
                                </div>

                                <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <h5 className="font-bold text-foreground">ISO 27005 Risk Assessment & Treatment Plan (RTP)</h5>
                                        <p className="text-xs text-muted-foreground">Risk register, likelihood/impact scoring matrix, risk owners, and treatment action items.</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={() => setLocation(`/clients/${clientId}/iso27001/risks`)}
                                        className="border-border font-bold text-xs shrink-0"
                                    >
                                        View Risk Register
                                    </Button>
                                </div>

                                <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <h5 className="font-bold text-foreground">Mandatory ISMS Policies & Procedures Binder</h5>
                                        <p className="text-xs text-muted-foreground">Access Control, Cryptography, Incident Response, Supplier Security, and Data Classification policies.</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={() => setLocation(`/clients/${clientId}/iso27001/documents`)}
                                        className="border-border font-bold text-xs shrink-0"
                                    >
                                        View Document Binder
                                    </Button>
                                </div>

                                <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <h5 className="font-bold text-foreground">Internal Audit Reports & CAPA Log (Clause 9.2)</h5>
                                        <p className="text-xs text-muted-foreground">Full audit trail of internal audits, non-conformity findings, root cause analyses, and verified remediations.</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={() => setLocation(`/clients/${clientId}/iso27001/audit`)}
                                        className="border-border font-bold text-xs shrink-0"
                                    >
                                        View Internal Audits
                                    </Button>
                                </div>

                                <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <h5 className="font-bold text-foreground">Management Review Minutes (Clause 9.3)</h5>
                                        <p className="text-xs text-muted-foreground">Signed executive meeting minutes approving ISMS performance, resources, and continual improvement.</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={() => setLocation(`/clients/${clientId}/iso27001/management-review`)}
                                        className="border-border font-bold text-xs shrink-0"
                                    >
                                        View Mgmt Review
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}
            </div>

            {/* Audit Dossier Modal */}
            <AuditDossierModal
                clientId={clientId}
                open={dossierOpen}
                onOpenChange={setDossierOpen}
            />
        </ISOLayout>
    );
}
