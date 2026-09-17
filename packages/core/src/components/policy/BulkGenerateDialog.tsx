import { useState, useMemo, useEffect } from "react";
import { EnhancedDialog } from "@complianceos/ui/ui/enhanced-dialog";
import { Button } from "@complianceos/ui/ui/button";
import { Checkbox } from "@complianceos/ui/ui/checkbox";
import { Badge } from "@complianceos/ui/ui/badge";
import { Progress } from "@complianceos/ui/ui/progress";
import { Input } from "@complianceos/ui/ui/input";
import { Label } from "@complianceos/ui/ui/label";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { Switch } from "@complianceos/ui/ui/switch";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
    Sparkles,
    FileText,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Layers,
    ArrowLeft,
    Shield,
    Check,
    Search,
    Eye,
    ChevronDown,
    ChevronUp,
    ExternalLink,
    Building,
    FileCheck
} from "lucide-react";
import {
    FRAMEWORK_POLICY_SUITES,
    ALL_FRAMEWORK_SUITES,
    FrameworkSuite,
    FrameworkPolicyDefinition
} from "@/data/frameworkPolicySuites";
import { PolicyRichTextViewer } from "./PolicyRichTextViewer";

export interface BulkGenerateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    clientId: number;
    clientName: string;
    onComplete: () => void;
    initialFramework?: string;
    returnTo?: string | null;
    returnLabel?: string | null;
    taskId?: string | null;
}

type Step = "select" | "generating" | "complete";

