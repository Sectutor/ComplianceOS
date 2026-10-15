import React, { useState, useMemo, useRef, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
    Bug, Plus, Search, Filter, Flame, ArrowUpDown, ArrowUp, ArrowDown,
    Info, Trash2, Edit, RotateCcw, FileSpreadsheet, FileJson, ArrowLeft, Shield,
    ChevronLeft, ChevronRight
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@complianceos/ui/ui/alert';
import { useClientContext } from '@/contexts/ClientContext';
import { trpc } from '@/lib/trpc';
import { useTranslation } from '@/hooks/useTranslation';
import { Button } from '@complianceos/ui/ui/button';
import { Input } from '@complianceos/ui/ui/input';
import { Badge } from '@complianceos/ui/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@complianceos/ui/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@complianceos/ui/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@complianceos/ui/ui/tooltip';
import { Breadcrumb } from '@/components/Breadcrumb';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@complianceos/ui/ui/dialog';
import { toast } from 'sonner';

import { useParams, useLocation } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { PageGuide } from '@/components/PageGuide';
import Pagination from '@/components/Pagination';

export default function RiskVulnerabilitiesPage() {
    const params = useParams();
    const { t } = useTranslation('risk');
    const routeClientId = params.id ? Number(params.id) : null;
    const { user, client: authClient } = useAuth();
    const [location, setLocation] = useLocation();
    const [searchQuery, setSearchQuery] = useState('');
    const [severityFilter, setSeverityFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 50;

    // Determine effective client ID
    const effectiveClientId = routeClientId || authClient?.id;

    const { data: fetchedClient, isLoading: loadingClientDetails } = trpc.clients.get.useQuery(
        { id: effectiveClientId || 0 },
        { enabled: !!effectiveClientId && !authClient }
    );

    const client = authClient || fetchedClient;
    const clientId = client?.id || 0;

    const { data: vulnerabilities, isLoading, refetch } = trpc.risks.getVulnerabilities.useQuery(
        { clientId: clientId },
        { enabled: !!clientId }
    );

    // Delete mutation and state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [vulnerabilityToDelete, setVulnerabilityToDelete] = useState<{ id: number; name: string } | null>(null);

    const deleteMutation = trpc.risks.deleteVulnerability.useMutation({
        onSuccess: () => {
            toast.success('Vulnerability deleted successfully');
            setDeleteDialogOpen(false);
            setVulnerabilityToDelete(null);
            refetch();
        },
        onError: (err) => {
            toast.error(`Failed to delete: ${err.message}`);
        }
    });

    const handleDeleteClick = (vuln: { id: number; name: string }) => {
        setVulnerabilityToDelete(vuln);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (vulnerabilityToDelete) {
            deleteMutation.mutate({ id: vulnerabilityToDelete.id, clientId });
        }
    };

    // Fetch live security feeds for matching
    const { data: securityFeeds } = trpc.adversaryIntel.getSecurityFeeds.useQuery(
        { limit: 200 },
        { staleTime: 1000 * 60 * 15 }
    );

    // Map CVEs to Feed Items for fast lookup
    const activeThreatsMap = useMemo(() => {
        const map = new Map<string, string[]>();
        if (securityFeeds?.items) {
            securityFeeds.items.forEach(item => {
                if (item.cveIds && item.cveIds.length > 0) {
                    item.cveIds.forEach(cve => {
                        const existing = map.get(cve) || [];
                        if (!existing.includes(item.title)) {
                            existing.push(item.title);
                            map.set(cve, existing);
                        }
                    });
                }
            });
        }
        return map;
    }, [securityFeeds]);

    const filteredVulns = useMemo(() => {
        return (vulnerabilities || []).filter(v => {
            const matchesSearch =
                v.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                v.vulnerabilityId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                v.cveId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                v.owner?.toLowerCase().includes(searchQuery.toLowerCase());

            const matchesSeverity = severityFilter === 'all' || (v.severity || '').toLowerCase() === severityFilter.toLowerCase();
            const matchesStatus = statusFilter === 'all' || (v.status || '').toLowerCase() === statusFilter.toLowerCase();

            return matchesSearch && matchesSeverity && matchesStatus;
        });
    }, [vulnerabilities, searchQuery, severityFilter, statusFilter]);

    const sortedVulns = useMemo(() => {
        let items = [...filteredVulns];
        if (sortConfig !== null) {
            items.sort((a, b) => {
                let aVal = a[sortConfig.key as keyof typeof a];
                let bVal = b[sortConfig.key as keyof typeof b];

                if (sortConfig.key === 'severity') {
                    const severityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1, 'Info': 0 };
                    aVal = (severityOrder as any)[aVal as string] ?? -1;
                    bVal = (severityOrder as any)[bVal as string] ?? -1;
                } else if (sortConfig.key === 'cvssScore') {
                    aVal = parseFloat((aVal as string) || '0');
                    bVal = parseFloat((bVal as string) || '0');
                } else if (sortConfig.key === 'affectedAssets') {
                    aVal = typeof a.affectedAssets === 'string' ? JSON.parse(a.affectedAssets).length : (a.affectedAssets as string[])?.length || 0;
                    bVal = typeof b.affectedAssets === 'string' ? JSON.parse(b.affectedAssets).length : (b.affectedAssets as string[])?.length || 0;
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
    }, [filteredVulns, sortConfig]);

    const paginatedVulns = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return sortedVulns.slice(start, start + pageSize);
    }, [sortedVulns, currentPage, pageSize]);

    const totalVulns = filteredVulns.length;
    const totalPages = Math.ceil(totalVulns / pageSize);

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

    const handleOpenAddDialog = () => {
        setLocation(`/clients/${clientId}/risks/vulnerabilities/new`);
    };

    const handleEditVuln = (vuln: any) => {
        setLocation(`/clients/${clientId}/risks/vulnerabilities/${vuln.id}`);
    };

    const handleResetFilters = () => {
        setSearchQuery('');
        setSeverityFilter('all');
        setStatusFilter('all');
        setCurrentPage(1);
    };

    const hasActiveFilters = searchQuery !== '' || severityFilter !== 'all' || statusFilter !== 'all';

    // Horizontal scroll / column jump controls
    const tableScrollRef = useRef<HTMLDivElement>(null);
    const topScrollRef = useRef<HTMLDivElement>(null);
    const isSyncingTop = useRef(false);
    const isSyncingTable = useRef(false);
    const [currentScrollX, setCurrentScrollX] = useState(0);
    const [tableScrollWidth, setTableScrollWidth] = useState(1400);

    const columnSteps = [
        { id: "id_name", label: "1. ID & Vulnerability", offset: 0 },
        { id: "severity_cvss", label: "2. Severity & CVSS", offset: 340 },
        { id: "assets_status", label: "3. Assets & Status", offset: 640 },
        { id: "dates_actions", label: "4. Dates, Owner & Actions", offset: 980 },
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
        if (isSyncingTable.current) return;
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
    }, [paginatedVulns]);

    // Export helpers
    const handleExport = (format: 'csv' | 'json') => {
        if (!filteredVulns.length) return;
        const filename = `vulnerabilities-register-client-${clientId}-${new Date().toISOString().split('T')[0]}.${format}`;

        if (format === 'json') {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredVulns, null, 2));
            const dlAnchor = document.createElement('a');
            dlAnchor.setAttribute("href", dataStr);
            dlAnchor.setAttribute("download", filename);
            dlAnchor.click();
            toast.success("JSON exported successfully");
        } else {
            const headers = ['Vulnerability ID', 'Name', 'CVE ID', 'Severity', 'CVSS', 'Status', 'Discovery Date', 'Owner', 'Due Date'];
            const rows = filteredVulns.map(v => [
                v.vulnerabilityId,
                `"${(v.name || '').replace(/"/g, '""')}"`,
                v.cveId || '',
                v.severity || '',
                v.cvssScore || '',
                v.status || '',
                v.discoveryDate ? new Date(v.discoveryDate).toISOString().split('T')[0] : '',
                `"${(v.owner || '').replace(/"/g, '""')}"`,
                v.dueDate ? new Date(v.dueDate).toISOString().split('T')[0] : ''
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
                            { label: "Vulnerabilities", href: `/clients/${clientId}/risks/vulnerabilities` },
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
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Vulnerability Management</h1>
                        <p className="text-muted-foreground text-sm mt-0.5">Centrally track, prioritize, and remediate technical security flaws and CVEs.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={handleOpenAddDialog}
                            size="sm"
                            className="bg-brand hover:bg-[#163e72] text-white gap-1.5 text-xs h-8 shadow-xs"
                        >
                            <Plus className="w-4 h-4" />
                            Record Vulnerability
                        </Button>
                        <PageGuide
                            title="Vulnerability Management"
                            description="Centrally track, prioritize, and remediate technical security flaws."
                            rationale="Unpatched vulnerabilities are a leading cause of data breaches. Systematic tracking ensures critical issues aren't ignored."
                            howToUse={[
                                { step: "Review Live Threats", description: "Check for the flame icon to see vulnerabilities actively being exploited in the wild." },
                                { step: "Search & Filter", description: "Use the search bar to find specific CVEs or filter by asset name." },
                                { step: "Prioritize", description: "Sort by 'Severity' or 'Due Date' to focus on the most urgent fixes first." }
                            ]}
                            integrations={[
                                { name: "Threat Intelligence", description: "Automatically flags vulnerabilities associated with active malware campaigns." },
                                { name: "Risk Assessments", description: "Vulnerabilities listed here serve as inputs for detailed risk scenarios." }
                            ]}
                        />
                    </div>
                </div>

                {/* Legend for Live Threats */}
                <Alert className="bg-blue-50/70 border-blue-200 py-2.5 px-3">
                    <Info className="h-4 w-4 text-brand" />
                    <AlertTitle className="text-xs font-semibold text-brand">Live Threat Intelligence Active</AlertTitle>
                    <AlertDescription className="text-slate-600 text-xs mt-0.5">
                        Items marked with <Flame className="w-3.5 h-3.5 inline text-rose-600 fill-rose-600 mx-1" /> match active zero-days or in-the-wild exploitation feeds (CISA KEV). Prioritize immediate patching for these CVEs.
                    </AlertDescription>
                </Alert>

                {/* Table Container Card */}
                <Card className="border border-slate-200 shadow-2xs overflow-hidden bg-white">
                    {/* Header */}
                    <CardHeader className="py-2.5 px-4 flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 bg-white">
                        <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
                                <Bug className="h-4 w-4" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <CardTitle className="text-base font-bold text-slate-900 leading-none">
                                        Vulnerability Register
                                    </CardTitle>
                                    <Badge variant="outline" className="text-[11px] font-semibold text-slate-700 bg-slate-50 border-slate-200 px-2 py-0.5">
                                        {filteredVulns.length} {filteredVulns.length === 1 ? 'Vulnerability' : 'Vulnerabilities'}
                                    </Badge>
                                </div>
                                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                                    Inventory of tracked Common Vulnerabilities and Exposures (CVEs) across client infrastructure.
                                </CardDescription>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2.5 text-xs text-slate-700 hover:text-slate-900"
                                onClick={() => handleExport('csv')}
                                disabled={!filteredVulns.length}
                            >
                                <FileSpreadsheet className="mr-1 h-3.5 w-3.5 text-emerald-600" />
                                Export CSV
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2.5 text-xs text-slate-700 hover:text-slate-900"
                                onClick={() => handleExport('json')}
                                disabled={!filteredVulns.length}
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
                                placeholder="Search vulnerability ID, title, CVE..."
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                className="pl-8 h-8 text-xs bg-white"
                            />
                        </div>

                        <Select value={severityFilter} onValueChange={(val) => { setSeverityFilter(val); setCurrentPage(1); }}>
                            <SelectTrigger className="w-[140px] h-8 text-xs bg-white">
                                <Filter className="w-3 h-3 mr-1 text-slate-400" />
                                <SelectValue placeholder="Severity" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Severities</SelectItem>
                                <SelectItem value="Critical">Critical</SelectItem>
                                <SelectItem value="High">High</SelectItem>
                                <SelectItem value="Medium">Medium</SelectItem>
                                <SelectItem value="Low">Low</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}>
                            <SelectTrigger className="w-[130px] h-8 text-xs bg-white">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="open">Open</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="remediated">Remediated</SelectItem>
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
                                        <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => handleSort('vulnerabilityId')}>
                                            <span>ID</span>
                                            {sortConfig?.key === 'vulnerabilityId' ? (
                                                sortConfig?.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-amber-300" /> : <ArrowDown className="w-3 h-3 text-amber-300" />
                                            ) : (
                                                <ArrowUpDown className="w-3 h-3 opacity-30 hover:opacity-100 transition-opacity" />
                                            )}
                                        </div>
                                    </th>
                                    <th className="sticky left-[100px] bg-brand z-20 px-3 py-2 text-left text-xs font-semibold text-white uppercase tracking-wider min-w-[200px] w-[240px] border-r border-white/20 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)] select-none h-9">
                                        <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => handleSort('name')}>
                                            <span>Vulnerability Name</span>
                                            {sortConfig?.key === 'name' ? (
                                                sortConfig?.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-amber-300" /> : <ArrowDown className="w-3 h-3 text-amber-300" />
                                            ) : (
                                                <ArrowUpDown className="w-3 h-3 opacity-30 hover:opacity-100 transition-opacity" />
                                            )}
                                        </div>
                                    </th>
                                    <SortableHeader label="Severity" sortKey="severity" className="min-w-[110px]" />
                                    <SortableHeader label="CVSS" sortKey="cvssScore" className="min-w-[90px]" />
                                    <SortableHeader label="Affected Assets" sortKey="affectedAssets" className="min-w-[150px]" />
                                    <SortableHeader label="Status" sortKey="status" className="min-w-[110px]" />
                                    <SortableHeader label="Discovery" sortKey="discoveryDate" className="min-w-[110px]" />
                                    <SortableHeader label="Owner" sortKey="owner" className="min-w-[120px]" />
                                    <SortableHeader label="Due Date" sortKey="dueDate" className="min-w-[110px]" />
                                    <th className="px-3 py-2 text-right text-xs font-semibold text-white uppercase tracking-wider min-w-[90px] h-9 select-none">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={10} className="py-12 text-center text-slate-500 bg-white">
                                            Loading vulnerabilities...
                                        </td>
                                    </tr>
                                ) : paginatedVulns.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="py-16 text-center bg-white">
                                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <Bug className="w-6 h-6 text-slate-400" />
                                            </div>
                                            <h3 className="text-sm font-semibold text-slate-900">No Vulnerabilities Found</h3>
                                            <p className="text-xs text-slate-500 mt-0.5">Start by recording vulnerabilities or adjust active filters.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedVulns.map((vuln) => (
                                        <tr
                                            key={vuln.id}
                                            className="bg-white hover:bg-slate-50/80 transition-colors border-b border-slate-200 cursor-pointer group"
                                            onDoubleClick={() => handleEditVuln(vuln)}
                                            onClick={() => handleEditVuln(vuln)}
                                        >
                                            {/* Pinned ID */}
                                            <td className="sticky left-0 bg-white group-hover:bg-slate-50/80 transition-colors z-10 px-3 py-2.5 font-mono text-xs text-slate-600 border-r border-slate-200">
                                                {vuln.vulnerabilityId}
                                            </td>

                                            {/* Pinned Name */}
                                            <td className="sticky left-[100px] bg-white group-hover:bg-slate-50/80 transition-colors z-10 px-3 py-2.5 font-medium text-xs text-slate-900 border-r border-slate-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="line-clamp-1" title={vuln.name}>{vuln.name}</span>
                                                    {vuln.cveId && activeThreatsMap.has(vuln.cveId) && (
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <span className="inline-flex items-center justify-center p-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200 cursor-help" onClick={(e) => e.stopPropagation()}>
                                                                    <Flame className="w-3.5 h-3.5 fill-rose-600" />
                                                                </span>
                                                            </TooltipTrigger>
                                                            <TooltipContent className="max-w-[300px]">
                                                                <p className="font-semibold text-xs mb-1">Active Threats Detected:</p>
                                                                <ul className="list-disc list-inside text-[11px] space-y-1">
                                                                    {activeThreatsMap.get(vuln.cveId)?.slice(0, 3).map((threat, idx) => (
                                                                        <li key={idx}>{threat}</li>
                                                                    ))}
                                                                </ul>
                                                            </TooltipContent>
                                                        </Tooltip>
                                                    )}
                                                </div>
                                                {vuln.cveId && (
                                                    <div className="text-[11px] font-mono text-slate-400 mt-0.5">
                                                        {vuln.cveId}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Severity */}
                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                                <Badge variant="outline" className={`text-[11px] font-medium px-2 py-0.5 border ${
                                                    vuln.severity === 'Critical' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                    vuln.severity === 'High' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                    vuln.severity === 'Medium' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                    'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                }`}>
                                                    {vuln.severity || 'Unknown'}
                                                </Badge>
                                            </td>

                                            {/* CVSS Score */}
                                            <td className="px-3 py-2.5 font-mono text-xs font-semibold text-slate-800 whitespace-nowrap">
                                                {vuln.cvssScore ? Number(vuln.cvssScore).toFixed(1) : '-'}
                                            </td>

                                            {/* Affected Assets */}
                                            <td className="px-3 py-2.5 text-xs text-slate-600 max-w-[150px]">
                                                <div className="line-clamp-1" title={typeof vuln.affectedAssets === 'string' ? (vuln.affectedAssets.startsWith('[') ? JSON.parse(vuln.affectedAssets).join(', ') : vuln.affectedAssets) : (vuln.affectedAssets as string[])?.join(', ')}>
                                                    {typeof vuln.affectedAssets === 'string' ? (vuln.affectedAssets.startsWith('[') ? JSON.parse(vuln.affectedAssets).join(', ') : vuln.affectedAssets) : (vuln.affectedAssets as string[])?.join(', ') || '-'}
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                                <Badge variant="outline" className={`text-[11px] font-medium capitalize px-2 py-0.5 border ${
                                                    vuln.status === 'open' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                    vuln.status === 'remediated' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                    vuln.status === 'in_progress' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                    'bg-slate-50 text-slate-700 border-slate-200'
                                                }`}>
                                                    {vuln.status || 'open'}
                                                </Badge>
                                            </td>

                                            {/* Discovery Date */}
                                            <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">
                                                {vuln.discoveryDate ? new Date(vuln.discoveryDate).toLocaleDateString() : '-'}
                                            </td>

                                            {/* Owner */}
                                            <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">
                                                {vuln.owner || '-'}
                                            </td>

                                            {/* Due Date */}
                                            <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">
                                                {vuln.dueDate ? new Date(vuln.dueDate).toLocaleDateString() : '-'}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleEditVuln(vuln)}
                                                        className="h-7 w-7 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDeleteClick({ id: vuln.id, name: vuln.name })}
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
                    {totalVulns > 0 && (
                        <div className="p-3 border-t border-slate-200 bg-white">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                totalItems={totalVulns}
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
                        <DialogTitle>Delete Vulnerability</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this vulnerability? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
                            <p className="text-xs font-semibold text-rose-800 uppercase tracking-wider">
                                You are about to delete:
                            </p>
                            <p className="text-sm font-medium text-rose-900 mt-1">
                                {vulnerabilityToDelete?.name}
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
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete Vulnerability'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
