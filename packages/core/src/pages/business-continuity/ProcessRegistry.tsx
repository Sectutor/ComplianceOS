import React, { useState, useMemo, useRef, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { useClientContext } from "@/contexts/ClientContext";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Input } from "@complianceos/ui/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";
import {
    Loader2, Plus, Search, Filter, RotateCcw, ArrowLeft,
    FileSpreadsheet, FileJson, ArrowUp, ArrowDown, ArrowUpDown,
    Activity, Clock, Edit, ChevronLeft, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import { useLocation, useRoute } from "wouter";
import { Breadcrumb } from "@/components/Breadcrumb";
import Pagination from "@/components/Pagination";

export default function ProcessRegistry() {
    const { selectedClientId } = useClientContext();
    const [location, setLocation] = useLocation();
    const [match, params] = useRoute("/clients/:id/business-continuity/processes");

    // Robustly get clientId from URL or Context
    const clientId = params?.id ? parseInt(params.id) : selectedClientId;

    const [searchTerm, setSearchTerm] = useState("");
    const [criticalityFilter, setCriticalityFilter] = useState("all");
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 50;

    const { data: processes, isLoading, refetch } = trpc.businessContinuity.processes.list.useQuery(
        { clientId: clientId! },
        { enabled: !!clientId }
    );

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

    const filteredProcesses = useMemo(() => {
        return (processes || []).filter((p: any) => {
            const matchesSearch =
                p.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.description?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesCriticality =
                criticalityFilter === 'all' ||
                (p.criticalityTier || '').toLowerCase() === criticalityFilter.toLowerCase();

            return matchesSearch && matchesCriticality;
        });
    }, [processes, searchTerm, criticalityFilter]);

    const sortedProcesses = useMemo(() => {
        let items = [...filteredProcesses];
        if (sortConfig !== null) {
            items.sort((a: any, b: any) => {
                let aVal = a[sortConfig.key];
                let bVal = b[sortConfig.key];

                if (sortConfig.key === 'criticalityTier') {
                    const order: Record<string, number> = { 'Tier 1': 3, 'Tier 2': 2, 'Tier 3': 1 };
                    aVal = order[aVal] || 0;
                    bVal = order[bVal] || 0;
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
    }, [filteredProcesses, sortConfig]);

    const paginatedProcesses = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return sortedProcesses.slice(start, start + pageSize);
    }, [sortedProcesses, currentPage, pageSize]);

    const handleResetFilters = () => {
        setSearchTerm("");
        setCriticalityFilter("all");
        setCurrentPage(1);
    };

    const hasActiveFilters = searchTerm !== "" || criticalityFilter !== "all";

    // Horizontal scroll / column jump controls
    const tableScrollRef = useRef<HTMLDivElement>(null);
    const topScrollRef = useRef<HTMLDivElement>(null);
    const isSyncingTop = useRef(false);
    const isSyncingTable = useRef(false);
    const [currentScrollX, setCurrentScrollX] = useState(0);
    const [tableScrollWidth, setTableScrollWidth] = useState(1250);

    const columnSteps = [
        { id: "process_name", label: "1. Process Name", offset: 0 },
        { id: "dept_crit", label: "2. Dept & Criticality", offset: 280 },
        { id: "rto_rpo", label: "3. RTO & RPO Targets", offset: 550 },
        { id: "desc_actions", label: "4. Description & Actions", offset: 850 },
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
    }, [paginatedProcesses]);

    // Export helpers
    const handleExport = (format: 'csv' | 'json') => {
        if (!filteredProcesses.length) return;
        const filename = `business-processes-client-${clientId}-${new Date().toISOString().split('T')[0]}.${format}`;

        if (format === 'json') {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredProcesses, null, 2));
            const dlAnchor = document.createElement('a');
            dlAnchor.setAttribute("href", dataStr);
            dlAnchor.setAttribute("download", filename);
            dlAnchor.click();
            toast.success("JSON exported successfully");
        } else {
            const headers = ['Process Name', 'Department', 'Criticality Tier', 'RTO', 'RPO', 'Description'];
            const rows = filteredProcesses.map((p: any) => [
                `"${(p.name || '').replace(/"/g, '""')}"`,
                `"${(p.department || '').replace(/"/g, '""')}"`,
                p.criticalityTier || 'Unassessed',
                p.rto || '',
                p.rpo || '',
                `"${(p.description || '').replace(/"/g, '""')}"`
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

    return (
        <DashboardLayout>
            <div className="space-y-6 w-full max-w-full p-6">
                {/* Navigation Header */}
                <div className="mb-2">
                    <Breadcrumb
                        items={[
                            { label: "Clients", href: "/clients" },
                            { label: "Business Continuity", href: `/clients/${clientId}/business-continuity` },
                            { label: "Process Registry", href: `/clients/${clientId}/business-continuity/processes` },
                        ]}
                    />
                    <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 -ml-3 text-muted-foreground hover:text-foreground text-xs"
                        onClick={() => setLocation(`/clients/${clientId}/business-continuity`)}
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Back to BC Dashboard
                    </Button>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Process Registry</h1>
                        <p className="text-muted-foreground text-sm mt-0.5">Catalog of critical business functions, ownership, and recovery objectives (RTO/RPO).</p>
                    </div>
                    <Button
                        onClick={() => setLocation(`/clients/${clientId}/business-continuity/processes/new`)}
                        size="sm"
                        className="bg-brand hover:bg-[#163e72] text-white gap-1.5 text-xs h-8 shadow-xs"
                    >
                        <Plus className="w-4 h-4" /> Register Process
                    </Button>
                </div>

                {/* Main Table Card */}
                <Card className="border border-slate-200 shadow-2xs overflow-hidden bg-white">
                    {/* Header */}
                    <CardHeader className="py-2.5 px-4 flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 bg-white">
                        <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
                                <Activity className="h-4 w-4" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <CardTitle className="text-base font-bold text-slate-900 leading-none">
                                        Registered Processes
                                    </CardTitle>
                                    <Badge variant="outline" className="text-[11px] font-semibold text-slate-700 bg-slate-50 border-slate-200 px-2 py-0.5">
                                        {filteredProcesses.length} {filteredProcesses.length === 1 ? 'Process' : 'Processes'}
                                    </Badge>
                                </div>
                                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                                    Core organizational processes prioritized by disaster recovery impact and business continuity SLAs.
                                </CardDescription>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2.5 text-xs text-slate-700 hover:text-slate-900"
                                onClick={() => handleExport('csv')}
                                disabled={!filteredProcesses.length}
                            >
                                <FileSpreadsheet className="mr-1 h-3.5 w-3.5 text-emerald-600" />
                                Export CSV
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2.5 text-xs text-slate-700 hover:text-slate-900"
                                onClick={() => handleExport('json')}
                                disabled={!filteredProcesses.length}
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
                                placeholder="Search process name, department..."
                                className="pl-8 h-8 text-xs bg-white"
                                value={searchTerm}
                                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                            />
                        </div>

                        <Select value={criticalityFilter} onValueChange={(val) => { setCriticalityFilter(val); setCurrentPage(1); }}>
                            <SelectTrigger className="w-[150px] h-8 text-xs bg-white">
                                <Filter className="w-3 h-3 mr-1 text-slate-400" />
                                <SelectValue placeholder="Criticality" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Criticalities</SelectItem>
                                <SelectItem value="Tier 1">Tier 1 (Mission Critical)</SelectItem>
                                <SelectItem value="Tier 2">Tier 2 (Important)</SelectItem>
                                <SelectItem value="Tier 3">Tier 3 (Standard)</SelectItem>
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
                        <div style={{ width: `${Math.max(tableScrollWidth, 1250)}px`, height: '2px' }} />
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
                            <table className="w-full min-w-[1250px] text-xs border-collapse">
                            <thead>
                                <tr className="bg-brand border-b border-[#153e75]">
                                    <th className="sticky left-0 bg-brand z-20 px-3 py-2 text-left text-xs font-semibold text-white uppercase tracking-wider min-w-[240px] w-[280px] border-r border-white/20 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)] select-none h-9">
                                        <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => handleSort('name')}>
                                            <span>Process Name</span>
                                            {sortConfig?.key === 'name' ? (
                                                sortConfig?.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-amber-300" /> : <ArrowDown className="w-3 h-3 text-amber-300" />
                                            ) : (
                                                <ArrowUpDown className="w-3 h-3 opacity-30 hover:opacity-100 transition-opacity" />
                                            )}
                                        </div>
                                    </th>
                                    <SortableHeader label="Department" sortKey="department" className="min-w-[140px]" />
                                    <SortableHeader label="Criticality" sortKey="criticalityTier" className="min-w-[130px]" />
                                    <SortableHeader label="RTO" sortKey="rto" className="min-w-[120px]" />
                                    <SortableHeader label="RPO" sortKey="rpo" className="min-w-[120px]" />
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-white uppercase tracking-wider min-w-[220px] h-9 select-none">
                                        Description
                                    </th>
                                    <th className="px-3 py-2 text-right text-xs font-semibold text-white uppercase tracking-wider min-w-[80px] h-9 select-none">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-slate-500 bg-white">
                                            <Loader2 className="w-5 h-5 animate-spin mx-auto mb-1.5 text-blue-600" />
                                            Loading processes...
                                        </td>
                                    </tr>
                                ) : paginatedProcesses.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-16 text-center bg-white">
                                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <Activity className="w-6 h-6 text-slate-400" />
                                            </div>
                                            <h3 className="text-sm font-semibold text-slate-900">No Processes Found</h3>
                                            <p className="text-xs text-slate-500 mt-0.5">Register critical business operations to define recovery SLAs.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedProcesses.map((process: any) => (
                                        <tr
                                            key={process.id}
                                            className="bg-white hover:bg-slate-50/80 transition-colors border-b border-slate-200 cursor-pointer group"
                                            onClick={() => setLocation(`/clients/${clientId}/business-continuity/processes/${process.id}`)}
                                        >
                                            {/* Pinned Process Name */}
                                            <td className="sticky left-0 bg-white group-hover:bg-slate-50/80 transition-colors z-10 px-3 py-2.5 font-medium text-xs text-slate-900 border-r border-slate-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)] min-w-[240px] w-[280px]">
                                                <div className="line-clamp-1" title={process.name}>
                                                    {process.name}
                                                </div>
                                            </td>

                                            {/* Department */}
                                            <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">
                                                {process.department || "-"}
                                            </td>

                                            {/* Criticality */}
                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                                <Badge
                                                    variant="outline"
                                                    className={`text-[11px] font-medium px-2 py-0.5 border ${
                                                        process.criticalityTier === 'Tier 1' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                        process.criticalityTier === 'Tier 2' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                        'bg-slate-50 text-slate-700 border-slate-200'
                                                    }`}
                                                >
                                                    {process.criticalityTier || "Unassessed"}
                                                </Badge>
                                            </td>

                                            {/* RTO */}
                                            <td className="px-3 py-2.5 whitespace-nowrap text-xs text-slate-600">
                                                {process.rto ? (
                                                    <span className="flex items-center gap-1 font-mono">
                                                        <Clock className="w-3 h-3 text-slate-400" />
                                                        {process.rto}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">Pending BIA</span>
                                                )}
                                            </td>

                                            {/* RPO */}
                                            <td className="px-3 py-2.5 whitespace-nowrap text-xs text-slate-600">
                                                {process.rpo ? (
                                                    <span className="font-mono">{process.rpo}</span>
                                                ) : (
                                                    <span className="text-slate-400">Pending BIA</span>
                                                )}
                                            </td>

                                            {/* Description */}
                                            <td className="px-3 py-2.5 text-xs text-slate-500 max-w-[240px]">
                                                <div className="line-clamp-1" title={process.description || ''}>
                                                    {process.description || '-'}
                                                </div>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 px-2 text-xs text-slate-700 hover:text-slate-900 gap-1"
                                                        onClick={() => setLocation(`/clients/${clientId}/business-continuity/processes/${process.id}`)}
                                                    >
                                                        <Edit className="w-3.5 h-3.5" />
                                                        Edit
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
                    {filteredProcesses.length > 0 && (
                        <div className="p-3 border-t border-slate-200 bg-white">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={Math.ceil(filteredProcesses.length / pageSize)}
                                totalItems={filteredProcesses.length}
                                pageSize={pageSize}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    )}
                </Card>
            </div>
        </DashboardLayout>
    );
}
