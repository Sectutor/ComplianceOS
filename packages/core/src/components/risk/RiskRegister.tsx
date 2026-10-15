import React, { useState, useMemo, useEffect, useRef } from 'react';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/Pagination';
import { trpc } from '@/lib/trpc';
import {
    Search, Filter, Download, Eye, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2,
    Shield, ArrowUpDown, ArrowUp, ArrowDown, Pencil, Hammer, Check, Trash2, MoreHorizontal,
    Wand2, Sparkles, Loader2, Save, FileSpreadsheet, FileDown, ChevronLeft, ChevronRight,
    Columns, LayoutGrid, RotateCcw, ArrowRight, SlidersHorizontal
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@complianceos/ui/ui/input';
import { Button } from '@complianceos/ui/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@complianceos/ui/ui/select';
import { Badge } from '@complianceos/ui/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@complianceos/ui/ui/table";
import { EnhancedDialog } from "@complianceos/ui/ui/enhanced-dialog";
import { RiskDetailsDialog } from './RiskDetailsDialog';
import { Slot, SlotNames } from '@/registry';

interface RiskRegisterProps {
    clientId: number;
    onEditRisk: (risk: any) => void;
    heatmapFilter?: { likelihood?: string; impact?: string; type?: string } | null;
    framework?: string;
    selectedAssetId?: string | null;
    onAssetChange?: (id: string | null) => void;

}

// Risk level color mapping
const riskColors: Record<string, string> = {
    'Very High': 'bg-red-600 text-white',
    'High': 'bg-orange-500 text-white',
    'Medium': 'bg-yellow-400 text-black',
    'Low': 'bg-green-400 text-black',
    'Very Low': 'bg-green-200 text-black',
    'Critical': 'bg-red-700 text-white', // Added for consistency
    'Moderate': 'bg-yellow-400 text-black', // Added for consistency
    'Minor': 'bg-green-400 text-black', // Added for consistency
    'Insignificant': 'bg-green-200 text-black', // Added for consistency
};

const normalizeValue = (val: any): number => {
    if (!val) return 0;
    const strVal = val.toString().toLowerCase().trim();
    let num = parseInt(strVal.charAt(0));

    // Map text descriptions if numeric parse fails
    if (isNaN(num)) {
        if (strVal.includes('critical') || strVal.includes('extreme') || strVal.includes('catastrophic')) num = 5;
        else if (strVal.includes('very high') || strVal.includes('almost certain')) num = 4;
        else if (strVal.includes('high') || strVal.includes('likely') || strVal.includes('major')) num = 3;
        else if (strVal.includes('medium') || strVal.includes('moderate') || strVal.includes('possible')) num = 2;
        else if (strVal.includes('low') || strVal.includes('unlikely') || strVal.includes('minor') || strVal.includes('rare') || strVal.includes('insignificant')) num = 1;
    }

    if (num >= 1 && num <= 5) return num;
    return 0;
};

// Priority color mapping  
const priorityColors: Record<string, string> = {
    'Critical': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    'High': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    'Medium': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    'Low': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
};

// Status color mapping
const statusColors: Record<string, string> = {
    'draft': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
    'reviewed': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    'approved': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    'treated': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    'accepted': 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
    'closed': 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400',
};

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuCheckboxItem,
} from "@complianceos/ui/ui/dropdown-menu";

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@complianceos/ui/ui/alert-dialog";

