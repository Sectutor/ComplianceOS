
import React, { useState } from 'react';
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useClientContext } from "@/contexts/ClientContext";
// DashboardLayout removed - handled by parent CyberLayout
import { Card, CardContent, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Input } from "@complianceos/ui/ui/input";
import { 
    Shield, 
    ArrowLeft, 
    Search, 
    Gavel, 
    Info, 
    ListChecks, 
    ChevronRight, 
    CheckCircle2,
    BookOpen,
    Download
} from "lucide-react";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@complianceos/ui/ui/accordion";

export default function NIS2Workbook() {
    const { selectedClientId } = useClientContext();
    const [, setLocation] = useLocation();
    const [searchTerm, setSearchTerm] = useState("");

    // Fetch NIS2 controls from the master library
    const { data: controls, isLoading } = trpc.controls.list.useQuery({ 
        framework: "NIS2" 
    }, {
        staleTime: 1000 * 60 * 10 // 10 minutes cache
    });

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
                <div className="flex gap-3">
                    <Button variant="outline" className="rounded-xl font-bold shadow-sm">
                        <Download className="w-4 h-4 mr-2" />
                        Export Handbook
                    </Button>
                </div>
            </div>

            {/* Search and Filters */}
            <Card className="border-none shadow-xl shadow-slate-200/50 rounded-[2rem] bg-white ring-1 ring-slate-200/50 p-6">
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
            {isLoading ? (
                <div className="space-y-4">
                    <Skeleton className="h-20 w-full rounded-2xl" />
                    <Skeleton className="h-20 w-full rounded-2xl" />
                    <Skeleton className="h-20 w-full rounded-2xl" />
                </div>
            ) : (
                <div className="grid gap-6">
                    {filteredControls && filteredControls.length > 0 ? (
                        <Accordion type="single" collapsible className="w-full space-y-4">
                            {filteredControls.map((control) => (
                                <AccordionItem 
                                    key={control.id} 
                                    value={`item-${control.id}`}
                                    className="border-none shadow-lg shadow-slate-200/40 rounded-[2rem] bg-white ring-1 ring-slate-200/50 overflow-hidden"
                                >
                                    <AccordionTrigger className="px-8 py-6 hover:no-underline group">
                                        <div className="flex items-center text-left gap-6 w-full">
                                            <div className="h-14 w-14 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-black text-lg shadow-inner shrink-0 group-hover:bg-sky-600 group-hover:text-white transition-all duration-300">
                                                {control.controlId}
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <div className="flex items-center gap-3">
                                                    <h3 className="text-xl font-black text-slate-900">{control.name}</h3>
                                                    <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-bold text-[10px] uppercase tracking-tighter">
                                                        {control.category}
                                                    </Badge>
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
                                                            <h4 className="font-black text-sm uppercase tracking-widest underline decoration-sky-200 decoration-4 underline-offset-4">Official Requirement</h4>
                                                        </div>
                                                        <div className="p-6 bg-slate-50 border border-slate-100 rounded-[1.5rem] relative overflow-hidden group">
                                                            <div className="absolute top-0 left-0 w-1 h-full bg-sky-500 shadow-[0_0_10px_rgba(14,165,233,0.5)]" />
                                                            <p className="text-slate-700 italic leading-relaxed font-medium">"{control.requirementText}"</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="p-6 bg-slate-50 border border-dashed rounded-[1.5rem] text-slate-400 text-center font-medium">
                                                        Detailed requirement text not available.
                                                    </div>
                                                )}

                                                {control.officialGuidance && (
                                                    <div className="space-y-3">
                                                        <div className="flex items-center gap-2 text-amber-600">
                                                            <Info className="w-5 h-5" />
                                                            <h4 className="font-black text-sm uppercase tracking-widest underline decoration-amber-200 decoration-4 underline-offset-4">Regulatory Guidance</h4>
                                                        </div>
                                                        <div className="p-6 bg-amber-50/30 border border-amber-100 rounded-[1.5rem] text-slate-700 leading-relaxed font-medium">
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
                                                onClick={() => setLocation(`/clients/${selectedClientId}/controls?openControlId=${control.id}`)}
                                                className="bg-slate-900 hover:bg-sky-600 text-white font-bold rounded-xl h-12 px-6 shadow-lg shadow-slate-200 transition-all hover:-translate-y-1"
                                            >
                                                Manage this Control <ChevronRight className="w-4 h-4 ml-2" />
                                            </Button>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
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
