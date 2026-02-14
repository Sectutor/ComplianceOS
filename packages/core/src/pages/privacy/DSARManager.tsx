import React, { useState } from 'react';
import { useClientContext } from "@/contexts/ClientContext";
import { PrivacyLayout } from "./PrivacyLayout";
import { Button } from "@complianceos/ui/ui/button";
import { Plus, Users, Loader2 } from "lucide-react";
import { trpc } from '@/lib/trpc';
import { EnhancedDialog } from "@complianceos/ui/ui/enhanced-dialog";
import { Input } from "@complianceos/ui/ui/input";
import { Label } from "@complianceos/ui/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@complianceos/ui/ui/table";
import { Badge } from "@complianceos/ui/ui/badge";
import { toast } from "sonner";

export default function DSARManager() {
    const { selectedClientId } = useClientContext();
    const clientId = selectedClientId || 0;
    const [createOpen, setCreateOpen] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        requestType: "Access",
        subjectEmail: "",
        subjectName: "",
        dueDate: "",
        priority: "medium",
        submissionMethod: "manual"
    });

    const utils = trpc.useUtils();
    const { data: requests, isLoading } = trpc.privacy.getDsarRequests.useQuery({ clientId }, { enabled: !!clientId });

    const createMutation = trpc.privacy.createDsarRequest.useMutation({
        onSuccess: () => {
            toast.success("DSAR logged successfully");
            setCreateOpen(false);
            setFormData({
                requestType: "Access",
                subjectEmail: "",
                subjectName: "",
                dueDate: "",
                priority: "medium",
                submissionMethod: "manual"
            });
            utils.privacy.getDsarRequests.invalidate();
            utils.privacy.getPrivacyStats.invalidate();
        },
        onError: (err) => {
            toast.error(`Failed to log request: ${err.message}`);
        }
    });

    const handleCreate = () => {
        if (!formData.subjectEmail) {
            toast.error("Subject email is required");
            return;
        }

        createMutation.mutate({
            clientId,
            requestType: formData.requestType,
            subjectEmail: formData.subjectEmail,
            subjectName: formData.subjectName,
            dueDate: formData.dueDate,
            priority: formData.priority,
            submissionMethod: formData.submissionMethod
        });
    };

    return (
        <PrivacyLayout clientId={clientId}>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Data Subject Access Requests (DSAR)</h1>
                        <p className="text-muted-foreground">Manage and track data subject requests (access, deletion, rectification).</p>
                    </div>
                    <Button onClick={() => setCreateOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" /> Log Request
                    </Button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center p-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="rounded-md border bg-white shadow-sm">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Request ID</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Subject</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Date Filed</TableHead>
                                    <TableHead>Priority</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {requests && requests.length > 0 ? (
                                    requests.map((req) => (
                                        <TableRow key={req.id} className="hover:bg-slate-50 transition-colors">
                                            <TableCell className="font-medium">{req.requestId}</TableCell>
                                            <TableCell>{req.requestType}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium">{req.subjectName || 'Unknown'}</span>
                                                    <span className="text-xs text-muted-foreground">{req.subjectEmail}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={req.status === 'Completed' ? 'default' : req.status === 'New' ? 'secondary' : 'outline'}>
                                                    {req.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{new Date(req.requestDate).toLocaleDateString()}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={req.priority === 'high' ? 'text-red-600 border-red-200 bg-red-50' : ''}>
                                                    {req.priority}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center justify-center space-y-2">
                                                <div className="p-4 bg-muted/30 rounded-full">
                                                    <Users className="h-8 w-8 text-muted-foreground/50" />
                                                </div>
                                                <p>No requests pending.</p>
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
                    title="Log New DSAR"
                    description="Record a new data subject access request."
                    primaryAction={{
                        label: createMutation.isLoading ? "Logging..." : "Log Request",
                        onClick: handleCreate,
                        disabled: createMutation.isLoading
                    }}
                >
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="reqType">Request Type</Label>
                            <Select
                                value={formData.requestType}
                                onValueChange={(val) => setFormData({ ...formData, requestType: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Access">Access (Right to know)</SelectItem>
                                    <SelectItem value="Deletion">Deletion (Right to be forgotten)</SelectItem>
                                    <SelectItem value="Rectification">Rectification (Correction)</SelectItem>
                                    <SelectItem value="Portability">Portability</SelectItem>
                                    <SelectItem value="Restriction">Restriction of Processing</SelectItem>
                                    <SelectItem value="Objection">Objection</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="email">Subject Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="user@example.com"
                                value={formData.subjectEmail}
                                onChange={(e) => setFormData({ ...formData, subjectEmail: e.target.value })}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="name">Subject Name</Label>
                            <Input
                                id="name"
                                placeholder="John Doe"
                                value={formData.subjectName}
                                onChange={(e) => setFormData({ ...formData, subjectName: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="priority">Priority</Label>
                                <Select
                                    value={formData.priority}
                                    onValueChange={(val) => setFormData({ ...formData, priority: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="method">Submission Method</Label>
                                <Select
                                    value={formData.submissionMethod}
                                    onValueChange={(val) => setFormData({ ...formData, submissionMethod: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="email">Email</SelectItem>
                                        <SelectItem value="web_form">Web Form</SelectItem>
                                        <SelectItem value="manual">Manual Entry</SelectItem>
                                        <SelectItem value="phone">Phone</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="dueDate">Due Date</Label>
                            <Input
                                id="dueDate"
                                type="date"
                                value={formData.dueDate}
                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                            />
                        </div>
                    </div>
                </EnhancedDialog>
            </div>
        </PrivacyLayout>
    );
}
