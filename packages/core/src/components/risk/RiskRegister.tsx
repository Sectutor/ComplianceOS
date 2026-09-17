import React, { useState, useMemo, useEffect } from 'react';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/Pagination';
import { trpc } from '@/lib/trpc';
import { Search, Filter, Download, Eye, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Shield, ArrowUpDown, ArrowUp, ArrowDown, Pencil, Hammer, Check, Trash2, MoreHorizontal, SlidersHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@complianceos/ui/ui/input';
import { Button } from '@complianceos/ui/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@complianceos/ui/ui/select';
import { Badge } from '@complianceos/ui/ui/badge';
import { EnhancedDialog } from "@complianceos/ui/ui/enhanced-dialog";
import { RiskDetailsDialog } from './RiskDetailsDialog';
import { Slot, SlotNames } from '@/registry';
import { Wand2, Sparkles, Loader2, Save } from 'lucide-react';

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
    'closed': 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
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
        'draft': 1, 'reviewed': 2, 'approved': 3, 'closed': 4
    };

    // Filter and sort risks
    const filteredRisks = useMemo(() => {
        let result = risks?.filter(risk => {
            // Reset to page 1 when filters change
            const matchesSearch =
                (risk.assessmentId?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (risk.threatDescription?.toLowerCase().includes(searchQuery.toLowerCase())) ||
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
                if (sortField === 'inherentRisk' || sortField === 'residualRisk') {
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
                        `"${(risk.threatDescription || '').replace(/"/g, '""')}"`,
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

    // Sortable header component
    const SortableHeader = ({ field, children, className = '' }: { field: SortField; children: React.ReactNode; className?: string }) => (
        <th
            className={`px-4 py-3 text-xs font-semibold text-white uppercase tracking-wider cursor-pointer hover:bg-white/10 transition-colors select-none group ${className}`}
            onClick={() => handleSort(field)}
        >
            <div className="flex items-center gap-1 justify-center">
                {children}
                {sortField === field ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                )}
            </div>
        </th>
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

    if (isLoading) {
        return (
            <div className="bg-card rounded-xl border shadow-sm p-8 text-center">
                <div className="animate-pulse text-muted-foreground">Loading Risk Register...</div>
            </div>
        );
    }

    return (
        <div className="bg-card rounded-xl border shadow-sm">
            {/* Header */}
            <div className="p-6 border-b">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-950">
                            <Shield className="w-5 h-5 text-blue-700" />
                            Risk Register
                        </h2>
                        <p className="text-slate-900 text-sm mt-1 font-medium">
                            Consolidated view of all identified risks and their treatment status
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3 mt-4">
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                            placeholder="Search risks..."
                            className="pl-10"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="reviewed">Reviewed</SelectItem>
                            <SelectItem value="approved">Approved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={selectedAssetId || 'all'} onValueChange={(val) => setSelectedAssetId(val === 'all' ? null : val)}>
                        <SelectTrigger className="w-[180px]">
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
                    {/* 
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Priority</SelectItem>
                            <SelectItem value="Critical">Critical</SelectItem>
                            <SelectItem value="High">High</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="Low">Low</SelectItem>
                        </SelectContent>
                    </Select> 
                    */}
                    <Select value={riskLevelFilter} onValueChange={setRiskLevelFilter}>
                        <SelectTrigger className="w-[140px]">
                            <SelectValue placeholder="Risk Level" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Levels</SelectItem>
                            <SelectItem value="Very High">Very High</SelectItem>
                            <SelectItem value="High">High</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="Low">Low</SelectItem>
                        </SelectContent>
                    </Select>

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
                                checked={visibleColumns.assessmentId}
                                onCheckedChange={() => toggleColumn('assessmentId')}
                                className="text-xs cursor-pointer"
                            >
                                Risk ID
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={visibleColumns.threatDescription}
                                onCheckedChange={() => toggleColumn('threatDescription')}
                                className="text-xs cursor-pointer"
                            >
                                Description
                            </DropdownMenuCheckboxItem>
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
                                Status & Actions are always pinned
                            </div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {/* Table Container */}
            <div className="rounded-xl border border-slate-200 shadow-xs overflow-hidden bg-white m-4 min-w-0">
                <div className="w-full overflow-x-auto">
                    <table className="w-full min-w-[760px] border-collapse text-left">
                        <thead>
                            <tr className="bg-brand border-b border-brand text-white text-xs">
                                <th className="px-3 py-3.5 text-center text-white w-10 shrink-0"></th>
                                {visibleColumns.assessmentId && (
                                    <SortableHeader field="assessmentId" className="text-left text-white whitespace-nowrap min-w-[100px]">Risk ID</SortableHeader>
                                )}
                                {visibleColumns.threatDescription && (
                                    <SortableHeader field="threatDescription" className="text-left text-white min-w-[220px]">Description</SortableHeader>
                                )}
                                {visibleColumns.likelihood && (
                                    <SortableHeader field="likelihood" className="text-center text-white whitespace-nowrap w-24">Likelihood</SortableHeader>
                                )}
                                {visibleColumns.impact && (
                                    <SortableHeader field="impact" className="text-center text-white whitespace-nowrap w-24">Impact</SortableHeader>
                                )}
                                {visibleColumns.inherentRisk && (
                                    <SortableHeader field="inherentRisk" className="text-center text-white whitespace-nowrap w-28">Inherent</SortableHeader>
                                )}
                                {visibleColumns.residualRisk && (
                                    <SortableHeader field="residualRisk" className="text-center text-white whitespace-nowrap w-28">Residual</SortableHeader>
                                )}
                                {visibleColumns.treatmentOption && (
                                    <SortableHeader field="treatmentOption" className="text-left text-white whitespace-nowrap min-w-[130px]">Treatment</SortableHeader>
                                )}
                                {/* Sticky Status Header */}
                                <SortableHeader
                                    field="status"
                                    className="text-center text-white whitespace-nowrap sticky right-[84px] z-20 bg-brand shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.15)] w-28 min-w-[100px]"
                                >
                                    Status
                                </SortableHeader>
                                {/* Sticky Actions Header */}
                                <th className="px-3 py-3.5 text-center text-xs font-semibold text-white uppercase tracking-wider sticky right-0 z-20 bg-brand w-[84px] min-w-[84px]">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200/80">
                            {paginatedRisks.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-4 py-12 text-center bg-white">
                                        <Shield className="w-12 h-12 mx-auto text-gray-400 opacity-30 mb-4" />
                                        <p className="text-gray-500">No risks found matching your criteria.</p>
                                    </td>
                                </tr>
                            ) : (
                                paginatedRisks.map((risk) => (
                                    <React.Fragment key={risk.id}>
                                        {/* Main Row */}
                                        <tr
                                            className="bg-white hover:bg-slate-50 transition-colors duration-150 cursor-pointer group text-sm"
                                            onDoubleClick={() => onEditRisk(risk)}
                                            title="Double-click to edit"
                                        >
                                            <td className="px-3 py-3 text-center w-10">
                                                <button
                                                    onClick={() => toggleRowExpand(risk.id)}
                                                    className="p-1 hover:bg-slate-200/70 rounded text-slate-500 transition-colors"
                                                    title={expandedRows.has(risk.id) ? "Collapse details" : "Expand details"}
                                                >
                                                    {expandedRows.has(risk.id) ? (
                                                        <ChevronUp className="w-4 h-4" />
                                                    ) : (
                                                        <ChevronDown className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </td>

                                            {visibleColumns.assessmentId && (
                                                <td className="px-3 py-3 whitespace-nowrap">
                                                    <span className="font-mono text-xs font-semibold text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                                                        {risk.assessmentId}
                                                    </span>
                                                </td>
                                            )}

                                            {visibleColumns.threatDescription && (
                                                <td className="px-3 py-3 min-w-[220px] max-w-[420px]">
                                                    <div
                                                        className="line-clamp-2 text-xs font-normal text-slate-700 leading-relaxed"
                                                        title={risk.contextSnapshot?.description || risk.description || risk.threatDescription || ''}
                                                    >
                                                        {risk.contextSnapshot?.description || risk.description || risk.threatDescription || '-'}
                                                    </div>
                                                </td>
                                            )}

                                            {visibleColumns.likelihood && (
                                                <td className="px-3 py-3 text-center whitespace-nowrap">
                                                    <span className="text-xs font-medium text-slate-700">{risk.likelihood || '-'}</span>
                                                </td>
                                            )}

                                            {visibleColumns.impact && (
                                                <td className="px-3 py-3 text-center whitespace-nowrap">
                                                    <span className="text-xs font-medium text-slate-700">{risk.impact || '-'}</span>
                                                </td>
                                            )}

                                            {visibleColumns.inherentRisk && (
                                                <td className="px-3 py-3 text-center whitespace-nowrap">
                                                    {(() => {
                                                        const l = normalizeValue(risk.likelihood);
                                                        const i = normalizeValue(risk.impact);
                                                        const score = l * i;

                                                        let level = 'Low';
                                                        let color = 'bg-gray-100 text-gray-800';

                                                        if (score >= 15) { level = 'Very High'; color = 'bg-red-600 text-white shadow-xs'; }
                                                        else if (score >= 8) { level = 'High'; color = 'bg-orange-500 text-white shadow-xs'; }
                                                        else if (score >= 4) { level = 'Medium'; color = 'bg-yellow-400 text-black shadow-xs'; }
                                                        else { level = 'Low'; color = 'bg-green-400 text-black shadow-xs'; }

                                                        return (
                                                            <Badge className={`${color} border-0 font-bold text-[11px] px-2 py-0.5`}>
                                                                {level}
                                                            </Badge>
                                                        );
                                                    })()}
                                                </td>
                                            )}

                                            {visibleColumns.residualRisk && (
                                                <td className="px-3 py-3 text-center whitespace-nowrap">
                                                    {(() => {
                                                        const score = normalizeValue(risk.residualRisk);

                                                        let level = 'Low';
                                                        let color = 'bg-gray-100 text-gray-800';

                                                        if (score >= 4) { level = 'Very High'; color = 'bg-red-600 text-white shadow-xs'; }
                                                        else if (score === 3) { level = 'High'; color = 'bg-orange-500 text-white shadow-xs'; }
                                                        else if (score === 2) { level = 'Medium'; color = 'bg-yellow-400 text-black shadow-xs'; }
                                                        else { level = 'Low'; color = 'bg-green-400 text-black shadow-xs'; }

                                                        return (
                                                            <Badge className={`${color} border-0 font-bold text-[11px] px-2 py-0.5`}>
                                                                {risk.contextSnapshot?.residualRisk || risk.residualRisk || level}
                                                            </Badge>
                                                        );
                                                    })()}
                                                </td>
                                            )}

                                            {visibleColumns.treatmentOption && (
                                                <td className="px-3 py-3 whitespace-nowrap">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="text-xs capitalize font-medium text-slate-700">
                                                            {risk.contextSnapshot?.treatmentStrategy || risk.treatmentOption || '-'}
                                                        </span>
                                                        {(risk as any).treatmentCount > 0 && (
                                                            <Badge variant="secondary" className="text-[10px] font-bold bg-green-50 text-green-700 border-green-200 px-1.5 py-0">
                                                                {(risk as any).treatmentCount}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </td>
                                            )}

                                            {/* Sticky Status Column */}
                                            <td className="px-3 py-3 text-center whitespace-nowrap sticky right-[84px] z-10 bg-white group-hover:bg-slate-50 transition-colors shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)] border-l border-slate-100">
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
                                            </td>

                                            {/* Sticky Actions Column */}
                                            <td className="px-2 py-3 text-center whitespace-nowrap sticky right-0 z-10 bg-white group-hover:bg-slate-50 transition-colors">
                                                <div className="flex items-center justify-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedRisk(risk);
                                                        }}
                                                        className="h-7 w-7 p-0 hover:bg-brand/10 hover:text-brand rounded-md"
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
                                                                className="h-7 w-7 p-0 hover:bg-slate-200/70 rounded-md"
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
                                                                            description: `Threat: ${risk.threatDescription || 'N/A'}. Recommended Actions: ${risk.recommendedActions || 'N/A'}.`,
                                                                            priority: (risk as any).priority?.toLowerCase() === 'critical' ? 'high' : ((risk as any).priority?.toLowerCase() || 'medium'),
                                                                            dueDate: risk.nextReviewDate || undefined,
                                                                        });
                                                                        toast.success('Task created in Action Center');
                                                                        setCreatedTaskIds(prev => new Set([...prev, risk.id]));
                                                                    } catch (err: any) {
                                                                        toast.error(`Failed: ${err.message}`);
                                                                    }
                                                                }}
                                                                className="gap-2 cursor-pointer text-xs"
                                                            >
                                                                {createdTaskIds.has(risk.id) ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Hammer className="w-3.5 h-3.5" />}
                                                                {createdTaskIds.has(risk.id) ? 'Task Created' : 'Create Task'}
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
                                                                className="gap-2 text-purple-700 focus:text-purple-800 focus:bg-purple-50 cursor-pointer text-xs"
                                                            >
                                                                <Wand2 className="w-3.5 h-3.5" />
                                                                AI Smart Insights
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Expanded Row Details */}
                                        {
                                            expandedRows.has(risk.id) && (
                                                <tr className="bg-slate-50 border-b border-slate-200">
                                                    <td colSpan={10} className="px-8 py-5">
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                                                            <div>
                                                                <h4 className="font-semibold text-gray-900 mb-1 text-xs uppercase tracking-wider">Vulnerability</h4>
                                                                <p className="text-gray-600 text-xs leading-relaxed">{risk.vulnerabilityDescription || 'Not specified'}</p>
                                                            </div>
                                                            <div>
                                                                <h4 className="font-semibold text-gray-900 mb-1 text-xs uppercase tracking-wider">Existing Controls</h4>
                                                                <p className="text-gray-600 text-xs leading-relaxed">{risk.existingControls || 'None documented'}</p>
                                                            </div>
                                                            <div>
                                                                <h4 className="font-semibold text-gray-900 mb-1 text-xs uppercase tracking-wider">Recommended Actions</h4>
                                                                <p className="text-gray-600 text-xs leading-relaxed">{risk.recommendedActions || 'None specified'}</p>
                                                            </div>
                                                            <div>
                                                                <h4 className="font-semibold text-gray-900 mb-1 text-xs uppercase tracking-wider">Control Effectiveness</h4>
                                                                <p className="text-gray-600 text-xs capitalize">{risk.controlEffectiveness || 'Not evaluated'}</p>
                                                            </div>
                                                            <div>
                                                                <h4 className="font-semibold text-gray-900 mb-1 text-xs uppercase tracking-wider">Assessment Date</h4>
                                                                <p className="text-gray-600 text-xs">
                                                                    {risk.assessmentDate ? new Date(risk.assessmentDate).toLocaleDateString() : 'Not set'}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <h4 className="font-semibold text-gray-900 mb-1 text-xs uppercase tracking-wider">Next Review</h4>
                                                                <p className="text-gray-600 text-xs">
                                                                    {risk.nextReviewDate ? new Date(risk.nextReviewDate).toLocaleDateString() : 'Not scheduled'}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <h4 className="font-semibold text-gray-900 mb-1 text-xs uppercase tracking-wider">Source</h4>
                                                                <Badge variant="secondary" className="text-xs font-medium bg-blue-50 text-blue-700 border-blue-200">
                                                                    {risk.contextSnapshot?.source || 'Manual'}
                                                                </Badge>
                                                            </div>
                                                            <div>
                                                                <h4 className="font-semibold text-gray-900 mb-1 text-xs uppercase tracking-wider">Asset</h4>
                                                                <div className="text-gray-600 text-xs">
                                                                    {(() => {
                                                                        const assetId = risk.contextSnapshot?.assetId || (risk as any).assetId;
                                                                        if (assetId && assets) {
                                                                            const asset = assets.find((a: any) => a.id === Number(assetId));
                                                                            if (asset) {
                                                                                return (
                                                                                    <Badge variant="outline" className="text-xs font-medium bg-white">
                                                                                        {asset.name}
                                                                                    </Badge>
                                                                                );
                                                                            }
                                                                        }
                                                                        const manualAssets = parseAffectedAssets(risk.affectedAssets);
                                                                        if (manualAssets.length > 0) {
                                                                            return (
                                                                                <div className="flex flex-wrap gap-1">
                                                                                    {manualAssets.map((asset, i) => (
                                                                                        <Badge key={i} variant="secondary" className="text-xs bg-gray-100 text-gray-700 border-gray-200">
                                                                                            {asset}
                                                                                        </Badge>
                                                                                    ))}
                                                                                </div>
                                                                            );
                                                                        }
                                                                        return 'None specified';
                                                                    })()}
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <h4 className="font-semibold text-gray-900 mb-1 text-xs uppercase tracking-wider">Owner</h4>
                                                                <p className="text-gray-600 text-xs">{risk.contextSnapshot?.riskOwner || risk.riskOwner || 'Unassigned'}</p>
                                                            </div>
                                                            {risk.notes && (
                                                                <div className="md:col-span-3">
                                                                    <h4 className="font-semibold text-gray-900 mb-1 text-xs uppercase tracking-wider">Notes</h4>
                                                                    <p className="text-gray-600 text-xs leading-relaxed">{risk.notes}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        }
                                    </React.Fragment>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination outside horizontal scroll */}
                {totalRisks > 0 && (
                    <div className="border-t border-slate-200 bg-white">
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

            {/* Summary Footer */}
            < div className="px-6 py-4 border-t bg-muted/30" >
                <div className="flex flex-wrap gap-6 text-sm">
                    <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Total Risks:</span>
                        <span className="font-semibold">{filteredRisks.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <span className="text-muted-foreground">High/Critical:</span>
                        <span className="font-semibold text-red-600">
                            {filteredRisks.filter(r => r.inherentRisk === 'High' || r.inherentRisk === 'Very High').length}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-muted-foreground">With Treatments:</span>
                        <span className="font-semibold text-green-600">
                            {filteredRisks.filter(r => (r as any).treatmentCount > 0).length}
                        </span>
                    </div>
                </div>
            </div >

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
                        <Wand2 className="w-5 h-5 text-purple-600" />
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
                                className="bg-purple-600 hover:bg-purple-700 text-white gap-2"
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
                    <div className="bg-purple-50/50 p-6 rounded-xl border border-purple-100">
                        <h4 className="font-semibold text-purple-900 mb-4 flex items-center gap-2">
                            <ArrowUpDown className="w-4 h-4" />
                            Step 1: AI Auto-Triage
                        </h4>
                        <div className="flex items-start gap-6">
                            <div className="flex-1 space-y-4">
                                <p className="text-sm text-purple-800 italic">
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
                                <div className="w-64 bg-white p-4 rounded-lg border border-purple-200 shadow-sm animate-in fade-in slide-in-from-right-4 duration-500">
                                    <h5 className="text-xs font-bold text-purple-700 uppercase mb-3">AI Recommendation</h5>
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
                            <Sparkles className="w-4 h-4 text-purple-600" />
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
