import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
} from "@complianceos/ui/ui/dialog";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@complianceos/ui/ui/tabs";
import {
    Printer,
    Download,
    Building2,
    Calendar,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@complianceos/ui/ui/table";

interface AuditDossierModalProps {
    clientId: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AuditDossierModal({ clientId, open, onOpenChange }: AuditDossierModalProps) {
    const [activeTab, setActiveTab] = useState<"summary" | "soa" | "risks" | "assets" | "policies">("summary");
    const [soaFilter, setSoaFilter] = useState<"all" | "implemented" | "not_applicable" | "in_progress">("all");

    const { data: dossier, isLoading } = trpc.iso27001.getAuditDossier.useQuery(
        { clientId },
        { enabled: open && clientId > 0 }
    );

    const handlePrint = () => {
        window.print();
    };

    const handleExportJson = () => {
        if (!dossier) return;
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dossier, null, 2));
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `ISO27001_Audit_Dossier_Client_${clientId}_${new Date().toISOString().split("T")[0]}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        toast.success("Audit dossier JSON exported successfully!");
    };

    const filteredSoa = (dossier?.soa || []).filter((item: any) => {
        if (soaFilter === "all") return true;
        if (soaFilter === "implemented") return item.clientControl?.status === "implemented";
        if (soaFilter === "not_applicable") return item.clientControl?.applicability === "not_applicable";
        if (soaFilter === "in_progress") return item.clientControl?.status === "in_progress";
        return true;
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background">
                {/* Modal Header */}
                <div className="p-6 border-b border-border bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge className="bg-blue-500/20 text-blue-300 border-blue-400/30 text-xs font-bold">
                                ISO/IEC 27001:2022
                            </Badge>
                            <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                        </div>
                        <h2 className="text-2xl font-black tracking-tight mt-1 text-white">
                            Stage 1 & Stage 2 Audit Dossier
                        </h2>
                        <p className="text-xs text-slate-300">
                            {dossier?.client?.name || "Client Organization"} • Information Security Management System (ISMS)
                        </p>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportJson}
                            className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs font-bold"
                        >
                            <Download className="w-3.5 h-3.5 mr-1.5" />
                            Export JSON
                        </Button>
                        <Button
                            size="sm"
                            onClick={handlePrint}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-md"
                        >
                            <Printer className="w-3.5 h-3.5 mr-1.5" />
                            Print / PDF Dossier
                        </Button>
                    </div>
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {isLoading ? (
                        <div className="py-20 text-center text-muted-foreground flex flex-col items-center justify-center gap-3">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                            <p className="text-sm font-semibold">Compiling ISMS Audit Dossier...</p>
                        </div>
                    ) : (
                        <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
                            <TabsList className="grid grid-cols-5 w-full bg-muted/60 p-1 rounded-xl">
                                <TabsTrigger value="summary" className="font-bold text-xs">
                                    Summary
                                </TabsTrigger>
                                <TabsTrigger value="soa" className="font-bold text-xs">
                                    SoA (Annex A)
                                </TabsTrigger>
                                <TabsTrigger value="risks" className="font-bold text-xs">
                                    Risks ({dossier?.risks?.length || 0})
                                </TabsTrigger>
                                <TabsTrigger value="assets" className="font-bold text-xs">
                                    Assets ({dossier?.assets?.length || 0})
                                </TabsTrigger>
                                <TabsTrigger value="policies" className="font-bold text-xs">
                                    Policies ({dossier?.policies?.length || 0})
                                </TabsTrigger>
                            </TabsList>

                            {/* TAB 1: Summary & Executive Overview */}
                            <TabsContent value="summary" className="space-y-6 pt-4">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <div className="p-4 rounded-xl border border-border bg-card">
                                        <div className="text-xs text-muted-foreground font-semibold">ISMS Maturity</div>
                                        <div className="text-3xl font-black text-primary mt-1">
                                            {dossier?.summary?.maturityPercentage}%
                                        </div>
                                        <div className="text-[11px] text-muted-foreground mt-0.5">Controls In-Scope Satisfied</div>
                                    </div>
                                    <div className="p-4 rounded-xl border border-border bg-card">
                                        <div className="text-xs text-muted-foreground font-semibold">Annex A Controls</div>
                                        <div className="text-3xl font-black text-foreground mt-1">
                                            {dossier?.summary?.implementedControls} <span className="text-sm font-normal text-muted-foreground">/ {dossier?.summary?.totalControls || 93}</span>
                                        </div>
                                        <div className="text-[11px] text-emerald-600 font-medium mt-0.5">
                                            {dossier?.summary?.notApplicableControls} Justified Excluded
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-xl border border-border bg-card">
                                        <div className="text-xs text-muted-foreground font-semibold">Risk Assessments</div>
                                        <div className="text-3xl font-black text-foreground mt-1">
                                            {dossier?.summary?.totalRisks}
                                        </div>
                                        <div className="text-[11px] text-amber-600 font-medium mt-0.5">
                                            {dossier?.summary?.treatedRisks} Formally Treated (RTP)
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-xl border border-border bg-card">
                                        <div className="text-xs text-muted-foreground font-semibold">Documented Policies</div>
                                        <div className="text-3xl font-black text-foreground mt-1">
                                            {dossier?.summary?.approvedPolicies} <span className="text-sm font-normal text-muted-foreground">/ {dossier?.summary?.totalPolicies}</span>
                                        </div>
                                        <div className="text-[11px] text-muted-foreground mt-0.5">Approved & Versioned</div>
                                    </div>
                                </div>

                                <div className="p-5 rounded-xl border border-border bg-muted/40 space-y-3">
                                    <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                                        <Building2 className="w-4 h-4 text-primary" />
                                        Organization Scope & Boundary (ISO 27001 Clause 4.3)
                                    </h4>
                                    <div className="grid sm:grid-cols-2 gap-3 text-xs">
                                        <div>
                                            <span className="font-semibold text-muted-foreground">Organization:</span>{" "}
                                            <span className="font-bold text-foreground">{dossier?.client?.name}</span>
                                        </div>
                                        <div>
                                            <span className="font-semibold text-muted-foreground">Industry:</span>{" "}
                                            <span className="text-foreground font-medium">{dossier?.client?.industry}</span>
                                        </div>
                                        <div>
                                            <span className="font-semibold text-muted-foreground">Organization Size:</span>{" "}
                                            <span className="text-foreground font-medium">{dossier?.client?.size}</span>
                                        </div>
                                        <div>
                                            <span className="font-semibold text-muted-foreground">Primary Security Contact:</span>{" "}
                                            <span className="text-foreground font-medium">{dossier?.client?.primaryContactName}</span>
                                        </div>
                                    </div>
                                    <div className="pt-2 border-t border-border/60 text-xs text-foreground/80 leading-relaxed">
                                        <strong>Scope Statement:</strong> The Information Security Management System (ISMS) governs all cloud infrastructure, production code repositories, employee workstations, customer data stores, and supporting operations for {dossier?.client?.name}.
                                    </div>
                                </div>
                            </TabsContent>

                            {/* TAB 2: Statement of Applicability */}
                            <TabsContent value="soa" className="space-y-4 pt-4">
                                <div className="flex items-center justify-between gap-4 flex-wrap">
                                    <div className="text-xs text-muted-foreground">
                                        Showing {filteredSoa.length} of {dossier?.soa?.length || 93} controls
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Button
                                            size="sm"
                                            variant={soaFilter === "all" ? "default" : "outline"}
                                            onClick={() => setSoaFilter("all")}
                                            className="text-xs h-7 px-2.5"
                                        >
                                            All
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant={soaFilter === "implemented" ? "default" : "outline"}
                                            onClick={() => setSoaFilter("implemented")}
                                            className="text-xs h-7 px-2.5"
                                        >
                                            Implemented
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant={soaFilter === "in_progress" ? "default" : "outline"}
                                            onClick={() => setSoaFilter("in_progress")}
                                            className="text-xs h-7 px-2.5"
                                        >
                                            In Progress
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant={soaFilter === "not_applicable" ? "default" : "outline"}
                                            onClick={() => setSoaFilter("not_applicable")}
                                            className="text-xs h-7 px-2.5"
                                        >
                                            Not Applicable
                                        </Button>
                                    </div>
                                </div>

                                <div className="border border-border rounded-xl overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead className="w-24 text-xs font-bold">Control ID</TableHead>
                                                <TableHead className="text-xs font-bold">Control Name & Category</TableHead>
                                                <TableHead className="w-32 text-xs font-bold">Applicability</TableHead>
                                                <TableHead className="w-32 text-xs font-bold">Status</TableHead>
                                                <TableHead className="text-xs font-bold">Justification & Notes</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredSoa.map((item: any) => (
                                                <TableRow key={item.clientControl?.id || item.control?.id}>
                                                    <TableCell className="font-mono text-xs font-bold text-primary">
                                                        {item.control?.controlId || item.clientControl?.clientControlId}
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        <div className="font-semibold text-foreground">{item.control?.name}</div>
                                                        <div className="text-[11px] text-muted-foreground">{item.control?.category}</div>
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        <Badge variant="outline" className={item.clientControl?.applicability === "applicable" ? "text-blue-700 bg-blue-50 border-blue-200" : "text-slate-600 bg-slate-50 border-slate-200"}>
                                                            {item.clientControl?.applicability === "applicable" ? "Applicable" : "Not Applicable"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        <Badge className={
                                                            item.clientControl?.status === "implemented"
                                                                ? "bg-emerald-100 text-emerald-800 border-none"
                                                                : item.clientControl?.status === "in_progress"
                                                                ? "bg-amber-100 text-amber-800 border-none"
                                                                : "bg-slate-100 text-slate-700 border-none"
                                                        }>
                                                            {item.clientControl?.status || "not_implemented"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                                                        {item.clientControl?.justification || item.clientControl?.implementationNotes || "Standard organizational control mandate."}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </TabsContent>

                            {/* TAB 3: Risk Register & RTP */}
                            <TabsContent value="risks" className="space-y-4 pt-4">
                                <div className="border border-border rounded-xl overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead className="w-24 text-xs font-bold">Risk ID</TableHead>
                                                <TableHead className="text-xs font-bold">Threat Scenario</TableHead>
                                                <TableHead className="w-24 text-xs font-bold">Inherent</TableHead>
                                                <TableHead className="w-24 text-xs font-bold">Residual</TableHead>
                                                <TableHead className="w-28 text-xs font-bold">Treatment</TableHead>
                                                <TableHead className="w-32 text-xs font-bold">Owner</TableHead>
                                                <TableHead className="text-xs font-bold">Treatment Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {(dossier?.risks || []).map((risk: any) => (
                                                <TableRow key={risk.id}>
                                                    <TableCell className="font-mono text-xs font-bold text-foreground">
                                                        {risk.assessmentId}
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        <div className="font-semibold text-foreground">{risk.title}</div>
                                                        <div className="text-[11px] text-muted-foreground">{risk.category}</div>
                                                    </TableCell>
                                                    <TableCell className="text-xs font-bold text-rose-600">
                                                        {risk.inherentRisk || "High"} ({risk.inherentScore || 16})
                                                    </TableCell>
                                                    <TableCell className="text-xs font-bold text-emerald-600">
                                                        {risk.residualRisk || "Low"} ({risk.residualScore || 4})
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        <Badge variant="outline" className="text-blue-700 bg-blue-50 border-blue-200">
                                                            {risk.treatmentOption || "Mitigate"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {risk.riskOwner || "Security Lead"}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-foreground/80 max-w-xs truncate">
                                                        {risk.recommendedActions || "Standard mitigations assigned in RTP."}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </TabsContent>

                            {/* TAB 4: Asset Register */}
                            <TabsContent value="assets" className="space-y-4 pt-4">
                                <div className="border border-border rounded-xl overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead className="text-xs font-bold">Asset Name</TableHead>
                                                <TableHead className="w-28 text-xs font-bold">Type</TableHead>
                                                <TableHead className="w-28 text-xs font-bold">Criticality</TableHead>
                                                <TableHead className="w-28 text-xs font-bold">CIA Rating</TableHead>
                                                <TableHead className="w-36 text-xs font-bold">Owner</TableHead>
                                                <TableHead className="text-xs font-bold">Vendor / Platform</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {(dossier?.assets || []).map((asset: any) => (
                                                <TableRow key={asset.id}>
                                                    <TableCell className="text-xs">
                                                        <div className="font-semibold text-foreground">{asset.name}</div>
                                                        <div className="text-[11px] text-muted-foreground">{asset.category}</div>
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        <Badge variant="outline" className="text-slate-700">
                                                            {asset.type}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        <Badge className={
                                                            asset.criticality === "Critical"
                                                                ? "bg-rose-100 text-rose-800 border-none"
                                                                : "bg-amber-100 text-amber-800 border-none"
                                                        }>
                                                            {asset.criticality || "High"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs text-foreground font-semibold">
                                                        C:{asset.valuationC || 3} I:{asset.valuationI || 3} A:{asset.valuationA || 3}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {asset.owner || "Asset Owner"}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {asset.vendor || "Internal / Cloud"}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </TabsContent>

                            {/* TAB 5: Policies & Documented Information */}
                            <TabsContent value="policies" className="space-y-4 pt-4">
                                <div className="border border-border rounded-xl overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-muted/50">
                                            <TableRow>
                                                <TableHead className="text-xs font-bold">Policy Title</TableHead>
                                                <TableHead className="w-24 text-xs font-bold">Version</TableHead>
                                                <TableHead className="w-32 text-xs font-bold">Status</TableHead>
                                                <TableHead className="w-36 text-xs font-bold">Owner</TableHead>
                                                <TableHead className="w-36 text-xs font-bold">Last Updated</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {(dossier?.policies || []).map((policy: any) => (
                                                <TableRow key={policy.id}>
                                                    <TableCell className="text-xs font-semibold text-foreground">
                                                        {policy.name}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs">
                                                        v{policy.version || 1}.0
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        <Badge className={
                                                            policy.status === "approved" || policy.approvalStatus === "approved"
                                                                ? "bg-emerald-100 text-emerald-800 border-none"
                                                                : "bg-slate-100 text-slate-700 border-none"
                                                        }>
                                                            {policy.status || "draft"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {policy.owner || "Security Committee"}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {policy.updatedAt ? new Date(policy.updatedAt).toLocaleDateString() : "Recent"}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </TabsContent>
                        </Tabs>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
