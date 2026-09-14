import React, { useState, useMemo } from 'react';
import { useParams, useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useTranslation } from '@/hooks/useTranslation';
import { useAuth } from '@/contexts/AuthContext';
import {
    Plus,
    Database,
    ArrowLeft,
    Zap,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Trash2,
    Edit,
    ExternalLink,
    ShieldAlert,
    ShieldCheck,
    Search,
    Filter,
    Server,
    Cloud,
    Laptop,
    Code2,
    Globe,
    Lock,
    RefreshCw,
    AlertTriangle,
    CheckCircle2,
    X,
    SlidersHorizontal,
    Layers,
    Building2,
    HardDrive,
    Flame,
    Radio,
    Shield,
    Bug
} from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Button } from '@complianceos/ui/ui/button';
import { Input } from '@complianceos/ui/ui/input';
import { Breadcrumb } from '@/components/Breadcrumb';
import { Badge } from '@complianceos/ui/ui/badge';
import { Card, CardContent } from '@complianceos/ui/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@complianceos/ui/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@complianceos/ui/ui/dialog';
import { PageGuide } from "@/components/PageGuide";
import { toast } from "sonner";
import { usePagination, DEFAULT_PAGE_SIZE } from '@/hooks/usePagination';
import Pagination from '@/components/Pagination';

