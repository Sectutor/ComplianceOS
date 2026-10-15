import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useParams, Link, useLocation } from 'wouter';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@complianceos/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@complianceos/ui/ui/card';
import { Badge } from '@complianceos/ui/ui/badge';
import { Input } from '@complianceos/ui/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@complianceos/ui/ui/select';
import { trpc } from '@/lib/trpc';
import {
    ArrowLeft, Search, Filter, Calendar, User, Shield, AlertTriangle, CheckCircle,
    Ban, ArrowRight, DollarSign, Trash2, Edit, Plus, RotateCcw, FileSpreadsheet, FileJson,
    ArrowUp, ArrowDown, ArrowUpDown, ChevronLeft, ChevronRight
} from 'lucide-react';
import { Breadcrumb } from '@/components/Breadcrumb';
import { PageGuide } from '@/components/PageGuide';
import { AddTreatmentDialog } from '@/components/risk/AddTreatmentDialog';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@complianceos/ui/ui/dialog';
import { toast } from 'sonner';
import Pagination from '@/components/Pagination';

export default function RiskTreatmentPlanPage() {
    const params = useParams<{ id: string }>();
    const clientId = params.id ? parseInt(params.id) : 0;
    const [_, setLocation] = useLocation();

    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 50;

    const { data: treatments, isLoading, refetch: refetchTreatments } = trpc.risks.getAllTreatments.useQuery(
        { clientId },
        { enabled: !!clientId }
    );

    // Add Treatment dialog state
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

    // Delete mutation and state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [treatmentToDelete, setTreatmentToDelete] = useState<{ id: number; strategy: string } | null>(null);

    const deleteMutation = trpc.risks.deleteRiskTreatment.useMutation({
        onSuccess: () => {
            toast.success('Treatment deleted successfully');
            setDeleteDialogOpen(false);
            setTreatmentToDelete(null);
        },
        onError: (err) => {
            toast.error(`Failed to delete: ${err.message}`);
        }
    });

    const handleDeleteClick = (treatment: { id: number; strategy: string }) => {
        setTreatmentToDelete(treatment);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (treatmentToDelete) {
            deleteMutation.mutate({ id: treatmentToDelete.id, clientId });
        }
    };

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const SortableHeader = ({ label, sortKey, className = "" }: { label: string; sortKey: string; className?: string }) => {
        const isSorted = sortConfig?.key === sortKey;
        return (
            <th
                className={`px-3 py-2 text-left text-xs font-semibold text-white uppercase tracking-wider cursor-pointer hover:bg-white/10 transition-colors select-none group h-9 whitespace-nowrap ${className}`}
                onClick={() => handleSort(sortKey)}
            >
                <div className="flex items-center gap-1.5">
                    <span>{label}</span>
                    {isSorted ? (
                        sortConfig?.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-amber-300" /> : <ArrowDown className="w-3 h-3 text-amber-300" />
                    ) : (
                        <ArrowUpDown className="w-3 h-3 opacity-30 group-hover:opacity-100 transition-opacity" />
                    )}
                </div>
            </th>
        );
    };

    const filteredTreatments = useMemo(() => {
        return (treatments || []).filter(t => {
            const matchSearch =
                t.strategy?.toLowerCase().includes(search.toLowerCase()) ||
                t.riskTitle?.toLowerCase().includes(search.toLowerCase()) ||
                t.owner?.toLowerCase().includes(search.toLowerCase()) ||
                (t.riskId && t.riskId.toLowerCase().includes(search.toLowerCase()));

            const matchStatus = statusFilter === 'all' || (t.status || '').toLowerCase() === statusFilter.toLowerCase();
            const matchType = typeFilter === 'all' || (t.treatmentType || '').toLowerCase() === typeFilter.toLowerCase();
            return matchSearch && matchStatus && matchType;
        });
    }, [treatments, search, statusFilter, typeFilter]);

    const sortedTreatments = useMemo(() => {
        let items = [...filteredTreatments];
        if (sortConfig !== null) {
            items.sort((a, b) => {
                let aVal: any = a[sortConfig.key as keyof typeof a] ?? '';
                let bVal: any = b[sortConfig.key as keyof typeof b] ?? '';

                if (sortConfig.key === 'estimatedCost') {
                    aVal = Number(aVal) || 0;
                    bVal = Number(bVal) || 0;
                } else if (sortConfig.key === 'dueDate') {
                    aVal = aVal ? new Date(aVal).getTime() : 0;
                    bVal = bVal ? new Date(bVal).getTime() : 0;
                } else if (typeof aVal === 'string' && typeof bVal === 'string') {
                    aVal = aVal.toLowerCase();
                    bVal = bVal.toLowerCase();
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return items;
    }, [filteredTreatments, sortConfig]);

    const paginatedTreatments = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return sortedTreatments.slice(start, start + pageSize);
    }, [sortedTreatments, currentPage, pageSize]);

    const totalTreatments = filteredTreatments.length;
    const totalPages = Math.ceil(totalTreatments / pageSize);

    const handleResetFilters = () => {
        setSearch('');
        setStatusFilter('all');
        setTypeFilter('all');
        setCurrentPage(1);
    };

    const hasActiveFilters = search !== '' || statusFilter !== 'all' || typeFilter !== 'all';

    // Horizontal scroll / column jump controls
    const tableScrollRef = useRef<HTMLDivElement>(null);
    const topScrollRef = useRef<HTMLDivElement>(null);
    const isSyncingTop = useRef(false);
    const isSyncingTable = useRef(false);
    const [currentScrollX, setCurrentScrollX] = useState(0);
    const [tableScrollWidth, setTableScrollWidth] = useState(1300);

    const columnSteps = [
        { id: "strategy", label: "1. Risk & Strategy", offset: 0 },
        { id: "ownership", label: "2. Type & Ownership", offset: 340 },
        { id: "schedule", label: "3. Due Date & Cost", offset: 600 },
        { id: "status", label: "4. Status & Actions", offset: 850 },
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
            isSyncingTop.current = false;
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
    }, [paginatedTreatments]);

    // Export helpers
    const handleExport = (format: 'csv' | 'json') => {
        if (!filteredTreatments.length) return;
        const filename = `risk-treatments-client-${clientId}-${new Date().toISOString().split('T')[0]}.${format}`;

        if (format === 'json') {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredTreatments, null, 2));
            const dlAnchor = document.createElement('a');
            dlAnchor.setAttribute("href", dataStr);
            dlAnchor.setAttribute("download", filename);
            dlAnchor.click();
            toast.success("JSON exported successfully");
        } else {
            const headers = ['Strategy', 'Risk Title', 'Risk ID', 'Treatment Type', 'Owner', 'Due Date', 'Cost', 'Status'];
            const rows = filteredTreatments.map(t => [
                `"${(t.strategy || '').replace(/"/g, '""')}"`,
                `"${(t.riskTitle || '').replace(/"/g, '""')}"`,
                t.riskId || '',
                t.treatmentType || '',
                `"${(t.owner || '').replace(/"/g, '""')}"`,
                t.dueDate ? format(new Date(t.dueDate), 'yyyy-MM-dd') : '',
                t.estimatedCost || '',
                t.status || ''
            ]);
            const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = filename;
            link.click();
            URL.revokeObjectURL(url);
            toast.success("CSV exported successfully");
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type?.toLowerCase()) {
            case 'mitigate': return <Shield className="w-3.5 h-3.5 text-blue-600" />;
            case 'transfer': return <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />;
            case 'accept': return <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />;
            case 'avoid': return <Ban className="w-3.5 h-3.5 text-rose-600" />;
            default: return <Shield className="w-3.5 h-3.5 text-slate-600" />;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'completed':
            case 'implemented':
                return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-medium px-2 py-0.5">Implemented</Badge>;
            case 'in_progress':
                return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[11px] font-medium px-2 py-0.5">In Progress</Badge>;
            case 'planned':
            default:
                return <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-[11px] font-medium px-2 py-0.5">Planned</Badge>;
        }
    };

    const formatCost = (cost: string | null) => {
        if (!cost) return '-';
        return isNaN(Number(cost)) ? cost : `$${Number(cost).toLocaleString()}`;
    };

    return (
        <DashboardLayout>
            <div className="space-y-6 w-full max-w-full p-6">
                {/* Navigation Header */}
                <div className="mb-2">
                    <Breadcrumb
                        items={[
                            { label: 'Risk Management', href: `/clients/${clientId}/risks` },
                            { label: 'Treatment Plan' }
                        ]}
                    />
                    <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 -ml-3 text-muted-foreground hover:text-foreground text-xs"
                        onClick={() => setLocation(`/clients/${clientId}/risks`)}
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Risk Dashboard
                    </Button>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Risk Treatment Plan</h1>
                        <p className="text-muted-foreground text-sm mt-0.5">
                            Track and execute risk mitigation strategies, action plans, and budget remediation efforts.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <PageGuide
                            title="Risk Treatment Plan"
                            description="Manage the actions required to reduce risk to an acceptable level."
                            rationale="Identifying risk is useless without action. This plan tracks who is doing what by when."
                            howToUse={[
                                { step: "Filter by Status", description: "check 'In Progress' or 'Overdue' items during weekly meetings." },
                                { step: "Review Strategy", description: "Ensure high-priority risks are being 'Mitigated' or 'Avoided' rather than just 'Accepted'." },
                                { step: "Track Costs", description: "Use the cost field to budget for security improvements." }
                            ]}
                            integrations={[
                                { name: "Risk Assessments", description: "Every treatment is linked to a risk; you can also treat risks directly from the Risk Register." },
                                { name: "Tasks", description: "Treatment actions can be synced to the main task manager." }
                            ]}
                        />
                        <Button onClick={() => setIsAddDialogOpen(true)}>
                            <Plus className="w-4 h-4 mr-1.5" />
                            Add Treatment
                        </Button>
                    </div>
                </div>

                {/* Card Table Container */}
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
                                        Treatment Actions
                                    </CardTitle>
                                    <Badge variant="outline" className="text-[11px] font-semibold text-slate-700 bg-slate-50 border-slate-200 px-2 py-0.5">
                                        {filteredTreatments.length} {filteredTreatments.length === 1 ? 'Treatment' : 'Treatments'}
                                    </Badge>
                                </div>
                                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                                    Remediation workstreams assigned to mitigate identified risk scenarios.
                                </CardDescription>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2.5 text-xs text-slate-700 hover:text-slate-900"
                                onClick={() => handleExport('csv')}
                                disabled={!filteredTreatments.length}
                            >
                                <FileSpreadsheet className="mr-1 h-3.5 w-3.5 text-emerald-600" />
                                Export CSV
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2.5 text-xs text-slate-700 hover:text-slate-900"
                                onClick={() => handleExport('json')}
                                disabled={!filteredTreatments.length}
                            >
                                <FileJson className="mr-1 h-3.5 w-3.5 text-blue-600" />
                                Export JSON
                            </Button>
                        </div>
                    </CardHeader>

                    {/* Filter Bar */}
                    <div className="p-3 bg-slate-50/50 border-b border-slate-200 flex flex-wrap items-center gap-2 text-xs">
                        <div className="relative flex-1 min-w-[220px] max-w-sm">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                            <Input
                                placeholder="Search treatments, risks, or owners..."
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                                className="pl-8 h-8 text-xs bg-white"
                            />
                        </div>

                        <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}>
                            <SelectTrigger className="w-[140px] h-8 text-xs bg-white">
                                <Filter className="w-3 h-3 mr-1 text-slate-400" />
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="planned">Planned</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="implemented">Implemented</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={typeFilter} onValueChange={(val) => { setTypeFilter(val); setCurrentPage(1); }}>
                            <SelectTrigger className="w-[140px] h-8 text-xs bg-white">
                                <Shield className="w-3 h-3 mr-1 text-slate-400" />
                                <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="mitigate">Mitigate</SelectItem>
                                <SelectItem value="transfer">Transfer</SelectItem>
                                <SelectItem value="accept">Accept</SelectItem>
                                <SelectItem value="avoid">Avoid</SelectItem>
                            </SelectContent>
                        </Select>

                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleResetFilters}
                                className="h-8 px-2 text-xs text-slate-600 hover:text-slate-900 gap-1 ml-auto"
                            >
                                <RotateCcw className="w-3 h-3" />
                                Reset Filters
                            </Button>
                        )}
                    </div>

                    {/* Top Column Step Navigator (1-Click Snap to Any Column) */}
                    <div className="flex flex-wrap items-center justify-between gap-1.5 px-3 py-1 bg-slate-50 border-t border-x border-slate-200 select-none">
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
                        className="w-full overflow-x-auto overflow-y-hidden bg-slate-100 border-x border-b border-slate-200 select-none h-3.5 [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-brand [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#153B6D] active:[&::-webkit-scrollbar-thumb]:bg-[#0f2d54]"
                        title="Drag top scrollbar to pan columns"
                    >
                        <div style={{ width: `${Math.max(tableScrollWidth, 1300)}px`, height: '2px' }} />
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
                            className="overflow-x-auto rounded-b border border-slate-200 shadow-2xs scroll-smooth [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-brand [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#153B6D]"
                        >
                            <table className="w-full min-w-[1300px] text-xs border-collapse">
                            <thead>
                                <tr className="bg-brand border-b border-[#153e75]">
                                    <th className="sticky left-0 bg-brand z-20 px-3 py-2 text-left text-xs font-semibold text-white uppercase tracking-wider min-w-[280px] w-[340px] border-r border-white/20 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)] select-none h-9">
                                        <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => handleSort('strategy')}>
                                            <span>Risk & Strategy</span>
                                            {sortConfig?.key === 'strategy' ? (
                                                sortConfig?.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-amber-300" /> : <ArrowDown className="w-3 h-3 text-amber-300" />
                                            ) : (
                                                <ArrowUpDown className="w-3 h-3 opacity-30 hover:opacity-100 transition-opacity" />
                                            )}
                                        </div>
                                    </th>
                                    <SortableHeader label="Type" sortKey="treatmentType" className="min-w-[120px]" />
                                    <SortableHeader label="Owner" sortKey="owner" className="min-w-[150px]" />
                                    <SortableHeader label="Due Date" sortKey="dueDate" className="min-w-[130px]" />
                                    <SortableHeader label="Est. Cost" sortKey="estimatedCost" className="min-w-[110px]" />
                                    <SortableHeader label="Status" sortKey="status" className="min-w-[120px]" />
                                    <th className="px-3 py-2 text-right text-xs font-semibold text-white uppercase tracking-wider min-w-[110px] h-9 select-none">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-slate-500 bg-white">
                                            Loading treatments...
                                        </td>
                                    </tr>
                                ) : paginatedTreatments.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-16 text-center bg-white">
                                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <Shield className="w-6 h-6 text-slate-400" />
                                            </div>
                                            {treatments?.length === 0 ? (
                                                <div className="max-w-md mx-auto">
                                                    <h3 className="text-sm font-semibold text-slate-900">No treatments yet</h3>
                                                    <p className="text-xs text-slate-500 mt-0.5">
                                                        Treatments are action plans attached to risks. Add one here, or use the
                                                        "Treat Risk" action on any risk in your register.
                                                    </p>
                                                    <Button size="sm" className="mt-3" onClick={() => setIsAddDialogOpen(true)}>
                                                        <Plus className="w-4 h-4 mr-1.5" />
                                                        Add Treatment
                                                    </Button>
                                                </div>
                                            ) : (
                                                <>
                                                    <h3 className="text-sm font-semibold text-slate-900">No Treatments Found</h3>
                                                    <p className="text-xs text-slate-500 mt-0.5">No treatment plans match your criteria. Try adjusting the search or filters.</p>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedTreatments.map((treatment) => (
                                        <tr
                                            key={treatment.id}
                                            className="bg-white hover:bg-slate-50/80 transition-colors border-b border-slate-200 group cursor-pointer"
                                            onClick={() => setLocation(`/clients/${clientId}/risks/register?openRiskId=${treatment.riskAssessmentId}`)}
                                        >
                                            {/* Pinned Strategy & Risk */}
                                            <td className="sticky left-0 bg-white group-hover:bg-slate-50/80 transition-colors z-10 px-3 py-2.5 border-r border-slate-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] min-w-[280px] w-[340px]">
                                                <div className="space-y-1">
                                                    <div className="font-medium text-xs text-slate-900 line-clamp-2" title={treatment.strategy}>
                                                        {treatment.strategy}
                                                    </div>
                                                    <Link href={`/clients/${clientId}/risks/register?openRiskId=${treatment.riskAssessmentId}`}>
                                                        <div
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="text-[11px] text-brand hover:underline flex items-center gap-1 cursor-pointer w-fit font-mono"
                                                        >
                                                            Risk: {treatment.riskTitle} ({treatment.riskId})
                                                        </div>
                                                    </Link>
                                                </div>
                                            </td>

                                            {/* Type */}
                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                                <Badge variant="outline" className={`text-[11px] font-medium gap-1 px-2 py-0.5 capitalize border ${
                                                    treatment.treatmentType === 'mitigate' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                    treatment.treatmentType === 'transfer' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                    treatment.treatmentType === 'accept' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                    treatment.treatmentType === 'avoid' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                    'bg-slate-50 text-slate-700 border-slate-200'
                                                }`}>
                                                    {getTypeIcon(treatment.treatmentType || '')}
                                                    {treatment.treatmentType || 'Mitigate'}
                                                </Badge>
                                            </td>

                                            {/* Owner */}
                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                                {treatment.owner ? (
                                                    <div className="flex items-center gap-1.5 text-xs text-slate-700">
                                                        <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-semibold text-slate-600">
                                                            {treatment.owner.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span>{treatment.owner}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 text-xs">-</span>
                                                )}
                                            </td>

                                            {/* Due Date */}
                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                                {treatment.dueDate ? (
                                                    <div className={cn(
                                                        "flex items-center gap-1.5 text-xs",
                                                        new Date(treatment.dueDate) < new Date() && treatment.status !== 'implemented' && treatment.status !== 'completed'
                                                            ? "text-rose-600 font-semibold"
                                                            : "text-slate-600"
                                                    )}>
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        {format(new Date(treatment.dueDate), 'MMM d, yyyy')}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400 text-xs">-</span>
                                                )}
                                            </td>

                                            {/* Cost */}
                                            <td className="px-3 py-2.5 whitespace-nowrap font-mono text-xs text-slate-700 font-medium">
                                                {formatCost(treatment.estimatedCost)}
                                            </td>

                                            {/* Status */}
                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                                {getStatusBadge(treatment.status || 'planned')}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 px-2 text-xs text-slate-700 hover:text-slate-900"
                                                        onClick={() => setLocation(`/clients/${clientId}/risks/register?openRiskId=${treatment.riskAssessmentId}`)}
                                                    >
                                                        View Risk <ArrowRight className="w-3 h-3 ml-1" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteClick({ id: treatment.id, strategy: treatment.strategy })}
                                                        className="h-7 w-7 text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                    {/* Pagination */}
                    {totalTreatments > 0 && (
                        <div className="p-3 border-t border-slate-200 bg-white">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalItems={totalTreatments}
                                pageSize={pageSize}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    )}
                </Card>
            </div>

            {/* Add Treatment Dialog */}
            <AddTreatmentDialog
                open={isAddDialogOpen}
                onOpenChange={setIsAddDialogOpen}
                clientId={clientId}
                onSuccess={() => refetchTreatments()}
            />

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Treatment</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this treatment? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
                            <p className="text-xs font-semibold text-rose-800 uppercase tracking-wider">
                                You are about to delete:
                            </p>
                            <p className="text-sm font-medium text-rose-900 mt-1">
                                {treatmentToDelete?.strategy}
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => setDeleteDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={confirmDelete}
                            disabled={deleteMutation.isPending}
                            className="bg-rose-600 hover:bg-rose-700"
                        >
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete Treatment'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
