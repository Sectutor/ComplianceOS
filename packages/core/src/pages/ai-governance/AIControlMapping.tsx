
import React, { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@complianceos/ui/ui/card';
import { Button } from '@complianceos/ui/ui/button';
import { Badge } from '@complianceos/ui/ui/badge';
import { Search, Link, Unlink, CheckCircle2 } from 'lucide-react';
import { Input } from '@complianceos/ui/ui/input';
import { toast } from 'sonner';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@complianceos/ui/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@complianceos/ui/ui/tabs';
import { getNistAiRmfPlaybook } from '@/data/frameworks/nist_ai_rmf_playbook';

interface AIControlMappingProps {
    aiSystemId: number;
    clientId: number;
}

export const AIControlMapping = ({ aiSystemId, clientId }: AIControlMappingProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedFramework, setSelectedFramework] = useState("NIST AI RMF");
    const [viewTab, setViewTab] = useState<'all' | 'mapped'>('all');
    const utils = trpc.useUtils();

    const { data: availableFrameworks } = trpc.controls.getAvailableFrameworks.useQuery({ clientId });

    // Fetch controls for selected framework
    const { data: frameworkControls, isLoading: loadingControls } = trpc.controls.list.useQuery({
        framework: selectedFramework,
        clientId: clientId
    });

    const { data: mappedControls, refetch: refetchMapped } = trpc.ai.systems.getMappedControls.useQuery({
        aiSystemId
    });

    const mapControl = trpc.ai.systems.mapControl.useMutation({
        onSuccess: async () => {
            toast.success("Control mapped successfully");
            await Promise.all([
                utils.ai.systems.getMappedControls.invalidate({ aiSystemId }),
                utils.ai.systems.getStats.invalidate({ clientId }),
                utils.ai.systems.getStats.invalidate({ clientId, aiSystemId })
            ]);
            refetchMapped();
        }
    });

    const unmapControl = trpc.ai.systems.unmapControl.useMutation({
        onSuccess: async () => {
            toast.success("Control unmapped");
            await Promise.all([
                utils.ai.systems.getMappedControls.invalidate({ aiSystemId }),
                utils.ai.systems.getStats.invalidate({ clientId }),
                utils.ai.systems.getStats.invalidate({ clientId, aiSystemId })
            ]);
            refetchMapped();
        }
    });

    const updateControlStatus = trpc.ai.systems.updateControlStatus.useMutation({
        onSuccess: async () => {
            toast.success("Control status updated");
            await Promise.all([
                utils.ai.systems.getMappedControls.invalidate({ aiSystemId }),
                utils.ai.systems.getStats.invalidate({ clientId }),
                utils.ai.systems.getStats.invalidate({ clientId, aiSystemId })
            ]);
            refetchMapped();
        }
    });

    const createWorkItem = trpc.governance.create.useMutation({
        onSuccess: async () => {
            toast.success("Work item created");
            await utils.governance.list.invalidate({ clientId });
            await utils.governance.getStats.invalidate({ clientId } as any);
        }
    });

    const isMapped = (controlId: number) => {
        return mappedControls?.find(m => m.controlId === controlId);
    };

    const filteredControls = frameworkControls?.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.controlId.toLowerCase().includes(searchTerm.toLowerCase())
    );
    const mappedControlRows = mappedControls || [];
    const mappedControlIds = new Set<number>(mappedControlRows.map((m: any) => m.controlId));
    const mappedOnlyControls = filteredControls?.filter((c: any) => mappedControlIds.has(c.id)) || [];
    const mappedControlsById = useMemo(() => {
        const m = new Map<number, any>();
        for (const row of mappedControlRows) m.set(row.controlId, row);
        return m;
    }, [mappedControlRows]);

    const handleCreateWorkItemForControl = (control: any, mappingStatus: string | undefined) => {
        const category = control.category as any;
        const pb = getNistAiRmfPlaybook(control.controlId, category);
        const title = `AI RMF ${control.controlId} — ${control.name}`;
        const description = [
            `AI System ID: ${aiSystemId}`,
            `Framework: ${selectedFramework}`,
            `Category: ${control.category}`,
            `Current status: ${mappingStatus || 'mapped'}`,
            ``,
            `Control description:`,
            control.description || '',
            ``,
            `Suggested actions:`,
            ...pb.suggestedActions.map(a => `- ${a}`),
            ``,
            `Suggested evidence:`,
            ...pb.suggestedEvidence.map(e => `- ${e}`),
            ``,
            `Suggested metrics/tests:`,
            ...pb.suggestedMetrics.map(m => `- ${m}`)
        ].join('\n');

        createWorkItem.mutate({
            clientId,
            title,
            description,
            priority: 'medium',
            type: 'control_implementation',
            entityType: 'control',
            entityId: control.id,
            metadata: {
                aiSystemId,
                framework: selectedFramework,
                rmfControlId: control.controlId,
                rmfCategory: control.category,
                mappingStatus: mappingStatus || 'mapped'
            }
        });
    };

    const createWorkItemsForAllMapped = () => {
        if (selectedFramework !== "NIST AI RMF") {
            toast.error("Work item generation is only available for NIST AI RMF right now.");
            return;
        }
        if (mappedOnlyControls.length === 0) {
            toast.message("No mapped controls to create tasks for.");
            return;
        }
        const alreadyCreated = new Set<string>();
        for (const c of mappedOnlyControls) {
            const mapping = mappedControlsById.get(c.id);
            const key = `${aiSystemId}:${c.controlId}`;
            if (alreadyCreated.has(key)) continue;
            alreadyCreated.add(key);
            handleCreateWorkItemForControl(c, mapping?.status);
        }
    };


    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder={`Search ${selectedFramework} controls...`}
                        className="pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="w-[200px]">
                    <Select value={selectedFramework} onValueChange={setSelectedFramework}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select Framework" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="NIST AI RMF">NIST AI RMF</SelectItem>
                            {availableFrameworks?.filter((f: string) => f !== "NIST AI RMF").map((fw: string) => (
                                <SelectItem key={fw} value={fw}>{fw}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-primary/5 rounded-lg border border-primary/20">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{mappedControls?.length || 0} Controls Mapped</span>
                </div>
            </div>

            <Tabs value={viewTab} onValueChange={(v) => setViewTab(v as any)}>
                <TabsList className="grid grid-cols-2 w-full md:w-[420px]">
                    <TabsTrigger value="all">All Controls</TabsTrigger>
                    <TabsTrigger value="mapped">Mapped Controls</TabsTrigger>
                </TabsList>

                <TabsContent value="all">
                    <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                        {filteredControls?.map((control) => {
                            const mapping = isMapped(control.id);
                            const isMappedBool = !!mapping;

                            return (
                                <Card key={control.id} className={`transition-all ${isMappedBool ? 'border-primary/30 bg-primary/5 shadow-sm' : 'border-muted/40 opacity-90 hover:opacity-100'}`}>
                                    <CardHeader className="p-4 flex flex-col gap-4">
                                        <div className="flex flex-row items-start justify-between">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="font-mono bg-background">{control.controlId}</Badge>
                                                    <CardTitle className="text-base">{control.name}</CardTitle>
                                                    {isMappedBool && (
                                                        <Badge variant="secondary" className="h-5">Mapped</Badge>
                                                    )}
                                                </div>
                                                <CardDescription className="line-clamp-2 text-xs md:text-sm max-w-2xl">
                                                    {control.description}
                                                </CardDescription>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {isMappedBool ? (
                                                    <Button variant="outline" size="sm" onClick={() => setViewTab('mapped')}>
                                                        Manage
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => mapControl.mutate({ aiSystemId, controlId: control.id })}
                                                        disabled={mapControl.isPending}
                                                        className="gap-2"
                                                    >
                                                        <Link className="h-3 w-3" /> Map Control
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    </CardHeader>
                                </Card>
                            );
                        })}

                        {filteredControls?.length === 0 && (
                            <div className="text-center py-10 text-muted-foreground">
                                No controls found matching your search.
                            </div>
                        )}
                    </div>
                </TabsContent>

                <TabsContent value="mapped">
                    {selectedFramework === "NIST AI RMF" && (
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                            <div className="text-sm text-muted-foreground">
                                Use this list as your execution queue (Mapped → Implemented → Verified). Generate work items to assign owners and deadlines.
                            </div>
                            <Button
                                variant="outline"
                                className="gap-2"
                                onClick={createWorkItemsForAllMapped}
                                disabled={createWorkItem.isPending}
                            >
                                Create Work Items
                            </Button>
                        </div>
                    )}
                    <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
                        {mappedOnlyControls.map((control: any) => {
                            const mapping = isMapped(control.id);
                            if (!mapping) return null;
                            return (
                                <Card key={control.id} className="transition-all border-primary/50 bg-primary/5 shadow-sm">
                                    <CardHeader className="p-4 flex flex-col gap-4">
                                        <div className="flex flex-row items-start justify-between">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="font-mono bg-background">{control.controlId}</Badge>
                                                    <CardTitle className="text-base">{control.name}</CardTitle>
                                                </div>
                                                <CardDescription className="line-clamp-2 text-xs md:text-sm max-w-2xl">
                                                    {control.description}
                                                </CardDescription>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Select
                                                    value={mapping?.status || 'mapped'}
                                                    onValueChange={(val) => updateControlStatus.mutate({
                                                        aiSystemId,
                                                        controlId: control.id,
                                                        status: val
                                                    })}
                                                >
                                                    <SelectTrigger className="w-[160px] h-8 text-xs bg-background">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="mapped">Mapped</SelectItem>
                                                        <SelectItem value="implemented">Implemented</SelectItem>
                                                        <SelectItem value="verified">Verified</SelectItem>
                                                        <SelectItem value="not_applicable">Not Applicable</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {selectedFramework === "NIST AI RMF" && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => handleCreateWorkItemForControl(control, mapping?.status)}
                                                        disabled={createWorkItem.isPending}
                                                    >
                                                        Create Task
                                                    </Button>
                                                )}
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                    onClick={() => unmapControl.mutate({ aiSystemId, controlId: control.id })}
                                                    disabled={unmapControl.isPending}
                                                >
                                                    <Unlink className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    {selectedFramework === "NIST AI RMF" && (
                                        <CardContent className="pt-0 pb-4">
                                            {(() => {
                                                const pb = getNistAiRmfPlaybook(control.controlId, control.category);
                                                return (
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-muted-foreground">
                                                        <div className="rounded-xl border bg-background p-3">
                                                            <div className="font-semibold text-foreground mb-1">Suggested actions</div>
                                                            <ul className="list-disc pl-4 space-y-1">
                                                                {pb.suggestedActions.slice(0, 3).map((a) => <li key={a}>{a}</li>)}
                                                            </ul>
                                                        </div>
                                                        <div className="rounded-xl border bg-background p-3">
                                                            <div className="font-semibold text-foreground mb-1">Suggested evidence</div>
                                                            <ul className="list-disc pl-4 space-y-1">
                                                                {pb.suggestedEvidence.slice(0, 3).map((e) => <li key={e}>{e}</li>)}
                                                            </ul>
                                                        </div>
                                                        <div className="rounded-xl border bg-background p-3">
                                                            <div className="font-semibold text-foreground mb-1">Suggested metrics/tests</div>
                                                            <ul className="list-disc pl-4 space-y-1">
                                                                {pb.suggestedMetrics.slice(0, 3).map((m) => <li key={m}>{m}</li>)}
                                                            </ul>
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </CardContent>
                                    )}
                                </Card>
                            );
                        })}

                        {mappedOnlyControls.length === 0 && (
                            <div className="text-center py-10 text-muted-foreground">
                                No mapped controls yet. Map controls from the All Controls tab.
                            </div>
                        )}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};
