import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@complianceos/ui/ui/button";
import { Card, CardContent } from "@complianceos/ui/ui/card";
import { EmptyState } from "@complianceos/ui/ui/EmptyState";
import { EnhancedDialog } from "@complianceos/ui/ui/enhanced-dialog";
import { Input } from "@complianceos/ui/ui/input";
import { Label } from "@complianceos/ui/ui/label";
import { Switch } from "@complianceos/ui/ui/switch";
import { Badge } from "@complianceos/ui/ui/badge";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@complianceos/ui/ui/table";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, FileText, Plus, Trash2, Edit, Sparkles, FileSearch, Send, Loader2, Layers, Search, Filter, Check, Eye } from "lucide-react";
import { BulkGenerateDialog } from "@/components/policy/BulkGenerateDialog";
import { DistributionDialog } from "@/components/policy/DistributionDialog";
import PolicyReviewDialog from "@/components/PolicyReviewDialog";
import { PageGuide } from "@/components/PageGuide";
import { PolicyAcknowledgmentPanel } from "@/pages/PolicyAcknowledgmentPanel";
import { useEffect, useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { Breadcrumb } from "@/components/Breadcrumb";
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

export default function ClientPoliciesPage({ hideLayout = false, clientId: propClientId }: { hideLayout?: boolean, clientId?: number }) {
    const params = useParams();
    const idParam = params.clientId || params.id;
    const clientId = propClientId || parseInt(idParam || "0");
    const { user } = useAuth();
    const [location, setLocation] = useLocation();

    const { data: client, isLoading: clientLoading } = trpc.clients.get.useQuery(
        { id: clientId },
        { enabled: clientId > 0 && !!user }
    );

    const { data: clientPolicies, isLoading: policiesLoading, refetch: refetchPolicies } = trpc.clientPolicies.list.useQuery(
        { clientId },
        { enabled: clientId > 0 && !!user }
    );
    const { data: policyTemplates } = trpc.policyTemplates.list.useQuery();

    const [isAddPolicyOpen, setIsAddPolicyOpen] = useState(false);
    const [isPolicyReviewOpen, setIsPolicyReviewOpen] = useState(false);
    const [creationStep, setCreationStep] = useState<'select' | 'config'>('select');
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>();
    const [tailorToIndustry, setTailorToIndustry] = useState(true);
    const [customInstruction, setCustomInstruction] = useState("");
    const [deletePolicyId, setDeletePolicyId] = useState<number | null>(null);
    const [distributionPolicyId, setDistributionPolicyId] = useState<number | null>(null);
    const [isBulkGenerateOpen, setIsBulkGenerateOpen] = useState(false);
    const [templateSearch, setTemplateSearch] = useState("");
    const [templateFrameworkFilter, setTemplateFrameworkFilter] = useState("all");
    const [previewTemplate, setPreviewTemplate] = useState<any | null>(null);

    useEffect(() => {
        const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
        if (params?.get('create') === 'true') {
            setIsAddPolicyOpen(true);
            const newParams = new URLSearchParams(window.location.search);
            newParams.delete('create');
            const newSearch = newParams.toString();
            setLocation(`/clients/${clientId}/policies${newSearch ? '?' + newSearch : ''}`, { replace: true });
        }
    }, [clientId, setLocation]);

    const addPolicyMutation = trpc.clientPolicies.create.useMutation({
        onSuccess: (newPolicy: any) => {
            console.log('[PolicyCreate] Success response:', newPolicy);
            setIsAddPolicyOpen(false);
            setCreationStep('select');
            setSelectedTemplateId(undefined);
            setCustomInstruction("");
            refetchPolicies();
            // Navigate to the new policy after dialog closes
            const policyId = newPolicy?.id;
            if (policyId) {
                toast.success("Policy created! Opening editor...");
                setTimeout(() => {
                    setLocation(`/clients/${clientId}/policies/${policyId}`);
                }, 300);
            } else {
                toast.success("Policy created successfully!");
                console.warn('[PolicyCreate] No policy ID returned, cannot redirect. Response:', JSON.stringify(newPolicy));
            }
        },
        onError: (error) => toast.error(error.message),
    });

    const deletePolicyMutation = trpc.clientPolicies.delete.useMutation({
        onSuccess: () => {
            toast.success("Policy deleted");
            refetchPolicies();
            setDeletePolicyId(null);
        },
        onError: (error) => toast.error(error.message),
    });

    // Bulk generation is now handled by the BulkGenerateDialog component

    const handleAddPolicy = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const name = formData.get("name") as string;
        const templateId = selectedTemplateId ? parseInt(selectedTemplateId) : undefined;

        const input = {
            clientId,
            name,
            templateId,
            tailor: tailorToIndustry,
            instruction: customInstruction || undefined,
            status: 'draft' as const,
            module: 'general' as const
        };
        addPolicyMutation.mutate(input);
    };

    if (clientLoading && !hideLayout) {
        return (
            <DashboardLayout fullWidth={true}>
                <div className="space-y-6">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-32 w-full" />
                </div>
            </DashboardLayout>
        );
    }

    if (!client && !hideLayout) {
        return (
            <DashboardLayout fullWidth={true}>
                <div className="text-center py-12">
                    <h2 className="text-xl font-semibold mb-2">Client not found</h2>
                    <Button variant="outline" onClick={() => setLocation('/clients')}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Clients
                    </Button>
                </div>
            </DashboardLayout>
        );
    }

    const content = (
        <div className={hideLayout ? "space-y-6" : "pl-4 pr-4 py-8 md:pl-8 md:pr-8 space-y-6 w-full max-w-full animate-in fade-in duration-700 bg-background min-h-screen"}>
            {!hideLayout && (
                <Breadcrumb
                    items={[
                        { label: "Clients", href: "/clients" },
                        { label: client?.name || "Client", href: `/clients/${clientId}/governance` },
                        { label: "Policies" },
                    ]}
                />
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">{hideLayout ? "Policies" : "Client Policies"}</h2>
                    {!hideLayout && (
                        <PageGuide
                            title="Compliance Policy Management"
                            description="Learn how to create, manage, and distribute professional compliance policies tailored to your organization using AI."
                            howToUse={[
                                {
                                    title: "Create a New Policy",
                                    description: "Click 'Create Policy' to start the guided wizard where you can choose templates and use AI to generate content.",
                                    targetId: "create-policy-btn"
                                },
                                ...(user?.role === 'admin' || user?.role === 'owner' || user?.role === 'super_admin' ? [{
                                    title: "Bulk Generation",
                                    description: "Generate multiple policies at once for specific frameworks to jumpstart your compliance journey.",
                                    targetId: "bulk-generate-btn"
                                }] : []),
                                {
                                    title: "AI Customization",
                                    description: "In the creation wizard, use 'Tailor to Industry' and 'Custom Instructions' to ensure the AI generates exactly what you need."
                                },
                                {
                                    title: "Policy Distribution",
                                    description: "Once a policy is ready, use the distribution tool (paper plane icon) to send it to employees for acknowledgement."
                                },
                                {
                                    title: "Review Existing Policies",
                                    description: "If you already have a policy document, use 'Load for Review' to have our AI analyze it against framework requirements.",
                                    targetId: "load-review-btn"
                                }
                            ]}
                            scenarios={[
                                {
                                    title: "Audit Preparation",
                                    description: "Auditors love consistency. Use our templates to ensure you cover all mandatory controls for standards like ISO 27001 or SOC 2.",
                                    type: "audit"
                                },
                                {
                                    title: "Updating for New Regulations",
                                    description: "When regulations change (like NIS2), use the 'Blank Policy' with custom instructions referencing the new requirements to update your local docs.",
                                    type: "use-case"
                                }
                            ]}
                        />
                    )}
                </div>
                <div className="flex flex-wrap gap-2">
                    {!hideLayout && (
                        <Button
                            id="load-review-btn"
                            variant="outline"
                            onClick={() => setIsPolicyReviewOpen(true)}
                        >
                            <FileSearch className="mr-2 h-4 w-4" />
                            Load Policy for Review
                        </Button>
                    )}
                    {(user?.role === 'admin' || user?.role === 'owner' || user?.role === 'super_admin') && !hideLayout && (
                        <Button
                            id="bulk-generate-btn"
                            variant="outline"
                            onClick={() => setIsBulkGenerateOpen(true)}
                            className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:border-indigo-300"
                        >
                            <Layers className="mr-2 h-4 w-4" />
                            Bulk Generate
                        </Button>
                    )}
                    <Button id="create-policy-btn" onClick={() => setIsAddPolicyOpen(true)} size={hideLayout ? "sm" : "default"} >
                        <Plus className="mr-2 h-4 w-4" />
                        Create Policy
                    </Button>
                </div>
            </div>

            {/* Policy Acknowledgment Surface (policyAck.* endpoints; graceful empty state) */}
            {!hideLayout && clientId > 0 && <PolicyAcknowledgmentPanel clientId={clientId} />}

            {/* Policy Creation Dialog */}
            <EnhancedDialog
                open={isAddPolicyOpen}
                onOpenChange={setIsAddPolicyOpen}
                title={creationStep === 'select' ? 'Select Framework Template' : 'Configure Policy'}
                description={creationStep === 'select'
                    ? 'Choose a template to start with, or continue without one.'
                    : 'Customize your policy settings and AI instructions.'}
                size="xl"
                footer={
                    <div className="flex justify-between items-center w-full">
                        <div>
                            {creationStep === 'config' && (
                                <Button type="button" variant="ghost" size="sm" onClick={() => setCreationStep('select')}>
                                    <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to Templates
                                </Button>
                            )}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" onClick={() => setIsAddPolicyOpen(false)}>
                                Cancel
                            </Button>
                            {creationStep === 'config' && (
                                <Button
                                    onClick={() => {
                                        const form = document.getElementById('add-policy-form') as HTMLFormElement;
                                        if (form) form.requestSubmit();
                                    }}
                                    disabled={addPolicyMutation.isPending}
                                    className="transition-all font-semibold min-w-[160px]"
                                >
                                    {addPolicyMutation.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Generating Policy...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="mr-2 h-4 w-4" />
                                            Create Policy
                                        </>
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                }
            >
                {creationStep === 'select' && (
                    <div className="space-y-4">
                        {/* Search & Framework Filter */}
                        <div className="space-y-3">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search 60+ policy templates by name or keyword..."
                                    value={templateSearch}
                                    onChange={(e) => setTemplateSearch(e.target.value)}
                                    className="pl-9 text-sm"
                                />
                                {templateSearch && (
                                    <button
                                        type="button"
                                        onClick={() => setTemplateSearch("")}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                                {['all', 'ISO 27001', 'SOC 2', 'GDPR', 'NIS2', 'PCI DSS', 'NIST'].map((fw) => {
                                    const active = templateFrameworkFilter.toLowerCase() === fw.toLowerCase();
                                    return (
                                        <button
                                            key={fw}
                                            type="button"
                                            onClick={() => setTemplateFrameworkFilter(fw)}
                                            className={`px-2.5 py-1 rounded-full border transition-colors whitespace-nowrap ${
                                                active
                                                    ? 'bg-primary text-primary-foreground border-primary font-medium'
                                                    : 'bg-muted/40 text-muted-foreground hover:bg-muted border-border'
                                            }`}
                                        >
                                            {fw === 'all' ? 'All Frameworks' : fw}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Templates List */}
                        <div className="grid gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                            {/* Blank Policy Option */}
                            {(!templateSearch || 'blank policy'.includes(templateSearch.toLowerCase())) && (
                                <div
                                    className={`border rounded-lg p-3.5 cursor-pointer transition-all ${
                                        selectedTemplateId === undefined
                                            ? 'border-primary ring-2 ring-primary/30 bg-primary/5'
                                            : 'hover:border-muted-foreground/50 hover:bg-muted/30'
                                    }`}
                                    onClick={() => setSelectedTemplateId(undefined)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-md bg-muted text-muted-foreground">
                                                <FileText className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium text-sm">Blank Policy</p>
                                                    <Badge variant="outline" className="text-[10px] py-0 px-1.5">Custom</Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground">Start from scratch with AI assistance</p>
                                            </div>
                                        </div>
                                        {selectedTemplateId === undefined && (
                                            <Check className="h-4 w-4 text-primary shrink-0" />
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Filtered Policy Templates */}
                            {policyTemplates
                                ?.filter((template: any) => {
                                    const matchesSearch = !templateSearch ||
                                        template.name.toLowerCase().includes(templateSearch.toLowerCase()) ||
                                        template.templateId?.toLowerCase().includes(templateSearch.toLowerCase());

                                    if (!matchesSearch) return false;

                                    if (templateFrameworkFilter === 'all') return true;

                                    const fwList: string[] = Array.isArray(template.frameworks)
                                        ? template.frameworks
                                        : typeof template.framework === 'string'
                                        ? [template.framework]
                                        : [];

                                    return fwList.some((f) =>
                                        f.toLowerCase().includes(templateFrameworkFilter.toLowerCase())
                                    );
                                })
                                .map((template: any) => {
                                    const isSelected = selectedTemplateId === template.id.toString();
                                    const frameworks: string[] = Array.isArray(template.frameworks)
                                        ? template.frameworks
                                        : template.framework
                                        ? [template.framework]
                                        : [];

                                    return (
                                        <div
                                            key={template.id}
                                            className={`border rounded-lg p-3.5 cursor-pointer transition-all ${
                                                isSelected
                                                    ? 'border-primary ring-2 ring-primary/30 bg-primary/5'
                                                    : 'hover:border-muted-foreground/50 hover:bg-muted/30'
                                            }`}
                                            onClick={() => setSelectedTemplateId(template.id.toString())}
                                        >
                                            <div className="flex items-center justify-between gap-3">
                                                <div className="flex items-center gap-3 min-w-0">
                                                    <div className={`p-2 rounded-md shrink-0 ${isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                                                        <FileText className="h-5 w-5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-sm truncate">{template.name}</p>
                                                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                                            {frameworks.length > 0 ? (
                                                                frameworks.map((fw, i) => (
                                                                    <Badge key={i} variant="secondary" className="text-[10px] py-0 px-1.5 font-normal">
                                                                        {fw}
                                                                    </Badge>
                                                                ))
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground">Standard Policy</span>
                                                            )}
                                                            {template.sections && Array.isArray(template.sections) && (
                                                                <span className="text-[11px] text-muted-foreground">
                                                                    • {template.sections.length} sections
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <Button
                                                        type="button"
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                                        title="Preview template content"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setPreviewTemplate(template);
                                                        }}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}

                            {policyTemplates && policyTemplates.length === 0 && (
                                <div className="text-center py-8 text-sm text-muted-foreground">
                                    No templates found.
                                </div>
                            )}
                        </div>

                        <Button className="w-full" onClick={() => setCreationStep('config')}>
                            Continue with {selectedTemplateId ? (policyTemplates?.find((t: any) => t.id.toString() === selectedTemplateId)?.name || 'Template') : 'Blank Policy'}
                        </Button>
                    </div>
                )}

                {creationStep === 'config' && (
                    <form id="add-policy-form" onSubmit={handleAddPolicy} className="space-y-4">
                        <div>
                            <Label>Policy Name</Label>
                            <Input
                                name="name"
                                placeholder="e.g. Access Control Policy"
                                defaultValue={
                                    selectedTemplateId
                                        ? policyTemplates?.find((t) => t.id.toString() === selectedTemplateId)?.name
                                        : ''
                                }
                                required
                            />
                        </div>

                        <div className="flex items-center justify-between border rounded-lg p-3 bg-muted/30">
                            <div>
                                <Label className="text-sm font-medium">Tailor to Industry</Label>
                                <p className="text-xs text-muted-foreground">
                                    Customize content for {client?.industry || 'your industry'}
                                </p>
                            </div>
                            <Switch checked={tailorToIndustry} onCheckedChange={setTailorToIndustry} />
                        </div>

                        <div className="space-y-3">
                            <div>
                                <Label className="text-xs text-muted-foreground mb-1.5 block">
                                    Custom Instructions (Optional)
                                </Label>
                                <Textarea
                                    placeholder="e.g., 'Make it strict regarding password complexity'"
                                    value={customInstruction}
                                    onChange={(e) => setCustomInstruction(e.target.value)}
                                    className="h-20 text-sm resize-none bg-background"
                                />
                            </div>

                            <div className="border rounded-lg p-4 bg-blue-50/50 dark:bg-blue-950/20 text-sm text-muted-foreground">
                                <div className="flex items-start gap-2">
                                    <Sparkles className="h-4 w-4 text-brand mt-0.5 flex-shrink-0" />
                                    <p>Clicking <strong>Create Policy</strong> will use AI to generate the full policy content{selectedTemplateId ? ' based on the selected template' : ''}. You can review and edit it in the Policy Editor afterwards.</p>
                                </div>
                            </div>

                            {addPolicyMutation.isPending && (
                                <div className="space-y-3 py-4 animate-in fade-in duration-300">
                                    <div className="flex items-center gap-3">
                                        <Loader2 className="h-5 w-5 animate-spin text-brand" />
                                        <div>
                                            <p className="text-sm font-medium text-brand">Generating your policy...</p>
                                            <p className="text-xs text-muted-foreground">AI is crafting a tailored policy. This may take a moment.</p>
                                        </div>
                                    </div>
                                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                                        <div
                                            className="bg-gradient-to-r from-brand to-brand-bright h-2 rounded-full"
                                            style={{
                                                animation: 'progressPulse 2.5s ease-in-out infinite',
                                                width: '100%',
                                                transformOrigin: 'left',
                                            }}
                                        />
                                    </div>
                                    <style>{`
                                        @keyframes progressPulse {
                                            0% { transform: scaleX(0); opacity: 0.7; }
                                            50% { transform: scaleX(0.7); opacity: 1; }
                                            100% { transform: scaleX(1); opacity: 0.7; }
                                        }
                                    `}</style>
                                </div>
                            )}
                        </div>
                    </form>
                )}
            </EnhancedDialog>

            {/* Template Preview Dialog */}
            <EnhancedDialog
                open={!!previewTemplate}
                onOpenChange={(open) => !open && setPreviewTemplate(null)}
                title={previewTemplate?.name || "Template Preview"}
                description={`Previewing policy structure and sections for ${previewTemplate?.name || ''}`}
                size="xl"
                footer={
                    <div className="flex justify-between items-center w-full">
                        <div className="flex items-center gap-1.5">
                            {(Array.isArray(previewTemplate?.frameworks)
                                ? previewTemplate.frameworks
                                : previewTemplate?.framework
                                ? [previewTemplate.framework]
                                : []
                            ).map((fw: string, i: number) => (
                                <Badge key={i} variant="secondary" className="text-xs">
                                    {fw}
                                </Badge>
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" onClick={() => setPreviewTemplate(null)}>
                                Close
                            </Button>
                            <Button
                                onClick={() => {
                                    if (previewTemplate) {
                                        setSelectedTemplateId(previewTemplate.id.toString());
                                        setPreviewTemplate(null);
                                        setCreationStep('config');
                                    }
                                }}
                            >
                                Use This Template
                            </Button>
                        </div>
                    </div>
                }
            >
                {previewTemplate && (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                        {previewTemplate.sections && Array.isArray(previewTemplate.sections) && previewTemplate.sections.length > 0 ? (
                            <div className="space-y-3">
                                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                    Sections ({previewTemplate.sections.length})
                                </h4>
                                <div className="space-y-2.5">
                                    {previewTemplate.sections.map((sec: any, i: number) => (
                                        <div key={i} className="border rounded-md p-3 bg-muted/20">
                                            <p className="text-sm font-medium text-foreground">{sec.title || `Section ${i + 1}`}</p>
                                            {sec.content && (
                                                <div
                                                    className="text-xs text-muted-foreground mt-1 line-clamp-3 prose dark:prose-invert max-w-none"
                                                    dangerouslySetInnerHTML={{ __html: sec.content }}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : previewTemplate.content ? (
                            <div className="prose dark:prose-invert max-w-none text-sm border rounded-md p-4 bg-muted/20">
                                <div dangerouslySetInnerHTML={{ __html: previewTemplate.content }} />
                            </div>
                        ) : (
                            <div className="text-sm text-muted-foreground py-6 text-center">
                                Standard template with default ISO/SOC 2 governance sections.
                            </div>
                        )}
                    </div>
                )}
            </EnhancedDialog>

            {/* Distribution Dialog */}
            {distributionPolicyId && (
                <DistributionDialog
                    open={!!distributionPolicyId}
                    onOpenChange={(open) => !open && setDistributionPolicyId(null)}
                    clientId={clientId}
                    policyId={distributionPolicyId}
                />
            )}

            {/* Policy Review Dialog */}
            {!hideLayout && (
                <PolicyReviewDialog
                    open={isPolicyReviewOpen}
                    onOpenChange={setIsPolicyReviewOpen}
                    clientId={clientId}
                />
            )}

            {/* Bulk Generate Dialog */}
            {!hideLayout && (
                <BulkGenerateDialog
                    open={isBulkGenerateOpen}
                    onOpenChange={setIsBulkGenerateOpen}
                    clientId={clientId}
                    clientName={client?.name || "Client"}
                    onComplete={() => refetchPolicies()}
                />
            )}

            {/* Delete Policy Confirmation */}
            <AlertDialog open={!!deletePolicyId} onOpenChange={() => setDeletePolicyId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Policy?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the policy.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deletePolicyId && deletePolicyMutation.mutate({ id: deletePolicyId, clientId })}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Policy List */}
            {policiesLoading ? (
                <div className="space-y-3">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                </div>
            ) : clientPolicies && clientPolicies.length > 0 ? (
                <div className="rounded-xl border border-border shadow-sm overflow-hidden bg-card transition-all">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-gradient-to-r from-brand to-[#2B6CB0] hover:from-brand hover:to-[#2B6CB0] border-none shadow-sm">
                                <TableHead className="w-[300px] text-white font-extrabold py-5 tracking-tight">Policy Name</TableHead>
                                <TableHead className="w-[150px] text-white font-extrabold py-5 tracking-tight">Framework</TableHead>
                                <TableHead className="w-[100px] text-white font-extrabold py-5 tracking-tight">Status</TableHead>
                                <TableHead className="w-[120px] text-white font-extrabold py-5 tracking-tight text-center">Date</TableHead>
                                <TableHead className="w-[100px] text-white font-extrabold py-5 tracking-tight text-center">Time</TableHead>
                                <TableHead className="w-[80px] text-white font-extrabold py-5 text-center tracking-tight">Version</TableHead>
                                <TableHead className="w-[120px] text-white font-extrabold py-5 text-right tracking-tight px-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {clientPolicies?.map((item, index) => {
                                if (!item?.clientPolicy) return null;
                                // Create a Date object; fallback to now if not provided
                                const createdAt = new Date(item.clientPolicy.createdAt || Date.now());
                                return (
                                    <TableRow
                                        key={item.clientPolicy.id}
                                        className="cursor-pointer bg-card border-b border-border transition-all duration-300 ease-in-out hover:bg-muted/50 hover:shadow-inner group"
                                        onClick={() => setLocation(`/clients/${clientId}/policies/${item.clientPolicy.id}`)}
                                        style={{ animationDelay: `${index * 50}ms` }}
                                    >
                                        <TableCell className="font-semibold text-foreground py-5">
                                            <div className="flex items-center gap-3.5 group-hover:translate-x-1.5 transition-transform duration-300">
                                                <div className="p-2.5 rounded-xl bg-blue-500/10 group-hover:bg-blue-500/15 transition-colors duration-300 shadow-sm border border-blue-500/10">
                                                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                                </div>
                                                <span className="text-[15px]">{item.clientPolicy.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground font-medium py-5">
                                            {item.template?.framework || 'Custom'}
                                        </TableCell>
                                        <TableCell className="py-5">
                                            {(() => {
                                                const status = item.clientPolicy.status?.toLowerCase() || 'draft';
                                                const configs: Record<string, { bg: string, text: string, border: string, dot: string }> = {
                                                    approved: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
                                                    active: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
                                                    draft: { bg: 'bg-muted', text: 'text-muted-foreground', border: 'border-border', dot: 'bg-muted-foreground/50' },
                                                    review: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
                                                    pending: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20', dot: 'bg-blue-500' },
                                                    expired: { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/20', dot: 'bg-red-500' },
                                                };
                                                const config = configs[status] || configs.review;
                                                return (
                                                    <Badge
                                                        variant="outline"
                                                        className={`${config.bg} ${config.text} ${config.border} flex items-center gap-1.5 w-fit font-bold px-2.5 py-0.5 rounded-full shadow-sm text-[10px] tracking-wide uppercase group-hover:scale-105 transition-transform duration-300`}
                                                    >
                                                        <span className={`h-1.5 w-1.5 rounded-full ${config.dot} shadow-[0_0_5px_currentColor]`} />
                                                        {status}
                                                    </Badge>
                                                );
                                            })()}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-center py-5 text-sm">
                                            {createdAt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-center py-5 text-sm">
                                            {createdAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-center py-5">
                                            <span className="inline-flex items-center justify-center min-w-[36px] px-2.5 py-1 rounded-lg bg-muted/50 border border-border text-foreground/80 text-[11px] font-bold shadow-sm">
                                                v{item.clientPolicy.version || 1}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-right py-5 px-6">
                                            <div className="flex items-center justify-end gap-2 opacity-50 group-hover:opacity-100 transition-opacity duration-300">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors duration-200"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setLocation(`/clients/${clientId}/policies/${item.clientPolicy.id}`);
                                                    }}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 hover:bg-primary/10 hover:text-primary transition-colors duration-200"
                                                    title="Distribute Policy"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDistributionPolicyId(item.clientPolicy.id);
                                                    }}
                                                >
                                                    <Send className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors duration-200"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setDeletePolicyId(item.clientPolicy.id);
                                                    }}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                            <EmptyState
                icon={FileText}
                title="No policies created yet"
                description="Create your first policy from a framework template, or start from scratch with AI assistance."
                action={{ label: "Create First Policy", onClick: () => setIsAddPolicyOpen(true) }}
            />
            )}
        </div>
    );

    if (hideLayout) return content;

    return (
        <DashboardLayout fullWidth={true}>
            {content}
        </DashboardLayout>
    );
}
