import React, { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useClientContext } from "@/contexts/ClientContext";
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
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
} from "@complianceos/ui/ui/sheet";
import { Label } from "@complianceos/ui/ui/label";
import {
    Clock,
    User,
    History,
    MessageSquare,
    ChevronRight,
    Download,
    Eye,
    Save
} from "lucide-react";
import { Separator } from "@complianceos/ui/ui/separator";

export interface DocumentItem {
    id: string;
    category: "management" | "policy" | "record";
    categoryLabel: string;
    clause: string;
    title: string;
    description: string;
    status: "not_started" | "draft" | "review" | "approved";
    owner: string;
    actionLink: string;
    actionLabel: string;
    lastUpdated?: string;
    version?: string;
}

export const getMandatoryDocuments = (clientId: number): DocumentItem[] => [
    // 1. Management System Documents (Clauses 4-10)
    {
        id: "doc-scope",
        category: "management",
        categoryLabel: "Management Clauses",
        clause: "Clause 4.3",
        title: "Scope of the ISMS",
        description: "Official boundaries, organizational context, inclusions, exclusions, and external interfaces.",
        status: "approved",
        owner: "CISO",
        actionLink: `/clients/${clientId}/iso27001/governance`,
        actionLabel: "Open Scope",
        lastUpdated: "2025-01-10",
        version: "1.0"
    },
    {
        id: "doc-core-policy",
        category: "management",
        categoryLabel: "Management Clauses",
        clause: "Clause 5.2",
        title: "Master Information Security Policy",
        description: "Top management's high-level commitment, executive security mandate, and governance framework.",
        status: "review",
        owner: "Leadership",
        actionLink: `/clients/${clientId}/policies`,
        actionLabel: "Open Policy Center",
        lastUpdated: "2025-01-15",
        version: "0.9"
    },
    {
        id: "doc-objectives",
        category: "management",
        categoryLabel: "Management Clauses",
        clause: "Clause 6.2",
        title: "Information Security Objectives & KPIs",
        description: "Measurable security targets, evaluation plans, timelines, and accountability metrics.",
        status: "draft",
        owner: "CISO",
        actionLink: `/clients/${clientId}/iso27001/governance`,
        actionLabel: "Set Objectives",
        lastUpdated: "2025-01-20",
        version: "0.5"
    },
    {
        id: "doc-risk-methodology",
        category: "management",
        categoryLabel: "Management Clauses",
        clause: "Clause 6.1.2",
        title: "Risk Assessment Methodology & Criteria",
        description: "Standardized process for identifying, analyzing, and evaluating information security risks.",
        status: "approved",
        owner: "Risk Manager",
        actionLink: `/clients/${clientId}/iso27001/risks`,
        actionLabel: "Risk Methodology",
        lastUpdated: "2025-01-12",
        version: "1.0"
    },
    {
        id: "doc-risk-report",
        category: "management",
        categoryLabel: "Management Clauses",
        clause: "Clause 6.1.2 & 8.2",
        title: "Information Security Risk Assessment Report",
        description: "Current registry of evaluated asset threats, likelihood/impact scoring, and residual risk.",
        status: "approved",
        owner: "Risk Manager",
        actionLink: `/clients/${clientId}/iso27001/risks`,
        actionLabel: "Risk Register",
        lastUpdated: "2025-02-01",
        version: "1.0"
    },
    {
        id: "doc-rtp",
        category: "management",
        categoryLabel: "Management Clauses",
        clause: "Clause 6.1.3 & 8.3",
        title: "Risk Treatment Plan (RTP)",
        description: "Formal actions (Mitigate, Transfer, Avoid, Accept) with assigned owners and remediation target dates.",
        status: "draft",
        owner: "Risk Manager",
        actionLink: `/clients/${clientId}/iso27001/risks`,
        actionLabel: "Manage RTP",
        lastUpdated: "2025-02-05",
        version: "0.8"
    },
    {
        id: "doc-soa",
        category: "management",
        categoryLabel: "Management Clauses",
        clause: "Clause 6.1.3 d",
        title: "Statement of Applicability (SoA)",
        description: "Document evaluating all 93 Annex A controls with business justifications and implementation status.",
        status: "draft",
        owner: "CISO",
        actionLink: `/clients/${clientId}/iso27001/soa`,
        actionLabel: "Manage SoA",
        lastUpdated: "2025-02-10",
        version: "0.7"
    },
    {
        id: "doc-control-procedure",
        category: "management",
        categoryLabel: "Management Clauses",
        clause: "Clause 7.5",
        title: "Documented Information Control Procedure",
        description: "Standard procedure governing document drafting, approvals, versioning, review cadence, and retention.",
        status: "approved",
        owner: "Compliance Mgr",
        actionLink: `/clients/${clientId}/policies`,
        actionLabel: "Open Policy Center",
        lastUpdated: "2025-01-08",
        version: "1.0"
    },

    // 2. Mandatory Topic-Specific Policies (Annex A / Control A.5.1)
    {
        id: "doc-access-control",
        category: "policy",
        categoryLabel: "Topic-Specific Policy",
        clause: "A.5.15, A.8.2",
        title: "Access Control & Authentication Policy",
        description: "Rules for user access provisioning, least privilege, privileged access management, and revocation.",
        status: "approved",
        owner: "IT / SecOps",
        actionLink: `/clients/${clientId}/policies`,
        actionLabel: "Edit Policy",
        lastUpdated: "2025-01-18",
        version: "1.0"
    },
    {
        id: "doc-password-mfa",
        category: "policy",
        categoryLabel: "Topic-Specific Policy",
        clause: "A.5.17",
        title: "Password & Authentication Security Policy",
        description: "Enforcement criteria for Multi-Factor Authentication (MFA), password complexity, and API credential storage.",
        status: "approved",
        owner: "IT / SecOps",
        actionLink: `/clients/${clientId}/policies`,
        actionLabel: "Edit Policy",
        lastUpdated: "2025-01-18",
        version: "1.0"
    },
    {
        id: "doc-data-classification",
        category: "policy",
        categoryLabel: "Topic-Specific Policy",
        clause: "A.5.12, A.5.13",
        title: "Information Classification & Handling Policy",
        description: "Taxonomy of Public, Internal, Confidential, and Restricted data, with handling and disposal rules.",
        status: "review",
        owner: "Data Protection",
        actionLink: `/clients/${clientId}/policies`,
        actionLabel: "Edit Policy",
        lastUpdated: "2025-01-22",
        version: "0.9"
    },
    {
        id: "doc-clean-desk",
        category: "policy",
        categoryLabel: "Topic-Specific Policy",
        clause: "A.7.7",
        title: "Clear Desk & Clear Screen Policy",
        description: "Physical workplace security rules, screen timeout locks, and secure print/paper handling.",
        status: "approved",
        owner: "Facilities / SecOps",
        actionLink: `/clients/${clientId}/policies`,
        actionLabel: "Edit Policy",
        lastUpdated: "2025-01-15",
        version: "1.0"
    },
    {
        id: "doc-crypto",
        category: "policy",
        categoryLabel: "Topic-Specific Policy",
        clause: "A.8.24",
        title: "Cryptography & Key Management Policy",
        description: "Mandated cryptographic standards (AES-256, TLS 1.3), KMS key rotation, and encryption in transit/at rest.",
        status: "approved",
        owner: "SecOps / Dev",
        actionLink: `/clients/${clientId}/policies`,
        actionLabel: "Edit Policy",
        lastUpdated: "2025-01-20",
        version: "1.0"
    },
    {
        id: "doc-backup",
        category: "policy",
        categoryLabel: "Topic-Specific Policy",
        clause: "A.8.13",
        title: "Backup & Data Recovery Policy",
        description: "Recovery Point Objective (RPO) and Recovery Time Objective (RTO) requirements, immutable backup storage, and restore testing.",
        status: "approved",
        owner: "DevOps",
        actionLink: `/clients/${clientId}/policies`,
        actionLabel: "Edit Policy",
        lastUpdated: "2025-01-25",
        version: "1.0"
    },
    {
        id: "doc-incident-response",
        category: "policy",
        categoryLabel: "Topic-Specific Policy",
        clause: "A.5.24–A.5.28",
        title: "Incident Management & Breach Response Plan",
        description: "Severity classification, containment runbooks, communication hierarchy, and regulatory notification procedures.",
        status: "review",
        owner: "SecOps",
        actionLink: `/clients/${clientId}/policies`,
        actionLabel: "Edit Policy",
        lastUpdated: "2025-02-02",
        version: "0.9"
    },
    {
        id: "doc-vendor-security",
        category: "policy",
        categoryLabel: "Topic-Specific Policy",
        clause: "A.5.19–A.5.23",
        title: "Supplier & Third-Party Security Policy",
        description: "Due diligence criteria, mandatory contractual security clauses, DPAs, and recurring vendor reassessments.",
        status: "draft",
        owner: "Procurement / Legal",
        actionLink: `/clients/${clientId}/policies`,
        actionLabel: "Edit Policy",
        lastUpdated: "2025-02-05",
        version: "0.8"
    },
    {
        id: "doc-sdlc",
        category: "policy",
        categoryLabel: "Topic-Specific Policy",
        clause: "A.8.25–A.8.33",
        title: "Secure Development Lifecycle (SDLC) Policy",
        description: "Security architecture, branch protection, code review guidelines, SAST/DAST testing, and segregation of dev/prod.",
        status: "approved",
        owner: "Engineering",
        actionLink: `/clients/${clientId}/policies`,
        actionLabel: "Edit Policy",
        lastUpdated: "2025-01-30",
        version: "1.0"
    },
    {
        id: "doc-bcdr",
        category: "policy",
        categoryLabel: "Topic-Specific Policy",
        clause: "A.5.29, A.5.30",
        title: "Business Continuity & Disaster Recovery (BC/DR) Plan",
        description: "Procedures for maintaining ICT readiness during disruptions, multi-region failover, and annual drill schedules.",
        status: "draft",
        owner: "Ops / Leadership",
        actionLink: `/clients/${clientId}/policies`,
        actionLabel: "Edit Policy",
        lastUpdated: "2025-02-08",
        version: "0.5"
    },
    {
        id: "doc-acceptable-use",
        category: "policy",
        categoryLabel: "Topic-Specific Policy",
        clause: "A.5.9, A.5.10",
        title: "Asset Management & Acceptable Use Policy",
        description: "Rules for authorized computer/mobile usage, prohibited software, BYOD boundaries, and asset return upon offboarding.",
        status: "approved",
        owner: "HR / IT",
        actionLink: `/clients/${clientId}/policies`,
        actionLabel: "Edit Policy",
        lastUpdated: "2025-01-14",
        version: "1.0"
    },
    {
        id: "doc-teleworking",
        category: "policy",
        categoryLabel: "Topic-Specific Policy",
        clause: "A.6.7",
        title: "Remote Working & Teleworking Policy",
        description: "Security safeguards for work-from-home, public Wi-Fi usage, VPN requirements, and physical environment precautions.",
        status: "approved",
        owner: "HR / IT",
        actionLink: `/clients/${clientId}/policies`,
        actionLabel: "Edit Policy",
        lastUpdated: "2025-01-16",
        version: "1.0"
    },

    // 3. Mandatory Operational Records & Audit Evidence
    {
        id: "rec-competence",
        category: "record",
        categoryLabel: "Mandatory Record",
        clause: "Clause 7.2 & 7.3",
        title: "Evidence of Competence & Training Records",
        description: "Logs of employee security awareness training, phishing simulation tests, and role-based certifications.",
        status: "approved",
        owner: "HR Director",
        actionLink: `/clients/${clientId}/training/management`,
        actionLabel: "Open Training",
        lastUpdated: "2025-02-01",
        version: "1.0"
    },
    {
        id: "rec-monitoring",
        category: "record",
        categoryLabel: "Mandatory Record",
        clause: "Clause 9.1",
        title: "Monitoring, Measurement & Telemetry Records",
        description: "Operational uptime metrics, vulnerability scan summaries, access review sign-offs, and security event logs.",
        status: "review",
        owner: "SecOps",
        actionLink: `/evidence`,
        actionLabel: "View Evidence",
        lastUpdated: "2025-02-12",
        version: "1.0"
    },
    {
        id: "rec-audit-program",
        category: "record",
        categoryLabel: "Mandatory Record",
        clause: "Clause 9.2",
        title: "Internal Audit Programme & Schedule",
        description: "Documented annual audit schedule covering all ISMS clauses (4-10) and active Annex A controls.",
        status: "draft",
        owner: "Lead Internal Auditor",
        actionLink: `/clients/${clientId}/iso27001/audit`,
        actionLabel: "Open Audit Program",
        lastUpdated: "2025-02-10",
        version: "0.6"
    },
    {
        id: "rec-audit-report",
        category: "record",
        categoryLabel: "Mandatory Record",
        clause: "Clause 9.2",
        title: "Internal Audit Report & Finding Evidence",
        description: "Completed audit report documenting scope, sample evidence reviewed, non-conformities, and observations.",
        status: "not_started",
        owner: "Lead Internal Auditor",
        actionLink: `/clients/${clientId}/iso27001/audit`,
        actionLabel: "View Findings",
    },
    {
        id: "rec-mgmt-review",
        category: "record",
        categoryLabel: "Mandatory Record",
        clause: "Clause 9.3",
        title: "Management Review Meeting Minutes & Actions",
        description: "Signed executive meeting minutes reviewing ISMS performance, audit results, resources, and improvement decisions.",
        status: "not_started",
        owner: "Leadership",
        actionLink: `/clients/${clientId}/iso27001/management-review`,
        actionLabel: "Open Review",
    },
    {
        id: "rec-capa",
        category: "record",
        categoryLabel: "Mandatory Record",
        clause: "Clause 10.2",
        title: "Nonconformity & Corrective Action (CAPA) Log",
        description: "Log of identified non-conformities, 5-Why root cause investigations, corrective action assignments, and closure approvals.",
        status: "draft",
        owner: "Compliance Mgr",
        actionLink: `/clients/${clientId}/iso27001/audit`,
        actionLabel: "Manage CAPA",
        lastUpdated: "2025-02-14",
        version: "0.4"
    }
];

