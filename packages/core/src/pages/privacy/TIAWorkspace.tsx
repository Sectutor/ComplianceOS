import React, { useState, useEffect } from 'react';
import { useClientContext } from "@/contexts/ClientContext";
import { useParams } from "wouter";
import { Button } from "@complianceos/ui/ui/button";
import { Plus, Globe, Shield, ArrowRight, Loader2, Sparkles, Trash2, CheckCircle2, AlertTriangle, ShieldCheck, ShieldAlert, FileText, CheckCircle } from "lucide-react";
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { toast } from "sonner";
import { EnhancedDialog } from "@complianceos/ui/ui/enhanced-dialog";
import { Input } from "@complianceos/ui/ui/input";
import { Label } from "@complianceos/ui/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { cn } from "@/lib/utils";

// Presets carry the display metadata; enum fields map onto the relational
// international_transfers columns (destination_country char(2), transfer_tool enum).
const TIA_PRESETS = [
    {
        name: "US Cloud Hosting (AWS / GCP / Azure)",
        destinationCountry: "US",
        importerName: "Amazon Web Services, Inc.",
        transferTool: "scc_2021" as const,
        sccModule: "c2p" as const,
        dataCategories: "Customer account data, application databases, access logs",
        surveillanceRisk: "Moderate",
        supplementaryMeasures: "AES-256 Customer-Managed Encryption Keys (CMEK) held in EU",
        recommendedOutcome: "Transfer Permitted with Technical Safeguards"
    },
    {
        name: "Enterprise CRM & Sales Telemetry (Salesforce)",
        destinationCountry: "US",
        importerName: "Salesforce, Inc.",
        transferTool: "bcr" as const,
        sccModule: null,
        dataCategories: "Sales leads, business contacts, deal communications",
        surveillanceRisk: "Low",
        supplementaryMeasures: "Hyperforce EU data residency + TLS 1.3 in transit",
        recommendedOutcome: "Transfer Permitted"
    },
    {
        name: "Offshore 24/7 Engineering & Tier-3 Support (India)",
        destinationCountry: "IN",
        importerName: "Global Support Services Pvt Ltd",
        transferTool: "scc_2021" as const,
        sccModule: "c2p" as const,
        dataCategories: "Support tickets, error logs, user IDs (read-only ephemeral access)",
        surveillanceRisk: "High",
        supplementaryMeasures: "Zero data storage locally, ephemeral VDI access, full session recording & pseudonymized IDs",
        recommendedOutcome: "Transfer Permitted with Strict VDI Isolation"
    }
];

const COUNTRIES = [
    { code: "US", label: "United States" },
    { code: "IN", label: "India" },
    { code: "CN", label: "China" },
    { code: "BR", label: "Brazil" },
    { code: "GB", label: "United Kingdom (Adequate)" },
    { code: "CH", label: "Switzerland (Adequate)" },
    { code: "JP", label: "Japan (Adequate)" },
    { code: "XX", label: "Other Non-Adequate Country" },
];

const TRANSFER_TOOLS = [
    { value: "scc_2021", label: "Standard Contractual Clauses (SCCs 2021)" },
    { value: "bcr", label: "Binding Corporate Rules (BCRs)" },
    { value: "adequacy", label: "Adequacy Decision (incl. EU-US DPF)" },
    { value: "derogation", label: "Derogation (e.g. Explicit Consent, Art. 49)" },
    { value: "ad_hoc", label: "Ad-Hoc / Other Safeguard" },
];

const SCC_MODULES = [
    { value: "c2c", label: "Module 1: Controller-to-Controller" },
    { value: "c2p", label: "Module 2: Controller-to-Processor" },
    { value: "p2p", label: "Module 3: Processor-to-Processor" },
    { value: "p2c", label: "Module 4: Processor-to-Controller" },
];

