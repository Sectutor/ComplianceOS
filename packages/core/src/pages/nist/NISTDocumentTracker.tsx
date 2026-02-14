import React, { useState } from "react";
// Using relative imports to avoid potential alias issues on some environments
import { useClientContext } from "../../contexts/ClientContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Progress } from "@complianceos/ui/ui/progress";
import {
    FileText,
    CheckCircle2,
    Circle,
    AlertCircle,
    ExternalLink,
    Upload,
    MoreHorizontal,
    Filter,
    Search,
    FileCheck
} from "lucide-react";
import { Input } from "@complianceos/ui/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@complianceos/ui/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@complianceos/ui/ui/dropdown-menu";

interface DocumentItem {
    id: string;
    function: string;
    category: string;
    title: string;
    description: string;
    status: "not_started" | "draft" | "review" | "approved";
    owner: string;
    lastUpdated?: string;
    version?: string;
}

const NIST_DOCUMENTS: DocumentItem[] = [
    {
        id: "nist-doc-1",
        function: "GOVERN",
        category: "GV.PO",
        title: "Organizational Cybersecurity Policy",
        description: "Core policy setting the expectations and strategy for the cybersecurity program.",
        status: "approved",
        owner: "CISO",
        lastUpdated: "2024-06-15",
        version: "1.0"
    },
    {
        id: "nist-doc-2",
        function: "GOVERN",
        category: "GV.RR",
        title: "Roles & Responsibilities Matrix",
        description: "Definition of cybersecurity roles, authorities, and accountability across the organization.",
        status: "approved",
        owner: "HR Director",
        lastUpdated: "2024-05-20",
        version: "1.1"
    },
    {
        id: "nist-doc-3",
        function: "GOVERN",
        category: "GV.RM",
        title: "Risk Management Strategy",
        description: "Documented approach to identifying, assessing, and responding to cybersecurity risks.",
        status: "review",
        owner: "Risk Manager",
        lastUpdated: "2024-06-01",
        version: "0.9"
    },
    {
        id: "nist-doc-4",
        function: "IDENTIFY",
        category: "ID.AM",
        title: "Enterprise Asset Inventory",
        description: "Complete list of hardware, software, services, and data repositories.",
        status: "draft",
        owner: "IT Manager",
        lastUpdated: "2024-06-10",
        version: "0.5"
    },
    {
        id: "nist-doc-5",
        function: "IDENTIFY",
        category: "ID.RA",
        title: "Risk Assessment Report",
        description: "Analysis of threats, vulnerabilities, and potential impacts on mission functions.",
        status: "not_started",
        owner: "CISO",
    },
    {
        id: "nist-doc-6",
        function: "PROTECT",
        category: "PR.AA",
        title: "Access Control Policy",
        description: "Procedures for account management, authentication, and authorization.",
        status: "approved",
        owner: "Security Ops",
        lastUpdated: "2024-04-12",
        version: "2.0"
    },
    {
        id: "nist-doc-7",
        function: "PROTECT",
        category: "PR.AT",
        title: "Awareness & Training Plan",
        description: "Document outlining the cybersecurity training curriculum and schedule for all users.",
        status: "draft",
        owner: "HR Director",
        lastUpdated: "2024-06-05",
        version: "0.3"
    },
    {
        id: "nist-doc-8",
        function: "DETECT",
        category: "DE.CM",
        title: "Continuous Monitoring Strategy",
        description: "Plan for ongoing monitoring of network, physical environment, and personnel activity.",
        status: "not_started",
        owner: "Security Ops",
    },
    {
        id: "nist-doc-9",
        function: "RESPOND",
        category: "RS.MA",
        title: "Incident Response Plan (IRP)",
        description: "Detailed workflows and communication protocols for responding to security incidents.",
        status: "review",
        owner: "Incident Lead",
        lastUpdated: "2024-06-08",
        version: "1.0-RC"
    },
    {
        id: "nist-doc-10",
        function: "RECOVER",
        category: "RC.RP",
        title: "Business Continuity & Disaster Recovery Plan",
        description: "Procedures for restoring operations and communication after a disruptive event.",
        status: "not_started",
        owner: "Operations",
    },
    {
        id: "nist-doc-11",
        function: "GOVERN",
        category: "GV.SC",
        title: "Supply Chain Risk Policy",
        description: "Requirements for third-party vendors and external service providers.",
        status: "not_started",
        owner: "Procurement",
    }
];

