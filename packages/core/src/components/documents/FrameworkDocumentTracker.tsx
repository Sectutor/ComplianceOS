import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Progress } from "@complianceos/ui/ui/progress";
import {
    FileText,
    CheckCircle2,
    Circle,
    AlertCircle,
    ExternalLink,
    Search,
    FileCheck,
    Clock,
    User,
    ChevronRight,
    Shield,
    Sparkles,
    BookOpen
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
import { Separator } from "@complianceos/ui/ui/separator";
import {
    DocumentItem,
    getFrameworkDocuments
} from "@/data/frameworkDocuments";

interface FrameworkDocumentTrackerProps {
    framework: string;
    clientId: number;
    title?: string;
    subtitle?: string;
}

export const FrameworkDocumentTracker: React.FC<FrameworkDocumentTrackerProps> = ({
    framework,
    clientId,
    title,
    subtitle
}) => {
    const [, setLocation] = useLocation();
    const config = getFrameworkDocuments(framework, clientId);

    const storageKey = `complianceos_docs_${framework}_client_${clientId}`;

    const [documents, setDocuments] = useState<DocumentItem[]>(() => {
        if (!config) return [];
        try {
            const saved = localStorage.getItem(storageKey);
            if (saved) {
                const parsedStatus = JSON.parse(saved) as Record<string, DocumentItem["status"]>;
                return config.documents.map(d => ({
                    ...d,
                    status: parsedStatus[d.id] || d.status
                }));
            }
        } catch {
            // fallback
        }
        return config.documents;
    });

    useEffect(() => {
        if (config) {
            try {
                const saved = localStorage.getItem(storageKey);
                if (saved) {
                    const parsedStatus = JSON.parse(saved) as Record<string, DocumentItem["status"]>;
                    setDocuments(config.documents.map(d => ({
                        ...d,
                        status: parsedStatus[d.id] || d.status
                    })));
                } else {
                    setDocuments(config.documents);
                }
            } catch {
                setDocuments(config.documents);
            }
        }
    }, [framework, clientId]);

    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);

    if (!config) {
        return (
            <Card className="p-8 text-center bg-muted/20 border-dashed">
                <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <h3 className="font-bold text-base text-foreground">No Document Spec Found</h3>
                <p className="text-xs text-muted-foreground mt-1">Documentation catalog for &apos;{framework}&apos; is currently being compiled.</p>
            </Card>
        );
    }

    const updateStatus = (docId: string, newStatus: DocumentItem["status"]) => {
        const updated = documents.map(d => d.id === docId ? { ...d, status: newStatus } : d);
        setDocuments(updated);

        try {
            const statusMap: Record<string, DocumentItem["status"]> = {};
            updated.forEach(d => { statusMap[d.id] = d.status; });
            localStorage.setItem(storageKey, JSON.stringify(statusMap));
        } catch {
            // ignore
        }

        const labels: Record<DocumentItem["status"], string> = {
            approved: "Approved & Published",
            review: "Moved to In Review",
            draft: "Draft in Progress",
            not_started: "Reset to Not Started"
        };
        toast.success(`Document Updated: ${labels[newStatus]}`);
    };

    const filteredDocs = documents.filter(doc => {
        const matchesCategory = selectedCategory === "all" || doc.category === selectedCategory;
        const matchesSearch =
            doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.clause.toLowerCase().includes(searchQuery.toLowerCase()) ||
            doc.description.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesCategory && matchesSearch;
    });

    const approvedCount = documents.filter(d => d.status === "approved").length;
    const reviewCount = documents.filter(d => d.status === "review").length;
    const missingCount = documents.filter(d => d.status === "not_started").length;
    const completionPercentage = documents.length > 0 ? Math.round((approvedCount / documents.length) * 100) : 0;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                        <Badge className="bg-primary/10 text-primary border-primary/20 text-xs font-bold">
                            {config.badge}
                        </Badge>
                        <Badge variant="outline" className="text-xs font-bold">
                            {documents.length} Mandatory Items
                        </Badge>
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                        <FileCheck className="h-6 w-6 text-primary" />
                        {title || `${config.frameworkName} Mandatory Document & Record Tracker`}
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground max-w-3xl">
                        {subtitle || config.description}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="default"
                        size="sm"
                        className="font-bold shadow-sm"
                        onClick={() => setLocation(`/clients/${clientId}/policies`)}
                    >
                        <FileText className="mr-1.5 h-3.5 w-3.5" /> Policy Center
                    </Button>
                </div>
            </div>

            {/* Progress Card */}
            <Card className="bg-card border-border shadow-sm">
                <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="space-y-0.5">
                            <h3 className="font-semibold text-foreground text-sm">Regulatory Documentation Readiness</h3>
                            <p className="text-xs text-muted-foreground">{approvedCount} of {documents.length} items approved ({completionPercentage}%)</p>
                        </div>
                        <span className="text-2xl font-black text-primary">{completionPercentage}%</span>
                    </div>
                    <Progress value={completionPercentage} className="h-2.5" />
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border">
                        <div className="text-center">
                            <p className="text-xl font-bold text-foreground">{documents.length}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold mt-0.5">Total Required</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xl font-bold text-emerald-600">{approvedCount}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold mt-0.5">Approved</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xl font-bold text-amber-600">{reviewCount}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold mt-0.5">In Review</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xl font-bold text-rose-500">{missingCount}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold mt-0.5">Not Started</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Filter Pills & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-wrap gap-1.5">
                    {config.categories.map(cat => (
                        <Button
                            key={cat.id}
                            variant={selectedCategory === cat.id ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedCategory(cat.id)}
                            className="rounded-xl text-xs font-semibold h-8"
                        >
                            {cat.label}
                        </Button>
                    ))}
                </div>

                <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search clause, title..."
                        className="pl-8 h-8 text-xs bg-background"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Document Table */}
            <Card className="border-border shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/40">
                        <TableRow>
                            <TableHead className="w-[140px] text-xs font-bold">Clause / Ref</TableHead>
                            <TableHead className="text-xs font-bold">Mandatory Document / Record</TableHead>
                            <TableHead className="w-[140px] text-xs font-bold">Status</TableHead>
                            <TableHead className="w-[120px] text-xs font-bold">Owner</TableHead>
                            <TableHead className="w-[120px] text-right text-xs font-bold">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredDocs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-28 text-center text-muted-foreground text-xs">
                                    No mandatory documents match your filter.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredDocs.map(doc => (
                                <TableRow
                                    key={doc.id}
                                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                                    onClick={() => setSelectedDoc(doc)}
                                >
                                    <TableCell className="font-mono text-xs font-semibold">
                                        <Badge variant="outline" className="bg-background text-[11px] font-mono">
                                            {doc.clause}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-bold text-xs sm:text-sm text-foreground hover:text-primary transition-colors">
                                                    {doc.title}
                                                </span>
                                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                                    {doc.categoryLabel}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground line-clamp-1">{doc.description}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 px-2 font-bold text-xs flex items-center gap-1.5"
                                                >
                                                    {doc.status === "approved" && (
                                                        <span className="inline-flex items-center gap-1 text-emerald-600">
                                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                                            Approved
                                                        </span>
                                                    )}
                                                    {doc.status === "review" && (
                                                        <span className="inline-flex items-center gap-1 text-amber-600">
                                                            <Clock className="w-3.5 h-3.5 text-amber-600" />
                                                            In Review
                                                        </span>
                                                    )}
                                                    {doc.status === "draft" && (
                                                        <span className="inline-flex items-center gap-1 text-blue-600">
                                                            <Circle className="w-3.5 h-3.5 text-blue-600" />
                                                            Draft
                                                        </span>
                                                    )}
                                                    {doc.status === "not_started" && (
                                                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                                                            <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                                                            Missing
                                                        </span>
                                                    )}
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start" className="w-44">
                                                <DropdownMenuItem onClick={() => updateStatus(doc.id, "approved")} className="text-xs font-semibold text-emerald-600">
                                                    <CheckCircle2 className="mr-2 h-3.5 w-3.5" /> Approved
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => updateStatus(doc.id, "review")} className="text-xs font-semibold text-amber-600">
                                                    <Clock className="mr-2 h-3.5 w-3.5" /> In Review
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => updateStatus(doc.id, "draft")} className="text-xs font-semibold text-blue-600">
                                                    <Circle className="mr-2 h-3.5 w-3.5" /> Draft
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => updateStatus(doc.id, "not_started")} className="text-xs font-semibold text-rose-500">
                                                    <AlertCircle className="mr-2 h-3.5 w-3.5" /> Not Started
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground font-medium">
                                        <div className="flex items-center gap-1">
                                            <User className="w-3 h-3 text-muted-foreground" />
                                            <span>{doc.owner}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-xs font-bold gap-1"
                                            onClick={() => setLocation(doc.actionLink)}
                                        >
                                            {doc.actionLabel}
                                            <ChevronRight className="w-3 h-3" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Document Detail Slide-out Sheet */}
            <Sheet open={!!selectedDoc} onOpenChange={(open) => !open && setSelectedDoc(null)}>
                <SheetContent className="sm:max-w-md space-y-6 overflow-y-auto">
                    {selectedDoc && (
                        <>
                            <SheetHeader className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="font-mono text-xs">
                                        {selectedDoc.clause}
                                    </Badge>
                                    <Badge className="bg-primary/10 text-primary text-xs">
                                        {selectedDoc.categoryLabel}
                                    </Badge>
                                </div>
                                <SheetTitle className="text-xl font-bold leading-tight">
                                    {selectedDoc.title}
                                </SheetTitle>
                                <SheetDescription className="text-xs leading-relaxed">
                                    {selectedDoc.description}
                                </SheetDescription>
                            </SheetHeader>

                            <Separator />

                            {selectedDoc.auditTip && (
                                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 space-y-1">
                                    <div className="font-bold flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                                        Auditor Inspection Guidance
                                    </div>
                                    <p className="text-[11px] leading-relaxed opacity-90">{selectedDoc.auditTip}</p>
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Current Lifecycle Status</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        {(["not_started", "draft", "review", "approved"] as const).map(st => (
                                            <Button
                                                key={st}
                                                variant={selectedDoc.status === st ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => {
                                                    updateStatus(selectedDoc.id, st);
                                                    setSelectedDoc({ ...selectedDoc, status: st });
                                                }}
                                                className="text-xs font-bold capitalize justify-start h-8"
                                            >
                                                {st === "approved" && <CheckCircle2 className="w-3 h-3 mr-1.5 text-emerald-500" />}
                                                {st === "review" && <Clock className="w-3 h-3 mr-1.5 text-amber-500" />}
                                                {st === "draft" && <Circle className="w-3 h-3 mr-1.5 text-blue-500" />}
                                                {st === "not_started" && <AlertCircle className="w-3 h-3 mr-1.5 text-rose-500" />}
                                                {st.replace("_", " ")}
                                            </Button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 text-xs">
                                    <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
                                        <span className="text-muted-foreground">Document Owner</span>
                                        <p className="font-bold text-foreground">{selectedDoc.owner}</p>
                                    </div>
                                    <div className="p-3 rounded-lg border bg-muted/20 space-y-1">
                                        <span className="text-muted-foreground">Version</span>
                                        <p className="font-bold text-foreground">{selectedDoc.version || "1.0"}</p>
                                    </div>
                                </div>

                                <div className="pt-3">
                                    <Button
                                        className="w-full font-bold shadow gap-2"
                                        onClick={() => {
                                            const link = selectedDoc.actionLink;
                                            setSelectedDoc(null);
                                            setLocation(link);
                                        }}
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Launch {selectedDoc.actionLabel}
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
};

