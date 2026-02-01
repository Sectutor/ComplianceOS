import React, { useState, useMemo, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Search, Filter, Download, Eye, ChevronDown, ChevronUp, AlertTriangle, CheckCircle2, Shield, ArrowUpDown, ArrowUp, ArrowDown, Pencil, Hammer, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@complianceos/ui/ui/input';
import { Button } from '@complianceos/ui/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@complianceos/ui/ui/select';
import { Badge } from '@complianceos/ui/ui/badge';
import { EnhancedDialog } from "@complianceos/ui/ui/enhanced-dialog";
import { RiskDetailsDialog } from './RiskDetailsDialog';

interface RiskRegisterProps {
    clientId: number;
    onEditRisk: (risk: any) => void;
    heatmapFilter?: { likelihood?: string; impact?: string; type?: string } | null;
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

// Helper to normalize risk likelihood/impact values (handles "3", "3 - Medium", "Likely", etc.)
// ADJUSTED: Maps 1-4 data inputs to 2-5 visual scale for compatibility with 5x5 heatmap consistency
const normalizeValue = (val: any): number => {
    if (!val) return 0;
    const strVal = val.toString().toLowerCase().trim();
    let num = parseInt(strVal.charAt(0));

    // Map text descriptions if numeric parse fails or needs override
    if (isNaN(num)) {
        if (strVal.includes('critical') || strVal.includes('very high') || strVal.includes('extreme') || strVal.includes('catastrophic') || strVal.includes('almost certain')) num = 4;
        else if (strVal.includes('high') || strVal.includes('likely') || strVal.includes('major')) num = 3;
        else if (strVal.includes('medium') || strVal.includes('moderate') || strVal.includes('possible')) num = 2;
        else if (strVal.includes('low') || strVal.includes('unlikely') || strVal.includes('minor') || strVal.includes('rare') || strVal.includes('insignificant')) num = 1;
    }

    // Shift 1-4 data to 2-5 visual range
    if (num >= 1 && num <= 4) return num + 1;
    if (num === 5) return 5;
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
} from "@complianceos/ui/ui/dropdown-menu";

export function RiskRegister({ clientId, onEditRisk, heatmapFilter }: RiskRegisterProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [priorityFilter, setPriorityFilter] = useState<string>('all');
    const [riskLevelFilter, setRiskLevelFilter] = useState<string>('all');
    const [selectedRisk, setSelectedRisk] = useState<any>(null);
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

    // Sorting state
    type SortField = 'assessmentId' | 'threatDescription' | 'likelihood' | 'impact' | 'inherentRisk' | 'residualRisk' | 'treatmentOption' | 'riskOwner' | 'priority' | 'status';
    const [sortField, setSortField] = useState<SortField | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Fetch risk assessments with treatment counts
    const { data: risks, isLoading } = trpc.risks.getRiskAssessments.useQuery(
        { clientId },
        { enabled: !!clientId }
    );

    const utils = trpc.useUtils();
    const createTaskMutation = trpc.actions.create.useMutation();
    const [createdTaskIds, setCreatedTaskIds] = useState<Set<number>>(new Set());



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
                        `"${parseAffectedAssets(risk.affectedAssets).join('; ')}"`,
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
            className={`px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/50 select-none transition-colors ${className}`}
            onClick={() => handleSort(field)}
        >
            <div className="flex items-center gap-1 justify-center">
                {children}
                {sortField === field ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-40" />
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
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm">
                                    <Download className="w-4 h-4 mr-2" />
                                    Export
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleExport('csv')}>
                                    Export as CSV
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleExport('json')}>
                                    Export as JSON
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
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
                </div>
            </div>

            {/* Table */}
            <div className="rounded-xl border border-slate-200 shadow-2xl overflow-hidden bg-white m-4">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1200px] table-fancy">
                        <thead>
                            <tr className="border-none">
                                <th className="px-4 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider w-8"></th>
                                <SortableHeader field="assessmentId" className="text-left text-white">Risk ID</SortableHeader>
                                <SortableHeader field="threatDescription" className="text-left max-w-[250px] text-white">Description</SortableHeader>
                                <th className="px-4 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Source</th>
                                {/* <th className="px-4 py-4 text-left text-xs font-semibold text-white uppercase tracking-wider">Affected Assets</th> */}
                                <SortableHeader field="likelihood" className="text-center text-white">Likelihood</SortableHeader>
                                <SortableHeader field="impact" className="text-center text-white">Impact</SortableHeader>
                                <SortableHeader field="inherentRisk" className="text-center text-white">Inherent</SortableHeader>
                                <SortableHeader field="residualRisk" className="text-center text-white">Residual</SortableHeader>
                                <SortableHeader field="treatmentOption" className="text-left text-white">Treatment</SortableHeader>
                                <SortableHeader field="riskOwner" className="text-left text-white">Owner</SortableHeader>
                                <SortableHeader field="priority" className="text-center text-white">Priority</SortableHeader>
                                <SortableHeader field="status" className="text-center text-white">Status</SortableHeader>
                                {/* <th className="px-4 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">Policies</th> */}
                                <th className="px-4 py-4 text-center text-xs font-semibold text-white uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredRisks.length === 0 ? (
                                <tr>
                                    <td colSpan={11} className="px-4 py-12 text-center bg-white">
                                        <Shield className="w-12 h-12 mx-auto text-gray-400 opacity-30 mb-4" />
                                        <p className="text-gray-500">No risks found matching your criteria.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredRisks.map((risk) => (
                                    <React.Fragment key={risk.id}>
                                        {/* Main Row */}
                                        <tr
                                            className="bg-white border-b border-slate-200 transition-all duration-200 hover:bg-slate-50 cursor-pointer group"
                                            onDoubleClick={() => onEditRisk(risk)}
                                            title="Double-click to edit"
                                        >
                                            <td className="px-4 py-4">
                                                <button
                                                    onClick={() => toggleRowExpand(risk.id)}
                                                    className="p-1 hover:bg-gray-100 rounded text-gray-500"
                                                >
                                                    {expandedRows.has(risk.id) ? (
                                                        <ChevronUp className="w-4 h-4" />
                                                    ) : (
                                                        <ChevronDown className="w-4 h-4" />
                                                    )}
                                                </button>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="font-mono text-sm font-medium text-black">{risk.assessmentId}</span>
                                            </td>
                                            <td className="px-4 py-4 max-w-[250px]">
                                                <div className="truncate text-sm text-gray-600" title={risk.contextSnapshot?.description || risk.description || risk.threatDescription || ''}>
                                                    {risk.contextSnapshot?.description || risk.description || risk.threatDescription || '-'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <Badge variant="secondary" className="text-xs font-medium bg-blue-50 text-blue-700 border-blue-200">
                                                    {risk.contextSnapshot?.source || 'Manual'}
                                                </Badge>
                                            </td>
                                            {/* <td className="px-4 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {parseAffectedAssets(risk.affectedAssets).slice(0, 2).map((asset, i) => (
                                                        <Badge key={i} variant="secondary" className="text-xs bg-gray-100 text-gray-700 border-gray-200">
                                                            {asset}
                                                        </Badge>
                                                    ))}
                                                    {parseAffectedAssets(risk.affectedAssets).length > 2 && (
                                                        <Badge variant="outline" className="text-xs bg-white text-gray-500 border-gray-300">
                                                            +{parseAffectedAssets(risk.affectedAssets).length - 2}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </td> */}
                                            <td className="px-4 py-4 text-center">
                                                <span className="text-sm text-gray-600">{risk.likelihood || '-'}</span>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className="text-sm text-gray-600">{risk.impact || '-'}</span>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {(() => {
                                                    // Calculate Inherent Risk Level dynamically to match Heatmap
                                                    const l = normalizeValue(risk.likelihood);
                                                    const i = normalizeValue(risk.impact);
                                                    const score = l * i;

                                                    let level = 'Low';
                                                    let color = 'bg-gray-100 text-gray-800';

                                                    if (score >= 15) { level = 'Very High'; color = 'bg-red-600 text-white shadow-sm'; }
                                                    else if (score >= 8) { level = 'High'; color = 'bg-orange-500 text-white shadow-sm'; }
                                                    else if (score >= 4) { level = 'Medium'; color = 'bg-yellow-400 text-black shadow-sm'; }
                                                    else { level = 'Low'; color = 'bg-green-400 text-black shadow-sm'; } // score < 4

                                                    return (
                                                        <Badge className={`${color} border-0 font-semibold px-2.5 py-0.5`}>
                                                            {level}
                                                        </Badge>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                {(() => {
                                                    // Normalize Residual Risk Level dynamically to match Heatmap logic
                                                    // For residual, we map the single value to a score/level directly
                                                    const score = normalizeValue(risk.residualRisk);

                                                    let level = 'Low';
                                                    let color = 'bg-gray-100 text-gray-800';
                                                    // Use same thresholds as Inherent, or direct Level mapping?
                                                    // normalizeValue returns 1-5.
                                                    // Inherent uses L*I (1-25).
                                                    // Residual heatmap plots normalized score (1-5) on diagonal.
                                                    // So we should map 1-5 to colors directly.

                                                    if (score >= 5) { level = 'Very High'; color = 'bg-red-600 text-white shadow-sm'; }
                                                    else if (score === 4) { level = 'High'; color = 'bg-orange-500 text-white shadow-sm'; } // View=4 -> Score 16 (Red in HMap) -> No, mapped back to level
                                                    // Wait, if I want to match Heatmap diagonal color:
                                                    // 5*5=25(Red), 4*4=16(Red), 3*3=9(Orange), 2*2=4(Yellow). 
                                                    // So:

                                                    if (score >= 4) { level = 'Very High'; color = 'bg-red-600 text-white shadow-sm'; } // 4*4=16(Red)
                                                    else if (score === 3) { level = 'High'; color = 'bg-orange-500 text-white shadow-sm'; } // 3*3=9(Orange)
                                                    else if (score === 2) { level = 'Medium'; color = 'bg-yellow-400 text-black shadow-sm'; } // 2*2=4(Yellow)
                                                    else { level = 'Low'; color = 'bg-green-400 text-black shadow-sm'; }
                                                    // Wait, score 2 is Low? In heatmap: 
                                                    // 5=Critical(Red), 4=High(Orange), 3=Medium(Yellow), 2=Low(Green), 1=Low(Green).

                                                    // Let's use the normalized text if available, or the level name
                                                    // Actually `risk.residualRisk` IS text usually. 
                                                    // But we want to enforce the color consistency.

                                                    return (
                                                        <Badge className={`${color} border-0 font-semibold px-2.5 py-0.5`}>
                                                            {risk.contextSnapshot?.residualRisk || risk.residualRisk || level}
                                                        </Badge>
                                                    );
                                                })()}
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm capitalize text-gray-700">{risk.contextSnapshot?.treatmentStrategy || risk.treatmentOption || '-'}</span>
                                                    {(risk as any).treatmentCount > 0 && (
                                                        <Badge variant="secondary" className="text-xs bg-green-50 text-green-700 border-green-200">
                                                            {(risk as any).treatmentCount}
                                                        </Badge>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-sm text-gray-600">{risk.contextSnapshot?.riskOwner || risk.riskOwner || '-'}</span>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <Badge
                                                    variant={
                                                        risk.priority === 'Critical' ? 'error' :
                                                            risk.priority === 'High' ? 'warning' :
                                                                risk.priority === 'Medium' ? 'evaluation' :
                                                                    'info'
                                                    }
                                                    className="uppercase text-[10px] font-bold px-2.5"
                                                >
                                                    {risk.contextSnapshot?.priority || risk.priority || '-'}
                                                </Badge>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <Badge
                                                    variant={
                                                        risk.status === 'approved' ? 'success' :
                                                            risk.status === 'reviewed' ? 'info' :
                                                                risk.status === 'closed' ? 'secondary' :
                                                                    'default'
                                                    }
                                                    className="capitalize text-[10px] font-bold px-2.5"
                                                >
                                                    {risk.status || '-'}
                                                </Badge>
                                            </td>
                                            {/* <td className="px-4 py-4 text-center">
                                                {(risk as any).policyCount > 0 ? (
                                                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 whitespace-nowrap">
                                                        {(risk as any).policyCount} Policies
                                                    </Badge>
                                                ) : (
                                                    <span className="text-xs text-gray-400">-</span>
                                                )}
                                            </td> */}
                                            <td className="px-4 py-4 text-center">
                                                <div className="flex items-center justify-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setSelectedRisk(risk);
                                                        }}
                                                        className="hover:bg-[#1C4D8D]/10 hover:text-[#1C4D8D]"
                                                        title="View details"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onEditRisk(risk);
                                                        }}
                                                        className="hover:bg-[#1C4D8D]/10 hover:text-[#1C4D8D]"
                                                        title="Edit risk"
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        disabled={createdTaskIds.has(risk.id)}
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            try {
                                                                await createTaskMutation.mutateAsync({
                                                                    clientId,
                                                                    title: `Remediate Risk: ${risk.assessmentId}`,
                                                                    description: `Threat: ${risk.threatDescription || 'N/A'}. Recommended Actions: ${risk.recommendedActions || 'N/A'}.`,
                                                                    priority: risk.priority?.toLowerCase() === 'critical' ? 'high' : (risk.priority?.toLowerCase() || 'medium'),
                                                                    dueDate: risk.nextReviewDate || undefined,
                                                                });
                                                                toast.success('Task created in Action Center');
                                                                setCreatedTaskIds(prev => new Set([...prev, risk.id]));
                                                            } catch (err: any) {
                                                                toast.error(`Failed: ${err.message}`);
                                                            }
                                                        }}
                                                        className={createdTaskIds.has(risk.id) ? 'text-green-600' : 'hover:bg-blue-100 hover:text-blue-700'}
                                                        title="Create Task"
                                                    >
                                                        {createdTaskIds.has(risk.id) ? <Check className="w-4 h-4" /> : <Hammer className="w-4 h-4" />}
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Expanded Row Details */}
                                        {
                                            expandedRows.has(risk.id) && (
                                                <tr className="bg-slate-50 border-b border-slate-200">
                                                    <td colSpan={14} className="px-8 py-6">
                                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                                                            <div>
                                                                <h4 className="font-semibold text-gray-900 mb-2">Vulnerability</h4>
                                                                <p className="text-gray-600">{risk.vulnerabilityDescription || 'Not specified'}</p>
                                                            </div>
                                                            <div>
                                                                <h4 className="font-semibold text-gray-900 mb-2">Existing Controls</h4>
                                                                <p className="text-gray-600">{risk.existingControls || 'None documented'}</p>
                                                            </div>
                                                            <div>
                                                                <h4 className="font-semibold text-gray-900 mb-2">Recommended Actions</h4>
                                                                <p className="text-gray-600">{risk.recommendedActions || 'None specified'}</p>
                                                            </div>
                                                            <div>
                                                                <h4 className="font-semibold text-gray-900 mb-2">Control Effectiveness</h4>
                                                                <p className="text-gray-600 capitalize">{risk.controlEffectiveness || 'Not evaluated'}</p>
                                                            </div>
                                                            <div>
                                                                <h4 className="font-semibold text-gray-900 mb-2">Assessment Date</h4>
                                                                <p className="text-gray-600">
                                                                    {risk.assessmentDate ? new Date(risk.assessmentDate).toLocaleDateString() : 'Not set'}
                                                                </p>
                                                            </div>
                                                            <div>
                                                                <h4 className="font-semibold text-gray-900 mb-2">Next Review</h4>
                                                                <p className="text-gray-600">
                                                                    {risk.nextReviewDate ? new Date(risk.nextReviewDate).toLocaleDateString() : 'Not scheduled'}
                                                                </p>
                                                            </div>
                                                            {risk.notes && (
                                                                <div className="md:col-span-3">
                                                                    <h4 className="font-semibold text-gray-900 mb-2">Notes</h4>
                                                                    <p className="text-gray-600">{risk.notes}</p>
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
            />
        </div >
    );
}