export default function NISTDocumentTracker({ params }: { params?: { id: string } }) {
    const { selectedClientId } = useClientContext();
    const clientId = parseInt(params?.id || selectedClientId?.toString() || "0");
    const [searchQuery, setSearchQuery] = useState("");

    // Status Badge Helper
    const getStatusBadge = (status: string) => {
        switch (status) {
            case "approved":
                return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 italic">Approved</Badge>;
            case "review":
                return <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 italic">In Review</Badge>;
            case "draft":
                return <Badge className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 italic">Draft</Badge>;
            default:
                return <Badge variant="outline" className="text-slate-500 border-slate-200 italic">Not Started</Badge>;
        }
    };

    const filteredDocs = NIST_DOCUMENTS.filter(doc =>
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.function.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const completionPercentage = Math.round(
        (NIST_DOCUMENTS.filter(d => d.status === "approved").length / NIST_DOCUMENTS.length) * 100
    );

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                        <FileCheck className="h-8 w-8 text-primary" />
                        NIST CSF Document Tracker
                    </h1>
                    <p className="text-lg text-slate-500 max-w-3xl font-medium">
                        Manage and track mandatory documentation required for NIST CSF 2.0 alignment.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="border-slate-200 bg-white shadow-sm">
                        <ExternalLink className="mr-2 h-4 w-4" /> Export NIST Package
                    </Button>
                </div>
            </div>

            {/* Progress Overview */}
            <Card className="bg-white border-slate-200 shadow-sm overflow-hidden">
                <div className="h-1 bg-primary/20 w-full" />
                <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className="space-y-1">
                            <h3 className="font-semibold text-slate-900">Documentation Readiness</h3>
                            <p className="text-sm text-slate-500">{completionPercentage}% of critical NIST documents are approved</p>
                        </div>
                        <span className="text-2xl font-bold text-primary">{completionPercentage}%</span>
                    </div>
                    <Progress value={completionPercentage} className="h-2" />
                    <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
                        <div className="text-center">
                            <p className="text-2xl font-bold text-slate-900">{NIST_DOCUMENTS.length}</p>
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider mt-1">Required</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-emerald-600">
                                {NIST_DOCUMENTS.filter(d => d.status === "approved").length}
                            </p>
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider mt-1">Approved</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-amber-600">
                                {NIST_DOCUMENTS.filter(d => d.status === "review").length}
                            </p>
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider mt-1">In Review</p>
                        </div>
                        <div className="text-center">
                            <p className="text-2xl font-bold text-slate-400">
                                {NIST_DOCUMENTS.filter(d => d.status === "not_started").length}
                            </p>
                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-wider mt-1">Missing</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Documents Table Component */}
            <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader className="border-b border-slate-100 bg-slate-50/30">
                    <div className="flex items-center justify-between">
                        <div className="relative max-w-sm w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search by title, function or ID..."
                                className="pl-10 bg-white"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button variant="outline" size="sm" className="gap-2 bg-white">
                            <Filter className="h-4 w-4" /> Filter
                        </Button>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/50">
                                <TableHead className="w-[120px]">NIST Function</TableHead>
                                <TableHead>Document Title</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Owner</TableHead>
                                <TableHead>Last Updated</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredDocs.map((doc) => (
                                <TableRow key={doc.id} className="group hover:bg-slate-50/50 transition-colors">
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-primary/70 uppercase tracking-tighter">
                                                {doc.function}
                                            </span>
                                            <span className="font-mono text-xs font-bold text-slate-500">
                                                {doc.category}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-1">
                                            <p className="font-bold text-slate-900 group-hover:text-primary transition-colors">
                                                {doc.title}
                                            </p>
                                            <p className="text-xs text-slate-500 line-clamp-1">{doc.description}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell>{getStatusBadge(doc.status)}</TableCell>
                                    <TableCell className="text-sm text-slate-600">
                                        <div className="flex items-center gap-2">
                                            <div className="h-7 w-7 rounded-sm bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 border border-slate-200">
                                                {doc.owner.split(' ')[0].charAt(0)}{doc.owner.split(' ')[1]?.charAt(0) || ''}
                                            </div>
                                            <span className="font-medium">{doc.owner}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-slate-500">
                                        {doc.lastUpdated ? (
                                            <div className="flex flex-col">
                                                <span className="font-medium text-slate-700">{doc.lastUpdated}</span>
                                                <span className="text-[10px] text-slate-400 font-bold">VERSION {doc.version}</span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-300 italic">No updates</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-slate-200/50">
                                                    <MoreHorizontal className="h-4 w-4 text-slate-400" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-56">
                                                <DropdownMenuItem className="cursor-pointer">
                                                    <FileText className="mr-2 h-4 w-4" /> View Document
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="cursor-pointer">
                                                    <Upload className="mr-2 h-4 w-4" /> Upload New Version
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-rose-600 cursor-pointer">
                                                    <AlertCircle className="mr-2 h-4 w-4" /> Flag as Outdated
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}

// v2 - 2026-02-14 - Force refresh