export function BulkGenerateDialog({
    open,
    onOpenChange,
    clientId,
    clientName,
    onComplete,
    initialFramework,
    returnTo,
    returnLabel,
    taskId,
}: BulkGenerateDialogProps) {
    const [, setLocation] = useLocation();

    // Map initialFramework alias (e.g. 'iso' -> 'iso27001', 'federal' -> 'nis2')
    const resolveFrameworkKey = (raw?: string): string => {
        if (!raw) return "nis2";
        const clean = raw.toLowerCase().trim();
        if (clean.includes("nis2")) return "nis2";
        if (clean.includes("iso")) return "iso27001";
        if (clean.includes("soc")) return "soc2";
        if (clean.includes("dora")) return "dora";
        if (clean.includes("gdpr") || clean.includes("privacy")) return "gdpr";
        if (clean.includes("hipaa")) return "hipaa";
        return FRAMEWORK_POLICY_SUITES[clean] ? clean : "nis2";
    };

    const [activeFrameworkKey, setActiveFrameworkKey] = useState<string>(() => resolveFrameworkKey(initialFramework));
    const [step, setStep] = useState<Step>("select");
    const [selectedPolicyIds, setSelectedPolicyIds] = useState<Set<string>>(new Set());
    const [companyName, setCompanyName] = useState(clientName || "Company");
    const [tailorToIndustry, setTailorToIndustry] = useState(true);
    const [customInstruction, setCustomInstruction] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [previewPolicy, setPreviewPolicy] = useState<FrameworkPolicyDefinition | null>(null);
    const [copiedPreview, setCopiedPreview] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<{ created: number; skipped: number; total: number; message: string } | null>(null);

    const handleCopyPreview = (content: string) => {
        if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(content);
            setCopiedPreview(true);
            toast.success("Policy draft copied to clipboard!");
            setTimeout(() => setCopiedPreview(false), 2000);
        }
    };

    // Synchronize clientName if updated
    useEffect(() => {
        if (clientName) setCompanyName(clientName);
    }, [clientName]);

    // Synchronize initialFramework when opened
    useEffect(() => {
        if (initialFramework) {
            setActiveFrameworkKey(resolveFrameworkKey(initialFramework));
        }
    }, [initialFramework, open]);

    // Fetch existing policies for this client
    const { data: clientPolicies, refetch: refetchClientPolicies } = trpc.clientPolicies.list.useQuery(
        { clientId },
        { enabled: clientId > 0 && open }
    );

    // Map existing policy titles for quick deduplication
    const existingPolicyNames = useMemo(() => {
        if (!clientPolicies || !Array.isArray(clientPolicies)) return new Set<string>();
        return new Set(
            clientPolicies.map((item: any) =>
                (item?.clientPolicy?.name || "").toLowerCase().trim()
            )
        );
    }, [clientPolicies]);

    const activeSuite: FrameworkSuite = FRAMEWORK_POLICY_SUITES[activeFrameworkKey] || FRAMEWORK_POLICY_SUITES.nis2;

    // Filter policies by search query
    const filteredPolicies = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        if (!q) return activeSuite.policies;
        return activeSuite.policies.filter(
            p =>
                p.name.toLowerCase().includes(q) ||
                p.statutoryRef.toLowerCase().includes(q) ||
                p.description.toLowerCase().includes(q)
        );
    }, [activeSuite, searchQuery]);

    // Count existing policies in current suite
    const existingInSuiteCount = useMemo(() => {
        return activeSuite.policies.filter(p => existingPolicyNames.has(p.name.toLowerCase().trim())).length;
    }, [activeSuite, existingPolicyNames]);

    // Automatically select missing policies when framework changes or modal opens
    useEffect(() => {
        if (open && activeSuite) {
            const missing = activeSuite.policies
                .filter(p => !existingPolicyNames.has(p.name.toLowerCase().trim()))
                .map(p => p.id);
            setSelectedPolicyIds(new Set(missing));
        }
    }, [activeFrameworkKey, open, existingPolicyNames]);

    // Framework bulk generation mutation
    const bulkMutation = trpc.clientPolicies.generateBulkByFramework.useMutation({
        onSuccess: (data) => {
            setResult(data);
            setStep("complete");
            setProgress(100);
            refetchClientPolicies();
            onComplete();
            toast.success(data.message || `Generated ${data.created} policies!`);
        },
        onError: (err) => {
            setStep("select");
            setProgress(0);
            toast.error("Generation failed: " + err.message);
        }
    });

    const handleTogglePolicy = (id: string) => {
        setSelectedPolicyIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSelectAllMissing = () => {
        const missing = activeSuite.policies
            .filter(p => !existingPolicyNames.has(p.name.toLowerCase().trim()))
            .map(p => p.id);
        setSelectedPolicyIds(new Set(missing));
    };

    const handleSelectAll = () => {
        setSelectedPolicyIds(new Set(activeSuite.policies.map(p => p.id)));
    };

    const handleDeselectAll = () => {
        setSelectedPolicyIds(new Set());
    };

    const handleStartGeneration = () => {
        const selectedDefs = activeSuite.policies.filter(p => selectedPolicyIds.has(p.id));
        if (selectedDefs.length === 0) {
            toast.error("Please select at least one policy to generate.");
            return;
        }

        setStep("generating");
        setProgress(20);

        const timer = setInterval(() => {
            setProgress(prev => {
                if (prev >= 90) {
                    clearInterval(timer);
                    return 90;
                }
                return prev + Math.random() * 12;
            });
        }, 400);

        bulkMutation.mutate({
            clientId,
            companyName: companyName.trim() || clientName,
            frameworkId: activeSuite.frameworkId,
            policies: selectedDefs.map(p => ({
                id: p.id,
                name: p.name,
                statutoryRef: p.statutoryRef,
                content: p.defaultContent(companyName.trim() || clientName),
            })),
            tailorToIndustry,
            customInstruction: customInstruction.trim() || undefined,
        });
    };

    const handleClose = () => {
        setStep("select");
        setResult(null);
        setProgress(0);
        onOpenChange(false);
    };

    const handleReturnToRoadmap = () => {
        handleClose();
        if (returnTo) {
            setLocation(returnTo);
        }
    };

    const selectedCount = selectedPolicyIds.size;
    const totalInSuite = activeSuite.policies.length;

    return (
        <EnhancedDialog
            open={open}
            onOpenChange={(o) => {
                if (!o) handleClose();
                else onOpenChange(o);
            }}
            title="Build Policy Suite by Framework"
            description="Generate comprehensive, statutory-compliant policy suites tailored for specific regulatory frameworks at once."
            size="2xl"
            footer={
                step === "select" ? (
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
                        <div className="text-xs text-muted-foreground">
                            <span className="font-semibold text-foreground">{selectedCount}</span> of {totalInSuite} policies selected for <span className="font-bold text-foreground">{activeSuite.shortName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={handleClose}>
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                onClick={handleStartGeneration}
                                disabled={selectedCount === 0 || bulkMutation.isPending}
                                className="bg-blue-600 hover:bg-blue-500 text-white font-bold gap-1.5 shadow-sm"
                            >
                                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                                Generate {selectedCount} {activeSuite.shortName} Policies
                            </Button>
                        </div>
                    </div>
                ) : undefined
            }
        >
            {/* STEP 1: SELECT & CONFIGURE */}
            {step === "select" && (
                <div className="space-y-5">
                    {/* Framework Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-border text-xs">
                        {ALL_FRAMEWORK_SUITES.map((suite) => {
                            const isSelected = suite.frameworkId === activeFrameworkKey;
                            return (
                                <button
                                    key={suite.frameworkId}
                                    type="button"
                                    onClick={() => {
                                        setActiveFrameworkKey(suite.frameworkId);
                                        setSearchQuery("");
                                    }}
                                    className={`px-3 py-2 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                                        isSelected
                                            ? `${suite.color} text-white shadow-sm ring-2 ring-primary/20`
                                            : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border"
                                    }`}
                                >
                                    <span>{suite.shortName}</span>
                                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                                        isSelected ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                                    }`}>
                                        {suite.policies.length}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Active Framework Header Banner */}
                    <div className={`p-4 rounded-xl border ${activeSuite.borderColor} ${activeSuite.bgLight} space-y-2`}>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <Shield className={`w-5 h-5 ${activeSuite.textColor}`} />
                                <h3 className="text-base font-bold text-foreground">
                                    {activeSuite.frameworkName}
                                </h3>
                            </div>
                            <Badge variant="outline" className={`text-xs font-bold border ${activeSuite.borderColor} ${activeSuite.textColor} bg-background/80`}>
                                {activeSuite.badge}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                            {activeSuite.description}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-muted-foreground">
                            <span>Statutory Body: <strong className="text-foreground">{activeSuite.statutoryBody}</strong></span>
                            <span>•</span>
                            <span>
                                Active in Register: <strong className={existingInSuiteCount > 0 ? "text-emerald-600 font-bold" : "text-foreground"}>
                                    {existingInSuiteCount} / {totalInSuite}
                                </strong>
                            </span>
                        </div>
                    </div>

                    {/* Filter & Selection Shortcuts */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                placeholder={`Filter ${activeSuite.shortName} policies...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 text-xs h-8"
                            />
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end text-xs">
                            <Button type="button" variant="ghost" size="sm" onClick={handleSelectAllMissing} className="text-xs h-7 px-2">
                                Select Missing ({totalInSuite - existingInSuiteCount})
                            </Button>
                            <Button type="button" variant="ghost" size="sm" onClick={handleSelectAll} className="text-xs h-7 px-2">
                                Select All
                            </Button>
                            <Button type="button" variant="ghost" size="sm" onClick={handleDeselectAll} className="text-xs h-7 px-2 text-muted-foreground">
                                Clear
                            </Button>
                        </div>
                    </div>

                    {/* Policy Items List */}
                    <div className="border border-border rounded-xl divide-y divide-border overflow-hidden max-h-[290px] overflow-y-auto">
                        {filteredPolicies.map((policy) => {
                            const isAlreadyActive = existingPolicyNames.has(policy.name.toLowerCase().trim());
                            const isChecked = selectedPolicyIds.has(policy.id);

                            return (
                                <div
                                    key={policy.id}
                                    className={`p-3.5 flex items-start gap-3 transition-colors ${
                                        isChecked ? "bg-primary/5" : "hover:bg-muted/30"
                                    }`}
                                >
                                    <Checkbox
                                        id={`pol-${policy.id}`}
                                        checked={isChecked}
                                        onCheckedChange={() => handleTogglePolicy(policy.id)}
                                        className="mt-1"
                                    />
                                    <div className="flex-1 min-w-0 space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Label
                                                htmlFor={`pol-${policy.id}`}
                                                className="text-xs font-bold text-foreground cursor-pointer"
                                            >
                                                {policy.name}
                                            </Label>
                                            <Badge variant="outline" className="text-[10px] font-semibold px-1.5 py-0">
                                                {policy.clauseBadge}
                                            </Badge>
                                            {isAlreadyActive && (
                                                <Badge className="bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-200 text-[10px] font-bold">
                                                    <Check className="w-2.5 h-2.5 mr-1 text-emerald-600" />
                                                    Already Active
                                                </Badge>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-muted-foreground line-clamp-1 leading-relaxed">
                                            {policy.description}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                            {policy.keyControls.map((ctrl, i) => (
                                                <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                                    {ctrl}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setPreviewPolicy(policy)}
                                        className="text-xs h-7 px-2 text-muted-foreground hover:text-foreground shrink-0"
                                    >
                                        <Eye className="w-3.5 h-3.5 mr-1" />
                                        Preview
                                    </Button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Tailoring & Custom Directives Box */}
                    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-xs space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs font-bold text-slate-900 dark:text-slate-100">Organization Entity Name</Label>
                                <Input
                                    value={companyName}
                                    onChange={(e) => setCompanyName(e.target.value)}
                                    placeholder="Company Legal Name"
                                    className="text-xs h-8"
                                />
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-3 pt-4 sm:pt-6">
                                <div className="space-y-0.5 text-right">
                                    <Label className="text-xs font-bold cursor-pointer text-slate-900 dark:text-slate-100" htmlFor="tailor-switch">
                                        Tailor to Industry
                                    </Label>
                                    <p className="text-[10px] text-muted-foreground">
                                        Auto-align terminology to client profile
                                    </p>
                                </div>
                                <Switch
                                    id="tailor-switch"
                                    checked={tailorToIndustry}
                                    onCheckedChange={setTailorToIndustry}
                                />
                            </div>
                        </div>
                        <div className="space-y-1 pt-1">
                            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                Optional Custom Directives / Cloud Scope (appended to all generated policies)
                            </Label>
                            <Input
                                value={customInstruction}
                                onChange={(e) => setCustomInstruction(e.target.value)}
                                placeholder="e.g. Include specific AWS EU-Central-1 boundary and Slack notification webhooks"
                                className="text-xs h-8"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 2: GENERATING ANIMATION */}
            {step === "generating" && (
                <div className="flex flex-col items-center justify-center py-14 text-center space-y-5">
                    <div className="relative">
                        <div className="absolute inset-0 h-16 w-16 bg-blue-400 rounded-full animate-ping opacity-20" />
                        <div className="relative h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center shadow-lg">
                            <Loader2 className="h-8 w-8 text-white animate-spin" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <h3 className="text-base font-bold text-foreground">
                            Generating {selectedCount} {activeSuite.shortName} Policies...
                        </h3>
                        <p className="text-xs text-muted-foreground max-w-sm">
                            Authoring statutory policy drafts for <strong>{companyName}</strong> with tailored clauses and version snapshots.
                        </p>
                    </div>
                    <div className="w-64 space-y-1.5">
                        <Progress value={progress} className="h-2" />
                        <p className="text-[11px] text-muted-foreground font-semibold">
                            {Math.round(progress)}% complete
                        </p>
                    </div>
                </div>
            )}

            {/* STEP 3: COMPLETE */}
            {step === "complete" && result && (
                <div className="flex flex-col items-center justify-center py-10 text-center space-y-5">
                    <div className="h-14 w-14 bg-emerald-600 rounded-full flex items-center justify-center shadow-md">
                        <CheckCircle2 className="h-8 w-8 text-white" />
                    </div>
                    <div className="space-y-1 max-w-md">
                        <h3 className="text-lg font-bold text-foreground">
                            {activeSuite.shortName} Policy Suite Generated!
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            {result.message}
                        </p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="px-5 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{result.created}</div>
                            <div className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">Created Drafts</div>
                        </div>
                        <div className="px-5 py-3 rounded-xl bg-muted/60 border border-border">
                            <div className="text-2xl font-bold text-foreground">{result.skipped}</div>
                            <div className="text-[11px] font-semibold text-muted-foreground">Pre-Existing</div>
                        </div>
                        <div className="px-5 py-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800">
                            <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{result.total}</div>
                            <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">Suite Total</div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-2.5 pt-3">
                        {returnTo && (
                            <Button
                                onClick={handleReturnToRoadmap}
                                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs gap-1.5 shadow-sm"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                Return to {returnLabel || "Roadmap"}
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            onClick={handleClose}
                            className="text-xs font-bold"
                        >
                            View Policy Register
                        </Button>
                    </div>
                </div>
            )}

            {/* PREVIEW MODAL */}
            {previewPolicy && (() => {
                const content = previewPolicy.defaultContent(companyName || clientName);
                const wordCount = content.split(/\s+/).filter(Boolean).length;
                return (
                    <EnhancedDialog
                        open={!!previewPolicy}
                        onOpenChange={(open) => {
                            if (!open) {
                                setPreviewPolicy(null);
                                setCopiedPreview(false);
                            }
                        }}
                        title={previewPolicy.name}
                        description={`${previewPolicy.statutoryRef} • Complete Statutory Compliance Specification`}
                        size="2xl"
                        footer={
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Badge variant="outline" className="font-mono text-[10px] bg-muted/50 border-border">
                                        {previewPolicy.clauseBadge}
                                    </Badge>
                                    <span>~{wordCount} words</span>
                                    <span>•</span>
                                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">8 Full Sections • Audit-Ready</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleCopyPreview(content)}
                                        className="gap-1.5 text-xs font-semibold"
                                    >
                                        {copiedPreview ? (
                                            <>
                                                <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                                                Copied!
                                            </>
                                        ) : (
                                            <>
                                                <FileText className="w-3.5 h-3.5" />
                                                Copy Draft Text
                                            </>
                                        )}
                                    </Button>
                                    <Button size="sm" onClick={() => setPreviewPolicy(null)}>
                                        Close Preview
                                    </Button>
                                </div>
                            </div>
                        }
                    >
                        <div className="space-y-3.5">
                            <div className="flex flex-wrap items-center gap-2.5 p-3 rounded-xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/80 text-xs shadow-xs">
                                <div className="flex items-center gap-1.5 text-blue-900 dark:text-blue-200 font-bold shrink-0">
                                    <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                    <span>Mandated Controls:</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {previewPolicy.keyControls.map((ctrl, i) => (
                                        <span
                                            key={i}
                                            className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-blue-200 dark:border-blue-800/70 shadow-2xs"
                                        >
                                            {ctrl}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <PolicyRichTextViewer content={content} maxHeight="520px" />
                        </div>
                    </EnhancedDialog>
                );
            })()}
        </EnhancedDialog>
    );
}

export default BulkGenerateDialog;
