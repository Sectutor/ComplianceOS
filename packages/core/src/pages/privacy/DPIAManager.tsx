import React, { useState } from 'react';
import { useClientContext } from "@/contexts/ClientContext";
import { Button } from "@complianceos/ui/ui/button";
import { Plus, FileText, Play, Loader2, Clock, Sparkles, Trash2, ShieldCheck, ShieldAlert, Cpu, Eye, Globe2 } from "lucide-react";
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@complianceos/ui/ui/table";
import { Badge } from "@complianceos/ui/ui/badge";
import { cn } from "@/lib/utils";
import { EnhancedDialog } from "@complianceos/ui/ui/enhanced-dialog";
import { Input } from "@complianceos/ui/ui/input";
import { Label } from "@complianceos/ui/ui/label";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";

function getCategoryBadge(category: string) {
    switch (category) {
        case 'high_risk':
            return { label: 'EDPB High-Risk', icon: ShieldAlert, className: 'bg-rose-100 text-rose-800 border-rose-200' };
        case 'ai_governance':
            return { label: 'AI & Automated Decision', icon: Cpu, className: 'bg-teal-100 text-indigo-800 border-teal-200' };
        case 'special_category':
            return { label: 'Special Category & Biometric', icon: ShieldCheck, className: 'bg-amber-100 text-amber-800 border-amber-200' };
        case 'workplace_monitoring':
            return { label: 'Employee Monitoring', icon: Eye, className: 'bg-sky-100 text-sky-800 border-sky-200' };
        case 'cross_border_cloud':
            return { label: 'Cross-Border & Cloud', icon: Globe2, className: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
        default:
            return { label: 'General Privacy', icon: FileText, className: 'bg-slate-100 text-slate-800 border-slate-200' };
    }
}

export default function DPIAManager() {
    const { selectedClientId } = useClientContext();
    const clientId = selectedClientId || 0;
    const [, setLocation] = useLocation();
    const utils = trpc.useUtils();

    // Fetch templates
    const { data: templates, isLoading: templatesLoading } = trpc.privacyEnhancements.dpiaTemplates.list.useQuery(
        { clientId },
        { enabled: !!clientId }
    );

    // Fetch past assessments
    const { data: pastAssessments, isLoading: assessmentsLoading } = trpc.privacy.listAssessments.useQuery(
        {
            clientId,
            typePrefix: "DPIA:"
        },
        { enabled: !!clientId }
    );

    // Seed Standard Templates Mutation
    const seedMutation = trpc.privacyEnhancements.dpiaTemplates.seedStandardTemplates.useMutation({
        onSuccess: () => {
            toast.success("Standard DPIA Templates Seeded", {
                description: "5 GDPR Article 35, AI, and Special Category templates are now ready."
            });
            utils.privacyEnhancements.dpiaTemplates.list.invalidate({ clientId });
        },
        onError: (err: any) => toast.error("Failed to seed templates: " + err.message)
    });

    // Delete Template Mutation
    const deleteMutation = trpc.privacyEnhancements.dpiaTemplates.delete.useMutation({
        onSuccess: () => {
            toast.success("Template archived");
            utils.privacyEnhancements.dpiaTemplates.list.invalidate({ clientId });
        },
        onError: (err: any) => toast.error("Failed to delete template: " + err.message)
    });

    // Create Template State & Mutation
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [templateForm, setTemplateForm] = useState({
        name: "",
        category: "high_risk",
        description: "",
        q1: "Does the processing involve systematic evaluation, automated decisions, or profiling?",
        q2: "Does the processing involve special category personal data (biometrics, health, genetic)?",
        q3: "Will personal data be processed on a large scale across multiple jurisdictions?"
    });

    const createMutation = trpc.privacyEnhancements.dpiaTemplates.create.useMutation({
        onSuccess: () => {
            toast.success("DPIA Template Created Successfully");
            setCreateDialogOpen(false);
            setTemplateForm({
                name: "",
                category: "high_risk",
                description: "",
                q1: "Does the processing involve systematic evaluation, automated decisions, or profiling?",
                q2: "Does the processing involve special category personal data (biometrics, health, genetic)?",
                q3: "Will personal data be processed on a large scale across multiple jurisdictions?"
            });
            utils.privacyEnhancements.dpiaTemplates.list.invalidate({ clientId });
        },
        onError: (err: any) => toast.error("Failed to create template: " + err.message)
    });

    const handleCreateTemplate = () => {
        if (!templateForm.name.trim()) return toast.error("Template name is required");
        createMutation.mutate({
            clientId,
            name: templateForm.name.trim(),
            category: templateForm.category,
            description: templateForm.description.trim() || undefined,
            templateContent: {
                screeningQuestions: [
                    { id: "q1", question: templateForm.q1, type: "boolean", required: true },
                    { id: "q2", question: templateForm.q2, type: "boolean", required: true },
                    { id: "q3", question: templateForm.q3, type: "boolean", required: true },
                ],
                riskFactors: [
                    { factor: "Unauthorized disclosure or data breach of personal data", weight: 5, description: "Risk of exfiltration or unauthorized exposure." },
                    { factor: "Lack of transparency and failure to provide clear privacy notices", weight: 4, description: "Data subjects unaware of the scope or purpose of processing." }
                ],
                mitigationMeasures: [
                    { measure: "End-to-end encryption at rest (AES-256) and in transit (TLS 1.3)", category: "Technical", description: "Cryptographic protection across all stores." },
                    { measure: "Strict role-based access control and MFA enforcement", category: "Technical", description: "Least privilege access controls." }
                ]
            }
        });
    };

    return (
        <div className="space-y-10 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">DPIA Manager</h1>
                    <p className="text-slate-500 text-lg">Conduct, customize, and manage Data Protection Impact Assessments (Article 35 GDPR).</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => seedMutation.mutate({ clientId })}
                        disabled={seedMutation.isPending}
                        className="border-teal-300 text-indigo-800 bg-teal-50/50 hover:bg-teal-100 font-bold rounded-xl h-11 px-5"
                    >
                        {seedMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4 text-teal-600" />}
                        Seed Standard GDPR Templates
                    </Button>
                    <Button
                        onClick={() => setCreateDialogOpen(true)}
                        className="bg-brand-bright hover:bg-brand text-white font-bold rounded-xl h-11 px-6 shadow-lg shadow-sky-100 transition-all active:scale-95"
                    >
                        <Plus className="mr-2 h-5 w-5" /> Create Custom Template
                    </Button>
                </div>
            </div>

            {/* Templates Section */}
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                        <div className="h-10 w-10 bg-sky-50 rounded-xl flex items-center justify-center text-brand-bright">
                            <FileText className="h-5 w-5" />
                        </div>
                        Available DPIA Templates
                        {templates && templates.length > 0 && (
                            <Badge variant="outline" className="text-xs font-semibold text-slate-500 ml-1">
                                {templates.length} template{templates.length > 1 ? 's' : ''}
                            </Badge>
                        )}
                    </h2>
                </div>

                {templatesLoading ? (
                    <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-brand-bright" /></div>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {templates && templates.length > 0 ? (
                            templates.map(t => {
                                const badgeInfo = getCategoryBadge(t.category);
                                const CategoryIcon = badgeInfo.icon;
                                const questionCount = (t.templateContent as any)?.screeningQuestions?.length || 0;

                                return (
                                    <Card key={t.id} className="group hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-slate-200 bg-white rounded-2xl overflow-hidden flex flex-col justify-between">
                                        <CardHeader className="pb-4">
                                            <div className="flex items-center justify-between gap-2 mb-3">
                                                <Badge className={cn("text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 flex items-center gap-1 border", badgeInfo.className)}>
                                                    <CategoryIcon className="w-3 h-3" />
                                                    {badgeInfo.label}
                                                </Badge>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => deleteMutation.mutate({ clientId, templateId: t.id })}
                                                    disabled={deleteMutation.isPending}
                                                    className="h-7 w-7 text-slate-300 hover:text-rose-600 rounded-lg"
                                                    title="Archive Template"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                            <CardTitle className="text-lg font-bold text-slate-900 group-hover:text-brand-bright transition-colors line-clamp-2">{t.name}</CardTitle>
                                            <CardDescription className="text-slate-500 text-xs leading-relaxed line-clamp-3 mt-1.5">{t.description || 'No description provided.'}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="pt-0">
                                            <div className="flex justify-between items-center text-xs font-semibold text-slate-500 mb-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                                <span>{questionCount} Screening Questions</span>
                                                <span>Used: {t.usageCount || 0} times</span>
                                            </div>
                                            <Button
                                                className="w-full bg-brand-bright hover:bg-brand text-white font-bold h-10 rounded-xl shadow-md shadow-sky-100 transition-all active:scale-95"
                                                onClick={() => setLocation(`/clients/${clientId}/privacy/dpia/new?templateId=${t.id}`)}
                                            >
                                                <Play className="mr-2 h-4 w-4 fill-current" /> Initialize Assessment
                                            </Button>
                                        </CardContent>
                                    </Card>
                                );
                            })
                        ) : (
                            <div className="col-span-full p-8 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 space-y-4">
                                <p className="text-slate-400 font-medium">No specialized DPIA templates found.</p>
                                <Button
                                    onClick={() => seedMutation.mutate({ clientId })}
                                    className="bg-brand-bright hover:bg-brand text-white font-bold rounded-xl"
                                >
                                    <Sparkles className="mr-2 h-4 w-4" /> Load Standard Templates
                                </Button>
                            </div>
                        )}
                    </div>
                )}
            </section>

            {/* Past Assessments Section */}
            <section className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-500">
                        <Clock className="h-5 w-5" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Assessment History</h2>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow className="hover:bg-transparent border-0">
                                <TableHead className="font-bold text-slate-700 h-14">Assessment Name</TableHead>
                                <TableHead className="font-bold text-slate-700 h-14">Risk Level</TableHead>
                                <TableHead className="font-bold text-slate-700 h-14">Status</TableHead>
                                <TableHead className="font-bold text-slate-700 h-14">Last Updated</TableHead>
                                <TableHead className="text-right font-bold text-slate-700 h-14 px-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {assessmentsLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2">
                                            <Loader2 className="h-8 w-8 animate-spin text-brand-bright" />
                                            <span className="text-sm font-medium text-slate-400">Loading history...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : pastAssessments && pastAssessments.length > 0 ? (
                                pastAssessments.map((a, idx) => (
                                    <TableRow
                                        key={a.id}
                                        className="hover:bg-slate-50/80 transition-colors group border-b border-slate-100 last:border-0"
                                        style={{ animationDelay: `${idx * 50}ms` }}
                                    >
                                        <TableCell className="py-5 font-bold text-slate-900">{a.type.replace("DPIA: ", "")}</TableCell>
                                        <TableCell className="py-5">
                                            <Badge className={cn(
                                                "border-none font-bold uppercase text-[10px] tracking-wider px-2.5 py-1",
                                                a.score && parseFloat(a.score) > 70 ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700"
                                            )}>
                                                {a.score ? `Risk Score: ${a.score}` : 'Evaluation Pending'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-5">
                                            <Badge className={cn(
                                                "border-none font-bold uppercase text-[10px] tracking-wider px-2.5 py-1",
                                                a.status === 'completed' ? "bg-green-100 text-green-700" : "bg-brand/10 text-brand"
                                            )}>
                                                {a.status || 'Not Started'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-5 text-slate-500 font-medium">{new Date(a.updatedAt).toLocaleDateString()}</TableCell>
                                        <TableCell className="text-right py-5 px-6">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-brand-bright hover:text-brand hover:bg-sky-50 font-bold rounded-lg transition-all"
                                                onClick={() => setLocation(`/clients/${clientId}/privacy/dpia/${a.id}/questionnaire`)}
                                            >
                                                View Review
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-48 text-center text-slate-400">
                                        <div className="flex flex-col items-center justify-center space-y-2">
                                            <p className="font-bold text-slate-900">No Assessment History</p>
                                            <p className="max-w-xs mx-auto">Initialize your first Data Protection Impact Assessment using the templates above.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </section>

            {/* Create Custom Template Dialog */}
            <EnhancedDialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
                title="Create Custom DPIA Template"
                description="Design a tailored Data Protection Impact Assessment questionnaire for your organization's specific processing activities."
                size="lg"
                footer={
                    <div className="flex justify-end gap-2 w-full">
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateTemplate} disabled={createMutation.isPending} className="bg-brand-bright hover:bg-brand text-white font-bold">
                            {createMutation.isPending ? "Creating..." : "Save DPIA Template"}
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                        <Label htmlFor="tpl-name" className="font-semibold">Template Name *</Label>
                        <Input
                            id="tpl-name"
                            placeholder="e.g., Marketing Analytics & Tracking DPIA"
                            value={templateForm.name}
                            onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="tpl-cat" className="font-semibold">Category</Label>
                        <Select
                            value={templateForm.category}
                            onValueChange={(val) => setTemplateForm({ ...templateForm, category: val })}
                        >
                            <SelectTrigger id="tpl-cat">
                                <SelectValue placeholder="Select Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="high_risk">EDPB High-Risk Processing</SelectItem>
                                <SelectItem value="ai_governance">AI & Automated Decision Making</SelectItem>
                                <SelectItem value="special_category">Special Category & Biometric Data</SelectItem>
                                <SelectItem value="workplace_monitoring">Employee Monitoring & Telemetry</SelectItem>
                                <SelectItem value="cross_border_cloud">Cross-Border & Cloud Processing</SelectItem>
                                <SelectItem value="general">General Privacy Processing</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="tpl-desc" className="font-semibold">Description</Label>
                        <Textarea
                            id="tpl-desc"
                            placeholder="Explain when this DPIA should be used and the regulatory scope..."
                            rows={3}
                            value={templateForm.description}
                            onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })}
                        />
                    </div>
                    <div className="space-y-3 pt-2 border-t">
                        <Label className="font-semibold text-xs uppercase tracking-wider text-slate-500">Core Screening Questions</Label>
                        <div className="space-y-2">
                            <Input
                                value={templateForm.q1}
                                onChange={(e) => setTemplateForm({ ...templateForm, q1: e.target.value })}
                                placeholder="Screening Question 1"
                            />
                            <Input
                                value={templateForm.q2}
                                onChange={(e) => setTemplateForm({ ...templateForm, q2: e.target.value })}
                                placeholder="Screening Question 2"
                            />
                            <Input
                                value={templateForm.q3}
                                onChange={(e) => setTemplateForm({ ...templateForm, q3: e.target.value })}
                                placeholder="Screening Question 3"
                            />
                        </div>
                    </div>
                </div>
            </EnhancedDialog>
        </div>
    );
}
