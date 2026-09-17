
import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";
import { Button } from "@complianceos/ui/ui/button";
import { Input } from "@complianceos/ui/ui/input";
import { Label } from "@complianceos/ui/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@complianceos/ui/ui/table";
import { Badge } from "@complianceos/ui/ui/badge";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@complianceos/ui/ui/tabs";
import { ArrowRight, Link as LinkIcon, Sparkles, Loader2, Trash2, CheckCircle2, ShieldCheck, Target, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@complianceos/ui/ui/dialog";
import { Checkbox } from "@complianceos/ui/ui/checkbox";

export function HarmonizationView() {
    const [mode, setMode] = useState<"controls" | "requirements" | "guide">("controls");

    const [sourceFramework, setSourceFramework] = useState<string>("ISO 27001:2022");
    const [targetFramework, setTargetFramework] = useState<string>("SOC 2");

    const [sourceControlId, setSourceControlId] = useState<string>("");
    const [targetControlId, setTargetControlId] = useState<string>("");

    // Auto-Map State
    const [openAutoMap, setOpenAutoMap] = useState(false);
    const [autoSource, setAutoSource] = useState<string>("ISO 27001:2022");
    const [autoTarget, setAutoTarget] = useState<string>("SOC 2");
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());

    const [isAiAnalyzeOpen, setIsAiAnalyzeOpen] = useState(false);
    const [selectedMapping, setSelectedMapping] = useState<any>(null);

    // Fetch available frameworks
    const { data: availableFrameworks } = trpc.controls.getAvailableFrameworks.useQuery();

    // Fetch Controls for Source
    const { data: sourceControls } = trpc.controls.listPaginated.useQuery({
        framework: sourceFramework,
        limit: 100,
    }, { enabled: !!sourceFramework });

    // Fetch Controls for Target
    const { data: targetControls } = trpc.controls.listPaginated.useQuery({
        framework: targetFramework,
        limit: 100,
    }, { enabled: !!targetFramework });

    // Fetch Existing Mappings
    const { data: mappings, refetch: refetchMappings } = trpc.compliance.frameworkMappings.list.useQuery({});

    const createMapping = trpc.compliance.frameworkMappings.create.useMutation({
        onSuccess: () => {
            toast.success("Mapping created successfully");
            refetchMappings();
            // setSourceControlId(""); // Keep source selected for multi-target mapping
            setTargetControlId("");
        },
        onError: (e) => toast.error(e.message)
    });

    const deleteMapping = trpc.compliance.frameworkMappings.delete.useMutation({
        onSuccess: () => {
            toast.success("Mapping deleted");
            refetchMappings();
        }
    });

    const autoMapControls = trpc.compliance.frameworkMappings.autoMapControls.useMutation({
        onSuccess: (data: any) => {
            setSuggestions(data);
            setSelectedSuggestions(new Set(data.map((_: any, i: number) => i))); // Select all by default
            toast.success(`AI found ${data.length} potential mappings`);
        },
        onError: (e) => toast.error(e.message)
    });

    const bulkCreateMappings = trpc.compliance.frameworkMappings.bulkCreate.useMutation({
        onSuccess: (data) => {
            toast.success(`Successfully created ${data.count} mappings`);
            setOpenAutoMap(false);
            setSuggestions([]);
            refetchMappings();
        },
        onError: (e) => toast.error(e.message)
    });

    const groupedMappings = useMemo(() => {
        if (!mappings) return [];
        const groups = new Map();
        mappings.forEach((m: any) => {
            // Use composite key or just source ID.
            // Since we want to group by "Master Rule", we group by source ID.
            if (!groups.has(m.sourceControlId)) {
                groups.set(m.sourceControlId, {
                    source: { 
                        id: m.sourceControlId, 
                        code: m.sourceControlCode, 
                        name: m.sourceControlName, 
                        framework: m.sourceFramework 
                    },
                    targets: []
                });
            }
            groups.get(m.sourceControlId).targets.push(m);
        });
        return Array.from(groups.values());
    }, [mappings]);

    const handleCreateMapping = () => {
        if (!sourceControlId || !targetControlId) {
            toast.error("Please select both controls");
            return;
        }
        const src = parseInt(sourceControlId, 10);
        const tgt = parseInt(targetControlId, 10);

        if (mappings?.some((m: any) => m.sourceControlId === src && m.targetControlId === tgt)) {
            toast.message("Mapping already exists");
            setTargetControlId("");
            return;
        }
        createMapping.mutate({
            sourceControlId: src,
            targetControlId: tgt,
            mappingType: 'equivalent',
            confidence: '100',
            notes: 'Manually mapped'
        });
    };

    const handleRunAutoMap = () => {
        autoMapControls.mutate({
            sourceFramework: autoSource,
            targetFramework: autoTarget,
            save: false
        });
    };

    const handleApplyAutoMap = () => {
        const toCreate = suggestions.filter((_, i) => selectedSuggestions.has(i)).map(s => ({
            sourceControlId: s.sourceId,
            targetControlId: s.targetId,
            mappingType: s.mappingType,
            confidence: s.confidence.toString(),
            notes: `Auto-mapped by AI (${s.confidence}%)`
        }));

        if (toCreate.length === 0) return;
        bulkCreateMappings.mutate(toCreate);
    };

    return (
        <div className="space-y-6">
            <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
                <TabsList>
                    <TabsTrigger value="controls">Control Mapping</TabsTrigger>
                    <TabsTrigger value="requirements">Requirement Mapping</TabsTrigger>
                    <TabsTrigger value="guide">Guide</TabsTrigger>
                </TabsList>

                <TabsContent value="guide" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Harmonization Guide</CardTitle>
                            <CardDescription>
                                Harmonization connects similar obligations across frameworks so you can implement once and reuse work and evidence.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <div className="font-semibold">What you do here</div>
                                <div className="text-sm text-muted-foreground">
                                    Create a crosswalk between frameworks. This reduces duplicated controls, duplicated tasks, and duplicated evidence requests.
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <Card className="border-dashed">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base">Control Mapping</CardTitle>
                                        <CardDescription>Control ↔ Control (practical crosswalk)</CardDescription>
                                    </CardHeader>
                                    <CardContent className="text-sm text-muted-foreground space-y-2">
                                        <div>Use when you want to link two control catalogs quickly (often AI-assisted).</div>
                                        <div>
                                            Example: map ISO 27001:2022 “5.1 Policies for information security” to a SOC 2 control that is covered by the same policy set.
                                        </div>
                                        <div>
                                            Outcome: a single “master control” can have many mapped targets, so progress/evidence can be reasoned about across frameworks.
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card className="border-dashed">
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base">Requirement Mapping</CardTitle>
                                        <CardDescription>Requirement ↔ Requirement (+ optional Common Control hub)</CardDescription>
                                    </CardHeader>
                                    <CardContent className="text-sm text-muted-foreground space-y-2">
                                        <div>Use when you want audit-grade, requirement-level traceability and a canonical “Common Control”.</div>
                                        <div>
                                            Example: map an ISO requirement and a SOC 2 requirement to a Common Control like “Access Control & Provisioning”.
                                        </div>
                                        <div>
                                            Outcome: multiple requirements across frameworks point to one Common Control you implement and evidence once.
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <div className="space-y-2">
                                <div className="font-semibold">How it shows up elsewhere</div>
                                <div className="text-sm text-muted-foreground space-y-1">
                                    <div>- Controls Library can display mapped frameworks for a control.</div>
                                    <div>- Implementation Plans can detect duplicate work and recommend reuse based on mappings.</div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="font-semibold">Practical workflow</div>
                                <div className="text-sm text-muted-foreground space-y-1">
                                    <div>1) Choose a “master” framework/control you want to standardize on.</div>
                                    <div>2) Map equivalent/related targets from other frameworks.</div>
                                    <div>3) Attach evidence to the master control and reuse it across mapped targets.</div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="controls" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Mapping Creator */}
                <Card className="lg:col-span-3 border-dashed border-2 bg-slate-50/50">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div className="space-y-1">
                            <CardTitle className="flex items-center gap-2">
                                <LinkIcon className="h-5 w-5 text-primary" />
                                Harmonization Engine
                            </CardTitle>
                            <CardDescription>Define your Master Controls and map them to multiple compliance requirements.</CardDescription>
                        </div>
                        <Button variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50" onClick={() => setOpenAutoMap(true)}>
                            <Wand2 className="mr-2 h-4 w-4" />
                            AI Auto-Map
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col md:flex-row items-end gap-4">
                            <div className="flex-1 w-full space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <ShieldCheck className="h-4 w-4 text-indigo-600" />
                                    <h4 className="font-semibold text-sm text-indigo-900 uppercase tracking-wide">Step 1: Select Master Control</h4>
                                </div>
                                <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                    <div className="space-y-2">
                                        <Label>Master Framework</Label>
                                        <Select value={sourceFramework} onValueChange={setSourceFramework}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {availableFrameworks?.map(fw => (
                                                    <SelectItem key={fw} value={fw}>{fw}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Master Control</Label>
                                        <Select value={sourceControlId} onValueChange={setSourceControlId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select master control..." />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-[300px]">
                                                {sourceControls?.items?.map((c: any) => (
                                                    <SelectItem key={c.id} value={c.id.toString()}>
                                                        <span className="font-semibold text-indigo-700">{c.controlId}</span>: {c.name.substring(0, 30)}...
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            <div className="pb-8 items-center justify-center flex">
                                <ArrowRight className="h-6 w-6 text-slate-300" />
                            </div>

                            <div className="flex-1 w-full space-y-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Target className="h-4 w-4 text-rose-600" />
                                    <h4 className="font-semibold text-sm text-rose-900 uppercase tracking-wide">Step 2: Map Target Requirement</h4>
                                </div>
                                <div className="grid grid-cols-2 gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                    <div className="space-y-2">
                                        <Label>Target Framework</Label>
                                        <Select value={targetFramework} onValueChange={setTargetFramework}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {availableFrameworks?.map(fw => (
                                                    <SelectItem key={fw} value={fw}>{fw}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Target Control</Label>
                                        <Select value={targetControlId} onValueChange={setTargetControlId}>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select target control..." />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-[300px]">
                                                {targetControls?.items?.map((c: any) => (
                                                    <SelectItem key={c.id} value={c.id.toString()}>
                                                        <span className="font-semibold">{c.controlId}</span>: {c.name.substring(0, 30)}...
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            <div className="pb-8">
                                <Button onClick={handleCreateMapping} disabled={createMapping.isPending} className="bg-slate-900 hover:bg-slate-800">
                                    {createMapping.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Link"}
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Mappings List Groupped */}
                <div className="lg:col-span-3">
                    <h3 className="text-lg font-semibold mb-4 text-slate-800">Harmonized Controls ({groupedMappings.length})</h3>
                    <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50">
                                    <TableHead className="w-[40%]">Master Control</TableHead>
                                    <TableHead>Mapped Compliance Requirements</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {groupedMappings.map((group: any) => (
                                    <TableRow key={group.source.id}>
                                        <TableCell className="align-top">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                                                        {group.source.framework}
                                                    </Badge>
                                                    <span className="font-bold text-slate-900">{group.source.code}</span>
                                                </div>
                                                <p className="text-sm text-slate-600 line-clamp-2">
                                                    {group.source.name}
                                                </p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-2">
                                                {group.targets.map((t: any) => (
                                                    <div key={t.id} className="flex items-center bg-white border border-slate-200 rounded-md shadow-sm pl-2 pr-1 py-1 group hover:border-slate-300 transition-colors">
                                                        <div className="flex flex-col mr-2">
                                                            <span className="text-[10px] font-bold text-slate-500 uppercase">{t.targetFramework}</span>
                                                            <span className="text-xs font-medium text-slate-900" title={t.targetControlName}>
                                                                {t.targetControlCode}
                                                            </span>
                                                        </div>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            className="h-6 w-6 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                            onClick={() => deleteMapping.mutate({ id: t.id })}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                ))}
                                                <div className="flex items-center justify-center border border-dashed border-slate-300 rounded-md w-8 h-10 hover:bg-slate-50 cursor-pointer transition-colors"
                                                     title="Add another mapping"
                                                     onClick={() => {
                                                         setSourceFramework(group.source.framework);
                                                         setSourceControlId(group.source.id.toString());
                                                         // Scroll to top or highlight input could be nice
                                                         window.scrollTo({ top: 0, behavior: 'smooth' });
                                                     }}
                                                >
                                                    <Sparkles className="h-4 w-4 text-slate-400" />
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {groupedMappings.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={2} className="text-center py-12 text-muted-foreground">
                                            <div className="flex flex-col items-center gap-2">
                                                <LinkIcon className="h-8 w-8 text-slate-300" />
                                                <p>No master controls mapped yet.</p>
                                                <p className="text-sm">Select a Master Control above to start building your framework.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </div>

            {/* Auto-Map Dialog */}
            <Dialog open={openAutoMap} onOpenChange={setOpenAutoMap}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>AI Auto-Mapping</DialogTitle>
                        <DialogDescription>
                            Automatically identify and link equivalent controls between two frameworks using AI.
                        </DialogDescription>
                    </DialogHeader>

                    {!suggestions.length ? (
                        <div className="grid gap-6 py-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Master Framework (Source)</Label>
                                    <Select value={autoSource} onValueChange={setAutoSource}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {availableFrameworks?.map(fw => (
                                                <SelectItem key={fw} value={fw}>{fw}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Target Framework</Label>
                                    <Select value={autoTarget} onValueChange={setAutoTarget}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {availableFrameworks?.map(fw => (
                                                <SelectItem key={fw} value={fw}>{fw}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="bg-slate-50 p-4 rounded text-sm text-slate-600">
                                <p>This process will:</p>
                                <ul className="list-disc ml-5 mt-2 space-y-1">
                                    <li>Analyze the text of controls from both frameworks.</li>
                                    <li>Calculate similarity scores (Embeddings + Cosine Similarity).</li>
                                    <li>Suggest high-confidence mappings (&gt;75% match).</li>
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="bg-green-50 p-3 rounded-md flex items-center gap-2 text-green-700 text-sm">
                                <CheckCircle2 className="h-4 w-4" />
                                Found {suggestions.length} potential mappings.
                            </div>
                            <div className="max-h-[400px] overflow-y-auto border rounded-md">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[50px]">
                                                <Checkbox 
                                                    checked={selectedSuggestions.size === suggestions.length}
                                                    onCheckedChange={(c) => {
                                                        if(c) setSelectedSuggestions(new Set(suggestions.map((_, i) => i)));
                                                        else setSelectedSuggestions(new Set());
                                                    }}
                                                />
                                            </TableHead>
                                            <TableHead>Control A (Source)</TableHead>
                                            <TableHead>Control B (Target)</TableHead>
                                            <TableHead>Confidence</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {suggestions.map((s: any, idx: number) => (
                                            <TableRow key={idx}>
                                                <TableCell>
                                                    <Checkbox 
                                                        checked={selectedSuggestions.has(idx)}
                                                        onCheckedChange={(c) => {
                                                            const next = new Set(selectedSuggestions);
                                                            if (c) next.add(idx);
                                                            else next.delete(idx);
                                                            setSelectedSuggestions(next);
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    Control #{s.sourceId}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    Control #{s.targetId}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={s.confidence > 90 ? "default" : "secondary"}>
                                                        {s.confidence}%
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        {!suggestions.length ? (
                            <Button onClick={handleRunAutoMap} disabled={autoMapControls.isPending}>
                                {autoMapControls.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Analyze Frameworks
                            </Button>
                        ) : (
                            <div className="flex gap-2 w-full justify-end">
                                <Button variant="outline" onClick={() => setSuggestions([])}>Back</Button>
                                <Button onClick={handleApplyAutoMap} disabled={bulkCreateMappings.isPending}>
                                    {bulkCreateMappings.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Confirm {selectedSuggestions.size} Mappings
                                </Button>
                            </div>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
                </TabsContent>

                <TabsContent value="requirements">
                    <RequirementMappingStudio />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function RequirementMappingStudio() {
    const utils = trpc.useUtils();

    const { data: frameworks } = trpc.compliancePlanning.listFrameworks.useQuery();

    const [sourceFrameworkId, setSourceFrameworkId] = useState<number | null>(null);
    const [targetFrameworkId, setTargetFrameworkId] = useState<number | null>(null);

    const [sourceSearch, setSourceSearch] = useState("");
    const [targetSearch, setTargetSearch] = useState("");

    const [sourceRequirementId, setSourceRequirementId] = useState<string>("");
    const [targetRequirementId, setTargetRequirementId] = useState<string>("");

    const [strength, setStrength] = useState<"exact" | "subset" | "superset" | "partial" | "related">("related");
    const [justification, setJustification] = useState("");

    const [commonControlId, setCommonControlId] = useState<string>("none");
    const [openNewCommon, setOpenNewCommon] = useState(false);
    const [newCommonName, setNewCommonName] = useState("");
    const [newCommonDomain, setNewCommonDomain] = useState("");
    const [newCommonDescription, setNewCommonDescription] = useState("");

    useEffect(() => {
        if (!frameworks || frameworks.length === 0) return;
        if (sourceFrameworkId == null) setSourceFrameworkId(frameworks[0].id);
        if (targetFrameworkId == null) setTargetFrameworkId(frameworks[Math.min(1, frameworks.length - 1)].id);
    }, [frameworks, sourceFrameworkId, targetFrameworkId]);

    const { data: commonControls } = trpc.harmonization.listCommonControls.useQuery();

    const { data: sourceRequirements } = trpc.harmonization.listRequirements.useQuery({
        frameworkId: sourceFrameworkId ?? 0,
        search: sourceSearch,
        limit: 200
    }, { enabled: !!sourceFrameworkId });

    const { data: targetRequirements } = trpc.harmonization.listRequirements.useQuery({
        frameworkId: targetFrameworkId ?? 0,
        search: targetSearch,
        limit: 200
    }, { enabled: !!targetFrameworkId });

    const { data: mappings, refetch: refetchMappings, isFetching: isFetchingMappings } = trpc.harmonization.listRequirementMappings.useQuery({
        sourceFrameworkId: sourceFrameworkId ?? 0,
        targetFrameworkId: targetFrameworkId ?? 0
    }, { enabled: !!sourceFrameworkId && !!targetFrameworkId });

    const upsertMapping = trpc.harmonization.upsertRequirementMapping.useMutation({
        onSuccess: () => {
            toast.success("Mapping saved");
            setTargetRequirementId("");
            setJustification("");
            refetchMappings();
        },
        onError: (e) => toast.error(e.message)
    });

    const deleteMapping = trpc.harmonization.deleteRequirementMapping.useMutation({
        onSuccess: () => {
            toast.success("Mapping deleted");
            refetchMappings();
        },
        onError: (e) => toast.error(e.message)
    });

    const createCommon = trpc.harmonization.createCommonControl.useMutation({
        onSuccess: (created) => {
            toast.success("Common control created");
            utils.harmonization.listCommonControls.invalidate();
            setOpenNewCommon(false);
            setNewCommonName("");
            setNewCommonDomain("");
            setNewCommonDescription("");
            setCommonControlId(created.id.toString());
        },
        onError: (e) => toast.error(e.message)
    });

    const handleCreateMapping = () => {
        if (!sourceFrameworkId || !targetFrameworkId) {
            toast.error("Select both frameworks");
            return;
        }
        if (!sourceRequirementId || !targetRequirementId) {
            toast.error("Select both requirements");
            return;
        }

        upsertMapping.mutate({
            sourceFrameworkId,
            sourceRequirementId: parseInt(sourceRequirementId, 10),
            targetFrameworkId,
            targetRequirementId: parseInt(targetRequirementId, 10),
            strength,
            justification: justification.trim() ? justification.trim() : undefined,
            commonControlId: commonControlId === "none" ? null : parseInt(commonControlId, 10)
        });
    };

    return (
        <div className="space-y-6">
            <Card className="border-dashed border-2 bg-slate-50/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <div className="space-y-1">
                        <CardTitle className="flex items-center gap-2">
                            <LinkIcon className="h-5 w-5 text-primary" />
                            Framework Mapping Studio
                        </CardTitle>
                        <CardDescription>Map requirement-to-requirement and optionally anchor them to a common control.</CardDescription>
                    </div>
                    <Button variant="outline" onClick={() => setOpenNewCommon(true)}>
                        New Common Control
                    </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Source Framework</Label>
                            <Select
                                value={sourceFrameworkId?.toString() ?? ""}
                                onValueChange={(v) => {
                                    setSourceFrameworkId(parseInt(v, 10));
                                    setSourceRequirementId("");
                                }}
                            >
                                <SelectTrigger><SelectValue placeholder="Select source framework..." /></SelectTrigger>
                                <SelectContent>
                                    {frameworks?.map((f: any) => (
                                        <SelectItem key={f.id} value={f.id.toString()}>{f.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Target Framework</Label>
                            <Select
                                value={targetFrameworkId?.toString() ?? ""}
                                onValueChange={(v) => {
                                    setTargetFrameworkId(parseInt(v, 10));
                                    setTargetRequirementId("");
                                }}
                            >
                                <SelectTrigger><SelectValue placeholder="Select target framework..." /></SelectTrigger>
                                <SelectContent>
                                    {frameworks?.map((f: any) => (
                                        <SelectItem key={f.id} value={f.id.toString()}>{f.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Source Requirement</Label>
                                <Input
                                    value={sourceSearch}
                                    onChange={(e) => setSourceSearch(e.target.value)}
                                    placeholder="Search..."
                                    className="w-[220px]"
                                />
                            </div>
                            <Select value={sourceRequirementId} onValueChange={setSourceRequirementId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select source requirement..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-[320px]">
                                    {sourceRequirements?.map((r: any) => (
                                        <SelectItem key={r.id} value={r.id.toString()}>
                                            <span className="font-semibold text-indigo-700">{r.identifier}</span>: {r.title.substring(0, 60)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Target Requirement</Label>
                                <Input
                                    value={targetSearch}
                                    onChange={(e) => setTargetSearch(e.target.value)}
                                    placeholder="Search..."
                                    className="w-[220px]"
                                />
                            </div>
                            <Select value={targetRequirementId} onValueChange={setTargetRequirementId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select target requirement..." />
                                </SelectTrigger>
                                <SelectContent className="max-h-[320px]">
                                    {targetRequirements?.map((r: any) => (
                                        <SelectItem key={r.id} value={r.id.toString()}>
                                            <span className="font-semibold">{r.identifier}</span>: {r.title.substring(0, 60)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label>Strength</Label>
                            <Select value={strength} onValueChange={(v) => setStrength(v as any)}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="exact">exact</SelectItem>
                                    <SelectItem value="subset">subset</SelectItem>
                                    <SelectItem value="superset">superset</SelectItem>
                                    <SelectItem value="partial">partial</SelectItem>
                                    <SelectItem value="related">related</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2 lg:col-span-2">
                            <Label>Common Control (Optional)</Label>
                            <Select value={commonControlId} onValueChange={setCommonControlId}>
                                <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                                <SelectContent className="max-h-[320px]">
                                    <SelectItem value="none">None</SelectItem>
                                    {commonControls?.map((c: any) => (
                                        <SelectItem key={c.id} value={c.id.toString()}>
                                            {c.domain ? `${c.domain}: ` : ""}{c.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Justification (Optional)</Label>
                        <Textarea
                            value={justification}
                            onChange={(e) => setJustification(e.target.value)}
                            placeholder="Why does this mapping hold? Notes for auditors."
                        />
                    </div>

                    <div className="flex justify-end">
                        <Button onClick={handleCreateMapping} disabled={upsertMapping.isPending}>
                            {upsertMapping.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Mapping"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-800">Mappings</h3>
                    <div className="text-sm text-muted-foreground">
                        {isFetchingMappings ? "Loading..." : `${mappings?.length ?? 0}`}
                    </div>
                </div>

                <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50">
                                <TableHead className="w-[42%]">Source</TableHead>
                                <TableHead className="w-[42%]">Target</TableHead>
                                <TableHead className="w-[12%]">Strength</TableHead>
                                <TableHead className="w-[4%]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(mappings || []).map((m: any) => (
                                <TableRow key={m.id}>
                                    <TableCell className="align-top">
                                        <div className="flex flex-col">
                                            <div className="text-xs text-slate-500">{m.sourceRequirement?.identifier}</div>
                                            <div className="text-sm font-medium">{m.sourceRequirement?.title}</div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="align-top">
                                        <div className="flex flex-col">
                                            <div className="text-xs text-slate-500">{m.targetRequirement?.identifier}</div>
                                            <div className="text-sm font-medium">{m.targetRequirement?.title}</div>
                                            {m.commonControl?.name && (
                                                <div className="mt-1">
                                                    <Badge variant="outline">
                                                        {m.commonControl?.domain ? `${m.commonControl.domain}: ` : ""}{m.commonControl.name}
                                                    </Badge>
                                                </div>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="align-top">
                                        <Badge variant="secondary">{m.strength}</Badge>
                                    </TableCell>
                                    <TableCell className="align-top">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => deleteMapping.mutate({ id: m.id })}
                                            disabled={deleteMapping.isPending}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {(mappings?.length ?? 0) === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                                        No mappings yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <Dialog open={openNewCommon} onOpenChange={setOpenNewCommon}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Create Common Control</DialogTitle>
                        <DialogDescription>Define a reusable control that multiple framework requirements can map to.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-2">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input value={newCommonName} onChange={(e) => setNewCommonName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Domain (Optional)</Label>
                            <Input value={newCommonDomain} onChange={(e) => setNewCommonDomain(e.target.value)} placeholder="Access Control, Logging, Encryption..." />
                        </div>
                        <div className="space-y-2">
                            <Label>Description (Optional)</Label>
                            <Textarea value={newCommonDescription} onChange={(e) => setNewCommonDescription(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenNewCommon(false)}>Cancel</Button>
                        <Button
                            onClick={() => createCommon.mutate({
                                name: newCommonName.trim(),
                                domain: newCommonDomain.trim() ? newCommonDomain.trim() : undefined,
                                description: newCommonDescription.trim() ? newCommonDescription.trim() : undefined
                            })}
                            disabled={!newCommonName.trim() || createCommon.isPending}
                        >
                            {createCommon.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
