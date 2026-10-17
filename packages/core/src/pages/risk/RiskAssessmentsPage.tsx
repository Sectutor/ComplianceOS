import React, { useState, useRef, useEffect, useMemo } from 'react';
import { usePagination } from '@/hooks/usePagination';
import Pagination from '@/components/Pagination';
import { useParams, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuth } from '@/contexts/AuthContext';
import {
    Shield, Plus, Search, CheckCircle2, AlertCircle, AlertTriangle, Download,
    ArrowLeft, Clock, TrendingDown, Trash2, Edit, ArrowUp, ArrowDown, ArrowUpDown,
    Filter, RotateCcw, FileSpreadsheet, FileJson, ChevronLeft, ChevronRight, FileText
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@complianceos/ui/ui/dialog';
import { toast } from 'sonner';
import DashboardLayout from '@/components/DashboardLayout';
import { Input } from '@complianceos/ui/ui/input';
import { Button } from '@complianceos/ui/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@complianceos/ui/ui/card';
import { Badge } from '@complianceos/ui/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@complianceos/ui/ui/select';
import { RiskHeatmap } from '@/components/risk/RiskHeatmap';
import { Breadcrumb } from '@/components/Breadcrumb';
import { PageGuide } from '@/components/PageGuide';

export default function RiskAssessmentsPage() {
    const params = useParams();
    const { t } = useTranslation('risk');
    const [_, setLocation] = useLocation();
    const routeClientId = params.id ? Number(params.id) : null;
    const { user, client: authClient } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [inherentFilter, setInherentFilter] = useState<string>('all');
    const [residualFilter, setResidualFilter] = useState<string>('all');
    const [heatmapFilter, setHeatmapFilter] = useState<{ impact?: string, likelihood?: string } | null>(null);
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

    // Horizontal scroll / column jump controls
    const tableScrollRef = useRef<HTMLDivElement>(null);
    const topScrollRef = useRef<HTMLDivElement>(null);
    const isSyncingTop = useRef(false);
    const isSyncingTable = useRef(false);
    const [currentScrollX, setCurrentScrollX] = useState(0);
    const [tableScrollWidth, setTableScrollWidth] = useState(1350);

    const columnSteps = [
        { id: "overview", label: "1. Overview & Threat", offset: 0 },
        { id: "scoring", label: "2. Likelihood & Impact", offset: 350 },
        { id: "treatments", label: "3. Risks & Treatments", offset: 680 },
        { id: "actions", label: "4. Status & Governance", offset: 1050 },
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

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 50;

    // Delete dialog state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [assessmentToDelete, setAssessmentToDelete] = useState<{ id: number; title: string } | null>(null);

    const deleteMutation = trpc.risks.delete.useMutation({
        onSuccess: () => {
            toast.success('Assessment deleted successfully');
            setDeleteDialogOpen(false);
            setAssessmentToDelete(null);
            refetch();
        },
        onError: (err) => {
            toast.error(`Failed to delete assessment: ${err.message}`);
        }
    });

    const handleDeleteClick = (assessment: any) => {
        setAssessmentToDelete({ id: assessment.id, title: assessment.title || assessment.assessmentId });
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (assessmentToDelete) {
            deleteMutation.mutate({ id: assessmentToDelete.id, clientId });
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

    // Determine effective client ID
    const effectiveClientId = routeClientId || authClient?.id;

    const { data: fetchedClient, isLoading: loadingClientDetails, isError: clientQueryError, error: clientQueryErrorMsg } = trpc.clients.get.useQuery(
        { id: effectiveClientId || 0 },
        { enabled: !!effectiveClientId && !authClient }
    );

    const client = authClient || fetchedClient;
    const clientId = client?.id || 0;

    const { data: assessments, isLoading: loadingAssessments, refetch } = trpc.risks.getRiskAssessments.useQuery(
        { clientId: clientId },
        {
            enabled: !!clientId,
            refetchInterval: 5000,
            refetchOnWindowFocus: true,
        }
    );
    const exportReportMutation = trpc.risks.exportReport.useMutation();

    const { data: processes } = trpc.businessContinuity.processes.list.useQuery(
        { clientId: clientId },
        { enabled: !!clientId }
    );

    const { data: stats, isLoading: loadingStats } = trpc.risks.getKRIStats.useQuery(
        { clientId: clientId },
        { enabled: !!clientId }
    );

    const getProcessNames = (ids: number[] | null | undefined) => {
        if (!ids || !processes) return '-';
        const idArray = Array.isArray(ids) ? ids : (typeof ids === 'string' ? JSON.parse(ids) : []);
        return idArray.map((id: number) => processes.find(p => p.id === id)?.name).filter(Boolean).join(', ') || '-';
    };

    // Helper to normalized scale inputs
    const normalizeScale = (val: string | number | undefined): number => {
        if (!val) return 0;
        const strVal = val.toString().toLowerCase().trim();
        const num = parseInt(strVal.charAt(0));
        if (!isNaN(num) && num >= 1 && num <= 5) return num;

        if (strVal === '1' || strVal.includes('very low') || strVal.includes('rare') || strVal.includes('insignificant') || strVal.includes('negligible')) return 1;
        if (strVal === '2' || strVal.includes('low') || strVal.includes('unlikely') || strVal.includes('minor')) return 2;
        if (strVal === '3' || strVal.includes('medium') || strVal.includes('possible') || strVal.includes('moderate')) return 3;
        if (strVal === '5' || strVal.includes('very high') || strVal.includes('almost certain') || strVal.includes('critical') || strVal.includes('extreme') || strVal.includes('catastrophic')) return 5;
        if (strVal === '4' || strVal.includes('high') || strVal.includes('likely') || strVal.includes('major')) return 4;
        return 0;
    };

    const formatWithNumber = (val: string | undefined) => {
        if (!val || val === '-') return '-';
        const num = normalizeScale(val);
        if (num === 0) return val;
        if (/^\d/.test(val)) return val;
        return `${num} - ${val}`;
    };

    const filteredAssessments = useMemo(() => {
        return (assessments || []).filter(a => {
            const matchesSearch =
                a.assessmentId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                a.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                a.threatDescription?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                a.assessmentDate?.toString().includes(searchQuery);

            if (!matchesSearch) return false;

            if (statusFilter !== 'all' && (a.status || '').toLowerCase() !== statusFilter.toLowerCase()) {
                return false;
            }

            if (inherentFilter !== 'all' && (a.inherentRisk || '').toLowerCase() !== inherentFilter.toLowerCase()) {
                return false;
            }

            if (residualFilter !== 'all' && (a.residualRisk || '').toLowerCase() !== residualFilter.toLowerCase()) {
                return false;
            }

            if (heatmapFilter) {
                const l = normalizeScale(a.likelihood);
                const i = normalizeScale(a.impact);
                if (l.toString() !== heatmapFilter.likelihood || i.toString() !== heatmapFilter.impact) {
                    return false;
                }
            }
            return true;
        });
    }, [assessments, searchQuery, statusFilter, inherentFilter, residualFilter, heatmapFilter]);

    const sortedAssessments = useMemo(() => {
        let sortableItems = [...filteredAssessments];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aVal: any = a[sortConfig.key as keyof typeof a] ?? '';
                let bVal: any = b[sortConfig.key as keyof typeof b] ?? '';

                if (sortConfig.key === 'treatments') {
                    aVal = (a as any).treatmentCount || 0;
                    bVal = (b as any).treatmentCount || 0;
                } else if (sortConfig.key === 'inherentRisk' || sortConfig.key === 'residualRisk') {
                    const riskOrder: Record<string, number> = { 'Low': 1, 'Medium': 2, 'High': 3, 'Critical': 4 };
                    aVal = riskOrder[aVal] || 0;
                    bVal = riskOrder[bVal] || 0;
                } else if (sortConfig.key === 'likelihood' || sortConfig.key === 'impact') {
                    aVal = normalizeScale(aVal);
                    bVal = normalizeScale(bVal);
                } else if (typeof aVal === 'string' && typeof bVal === 'string') {
                    aVal = aVal.toLowerCase();
                    bVal = bVal.toLowerCase();
                }

                if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [filteredAssessments, sortConfig]);

    const paginatedAssessments = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return sortedAssessments.slice(start, start + pageSize);
    }, [sortedAssessments, currentPage, pageSize]);

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
    }, [paginatedAssessments]);

    const handleCreateNew = () => {
        setLocation(`/clients/${clientId}/risks/assessments/new`);
    };

    const handleEditAssessment = (assessment: any) => {
        setLocation(`/clients/${clientId}/risks/assessments/${assessment.id}`);
    };

    const handleResetFilters = () => {
        setSearchQuery('');
        setStatusFilter('all');
        setInherentFilter('all');
        setResidualFilter('all');
        setHeatmapFilter(null);
    };

    const hasActiveFilters = searchQuery !== '' || statusFilter !== 'all' || inherentFilter !== 'all' || residualFilter !== 'all' || heatmapFilter !== null;

    // Export CSV / JSON helpers
    const handleExport = (format: 'csv' | 'json') => {
        if (!filteredAssessments.length) return;
        const filename = `risk-assessments-client-${clientId}-${new Date().toISOString().split('T')[0]}.${format}`;

        if (format === 'json') {
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredAssessments, null, 2));
            const dlAnchor = document.createElement('a');
            dlAnchor.setAttribute("href", dataStr);
            dlAnchor.setAttribute("download", filename);
            dlAnchor.click();
            toast.success("JSON exported successfully");
        } else {
            const headers = [
                'Assessment ID', 'Title', 'Threat Description', 'Likelihood', 'Impact',
                'Inherent Risk', 'Residual Risk', 'Treatments', 'Status', 'Risk Owner'
            ];
            const rows = filteredAssessments.map(a => [
                a.assessmentId,
                `"${(a.title || '').replace(/"/g, '""')}"`,
                `"${(a.threatDescription || '').replace(/"/g, '""')}"`,
                formatWithNumber(a.likelihood),
                formatWithNumber(a.impact),
                a.inherentRisk || '',
                a.residualRisk || '',
                (a as any).treatmentCount || 0,
                a.status || '',
                `"${(a.riskOwner || '').replace(/"/g, '""')}"`
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

    const [exporting, setExporting] = useState(false);
    const handleExportRiskReport = async () => {
        try {
            setExporting(true);
            toast.info("Generating report...", { description: "This may take a few seconds." });

            const data = await exportReportMutation.mutateAsync({ clientId });

            if (!data.base64) {
                throw new Error("Received empty report from server.");
            }

            const byteCharacters = atob(data.base64);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
            const link = document.createElement('a');
            link.href = window.URL.createObjectURL(blob);
            link.download = data.filename;
            link.click();

            toast.success("Export successful", { description: `Report downloaded: ${data.filename}` });
        } catch (e: any) {
            console.error("Export failed:", e);
            toast.error("Export failed", { description: e.message || "An unexpected error occurred." });
        } finally {
            setExporting(false);
        }
    };

    if (loadingClientDetails) return (
        <DashboardLayout>
            <div className="p-8 text-center text-muted-foreground text-sm">Loading client data...</div>
        </DashboardLayout>
    );

    if (clientQueryError) return (
        <DashboardLayout>
            <div className="p-8 text-center text-destructive">
                {clientQueryErrorMsg?.message || 'Client not found.'}
            </div>
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
                            { label: "Risk Assessments", href: `/clients/${clientId}/risks/assessments` },
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
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Risk Assessments</h1>
                        <p className="text-muted-foreground text-sm mt-0.5">Evaluate, score, and manage treatment plans for organizational risk scenarios.</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleExportRiskReport}
                            disabled={exporting || !clientId}
                            className="gap-1.5 text-xs h-8 text-slate-700 hover:text-slate-900"
                        >
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                            Export Risk Report
                        </Button>
                        <Button
                            onClick={handleCreateNew}
                            size="sm"
                            className="bg-brand hover:bg-[#163e72] text-white gap-1.5 text-xs h-8 shadow-xs"
                            id="risk-new-assessment"
                        >
                            <Plus className="w-4 h-4" />
                            New Assessment
                        </Button>
                        <PageGuide
                            title="Risk Assessments"
                            description="Evaluate, score, and treat organizational risks."
                            rationale="Systematic risk assessments provide the data needed to make informed security investment decisions."
                            howToUse={[
                                {
                                    step: "Identify Risks",
                                    description: "Create new assessments for specific threat scenarios to begin the management process.",
                                    targetId: "risk-new-assessment"
                                },
                                {
                                    step: "Analyze Heatmap",
                                    description: "The heatmap visualizes risks by impact and likelihood. High priority risks are in the top-right.",
                                    targetId: "risk-heatmap-container"
                                },
                                {
                                    step: "Monitor Stats",
                                    description: "Track key risk indicators like overdue reviews and mitigation efficiency in real-time.",
                                    targetId: "risk-stats-container"
                                },
                                {
                                    step: "Manage Treatments",
                                    description: "Review current assessments and ensure critical risks have active treatment plans.",
                                    targetId: "risk-assessments-table"
                                }
                            ]}
                            integrations={[
                                { name: "Controls Library", description: "Apply controls to reduce Inherent Risk to an acceptable Residual Risk level." },
                                { name: "Gap Analysis", description: "Identify missing controls directly from the assessment workflow." }
                            ]}
                        />
                    </div>
                </div>

                {/* Heatmap & KRI Stats Widgets */}
                <div className="grid md:grid-cols-2 gap-6">
                    <div className="h-[380px]" id="risk-heatmap-container">
                        <RiskHeatmap
                            assessments={assessments || []}
                            activeFilter={heatmapFilter}
                            onFilterChange={setHeatmapFilter}
                        />
                    </div>

                    <div className="h-[380px] grid grid-cols-2 gap-4" id="risk-stats-container">
                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overdue Reviews</h3>
                                    <div className="p-2 bg-rose-50 rounded-lg">
                                        <Clock className="w-4 h-4 text-rose-600" />
                                    </div>
                                </div>
                                <div className="text-3xl font-bold text-slate-900 mt-1">
                                    {loadingStats ? '-' : stats?.overdueReviews || 0}
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 mt-3 text-xs font-medium text-rose-600 bg-rose-50 w-fit px-2 py-0.5 rounded-full border border-rose-200">
                                <span>Action Required</span>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Unmitigated Critical</h3>
                                    <div className="p-2 bg-amber-50 rounded-lg">
                                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                                    </div>
                                </div>
                                <div className="text-3xl font-bold text-slate-900 mt-1">
                                    {loadingStats ? '-' : stats?.unmitigatedCriticalRisks || 0}
                                </div>
                            </div>
                            <div className={`flex items-center gap-1.5 mt-3 text-xs font-medium w-fit px-2 py-0.5 rounded-full border ${Number(stats?.unmitigatedCriticalRisks || 0) > 0 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'}`}>
                                <span>{Number(stats?.unmitigatedCriticalRisks || 0) > 0 ? 'Needs Treatment' : 'All Mitigated'}</span>
                            </div>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Mitigation Efficiency</h3>
                                    <div className="p-2 bg-blue-50 rounded-lg">
                                        <TrendingDown className="w-4 h-4 text-blue-600" />
                                    </div>
                                </div>
                                <div className="text-3xl font-bold text-slate-900 mt-1">
                                    {loadingStats ? '-' : `${stats?.mitigationEfficiency || 0}%`}
                                </div>
                            </div>
                            <p className="text-xs text-slate-500 mt-2 line-clamp-2">
                                Risks effectively reduced by controls
                            </p>
                        </div>

                        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between hover:shadow-xs transition-shadow">
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Implementation Rate</h3>
                                    <div className="p-2 bg-emerald-50 rounded-lg">
                                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                    </div>
                                </div>
                                <div className="text-3xl font-bold text-slate-900 mt-1">
                                    {loadingStats ? '-' : `${stats?.controlImplementationRate || 0}%`}
                                </div>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3">
                                <div
                                    className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                                    style={{ width: `${stats?.controlImplementationRate || 0}%` }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table Container Card */}
                <Card className="border border-slate-200 shadow-2xs overflow-hidden bg-white" id="risk-assessments-table">
                    {/* Header */}
                    <CardHeader className="py-2.5 px-4 flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-100 bg-white">
                        <div className="flex items-center gap-2.5">
                            <div className="h-8 w-8 rounded-lg bg-brand/10 flex items-center justify-center text-brand">
                                <Shield className="h-4 w-4" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <CardTitle className="text-base font-bold text-slate-900 leading-none">
                                        Risk Assessments Register
                                    </CardTitle>
                                    <Badge variant="outline" className="text-[11px] font-semibold text-slate-700 bg-slate-50 border-slate-200 px-2 py-0.5">
                                        {filteredAssessments.length} {filteredAssessments.length === 1 ? 'Assessment' : 'Assessments'}
                                    </Badge>
                                </div>
                                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                                    Systematic evaluation of inherent risks, applied controls, and residual exposures.
                                </CardDescription>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2.5 text-xs text-slate-700 hover:text-slate-900"
                                onClick={() => handleExport('csv')}
                                disabled={!filteredAssessments.length}
                            >
                                <FileSpreadsheet className="mr-1 h-3.5 w-3.5 text-emerald-600" />
                                Export CSV
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2.5 text-xs text-slate-700 hover:text-slate-900"
                                onClick={() => handleExport('json')}
                                disabled={!filteredAssessments.length}
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
                                placeholder="Search assessment ID, title, threat..."
                                value={searchQuery}
                                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                                className="pl-8 h-8 text-xs bg-white"
                            />
                        </div>

                        <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setCurrentPage(1); }}>
                            <SelectTrigger className="w-[130px] h-8 text-xs bg-white">
                                <Filter className="w-3 h-3 mr-1 text-slate-400" />
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="draft">Draft</SelectItem>
                                <SelectItem value="reviewed">Reviewed</SelectItem>
                                <SelectItem value="approved">Approved</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={inherentFilter} onValueChange={(val) => { setInherentFilter(val); setCurrentPage(1); }}>
                            <SelectTrigger className="w-[140px] h-8 text-xs bg-white">
                                <SelectValue placeholder="Inherent Risk" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Inherent</SelectItem>
                                <SelectItem value="Critical">Critical</SelectItem>
                                <SelectItem value="High">High</SelectItem>
                                <SelectItem value="Medium">Medium</SelectItem>
                                <SelectItem value="Low">Low</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={residualFilter} onValueChange={(val) => { setResidualFilter(val); setCurrentPage(1); }}>
                            <SelectTrigger className="w-[140px] h-8 text-xs bg-white">
                                <SelectValue placeholder="Residual Risk" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Residual</SelectItem>
                                <SelectItem value="Critical">Critical</SelectItem>
                                <SelectItem value="High">High</SelectItem>
                                <SelectItem value="Medium">Medium</SelectItem>
                                <SelectItem value="Low">Low</SelectItem>
                            </SelectContent>
                        </Select>

                        {heatmapFilter && (
                            <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-xs border border-blue-200">
                                <span>Heatmap: L {heatmapFilter.likelihood} × I {heatmapFilter.impact}</span>
                                <button onClick={() => setHeatmapFilter(null)} className="hover:text-blue-900 font-bold ml-1">×</button>
                            </div>
                        )}

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
                        <div style={{ width: `${Math.max(tableScrollWidth, 1600)}px`, height: '2px' }} />
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

                        {/* Main Table Content */}
                        <div
                            ref={tableScrollRef}
                            onScroll={handleTableScroll}
                            className="overflow-x-auto rounded-b border border-slate-200 shadow-2xs scroll-smooth [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-brand [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#153B6D]"
                        >
                            <table className="w-full min-w-[1600px] text-xs border-collapse">
                            <thead>
                                <tr className="bg-brand border-b border-[#153e75]">
                                    <th className="sticky left-0 bg-brand z-20 px-3 py-2 text-left text-xs font-semibold text-white uppercase tracking-wider min-w-[110px] w-[110px] border-r border-white/20 select-none h-9">
                                        <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => handleSort('assessmentId')}>
                                            <span>ID</span>
                                            {sortConfig?.key === 'assessmentId' ? (
                                                sortConfig?.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-amber-300" /> : <ArrowDown className="w-3 h-3 text-amber-300" />
                                            ) : (
                                                <ArrowUpDown className="w-3 h-3 opacity-30 hover:opacity-100 transition-opacity" />
                                            )}
                                        </div>
                                    </th>
                                    <th className="sticky left-[110px] bg-brand z-20 px-3 py-2 text-left text-xs font-semibold text-white uppercase tracking-wider min-w-[220px] w-[240px] border-r border-white/20 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)] select-none h-9">
                                        <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => handleSort('title')}>
                                            <span>Title</span>
                                            {sortConfig?.key === 'title' ? (
                                                sortConfig?.direction === 'asc' ? <ArrowUp className="w-3 h-3 text-amber-300" /> : <ArrowDown className="w-3 h-3 text-amber-300" />
                                            ) : (
                                                <ArrowUpDown className="w-3 h-3 opacity-30 hover:opacity-100 transition-opacity" />
                                            )}
                                        </div>
                                    </th>
                                    <SortableHeader label="Threat & Vulnerability" sortKey="threatDescription" className="min-w-[260px]" />
                                    <SortableHeader label="Likelihood" sortKey="likelihood" className="min-w-[105px]" />
                                    <SortableHeader label="Impact" sortKey="impact" className="min-w-[105px]" />
                                    <SortableHeader label="Inherent Risk" sortKey="inherentRisk" className="min-w-[120px]" />
                                    <SortableHeader label="Residual Risk" sortKey="residualRisk" className="min-w-[120px]" />
                                    <SortableHeader label="Treatments" sortKey="treatments" className="min-w-[120px]" />
                                    <SortableHeader label="Status" sortKey="status" className="min-w-[110px]" />
                                    <SortableHeader label="Risk Owner" sortKey="riskOwner" className="min-w-[130px]" />
                                    <th className="px-3 py-2 text-right text-xs font-semibold text-white uppercase tracking-wider min-w-[90px] h-9 select-none">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {loadingAssessments ? (
                                    <tr>
                                        <td colSpan={11} className="py-12 text-center text-slate-500 bg-white">
                                            Loading assessments...
                                        </td>
                                    </tr>
                                ) : paginatedAssessments.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} className="py-16 text-center bg-white">
                                            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <Shield className="w-6 h-6 text-slate-400" />
                                            </div>
                                            <h3 className="text-sm font-semibold text-slate-900">No Assessments Found</h3>
                                            <p className="text-xs text-slate-500 mt-0.5">Start by creating a new risk assessment or adjust active filters.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedAssessments.map((assessment) => (
                                        <tr
                                            key={assessment.id}
                                            className="bg-white hover:bg-slate-50/80 transition-colors border-b border-slate-200 cursor-pointer group"
                                            onDoubleClick={() => handleEditAssessment(assessment)}
                                            onClick={() => handleEditAssessment(assessment)}
                                        >
                                            {/* Pinned ID */}
                                            <td className="sticky left-0 bg-white group-hover:bg-slate-50/80 transition-colors z-10 px-3 py-2.5 font-mono text-xs font-medium text-slate-700 border-r border-slate-200">
                                                {assessment.assessmentId}
                                            </td>

                                            {/* Pinned Title */}
                                            <td className="sticky left-[110px] bg-white group-hover:bg-slate-50/80 transition-colors z-10 px-3 py-2.5 font-medium text-xs text-slate-900 border-r border-slate-200 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.06)]">
                                                <div className="line-clamp-2" title={assessment.title || '-'}>
                                                    {assessment.title || '-'}
                                                </div>
                                            </td>

                                            {/* Threat & Vulnerability */}
                                            <td className="px-3 py-2.5">
                                                <div className="text-xs text-slate-700 line-clamp-1" title={assessment.threatDescription || ''}>
                                                    {assessment.threatDescription || '-'}
                                                </div>
                                                {assessment.vulnerabilityDescription && (
                                                    <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5" title={assessment.vulnerabilityDescription}>
                                                        {assessment.vulnerabilityDescription}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Likelihood */}
                                            <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">
                                                {formatWithNumber(assessment.likelihood)}
                                            </td>

                                            {/* Impact */}
                                            <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">
                                                {formatWithNumber(assessment.impact)}
                                            </td>

                                            {/* Inherent Risk */}
                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                                <Badge variant="outline" className={`text-[11px] font-medium px-2 py-0.5 border ${
                                                    assessment.inherentRisk === 'Critical' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                    assessment.inherentRisk === 'High' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                    assessment.inherentRisk === 'Medium' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                    'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                }`}>
                                                    {assessment.inherentRisk || '-'}
                                                </Badge>
                                            </td>

                                            {/* Residual Risk */}
                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                                <Badge variant="outline" className={`text-[11px] font-medium px-2 py-0.5 border ${
                                                    assessment.residualRisk === 'Critical' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                                    assessment.residualRisk === 'High' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                    assessment.residualRisk === 'Medium' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                    'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                }`}>
                                                    {assessment.residualRisk || '-'}
                                                </Badge>
                                            </td>

                                            {/* Treatments */}
                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                                {(assessment as any).treatmentCount > 0 ? (
                                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-medium gap-1 px-2 py-0.5">
                                                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                                        {(assessment as any).treatmentCount} {(assessment as any).treatmentCount === 1 ? 'treatment' : 'treatments'}
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-[11px] font-normal px-2 py-0.5">
                                                        {(assessment.priority === 'Critical' || assessment.priority === 'High') && (
                                                            <AlertCircle className="w-3 h-3 text-amber-500 mr-1 inline" />
                                                        )}
                                                        No treatments
                                                    </Badge>
                                                )}
                                            </td>

                                            {/* Status */}
                                            <td className="px-3 py-2.5 whitespace-nowrap">
                                                <Badge variant="outline" className={`text-[11px] font-medium capitalize px-2 py-0.5 border ${
                                                    assessment.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                    assessment.status === 'reviewed' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                    'bg-slate-50 text-slate-700 border-slate-200'
                                                }`}>
                                                    {assessment.status || 'draft'}
                                                </Badge>
                                            </td>

                                            {/* Owner */}
                                            <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-nowrap">
                                                {assessment.riskOwner || '-'}
                                            </td>

                                            {/* Actions */}
                                            <td className="px-3 py-2.5 text-right whitespace-nowrap">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={(e) => { e.stopPropagation(); handleEditAssessment(assessment); }}
                                                        className="h-7 w-7 text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                                                        title="Edit"
                                                    >
                                                        <Edit className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteClick(assessment); }}
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
                    {filteredAssessments && filteredAssessments.length > 0 && (
                        <div className="p-3 border-t border-slate-200 bg-white">
                            <Pagination
                                currentPage={currentPage}
                                totalPages={Math.ceil((filteredAssessments.length || 0) / pageSize)}
                                totalItems={filteredAssessments.length || 0}
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
                        <DialogTitle>Delete Assessment</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this assessment? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4">
                            <p className="text-xs font-semibold text-rose-800 uppercase tracking-wider">
                                You are about to delete:
                            </p>
                            <p className="text-sm font-medium text-rose-900 mt-1">
                                {assessmentToDelete?.title}
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
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete Assessment'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </DashboardLayout>
    );
}