import { ISOLayout } from "./ISOLayout";

export default function ISODocumentTracker({ params }: { params?: { id: string } }) {
    const { selectedClientId } = useClientContext();
    const clientId = parseInt(params?.id || selectedClientId?.toString() || "0");
    const [location, setLocation] = useLocation();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<"all" | "management" | "policy" | "record">("all");
    const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);

    // Load persisted state or fallback to default template list
    const [documents, setDocuments] = useState<DocumentItem[]>(() => {
        try {
            const stored = localStorage.getItem(`iso27001_docs_${clientId}`);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch {}
        return getMandatoryDocuments(clientId);
    });

    const updateDocumentStatus = (docId: string, status: DocumentItem["status"]) => {
        setDocuments(prev => {
            const next = prev.map(d => d.id === docId ? { ...d, status, lastUpdated: new Date().toISOString().split("T")[0] } : d);
            try {
                localStorage.setItem(`iso27001_docs_${clientId}`, JSON.stringify(next));
            } catch {}
            toast.success("Document status updated");
            return next;
        });
        if (selectedDoc && selectedDoc.id === docId) {
            setSelectedDoc(prev => prev ? { ...prev, status } : null);
        }
    };

    // Status Badge Helper
    const getStatusBadge = (status: string) => {
        switch (status) {
            case "approved":
                return <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20 font-bold">Approved</Badge>;
            case "review":
                return <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20 font-bold">In Review</Badge>;
            case "draft":
                return <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20 hover:bg-blue-500/20 font-bold">Draft</Badge>;
            default:
                return <Badge variant="outline" className="text-muted-foreground border-border font-medium">Not Started</Badge>;
        }
    };

    const getCategoryBadge = (category: string) => {
        switch (category) {
            case "management":
                return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[10px] font-bold">Management Clause</Badge>;
            case "policy":
                return <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 text-[10px] font-bold">Annex A Policy</Badge>;
            case "record":
                return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-bold">Mandatory Record</Badge>;
            default:
                return null;
        }
    };

    const filteredDocs = documents.filter(doc => {
        const matchesCategory = selectedCategory === "all" || doc.category === selectedCategory;
        const matchesSearch = 
            doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.clause.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const handleOpenDocument = (doc: DocumentItem) => {
        setSelectedDoc(doc);
    };

    const approvedCount = documents.filter(d => d.status === "approved").length;
    const reviewCount = documents.filter(d => d.status === "review").length;
    const draftCount = documents.filter(d => d.status === "draft").length;
    const missingCount = documents.filter(d => d.status === "not_started").length;
    const completionPercentage = Math.round((approvedCount / documents.length) * 100);

    return (
        <ISOLayout clientId={clientId} fullWidth={true}>
            <div className="pl-0 pr-4 py-8 md:pl-0 md:pr-8 space-y-8 animate-in fade-in duration-500">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-bold">
                                ISO/IEC 27001:2022 Required
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                                26 Documented Items
                            </Badge>
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                            <FileCheck className="h-8 w-8 text-primary" />
                            Mandatory Document & Record Tracker
                        </h1>
                        <p className="text-sm text-muted-foreground max-w-3xl">
                            Complete catalog of all 26 mandatory governance documents, topic-specific policies (Control A.5.1), and operational audit records required for official ISO 27001:2022 certification.
                        </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                        <Button 
                            variant="default" 
                            className="bg-primary hover:bg-primary/90 font-bold shadow"
                            onClick={() => setLocation(`/clients/${clientId}/policies`)}
                        >
                            <FileText className="mr-2 h-4 w-4" /> Open Policy Center
                        </Button>
                    </div>
                </div>

                {/* Progress Overview */}
                <Card className="bg-card border-border shadow-sm">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="space-y-1">
                                <h3 className="font-semibold text-foreground text-sm sm:text-base">ISMS Audit Document Readiness</h3>
                                <p className="text-xs text-muted-foreground">{approvedCount} of {documents.length} mandatory documents approved ({completionPercentage}%)</p>
                            </div>
                            <span className="text-2xl font-black text-primary">{completionPercentage}%</span>
                        </div>
                        <Progress value={completionPercentage} className="h-3" />
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-border">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-foreground">{documents.length}</p>
                                <p className="text-xs text-muted-foreground uppercase font-bold mt-1">Total Required</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-emerald-600">
                                    {approvedCount}
                                </p>
                                <p className="text-xs text-muted-foreground uppercase font-bold mt-1">Approved</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-amber-600">
                                    {reviewCount}
                                </p>
                                <p className="text-xs text-muted-foreground uppercase font-bold mt-1">In Review</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-rose-500">
                                    {missingCount}
                                </p>
                                <p className="text-xs text-muted-foreground uppercase font-bold mt-1">Not Started</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Filter Pills & Search */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant={selectedCategory === "all" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedCategory("all")}
                            className="rounded-xl text-xs font-bold"
                        >
                            All Documents ({documents.length})
                        </Button>
                        <Button
                            variant={selectedCategory === "management" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedCategory("management")}
                            className="rounded-xl text-xs font-bold"
                        >
                            Management Clauses ({documents.filter(d => d.category === "management").length})
                        </Button>
                        <Button
                            variant={selectedCategory === "policy" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedCategory("policy")}
                            className="rounded-xl text-xs font-bold"
                        >
                            Annex A Policies ({documents.filter(d => d.category === "policy").length})
                        </Button>
                        <Button
                            variant={selectedCategory === "record" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedCategory("record")}
                            className="rounded-xl text-xs font-bold"
                        >
                            Mandatory Records ({documents.filter(d => d.category === "record").length})
                        </Button>
                    </div>

                    <div className="relative max-w-sm w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search document title, clause, or owner..."
                            className="pl-9 bg-card rounded-xl text-xs"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Documents Table Component */}
                <Card className="bg-card border-border shadow-sm overflow-hidden">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/50">
                                    <TableHead className="w-[120px]">ISO Clause</TableHead>
                                    <TableHead>Document Title & Scope</TableHead>
                                    <TableHead className="w-[140px]">Category</TableHead>
                                    <TableHead className="w-[120px]">Status</TableHead>
                                    <TableHead className="w-[140px]">Owner</TableHead>
                                    <TableHead className="w-[110px]">Version</TableHead>
                                    <TableHead className="text-right w-[160px]">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredDocs.map((doc) => (
                                    <TableRow
                                        key={doc.id}
                                        className="group hover:bg-muted/50 cursor-pointer select-none"
                                        onDoubleClick={() => handleOpenDocument(doc)}
                                    >
                                        <TableCell className="font-mono text-xs font-bold text-primary">
                                            {doc.clause}
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-0.5">
                                                <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                                                    {doc.title}
                                                </p>
                                                <p className="text-xs text-muted-foreground line-clamp-1">{doc.description}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {getCategoryBadge(doc.category)}
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="cursor-pointer">
                                                        {getStatusBadge(doc.status)}
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="start">
                                                    <DropdownMenuItem onClick={() => updateDocumentStatus(doc.id, "approved")}>
                                                        Mark Approved
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => updateDocumentStatus(doc.id, "review")}>
                                                        Mark In Review
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => updateDocumentStatus(doc.id, "draft")}>
                                                        Mark Draft
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => updateDocumentStatus(doc.id, "not_started")}>
                                                        Mark Not Started
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground font-medium">
                                            {doc.owner}
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground font-mono">
                                            {doc.version ? `v${doc.version}` : "-"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 text-xs font-bold text-primary hover:bg-primary/10"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setLocation(doc.actionLink);
                                                    }}
                                                >
                                                    {doc.actionLabel}
                                                    <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                                                </Button>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleOpenDocument(doc)}>
                                                            <FileText className="mr-2 h-4 w-4" /> View Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => setLocation(doc.actionLink)}>
                                                            <ExternalLink className="mr-2 h-4 w-4" /> Go to Module
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* Document Details Sheet */}
            <Sheet open={!!selectedDoc} onOpenChange={(open) => !open && setSelectedDoc(null)}>
                <SheetContent className="sm:max-w-xl md:max-w-2xl overflow-y-auto">
                    <SheetHeader className="pb-6 border-b">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="font-mono text-xs font-bold px-2 py-1 bg-primary/10 text-primary rounded">
                                ISO 27001 Clause {selectedDoc?.clause}
                            </span>
                            {selectedDoc && getStatusBadge(selectedDoc.status)}
                        </div>
                        <SheetTitle className="text-2xl font-bold text-foreground">
                            {selectedDoc?.title}
                        </SheetTitle>
                        <SheetDescription className="text-muted-foreground pt-2">
                            {selectedDoc?.description}
                        </SheetDescription>
                    </SheetHeader>

                    <div className="py-8 space-y-8">
                        {/* Status & Ownership */}
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Document Owner</Label>
                                <div className="flex items-center gap-2 p-3 bg-muted rounded-xl border border-border">
                                    <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                        {selectedDoc?.owner.charAt(0)}
                                    </div>
                                    <span className="font-medium text-foreground">{selectedDoc?.owner}</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Last Revision</Label>
                                <div className="flex items-center gap-2 p-3 bg-muted rounded-xl border border-border">
                                    <Clock className="h-4 w-4 text-muted-foreground" />
                                    <span className="font-medium text-foreground">{selectedDoc?.lastUpdated || "N/A"}</span>
                                    {selectedDoc?.version && (
                                        <Badge variant="outline" className="ml-auto text-[10px]">v{selectedDoc.version}</Badge>
                                    )}
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Document Content / Placeholder */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold text-foreground flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-primary" /> Document Content
                                </h4>
                                <Button size="sm" variant="ghost" className="text-primary gap-2">
                                    <Download className="h-4 w-4" /> Download PDF
                                </Button>
                            </div>

                            <div className="p-6 rounded-2xl bg-foreground text-background font-mono text-sm leading-relaxed border border-background/20 shadow-inner min-h-[300px]">
                                <div className="flex gap-4">
                                    <span className="text-background/40">01</span>
                                    <span># {selectedDoc?.title}</span>
                                </div>
                                <div className="flex gap-4">
                                    <span className="text-background/40">02</span>
                                    <span className="text-background/50">// ISO 27001:{selectedDoc?.clause} requirements compliant</span>
                                </div>
                                <div className="flex gap-4">
                                    <span className="text-background/40">03</span>
                                    <span></span>
                                </div>
                                <div className="flex gap-4">
                                    <span className="text-background/40">04</span>
                                    <span className="text-primary">POLICY_SCOPE</span> = "{selectedDoc?.description}"
                                </div>
                                <div className="flex gap-4">
                                    <span className="text-background/40">05</span>
                                    <span></span>
                                </div>
                                <div className="flex gap-4">
                                    <span className="text-background/40">06</span>
                                    <span className="text-emerald-400">DOCUMENT_INFO</span> = [
                                </div>
                                <div className="flex gap-4">
                                    <span className="text-background/40">07</span>
                                    <span>  OWNER: 0x{selectedDoc?.owner.toUpperCase().replace(/\s/g, '_')},</span>
                                </div>
                                <div className="flex gap-4">
                                    <span className="text-background/40">08</span>
                                    <span>  STATUS: <span className="text-amber-400">{selectedDoc?.status.toUpperCase()}</span>,</span>
                                </div>
                                <div className="flex gap-4">
                                    <span className="text-background/40">09</span>
                                    <span>  VERSION: {selectedDoc?.version || "0.0.1"}</span>
                                </div>
                                <div className="flex gap-4">
                                    <span className="text-background/40">10</span>
                                    <span className="text-emerald-400">]</span>
                                </div>
                            </div>
                        </div>

                        <Separator />

                        {/* Recent Activity */}
                        <div className="space-y-4">
                            <h4 className="font-bold text-foreground flex items-center gap-2">
                                <History className="h-4 w-4 text-primary" /> Audit History
                            </h4>
                            <div className="space-y-4">
                                {[
                                    { user: "Jane CISO", action: "Approved version 1.0", date: "2 days ago", icon: CheckCircle2, color: "text-emerald-500" },
                                    { user: "System AI", action: "Policy alignment check passed", date: "3 days ago", icon: Eye, color: "text-blue-500" },
                                    { user: "Mike Ops", action: "Modified draft", date: "5 days ago", icon: Save, color: "text-muted-foreground" },
                                ].map((activity, i) => (
                                    <div key={i} className="flex items-start gap-3">
                                        <div className={cn("p-2 rounded-full bg-muted", activity.color)}>
                                            <activity.icon className="h-3 w-3" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-xs font-bold text-foreground">{activity.user}</p>
                                            <p className="text-xs text-muted-foreground">{activity.action}</p>
                                        </div>
                                        <span className="text-[10px] text-muted-foreground">{activity.date}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="sticky bottom-0 bg-card border-t p-6 -mx-6 flex items-center justify-between">
                        <Button variant="outline" className="gap-2" onClick={() => setSelectedDoc(null)}>
                            Close Viewer
                        </Button>
                        <div className="flex items-center gap-2">
                            {selectedDoc && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" className="gap-2">
                                            Status: {selectedDoc.status.replace('_', ' ')}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => updateDocumentStatus(selectedDoc.id, "approved")}>
                                            Mark Approved
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => updateDocumentStatus(selectedDoc.id, "review")}>
                                            Mark In Review
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => updateDocumentStatus(selectedDoc.id, "draft")}>
                                            Mark Draft
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => updateDocumentStatus(selectedDoc.id, "not_started")}>
                                            Mark Not Started
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                            {selectedDoc?.actionLink && (
                                <Button 
                                    className="bg-primary hover:bg-primary/90 font-bold gap-2"
                                    onClick={() => {
                                        setLocation(selectedDoc.actionLink);
                                        setSelectedDoc(null);
                                    }}
                                >
                                    {selectedDoc.actionLabel}
                                    <ExternalLink className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </ISOLayout>
    );
}
