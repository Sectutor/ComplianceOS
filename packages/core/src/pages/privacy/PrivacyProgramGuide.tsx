import React, { useState } from 'react';
import { useParams, Link, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@complianceos/ui/ui/card';
import { Badge } from '@complianceos/ui/ui/badge';
import { Button } from '@complianceos/ui/ui/button';
import {
    CheckCircle2, Database, FileText, Activity, Users, AlertTriangle,
    ArrowRight, BookOpen, ArrowLeft, Info, Calendar,
    Globe, Shield, Scale, Clock, Sparkles, Copy, Layers
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Progress } from '@complianceos/ui/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function PrivacyProgramGuide() {
    const params = useParams();
    const clientId = parseInt(params.id || params.clientId || "0");
    const [location, setLocation] = useLocation();
    const [activeTab, setActiveTab] = useState<'tutorials' | 'architecture' | 'auditor'>('tutorials');
    const [selectedFramework, setSelectedFramework] = useState<'gdpr' | 'ccpa' | 'iso27701'>('gdpr');
    const [selectedPillarId, setSelectedPillarId] = useState<string | null>(null);

    // Fetch live system telemetry
    const { data: inventory } = trpc.privacy.getInventory.useQuery({ clientId }, { enabled: !!clientId });
    const { data: processes } = trpc.businessContinuity.processes.list.useQuery({ clientId }, { enabled: !!clientId });
    const { data: assessments } = trpc.privacy.listAssessments.useQuery({ clientId }, { enabled: !!clientId });
    const { data: dsars } = trpc.privacy.getDsarRequests.useQuery({ clientId }, { enabled: !!clientId });

    const safeInventory = Array.isArray(inventory) ? inventory : [];
    const safeProcesses = Array.isArray(processes) ? processes : [];
    const safeAssessments = Array.isArray(assessments) ? assessments : [];
    const safeDsars = Array.isArray(dsars) ? dsars : [];

    const inventoryCount = safeInventory.length;
    const ropaCount = safeProcesses.length;
    const dpiaCount = safeAssessments.filter((a: any) => a.type?.startsWith('DPIA:')).length;
    const tiaCount = safeAssessments.filter((a: any) => a.type?.startsWith('TIA:')).length;
    const dsarCount = safeDsars.length;
    const breachCount = safeAssessments.filter((a: any) => a.type?.startsWith('BREACH:')).length;

    const completedPillars = [
        inventoryCount > 0,
        ropaCount > 0,
        dpiaCount > 0,
        tiaCount > 0,
        dsarCount > 0,
    ].filter(Boolean).length;

    const progressPercentage = Math.round((completedPillars / 5) * 100);

    const pillars = [
        {
            id: 'inventory',
            number: 1,
            title: 'Data Inventory & Technical PII Mapping',
            legalRef: 'GDPR Art. 30 / ISO 27701',
            status: inventoryCount > 0 ? 'active' : 'pending',
            countLabel: `${inventoryCount} Assets Mapped`,
            isCompleted: inventoryCount > 0,
            icon: Database,
            color: 'text-sky-600',
            bgLight: 'bg-sky-50',
            borderColor: 'border-sky-200',
            gradient: 'from-sky-500 to-blue-600',
            summary: 'Identify, classify, and catalogue every server, database, S3 bucket, and SaaS vendor holding personal data.',
            whyItMatters: 'You cannot protect or delete data you do not know you have. Data discovery prevents rogue databases and data leaks.',
            howToExecute: [
                '1. Navigate to Data Inventory and review auto-discovered systems or click "+ Add Data Asset".',
                '2. Assign Data Sensitivity (Low, Medium, High / Special Category) and Data Owner.',
                '3. Specify technical storage format (e.g. Structured SQL, JSON Data Lake, S3 Bucket) and hosting location.',
                '4. Link assets to retention policies to prevent unlawful data hoarding.'
            ],
            link: `/clients/${clientId}/privacy/inventory`,
            cta: 'Open Data Inventory'
        },
        {
            id: 'ropa',
            number: 2,
            title: 'ROPA & Business Process Registry',
            legalRef: 'GDPR Article 30 / CNIL Standard',
            status: ropaCount > 0 ? 'active' : 'pending',
            countLabel: `${ropaCount} Activities Logged`,
            isCompleted: ropaCount > 0,
            icon: FileText,
            color: 'text-indigo-600',
            bgLight: 'bg-indigo-50',
            borderColor: 'border-indigo-200',
            gradient: 'from-indigo-500 to-purple-600',
            summary: 'Document every business activity that processes personal data, including the legal basis, purpose, and retention.',
            whyItMatters: 'Mandated by European DPAs. In an audit, you must present an up-to-date Article 30 record within 48–72 hours or face fines up to €10M.',
            howToExecute: [
                '1. Go to ROPA (Art. 30) and click "+ Add Business Process" (e.g. Payroll Processing, Customer CRM, AI Telemetry).',
                '2. Set the Department, Business Criticality (Tier 1 to 4), and recovery objectives (RTO/RPO).',
                '3. Click "Configure Flows" to connect which Data Inventory assets and personal data fields are utilized.',
                '4. Use the "Export Article 30 Register (CSV)" button for formal auditor presentations.'
            ],
            link: `/clients/${clientId}/privacy/ropa`,
            cta: 'Manage ROPA Registry'
        },
        {
            id: 'dpia',
            number: 3,
            title: 'High-Risk DPIA & AI Impact Assessments',
            legalRef: 'GDPR Article 35 / EU AI Act',
            status: dpiaCount > 0 ? 'active' : 'pending',
            countLabel: `${dpiaCount} DPIAs Conducted`,
            isCompleted: dpiaCount > 0,
            icon: Scale,
            color: 'text-emerald-600',
            bgLight: 'bg-emerald-50',
            borderColor: 'border-emerald-200',
            gradient: 'from-emerald-500 to-teal-600',
            summary: 'Systematically assess and mitigate privacy risks before deploying AI models, biometrics, or large-scale data processing.',
            whyItMatters: 'Conducting high-risk processing without a signed DPIA is a major GDPR violation and halts product launches.',
            howToExecute: [
                '1. Open DPIA Manager and choose a curated enterprise template (e.g. AI Governance, Cloud SaaS, Sensitive Data).',
                '2. Complete the screening questions to compute an automated Privacy Risk Score.',
                '3. Review identified Risk Catalysts and verify that technical mitigations (encryption, access controls) are in place.',
                '4. Have the Data Protection Officer (DPO) click "DPO Sign-Off & Approve" and copy/print the final Audit Dossier.'
            ],
            link: `/clients/${clientId}/privacy/dpia`,
            cta: 'Open DPIA Manager'
        },
        {
            id: 'transfers',
            number: 4,
            title: 'Cross-Border Transfers & Schrems II TIAs',
            legalRef: 'GDPR Chapter V / EDPB 01/2020',
            status: tiaCount > 0 ? 'active' : 'pending',
            countLabel: `${tiaCount} TIAs Evaluated`,
            isCompleted: tiaCount > 0,
            icon: Globe,
            color: 'text-blue-700',
            bgLight: 'bg-blue-50',
            borderColor: 'border-blue-200',
            gradient: 'from-blue-600 to-indigo-700',
            summary: 'Evaluate non-EEA data transfers (e.g. US AWS/Salesforce hosting or offshore developers in India/APAC).',
            whyItMatters: 'Protects against multi-million euro fines for unlawful data export under the Schrems II ruling.',
            howToExecute: [
                '1. Open Data Transfers (TIA) and use 1-Click Quick Presets (US Cloud Hosting, Enterprise CRM, Offshore DevOps).',
                '2. Evaluate the destination country surveillance laws (e.g. FISA 702 / EO 14086 for the US) and verify transfer mechanisms (DPF or SCCs).',
                '3. Verify Supplementary Technical Safeguards (Customer-Managed Encryption Keys held in EU, Warrant Canary).',
                '4. Finalize DPO determination and save the verified Transfer Binder.'
            ],
            link: `/clients/${clientId}/privacy/transfers`,
            cta: 'Conduct Transfer Assessment'
        },
        {
            id: 'dsar',
            number: 5,
            title: 'Consumer Rights & 30-Day DSAR Portal',
            legalRef: 'GDPR Art. 12–23 / CCPA / CPRA',
            status: dsarCount > 0 ? 'active' : 'pending',
            countLabel: `${dsarCount} Requests Logged`,
            isCompleted: dsarCount > 0,
            icon: Users,
            color: 'text-amber-600',
            bgLight: 'bg-amber-50',
            borderColor: 'border-amber-200',
            gradient: 'from-amber-500 to-orange-600',
            summary: 'Manage consumer and employee requests for Right to Access, Erasure (Right to be Forgotten), and Portability within 30 days.',
            whyItMatters: 'Failure to respond to subject requests within the 30-day statutory deadline triggers direct consumer complaints to privacy regulators.',
            howToExecute: [
                '1. Log or receive requests in the DSAR Portal with subject details and request type.',
                '2. Monitor the active 30-Day Legal Countdown Clock.',
                '3. Open the DSAR Case Dossier and use the Cross-Asset Discovery & Purge Checklist to verify deletion across all databases.',
                '4. Generate and copy the formal 1-Click DSAR Resolution Confirmation Notice for the customer.'
            ],
            link: `/clients/${clientId}/privacy/dsar`,
            cta: 'Open DSAR Portal'
        },
        {
            id: 'breaches',
            number: 6,
            title: '72-Hour Breach Triage & Incident Center',
            legalRef: 'GDPR Art. 33/34 / NIS2 Directive',
            status: 'active',
            countLabel: `${breachCount} Incidents Tracked`,
            isCompleted: true,
            icon: AlertTriangle,
            color: 'text-rose-600',
            bgLight: 'bg-rose-50',
            borderColor: 'border-rose-200',
            gradient: 'from-rose-500 to-red-600',
            summary: 'Triage suspected personal data breaches, track the mandatory 72-hour regulatory countdown, and generate formal DPA notification filings.',
            whyItMatters: 'Late notification to Data Protection Authorities results in severe regulatory enforcement and reputational damage.',
            howToExecute: [
                '1. When an incident is suspected, click "Report Security Incident" in the Data Breach Register.',
                '2. The system initiates the 72-Hour Regulatory Countdown Clock based on detection time.',
                '3. Execute containment tasks (revoke API keys, isolate affected endpoints, reset credentials).',
                '4. Use the auto-generated GDPR Article 33 DPA Notification Letter to submit timely regulatory filings.'
            ],
            link: `/clients/${clientId}/privacy/breaches`,
            cta: 'View Breach Register'
        }
    ];

    const copyMasterManual = () => {
        const manualText = `COMPLIANCEOS ENTERPRISE PRIVACY OPERATING MANUAL\n` +
            `===================================================\n` +
            `Client / Organization: #${clientId}\n` +
            `Framework Alignment: GDPR (EU 2016/679), CCPA/CPRA, ISO/IEC 27701\n` +
            `Generated: ${new Date().toLocaleDateString()}\n\n` +
            `1. DATA INVENTORY (${inventoryCount} Assets Mapped)\n` +
            `   - Maintains technical map of SQL databases, cloud buckets, and external SaaS stores.\n\n` +
            `2. ARTICLE 30 ROPA (${ropaCount} Business Activities)\n` +
            `   - Records legal basis, processing purpose, retention, and departmental owners.\n\n` +
            `3. IMPACT ASSESSMENTS (${dpiaCount} DPIAs Conducted)\n` +
            `   - High-risk evaluation for AI systems, automated profiling, and biometric data.\n\n` +
            `4. CROSS-BORDER DATA TRANSFERS (${tiaCount} TIAs Evaluated)\n` +
            `   - Schrems II EDPB compliance for US Cloud hosting and offshore technical operations.\n\n` +
            `5. DATA SUBJECT RIGHTS (${dsarCount} Requests Handled)\n` +
            `   - 30-day statutory SLA fulfillment and cross-database erasure verification.\n\n` +
            `6. 72-HOUR INCIDENT TRIAGE\n` +
            `   - GDPR Article 33/34 containment protocol and DPA notification engine.`;

        navigator.clipboard.writeText(manualText);
        toast.success("Complete Privacy Operations Manual copied to clipboard!");
    };

    const scrollToPillar = (id: string) => {
        setSelectedPillarId(id);
        const el = document.getElementById(`pillar-${id}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20 p-2 md:p-6">
            {/* Hero Header */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-8 lg:p-12 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="relative z-10 space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-sky-400">
                                <BookOpen className="w-8 h-8 text-sky-400" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-3xl lg:text-4xl font-black tracking-tight">Privacy Program Guide & Operations Manual</h1>
                                    <Badge className="bg-sky-500/20 text-sky-300 border-sky-400/30 text-xs font-bold">
                                        GDPR • CCPA • ISO 27701
                                    </Badge>
                                </div>
                                <p className="text-slate-300 text-base mt-1">
                                    Complete operational playbook, step-by-step tutorials, and cross-module workflow engine.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button
                                onClick={copyMasterManual}
                                variant="outline"
                                className="bg-white/10 border-white/20 text-white hover:bg-white/20 font-bold rounded-xl h-11"
                            >
                                <Copy className="w-4 h-4 mr-2" />
                                Copy Operations Manual
                            </Button>
                        </div>
                    </div>

                    {/* Progress Bar & Telemetry */}
                    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-slate-200 flex items-center gap-2">
                                <Shield className="w-4 h-4 text-emerald-400" />
                                Privacy Program Maturity & Implementation
                            </span>
                            <span className="text-sm font-black text-sky-400 bg-sky-950/60 px-3 py-1 rounded-full border border-sky-800/50">
                                {progressPercentage}% Complete
                            </span>
                        </div>
                        <Progress value={progressPercentage} className="h-2.5 bg-white/10 rounded-full" />
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2 text-xs">
                            <div className="text-slate-300">
                                <span className="font-bold text-white">{inventoryCount}</span> PII Assets
                            </div>
                            <div className="text-slate-300">
                                <span className="font-bold text-white">{ropaCount}</span> ROPA Processes
                            </div>
                            <div className="text-slate-300">
                                <span className="font-bold text-white">{dpiaCount}</span> DPIAs Conducted
                            </div>
                            <div className="text-slate-300">
                                <span className="font-bold text-white">{tiaCount}</span> Schrems II TIAs
                            </div>
                            <div className="text-slate-300">
                                <span className="font-bold text-white">{dsarCount}</span> DSARs Processed
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 border-b border-slate-200 pb-2">
                <Button
                    variant={activeTab === 'tutorials' ? 'default' : 'ghost'}
                    onClick={() => setActiveTab('tutorials')}
                    className={cn("font-bold rounded-xl", activeTab === 'tutorials' ? "bg-slate-900 text-white" : "text-slate-600")}
                >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Step-by-Step Operating Manual
                </Button>
                <Button
                    variant={activeTab === 'architecture' ? 'default' : 'ghost'}
                    onClick={() => setActiveTab('architecture')}
                    className={cn("font-bold rounded-xl", activeTab === 'architecture' ? "bg-slate-900 text-white" : "text-slate-600")}
                >
                    <Globe className="w-4 h-4 mr-2" />
                    Architecture & Data Flow
                </Button>
                <Button
                    variant={activeTab === 'auditor' ? 'default' : 'ghost'}
                    onClick={() => setActiveTab('auditor')}
                    className={cn("font-bold rounded-xl", activeTab === 'auditor' ? "bg-slate-900 text-white" : "text-slate-600")}
                >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Auditor & Board Clean Room
                </Button>
            </div>

            {/* TAB 1: Step-by-Step Operating Manual with LEFT PANEL */}
            {activeTab === 'tutorials' && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                    
                    {/* LEFT PANEL / SIDEBAR */}
                    <div className="xl:col-span-4 2xl:col-span-3.5 space-y-6 xl:sticky xl:top-24">
                        
                        {/* 1. Framework Focus Selector */}
                        <Card className="border-slate-200 shadow-md rounded-2xl overflow-hidden bg-white">
                            <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
                                <CardTitle className="text-sm font-bold text-slate-800 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                        <Globe className="w-4 h-4 text-sky-600" />
                                        Framework Lens
                                    </span>
                                    <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-500">
                                        Standard
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-2">
                                <button
                                    onClick={() => setSelectedFramework('gdpr')}
                                    className={cn(
                                        "w-full text-left p-3 rounded-xl transition-all flex items-center justify-between border",
                                        selectedFramework === 'gdpr'
                                            ? "bg-sky-50 border-sky-300 text-sky-950 font-bold shadow-sm"
                                            : "border-slate-100 hover:bg-slate-50 text-slate-700 font-medium"
                                    )}
                                >
                                    <div>
                                        <div className="text-sm font-bold">GDPR (EU 2016/679)</div>
                                        <div className="text-xs text-slate-500">Global Privacy Benchmark</div>
                                    </div>
                                    {selectedFramework === 'gdpr' && <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />}
                                </button>

                                <button
                                    onClick={() => setSelectedFramework('ccpa')}
                                    className={cn(
                                        "w-full text-left p-3 rounded-xl transition-all flex items-center justify-between border",
                                        selectedFramework === 'ccpa'
                                            ? "bg-sky-50 border-sky-300 text-sky-950 font-bold shadow-sm"
                                            : "border-slate-100 hover:bg-slate-50 text-slate-700 font-medium"
                                    )}
                                >
                                    <div>
                                        <div className="text-sm font-bold">CCPA / CPRA (California)</div>
                                        <div className="text-xs text-slate-500">Consumer Rights & "Do Not Sell"</div>
                                    </div>
                                    {selectedFramework === 'ccpa' && <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />}
                                </button>

                                <button
                                    onClick={() => setSelectedFramework('iso27701')}
                                    className={cn(
                                        "w-full text-left p-3 rounded-xl transition-all flex items-center justify-between border",
                                        selectedFramework === 'iso27701'
                                            ? "bg-sky-50 border-sky-300 text-sky-950 font-bold shadow-sm"
                                            : "border-slate-100 hover:bg-slate-50 text-slate-700 font-medium"
                                    )}
                                >
                                    <div>
                                        <div className="text-sm font-bold">ISO/IEC 27701 (PIMS)</div>
                                        <div className="text-xs text-slate-500">Privacy Management Extension</div>
                                    </div>
                                    {selectedFramework === 'iso27701' && <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />}
                                </button>
                            </CardContent>
                        </Card>

                        {/* 2. Pillars Quick Navigator */}
                        <Card className="border-slate-200 shadow-md rounded-2xl overflow-hidden bg-white">
                            <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
                                <CardTitle className="text-sm font-bold text-slate-800 flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                        <Layers className="w-4 h-4 text-indigo-600" />
                                        Program Pillars
                                    </span>
                                    <span className="text-xs text-slate-500 font-medium">{completedPillars} of 5 Ready</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-3 space-y-1.5">
                                {pillars.map((p) => {
                                    const IconComponent = p.icon;
                                    const isCurrent = selectedPillarId === p.id;
                                    return (
                                        <button
                                            key={p.id}
                                            onClick={() => scrollToPillar(p.id)}
                                            className={cn(
                                                "w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between text-xs group",
                                                isCurrent
                                                    ? "bg-slate-900 text-white font-bold shadow-md"
                                                    : "text-slate-700 hover:bg-slate-100 font-medium"
                                            )}
                                        >
                                            <div className="flex items-center gap-2.5 overflow-hidden">
                                                <div className={cn(
                                                    "w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[11px] shrink-0",
                                                    isCurrent ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                                                )}>
                                                    {p.number}
                                                </div>
                                                <span className="truncate">{p.title}</span>
                                            </div>
                                            {p.isCompleted ? (
                                                <CheckCircle2 className={cn("w-4 h-4 shrink-0", isCurrent ? "text-emerald-300" : "text-emerald-600")} />
                                            ) : (
                                                <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0", isCurrent ? "bg-white/10 text-white" : "bg-slate-100 text-slate-500")}>
                                                    Pending
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </CardContent>
                        </Card>

                        {/* 3. Regulatory Enforcement & Deadlines */}
                        <Card className="border-slate-200 shadow-md rounded-2xl overflow-hidden bg-white">
                            <CardHeader className="bg-rose-50/70 border-b border-rose-100 p-4">
                                <CardTitle className="text-sm font-bold text-rose-950 flex items-center gap-1.5">
                                    <Clock className="w-4 h-4 text-rose-600" />
                                    Statutory Deadlines
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3 text-xs">
                                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                                    <div className="flex items-center justify-between font-bold text-slate-900">
                                        <span>72 Hours</span>
                                        <Badge variant="outline" className="text-[9px] bg-rose-100 text-rose-800 border-none font-bold">Art. 33</Badge>
                                    </div>
                                    <p className="text-slate-600 text-[11px]">Mandatory DPA breach notification upon incident detection.</p>
                                </div>

                                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                                    <div className="flex items-center justify-between font-bold text-slate-900">
                                        <span>30 Days</span>
                                        <Badge variant="outline" className="text-[9px] bg-amber-100 text-amber-800 border-none font-bold">Art. 12(3)</Badge>
                                    </div>
                                    <p className="text-slate-600 text-[11px]">Data subject access/erasure (DSAR) fulfillment window.</p>
                                </div>

                                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                                    <div className="flex items-center justify-between font-bold text-slate-900">
                                        <span>48–72 Hours</span>
                                        <Badge variant="outline" className="text-[9px] bg-blue-100 text-blue-800 border-none font-bold">Art. 30</Badge>
                                    </div>
                                    <p className="text-slate-600 text-[11px]">ROPA register presentation to supervisory authorities.</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 4. Quick Action Downloads */}
                        <Card className="border-slate-200 shadow-md rounded-2xl overflow-hidden bg-white">
                            <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
                                <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                                    <Sparkles className="w-4 h-4 text-amber-500" />
                                    Quick Clean-Room Tools
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setLocation(`/clients/${clientId}/privacy/ropa`)}
                                    className="w-full justify-start text-xs font-bold text-slate-700"
                                >
                                    <FileText className="w-3.5 h-3.5 mr-2 text-indigo-600" />
                                    Export Article 30 ROPA (CSV)
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setLocation(`/clients/${clientId}/privacy/inventory`)}
                                    className="w-full justify-start text-xs font-bold text-slate-700"
                                >
                                    <Database className="w-3.5 h-3.5 mr-2 text-sky-600" />
                                    Open Data Inventory Map
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setLocation(`/clients/${clientId}/privacy/dpia`)}
                                    className="w-full justify-start text-xs font-bold text-slate-700"
                                >
                                    <Scale className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                                    Launch High-Risk DPIA
                                </Button>
                            </CardContent>
                        </Card>

                    </div>

                    {/* RIGHT COLUMN: DETAILED PILLARS & TUTORIALS */}
                    <div className="xl:col-span-8 2xl:col-span-8.5 space-y-6">
                        {pillars.map((pillar) => {
                            const IconComponent = pillar.icon;
                            return (
                                <Card
                                    key={pillar.id}
                                    id={`pillar-${pillar.id}`}
                                    className="border-slate-200 shadow-xl shadow-slate-200/40 rounded-2xl overflow-hidden hover:shadow-2xl transition-all group bg-white scroll-mt-24"
                                >
                                    <CardHeader className={`${pillar.bgLight} border-b border-slate-100 p-5 sm:p-6`}>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
                                                <div className={cn("h-11 w-11 sm:h-12 sm:w-12 rounded-2xl flex items-center justify-center font-black text-base sm:text-lg text-white shadow-md bg-gradient-to-br shrink-0", pillar.gradient)}>
                                                    {pillar.number}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <CardTitle className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                                                            {pillar.title}
                                                        </CardTitle>
                                                        <Badge className="bg-white border-slate-200 text-slate-700 text-[10px] font-bold shrink-0">
                                                            {pillar.legalRef}
                                                        </Badge>
                                                    </div>
                                                    <CardDescription className="text-slate-600 text-xs sm:text-sm font-medium mt-0.5">
                                                        {pillar.summary}
                                                    </CardDescription>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between sm:justify-end gap-2.5 sm:gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                                                <Badge className={cn("font-bold text-[11px] sm:text-xs px-2.5 py-1 border-none shrink-0 whitespace-nowrap", pillar.status === 'active' ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600")}>
                                                    {pillar.countLabel}
                                                </Badge>
                                                <Button
                                                    onClick={() => setLocation(pillar.link)}
                                                    className="bg-slate-900 hover:bg-brand-bright text-white font-bold rounded-xl h-9 sm:h-10 px-3.5 sm:px-4 text-xs sm:text-sm whitespace-nowrap shrink-0 transition-all shadow-sm flex items-center"
                                                >
                                                    <span>{pillar.cta}</span>
                                                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1.5 shrink-0" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-6 grid md:grid-cols-2 gap-6">
                                        <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                                <Info className="w-3.5 h-3.5 text-brand-bright" />
                                                Why This Step Is Critical
                                            </h4>
                                            <p className="text-sm text-slate-700 leading-relaxed font-medium">
                                                {pillar.whyItMatters}
                                            </p>
                                        </div>

                                        <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                                How to Execute in ComplianceOS
                                            </h4>
                                            <ul className="space-y-1.5 text-xs text-slate-600 leading-relaxed font-medium">
                                                {pillar.howToExecute.map((step, idx) => (
                                                    <li key={idx} className="flex items-start gap-2">
                                                        <span className="text-brand-bright font-bold shrink-0">•</span>
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

            {/* TAB 2: Architecture & Data Flow */}
            {activeTab === 'architecture' && (
                <div className="space-y-6">
                    <Card className="border-slate-200 shadow-xl rounded-2xl p-8 bg-white space-y-6">
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-slate-900">The Connected Privacy Ecosystem</h3>
                            <p className="text-slate-600">
                                ComplianceOS integrates technical asset discovery, legal activity records, cross-border risk assessments, and subject rights into a single automated pipeline.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                            <div className="p-6 rounded-2xl bg-sky-50/50 border border-sky-100 space-y-3">
                                <div className="h-10 w-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                                    1
                                </div>
                                <h4 className="font-bold text-slate-900 text-lg">Discovery & Mapping</h4>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    Technical data stores in <strong>Data Inventory</strong> feed into business activities in <strong>ROPA</strong>.
                                </p>
                            </div>

                            <div className="p-6 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-3">
                                <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                                    2
                                </div>
                                <h4 className="font-bold text-slate-900 text-lg">Risk & Transfer Evaluation</h4>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    High-risk processes trigger <strong>DPIAs</strong>; non-EEA subprocessors trigger <strong>Schrems II TIAs</strong>.
                                </p>
                            </div>

                            <div className="p-6 rounded-2xl bg-emerald-50/50 border border-emerald-100 space-y-3">
                                <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                                    3
                                </div>
                                <h4 className="font-bold text-slate-900 text-lg">Rights & Emergency Response</h4>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    <strong>DSARs</strong> purge data across discovered assets; <strong>Breach Register</strong> executes 72h notifications.
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* TAB 3: Auditor Clean Room */}
            {activeTab === 'auditor' && (
                <div className="space-y-6">
                    <Card className="border-slate-200 shadow-xl rounded-2xl p-8 bg-white space-y-6">
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-slate-900">Auditor & Board Executive Summary</h3>
                            <p className="text-slate-600">
                                Deliverables and verification records available for ISO 27701 certifiers, DPA supervisory authorities, and enterprise security questionnaires.
                            </p>
                        </div>

                        <div className="divide-y divide-slate-100">
                            <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <h5 className="font-bold text-slate-900">Article 30 ROPA Compliance Register</h5>
                                    <p className="text-xs text-slate-500">Official tabular record of all processing activities, legal bases, and retention.</p>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={() => setLocation(`/clients/${clientId}/privacy/ropa`)}
                                    className="border-slate-300 font-bold text-xs"
                                >
                                    Export CSV / View
                                </Button>
                            </div>

                            <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <h5 className="font-bold text-slate-900">Schrems II Transfer Impact Assessment Dossier</h5>
                                    <p className="text-xs text-slate-500">Legal evaluation of US/offshore cloud data hosting with supplementary safeguards.</p>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={() => setLocation(`/clients/${clientId}/privacy/transfers`)}
                                    className="border-slate-300 font-bold text-xs"
                                >
                                    View TIA Workspace
                                </Button>
                            </div>

                            <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <h5 className="font-bold text-slate-900">DPIA Risk Certifications & DPO Sign-Offs</h5>
                                    <p className="text-xs text-slate-500">Formal Article 35 high-risk impact analyses for AI governance and customer data.</p>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={() => setLocation(`/clients/${clientId}/privacy/dpia`)}
                                    className="border-slate-300 font-bold text-xs"
                                >
                                    View DPIA Reports
                                </Button>
                            </div>

                            <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <h5 className="font-bold text-slate-900">Data Subject Rights (DSAR) Audit Logs</h5>
                                    <p className="text-xs text-slate-500">Time-stamped audit certificates proving erasure across all organizational databases.</p>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={() => setLocation(`/clients/${clientId}/privacy/dsar`)}
                                    className="border-slate-300 font-bold text-xs"
                                >
                                    View DSAR Portal
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}

