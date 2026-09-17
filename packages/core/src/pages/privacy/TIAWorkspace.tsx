import React, { useState } from 'react';
import { useClientContext } from "@/contexts/ClientContext";
import { Button } from "@complianceos/ui/ui/button";
import { Plus, Globe, Shield, ArrowRight, Loader2, Sparkles, Trash2, CheckCircle2, AlertTriangle, ShieldCheck, ShieldAlert, FileText, CheckCircle, ExternalLink } from "lucide-react";
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

const TIA_PRESETS = [
    {
        name: "US Cloud Hosting (AWS / GCP / Azure)",
        destinationCountry: "USA",
        importerName: "Amazon Web Services, Inc.",
        transferTool: "EU-US Data Privacy Framework + SCCs Module 2",
        dataCategories: "Customer account data, application databases, access logs",
        surveillanceRisk: "Moderate (Subject to FISA 702 / EO 14086 redress)",
        supplementaryMeasures: "AES-256 Customer-Managed Encryption Keys (CMEK) held in EU",
        recommendedOutcome: "Transfer Permitted with Technical Safeguards"
    },
    {
        name: "Enterprise CRM & Sales Telemetry (Salesforce)",
        destinationCountry: "USA",
        importerName: "Salesforce, Inc.",
        transferTool: "EU-US Data Privacy Framework + Binding Corporate Rules (BCRs)",
        dataCategories: "Sales leads, business contacts, deal communications",
        surveillanceRisk: "Low (Commercial CRM data, DPF certified)",
        supplementaryMeasures: "Hyperforce EU data residency + TLS 1.3 in transit",
        recommendedOutcome: "Transfer Permitted"
    },
    {
        name: "Offshore 24/7 Engineering & Tier-3 Support (India)",
        destinationCountry: "India",
        importerName: "Global Support Services Pvt Ltd",
        transferTool: "Standard Contractual Clauses (Module 2 Controller-to-Processor)",
        dataCategories: "Support tickets, error logs, user IDs (read-only ephemeral access)",
        surveillanceRisk: "High (No EU adequacy decision, Indian IT Act surveillance)",
        supplementaryMeasures: "Zero data storage locally, ephemeral VDI access, full session recording & pseudonymized IDs",
        recommendedOutcome: "Transfer Permitted with Strict VDI Isolation"
    }
];

