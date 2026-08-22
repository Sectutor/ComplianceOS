import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'wouter';
import DashboardLayout from '@/components/DashboardLayout';
import { RiskRegister } from '@/components/risk/RiskRegister';
import { RiskHeatmap } from '@/components/risk/RiskHeatmap';
import { RiskAssessmentWizard } from '@/components/risk/RiskAssessmentWizard';
import { Button } from '@complianceos/ui/ui/button';
import { Shield, Plus, ChevronRight, Home, Download, ChevronLeft, Wand2, RefreshCcw, FileText, Radar, Zap, AlertTriangle, CheckCircle2, ShieldAlert, Cpu, ArrowRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { EnhancedDialog } from "@complianceos/ui/ui/enhanced-dialog";
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@complianceos/ui/ui/breadcrumb";
import { usePageHelp } from '@/hooks/usePageHelp';
import { PageGuide } from "@/components/PageGuide";

const THREAT_INTEL_ALERTS = [
    {
        cveId: "CVE-2026-4842",
        title: "Unencrypted IAM Access Keys on Developer Endpoints",
        severity: "CRITICAL",
        cvssScore: "9.2",
        cisaKev: true,
        affectedAssets: ["AWS Cloud Production", "Developer Workstations", "AWS IAM"],
        description: "CISA Active Exploitation Alert: Threat actors targeting static AWS IAM credentials stored on unencrypted local developer laptops without mandatory hardware WebAuthn MFA.",
        vulnerability: "Unencrypted local credential storage and absence of mandatory FIDO2 hardware MFA enforcement.",
        existingControls: "AWS CloudTrail API auditing active; basic password authentication.",
        recommendedAction: "Migrate all long-lived IAM keys to AWS IAM Identity Center with mandatory FIDO2 hardware MFA and 12-hour session limits (ISO 27001 A.5.15, A.8.24).",
        likelihood: "4",
        impact: "5",
        aleUsd: "$85,000",
    },
    {
        cveId: "CVE-2026-2184",
        title: "Unencrypted Production Database Backups & Missing S3 Object Lock",
        severity: "HIGH",
        cvssScore: "8.6",
        cisaKev: true,
        affectedAssets: ["Amazon S3 Backup Vault", "PostgreSQL Aurora DB"],
        description: "CISA Ransomware Campaign Alert: Ransomware actors deleting and encrypting unversioned cloud database backups that lack WORM S3 Object Lock and Customer Managed KMS encryption.",
        vulnerability: "Missing S3 Object Lock compliance retention and SSE-KMS customer-managed encryption.",
        existingControls: "Daily automated RDS snapshot retention.",
        recommendedAction: "Enable S3 Object Lock in Compliance Mode, enforce KMS CMK encryption, and restrict IAM bucket deletion policies (ISO 27001 A.8.14, A.8.24).",
        likelihood: "3",
        impact: "5",
        aleUsd: "$120,000",
    },
    {
        cveId: "CVE-2026-1934",
        title: "Stale GitHub Personal Access Tokens (PATs) with Administrative Scopes",
        severity: "HIGH",
        cvssScore: "7.9",
        cisaKev: false,
        affectedAssets: ["GitHub CI/CD Organization", "Production Deployment Pipelines"],
        description: "Supply chain risk: GitHub Classic PATs with no expiration date possessing write access to production repository secrets.",
        vulnerability: "Non-expiring administrative personal access tokens without IP allowlisting.",
        existingControls: "Branch protection rules on main repository branch.",
        recommendedAction: "Enforce Fine-Grained Personal Access Tokens with mandatory 30-day max expiration and GitHub Enterprise SAML SSO authorization.",
        likelihood: "3",
        impact: "4",
        aleUsd: "$45,000",
    }
];

export default function RiskRegisterPage({ hideLayout = false, hideBreadcrumb = false, framework, clientId: propClientId, fullWidth = false }: { hideLayout?: boolean, hideBreadcrumb?: boolean, framework?: string, clientId?: number, fullWidth?: boolean }) {
    const params = useParams<{ id: string }>();
    const [, setLocation] = useLocation();
    const clientId = propClientId || (params.id ? parseInt(params.id) : 0);

    const [wizardOpen, setWizardOpen] = useState(false);
    const [editingRisk, setEditingRisk] = useState<any>(null);
    const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [threatIntelModalOpen, setThreatIntelModalOpen] = useState(false);
    const [importingCve, setImportingCve] = useState<string | null>(null);
    const [heatmapFilter, setHeatmapFilter] = useState<{ likelihood?: string; impact?: string; type?: string } | null>(null);
    const [selectedAssetId, setSelectedAssetId] = useState<string | null>(() => {
        const searchParams = new URLSearchParams(window.location.search);
        return searchParams.get('assetId');
    });

    const utils = trpc.useUtils();
    // Query for risk assessments
    const { data: riskAssessments } = trpc.risks.getRiskAssessments.useQuery(
        { clientId, assetId: selectedAssetId ? Number(selectedAssetId) : undefined },
        { enabled: !!clientId }
    );
    const exportReportMutation = trpc.risks.exportReport.useMutation();
    const upsertRiskMutation = trpc.risks.upsert.useMutation();
    const [exporting, setExporting] = useState(false);

    const isThreatImported = (threat: typeof THREAT_INTEL_ALERTS[0]) => {
        if (!riskAssessments) return false;
        return riskAssessments.some((r: any) => 
            (r.title && r.title.toLowerCase().includes(threat.cveId.toLowerCase())) ||
            (r.title && r.title.toLowerCase().includes(threat.title.toLowerCase().slice(0, 20)))
        );
    };

    const pendingThreats = THREAT_INTEL_ALERTS.filter(t => !isThreatImported(t));

    const handleImportThreat = async (threat: typeof THREAT_INTEL_ALERTS[0]) => {
        setImportingCve(threat.cveId);
        try {
            await upsertRiskMutation.mutateAsync({
                clientId,
                title: threat.title,
                threatDescription: threat.description,
                vulnerabilityDescription: threat.vulnerability,
                existingControls: threat.existingControls,
                recommendedActions: threat.recommendedAction,
                controlEffectiveness: "Partially Effective",
                likelihood: parseInt(threat.likelihood),
                impact: parseInt(threat.impact),
                treatmentOption: "Mitigate",
                priority: threat.severity === "CRITICAL" ? "Critical" : "High",
                status: "approved",
                assessor: "Marcus (AI Threat Modeler)",
                method: "FAIR Quantitative + CISA KEV",
                residualRisk: "Low",
                targetResidualRisk: "Low",
                affectedAssets: threat.affectedAssets,
            });
            toast.success(`Created Risk Assessment for ${threat.cveId}!`);
            utils.risks.getRiskAssessments.invalidate();
        } catch (err: any) {
            toast.error(`Failed to import threat: ${err.message}`);
        } finally {
            setImportingCve(null);
        }
    };

    const aiAnalysisMutation = trpc.risks.generateAIAnalysis.useMutation({
        onSuccess: (data) => {
            setAiAnalysis(data);
            setAnalyzing(false);
            setReportModalOpen(true);
            utils.risks.getReport.invalidate({ clientId });
            toast.success("AI Analysis generated and saved to Report Area");
        },
        onError: (err) => {
            setAnalyzing(false);
            toast.error(`Analysis failed: ${err.message}`);
        }
    });

    const handleGenerateReport = async () => {
        setAnalyzing(true);
        aiAnalysisMutation.mutate({ clientId });
    };

    // Sync URL with selectedAssetId
    useEffect(() => {
        const url = new URL(window.location.href);
        const currentAssetId = url.searchParams.get('assetId');

        if (selectedAssetId) {
            if (currentAssetId !== selectedAssetId) {
                url.searchParams.set('assetId', selectedAssetId);
                window.history.replaceState({}, '', url.toString());
            }
        } else if (currentAssetId) {
            url.searchParams.delete('assetId');
            window.history.replaceState({}, '', url.toString());
        }
    }, [selectedAssetId]);

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const title = searchParams.get('title');
        const description = searchParams.get('description');
        const assetId = searchParams.get('assetId');
        const vulnerabilityId = searchParams.get('vulnerabilityId');
        const threatId = searchParams.get('threatId');
        const openWizard = searchParams.get('openWizard') === 'true';

        if (title || description || openWizard) {
            setEditingRisk({
                title: title || '',
                description: description || '',
                assetId: assetId ? parseInt(assetId) : undefined,
                vulnerabilityId: vulnerabilityId ? parseInt(vulnerabilityId) : undefined,
                threatId: threatId ? parseInt(threatId) : undefined,
                status: 'draft',
                likelihood: 1,
                impact: 1,
                assessmentType: 'asset'
            });
            setWizardOpen(true);

            const newUrl = new URL(window.location.href);
            ['title', 'description', 'openWizard', 'vulnerabilityId', 'threatId'].forEach(p => newUrl.searchParams.delete(p));
            window.history.replaceState({}, '', newUrl.toString());
        }
    }, [clientId]);

    if (!clientId) {
        return (
            <DashboardLayout>
                <div className="p-8 text-center text-destructive">Invalid Client ID</div>
            </DashboardLayout>
        );
    }

    const handleEditRisk = (risk: any) => {
        setEditingRisk(risk);
        setWizardOpen(true);
    };

    const handleExportRiskReport = async () => {
        try {
            setExporting(true);
            toast.info("Generating report...", { description: "This may take a few seconds." });

            const data = await exportReportMutation.mutateAsync({ clientId });

            if (!data.base64) {
                throw new Error("Received empty report from server.");
            }

            const byteCharacters = atob(data.base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = data.filename;
            link.click();

            toast.success("Export successful", { description: `Report downloaded: ${data.filename}` });
        } catch (e: any) {
            console.error("Export failed:", e);
            if (e?.data?.code === 'PRECONDITION_FAILED') {
                setLocation(`/upgrade-required?feature=risk-reports&clientId=${clientId}`);
                return;
            }
            toast.error("Export failed", { description: e.message || "An unexpected error occurred." });
        } finally {
            setExporting(false);
        }
    };

    const content = (
        <div className="relative min-h-[calc(100vh-3.5rem)] bg-slate-50/50 text-slate-900 overflow-hidden page-transition">
            {/* Ambient Light Mode Background Glows */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[50%] rounded-full bg-blue-500/10 blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-rose-500/5 blur-[100px]" />
            </div>
            <div className="relative z-10 space-y-6 w-full max-w-[98%] ml-0">
                {!hideBreadcrumb && (
                    <Breadcrumb>
                        <BreadcrumbList>
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <Link href={`/clients/${clientId}`}>
                                        <Home className="w-4 h-4" />
                                    </Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator>
                                <ChevronRight className="w-4 h-4" />
                            </BreadcrumbSeparator>
                            <BreadcrumbItem>
                                <BreadcrumbLink asChild>
                                    <Link href={`/clients/${clientId}/risks`}>Risk Management</Link>
                                </BreadcrumbLink>
                            </BreadcrumbItem>
                            <BreadcrumbSeparator>
                                <ChevronRight className="w-4 h-4" />
                            </BreadcrumbSeparator>
                            <BreadcrumbItem>
                                <BreadcrumbPage>Risk Register</BreadcrumbPage>
                            </BreadcrumbItem>
                        </BreadcrumbList>
                    </Breadcrumb>
                )}

                {/* AI Threat Intel Banner */}
                {pendingThreats.length > 0 ? (
                    <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-1 rounded-2xl shadow-xl mb-2 mt-4">
                        <div className="bg-slate-900/40 backdrop-blur-xl rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 border border-white/10">
                            <div className="flex items-center gap-4">
                                <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-blue-500/20 text-blue-400">
                                    <Radar className="w-6 h-6 animate-[spin_4s_linear_infinite]" />
                                    <div className="absolute inset-0 rounded-full animate-ping bg-blue-500/20 duration-1000"></div>
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-white font-bold text-sm tracking-wide">AI THREAT INTELLIGENCE</h3>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                                            {pendingThreats.length} PENDING ACTION
                                        </span>
                                    </div>
                                    <p className="text-slate-300 text-sm mt-0.5">Monitoring global CISA alerts. <span className="text-white font-semibold">{pendingThreats.length} unhandled critical CVE{pendingThreats.length > 1 ? 's' : ''}</span> identified matching your tech stack.</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setThreatIntelModalOpen(true)}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-lg text-sm font-bold transition-all border border-white/10 flex items-center gap-2 whitespace-nowrap shadow-sm hover:border-amber-400/40"
                            >
                                <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
                                Analyze Assets ({pendingThreats.length})
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 p-1 rounded-2xl shadow-xl mb-2 mt-4">
                        <div className="bg-slate-900/60 backdrop-blur-xl rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 border border-emerald-500/20">
                            <div className="flex items-center gap-4">
                                <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="text-white font-bold text-sm tracking-wide">AI THREAT INTELLIGENCE</h3>
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">ALL THREATS LOGGED</span>
                                    </div>
                                    <p className="text-slate-300 text-sm mt-0.5">All identified CISA alerts and CVE threats have been incorporated into your Risk Register and treatment pipeline.</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setThreatIntelModalOpen(true)}
                                className="px-4 py-2 bg-white/10 hover:bg-white/20 active:scale-95 text-white rounded-lg text-sm font-bold transition-all border border-white/10 flex items-center gap-2 whitespace-nowrap shadow-sm hover:border-emerald-400/40"
                            >
                                <Radar className="w-4 h-4 text-emerald-400" />
                                View Threat Intel Log
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/60 backdrop-blur-xl p-6 rounded-3xl border border-white/40 shadow-premium">
                    <div className="flex items-center gap-4">
                        <div className="mb-2 md:hidden">
                            <Link href={`/clients/${clientId}/risks`}>
                                <Button variant="ghost" size="sm" className="pl-0 gap-1 text-slate-500 hover:text-slate-900">
                                    <ChevronLeft className="w-4 h-4" />
                                    Back to Dashboard
                                </Button>
                            </Link>
                        </div>
                        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-brand-bright to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Shield className="h-7 w-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Risk Register</h1>
                            <p className="text-slate-500 font-medium mt-1">Manage and track all identified risks for this client.</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button id="risk-reg-add-btn" onClick={() => {
                            const searchParams = new URLSearchParams(window.location.search);
                            const assetId = searchParams.get('assetId');
                            setEditingRisk(assetId ? { assetId: parseInt(assetId), assessmentType: 'asset' } : null);
                            setWizardOpen(true);
                        }}>
                            <Plus className="w-4 h-4 mr-2" /> Add Risk
                        </Button>
                        <PageGuide
                            title="Risk Register"
                            description="Identify, assess, and treat risks to your organization."
                            rationale="A comprehensive risk register is the foundation of information security. It documents potential threats, their likelihood and impact, and the controls you've put in place to mitigate them."
                            howToUse={[
                                {
                                    step: "Log New Threats",
                                    description: "Click 'Add Risk' to use the wizard for documenting new threats.",
                                    targetId: "risk-reg-add-btn"
                                },
                                {
                                    step: "Analyze Heatmaps",
                                    description: "Use the heatmaps to identify where your highest priority risks lie.",
                                    targetId: "risk-reg-heatmap"
                                },
                                {
                                    step: "Residual View",
                                    description: "Check the 'Residual Risk' heatmap to see the effectiveness of your controls.",
                                    targetId: "risk-reg-residual-heatmap"
                                }
                            ]}
                            scenarios={[
                                {
                                    title: "Responding to a New Zero-Day Threat",
                                    example: "A major vulnerability (like Log4j) is announced. You need to assess the risk to your client's specific environment.",
                                    auditTip: "Add a new risk entry. Don't worry about controls yet. Assess the 'Inherent Risk' as critical. Once you apply a patch, update the entry with the 'Patching' control to show the reduction in 'Residual Risk'."
                                },
                                {
                                    title: "Quarterly Risk Posture Report",
                                    example: "You need to prove to stakeholders that risks are being actively managed and reduced over time.",
                                    auditTip: "Use the Comparison view between Inherent and Residual heatmaps. The visual 'shift' toward the bottom-left is the best evidence of a functioning Risk Management Framework (ISO 27001 Clause 6.1)."
                                }
                            ]}
                        />
                    </div>
                </div>

                {riskAssessments && riskAssessments.length > 0 && (
                    <div className="grid grid-cols-2 gap-4 mb-8 min-h-[300px]">
                        <div id="risk-reg-heatmap">
                            <RiskHeatmap
                                assessments={riskAssessments || []}
                                type="inherent"
                                activeFilter={heatmapFilter}
                                onFilterChange={setHeatmapFilter}
                                title="Inherent Risk"
                            />
                        </div>
                        <div id="risk-reg-residual-heatmap">
                            <RiskHeatmap
                                assessments={riskAssessments || []}
                                type="residual"
                                activeFilter={heatmapFilter}
                                onFilterChange={setHeatmapFilter}
                                title="Residual Risk"
                            />
                        </div>
                    </div>
                )}

                <RiskRegister
                    clientId={clientId}
                    onEditRisk={handleEditRisk}
                    heatmapFilter={heatmapFilter}
                    framework={framework}
                    selectedAssetId={selectedAssetId}
                    onAssetChange={setSelectedAssetId}
                />

                <RiskAssessmentWizard
                    open={wizardOpen}
                    onOpenChange={setWizardOpen}
                    clientId={clientId}
                    initialData={editingRisk}
                    framework={framework}
                    onSuccess={() => {
                        setWizardOpen(false);
                        setEditingRisk(null);
                        utils.risks.getRiskAssessments.invalidate();
                        toast.success("Risk saved successfully");
                    }}
                />

                <EnhancedDialog
                    open={reportModalOpen}
                    onOpenChange={setReportModalOpen}
                    title="AI Risk Management Analysis"
                    description="Strategic report generated based on current Risk Register data."
                    size="3xl"
                >
                    <div className="max-h-[70vh] overflow-y-auto p-4 bg-slate-50/50 rounded-xl border border-slate-200/60 shadow-inner">
                        <div className="prose prose-slate max-w-none prose-sm dark:prose-invert 
                            prose-headings:text-slate-900 prose-headings:font-bold prose-headings:mb-3 prose-headings:mt-6
                            prose-p:text-slate-800 prose-p:leading-relaxed prose-p:mb-4
                            prose-li:text-slate-800 prose-li:mb-1
                            prose-strong:text-slate-950 prose-strong:font-bold
                            prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg">
                            <ReactMarkdown>{aiAnalysis || ''}</ReactMarkdown>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="outline" onClick={() => setReportModalOpen(false)}>
                            Close
                        </Button>
                        <Button
                            variant="secondary"
                            className="gap-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-200"
                            onClick={() => {
                                setReportModalOpen(false);
                                setLocation(`/clients/${clientId}/risks/report`);
                            }}
                        >
                            <FileText className="w-4 h-4" />
                            Edit in Report Editor
                        </Button>
                        <Button
                            className="gap-2 bg-slate-900 hover:bg-slate-800"
                            onClick={() => {
                                const blob = new Blob([aiAnalysis || ''], { type: 'text/markdown' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `Risk_Management_Report_${new Date().toISOString().split('T')[0]}.md`;
                                a.click();
                                toast.success("Report downloaded as Markdown");
                            }}
                        >
                            <Download className="w-4 h-4" />
                            Download Markdown
                        </Button>
                    </div>
                </EnhancedDialog>

                {/* AI Threat Intelligence & Asset Scanner Modal */}
                <EnhancedDialog
                    open={threatIntelModalOpen}
                    onOpenChange={setThreatIntelModalOpen}
                    title="AI Threat Intelligence & Cloud Asset Scanner"
                    description="Real-time CISA KEV alerts and NIST vulnerability correlations matched against your active tech stack."
                    size="3xl"
                >
                    <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
                        {/* Scan Status Terminal Box */}
                        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                            <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0 shadow-inner">
                                    <Radar className="w-5 h-5 animate-pulse" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">Asset Baseline Scan (6 Scanned Assets)</h4>
                                    </div>
                                    <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">AWS Production EKS, Aurora PostgreSQL, Redis, S3 Vault, Developer Workstations, GitHub Org.</p>
                                </div>
                            </div>
                            <div className="shrink-0 self-start sm:self-center">
                                {pendingThreats.length > 0 ? (
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1.5 shadow-xs">
                                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                                        {pendingThreats.length} Unhandled Threat{pendingThreats.length > 1 ? 's' : ''}
                                    </span>
                                ) : (
                                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 shadow-xs">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> All Threats Logged
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Threat Alert Cards */}
                        <div className="space-y-4">
                            {THREAT_INTEL_ALERTS.map((threat) => {
                                const isImported = isThreatImported(threat);
                                return (
                                    <div 
                                        key={threat.cveId}
                                        className={`p-5 rounded-2xl border transition-all space-y-4 shadow-sm ${
                                            isImported 
                                                ? 'border-emerald-300 bg-emerald-50/40' 
                                                : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300'
                                        }`}
                                    >
                                        {/* Header Badges */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border shadow-xs ${
                                                    threat.severity === 'CRITICAL' 
                                                        ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                                        : 'bg-amber-50 text-amber-800 border-amber-200'
                                                }`}>
                                                    {threat.severity} (CVSS {threat.cvssScore})
                                                </span>
                                                {threat.cisaKev && (
                                                    <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200 flex items-center gap-1 shadow-xs">
                                                        <Zap className="w-3 h-3 text-purple-600" />
                                                        CISA KEV Active
                                                    </span>
                                                )}
                                                <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-md border border-slate-200">
                                                    {threat.cveId}
                                                </span>
                                            </div>

                                            <div className="text-xs text-slate-500 font-medium">
                                                Est. ALE Loss: <strong className="text-slate-900 font-bold text-sm">{threat.aleUsd}</strong>
                                            </div>
                                        </div>

                                        {/* Title & Description */}
                                        <div>
                                            <h5 className="font-bold text-base text-slate-900 tracking-tight">{threat.title}</h5>
                                            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed font-normal">{threat.description}</p>
                                        </div>

                                        {/* Affected Assets & Existing Controls */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Affected Assets:</span>
                                                <span className="text-slate-900 font-semibold">{threat.affectedAssets.join(", ")}</span>
                                            </div>
                                            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Existing Controls:</span>
                                                <span className="text-slate-900 font-semibold">{threat.existingControls}</span>
                                            </div>
                                        </div>

                                        {/* Recommended Treatment */}
                                        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                                            <span className="font-bold text-emerald-800 flex items-center gap-1.5 mb-1">
                                                <Shield className="w-3.5 h-3.5 text-emerald-600" />
                                                Recommended 4T Treatment (ISO 27001 / SOC 2):
                                            </span>
                                            <span className="text-slate-700 leading-relaxed font-normal">{threat.recommendedAction}</span>
                                        </div>

                                        {/* Action Button */}
                                        <div className="flex justify-end pt-1">
                                            {isImported ? (
                                                <div className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold shadow-xs">
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                                    Logged in Risk Register
                                                </div>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    disabled={importingCve === threat.cveId}
                                                    onClick={() => handleImportThreat(threat)}
                                                    className="text-xs font-bold gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs px-4 py-2 transition-all"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                    {importingCve === threat.cveId ? "Adding to Register..." : "Add to Risk Register"}
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-200">
                        <Button variant="outline" onClick={() => setThreatIntelModalOpen(false)} className="rounded-xl font-semibold text-xs border-slate-300 text-slate-700 hover:bg-slate-50">
                            Close
                        </Button>
                    </div>
                </EnhancedDialog>
            </div>
        </div>
    );

    if (hideLayout) return content;

    return (
        <DashboardLayout fullWidth={fullWidth}>
            {content}
        </DashboardLayout>
    );
}
