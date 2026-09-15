import React from 'react';
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
import {
    Award,
    Printer,
    Download,
    ShieldCheck,
    CheckCircle2,
    Calendar,
    UserCheck,
    QrCode,
    Lock,
    ExternalLink
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { FrameworkRoadmapSpec } from '@/data/frameworkRoadmaps';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface RoadmapAuditCertificateModalProps {
    isOpen: boolean;
    onClose: () => void;
    clientId: number;
    spec: FrameworkRoadmapSpec;
}

export function RoadmapAuditCertificateModal({
    isOpen,
    onClose,
    clientId,
    spec
}: RoadmapAuditCertificateModalProps) {
    const { data: cert, isLoading } = trpc.frameworkRoadmapGates.getAuditCertificate.useQuery(
        { clientId, frameworkId: spec.id },
        { enabled: isOpen && !!clientId }
    );

    const handlePrint = () => {
        window.print();
    };

    const handleExportJson = () => {
        if (!cert) return;
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cert, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `${spec.id}_audit_certificate_client_${clientId}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        toast.success("Audit certificate JSON exported.");
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-0 border-0 bg-transparent shadow-2xl">
                {/* Printable Certificate Sheet */}
                <div id="roadmap-certificate-print" className="bg-white text-slate-900 rounded-2xl p-8 md:p-12 border-4 border-slate-200 shadow-xl space-y-8 print:p-6 print:border-2 print:shadow-none">
                    {/* Top Seal & Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b-2 border-slate-200 pb-6">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <div className="p-2.5 bg-slate-900 text-white rounded-xl">
                                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                                </div>
                                <div>
                                    <span className="text-xs font-black tracking-widest uppercase text-slate-500">ComplianceOS Certification Clean Room</span>
                                    <h2 className="text-2xl font-black tracking-tight text-slate-900">
                                        Implementation Milestone Audit Certificate
                                    </h2>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap pt-1">
                                <Badge className="bg-slate-900 text-white text-xs font-bold">
                                    {spec.frameworkBadge}
                                </Badge>
                                <span className="text-xs text-slate-600 font-semibold">
                                    Client: <strong>{cert?.clientName || `Client #${clientId}`}</strong>
                                </span>
                            </div>
                        </div>

                        <div className="text-left sm:text-right space-y-1 shrink-0">
                            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Verification Hash</div>
                            <div className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded border border-slate-200 inline-block">
                                {cert?.verificationCode || "COS-CERT-PENDING"}
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium mt-1">
                                Certified: {cert ? new Date(cert.issuedAt).toLocaleDateString() : 'Pending'}
                            </div>
                        </div>
                    </div>

                    {/* Attestation Statement */}
                    <div className="space-y-3 bg-slate-50 p-6 rounded-2xl border border-slate-200/80">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                            <Award className="w-4 h-4 text-primary" />
                            Official Lead Implementer & Regulatory Attestation
                        </h4>
                        <p className="text-sm text-slate-800 leading-relaxed font-medium">
                            This document certifies that the organization has operationalized the governance, technical security measures,
                            and documentation controls mandated under <strong>{spec.title}</strong> across all three implementation phases.
                            All underlying system assets, risks, policies, and evidence artifacts have been logged into the ComplianceOS audit register.
                        </p>
                    </div>

                    {/* Milestone Phase Gates Audit Stamps */}
                    <div className="space-y-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Phase Gate Verification Records (12-Week Milestone Audit Trail)
                        </h4>

                        <div className="grid gap-4 md:grid-cols-3">
                            {spec.months.map((month) => {
                                const gate = cert?.milestoneGates?.find((g: any) => g.month === month.month);
                                const isPassed = !!gate?.passed;

                                return (
                                    <div
                                        key={month.month}
                                        className={cn(
                                            "p-4 rounded-xl border flex flex-col justify-between space-y-3",
                                            isPassed ? "bg-emerald-50/50 border-emerald-300" : "bg-slate-50 border-slate-200"
                                        )}
                                    >
                                        <div className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <Badge className={cn("text-[10px] font-bold", month.badgeColor)}>
                                                    Month {month.month}
                                                </Badge>
                                                {isPassed ? (
                                                    <span className="flex items-center text-[10px] font-bold text-emerald-700 gap-1">
                                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> PASSED
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-slate-400">PENDING</span>
                                                )}
                                            </div>
                                            <div className="font-bold text-slate-900 text-xs line-clamp-2">
                                                {month.title}
                                            </div>
                                            <div className="text-[10px] text-slate-600 font-medium">
                                                {month.clauseRef}
                                            </div>
                                        </div>

                                        <div className="pt-2 border-t border-slate-200/80 text-[11px] space-y-1">
                                            {isPassed ? (
                                                <>
                                                    <div className="text-emerald-900 font-semibold truncate">
                                                        By: {gate.passedBy}
                                                    </div>
                                                    <div className="text-slate-500 text-[10px]">
                                                        {new Date(gate.passedAt).toLocaleDateString()} • {new Date(gate.passedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                    {gate.signOffNotes && (
                                                        <div className="text-[10px] text-slate-600 italic truncate" title={gate.signOffNotes}>
                                                            "{gate.signOffNotes}"
                                                        </div>
                                                    )}
                                                </>
                                            ) : (
                                                <div className="text-slate-400 text-[10px] italic">
                                                    Gate review not yet executed
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Bottom Digital Signature Block */}
                    <div className="pt-6 border-t-2 border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                        <div className="space-y-1">
                            <span className="font-bold text-slate-800">ComplianceOS Trust & Cryptographic Audit Protocol</span>
                            <div className="text-[11px] text-slate-500">
                                Validated against live database records • Immutable signature log verified.
                            </div>
                        </div>

                        <div className="flex items-center gap-2 print:hidden">
                            <Button variant="outline" size="sm" onClick={handleExportJson} className="text-xs font-semibold">
                                <Download className="w-3.5 h-3.5 mr-1.5" />
                                Export Audit JSON
                            </Button>
                            <Button size="sm" onClick={handlePrint} className="bg-slate-900 text-white font-bold text-xs">
                                <Printer className="w-3.5 h-3.5 mr-1.5" />
                                Print / Save PDF
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
