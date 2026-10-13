import React, { useState, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@complianceos/ui/ui/dialog";
import { Input } from "@complianceos/ui/ui/input";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Checkbox } from "@complianceos/ui/ui/checkbox";
import { Search, Sparkles, Filter, Check, HelpCircle, BookOpen } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Question } from "./QuestionTable";

interface QuestionBankModalProps {
    isOpen: boolean;
    onClose: () => void;
    targetSectionTitle: string;
    onAddQuestions: (questions: Question[]) => void;
    existingQuestionIds?: Set<string>;
}

export function QuestionBankModal({
    isOpen,
    onClose,
    targetSectionTitle,
    onAddQuestions,
    existingQuestionIds = new Set()
}: QuestionBankModalProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedFramework, setSelectedFramework] = useState<string>("all");
    const [selectedCategory, setSelectedCategory] = useState<string>("all");
    const [selectedQuestions, setSelectedQuestions] = useState<Map<string, any>>(new Map());

    // Fetch master question bank from backend
    const { data: masterQuestionBank, isLoading } = trpc.vendors.getQuestionBank.useQuery(
        undefined,
        { enabled: isOpen }
    );

    const frameworks = useMemo(() => {
        if (!masterQuestionBank) return [];
        const set = new Set(masterQuestionBank.map(q => q.standard));
        return Array.from(set);
    }, [masterQuestionBank]);

    const categories = useMemo(() => {
        if (!masterQuestionBank) return [];
        const set = new Set(masterQuestionBank.map(q => q.category).filter(Boolean));
        return Array.from(set);
    }, [masterQuestionBank]);

    const filteredQuestions = useMemo(() => {
        if (!masterQuestionBank) return [];

        return masterQuestionBank.filter(q => {
            // Framework filter
            if (selectedFramework !== "all" && q.standard !== selectedFramework) {
                return false;
            }

            // Category filter
            if (selectedCategory !== "all" && q.category !== selectedCategory) {
                return false;
            }

            // Search query filter
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const matchText = q.text.toLowerCase().includes(query);
                const matchCtrl = q.controlId?.toLowerCase().includes(query);
                const matchStd = q.standard?.toLowerCase().includes(query);
                const matchCat = q.category?.toLowerCase().includes(query);
                const matchGuidance = q.guidance?.toLowerCase().includes(query);

                if (!matchText && !matchCtrl && !matchStd && !matchCat && !matchGuidance) {
                    return false;
                }
            }

            return true;
        });
    }, [masterQuestionBank, selectedFramework, selectedCategory, searchQuery]);

    const toggleSelect = (question: any) => {
        setSelectedQuestions(prev => {
            const next = new Map(prev);
            if (next.has(question.id)) {
                next.delete(question.id);
            } else {
                next.set(question.id, question);
            }
            return next;
        });
    };

    const handleConfirm = () => {
        if (selectedQuestions.size === 0) return;

        const questionsToAdd: Question[] = Array.from(selectedQuestions.values()).map(q => ({
            id: `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            text: q.text,
            type: q.type,
            required: q.required ?? true,
            standard: q.standard,
            controlId: q.controlId,
            guidance: q.guidance,
            category: q.category,
            enabled: true
        }));

        onAddQuestions(questionsToAdd);
        setSelectedQuestions(new Map());
        onClose();
    };

    const selectedCount = selectedQuestions.size;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-4xl max-h-[88vh] flex flex-col p-6 overflow-hidden">
                <DialogHeader className="pb-3 border-b border-slate-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2">
                                <Badge className="bg-blue-100 text-blue-800 text-xs">Question Bank</Badge>
                                <span className="text-xs text-slate-500">Adding to section: <strong>{targetSectionTitle}</strong></span>
                            </div>
                            <DialogTitle className="text-xl font-bold text-slate-900 mt-1">
                                Add Controls from Master Question Bank
                            </DialogTitle>
                            <DialogDescription className="text-xs text-slate-500">
                                Select pre-audited control questions across ISO 27001, CIS Controls, CAIQ, SOC 2, and AI Governance without writing blank questions.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* Filter and Search Bar */}
                <div className="py-3 space-y-2.5 border-b border-slate-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search question bank (e.g., MFA, encryption, penetration testing, breach notification, BAA)..."
                            className="pl-9 text-xs bg-slate-50 h-9"
                        />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">Framework:</span>
                        <button
                            type="button"
                            onClick={() => setSelectedFramework("all")}
                            className={`px-2 py-0.5 rounded-md text-xs font-medium transition-colors ${
                                selectedFramework === "all" ? "bg-[#1C4D8D] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                            }`}
                        >
                            All
                        </button>
                        {frameworks.map(fw => (
                            <button
                                key={fw}
                                type="button"
                                onClick={() => setSelectedFramework(fw)}
                                className={`px-2 py-0.5 rounded-md text-xs font-medium transition-colors ${
                                    selectedFramework === fw ? "bg-[#1C4D8D] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                }`}
                            >
                                {fw}
                            </button>
                        ))}
                    </div>

                    {categories.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 text-xs pt-1">
                            <span className="font-semibold text-slate-500 uppercase text-[10px] tracking-wider">Domain:</span>
                            <button
                                type="button"
                                onClick={() => setSelectedCategory("all")}
                                className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                                    selectedCategory === "all" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                }`}
                            >
                                All Domains
                            </button>
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition-colors ${
                                        selectedCategory === cat ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Questions List */}
                <div className="flex-1 overflow-y-auto py-3 space-y-2.5 pr-1">
                    {isLoading ? (
                        <div className="text-center py-12 text-slate-500 text-xs">Loading question bank...</div>
                    ) : filteredQuestions.length === 0 ? (
                        <div className="text-center py-12 border rounded-lg bg-slate-50 border-dashed">
                            <BookOpen className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                            <p className="text-sm font-semibold text-slate-700">No questions match your filter</p>
                            <p className="text-xs text-slate-500 mt-0.5">Try searching for other keywords like "access", "MFA", or "policy".</p>
                        </div>
                    ) : (
                        filteredQuestions.map((q) => {
                            const isSelected = selectedQuestions.has(q.id);
                            const isAlreadyInTemplate = existingQuestionIds.has(q.text);

                            return (
                                <div
                                    key={q.id}
                                    onClick={() => toggleSelect(q)}
                                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex items-start gap-3 ${
                                        isSelected
                                            ? "bg-blue-50/70 border-blue-500 ring-1 ring-blue-500 shadow-xs"
                                            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                                    }`}
                                >
                                    <div className="pt-0.5">
                                        <Checkbox 
                                            checked={isSelected}
                                            onCheckedChange={() => toggleSelect(q)}
                                            className="pointer-events-none"
                                        />
                                    </div>

                                    <div className="flex-1 space-y-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                                {q.controlId}
                                            </span>
                                            <Badge variant="outline" className="text-[10px] text-slate-700 bg-slate-50">
                                                {q.standard}
                                            </Badge>
                                            {q.category && (
                                                <Badge variant="secondary" className="text-[10px] bg-slate-100 text-slate-600">
                                                    {q.category}
                                                </Badge>
                                            )}
                                            <span className="text-[10px] text-slate-400 uppercase font-semibold">
                                                {q.type.replace('_', ' ')}
                                            </span>
                                            {isAlreadyInTemplate && (
                                                <span className="text-[10px] text-amber-600 font-semibold bg-amber-50 px-1.5 rounded">
                                                    Already in Template
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-xs font-semibold text-slate-900 leading-snug">
                                            {q.text}
                                        </p>

                                        {q.guidance && (
                                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 italic">
                                                <HelpCircle className="h-3 w-3 text-slate-400 shrink-0" />
                                                <span>Audit Evidence: {q.guidance}</span>
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
                        {selectedCount} question{selectedCount !== 1 ? 's' : ''} selected
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
                            <Check className="h-3.5 w-3.5 mr-1.5" />
                            Add Selected ({selectedCount}) to Section
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