export function RiskRegister({ clientId, onEditRisk, heatmapFilter, framework, selectedAssetId: propAssetId, onAssetChange }: RiskRegisterProps) {

    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [priorityFilter, setPriorityFilter] = useState<string>('all');
    const [riskLevelFilter, setRiskLevelFilter] = useState<string>('all');
    const [selectedRisk, setSelectedRisk] = useState<any>(null);
    const [riskToDelete, setRiskToDelete] = useState<any>(null);
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    const [aiActionRisk, setAiActionRisk] = useState<any>(null);
    const [aiTriageResults, setAiTriageResults] = useState<any>(null);
    // Internal fallback if not provided via props
    const [internalAssetId, setInternalAssetId] = useState<string | null>(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('assetId') || null;
    });

    const selectedAssetId = propAssetId !== undefined ? propAssetId : internalAssetId;
    const setSelectedAssetId = onAssetChange || setInternalAssetId;

    const tableContainerRef = useRef<HTMLDivElement>(null);
    const [containerWidth, setContainerWidth] = useState<number | undefined>(undefined);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    const checkScrollState = () => {
        const el = tableContainerRef.current;
        if (!el) return;
        setContainerWidth(el.clientWidth);
        const hasOverflow = el.scrollWidth > el.clientWidth + 2;
        setCanScrollLeft(el.scrollLeft > 6);
        setCanScrollRight(hasOverflow && el.scrollLeft + el.clientWidth < el.scrollWidth - 6);
    };

    useEffect(() => {
        if (!tableContainerRef.current) return;
        checkScrollState();
        const observer = new ResizeObserver(checkScrollState);
        observer.observe(tableContainerRef.current);
        window.addEventListener('resize', checkScrollState);
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', checkScrollState);
        };
    }, []);

    const scrollTable = (direction: 'left' | 'right') => {
        const el = tableContainerRef.current;
        if (!el) return;
        const delta = direction === 'right' ? 260 : -260;
        el.scrollBy({ left: delta, behavior: 'smooth' });
    };


    // Sorting state
    type SortField = 'assessmentId' | 'threatDescription' | 'likelihood' | 'impact' | 'inherentRisk' | 'residualRisk' | 'treatmentOption' | 'riskOwner' | 'priority' | 'status';
    const [sortField, setSortField] = useState<SortField | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 50;

    // Optional column visibility toggle state
    const [visibleColumns, setVisibleColumns] = useState<{
        assessmentId: boolean;
        threatDescription: boolean;
        likelihood: boolean;
        impact: boolean;
        inherentRisk: boolean;
        residualRisk: boolean;
        treatmentOption: boolean;
    }>(() => {
        try {
            const saved = localStorage.getItem(`risk_register_columns_${clientId}`);
            if (saved) return JSON.parse(saved);
        } catch (e) { /* ignore */ }
        return {
            assessmentId: true,
            threatDescription: true,
            likelihood: true,
            impact: true,
            inherentRisk: true,
            residualRisk: true,
            treatmentOption: true,
        };
    });

    const toggleColumn = (key: keyof typeof visibleColumns) => {
        setVisibleColumns(prev => {
            const updated = { ...prev, [key]: !prev[key] };
            try {
                localStorage.setItem(`risk_register_columns_${clientId}`, JSON.stringify(updated));
            } catch (e) { /* ignore */ }
            return updated;
        });
    };

    // Fetch risk assessments with treatment counts
    // Fetch risk assessments with treatment counts
    const { data: risks, isLoading } = trpc.risks.getRiskAssessments.useQuery(
        { clientId, assetId: selectedAssetId ? Number(selectedAssetId) : undefined },
        { enabled: !!clientId }
    );

    const { data: assets } = trpc.risks.getAssets.useQuery(
        { clientId },
        { enabled: !!clientId }
    );

    const utils = trpc.useUtils();
    const createTaskMutation = trpc.actions.create.useMutation();
    const [createdTaskIds, setCreatedTaskIds] = useState<Set<number>>(new Set());
    const deleteMutation = trpc.risks.delete.useMutation({
        onSuccess: () => {
            utils.risks.getRiskAssessments.invalidate();
            toast.success("Risk assessment deleted successfully");
        },
        onError: (error) => {
            toast.error(`Failed to delete risk: ${error.message}`);
        }
    });

    const updateRiskMutation = trpc.risks.upsert.useMutation({
        onSuccess: () => {
            utils.risks.getRiskAssessments.invalidate();
            toast.success("Risk updated successfully with AI insights");
            setAiActionRisk(null);
            setAiTriageResults(null);
        }
    });


    // Auto-open risk from URL param
    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const openId = params.get('openRiskId');
        if (openId && risks) {
            const risk = risks.find(r => r.id === parseInt(openId));
            if (risk) {
                setSelectedRisk(risk);
            }
        }
    }, [risks]);

    // Parse affected assets helper
    const parseAffectedAssets = (assets: any): string[] => {
        if (typeof assets === 'string') {
            try {
                return JSON.parse(assets);
            } catch {
                return [assets];
            }
        }
        return assets || [];
    };

    // Handle sort toggle
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    // Risk level order for sorting
    const riskLevelOrder: Record<string, number> = {
        'Very High': 5, 'High': 4, 'Medium': 3, 'Low': 2, 'Very Low': 1
    };
    const priorityOrder: Record<string, number> = {
        'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1
    };
    const statusOrder: Record<string, number> = {
        'draft': 1, 'reviewed': 2, 'approved': 3, 'treated': 4, 'accepted': 5, 'closed': 6
    };

    // Filter and sort risks
    const filteredRisks = useMemo(() => {
        let result = risks?.filter(risk => {
            // Reset to page 1 when filters change
            const matchesSearch =
                (risk.assessmentId?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (risk.title?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (risk.threatDescription?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (risk.description?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (risk.riskOwner?.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesStatus = statusFilter === 'all' || risk.status === statusFilter;
            const matchesPriority = priorityFilter === 'all' || risk.priority === priorityFilter;
            const matchesRiskLevel = riskLevelFilter === 'all' || risk.inherentRisk === riskLevelFilter || risk.residualRisk === riskLevelFilter;

            // Heatmap drill-down filter
            let matchesHeatmap = true;
            if (heatmapFilter?.likelihood && heatmapFilter?.impact) {
                const filterL = parseInt(heatmapFilter.likelihood);
                const filterI = parseInt(heatmapFilter.impact);

                if (heatmapFilter.type === 'residual') {
                    // For residual heatmap, we map score to diagonal (l=score, i=score)
                    // So just match residualRisk against likelihood (or impact)
                    const riskResidual = normalizeValue(risk.residualRisk);
                    // Filter match if the residual score matches the clicked cell's axis value
                    matchesHeatmap = riskResidual === filterL;
                } else {
                    // Default to Inherent logic (Likelihood x Impact)
                    const riskL = normalizeValue(risk.likelihood);
                    const riskI = normalizeValue(risk.impact);
                    matchesHeatmap = riskL === filterL && riskI === filterI;
                }
            }

            return matchesSearch && matchesStatus && matchesPriority && matchesRiskLevel && matchesHeatmap;
        }) || [];

        // Apply sorting
        if (sortField) {
            result = [...result].sort((a, b) => {
                let aVal: any = (a as any)[sortField];
                let bVal: any = (b as any)[sortField];

                // Handle special sortable fields
                if (sortField === 'threatDescription') {
                    aVal = (a.title || a.threatDescription || a.description || '').toString().toLowerCase();
                    bVal = (b.title || b.threatDescription || b.description || '').toString().toLowerCase();
                } else if (sortField === 'inherentRisk' || sortField === 'residualRisk') {
                    aVal = riskLevelOrder[aVal || ''] || 0;
                    bVal = riskLevelOrder[bVal || ''] || 0;
                } else if (sortField === 'priority') {
                    aVal = priorityOrder[aVal || ''] || 0;
                    bVal = priorityOrder[bVal || ''] || 0;
                } else if (sortField === 'status') {
                    aVal = statusOrder[aVal || ''] || 0;
                    bVal = statusOrder[bVal || ''] || 0;
                } else {
                    aVal = aVal?.toString().toLowerCase() || '';
                    bVal = bVal?.toString().toLowerCase() || '';
                }

                if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }, [risks, searchQuery, statusFilter, priorityFilter, riskLevelFilter, sortField, sortDirection, heatmapFilter]);

    // Paginated risks
    const paginatedRisks = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredRisks.slice(start, start + pageSize);
    }, [filteredRisks, currentPage]);

    const totalRisks = filteredRisks.length;
    const totalPages = Math.ceil(totalRisks / pageSize);

    const handleExport = (format: 'csv' | 'json') => {
        if (!filteredRisks.length) return;

        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `risk-register-${timestamp}.${format}`;

        if (format === 'json') {
            const dataStr = JSON.stringify(filteredRisks, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } else {
            // CSV Export
            const headers = [
                'Risk ID', 'Threat', 'Vulnerability', 'Assets',
                'Likelihood', 'Impact', 'Inherent Risk', 'Control Effectiveness', 'Residual Risk',
                'Treatment', 'Owner', 'Priority', 'Status'
            ];

            const csvContent = [
                headers.join(','),
                ...filteredRisks.map(risk => {
                    const row = [
                        risk.assessmentId,
                        `"${(risk.title || risk.threatDescription || risk.description || '').replace(/"/g, '""')}"`,
                        `"${(risk.vulnerabilityDescription || '').replace(/"/g, '""')}"`,
                        `"${(() => { const aId = risk.contextSnapshot?.assetId || (risk as any).assetId; if (aId && assets) { const asset = assets.find((a: any) => a.id === Number(aId)); if (asset) return asset.name; } return parseAffectedAssets(risk.affectedAssets).join('; '); })()}"`,
                        risk.likelihood,
                        risk.impact,
                        risk.inherentRisk,
                        risk.controlEffectiveness,
                        risk.residualRisk,
                        risk.treatmentOption,
                        risk.riskOwner,
                        risk.priority,
                        risk.status
                    ];
                    return row.join(',');
                })
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    // Horizontal scrolling & Column stepping engine
    const tableScrollRef = useRef<HTMLDivElement>(null);
    const topScrollRef = useRef<HTMLDivElement>(null);
    const isSyncingTop = useRef(false);
    const isSyncingTable = useRef(false);
    const [currentScrollX, setCurrentScrollX] = useState(0);
    const [tableScrollWidth, setTableScrollWidth] = useState(1350);

    const columnSteps = [
        { id: "inherent", label: "1. Inherent (L × I)", offset: 0 },
        { id: "treatment", label: "2. Treatment", offset: 230 },
        { id: "residual", label: "3. Residual Risk", offset: 420 },
        { id: "status", label: "4. Status & Actions", offset: 600 },
    ];

    const maxScrollLeft = tableScrollRef.current
        ? Math.max(0, tableScrollRef.current.scrollWidth - tableScrollRef.current.clientWidth)
        : 0;

    const isAtMaxRight = maxScrollLeft > 30 && currentScrollX >= maxScrollLeft - 20;

    const currentStepIndex = isAtMaxRight
        ? columnSteps.length - 1
        : columnSteps.reduce((accIndex, step, index) => {
            if (currentScrollX >= step.offset - 35) return index;
            return accIndex;
        }, 0);

    const canGoLeft = currentStepIndex > 0 || currentScrollX > 15;
    const canGoRight = currentStepIndex < columnSteps.length - 1;

    const scrollToColumn = (index: number) => {
        if (tableScrollRef.current) {
            const clampedIndex = Math.max(0, Math.min(index, columnSteps.length - 1));
            const targetStep = columnSteps[clampedIndex];
            if (clampedIndex === columnSteps.length - 1) {
                const maxScroll = tableScrollRef.current.scrollWidth - tableScrollRef.current.clientWidth;
                const target = Math.min(maxScroll, Math.max(targetStep.offset, maxScroll - 50));
                tableScrollRef.current.scrollTo({ left: target, behavior: "smooth" });
            } else {
                tableScrollRef.current.scrollTo({ left: targetStep.offset, behavior: "smooth" });
            }
        }
    };

    const handleScrollLeft = () => {
        const prevIndex = Math.max(0, currentStepIndex - 1);
        scrollToColumn(prevIndex);
    };

    const handleScrollRight = () => {
        const nextIndex = Math.min(columnSteps.length - 1, currentStepIndex + 1);
        scrollToColumn(nextIndex);
    };

    const handleTopScroll = () => {
        if (isSyncingTable.current) return;
        isSyncingTop.current = true;
        if (tableScrollRef.current && topScrollRef.current) {
            tableScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
            setCurrentScrollX(topScrollRef.current.scrollLeft);
        }
        requestAnimationFrame(() => {
            isSyncingTop.current = false;
        });
    };

    const handleTableScroll = () => {
        if (isSyncingTop.current) return;
        isSyncingTable.current = true;
        if (tableScrollRef.current) {
            const scrollLeft = tableScrollRef.current.scrollLeft;
            setCurrentScrollX(scrollLeft);
            if (topScrollRef.current) {
                topScrollRef.current.scrollLeft = scrollLeft;
            }
        }
        requestAnimationFrame(() => {
            isSyncingTable.current = false;
        });
    };

    useEffect(() => {
        const updateWidth = () => {
            if (tableScrollRef.current) {
                setTableScrollWidth(tableScrollRef.current.scrollWidth);
                const scrollLeft = tableScrollRef.current.scrollLeft;
                setCurrentScrollX(scrollLeft);
                if (topScrollRef.current) {
                    topScrollRef.current.scrollLeft = scrollLeft;
                }
            }
        };
        updateWidth();
        window.addEventListener('resize', updateWidth);
        return () => window.removeEventListener('resize', updateWidth);
    }, [paginatedRisks]);

    // Sortable header component
    const SortableHeader = ({ field, children, className = '' }: { field: SortField; children: React.ReactNode; className?: string }) => (
        <TableHead
            className={`cursor-pointer hover:bg-white/10 transition-colors select-none text-white font-semibold py-1.5 px-2 text-xs whitespace-nowrap h-9 leading-none ${className}`}
            onClick={() => handleSort(field)}
        >
            <div className="flex items-center gap-1 justify-center">
                <span>{children}</span>
                {sortField === field ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-amber-300" /> : <ArrowDown className="w-3 h-3 text-amber-300" />
                ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-30 hover:opacity-100 transition-opacity" />
                )}
            </div>
        </TableHead>
    );

    const toggleRowExpand = (id: number) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedRows(newExpanded);
    };

    const isFilterActive = searchQuery !== '' || statusFilter !== 'all' || riskLevelFilter !== 'all' || (selectedAssetId && selectedAssetId !== 'all');

    const handleResetFilters = () => {
        setSearchQuery('');
        setStatusFilter('all');
        setRiskLevelFilter('all');
        setSelectedAssetId(null);
    };

    if (isLoading) {
        return (
            <Card className="border border-slate-200 shadow-2xs p-8 text-center bg-white">
                <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-brand" />
                    <div className="text-slate-500 font-medium text-xs">Loading Risk Register...</div>
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            <Card className="border border-slate-200 shadow-2xs overflow-hidden bg-white">
            {/* Header */}
            <CardHeader className="py-2.5 px-4 flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 bg-white">
                <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
                        <Shield className="h-4 w-4" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <CardTitle className="text-base font-bold text-slate-900 leading-none">
                                Risk Register
                            </CardTitle>
                            <Badge variant="outline" className="text-[11px] font-semibold text-slate-700 bg-slate-50 border-slate-200 px-2 py-0.5">
                                {filteredRisks.length} {filteredRisks.length === 1 ? 'Risk' : 'Risks'}
                            </Badge>
                        </div>
                        <CardDescription className="text-xs text-muted-foreground mt-0.5">
                            Consolidated registry of identified risks, ISO/NIST ratings, and treatment statuses.
                        </CardDescription>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-xs text-slate-700 hover:text-slate-900"
                        onClick={() => handleExport('csv')}
                        disabled={!filteredRisks.length}
                    >
                        <FileSpreadsheet className="mr-1 h-3.5 w-3.5 text-emerald-600" />
                        Export CSV
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2.5 text-xs text-slate-700 hover:text-slate-900"
                        onClick={() => handleExport('json')}
                        disabled={!filteredRisks.length}
                    >
                        <FileDown className="mr-1 h-3.5 w-3.5 text-blue-600" />
                        Export JSON
                    </Button>
                </div>
            </CardHeader>

            <CardContent className="p-3 sm:p-3.5 space-y-2">
                {/* Search & Filter Bar */}
                <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                        <Input
                            placeholder="Search risk ID, title, or threat description..."
                            className="pl-8 h-8 text-xs bg-white border-slate-200"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[130px] h-8 text-xs bg-white border-slate-200">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="reviewed">Reviewed</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="treated">Treated</SelectItem>
                            <SelectItem value="accepted">Accepted</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={selectedAssetId || 'all'} onValueChange={(val) => setSelectedAssetId(val === 'all' ? null : val)}>
                        <SelectTrigger className="w-[160px] h-8 text-xs bg-white border-slate-200">
                            <SelectValue placeholder="All Assets" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Assets</SelectItem>
                            {assets?.map((asset: any) => (
                                <SelectItem key={asset.id} value={asset.id.toString()}>
                                    {asset.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={riskLevelFilter} onValueChange={setRiskLevelFilter}>
                        <SelectTrigger className="w-[130px] h-8 text-xs bg-white border-slate-200">
                            <SelectValue placeholder="Risk Level" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Levels</SelectItem>
                            <SelectItem value="Critical">Critical</SelectItem>
                            <SelectItem value="Very High">Very High</SelectItem>
                            <SelectItem value="High">High</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="Low">Low</SelectItem>
                        </SelectContent>
                    </Select>
                    {isFilterActive && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleResetFilters}
                            className="h-8 px-2 text-xs text-slate-500 hover:text-slate-800 gap-1"
                        >
                            <RotateCcw className="w-3 h-3" /> Reset
                        </Button>
                    )}

                    {/* Columns Selector Dropdown */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="default" className="gap-2 ml-auto text-slate-700 hover:bg-slate-50 border-slate-200 shadow-2xs">
                                <SlidersHorizontal className="w-4 h-4 text-slate-500" />
                                <span>Columns</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 p-2 shadow-lg border-slate-200">
                            <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Visible Columns
                            </div>
                            <DropdownMenuCheckboxItem
                                checked={visibleColumns.likelihood}
                                onCheckedChange={() => toggleColumn('likelihood')}
                                className="text-xs cursor-pointer"
                            >
                                Likelihood
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={visibleColumns.impact}
                                onCheckedChange={() => toggleColumn('impact')}
                                className="text-xs cursor-pointer"
                            >
                                Impact
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={visibleColumns.inherentRisk}
                                onCheckedChange={() => toggleColumn('inherentRisk')}
                                className="text-xs cursor-pointer"
                            >
                                Inherent Risk
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={visibleColumns.residualRisk}
                                onCheckedChange={() => toggleColumn('residualRisk')}
                                className="text-xs cursor-pointer"
                            >
                                Residual Risk
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={visibleColumns.treatmentOption}
                                onCheckedChange={() => toggleColumn('treatmentOption')}
                                className="text-xs cursor-pointer"
                            >
                                Treatment
                            </DropdownMenuCheckboxItem>
                            <div className="px-2 py-1 text-[11px] text-slate-400 border-t border-slate-100 mt-1">
                                Risk ID, Threat, Status & Actions are always shown
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Visible Section Navigation & Column Status Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-slate-800 flex items-center gap-1 shrink-0 text-[11px]">
                            <LayoutGrid className="h-3 w-3 text-brand" />
                            Sections:
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-medium text-[10px] shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                            1. Risk ID & Threat (Pinned)
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-medium text-[10px] shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                            2. Inherent Rating (L × I)
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-medium text-[10px] shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            3. Treatment
                        </span>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 font-medium text-[10px] shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                            4. Residual Risk & Actions
                        </span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-[11px] shrink-0">
                        <span className="flex items-center gap-1 text-[11px]">
                            <Columns className="h-3 w-3 text-slate-400" />
                            <span>9 Cols</span>
                        </span>
                        {canGoRight && (
                            <span className="text-[10px] text-brand font-semibold bg-blue-50 px-2 py-0.5 rounded border border-blue-200 hidden md:inline-flex items-center gap-1">
                                Next: {columnSteps[currentStepIndex + 1]?.label} <ChevronRight className="h-3 w-3" />
                            </span>
                        )}
                        {!canGoRight && (
                            <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 hidden md:inline-flex items-center gap-1">
                                ✓ Last col in view
                            </span>
                        )}
                        <span className="text-slate-300">|</span>
                        <div className="flex items-center gap-0.5 bg-white border border-slate-300 rounded p-0.5 shadow-2xs">
                            <button
                                type="button"
                                onClick={handleScrollLeft}
                                disabled={!canGoLeft}
                                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                                title="Move to previous column"
                            >
                                <ChevronLeft className="h-3 w-3 text-brand" />
                                <span>Left</span>
                            </button>
                            <div className="h-3 w-px bg-slate-200" />
                            <button
                                type="button"
                                onClick={handleScrollRight}
                                disabled={!canGoRight}
                                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                                title={canGoRight ? `Next column: ${columnSteps[currentStepIndex + 1]?.label}` : "At last column"}
                            >
                                <span>Right</span>
                                <ChevronRight className="h-3 w-3 text-brand" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Top Column Step Navigator (1-Click Snap to Any Column) */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 px-3 py-1 bg-slate-50 border-t border-x border-slate-200 rounded-t-lg select-none">
                    <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[10px] uppercase font-bold text-slate-500 mr-1 tracking-wider">Columns:</span>
                        {columnSteps.map((step, idx) => {
                            const isActive = currentStepIndex === idx;
                            return (
                                <button
                                    key={step.id}
                                    type="button"
                                    onClick={() => scrollToColumn(idx)}
                                    className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                                        isActive
                                            ? "bg-brand text-white shadow-2xs"
                                            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900"
                                    }`}
                                    title={`Click to jump directly to ${step.label}`}
                                >
                                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-amber-300" : "bg-slate-400"}`} />
                                    <span>{step.label}</span>
                                </button>
                            );
                        })}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
                        <span className="text-slate-400">Step {currentStepIndex + 1} of {columnSteps.length}:</span>
                        <span className="text-brand font-bold">{columnSteps[currentStepIndex]?.label}</span>
                    </div>
                </div>

                {/* Top Horizontal Scrollbar (Synchronized 2-Way with Table) */}
                <div
                    ref={topScrollRef}
                    onScroll={handleTopScroll}
                    className="w-full overflow-x-auto overflow-y-hidden bg-slate-100 border-x border-slate-200 select-none h-3 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-brand [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#153B6D]"
                    title="Drag top scrollbar to pan columns"
                >
                    <div style={{ width: `${Math.max(tableScrollWidth, 1350)}px`, height: '2px' }} />
                </div>

                {/* Horizontally Scrollable Table Container */}
                <div className="relative group">
                    {/* Left Chevron Button */}
                    <button
                        type="button"
                        onClick={handleScrollLeft}
                        disabled={!canGoLeft}
                        className="absolute left-2 top-1/2 -translate-y-1/2 z-40 h-8 w-8 rounded-full bg-white/95 hover:bg-white text-slate-800 border border-slate-300 shadow-lg flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-110 active:scale-95 disabled:opacity-0 disabled:pointer-events-none"
                        title="Move to previous column"
                    >
                        <ChevronLeft className="h-4 w-4 text-brand" />
                    </button>

                    {/* Right Chevron Button */}
                    <button
                        type="button"
                        onClick={handleScrollRight}
                        disabled={!canGoRight}
                        className="absolute right-2 top-1/2 -translate-y-1/2 z-40 h-8 w-8 rounded-full bg-white/95 hover:bg-white text-slate-800 border border-slate-300 shadow-xl flex items-center justify-center transition-all duration-200 cursor-pointer hover:scale-110 active:scale-95 disabled:opacity-0 disabled:pointer-events-none"
                        title="Move to next column"
                    >
                        <ChevronRight className="h-4 w-4 text-brand" />
                    </button>

                    {/* Table Viewport */}
                    <div
                        ref={tableScrollRef}
                        onScroll={handleTableScroll}
                        className="overflow-x-auto rounded-b border border-slate-200 shadow-2xs scroll-smooth"
                    >
                        <table className="w-full min-w-[1350px] caption-bottom text-sm border-collapse">
                            <TableHeader>
                                <TableRow className="bg-brand hover:bg-brand border-none text-white h-9">
                                    {/* SECTION 1: Expand + Risk ID (Sticky Left: 0) */}
                                    <TableHead className="w-[140px] min-w-[140px] sticky left-0 z-30 bg-brand text-white font-semibold py-1.5 px-3 text-xs border-r border-white/20 whitespace-nowrap h-9 leading-none">
                                        Risk ID
                                    </TableHead>

                                    {/* SECTION 1b: Threat Description (Sticky Left: 140px) */}
                                    <TableHead className="w-[320px] min-w-[280px] sticky left-[140px] z-30 bg-brand text-white font-semibold py-1.5 px-3 text-xs border-r-2 border-white/40 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.25)] whitespace-nowrap h-9 leading-none">
                                        Threat / Vulnerability
                                    </TableHead>

                                    {/* SECTION 2: Inherent Ratings */}
                                    {visibleColumns.likelihood && (
                                        <SortableHeader field="likelihood" className="w-[90px] min-w-[90px] text-center border-r border-white/20">
                                            Likelihood
                                        </SortableHeader>
                                    )}
                                    {visibleColumns.impact && (
                                        <SortableHeader field="impact" className="w-[90px] min-w-[90px] text-center border-r border-white/20">
                                            Impact
                                        </SortableHeader>
                                    )}
                                    {visibleColumns.inherentRisk && (
                                        <SortableHeader field="inherentRisk" className="w-[125px] min-w-[125px] text-center border-r-2 border-white/30">
                                            Inherent Risk
                                        </SortableHeader>
                                    )}

                                    {/* SECTION 3: Treatment */}
                                    {visibleColumns.treatmentOption && (
                                        <SortableHeader field="treatmentOption" className="w-[160px] min-w-[160px] text-left px-3 border-r border-white/20">
                                            Treatment
                                        </SortableHeader>
                                    )}

                                    {/* SECTION 4: Residual Rating & Status */}
                                    {visibleColumns.residualRisk && (
                                        <SortableHeader field="residualRisk" className="w-[125px] min-w-[125px] text-center border-r border-white/20">
                                            Residual Risk
                                        </SortableHeader>
                                    )}
                                    <SortableHeader field="status" className="w-[110px] min-w-[110px] text-center border-r border-white/20">
                                        Status
                                    </SortableHeader>
                                    <TableHead className="w-[110px] min-w-[110px] text-center text-white font-semibold py-1.5 px-2 text-xs whitespace-nowrap h-9 leading-none">
                                        Actions
                                    </TableHead>
                                    <TableHead className="w-[100px] min-w-[100px] bg-[#163E72] text-white/50 text-[10px] text-center italic py-1.5 px-2 whitespace-nowrap h-9 leading-none">
                                        End
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                        <TableBody>
                            {paginatedRisks.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="py-12 text-center bg-white">
                                        <Shield className="w-10 h-10 mx-auto text-slate-300 mb-3" />
                                        <p className="text-slate-600 font-medium text-sm">No risks found matching your criteria.</p>
                                        <p className="text-slate-400 text-xs mt-1">Try adjusting your search terms or filters.</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedRisks.map((risk) => (
                                    <React.Fragment key={risk.id}>
                                        <TableRow
                                            className="group hover:bg-slate-50/80 transition-colors border-b border-slate-200 cursor-pointer bg-white"
                                            onDoubleClick={() => onEditRisk(risk)}
                                            title="Double-click to edit risk"
                                        >
                                            {/* SECTION 1: Expand + Risk ID (Sticky Left: 0) */}
                                            <TableCell className="w-[140px] min-w-[140px] sticky left-0 z-20 bg-white group-hover:bg-slate-50 align-middle py-2 px-3 border-r border-slate-200">
                                                <div className="flex items-center gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); toggleRowExpand(risk.id); }}
                                                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition-colors"
                                                        title={expandedRows.has(risk.id) ? "Collapse details" : "Expand details"}
                                                    >
                                                        {expandedRows.has(risk.id) ? (
                                                            <ChevronUp className="w-3.5 h-3.5" />
                                                        ) : (
                                                            <ChevronDown className="w-3.5 h-3.5" />
                                                        )}
                                                    </button>
                                                    <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                                        {risk.assessmentId}
                                                    </span>
                                                </div>
                                            </TableCell>

                                            {/* SECTION 1b: Threat Description (Sticky Left: 140px) */}
                                            <TableCell className="w-[320px] min-w-[280px] sticky left-[140px] z-20 bg-white group-hover:bg-slate-50 align-middle py-2 px-3 text-xs border-r-2 border-slate-300 shadow-[4px_0_8px_-2px_rgba(0,0,0,0.06)]">
                                                <div className="text-xs font-medium text-slate-800 line-clamp-2 leading-snug" title={risk.title || risk.threatDescription || risk.description || ''}>
                                                    {risk.title || risk.threatDescription || risk.description || risk.contextSnapshot?.description || '-'}
                                                </div>
                                            </TableCell>

                                            {/* Likelihood */}
                                            {visibleColumns.likelihood && (
                                                <TableCell className="w-[90px] min-w-[90px] text-center py-2 px-2 border-r border-slate-200">
                                                    <span className="text-xs font-semibold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                                        {risk.likelihood ? `L: ${risk.likelihood}` : '-'}
                                                    </span>
                                                </TableCell>
                                            )}

                                            {/* Impact */}
                                            {visibleColumns.impact && (
                                                <TableCell className="w-[90px] min-w-[90px] text-center py-2 px-2 border-r border-slate-200">
                                                    <span className="text-xs font-semibold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                                        {risk.impact ? `I: ${risk.impact}` : '-'}
                                                    </span>
                                                </TableCell>
                                            )}

                                            {/* Inherent Risk */}
                                            {visibleColumns.inherentRisk && (
                                                <TableCell className="w-[125px] min-w-[125px] text-center py-2 px-2 border-r-2 border-slate-300">
                                                    {(() => {
                                                        if (risk.inherentRisk) {
                                                            const norm = risk.inherentRisk.toString().trim().toLowerCase();
                                                            let color = 'bg-gray-100 text-gray-800';
                                                            if (norm.includes('critical')) color = 'bg-red-700 text-white shadow-sm';
                                                            else if (norm.includes('very high')) color = 'bg-red-600 text-white shadow-sm';
                                                            else if (norm.includes('high')) color = 'bg-orange-500 text-white shadow-sm';
                                                            else if (norm.includes('medium') || norm.includes('moderate')) color = 'bg-yellow-400 text-black shadow-sm';
                                                            else if (norm.includes('low')) color = 'bg-green-400 text-black shadow-sm';
                                                            return (
                                                                <Badge className={`${color} border-0 font-semibold px-2 py-0.5 text-[11px]`}>
                                                                    {risk.inherentRisk}
                                                                </Badge>
                                                            );
                                                        }
    
                                                        const l = normalizeValue(risk.likelihood);
                                                        const i = normalizeValue(risk.impact);
                                                        let score = l * i;
                                                        if (score === 0 && (risk.inherentScore || (risk as any).score)) {
                                                            score = risk.inherentScore || (risk as any).score;
                                                        }
    
                                                        if (score === 0) {
                                                            return (
                                                                <Badge variant="outline" className="text-slate-500 border-slate-200 font-medium px-2 py-0.5 text-[11px]">
                                                                    Unassessed
                                                                </Badge>
                                                            );
                                                        }
    
                                                        let level = 'Low';
                                                        let color = 'bg-green-400 text-black shadow-sm';
                                                        if (score >= 20) { level = 'Critical'; color = 'bg-red-700 text-white shadow-sm'; }
                                                        else if (score >= 14) { level = 'Very High'; color = 'bg-red-600 text-white shadow-sm'; }
                                                        else if (score >= 8) { level = 'High'; color = 'bg-orange-500 text-white shadow-sm'; }
                                                        else if (score >= 4) { level = 'Medium'; color = 'bg-yellow-400 text-black shadow-sm'; }
    
                                                        return (
                                                            <Badge className={`${color} border-0 font-semibold px-2 py-0.5 text-[11px]`}>
                                                                {level}
                                                            </Badge>
                                                        );
                                                    })()}
                                                </TableCell>
                                            )}

                                            {/* Treatment Option & Count */}
                                            {visibleColumns.treatmentOption && (
                                                <TableCell className="w-[160px] min-w-[160px] py-2 px-3 border-r border-slate-200">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xs capitalize font-medium text-slate-700">
                                                            {risk.contextSnapshot?.treatmentStrategy || risk.treatmentOption || 'Mitigate'}
                                                        </span>
                                                        {(risk as any).treatmentCount > 0 && (
                                                            <Badge variant="secondary" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 px-1.5 py-0">
                                                                {(risk as any).treatmentCount}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            )}

                                            {/* Residual Risk */}
                                            {visibleColumns.residualRisk && (
                                                <TableCell className="w-[125px] min-w-[125px] text-center py-2 px-2 border-r border-slate-200">
                                                    {(() => {
                                                        const resText = risk.contextSnapshot?.residualRisk || risk.residualRisk;
                                                        if (resText) {
                                                            const norm = resText.toString().trim().toLowerCase();
                                                            let color = 'bg-gray-100 text-gray-800';
                                                            if (norm.includes('critical')) color = 'bg-red-700 text-white shadow-sm';
                                                            else if (norm.includes('very high')) color = 'bg-red-600 text-white shadow-sm';
                                                            else if (norm.includes('high')) color = 'bg-orange-500 text-white shadow-sm';
                                                            else if (norm.includes('medium') || norm.includes('moderate')) color = 'bg-yellow-400 text-black shadow-sm';
                                                            else if (norm.includes('low')) color = 'bg-green-400 text-black shadow-sm';
                                                            return (
                                                                <Badge className={`${color} border-0 font-semibold px-2 py-0.5 text-[11px]`}>
                                                                    {resText}
                                                                </Badge>
                                                            );
                                                        }
    
                                                        if (risk.residualScore) {
                                                            const score = risk.residualScore;
                                                            let level = 'Low';
                                                            let color = 'bg-green-400 text-black shadow-sm';
                                                            if (score >= 20) { level = 'Critical'; color = 'bg-red-700 text-white shadow-sm'; }
                                                            else if (score >= 14) { level = 'Very High'; color = 'bg-red-600 text-white shadow-sm'; }
                                                            else if (score >= 8) { level = 'High'; color = 'bg-orange-500 text-white shadow-sm'; }
                                                            else if (score >= 4) { level = 'Medium'; color = 'bg-yellow-400 text-black shadow-sm'; }
                                                            return (
                                                                <Badge className={`${color} border-0 font-semibold px-2 py-0.5 text-[11px]`}>
                                                                    {level}
                                                                </Badge>
                                                            );
                                                        }
    
                                                        return (
                                                            <Badge variant="outline" className="text-slate-400 border-dashed border-slate-300 font-normal px-2 py-0.5 text-[10px]" title="No residual risk assessed yet">
                                                                Pending
                                                            </Badge>
                                                        );
                                                    })()}
                                                </TableCell>
                                            )}

                                            {/* Status */}
                                            <TableCell className="w-[110px] min-w-[110px] text-center py-2 px-2 border-r border-slate-200">
                                                <Badge
                                                    variant={
                                                        risk.status === 'approved' ? 'success' :
                                                            risk.status === 'reviewed' ? 'info' :
                                                                risk.status === 'closed' ? 'secondary' :
                                                                    'default'
                                                    }
                                                    className="capitalize text-[10px] font-bold px-2 py-0.5"
                                                >
                                                    {risk.status || '-'}
                                                </Badge>
                                            </TableCell>

                                            {/* Actions */}
                                            <TableCell className="w-[110px] min-w-[110px] text-center py-2 px-2">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedRisk(risk);
                                                        }}
                                                        className="h-7 w-7 p-0 text-slate-500 hover:text-brand hover:bg-blue-50"
                                                        title="View details"
                                                    >
                                                        <Eye className="w-3.5 h-3.5" />
                                                    </Button>

                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="h-7 w-7 p-0 text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                                                            >
                                                                <MoreHorizontal className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-48">
                                                            <DropdownMenuItem
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onEditRisk(risk);
                                                                }}
                                                                className="gap-2 cursor-pointer text-xs"
                                                            >
                                                                <Pencil className="w-3.5 h-3.5" />
                                                                Edit Risk
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                disabled={createdTaskIds.has(risk.id)}
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    try {
                                                                        await createTaskMutation.mutateAsync({
                                                                            clientId,
                                                                            title: `Remediate Risk: ${risk.assessmentId}`,
                                                                            description: `Threat: ${risk.threatDescription || risk.title || 'N/A'}. Recommended Actions: ${risk.recommendedActions || 'N/A'}.`,
                                                                            priority: (risk as any).priority?.toLowerCase() === 'critical' ? 'high' : ((risk as any).priority?.toLowerCase() || 'medium'),
                                                                            dueDate: risk.nextReviewDate || undefined,
                                                                        });
                                                                        toast.success('Task created in Action Center');
                                                                        setCreatedTaskIds(prev => new Set([...prev, risk.id]));
                                                                    } catch (err: any) {
                                                                        toast.error("Failed to create task from risk", { description: err.message || "Please try again." });
                                                                    }
                                                                }}
                                                                className="gap-2 cursor-pointer text-xs"
                                                            >
                                                                {createdTaskIds.has(risk.id) ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Hammer className="w-3.5 h-3.5" />}
                                                                {createdTaskIds.has(risk.id) ? 'Task Created' : 'Remediate Task'}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setRiskToDelete(risk);
                                                                }}
                                                                className="gap-2 text-red-600 focus:text-red-700 focus:bg-red-50 cursor-pointer text-xs"
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                Delete Risk
                                                            </DropdownMenuItem>
                                                            <div className="border-t my-1" />
                                                            <DropdownMenuItem
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setAiActionRisk(risk);
                                                                    setAiTriageResults(null);
                                                                }}
                                                                className="gap-2 text-teal-700 focus:text-teal-800 focus:bg-teal-50 cursor-pointer text-xs"
                                                            >
                                                                <Wand2 className="w-3.5 h-3.5" />
                                                                AI Smart Insights
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </TableCell>

                                            {/* End buffer */}
                                            <TableCell className="w-[100px] min-w-[100px] bg-slate-50/50 py-2 px-2 text-center text-slate-300 text-[10px] select-none">
                                                —
                                            </TableCell>
                                        </TableRow>

                                        {/* Expanded Row Detail Sub-Pane */}
                                        {expandedRows.has(risk.id) && (
                                            <TableRow className="bg-slate-50/90 border-b border-slate-200">
                                                <TableCell colSpan={10} className="p-4 px-6">
                                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-2xs">
                                                        <div>
                                                            <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">Vulnerability</span>
                                                            <p className="text-slate-600 leading-relaxed">{risk.vulnerabilityDescription || 'Not specified'}</p>
                                                        </div>
                                                        <div>
                                                            <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">Existing Controls</span>
                                                            <p className="text-slate-600 leading-relaxed">{risk.existingControls || 'None documented'}</p>
                                                        </div>
                                                        <div>
                                                            <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">Recommended Actions</span>
                                                            <p className="text-slate-600 leading-relaxed">{risk.recommendedActions || 'None specified'}</p>
                                                        </div>
                                                        <div>
                                                            <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px] block mb-1">Next Review</span>
                                                            <p className="text-slate-600 leading-relaxed">
                                                                {risk.nextReviewDate ? new Date(risk.nextReviewDate).toLocaleDateString() : 'Not scheduled'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </TableBody>
                    </table>
                </div>
            </div>

            {/* Summary Footer */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-slate-50 border-t border-slate-200 text-xs rounded-b-lg">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 font-medium">Total Risks:</span>
                        <span className="font-bold text-slate-800">{filteredRisks.length}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                        <span className="text-slate-500 font-medium">High / Critical:</span>
                        <span className="font-bold text-red-600">
                            {filteredRisks.filter(r => {
                                const s = r.inherentRisk || '';
                                return s.toLowerCase().includes('high') || s.toLowerCase().includes('critical');
                            }).length}
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-slate-500 font-medium">With Treatments:</span>
                        <span className="font-bold text-emerald-600">
                            {filteredRisks.filter(r => (r as any).treatmentCount > 0).length}
                        </span>
                    </div>
                </div>

                {totalRisks > pageSize && (
                    <div>
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={totalRisks}
                            pageSize={pageSize}
                            onPageChange={setCurrentPage}
                        />
                    </div>
                )}
            </div>
        </CardContent>
    </Card>

            
            {/* Detail Dialog */}
            <RiskDetailsDialog
                open={!!selectedRisk}
                onOpenChange={(open) => !open && setSelectedRisk(null)}
                risk={selectedRisk}
                clientId={clientId}
                assets={assets}
            />

            {/* Delete Confirmation Alert */}
            <AlertDialog open={!!riskToDelete} onOpenChange={(open) => !open && setRiskToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="h-5 w-5" />
                            Delete Risk Assessment
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete the risk assessment for
                            <span className="font-semibold text-foreground"> {riskToDelete?.threatDescription || riskToDelete?.assessmentId} </span>?
                            This action cannot be undone and will permanently remove all associated data.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (riskToDelete) {
                                    deleteMutation.mutate({ id: riskToDelete.id, clientId });
                                    setRiskToDelete(null);
                                }
                            }}
                            className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-600"
                        >
                            Delete Risk
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* AI Smart Insights Dialog */}
            <EnhancedDialog
                open={!!aiActionRisk}
                onOpenChange={(open) => !open && setAiActionRisk(null)}
                title={
                    <div className="flex items-center gap-2">
                        <Wand2 className="w-5 h-5 text-teal-600" />
                        AI Smart Insights: {aiActionRisk?.assessmentId}
                    </div>
                }
                description="Leverage AI to triage this risk and get control recommendations."
                size="xl"
                footer={
                    <div className="flex justify-between w-full">
                        <Button variant="ghost" onClick={() => setAiActionRisk(null)}>Close</Button>
                        {aiTriageResults && (
                            <Button
                                onClick={() => {
                                    updateRiskMutation.mutate({
                                        id: aiActionRisk.id,
                                        clientId,
                                        likelihood: parseInt(aiTriageResults.likelihood),
                                        impact: parseInt(aiTriageResults.impact),
                                        notes: (aiActionRisk.notes || '') + `\n\n[AI Triage]: ${aiTriageResults.reasoning}`
                                    });
                                }}
                                disabled={updateRiskMutation.isLoading}
                                className="bg-teal-600 hover:bg-teal-700 text-white gap-2"
                            >
                                {updateRiskMutation.isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                Commit AI Triage to Risk
                            </Button>
                        )}
                    </div>
                }
            >
                <div className="space-y-8 py-4">
                    {/* Triage Slot */}
                    <div className="bg-teal-50/50 p-6 rounded-xl border border-teal-100">
                        <h4 className="font-semibold text-teal-900 mb-4 flex items-center gap-2">
                            <ArrowUpDown className="w-4 h-4" />
                            Step 1: AI Auto-Triage
                        </h4>
                        <div className="flex items-start gap-6">
                            <div className="flex-1 space-y-4">
                                <p className="text-sm text-teal-800 italic">
                                    "Analysis based on: <strong>{aiActionRisk?.threatDescription || 'No description'}</strong>"
                                </p>
                                <Slot
                                    name={SlotNames.RISK_AUTO_TRIAGE}
                                    props={{
                                        clientId,
                                        threatDescription: aiActionRisk?.threatDescription || '',
                                        vulnerabilityDescription: aiActionRisk?.vulnerabilityDescription || '',
                                        affectedAssets: parseAffectedAssets(aiActionRisk?.affectedAssets),
                                        onAnalysisComplete: (data: any) => {
                                            setAiTriageResults(data);
                                            toast.success("AI Triage complete! Review and commit the results below.");
                                        }
                                    }}
                                />
                            </div>

                            {aiTriageResults && (
                                <div className="w-64 bg-white p-4 rounded-lg border border-teal-200 shadow-sm animate-in fade-in slide-in-from-right-4 duration-500">
                                    <h5 className="text-xs font-bold text-teal-700 uppercase mb-3">AI Recommendation</h5>
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div>
                                            <p className="text-[10px] text-gray-500 uppercase">Likelihood</p>
                                            <p className="text-lg font-bold">{aiTriageResults.likelihood}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-500 uppercase">Impact</p>
                                            <p className="text-lg font-bold">{aiTriageResults.impact}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[10px] text-gray-500 uppercase">Reasoning</p>
                                        <p className="text-xs text-gray-700 leading-relaxed">{aiTriageResults.reasoning}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Suggestions Slot */}
                    <div className="p-2">
                        <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2 px-4">
                            <Sparkles className="w-4 h-4 text-teal-600" />
                            Step 2: Intelligent Control Suggestions
                        </h4>
                        <Slot
                            name={SlotNames.RISK_CONTROL_SUGGESTION}
                            props={{
                                clientId,
                                threat: aiActionRisk?.threatDescription || '',
                                vulnerability: aiActionRisk?.vulnerabilityDescription || '',
                                selectedControlIds: [],
                                onAddControl: (id: number) => {
                                    toast.info(`Control ${id} recommendation accepted. In a full implementation, this would link the control.`);
                                }
                            }}
                        />
                    </div>
                </div>
            </EnhancedDialog>
        </div >
    );
}
