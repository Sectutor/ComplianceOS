import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@complianceos/ui/ui/dialog";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { Label } from "@complianceos/ui/ui/label";
import {
    ShieldCheck,
    CheckCircle2,
    AlertCircle,
    FileCheck,
    Lock,
    ExternalLink,
    Clock,
    UserCheck,
    Sparkles
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { RoadmapMonth } from '@/data/frameworkRoadmaps';
import { cn } from '@/lib/utils';

interface MilestoneGateModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientId: number;
    frameworkId: string;
    month: RoadmapMonth;
    taskProof: Record<string, { hasProof: boolean; value: number; label: string }>;
    gateData?: any;
    onGatePassed?: () => void;
}

export function MilestoneGateModal({
    isOpen,
    onClose,
    clientId,
    frameworkId,
    month,
    taskProof,
    gateData,
    onGatePassed
}: MilestoneGateModalProps) {
    const [signOffNotes, setSignOffNotes] = useState(gateData?.notes || '');
    const [signerRole, setSignerRole] = useState(gateData?.signerRole || 'Lead Implementer / CISO');
    const [attestationConfirmed, setAttestationConfirmed] = useState(false);

    const utils = trpc.useUtils();

    const passGateMutation = trpc.frameworkRoadmapGates.passMilestoneGate.useMutation({
        onSuccess: (res) => {
            toast.success(res.message);
            utils.frameworkRoadmapGates.getMilestoneGates.invalidate({ clientId, frameworkId });
            if (onGatePassed) onGatePassed();
            onClose();
        },
        onError: (err) => {
            toast.error("Failed to pass milestone gate: " + err.message);
        }
    });

    const isAlreadyPassed = !!gateData?.passed;

    // Calculate evidence score
    const tasks = month.tasks;
    const verifiedTasksCount = tasks.filter(t => taskProof[t.id]?.hasProof).length;
    const allTelemetryVerified = verifiedTasksCount === tasks.length;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isAlreadyPassed) return;

        if (!attestationConfirmed) {
            toast.warning("Please confirm the regulatory attestation checkbox before signing off.");
            return;
        }

        // Build telemetry evidence snapshot
        const evidenceSnapshot: Record<string, any> = {};
        for (const t of tasks) {
            evidenceSnapshot[t.id] = taskProof[t.id] || { hasProof: false, label: 'Manual Attestation' };
        }

        passGateMutation.mutate({
            clientId,
            frameworkId,
            month: month.month,
            monthTitle: month.title,
            signOffNotes,
            signerRole,
            attestationConfirmed: true,
            evidenceSnapshot
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader className="space-y-2 border-b pb-4">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={cn("font-bold text-xs", month.badgeColor)}>
                            {month.badgeText}
                        </Badge>
                        <Badge variant="outline" className="text-xs font-semibold">
                            {month.clauseRef}
                        </Badge>
                        {isAlreadyPassed ? (
                            <Badge className="bg-emerald-600 text-white font-bold text-xs flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Gate Passed & Locked
                            </Badge>
                        ) : (
                            <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold text-xs">
                                Formal Audit Milestone Gate
                            </Badge>
                        )}
                    </div>
                    <DialogTitle className="text-xl font-bold text-foreground">
                        {isAlreadyPassed ? "Milestone Gate Sign-Off Dossier" : `Review & Pass Month ${month.month} Milestone Gate`}
                    </DialogTitle>
                    <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                        {isAlreadyPassed
                            ? "This milestone has been formally verified and locked into the permanent audit trail."
                            : "Conduct the automated pre-flight evidence scan, document any implementation notes, and formally sign off on this milestone."}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-6">
                    {/* Live Telemetry Pre-Flight Evidence Scan */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-primary" />
                                Database Telemetry Pre-Flight Verification
                            </h4>
                            <span className="text-xs font-semibold text-muted-foreground">
                                {verifiedTasksCount} of {tasks.length} Verified in Database
                            </span>
                        </div>

                        <div className="bg-muted/40 border border-border rounded-xl p-4 space-y-3">
                            {tasks.map((task) => {
                                const proof = taskProof[task.id];
                                const hasProof = !!proof?.hasProof;

                                return (
                                    <div key={task.id} className="flex items-start justify-between gap-3 text-xs">
                                        <div className="flex items-start gap-2 flex-1 min-w-0">
                                            {hasProof ? (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                            ) : (
                                                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-foreground truncate">{task.title}</div>
                                                <div className="text-muted-foreground text-[11px] mt-0.5">
                                                    {proof?.label || "Requires manual attestation or external evidence"}
                                                </div>
                                            </div>
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className={cn("text-[10px] shrink-0 font-bold", hasProof ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200")}
                                        >
                                            {hasProof ? "Live Proof" : "External Rationale"}
                                        </Badge>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Locked Gate Sign-Off Details (If already passed) */}
                    {isAlreadyPassed ? (
                        <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-3">
                            <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                                <Lock className="w-4 h-4 text-emerald-600" />
                                Official Milestone Pass Record
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-xs text-emerald-900">
                                <div>
                                    <span className="text-emerald-700 block text-[10px] uppercase font-bold">Passed On</span>
                                    <span className="font-semibold">{new Date(gateData.passedAt).toLocaleString()}</span>
                                </div>
                                <div>
                                    <span className="text-emerald-700 block text-[10px] uppercase font-bold">Signatory</span>
                                    <span className="font-semibold">{gateData.passedBy} ({gateData.signerRole})</span>
                                </div>
                            </div>
                            {gateData.notes && (
                                <div className="text-xs pt-2 border-t border-emerald-200/60">
                                    <span className="text-emerald-700 block text-[10px] uppercase font-bold mb-0.5">Audit Remarks</span>
                                    <p className="text-emerald-950 font-medium italic">"{gateData.notes}"</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Milestone Gate Sign-Off Form */
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="signerRole" className="text-xs font-bold text-foreground">
                                    Signatory Role & Capacity
                                </Label>
                                <select
                                    id="signerRole"
                                    value={signerRole}
                                    onChange={(e) => setSignerRole(e.target.value)}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                >
                                    <option value="Lead Implementer / CISO">Lead Implementer / CISO</option>
                                    <option value="External Compliance Consultant (MSP)">External Compliance Consultant (MSP)</option>
                                    <option value="Data Protection Officer (DPO)">Data Protection Officer (DPO)</option>
                                    <option value="Internal Auditor">Internal Auditor</option>
                                    <option value="Executive Management / CEO">Executive Management / CEO</option>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="notes" className="text-xs font-bold text-foreground">
                                    Audit Justification & Implementation Notes (Optional)
                                </Label>
                                <Textarea
                                    id="notes"
                                    value={signOffNotes}
                                    onChange={(e) => setSignOffNotes(e.target.value)}
                                    placeholder="e.g. Scoping documents approved by executive committee; all 5 cloud repositories classified in production."
                                    className="text-xs h-20 resize-none"
                                />
                            </div>

                            <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 flex items-start gap-3">
                                <input
                                    type="checkbox"
                                    id="attestCheck"
                                    checked={attestationConfirmed}
                                    onChange={(e) => setAttestationConfirmed(e.target.checked)}
                                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary mt-0.5 shrink-0 cursor-pointer"
                                />
                                <label htmlFor="attestCheck" className="text-xs leading-relaxed text-foreground cursor-pointer select-none">
                                    <span className="font-bold">Formal Regulatory Attestation: </span>
                                    I formally attest that the controls and documentation for this milestone phase have been evaluated and verified to satisfy regulatory criteria.
                                </label>
                            </div>

                            <DialogFooter className="pt-2">
                                <Button type="button" variant="ghost" size="sm" onClick={onClose} className="text-xs font-semibold">
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    size="sm"
                                    disabled={passGateMutation.isPending || !attestationConfirmed}
                                    className="bg-primary text-primary-foreground font-bold text-xs shadow-sm"
                                >
                                    {passGateMutation.isPending ? "Recording Sign-Off..." : "Sign & Pass Milestone Gate"}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
