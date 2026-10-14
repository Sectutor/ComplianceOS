import React, { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@complianceos/ui/ui/table";
import { Input } from "@complianceos/ui/ui/input";
import { Button } from "@complianceos/ui/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";
import { 
    Trash2, 
    Plus, 
    HelpCircle, 
    Search, 
    ChevronDown, 
    ChevronRight, 
    Filter, 
    Eye, 
    EyeOff, 
    SlidersHorizontal,
    Cloud, 
    ShieldAlert, 
    CheckSquare, 
    Square, 
    Check,
    BookOpen,
    Layers
} from "lucide-react";
import { Checkbox } from "@complianceos/ui/ui/checkbox";
import { Badge } from "@complianceos/ui/ui/badge";
import { toast } from "sonner";
import { QuestionBankModal } from "./QuestionBankModal";
import { SectionPoolModal } from "./SectionPoolModal";

export interface Question {
    id: string;
    text: string;
    type: 'text' | 'yes_no' | 'multiple_choice' | 'file_upload';
    required: boolean;
    standard?: string;
    controlId?: string;
    guidance?: string;
    category?: string;
    tier?: 'critical' | 'standard' | 'physical_onprem';
    options?: string[];
    enabled?: boolean;
}

export interface Section {
    title: string;
    description?: string;
    questions: Question[];
}

interface QuestionTableProps {
    sections: Section[];
    onChange: (sections: Section[]) => void;
}

export function QuestionTable({ sections, onChange }: QuestionTableProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [collapsedSections, setCollapsedSections] = useState<Record<number, boolean>>({});
    const [selectedQuestionKeys, setSelectedQuestionKeys] = useState<Set<string>>(new Set());

    // Question Bank Modal State
    const [isQuestionBankOpen, setIsQuestionBankOpen] = useState(false);
    const [targetSectionIdx, setTargetSectionIdx] = useState<number>(0);

    // Section Pool Modal State
    const [isSectionPoolOpen, setIsSectionPoolOpen] = useState(false);

    const openQuestionBank = (sectionIndex: number) => {
        setTargetSectionIdx(sectionIndex);
        setIsQuestionBankOpen(true);
    };

    const handleAddQuestionsFromBank = (newQuestions: Question[]) => {
        if (!sections[targetSectionIdx]) return;
        const newSections = [...sections];
        newSections[targetSectionIdx].questions = [
            ...newSections[targetSectionIdx].questions,
            ...newQuestions
        ];
        onChange(newSections);
        toast.success(`Added ${newQuestions.length} controls from Question Bank to "${newSections[targetSectionIdx].title}".`);
    };

    const handleAddSectionsFromPool = (newPoolSections: Section[]) => {
        onChange([...sections, ...newPoolSections]);
        toast.success(`Added ${newPoolSections.length} domain section${newPoolSections.length > 1 ? 's' : ''} from Section Pool.`);
    };

    // Toggle Section Collapse
    const toggleCollapse = (index: number) => {
        setCollapsedSections(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const updateQuestion = (sectionIndex: number, questionIndex: number, field: keyof Question, value: any) => {
        const newSections = [...sections];
        newSections[sectionIndex].questions[questionIndex] = {
            ...newSections[sectionIndex].questions[questionIndex],
            [field]: value
        };
        onChange(newSections);
    };

    const toggleQuestionEnabled = (sectionIndex: number, questionIndex: number) => {
        const current = sections[sectionIndex].questions[questionIndex].enabled !== false;
        updateQuestion(sectionIndex, questionIndex, 'enabled', !current);
    };

    const removeQuestion = (sectionIndex: number, questionIndex: number) => {
        const newSections = [...sections];
        const removed = newSections[sectionIndex].questions.splice(questionIndex, 1);
        onChange(newSections);
        toast.info(`Removed control ${removed[0]?.controlId || removed[0]?.id || ''}`);
    };

    const addQuestion = (sectionIndex: number) => {
        const newSections = [...sections];
        newSections[sectionIndex].questions.push({
            id: `q_${Date.now()}`,
            text: "",
            type: "yes_no",
            required: true,
            standard: "ISO/IEC 27001",
            controlId: "CUSTOM",
            guidance: "Provide supporting policy, technical documentation, or attestation.",
            enabled: true
        });
        onChange(newSections);
    };

    const updateSectionTitle = (index: number, title: string) => {
        const newSections = [...sections];
        newSections[index].title = title;
        onChange(newSections);
    };

    const updateSectionDesc = (index: number, description: string) => {
        const newSections = [...sections];
        newSections[index].description = description;
        onChange(newSections);
    };

    const addSection = () => {
        onChange([...sections, { title: "New Assessment Domain", description: "", questions: [] }]);
    };

    const removeSection = (index: number) => {
        const newSections = [...sections];
        newSections.splice(index, 1);
        onChange(newSections);
        toast.info("Removed section.");
    };

    // Bulk selection handlers
    const toggleSelectQuestion = (key: string) => {
        setSelectedQuestionKeys(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const toggleSelectAllInSection = (sIdx: number) => {
        const section = sections[sIdx];
        const allKeys = section.questions.map((_, qIdx) => `${sIdx}-${qIdx}`);
        const allSelected = allKeys.every(k => selectedQuestionKeys.has(k));

        setSelectedQuestionKeys(prev => {
            const next = new Set(prev);
            if (allSelected) {
                allKeys.forEach(k => next.delete(k));
            } else {
                allKeys.forEach(k => next.add(k));
            }
            return next;
        });
    };

    const handleBulkDelete = () => {
        if (selectedQuestionKeys.size === 0) return;

        const count = selectedQuestionKeys.size;
        const newSections = sections.map((sec, sIdx) => ({
            ...sec,
            questions: sec.questions.filter((_, qIdx) => !selectedQuestionKeys.has(`${sIdx}-${qIdx}`))
        }));

        setSelectedQuestionKeys(new Set());
        onChange(newSections);
        toast.success(`Removed ${count} questions from template.`);
    };

    const handleBulkToggleEnabled = (enabled: boolean) => {
        if (selectedQuestionKeys.size === 0) return;

        const count = selectedQuestionKeys.size;
        const newSections = sections.map((sec, sIdx) => ({
            ...sec,
            questions: sec.questions.map((q, qIdx) => {
                if (selectedQuestionKeys.has(`${sIdx}-${qIdx}`)) {
                    return { ...q, enabled };
                }
                return q;
            })
        }));

        setSelectedQuestionKeys(new Set());
        onChange(newSections);
        toast.success(`${enabled ? 'Included' : 'Excluded'} ${count} questions.`);
    };

    // Preset Trimming Scopes
    const applyScopeFilter = (scope: 'all' | 'saas_cloud' | 'critical_only') => {
        if (scope === 'all') {
            const newSections = sections.map(s => ({
                ...s,
                questions: s.questions.map(q => ({ ...q, enabled: true }))
            }));
            onChange(newSections);
            toast.success("All controls enabled for comprehensive audit.");
        } else if (scope === 'saas_cloud') {
            let disabledCount = 0;
            const newSections = sections.map(s => {
                const isPhysicalSection = s.title.toLowerCase().includes('physical') || s.title.toLowerCase().includes('datacenter');
                return {
                    ...s,
                    questions: s.questions.map(q => {
                        const isPhysical = isPhysicalSection || q.tier === 'physical_onprem' || q.text.toLowerCase().includes('physical') || q.text.toLowerCase().includes('clear desk');
                        if (isPhysical) {
                            disabledCount++;
                            return { ...q, enabled: false };
                        }
                        return { ...q, enabled: true };
                    })
                };
            });
            onChange(newSections);
            toast.success(`SaaS scope applied: ${disabledCount} physical/on-prem controls excluded.`);
        } else if (scope === 'critical_only') {
            let enabledCount = 0;
            const newSections = sections.map(s => ({
                ...s,
                questions: s.questions.map(q => {
                    const isCrit = q.tier === 'critical' || q.required === true || q.text.toLowerCase().includes('mfa') || q.text.toLowerCase().includes('encrypt') || q.text.toLowerCase().includes('breach') || q.text.toLowerCase().includes('penetration');
                    if (isCrit) enabledCount++;
                    return { ...q, enabled: isCrit };
                })
            }));
            onChange(newSections);
            toast.success(`Fast Review scope applied: ${enabledCount} critical controls enabled, others excluded.`);
        }
    };

    // Calculate metrics
    const totalQuestions = sections.reduce((acc, s) => acc + s.questions.length, 0);
    const enabledQuestions = sections.reduce((acc, s) => acc + s.questions.filter(q => q.enabled !== false).length, 0);
    const selectedCount = selectedQuestionKeys.size;

    return (
        <div className="space-y-6">
            {/* Quick Scope Trimming Toolbar */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <SlidersHorizontal className="h-4 w-4 text-blue-600" />
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Quick Scope Presets:</span>
                        <div className="flex flex-wrap items-center gap-1.5">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => applyScopeFilter('all')}
                                className="text-xs h-7 px-2.5 bg-slate-50 hover:bg-slate-100 border-slate-300"
                            >
                                All Controls ({totalQuestions})
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => applyScopeFilter('saas_cloud')}
                                className="text-xs h-7 px-2.5 bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-200"
                            >
                                <Cloud className="h-3 w-3 mr-1" /> SaaS / Cloud Scope (Auto-Trim On-Prem)
                            </Button>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => applyScopeFilter('critical_only')}
                                className="text-xs h-7 px-2.5 bg-amber-50 text-amber-800 hover:bg-amber-100 border-amber-200"
                            >
                                <ShieldAlert className="h-3 w-3 mr-1" /> Fast Review (Critical Only)
                            </Button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs font-semibold bg-emerald-50 text-emerald-800 border-emerald-200">
                            {enabledQuestions} of {totalQuestions} Active
                        </Badge>
                    </div>
                </div>

                {/* Filter and Bulk Actions Bar */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Filter questions by keyword or control ID..."
                            className="h-8 pl-8 text-xs bg-slate-50 border-slate-200"
                        />
                    </div>

                    {selectedCount > 0 ? (
                        <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 animate-in fade-in duration-200">
                            <span className="text-xs font-semibold text-blue-900">
                                {selectedCount} question{selectedCount > 1 ? 's' : ''} selected:
                            </span>
                            <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleBulkToggleEnabled(false)}
                                className="h-6 text-[11px] px-2 bg-white text-slate-700 hover:bg-slate-100"
                            >
                                <EyeOff className="h-3 w-3 mr-1 text-slate-500" /> Exclude
                            </Button>
                            <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleBulkToggleEnabled(true)}
                                className="h-6 text-[11px] px-2 bg-white text-slate-700 hover:bg-slate-100"
                            >
                                <Eye className="h-3 w-3 mr-1 text-emerald-600" /> Include
                            </Button>
                            <Button 
                                size="sm" 
                                variant="destructive" 
                                onClick={handleBulkDelete}
                                className="h-6 text-[11px] px-2"
                            >
                                <Trash2 className="h-3 w-3 mr-1" /> Delete Selected
                            </Button>
                            <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={() => setSelectedQuestionKeys(new Set())}
                                className="h-6 text-[11px] px-1.5 text-slate-500 hover:text-slate-800"
                            >
                                Clear
                            </Button>
                        </div>
                    ) : (
                        <p className="text-[11px] text-slate-500">
                            💡 Use checkboxes to bulk remove or exclude questions that don't apply to this vendor.
                        </p>
                    )}
                </div>
            </div>

            {/* Sections Accordion List */}
            <div className="space-y-4">
                {sections.map((section, sIdx) => {
                    const isCollapsed = !!collapsedSections[sIdx];
                    const activeCount = section.questions.filter(q => q.enabled !== false).length;
                    const allKeys = section.questions.map((_, qIdx) => `${sIdx}-${qIdx}`);
                    const allSectionSelected = allKeys.length > 0 && allKeys.every(k => selectedQuestionKeys.has(k));

                    // Filtered questions based on search query
                    const filteredQuestions = section.questions.map((q, qIdx) => ({ q, qIdx })).filter(({ q }) => {
                        if (!searchQuery.trim()) return true;
                        const query = searchQuery.toLowerCase();
                        return (
                            q.text.toLowerCase().includes(query) ||
                            (q.controlId && q.controlId.toLowerCase().includes(query)) ||
                            (q.standard && q.standard.toLowerCase().includes(query)) ||
                            (q.guidance && q.guidance.toLowerCase().includes(query))
                        );
                    });

                    if (searchQuery.trim() && filteredQuestions.length === 0) {
                        return null; // hide section if no matching questions
                    }

                    return (
                        <div key={sIdx} className="border rounded-xl bg-white shadow-xs border-slate-200 overflow-hidden transition-all">
                            {/* Section Header */}
                            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                                <div className="flex items-center gap-3 flex-1">
                                    <button 
                                        type="button" 
                                        onClick={() => toggleCollapse(sIdx)}
                                        className="h-7 w-7 rounded-md hover:bg-slate-200 flex items-center justify-center text-slate-600 shrink-0"
                                    >
                                        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </button>

                                    <div className="space-y-1 flex-1">
                                        <div className="flex items-center gap-2">
                                            <Input 
                                                value={section.title} 
                                                onChange={(e) => updateSectionTitle(sIdx, e.target.value)}
                                                className="font-bold text-base border-transparent hover:border-slate-300 focus:border-slate-400 bg-transparent h-7 px-1 w-full max-w-xl text-slate-900"
                                                placeholder="Domain / Section Title"
                                            />
                                        </div>
                                        <Input
                                            value={section.description || ""}
                                            onChange={(e) => updateSectionDesc(sIdx, e.target.value)}
                                            className="text-xs text-slate-500 border-transparent hover:border-slate-300 focus:border-slate-400 bg-transparent h-6 px-1 w-full"
                                            placeholder="Section Scope & Intent..."
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2.5">
                                    <Badge variant="outline" className="text-xs bg-white text-slate-700">
                                        {activeCount} of {section.questions.length} included
                                    </Badge>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => toggleSelectAllInSection(sIdx)}
                                        className="text-xs h-7 px-2 bg-white text-slate-700"
                                    >
                                        {allSectionSelected ? <CheckSquare className="h-3 w-3 mr-1 text-blue-600" /> : <Square className="h-3 w-3 mr-1" />}
                                        {allSectionSelected ? "Deselect All" : "Select Section"}
                                    </Button>

                                    <Button 
                                        variant="ghost" 
                                        size="sm" 
                                        onClick={() => removeSection(sIdx)} 
                                        className="text-xs h-7 px-2 text-destructive hover:bg-destructive/10"
                                    >
                                        Delete Domain
                                    </Button>
                                </div>
                            </div>

                            {/* Section Body (Table) */}
                            {!isCollapsed && (
                                <div className="p-4 space-y-3">
                                    <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
                                        <Table>
                                            <TableHeader className="bg-slate-50/70">
                                                <TableRow>
                                                    <TableHead className="w-[40px] text-center"></TableHead>
                                                    <TableHead className="w-[120px] text-xs font-semibold">Control ID</TableHead>
                                                    <TableHead className="w-[150px] text-xs font-semibold">Standard</TableHead>
                                                    <TableHead className="text-xs font-semibold">Question & Evidence Guidance</TableHead>
                                                    <TableHead className="w-[130px] text-xs font-semibold">Response Type</TableHead>
                                                    <TableHead className="w-[90px] text-center text-xs font-semibold">Status</TableHead>
                                                    <TableHead className="w-[50px]"></TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {filteredQuestions.length === 0 ? (
                                                    <TableRow>
                                                        <TableCell colSpan={7} className="text-center py-6 text-xs text-slate-500">
                                                            No questions in this section match your filter.
                                                        </TableCell>
                                                    </TableRow>
                                                ) : (
                                                    filteredQuestions.map(({ q, qIdx }) => {
                                                        const questionKey = `${sIdx}-${qIdx}`;
                                                        const isSelected = selectedQuestionKeys.has(questionKey);
                                                        const isIncluded = q.enabled !== false;

                                                        return (
                                                            <TableRow 
                                                                key={questionKey} 
                                                                className={`transition-colors ${
                                                                    !isIncluded 
                                                                        ? "bg-slate-50/70 opacity-60 text-slate-400" 
                                                                        : isSelected 
                                                                            ? "bg-blue-50/50" 
                                                                            : "hover:bg-slate-50/40"
                                                                }`}
                                                            >
                                                                {/* Selection Checkbox */}
                                                                <TableCell className="align-top pt-3 text-center">
                                                                    <Checkbox 
                                                                        checked={isSelected}
                                                                        onCheckedChange={() => toggleSelectQuestion(questionKey)}
                                                                    />
                                                                </TableCell>

                                                                {/* Control ID */}
                                                                <TableCell className="align-top pt-3">
                                                                    <Input 
                                                                        value={q.controlId || q.id} 
                                                                        onChange={(e) => updateQuestion(sIdx, qIdx, 'controlId', e.target.value)}
                                                                        className={`h-7 text-xs font-mono font-medium ${isIncluded ? 'text-slate-900 bg-white' : 'text-slate-400 bg-slate-100'}`}
                                                                        placeholder="A.5.19"
                                                                    />
                                                                </TableCell>

                                                                {/* Standard */}
                                                                <TableCell className="align-top pt-3">
                                                                    <Input 
                                                                        value={q.standard || ""} 
                                                                        onChange={(e) => updateQuestion(sIdx, qIdx, 'standard', e.target.value)}
                                                                        className={`h-7 text-xs ${isIncluded ? 'text-slate-700 bg-white' : 'text-slate-400 bg-slate-100'}`}
                                                                        placeholder="ISO 27001 / CIS v8"
                                                                    />
                                                                </TableCell>

                                                                {/* Question Text & Guidance */}
                                                                <TableCell className="align-top pt-3 space-y-1.5">
                                                                    <Input 
                                                                        value={q.text} 
                                                                        onChange={(e) => updateQuestion(sIdx, qIdx, 'text', e.target.value)}
                                                                        className={`h-7 text-xs font-medium ${isIncluded ? 'text-slate-900 bg-white' : 'text-slate-400 bg-slate-100'}`}
                                                                        placeholder="Question text for vendor..."
                                                                    />
                                                                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                                        <HelpCircle className="h-3 w-3 text-slate-400 shrink-0" />
                                                                        <Input
                                                                            value={q.guidance || ""}
                                                                            onChange={(e) => updateQuestion(sIdx, qIdx, 'guidance', e.target.value)}
                                                                            className="h-6 text-[11px] text-slate-500 bg-slate-50/80 border-dashed"
                                                                            placeholder="Audit Evidence Guidance (e.g. Upload third-party pen test summary)"
                                                                        />
                                                                    </div>
                                                                </TableCell>

                                                                {/* Response Type */}
                                                                <TableCell className="align-top pt-3">
                                                                    <Select 
                                                                        value={q.type} 
                                                                        onValueChange={(val: any) => updateQuestion(sIdx, qIdx, 'type', val)}
                                                                    >
                                                                        <SelectTrigger className="h-7 text-xs bg-white">
                                                                            <SelectValue />
                                                                        </SelectTrigger>
                                                                        <SelectContent>
                                                                            <SelectItem value="yes_no">Yes / No</SelectItem>
                                                                            <SelectItem value="file_upload">File Upload</SelectItem>
                                                                            <SelectItem value="text">Free Text</SelectItem>
                                                                            <SelectItem value="multiple_choice">Multi-Choice</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                </TableCell>

                                                                {/* Status / Include Toggle */}
                                                                <TableCell className="align-top pt-3 text-center">
                                                                    <Button
                                                                        variant={isIncluded ? "outline" : "secondary"}
                                                                        size="sm"
                                                                        onClick={() => toggleQuestionEnabled(sIdx, qIdx)}
                                                                        className={`h-7 text-[11px] px-2 w-full font-medium ${
                                                                            isIncluded 
                                                                                ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100" 
                                                                                : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                                                                        }`}
                                                                    >
                                                                        {isIncluded ? (
                                                                            <>
                                                                                <Check className="h-3 w-3 mr-1" /> Active
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <EyeOff className="h-3 w-3 mr-1" /> Excluded
                                                                            </>
                                                                        )}
                                                                    </Button>
                                                                </TableCell>

                                                                {/* Delete Question Permanently */}
                                                                <TableCell className="align-top pt-3 text-right">
                                                                    <Button 
                                                                        variant="ghost" 
                                                                        size="icon" 
                                                                        className="h-7 w-7 text-slate-400 hover:text-destructive" 
                                                                        onClick={() => removeQuestion(sIdx, qIdx)}
                                                                        title="Delete control"
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    })
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    <div className="flex items-center gap-2 pt-1">
                                        <Button 
                                            size="sm" 
                                            className="bg-[#1C4D8D] hover:bg-[#153B6D] active:bg-[#153B6D] text-white text-xs h-7 px-2.5 font-semibold shadow-xs" 
                                            onClick={() => openQuestionBank(sIdx)}
                                        >
                                            <BookOpen className="mr-1.5 h-3.5 w-3.5" /> Add from Question Bank
                                        </Button>
                                        <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="bg-white text-xs h-7 px-2.5 text-slate-700 hover:text-slate-900 border-slate-300" 
                                            onClick={() => addQuestion(sIdx)}
                                        >
                                            <Plus className="mr-1 h-3 w-3" /> Custom Blank Question
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Bottom Add Domains Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <Button 
                    className="w-full sm:w-auto bg-[#1C4D8D] hover:bg-[#153B6D] active:bg-[#153B6D] text-white text-xs font-semibold h-10 px-5 shadow-xs" 
                    onClick={() => setIsSectionPoolOpen(true)}
                >
                    <Layers className="mr-2 h-4 w-4" /> Add Domains from Section Pool
                </Button>
                <Button 
                    className="w-full sm:w-auto border-dashed text-xs font-medium text-slate-600 hover:text-slate-900 bg-white h-10 px-4" 
                    variant="outline" 
                    onClick={addSection}
                >
                    <Plus className="mr-1.5 h-4 w-4" /> Create Custom Empty Domain
                </Button>
            </div>

            {/* Question Bank Modal */}
            <QuestionBankModal
                isOpen={isQuestionBankOpen}
                onClose={() => setIsQuestionBankOpen(false)}
                targetSectionTitle={sections[targetSectionIdx]?.title || "Current Section"}
                onAddQuestions={handleAddQuestionsFromBank}
                existingQuestionIds={new Set(sections[targetSectionIdx]?.questions.map(q => q.text) || [])}
            />

            {/* Section Pool Modal */}
            <SectionPoolModal
                isOpen={isSectionPoolOpen}
                onClose={() => setIsSectionPoolOpen(false)}
                onAddSections={handleAddSectionsFromPool}
                existingSectionTitles={new Set(sections.map(s => s.title))}
            />
        </div>
    );
}
