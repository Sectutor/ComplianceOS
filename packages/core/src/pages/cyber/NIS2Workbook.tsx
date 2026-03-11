
import React, { useState } from 'react';
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useClientContext } from "@/contexts/ClientContext";
// DashboardLayout removed - handled by parent CyberLayout
import { Card, CardContent, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Input } from "@complianceos/ui/ui/input";
import { Shield, ArrowLeft, Search, Gavel, Info, ListChecks, ChevronRight, BookOpen, Download, Sparkles, CheckCircle, Loader2 } from "lucide-react";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@complianceos/ui/ui/accordion";
import { toast } from "sonner";

export default function NIS2Workbook() {
    const { selectedClientId } = useClientContext();
    const [, setLocation] = useLocation();
    const [searchTerm, setSearchTerm] = useState("");

    const { data: rawControls, isLoading: controlsLoading } = trpc.controls.list.useQuery({
        framework: "NIS2"
    }, {
        staleTime: 1000 * 60 * 10 // 10 minutes cache
    });

    const { data: rawClientControls, isLoading: clientLoading, refetch: refetchClientControls } = trpc.clientControls.list.useQuery({
        clientId: selectedClientId || 0,
        framework: "NIS2"
    }, {
        enabled: !!selectedClientId
    });

    const safeUnwrap = (data: any) => {
        if (data && typeof data === 'object' && 'json' in data && Array.isArray(data.json)) {
            return data.json;
        }
        return data;
    };

    const controls = safeUnwrap(rawControls) || [];
    // Filter client controls to ensure we only count actual NIS2 standard controls, 
    // avoiding dupes from other frameworks if they overlap or raw query issues.
    const clientNis2Controls = (safeUnwrap(rawClientControls) || []).filter((c: any) =>
        c.control?.framework === 'NIS2'
    );
    const isAssigned = clientNis2Controls.length > 0;
    const allAssigned = controls.length > 0 && clientNis2Controls.length >= controls.length;

    const bulkAssignMutation = trpc.clientControls.bulkAssign.useMutation({
        onSuccess: (result) => {
            toast.success(result.message || "NIS2 controls successfully assigned to organization.");
            refetchClientControls();
        },
        onError: (err) => toast.error(err.message || "Failed to assign controls.")
    });

    const handleAssignAll = () => {
        if (!selectedClientId) return;
        bulkAssignMutation.mutate({
            clientId: selectedClientId,
            frameworks: ["NIS2"]
        });
    };

    const controlStatusMap = React.useMemo(() => {
        const map: Record<string, any> = {};
        clientNis2Controls.forEach((nc: any) => {
            if (nc.control?.id) {
                map[String(nc.control.id)] = nc.clientControl;
                // Also map by controlId string if available (e.g. "21(2)(a)")
                if (nc.control.controlId) {
                    map[nc.control.controlId] = nc.clientControl;
                }
            }
        });
        return map;
    }, [clientNis2Controls]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'implemented':
                return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 font-bold px-3 py-1 rounded-lg">Implemented</Badge>;
            case 'in_progress':
                return <Badge className="bg-amber-100 text-amber-700 border-amber-200 font-bold px-3 py-1 rounded-lg">In Progress</Badge>;
            case 'not_applicable':
                return <Badge className="bg-slate-100 text-slate-500 border-slate-200 font-bold px-3 py-1 rounded-lg border-dashed">N/A</Badge>;
            default:
                return <Badge className="bg-rose-100 text-rose-700 border-rose-200 font-bold px-3 py-1 rounded-lg">Not Started</Badge>;
        }
    };

    const filteredControls = controls?.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.controlId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.category?.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => a.controlId.localeCompare(b.controlId, undefined, { numeric: true, sensitivity: 'base' }));

    return (
        <div className="space-y-8 pb-20 animate-in fade-in duration-500 w-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-2">
                    <button
                        onClick={() => setLocation(`/clients/${selectedClientId}/cyber`)}
                        className="flex items-center text-sm font-bold text-slate-500 hover:text-sky-600 transition-colors mb-2 group"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                        Back to Cyber Dashboard
                    </button>
                    <h1 className="text-4xl font-black tracking-tight text-slate-900 flex items-center gap-3">
                        <BookOpen className="w-10 h-10 text-sky-600" />
                        NIS2 Compliance Workbook
                        <Badge className="bg-sky-100 text-sky-700 border-sky-200 font-black uppercase text-[10px] tracking-widest px-3 py-1">
                            Official Guidance
                        </Badge>
                    </h1>
                    <p className="text-muted-foreground text-lg max-w-3xl font-medium">
                        A comprehensive reference for Article 21 technical and organizational measures, including official requirements and evidence blueprints.
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-white/50 backdrop-blur-sm border border-slate-200 rounded-2xl px-6 py-3 flex items-center gap-6 shadow-sm">
                        <div className="flex flex-col items-start px-2">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Measures Assigned</span>
                            <div className="flex items-end gap-1.5">
                                <span className="text-3xl font-black text-indigo-600 leading-none">{clientNis2Controls.length}</span>
                                <span className="text-slate-300 font-bold text-lg leading-none">/</span>
                                <span className="text-slate-400 font-bold text-lg leading-none">{controls.length}</span>
                            </div>
                        </div>
                        <div className="h-10 w-px bg-slate-200" />
                        <div className="flex flex-col items-start px-2 min-w-[120px]">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Completion</span>
                            <span className="text-sm font-black text-slate-700">{Math.round((clientNis2Controls.length / (controls.length || 1)) * 100)}%</span>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1 overflow-hidden">
                                <div
                                    className="bg-indigo-500 h-full rounded-full transition-all duration-1000"
                                    style={{ width: `${(clientNis2Controls.length / (controls.length || 1)) * 100}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {!allAssigned && controls.length > 0 && (
                        <Button
                            onClick={handleAssignAll}
                            disabled={bulkAssignMutation.isPending}
                            className="bg-indigo-600 hover:bg-slate-900 text-white font-black rounded-2xl h-14 px-8 shadow-xl shadow-indigo-100 border-none transition-all hover:-translate-y-1 active:scale-95 group"
                        >
                            {bulkAssignMutation.isPending ? (
                                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            ) : (
                                <Sparkles className="w-5 h-5 mr-3 group-hover:rotate-12 transition-transform" />
                            )}
                            {clientNis2Controls.length > 0 ? "Complete Setup" : "Assign All Measures"}
                        </Button>
                    )}

                    {allAssigned && (
                        <Button
                            variant="outline"
                            onClick={() => window.print()}
                            className="h-14 px-6 rounded-2xl border-slate-200 font-bold text-slate-600 hover:bg-slate-50"
                        >
                            <Download className="w-4 h-4 mr-2" /> Export Handbook
                        </Button>
                    )}
                </div>
            </div>

            {allAssigned && (
                <Card className="border-none bg-emerald-50 shadow-xl shadow-emerald-100/50 rounded-[2.5rem] overflow-hidden mb-12 animate-in slide-in-from-top duration-700">
                    <div className="p-8 md:p-10 flex flex-col md:flex-row items-center gap-8">
                        <div className="h-24 w-24 rounded-[2rem] bg-white shadow-xl flex items-center justify-center shrink-0">
                            <CheckCircle className="w-12 h-12 text-emerald-500" />
                        </div>
                        <div className="flex-1 text-center md:text-left space-y-2">
                            <h2 className="text-3xl font-black text-slate-900 leading-tight">NIS2 Measures Linked!</h2>
                            <p className="text-slate-600 text-lg font-medium leading-relaxed">
                                All Article 21 technical and organizational measures have been successfully linked to your organization.
                                You can now start implementing these controls and uploading evidence directly from this workbook or the central controls page.
                            </p>
                        </div>
                        <Button
                            onClick={() => window.scrollTo({ top: 800, behavior: 'smooth' })}
                            className="h-16 px-10 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-lg shadow-xl shadow-emerald-200 transition-all hover:-translate-y-1 active:scale-95 px-10"
                        >
                            Get Started
                        </Button>
                    </div>
                </Card>
            )}

            {!allAssigned && !clientLoading && controls.length > 0 && (
                <Card className="border-none bg-gradient-to-br from-indigo-50 to-sky-50 shadow-xl shadow-indigo-100/50 rounded-[2.5rem] overflow-hidden group mb-12">
                    <div className="p-8 md:p-10 flex flex-col md:flex-row items-center gap-8">
                        <div className="h-24 w-24 rounded-[2rem] bg-white shadow-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-500">
                            <Shield className="w-12 h-12 text-indigo-600" />
                        </div>
                        <div className="flex-1 text-center md:text-left space-y-2">
                            <h2 className="text-2xl font-black text-slate-900 leading-tight">Start Your NIS2 Compliance Journey</h2>
                            <p className="text-slate-600 font-medium text-lg leading-relaxed">
                                {clientNis2Controls.length > 0
                                    ? "Your assignment is partially complete. Finalize it to ensure all Article 21 measures are being tracked."
                                    : "You haven't assigned the NIS2 Article 21 measures to your organization yet. Initialize them now to start tracking implementation status and evidence."
                                }
                            </p>
                        </div>
                        <Button
                            onClick={handleAssignAll}
                            disabled={bulkAssignMutation.isPending}
                            className="h-16 px-10 rounded-2xl bg-indigo-600 hover:bg-slate-900 text-white font-black text-lg shadow-xl shadow-indigo-200 hover:-translate-y-1 transition-all"
                        >
                            {bulkAssignMutation.isPending ? "Assigning..." : (clientNis2Controls.length > 0 ? "Complete Setup" : "Assign All Measures")}
                        </Button>
                    </div>
                </Card>
            )}

            {/* Search and Filters */}
            <Card className="mt-8 border-none shadow-xl shadow-slate-200/50 rounded-[2rem] bg-white ring-1 ring-slate-200/50 p-6">
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                        placeholder="Search by article number, title, or category..."
                        className="pl-12 h-14 bg-slate-50 border-none rounded-2xl text-lg font-medium shadow-inner focus:ring-2 focus:ring-sky-500/20"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </Card>

            {/* Main Content */}
            {controlsLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-20 w-full rounded-2xl" />
                    <Skeleton className="h-20 w-full rounded-2xl" />
                    <Skeleton className="h-20 w-full rounded-2xl" />
                </div>
            ) : (
                <div className="grid gap-6">
                    {filteredControls && filteredControls.length > 0 ? (
                        <Accordion type="single" collapsible className="w-full space-y-4">
                            {filteredControls.map((control) => {
                                const controlStatus = controlStatusMap[String(control.id)] || controlStatusMap[control.controlId];
                                const isMeasureAssigned = !!controlStatus;
                                return (
                                    <AccordionItem
                                        key={control.id}
                                        value={`item-${control.id}`}
                                        className="border-none shadow-lg shadow-slate-200/40 rounded-[2rem] bg-white ring-1 ring-slate-200/50 overflow-hidden"
                                    >
                                        <AccordionTrigger className="px-8 py-6 hover:no-underline group">
                                            <div className="flex items-center text-left gap-6 w-full">
                                                <div className="h-14 min-w-[5rem] w-fit px-5 rounded-[1.25rem] bg-sky-50 text-sky-600 flex items-center justify-center font-black text-base shadow-inner shrink-0 group-hover:bg-sky-600 group-hover:text-white transition-all duration-300">
                                                    {control.controlId}
                                                </div>
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center justify-between gap-4">
                                                        <div className="flex items-center gap-3">
                                                            <h3 className="text-xl font-black text-slate-900">{control.name}</h3>
                                                            {isMeasureAssigned && (
                                                                <div className="flex items-center gap-2">
                                                                    <div className="bg-emerald-500 rounded-full p-0.5">
                                                                        <CheckCircle className="w-3.5 h-3.5 text-white" />
                                                                    </div>
                                                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Linked</span>
                                                                </div>
                                                            )}
                                                            <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-bold text-[10px] uppercase tracking-tighter ml-auto">
                                                                {control.category}
                                                            </Badge>
                                                        </div>
                                                        {isMeasureAssigned && (
                                                            <div className="shrink-0 scale-110">
                                                                {getStatusBadge(controlStatus.status)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <p className="text-slate-500 font-medium line-clamp-1 text-sm">{control.description}</p>
                                                </div>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-8 pb-8 pt-2">
                                            <div className="grid lg:grid-cols-2 gap-8 border-t border-slate-100 pt-8 mt-2">
                                                {/* Left Column: Requirements & Guidance */}
                                                <div className="space-y-8">
                                                    {control.requirementText ? (
                                                        <div className="space-y-3">
                                                            <div className="flex items-center gap-2 text-sky-600">
                                                                <Gavel className="w-5 h-5" />
                                                                <h4 className="font-black text-sm uppercase tracking-widest underline decoration-sky-200 decoration-4 underline-offset-4">Directive Requirement</h4>
                                                            </div>
                                                            <div className="p-6 bg-slate-50 border border-slate-100 rounded-[1.5rem] relative overflow-hidden group">
                                                                <div className="absolute top-0 left-0 w-1 h-full bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.5)]" />
                                                                <p className="text-slate-700 leading-relaxed font-bold">"{control.requirementText}"</p>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="p-6 bg-slate-50 border border-dashed rounded-[1.5rem] text-slate-400 text-center font-medium">
                                                            Detailed requirement text not available.
                                                        </div>
                                                    )}

                                                    {control.officialGuidance && (
                                                        <div className="space-y-3 pt-2">
                                                            <div className="flex items-center gap-2 text-amber-600">
                                                                <Info className="w-5 h-5" />
                                                                <h4 className="font-black text-sm uppercase tracking-widest underline decoration-amber-200 decoration-4 underline-offset-4">Executive Interpretation & Implementation Guidance</h4>
                                                            </div>
                                                            <div className="p-6 bg-amber-50/20 border border-amber-100 rounded-[1.5rem] text-slate-800 leading-relaxed font-semibold">
                                                                {control.officialGuidance}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Right Column: Evidence Blueprints */}
                                                <div className="space-y-3">
                                                    <div className="flex items-center gap-2 text-indigo-600">
                                                        <ListChecks className="w-5 h-5" />
                                                        <h4 className="font-black text-sm uppercase tracking-widest underline decoration-indigo-200 decoration-4 underline-offset-4">Evidence Blueprint</h4>
                                                    </div>
                                                    <div className="grid gap-4">
                                                        {control.evidenceBlueprint && (control.evidenceBlueprint as any[]).length > 0 ? (
                                                            (control.evidenceBlueprint as any[]).map((bp, idx) => (
                                                                <div key={idx} className="p-6 bg-white border border-slate-200 rounded-[1.5rem] shadow-sm hover:shadow-md transition-shadow flex items-start gap-4">
                                                                    <div className="h-8 w-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xs shrink-0">
                                                                        {idx + 1}
                                                                    </div>
                                                                    <div className="space-y-1">
                                                                        <div className="font-black text-slate-900">{bp.name}</div>
                                                                        <div className="text-slate-500 font-medium text-sm">{bp.description}</div>
                                                                        {bp.source && (
                                                                            <Badge variant="outline" className="mt-2 text-[10px] font-bold text-slate-400 border-slate-200">
                                                                                SOURCE: {bp.source}
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))
                                                        ) : (
                                                            <div className="p-10 text-center border-2 border-dashed rounded-[1.5rem] text-slate-400 font-medium">
                                                                No specific evidence examples defined for this measure.
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Bar */}
                                            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                                                <Button
                                                    onClick={() => {
                                                        const clientCtrl = controlStatusMap[String(control.id)] || controlStatusMap[control.controlId];
                                                        const targetId = clientCtrl?.id || control.id;
                                                        setLocation(`/clients/${selectedClientId}/controls?framework=NIS2&openControlId=${control.id}`);
                                                    }}
                                                    className="bg-slate-900 hover:bg-emerald-600 text-white font-black rounded-2xl h-14 px-10 shadow-xl shadow-slate-200 transition-all hover:-translate-y-1 active:scale-95 group"
                                                >
                                                    Manage this Control <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                                </Button>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                )
                            })}
                        </Accordion>
                    ) : (
                        <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200 shadow-inner">
                            <Shield className="w-20 h-20 text-slate-200 mx-auto mb-6" />
                            <h3 className="text-2xl font-black text-slate-900 mb-2">No Measures Found</h3>
                            <p className="text-slate-500 font-medium">Try adjusting your search criteria or ensuring NIS2 data is seeded.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

