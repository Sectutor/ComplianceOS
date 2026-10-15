import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useClientContext } from "@/contexts/ClientContext";
import { Button } from "@complianceos/ui/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@complianceos/ui/ui/card";
import { 
    Plus, 
    FileText, 
    Copy, 
    Trash2, 
    ShieldCheck, 
    Send, 
    Sparkles, 
    CheckCircle2, 
    Clock, 
    AlertCircle, 
    Calendar, 
    Mail, 
    ExternalLink, 
    Check,
    Layers
} from "lucide-react";
import { PageGuide } from "@/components/PageGuide";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@complianceos/ui/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@complianceos/ui/ui/tabs";
import { Badge } from "@complianceos/ui/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@complianceos/ui/ui/table";

interface TemplateRecord {
    id: number;
    name: string;
    description?: string;
    framework?: string;
    questionCount?: number;
    dispatchedCount?: number;
    updatedAt?: string | Date;
    createdAt?: string | Date;
}

export default function AssessmentTemplates() {
    const { selectedClientId: clientId } = useClientContext();
    const [, setLocation] = useLocation();
    const [templateToDelete, setTemplateToDelete] = useState<TemplateRecord | null>(null);
    const [activeTab, setActiveTab] = useState<string>("templates");
    const [copiedToken, setCopiedToken] = useState<string | null>(null);

    // Fetch vendor assessment templates
    const { 
        data: templates, 
        isLoading: isTemplatesLoading, 
        refetch: refetchTemplates 
    } = trpc.vendors.listTemplates.useQuery(
        { clientId: clientId! },
        { enabled: !!clientId }
    );

    // Fetch assessment requests sent to vendors (Dispatches)
    const { 
        data: assessmentRequests, 
        isLoading: isRequestsLoading, 
        refetch: refetchRequests 
    } = trpc.vendors.listAssessmentRequests.useQuery(
        { clientId: clientId! },
        { enabled: !!clientId }
    );

    // Delete mutation
    const deleteMutation = trpc.vendors.deleteTemplate.useMutation({
        onSuccess: () => {
            toast.success("Template deleted successfully");
            setTemplateToDelete(null);
            refetchTemplates();
        },
        onError: (err: { message: string }) => {
            toast.error(`Failed to delete template: ${err.message}`);
        }
    });

    // Seed standard industry templates mutation
    const seedMutation = trpc.vendors.seedStandardTemplates.useMutation({
        onSuccess: (data) => {
            toast.success(`Successfully loaded industry standard templates (${data.count} added)!`);
            refetchTemplates();
        },
        onError: (err: { message: string }) => {
            toast.error(`Failed to seed templates: ${err.message}`);
        }
    });

    const confirmDelete = () => {
        if (templateToDelete) {
            deleteMutation.mutate({ id: templateToDelete.id });
        }
    };

    const copyPortalLink = (token: string) => {
        const url = `${window.location.origin}/portal/assessment/${token}`;
        navigator.clipboard.writeText(url);
        setCopiedToken(token);
        toast.success("Vendor assessment portal link copied to clipboard!");
        setTimeout(() => setCopiedToken(null), 2500);
    };

    const totalTemplates = templates?.length || 0;
    const totalDispatches = assessmentRequests?.length || 0;
    const completedDispatches = assessmentRequests?.filter(r => r.status === 'completed' || r.status === 'submitted').length || 0;
    const pendingDispatches = assessmentRequests?.filter(r => r.status === 'sent' || r.status === 'in_progress').length || 0;

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <PageGuide
                    title="Vendor Assessment Templates"
                    description="Standardize third-party risk assessments mapped directly to ISO 27001, CIS Controls, CAIQ, and SOC 2."
                    rationale="Eliminate ad-hoc vendor evaluations by utilizing version-controlled, control-mapped questionnaire blueprints with complete tracking of vendor dispatches."
                    howToUse={[
                        { step: "Select or Create", description: "Choose a pre-built industry standard template or author custom control questions." },
                        { step: "Dispatch", description: "Send assessments from any vendor profile with unique, secure external portal links." },
                        { step: "Track & Score", description: "Monitor completion status, review submitted evidence, and generate audit-ready risk scores." }
                    ]}
                />
                
                <div className="flex items-center gap-3">
                    <Button 
                        variant="outline" 
                        onClick={() => seedMutation.mutate({ clientId: clientId! })}
                        disabled={seedMutation.isPending}
                        className="bg-white border-slate-300 hover:bg-slate-50 text-slate-700 shadow-xs"
                    >
                        <Sparkles className="mr-2 h-4 w-4 text-blue-600" />
                        {seedMutation.isPending ? "Loading Standards..." : "Restore Industry Standards"}
                    </Button>
                    <Button 
                        onClick={() => setLocation(`/clients/${clientId}/vendors/templates/new`)}
                        className="bg-[#1C4D8D] hover:bg-[#153B6D] active:bg-[#153B6D] text-white shadow-xs"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        New Template
                    </Button>
                </div>
            </div>

            {/* KPI Stats Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-slate-200 bg-white shadow-xs">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Available Templates</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">{totalTemplates}</p>
                            <p className="text-xs text-slate-500 mt-0.5">Control-mapped blueprints</p>
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                            <Layers className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 bg-white shadow-xs">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sent to Vendors</p>
                            <p className="text-2xl font-bold text-slate-900 mt-1">{totalDispatches}</p>
                            <p className="text-xs text-slate-500 mt-0.5">Total assessment dispatches</p>
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                            <Send className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 bg-white shadow-xs">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Awaiting Vendor</p>
                            <p className="text-2xl font-bold text-amber-600 mt-1">{pendingDispatches}</p>
                            <p className="text-xs text-slate-500 mt-0.5">Pending completion</p>
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                            <Clock className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-slate-200 bg-white shadow-xs">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed Reviews</p>
                            <p className="text-2xl font-bold text-emerald-600 mt-1">{completedDispatches}</p>
                            <p className="text-xs text-slate-500 mt-0.5">Submissions evaluated</p>
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                            <CheckCircle2 className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Navigation Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="bg-slate-100 p-1 border border-slate-200">
                    <TabsTrigger 
                        value="templates" 
                        className="data-[state=active]:bg-[#1C4D8D] data-[state=active]:text-white font-medium text-xs px-4"
                    >
                        Templates Library ({totalTemplates})
                    </TabsTrigger>
                    <TabsTrigger 
                        value="dispatches" 
                        className="data-[state=active]:bg-[#1C4D8D] data-[state=active]:text-white font-medium text-xs px-4"
                    >
                        Sent to Vendors ({totalDispatches})
                    </TabsTrigger>
                </TabsList>

                {/* TAB 1: TEMPLATES LIBRARY */}
                <TabsContent value="templates" className="mt-6 space-y-6">
                    {isTemplatesLoading ? (
                        <div className="text-center py-16 text-slate-500">Loading templates library...</div>
                    ) : templates && templates.length === 0 ? (
                        <div className="text-center py-16 border rounded-xl bg-slate-50/50 border-dashed border-slate-300">
                            <FileText className="mx-auto h-12 w-12 text-slate-400 mb-3" />
                            <h3 className="text-base font-semibold text-slate-800">No Assessment Templates Found</h3>
                            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-4">
                                You don't have any vendor assessment questionnaires configured yet. Click below to load industry standards or build a custom one.
                            </p>
                            <div className="flex items-center justify-center gap-3">
                                <Button 
                                    onClick={() => seedMutation.mutate({ clientId: clientId! })}
                                    className="bg-[#1C4D8D] hover:bg-[#153B6D] text-white"
                                >
                                    <Sparkles className="mr-2 h-4 w-4" /> Load Industry Standards
                                </Button>
                                <Button 
                                    variant="outline" 
                                    onClick={() => setLocation(`/clients/${clientId}/vendors/templates/new`)}
                                >
                                    <Plus className="mr-2 h-4 w-4" /> Create Custom Template
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {templates?.map((template) => {
                                const isDispatched = (template.dispatchedCount || 0) > 0;

                                return (
                                    <Card key={template.id} className="hover:shadow-md transition-all border-slate-200 flex flex-col justify-between bg-white">
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <Badge 
                                                    variant="outline" 
                                                    className="font-medium text-[11px] bg-blue-50/80 text-blue-700 border-blue-200"
                                                >
                                                    {template.framework || "Standard"}
                                                </Badge>
                                                
                                                {isDispatched ? (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                                                        <Send className="h-3 w-3" /> Dispatched ({template.dispatchedCount})
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
                                                        Ready to Send
                                                    </span>
                                                )}
                                            </div>

                                            <CardTitle className="text-base font-semibold text-slate-900 mt-2 line-clamp-2 leading-snug">
                                                {template.name}
                                            </CardTitle>

                                            <CardDescription className="text-xs text-slate-500 line-clamp-2 mt-1">
                                                {template.description || "Vendor assessment questionnaire with mapped controls."}
                                            </CardDescription>

                                            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
                                                <span className="font-semibold text-slate-700">
                                                    {template.questionCount || 0} Questions
                                                </span>
                                                <span>•</span>
                                                <span>
                                                    Updated {template.updatedAt ? new Date(template.updatedAt).toLocaleDateString() : 'Recently'}
                                                </span>
                                            </div>
                                        </CardHeader>

                                        <CardContent className="pt-0 pb-4">
                                            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs h-8 px-2"
                                                    onClick={() => setTemplateToDelete(template)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
                                                </Button>

                                                <Link href={`/clients/${clientId}/vendors/templates/${template.id}`}>
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm"
                                                        className="text-xs h-8 bg-slate-50 hover:bg-slate-100 border-slate-300 font-medium text-slate-700"
                                                    >
                                                        <FileText className="h-3.5 w-3.5 mr-1 text-blue-600" /> View & Edit Questions
                                                    </Button>
                                                </Link>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </TabsContent>

                {/* TAB 2: DISPATCHES & SENT TO VENDORS */}
                <TabsContent value="dispatches" className="mt-6 space-y-6">
                    {isRequestsLoading ? (
                        <div className="text-center py-16 text-slate-500">Loading vendor dispatches...</div>
                    ) : assessmentRequests && assessmentRequests.length === 0 ? (
                        <div className="text-center py-16 border rounded-xl bg-slate-50/50 border-dashed border-slate-300">
                            <Send className="mx-auto h-12 w-12 text-slate-400 mb-3" />
                            <h3 className="text-base font-semibold text-slate-800">No Assessment Dispatches Yet</h3>
                            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-4">
                                You haven't sent any assessment templates to vendors yet. To dispatch an assessment, go to any vendor profile and click "Send Security Assessment".
                            </p>
                            <Button 
                                onClick={() => setLocation(`/clients/${clientId}/vendors`)}
                                className="bg-[#1C4D8D] hover:bg-[#153B6D] text-white"
                            >
                                Go to Vendor Directory
                            </Button>
                        </div>
                    ) : (
                        <Card className="border-slate-200 shadow-xs overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50/80">
                                    <TableRow>
                                        <TableHead className="font-semibold text-xs">Vendor Name</TableHead>
                                        <TableHead className="font-semibold text-xs">Template Dispatched</TableHead>
                                        <TableHead className="font-semibold text-xs">Recipient Contact</TableHead>
                                        <TableHead className="font-semibold text-xs">Status</TableHead>
                                        <TableHead className="font-semibold text-xs">Risk / Trust Score</TableHead>
                                        <TableHead className="font-semibold text-xs">Sent / Due Date</TableHead>
                                        <TableHead className="font-semibold text-xs text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {assessmentRequests?.map((req) => {
                                        const isCopied = copiedToken === req.token;

                                        let statusBadge = (
                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                                <Clock className="h-3 w-3 mr-1" /> Sent (Awaiting Vendor)
                                            </Badge>
                                        );

                                        if (req.status === 'in_progress') {
                                            statusBadge = (
                                                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                                                    <Clock className="h-3 w-3 mr-1" /> In Progress
                                                </Badge>
                                            );
                                        } else if (req.status === 'submitted') {
                                            statusBadge = (
                                                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                                                    <AlertCircle className="h-3 w-3 mr-1" /> Submitted (Needs Review)
                                                </Badge>
                                            );
                                        } else if (req.status === 'completed') {
                                            statusBadge = (
                                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-xs">
                                                    <CheckCircle2 className="h-3 w-3 mr-1" /> Completed & Evaluated
                                                </Badge>
                                            );
                                        }

                                        return (
                                            <TableRow key={req.id} className="hover:bg-slate-50/60">
                                                <TableCell className="font-medium text-slate-900">
                                                    <Link 
                                                        href={`/clients/${clientId}/vendors/${req.vendorId}`} 
                                                        className="hover:underline text-blue-600 flex items-center gap-1 font-semibold"
                                                    >
                                                        {req.vendorName || `Vendor #${req.vendorId}`}
                                                        <ExternalLink className="h-3 w-3 opacity-60" />
                                                    </Link>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium text-slate-800 text-xs">
                                                        {req.templateName || `Template #${req.templateId}`}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                                                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                                                        {req.recipientEmail || "Not specified"}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {statusBadge}
                                                </TableCell>
                                                <TableCell>
                                                    {req.score !== null && req.score !== undefined ? (
                                                        <span className="font-semibold text-xs px-2 py-0.5 rounded-md bg-slate-100 text-slate-800">
                                                            {req.score} / 100
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">Pending</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-xs space-y-0.5 text-slate-600">
                                                        <div>Sent: {req.sentAt ? new Date(req.sentAt).toLocaleDateString() : 'N/A'}</div>
                                                        {req.expiresAt && (
                                                            <div className="text-[11px] text-slate-500">
                                                                Due: {new Date(req.expiresAt).toLocaleDateString()}
                                                            </div>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-xs h-8 px-2.5 bg-white border-slate-300"
                                                            onClick={() => copyPortalLink(req.token)}
                                                        >
                                                            {isCopied ? (
                                                                <>
                                                                    <Check className="h-3.5 w-3.5 mr-1 text-emerald-600" /> Copied
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <Copy className="h-3.5 w-3.5 mr-1" /> Copy Portal Link
                                                                </>
                                                            )}
                                                        </Button>

                                                        <Link href={`/clients/${clientId}/vendors/${req.vendorId}`}>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-xs h-8 px-2"
                                                            >
                                                                View Vendor
                                                            </Button>
                                                        </Link>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </Card>
                    )}
                </TabsContent>
            </Tabs>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!templateToDelete} onOpenChange={(open) => !open && setTemplateToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Assessment Template</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete "{templateToDelete?.name}"? Any active links sent to vendors referencing this template will need to be re-evaluated.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? "Deleting..." : "Delete Template"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