export default function TIAWorkspace() {
    const { selectedClientId } = useClientContext();
    const clientId = selectedClientId || 0;
    const [createOpen, setCreateOpen] = useState(false);
    const [evalOpen, setEvalOpen] = useState(false);
    const [selectedTia, setSelectedTia] = useState<any>(null);

    const [newTiaData, setNewTiaData] = useState({
        transferName: "",
        destinationCountry: "USA",
        importerName: "",
        transferTool: "EU-US Data Privacy Framework + SCCs Module 2",
        dataCategories: "Customer personal data, transactional telemetry",
        supplementaryMeasures: "End-to-end encryption with EU-held keys (CMEK)",
        surveillanceRisk: "Moderate",
        notes: ""
    });

    const [evalForm, setEvalForm] = useState({
        status: "completed" as "in_progress" | "completed",
        transferTool: "",
        surveillanceRisk: "Moderate",
        dpfCertified: "yes",
        cmekEnabled: "yes",
        warrantCanary: "yes",
        dpoDetermination: "Transfer Permitted with Supplementary Safeguards",
        notes: ""
    });

    const utils = trpc.useUtils();
    const { data: assessments, isLoading } = trpc.privacy.listAssessments.useQuery({
        clientId,
        typePrefix: "TIA:"
    }, { enabled: !!clientId });

    const createMutation = trpc.privacy.saveAssessment.useMutation({
        onSuccess: () => {
            toast.success("Transfer Impact Assessment Created");
            setCreateOpen(false);
            setNewTiaData({
                transferName: "",
                destinationCountry: "USA",
                importerName: "",
                transferTool: "EU-US Data Privacy Framework + SCCs Module 2",
                dataCategories: "Customer personal data, transactional telemetry",
                supplementaryMeasures: "End-to-end encryption with EU-held keys (CMEK)",
                surveillanceRisk: "Moderate",
                notes: ""
            });
            utils.privacy.listAssessments.invalidate();
        },
        onError: (err) => toast.error(`Failed to create TIA: ${err.message}`)
    });

    const deleteMutation = (trpc.privacy as any).deleteAssessment?.useMutation({
        onSuccess: () => {
            toast.success("TIA Assessment Deleted");
            utils.privacy.listAssessments.invalidate();
        },
        onError: (err: any) => toast.error(`Failed to delete: ${err.message}`)
    });

    const handleApplyPreset = (preset: typeof TIA_PRESETS[0]) => {
        setNewTiaData({
            transferName: preset.name,
            destinationCountry: preset.destinationCountry,
            importerName: preset.importerName,
            transferTool: preset.transferTool,
            dataCategories: preset.dataCategories,
            supplementaryMeasures: preset.supplementaryMeasures,
            surveillanceRisk: preset.surveillanceRisk.includes("High") ? "High" : preset.surveillanceRisk.includes("Low") ? "Low" : "Moderate",
            notes: `Recommended Outcome: ${preset.recommendedOutcome}`
        });
    };

    const handleCreate = () => {
        if (!newTiaData.transferName.trim() || !newTiaData.destinationCountry) {
            toast.error("Please provide a transfer name and destination country");
            return;
        }

        const score = newTiaData.surveillanceRisk === "High" ? 80 : newTiaData.surveillanceRisk === "Moderate" ? 45 : 15;

        createMutation.mutate({
            clientId,
            type: `TIA: ${newTiaData.transferName.trim()}`,
            responses: {
                destinationCountry: newTiaData.destinationCountry,
                importerName: newTiaData.importerName,
                transferTool: newTiaData.transferTool,
                dataCategories: newTiaData.dataCategories,
                supplementaryMeasures: newTiaData.supplementaryMeasures,
                surveillanceRisk: newTiaData.surveillanceRisk,
                transferDate: new Date().toISOString(),
                status: "in_progress",
                notes: newTiaData.notes
            },
            status: "in_progress",
            score
        });
    };

    const handleOpenEval = (tia: any) => {
        setSelectedTia(tia);
        const resp = tia.responses || {};
        setEvalForm({
            status: tia.status || "in_progress",
            transferTool: resp.transferTool || "EU-US Data Privacy Framework + SCCs Module 2",
            surveillanceRisk: resp.surveillanceRisk || "Moderate",
            dpfCertified: resp.dpfCertified || "yes",
            cmekEnabled: resp.cmekEnabled || "yes",
            warrantCanary: resp.warrantCanary || "yes",
            dpoDetermination: resp.dpoDetermination || "Transfer Permitted with Supplementary Safeguards",
            notes: resp.notes || ""
        });
        setEvalOpen(true);
    };

    const handleSaveEval = () => {
        if (!selectedTia) return;

        const score = evalForm.surveillanceRisk === "High" && evalForm.cmekEnabled === "no" ? 85 : evalForm.surveillanceRisk === "Low" ? 15 : 40;

        createMutation.mutate({
            clientId,
            type: selectedTia.type,
            responses: {
                ...selectedTia.responses,
                transferTool: evalForm.transferTool,
                surveillanceRisk: evalForm.surveillanceRisk,
                dpfCertified: evalForm.dpfCertified,
                cmekEnabled: evalForm.cmekEnabled,
                warrantCanary: evalForm.warrantCanary,
                dpoDetermination: evalForm.dpoDetermination,
                notes: evalForm.notes,
                evaluatedAt: new Date().toISOString()
            },
            status: evalForm.status,
            score
        }, {
            onSuccess: () => {
                setEvalOpen(false);
                setSelectedTia(null);
            }
        });
    };

    // Calculate metrics
    const totalTias = assessments?.length || 0;
    const completedTias = assessments?.filter(a => a.status === 'completed').length || 0;
    const highRiskTias = assessments?.filter(a => (a.responses as any)?.surveillanceRisk === 'High' || (a.score && a.score > 70)).length || 0;

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
                ) : assessments && assessments.length > 0 ? (
                    assessments.map(t => {
                        const responses = (t.responses as any) || {};
                        const isHighRisk = responses.surveillanceRisk === 'High' || (t.score && t.score > 70);
                        const isCompleted = t.status === 'completed';

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
                                            {deleteMutation && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => deleteMutation.mutate({ clientId, id: t.id })}
                                                    className="h-7 w-7 text-slate-300 hover:text-rose-600 rounded-lg"
                                                    title="Delete TIA"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    <CardTitle className="text-lg font-bold text-slate-900 group-hover:text-brand-bright transition-colors line-clamp-2">
                                        {t.type.replace("TIA: ", "")}
                                    </CardTitle>
                                    <CardDescription className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                                        <Globe className="w-3.5 h-3.5 text-slate-400" />
                                        Destination: <span className="font-semibold text-slate-700">{responses.destinationCountry || 'Unknown'}</span>
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
                                            <span className="font-semibold text-slate-800 truncate max-w-[170px]">{responses.transferTool?.split('+')[0] || 'SCCs'}</span>
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
                            disabled={createMutation.isPending}
                            className="bg-brand-bright hover:bg-brand text-white font-bold"
                        >
                            {createMutation.isPending ? "Creating..." : "Save & Start Assessment"}
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
                                    <SelectItem value="USA">United States (USA)</SelectItem>
                                    <SelectItem value="India">India</SelectItem>
                                    <SelectItem value="China">China</SelectItem>
                                    <SelectItem value="Brazil">Brazil</SelectItem>
                                    <SelectItem value="UK">United Kingdom (Adequate)</SelectItem>
                                    <SelectItem value="Switzerland">Switzerland (Adequate)</SelectItem>
                                    <SelectItem value="Japan">Japan (Adequate)</SelectItem>
                                    <SelectItem value="Other">Other Non-Adequate Country</SelectItem>
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
                                    <SelectItem value="EU-US Data Privacy Framework + SCCs Module 2">EU-US Data Privacy Framework (DPF) + SCCs Module 2</SelectItem>
                                    <SelectItem value="Standard Contractual Clauses (Module 2 Controller-to-Processor)">Standard Contractual Clauses (SCCs Module 2 C2P)</SelectItem>
                                    <SelectItem value="Standard Contractual Clauses (Module 1 Controller-to-Controller)">Standard Contractual Clauses (SCCs Module 1 C2C)</SelectItem>
                                    <SelectItem value="Binding Corporate Rules (BCRs)">Binding Corporate Rules (BCRs)</SelectItem>
                                    <SelectItem value="Explicit Consent Derogation (Art. 49.1.a)">Explicit Consent Derogation (Art. 49.1.a)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

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
            {selectedTia && (
                <EnhancedDialog
                    open={evalOpen}
                    onOpenChange={setEvalOpen}
                    title={`Schrems II Evaluation: ${selectedTia.type.replace("TIA: ", "")}`}
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
                                    disabled={createMutation.isPending}
                                    className="bg-brand-bright hover:bg-brand text-white font-bold"
                                >
                                    {createMutation.isPending ? "Saving..." : "Save & Complete Review"}
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
                                    <span className="font-semibold text-slate-800">{selectedTia.responses?.destinationCountry || 'USA'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block">Importer Organization:</span>
                                    <span className="font-semibold text-slate-800">{selectedTia.responses?.importerName || 'N/A'}</span>
                                </div>
                                <div className="col-span-2">
                                    <span className="text-slate-400 block">Data Transferred:</span>
                                    <span className="font-semibold text-slate-800">{selectedTia.responses?.dataCategories || 'Standard PII'}</span>
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

                        {/* Section 4: DPO Determination & Status */}
                        <div className="space-y-4 border-t pt-4">
                            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-brand-bright" />
                                Step 6: DPO Determination & Sign-off
                            </h4>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold text-slate-700">Assessment Status</Label>
                                    <Select
                                        value={evalForm.status}
                                        onValueChange={(val: any) => setEvalForm({ ...evalForm, status: val })}
                                    >
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="completed">Completed / Signed Off</SelectItem>
                                            <SelectItem value="in_progress">In Progress / Pending Safeguards</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

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

                                <div className="space-y-2 md:col-span-2">
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
                    </div>
                </EnhancedDialog>
            )}
        </div>
    );
}