export default function TIAWorkspace() {
    const { selectedClientId } = useClientContext();
    const clientId = selectedClientId || 0;
    const params = useParams<{ transferId?: string }>();
    const [createOpen, setCreateOpen] = useState(false);
    const [evalOpen, setEvalOpen] = useState(false);
    const [selectedTransfer, setSelectedTransfer] = useState<any>(null);

    const [newTiaData, setNewTiaData] = useState({
        transferName: "",
        destinationCountry: "US",
        importerName: "",
        transferTool: "scc_2021",
        sccModule: "c2p",
        dataCategories: "Customer personal data, transactional telemetry",
        supplementaryMeasures: "End-to-end encryption with EU-held keys (CMEK)",
        surveillanceRisk: "Moderate",
        notes: ""
    });

    const [evalForm, setEvalForm] = useState({
        transferTool: "scc_2021",
        sccModule: "c2p",
        surveillanceRisk: "Moderate",
        dpfCertified: "yes",
        cmekEnabled: "yes",
        warrantCanary: "yes",
        dpoDetermination: "Transfer Permitted with Supplementary Safeguards",
        notes: ""
    });

    const utils = trpc.useUtils();
    const { data: transfers, isLoading } = trpc.transfers.list.useQuery(
        { clientId },
        { enabled: !!clientId }
    );

    const createTransferMutation = trpc.transfers.create.useMutation();
    const saveTiaMutation = trpc.transfers.saveTIA.useMutation();
    const updateTransferMutation = trpc.transfers.update.useMutation();
    const deleteMutation = trpc.transfers.delete.useMutation({
        onSuccess: () => {
            toast.success("Transfer assessment deleted");
            utils.transfers.list.invalidate({ clientId });
            utils.privacy.getPrivacyStats.invalidate();
        },
        onError: (err: any) => toast.error(`Failed to delete: ${err.message}`)
    });

    // Deep link /clients/:id/privacy/transfers/:transferId opens the evaluation
    useEffect(() => {
        if (transfers && params.transferId && !evalOpen) {
            const target = transfers.find((t: any) => t.id === parseInt(params.transferId!));
            if (target) {
                handleOpenEval(target);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transfers, params.transferId]);

    const resetNewTiaData = () => {
        setNewTiaData({
            transferName: "",
            destinationCountry: "US",
            importerName: "",
            transferTool: "scc_2021",
            sccModule: "c2p",
            dataCategories: "Customer personal data, transactional telemetry",
            supplementaryMeasures: "End-to-end encryption with EU-held keys (CMEK)",
            surveillanceRisk: "Moderate",
            notes: ""
        });
    };

    const handleApplyPreset = (preset: typeof TIA_PRESETS[0]) => {
        setNewTiaData({
            transferName: preset.name,
            destinationCountry: preset.destinationCountry,
            importerName: preset.importerName,
            transferTool: preset.transferTool,
            sccModule: preset.sccModule || "c2p",
            dataCategories: preset.dataCategories,
            supplementaryMeasures: preset.supplementaryMeasures,
            surveillanceRisk: preset.surveillanceRisk,
            notes: `Recommended Outcome: ${preset.recommendedOutcome}`
        });
    };

    const riskLevelFromUi = (surveillanceRisk: string) =>
        surveillanceRisk === "High" ? "high" : surveillanceRisk === "Low" ? "low" : "medium";

    const handleCreate = async () => {
        if (!newTiaData.transferName.trim() || !newTiaData.destinationCountry) {
            toast.error("Please provide a transfer name and destination country");
            return;
        }

        try {
            // The transfer record is the Chapter V registry row; the TIA is its
            // versioned assessment attached via transferId.
            const transfer = await createTransferMutation.mutateAsync({
                clientId,
                title: newTiaData.transferName.trim(),
                destinationCountry: newTiaData.destinationCountry,
                transferTool: newTiaData.transferTool as any,
                sccModule: newTiaData.transferTool === "scc_2021" ? (newTiaData.sccModule as any) : undefined,
            });
            await saveTiaMutation.mutateAsync({
                transferId: transfer.id,
                clientId,
                responses: {
                    importerName: newTiaData.importerName,
                    dataCategories: newTiaData.dataCategories,
                    supplementaryMeasures: newTiaData.supplementaryMeasures,
                    surveillanceRisk: newTiaData.surveillanceRisk,
                    transferDate: new Date().toISOString(),
                    notes: newTiaData.notes
                },
                status: "draft",
                riskLevel: riskLevelFromUi(newTiaData.surveillanceRisk)
            });
            toast.success("Transfer Impact Assessment Created");
            setCreateOpen(false);
            resetNewTiaData();
            utils.transfers.list.invalidate({ clientId });
            utils.privacy.getPrivacyStats.invalidate();
        } catch (err: any) {
            toast.error(`Failed to create TIA: ${err?.message || 'Please try again.'}`);
        }
    };

    const handleOpenEval = (transfer: any) => {
        setSelectedTransfer(transfer);
        const tia = transfer.latestTia;
        const resp = tia?.questionnaireData || {};
        setEvalForm({
            transferTool: transfer.transferTool || "scc_2021",
            sccModule: transfer.sccModule || "c2p",
            surveillanceRisk: resp.surveillanceRisk || "Moderate",
            dpfCertified: resp.dpfCertified || "yes",
            cmekEnabled: resp.cmekEnabled || "yes",
            warrantCanary: resp.warrantCanary || "yes",
            dpoDetermination: resp.dpoDetermination || "Transfer Permitted with Supplementary Safeguards",
            notes: resp.notes || ""
        });
        setEvalOpen(true);
    };

    const handleSaveEval = async () => {
        if (!selectedTransfer) return;
        const prev = selectedTransfer.latestTia?.questionnaireData || {};

        try {
            await saveTiaMutation.mutateAsync({
                transferId: selectedTransfer.id,
                clientId,
                // Re-evaluating a completed TIA creates the next version
                version: selectedTransfer.latestTia ? (selectedTransfer.latestTia.version || 1) + 1 : 1,
                responses: {
                    ...prev,
                    transferTool: TRANSFER_TOOLS.find(t => t.value === evalForm.transferTool)?.label || evalForm.transferTool,
                    sccModule: evalForm.sccModule,
                    surveillanceRisk: evalForm.surveillanceRisk,
                    dpfCertified: evalForm.dpfCertified,
                    cmekEnabled: evalForm.cmekEnabled,
                    warrantCanary: evalForm.warrantCanary,
                    dpoDetermination: evalForm.dpoDetermination,
                    notes: evalForm.notes,
                    evaluatedAt: new Date().toISOString()
                },
                status: "completed",
                riskLevel: riskLevelFromUi(evalForm.surveillanceRisk)
            });
            // Move the transfer itself out of 'pending' once its TIA is signed off
            await updateTransferMutation.mutateAsync({
                id: selectedTransfer.id,
                status: evalForm.dpoDetermination.includes("Suspended") ? "risk_flagged" : "active",
            }).catch(() => undefined);
            toast.success("Schrems II review completed");
            setEvalOpen(false);
            setSelectedTransfer(null);
            utils.transfers.list.invalidate({ clientId });
            utils.privacy.getPrivacyStats.invalidate();
        } catch (err: any) {
            toast.error(`Failed to save review: ${err?.message || 'Please try again.'}`);
        }
    };

    // Calculate metrics
    const totalTias = transfers?.length || 0;
    const completedTias = transfers?.filter((t: any) => t.latestTia?.status === 'completed').length || 0;
    const highRiskTias = transfers?.filter((t: any) =>
        t.latestTia?.riskLevel === 'high' || t.latestTia?.questionnaireData?.surveillanceRisk === 'High'
    ).length || 0;

    const countryLabel = (code: string) => COUNTRIES.find(c => c.code === code)?.label || code;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <Globe className="w-7 h-7 text-brand-bright" />
                        Transfer Impact Assessments (TIA)
                    </h1>
                    <p className="text-slate-500 text-sm">
                        Evaluate third-country surveillance laws, SCC validity, and supplementary measures (EDPB Recommendations 01/2020 & Schrems II).
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        onClick={() => setCreateOpen(true)}
                        className="bg-brand-bright hover:bg-brand text-white font-bold h-11 px-6 rounded-xl shadow-lg shadow-sky-100 transition-all active:scale-95"
                    >
                        <Plus className="mr-2 h-4 w-4" /> New Transfer Assessment
                    </Button>
                </div>
            </div>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <Card className="border-none shadow-md shadow-slate-200/50 rounded-2xl bg-white ring-1 ring-slate-200/50 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Total TIAs</p>
                            <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalTias}</h3>
                        </div>
                        <div className="h-10 w-10 bg-sky-50 rounded-xl flex items-center justify-center text-brand-bright">
                            <Globe className="h-5 w-5" />
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-md shadow-slate-200/50 rounded-2xl bg-white ring-1 ring-slate-200/50 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Evaluated & Validated</p>
                            <h3 className="text-2xl font-bold text-slate-900 mt-1">{completedTias}</h3>
                        </div>
                        <div className="h-10 w-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                            <CheckCircle2 className="h-5 w-5" />
                        </div>
                    </div>
                </Card>

                <Card className="border-none shadow-md shadow-slate-200/50 rounded-2xl bg-white ring-1 ring-slate-200/50 p-5">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-widest text-amber-600">High Risk Transfers</p>
                            <h3 className="text-2xl font-bold text-slate-900 mt-1">{highRiskTias}</h3>
                        </div>
                        <div className="h-10 w-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
                            <AlertTriangle className="h-5 w-5" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Assessment Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {isLoading ? (
                    <div className="col-span-full flex flex-col items-center justify-center p-16 space-y-3">
                        <Loader2 className="h-8 w-8 animate-spin text-brand-bright" />
                        <span className="text-sm font-medium text-slate-400">Loading international transfers...</span>
                    </div>
                ) : transfers && transfers.length > 0 ? (
                    transfers.map((t: any) => {
                        const responses = t.latestTia?.questionnaireData || {};
                        const isHighRisk = t.latestTia?.riskLevel === 'high' || responses.surveillanceRisk === 'High';
                        const isCompleted = t.latestTia?.status === 'completed';

                        return (
                            <Card key={t.id} className="group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-slate-200 bg-white rounded-2xl overflow-hidden flex flex-col justify-between">
                                <CardHeader className="pb-3">
                                    <div className="flex justify-between items-start mb-2">
                                        <Badge className={cn(
                                            "text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 border",
                                            isCompleted ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-sky-100 text-sky-800 border-sky-200"
                                        )}>
                                            {isCompleted ? "Approved / Completed" : "In Evaluation"}
                                        </Badge>
                                        <div className="flex items-center gap-1">
                                            {isHighRisk && (
                                                <Badge className="bg-rose-100 text-rose-700 border-rose-200 text-[10px] font-bold">
                                                    High Risk
                                                </Badge>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => deleteMutation.mutate({ id: t.id })}
                                                className="h-7 w-7 text-slate-300 hover:text-rose-600 rounded-lg"
                                                title="Delete TIA"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                    <CardTitle className="text-lg font-bold text-slate-900 group-hover:text-brand-bright transition-colors line-clamp-2">
                                        {t.title}
                                    </CardTitle>
                                    <CardDescription className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                                        <Globe className="w-3.5 h-3.5 text-slate-400" />
                                        Destination: <span className="font-semibold text-slate-700">{countryLabel(t.destinationCountry)}</span>
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pt-0 space-y-4">
                                    <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5 text-xs text-slate-600">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Importer:</span>
                                            <span className="font-semibold text-slate-800 truncate max-w-[170px]">{responses.importerName || 'N/A'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Mechanism:</span>
                                            <span className="font-semibold text-slate-800 truncate max-w-[170px]">
                                                {TRANSFER_TOOLS.find(tool => tool.value === t.transferTool)?.label.split(' (')[0] || 'SCCs'}
                                                {t.transferTool === 'scc_2021' && t.sccModule ? ` · ${t.sccModule.toUpperCase()}` : ''}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Surveillance Risk:</span>
                                            <span className={cn(
                                                "font-bold",
                                                responses.surveillanceRisk === 'High' ? "text-rose-600" : responses.surveillanceRisk === 'Low' ? "text-emerald-600" : "text-amber-600"
                                            )}>
                                                {responses.surveillanceRisk || 'Moderate'}
                                            </span>
                                        </div>
                                    </div>

                                    <Button
                                        className="w-full bg-slate-900 hover:bg-brand text-white font-bold h-10 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 text-xs"
                                        onClick={() => handleOpenEval(t)}
                                    >
                                        <FileText className="w-3.5 h-3.5" />
                                        {isCompleted ? "View Full Assessment" : "Continue Schrems II Review"}
                                        <ArrowRight className="w-3.5 h-3.5 ml-auto" />
                                    </Button>
                                </CardContent>
                            </Card>
                        );
                    })
                ) : (
                    <div className="col-span-full text-center p-12 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-4">
                        <Globe className="h-12 w-12 text-slate-300 mx-auto" />
                        <div className="space-y-1">
                            <h3 className="text-lg font-bold text-slate-900">No Transfer Impact Assessments</h3>
                            <p className="text-slate-500 text-sm max-w-md mx-auto">
                                Conduct a Schrems II TIA for any data processed by non-EEA cloud vendors, US SaaS providers, or international service desks.
                            </p>
                        </div>
                        <div className="flex justify-center gap-3 pt-2">
                            <Button
                                onClick={() => setCreateOpen(true)}
                                className="bg-brand-bright hover:bg-brand text-white font-bold rounded-xl h-11 px-6 shadow-md"
                            >
                                <Plus className="mr-2 h-4 w-4" /> Start First TIA
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Create TIA Dialog */}
            <EnhancedDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                title="New Transfer Impact Assessment (TIA)"
                description="Initiate an international data transfer evaluation under GDPR Chapter V (Articles 44-49)."
                size="lg"
                footer={
                    <div className="flex justify-end gap-2 w-full">
                        <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleCreate}
                            disabled={createTransferMutation.isPending || saveTiaMutation.isPending}
                            className="bg-brand-bright hover:bg-brand text-white font-bold"
                        >
                            {(createTransferMutation.isPending || saveTiaMutation.isPending) ? "Creating..." : "Save & Start Assessment"}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-5 pt-2">
                    {/* Quick Presets */}
                    <div className="bg-sky-50/60 p-3.5 rounded-xl border border-sky-100 space-y-2">
                        <Label className="text-xs font-bold uppercase tracking-wider text-sky-900 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-brand-bright" />
                            Quick Presets (1-Click Auto-Fill)
                        </Label>
                        <div className="flex flex-wrap gap-2">
                            {TIA_PRESETS.map((p, idx) => (
                                <Button
                                    key={idx}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleApplyPreset(p)}
                                    className="bg-white hover:bg-sky-100 text-xs font-semibold border-sky-200 text-sky-950 h-8"
                                >
                                    {p.name.split('(')[0]}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2 md:col-span-2">
                            <Label className="font-semibold text-slate-800">Transfer Name *</Label>
                            <Input
                                placeholder="e.g., AWS US East Production Hosting"
                                value={newTiaData.transferName}
                                onChange={(e) => setNewTiaData({ ...newTiaData, transferName: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="font-semibold text-slate-800">Destination Country *</Label>
                            <Select
                                value={newTiaData.destinationCountry}
                                onValueChange={(val) => setNewTiaData({ ...newTiaData, destinationCountry: val })}
                            >
                                <SelectTrigger><SelectValue placeholder="Select country..." /></SelectTrigger>
                                <SelectContent>
                                    {COUNTRIES.map(c => (
                                        <SelectItem key={c.code} value={c.code}>{c.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-semibold text-slate-800">Importer Organization *</Label>
                            <Input
                                placeholder="e.g., Amazon Web Services, Inc."
                                value={newTiaData.importerName}
                                onChange={(e) => setNewTiaData({ ...newTiaData, importerName: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label className="font-semibold text-slate-800">Legal Transfer Safeguard / Instrument</Label>
                            <Select
                                value={newTiaData.transferTool}
                                onValueChange={(val) => setNewTiaData({ ...newTiaData, transferTool: val })}
                            >
                                <SelectTrigger><SelectValue placeholder="Select instrument..." /></SelectTrigger>
                                <SelectContent>
                                    {TRANSFER_TOOLS.map(tool => (
                                        <SelectItem key={tool.value} value={tool.value}>{tool.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {newTiaData.transferTool === "scc_2021" && (
                            <div className="space-y-2 md:col-span-2">
                                <Label className="font-semibold text-slate-800">SCC Module</Label>
                                <Select
                                    value={newTiaData.sccModule}
                                    onValueChange={(val) => setNewTiaData({ ...newTiaData, sccModule: val })}
                                >
                                    <SelectTrigger><SelectValue placeholder="Select module..." /></SelectTrigger>
                                    <SelectContent>
                                        {SCC_MODULES.map(m => (
                                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="space-y-2 md:col-span-2">
                            <Label className="font-semibold text-slate-800">Categories of Data Transferred</Label>
                            <Input
                                placeholder="e.g., Customer contact details, telemetry logs, billing records"
                                value={newTiaData.dataCategories}
                                onChange={(e) => setNewTiaData({ ...newTiaData, dataCategories: e.target.value })}
                            />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label className="font-semibold text-slate-800">Technical Supplementary Safeguards</Label>
                            <Input
                                placeholder="e.g., AES-256 Customer-Managed Keys (CMEK) held in EU"
                                value={newTiaData.supplementaryMeasures}
                                onChange={(e) => setNewTiaData({ ...newTiaData, supplementaryMeasures: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
            </EnhancedDialog>

            {/* Detailed TIA Evaluation & Sign-off Dialog */}
            {selectedTransfer && (
                <EnhancedDialog
                    open={evalOpen}
                    onOpenChange={setEvalOpen}
                    title={`Schrems II Evaluation: ${selectedTransfer.title}`}
                    description="Comprehensive EDPB Step 1-6 Transfer Impact Assessment Review"
                    size="xl"
                    footer={
                        <div className="flex justify-between items-center w-full">
                            <div className="flex items-center gap-2">
                                <Badge className={cn(
                                    "font-bold",
                                    evalForm.surveillanceRisk === 'High' ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
                                )}>
                                    Residual Risk: {evalForm.surveillanceRisk}
                                </Badge>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setEvalOpen(false)}>Close</Button>
                                <Button
                                    onClick={handleSaveEval}
                                    disabled={saveTiaMutation.isPending}
                                    className="bg-brand-bright hover:bg-brand text-white font-bold"
                                >
                                    {saveTiaMutation.isPending ? "Saving..." : "Save & Complete Review"}
                                </Button>
                            </div>
                        </div>
                    }
                >
                    <div className="space-y-6 pt-2">
                        {/* Section 1: Transfer Overview */}
                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                <Globe className="w-4 h-4 text-brand-bright" />
                                Step 1 & 2: Transfer Profile & Instrument
                            </h4>
                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                    <span className="text-slate-400 block">Destination Country:</span>
                                    <span className="font-semibold text-slate-800">{countryLabel(selectedTransfer.destinationCountry)}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block">Importer Organization:</span>
                                    <span className="font-semibold text-slate-800">{selectedTransfer.latestTia?.questionnaireData?.importerName || 'N/A'}</span>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-slate-400 block">Data Transferred:</span>
                                    <span className="font-semibold text-slate-800">{selectedTransfer.latestTia?.questionnaireData?.dataCategories || 'Standard PII'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Surveillance Evaluation */}
                        <div className="space-y-4 border-t pt-4">
                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                <ShieldAlert className="w-4 h-4 text-amber-500" />
                                Step 3 & 4: Third-Country Legal Framework & Surveillance
                            </h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-700">Surveillance Intercept Risk (e.g. FISA 702)</Label>
                                    <Select
                                        value={evalForm.surveillanceRisk}
                                        onValueChange={(val) => setEvalForm({ ...evalForm, surveillanceRisk: val })}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Low">Low - Adequate Country or Non-Target Data</SelectItem>
                                            <SelectItem value="Moderate">Moderate - US DPF Certified with EO 14086 Redress</SelectItem>
                                            <SelectItem value="High">High - Non-Adequate with Mandatory Intercept</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-700">Importer EU-US DPF Certified?</Label>
                                    <Select
                                        value={evalForm.dpfCertified}
                                        onValueChange={(val) => setEvalForm({ ...evalForm, dpfCertified: val })}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="yes">Yes - Active on Data Privacy Framework List</SelectItem>
                                            <SelectItem value="no">No - Relying Exclusively on SCCs / BCRs</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Supplementary Technical Measures */}
                        <div className="space-y-4 border-t pt-4">
                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                Step 5: Supplementary Technical & Contractual Measures
                            </h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-700">End-to-End Encryption with EU-Held Keys (CMEK)?</Label>
                                    <Select
                                        value={evalForm.cmekEnabled}
                                        onValueChange={(val) => setEvalForm({ ...evalForm, cmekEnabled: val })}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="yes">Yes - Keys Held Exclusively within EEA</SelectItem>
                                            <SelectItem value="no">No - Provider Holds Decryption Keys</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-700">Contractual Warrant Canary & Challenge Commitments?</Label>
                                    <Select
                                        value={evalForm.warrantCanary}
                                        onValueChange={(val) => setEvalForm({ ...evalForm, warrantCanary: val })}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="yes">Yes - Importer Contractually Agrees to Challenge Orders</SelectItem>
                                            <SelectItem value="no">No - Standard Commercial DPA Only</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* Section 4: DPO Determination */}
                        <div className="space-y-4 border-t pt-4">
                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-brand-bright" />
                                Step 6: DPO Determination & Sign-off
                            </h4>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-700">DPO Transfer Determination</Label>
                                <Select
                                    value={evalForm.dpoDetermination}
                                    onValueChange={(val) => setEvalForm({ ...evalForm, dpoDetermination: val })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Transfer Permitted with Supplementary Safeguards">Transfer Permitted with Supplementary Safeguards</SelectItem>
                                        <SelectItem value="Transfer Permitted (Adequacy / DPF)">Transfer Permitted (Adequacy / DPF)</SelectItem>
                                        <SelectItem value="Transfer Suspended - Inadequate Redress">Transfer Suspended - Inadequate Redress</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-700">Evaluation Notes & Audit Rationale</Label>
                                <Textarea
                                    rows={3}
                                    placeholder="Record specific legal rationale, audit references, or contractual clauses..."
                                    value={evalForm.notes}
                                    onChange={(e) => setEvalForm({ ...evalForm, notes: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                </EnhancedDialog>
            )}
        </div>
    );
}
