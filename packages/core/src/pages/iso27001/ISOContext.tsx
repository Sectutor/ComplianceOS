import React, { useState, useEffect } from "react";
import { ISOContextReportModal } from "./ISOContextReportModal";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { ISOLayout } from "./ISOLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Input } from "@complianceos/ui/ui/input";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { Badge } from "@complianceos/ui/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@complianceos/ui/ui/tabs";
import { Label } from "@complianceos/ui/ui/label";
import { toast } from "sonner";
import {
    Users,
    Globe,
    Building,
    FileText,
    Scale,
    Plus,
    Trash2,
    Save,
    MapPin,
    Server,
    Target,
    Edit2,
    CheckCircle2,
    AlertCircle,
    BarChart3
} from "lucide-react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@complianceos/ui/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@complianceos/ui/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@complianceos/ui/ui/select";

export default function ISOContext() {
    const { id } = useParams<{ id: string }>();
    const clientId = parseInt(id || "0");

    // Initialize activeTab from query parameter
    const getInitialTab = () => {
        if (typeof window !== "undefined") {
            const params = new URLSearchParams(window.location.search);
            const t = params.get("tab");
            if (t && ["scope", "parties", "issues", "objectives"].includes(t)) {
                return t;
            }
        }
        return "scope";
    };

    const [activeTab, setActiveTab] = useState<string>(getInitialTab);
    const [reportModalOpen, setReportModalOpen] = useState(false);

    // Sync tab when browser navigation occurs
    useEffect(() => {
        const updateFromUrl = () => {
            const params = new URLSearchParams(window.location.search);
            const t = params.get("tab");
            if (t && ["scope", "parties", "issues", "objectives"].includes(t)) {
                setActiveTab(t);
            }
        };
        window.addEventListener("popstate", updateFromUrl);
        return () => window.removeEventListener("popstate", updateFromUrl);
    }, []);

    const handleTabChange = (newTab: string) => {
        setActiveTab(newTab);
        if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            url.searchParams.set("tab", newTab);
            window.history.replaceState({}, "", url.toString());
        }
    };

    // TRPC Context data and mutation
    const utils = trpc.useUtils ? trpc.useUtils() : (trpc as any).useContext();
    const contextQuery = (trpc as any).iso27001.getContext.useQuery({ clientId }, {
        enabled: !!clientId,
    });
    const saveContextMutation = (trpc as any).iso27001.saveContext.useMutation({
        onSuccess: () => {
            if (utils.iso27001?.getContext) {
                utils.iso27001.getContext.invalidate({ clientId });
            }
        }
    });

    // Local state for Scope
    const [scope, setScope] = useState({
        orgUnit: "",
        locations: "",
        technology: "",
        exclusions: ""
    });

    // Local state for Interested Parties
    const [parties, setParties] = useState<any[]>([
        { id: 1, name: "Customers", type: "External", requirements: "SOC 2 Type II Report, Data Privacy", priority: "High" },
        { id: 2, name: "Regulators (GDPR)", type: "External", requirements: "Article 30 Records, DPA", priority: "Critical" },
        { id: 3, name: "Employees", type: "Internal", requirements: "Clear Policies, Security Training", priority: "Medium" },
    ]);

    const [newParty, setNewParty] = useState({ name: "", type: "External", requirements: "", priority: "Medium" });
    const [partyDialogOpen, setPartyDialogOpen] = useState(false);

    // Local state for Issues (Clause 4.1)
    const [issues, setIssues] = useState<any[]>([
        { id: 1, description: "Reliance on legacy on-premise hardware", context: "Internal", category: "Technology", impact: "Negative", priority: "High" },
        { id: 2, description: "Evolving data privacy regulations (AI Act)", context: "External", category: "Legal", impact: "Negative", priority: "High" },
        { id: 3, description: "Strong security culture in engineering team", context: "Internal", category: "Culture", impact: "Positive", priority: "Medium" },
    ]);
    const [newIssue, setNewIssue] = useState({ description: "", context: "External", category: "Legal", impact: "Negative", priority: "Medium" });
    const [issueDialogOpen, setIssueDialogOpen] = useState(false);

    // Local state for Objectives (Clause 6.2)
    const [objectives, setObjectives] = useState<any[]>([]);
    const [objectiveDialogOpen, setObjectiveDialogOpen] = useState(false);
    const [editingObjectiveId, setEditingObjectiveId] = useState<number | null>(null);
    const [objectiveForm, setObjectiveForm] = useState({
        title: "",
        category: "Availability & Resilience",
        targetMetric: "",
        currentValue: "",
        owner: "",
        frequency: "Quarterly",
        evaluationMethod: "",
        status: "On Track"
    });

    useEffect(() => {
        if (contextQuery.data) {
            if (contextQuery.data.scope) {
                setScope({
                    orgUnit: contextQuery.data.scope.orgUnit || "",
                    locations: contextQuery.data.scope.locations || "",
                    technology: contextQuery.data.scope.technology || "",
                    exclusions: contextQuery.data.scope.exclusions || ""
                });
            }
            if (contextQuery.data.parties && contextQuery.data.parties.length > 0) {
                setParties(contextQuery.data.parties);
            }
            if (contextQuery.data.issues && contextQuery.data.issues.length > 0) {
                setIssues(contextQuery.data.issues);
            }
            if (contextQuery.data.objectives && contextQuery.data.objectives.length > 0) {
                setObjectives(contextQuery.data.objectives);
            }
        }
    }, [contextQuery.data]);

    const saveAllContext = (
        customScope = scope,
        customParties = parties,
        customIssues = issues,
        customObjectives = objectives,
        successMessage = "Changes saved successfully"
    ) => {
        saveContextMutation.mutate({
            clientId,
            scope: customScope,
            parties: customParties,
            issues: customIssues,
            objectives: customObjectives
        }, {
            onSuccess: () => {
                toast.success(successMessage);
            },
            onError: (err) => {
                toast.error("Failed to save changes: " + (err?.message || "Error"));
            }
        });
    };

    const handleAddParty = () => {
        if (!newParty.name) return;
        const updated = [...parties, { id: Date.now(), ...newParty }];
        setParties(updated);
        setNewParty({ name: "", type: "External", requirements: "", priority: "Medium" });
        setPartyDialogOpen(false);
        saveAllContext(scope, updated, issues, objectives, "Interested party added & saved");
    };

    const handleDeleteParty = (id: number) => {
        const updated = parties.filter(p => p.id !== id);
        setParties(updated);
        saveAllContext(scope, updated, issues, objectives, "Party removed & saved");
    };

    const handleAddIssue = () => {
        if (!newIssue.description) return;
        const updated = [...issues, { id: Date.now(), ...newIssue }];
        setIssues(updated);
        setNewIssue({ description: "", context: "External", category: "Legal", impact: "Negative", priority: "Medium" });
        setIssueDialogOpen(false);
        saveAllContext(scope, parties, updated, objectives, "Strategic issue added & saved");
    };

    const handleDeleteIssue = (id: number) => {
        const updated = issues.filter(i => i.id !== id);
        setIssues(updated);
        saveAllContext(scope, parties, updated, objectives, "Issue removed & saved");
    };

    const handleSaveScope = () => {
        saveAllContext(scope, parties, issues, objectives, "ISMS Scope updated and saved successfully");
    };

    // Objectives CRUD Handlers
    const handleOpenAddObjective = () => {
        setEditingObjectiveId(null);
        setObjectiveForm({
            title: "",
            category: "Availability & Resilience",
            targetMetric: "",
            currentValue: "",
            owner: "",
            frequency: "Quarterly",
            evaluationMethod: "",
            status: "On Track"
        });
        setObjectiveDialogOpen(true);
    };

    const handleOpenEditObjective = (obj: any) => {
        setEditingObjectiveId(obj.id);
        setObjectiveForm({
            title: obj.title || "",
            category: obj.category || "Availability & Resilience",
            targetMetric: obj.targetMetric || "",
            currentValue: obj.currentValue || "",
            owner: obj.owner || "",
            frequency: obj.frequency || "Quarterly",
            evaluationMethod: obj.evaluationMethod || "",
            status: obj.status || "On Track"
        });
        setObjectiveDialogOpen(true);
    };

    const handleSaveObjective = () => {
        if (!objectiveForm.title.trim()) {
            toast.error("Please enter an objective title");
            return;
        }

        let updated: any[];
        if (editingObjectiveId) {
            updated = objectives.map(o => o.id === editingObjectiveId ? { ...o, ...objectiveForm } : o);
            toast.success("Security objective updated");
        } else {
            const newObj = {
                id: Date.now(),
                ...objectiveForm
            };
            updated = [...objectives, newObj];
            toast.success("Security objective established");
        }
        setObjectives(updated);
        setObjectiveDialogOpen(false);
        saveAllContext(scope, parties, issues, updated, "Security objectives updated & synchronized");
    };

    const handleDeleteObjective = (id: number) => {
        const updated = objectives.filter(o => o.id !== id);
        setObjectives(updated);
        saveAllContext(scope, parties, issues, updated, "Security objective removed");
    };

    return (
        <ISOLayout clientId={clientId} fullWidth={true}>
            <div className="pl-0 pr-4 py-8 md:pl-0 md:pr-8 space-y-8 animate-in fade-in duration-500">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-3">
                            <Target className="h-8 w-8 text-blue-600" />
                            Context of the Organization & Objectives
                        </h1>
                        <p className="text-lg text-slate-500 max-w-3xl">
                            Define organizational context, interested parties, ISMS scope, and measurable security objectives as required by ISO 27001 Clauses 4.1, 4.2, 4.3, and 6.2.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => setReportModalOpen(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs h-10 px-4 shadow-xs"
                        >
                            <FileText className="mr-2 h-4 w-4" /> Generate Context Report
                        </Button>
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full space-y-6">
                    <TabsList className="bg-white border p-1 h-12 w-full md:w-auto justify-start flex-wrap">
                        <TabsTrigger value="scope" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 h-10 px-5">
                            <Globe className="mr-2 h-4 w-4" /> ISMS Scope (4.3)
                        </TabsTrigger>
                        <TabsTrigger value="parties" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 h-10 px-5">
                            <Users className="mr-2 h-4 w-4" /> Interested Parties (4.2)
                        </TabsTrigger>
                        <TabsTrigger value="issues" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 h-10 px-5">
                            <Scale className="mr-2 h-4 w-4" /> Internal/External Issues (4.1)
                        </TabsTrigger>
                        <TabsTrigger value="objectives" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 h-10 px-5">
                            <Target className="mr-2 h-4 w-4" /> Security Objectives & KPIs (6.2)
                        </TabsTrigger>
                    </TabsList>

                    {/* Scope Tab */}
                    <TabsContent value="scope" className="space-y-6">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Main Scope Definition */}
                            <Card className="lg:col-span-2 border-slate-200 shadow-sm">
                                <CardHeader className="bg-slate-50 border-b border-slate-100">
                                    <CardTitle>Scope Statement</CardTitle>
                                    <CardDescription>
                                        Define the boundaries of your ISMS. This statement will appear on your certificate.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-6 space-y-6">
                                    <div className="space-y-3">
                                        <Label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                            <Building className="h-4 w-4 text-slate-400" /> Organizational Unit
                                        </Label>
                                        <Input
                                            placeholder="e.g. The entirety of Acme Corp, including Engineering, Sales, and HR..."
                                            value={scope.orgUnit}
                                            onChange={(e) => setScope({ ...scope, orgUnit: e.target.value })}
                                            className="border-slate-200"
                                        />
                                        <p className="text-xs text-slate-500">The legal entity or department covered by the ISMS.</p>
                                    </div>

                                    <div className="space-y-3">
                                        <Label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-slate-400" /> Physical Locations
                                        </Label>
                                        <Textarea
                                            placeholder="e.g. HQ at 123 Tech Blvd, San Francisco, CA. Remote employees in USA and EU."
                                            value={scope.locations}
                                            onChange={(e) => setScope({ ...scope, locations: e.target.value })}
                                            className="min-h-[80px] border-slate-200"
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <Label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                                            <Server className="h-4 w-4 text-slate-400" /> Technology & Interfaces
                                        </Label>
                                        <Textarea
                                            placeholder="e.g. The SaaS platform hosted on AWS, corporate laptops, and Office 365 environment."
                                            value={scope.technology}
                                            onChange={(e) => setScope({ ...scope, technology: e.target.value })}
                                            className="min-h-[80px] border-slate-200"
                                        />
                                    </div>

                                    <div className="space-y-3">
                                        <Label className="text-sm font-bold text-slate-700 text-rose-600 flex items-center gap-2">
                                            <Target className="h-4 w-4 text-rose-500" /> Exclusions
                                        </Label>
                                        <Textarea
                                            placeholder="Describe any legitimate exclusions (must be justified in SoA)..."
                                            value={scope.exclusions}
                                            onChange={(e) => setScope({ ...scope, exclusions: e.target.value })}
                                            className="min-h-[80px] border-slate-200 bg-rose-50/30"
                                        />
                                    </div>

                                    <div className="pt-4 flex justify-end">
                                        <Button onClick={handleSaveScope} className="bg-blue-600 hover:bg-blue-700">
                                            <Save className="mr-2 h-4 w-4" /> Save Scope
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Guidance Side Panel */}
                            <Card className="bg-slate-50 border-slate-200 h-fit">
                                <CardHeader>
                                    <CardTitle className="text-sm font-bold text-slate-700">ISO 27001 Guidance (Clause 4.3)</CardTitle>
                                </CardHeader>
                                <CardContent className="text-sm text-slate-600 space-y-4">
                                    <p>
                                        The organization must determine the boundaries and applicability of the information security management system to establish its scope.
                                    </p>
                                    <ul className="list-disc pl-4 space-y-2">
                                        <li>Consider external & internal issues (4.1)</li>
                                        <li>Consider interested parties (4.2)</li>
                                        <li>Consider interfaces and dependencies</li>
                                    </ul>
                                    <div className="p-3 bg-white rounded border border-blue-100 text-blue-700 text-xs">
                                        <strong>Tip:</strong> Keep the scope as simple as possible. Complexity increases audit time and cost.
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Interested Parties Tab */}
                    <TabsContent value="parties" className="space-y-6">
                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Interested Parties Registry</CardTitle>
                                    <CardDescription>
                                        List stakeholders that are relevant to the ISMS and their requirements.
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Dialog open={partyDialogOpen} onOpenChange={setPartyDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button className="bg-blue-600 hover:bg-blue-700">
                                                <Plus className="mr-2 h-4 w-4" /> Add Party
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Add Interested Party</DialogTitle>
                                                <DialogDescription>Identify a stakeholder and their security requirements.</DialogDescription>
                                            </DialogHeader>
                                            <div className="grid gap-4 py-4">
                                                <div className="grid gap-2">
                                                    <Label>Name</Label>
                                                    <Input
                                                        placeholder="e.g. Enterprise Customers"
                                                        value={newParty.name}
                                                        onChange={(e) => setNewParty({ ...newParty, name: e.target.value })}
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>Type</Label>
                                                    <Select
                                                        value={newParty.type}
                                                        onValueChange={(val) => setNewParty({ ...newParty, type: val })}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Internal">Internal</SelectItem>
                                                            <SelectItem value="External">External</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>Requirements</Label>
                                                    <Textarea
                                                        placeholder="e.g. Confidentiality, SLA availability..."
                                                        value={newParty.requirements}
                                                        onChange={(e) => setNewParty({ ...newParty, requirements: e.target.value })}
                                                    />
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>Priority/Influence</Label>
                                                    <Select
                                                        value={newParty.priority}
                                                        onValueChange={(val) => setNewParty({ ...newParty, priority: val })}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Critical">Critical</SelectItem>
                                                            <SelectItem value="High">High</SelectItem>
                                                            <SelectItem value="Medium">Medium</SelectItem>
                                                            <SelectItem value="Low">Low</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button onClick={handleAddParty}>Add to Register</Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                    <Button
                                        onClick={() => saveAllContext(scope, parties, issues, objectives, "Parties registry saved successfully")}
                                        variant="outline"
                                        size="sm"
                                        className="border-slate-200 text-slate-700"
                                    >
                                        <Save className="h-4 w-4 mr-1.5 text-slate-500" /> Save
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50/50">
                                            <TableHead>Interested Party</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Requirements</TableHead>
                                            <TableHead>Priority</TableHead>
                                            <TableHead className="w-[100px]">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {parties.map((party) => (
                                            <TableRow key={party.id} className="group hover:bg-slate-50">
                                                <TableCell className="font-medium text-slate-900">{party.name}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={
                                                        party.type === 'Internal' ? "text-blue-600 bg-blue-50 border-blue-200" : "text-emerald-600 bg-emerald-50 border-emerald-200"
                                                    }>
                                                        {party.type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-slate-600 max-w-md">{party.requirements}</TableCell>
                                                <TableCell>
                                                    <span className={
                                                        party.priority === 'Critical' ? "text-rose-600 font-bold text-xs uppercase" :
                                                            party.priority === 'High' ? "text-amber-600 font-bold text-xs uppercase" :
                                                                "text-slate-500 font-bold text-xs uppercase"
                                                    }>
                                                        {party.priority}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-slate-400 hover:text-rose-600"
                                                        onClick={() => handleDeleteParty(party.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Issues Tab */}
                    <TabsContent value="issues" className="space-y-6">
                        <Card className="border-slate-200 shadow-sm">
                            <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle>Internal & External Issues Registry (4.1)</CardTitle>
                                    <CardDescription>
                                        Identify external and internal issues that are relevant to the ISMS (e.g., PESTLE, SWOT factors).
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Dialog open={issueDialogOpen} onOpenChange={setIssueDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button className="bg-blue-600 hover:bg-blue-700">
                                                <Plus className="mr-2 h-4 w-4" /> Add Issue
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Add Contextual Issue</DialogTitle>
                                                <DialogDescription>Describe a factor that affects your ability to achieve ISMS outcomes.</DialogDescription>
                                            </DialogHeader>
                                            <div className="grid gap-4 py-4">
                                                <div className="grid gap-2">
                                                    <Label>Description</Label>
                                                    <Input
                                                        placeholder="e.g. New competitor entering the market..."
                                                        value={newIssue.description}
                                                        onChange={(e) => setNewIssue({ ...newIssue, description: e.target.value })}
                                                    />
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="grid gap-2">
                                                        <Label>Context</Label>
                                                        <Select
                                                            value={newIssue.context}
                                                            onValueChange={(val) => setNewIssue({ ...newIssue, context: val })}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Internal">Internal</SelectItem>
                                                                <SelectItem value="External">External</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                    <div className="grid gap-2">
                                                        <Label>Impact Type</Label>
                                                        <Select
                                                            value={newIssue.impact}
                                                            onValueChange={(val) => setNewIssue({ ...newIssue, impact: val as any })}
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="Negative">Negative (Risk)</SelectItem>
                                                                <SelectItem value="Positive">Positive (Opportunity)</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>Category</Label>
                                                    <Select
                                                        value={newIssue.category}
                                                        onValueChange={(val) => setNewIssue({ ...newIssue, category: val })}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Legal">Legal / Regulatory</SelectItem>
                                                            <SelectItem value="Technology">Technology</SelectItem>
                                                            <SelectItem value="Market">Market / Competitive</SelectItem>
                                                            <SelectItem value="Culture">Organizational Culture</SelectItem>
                                                            <SelectItem value="Resource">Resource Availability</SelectItem>
                                                            <SelectItem value="Other">Other</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="grid gap-2">
                                                    <Label>Priority</Label>
                                                    <Select
                                                        value={newIssue.priority}
                                                        onValueChange={(val) => setNewIssue({ ...newIssue, priority: val as any })}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="High">High</SelectItem>
                                                            <SelectItem value="Medium">Medium</SelectItem>
                                                            <SelectItem value="Low">Low</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button onClick={handleAddIssue}>Add to Register</Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>
                                    <Button
                                        onClick={() => saveAllContext(scope, parties, issues, objectives, "Issues registry saved successfully")}
                                        variant="outline"
                                        size="sm"
                                        className="border-slate-200 text-slate-700"
                                    >
                                        <Save className="h-4 w-4 mr-1.5 text-slate-500" /> Save
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50/50">
                                            <TableHead>Issue Description</TableHead>
                                            <TableHead>Context</TableHead>
                                            <TableHead>Category</TableHead>
                                            <TableHead>Impact</TableHead>
                                            <TableHead>Priority</TableHead>
                                            <TableHead className="w-[100px]">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {issues.map((issue) => (
                                            <TableRow key={issue.id} className="group hover:bg-slate-50">
                                                <TableCell className="font-medium text-slate-900">{issue.description}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={
                                                        issue.context === 'Internal' ? "text-blue-600 bg-blue-50 border-blue-200" : "text-sky-600 bg-sky-50 border-sky-200"
                                                    }>
                                                        {issue.context}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-slate-600">{issue.category}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className={
                                                        issue.impact === 'Negative' ? "text-rose-600 bg-rose-50 border-rose-200" : "text-emerald-600 bg-emerald-50 border-emerald-200"
                                                    }>
                                                        {issue.impact}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <span className={
                                                        issue.priority === 'High' ? "text-slate-900 font-bold text-xs uppercase" :
                                                            "text-slate-500 font-bold text-xs uppercase"
                                                    }>
                                                        {issue.priority}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-slate-400 hover:text-rose-600"
                                                        onClick={() => handleDeleteIssue(issue.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Objectives & KPIs Tab (Clause 6.2) */}
                    <TabsContent value="objectives" className="space-y-6">
                        {/* Summary KPI Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <Card className="border-slate-200 shadow-xs bg-white">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Objectives</p>
                                        <p className="text-2xl font-bold text-slate-900 mt-1">{objectives.length}</p>
                                        <p className="text-xs text-slate-500 mt-0.5">Clause 6.2 ISMS KPIs</p>
                                    </div>
                                    <div className="h-10 w-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                                        <Target className="h-5 w-5" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-slate-200 shadow-xs bg-white">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">On Track / Achieved</p>
                                        <p className="text-2xl font-bold text-emerald-600 mt-1">
                                            {objectives.filter(o => o.status === 'Achieved' || o.status === 'On Track').length}
                                        </p>
                                        <p className="text-xs text-emerald-600 font-medium mt-0.5">Meeting SLA targets</p>
                                    </div>
                                    <div className="h-10 w-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                                        <CheckCircle2 className="h-5 w-5" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-slate-200 shadow-xs bg-white">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Needs Attention</p>
                                        <p className="text-2xl font-bold text-amber-600 mt-1">
                                            {objectives.filter(o => o.status === 'At Risk' || o.status === 'Needs Attention').length}
                                        </p>
                                        <p className="text-xs text-amber-600 font-medium mt-0.5">Below SLA / In Remediation</p>
                                    </div>
                                    <div className="h-10 w-10 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
                                        <AlertCircle className="h-5 w-5" />
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-slate-200 shadow-xs bg-white">
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Audit Requirement</p>
                                        <p className="text-sm font-bold text-slate-900 mt-1">ISO 27001:2022</p>
                                        <p className="text-xs text-blue-600 font-medium mt-0.5">Clause 6.2 Documented</p>
                                    </div>
                                    <div className="h-10 w-10 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
                                        <BarChart3 className="h-5 w-5" />
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Objectives Table Card */}
                        <Card className="border-slate-200 shadow-sm bg-white">
                            <CardHeader className="bg-slate-50 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4 py-4">
                                <div>
                                    <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                        <Target className="h-5 w-5 text-blue-600" />
                                        Information Security Objectives & KPIs (Clause 6.2)
                                    </CardTitle>
                                    <CardDescription className="text-xs text-slate-500 mt-1">
                                        Measurable security targets aligned with the Information Security Policy. Required by ISO 27001 auditors to verify continuous ISMS performance.
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        onClick={handleOpenAddObjective}
                                        size="sm"
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-xs"
                                    >
                                        <Plus className="h-4 w-4 mr-1.5" /> Add Objective
                                    </Button>
                                    <Button
                                        onClick={() => saveAllContext(scope, parties, issues, objectives, "All objectives saved successfully")}
                                        variant="outline"
                                        size="sm"
                                        className="text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
                                    >
                                        <Save className="h-4 w-4 mr-1.5 text-slate-500" /> Save All
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50/50">
                                            <TableHead className="w-[260px]">Objective & Domain</TableHead>
                                            <TableHead className="w-[180px]">Target Metric</TableHead>
                                            <TableHead className="w-[130px]">Current Value</TableHead>
                                            <TableHead className="w-[150px]">Owner</TableHead>
                                            <TableHead className="w-[110px]">Frequency</TableHead>
                                            <TableHead>Evaluation Method</TableHead>
                                            <TableHead className="w-[120px]">Status</TableHead>
                                            <TableHead className="w-[100px] text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {objectives.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={8} className="h-32 text-center text-slate-500">
                                                    No security objectives defined yet. Click "Add Objective" to establish your first measurable KPI.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            objectives.map((obj) => (
                                                <TableRow key={obj.id} className="group hover:bg-slate-50">
                                                    <TableCell>
                                                        <div className="font-semibold text-slate-900 text-sm">{obj.title}</div>
                                                        <div className="text-xs text-slate-500 mt-0.5">{obj.category || "Information Security"}</div>
                                                    </TableCell>
                                                    <TableCell className="text-xs font-semibold text-slate-800">
                                                        {obj.targetMetric || "—"}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="text-xs font-semibold bg-blue-50 text-blue-800 border-blue-200">
                                                            {obj.currentValue || "Tracking"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-slate-700">
                                                        {obj.owner || "ISMS Manager"}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-slate-600">
                                                        {obj.frequency || "Quarterly"}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-slate-600 leading-relaxed max-w-xs">
                                                        {obj.evaluationMethod || "Audited via internal ISMS management review"}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            className={
                                                                obj.status === 'Achieved' || obj.status === 'On Track'
                                                                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200 font-semibold text-[11px]"
                                                                    : obj.status === 'At Risk'
                                                                    ? "bg-amber-100 text-amber-900 border border-amber-200 font-semibold text-[11px]"
                                                                    : "bg-rose-100 text-rose-800 border border-rose-200 font-semibold text-[11px]"
                                                            }
                                                        >
                                                            {obj.status || "On Track"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-slate-400 hover:text-blue-600 h-8 w-8 p-0"
                                                                onClick={() => handleOpenEditObjective(obj)}
                                                            >
                                                                <Edit2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-slate-400 hover:text-rose-600 h-8 w-8 p-0"
                                                                onClick={() => handleDeleteObjective(obj.id)}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Objective Add / Edit Dialog */}
            <Dialog open={objectiveDialogOpen} onOpenChange={setObjectiveDialogOpen}>
                <DialogContent className="sm:max-w-[560px]">
                    <DialogHeader>
                        <DialogTitle className="text-slate-900 flex items-center gap-2">
                            <Target className="h-5 w-5 text-blue-600" />
                            {editingObjectiveId ? "Edit Security Objective & KPI" : "Establish New Security Objective"}
                        </DialogTitle>
                        <DialogDescription className="text-slate-500 text-xs">
                            Define a measurable objective aligned with Clause 6.2 of ISO/IEC 27001:2022.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700">Objective Title *</Label>
                            <Input
                                placeholder="e.g. Maintain 99.95% Availability of Production Infrastructure"
                                value={objectiveForm.title}
                                onChange={(e) => setObjectiveForm({ ...objectiveForm, title: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700">Category / Domain</Label>
                                <Select
                                    value={objectiveForm.category}
                                    onValueChange={(val) => setObjectiveForm({ ...objectiveForm, category: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Availability & Resilience">Availability & Resilience</SelectItem>
                                        <SelectItem value="Security Training & Awareness">Security Training & Awareness</SelectItem>
                                        <SelectItem value="Vulnerability Management">Vulnerability Management</SelectItem>
                                        <SelectItem value="Incident Response & Detection">Incident Response & Detection</SelectItem>
                                        <SelectItem value="Data Protection & Privacy">Data Protection & Privacy</SelectItem>
                                        <SelectItem value="Disaster Recovery">Disaster Recovery</SelectItem>
                                        <SelectItem value="Access Control & Identity">Access Control & Identity</SelectItem>
                                        <SelectItem value="Compliance & Governance">Compliance & Governance</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700">Review Frequency</Label>
                                <Select
                                    value={objectiveForm.frequency}
                                    onValueChange={(val) => setObjectiveForm({ ...objectiveForm, frequency: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Continuous">Continuous</SelectItem>
                                        <SelectItem value="Monthly">Monthly</SelectItem>
                                        <SelectItem value="Quarterly">Quarterly</SelectItem>
                                        <SelectItem value="Bi-Annually">Bi-Annually</SelectItem>
                                        <SelectItem value="Annual">Annual</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700">Target Metric (KPI) *</Label>
                                <Input
                                    placeholder="e.g. ≥ 99.95% monthly uptime"
                                    value={objectiveForm.targetMetric}
                                    onChange={(e) => setObjectiveForm({ ...objectiveForm, targetMetric: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700">Current Value / Progress</Label>
                                <Input
                                    placeholder="e.g. 99.98% or In Progress"
                                    value={objectiveForm.currentValue}
                                    onChange={(e) => setObjectiveForm({ ...objectiveForm, currentValue: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700">Responsible Owner</Label>
                                <Input
                                    placeholder="e.g. Head of Infrastructure / CISO"
                                    value={objectiveForm.owner}
                                    onChange={(e) => setObjectiveForm({ ...objectiveForm, owner: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-slate-700">Current Status</Label>
                                <Select
                                    value={objectiveForm.status}
                                    onValueChange={(val) => setObjectiveForm({ ...objectiveForm, status: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="On Track">On Track</SelectItem>
                                        <SelectItem value="Achieved">Achieved</SelectItem>
                                        <SelectItem value="At Risk">At Risk</SelectItem>
                                        <SelectItem value="Needs Attention">Needs Attention</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-slate-700">Evaluation Method & Evidence Source</Label>
                            <Textarea
                                placeholder="Describe how results will be measured, evaluated, and documented (e.g. Pingdom synthetic monitors, LMS logs, scanner reports)..."
                                value={objectiveForm.evaluationMethod}
                                onChange={(e) => setObjectiveForm({ ...objectiveForm, evaluationMethod: e.target.value })}
                                className="min-h-[70px]"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setObjectiveDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveObjective} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {editingObjectiveId ? "Update Objective" : "Add Objective"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <ISOContextReportModal
                clientId={clientId}
                open={reportModalOpen}
                onOpenChange={setReportModalOpen}
                scope={scope}
                parties={parties}
                issues={issues}
                objectives={objectives}
                clientName={contextQuery.data?.client?.name}
            />
        </ISOLayout>
    );
}