export default function RiskAssetsPage({
    hideLayout = false,
    hideBreadcrumb = false,
    fullWidth = false
}: {
    hideLayout?: boolean;
    hideBreadcrumb?: boolean;
    fullWidth?: boolean;
}) {
    const params = useParams();
    const { t } = useTranslation('risk');
    const routeClientId = params.id ? Number(params.id) : null;
    const { user, client: authClient } = useAuth();

    // Determine effective client ID - prefer route param, then auth context
    const effectiveClientId = routeClientId || authClient?.id || 0;

    const { data: fetchedClient, isLoading: loadingClientDetails } = trpc.clients.get.useQuery(
        { id: effectiveClientId },
        { enabled: !!effectiveClientId && effectiveClientId > 0 && !authClient }
    );

    const client = authClient || fetchedClient;
    const clientId = client?.id || effectiveClientId || 0;

    const [location, setLocation] = useLocation();

    const { data: assets, isLoading: loadingAssets, refetch: refetchAssets } = trpc.risks.getAssets.useQuery(
        { clientId },
        { enabled: clientId > 0 }
    );

    const scanAllMutation = trpc.threatIntel.scanAllAssets.useMutation({
        onSuccess: (data) => {
            const total = data.results?.reduce((sum: number, r: any) => sum + (r.count || 0), 0) || 0;
            toast.success(`Scanned ${data.results?.length || 0} assets, found ${total} threat intelligence signals`);
            refetchAssets();
        },
        onError: (err) => {
            console.error('Scan failed:', err);
            toast.error(`Scan failed: ${err.message}`);
        }
    });

    // Filters & Sorting state
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedType, setSelectedType] = useState<string>('all');
    const [selectedCriticality, setSelectedCriticality] = useState<string>('all');
    const [selectedStatus, setSelectedStatus] = useState<string>('all');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>({
        key: 'id',
        direction: 'asc'
    });

    // Fetch security feeds for active threat counts
    const { data: securityFeeds } = trpc.adversaryIntel.getSecurityFeeds.useQuery(
        { limit: 200 },
        { staleTime: 1000 * 60 * 15 }
    );

    const getAssetThreats = (asset: any) => {
        if (!securityFeeds?.items) return [];
        const techTerms = [
            asset.name,
            asset.vendor,
            asset.productName,
            asset.type,
            asset.category,
            ...(asset.technologies || [])
        ].filter(Boolean).map((t: string) => t.toLowerCase());

        return securityFeeds.items.filter((item: any) => {
            if (!item.techStack) return false;
            return item.techStack.some((threatTech: string) => {
                const lowerThreatTech = threatTech.toLowerCase();
                return techTerms.some(term => term.includes(lowerThreatTech) || lowerThreatTech.includes(term));
            });
        });
    };

    // Calculate High-Level Metrics
    const metrics = useMemo(() => {
        if (!assets || assets.length === 0) {
            return {
                total: 0,
                criticalCount: 0,
                personalDataCount: 0,
                threatMatchCount: 0,
                totalRisks: 0
            };
        }

        let critical = 0;
        let personal = 0;
        let threatMatches = 0;
        let risks = 0;

        for (const a of assets) {
            const maxVal = Math.max(Number(a.valuationC) || 0, Number(a.valuationI) || 0, Number(a.valuationA) || 0);
            if (maxVal >= 4 || a.criticality === 'critical' || a.criticality === 'high') {
                critical++;
            }
            if (a.isPersonalData || a.dataSensitivity === 'Confidential' || a.dataSensitivity === 'Restricted') {
                personal++;
            }
            if (getAssetThreats(a).length > 0) {
                threatMatches++;
            }
            risks += (Number(a.riskCount) || 0);
        }

        return {
            total: assets.length,
            criticalCount: critical,
            personalDataCount: personal,
            threatMatchCount: threatMatches,
            totalRisks: risks
        };
    }, [assets, securityFeeds]);

    // Available Types for Filter Dropdown
    const availableTypes = useMemo(() => {
        if (!assets) return [];
        const set = new Set<string>();
        assets.forEach(a => {
            if (a.type) set.add(a.type);
            if (a.category) set.add(a.category);
        });
        return Array.from(set);
    }, [assets]);

    // Filter Assets
    const filteredAssets = useMemo(() => {
        if (!assets) return [];
        return assets.filter(asset => {
            // Search query filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const name = (asset.name || '').toLowerCase();
                const vendor = (asset.vendor || '').toLowerCase();
                const type = (asset.type || '').toLowerCase();
                const category = (asset.category || '').toLowerCase();
                const owner = (asset.owner || '').toLowerCase();
                const desc = (asset.description || '').toLowerCase();
                const loc = (asset.location || '').toLowerCase();
                if (!name.includes(q) && !vendor.includes(q) && !type.includes(q) && !category.includes(q) && !owner.includes(q) && !desc.includes(q) && !loc.includes(q)) {
                    return false;
                }
            }

            // Type filter
            if (selectedType !== 'all') {
                if (asset.type !== selectedType && asset.category !== selectedType) {
                    return false;
                }
            }

            // Criticality filter
            if (selectedCriticality !== 'all') {
                const maxVal = Math.max(Number(asset.valuationC) || 0, Number(asset.valuationI) || 0, Number(asset.valuationA) || 0);
                let computedCrit = 'low';
                if (maxVal >= 4 || asset.criticality === 'critical') computedCrit = 'critical';
                else if (maxVal === 3 || asset.criticality === 'high') computedCrit = 'high';
                else if (maxVal === 2 || asset.criticality === 'medium') computedCrit = 'medium';

                if (computedCrit !== selectedCriticality && (asset.criticality || '').toLowerCase() !== selectedCriticality) {
                    return false;
                }
            }

            // Status filter
            if (selectedStatus !== 'all') {
                const st = (asset.status || 'active').toLowerCase();
                if (st !== selectedStatus) {
                    return false;
                }
            }

            return true;
        });
    }, [assets, searchQuery, selectedType, selectedCriticality, selectedStatus]);

    // Sort Assets
    const sortedAssets = useMemo(() => {
        const items = [...filteredAssets];
        if (sortConfig !== null) {
            items.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                if (sortConfig.key === 'activeThreats') {
                    aValue = getAssetThreats(a).length;
                    bValue = getAssetThreats(b).length;
                } else if (sortConfig.key === 'riskCount') {
                    aValue = Number(a.riskCount) || 0;
                    bValue = Number(b.riskCount) || 0;
                } else if (sortConfig.key === 'ciaValuation') {
                    aValue = (Number(a.valuationC) || 0) + (Number(a.valuationI) || 0) + (Number(a.valuationA) || 0);
                    bValue = (Number(b.valuationC) || 0) + (Number(b.valuationI) || 0) + (Number(b.valuationA) || 0);
                } else if (typeof aValue === 'string') {
                    aValue = aValue.toLowerCase();
                    bValue = bValue?.toLowerCase() || '';
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return items;
    }, [filteredAssets, sortConfig, securityFeeds]);

    // Pagination
    const pagination = usePagination({
        totalItems: sortedAssets.length,
        pageSize: DEFAULT_PAGE_SIZE,
    });

    const displayedAssets = useMemo(() => {
        return pagination.getPageItems(sortedAssets);
    }, [sortedAssets, pagination]);

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
                className={`px-4 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/80 transition-colors select-none group ${className}`}
                onClick={() => handleSort(sortKey)}
            >
                <div className="flex items-center gap-1.5">
                    <span>{label}</span>
                    {isSorted ? (
                        sortConfig?.direction === 'asc' ? (
                            <ArrowUp className="w-3.5 h-3.5 text-primary shrink-0" />
                        ) : (
                            <ArrowDown className="w-3.5 h-3.5 text-primary shrink-0" />
                        )
                    ) : (
                        <ArrowUpDown className="w-3.5 h-3.5 opacity-0 group-hover:opacity-40 transition-opacity shrink-0" />
                    )}
                </div>
            </th>
        );
    };

    const handleOpenAddDialog = () => {
        setLocation(`/clients/${clientId}/risks/assets/new`);
    };

    const handleEditAsset = (asset: any) => {
        setLocation(`/clients/${clientId}/risks/assets/${asset.id}`);
    };

    // Delete asset state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [assetToDelete, setAssetToDelete] = useState<{ id: number; name: string } | null>(null);

    const deleteMutation = trpc.risks.deleteAsset.useMutation({
        onSuccess: () => {
            toast.success('Asset deleted successfully');
            setDeleteDialogOpen(false);
            setAssetToDelete(null);
            refetchAssets();
        },
        onError: (err) => {
            toast.error(`Failed to delete: ${err.message}`);
        }
    });

    const handleDeleteClick = (asset: { id: number; name: string }) => {
        setAssetToDelete(asset);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = () => {
        if (assetToDelete) {
            deleteMutation.mutate({ id: assetToDelete.id, clientId });
        }
    };

    // Selected Asset for Threat Details Modal
    const [selectedAssetForThreats, setSelectedAssetForThreats] = useState<any>(null);

    const hasActiveFilters = searchQuery.trim() !== '' || selectedType !== 'all' || selectedCriticality !== 'all' || selectedStatus !== 'all';

    const clearFilters = () => {
        setSearchQuery('');
        setSelectedType('all');
        setSelectedCriticality('all');
        setSelectedStatus('all');
    };

    if (loadingClientDetails) {
        return (
            <DashboardLayout>
                <div className="p-12 text-center text-muted-foreground flex flex-col items-center justify-center min-h-[400px]">
                    <RefreshCw className="w-8 h-8 animate-spin text-primary mb-3" />
                    <p className="font-medium">Loading workspace asset register...</p>
                </div>
            </DashboardLayout>
        );
    }

    if (!client) {
        return (
            <DashboardLayout>
                <div className="p-8 text-center text-destructive">Client workspace not found.</div>
            </DashboardLayout>
        );
    }

    const content = (
        <TooltipProvider>
            <div className={`space-y-6 w-full max-w-full ${fullWidth ? "p-0" : "p-6"}`}>
                {!hideBreadcrumb && (
                    <div className="flex flex-col gap-2">
                        <Breadcrumb
                            items={[
                                { label: "Clients", href: "/clients" },
                                { label: client?.name || "Client", href: `/clients/${clientId}` },
                                { label: "ISO 27001", href: `/clients/${clientId}/iso27001` },
                                { label: "Asset Inventory", href: `/clients/${clientId}/iso27001/assets` },
                            ]}
                        />
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-fit -ml-2 text-muted-foreground hover:text-foreground h-8"
                            onClick={() => setLocation(`/clients/${clientId}/iso27001`)}
                        >
                            <ArrowLeft className="w-4 h-4 mr-1.5" />
                            Back to ISO 27001 Overview
                        </Button>
                    </div>
                )}

                {/* Page Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-5">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                <Database className="w-5 h-5" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                    Asset Register & Inventory
                                </h1>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    ISO 27001:2022 (A.5.9, A.5.12) & SOC 2 information asset catalog, CIA valuations, and threat telemetry.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                        <Button
                            id="asset-scan-threats"
                            variant="outline"
                            size="sm"
                            onClick={() => scanAllMutation.mutate({ clientId })}
                            disabled={scanAllMutation.isPending}
                            className="border-amber-500/30 text-amber-600 hover:bg-amber-500/10 hover:text-amber-700 h-9 font-medium"
                        >
                            <Zap className={`w-4 h-4 mr-1.5 ${scanAllMutation.isPending ? 'animate-spin' : 'text-amber-500'}`} />
                            {scanAllMutation.isPending ? "Scanning NVD/KEV..." : "Threat Match Scan"}
                        </Button>

                        <Button
                            id="asset-add-btn"
                            size="sm"
                            onClick={handleOpenAddDialog}
                            className="h-9 gap-1.5 font-medium shadow-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Register Asset
                        </Button>

                        <PageGuide
                            title="Asset Inventory Mastery (ISO 27001 A.5.9)"
                            description="Maintain a complete registry of your organization’s critical information assets."
                            rationale="You cannot protect what you don't know you have. A comprehensive asset inventory is the starting point for all risk assessments. Auditors look for the 'Completeness' and 'Accuracy' of this list first."
                            howToUse={[
                                {
                                    step: "1. Register Assets",
                                    description: "Record hardware, cloud infrastructure, databases, SaaS platforms, and applications.",
                                    targetId: "asset-add-btn"
                                },
                                {
                                    step: "2. Threat Scanning",
                                    description: "Run an automated scan matching asset technologies against live CISA KEV and NVD vulnerability databases.",
                                    targetId: "asset-scan-threats"
                                },
                                {
                                    step: "3. Evaluate CIA Valuation",
                                    description: "Ensure each asset has Confidentiality, Integrity, and Availability ratings to prioritize risk treatment.",
                                    targetId: "asset-inventory-table"
                                }
                            ]}
                            scenarios={[
                                {
                                    title: "ISO 27001 Clause A.5.9 Audit",
                                    example: "Auditor asks: 'Where is the master inventory of assets containing client data?'",
                                    auditTip: "Filter by 'Personal Data' or 'Critical' to instantly produce the scoped list required by Annex A."
                                },
                                {
                                    title: "Threat Correlation",
                                    example: "An active CVE alert fires on EKS or Postgres instances.",
                                    auditTip: "Click the 'Active Threats' badge on the asset row to immediately convert the intel match into a tracked risk assessment."
                                }
                            ]}
                            integrations={[
                                { name: "Risk Register", description: "Selected assets automatically populate risk scenarios and treatment plans." },
                                { name: "RoPA / Privacy", description: "Personal data flags sync directly with GDPR Article 30 records." }
                            ]}
                        />
                    </div>
                </div>

                {/* KPI Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
                    <Card className="bg-card border-border/70 shadow-sm hover:border-primary/40 transition-colors">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Assets</p>
                                <p className="text-2xl font-bold text-foreground mt-1">{metrics.total}</p>
                            </div>
                            <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                                <Layers className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border/70 shadow-sm hover:border-rose-500/40 transition-colors">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Critical Tier</p>
                                <p className="text-2xl font-bold text-rose-600 mt-1">{metrics.criticalCount}</p>
                            </div>
                            <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-600">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border/70 shadow-sm hover:border-blue-500/40 transition-colors">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Personal / GDPR</p>
                                <p className="text-2xl font-bold text-blue-600 mt-1">{metrics.personalDataCount}</p>
                            </div>
                            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600">
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border/70 shadow-sm hover:border-amber-500/40 transition-colors">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Threat Signals</p>
                                <p className="text-2xl font-bold text-amber-600 mt-1">{metrics.threatMatchCount}</p>
                            </div>
                            <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-600">
                                <Zap className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border-border/70 shadow-sm hover:border-purple-500/40 transition-colors col-span-2 md:col-span-1">
                        <CardContent className="p-4 flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Linked Risks</p>
                                <p className="text-2xl font-bold text-purple-600 mt-1">{metrics.totalRisks}</p>
                            </div>
                            <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-600">
                                <ShieldAlert className="w-5 h-5" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filter & Search Bar */}
                <div className="bg-card border rounded-xl p-3.5 shadow-sm space-y-3">
                    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, vendor, type, owner, or location..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9 text-sm bg-background border-border"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {/* Type Filter */}
                            <select
                                value={selectedType}
                                onChange={(e) => setSelectedType(e.target.value)}
                                className="h-9 px-3 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                            >
                                <option value="all">All Categories</option>
                                {availableTypes.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>

                            {/* Criticality Filter */}
                            <select
                                value={selectedCriticality}
                                onChange={(e) => setSelectedCriticality(e.target.value)}
                                className="h-9 px-3 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                            >
                                <option value="all">All Criticality</option>
                                <option value="critical">Critical (4-5)</option>
                                <option value="high">High (3)</option>
                                <option value="medium">Medium (2)</option>
                                <option value="low">Low (1)</option>
                            </select>

                            {/* Status Filter */}
                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                                className="h-9 px-3 text-xs rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                            >
                                <option value="all">All Statuses</option>
                                <option value="active">Active</option>
                                <option value="maintenance">Maintenance</option>
                                <option value="archived">Archived</option>
                            </select>

                            {hasActiveFilters && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={clearFilters}
                                    className="h-9 text-xs text-muted-foreground hover:text-foreground gap-1 px-2.5"
                                >
                                    <X className="w-3.5 h-3.5" />
                                    Reset
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Asset Table */}
                <div id="asset-inventory-table" className="rounded-xl border border-border/80 bg-card shadow-sm overflow-hidden min-h-[420px] flex flex-col justify-between">
                    {loadingAssets ? (
                        <div className="p-16 text-center text-muted-foreground flex flex-col items-center justify-center">
                            <RefreshCw className="w-8 h-8 animate-spin text-primary mb-3" />
                            <p className="font-medium">Loading asset register...</p>
                        </div>
                    ) : sortedAssets.length === 0 ? (
                        <div className="p-16 text-center flex flex-col items-center justify-center">
                            <div className="w-14 h-14 bg-muted/60 rounded-2xl flex items-center justify-center mb-3 text-muted-foreground">
                                <Database className="w-7 h-7" />
                            </div>
                            <h3 className="text-base font-semibold text-foreground">
                                {hasActiveFilters ? "No matching assets found" : "No Assets Registered Yet"}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                                {hasActiveFilters
                                    ? "No assets match your search and filter criteria. Try adjusting or clearing filters."
                                    : "Start by registering your first hardware, infrastructure, or software asset to begin compliance tracking."}
                            </p>
                            {hasActiveFilters ? (
                                <Button variant="outline" size="sm" onClick={clearFilters} className="mt-4">
                                    Clear All Filters
                                </Button>
                            ) : (
                                <Button size="sm" onClick={handleOpenAddDialog} className="mt-4 gap-1.5">
                                    <Plus className="w-4 h-4" />
                                    Register First Asset
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-border bg-muted/40">
                                        <SortableHeader label="Asset & Product" sortKey="name" className="min-w-[220px]" />
                                        <SortableHeader label="Category / Type" sortKey="type" />
                                        <SortableHeader label="CIA Triad" sortKey="ciaValuation" className="min-w-[130px]" />
                                        <SortableHeader label="Classification" sortKey="ciaValuation" />
                                        <SortableHeader label="Threat Intel" sortKey="activeThreats" />
                                        <SortableHeader label="Owner & Region" sortKey="owner" />
                                        <SortableHeader label="Status" sortKey="status" />
                                        <SortableHeader label="Linked Risks" sortKey="riskCount" />
                                        <th className="px-4 py-3.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                    {displayedAssets.map((asset) => {
                                        const activeThreats = getAssetThreats(asset);
                                        const maxScore = Math.max(
                                            Number(asset.valuationC) || 0,
                                            Number(asset.valuationI) || 0,
                                            Number(asset.valuationA) || 0
                                        );

                                        // High-Contrast Classification
                                        const renderClassificationBadge = () => {
                                            if (maxScore >= 4 || asset.criticality === 'critical') {
                                                return (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-red-600 text-white shadow-sm border border-red-700 uppercase tracking-wide">
                                                        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                                                        Critical
                                                    </span>
                                                );
                                            }
                                            if (maxScore === 3 || asset.criticality === 'high') {
                                                return (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-500 text-slate-950 shadow-sm border border-amber-600 uppercase tracking-wide">
                                                        <Lock className="w-3.5 h-3.5 shrink-0" />
                                                        Confidential
                                                    </span>
                                                );
                                            }
                                            if (maxScore === 2 || asset.criticality === 'medium') {
                                                return (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-blue-600 text-white shadow-sm border border-blue-700 uppercase tracking-wide">
                                                        <Building2 className="w-3.5 h-3.5 shrink-0" />
                                                        Internal
                                                    </span>
                                                );
                                            }
                                            return (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-600 text-white shadow-sm border border-emerald-700 uppercase tracking-wide">
                                                    <Globe className="w-3.5 h-3.5 shrink-0" />
                                                    Public
                                                </span>
                                            );
                                        };

                                        // High-Contrast CIA Badge Component
                                        const renderCiaScore = (label: 'C' | 'I' | 'A', val: any, fullName: string) => {
                                            const num = Number(val) || 0;
                                            let colorClass = "bg-slate-700 text-white border-slate-800";
                                            if (num >= 4) colorClass = "bg-red-600 text-white border-red-700 shadow-sm";
                                            else if (num === 3) colorClass = "bg-amber-500 text-slate-950 border-amber-600 font-bold shadow-sm";
                                            else if (num === 2) colorClass = "bg-blue-600 text-white border-blue-700 shadow-sm";
                                            else if (num === 1) colorClass = "bg-emerald-600 text-white border-emerald-700 shadow-sm";

                                            return (
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded font-mono text-xs font-extrabold border ${colorClass}`}>
                                                            {label}:{num > 0 ? num : '-'}
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p className="font-semibold">{fullName}</p>
                                                        <p className="text-xs text-muted-foreground">Rating: {num}/5</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            );
                                        };

                                        // Icon selector based on type / category
                                        const getAssetIcon = () => {
                                            const t = (asset.type || asset.category || '').toLowerCase();
                                            if (t.includes('database') || t.includes('data')) return <Database className="w-4 h-4 text-blue-500" />;
                                            if (t.includes('cloud') || t.includes('infra') || t.includes('server')) return <Server className="w-4 h-4 text-indigo-500" />;
                                            if (t.includes('saas') || t.includes('identity')) return <Globe className="w-4 h-4 text-emerald-500" />;
                                            if (t.includes('app') || t.includes('portal')) return <Code2 className="w-4 h-4 text-purple-500" />;
                                            if (t.includes('hardware') || t.includes('device') || t.includes('endpoint')) return <Laptop className="w-4 h-4 text-amber-500" />;
                                            return <HardDrive className="w-4 h-4 text-slate-500" />;
                                        };

                                        return (
                                            <tr
                                                key={asset.id}
                                                className="group hover:bg-muted/40 transition-colors cursor-pointer"
                                                onDoubleClick={() => handleEditAsset(asset)}
                                            >
                                                {/* Asset Name & Details */}
                                                <td className="px-4 py-3.5">
                                                    <div className="flex items-start gap-3">
                                                        <div className="p-2 rounded-lg bg-muted border border-border/70 shrink-0 mt-0.5 group-hover:border-primary/40 transition-colors">
                                                            {getAssetIcon()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                                                                    {asset.name}
                                                                </span>
                                                                <span className="text-[11px] font-mono text-muted-foreground/80 bg-muted px-1.5 py-0.5 rounded border border-border/50">
                                                                    #{asset.id}
                                                                </span>
                                                                {asset.isPersonalData && (
                                                                    <Tooltip>
                                                                        <TooltipTrigger asChild>
                                                                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-white bg-blue-600 px-1.5 py-0.5 rounded shadow-sm border border-blue-700">
                                                                                <ShieldCheck className="w-3 h-3" />
                                                                                GDPR PII
                                                                            </span>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>Personal Data In-Scope (GDPR Art. 30)</TooltipContent>
                                                                    </Tooltip>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5" title={asset.description}>
                                                                {asset.vendor ? `${asset.vendor} • ` : ''}{asset.description || 'No description provided'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Category / Type */}
                                                <td className="px-4 py-3.5">
                                                    <div className="space-y-1">
                                                        <Badge variant="secondary" className="font-semibold text-xs border border-border/60">
                                                            {asset.type || 'Asset'}
                                                        </Badge>
                                                        {asset.category && asset.category !== asset.type && (
                                                            <p className="text-[11px] text-muted-foreground font-medium">{asset.category}</p>
                                                        )}
                                                    </div>
                                                </td>

                                                {/* CIA Triad Scores */}
                                                <td className="px-4 py-3.5">
                                                    <div className="flex items-center gap-1.5">
                                                        {renderCiaScore('C', asset.valuationC, 'Confidentiality')}
                                                        {renderCiaScore('I', asset.valuationI, 'Integrity')}
                                                        {renderCiaScore('A', asset.valuationA, 'Availability')}
                                                    </div>
                                                </td>

                                                {/* Classification */}
                                                <td className="px-4 py-3.5">
                                                    {renderClassificationBadge()}
                                                </td>

                                                {/* Threat Intel */}
                                                <td className="px-4 py-3.5">
                                                    {(() => {
                                                        if (activeThreats.length === 0) {
                                                            return (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-600 text-white shadow-sm border border-emerald-700">
                                                                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-200" />
                                                                            Clean (0 CVEs)
                                                                        </span>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent className="max-w-xs">
                                                                        <p className="font-semibold text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                                                            <ShieldCheck className="w-3.5 h-3.5" /> Verified Clean
                                                                        </p>
                                                                        <p className="text-[11px] text-muted-foreground mt-0.5">
                                                                            No matching CVEs or CISA KEV advisories in active threat intelligence feeds.
                                                                        </p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            );
                                                        }

                                                        const cisaKevThreats = activeThreats.filter((t: any) => t.source === 'cisa_kev');
                                                        const criticalThreats = activeThreats.filter((t: any) => t.severity === 'critical');
                                                        const highThreats = activeThreats.filter((t: any) => t.severity === 'high');

                                                        const isKev = cisaKevThreats.length > 0;
                                                        const isCritical = criticalThreats.length > 0;
                                                        const isHigh = highThreats.length > 0;

                                                        let badgeClass = "bg-blue-600 hover:bg-blue-700 text-white border-blue-700";
                                                        let icon = <Radio className="w-3.5 h-3.5 animate-pulse" />;
                                                        let levelLabel = "SIGNALS";

                                                        if (isKev) {
                                                            badgeClass = "bg-rose-600 hover:bg-rose-700 text-white border-rose-700";
                                                            icon = <Flame className="w-3.5 h-3.5 fill-white text-amber-300 animate-bounce" />;
                                                            levelLabel = "KEV EXPLOITED";
                                                        } else if (isCritical) {
                                                            badgeClass = "bg-red-600 hover:bg-red-700 text-white border-red-700";
                                                            icon = <Zap className="w-3.5 h-3.5 fill-white animate-pulse text-amber-200" />;
                                                            levelLabel = "CRITICAL";
                                                        } else if (isHigh) {
                                                            badgeClass = "bg-amber-500 hover:bg-amber-600 text-slate-950 border-amber-600 font-bold";
                                                            icon = <AlertTriangle className="w-3.5 h-3.5" />;
                                                            levelLabel = "HIGH";
                                                        }

                                                        return (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setSelectedAssetForThreats(asset);
                                                                        }}
                                                                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-extrabold shadow-sm border transition-all hover:scale-105 active:scale-95 ${badgeClass}`}
                                                                    >
                                                                        {icon}
                                                                        <span>{activeThreats.length} {activeThreats.length === 1 ? 'Threat' : 'Threats'}</span>
                                                                        <span className="ml-0.5 px-1.5 py-0.5 bg-black/25 rounded text-[9px] font-black uppercase tracking-wider">
                                                                            {levelLabel}
                                                                        </span>
                                                                    </button>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="max-w-sm p-3">
                                                                    <div className="space-y-1.5">
                                                                        <div className="flex items-center justify-between border-b pb-1">
                                                                            <span className="font-bold text-xs flex items-center gap-1 text-foreground">
                                                                                <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                                                                                {activeThreats.length} Live Threat Signals
                                                                            </span>
                                                                            <span className="text-[10px] font-mono uppercase font-bold text-muted-foreground">
                                                                                Click to Inspect
                                                                            </span>
                                                                        </div>
                                                                        {isKev && (
                                                                            <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                                                                                ⚠️ Includes CISA Known Exploited Vulnerabilities
                                                                            </p>
                                                                        )}
                                                                        <ul className="text-[11px] space-y-1 text-muted-foreground pt-0.5">
                                                                            {activeThreats.slice(0, 3).map((t: any, i: number) => (
                                                                                <li key={i} className="line-clamp-1 flex items-start gap-1">
                                                                                    <span className="font-semibold text-foreground shrink-0">•</span>
                                                                                    <span className="truncate">{t.title}</span>
                                                                                </li>
                                                                            ))}
                                                                        </ul>
                                                                        <p className="text-[10px] text-primary font-medium pt-1 border-t">
                                                                            Click to view details & 1-click log into Risk Register →
                                                                        </p>
                                                                    </div>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        );
                                                    })()}
                                                </td>

                                                {/* Owner & Region */}
                                                <td className="px-4 py-3.5">
                                                    <div className="text-xs">
                                                        <p className="font-semibold text-foreground">{asset.owner || 'Unassigned'}</p>
                                                        <p className="text-muted-foreground text-[11px] mt-0.5">{asset.location || 'Global / Cloud'}</p>
                                                    </div>
                                                </td>

                                                {/* Status */}
                                                <td className="px-4 py-3.5">
                                                    {asset.status === 'maintenance' ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-amber-500 text-slate-950 shadow-sm border border-amber-600">
                                                            <span className="w-2 h-2 rounded-full bg-slate-950" />
                                                            Maintenance
                                                        </span>
                                                    ) : asset.status === 'archived' || asset.status === 'decommissioned' ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-slate-600 text-white shadow-sm border border-slate-700">
                                                            <span className="w-2 h-2 rounded-full bg-slate-300" />
                                                            Archived
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-600 text-white shadow-sm border border-emerald-700">
                                                            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                                                            Active
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Linked Risks */}
                                                <td className="px-4 py-3.5">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setLocation(`/clients/${clientId}/risks/register?assetId=${asset.id}`);
                                                        }}
                                                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all shadow-sm ${
                                                            Number(asset.riskCount) > 0
                                                                ? 'bg-purple-600 text-white hover:bg-purple-700 border border-purple-700'
                                                                : 'bg-muted text-muted-foreground border border-border hover:bg-muted/80'
                                                        }`}
                                                    >
                                                        <span>{asset.riskCount || 0} Risks</span>
                                                    </button>
                                                </td>

                                                {/* Actions */}
                                                <td className="px-4 py-3.5 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleEditAsset(asset);
                                                                    }}
                                                                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                                >
                                                                    <Edit className="w-4 h-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Edit Asset</TooltipContent>
                                                        </Tooltip>

                                                        <Tooltip>
                                                            <TooltipTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDeleteClick({ id: asset.id, name: asset.name });
                                                                    }}
                                                                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            </TooltipTrigger>
                                                            <TooltipContent>Delete Asset</TooltipContent>
                                                        </Tooltip>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Pagination */}
                    {sortedAssets.length > 0 && (
                        <div className="border-t border-border p-3 bg-card">
                            <Pagination
                                currentPage={pagination.pagination.page}
                                totalPages={pagination.totalPages}
                                totalItems={sortedAssets.length}
                                startIndex={pagination.startIndex}
                                endIndex={pagination.endIndex}
                                pageSize={pagination.pagination.pageSize}
                                onPageChange={pagination.setPage}
                                onPageSizeChange={pagination.setPageSize}
                            />
                        </div>
                    )}
                </div>

                {/* Threat Intelligence Modal */}
                <Dialog open={!!selectedAssetForThreats} onOpenChange={(open) => !open && setSelectedAssetForThreats(null)}>
                    <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
                        <DialogHeader>
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                    <ShieldAlert className="w-6 h-6" />
                                </div>
                                <div>
                                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                                        Threat Intelligence Workbench
                                        {selectedAssetForThreats && (
                                            <Badge variant="outline" className="font-mono text-xs">
                                                #{selectedAssetForThreats.id}
                                            </Badge>
                                        )}
                                    </DialogTitle>
                                    <DialogDescription className="text-sm mt-0.5">
                                        Live CISA KEV & NVD vulnerability advisories matched for <strong className="text-foreground">{selectedAssetForThreats?.name}</strong> {selectedAssetForThreats?.vendor && `(${selectedAssetForThreats.vendor})`}.
                                    </DialogDescription>
                                </div>
                            </div>
                        </DialogHeader>

                        {selectedAssetForThreats && (() => {
                            const threats = getAssetThreats(selectedAssetForThreats);
                            const kevCount = threats.filter((t: any) => t.source === 'cisa_kev').length;
                            const critCount = threats.filter((t: any) => t.severity === 'critical').length;
                            const highCount = threats.filter((t: any) => t.severity === 'high').length;

                            return (
                                <div className="space-y-4 mt-2">
                                    {/* Modal Mini KPI Bar */}
                                    <div className="grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-muted/50 border border-border">
                                        <div className="text-center p-2 rounded-lg bg-card border border-border/50">
                                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Matches</p>
                                            <p className="text-lg font-bold text-foreground mt-0.5">{threats.length}</p>
                                        </div>
                                        <div className="text-center p-2 rounded-lg bg-card border border-border/50">
                                            <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">CISA KEV Exploited</p>
                                            <p className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-0.5">{kevCount}</p>
                                        </div>
                                        <div className="text-center p-2 rounded-lg bg-card border border-border/50">
                                            <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Critical / High</p>
                                            <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5">{critCount + highCount}</p>
                                        </div>
                                    </div>

                                    {/* Threat Cards List */}
                                    <div className="space-y-3">
                                        {threats.map((threat: any, idx: number) => {
                                            const isKevThreat = threat.source === 'cisa_kev';
                                            const isCritThreat = threat.severity === 'critical';

                                            return (
                                                <div
                                                    key={idx}
                                                    className={`p-4 border rounded-xl bg-card transition-all ${
                                                        isKevThreat
                                                            ? 'border-rose-500/40 bg-rose-500/5 shadow-sm'
                                                            : isCritThreat
                                                            ? 'border-red-500/30 bg-red-500/5 shadow-sm'
                                                            : 'border-border/80 hover:border-primary/40'
                                                    }`}
                                                >
                                                    <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                                                        <div className="space-y-2 flex-1">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                {isKevThreat ? (
                                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] uppercase font-black tracking-wider bg-rose-600 text-white shadow-sm border border-rose-700">
                                                                        <Flame className="w-3 h-3 fill-white text-amber-300" />
                                                                        CISA KEV EXPLOITED
                                                                    </span>
                                                                ) : threat.severity ? (
                                                                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] uppercase font-black tracking-wider shadow-sm border ${
                                                                        threat.severity === 'critical'
                                                                            ? 'bg-red-600 text-white border-red-700'
                                                                            : threat.severity === 'high'
                                                                            ? 'bg-amber-500 text-slate-950 border-amber-600'
                                                                            : 'bg-blue-600 text-white border-blue-700'
                                                                    }`}>
                                                                        <ShieldAlert className="w-3 h-3" />
                                                                        {threat.severity}
                                                                    </span>
                                                                ) : null}

                                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-muted text-muted-foreground border border-border">
                                                                    {threat.sourceName || 'Threat Intel Feed'}
                                                                </span>

                                                                {threat.cveIds && threat.cveIds.map((cve: string) => (
                                                                    <a
                                                                        key={cve}
                                                                        href={`https://nvd.nist.gov/vuln/detail/${cve}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded font-mono text-[11px] font-bold bg-slate-800 text-cyan-300 hover:bg-slate-700 border border-slate-700 transition-colors"
                                                                    >
                                                                        <span>{cve}</span>
                                                                        <ExternalLink className="w-2.5 h-2.5 ml-0.5 opacity-70" />
                                                                    </a>
                                                                ))}
                                                            </div>

                                                            <h4 className="font-bold text-sm text-foreground leading-snug">
                                                                {threat.title}
                                                            </h4>

                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                <span>Published: {new Date(threat.pubDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                                                                {threat.category && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span className="font-medium text-foreground">{threat.category}</span>
                                                                    </>
                                                                )}
                                                            </div>

                                                            <p className="text-xs text-muted-foreground leading-relaxed pt-0.5">
                                                                {threat.description}
                                                            </p>
                                                        </div>

                                                        <div className="flex md:flex-col gap-2 shrink-0 w-full md:w-auto">
                                                            {threat.link && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="text-xs h-8 gap-1.5 font-medium"
                                                                    onClick={() => window.open(threat.link, '_blank')}
                                                                >
                                                                    <ExternalLink className="w-3.5 h-3.5" />
                                                                    Advisory
                                                                </Button>
                                                            )}
                                                            <Button
                                                                size="sm"
                                                                className="text-xs h-8 bg-red-600 hover:bg-red-700 text-white gap-1.5 font-bold shadow-sm"
                                                                onClick={() => {
                                                                    const qParams = new URLSearchParams();
                                                                    qParams.set('title', `Threat: ${threat.title.slice(0, 60)}`);
                                                                    qParams.set('assetId', String(selectedAssetForThreats.id));
                                                                    setLocation(`/clients/${clientId}/risks/register?${qParams.toString()}`);
                                                                }}
                                                            >
                                                                <ShieldAlert className="w-3.5 h-3.5" />
                                                                Log Risk
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })()}

                        <DialogFooter className="mt-4 border-t pt-3">
                            <Button variant="outline" onClick={() => setSelectedAssetForThreats(null)}>Close Workbench</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Delete Confirmation Dialog */}
                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete Asset</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete this asset? This action will remove the asset from the inventory and un-link associated risk mappings.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-3">
                            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3.5 text-sm">
                                <p className="font-medium text-destructive">Asset to delete:</p>
                                <p className="text-foreground font-semibold mt-0.5">{assetToDelete?.name}</p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={confirmDelete}
                                disabled={deleteMutation.isPending}
                            >
                                {deleteMutation.isPending ? 'Deleting...' : 'Delete Asset'}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        </TooltipProvider>
    );

    if (hideLayout) return content;

    return (
        <DashboardLayout>
            {content}
        </DashboardLayout>
    );
}

