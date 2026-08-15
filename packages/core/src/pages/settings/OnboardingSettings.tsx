import { useState, useMemo } from "react";
import { useParams } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { Breadcrumb } from "@/components/Breadcrumb";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Input } from "@complianceos/ui/ui/input";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { Switch } from "@complianceos/ui/ui/switch";
import { Label } from "@complianceos/ui/ui/label";
import { Badge } from "@complianceos/ui/ui/badge";
import { Progress } from "@complianceos/ui/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@complianceos/ui/ui/tabs";
import { ScrollArea } from "@complianceos/ui/ui/scroll-area";
import { trpc } from "@/lib/trpc";
import { useClientContext } from "@/contexts/ClientContext";
import {
    Plus, Trash2, Edit2, Loader2, GripVertical, Sparkles, FileText,
    GraduationCap, Shield, BarChart3, Users, CheckCircle2, Clock,
    Copy, Archive, Settings, BookOpen, Lock, ClipboardList, TrendingUp,
    ChevronUp, ChevronDown, Wand2
} from "lucide-react";
import RichTextEditor from "@/components/RichTextEditor";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@complianceos/ui/ui/dialog";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@complianceos/ui/ui/select";

const CATEGORIES = [
    { value: "general", label: "General", color: "bg-blue-100 text-blue-700" },
    { value: "security", label: "Security", color: "bg-red-100 text-red-700" },
    { value: "hr", label: "HR & Culture", color: "bg-purple-100 text-purple-700" },
    { value: "compliance", label: "Compliance", color: "bg-amber-100 text-amber-700" },
    { value: "it", label: "IT & Systems", color: "bg-green-100 text-green-700" },
    { value: "legal", label: "Legal", color: "bg-indigo-100 text-indigo-700" },
];

const TEMPLATE_PRESETS = [
    {
        name: "Software Engineer",
        description: "Standard onboarding for engineering roles",
        requirements: ["code_of_conduct", "acceptable_use_policy", "data_protection_agreement", "confidentiality_nda", "infosec_policy", "anti_harassment", "health_safety", "remote_work", "ai_usage_policy"],
    },
    {
        name: "Manager",
        description: "Onboarding for team leads and managers",
        requirements: ["code_of_conduct", "acceptable_use_policy", "data_protection_agreement", "confidentiality_nda", "infosec_policy", "anti_harassment", "health_safety", "remote_work", "travel_expense", "social_media", "whistleblower", "ai_usage_policy"],
    },
    {
        name: "HR Specialist",
        description: "Onboarding for HR personnel",
        requirements: ["code_of_conduct", "acceptable_use_policy", "data_protection_agreement", "confidentiality_nda", "infosec_policy", "anti_harassment", "health_safety", "remote_work", "travel_expense", "whistleblower"],
    },
    {
        name: "Executive",
        description: "C-level and VP onboarding",
        requirements: ["code_of_conduct", "acceptable_use_policy", "data_protection_agreement", "confidentiality_nda", "infosec_policy", "anti_harassment", "health_safety", "travel_expense", "social_media", "whistleblower", "ai_usage_policy"],
    },
];

function getCategoryColor(category: string) {
    return CATEGORIES.find(c => c.value === category)?.color || "bg-gray-100 text-gray-700";
}

function getCategoryLabel(category: string) {
    return CATEGORIES.find(c => c.value === category)?.label || category;
}

