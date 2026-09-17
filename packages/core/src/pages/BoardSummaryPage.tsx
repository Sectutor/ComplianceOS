import React, { useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import BoardDashboard from '@/components/admin/BoardDashboard';
import { trpc } from '@/lib/trpc';
import { useParams, useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@complianceos/ui/ui/card';
import { Badge } from '@complianceos/ui/ui/badge';
import { Button } from '@complianceos/ui/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@complianceos/ui/ui/tabs';
import {
    Loader2, FileText, Download, Printer, Sparkles, Shield,
    AlertTriangle, Activity, CheckCircle2, Copy, Layers,
    Clock, RefreshCw, Zap, Lock, Eye, Check, ChevronRight,
    ArrowUpRight, Building, HelpCircle, HardDrive, Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Pre-packaged report presets
interface ReportPreset {
    id: string;
    title: string;
    category: string;
    badge: string;
    description: string;
    icon: React.ElementType;
    color: string;
    bgLight: string;
    borderColor: string;
    sections: string[];
    defaultTitle: string;
    targetAudience: string;
}

const REPORT_PRESETS: ReportPreset[] = [
    {
        id: 'board_pack',
        title: 'Board Executive Compliance Pack',
        category: 'Governance & Fiduciary',
        badge: 'C-Level & Board',
        description: 'High-level multi-framework governance posture, residual risk summary, compliance velocity, and strategic recommendations for board meetings.',
        icon: Shield,
        color: 'text-primary',
        bgLight: 'bg-primary/10',
        borderColor: 'border-primary/20',
        sections: ['executive_summary', 'gap_analysis', 'risks', 'controls', 'strategic_vision'],
        defaultTitle: 'Executive Compliance & Cyber Posture Briefing',
        targetAudience: 'Board of Directors & Audit Committee'
    },
    {
        id: 'incident_dossier',
        title: 'Incident Response & Post-Mortem Dossier',
        category: 'Cyber Resilience',
        badge: '24h / 72h CSIRT',
        description: 'Comprehensive log of security incidents, 24h statutory early warnings, 72h notifications, severity triage, root causes, and containment SLAs.',
        icon: Zap,
        color: 'text-rose-600',
        bgLight: 'bg-rose-50/70',
        borderColor: 'border-rose-200',
        sections: ['executive_summary', 'incidents', 'risks', 'controls'],
        defaultTitle: 'CSIRT Security Incident Investigation Dossier',
        targetAudience: 'SecOps, DPO & Supervisory Authorities'
    },
    {
        id: 'bcp_bia_report',
        title: 'Business Continuity & Impact Analysis (BIA/BCP)',
        category: 'Resilience & Operations',
        badge: 'ISO 22301 / NIS2',
        description: 'Critical business processes, RTO/RPO targets, disaster recovery test logs, air-gapped backup validation, and crisis management protocols.',
        icon: Activity,
        color: 'text-teal-600',
        bgLight: 'bg-teal-50/70',
        borderColor: 'border-teal-200',
        sections: ['executive_summary', 'bia', 'bcp', 'risks', 'assets'],
        defaultTitle: 'Business Impact Analysis & Continuity Master Plan',
        targetAudience: 'Operations, IT & Disaster Recovery Teams'
    },
    {
        id: 'risk_exposure',
        title: 'Enterprise Risk & Exposure Dossier',
        category: 'Enterprise Risk',
        badge: 'Risk Committee',
        description: 'Comprehensive risk register, 5x5 likelihood/impact heatmap, financial value-at-risk analysis, treatment roadmaps, and residual exposure.',
        icon: AlertTriangle,
        color: 'text-amber-600',
        bgLight: 'bg-amber-50/70',
        borderColor: 'border-amber-200',
        sections: ['executive_summary', 'risks', 'controls', 'gap_analysis'],
        defaultTitle: 'Enterprise Risk Assessment & Treatment Dossier',
        targetAudience: 'Chief Risk Officer & Risk Committee'
    },
    {
        id: 'audit_pack',
        title: 'Annual ISO 27001 / NIS2 / SOC 2 Audit Pack',
        category: 'Audit & Certification',
        badge: 'Lead Auditor',
        description: 'Statement of Applicability, Article 21 technical measures, control verification proofs, evidence artifacts, and gap assessment.',
        icon: CheckCircle2,
        color: 'text-emerald-600',
        bgLight: 'bg-emerald-50/70',
        borderColor: 'border-emerald-200',
        sections: ['executive_summary', 'gap_analysis', 'controls', 'risks', 'vendors', 'audit'],
        defaultTitle: 'Annual Multi-Framework Audit Assurance Pack',
        targetAudience: 'Accredited External Auditors & Lead Assessors'
    },
    {
        id: 'privacy_ropa',
        title: 'Privacy Governance & ROPA Dossier',
        category: 'Data Privacy',
        badge: 'GDPR / CCPA / ISO 27701',
        description: 'Article 30 Record of Processing Activities (ROPA), Technical PII data inventory, DPIA risk scores, and DSAR fulfillment metrics.',
        icon: Lock,
        color: 'text-sky-600',
        bgLight: 'bg-sky-50/70',
        borderColor: 'border-sky-200',
        sections: ['executive_summary', 'dpia', 'controls', 'vendors', 'policies'],
        defaultTitle: 'Data Protection & Article 30 ROPA Register',
        targetAudience: 'Data Protection Officer & Legal Counsel'
    }
];

const AVAILABLE_SECTIONS = [
    { id: 'executive_summary', name: 'Executive Summary & AI Insights', desc: 'High-level synthesis with key findings and action items' },
    { id: 'gap_analysis', name: 'Gap Analysis & Posture', desc: 'Compliance status across adopted frameworks' },
    { id: 'risks', name: 'Risk Landscape & Heatmap', desc: 'Risk register with severity cards and treatment status' },
    { id: 'controls', name: 'Technical & Organizational Safeguards', desc: 'Detailed control implementation and verification proof' },
    { id: 'incidents', name: 'Incident Response & CSIRT Triage', desc: '24h Early Warnings, outages, and root causes' },
    { id: 'bia', name: 'Business Impact Analysis (BIA)', desc: 'Critical business processes, RTO and RPO targets' },
    { id: 'bcp', name: 'Business Continuity Plans (BCP)', desc: 'Disaster recovery runbooks and crisis workflows' },
    { id: 'vendors', name: 'Third-Party Risk & Supply Chain', desc: 'Critical vendor audits, cloud SLAs, and certifications' },
    { id: 'harmonization_crosswalk', name: 'Multi-Framework Harmonization', desc: 'Unified control mappings across standards' },
    { id: 'ai_agent_governance_pack', name: 'AI & Automated Systems Governance', desc: 'Autonomous agent risk and guardrail verification' }
];

export default function BoardSummaryPage() {
    const { id } = useParams<{ id: string }>();
    const [, setLocation] = useLocation();
    const clientId = parseInt(id || '0', 10);

    const [activeTab, setActiveTab] = useState<'dashboard' | 'studio' | 'history'>('dashboard');
    const [selectedPreset, setSelectedPreset] = useState<ReportPreset>(REPORT_PRESETS[0]);
    const [reportTitle, setReportTitle] = useState<string>(REPORT_PRESETS[0].defaultTitle);
    const [selectedSections, setSelectedSections] = useState<string[]>(REPORT_PRESETS[0].sections);
    const [isGeneratingDocx, setIsGeneratingDocx] = useState<boolean>(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
    const [previewContent, setPreviewContent] = useState<string | null>(null);

    const { data: metrics, isLoading: loadingMetrics } = trpc.complianceExtensions.getBoardMetrics.useQuery(
        { clientId },
        { enabled: !!clientId }
    );

    const { data: client, isLoading: loadingClient } = trpc.clients.get.useQuery(
        { id: clientId },
        { enabled: !!clientId }
    );

    const { data: reportHistory, refetch: refetchHistory } = trpc.reports.getReportHistory.useQuery(
        { clientId, limit: 15 },
        { enabled: !!clientId }
    );

    const generateReportMutation = trpc.reports.generateProfessionalReport.useMutation();

    const handleSelectPreset = (preset: ReportPreset) => {
        setSelectedPreset(preset);
        setReportTitle(preset.defaultTitle);
        setSelectedSections(preset.sections);
        toast.info(`Loaded "${preset.title}" preset template`);
    };

    const toggleSection = (sectionId: string) => {
        if (selectedSections.includes(sectionId)) {
            if (selectedSections.length === 1) {
                toast.warning("At least one section must be included in the report.");
                return;
            }
            setSelectedSections(selectedSections.filter(s => s !== sectionId));
        } else {
            setSelectedSections([...selectedSections, sectionId]);
        }
    };

    const handleExport = async (format: 'docx' | 'pdf') => {
        if (format === 'docx') setIsGeneratingDocx(true);
        else setIsGeneratingPdf(true);

        try {
            toast.loading(`Compiling ${format.toUpperCase()} report with live database telemetry...`, { id: 'generating-report' });
            
            const result = await generateReportMutation.mutateAsync({
                clientId,
                title: reportTitle,
                format,
                includedSections: selectedSections as any,
                branding: {
                    primaryColor: '0F172A',
                }
            });

            // Convert base64 to downloadable blob
            const byteCharacters = atob(result.pdfBase64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: result.contentType });
            const url = URL.createObjectURL(blob);

            if (format === 'pdf') {
                // Open in new tab for immediate print/view
                window.open(url, '_blank');
            } else {
                // Download file directly
                const a = document.createElement('a');
                a.href = url;
                a.download = result.filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }

            URL.revokeObjectURL(url);
            toast.success(`${format.toUpperCase()} report generated successfully!`, { id: 'generating-report' });
            refetchHistory();
        } catch (error: any) {
            console.error("Report generation failed:", error);
            toast.error(`Report generation failed: ${error.message}`, { id: 'generating-report' });
        } finally {
            setIsGeneratingDocx(false);
            setIsGeneratingPdf(false);
        }
    };

    if (loadingMetrics || loadingClient) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    if (!metrics || !client) {
        return (
            <DashboardLayout>
                <div className="p-8 text-center text-muted-foreground">
                    Unable to load board metrics. Please ensure the client exists.
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout>
            <div className="space-y-6 pb-20">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-2xl border border-border shadow-sm">
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <h1 className="text-2xl sm:text-3xl font-black text-foreground">
                                Executive Reporting & Board Center
                            </h1>
                            <Badge className="bg-brand text-white border-none text-xs font-bold">
                                One-Stop-Shop
                            </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm mt-1 font-medium">
                            Comprehensive reporting engine for <span className="text-primary font-bold">{client.name}</span>. Produce consulting-grade DOCX and PDF documents across all compliance domains.
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant={activeTab === 'dashboard' ? 'default' : 'outline'}
                            onClick={() => setActiveTab('dashboard')}
                            className={cn("font-bold text-xs rounded-xl", activeTab === 'dashboard' ? "bg-primary text-primary-foreground" : "border-border")}
                        >
                            <Activity className="w-3.5 h-3.5 mr-1.5" />
                            Live Board Dashboard
                        </Button>
                        <Button
                            variant={activeTab === 'studio' ? 'default' : 'outline'}
                            onClick={() => setActiveTab('studio')}
                            className={cn("font-bold text-xs rounded-xl", activeTab === 'studio' ? "bg-primary text-primary-foreground shadow-md shadow-indigo-200" : "border-border")}
                        >
                            <FileText className="w-3.5 h-3.5 mr-1.5" />
                            Report Generator Studio
                        </Button>
                        <Button
                            variant={activeTab === 'history' ? 'default' : 'outline'}
                            onClick={() => setActiveTab('history')}
                            className={cn("font-bold text-xs rounded-xl", activeTab === 'history' ? "bg-primary text-primary-foreground" : "border-border")}
                        >
                            <Clock className="w-3.5 h-3.5 mr-1.5" />
                            Report Vault
                        </Button>
                    </div>
                </div>

                {/* TAB 1: LIVE BOARD DASHBOARD */}
                {activeTab === 'dashboard' && (
                    <div className="space-y-6">
                        <BoardDashboard 
                            data={metrics} 
                            clientName={client.name} 
                            clientId={clientId}
                            onViewRemediation={() => setLocation(`/clients/${clientId}/implementation`)}
                            onDownloadReport={() => setActiveTab('studio')}
                        />
                    </div>
                )}

                {/* TAB 2: ONE-STOP-SHOP REPORT GENERATOR STUDIO */}
                {activeTab === 'studio' && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        
                        {/* LEFT COLUMN: PRESETS & CONFIGURATOR */}
                        <div className="lg:col-span-5 space-y-6">
                            
                            {/* 1. Pre-Packaged 1-Click Presets */}
                            <Card className="border-border shadow-md rounded-2xl bg-card overflow-hidden">
                                <CardHeader className="bg-muted border-b border-border p-4">
                                    <CardTitle className="text-sm font-bold text-foreground/80 flex items-center justify-between">
                                        <span className="flex items-center gap-1.5">
                                            <Sparkles className="w-4 h-4 text-amber-500" />
                                            1-Click Pre-Packaged Templates
                                        </span>
                                        <Badge variant="outline" className="text-[10px] font-bold text-primary bg-primary/10 border-primary/20">
                                            6 Presets
                                        </Badge>
                                    </CardTitle>
                                    <CardDescription className="text-xs text-muted-foreground">
                                        Select a pre-configured report profile or customize sections below.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-3 space-y-2">
                                    {REPORT_PRESETS.map((preset) => {
                                        const Icon = preset.icon;
                                        const isSelected = selectedPreset.id === preset.id;
                                        return (
                                            <button
                                                key={preset.id}
                                                onClick={() => handleSelectPreset(preset)}
                                                className={cn(
                                                    "w-full text-left p-3 rounded-xl border transition-all text-xs flex items-start gap-3",
                                                    isSelected
                                                        ? "bg-primary/10 border-primary/30 shadow-sm ring-1 ring-primary/30"
                                                        : "border-border hover:bg-muted/50 text-foreground/80"
                                                )}
                                            >
                                                <div className={cn("p-2 rounded-xl shrink-0 mt-0.5", preset.bgLight, preset.color)}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-1">
                                                        <span className="font-bold text-foreground truncate">{preset.title}</span>
                                                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-none font-bold bg-card text-foreground/80 shrink-0">
                                                            {preset.badge}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                                                        {preset.description}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </CardContent>
                            </Card>

                            {/* 2. Custom Section Builder */}
                            <Card className="border-border shadow-md rounded-2xl bg-card overflow-hidden">
                                <CardHeader className="bg-muted border-b border-border p-4">
                                    <CardTitle className="text-sm font-bold text-foreground/80 flex items-center justify-between">
                                        <span className="flex items-center gap-1.5">
                                            <Layers className="w-4 h-4 text-primary" />
                                            Included Report Sections
                                        </span>
                                        <span className="text-xs text-muted-foreground font-medium">
                                            {selectedSections.length} of {AVAILABLE_SECTIONS.length} Active
                                        </span>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-3 space-y-1.5 max-h-[360px] overflow-y-auto">
                                    {AVAILABLE_SECTIONS.map((sec) => {
                                        const isChecked = selectedSections.includes(sec.id);
                                        return (
                                            <div
                                                key={sec.id}
                                                onClick={() => toggleSection(sec.id)}
                                                className={cn(
                                                    "flex items-start gap-2.5 p-2.5 rounded-xl cursor-pointer transition-all border text-xs",
                                                    isChecked
                                                        ? "bg-primary text-primary-foreground border-primary/40 font-medium"
                                                        : "border-border hover:bg-muted/50 text-foreground/80"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5",
                                                    isChecked ? "bg-primary border-primary/40 text-primary-foreground" : "border-border bg-card"
                                                )}>
                                                    {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                                </div>
                                                <div>
                                                    <div className="font-bold">{sec.name}</div>
                                                    <div className={cn("text-[10px]", isChecked ? "text-muted-foreground/60" : "text-muted-foreground")}>
                                                        {sec.desc}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </CardContent>
                            </Card>

                        </div>

                        {/* RIGHT COLUMN: DOCUMENT PREVIEW & ACTION CONTROLS */}
                        <div className="lg:col-span-7 space-y-6">
                            
                            {/* Document Title & Action Bar */}
                            <Card className="border-border shadow-md rounded-2xl bg-card p-6 space-y-5">
                                <div className="space-y-2">
                                    <label htmlFor="board-summary-report-title" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                        Report Title (Header on Document)
                                    </label>
                                    <input
                                        id="board-summary-report-title"
                                        type="text"
                                        aria-label="Report Title (Header on Document)"
                                        value={reportTitle}
                                        onChange={(e) => setReportTitle(e.target.value)}
                                        className="w-full text-base font-bold text-foreground px-4 py-2.5 rounded-xl border border-border focus:outline-none focus:ring-2 focus:ring-ring"
                                        placeholder="e.g. Executive Compliance & Cyber Posture Briefing"
                                    />
                                </div>

                                <div className="p-4 rounded-xl bg-muted border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <div className="text-xs font-bold text-foreground/80">Target Audience Profile</div>
                                        <div className="text-sm font-bold text-primary">{selectedPreset.targetAudience}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            onClick={() => handleExport('docx')}
                                            disabled={isGeneratingDocx || isGeneratingPdf}
                                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl h-10 px-4 text-xs transition-all shadow-md flex items-center"
                                        >
                                            {isGeneratingDocx ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                            ) : (
                                                <Download className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
                                            )}
                                            Export Word (.docx)
                                        </Button>

                                        <Button
                                            onClick={() => handleExport('pdf')}
                                            disabled={isGeneratingDocx || isGeneratingPdf}
                                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl h-10 px-4 text-xs transition-all shadow-md shadow-indigo-200 flex items-center"
                                        >
                                            {isGeneratingPdf ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                                            ) : (
                                                <Printer className="w-3.5 h-3.5 mr-1.5" />
                                            )}
                                            Print / PDF View
                                        </Button>
                                    </div>
                                </div>
                            </Card>

                            {/* Live Consulting Document Preview Sheet */}
                            <Card className="border-border shadow-xl rounded-2xl bg-card overflow-hidden">
                                <CardHeader className="bg-sidebar text-sidebar-foreground p-6 border-b border-sidebar-border">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Building className="w-5 h-5 text-sidebar-accent" />
                                            <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                                                DOCUMENT PREVIEW • {client.name.toUpperCase()}
                                            </span>
                                        </div>
                                        <Badge className="bg-sidebar-foreground/10 text-sidebar-foreground border-none text-[10px] font-mono">
                                            CONFIDENTIAL
                                        </Badge>
                                    </div>
                                    <h2 className="text-xl sm:text-2xl font-black text-primary-foreground mt-2">
                                        {reportTitle}
                                    </h2>
                                    <p className="text-xs text-muted-foreground font-mono mt-1">
                                        Generated by ComplianceOS Intelligence Suite™ • {new Date().toLocaleDateString()}
                                    </p>
                                </CardHeader>

                                <CardContent className="p-6 space-y-6 text-foreground/80 bg-muted/30">
                                    
                                    {/* AI Executive Summary Block */}
                                    <div className="p-4 rounded-xl bg-amber-50/80 border-l-4 border-amber-500 space-y-2">
                                        <div className="flex items-center gap-1.5 font-bold text-amber-900 text-xs uppercase tracking-wider">
                                            <Sparkles className="w-4 h-4 text-amber-600" />
                                            AI Executive Briefing & Key Takeaways
                                        </div>
                                        <p className="text-xs text-foreground/80 leading-relaxed font-medium">
                                            <strong>Key Takeaway:</strong> {client.name} maintains an overall compliance readiness score of <strong>{metrics.readinessPercent}%</strong> with <strong>{metrics.frameworkPostures.length}</strong> active frameworks mapped. Residual risk stands at <strong>{metrics.riskScore}</strong> with <strong>{metrics.criticalGaps}</strong> critical items requiring board attention.
                                        </p>
                                        <div className="text-[11px] text-foreground/80 pt-1">
                                            • <strong>Compliance Velocity:</strong> Operating at {metrics.complianceVelocity}x execution cadence.<br/>
                                            • <strong>Recommendation:</strong> Direct immediate mitigation toward identified high-severity findings before upcoming audit milestones.
                                        </div>
                                    </div>

                                    {/* Live KPI Metric Cards */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div className="p-3 rounded-xl bg-card border border-border shadow-xs">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Readiness</div>
                                            <div className="text-xl font-black text-primary">{metrics.readinessPercent}%</div>
                                            <div className="text-[10px] text-emerald-600 font-bold">+5% vs last period</div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-card border border-border shadow-xs">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Residual Risk</div>
                                            <div className="text-xl font-black text-amber-600">{metrics.riskScore}</div>
                                            <div className="text-[10px] text-muted-foreground font-medium">Risk Appetite: Met</div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-card border border-border shadow-xs">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Critical Gaps</div>
                                            <div className="text-xl font-black text-rose-600">{metrics.criticalGaps}</div>
                                            <div className="text-[10px] text-rose-600 font-bold">Action Required</div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-card border border-border shadow-xs">
                                            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Velocity</div>
                                            <div className="text-xl font-black text-emerald-600">{metrics.complianceVelocity}x</div>
                                            <div className="text-[10px] text-muted-foreground font-medium">Cadence: High</div>
                                        </div>
                                    </div>

                                    {/* Outline of Included Sections */}
                                    <div className="space-y-3 pt-2">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                            Document Structure ({selectedSections.length} Sections to be Compiled)
                                        </h4>
                                        <div className="divide-y divide-border bg-card rounded-xl border border-border overflow-hidden text-xs">
                                            {selectedSections.map((secId, idx) => {
                                                const sec = AVAILABLE_SECTIONS.find(s => s.id === secId);
                                                return (
                                                    <div key={secId} className="p-3 flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono text-muted-foreground font-bold">{idx + 1}.</span>
                                                            <span className="font-bold text-foreground/80">{sec?.name || secId}</span>
                                                        </div>
                                                        <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                                                            Auto-Bound
                                                        </Badge>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                </CardContent>
                            </Card>

                        </div>

                    </div>
                )}

                {/* TAB 3: REPORT HISTORY & VAULT */}
                {activeTab === 'history' && (
                    <Card className="border-border shadow-md rounded-2xl bg-card overflow-hidden">
                        <CardHeader className="bg-muted border-b border-border p-6 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-primary" />
                                    Generated Reports Vault & Audit Trail
                                </CardTitle>
                                <CardDescription className="text-xs text-muted-foreground">
                                    Historical record of all executive briefings, board packs, and audit dossiers compiled for this client.
                                </CardDescription>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => refetchHistory()}
                                className="border-border font-bold text-xs"
                            >
                                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                                Refresh Vault
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            {(!reportHistory || reportHistory.length === 0) ? (
                                <div className="p-12 text-center text-muted-foreground space-y-3">
                                    <FileText className="w-12 h-12 mx-auto text-muted-foreground/60" />
                                    <p className="text-sm font-medium">No reports generated yet in the vault.</p>
                                    <Button
                                        onClick={() => setActiveTab('studio')}
                                        className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-xs"
                                    >
                                        Generate First Report
                                    </Button>
                                </div>
                            ) : (
                                <div className="divide-y divide-border">
                                    {reportHistory.map((report: any) => (
                                        <div key={report.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-muted/50 transition-colors">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="font-bold text-foreground text-sm">{report.title}</h4>
                                                    <Badge variant="outline" className="text-[10px] font-bold bg-muted text-foreground/80 border-none">
                                                        {report.version || 'v1.0'}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {new Date(report.generatedAt).toLocaleString()}
                                                    </span>
                                                    <span>•</span>
                                                    <span>{Array.isArray(report.includedSections) ? `${report.includedSections.length} Sections` : 'Standard Pack'}</span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleExport('docx')}
                                                    className="border-border font-bold text-xs"
                                                >
                                                    <Download className="w-3.5 h-3.5 mr-1 text-sky-600" />
                                                    DOCX
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleExport('pdf')}
                                                    className="border-border font-bold text-xs"
                                                >
                                                    <Printer className="w-3.5 h-3.5 mr-1 text-primary" />
                                                    PDF
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

            </div>
        </DashboardLayout>
    );
}
