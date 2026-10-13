import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@complianceos/ui/ui/dialog";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Checkbox } from "@complianceos/ui/ui/checkbox";
import { 
    Layers, 
    Lock, 
    ShieldCheck, 
    ShieldAlert, 
    Cpu, 
    Cloud, 
    AlertTriangle, 
    Sparkles, 
    Globe, 
    Check, 
    Plus 
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Section } from "./QuestionTable";

interface SectionPoolModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddSections: (sections: Section[]) => void;
    existingSectionTitles?: Set<string>;
}

export function SectionPoolModal({
    isOpen,
    onClose,
    onAddSections,
    existingSectionTitles = new Set()
}: SectionPoolModalProps) {
    const [selectedSectionIds, setSelectedSectionIds] = useState<Set<string>>(new Set());
    const [includeQuestions, setIncludeQuestions] = useState<boolean>(true);

    // Fetch section pool from backend
    const { data: sectionPool, isLoading } = trpc.vendors.getSectionPool.useQuery(
        undefined,
        { enabled: isOpen }
    );

    const getIcon = (iconName: string) => {
        switch (iconName) {
            case 'Lock': return <Lock className="h-5 w-5 text-blue-600" />;
            case 'ShieldCheck': return <ShieldCheck className="h-5 w-5 text-emerald-600" />;
            case 'Layers': return <Layers className="h-5 w-5 text-indigo-600" />;
            case 'ShieldAlert': return <ShieldAlert className="h-5 w-5 text-amber-600" />;
            case 'Cpu': return <Cpu className="h-5 w-5 text-purple-600" />;
            case 'Cloud': return <Cloud className="h-5 w-5 text-cyan-600" />;
            case 'AlertTriangle': return <AlertTriangle className="h-5 w-5 text-rose-600" />;
            case 'Sparkles': return <Sparkles className="h-5 w-5 text-amber-500" />;
            case 'Globe': return <Globe className="h-5 w-5 text-teal-600" />;
            default: return <Layers className="h-5 w-5 text-slate-600" />;
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedSectionIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleConfirm = () => {
        if (!sectionPool || selectedSectionIds.size === 0) return;

        const sectionsToAdd: Section[] = sectionPool
            .filter(sec => selectedSectionIds.has(sec.id))
            .map(sec => ({
                title: sec.title,
                description: sec.description,
                questions: includeQuestions 
                    ? sec.recommendedQuestions.map(q => ({
                        ...q,
                        id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                        enabled: true
                    }))
                    : []
            }));

        onAddSections(sectionsToAdd);
        setSelectedSectionIds(new Set());
        onClose();
    };

    const selectedCount = selectedSectionIds.size;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[88vh] flex flex-col p-6 overflow-hidden">
                <DialogHeader className="pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-100 text-emerald-800 text-xs">Section Pool</Badge>
                        <span className="text-xs text-slate-500">Pick pre-curated security domains</span>
                    </div>
                    <DialogTitle className="text-xl font-bold text-slate-900 mt-1">
                        Add Security Domains from Section Pool
                    </DialogTitle>
                    <DialogDescription className="text-xs text-slate-500">
                        Choose vetted domain sections to expand your questionnaire. Never write blank section headers from scratch.
                    </DialogDescription>
                </DialogHeader>

                {/* Option to include recommended controls */}
                <div className="py-2.5 px-3 bg-blue-50/70 border border-blue-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Checkbox 
                            id="inc_q" 
                            checked={includeQuestions} 
                            onCheckedChange={(checked) => setIncludeQuestions(!!checked)}
                        />
                        <label htmlFor="inc_q" className="text-xs font-semibold text-blue-950 cursor-pointer">
                            Include recommended audited control questions in selected domains
                        </label>
                    </div>
                    <span className="text-[11px] text-blue-700">
                        {includeQuestions ? "Controls pre-populated" : "Empty section headers only"}
                    </span>
                </div>

                {/* Domains Grid */}
                <div className="flex-1 overflow-y-auto py-3 grid grid-cols-1 md:grid-cols-2 gap-3 pr-1">
                    {isLoading ? (
                        <div className="col-span-2 text-center py-12 text-slate-500 text-xs">Loading section pool...</div>
                    ) : (
                        sectionPool?.map((sec) => {
                            const isSelected = selectedSectionIds.has(sec.id);
                            const alreadyExists = existingSectionTitles.has(sec.title);

                            return (
                                <div
                                    key={sec.id}
                                    onClick={() => toggleSelect(sec.id)}
                                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                                        isSelected
                                            ? "bg-blue-50/80 border-blue-500 ring-1 ring-blue-500 shadow-xs"
                                            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                                    }`}
                                >
                                    <div className="pt-0.5">
                                        <Checkbox 
                                            checked={isSelected}
                                            onCheckedChange={() => toggleSelect(sec.id)}
                                            className="pointer-events-none"
                                        />
                                    </div>

                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2">
                                                <div className="h-7 w-7 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center">
                                                    {getIcon(sec.icon)}
                                                </div>
                                                <h4 className="text-xs font-bold text-slate-900 leading-tight">
                                                    {sec.title}
                                                </h4>
                                            </div>
                                            <Badge variant="outline" className="text-[10px] shrink-0 font-semibold bg-slate-50">
                                                {sec.recommendedQuestions.length} Controls
                                            </Badge>
                                        </div>

                                        <p className="text-[11px] text-slate-500 leading-relaxed pt-0.5">
                                            {sec.description}
                                        </p>

                                        {alreadyExists && (
                                            <div className="pt-1">
                                                <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                                    Already in Template
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <DialogFooter className="pt-3 border-t border-slate-200 flex items-center justify-between sm:justify-between w-full">
                    <span className="text-xs font-semibold text-slate-600">
                        {selectedCount} domain{selectedCount !== 1 ? 's' : ''} selected
                    </span>

                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
                            Cancel
                        </Button>
                        <Button 
                            size="sm" 
                            onClick={handleConfirm}
                            disabled={selectedCount === 0}
                            className="bg-[#1C4D8D] hover:bg-[#153B6D] active:bg-[#153B6D] text-white text-xs font-semibold"
                        >
                            <Plus className="h-3.5 w-3.5 mr-1.5" />
                            Add Selected Domains ({selectedCount})
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
