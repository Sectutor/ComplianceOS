import React, { useState, useMemo, useRef, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
    AlertTriangle, Plus, Search, ArrowLeft, Globe, TrendingUp, ArrowUpDown,
    ArrowUp, ArrowDown, Trash2, Edit, Filter, RotateCcw, FileSpreadsheet, FileJson,
    Shield, ChevronLeft, ChevronRight
} from 'lucide-react';
import { useClientContext } from '@/contexts/ClientContext';
import { trpc } from '@/lib/trpc';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@complianceos/ui/ui/button';
import { Input } from '@complianceos/ui/ui/input';
import { Breadcrumb } from '@/components/Breadcrumb';
import { useParams, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@complianceos/ui/ui/card';
import { Badge } from '@complianceos/ui/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@complianceos/ui/ui/select';
import { PageGuide } from "@/components/PageGuide";
import Pagination from '@/components/Pagination';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@complianceos/ui/ui/dialog';
import { toast } from 'sonner';

export default function RiskThreatsPage() {
    const params = useParams();
    const { t } = useTranslation('risk');
    const routeClientId = params.id ? Number(params.id) : null;
    const { user } = useAuth();
    const [location, setLocation] = useLocation();
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');

    // Use Client Context for reliable state
    const { selectedClientId } = useClientContext();
    const effectiveClientId = routeClientId || selectedClientId;

    const { data: client, isLoading: loadingClientDetails } = trpc.clients.get.useQuery(
        { id: effectiveClientId || 0 },
        { enabled: !!effectiveClientId }
    );

    const clientId = client?.id || 0;

    const { data: threats, isLoading, refetch } = trpc.risks.getThreats.useQuery(
        { clientId },
        { enabled: !!clientId }
    );

    // Fetch Global Threat Intelligence Summary
    const { data: intelSummary } = trpc.adversaryIntel.getSummary.useQuery(
        undefined,
        { staleTime: 1000 * 60 * 30 }
    );

    const trendingTags = intelSummary?.topTags || [];
    const isTrending = (category: string) => {
        if (!category) return false;
        return trendingTags.some(t => category.toLowerCase().includes(t.tag.toLowerCase()));
    };

    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 50;

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

    // Filtered threats
    const filteredThreats = useMemo(() => {
        return (threats || []).filter(t => {
            const matchesSearch =
                t.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.threatId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.source?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.owner?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesCategory = categoryFilter === 'all' || (t.category || '').toLowerCase() === categoryFilter.toLowerCase();
            const matchesStatus = statusFilter === 'all' || (t.status || '').toLowerCase() === statusFilter.toLowerCase();

            return matchesSearch && matchesCategory && matchesStatus;
        });
    }, [threats, searchQuery, categoryFilter, statusFilter]);

    // Available categories for dropdown
    const availableCategories = useMemo(() => {
        const cats = new Set<string>();
        (threats || []).forEach(t => {
            if (t.category) cats.add(t.category);
        });
        return Array.from(cats);
    }, [threats]);

    const sortedThreats = useMemo(() => {
        let items = [...filteredThreats];
        if (sortConfig !== null) {
            items.sort((a, b) => {
                let aVal = a[sortConfig.key as keyof typeof a];
                let bVal = b[sortConfig.key as keyof typeof b];

                if (typeof aVal === 'string' && typeof bVal === 'string') {
                    aVal = aVal.toLowerCase();
                    bVal = bVal.toLowerCase();
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return items;
    }, [filteredThreats, sortConfig]);

    const paginatedThreats = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return sortedThreats.slice(start, start + pageSize);
    }, [sortedThreats, currentPage, pageSize]);

    const handleOpenAddDialog = () => {
        setLocation(`/clients/${clientId}/risks/threats/new`);
    };

    const handleEditThreat = (threat: any) => {
        setLocation(`/clients/${clientId}/risks/threats/${threat.id}`);
    };

    // Delete threat state and mutation
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [threatToDelete, setThreatToDelete] = useState<{ id: number; name: string } | null>(null);

    const deleteMutation = trpc.risks.deleteThreat.useMutation({
        onSuccess: () => {
            toast.success('Threat deleted successfully');
            setDeleteDialogOpen(false);
            setThreatToDelete(null);
            refetch();
        },
        onError: (err) => {
            toast.error(`Failed to delete: ${err.message}`);
        }
    });

    const handleDeleteClick = (threat: { id: number; name: string }) => {
        setThreatToDelete(threat);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (threatToDelete) {
            deleteMutation.mutate({ id: threatToDelete.id, clientId });
        }
    };

    const handleResetFilters = () => {
        setSearchQuery('');
        setCategoryFilter('all');
        setStatusFilter('all');
        setCurrentPage(1);
    };

    const hasActiveFilters = searchQuery !== '' || categoryFilter !== 'all' || statusFilter !== 'all';

    // Horizontal scroll / column jump controls
    const tableScrollRef = useRef<HTMLDivElement>(null);
    const topScrollRef = useRef<HTMLDivElement>(null);
    const isSyncingTop = useRef(false);
    const isSyncingTable = useRef(false);
    const [currentScrollX, setCurrentScrollX] = useState(0);
    const [tableScrollWidth, setTableScrollWidth] = useState(1400);

    const columnSteps = [
        { id: "id_name", label: "1. ID & Threat Name", offset: 0 },
        { id: "category", label: "2. Category & Intel", offset: 320 },
        { id: "source_intent", label: "3. Source & Impact", offset: 640 },
        { id: "status_actions", label: "4. Status, Owner & Actions", offset: 980 },
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
    }, [paginatedThreats]);

    // Export helpers
    const handleExport = (format: 'csv' | 'json') => {
        if (!filteredThreats.length) return;
        const filename = `threats-catalog-client-${clientId}-${new Date().toISOString().split('T')[0]}.${format}`;

        if (format === 'json') {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredThreats, null, 2));
            const dlAnchor = document.createElement('a');
            dlAnchor.setAttribute("href", dataStr);
            dlAnchor.setAttribute("download", filename);
            dlAnchor.click();
            toast.success("JSON exported successfully");
        } else {
            const headers = ['Threat ID', 'Name', 'Category', 'Source', 'Intent', 'Likelihood', 'Impact', 'Status', 'Owner', 'Last Review'];
            const rows = filteredThreats.map(t => [
                t.threatId,
                `"${(t.name || '').replace(/"/g, '""')}"`,
                `"${(t.category || '').replace(/"/g, '""')}"`,
                `"${(t.source || '').replace(/"/g, '""')}"`,
                `"${(t.intent || '').replace(/"/g, '""')}"`,
                t.likelihood || '',
                `"${(t.potentialImpact || '').replace(/"/g, '""')}"`,
                t.status || '',
                `"${(t.owner || '').replace(/"/g, '""')}"`,
                t.lastReviewDate ? new Date(t.lastReviewDate).toISOString().split('T')[0] : ''
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

    if (loadingClientDetails) return (
        <DashboardLayout>
            <div className="p-8 text-center text-muted-foreground text-sm">Loading client data...</div>
        </DashboardLayout>
    );

    if (!client) return (
        <DashboardLayout>
            <div className="p-8 text-center text-destructive text-sm">Client not found.</div>
        </DashboardLayout>
    );

    return (
        <DashboardLayout>
            <div className="space-y-6 w-full max-w-full p-6">
                <div className="mb-2">
                    <Breadcrumb
                        items={[
                            { label: "Clients", href: "/clients" },
                            { label: client?.name || "Client", href: `/clients/${clientId}` },
                            { label: "Risk Management", href: `/clients/${clientId}/risks` },
                            { label: "Threat Catalog", href: `/clients/${clientId}/risks/threats` },
                        ]}
                    />
                    <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 -ml-3 text-muted-foreground hover:text-foreground text-xs"
                        onClick={() => setLocation(`/clients/${clientId}/risks`)}
                    >
                        <ArrowLeft className="w-4 h-4 mr-1" />
                        Back to Risk Dashboard
                    </Button>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Threat Catalog</h1>
                        <p className="text-muted-foreground text-sm mt-0.5">Maintain a comprehensive library of threat vectors, actors, and adversarial scenarios.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handleOpenAddDialog}
                            size="sm"
                            className="bg-brand hover:bg-[#163e72] text-white gap-1.5 text-xs h-8 shadow-xs"
                            id="threat-add-btn"
                        >
                            <Plus className="w-4 h-4" />
                            Add Threat
                        </Button>
                        <PageGuide
                            title="Threat Catalog"
                            description="A comprehensive database of potential threat scenarios relevant to your organization."
                            rationale="Threats are the 'cause' in the risk equation (Risk = Asset x Threat x Vulnerability). Maintaining a library helps standardize risk assessments and ensures no major attack vectors are overlooked."
                            howToUse={[
                                { step: "Browse Library", description: "Use the table to view potential threats like Ransomware, Insider Threats, or Floods." },
                                { step: "Record Threats", description: "Add new custom threats or specific scenarios faced by your industry." },
                                { step: "Analyze Trends", description: "The top cards show real-world trending attacks from global intelligence feeds." }
                            ]}
                            integrations={[
                                { name: "Risk Assessment", description: "You will select from this library when creating new risk scenarios." },
                                { name: "MITRE ATT&CK", description: "Threats are mapped to MITRE TTPs (Tactics, Techniques, and Procedures) for standardized classification." }
                            ]}
                        />
                    </div>
                </div>

                {/* Global Threat Landscape Summary */}
                {intelSummary && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="bg-slate-900 text-white border-slate-800 shadow-2xs">
                            <CardHeader className="py-2.5 px-4">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-white">
                                    <Globe className="w-4 h-4 text-blue-400" />
                                    Global Threat Landscape
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="py-2.5 px-4">
                                <div className="flex gap-8">
                                    <div>
                                        <p className="text-slate-400 text-[10px] uppercase tracking-wider font-medium">Critical Alerts</p>
                                        <p className="text-2xl font-bold text-rose-500 mt-0.5">{intelSummary.criticalItems}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-400 text-[10px] uppercase tracking-wider font-medium">Feed Items</p>
                                        <p className="text-2xl font-bold text-blue-400 mt-0.5">{intelSummary.feedItems}</p>
                                    </div>
                                    <div>
                                        <p className="text-slate-400 text-[10px] uppercase tracking-wider font-medium">Recent CVEs</p>
                                        <p className="text-2xl font-bold text-amber-500 mt-0.5">{intelSummary.recentCves.length}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border border-slate-200 shadow-2xs bg-white">
                            <CardHeader className="py-2.5 px-4">
                                <CardTitle className="text-xs font-semibold flex items-center gap-2 text-slate-700 uppercase tracking-wider">
                                    <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                                    Trending Threat Categories
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="py-2.5 px-4">
                                <div className="flex flex-wrap gap-1.5">
                                    {trendingTags.slice(0, 8).map(tag => (
                                        <Badge key={tag.tag} variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-[11px] px-2 py-0.5">
                                            {tag.tag}
                                            <span className="ml-1 text-[10px] text-slate-400">({tag.count})</span>
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Threat Catalog Table Card */}
                <Card className="border border-slate-200 shadow-2xs overflow-hidden bg-white">
                    {/* Header */}
                    <CardHeader className="py-2.5 px-4 flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 bg-white">
                        <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
                                <AlertTriangle className="h-4 w-4" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <CardTitle className="text-base font-bold text-slate-900 leading-none">
                                        Threat Catalog
                                    </CardTitle>
                                    <Badge variant="outline" className="text-[11px] font-semibold text-slate-700 bg-slate-50 border-slate-200 px-2 py-0.5">
                                        {filteredThreats.length} {filteredThreats.length === 1 ? 'Threat' : 'Threats'}
                                    </Badge>
                                </div>
                                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                                    Catalog of threat sources, attack vectors, and environmental vulnerabilities.
                                </CardDescription>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2.5 text-xs text-slate-700 hover:text-slate-900"
                                onClick={() => handleExport('csv')}
                                disabled={!filteredThreats.length}
                            >
                                <FileSpreadsheet className="mr-1 h-3.5 w-3.5 text-emerald-600" />
                                Export CSV
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2.5 text-xs text-slate-700 hover:text-slate-900"
                                onClick={() => handleExport('json')}
                                disabled={!filteredThreats.length}
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
                                placeholder="Search threat name, category, actor..."
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                className="pl-8 h-8 text-xs bg-white"
                            />
                        </div>

                        <Select value={categoryFilter} onValueChange={(val) => { setCategoryFilter(val); setCurrentPage(1); }}>
                            <SelectTrigger className="w-[140px] h-8 text-xs bg-white">
                                <Filter className="w-3 h-3 mr-1 text-slate-400" />
                                <SelectValue placeholder="Category" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                {availableCategories.map(c => (
                                    <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}>
                            <SelectTrigger className="w-[130px] h-8 text-xs bg-white">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="monitored">Monitored</SelectItem>
                                <SelectItem value="mitigated">Mitigated</SelectItem>
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
                        <div style={{ width: `${Math.max(tableScrollWidth, 1400)}px`, height: '2px' }} />
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
                            <table className="w-full min-w-[1400px] text-xs border-collapse">
                            <thead>
                                <tr className="bg-brand border-b border-[#153e75]">
                                    <th className="sticky left-0 bg-brand z-20 px-3 py-2 text-left text-xs font-semibold text-white uppercase tracking-wider min-w-[100px] w-[100px] border-r border-white/20 select-none h-9">
                                        <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => handleSort('threatId')}>
                                            <span>ID</span>
                                            {sortConfig?.key === 'threatId' ? (
                                                sortConfig?.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-amber-300" /> : <ArrowDown className="w-3 h-3 text-amber-300" />
                                            ) : (
                                                <ArrowUpDown className="w-3 h-3 opacity-30 hover:opacity-100 transition-opacity" />
                                            )}
                                        </div>
                                    </th>
                                    <th className="sticky left-[100px] bg-brand z-20 px-3 py-2 text-left text-xs font-semibold text-white uppercase tracking-wider min-w-[200px] w-[240px] border-r border-white/20 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)] select-none h-9">
                                        <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => handleSort('name')}>
                                            <span>Threat Name</span>
                                            {sortConfig?.key === 'name' ? (
                                                sortConfig?.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-amber-300" /> : <ArrowDown className="w-3 h-3 text-amber-300" />
                                            ) : (
                                                <ArrowUpDown className="w-3 h-3 opacity-30 hover:opacity-100 transition-opacity" />
                                            )}
                                        </div>
                                    </th>
                                    <SortableHeader label="Category" sortKey="category" className="min-w-[140px]" />
                                    <SortableHeader label="Source / Actor" sortKey="source" className="min-w-[140px]" />
                                    <SortableHeader label="Likelihood" sortKey="likelihood" className="min-w-[100px]" />
                                    <SortableHeader label="Impact" sortKey="potentialImpact" className="min-w-[160px]" />
                                    <SortableHeader label="Status" sortKey="status" className="min-w-[110px]" />
                                    <SortableHeader label="Owner" sortKey="owner" className="min-w-[120px]" />
                                    <SortableHeader label="Last Review" sortKey="lastReviewDate" className="min-w-[110px]" />
                                    <th className="px-3 py-2 text-right text-xs font-semibold text-white uppercase tracking-wider min-w-[90px] h-9 select-none">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={10} className="py-12 text-center text-slate-500 bg-white">
                                            Loading threats...
                                        </td>
                                    </tr>
                                ) : paginatedThreats.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="py-16 text-center bg-white">
                                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <AlertTriangle className="w-6 h-6 text-slate-400" />
                                            </div>
                                            <h3 className="text-sm font-semibold text-slate-900">No Threats Found</h3>
                                            <p className="text-xs text-slate-500 mt-0.5">Start by recording threats in your catalog.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedThreats.map((threat) => (
                                        <tr
                                            key={threat.id}
                                            className="bg-white hover:bg-slate-50/80 transition-colors border-b border-slate-200 cursor-pointer group"
                                            onDoubleClick={() => handleEditThreat(threat)}
                                            onClick={() => handleEditThreat(threat)}
                                        >
                                            {/* Pinned Threat ID */}
                                            <td className="sticky left-0 bg-white group-hover:bg-slate-50/80 transition-colors z-10 px-3 py-2.5 font-mono text-xs text-slate-600 border-r border-slate-200">
                                                {threat.threatId}
                                            </td>

                                            {/* Pinned Threat Name */}
                                            <td className="sticky left-[100px] bg-white group-hover:bg-slate-50/80 transition-colors z-10 px-3 py-2.5 font-medium text-xs text-slate-900 border-r border-slate-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                                                <div className="line-clamp-1" title={threat.name}>
                                                    {threat.name}
                                                </div>
                                                {threat.description && (
                                                    <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5" title={threat.description}>
                                                        {threat.description}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Category */}
                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                                <div className="flex items-center gap-1.5">
                                                    <Badge variant="outline" className="bg-slate-50 text-slate-700 border-slate-200 text-[11px] font-medium px-2 py-0.5">
                                                        {threat.category || 'General'}
                                                    </Badge>
                                                    {isTrending(threat.category) && (
                                                        <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] px-1.5 py-0.2">
                                                            Trending
                                                        </Badge>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Source / Actor */}
                                            <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">
                                                {threat.source}
                                                {threat.intent && <span className="text-slate-400 text-[11px] ml-1">({threat.intent})</span>}
                                            </td>

                                            {/* Likelihood */}
                                            <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">
                                                {threat.likelihood || '-'}
                                            </td>

                                            {/* Impact */}
                                            <td className="px-3 py-2.5 text-xs text-slate-600 max-w-[160px]">
                                                <div className="line-clamp-1" title={threat.potentialImpact || ''}>
                                                    {threat.potentialImpact || '-'}
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                                <Badge variant="outline" className={`text-[11px] font-medium capitalize px-2 py-0.5 border ${
                                                    threat.status === 'active' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                    threat.status === 'monitored' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                    'bg-slate-50 text-slate-700 border-slate-200'
                                                }`}>
                                                    {threat.status || 'Active'}
                                                </Badge>
                                            </td>

                                            {/* Owner */}
                                            <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">
                                                {threat.owner || '-'}
                                            </td>

                                            {/* Last Review */}
                                            <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">
                                                {threat.lastReviewDate ? new Date(threat.lastReviewDate).toLocaleDateString() : '-'}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEditThreat(threat)}
                                                        className="h-7 w-7 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteClick({ id: threat.id, name: threat.name })}
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
                    {filteredThreats.length > 0 && (
                        <div className="p-3 border-t border-slate-200 bg-white">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={Math.ceil(filteredThreats.length / pageSize)}
                                totalItems={filteredThreats.length}
                                pageSize={pageSize}
                                onPageChange={setCurrentPage}
                            />
                        </div>
                    )}
                </Card>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Threat</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this threat? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
                            <p className="text-xs font-semibold text-rose-800 uppercase tracking-wider">
                                You are about to delete:
                            </p>
                            <p className="text-sm font-medium text-rose-900 mt-1">
                                {threatToDelete?.name}
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
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete Threat'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
