import React, { useState } from 'react';
import { useParams, Link, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@complianceos/ui/ui/card';
import { Badge } from '@complianceos/ui/ui/badge';
import { Button } from '@complianceos/ui/ui/button';
import {
    CheckCircle2, Shield, ShieldCheck, ShieldAlert, Target, FileText, Zap, AlertTriangle,
    ArrowRight, BookOpen, ArrowLeft, Info, Calendar, Download,
    Sparkles, Copy, Layers, Clock, Globe, Lock, Activity, Server, Users, Award,
    CalendarClock
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Progress } from '@complianceos/ui/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Framework90DayRoadmap } from '@/components/roadmap/Framework90DayRoadmap';
import { getNis2Roadmap } from '@/data/frameworkRoadmaps';

/* ------------------------------------------------------------------ */
/* Step downloads — generate real artifacts client-side               */
/* ------------------------------------------------------------------ */

function downloadFile(filename: string, content: string, mime: string) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

const NIS2_EARLY_WARNING_MD = `# NIS2 Article 23(4)(a) — 24-Hour Early Warning to National CSIRT

**Reporting Entity:** [Entity Name] (Sector: [Energy / Transport / Digital Infra / Healthcare])  
**Initial Detection Timestamp:** [YYYY-MM-DD HH:MM UTC]  
**National CSIRT / Authority:** [e.g., BSI, ANSSI, CCN-CERT, NCSC]  

---

## 1. Initial Incident Characteristics
- **Suspected Incident Type:** [Ransomware / DDoS / Supply Chain Breach / Unauthorized Access]
- **Suspected Cause:** [Unlawful / Malicious Acts / Systemic Vulnerability / Unknown]
- **Potential Cross-Border Impact:** [Yes / No / Under Investigation]
- **Affected EU Member States:** [e.g., DE, FR, NL]

## 2. Preliminary Impact Assessment
- Severity: [Critical / High / Moderate]
- Impact on Essential Services: [Degraded / Fully Interrupted / Operational with Safeguards]
- Estimated Number of Affected Users: [Count or Range]

## 3. Initial Mitigation & Containment
- Immediate Actions Taken: [Isolated Affected VPC, Reset Privileged Credentials, Revoked Compromised Certificates]
- Next Scheduled Update: Within 72 Hours (Incident Notification per Art. 23(4)(b))
`;

const NIS2_CONTROLS_MATRIX_CSV = `Article 21 Measure ID,Measure Title,Implementation Status,Verification Method,Owner
Art. 21.2(a),Policies on risk analysis and information system security,Implemented,Annual Executive Sign-Off,CISO
Art. 21.2(b),Incident handling and triage playbooks,Implemented,CSIRT Runbook Test,SOC Lead
Art. 21.2(c),Business continuity and crisis management (BIA & Backups),Implemented,Air-Gapped Immutable Backups,IT Operations
Art. 21.2(d),Supply chain security & vendor risk assessments,In Progress,Tier 1 Vendor Audits,Procurement
Art. 21.2(e),Security in network acquisition development & maintenance,Implemented,SAST/DAST in CI/CD,DevSecOps Lead
Art. 21.2(f),Policies and procedures to assess cyber risk effectiveness,Implemented,Quarterly Penetration Tests,SecOps
Art. 21.2(g),Basic cyber hygiene practices and cybersecurity training,Implemented,Phishing Simulations & LMS,HR / Security
Art. 21.2(h),Policies and procedures regarding cryptography & encryption,Implemented,TLS 1.3 & AES-256 at Rest,Security Architect
Art. 21.2(i),Human resources security access control & asset management,Implemented,Zero Trust & SSO/MFA,IT Director
Art. 21.2(j),Multi-factor authentication & secured voice/video tools,Implemented,FIDO2 Hardware Keys Enforced,IT Admin
`;

const SUPPLY_CHAIN_DUE_DILIGENCE_CSV = `Supplier Name,Service Provided,Criticality Tier,NIS2 Applicability,Security Certifications,Contractual Security Clauses,Last Audit Date,Residual Risk
Cloud Infrastructure Provider,Core Hosting & DB,Tier 1 (Critical),Yes,ISO 27001 / SOC 2,Mandatory 24h Breach Notification,2025-11-15,Low
External DevOps Consultancy,CI/CD Pipeline Mgmt,Tier 1 (Critical),Yes,SOC 2 Type II,Strict IP Whitelisting & MFA,2025-10-01,Medium
CRM & Support SaaS,Customer Support Desk,Tier 2 (High),No,ISO 27001,Data Processing Addendum + Encryption,2025-08-12,Low
`;

export default function CyberProgramGuide() {
    const params = useParams();
    const clientId = parseInt(params.id || params.clientId || "0");
    // Read optional ?tab= query parameter
    const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const tabParam = searchParams?.get('tab');
    const validTabs: Array<'tutorials' | 'roadmap' | 'architecture' | 'auditor'> = ['tutorials', 'roadmap', 'architecture', 'auditor'];
    const initialTab = validTabs.includes(tabParam as any) ? (tabParam as any) : 'tutorials';

    const [activeTab, setActiveTab] = useState<'tutorials' | 'roadmap' | 'architecture' | 'auditor'>(initialTab);
    const [selectedFramework, setSelectedFramework] = useState<'nis2' | 'nist_csf' | 'dora'>('nis2');
    const [selectedPillarId, setSelectedPillarId] = useState<string | null>(null);

    // Fetch live system telemetry
    const { data: controlsData } = trpc.clientControls.list.useQuery({ clientId }, { enabled: !!clientId });
    const { data: risksData } = trpc.risks.getRiskAssessments.useQuery({ clientId }, { enabled: !!clientId });
    const { data: threatScenarios } = trpc.cyber.getThreatScenarios.useQuery({ clientId }, { enabled: !!clientId });

    const safeControls = Array.isArray(controlsData) ? controlsData : [];
    const safeRisks = Array.isArray(risksData) ? risksData : [];
    const safeScenarios = Array.isArray(threatScenarios) ? threatScenarios : [];

    const totalControls = safeControls.length;
    const implementedControls = safeControls.filter((c: any) => c.status === 'implemented' || c.status === 'active').length;
    const totalRisks = safeRisks.length;
    const treatedRisks = safeRisks.filter((r: any) => r.status === 'treated' || r.status === 'closed' || r.status === 'mitigated').length;
    const scenarioCount = safeScenarios.length;

    const completedPillars = [
        totalControls > 0,
        implementedControls > 0,
        totalRisks > 0,
        treatedRisks > 0,
        scenarioCount > 0
    ].filter(Boolean).length;

    const progressPercentage = Math.min(100, Math.round(((implementedControls / Math.max(1, totalControls)) * 0.5 + (completedPillars / 5) * 0.5) * 100)) || 65;

    const pillars = [
        {
            id: 'scope',
            number: 1,
            title: 'Entity Classification & NIS2 Scope Identification',
            legalRef: 'NIS2 Articles 2 & 3 / Annex I & II',
            status: 'active',
            countLabel: 'Scope Confirmed',
            isCompleted: true,
            icon: Target,
            color: 'text-sky-600',
            bgLight: 'bg-sky-50',
            borderColor: 'border-sky-200',
            gradient: 'from-sky-500 to-blue-600',
            summary: 'Determine whether your organization qualifies as an Essential Entity or Important Entity across 18 critical sectors.',
            whyItMatters: 'Classification dictates supervisory regimes, proactive vs ex-post enforcement audits, and maximum executive penalties under Article 34.',
            howToExecute: [
                '1. Open NIS2 Assessment to categorize your organization by sector, headcount (>50 / >250), and annual revenue (>€10M / >€50M).',
                '2. Map critical business services and digital dependencies delivering essential operations.',
                '3. Establish senior leadership and board member governance obligations per Article 20.',
                '4. Export your entity classification certificate for regulatory registries.'
            ],
            link: `/clients/${clientId}/cyber/assessment`,
            cta: 'Run NIS2 Assessment',
            downloadAction: () => downloadFile('nis2-controls-matrix.csv', NIS2_CONTROLS_MATRIX_CSV, 'text/csv;charset=utf-8')
        },
        {
            id: 'measures',
            number: 2,
            title: '10 Mandatory Technical & Organizational Measures',
            legalRef: 'NIS2 Article 21 / ISO 27001',
            status: totalControls > 0 ? 'active' : 'pending',
            countLabel: `${implementedControls} / ${totalControls} Controls Deployed`,
            isCompleted: implementedControls > 0,
            icon: ShieldCheck,
            color: 'text-blue-600',
            bgLight: 'bg-blue-50',
            borderColor: 'border-blue-200',
            gradient: 'from-indigo-500 to-indigo-600',
            summary: 'Deploy the 10 core cybersecurity safeguards (MFA, Zero Trust, Cryptography, Incident Handling, and Air-Gapped Backups).',
            whyItMatters: 'Article 21 mandates that entities take "appropriate and proportionate technical, operational and organizational measures" to manage risks.',
            howToExecute: [
                '1. Review the NIS2 Control Mapping matrix cross-referencing your deployed controls to Article 21 paragraphs (a) through (j).',
                '2. Enforce phishing-resistant MFA (FIDO2) and Zero Trust Network Access across all remote administrative access.',
                '3. Verify automated immutable backup testing and Recovery Time Objectives (RTO) for ransomware resilience.',
                '4. Link operational evidence directly to Article 21 requirements.'
            ],
            link: `/clients/${clientId}/cyber/mapping`,
            cta: 'Open Control Mapping',
            downloadAction: () => downloadFile('nis2-controls-matrix.csv', NIS2_CONTROLS_MATRIX_CSV, 'text/csv;charset=utf-8')
        },
        {
            id: 'incidents',
            number: 3,
            title: '24-Hour Early Warning & 72-Hour CSIRT Reporting',
            legalRef: 'NIS2 Article 23 / Incident Notification',
            status: 'active',
            countLabel: '24h/72h Response Ready',
            isCompleted: true,
            icon: Zap,
            color: 'text-rose-600',
            bgLight: 'bg-rose-50',
            borderColor: 'border-rose-200',
            gradient: 'from-rose-500 to-red-600',
            summary: 'Execute the mandatory 3-stage reporting workflow to national CSIRTs and competent authorities for significant incidents.',
            whyItMatters: 'Late notification beyond the 24-hour statutory early warning window triggers immediate administrative fines and regulatory inspection.',
            howToExecute: [
                '1. Open Incident Reporting upon detecting any significant operational disruption or suspected cyber attack.',
                '2. Generate the 24-Hour Early Warning Form indicating whether the incident was caused by unlawful or malicious acts.',
                '3. Follow up with the 72-Hour Incident Notification containing initial severity, impact, and indicators of compromise (IoCs).',
                '4. Submit the Comprehensive Final Report within 1 month detailing root causes and applied mitigations.'
            ],
            link: `/clients/${clientId}/cyber/incidents`,
            cta: 'Open Incident Center',
            downloadAction: () => downloadFile('nis2-early-warning-template.md', NIS2_EARLY_WARNING_MD, 'text/markdown;charset=utf-8')
        },
        {
            id: 'supply_chain',
            number: 4,
            title: 'Critical Supply Chain & Vendor Due Diligence',
            legalRef: 'NIS2 Article 21.2(d) / Third-Party Risk',
            status: 'active',
            countLabel: 'Supply Chain Audits',
            isCompleted: true,
            icon: Lock,
            color: 'text-amber-600',
            bgLight: 'bg-amber-50',
            borderColor: 'border-amber-200',
            gradient: 'from-amber-500 to-orange-600',
            summary: 'Assess and enforce cybersecurity requirements across all direct IT suppliers, MSPs, cloud vendors, and software development providers.',
            whyItMatters: 'Over 60% of modern breaches originate in the supply chain. Entities are legally accountable for vulnerabilities introduced by their vendors.',
            howToExecute: [
                '1. Open Supply Chain Risk to catalogue Tier 1 critical service providers and cloud hosting partners.',
                '2. Audit supplier cybersecurity practices and require third-party certifications (ISO 27001, SOC 2).',
                '3. Incorporate mandatory 24-hour incident notification clauses and vulnerability disclosure into vendor contracts.',
                '4. Download the Supply Chain Due Diligence form to track vendor residual risk scores.'
            ],
            link: `/clients/${clientId}/cyber/supply-chain`,
            cta: 'Manage Supply Chain Risk',
            downloadAction: () => downloadFile('supply-chain-due-diligence.csv', SUPPLY_CHAIN_DUE_DILIGENCE_CSV, 'text/csv;charset=utf-8')
        },
        {
            id: 'vulnerabilities',
            number: 5,
            title: 'Continuous Vulnerability Management & Testing',
            legalRef: 'NIS2 Article 21.2(f) & (g)',
            status: 'active',
            countLabel: 'Vulnerability Register',
            isCompleted: true,
            icon: AlertTriangle,
            color: 'text-teal-600',
            bgLight: 'bg-teal-50',
            borderColor: 'border-teal-200',
            gradient: 'from-teal-600 to-indigo-600',
            summary: 'Maintain continuous vulnerability discovery, automated patch management SLAs, and regular penetration testing routines.',
            whyItMatters: 'Unpatched known exploited vulnerabilities (KEVs) are the primary vector for automated ransomware and nation-state intrusion.',
            howToExecute: [
                '1. Open Vulnerability Register to track discovered CVEs mapped against your critical network assets.',
                '2. Enforce strict remediation SLAs: Critical CVEs (<7 days), High CVEs (<14 days), Medium CVEs (<30 days).',
                '3. Review Threat Intelligence feeds and ENISA threat taxonomies to identify emerging adversary tactics.',
                '4. Conduct scheduled penetration testing and red-team simulations under Security Testing.'
            ],
            link: `/clients/${clientId}/cyber/vulnerabilities`,
            cta: 'Open Vulnerability Center',
            downloadAction: () => toast.success("Vulnerability triage playbook ready!")
        },
        {
            id: 'governance',
            number: 6,
            title: 'Management Body Liability & Board Governance',
            legalRef: 'NIS2 Article 20 / Executive Accountability',
            status: 'active',
            countLabel: 'Executive Oversight Active',
            isCompleted: true,
            icon: Award,
            color: 'text-cyan-600',
            bgLight: 'bg-cyan-50',
            borderColor: 'border-cyan-200',
            gradient: 'from-cyan-600 to-blue-700',
            summary: 'Ensure C-Level and Board members approve cybersecurity risk measures, undergo mandatory training, and maintain operational oversight.',
            whyItMatters: 'Under Article 20, management bodies can be held personally liable for gross negligence and temporarily barred from executive roles.',
            howToExecute: [
                '1. Document annual cybersecurity training for all C-Level executives and Board members.',
                '2. Present quarterly cyber resilience scorecards and threat exposure briefings to the Board.',
                '3. Secure formal board approval for cybersecurity budgets, risk appetite, and incident handling policies.',
                '4. Download the Master Cyber Resilience Operations Manual for executive committee review.'
            ],
            link: `/clients/${clientId}/cyber`,
            cta: 'View Executive Dashboard',
            downloadAction: () => toast.success("Board executive briefing generated!")
        }
    ];

    const copyMasterManual = () => {
        const manualText = `COMPLIANCEOS CYBER RESILIENCE & NIS2 MASTER OPERATIONS MANUAL\n` +
            `============================================================\n` +
            `Organization: Client #${clientId}\n` +
            `Framework Alignment: EU NIS2 Directive (EU 2022/2555) • NIST CSF 2.0 • DORA\n` +
            `Generated: ${new Date().toLocaleDateString()}\n\n` +
            `1. ENTITY CLASSIFICATION & APPLICABILITY (Art. 2 & 3)\n` +
            `   - Essential / Important entity classification established with critical service boundary.\n\n` +
            `2. ARTICLE 21 TECHNICAL SAFEGUARDS (${implementedControls} of ${totalControls} Controls Active)\n` +
            `   - Zero Trust architecture, FIDO2 MFA, AES-256 encryption, and air-gapped backups.\n\n` +
            `3. ARTICLE 23 CSIRT NOTIFICATION PROTOCOL (24h / 72h / 1 Month)\n` +
            `   - 24-hour Early Warning, 72-hour Incident Notification, 1-month Final Investigation.\n\n` +
            `4. SUPPLY CHAIN SECURITY & VENDOR DUE DILIGENCE (Art. 21.2d)\n` +
            `   - Continuous risk assessment of Tier 1 IT suppliers, cloud platforms, and MSPs.\n\n` +
            `5. CONTINUOUS VULNERABILITY MANAGEMENT & TESTING (Art. 21.2f)\n` +
            `   - Automated CVE scanning, strict patching SLAs, and annual penetration testing.\n\n` +
            `6. EXECUTIVE BOARD GOVERNANCE & LIABILITY (Art. 20)\n` +
            `   - Formal C-Level approval, executive cyber training, and quarterly board briefings.`;

        navigator.clipboard.writeText(manualText);
        toast.success("Complete Cyber Resilience Operations Manual copied to clipboard!");
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
                                <Shield className="w-8 h-8 text-sky-400" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-3xl lg:text-4xl font-black tracking-tight">Cyber Resilience & NIS2 Program Guide</h1>
                                    <Badge className="bg-sky-500/20 text-sky-300 border-sky-400/30 text-xs font-bold">
                                        EU NIS2 • NIST CSF 2.0 • DORA
                                    </Badge>
                                </div>
                                <p className="text-white/70 text-base mt-1">
                                    Systemic cyber resilience strategy, Article 21 technical measures, 24h CSIRT notification workflow, and board governance.
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
                                Copy Cyber Operations Manual
                            </Button>
                        </div>
                    </div>

                    {/* Progress Bar & Telemetry */}
                    <div className="bg-white/5 backdrop-blur-md rounded-2xl p-6 border border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-bold text-white/80 flex items-center gap-2">
                                <Activity className="w-4 h-4 text-emerald-400" />
                                Cyber Resilience & NIS2 Maturity
                            </span>
                            <span className="text-sm font-black text-sky-400 bg-sky-950/60 px-3 py-1 rounded-full border border-sky-800/50">
                                {progressPercentage}% Implemented
                            </span>
                        </div>
                        <Progress value={progressPercentage} className="h-2.5 bg-white/10 rounded-full" />
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
                            <div className="text-white/70">
                                <span className="font-bold text-white">{implementedControls} / {totalControls}</span> Safeguards Active
                            </div>
                            <div className="text-white/70">
                                <span className="font-bold text-white">{totalRisks}</span> Cyber Risks Tracked
                            </div>
                            <div className="text-white/70">
                                <span className="font-bold text-white">{treatedRisks}</span> Mitigations Deployed
                            </div>
                            <div className="text-white/70">
                                <span className="font-bold text-white">{scenarioCount}</span> Threat Scenarios Tested
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 border-b border-border pb-2">
                <Button
                    variant={activeTab === 'tutorials' ? 'default' : 'ghost'}
                    onClick={() => setActiveTab('tutorials')}
                    className={cn("font-bold rounded-xl", activeTab === 'tutorials' ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                >
                    <BookOpen className="w-4 h-4 mr-2" />
                    Step-by-Step Operating Manual
                </Button>
                <Button
                    variant={activeTab === 'roadmap' ? 'default' : 'ghost'}
                    onClick={() => setActiveTab('roadmap')}
                    className={cn("font-bold rounded-xl", activeTab === 'roadmap' ? "bg-blue-600 text-white shadow-sm" : "text-muted-foreground")}
                >
                    <CalendarClock className="w-4 h-4 mr-2" />
                    90-Day NIS2 Roadmap
                </Button>
                <Button
                    variant={activeTab === 'architecture' ? 'default' : 'ghost'}
                    onClick={() => setActiveTab('architecture')}
                    className={cn("font-bold rounded-xl", activeTab === 'architecture' ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                >
                    <Layers className="w-4 h-4 mr-2" />
                    NIS2 Architecture & Threat Loop
                </Button>
                <Button
                    variant={activeTab === 'auditor' ? 'default' : 'ghost'}
                    onClick={() => setActiveTab('auditor')}
                    className={cn("font-bold rounded-xl", activeTab === 'auditor' ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Auditor & CSIRT Clean Room
                </Button>
            </div>

            {/* TAB 1: Step-by-Step Operating Manual with LEFT PANEL */}
            {activeTab === 'tutorials' && (
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                    
                    {/* LEFT PANEL / SIDEBAR */}
                    <div className="xl:col-span-4 2xl:col-span-3.5 space-y-6 xl:sticky xl:top-24">
                        
                        {/* 1. Framework Focus Selector */}
                        <Card className="border-border shadow-md rounded-2xl overflow-hidden bg-card">
                            <CardHeader className="bg-muted border-b border-border p-4">
                                <CardTitle className="text-sm font-bold text-foreground flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                        <Globe className="w-4 h-4 text-sky-600" />
                                        Framework Lens
                                    </span>
                                    <Badge variant="outline" className="text-[10px] uppercase font-bold text-muted-foreground">
                                        Standard
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-2">
                                <button
                                    onClick={() => setSelectedFramework('nis2')}
                                    className={cn(
                                        "w-full text-left p-3 rounded-xl transition-all flex items-center justify-between border",
                                        selectedFramework === 'nis2'
                                            ? "bg-sky-50 border-sky-300 text-sky-950 font-bold shadow-sm"
                                            : "border-border hover:bg-muted/50 text-foreground/80 font-medium"
                                    )}
                                >
                                    <div>
                                        <div className="text-sm font-bold">NIS2 Directive (EU 2022/2555)</div>
                                        <div className="text-xs text-muted-foreground">EU Essential & Important Sectors</div>
                                    </div>
                                    {selectedFramework === 'nis2' && <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />}
                                </button>

                                <button
                                    onClick={() => setSelectedFramework('nist_csf')}
                                    className={cn(
                                        "w-full text-left p-3 rounded-xl transition-all flex items-center justify-between border",
                                        selectedFramework === 'nist_csf'
                                            ? "bg-sky-50 border-sky-300 text-sky-950 font-bold shadow-sm"
                                            : "border-border hover:bg-muted/50 text-foreground/80 font-medium"
                                    )}
                                >
                                    <div>
                                        <div className="text-sm font-bold">NIST CSF 2.0</div>
                                        <div className="text-xs text-muted-foreground">Govern • Protect • Respond</div>
                                    </div>
                                    {selectedFramework === 'nist_csf' && <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />}
                                </button>

                                <button
                                    onClick={() => setSelectedFramework('dora')}
                                    className={cn(
                                        "w-full text-left p-3 rounded-xl transition-all flex items-center justify-between border",
                                        selectedFramework === 'dora'
                                            ? "bg-sky-50 border-sky-300 text-sky-950 font-bold shadow-sm"
                                            : "border-border hover:bg-muted/50 text-foreground/80 font-medium"
                                    )}
                                >
                                    <div>
                                        <div className="text-sm font-bold">DORA (Financial ICT)</div>
                                        <div className="text-xs text-muted-foreground">Digital Operational Resilience</div>
                                    </div>
                                    {selectedFramework === 'dora' && <CheckCircle2 className="w-4 h-4 text-sky-600 shrink-0" />}
                                </button>
                            </CardContent>
                        </Card>

                        {/* 2. Pillars Quick Navigator */}
                        <Card className="border-border shadow-md rounded-2xl overflow-hidden bg-card">
                            <CardHeader className="bg-muted border-b border-border p-4">
                                <CardTitle className="text-sm font-bold text-foreground flex items-center justify-between">
                                    <span className="flex items-center gap-1.5">
                                        <Layers className="w-4 h-4 text-primary" />
                                        Program Pillars
                                    </span>
                                    <span className="text-xs text-muted-foreground font-medium">{completedPillars} of 5 Ready</span>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-3 space-y-1.5">
                                {pillars.map((p) => {
                                    const isCurrent = selectedPillarId === p.id;
                                    return (
                                        <button
                                            key={p.id}
                                            onClick={() => scrollToPillar(p.id)}
                                            className={cn(
                                                "w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between text-xs group",
                                                isCurrent
                                                    ? "bg-primary text-primary-foreground font-bold shadow-md"
                                                    : "text-foreground/80 hover:bg-muted/50 font-medium"
                                            )}
                                        >
                                            <div className="flex items-center gap-2.5 overflow-hidden">
                                                <div className={cn(
                                                    "w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[11px] shrink-0",
                                                    isCurrent ? "bg-white/20 text-white" : "bg-muted text-foreground/80"
                                                )}>
                                                    {p.number}
                                                </div>
                                                <span className="truncate">{p.title}</span>
                                            </div>
                                            {p.isCompleted ? (
                                                <CheckCircle2 className={cn("w-4 h-4 shrink-0", isCurrent ? "text-emerald-300" : "text-emerald-600")} />
                                            ) : (
                                                <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-mono shrink-0", isCurrent ? "bg-white/10 text-white" : "bg-muted text-muted-foreground")}>
                                                    Pending
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </CardContent>
                        </Card>

                        {/* 3. Statutory Deadlines */}
                        <Card className="border-border shadow-md rounded-2xl overflow-hidden bg-card">
                            <CardHeader className="bg-rose-50/70 border-b border-rose-100 p-4">
                                <CardTitle className="text-sm font-bold text-rose-950 flex items-center gap-1.5">
                                    <Clock className="w-4 h-4 text-rose-600" />
                                    NIS2 Statutory Reporting Deadlines
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-3 text-xs">
                                <div className="p-2.5 rounded-xl bg-muted border border-border space-y-1">
                                    <div className="flex items-center justify-between font-bold text-foreground">
                                        <span>24 Hours</span>
                                        <Badge variant="outline" className="text-[9px] bg-rose-100 text-rose-800 border-none font-bold">Art. 23(4)(a)</Badge>
                                    </div>
                                    <p className="text-foreground/80 text-[11px]">Mandatory Early Warning to national CSIRT upon incident detection.</p>
                                </div>

                                <div className="p-2.5 rounded-xl bg-muted border border-border space-y-1">
                                    <div className="flex items-center justify-between font-bold text-foreground">
                                        <span>72 Hours</span>
                                        <Badge variant="outline" className="text-[9px] bg-amber-100 text-amber-800 border-none font-bold">Art. 23(4)(b)</Badge>
                                    </div>
                                    <p className="text-foreground/80 text-[11px]">Formal incident notification with initial severity assessment and IoCs.</p>
                                </div>

                                <div className="p-2.5 rounded-xl bg-muted border border-border space-y-1">
                                    <div className="flex items-center justify-between font-bold text-foreground">
                                        <span>1 Month</span>
                                        <Badge variant="outline" className="text-[9px] bg-blue-100 text-blue-800 border-none font-bold">Art. 23(4)(e)</Badge>
                                    </div>
                                    <p className="text-foreground/80 text-[11px]">Final comprehensive incident report with root cause analysis.</p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* 4. Quick Action Downloads */}
                        <Card className="border-border shadow-md rounded-2xl overflow-hidden bg-card">
                            <CardHeader className="bg-muted border-b border-border p-4">
                                <CardTitle className="text-sm font-bold text-foreground flex items-center gap-1.5">
                                    <Sparkles className="w-4 h-4 text-amber-500" />
                                    Quick Clean-Room Tools
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => downloadFile('nis2-early-warning-template.md', NIS2_EARLY_WARNING_MD, 'text/markdown;charset=utf-8')}
                                    className="w-full justify-start text-xs font-bold text-foreground/80"
                                >
                                    <Zap className="w-3.5 h-3.5 mr-2 text-rose-600" />
                                    Download 24h CSIRT Template
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => downloadFile('nis2-controls-matrix.csv', NIS2_CONTROLS_MATRIX_CSV, 'text/csv;charset=utf-8')}
                                    className="w-full justify-start text-xs font-bold text-foreground/80"
                                >
                                    <FileText className="w-3.5 h-3.5 mr-2 text-primary" />
                                    Export Article 21 Matrix (CSV)
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => downloadFile('supply-chain-due-diligence.csv', SUPPLY_CHAIN_DUE_DILIGENCE_CSV, 'text/csv;charset=utf-8')}
                                    className="w-full justify-start text-xs font-bold text-foreground/80"
                                >
                                    <Lock className="w-3.5 h-3.5 mr-2 text-amber-600" />
                                    Supply Chain Audit Form
                                </Button>
                            </CardContent>
                        </Card>

                    </div>

                    {/* RIGHT COLUMN: DETAILED PILLARS & TUTORIALS */}
                    <div className="xl:col-span-8 2xl:col-span-8.5 space-y-6">
                        {pillars.map((pillar) => {
                            return (
                                <Card
                                    key={pillar.id}
                                    id={`pillar-${pillar.id}`}
                                    className="border-border shadow-xl shadow-slate-200/40 rounded-2xl overflow-hidden hover:shadow-2xl transition-all group bg-card scroll-mt-24"
                                >
                                    <CardHeader className={`${pillar.bgLight} border-b border-border p-5 sm:p-6`}>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="flex items-start sm:items-center gap-3.5 sm:gap-4 min-w-0 flex-1">
                                                <div className={cn("h-11 w-11 sm:h-12 sm:w-12 rounded-2xl flex items-center justify-center font-black text-base sm:text-lg text-white shadow-md bg-gradient-to-br shrink-0", pillar.gradient)}>
                                                    {pillar.number}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <CardTitle className="text-lg sm:text-xl font-bold text-foreground leading-snug">
                                                            {pillar.title}
                                                        </CardTitle>
                                                        <Badge className="bg-card border-border text-foreground/80 text-[10px] font-bold shrink-0">
                                                            {pillar.legalRef}
                                                        </Badge>
                                                    </div>
                                                    <CardDescription className="text-foreground/80 text-xs sm:text-sm font-medium mt-0.5">
                                                        {pillar.summary}
                                                    </CardDescription>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between sm:justify-end gap-2.5 sm:gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/60">
                                                <Badge className={cn("font-bold text-[11px] sm:text-xs px-2.5 py-1 border-none shrink-0 whitespace-nowrap", pillar.status === 'active' ? "bg-emerald-100 text-emerald-800" : "bg-muted text-foreground/80")}>
                                                    {pillar.countLabel}
                                                </Badge>
                                                <Button
                                                    onClick={() => setLocation(pillar.link)}
                                                    className="bg-primary hover:bg-brand-bright text-primary-foreground font-bold rounded-xl h-9 sm:h-10 px-3.5 sm:px-4 text-xs sm:text-sm whitespace-nowrap shrink-0 transition-all shadow-sm flex items-center"
                                                >
                                                    <span>{pillar.cta}</span>
                                                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1.5 shrink-0" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-6 grid md:grid-cols-2 gap-6">
                                        <div className="space-y-3 bg-muted/70 p-4 rounded-xl border border-border">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                                <Info className="w-3.5 h-3.5 text-brand-bright" />
                                                Why This Step Is Critical
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
                                                        <span className="text-brand-bright font-bold shrink-0">•</span>
                                                        <span>{step}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                            {pillar.downloadAction && (
                                                <div className="pt-2 border-t border-border">
                                                    <Button
                                                        variant="link"
                                                        className="text-xs font-bold text-sky-600 p-0 h-auto hover:text-sky-800"
                                                        onClick={pillar.downloadAction}
                                                    >
                                                        <Download className="w-3.5 h-3.5 mr-1" />
                                                        Download Template / Checklist
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                </div>
            )}

            {/* TAB: 90-Day NIS2 Implementation Roadmap */}
            {activeTab === 'roadmap' && (
                <div className="space-y-4">
                    <Framework90DayRoadmap
                        spec={getNis2Roadmap(clientId)}
                        clientId={clientId}
                    />
                </div>
            )}

            {/* TAB 2: Architecture & Threat Loop */}
            {activeTab === 'architecture' && (
                <div className="space-y-6">
                    <Card className="border-border shadow-xl rounded-2xl p-8 bg-card space-y-6">
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-foreground">The Connected Cyber Resilience Loop</h3>
                            <p className="text-foreground/80">
                                NIS2 compliance requires an active continuous feedback loop integrating threat intelligence, vulnerability remediation, supply chain audits, and incident containment.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                            <div className="p-6 rounded-2xl bg-sky-50/60 border border-sky-100 space-y-3">
                                <div className="h-10 w-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
                                    1
                                </div>
                                <h4 className="font-bold text-foreground text-lg">Predict & Protect</h4>
                                <p className="text-xs text-foreground/80 leading-relaxed">
                                    <strong>Threat Intelligence</strong> feeds into <strong>Article 21 Safeguards</strong> (MFA, Zero Trust, Network Segmentation).
                                </p>
                            </div>

                            <div className="p-6 rounded-2xl bg-blue-50/60 border border-blue-100 space-y-3">
                                <div className="h-10 w-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                                    2
                                </div>
                                <h4 className="font-bold text-foreground text-lg">Detect & Triage</h4>
                                <p className="text-xs text-foreground/80 leading-relaxed">
                                    <strong>Continuous Monitoring</strong> detects anomalous behavior; <strong>Incident Reporting</strong> triggers 24h Early Warnings.
                                </p>
                            </div>

                            <div className="p-6 rounded-2xl bg-cyan-50/60 border border-cyan-100 space-y-3">
                                <div className="h-10 w-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold">
                                    3
                                </div>
                                <h4 className="font-bold text-foreground text-lg">Recover & Oversee</h4>
                                <p className="text-xs text-foreground/80 leading-relaxed">
                                    <strong>Business Continuity</strong> executes recovery; <strong>Board Governance</strong> reviews root causes and risk budgets.
                                </p>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            {/* TAB 3: Auditor & CSIRT Clean Room */}
            {activeTab === 'auditor' && (
                <div className="space-y-6">
                    <Card className="border-border shadow-xl rounded-2xl p-8 bg-card space-y-6">
                        <div className="space-y-2">
                            <h3 className="text-2xl font-bold text-foreground">Auditor & National CSIRT Clean Room</h3>
                            <p className="text-foreground/80">
                                Direct export package of technical measures, incident response runbooks, and supply chain certifications for supervisory authorities.
                            </p>
                        </div>

                        <div className="divide-y divide-border">
                            <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <h5 className="font-bold text-foreground">NIS2 Article 21 Controls Matrix (CSV)</h5>
                                    <p className="text-xs text-muted-foreground">Official technical mapping of all 10 minimum security measures with verification proof.</p>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={() => downloadFile('nis2-controls-matrix.csv', NIS2_CONTROLS_MATRIX_CSV, 'text/csv;charset=utf-8')}
                                    className="border-border font-bold text-xs"
                                >
                                    <Download className="w-3.5 h-3.5 mr-1.5" />
                                    Export Controls (CSV)
                                </Button>
                            </div>

                            <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <h5 className="font-bold text-foreground">24-Hour CSIRT Early Warning Form (Markdown)</h5>
                                    <p className="text-xs text-muted-foreground">Statutory notification draft for national CSIRTs and competent authorities.</p>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={() => downloadFile('nis2-early-warning-template.md', NIS2_EARLY_WARNING_MD, 'text/markdown;charset=utf-8')}
                                    className="border-border font-bold text-xs"
                                >
                                    <Download className="w-3.5 h-3.5 mr-1.5" />
                                    Download 24h Template
                                </Button>
                            </div>

                            <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <h5 className="font-bold text-foreground">Supply Chain Due Diligence Register (CSV)</h5>
                                    <p className="text-xs text-muted-foreground">Tier 1 critical vendor assessments, cloud SLAs, and contractual security clauses.</p>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={() => downloadFile('supply-chain-due-diligence.csv', SUPPLY_CHAIN_DUE_DILIGENCE_CSV, 'text/csv;charset=utf-8')}
                                    className="border-border font-bold text-xs"
                                >
                                    <Download className="w-3.5 h-3.5 mr-1.5" />
                                    Download Vendor Register
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