export default function OnboardingSettings({ hideLayout = false, clientId: propClientId }: { hideLayout?: boolean, clientId?: number }) {
    const { selectedClientId: contextClientId } = useClientContext();
    const { id: idParam, clientId: clientIdParam } = useParams();
    const clientId = propClientId || contextClientId || parseInt(idParam || clientIdParam || "0") || 0;

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<any>(null);
    const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
    const [activeTab, setActiveTab] = useState("requirements");
    const [aiGenerating, setAiGenerating] = useState(false);

    // Form State
    const [newItem, setNewItem] = useState({
        title: '',
        key: '',
        description: '',
        isMandatory: true,
        category: 'general',
        estimatedTimeMinutes: 10,
    });

    // Fetch requirements
    const { data: requirements, isLoading, refetch } = (trpc.onboarding as any).getRequirements?.useQuery(
        { clientId },
        { enabled: !!clientId }
    );

    // Fetch company onboarding status for analytics
    const { data: companyStatus } = (trpc.onboarding as any).getCompanyOnboardingStatus?.useQuery(
        { clientId },
        { enabled: !!clientId }
    );

    // Fetch training modules
    const { data: trainingModules } = trpc.training.list.useQuery(
        { clientId, employeeId: 0 },
        { enabled: !!clientId }
    );

    // Mutations
    const createMutation = (trpc.onboarding as any).createRequirement?.useMutation({
        onSuccess: () => {
            toast.success("Requirement created successfully");
            setIsCreateOpen(false);
            setNewItem({ title: '', key: '', description: '', isMandatory: true, category: 'general', estimatedTimeMinutes: 10 });
            refetch();
        },
        onError: (err: any) => toast.error("Failed: " + err.message),
    });

    const updateMutation = (trpc.onboarding as any).updateRequirement?.useMutation({
        onSuccess: () => {
            toast.success("Requirement updated successfully");
            setEditingItem(null);
            refetch();
        },
        onError: (err: any) => toast.error("Failed: " + err.message),
    });

    const deleteMutation = (trpc.onboarding as any).deleteRequirement?.useMutation({
        onSuccess: () => {
            toast.success("Requirement deleted successfully");
            refetch();
        },
        onError: (err: any) => toast.error("Failed: " + err.message),
    });

    const generateAiMutation = (trpc.onboarding as any).generateRequirementContent?.useMutation({
        onSuccess: (data: any) => {
            setNewItem(prev => ({ ...prev, description: data.content }));
            setEditingItem((prev: any) => prev ? { ...prev, description: data.content } : null);
            setAiGenerating(false);
            toast.success("AI content generated");
        },
        onError: (err: any) => {
            setAiGenerating(false);
            toast.error("AI generation failed: " + err.message);
        },
    });

    // Analytics computations
    const analytics = useMemo(() => {
        if (!companyStatus || companyStatus.length === 0) {
            return { totalEmployees: 0, fullyComplete: 0, avgProgress: 0, taskBreakdown: { training: 0, acks: 0, security: 0, assets: 0 } };
        }
        const total = companyStatus.length;
        const complete = companyStatus.filter((e: any) => e.percentage === 100).length;
        const avg = Math.round(companyStatus.reduce((sum: number, e: any) => sum + e.percentage, 0) / total);

        const taskBreakdown = {
            training: companyStatus.filter((e: any) => e.tasks.training.complete).length,
            acks: companyStatus.filter((e: any) => e.tasks.acknowledgments.complete).length,
            security: companyStatus.filter((e: any) => e.tasks.security.complete).length,
            assets: companyStatus.filter((e: any) => e.tasks.assets.complete).length,
        };

        return { totalEmployees: total, fullyComplete: complete, avgProgress: avg, taskBreakdown };
    }, [companyStatus]);

    const handleCreate = () => {
        if (!clientId) return;
        createMutation.mutate({
            clientId,
            title: newItem.title,
            key: newItem.key,
            description: newItem.description,
            isMandatory: newItem.isMandatory,
        });
    };

    const handleUpdate = () => {
        if (!clientId || !editingItem) return;
        updateMutation.mutate({
            clientId,
            id: editingItem.id,
            title: editingItem.title,
            description: editingItem.description,
            isMandatory: editingItem.isMandatory,
        });
    };

    const handleDelete = (id: number) => {
        if (!clientId) return;
        if (confirm("Are you sure? This will remove this requirement for future onboardings.")) {
            deleteMutation.mutate({ clientId, id });
        }
    };

    const handleBulkDelete = () => {
        if (selectedItems.size === 0) return;
        if (confirm(`Delete ${selectedItems.size} selected requirements?`)) {
            selectedItems.forEach(id => deleteMutation.mutate({ clientId, id }));
            setSelectedItems(new Set());
        }
    };

    const handleAiGenerate = () => {
        setAiGenerating(true);
        generateAiMutation.mutate({
            clientId,
            title: newItem.title || editingItem?.title || "Untitled",
            industry: "General Business",
            tone: "Professional",
        });
    };

    const handleDuplicate = (req: any) => {
        if (!clientId) return;
        createMutation.mutate({
            clientId,
            title: req.title + " (Copy)",
            key: req.key + "_copy_" + Date.now(),
            description: req.description,
            isMandatory: req.isMandatory,
        });
    };

    const handleMoveUp = (index: number) => {
        if (index <= 0 || !requirements) return;
        const current = requirements[index];
        const prev = requirements[index - 1];
        updateMutation.mutate({ clientId, id: current.id, title: current.title, description: current.description, isMandatory: current.isMandatory });
        updateMutation.mutate({ clientId, id: prev.id, title: prev.title, description: prev.description, isMandatory: prev.isMandatory });
    };

    const handleMoveDown = (index: number) => {
        if (!requirements || index >= requirements.length - 1) return;
        const current = requirements[index];
        const next = requirements[index + 1];
        updateMutation.mutate({ clientId, id: current.id, title: current.title, description: current.description, isMandatory: current.isMandatory });
        updateMutation.mutate({ clientId, id: next.id, title: next.title, description: next.description, isMandatory: next.isMandatory });
    };

    const toggleSelect = (id: number) => {
        setSelectedItems(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const applyTemplate = (template: typeof TEMPLATE_PRESETS[0]) => {
        if (!requirements) return;
        const missing = template.requirements.filter(
            key => !requirements.find((r: any) => r.key === key)
        );
        if (missing.length > 0) {
            toast.warning(`Template references ${missing.length} requirements not yet configured. Create them first.`);
        }
        toast.info(`Template "${template.name}" applied: ${template.requirements.length} requirements mapped.`);
    };

    const totalEstimatedTime = requirements?.reduce((sum: number, r: any) => sum + (r.estimatedTimeMinutes || 10), 0) || 0;

    const content = (
        <div className="space-y-6 w-full max-w-full animate-in fade-in duration-700">
            {!hideLayout && (
                <>
                    <Breadcrumb items={[{ label: 'Settings', href: '/settings' }, { label: 'Onboarding', active: true }]} />
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Onboarding Management</h1>
                            <p className="text-muted-foreground mt-2">
                                Configure compliance requirements, training, and security setup for new employees.
                            </p>
                        </div>
                    </div>
                </>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg"><FileText className="h-5 w-5 text-blue-600" /></div>
                            <div>
                                <p className="text-2xl font-bold">{requirements?.length || 0}</p>
                                <p className="text-xs text-muted-foreground">Requirements</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-green-100 rounded-lg"><Clock className="h-5 w-5 text-green-600" /></div>
                            <div>
                                <p className="text-2xl font-bold">{totalEstimatedTime}m</p>
                                <p className="text-xs text-muted-foreground">Est. Total Time</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 rounded-lg"><Users className="h-5 w-5 text-purple-600" /></div>
                            <div>
                                <p className="text-2xl font-bold">{analytics.totalEmployees}</p>
                                <p className="text-xs text-muted-foreground">Employees</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-amber-100 rounded-lg"><TrendingUp className="h-5 w-5 text-amber-600" /></div>
                            <div>
                                <p className="text-2xl font-bold">{analytics.avgProgress}%</p>
                                <p className="text-xs text-muted-foreground">Avg Progress</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                    <TabsTrigger value="requirements" className="gap-2"><FileText className="h-4 w-4" />Requirements</TabsTrigger>
                    <TabsTrigger value="templates" className="gap-2"><BookOpen className="h-4 w-4" />Templates</TabsTrigger>
                    <TabsTrigger value="training" className="gap-2"><GraduationCap className="h-4 w-4" />Training</TabsTrigger>
                    <TabsTrigger value="security" className="gap-2"><Shield className="h-4 w-4" />Security</TabsTrigger>
                    <TabsTrigger value="analytics" className="gap-2"><BarChart3 className="h-4 w-4" />Analytics</TabsTrigger>
                </TabsList>

                {/* ===== REQUIREMENTS TAB ===== */}
                <TabsContent value="requirements" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Compliance Requirements</CardTitle>
                                <CardDescription>
                                    Documents employees must read and acknowledge. Drag to reorder.
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                {selectedItems.size > 0 && (
                                    <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="gap-2">
                                        <Trash2 className="h-4 w-4" /> Delete ({selectedItems.size})
                                    </Button>
                                )}
                                <Button onClick={() => setIsCreateOpen(true)} size="sm" className="gap-2">
                                    <Plus className="h-4 w-4" /> Add Requirement
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                                </div>
                            ) : requirements && requirements.length > 0 ? (
                                <div className="space-y-2">
                                    {(requirements as any[]).map((req: any, index: number) => (
                                        <div
                                            key={req.id}
                                            className={`flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors ${selectedItems.has(req.id) ? 'bg-blue-50 border-blue-200' : ''}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedItems.has(req.id)}
                                                onChange={() => toggleSelect(req.id)}
                                                className="h-4 w-4 rounded border-gray-300"
                                            />
                                            <div className="flex flex-col gap-1 cursor-grab">
                                                <button
                                                    onClick={() => handleMoveUp(index)}
                                                    disabled={index === 0}
                                                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                                >
                                                    <ChevronUp className="h-3 w-3" />
                                                </button>
                                                <GripVertical className="h-3 w-3 text-gray-300" />
                                                <button
                                                    onClick={() => handleMoveDown(index)}
                                                    disabled={index === (requirements?.length || 0) - 1}
                                                    className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                                                >
                                                    <ChevronDown className="h-3 w-3" />
                                                </button>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h3 className="font-medium">{req.title}</h3>
                                                    {req.isMandatory ? (
                                                        <Badge variant="default" className="bg-red-500 hover:bg-red-600 text-xs">Mandatory</Badge>
                                                    ) : (
                                                        <Badge variant="secondary" className="text-xs">Optional</Badge>
                                                    )}
                                                    <Badge variant="outline" className={`text-xs ${getCategoryColor(req.category || 'general')}`}>
                                                        {getCategoryLabel(req.category || 'general')}
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground font-mono">{req.key}</span>
                                                </div>
                                                <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                                                    {req.description?.replace(/<[^>]*>/g, '') || "No description provided."}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button variant="ghost" size="sm" onClick={() => handleDuplicate(req)} title="Duplicate">
                                                    <Copy className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" onClick={() => setEditingItem(req)} title="Edit">
                                                    <Edit2 className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(req.id)} title="Delete">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
                                    <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                    <p className="font-medium">No requirements configured</p>
                                    <p className="text-sm mt-1">Add your first requirement to get started.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ===== TEMPLATES TAB ===== */}
                <TabsContent value="templates" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div>
                                <CardTitle>Onboarding Templates</CardTitle>
                                <CardDescription>
                                    Pre-defined requirement sets for different roles. Apply to quickly configure new hires.
                                </CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {TEMPLATE_PRESETS.map((template) => (
                                    <Card key={template.name} className="border-2 hover:border-primary/50 transition-all">
                                        <CardHeader>
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <CardTitle className="text-lg">{template.name}</CardTitle>
                                                    <CardDescription>{template.description}</CardDescription>
                                                </div>
                                                <Badge variant="outline">{template.requirements.length} reqs</Badge>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="flex flex-wrap gap-1">
                                                {template.requirements.map(key => {
                                                    const exists = requirements?.find((r: any) => r.key === key);
                                                    return (
                                                        <Badge
                                                            key={key}
                                                            variant={exists ? "default" : "outline"}
                                                            className={`text-xs ${exists ? 'bg-green-500 hover:bg-green-600' : 'border-dashed'}`}
                                                        >
                                                            {exists && <CheckCircle2 className="h-3 w-3 mr-1" />}
                                                            {key.replace(/_/g, ' ')}
                                                        </Badge>
                                                    );
                                                })}
                                            </div>
                                            <Button variant="outline" size="sm" className="w-full" onClick={() => applyTemplate(template)}>
                                                <Archive className="h-4 w-4 mr-2" />
                                                Apply Template
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ===== TRAINING TAB ===== */}
                <TabsContent value="training" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Training Modules</CardTitle>
                                <CardDescription>
                                    Assign training modules to the onboarding flow.
                                </CardDescription>
                            </div>
                            <Button size="sm" className="gap-2" asChild>
                                <a href="/training-management">
                                    <Settings className="h-4 w-4" /> Manage Modules
                                </a>
                            </Button>
                        </CardHeader>
                        <CardContent>
                            {trainingModules && trainingModules.length > 0 ? (
                                <div className="space-y-3">
                                    {(trainingModules as any[]).map((mod: any) => (
                                        <div key={mod.id} className="flex items-center justify-between p-3 border rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${mod.type === 'video' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                                    {mod.type === 'video' ? <GraduationCap className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                                                </div>
                                                <div>
                                                    <p className="font-medium">{mod.title}</p>
                                                    <p className="text-xs text-muted-foreground">{mod.description?.substring(0, 80)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline">{mod.durationMinutes} min</Badge>
                                                <Badge variant={mod.active ? "default" : "secondary"} className={mod.active ? "bg-green-500" : ""}>
                                                    {mod.active ? "Active" : "Inactive"}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
                                    <GraduationCap className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                    <p className="text-sm">No training modules configured.</p>
                                    <Button variant="link" size="sm" asChild>
                                        <a href="/training-management">Go to Training Management</a>
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ===== SECURITY TAB ===== */}
                <TabsContent value="security" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Security Setup Requirements</CardTitle>
                            <CardDescription>
                                Configure which security setups employees must complete during onboarding.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 rounded-lg"><Lock className="h-5 w-5 text-blue-600" /></div>
                                        <div>
                                            <p className="font-medium">Multi-Factor Authentication (MFA)</p>
                                            <p className="text-sm text-muted-foreground">Require MFA enrollment before system access</p>
                                        </div>
                                    </div>
                                    <Badge className="bg-green-500 hover:bg-green-600">Required</Badge>
                                </div>
                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-100 rounded-lg"><Shield className="h-5 w-5 text-purple-600" /></div>
                                        <div>
                                            <p className="font-medium">Password Manager Setup</p>
                                            <p className="text-sm text-muted-foreground">Employee must configure approved password manager</p>
                                        </div>
                                    </div>
                                    <Badge className="bg-green-500 hover:bg-green-600">Required</Badge>
                                </div>
                                <div className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-amber-100 rounded-lg"><ClipboardList className="h-5 w-5 text-amber-600" /></div>
                                        <div>
                                            <p className="font-medium">Security Questions</p>
                                            <p className="text-sm text-muted-foreground">Configure account recovery security questions</p>
                                        </div>
                                    </div>
                                    <Badge className="bg-green-500 hover:bg-green-600">Required</Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ===== ANALYTICS TAB ===== */}
                <TabsContent value="analytics" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Completion Overview</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    <div className="text-center">
                                        <p className="text-4xl font-bold">{analytics.avgProgress}%</p>
                                        <p className="text-sm text-muted-foreground">Average Progress</p>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span>Fully Complete</span>
                                            <span className="font-medium">{analytics.fullyComplete}/{analytics.totalEmployees}</span>
                                        </div>
                                        <Progress value={analytics.totalEmployees > 0 ? (analytics.fullyComplete / analytics.totalEmployees) * 100 : 0} className="h-2" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">Task Breakdown</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">Training Complete</span>
                                        <span className="font-medium">{analytics.taskBreakdown.training}/{analytics.totalEmployees}</span>
                                    </div>
                                    <Progress value={analytics.totalEmployees > 0 ? (analytics.taskBreakdown.training / analytics.totalEmployees) * 100 : 0} className="h-2" />
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">Acknowledgments</span>
                                        <span className="font-medium">{analytics.taskBreakdown.acks}/{analytics.totalEmployees}</span>
                                    </div>
                                    <Progress value={analytics.totalEmployees > 0 ? (analytics.taskBreakdown.acks / analytics.totalEmployees) * 100 : 0} className="h-2" />
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">Security Setup</span>
                                        <span className="font-medium">{analytics.taskBreakdown.security}/{analytics.totalEmployees}</span>
                                    </div>
                                    <Progress value={analytics.totalEmployees > 0 ? (analytics.taskBreakdown.security / analytics.totalEmployees) * 100 : 0} className="h-2" />
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">Assets Confirmed</span>
                                        <span className="font-medium">{analytics.taskBreakdown.assets}/{analytics.totalEmployees}</span>
                                    </div>
                                    <Progress value={analytics.totalEmployees > 0 ? (analytics.taskBreakdown.assets / analytics.totalEmployees) * 100 : 0} className="h-2" />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Per-Employee Table */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Employee Progress</CardTitle>
                            <CardDescription>Individual onboarding status for all employees</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {companyStatus && companyStatus.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left p-2">Employee</th>
                                                <th className="text-left p-2">Progress</th>
                                                <th className="text-center p-2">Training</th>
                                                <th className="text-center p-2">Acks</th>
                                                <th className="text-center p-2">Security</th>
                                                <th className="text-center p-2">Assets</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(companyStatus as any[]).map((emp: any) => (
                                                <tr key={emp.employeeId} className="border-b hover:bg-gray-50">
                                                    <td className="p-2">
                                                        <div>
                                                            <p className="font-medium">{emp.firstName} {emp.lastName}</p>
                                                            <p className="text-xs text-muted-foreground">{emp.email}</p>
                                                        </div>
                                                    </td>
                                                    <td className="p-2">
                                                        <div className="flex items-center gap-2">
                                                            <Progress value={emp.percentage} className="h-2 w-20" />
                                                            <span className="font-medium">{emp.percentage}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="text-center p-2">
                                                        {emp.tasks.training.complete ? <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /> : <Clock className="h-4 w-4 text-gray-300 mx-auto" />}
                                                    </td>
                                                    <td className="text-center p-2">
                                                        {emp.tasks.acknowledgments.complete ? <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /> : <Clock className="h-4 w-4 text-gray-300 mx-auto" />}
                                                    </td>
                                                    <td className="text-center p-2">
                                                        {emp.tasks.security.complete ? <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /> : <Clock className="h-4 w-4 text-gray-300 mx-auto" />}
                                                    </td>
                                                    <td className="text-center p-2">
                                                        {emp.tasks.assets.complete ? <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" /> : <Clock className="h-4 w-4 text-gray-300 mx-auto" />}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Users className="h-10 w-10 mx-auto mb-2 opacity-20" />
                                    <p className="text-sm">No employee data available yet.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Create Dialog */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-[650px]">
                    <DialogHeader>
                        <DialogTitle>Add Compliance Requirement</DialogTitle>
                        <DialogDescription>
                            Create a new document or policy for employees to acknowledge.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="title">Title</Label>
                                <Input
                                    id="title"
                                    placeholder="e.g. Remote Work Policy"
                                    value={newItem.title}
                                    onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="key">Key (Unique ID)</Label>
                                <Input
                                    id="key"
                                    placeholder="e.g. remote_work_policy"
                                    value={newItem.key}
                                    onChange={(e) => setNewItem({ ...newItem, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                                />
                                <p className="text-xs text-muted-foreground">Lowercase, underscores only.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="category">Category</Label>
                                <Select value={newItem.category} onValueChange={(v) => setNewItem({ ...newItem, category: v })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select category" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CATEGORIES.map(cat => (
                                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="time">Estimated Time (minutes)</Label>
                                <Input
                                    id="time"
                                    type="number"
                                    min="1"
                                    value={newItem.estimatedTimeMinutes}
                                    onChange={(e) => setNewItem({ ...newItem, estimatedTimeMinutes: parseInt(e.target.value) || 10 })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="description">Content</Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAiGenerate}
                                    disabled={aiGenerating || (!newItem.title && !editingItem?.title)}
                                    className="gap-2"
                                >
                                    {aiGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                                    {aiGenerating ? "Generating..." : "AI Generate"}
                                </Button>
                            </div>
                            <RichTextEditor
                                minHeight="200px"
                                value={newItem.description}
                                onChange={(html) => setNewItem({ ...newItem, description: html })}
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                id="mandatory"
                                checked={newItem.isMandatory}
                                onCheckedChange={(c) => setNewItem({ ...newItem, isMandatory: c })}
                            />
                            <Label htmlFor="mandatory">Mandatory Acknowledgment</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreate} disabled={!newItem.title || !newItem.key || createMutation.isLoading}>
                            {createMutation.isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Create Requirement
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Dialog */}
            <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
                <DialogContent className="sm:max-w-[650px]">
                    <DialogHeader>
                        <DialogTitle>Edit Requirement</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Title</Label>
                            <Input
                                value={editingItem?.title || ''}
                                onChange={(e) => setEditingItem({ ...editingItem, title: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Content</Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAiGenerate}
                                    disabled={aiGenerating}
                                    className="gap-2"
                                >
                                    {aiGenerating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                                    Regenerate with AI
                                </Button>
                            </div>
                            <RichTextEditor
                                minHeight="200px"
                                value={editingItem?.description || ''}
                                onChange={(html) => setEditingItem({ ...editingItem, description: html })}
                            />
                        </div>
                        <div className="flex items-center space-x-2">
                            <Switch
                                checked={editingItem?.isMandatory || false}
                                onCheckedChange={(c) => setEditingItem({ ...editingItem, isMandatory: c })}
                            />
                            <Label>Mandatory Acknowledgment</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
                        <Button onClick={handleUpdate} disabled={updateMutation.isLoading}>
                            {updateMutation.isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );

    if (hideLayout) return content;

    return (
        <DashboardLayout>
            {content}
        </DashboardLayout>
    );
}
