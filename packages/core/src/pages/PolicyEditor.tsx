import React, { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Input } from "@complianceos/ui/ui/input";
import { Label } from "@complianceos/ui/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { Badge } from "@complianceos/ui/ui/badge";
import { Breadcrumb } from "@/components/Breadcrumb";
import { ArrowLeft, Save, Eye, FileText, Loader2, History, RotateCcw, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@complianceos/ui/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@complianceos/ui/ui/dialog";
import RichTextEditor from "@/components/RichTextEditor";
import { marked } from "marked";
import TurndownService from "turndown";
// @ts-ignore
import html2pdf from "html2pdf.js";
// @ts-ignore
import { asBlob } from "html-docx-js-typescript";
import { saveAs } from "file-saver";
export default function PolicyEditor() {
    const params = useParams();
    const clientId = Number(params.id);
    const policyId = Number(params.policyId);
    const [location, setLocation] = useLocation();

    const { data: policyData, isLoading: loadingPolicy, refetch: refetchPolicy } = trpc.clientPolicies.get.useQuery(
        { id: policyId, clientId },
        { enabled: !!clientId && !!policyId }
    );

    const updatePolicyMutation = trpc.clientPolicies.update.useMutation();
    const deletePolicyMutation = trpc.clientPolicies.delete.useMutation();
    const publishVersionMutation = trpc.clientPolicies.publish.useMutation();
    const restoreVersionMutation = trpc.clientPolicies.restore.useMutation();
    const { data: versionHistory, refetch: refetchHistory } = trpc.clientPolicies.history.useQuery(
        { policyId },
        { enabled: !!policyId }
    );

    const [name, setName] = useState("");
    const [content, setContent] = useState("");
    const [status, setStatus] = useState("draft");
    const [owner, setOwner] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
    const [isContentReady, setIsContentReady] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishNotes, setPublishNotes] = useState("");
    const [publishVersion, setPublishVersion] = useState("");
    const [showPublishDialog, setShowPublishDialog] = useState(false);
    const [showGuide, setShowGuide] = useState(false);

    // Initialize turndown service for HTML to markdown conversion (matching PolicyTemplates.tsx pattern)
    // Initialize turndown service for HTML to markdown conversion (matching PolicyTemplates.tsx pattern)
    // Use 'atx' heading style (## Header) instead of setext (Header\n------)
    const turndownService = useMemo(() => {
        const service = new TurndownService({ headingStyle: 'atx' });
        return service;
    }, []);

    // Initialize form with policy data - always parse as Markdown (matching PolicyTemplates.tsx pattern)
    useEffect(() => {
        if (policyData) {
            const policy = policyData.clientPolicy || policyData;
            setName(policy.name || "");
            setStatus(policy.status || "draft");
            setOwner(policy.owner || "");

            // Always parse content as Markdown and convert to HTML for the RichTextEditor
            // This ensures consistent behavior regardless of stored format
            if (policy.content) {
                try {
                    // Start loading phase
                    setIsContentReady(false);

                    // NEW: Smart Loading Logic
                    // 1. Strip wrappers
                    let cleanContent = policy.content;
                    if (cleanContent.trim().startsWith("```markdown")) {
                        cleanContent = cleanContent.replace(/^```markdown\s*/, '').replace(/\s*```$/, '');
                    } else if (cleanContent.trim().startsWith("```")) {
                        cleanContent = cleanContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
                    }

                    // 2. Detect if it's already HTML
                    const isHtml = /<[a-z][\s\S]*>/i.test(cleanContent);

                    if (isHtml) {
                        console.log("Detected HTML storage, loading directly");
                        setContent(cleanContent);
                    } else {
                        console.log("Detected Markdown storage, parsing to HTML");
                        const htmlContent = marked.parse(cleanContent, { async: false }) as string;
                        setContent(htmlContent);
                    }
                } catch (error) {
                    console.error("Error parsing markdown:", error);
                    setContent(policy.content);
                } finally {
                    // Mark as ready to render editor
                    setTimeout(() => setIsContentReady(true), 100);
                }
            } else {
                setContent("");
                setIsContentReady(true);
            }
        }
    }, [policyData]);

    const handleSave = async () => {
        if (!clientId || !policyId) {
            toast.error("Missing client or policy ID");
            return;
        }

        setIsSaving(true);
        try {
            // TRANSITION: Save HTML directly to preserve rich formatting.
            // Bypassing turndownService.turndown(content) to prevent data loss.
            const contentToSave = content;

            await updatePolicyMutation.mutateAsync({
                id: policyId,
                clientId,
                name,
                content: contentToSave,
                status,
                owner
            });

            toast.success("Policy updated successfully");
            refetchPolicy();
        } catch (error: any) {
            console.error("Error saving policy:", error);
            toast.error(error.message || "Failed to save policy");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this policy? This action cannot be undone.")) {
            return;
        }

        try {
            await deletePolicyMutation.mutateAsync({ id: policyId, clientId });
            toast.success("Policy deleted successfully");
            setLocation(`/clients/${clientId}/policies`);
        } catch (error: any) {
            console.error("Error deleting policy:", error);
            toast.error(error.message || "Failed to delete policy");
        }
    };

    const handlePublishVersion = async () => {
        if (!policyId) return;
        setIsPublishing(true);
        try {
            await publishVersionMutation.mutateAsync({
                id: policyId,
                version: publishVersion || undefined,
                notes: publishNotes
            });
            toast.success("Version published successfully");
            setPublishNotes("");
            setPublishVersion("");
            setShowPublishDialog(false);
            refetchPolicy();
            refetchHistory();
        } catch (error: any) {
            console.error("Error publishing version:", error);
            toast.error(error.message || "Failed to publish version");
        } finally {
            setIsPublishing(false);
        }
    };

    const handleRestoreVersion = async (versionId: number) => {
        if (!policyId) return;
        if (!confirm("Are you sure you want to restore this version? This will overwrite the current draft.")) return;

        try {
            await restoreVersionMutation.mutateAsync({
                policyId,
                versionId
            });
            toast.success("Version restored to draft");
            refetchPolicy();
            // Need to reload content - useEffect will handle it when policyData changes
        } catch (error: any) {
            console.error("Error restoring version:", error);
            toast.error(error.message || "Failed to restore version");
        }
    };

    const handleExportPDF = () => {
        const element = document.createElement("div");
        element.innerHTML = `
            <div style="padding: 40px; font-family: Arial, sans-serif; color: #333;">
                <div style="text-align: center; margin-bottom: 40px; border-bottom: 2px solid #333; padding-bottom: 20px;">
                    <h1 style="font-size: 24px; margin: 0; text-transform: uppercase;">${name}</h1>
                    <p style="margin: 10px 0 0; color: #666;">Compliance Policy Document</p>
                </div>
                <div class="content" style="font-size: 12pt; line-height: 1.6;">
                    ${content}
                </div>
                <div style="margin-top: 50px; font-size: 10pt; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
                    <p>Generated by ComplianceOS on ${new Date().toLocaleDateString()}</p>
                    <p>Confidential - Internal Use Only</p>
                </div>
            </div>
        `;

        const opt = {
            margin: 10,
            filename: `${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        html2pdf().set(opt).from(element).save();
        toast.success("PDF export started");
    };

    const handleExportWord = async () => {
        try {
            const htmlString = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>${name}</title>
                    <style>
                        body { font-family: 'Calibri', 'Arial', sans-serif; }
                        h1 { color: #2E74B5; border-bottom: 1px solid #2E74B5; padding-bottom: 10px; }
                        h2 { color: #2E74B5; margin-top: 20px; }
                        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
                        th { background-color: #F2F2F2; border: 1px solid #DDD; padding: 8px; text-align: left; }
                        td { border: 1px solid #DDD; padding: 8px; }
                    </style>
                </head>
                <body>
                    <h1 style="text-align: center;">${name}</h1>
                    <p style="text-align: center; color: #666; margin-bottom: 30px;">Generated by ComplianceOS</p>
                    ${content}
                    <br/><br/>
                    <hr/>
                    <p style="font-size: 10pt; color: #999; text-align: center;">Confidential - ${new Date().toLocaleDateString()}</p>
                </body>
                </html>
            `;

            const blob = await asBlob(htmlString);
            saveAs(blob, `${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.docx`);
            toast.success("Word export downloaded");
        } catch (error) {
            console.error("Export failed:", error);
            toast.error("Failed to export Word document");
        }
    };

    const renderPreview = () => {
        try {
            // Content should already be HTML from RichTextEditor
            // But if it's markdown (e.g., from old data), convert it
            if (content && content.trim() !== "") {
                // Check if content looks like HTML
                if (content.includes('<') && content.includes('>')) {
                    return { __html: content };
                } else {
                    // Convert markdown to HTML
                    return { __html: marked.parse(content, { async: false }) as string };
                }
            }
            return { __html: "" };
        } catch (error) {
            console.error("Error rendering preview:", error);
            return { __html: content || "" };
        }
    };

    if (loadingPolicy) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <span className="ml-2">Loading policy...</span>
                </div>
            </DashboardLayout>
        );
    }

    if (!policyData) {
        return (
            <DashboardLayout>
                <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground" />
                    <h2 className="mt-4 text-xl font-semibold">Policy not found</h2>
                    <p className="text-muted-foreground mt-2">The policy you're looking for doesn't exist or you don't have access.</p>
                    <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => setLocation(`/clients/${clientId}/policies`)}
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Policies
                    </Button>
                </div>
            </DashboardLayout>
        );
    }

    const policy = policyData.clientPolicy || policyData;

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <Breadcrumb
                    items={[
                        { label: "Clients", href: "/clients" },
                        { label: `Client ${clientId}`, href: `/clients/${clientId}` },
                        { label: "Policies", href: `/clients/${clientId}/policies` },
                        { label: policy.name || "Policy Editor", href: "#" },
                    ]}
                />

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Policy Editor</h1>
                        <p className="text-muted-foreground">Edit and manage your compliance policy</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setLocation(`/clients/${clientId}/policies`)}
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => setViewMode(viewMode === "edit" ? "preview" : "edit")}
                        >
                            <Eye className="mr-2 h-4 w-4" />
                            {viewMode === "edit" ? "Preview" : "Edit"}
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isSaving || deletePolicyMutation.isPending}
                        >
                            Delete
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={isSaving || updatePolicyMutation.isPending || !isContentReady}
                        >
                            {isSaving || updatePolicyMutation.isPending ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="mr-2 h-4 w-4" />
                            )}
                            Save Changes
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        {/* Quick Guide Card */}
                        <Card className="border-blue-100 bg-blue-50/30 overflow-hidden transition-all duration-300">
                            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between cursor-pointer hover:bg-blue-50/50" onClick={() => setShowGuide(!showGuide)}>
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600">
                                        <HelpCircle className="h-4 w-4" />
                                    </div>
                                    <CardTitle className="text-base font-semibold text-blue-900">How to use Policy Editor</CardTitle>
                                </div>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-100/50">
                                    {showGuide ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </Button>
                            </CardHeader>
                            <div className={showGuide ? "block" : "hidden"}>
                                <CardContent className="px-4 pb-4 pt-0">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-blue-800 font-medium text-sm">
                                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">1</span>
                                                Structured Formatting
                                            </div>
                                            <p className="text-xs text-blue-700/80 leading-relaxed">
                                                Use the editor to build <strong>well-structured policies</strong>. Proper headings, bullet points, and tables are not just for layout—they ensure your policy is readable and legally sound for auditors.
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-blue-800 font-medium text-sm">
                                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">2</span>
                                                Audit-Ready History
                                            </div>
                                            <p className="text-xs text-blue-700/80 leading-relaxed">
                                                Compliance requires a <strong>clear trail of changes</strong>. Use the <strong>"History"</strong> tab to demonstrate evolution over time. Restoring a version allows you to safely experiment with new drafts.
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-blue-800 font-medium text-sm">
                                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">3</span>
                                                Targeted Exporting
                                            </div>
                                            <p className="text-xs text-blue-700/80 leading-relaxed">
                                                Export as <strong>PDF</strong> for final, tamper-proof submissions to auditors. Use the <strong>Word</strong> export if you need to perform external legal reviews or share with third parties.
                                            </p>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2 text-blue-800 font-medium text-sm">
                                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] text-white">4</span>
                                                Official Publication
                                            </div>
                                            <p className="text-xs text-blue-700/80 leading-relaxed">
                                                Publishing creates a <strong>locked timestamped record</strong> of your policy. This is the "Gold Version" that stakeholders should follow and that auditors will evaluate during your assessment.
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </div>
                        </Card>

                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Policy Content</CardTitle>
                                        <CardDescription>
                                            {viewMode === "edit"
                                                ? "Edit your policy content using the rich text editor below"
                                                : "Preview how your policy will appear"}
                                        </CardDescription>
                                    </div>
                                    <Tabs value={viewMode} onValueChange={(v: any) => setViewMode(v)}>
                                        <TabsList>
                                            <TabsTrigger value="edit">Edit</TabsTrigger>
                                            <TabsTrigger value="preview">Preview</TabsTrigger>
                                            <TabsTrigger value="history">History</TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <Tabs value={viewMode}>
                                    <TabsContent value="edit" className="m-0 space-y-4">
                                        <div>
                                            <Label htmlFor="policy-name">Policy Name</Label>
                                            <Input
                                                id="policy-name"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                placeholder="Enter policy name"
                                            />
                                        </div>
                                        <div>
                                            <Label>Policy Content</Label>
                                            {isContentReady ? (
                                                <RichTextEditor
                                                    value={content}
                                                    onChange={setContent}
                                                    className="min-h-[400px]"
                                                />
                                            ) : (
                                                <div className="min-h-[400px] flex items-center justify-center bg-slate-50 rounded-lg border">
                                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="preview" className="m-0">
                                        <div className="prose prose-sm max-w-none">
                                            <h1>{name}</h1>
                                            <div dangerouslySetInnerHTML={renderPreview()} />
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="history" className="m-0">
                                        <div className="space-y-4">
                                            {versionHistory && versionHistory.length > 0 ? (
                                                versionHistory.map((v: any) => (
                                                    <div key={v.version.id} className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold">{v.version.version}</span>
                                                                <Badge variant="outline">{v.version.status}</Badge>
                                                                <span className="text-xs text-muted-foreground">
                                                                    {new Date(v.version.createdAt).toLocaleString()}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm">{v.version.description || "No description provided."}</p>
                                                            <p className="text-xs text-muted-foreground">Published by: {v.publisher?.name || "Unknown"}</p>
                                                        </div>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleRestoreVersion(v.version.id)}
                                                        >
                                                            <RotateCcw className="mr-2 h-4 w-4" />
                                                            Restore
                                                        </Button>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center py-12 text-muted-foreground">
                                                    <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                                    <p>No version history available for this policy.</p>
                                                </div>
                                            )}
                                        </div>
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Policy Details</CardTitle>
                                <CardDescription>Manage policy metadata and status</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <Label htmlFor="policy-status">Status</Label>
                                    <Select value={status} onValueChange={setStatus}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="draft">Draft</SelectItem>
                                            <SelectItem value="review">In Review</SelectItem>
                                            <SelectItem value="approved">Approved</SelectItem>
                                            <SelectItem value="archived">Archived</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label htmlFor="policy-owner">Owner</Label>
                                    <Input
                                        id="policy-owner"
                                        value={owner}
                                        onChange={(e) => setOwner(e.target.value)}
                                        placeholder="Policy owner or department"
                                    />
                                </div>

                                <div>
                                    <Label>Policy ID</Label>
                                    <div className="text-sm text-muted-foreground font-mono p-2 bg-muted rounded">
                                        {policyId}
                                    </div>
                                </div>

                                <div>
                                    <Label>Client ID</Label>
                                    <div className="text-sm text-muted-foreground font-mono p-2 bg-muted rounded">
                                        {clientId}
                                    </div>
                                </div>

                                <div>
                                    <Label>Last Updated</Label>
                                    <div className="text-sm text-muted-foreground">
                                        {policy.updatedAt
                                            ? new Date(policy.updatedAt).toLocaleString()
                                            : "Never"}
                                    </div>
                                </div>

                                <div>
                                    <Label>Created</Label>
                                    <div className="text-sm text-muted-foreground">
                                        {policy.createdAt
                                            ? new Date(policy.createdAt).toLocaleString()
                                            : "Unknown"}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Quick Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <Button variant="outline" className="w-full justify-start" onClick={handleExportPDF}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    Export as PDF
                                </Button>
                                <Button variant="outline" className="w-full justify-start" onClick={handleExportWord}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    Export as Word
                                </Button>
                                <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
                                    <DialogTrigger asChild>
                                        <Button variant="outline" className="w-full justify-start">
                                            <History className="mr-2 h-4 w-4" />
                                            Publish Version
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                        <DialogHeader>
                                            <DialogTitle>Publish New Version</DialogTitle>
                                            <DialogDescription>
                                                Create a permanent snapshot of the current draft. This version will be listed in the history and can be restored later.
                                            </DialogDescription>
                                        </DialogHeader>
                                        <div className="grid gap-4 py-4">
                                            <div className="grid gap-2">
                                                <Label htmlFor="version-name">Version (optional)</Label>
                                                <Input
                                                    id="version-name"
                                                    placeholder="e.g. v1.1, 2024-Q1 Update"
                                                    value={publishVersion}
                                                    onChange={(e) => setPublishVersion(e.target.value)}
                                                />
                                            </div>
                                            <div className="grid gap-2">
                                                <Label htmlFor="version-notes">Change Summary</Label>
                                                <Textarea
                                                    id="version-notes"
                                                    placeholder="What changed in this version?"
                                                    value={publishNotes}
                                                    onChange={(e) => setPublishNotes(e.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <DialogFooter>
                                            <Button variant="outline" onClick={() => setShowPublishDialog(false)}>Cancel</Button>
                                            <Button onClick={handlePublishVersion} disabled={isPublishing}>
                                                {isPublishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Publish Version
                                            </Button>
                                        </DialogFooter>
                                    </DialogContent>
                                </Dialog>
                                <Button variant="outline" className="w-full justify-start">
                                    <FileText className="mr-2 h-4 w-4" />
                                    Create Version
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}