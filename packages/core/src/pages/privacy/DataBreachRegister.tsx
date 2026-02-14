import React, { useState } from 'react';
import { useClientContext } from "@/contexts/ClientContext";
import { Button } from "@complianceos/ui/ui/button";
import { Plus, AlertTriangle, Loader2 } from "lucide-react";
import { trpc } from '@/lib/trpc';
import { EnhancedDialog } from "@complianceos/ui/ui/enhanced-dialog";
import { Input } from "@complianceos/ui/ui/input";
import { Label } from "@complianceos/ui/ui/label";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";
import { toast } from "sonner";
import { Badge } from "@complianceos/ui/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@complianceos/ui/ui/table";

export default function DataBreachRegister() {
    const { selectedClientId } = useClientContext();
    const clientId = selectedClientId || 0;
    const [createOpen, setCreateOpen] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        occurredAt: "",
        severity: "low",
        description: ""
    });

    const utils = trpc.useUtils();
    const { data: breaches, isLoading } = trpc.privacy.listAssessments.useQuery({
        clientId,
        typePrefix: "BREACH:"
    }, { enabled: !!clientId });

    const createMutation = trpc.privacy.saveAssessment.useMutation({
        onSuccess: () => {
            toast.success("Breach Logged");
            setCreateOpen(false);
            setFormData({ title: "", occurredAt: "", severity: "low", description: "" });
            utils.privacy.listAssessments.invalidate();
        },
        onError: (err) => toast.error(`Failed: ${err.message}`)
    });

    const handleCreate = () => {
        if (!formData.title || !formData.occurredAt) {
            toast.error("Title and Date are required");
            return;
        }

        createMutation.mutate({
            clientId,
            type: `BREACH: ${formData.title}`,
            responses: {
                occurredAt: formData.occurredAt,
                severity: formData.severity,
                description: formData.description,
                loggedAt: new Date().toISOString()
            },
            status: "in_progress", // "Open" investigation
            score: 0
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Data Breach Register</h1>
                    <p className="text-muted-foreground">Log and manage data breaches and security incidents.</p>
                </div>
                <Button variant="destructive" onClick={() => setCreateOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Report Incident
                </Button>
            </div>

            <div className="rounded-md border bg-white shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Incident Title</TableHead>
                            <TableHead>Severity</TableHead>
                            <TableHead>Occurred On</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></TableCell></TableRow>
                        ) : breaches && breaches.length > 0 ? (
                            breaches.map((b) => (
                                <TableRow key={b.id}>
                                    <TableCell className="font-medium">{b.type.replace("BREACH: ", "")}</TableCell>
                                    <TableCell>
                                        <Badge variant={(b.responses as any)?.severity === 'critical' ? 'destructive' : (b.responses as any)?.severity === 'high' ? 'destructive' : 'secondary'}>
                                            {(b.responses as any)?.severity?.toUpperCase() || 'UNKNOWN'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{(b.responses as any)?.occurredAt || 'N/A'}</TableCell>
                                    <TableCell><Badge variant="outline">{b.status}</Badge></TableCell>
                                    <TableCell><Button variant="ghost" size="sm">Manage</Button></TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                    <div className="flex flex-col items-center justify-center">
                                        <AlertTriangle className="h-8 w-8 text-muted-foreground mb-2" />
                                        <p>No breaches recorded. Good job!</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            <EnhancedDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                title="Report Security Incident"
                description="Log a new data breach or security incident for investigation."
                confirmText="Log Incident"
                confirmVariant="destructive"
                onConfirm={handleCreate}
                isLoading={createMutation.isLoading}
            >
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Incident Title</Label>
                        <Input
                            placeholder="e.g. Lost Laptop, Unauth Access"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Date Occurred</Label>
                            <Input
                                type="date"
                                value={formData.occurredAt}
                                onChange={(e) => setFormData({ ...formData, occurredAt: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Severity</Label>
                            <Select
                                value={formData.severity}
                                onValueChange={(val) => setFormData({ ...formData, severity: val })}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="critical">Critical</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                            placeholder="What happened? Who is affected?"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>
                </div>
            </EnhancedDialog>
        </div>
    );
}
