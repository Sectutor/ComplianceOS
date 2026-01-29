import React, { useState } from 'react';
import { useParams, Link } from 'wouter';
import DashboardLayout from '@/components/DashboardLayout';
import { RiskRegister } from '@/components/risk/RiskRegister';
import { RiskHeatmap } from '@/components/risk/RiskHeatmap';
import { RiskAssessmentWizard } from '@/components/risk/RiskAssessmentWizard';
import { Button } from '@complianceos/ui/ui/button';
import { Plus, ChevronRight, Home, Download, ChevronLeft } from 'lucide-react';
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

export default function RiskRegisterPage() {
    usePageHelp({
        pageTitle: "Risk Register",
        description: "This is the central repository for all identified risks. Use this page to add new risks, assess their inherent and residual levels, and assign owners.",
        keyTopics: ["Risk Assessment", "Inherent Risk", "Residual Risk", "Risk Treatment", "Risk Owners"],
        dataSummary: {
            context: "User is viewing the Risk Register table and heatmaps."
        }
    });
    const params = useParams<{ id: string }>();
    const clientId = params.id ? parseInt(params.id) : 0;
    const utils = trpc.useUtils();
    const [wizardOpen, setWizardOpen] = useState(false);
    const [editingRisk, setEditingRisk] = useState<any>(null);
    const [heatmapFilter, setHeatmapFilter] = useState<{ likelihood?: string; impact?: string; type?: string } | null>(null);

    // Query for risk assessments
    const { data: riskAssessments } = trpc.risks.getRiskAssessments.useQuery(
        { clientId },
        { enabled: !!clientId }
    );
    const exportReportMutation = trpc.risks.exportReport.useMutation();
    const [exporting, setExporting] = useState(false);

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
            toast.error("Export failed", { description: e.message || "An unexpected error occurred." });
        } finally {
            setExporting(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-6">
                {/* Breadcrumb Navigation */}
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

                <div className="flex items-center justify-between">
                    <div>
                        <div className="mb-2">
                            <Link href={`/clients/${clientId}/risks`}>
                                <Button variant="ghost" size="sm" className="pl-0 gap-1 text-muted-foreground hover:text-foreground">
                                    <ChevronLeft className="w-4 h-4" />
                                    Back to Dashboard
                                </Button>
                            </Link>
                        </div>
                        <h1 className="text-3xl font-bold text-slate-950">Risk Register</h1>
                        <p className="text-slate-900 mt-1 font-medium">Manage and track all identified risks for this client.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={handleExportRiskReport}
                            disabled={exporting || !clientId}
                            className="gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Export Risk Report
                        </Button>
                        <Button onClick={() => { setEditingRisk(null); setWizardOpen(true); }}>
                            <Plus className="w-4 h-4 mr-2" /> Add Risk
                        </Button>
                    </div>
                </div>

                {/* Heatmaps Row */}
                {riskAssessments && riskAssessments.length > 0 && (
                    <div className="h-64 grid grid-cols-2 gap-4 mb-8">
                        <RiskHeatmap
                            assessments={riskAssessments || []}
                            type="inherent"
                            activeFilter={heatmapFilter}
                            onFilterChange={setHeatmapFilter}
                            title="Inherent Risk"
                        />
                        <RiskHeatmap
                            assessments={riskAssessments || []}
                            type="residual"
                            activeFilter={heatmapFilter}
                            onFilterChange={setHeatmapFilter}
                            title="Residual Risk"
                        />
                    </div>
                )}

                {/* Risk Register Table */}
                <RiskRegister clientId={clientId} onEditRisk={handleEditRisk} heatmapFilter={heatmapFilter} />

                {/* Wizard Modal */}
                <RiskAssessmentWizard
                    open={wizardOpen}
                    onOpenChange={setWizardOpen}
                    clientId={clientId}
                    initialData={editingRisk}
                    onSuccess={() => {
                        setWizardOpen(false);
                        setEditingRisk(null);
                        utils.risks.getRiskAssessments.invalidate();
                        toast.success("Risk saved successfully");
                    }}
                />
            </div>
        </DashboardLayout>
    );
}
