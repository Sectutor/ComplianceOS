import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useTranslation } from "@/hooks/useTranslation";
import {
    Button,
    Card, CardContent, CardDescription, CardHeader, CardTitle,
    Switch,
    Input,
    Label,
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
    Badge,
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
    Tabs, TabsContent, TabsList, TabsTrigger,
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle
} from "@complianceos/ui";
import { EnhancedDialog } from "@complianceos/ui/ui/enhanced-dialog";
import {
    Loader2, Plus, Trash2, Edit, Play,
    CheckCircle, XCircle, Monitor, Network,
    ServerCog, Cpu, ShieldAlert, FileText, Briefcase,
    ShieldCheck, Zap, Copy, Check, RefreshCw, HardDrive, Sparkles, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

const FEATURES = [
    { id: 'general_advisor', name: 'General AI Advisor', description: 'Chat and general Q&A', icon: Monitor },
    { id: 'risk_analysis', name: 'Risk Analysis', description: 'Auto-triage and risk scoring', icon: ShieldAlert },
    { id: 'policy_generation', name: 'Policy Drafting', description: 'Drafting and tailoring policies', icon: FileText },
    { id: 'tech_suggestion', name: 'Technology Suggestions', description: 'Recommending controls/tools', icon: ServerCog },
    { id: 'implementation_plan', name: 'Implementation Planning', description: 'Generating step-by-step plans', icon: Briefcase },
    { id: 'explain_mapping', name: 'Regulation Mapping', description: 'Explaining compliance mapping', icon: Network },
    { id: 'vendor_mitigation', name: 'Vendor Mitigation', description: 'Vendor risk remediation plans', icon: Cpu },
];

export default function LLMSettings() {
    const [isAddOpen, setIsAddOpen] = useState(false);
    const { t } = useTranslation('settings');
    const [editingId, setEditingId] = useState<number | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        provider: "openai",
        model: "",
        apiKey: "",
        baseUrl: "",
        priority: "0",
        isEnabled: true,
        supportsEmbeddings: false
    });

    // Test State
    const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
    const [isTesting, setIsTesting] = useState(false);

    const [providerToDelete, setProviderToDelete] = useState<any>(null);

    const utils = trpc.useUtils();
    const { data: providers, isLoading } = trpc.llm.list.useQuery();
    const { data: routes } = trpc.llm.getRoutes.useQuery();

    const setRouteMutation = trpc.llm.setRoute.useMutation({
        onSuccess: () => {
            toast.success("Routing rule updated");
            utils.llm.getRoutes.invalidate();
        },
        onError: (err) => toast.error(err.message)
    });

    const createMutation = trpc.llm.create.useMutation({
        onSuccess: () => {
            toast.success("Provider added successfully");
            setIsAddOpen(false);
            resetForm();
            utils.llm.list.invalidate();
        },
        onError: (err) => toast.error(err.message)
    });

    const updateMutation = trpc.llm.update.useMutation({
        onSuccess: () => {
            toast.success("Provider updated");
            setIsAddOpen(false);
            setEditingId(null);
            resetForm();
            utils.llm.list.invalidate();
        },
        onError: (err) => toast.error(err.message)
    });

    const deleteMutation = trpc.llm.delete.useMutation({
        onSuccess: () => {
            toast.success("Provider deleted");
            setProviderToDelete(null);
            utils.llm.list.invalidate();
        },
        onError: (err) => toast.error(err.message)
    });

    const [selectedHardwareTier, setSelectedHardwareTier] = useState<"all" | "workstation" | "pro_workstation" | "enterprise_gpu">("all");
    const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

    const { data: execModeData } = trpc.llm.getExecutionMode.useQuery();
    const setExecModeMutation = trpc.llm.setExecutionMode.useMutation({
        onSuccess: (data) => {
            toast.success(`Execution mode set to: ${data.mode === 'local_only' ? 'Air-Gapped Sovereign (100% Local)' : data.mode === 'hybrid' ? 'Hybrid (Local + Cloud Fallback)' : 'Cloud First'}`);
            utils.llm.getExecutionMode.invalidate();
            utils.llm.list.invalidate();
        },
        onError: (err) => toast.error(err.message)
    });

    const { data: recommendedLocalModels } = trpc.llm.getRecommendedLocalModels.useQuery();
    const { data: detectedRuntimes, isFetching: isScanningRuntimes, refetch: scanRuntimes } = trpc.llm.detectLocalRuntimes.useQuery(
        undefined,
        { refetchOnWindowFocus: false }
    );

    const handleCopyCmd = (cmd: string) => {
        navigator.clipboard.writeText(cmd);
        setCopiedCmd(cmd);
        toast.success("Command copied to clipboard");
        setTimeout(() => setCopiedCmd(null), 2000);
    };

    const handleQuickConnectLocal = (runtime: any, modelId: string) => {
        createMutation.mutate({
            name: `${runtime.name} (${modelId})`,
            provider: runtime.type,
            model: modelId,
            apiKey: "local",
            baseUrl: runtime.baseUrl,
            priority: 20,
            isEnabled: true,
            supportsEmbeddings: /embed|nomic|bge|minilm/i.test(modelId)
        });
    };

    const [lastIndexStats, setLastIndexStats] = useState<any>(null);
    const reindexMutation = trpc.advisor.reindexContent.useMutation({
        onSuccess: (res) => {
            toast.success("Indexing completed successfully");
            setLastIndexStats(res.stats);
        },
        onError: (err) => toast.error("Indexing failed: " + err.message)
    });

    const testMutation = trpc.llm.test.useMutation({
        onSuccess: (result: any) => {
            const isSuccess = !!result?.success;
            const message = result?.message || (isSuccess ? "Connection successful!" : "Connection failed");

            if (isSuccess && result.id) {
                // Refresh list
                utils.llm.list.invalidate();
                // If it was a new provider, it is now an existing one - set editingId so Create becomes Save
                if (!editingId) {
                    setEditingId(result.id);
                }
            }

            setTestResult({
                success: isSuccess,
                message: message
            });

            if (isSuccess) {
                toast.success(message);
            } else {
                toast.error(message);
            }
            setIsTesting(false);
        },
        onError: (err: any) => {
            setIsTesting(false);
            setTestResult({
                success: false,
                message: err.message || "Connection test failed. Please check your credentials."
            });
            toast.error(err.message || "Connection test failed");
        },
        onSettled: () => {
            setIsTesting(false);
        }
    });

    const handleEdit = (provider: any) => {
        setFormData({
            name: provider.name,
            provider: provider.provider,
            model: provider.model,
            apiKey: provider.apiKey || (provider.id ? "********" : ""), // Use "********" if key exists/editable record
            baseUrl: provider.baseUrl || "",
            priority: provider.priority.toString(),
            isEnabled: provider.isEnabled,
            supportsEmbeddings: provider.supportsEmbeddings || false
        });
        setEditingId(provider.id);
        setTestResult(null); // Clear previous test result
        setIsAddOpen(true);
    };

    const resetForm = () => {
        setFormData({
            name: "",
            provider: "openai",
            model: "",
            apiKey: "",
            baseUrl: "",
            priority: "0",
            isEnabled: true,
            supportsEmbeddings: false
        });
        setEditingId(null);
        setTestResult(null);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const payload = {
            name: formData.name,
            provider: formData.provider,
            model: formData.model,
            apiKey: formData.apiKey,
            baseUrl: formData.baseUrl || undefined,
            priority: parseInt(formData.priority),
            isEnabled: formData.isEnabled,
            supportsEmbeddings: formData.supportsEmbeddings
        };

        if (editingId) {
            // If editing, only send apiKey if it's NOT the masked one and NOT empty
            if (payload.apiKey === "********" || !payload.apiKey) {
                delete (payload as any).apiKey;
            }
            updateMutation.mutate({ id: editingId, ...payload });
        } else {
            if (!payload.apiKey) {
                toast.error("API Key is required");
                return;
            }
            createMutation.mutate(payload as any);
        }
    };

    const handleTest = async () => {
        if (!formData.apiKey && !editingId) {
            toast.error("Enter an API Key to test");
            return;
        }

        setIsTesting(true);
        setTestResult(null);
        testMutation.mutate({
            id: editingId || undefined,
            name: formData.name,
            provider: formData.provider,
            apiKey: formData.apiKey,
            baseUrl: formData.baseUrl || undefined,
            model: formData.model
        }, {
            onSettled: () => setIsTesting(false)
        });
    };

    const { data: availableModels, isLoading: isLoadingModels } = trpc.llm.listAvailableModels.useQuery(
        { provider: formData.provider, apiKey: formData.apiKey, baseUrl: formData.baseUrl },
        { enabled: isAddOpen }
    );

    const handleProviderChange = (v: string) => {
        let defaultModel = formData.model;
        let defaultBaseUrl = formData.baseUrl;
        let defaultName = formData.name;

        if (v === 'ollama') {
            defaultBaseUrl = 'http://127.0.0.1:11434';
            defaultModel = 'deepseek-r1:8b';
            if (!formData.name || formData.name === 'My OpenAI') defaultName = 'Ollama (Local)';
        } else if (v === 'lmstudio') {
            defaultBaseUrl = 'http://127.0.0.1:1234/v1';
            defaultModel = 'loaded-model';
            if (!formData.name || formData.name === 'My OpenAI') defaultName = 'LM Studio (Local)';
        } else if (v === 'vllm') {
            defaultBaseUrl = 'http://127.0.0.1:8000/v1';
            defaultModel = 'deepseek-ai/DeepSeek-R1-Distill-Llama-70B';
            if (!formData.name || formData.name === 'My OpenAI') defaultName = 'vLLM GPU Cluster';
        } else if (v === 'localai') {
            defaultBaseUrl = 'http://127.0.0.1:8080/v1';
            defaultModel = 'gpt-4';
            if (!formData.name || formData.name === 'My OpenAI') defaultName = 'LocalAI';
        } else if (v === 'deepseek') {
            defaultBaseUrl = 'https://api.deepseek.com';
            defaultModel = 'deepseek-chat';
            if (!formData.name || formData.name === 'My OpenAI') defaultName = 'DeepSeek';
        } else if (v === 'openrouter') {
            defaultBaseUrl = 'https://openrouter.ai/api/v1';
            defaultModel = 'deepseek/deepseek-chat';
            if (!formData.name || formData.name === 'My OpenAI') defaultName = 'OpenRouter';
        } else if (v === 'anthropic') {
            defaultBaseUrl = '';
            defaultModel = 'claude-3-7-sonnet-20250219';
            if (!formData.name || formData.name === 'My OpenAI') defaultName = 'Anthropic';
        } else if (v === 'gemini') {
            defaultBaseUrl = '';
            defaultModel = 'gemini-1.5-flash';
            if (!formData.name || formData.name === 'My OpenAI') defaultName = 'Google Gemini';
        } else if (v === 'openai') {
            defaultBaseUrl = '';
            defaultModel = 'gpt-4o';
            if (!formData.name) defaultName = 'OpenAI';
        }

        setFormData({
            ...formData,
            provider: v,
            name: defaultName,
            model: defaultModel,
            baseUrl: defaultBaseUrl
        });
    };

    return (
        <div className="space-y-6 w-full animate-in fade-in duration-500">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">AI & LLM Settings</h1>
                    <p className="text-muted-foreground mt-1">
                        Configure and prioritize the AI models used for policy generation and analysis.
                    </p>
                </div>
                <Button onClick={() => { resetForm(); setIsAddOpen(true); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Provider
                </Button>
            </div>

            <EnhancedDialog
                open={isAddOpen}
                onOpenChange={(open) => { setIsAddOpen(open); if (!open) { setEditingId(null); resetForm(); } }}
                title={editingId ? "Edit Provider" : "Add LLM Provider"}
                description="Add a new AI provider using your own API key. Keys are encrypted at rest."
                footer={
                    <div className="flex justify-end gap-2 w-full">
                        <Button type="button" variant="ghost" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                        <Button
                            onClick={(e) => {
                                const form = document.getElementById('llm-provider-form') as HTMLFormElement;
                                if (form) form.requestSubmit();
                            }}
                            disabled={createMutation.isPending || updateMutation.isPending}
                        >
                            {editingId ? "Save Changes" : "Create Provider"}
                        </Button>
                    </div>
                }
                size="lg"
            >
                <form id="llm-provider-form" onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="font-semibold text-foreground/80">Name</Label>
                            <Input
                                placeholder="My OpenAI"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                required
                                className="border-2 border-slate-300 bg-slate-50 focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="font-semibold text-foreground/80">Provider Type</Label>
                            <Select
                                value={formData.provider}
                                onValueChange={handleProviderChange}
                            >
                                <SelectTrigger className="border-2 border-slate-300 bg-slate-50 focus:ring-2 focus:ring-primary/20">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ollama">Ollama (Local Engine)</SelectItem>
                                    <SelectItem value="lmstudio">LM Studio (Local GUI)</SelectItem>
                                    <SelectItem value="vllm">vLLM / TGI (GPU Cluster)</SelectItem>
                                    <SelectItem value="localai">LocalAI / llama.cpp</SelectItem>
                                    <SelectItem value="deepseek">DeepSeek</SelectItem>
                                    <SelectItem value="openrouter">OpenRouter (100+ Models)</SelectItem>
                                    <SelectItem value="openai">OpenAI</SelectItem>
                                    <SelectItem value="anthropic">Anthropic</SelectItem>
                                    <SelectItem value="gemini">Gemini (Google)</SelectItem>
                                    <SelectItem value="qwen">Qwen / Gwen</SelectItem>
                                    <SelectItem value="custom">Custom (OpenAI Compat)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Model Selector Dropdown + Custom Input */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="font-semibold text-foreground/80">
                                Model Name {formData.provider === 'openrouter' && "(Select from OpenRouter catalog)"}
                            </Label>
                            {isLoadingModels && (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <Loader2 className="w-3 h-3 animate-spin" /> Fetching models...
                                </span>
                            )}
                        </div>

                        {/* Model Dropdown */}
                        {availableModels && availableModels.length > 0 && (
                            <Select
                                value={availableModels.some(m => m.id === formData.model) ? formData.model : "custom"}
                                onValueChange={(val) => {
                                    if (val !== "custom") {
                                        setFormData({ ...formData, model: val });
                                    }
                                }}
                            >
                                <SelectTrigger className="border-2 border-slate-300 bg-slate-50 focus:ring-2 focus:ring-primary/20">
                                    <SelectValue placeholder="Select a model from catalog..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-64">
                                    {availableModels.map((m: any) => (
                                        <SelectItem key={m.id} value={m.id}>
                                            <div className="flex flex-col py-0.5">
                                                <span className="font-medium text-foreground">{m.name}</span>
                                                <span className="text-[10px] text-muted-foreground font-mono">{m.id}</span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                    <SelectItem value="custom">
                                        <span className="italic text-muted-foreground">+ Enter Custom Model ID below</span>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        )}

                        {/* Explicit Input Field for fine-tuning or custom unlisted models */}
                        <Input
                            placeholder="e.g. deepseek/deepseek-r1, gpt-4o, claude-3-7-sonnet"
                            value={formData.model}
                            onChange={e => setFormData({ ...formData, model: e.target.value })}
                            required
                            className="border-2 border-slate-300 bg-slate-50 focus:ring-2 focus:ring-primary/20 font-mono text-xs"
                        />

                        {/* Quick Suggestion Chips for Popular Models */}
                        {formData.provider === 'openrouter' && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                                <span className="text-[10px] text-muted-foreground font-medium self-center">Popular:</span>
                                {[
                                    { label: 'DeepSeek R1', id: 'deepseek/deepseek-r1' },
                                    { label: 'DeepSeek V3', id: 'deepseek/deepseek-chat' },
                                    { label: 'Claude 3.7 Sonnet', id: 'anthropic/claude-3.7-sonnet' },
                                    { label: 'GPT-4o', id: 'openai/gpt-4o' },
                                    { label: 'Gemini 2.0 Flash', id: 'google/gemini-2.0-flash-001' },
                                    { label: 'Llama 3.3 70B', id: 'meta-llama/llama-3.3-70b-instruct' }
                                ].map(chip => (
                                    <button
                                        key={chip.id}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, model: chip.id })}
                                        className={`text-[10px] px-2 py-0.5 rounded-md border transition-all ${
                                            formData.model === chip.id
                                                ? "bg-primary text-primary-foreground border-primary font-semibold"
                                                : "bg-muted/70 hover:bg-muted text-muted-foreground border-border"
                                        }`}
                                    >
                                        {chip.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="font-semibold text-foreground/80">API Key {editingId && "(Leave blank to keep unchanged)"}</Label>
                            {editingId && !formData.apiKey && (
                                <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-none">
                                    Key Stored
                                </Badge>
                            )}
                        </div>
                        <Input
                            type="password"
                            placeholder="sk-..."
                            value={formData.apiKey}
                            onChange={e => setFormData({ ...formData, apiKey: e.target.value })}
                            className="border-2 border-slate-300 bg-slate-50 focus:ring-2 focus:ring-primary/20"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="font-semibold text-foreground/80">Base URL (Optional)</Label>
                        <Input
                            placeholder="e.g. https://api.deepseek.com/v1"
                            value={formData.baseUrl}
                            onChange={e => setFormData({ ...formData, baseUrl: e.target.value })}
                            className="border-2 border-slate-300 bg-slate-50 focus:ring-2 focus:ring-primary/20"
                        />
                        <p className="text-[10px] text-muted-foreground">Required for DeepSeek, Custom, or Local LLMs.</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="space-y-2 flex-1">
                            <Label className="font-semibold text-foreground/80">Priority (Higher = Preferred)</Label>
                            <Input
                                type="number"
                                value={formData.priority}
                                onChange={e => setFormData({ ...formData, priority: e.target.value })}
                                className="border-2 border-slate-300 bg-slate-50 focus:ring-2 focus:ring-primary/20"
                            />
                        </div>
                        <div className="flex items-center space-x-2 pt-6">
                            <Switch
                                id="enabled"
                                checked={formData.isEnabled}
                                onCheckedChange={c => setFormData({ ...formData, isEnabled: c })}
                            />
                            <Label htmlFor="enabled">Enabled</Label>
                        </div>
                        <div className="flex items-center space-x-2 pt-6">
                            <Switch
                                id="embeddings"
                                checked={formData.supportsEmbeddings}
                                onCheckedChange={c => setFormData({ ...formData, supportsEmbeddings: c })}
                            />
                            <Label htmlFor="embeddings">Embeddings</Label>
                        </div>
                    </div>

                    {/* Test Connection Section */}
                    <div className="pt-2 border-t flex items-center justify-between">
                        <Button type="button" variant="outline" size="sm" onClick={handleTest} disabled={isTesting}>
                            {isTesting ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Play className="mr-2 h-3 w-3" />}
                            Test Connection
                        </Button>
                        {testResult && (
                            <span className={`text-xs flex items-center ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                                {testResult.success ? <CheckCircle className="h-3 w-3 mr-1" /> : <XCircle className="h-3 w-3 mr-1" />}
                                {testResult.message}
                            </span>
                        )}
                    </div>
                </form>
            </EnhancedDialog>

            {/* Enterprise AI Sovereignty & Local Engine Discovery Control */}
            <Card className="border-2 border-brand/20 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl overflow-hidden">
                <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                                <h2 className="text-lg font-bold text-white tracking-wide">Enterprise Data Sovereignty & Execution Mode</h2>
                            </div>
                            <p className="text-xs text-slate-300 max-w-2xl">
                                Configure privacy policies and local LLM execution. In <b>Air-Gapped Sovereign Mode</b>, all external network egress to OpenAI/Anthropic is strictly blocked for 100% on-prem data retention.
                            </p>
                        </div>

                        {/* Execution Mode Selector */}
                        <div className="flex items-center gap-2 bg-slate-800/80 p-1.5 rounded-xl border border-slate-700">
                            {[
                                { id: 'hybrid', label: 'Hybrid (Auto Fallback)', desc: 'Local + Cloud' },
                                { id: 'local_only', label: '🔒 Air-Gapped Sovereign', desc: '100% On-Prem' },
                                { id: 'cloud_only', label: 'Cloud Only', desc: 'SaaS APIs' }
                            ].map((modeOption) => (
                                <button
                                    key={modeOption.id}
                                    type="button"
                                    onClick={() => setExecModeMutation.mutate({ mode: modeOption.id as any })}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                        (execModeData?.mode || 'hybrid') === modeOption.id
                                            ? modeOption.id === 'local_only'
                                                ? "bg-emerald-600 text-white shadow-md"
                                                : "bg-primary text-primary-foreground shadow-md"
                                            : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                                    }`}
                                >
                                    {modeOption.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Local Runtimes Auto-Discovery Bar */}
                    <div className="mt-6 pt-4 border-t border-slate-700/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <Cpu className="h-4 w-4 text-sky-400" />
                            <span className="text-xs font-semibold text-slate-200">Local LLM Engine Auto-Discovery:</span>
                            <div className="flex flex-wrap items-center gap-2">
                                {detectedRuntimes?.map((runtime) => (
                                    <div
                                        key={runtime.id}
                                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs border ${
                                            runtime.isOnline
                                                ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-300"
                                                : "bg-slate-800/80 border-slate-700 text-slate-400"
                                        }`}
                                    >
                                        <span className={`h-2 w-2 rounded-full ${runtime.isOnline ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
                                        <span className="font-semibold">{runtime.name}</span>
                                        {runtime.isOnline && (
                                            <span className="text-[10px] bg-emerald-800/80 text-white px-1.5 py-0.2 rounded-full font-mono">
                                                {runtime.models.length} model{runtime.models.length === 1 ? '' : 's'}
                                            </span>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => scanRuntimes()}
                            disabled={isScanningRuntimes}
                            className="bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 text-xs h-8"
                        >
                            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isScanningRuntimes ? "animate-spin" : ""}`} />
                            {isScanningRuntimes ? "Scanning Ports..." : "Scan Local Engines"}
                        </Button>
                    </div>

                    {/* Detected Local Models Quick Connect Strip */}
                    {detectedRuntimes && detectedRuntimes.some(r => r.isOnline && r.models.length > 0) && (
                        <div className="mt-3 p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-lg flex flex-wrap items-center gap-3">
                            <span className="text-xs text-emerald-200 font-semibold flex items-center gap-1">
                                <Sparkles className="h-3.5 w-3.5 text-emerald-400" /> Discovered Local Models:
                            </span>
                            {detectedRuntimes
                                .filter(r => r.isOnline)
                                .flatMap(r => r.models.map(m => ({ runtime: r, model: m })))
                                .map(({ runtime, model }) => (
                                    <div key={`${runtime.id}-${model.id}`} className="flex items-center gap-1.5 bg-slate-900/90 px-2 py-1 rounded border border-emerald-500/40 text-xs">
                                        <span className="font-mono text-emerald-300 text-[11px]">{model.name}</span>
                                        {model.supportsEmbeddings && (
                                            <Badge className="bg-sky-500/20 text-sky-300 border-none text-[9px] h-4">Embeddings</Badge>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => handleQuickConnectLocal(runtime, model.id)}
                                            className="ml-1 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white px-2 py-0.5 rounded font-semibold transition-all"
                                        >
                                            + Add
                                        </button>
                                    </div>
                                ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <Tabs defaultValue="providers" className="w-full">
                <TabsList className="bg-brand/10 p-1.5 h-auto flex flex-wrap justify-start gap-2 w-full border border-brand/20 rounded-xl mb-6">
                    <TabsTrigger
                        value="providers"
                        className="data-[state=active]:bg-brand-bright data-[state=active]:text-white bg-brand text-white hover:bg-brand-bright transition-all font-bold border-none px-4 py-2.5 rounded-lg"
                    >
                        LLM Providers
                    </TabsTrigger>
                    <TabsTrigger
                        value="local_catalog"
                        className="data-[state=active]:bg-brand-bright data-[state=active]:text-white bg-brand text-white hover:bg-brand-bright transition-all font-bold border-none px-4 py-2.5 rounded-lg"
                    >
                        Local GRC Models & Hardware Guide
                    </TabsTrigger>
                    <TabsTrigger
                        value="routing"
                        className="data-[state=active]:bg-brand-bright data-[state=active]:text-white bg-brand text-white hover:bg-brand-bright transition-all font-bold border-none px-4 py-2.5 rounded-lg"
                    >
                        Dynamic Routing
                    </TabsTrigger>
                    <TabsTrigger
                        value="indexing"
                        className="data-[state=active]:bg-brand-bright data-[state=active]:text-white bg-brand text-white hover:bg-brand-bright transition-all font-bold border-none px-4 py-2.5 rounded-lg"
                    >
                        Data & Indexing
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="providers">
                    {isLoading ? (
                        <div className="flex justify-center p-12">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {providers?.map((provider) => (
                                <Card key={provider.id} className={!provider.isEnabled ? "opacity-60 bg-muted/30" : ""}>
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                {provider.priority}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold flex items-center gap-2">
                                                    {provider.name}
                                                    {provider.isEnabled ? (
                                                        <Badge variant="default" className="text-[10px] h-5">Active</Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="text-[10px] h-5">Disabled</Badge>
                                                    )}
                                                </h3>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <span className="capitalize">{provider.provider}</span>
                                                    <span>•</span>
                                                    <span className="font-mono text-xs">{provider.model}</span>
                                                    {provider.apiKey && (
                                                        <>
                                                            <span>•</span>
                                                            <Badge variant="outline" className="h-5 bg-green-50 text-green-600 border-green-200 text-[10px]">
                                                                Key Set
                                                            </Badge>
                                                        </>
                                                    )}
                                                    {provider.baseUrl && (
                                                        <>
                                                            <span>•</span>
                                                            <span className="text-xs truncate max-w-[200px]">{provider.baseUrl}</span>
                                                        </>
                                                    )}
                                                    {provider.supportsEmbeddings && (
                                                        <>
                                                            <span>•</span>
                                                            <Badge variant="outline" className="h-5 bg-blue-50 text-blue-600 border-blue-200 text-[10px]">
                                                                Embeddings
                                                            </Badge>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(provider)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={() => setProviderToDelete(provider)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}

                            {providers?.length === 0 && (
                                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                                    <p className="text-muted-foreground">No AI providers configured.</p>
                                    <Button variant="link" onClick={() => setIsAddOpen(true)}>Add your first provider</Button>
                                </div>
                            )}
                        </div>
                    )}
                </TabsContent>

                {/* Local GRC Models & Hardware Guide Tab */}
                <TabsContent value="local_catalog" className="space-y-6">
                    <Card className="border shadow-sm">
                        <CardHeader>
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                                <div>
                                    <CardTitle className="text-xl flex items-center gap-2">
                                        <HardDrive className="h-5 w-5 text-primary" />
                                        Self-Hosted & Local LLM Model Recommendations
                                    </CardTitle>
                                    <CardDescription className="mt-1">
                                        Curated open-weights models optimized for compliance, risk modeling, policy synthesis, and local vector embeddings.
                                    </CardDescription>
                                </div>

                                {/* Hardware Tier Filter */}
                                <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg border">
                                    {[
                                        { id: 'all', label: 'All Models' },
                                        { id: 'workstation', label: '💻 Workstation (8-16GB)' },
                                        { id: 'pro_workstation', label: '🚀 Pro / M-Series (24-32GB)' },
                                        { id: 'enterprise_gpu', label: '🏢 GPU Cluster (48GB+)' }
                                    ].map((tier) => (
                                        <button
                                            key={tier.id}
                                            type="button"
                                            onClick={() => setSelectedHardwareTier(tier.id as any)}
                                            className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                                                selectedHardwareTier === tier.id
                                                    ? "bg-background text-foreground shadow-sm font-semibold"
                                                    : "text-muted-foreground hover:text-foreground"
                                            }`}
                                        >
                                            {tier.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {/* Fast Setup Terminal Prompt */}
                            <div className="mb-6 p-4 bg-slate-950 text-slate-200 rounded-xl border border-slate-800 font-mono text-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <div className="space-y-1">
                                    <div className="text-sky-400 font-bold flex items-center gap-1.5">
                                        <Zap className="h-4 w-4" /> Quick Local Setup (Ollama Engine):
                                    </div>
                                    <div className="text-slate-400 text-[11px]">
                                        Install Ollama (<a href="https://ollama.com" target="_blank" rel="noreferrer" className="underline text-sky-300">ollama.com</a>), then run any model command below in your terminal. ComplianceOS auto-detects it instantly.
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="bg-slate-900 px-3 py-1.5 rounded border border-slate-700 text-emerald-400">
                                        ollama run deepseek-r1:8b
                                    </span>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 border-slate-700 hover:bg-slate-800 text-slate-200"
                                        onClick={() => handleCopyCmd("ollama run deepseek-r1:8b")}
                                    >
                                        {copiedCmd === "ollama run deepseek-r1:8b" ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                                    </Button>
                                </div>
                            </div>

                            {/* Model Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {recommendedLocalModels
                                    ?.filter(m => selectedHardwareTier === 'all' || m.tier === selectedHardwareTier)
                                    .map((model) => (
                                        <Card key={model.id} className="border hover:border-primary/40 transition-all flex flex-col justify-between">
                                            <CardHeader className="pb-2">
                                                <div className="flex items-start justify-between gap-2">
                                                    <div>
                                                        <h4 className="font-bold text-sm text-foreground">{model.name}</h4>
                                                        <span className="font-mono text-[11px] text-muted-foreground">{model.id}</span>
                                                    </div>
                                                    <Badge
                                                        variant="outline"
                                                        className={`text-[10px] whitespace-nowrap ${
                                                            model.tier === 'workstation'
                                                                ? "bg-sky-50 text-sky-700 border-sky-200"
                                                                : model.tier === 'pro_workstation'
                                                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                                                                    : "bg-amber-50 text-amber-700 border-amber-200"
                                                        }`}
                                                    >
                                                        {model.ramVramRequirement}
                                                    </Badge>
                                                </div>
                                                <div className="flex flex-wrap gap-1 pt-1">
                                                    <Badge className="bg-primary/10 text-primary border-none text-[10px]">
                                                        {model.primaryUseCase}
                                                    </Badge>
                                                    {model.supportsEmbeddings && (
                                                        <Badge className="bg-emerald-100 text-emerald-800 border-none text-[10px]">
                                                            pgvector Embeddings
                                                        </Badge>
                                                    )}
                                                </div>
                                            </CardHeader>
                                            <CardContent className="pt-0 space-y-3">
                                                <p className="text-xs text-muted-foreground leading-relaxed">
                                                    {model.description}
                                                </p>

                                                <div className="pt-2 border-t flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-1 font-mono text-[10px] bg-muted/80 px-2 py-1 rounded truncate max-w-[170px]">
                                                        {model.pullCommand}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-7 w-7"
                                                            onClick={() => handleCopyCmd(model.pullCommand)}
                                                            title="Copy pull command"
                                                        >
                                                            {copiedCmd === model.pullCommand ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="text-xs h-7 px-2"
                                                            onClick={() => {
                                                                resetForm();
                                                                setFormData({
                                                                    name: `Ollama - ${model.name}`,
                                                                    provider: "ollama",
                                                                    model: model.id,
                                                                    apiKey: "local",
                                                                    baseUrl: "http://127.0.0.1:11434",
                                                                    priority: "20",
                                                                    isEnabled: true,
                                                                    supportsEmbeddings: model.supportsEmbeddings
                                                                });
                                                                setIsAddOpen(true);
                                                            }}
                                                        >
                                                            + Config
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="routing" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Feature Routing Rules</CardTitle>
                            <CardDescription>Configure which AI model handles each specific task. Leave "Default" to use the highest priority allowed provider.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {FEATURES.map(feature => {
                                    const currentRule = routes?.find(r => r.feature === feature.id);
                                    const FeatureIcon = feature.icon;

                                    return (
                                        <div key={feature.id} className="flex items-center justify-between pb-4 border-b last:border-0 last:pb-0">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 bg-primary/5 rounded-lg flex items-center justify-center text-primary">
                                                    <FeatureIcon className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <h4 className="font-semibold">{feature.name}</h4>
                                                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                                                </div>
                                            </div>
                                            <div className="w-[300px]">
                                                <Select
                                                    value={currentRule?.providerId ? currentRule.providerId.toString() : "default"}
                                                    onValueChange={(val) => {
                                                        const providerId = val === "default" ? null : parseInt(val);
                                                        setRouteMutation.mutate({ feature: feature.id, providerId });
                                                    }}
                                                    disabled={setRouteMutation.isPending}
                                                >
                                                    <SelectTrigger className="bg-white">
                                                        <SelectValue placeholder="Default (Highest Priority)" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="default">Default Provider (Highest Priority)</SelectItem>
                                                        {providers?.filter(p => p.isEnabled).map(provider => (
                                                            <SelectItem key={provider.id} value={provider.id.toString()}>
                                                                {provider.name} ({provider.model})
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="indexing" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Knowledge Base Indexing</CardTitle>
                            <CardDescription>Manage the vector index used for RAG (Retrieval-Augmented Generation). Re-index content if AI responses seem outdated.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-4 md:grid-cols-3">
                                <div className="border rounded-lg p-4 bg-slate-50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <FileText className="h-5 w-5 text-blue-600" />
                                        <h4 className="font-semibold">Policies</h4>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-4">Index all generated policies for context-aware drafting.</p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => reindexMutation.mutate({ type: 'policies' })}
                                        disabled={reindexMutation.isPending}
                                    >
                                        {reindexMutation.isPending ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Play className="mr-2 h-3 w-3" />}
                                        Re-index Policies
                                    </Button>
                                </div>

                                <div className="border rounded-lg p-4 bg-slate-50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Briefcase className="h-5 w-5 text-green-600" />
                                        <h4 className="font-semibold">Evidence</h4>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-4">Index uploaded evidence summaries for verification.</p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => reindexMutation.mutate({ type: 'evidence' })}
                                        disabled={reindexMutation.isPending}
                                    >
                                        {reindexMutation.isPending ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Play className="mr-2 h-3 w-3" />}
                                        Re-index Evidence
                                    </Button>
                                </div>

                                <div className="border rounded-lg p-4 bg-slate-50">
                                    <div className="flex items-center gap-2 mb-2">
                                        <ShieldAlert className="h-5 w-5 text-red-600" />
                                        <h4 className="font-semibold">Full System</h4>
                                    </div>
                                    <p className="text-sm text-muted-foreground mb-4">Complete re-index of all knowledge base items.</p>
                                    <Button
                                        variant="default"
                                        size="sm"
                                        className="w-full"
                                        onClick={() => reindexMutation.mutate({ type: 'all' })}
                                        disabled={reindexMutation.isPending}
                                    >
                                        {reindexMutation.isPending ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : <Play className="mr-2 h-3 w-3" />}
                                        Re-index Everything
                                    </Button>
                                </div>
                            </div>
                            {lastIndexStats && (
                                <div className="mt-4 p-4 bg-green-50 text-green-700 rounded-md text-sm border border-green-200 flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4" />
                                    Last Run: Indexed {lastIndexStats.policies} policies and {lastIndexStats.evidence} evidence items. ({lastIndexStats.errors} errors)
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <AlertDialog open={!!providerToDelete} onOpenChange={(open) => !open && setProviderToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently delete the provider <b>{providerToDelete?.name}</b>.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => {
                                if (providerToDelete) {
                                    deleteMutation.mutate({ id: providerToDelete.id });
                                }
                            }}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? "Deleting..." : "Delete Provider"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

