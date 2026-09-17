import React, { useState } from 'react';
import { useClientContext } from "@/contexts/ClientContext";
import { Link, useParams } from "wouter";
import { Button } from "@complianceos/ui/ui/button";
import {
    ArrowLeft, Users, Clock, CheckCircle2, ShieldCheck,
    Database, Copy, FileText, Loader2, AlertTriangle, Send
} from "lucide-react";
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Badge } from "@complianceos/ui/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { Checkbox } from "@complianceos/ui/ui/checkbox";
import { toast } from "sonner";

export default function DsarDetail() {
    const { selectedClientId } = useClientContext();
    const clientId = selectedClientId || 0;
    const params = useParams<{ dsarId: string }>();
    const dsarId = params.dsarId ? parseInt(params.dsarId) : 0;

    const utils = trpc.useUtils();
    const { data: dsar, isLoading: dsarLoading } = trpc.privacy.getDsarRequest.useQuery(
        { clientId, id: dsarId },
        { enabled: !!clientId && !!dsarId }
    );

    const { data: inventory } = trpc.privacy.getInventory.useQuery(
        { clientId },
        { enabled: !!clientId }
    );

    const [checkedAssets, setCheckedAssets] = useState<Record<number, boolean>>({});
    const [resolutionNotes, setResolutionNotes] = useState("");
    const [status, setStatus] = useState<string>("");

    // Update status mutation
    const updateStatusMutation = trpc.privacy.updateDsarStatus.useMutation({
        onSuccess: () => {
            toast.success("DSAR case updated successfully");
            utils.privacy.getDsarRequest.invalidate({ clientId, id: dsarId });
            utils.privacy.getDsarRequests.invalidate({ clientId });
        },
        onError: (err: any) => toast.error(`Failed: ${err.message}`)
    });

    const toggleAsset = (assetId: number) => {
        setCheckedAssets(prev => ({
            ...prev,
            [assetId]: !prev[assetId]
        }));
    };

    const handleStatusChange = (newStatus: string) => {
        setStatus(newStatus);
        updateStatusMutation.mutate({
            clientId,
            id: dsarId,
            status: newStatus as any,
            rejectionReason: resolutionNotes || undefined
        });
    };

    const copyFulfillmentLetter = () => {
        const letter = `CONFIRMATION OF DATA SUBJECT REQUEST RESOLUTION (GDPR / CCPA)\n` +
            `===============================================================\n` +
            `Request ID: ${dsar?.requestId || 'N/A'}\n` +
            `Subject: ${dsar?.subjectName || 'Customer'} (${dsar?.subjectEmail || 'N/A'})\n` +
            `Request Type: ${dsar?.requestType || 'Erasure / Access'}\n` +
            `Resolution Date: ${new Date().toLocaleDateString()}\n\n` +
            `Dear ${dsar?.subjectName || 'Customer'},\n\n` +
            `We write to confirm that your data subject request submitted on ${dsar?.requestDate ? new Date(dsar.requestDate).toLocaleDateString() : 'recently'} has been fully completed.\n\n` +
            `Actions Taken:\n` +
            `- Verified subject identity & authorization\n` +
            `- Discovery and purge/export across all ${inventory?.length || 0} active organizational data repositories\n` +
            `- Notified relevant subprocessors where applicable\n\n` +
            `If you have any questions, please contact our Data Protection Officer at dpo@complianceos-client.internal.\n\n` +
            `Sincerely,\nData Protection Office`;

        navigator.clipboard.writeText(letter);
        toast.success("Fulfillment confirmation letter copied to clipboard!");
    };

    if (dsarLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-24 space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-brand-bright" />
                <p className="text-slate-400 font-medium animate-pulse">Loading DSAR Case Dossier...</p>
            </div>
        );
    }

    if (!dsar) {
        return (
            <div className="p-12 text-center space-y-4 animate-in fade-in duration-500">
                <div className="mx-auto h-20 w-20 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300">
                    <AlertTriangle className="h-10 w-10" />
                </div>
                <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-slate-900">DSAR Case Not Found</h2>
                    <p className="text-slate-500 max-w-sm mx-auto">The requested data subject request could not be located.</p>
                </div>
                <Link href={`/clients/${clientId}/privacy/dsar`}>
                    <Button variant="link" className="text-brand-bright font-bold">Return to DSAR Portal</Button>
                </Link>
            </div>
        );
    }

    const currentStatus = status || dsar.status || 'New';
    const requestDate = dsar.requestDate ? new Date(dsar.requestDate) : new Date();
    const deadlineDate = new Date(requestDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const daysLeft = Math.round((deadlineDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Top Bar */}
            <div className="flex flex-col gap-4">
                <Link href={`/clients/${clientId}/privacy/dsar`}>
                    <Button variant="ghost" className="w-fit pl-0 text-slate-500 hover:text-brand-bright hover:bg-transparent font-bold transition-colors">
                        <ArrowLeft className="mr-2 h-5 w-5" /> Back to DSAR Portal
                    </Button>
                </Link>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{dsar.requestId}</h1>
                            <Badge className="bg-brand/10 text-brand font-bold uppercase text-[10px] px-3 py-1">
                                {dsar.requestType}
                            </Badge>
                        </div>
                        <p className="text-slate-500 text-lg">
                            Subject: <span className="font-semibold text-slate-700">{dsar.subjectName}</span> ({dsar.subjectEmail})
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={copyFulfillmentLetter}
                            className="border-slate-300 hover:border-brand-bright text-slate-700 font-bold h-11 px-4 rounded-xl"
                        >
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Confirmation Notice
                        </Button>
                        <Button
                            onClick={() => handleStatusChange("Completed")}
                            disabled={updateStatusMutation.isLoading || currentStatus === 'Completed'}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11 px-5 rounded-xl shadow-lg shadow-emerald-100 transition-all active:scale-95"
                        >
                            <ShieldCheck className="mr-2 h-5 w-5" />
                            {currentStatus === 'Completed' ? 'Case Fulfilled' : 'Mark as Fulfilled'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* 30-Day Legal Deadline Banner */}
            <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 font-bold">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <h4 className="font-bold text-amber-950 text-base">GDPR Article 12(3) 30-Day Response Window</h4>
                        <p className="text-xs text-amber-800">
                            Filed on {requestDate.toLocaleDateString()} • Statutory deadline: {deadlineDate.toLocaleDateString()}
                        </p>
                    </div>
                </div>
                <Badge className={daysLeft <= 5 ? "bg-rose-600 text-white font-bold" : "bg-amber-600 text-white font-bold"}>
                    {daysLeft > 0 ? `${daysLeft} Days Remaining` : 'Deadline Exceeded'}
                </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left 2 Cols: Cross-Asset Discovery & Purge Checklist */}
                <div className="lg:col-span-2 space-y-6">
                    <Card className="border-none shadow-xl shadow-slate-200/50 rounded-2xl bg-white ring-1 ring-slate-200/50 overflow-hidden">
                        <CardHeader className="bg-slate-50 border-b border-slate-100">
                            <CardTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <Database className="w-5 h-5 text-brand-bright" />
                                Cross-Asset Discovery & Purge Checklist
                            </CardTitle>
                            <CardDescription>
                                Verify that subject records have been extracted or erased across all active organizational data repositories.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            {inventory && inventory.length > 0 ? (
                                <div className="divide-y divide-slate-100">
                                    {inventory.map((asset: any) => (
                                        <div key={asset.id} className="py-3.5 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <Checkbox
                                                    id={`asset-${asset.id}`}
                                                    checked={checkedAssets[asset.id] || false}
                                                    onCheckedChange={() => toggleAsset(asset.id)}
                                                />
                                                <div>
                                                    <label
                                                        htmlFor={`asset-${asset.id}`}
                                                        className="font-bold text-sm text-slate-900 cursor-pointer block hover:text-brand-bright transition-colors"
                                                    >
                                                        {asset.name}
                                                    </label>
                                                    <span className="text-xs text-slate-400">
                                                        {asset.category || 'Data Store'} • {asset.dataFormat || 'Structured'} • {asset.location || 'Cloud'}
                                                    </span>
                                                </div>
                                            </div>
                                            <Badge className="bg-slate-100 text-slate-600 text-[10px] font-bold">
                                                {asset.criticality || 'Medium'}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-slate-400 text-sm">
                                    No data assets found in inventory. Add assets in Data Inventory to generate automated discovery checklists.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Case Description & Details */}
                    <Card className="border-none shadow-xl shadow-slate-200/50 rounded-2xl bg-white ring-1 ring-slate-200/50">
                        <CardHeader className="bg-slate-50 border-b border-slate-100">
                            <CardTitle className="text-lg font-bold text-slate-900">Request Scope & Specific Instructions</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-700 border border-slate-200 font-medium leading-relaxed">
                                {dsar.details || "The subject requested complete erasure and account termination under GDPR Article 17."}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right 1 Col: Workflow Management */}
                <div className="space-y-6">
                    <Card className="border-none shadow-xl shadow-slate-200/50 rounded-2xl bg-white ring-1 ring-slate-200/50">
                        <CardHeader className="bg-slate-50 border-b border-slate-100">
                            <CardTitle className="text-base font-bold text-slate-900">Workflow Status</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Current Stage</label>
                                <Select
                                    value={currentStatus}
                                    onValueChange={handleStatusChange}
                                >
                                    <SelectTrigger className="rounded-xl h-11 border-slate-200">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="New">New Request</SelectItem>
                                        <SelectItem value="In Progress">In Progress (Discovery)</SelectItem>
                                        <SelectItem value="Pending Approval">Pending DPO Approval</SelectItem>
                                        <SelectItem value="Completed">Completed & Dispatched</SelectItem>
                                        <SelectItem value="Rejected">Rejected / Exempt</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2 pt-2">
                                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">DPO Notes</label>
                                <Textarea
                                    rows={4}
                                    placeholder="Internal resolution notes..."
                                    value={resolutionNotes}
                                    onChange={(e) => setResolutionNotes(e.target.value)}
                                    className="rounded-xl text-xs"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

