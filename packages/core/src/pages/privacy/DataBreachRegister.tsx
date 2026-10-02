import React, { useState } from 'react';
import { useClientContext } from "@/contexts/ClientContext";
import { Button } from "@complianceos/ui/ui/button";
import { Plus, AlertTriangle, Loader2, Clock, ShieldAlert, CheckCircle2, FileText, Copy, Trash2, ArrowRight } from "lucide-react";
import { trpc } from '@/lib/trpc';
import { EnhancedDialog } from "@complianceos/ui/ui/enhanced-dialog";
import { Input } from "@complianceos/ui/ui/input";
import { Label } from "@complianceos/ui/ui/label";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";
import { toast } from "sonner";
import { Badge } from "@complianceos/ui/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@complianceos/ui/ui/table";
import { cn } from "@/lib/utils";

// data_breaches.status enum (schema/common.ts): open | investigating | reported | closed
const BREACH_STATUSES = [
    { value: "open", label: "Logged / Open" },
    { value: "investigating", label: "Under Active Triage" },
    { value: "reported", label: "DPA Notified (Art. 33)" },
    { value: "closed", label: "Investigation Closed & Remediated" },
];

export default function DataBreachRegister() {
    const { selectedClientId } = useClientContext();
    const clientId = selectedClientId || 0;
    const [createOpen, setCreateOpen] = useState(false);
    const [triageOpen, setTriageOpen] = useState(false);
    const [selectedBreach, setSelectedBreach] = useState<any>(null);

    const [formData, setFormData] = useState({
        title: "",
        occurredAt: new Date().toISOString().split('T')[0],
        severity: "medium",
        description: "",
        affectedCategories: "Customer names, emails, IP addresses",
        estimatedSubjects: "50-500",
        containmentStatus: "contained"
    });

    const [triageForm, setTriageForm] = useState({
        status: "investigating",
        dpaNotified: "no",
        subjectsNotified: "no",
        rootCause: "",
        mitigationActions: "Rotated API keys, enabled MFA, patched vulnerability",
        dpaNotificationText: ""
    });

    const utils = trpc.useUtils();
    const { data: breaches, isLoading } = trpc.dataBreaches.list.useQuery({ clientId }, { enabled: !!clientId });

    const invalidate = () => {
        utils.dataBreaches.list.invalidate({ clientId });
        utils.privacy.getPrivacyStats.invalidate();
    };

    const createMutation = trpc.dataBreaches.create.useMutation({
        onSuccess: () => {
            toast.success("Incident Logged Successfully");
            setCreateOpen(false);
            setFormData({
                title: "",
                occurredAt: new Date().toISOString().split('T')[0],
                severity: "medium",
                description: "",
                affectedCategories: "Customer names, emails, IP addresses",
                estimatedSubjects: "50-500",
                containmentStatus: "contained"
            });
            invalidate();
        },
        onError: (err: any) => toast.error(`Failed to log breach: ${err.message}`)
    });

    const updateMutation = trpc.dataBreaches.update.useMutation({
        onSuccess: () => {
            toast.success("Breach Triage & Assessment Updated");
            setTriageOpen(false);
            setSelectedBreach(null);
            invalidate();
        },
        onError: (err: any) => toast.error(`Failed to update: ${err.message}`)
    });

    const deleteMutation = trpc.dataBreaches.delete.useMutation({
        onSuccess: () => {
            toast.success("Incident Archived");
            invalidate();
        },
        onError: (err: any) => toast.error(`Failed to delete: ${err.message}`)
    });

    const handleCreate = () => {
        if (!formData.title.trim() || !formData.occurredAt) {
            toast.error("Title and Date are required");
            return;
        }

        // Structured fields without dedicated columns ride in `metadata`; the
        // required text columns carry the narrative (description/effects/remediation).
        createMutation.mutate({
            clientId,
            description: formData.description || formData.title,
            effects: `${formData.affectedCategories} — approx. ${formData.estimatedSubjects} data subjects affected`,
            remedialActions: `Initial containment: ${formData.containmentStatus.replace('_', ' ')}`,
            dateOccurred: formData.occurredAt,
            dateDetected: formData.occurredAt,
            isNotifiableToDpa: formData.severity === "critical" || formData.severity === "high",
            isNotifiableToSubjects: false,
            status: "open",
            metadata: {
                title: formData.title.trim(),
                severity: formData.severity,
                affectedCategories: formData.affectedCategories,
                estimatedSubjects: formData.estimatedSubjects,
                containmentStatus: formData.containmentStatus
            }
        });
    };

    const handleOpenTriage = (breach: any) => {
        setSelectedBreach(breach);
        const meta = breach.metadata || {};
        setTriageForm({
            status: breach.status || "investigating",
            dpaNotified: breach.dateReportedToDpa || breach.isNotifiableToDpa && breach.status === 'reported' ? "yes" : "no",
            subjectsNotified: breach.dateReportedToDataSubjects ? "yes" : "no",
            rootCause: meta.rootCause || "",
            mitigationActions: breach.remedialActions || "Rotated API keys, isolated affected endpoint, revoked active session tokens",
            dpaNotificationText: `FORMAL GDPR ARTICLE 33 DATA BREACH NOTIFICATION\n\nOrganization: Client #${clientId}\nIncident: ${meta.title || 'Data Breach'}\nDate Detected: ${breach.dateDetected ? new Date(breach.dateDetected).toLocaleDateString() : 'N/A'}\n\n1. Nature of the Personal Data Breach:\n${breach.description || 'Suspected unauthorized access to personal data.'}\n\n2. Categories & Approximate Number of Data Subjects:\nCategories: ${meta.affectedCategories || 'General PII'}\nEstimated Subjects: ${meta.estimatedSubjects || 'Under investigation'}\n\n3. Measures Taken to Address the Breach:\n${breach.remedialActions || 'Immediate containment and system hardening.'}\n\n4. Contact Point for Data Protection Officer (DPO):\ndpo@complianceos-client.internal`
        });
        setTriageOpen(true);
    };

    const handleSaveTriage = () => {
        if (!selectedBreach) return;
        const meta = selectedBreach.metadata || {};
        const wasReportedToDpa = !!selectedBreach.dateReportedToDpa;
        const wasReportedToSubjects = !!selectedBreach.dateReportedToDataSubjects;

        updateMutation.mutate({
            id: selectedBreach.id,
            clientId,
            status: triageForm.status as any,
            remedialActions: triageForm.mitigationActions,
            isNotifiableToDpa: triageForm.dpaNotified === "yes",
            isNotifiableToSubjects: triageForm.subjectsNotified === "yes",
            // Stamp notification timestamps the first time each notification is confirmed
            ...(triageForm.dpaNotified === "yes" && !wasReportedToDpa ? { dateReportedToDpa: new Date().toISOString() } : {}),
            ...(triageForm.subjectsNotified === "yes" && !wasReportedToSubjects ? { dateReportedToDataSubjects: new Date().toISOString() } : {}),
            metadata: { ...meta, rootCause: triageForm.rootCause }
        });
    };

    const copyDpaLetter = () => {
        navigator.clipboard.writeText(triageForm.dpaNotificationText);
        toast.success("GDPR Art. 33 Notification Letter copied to clipboard!");
    };

    // 72h clock runs from the persisted detection timestamp
    const calculateTimeRemaining = (breach: any) => {
        const dateStr = breach?.dateDetected || breach?.dateOccurred;
        if (!dateStr) return { label: "72h Deadline Pending", isOverdue: false, hoursLeft: 72 };
        const eventTime = new Date(dateStr).getTime();
        const deadline = eventTime + (72 * 60 * 60 * 1000);
        const diffMs = deadline - Date.now();
        const hoursLeft = Math.round(diffMs / (1000 * 60 * 60));

        if (hoursLeft <= 0) {
            return { label: `Deadline Expired (${Math.abs(hoursLeft)}h ago)`, isOverdue: true, hoursLeft };
        }
        return { label: `${hoursLeft} hours remaining to notify DPA`, isOverdue: false, hoursLeft };
    };

    const statusBadge = (status: string) => {
        switch (status) {
            case 'closed': return "bg-emerald-100 text-emerald-700";
            case 'reported': return "bg-indigo-100 text-indigo-700";
            case 'investigating': return "bg-sky-100 text-sky-800";
            default: return "bg-amber-100 text-amber-700";
        }
    };

    const statusLabel = (status: string) =>
        BREACH_STATUSES.find(s => s.value === status)?.label || status;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
                        <ShieldAlert className="w-8 h-8 text-rose-600" />
                        Data Breach Register & 72-Hour Response Center
                    </h1>
                    <p className="text-slate-500 text-lg">
                        Log, triage, and manage personal data breaches under GDPR Articles 33 & 34 and NIS2 incident reporting.
                    </p>
                </div>
                <Button
                    className="bg-rose-600 hover:bg-rose-700 text-white font-bold h-11 px-6 rounded-xl shadow-lg shadow-rose-100 transition-all active:scale-95"
                    onClick={() => setCreateOpen(true)}
                >
                    <Plus className="mr-2 h-5 w-5" /> Report Security Incident
                </Button>
            </div>

            {/* Incident Register Table */}
            <div className="rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden bg-white">
                <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-400" />
                        Active Breach Investigations
                    </h3>
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full">
                        {breaches?.length || 0} Recorded Incidents
                    </span>
                </div>
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow className="border-0">
                            <TableHead className="font-bold text-slate-700 h-14">Incident Title</TableHead>
                            <TableHead className="font-bold text-slate-700 h-14">Severity & Risk</TableHead>
                            <TableHead className="font-bold text-slate-700 h-14">72-Hour DPA Clock</TableHead>
                            <TableHead className="font-bold text-slate-700 h-14">Status</TableHead>
                            <TableHead className="text-right font-bold text-slate-700 h-14 px-6">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-32 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <Loader2 className="h-8 w-8 animate-spin text-brand-bright" />
                                        <span className="text-sm font-medium text-slate-400">Loading incident history...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : breaches && breaches.length > 0 ? (
                            (breaches as any[]).map((b, idx) => {
                                const meta = b.metadata || {};
                                const clock = calculateTimeRemaining(b);
                                const isCritical = meta.severity === 'critical' || meta.severity === 'high';

                                return (
                                    <TableRow
                                        key={b.id}
                                        className="hover:bg-slate-50/80 transition-colors group border-b border-slate-100 last:border-0"
                                        style={{ animationDelay: `${idx * 50}ms` }}
                                    >
                                        <TableCell className="py-5 font-bold text-slate-900">
                                            <div className="flex items-center gap-3">
                                                <div className={cn(
                                                    "h-10 w-10 rounded-xl flex items-center justify-center font-bold shrink-0",
                                                    isCritical ? "bg-rose-100 text-rose-600" : "bg-amber-100 text-amber-700"
                                                )}>
                                                    <AlertTriangle className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900 group-hover:text-brand-bright transition-colors">
                                                        {meta.title || b.description?.split('\n')[0] || 'Data Breach'}
                                                    </p>
                                                    <p className="text-xs text-slate-400 font-normal">
                                                        Detected: {b.dateDetected ? new Date(b.dateDetected).toLocaleDateString() : 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-5">
                                            <Badge className={cn(
                                                "border-none font-bold uppercase text-[10px] tracking-wider px-2.5 py-1",
                                                meta.severity === 'critical' ? "bg-rose-600 text-white" :
                                                meta.severity === 'high' ? "bg-rose-100 text-rose-700" :
                                                meta.severity === 'medium' ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"
                                            )}>
                                                {meta.severity || 'UNKNOWN'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-5 text-xs font-semibold">
                                            <span className={cn(
                                                "flex items-center gap-1.5",
                                                clock.isOverdue ? "text-rose-600 font-bold" : "text-amber-600"
                                            )}>
                                                <Clock className="w-3.5 h-3.5" />
                                                {clock.label}
                                            </span>
                                        </TableCell>
                                        <TableCell className="py-5">
                                            <Badge className={cn(
                                                "border-none font-bold uppercase text-[10px] tracking-wider px-2.5 py-1",
                                                statusBadge(b.status)
                                            )}>
                                                {statusLabel(b.status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right py-5 px-6 space-x-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="border-slate-300 hover:border-brand-bright text-slate-700 hover:text-brand-bright font-bold rounded-lg"
                                                onClick={() => handleOpenTriage(b)}
                                            >
                                                Open 72h Triage
                                                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => deleteMutation.mutate({ id: b.id, clientId })}
                                                className="h-8 w-8 text-slate-300 hover:text-rose-600 rounded-lg"
                                                title="Archive"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-64 text-center text-slate-400">
                                    <div className="flex flex-col items-center justify-center space-y-3">
                                        <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600">
                                            <CheckCircle2 className="h-10 w-10" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="font-bold text-slate-900 text-base">Clean Privacy Register</p>
                                            <p className="text-slate-500 text-sm max-w-sm mx-auto">
                                                No security incidents or data breaches logged. Continuous compliance monitoring is active.
                                            </p>
                                        </div>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Log Incident Dialog */}
            <EnhancedDialog
                open={createOpen}
                onOpenChange={setCreateOpen}
                title="Report Personal Data Breach"
                description="Log a suspected or confirmed personal data breach under GDPR Article 33/34."
                size="lg"
                footer={
                    <div className="flex justify-end gap-3 w-full">
                        <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
                        <Button
                            className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                            onClick={handleCreate}
                            disabled={createMutation.isPending}
                        >
                            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Log Security Incident
                        </Button>
                    </div>
                }
            >
                <div className="space-y-4 py-3">
                    <div className="space-y-2">
                        <Label className="font-semibold">Incident Title *</Label>
                        <Input
                            placeholder="e.g., Unencrypted S3 Bucket Exposure / Phishing Credential Leak"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="font-semibold">Date & Time Detected *</Label>
                            <Input
                                type="date"
                                value={formData.occurredAt}
                                onChange={(e) => setFormData({ ...formData, occurredAt: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="font-semibold">Risk & Severity Level</Label>
                            <Select
                                value={formData.severity}
                                onValueChange={(val) => setFormData({ ...formData, severity: val })}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Low - Negligible impact on data subjects</SelectItem>
                                    <SelectItem value="medium">Medium - Limited PII exposed, contained</SelectItem>
                                    <SelectItem value="high">High - High risk to rights (Mandatory DPA)</SelectItem>
                                    <SelectItem value="critical">Critical - Large scale special category data</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="font-semibold">Categories of Personal Data Exposed</Label>
                        <Input
                            placeholder="e.g., Names, email addresses, hashed passwords, financial records"
                            value={formData.affectedCategories}
                            onChange={(e) => setFormData({ ...formData, affectedCategories: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="font-semibold">Estimated Data Subjects</Label>
                            <Select
                                value={formData.estimatedSubjects}
                                onValueChange={(val) => setFormData({ ...formData, estimatedSubjects: val })}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1-50">1 - 50 individuals</SelectItem>
                                    <SelectItem value="50-500">50 - 500 individuals</SelectItem>
                                    <SelectItem value="500-10000">500 - 10,000 individuals</SelectItem>
                                    <SelectItem value="10000+">10,000+ individuals (Large-Scale)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="font-semibold">Containment Status</Label>
                            <Select
                                value={formData.containmentStatus}
                                onValueChange={(val) => setFormData({ ...formData, containmentStatus: val })}
                            >
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="contained">Contained & Isolated</SelectItem>
                                    <SelectItem value="ongoing">Ongoing Investigation</SelectItem>
                                    <SelectItem value="remediated">Fully Remediated</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="font-semibold">Incident Description & Vector</Label>
                        <Textarea
                            placeholder="Describe how the compromise occurred, affected systems, and initial findings..."
                            rows={3}
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>
                </div>
            </EnhancedDialog>

            {/* Detailed 72-Hour Triage & DPA Notification Workspace */}
            {selectedBreach && (
                <EnhancedDialog
                    open={triageOpen}
                    onOpenChange={setTriageOpen}
                    title={`Incident Triage: ${selectedBreach.metadata?.title || 'Data Breach'}`}
                    description="GDPR Article 33/34 Incident Response Protocol & Formal Notification Generator"
                    size="xl"
                    footer={
                        <div className="flex justify-between items-center w-full">
                            <Button variant="outline" onClick={copyDpaLetter} className="text-slate-700 font-bold">
                                <Copy className="w-4 h-4 mr-2" />
                                Copy DPA Letter
                            </Button>
                            <div className="flex gap-2">
                                <Button variant="ghost" onClick={() => setTriageOpen(false)}>Close</Button>
                                <Button
                                    onClick={handleSaveTriage}
                                    disabled={updateMutation.isPending}
                                    className="bg-brand-bright hover:bg-brand text-white font-bold"
                                >
                                    {updateMutation.isPending ? "Saving..." : "Save Triage Record"}
                                </Button>
                            </div>
                        </div>
                    }
                >
                    <div className="space-y-6 pt-2">
                        {/* 72h Banner */}
                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Clock className="w-6 h-6 text-amber-600" />
                                <div>
                                    <h4 className="font-bold text-amber-900 text-sm">GDPR Article 33 72-Hour Notification Timeline</h4>
                                    <p className="text-xs text-amber-700">
                                        {calculateTimeRemaining(selectedBreach).label}
                                    </p>
                                </div>
                            </div>
                            <Badge className="bg-rose-600 text-white font-bold uppercase text-[10px]">
                                Risk Level: {(selectedBreach.metadata?.severity || 'HIGH').toUpperCase()}
                            </Badge>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="font-semibold text-xs text-slate-700">Investigation Status</Label>
                                <Select
                                    value={triageForm.status}
                                    onValueChange={(val) => setTriageForm({ ...triageForm, status: val })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {BREACH_STATUSES.map(s => (
                                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="font-semibold text-xs text-slate-700">Supervisory Authority (DPA) Notified?</Label>
                                <Select
                                    value={triageForm.dpaNotified}
                                    onValueChange={(val) => setTriageForm({ ...triageForm, dpaNotified: val })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="yes">Yes - Formal Notification Dispatched</SelectItem>
                                        <SelectItem value="no">No - Unlikely Risk / Internal Documentation Only</SelectItem>
                                    </SelectContent>
                                </Select>
                                {selectedBreach.dateReportedToDpa && (
                                    <p className="text-[11px] text-emerald-600 font-semibold">
                                        Reported to DPA on {new Date(selectedBreach.dateReportedToDpa).toLocaleString()}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label className="font-semibold text-xs text-slate-700">Data Subjects Notified (Art. 34)?</Label>
                                <Select
                                    value={triageForm.subjectsNotified}
                                    onValueChange={(val) => setTriageForm({ ...triageForm, subjectsNotified: val })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="yes">Yes - Subjects Informed</SelectItem>
                                        <SelectItem value="no">No - Not Required / Pending</SelectItem>
                                    </SelectContent>
                                </Select>
                                {selectedBreach.dateReportedToDataSubjects && (
                                    <p className="text-[11px] text-emerald-600 font-semibold">
                                        Subjects notified on {new Date(selectedBreach.dateReportedToDataSubjects).toLocaleString()}
                                    </p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label className="font-semibold text-xs text-slate-700">Root Cause (Post-Mortem)</Label>
                                <Input
                                    value={triageForm.rootCause}
                                    onChange={(e) => setTriageForm({ ...triageForm, rootCause: e.target.value })}
                                    placeholder="e.g. Misconfigured storage bucket policy / credential phishing"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="font-semibold text-xs text-slate-700">Mitigation & Containment Actions Executed</Label>
                            <Input
                                value={triageForm.mitigationActions}
                                onChange={(e) => setTriageForm({ ...triageForm, mitigationActions: e.target.value })}
                                placeholder="e.g. Rotated API keys, revoked user session tokens, isolated server"
                            />
                        </div>

                        <div className="space-y-2 border-t pt-4">
                            <div className="flex items-center justify-between">
                                <Label className="font-bold text-xs uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                                    <FileText className="w-4 h-4 text-brand-bright" />
                                    Formal Article 33 DPA Notification Letter (Auto-Generated)
                                </Label>
                                <Button variant="ghost" size="sm" onClick={copyDpaLetter} className="text-brand-bright text-xs font-bold h-7">
                                    <Copy className="w-3.5 h-3.5 mr-1" /> Copy Text
                                </Button>
                            </div>
                            <Textarea
                                rows={8}
                                className="font-mono text-xs bg-slate-50 border-slate-200"
                                value={triageForm.dpaNotificationText}
                                onChange={(e) => setTriageForm({ ...triageForm, dpaNotificationText: e.target.value })}
                            />
                        </div>
                    </div>
                </EnhancedDialog>
            )}
        </div>
    );
}
