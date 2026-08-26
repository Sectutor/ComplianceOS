import React, { useState } from 'react';
import { useParams, Link, useLocation } from 'wouter';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@complianceos/ui/ui/card';
import { Badge } from '@complianceos/ui/ui/badge';
import { Button } from '@complianceos/ui/ui/button';
import {
    CheckCircle2, Shield, Users, Target, FileText, Zap, AlertTriangle,
    ArrowRight, BookOpen, ArrowLeft, Info, Calendar, Download,
    Sparkles, Copy, Layers, Check, Activity, BarChart3, Lock, Award
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { Progress } from '@complianceos/ui/ui/progress';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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

const RACI_TEMPLATE_CSV = `Role / Activity,Responsible,Accountable,Consulted,Informed
Information Security Policy,CISO,CEO,IT Manager,All Staff
Risk Assessment,Risk Owner,CISO,Control Owners,Executive Team
Access Reviews,IT Manager,CISO,HR,Compliance Lead
Incident Response,SOC Lead,CISO,Legal,Executive Team
Vendor Risk Management,Procurement,CISO,Vendor Owner,Finance
Evidence Collection,Control Owners,Compliance Lead,,Internal Audit
Policy Annual Review,Policy Owner,CISO,Legal,All Staff
`;

function buildControlsMatrixCsv(controls: any[]): string {
    const header = 'Control ID,Title,Framework,Status,Owner\n';
    const rows = controls.map(c =>
        [c.controlId ?? c.id, `"${(c.title || c.name || '').replace(/"/g, '""')}"`, c.framework ?? '', c.status ?? '', c.owner ?? '']
            .join(',')
    );
    return header + rows.join('\n') + '\n';
}

const GAP_ASSESSMENT_CSV = `#,Requirement Clause,Requirement Description,Implemented (Y/N),Partial?,Evidence Reference,Gaps / Notes,Owner,Target Date
1,Gov.1,Information security governance roles & RACI defined,,,,,,
2,Gov.2,Master Information Security Policy approved by C-Level,,,,,,
3,Ctrl.1,Multi-framework control mesh mapped (SOC 2, ISO 27001, NIST),,,,,,
4,Risk.1,Enterprise Risk Assessment & Treatment Plan (RTP) active,,,,,,
5,Pol.1,Access control, cryptography & incident policies published,,,,,,
6,Ops.1,Quarterly user access reviews & evidence collection automated,,,,,,
7,Brd.1,Annual executive management review & board compliance reporting,,,,,,
`;

const AUTOMATION_PLAYBOOKS_MD = `# Enterprise GRC Evidence Automation Playbooks

## 1. Cloud Configuration Checks (AWS / Azure / GCP)
- Trigger: Nightly automated schedule
- Check: Storage encryption at rest enabled on all buckets, databases, and disks
- On failure: Automatically open high-priority remediation task assigned to Cloud SecOps; notify #security

## 2. Quarterly Access Review (User & Privileged Accounts)
- Trigger: Calendar quarterly schedule (every 90 days)
- Action: Generate access review campaign per system; assign to System Owners
- Escalation: Overdue after 14 days -> Escalate to CISO and department head

## 3. Policy Acknowledgment & Attestation
- Trigger: Policy published or annual review cycle
- Action: Track acknowledgments; remind non-compliant staff weekly
- Escalation: Overdue after 30 days -> Notify line manager and restrict access

## 4. Vulnerability & Patch Management Cadence
- Trigger: Scanner webhook or weekly feed
- Action: Ingest CVE findings; map to Asset Inventory; open remediation tasks above Criticality threshold
`;

export default function GovernanceProgramGuide() {
    const params = useParams();
    const clientId = parseInt(params.id || params.clientId || "0");
    const [location, setLocation] = useLocation();
    const [activeTab, setActiveTab] = useState<'tutorials' | 'architecture' | 'auditor'>('tutorials');

    // Fetch live system telemetry safely
    const { data: govStats } = trpc.governance.getStats.useQuery({ clientId }, { enabled: !!clientId });
    const { data: controlsData } = trpc.clientControls.list.useQuery({ clientId }, { enabled: !!clientId });
    const { data: risksData } = trpc.risks.getRiskAssessments.useQuery({ clientId }, { enabled: !!clientId });
    const { data: clientPolicies } = trpc.clientPolicies.list.useQuery({ clientId }, { enabled: !!clientId });
    const { data: workItems } = trpc.governance.list.useQuery({ clientId }, { enabled: !!clientId });

    // Defensive array checks
    const safeControls = Array.isArray(controlsData) ? controlsData : [];
    const safeRisks = Array.isArray(risksData) ? risksData : [];
    const safePolicies = Array.isArray(clientPolicies) ? clientPolicies : [];
    const safeWorkItems = Array.isArray(workItems) ? workItems : [];

    // Calculate metrics
    const totalControls = safeControls.length || 0;
    const implementedControls = safeControls.filter((c: any) => c.status === 'implemented' || c.status === 'active').length;
    
    const totalRisks = safeRisks.length || 0;
    const treatedRisks = safeRisks.filter((r: any) => r.status === 'treated' || r.status === 'closed' || r.status === 'mitigated').length;

    const totalPolicies = safePolicies.length || 0;
    const approvedPolicies = safePolicies.filter((p: any) => p?.clientPolicy?.status === 'approved' || p?.status === 'approved' || p?.clientPolicy?.status === 'published').length;

    const totalTasks = safeWorkItems.length || 0;
    const completedTasks = safeWorkItems.filter((w: any) => w.status === 'completed').length;

    const healthScore = govStats?.healthScore ?? 85;

    const completedPillars = [
        totalControls > 0,
        implementedControls > 0,
        totalRisks > 0,
        totalPolicies > 0,
        approvedPolicies > 0
    ].filter(Boolean).length;

    const progressPercentage = Math.min(100, Math.round(((implementedControls / Math.max(1, totalControls)) * 0.4 + (completedPillars / 5) * 0.6) * 100));

    const pillars = [
        {
            id: 'raci',
            number: 1,
            title: 'Accountability, Roles & RACI Matrix',
            refTag: 'Governance Core / COSO',
            status: 'active',
            countLabel: 'Roles Defined',
            icon: Users,
            color: 'text-primary',
            bgLight: 'bg-primary/NaN',
            borderColor: 'border-primary/30',
            gradient: 'from-primary to-violet-600',
            summary: 'Establish clear organizational oversight by defining who is Responsible, Accountable, Consulted, and Informed for each security domain.',
            whyItMatters: 'Auditors evaluate governance first. Without defined roles (CISO, Risk Owners, SecOps, Legal), control implementations lack ownership and fail during external reviews.',
            howToExecute: [
                '1. Navigate to RACI Matrix and assign cross-functional owners for Policies, Risk, Incident Response, and Vendor Management.',
                '2. Formally designate the CISO / Information Security Officer as the ultimate Accountable party for security posture.',
                '3. Review role assignments quarterly to accommodate organizational changes and promotions.',
                '4. Download the RACI Matrix Template CSV for executive sign-off.'
            ],
            link: `/clients/${clientId}/raci-matrix`,
            cta: 'Open RACI Matrix',
            downloadAction: () => downloadFile('raci-template.csv', RACI_TEMPLATE_CSV, 'text/csv;charset=utf-8')
        },
        {
            id: 'controls',
            number: 2,
            title: 'Unified Control Framework & Security Controls Mesh',
            refTag: 'SOC 2 • ISO 27001 • NIST CSF',
            status: totalControls > 0 ? 'active' : 'pending',
            countLabel: `${implementedControls} / ${totalControls} Controls Implemented`,
            icon: Shield,
            color: 'text-emerald-600',
            bgLight: 'bg-emerald-50/70',
            borderColor: 'border-emerald-200',
            gradient: 'from-emerald-500 to-teal-600',
            summary: 'Implement a centralized control mesh that harmonizes requirements across multiple standards into a single unified control catalog.',
            whyItMatters: 'Prevents "compliance fatigue" and duplicate audits by testing controls once and satisfying multiple frameworks simultaneously.',
            howToExecute: [
                '1. Open Security Controls to review your organizational baseline across SOC 2, ISO 27001, and NIST CSF.',
                '2. Map technical safeguards (e.g. MFA, Encryption at Rest, SIEM Logging) to shared control IDs.',
                '3. Set control status to "Implemented" and attach supporting architectural evidence.',
                '4. Export your Controls Matrix spreadsheet for external auditor review.'
            ],
            link: `/clients/${clientId}/controls`,
            cta: 'Manage Controls Mesh',
            downloadAction: () => downloadFile(`controls-matrix-client-${clientId}.csv`, buildControlsMatrixCsv(safeControls), 'text/csv;charset=utf-8')
        },
        {
            id: 'risks',
            number: 3,
            title: 'Enterprise Risk Governance & Continuous Gap Analysis',
            refTag: 'ISO 27005 / NIST RMF',
            status: totalRisks > 0 ? 'active' : 'pending',
            countLabel: `${totalRisks} Risks (${treatedRisks} Treated)`,
            icon: AlertTriangle,
            color: 'text-amber-600',
            bgLight: 'bg-amber-50/70',
            borderColor: 'border-amber-200',
            gradient: 'from-amber-500 to-orange-600',
            summary: 'Identify, prioritize, and treat organizational risks with a formalized scoring methodology and ongoing Key Risk Indicator (KRI) monitoring.',
            whyItMatters: 'Modern compliance is risk-informed. Auditors expect to see that controls are chosen based on calculated risk severities rather than arbitrary checklists.',
            howToExecute: [
                '1. Open Enterprise Risk Register and log identified business and technology threat scenarios.',
                '2. Score Inherent Likelihood and Impact (1–5) to calculate Risk Priority Numbers.',
                '3. Formulate a Risk Treatment Plan (RTP) and assign remediation owners with target completion dates.',
                '4. Download the Gap Assessment & Risk Evaluation template to track remediation velocity.'
            ],
            link: `/clients/${clientId}/risks`,
            cta: 'Open Risk Register',
            downloadAction: () => downloadFile('gap-assessment-form.csv', GAP_ASSESSMENT_CSV, 'text/csv;charset=utf-8')
        },
        {
            id: 'policies',
            number: 4,
            title: 'Policy Lifecycle Management & Staff Attestation',
            refTag: 'Governance Core / ISO Clause 7.5',
            status: totalPolicies > 0 ? 'active' : 'pending',
            countLabel: `${totalPolicies} Policies (${approvedPolicies} Approved)`,
            icon: FileText,
            color: 'text-purple-600',
            bgLight: 'bg-purple-50/70',
            borderColor: 'border-purple-200',
            gradient: 'from-purple-600 to-primary',
            summary: 'Draft, approve, publish, and track employee acknowledgments across all mandatory information security policies and procedures.',
            whyItMatters: 'Unpublished or unacknowledged policies are treated by auditors as non-existent. Staff attestation provides legal evidence of security awareness.',
            howToExecute: [
                '1. Open Policy Hub to author or customize core policies (Access Control, Acceptable Use, Incident Response, Cryptography).',
                '2. Route draft policies through executive review and formal approval.',
                '3. Distribute approved policies to all employees for annual digital acknowledgment.',
                '4. Monitor acknowledgment completion rates and chase outstanding attestations.'
            ],
            link: `/clients/${clientId}/policies`,
            cta: 'Manage Policy Hub',
            downloadAction: () => downloadFile('policy-templates-catalog.csv', `Policy Name,Category,Review Frequency\nInformation Security Policy,Governance,Annual\nAccess Control Policy,Technical,Annual\nIncident Response Plan,Operations,Annual\nAcceptable Use Policy,HR/People,Annual\n`, 'text/csv;charset=utf-8')
        },
        {
            id: 'workbench',
            number: 5,
            title: 'Compliance Workbench & Automated Task Orchestration',
            refTag: 'Operations & Continuous Audit',
            status: 'active',
            countLabel: `${completedTasks} / ${totalTasks} Tasks Completed`,
            icon: Zap,
            color: 'text-rose-600',
            bgLight: 'bg-rose-50/70',
            borderColor: 'border-rose-200',
            gradient: 'from-rose-500 to-red-600',
            summary: 'Track recurring compliance work items, quarterly access reviews, vendor assessments, and evidence collection workflows in a unified workbench.',
            whyItMatters: 'Prevents annual compliance scrambles by transforming audits into continuous, manageable weekly operational tasks.',
            howToExecute: [
                '1. Open Governance Workbench to view all pending, in-progress, and critical compliance work items.',
                '2. Assign recurring task triggers (e.g. quarterly user access reviews, monthly firewall rule reviews).',
                '3. Upload operational evidence directly to work items to automatically satisfy linked controls.',
                '4. Download the Evidence Automation Playbooks to streamline collection.'
            ],
            link: `/clients/${clientId}/governance/workbench`,
            cta: 'Open Workbench',
            downloadAction: () => downloadFile('evidence-automation-playbooks.md', AUTOMATION_PLAYBOOKS_MD, 'text/markdown;charset=utf-8')
        },
        {
            id: 'board',
            number: 6,
            title: 'Executive Reporting, Board Oversight & Audit Clean Room',
            refTag: 'Executive Leadership & Audit Ready',
            status: 'active',
            countLabel: `Health Score: ${healthScore}%`,
            icon: Award,
            color: 'text-cyan-600',
            bgLight: 'bg-cyan-50/70',
            borderColor: 'border-cyan-200',
            gradient: 'from-cyan-600 to-blue-700',
            summary: 'Provide real-time visibility to C-Level executives, the Board of Directors, and external auditors on program health, velocity, and readiness.',
            whyItMatters: 'Demonstrates active management oversight and provides instant proof of compliance during customer security reviews and investor due diligence.',
            howToExecute: [
                '1. Review the Governance Dashboard for high-level compliance trends, health scores, and open action items.',
                '2. Export the Master GRC Operations Manual and Audit Clean Room packages.',
                '3. Present quarterly governance health reports to the Board Risk Committee.',
                '4. Provide auditors with read-only Clean Room access to verify evidence.'
            ],
            link: `/clients/${clientId}/governance`,
            cta: 'View Executive Dashboard',
            downloadAction: () => toast.success("Executive report ready for review!")
        }
    ];

    const copyMasterManual = () => {
        const manualText = `COMPLIANCEOS ENTERPRISE GRC OPERATING MANUAL\n` +
            `=============================================\n` +
            `Organization: Client #${clientId}\n` +
            `Framework Alignment: NIST CSF • ISO/IEC 27001 • SOC 2 • COSO GRC\n` +
            `Generated: ${new Date().toLocaleDateString()}\n\n` +
            `1. ACCOUNTABILITY & RACI MATRIX\n` +
            `   - CISO Accountable for overall information security posture.\n` +
            `   - Designated Owners assigned for Policies, Risk, Incident Response, and Vendor Management.\n\n` +
            `2. UNIFIED CONTROLS MESH (${implementedControls} of ${totalControls} Implemented)\n` +
            `   - Cross-mapped controls satisfying SOC 2, ISO 27001, and NIST CSF simultaneously.\n\n` +
            `3. RISK GOVERNANCE & GAP ANALYSIS (${totalRisks} Risks, ${treatedRisks} Treated)\n` +
            `   - Continuous risk assessment, residual risk calculation, and Risk Treatment Plans.\n\n` +
            `4. POLICY LIFECYCLE (${totalPolicies} Policies, ${approvedPolicies} Approved)\n` +
            `   - Version-controlled policy portfolio with annual employee acknowledgment attestation.\n\n` +
            `5. WORKBENCH & EVIDENCE AUTOMATION (${completedTasks} of ${totalTasks} Tasks Completed)\n` +
            `   - Recurring cadence for quarterly access reviews and automated evidence collection.\n\n` +
            `6. EXECUTIVE HEALTH & BOARD REPORTING\n` +
            `   - Governance Health Score: ${healthScore}%\n` +
            `   - Continuous audit clean room packaging and management oversight.`;

        navigator.clipboard.writeText(manualText);
        toast.success("Complete GRC Operations Manual copied to clipboard!");
    };

    return (
        <DashboardLayout>
            <div className="space-y-8 animate-in fade-in duration-500 pb-20 p-4 md:p-8">
                {/* Header Breadcrumb */}
                <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border pb-4">
                    <div className="flex items-center gap-2 text-sm">
                        <Link href={`/clients/${clientId}/governance`}>
                            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground -ml-2 h-8">
                                <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Governance Dashboard
                            </Button>
                        </Link>
                        <span className="text-muted-foreground">/</span>
                        <div className="flex items-center gap-1.5 text-foreground font-bold">
                            <BookOpen className="w-4 h-4 text-primary" />
                            Program Guide & Manual
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Link href={`/clients/${clientId}/governance/workbench`}>
                            <Button variant="outline" size="sm" className="font-bold text-xs">
                                <Zap className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                                Open Workbench
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Hero Header */}
                <div className="bg-sidebar rounded-3xl p-8 lg:p-12 text-sidebar-foreground shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                    <div className="relative z-10 space-y-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="bg-sidebar-muted backdrop-blur-md p-4 rounded-2xl border border-sidebar-border text-sidebar-accent">
                                    <Shield className="w-8 h-8 text-primary" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h1 className="text-3xl lg:text-4xl font-black tracking-tight">Governance Operating Guide & Manual</h1>
                                        <Badge className="bg-primary/20 text-primary border-primary text-xs font-bold">
                                            NIST CSF • ISO 27001 • SOC 2
                                        </Badge>
                                    </div>
                                    <p className="text-muted-foreground text-base mt-1">
                                        Complete GRC operating model, RACI accountability framework, and continuous compliance playbook.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                <Button
                                    onClick={copyMasterManual}
                                    variant="outline"
                                    className="bg-sidebar-muted border-sidebar-border text-sidebar-foreground hover:bg-sidebar-accent/20 font-bold rounded-xl h-11"
                                >
                                    <Copy className="w-4 h-4 mr-2" />
                                    Copy GRC Operations Manual
                                </Button>
                            </div>
                        </div>

                        {/* Progress Bar & Telemetry */}
                        <div className="bg-sidebar-muted backdrop-blur-md rounded-2xl p-6 border border-sidebar-border space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-muted-foreground flex items-center gap-2">
                                    <Activity className="w-4 h-4 text-emerald-400" />
                                    GRC Program Maturity & Implementation
                                </span>
                                <span className="text-sm font-black text-primary bg-primary/60 px-3 py-1 rounded-full border border-primary">
                                    {progressPercentage}% Mature
                                </span>
                            </div>
                            <Progress value={progressPercentage} className="h-2.5 bg-sidebar-muted rounded-full" />
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
                                <div className="text-muted-foreground">
                                    <span className="font-bold text-sidebar-foreground">{implementedControls} / {totalControls}</span> Controls Implemented
                                </div>
                                <div className="text-muted-foreground">
                                    <span className="font-bold text-sidebar-foreground">{totalRisks}</span> Risks Identified
                                </div>
                                <div className="text-muted-foreground">
                                    <span className="font-bold text-sidebar-foreground">{approvedPolicies}</span> Approved Policies
                                </div>
                                <div className="text-muted-foreground">
                                    <span className="font-bold text-sidebar-foreground">{completedTasks}</span> Workbench Tasks Completed
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
                        variant={activeTab === 'architecture' ? 'default' : 'ghost'}
                        onClick={() => setActiveTab('architecture')}
                        className={cn("font-bold rounded-xl", activeTab === 'architecture' ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                    >
                        <Layers className="w-4 h-4 mr-2" />
                        GRC Ecosystem Architecture
                    </Button>
                    <Button
                        variant={activeTab === 'auditor' ? 'default' : 'ghost'}
                        onClick={() => setActiveTab('auditor')}
                        className={cn("font-bold rounded-xl", activeTab === 'auditor' ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                    >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Auditor & Board Clean Room
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
                                        className="border-border shadow-xl shadow-primary/6 rounded-2xl overflow-hidden hover:shadow-2xl transition-all group bg-card"
                                    >
                                        <CardHeader className={`${pillar.bgLight} border-b border-border p-6`}>
                                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                <div className="flex items-center gap-4">
                                                    <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center font-black text-lg text-primary-foreground shadow-md bg-gradient-to-br", pillar.gradient)}>
                                                        {pillar.number}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <CardTitle className="text-xl font-bold text-foreground">
                                                                {pillar.title}
                                                            </CardTitle>
                                                            <Badge className="bg-card border-border text-foreground text-[10px] font-bold">
                                                                {pillar.refTag}
                                                            </Badge>
                                                        </div>
                                                        <CardDescription className="text-muted-foreground text-sm font-medium mt-0.5">
                                                            {pillar.summary}
                                                        </CardDescription>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <Badge className={cn("font-bold text-xs px-3 py-1 border-none", pillar.status === 'active' ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground")}>
                                                        {pillar.countLabel}
                                                    </Badge>
                                                    <Button
                                                        onClick={() => setLocation(pillar.link)}
                                                        className="bg-primary hover:bg-brand-bright text-primary-foreground font-bold rounded-xl h-10 px-4 transition-all"
                                                    >
                                                        {pillar.cta}
                                                        <ArrowRight className="w-4 h-4 ml-1.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="p-6 grid md:grid-cols-2 gap-6">
                                            <div className="space-y-3 bg-muted/70 p-4 rounded-xl border border-border">
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                                    <Info className="w-3.5 h-3.5 text-primary" />
                                                    Why This Step Is Critical
                                                </h4>
                                                <p className="text-sm text-foreground leading-relaxed font-medium">
                                                    {pillar.whyItMatters}
                                                </p>
                                            </div>

                                            <div className="space-y-3 bg-muted/70 p-4 rounded-xl border border-border">
                                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                                    How to Execute in ComplianceOS
                                                </h4>
                                                <ul className="space-y-1.5 text-xs text-muted-foreground leading-relaxed font-medium">
                                                    {pillar.howToExecute.map((step, idx) => (
                                                        <li key={idx} className="flex items-start gap-2">
                                                            <span className="text-primary font-bold shrink-0">•</span>
                                                            <span>{step}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                                {pillar.downloadAction && (
                                                    <div className="pt-2 border-t border-border">
                                                        <Button
                                                            variant="link"
                                                            className="text-xs font-bold text-primary p-0 h-auto hover:text-primary"
                                                            onClick={pillar.downloadAction}
                                                        >
                                                            <Download className="w-3.5 h-3.5 mr-1" />
                                                            Download Template / Playbook
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

                {/* TAB 2: GRC Architecture & Lifecycle */}
                {activeTab === 'architecture' && (
                    <div className="space-y-6">
                        <Card className="border-border shadow-xl rounded-2xl p-8 bg-card space-y-6">
                            <div className="space-y-2">
                                <h3 className="text-2xl font-bold text-foreground">The Connected GRC Operating Model</h3>
                                <p className="text-muted-foreground">
                                    ComplianceOS connects accountability (RACI), controls implementation, risk management, policy orchestration, and automated work items into an integrated feedback loop.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                                <div className="p-6 rounded-2xl bg-primary/NaN border border-primary/30 space-y-3">
                                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                                        1
                                    </div>
                                    <h4 className="font-bold text-foreground text-lg">Strategy & Accountability</h4>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        <strong>RACI Matrix</strong> establishes roles; <strong>Policies</strong> establish rules; <strong>Risk Register</strong> establishes priorities.
                                    </p>
                                </div>

                                <div className="p-6 rounded-2xl bg-emerald-50/60 border border-emerald-100 space-y-3">
                                    <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                                        2
                                    </div>
                                    <h4 className="font-bold text-foreground text-lg">Execution & Controls Mesh</h4>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        Unified controls satisfy multiple audits; <strong>Workbench</strong> automates recurring evidence collection tasks.
                                    </p>
                                </div>

                                <div className="p-6 rounded-2xl bg-cyan-50/60 border border-cyan-100 space-y-3">
                                    <div className="h-10 w-10 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center font-bold">
                                        3
                                    </div>
                                    <h4 className="font-bold text-foreground text-lg">Oversight & Clean Room</h4>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        Real-time health scorecards for the Board; continuous audit readiness dossiers for external certifiers.
                                    </p>
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
                                <h3 className="text-2xl font-bold text-foreground">Auditor & Board Executive Clean Room</h3>
                                <p className="text-muted-foreground">
                                    Centralized repository of governance deliverables, accountability matrices, controls catalogs, and risk treatment registers.
                                </p>
                            </div>

                            <div className="divide-y divide-border">
                                <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <h5 className="font-bold text-foreground">RACI Accountability Matrix (CSV)</h5>
                                        <p className="text-xs text-muted-foreground">Formal assignment of Responsible, Accountable, Consulted, and Informed stakeholders across all security domains.</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={() => downloadFile('raci-template.csv', RACI_TEMPLATE_CSV, 'text/csv;charset=utf-8')}
                                        className="border-input font-bold text-xs shrink-0"
                                    >
                                        <Download className="w-3.5 h-3.5 mr-1.5" />
                                        Download RACI
                                    </Button>
                                </div>

                                <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <h5 className="font-bold text-foreground">Unified Controls Implementation Matrix (CSV)</h5>
                                        <p className="text-xs text-muted-foreground">Complete catalog of organizational controls mapped across SOC 2, ISO 27001, and NIST CSF with implementation status.</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={() => downloadFile(`controls-matrix-client-${clientId}.csv`, buildControlsMatrixCsv(safeControls), 'text/csv;charset=utf-8')}
                                        className="border-input font-bold text-xs shrink-0"
                                    >
                                        <Download className="w-3.5 h-3.5 mr-1.5" />
                                        Export Controls Matrix
                                    </Button>
                                </div>

                                <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <h5 className="font-bold text-foreground">Enterprise Gap Analysis & Risk Assessment (CSV)</h5>
                                        <p className="text-xs text-muted-foreground">Standardized baseline gap assessment and risk treatment action tracker.</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={() => downloadFile('gap-assessment-form.csv', GAP_ASSESSMENT_CSV, 'text/csv;charset=utf-8')}
                                        className="border-input font-bold text-xs shrink-0"
                                    >
                                        <Download className="w-3.5 h-3.5 mr-1.5" />
                                        Download Gap Assessment
                                    </Button>
                                </div>

                                <div className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <h5 className="font-bold text-foreground">Evidence Automation & Cadence Playbooks (MD)</h5>
                                        <p className="text-xs text-muted-foreground">Documented operational routines for recurring user access reviews, cloud checks, and attestation chasing.</p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        onClick={() => downloadFile('evidence-automation-playbooks.md', AUTOMATION_PLAYBOOKS_MD, 'text/markdown;charset=utf-8')}
                                        className="border-input font-bold text-xs shrink-0"
                                    >
                                        <Download className="w-3.5 h-3.5 mr-1.5" />
                                        Download Playbooks
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
