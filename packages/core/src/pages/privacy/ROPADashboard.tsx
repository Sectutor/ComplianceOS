import React, { useState } from 'react';
import { useClientContext } from "@/contexts/ClientContext";
import { Button } from "@complianceos/ui/ui/button";
import { Plus, Database, Settings, Loader2, ArrowRight } from "lucide-react";
import { trpc } from '@/lib/trpc';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@complianceos/ui/ui/table";
import { EnhancedDialog } from "@complianceos/ui/ui/enhanced-dialog";
import { Input } from "@complianceos/ui/ui/input";
import { Label } from "@complianceos/ui/ui/label";
import { Badge } from "@complianceos/ui/ui/badge";
import { toast } from "sonner";

export default function ROPADashboard() {
    const { selectedClientId } = useClientContext();
    const clientId = selectedClientId || 0;
    const [createOpen, setCreateOpen] = useState(false);
    const [processName, setProcessName] = useState("");
    const [processDesc, setProcessDesc] = useState("");
    const [processDept, setProcessDept] = useState("");

    const utils = trpc.useUtils();
    const { data: processes, isLoading } = trpc.businessContinuity.processes.list.useQuery({ clientId }, { enabled: !!clientId });

    const createProcessMutation = trpc.businessContinuity.processes.create.useMutation({
        onSuccess: () => {
            toast.success("Process created successfully");
            setCreateOpen(false);
            setProcessName("");
            setProcessDesc("");
            setProcessDept("");
            utils.businessContinuity.processes.list.invalidate();
        },
        onError: (err) => toast.error(`Error: ${err.message}`)
    });

    const handleCreate = () => {
        if (!processName) return toast.error("Name required");
        createProcessMutation.mutate({
            clientId,
            name: processName,
            description: processDesc,
            department: processDept
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Records of Processing Activities (ROPA)</h1>
                    <p className="text-muted-foreground">Maintain a comprehensive inventory of your business processes and their data flows (Article 30).</p>
                </div>
                <Button onClick={() => setCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Add Process
                </Button>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : (
                <div className="rounded-md border bg-white shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Process Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Department</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {processes && processes.length > 0 ? (
                                processes.map((proc) => (
                                    <TableRow key={proc.id} className="hover:bg-slate-50 transition-colors">
                                        <TableCell className="font-medium">{proc.name}</TableCell>
                                        <TableCell className="text-muted-foreground max-w-xs truncate" title={proc.description || ''}>{proc.description || '-'}</TableCell>
                                        <TableCell><Badge variant="outline">{proc.department || 'General'}</Badge></TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm" onClick={() => toast.info(`Data Flow mapping for ${proc.name} coming soon`)}>
                                                Configure Flows <ArrowRight className="ml-2 h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-48 text-center text-muted-foreground">
                                        <div className="flex flex-col items-center justify-center space-y-2">
                                            <div className="p-4 bg-muted/30 rounded-full">
                                                <Database className="h-8 w-8 text-muted-foreground/50" />
                                            </div>
                                            <p>No processes found. Start by defining a business process.</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}

            <EnhancedDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                title="Add Business Process"
                description="Define a new process (e.g., Payroll, Marketing Analysis) to map data flows against."
                primaryAction={{
                    label: createProcessMutation.isPending ? "Creating..." : "Create Process",
                    onClick: handleCreate,
                    disabled: createProcessMutation.isPending
                }}
            >
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Process Name</Label>
                        <Input value={processName} onChange={e => setProcessName(e.target.value)} placeholder="e.g. Employee Onboarding" />
                    </div>
                    <div className="grid gap-2">
                        <Label>Department</Label>
                        <Input value={processDept} onChange={e => setProcessDept(e.target.value)} placeholder="e.g. HR" />
                    </div>
                    <div className="grid gap-2">
                        <Label>Description</Label>
                        <Input value={processDesc} onChange={e => setProcessDesc(e.target.value)} placeholder="Brief description of the activity and purpose" />
                    </div>
                </div>
            </EnhancedDialog>
        </div>
    );
}
