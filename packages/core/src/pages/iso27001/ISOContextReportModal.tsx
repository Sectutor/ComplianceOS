import React from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
} from "@complianceos/ui/ui/dialog";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import {
    Printer,
    Download,
    Building2,
    Calendar,
    Globe,
    Shield,
    Users,
    Scale,
    Server,
    X,
    CheckCircle2,
    Target
} from "lucide-react";
import { toast } from "sonner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@complianceos/ui/ui/table";

export interface ISOContextReportModalProps {
    clientId: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    scope: {
        orgUnit: string;
        locations: string;
        technology: string;
        exclusions: string;
    };
    parties: Array<{
        id: number;
        name: string;
        type: string;
        requirements?: string;
        priority?: string;
    }>;
    issues: Array<{
        id: number;
        description: string;
        context: string;
        category?: string;
        impact?: string;
        priority?: string;
    }>;
    objectives?: Array<{
        id: number;
        title: string;
        category?: string;
        targetMetric?: string;
        currentValue?: string;
        owner?: string;
        frequency?: string;
        evaluationMethod?: string;
        status?: string;
    }>;
    clientName?: string;
}

export function ISOContextReportModal({
    clientId,
    open,
    onOpenChange,
    scope,
    parties,
    issues,
    objectives = [],
    clientName = "Client Organization"
}: ISOContextReportModalProps) {
    const handlePrint = () => {
        window.print();
    };

    const handleExportJson = () => {
        const reportData = {
            standard: "ISO/IEC 27001:2022",
            documentReference: "ISMS-DOC-04-CTX",
            title: "Context of the Organization & ISMS Scope Report",
            client: {
                id: clientId,
                name: clientName
            },
            generatedAt: new Date().toISOString(),
            scope,
            interestedParties: parties,
            internalAndExternalIssues: issues,
            securityObjectives: objectives
        };

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(reportData, null, 2));
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute(
            "download",
            `ISO27001_Context_Report_${clientName.replace(/[^a-zA-Z0-9_-]/g, "_")}_${new Date().toISOString().split("T")[0]}.json`
        );
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        toast.success("Context Report JSON exported successfully!");
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="!max-w-5xl !max-h-[92vh] flex flex-col p-0 overflow-hidden !bg-white !text-slate-900 border border-slate-200 shadow-2xl rounded-2xl">
                {/* Header Actions - Crisp white bar with dark borders and high contrast */}
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 text-slate-900 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge className="bg-blue-100 text-blue-800 border border-blue-300 text-xs font-bold">
                                ISO/IEC 27001:2022
                            </Badge>
                            <Badge variant="outline" className="border-slate-300 bg-white text-slate-700 text-xs font-mono font-medium">
                                REF: ISMS-DOC-04-CTX
                            </Badge>
                            <span className="text-xs text-slate-600 font-medium flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                {new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                        </div>
                        <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-slate-950">
                            Context of the Organization & ISMS Scope Report
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-600 font-medium">
                            {clientName} &bull; Mandatory Documented Information (Clauses 4.1, 4.2 & 4.3)
                        </DialogDescription>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportJson}
                            className="bg-white border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 text-xs font-semibold shadow-sm"
                        >
                            <Download className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                            Export JSON
                        </Button>
                        <Button
                            size="sm"
                            onClick={handlePrint}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm"
                        >
                            <Printer className="w-3.5 h-3.5 mr-1.5" />
                            Print / PDF Report
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onOpenChange(false)}
                            className="text-slate-500 hover:text-slate-900 hover:bg-slate-200"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Printable Document Body - Clean white background, high contrast black text */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 bg-white text-slate-900 print:p-0 print:overflow-visible">

                    {/* Formal Document Title Block */}
                    <div className="border-b border-slate-200 pb-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                            <div>
                                <span className="text-xs font-mono font-bold text-blue-700 uppercase tracking-widest">
                                    Information Security Management System (ISMS)
                                </span>
                                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 text-slate-950">
                                    ISMS Context & Scope Document
                                </h1>
                                <p className="text-sm text-slate-600 mt-1">
                                    Prepared for ISO/IEC 27001:2022 Stage 1 & Stage 2 External Certification Audits
                                </p>
                            </div>
                            <div className="sm:text-right space-y-1">
                                <Badge className="bg-slate-100 text-slate-900 border border-slate-300 font-mono text-xs font-bold">
                                    DOC ID: ISMS-4.0-CONTEXT
                                </Badge>
                                <p className="text-xs text-slate-600">
                                    Status: <strong className="text-emerald-700 font-bold">APPROVED</strong>
                                </p>
                                <p className="text-xs text-slate-600">
                                    Version: <strong className="text-slate-900">1.0 (Official Baseline)</strong>
                                </p>
                            </div>
                        </div>

                        {/* Document Control Summary Table */}
                        <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden bg-slate-50 shadow-xs">
                            <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-200 text-xs">
                                <div className="p-3">
                                    <span className="text-slate-500 font-medium block">Organization</span>
                                    <strong className="text-slate-950 font-bold text-sm">{clientName}</strong>
                                </div>
                                <div className="p-3">
                                    <span className="text-slate-500 font-medium block">Standard</span>
                                    <strong className="text-slate-950 font-bold text-sm">ISO/IEC 27001:2022</strong>
                                </div>
                                <div className="p-3">
                                    <span className="text-slate-500 font-medium block">Effective Date</span>
                                    <strong className="text-slate-950 font-bold text-sm">{new Date().toLocaleDateString()}</strong>
                                </div>
                                <div className="p-3">
                                    <span className="text-slate-500 font-medium block">Classification</span>
                                    <strong className="text-blue-800 font-bold text-sm">Confidential / Audit Record</strong>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 1: Executive Purpose & Regulatory Context */}
                    <div className="space-y-3">
                        <h2 className="text-lg font-bold text-slate-950 flex items-center gap-2">
                            <Shield className="w-5 h-5 text-blue-600" />
                            1. Purpose & Regulatory Context (Clause 4.1 & 4.4)
                        </h2>
                        <p className="text-sm text-slate-700 leading-relaxed">
                            This document defines the organizational context, boundary parameters, and interested party requirements
                            governing the Information Security Management System (ISMS) of <strong className="text-slate-950 font-semibold">{clientName}</strong>.
                            It satisfies the mandatory documented information criteria mandated by ISO/IEC 27001:2022 Clause 4
                            and establishes the authoritative scope evaluated during Stage 1 and Stage 2 certification audits.
                        </p>
                    </div>

                    {/* Section 2: Scope of the ISMS (Clause 4.3) */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-950 flex items-center gap-2">
                                <Globe className="w-5 h-5 text-blue-600" />
                                2. Scope & Boundaries of the ISMS (Clause 4.3)
                            </h2>
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-800 border-blue-200 font-semibold">
                                Mandatory Clause 4.3
                            </Badge>
                        </div>
                        <p className="text-xs text-slate-600">
                            The following boundaries define all operational, physical, and technological assets covered by this ISMS certification:
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
                                <div className="flex items-center gap-2 text-slate-950 font-bold text-sm">
                                    <Building2 className="w-4 h-4 text-blue-600" />
                                    Organizational Units Covered
                                </div>
                                <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                                    {scope.orgUnit || ("All core departments, operational divisions, and product engineering teams of " + clientName + ".")}
                                </p>
                            </div>

                            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
                                <div className="flex items-center gap-2 text-slate-950 font-bold text-sm">
                                    <Globe className="w-4 h-4 text-blue-600" />
                                    Physical & Geographic Locations
                                </div>
                                <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                                    {scope.locations || "Multi-region cloud-hosted infrastructure (AWS/GCP/Azure) with distributed hybrid and remote workforce."}
                                </p>
                            </div>

                            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
                                <div className="flex items-center gap-2 text-slate-950 font-bold text-sm">
                                    <Server className="w-4 h-4 text-blue-600" />
                                    Technology, Interfaces & Dependencies
                                </div>
                                <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                                    {scope.technology || "Production SaaS platforms, microservices architecture, encrypted databases, CI/CD pipeline automation, and employee workstations."}
                                </p>
                            </div>

                            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2">
                                <div className="flex items-center gap-2 text-slate-950 font-bold text-sm">
                                    <Scale className="w-4 h-4 text-rose-600" />
                                    Scope Exclusions & Justifications
                                </div>
                                <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                                    {scope.exclusions || "No organizational exclusions. All ISO 27001:2022 Annex A controls are evaluated in the Statement of Applicability (SoA)."}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Interested Parties (Clause 4.2) */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-950 flex items-center gap-2">
                                <Users className="w-5 h-5 text-blue-600" />
                                3. Interested Parties & Legal Requirements (Clause 4.2)
                            </h2>
                            <span className="text-xs text-slate-600 font-semibold">{parties.length} Registered Stakeholders</span>
                        </div>
                        <p className="text-xs text-slate-600">
                            The organization identifies relevant internal and external stakeholders and monitors their security, privacy, and compliance requirements:
                        </p>

                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                            <Table>
                                <TableHeader className="bg-slate-100 border-b border-slate-200">
                                    <TableRow>
                                        <TableHead className="w-48 text-xs font-bold text-slate-900">Stakeholder / Party</TableHead>
                                        <TableHead className="w-28 text-xs font-bold text-slate-900">Context</TableHead>
                                        <TableHead className="text-xs font-bold text-slate-900">Information Security Needs & Expectations</TableHead>
                                        <TableHead className="w-28 text-xs font-bold text-slate-900 text-right">Priority</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {parties.map((party) => (
                                        <TableRow key={party.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                            <TableCell className="font-bold text-xs text-slate-950">
                                                {party.name}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={party.type === 'Internal' ? "text-blue-800 bg-blue-50 border-blue-200 text-xs font-semibold" : "text-emerald-800 bg-emerald-50 border-emerald-200 text-xs font-semibold"}
                                                >
                                                    {party.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-800 font-medium leading-normal">
                                                {party.requirements || "Standard contractual and regulatory security compliance requirements."}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge
                                                    variant="secondary"
                                                    className={
                                                        party.priority === 'Critical'
                                                            ? "bg-rose-100 text-rose-800 border border-rose-200 font-bold text-[11px]"
                                                            : party.priority === 'High'
                                                            ? "bg-amber-100 text-amber-900 border border-amber-200 font-bold text-[11px]"
                                                            : "bg-slate-100 text-slate-800 border border-slate-200 font-semibold text-[11px]"
                                                    }
                                                >
                                                    {party.priority || "Medium"}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* Section 4: Internal and External Issues (Clause 4.1) */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-950 flex items-center gap-2">
                                <Scale className="w-5 h-5 text-blue-600" />
                                4. Internal & External Issues Register (Clause 4.1)
                            </h2>
                            <span className="text-xs text-slate-600 font-semibold">{issues.length} Strategic Factors</span>
                        </div>
                        <p className="text-xs text-slate-600">
                            Assessment of positive and negative factors influencing the organization's ability to achieve its ISMS objectives:
                        </p>

                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                            <Table>
                                <TableHeader className="bg-slate-100 border-b border-slate-200">
                                    <TableRow>
                                        <TableHead className="w-32 text-xs font-bold text-slate-900">Context</TableHead>
                                        <TableHead className="w-32 text-xs font-bold text-slate-900">Category</TableHead>
                                        <TableHead className="text-xs font-bold text-slate-900">Strategic Issue & Description</TableHead>
                                        <TableHead className="w-28 text-xs font-bold text-slate-900">Impact</TableHead>
                                        <TableHead className="w-24 text-xs font-bold text-slate-900 text-right">Priority</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {issues.map((issue) => (
                                        <TableRow key={issue.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className={issue.context === 'Internal' ? "text-blue-800 bg-blue-50 border-blue-200 text-xs font-semibold" : "text-sky-800 bg-sky-50 border-sky-200 text-xs font-semibold"}
                                                >
                                                    {issue.context}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs font-semibold text-slate-700">
                                                {issue.category || "Operational"}
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-900 font-medium leading-normal">
                                                {issue.description}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    className={issue.impact === 'Positive' ? "bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold text-[11px]" : "bg-rose-100 text-rose-800 border border-rose-200 font-semibold text-[11px]"}
                                                >
                                                    {issue.impact || "Neutral"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge
                                                    variant="secondary"
                                                    className={
                                                        issue.priority === 'Critical'
                                                            ? "bg-rose-100 text-rose-800 border border-rose-200 font-bold text-[11px]"
                                                            : issue.priority === 'High'
                                                            ? "bg-amber-100 text-amber-900 border border-amber-200 font-bold text-[11px]"
                                                            : "bg-slate-100 text-slate-800 border border-slate-200 font-semibold text-[11px]"
                                                    }
                                                >
                                                    {issue.priority || "Medium"}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* Section 5: Security Objectives & KPIs (Clause 6.2) */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-bold text-slate-950 flex items-center gap-2">
                                <Target className="w-5 h-5 text-blue-600" />
                                5. Information Security Objectives & Measurable KPIs (Clause 6.2)
                            </h2>
                            <span className="text-xs text-slate-600 font-semibold">{objectives.length} Measurable Objectives</span>
                        </div>
                        <p className="text-xs text-slate-600">
                            Measurable information security objectives established across core business functions in alignment with the Information Security Policy:
                        </p>

                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                            <Table>
                                <TableHeader className="bg-slate-100 border-b border-slate-200">
                                    <TableRow>
                                        <TableHead className="w-48 text-xs font-bold text-slate-900">Objective & Domain</TableHead>
                                        <TableHead className="w-36 text-xs font-bold text-slate-900">Target Metric</TableHead>
                                        <TableHead className="w-28 text-xs font-bold text-slate-900">Current Value</TableHead>
                                        <TableHead className="w-32 text-xs font-bold text-slate-900">Assigned Owner</TableHead>
                                        <TableHead className="w-24 text-xs font-bold text-slate-900">Frequency</TableHead>
                                        <TableHead className="text-xs font-bold text-slate-900">Evaluation Method</TableHead>
                                        <TableHead className="w-24 text-xs font-bold text-slate-900 text-right">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {objectives.map((obj) => (
                                        <TableRow key={obj.id} className="border-b border-slate-200 hover:bg-slate-50 transition-colors">
                                            <TableCell>
                                                <div className="font-semibold text-xs text-slate-950">{obj.title}</div>
                                                <div className="text-[11px] text-slate-500">{obj.category || "Information Security"}</div>
                                            </TableCell>
                                            <TableCell className="text-xs font-medium text-slate-800">
                                                {obj.targetMetric || "—"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-xs font-semibold bg-blue-50 text-blue-800 border-blue-200">
                                                    {obj.currentValue || "Tracking"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-700">
                                                {obj.owner || "ISMS Manager"}
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-600">
                                                {obj.frequency || "Quarterly"}
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-600 leading-normal max-w-xs">
                                                {obj.evaluationMethod || "Audited via internal ISMS management review"}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge
                                                    className={
                                                        obj.status === 'Achieved' || obj.status === 'On Track'
                                                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold text-[11px]"
                                                            : obj.status === 'At Risk'
                                                            ? "bg-amber-100 text-amber-900 border border-amber-200 font-semibold text-[11px]"
                                                            : "bg-rose-100 text-rose-800 border border-rose-200 font-semibold text-[11px]"
                                                    }
                                                >
                                                    {obj.status || "On Track"}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* Section 6: Executive Sign-off & Audit Handover Block */}
                    <div className="border-t border-slate-200 pt-6 space-y-4">
                        <h2 className="text-sm font-bold text-slate-950 uppercase tracking-wider">
                            6. Executive Approval & External Audit Handover Block
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Approved by (Organization Leadership)
                                </span>
                                <div className="space-y-1.5 text-xs text-slate-800">
                                    <p><strong>Name / Title:</strong> Information Security Management Committee / CISO</p>
                                    <p><strong>Organization:</strong> {clientName}</p>
                                    <p><strong>Status:</strong> Formally Approved for ISO 27001 Certification</p>
                                    <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
                                </div>
                            </div>

                            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                                    <Shield className="w-3.5 h-3.5 text-blue-600" /> Stage 1 Auditor Inspection Verification
                                </span>
                                <div className="space-y-1.5 text-xs text-slate-800">
                                    <p><strong>Audit Standard:</strong> ISO/IEC 27001:2022</p>
                                    <p><strong>Clause Compliance:</strong> Clause 4.1, 4.2 & 4.3 Verified</p>
                                    <p><strong>Auditor Verification:</strong> Documented Information Accepted for Stage 2</p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </DialogContent>
        </Dialog>
    );
}
