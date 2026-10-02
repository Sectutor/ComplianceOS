import { useAuth } from "@/contexts/AuthContext";
import { useClientContext } from "@/contexts/ClientContext";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@complianceos/ui/ui/button";
import { Card, CardContent } from "@complianceos/ui/ui/card";
import { EnhancedDialog } from "@complianceos/ui/ui/enhanced-dialog";
import { Input } from "@complianceos/ui/ui/input";
import { Checkbox } from "@complianceos/ui/ui/checkbox";
import { Label } from "@complianceos/ui/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";
import { Badge } from "@complianceos/ui/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@complianceos/ui/ui/table";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { ArrowLeft, Shield, Plus, Trash2, Edit, Download, ClipboardList, LayoutGrid, List, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@complianceos/ui/ui/tooltip";
import ControlDetailsDialog from "@/components/ControlDetailsDialog";
import { EvidenceSuggestionsPopover } from "@/components/controls/EvidenceSuggestionsPopover";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { AreaChart, Area, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import { Breadcrumb } from "@/components/Breadcrumb";
import { PageGuide } from "@/components/PageGuide";
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
import { NISTBaselineWizard } from "@/components/frameworks/NISTBaselineWizard";

interface ClientControlsPageProps {
    id?: string;
}

export default function ClientControlsPage(props?: ClientControlsPageProps) {
    const params = useParams<{ id: string }>();
    const { selectedClientId } = useClientContext();
    const rawId = props?.id || params?.id || (selectedClientId ? String(selectedClientId) : "0");
    const clientId = parseInt(rawId || "0", 10);
    const { user } = useAuth();
    const [location, setLocation] = useLocation();

    const { data: client, isLoading: clientLoading } = trpc.clients.get.useQuery(
        { id: clientId },
        { enabled: clientId > 0 }
    );

    const { data: rawClientControls, isLoading: controlsLoading, error: controlsError, refetch: refetchControls } = trpc.clientControls.list.useQuery(
        { clientId },
        { enabled: clientId > 0 }
    );
    const { data: rawMasterControls } = trpc.controls.list.useQuery();
    const { data: registerTrend } = trpc.clientControls.getRegisterTrend.useQuery(
        { clientId },
        { enabled: clientId > 0 }
    );

    if (controlsError) {
        console.error("Error loading client controls:", controlsError);
    }

    const safeUnwrap = (data: any) => {
        if (data && typeof data === 'object' && 'json' in data && Array.isArray(data.json)) {
            return data.json;
        }
        return data;
    };

    // Memoized data processing
    const clientControls = useMemo(() => safeUnwrap(rawClientControls) || [], [rawClientControls]);
    const masterControls = useMemo(() => safeUnwrap(rawMasterControls) || [], [rawMasterControls]);

    const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
    const [frameworkFilter, setFrameworkFilter] = useState<string>("all");
    const [quickFilter, setQuickFilter] = useState<string>('all');
    const [currentPage, setCurrentPage] = useState(1);
    const PAGE_SIZE = 50;
    const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<number>>(new Set());
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [bulkStatus, setBulkStatus] = useState<string>('');

    // Memoized unique frameworks
    const uniqueFrameworks = useMemo(() =>
        Array.from(new Set(clientControls?.map((c: any) => c.control?.framework || 'Uncategorized') || [])).sort(),
        [clientControls]
    );

    const availableFrameworks = ["NIS2", "ISO 27001", "SOC 2", "GDPR", "HIPAA", "NIST CSF", "OWASP LLM Top 10", "OWASP ASI", "NIST AI RMF", "EU AI Act"];

    // Memoized filtered controls
    // Quick filters (audit-prep work queues) — counts are computed over the whole
    // register so chips stay meaningful even while another filter is active.
    const nowMs = Date.now();
    const matchesQuickFilter = useCallback((c: any, filter: string) => {
        const cc = c.clientControl || {};
        switch (filter) {
            case 'overdue':
                return !!cc.dueDate && new Date(cc.dueDate).getTime() < nowMs &&
                    cc.status !== 'implemented' && cc.status !== 'not_applicable';
            case 'reviews_due':
                return cc.status === 'implemented' &&
                    !!cc.nextReviewDate && new Date(cc.nextReviewDate).getTime() < nowMs;
            case 'no_evidence':
                return cc.status !== 'not_implemented' && cc.status !== 'not_applicable' &&
                    !cc.evidenceLocation && (!c.evidenceCount || c.evidenceCount === 0);
            case 'no_owner':
                return cc.status !== 'not_applicable' && !cc.owner;
            case 'not_started':
                return cc.status === 'not_implemented';
            case 'na_justification':
                return cc.applicability === 'not_applicable' && !cc.justification;
            default:
                return true;
        }
    }, [nowMs]);

    const quickFilterCounts = useMemo(() => {
        const counts: Record<string, number> = { all: (clientControls || []).length };
        for (const key of ['overdue', 'reviews_due', 'no_evidence', 'no_owner', 'not_started', 'na_justification']) {
            counts[key] = (clientControls || []).filter((c: any) => matchesQuickFilter(c, key)).length;
        }
        return counts;
    }, [clientControls, matchesQuickFilter]);

    const filteredClientControls = useMemo(() =>
        (clientControls || []).filter((c: any) => {
            if (frameworkFilter !== 'all' && (c.control?.framework || 'Uncategorized') !== frameworkFilter) return false;
            return matchesQuickFilter(c, quickFilter);
        }),
        [clientControls, frameworkFilter, quickFilter, matchesQuickFilter]
    );

    // Implementation progress per framework (whole register, not just the page)
    const frameworkProgress = useMemo(() => {
        const prog: Record<string, { total: number; implemented: number; inProgress: number }> = {};
        for (const c of clientControls || []) {
            const fw = c.control?.framework || 'Uncategorized';
            if (!prog[fw]) prog[fw] = { total: 0, implemented: 0, inProgress: 0 };
            prog[fw].total++;
            if (c.clientControl.status === 'implemented') prog[fw].implemented++;
            else if (c.clientControl.status === 'in_progress') prog[fw].inProgress++;
        }
        return prog;
    }, [clientControls]);

    // Pagination logic
    const totalPages = Math.ceil(filteredClientControls.length / PAGE_SIZE);
    const paginatedControls = useMemo(() => {
        const start = (currentPage - 1) * PAGE_SIZE;
        return filteredClientControls.slice(start, start + PAGE_SIZE);
    }, [filteredClientControls, currentPage]);

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [frameworkFilter]);

    // Memoized grouped controls for card view (from paginated controls for consistency with table)
    const groupedControls = useMemo(() => {
        const grouped = (paginatedControls || []).reduce((acc, item) => {
            const fw = item.control?.framework || 'Uncategorized';
            const cat = item.control?.category || 'General';
            if (!acc[fw]) acc[fw] = {};
            if (!acc[fw][cat]) acc[fw][cat] = [];
            acc[fw][cat].push(item);
            return acc;
        }, {} as Record<string, Record<string, typeof clientControls>>);
        return Object.entries(grouped);
    }, [paginatedControls]);

    // Memoized stats calculation
    const stats = useMemo(() => ({
        total: clientControls.length,
        implemented: clientControls.filter((c: any) => c.clientControl.status === 'implemented').length,
        inProgress: clientControls.filter((c: any) => c.clientControl.status === 'in_progress').length,
        notImplemented: clientControls.filter((c: any) => c.clientControl.status === 'not_implemented').length,
        missingEvidence: clientControls.filter((c: any) =>
            c.clientControl.status !== 'not_implemented' &&
            c.clientControl.status !== 'not_applicable' &&
            (!c.evidenceCount || c.evidenceCount === 0)
        ).length,
        applicabilityRate: clientControls.length > 0
            ? Math.round((clientControls.filter((c: any) => c.clientControl.applicability !== 'not_applicable').length / clientControls.length) * 100)
            : 0
    }), [clientControls]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const fw = params.get('framework');
        if (fw) setFrameworkFilter(fw);

        const openId = params.get('openId');
        const openCode = params.get('openCode');

        if (openId && clientControls.length > 0) {
            const ctrl = clientControls.find((c: any) => c.control?.id === parseInt(openId));
            if (ctrl) {
                setSelectedControl(ctrl);
            }
        } else if (openCode && clientControls.length > 0) {
            const ctrl = clientControls.find((c: any) => c.control?.controlId === openCode);
            if (ctrl) {
                setSelectedControl(ctrl);
            }
        }
    }, [window.location.search, clientControls]);

    const [isAddControlOpen, setIsAddControlOpen] = useState(false);
    const [isBaselineWizardOpen, setIsBaselineWizardOpen] = useState(false);
    const [selectedControlIds, setSelectedControlIds] = useState<string[]>([]);
    const [controlSearch, setControlSearch] = useState("");
    const [bulkFrameworks, setBulkFrameworks] = useState<string[]>([]);
    const [isAssigning, setIsAssigning] = useState(false);
    const [selectedControl, setSelectedControl] = useState<any>(null);
    const [deleteControlId, setDeleteControlId] = useState<number | null>(null);
    const [excludeControl, setExcludeControl] = useState<{ id: number, justification: string } | null>(null);
    const [justificationError, setJustificationError] = useState<number | null>(null);

    // Catalog ids already in this client's register — used to grey out rows
    // in the Assign Controls dialog and to count assignments per framework.
    const assignedCatalogIds = useMemo(() => {
        const ids = new Set<number>();
        (clientControls || []).forEach((c: any) => { if (c.control?.id) ids.add(c.control.id); });
        return ids;
    }, [clientControls]);

    const catalogStats = useMemo(() => {
        const stats: Record<string, { total: number; assigned: number }> = {};
        for (const c of masterControls) {
            const fw = c.framework || 'Uncategorized';
            if (!stats[fw]) stats[fw] = { total: 0, assigned: 0 };
            stats[fw].total++;
            if (assignedCatalogIds.has(c.id)) stats[fw].assigned++;
        }
        return stats;
    }, [masterControls, assignedCatalogIds]);


    // Toasts, dialog state and refetching are handled centrally in handleAssignFromDialog
    // so one "Assign Selected" click can combine framework and individual assignments.
    const addControlMutation = trpc.clientControls.create.useMutation();
    const bulkAssignMutation = trpc.clientControls.bulkAssign.useMutation();

    const deleteControlMutation = trpc.clientControls.delete.useMutation({
        onSuccess: () => {
            toast.success("Control removed");
            refetchControls();
            setDeleteControlId(null);
        },
        onError: (error) => toast.error(error.message),
    });

    const updateControlMutation = trpc.clientControls.update.useMutation({
        onSuccess: () => {
            toast.success("Control updated");
            refetchControls();
            setJustificationError(null);
        },
        onError: (error) => {
            toast.error(error.message);
            // If error relates to justification, highlight it
            if (error.message.toLowerCase().includes('justification')) {
                // Determine ID from context if possible, or just rely on toast
            }
        },
    });

    const batchUpdateMutation = trpc.clientControls.batchUpdateStatus.useMutation({
        onSuccess: (data: any) => {
            toast.success(`Updated ${data.updatedCount} controls successfully`);
            setBulkSelectedIds(new Set());
            setIsBulkMode(false);
            setBulkStatus('');
            refetchControls();
        },
        onError: (err: any) => {
            toast.error(`Batch update failed: ${err.message}`);
        },
    });

    // Memoized handlers (must be after mutations)
    const handleSelectControl = useCallback((item: any) => setSelectedControl(item), []);
    const handleUpdateControl = useCallback((id: number, data: any) => {
        updateControlMutation.mutate({ id, ...data });
    }, [updateControlMutation]);
    const handleDeleteControl = useCallback((id: number) => setDeleteControlId(id), []);

    // Single assign action for the dialog: applies the ticked frameworks (bulk,
    // already-assigned controls skipped server-side) plus any individually ticked
    // controls that are not in the register yet.
    const handleAssignFromDialog = async () => {
        const individualIds = selectedControlIds.filter((id) => !assignedCatalogIds.has(parseInt(id)));
        const hasFrameworks = bulkFrameworks.length > 0;
        if (!hasFrameworks && individualIds.length === 0) {
            toast.error("Select at least one framework or control to assign");
            return;
        }

        setIsAssigning(true);
        try {
            let viaFramework = 0;
            if (hasFrameworks) {
                const res: any = await bulkAssignMutation.mutateAsync({ clientId, frameworks: bulkFrameworks });
                viaFramework = res?.assigned ?? 0;
            }

            let individual = 0;
            for (const idStr of individualIds) {
                await addControlMutation.mutateAsync({ clientId, controlId: parseInt(idStr), status: 'not_implemented' });
                individual++;
            }

            const total = viaFramework + individual;
            if (total === 0) {
                toast.info("Nothing new to assign — everything selected is already in this client's register");
            } else {
                const detail = [
                    viaFramework > 0 ? `${viaFramework} from ${bulkFrameworks.join(', ')}` : null,
                    individual > 0 ? `${individual} individual control${individual === 1 ? '' : 's'}` : null,
                ].filter(Boolean).join(" + ");
                toast.success(`Assigned ${total} control${total === 1 ? '' : 's'} (${detail})`);
            }

            setIsAddControlOpen(false);
            setBulkFrameworks([]);
            setSelectedControlIds([]);
            setControlSearch("");
            refetchControls();
        } catch (err: any) {
            toast.error(err?.message || "Assignment failed");
        } finally {
            setIsAssigning(false);
        }
    };

    // ... (rendering logic unchanged until dialog)

    return (
        <DashboardLayout>
            <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
                <div className="border-b pb-4">
                    {new URLSearchParams(window.location.search).get('from') === 'nis2-mapping' && (
                        <button
                            onClick={() => setLocation(`/clients/${clientId}/cyber/mapping`)}
                            className="flex items-center text-sm font-bold text-muted-foreground hover:text-sky-600 transition-colors mb-4 group"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
                            Back to NIS2 Mapping Hub
                        </button>
                    )}
                    <Breadcrumb items={[
                        { label: client?.name || "Client", href: `/clients/${clientId}` },
                        { label: "Controls", active: true }
                    ]} />
                    <div className="mt-2 flex items-center gap-4">
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Control Implementation</h1>
                        <Badge variant="outline" className="h-6 px-3 py-1 font-mono text-xs border-border text-muted-foreground bg-muted">
                            {client?.organizationId || "ORG-000"}
                        </Badge>
                    </div>
                </div>

                {/* Professional Metrics Dashboard */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="bg-card border text-foreground shadow-sm border-border overflow-hidden relative group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform duration-500">
                            <Shield className="h-16 w-16 text-foreground" />
                        </div>
                        <CardContent className="p-6">
                            <p className="text-muted-foreground text-sm font-medium mb-1 uppercase tracking-wider">Total Coverage</p>
                            <h3 className="text-4xl font-bold">{stats.total}</h3>
                            <div className="mt-3 h-8 -mx-1">
                                {(registerTrend as any)?.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={registerTrend as any[]} margin={{ top: 2, right: 2, bottom: 0, left: 2 }}>
                                            <RechartsTooltip
                                                formatter={(value: any) => [`${value} implemented`, 'This week']}
                                                labelFormatter={(label: any) => `Week of ${label}`}
                                                contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="implemented"
                                                stroke="#3b82f6"
                                                strokeWidth={2}
                                                fill="#3b82f6"
                                                fillOpacity={0.12}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <p className="text-xs text-muted-foreground leading-8">Implementation history appears here as you make progress</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border text-foreground shadow-sm border-border">
                        <CardContent className="p-6">
                            <p className="text-muted-foreground text-sm font-medium mb-1 uppercase tracking-wider">Implementation Progress</p>
                            <div className="flex items-baseline justify-between">
                                <h3 className="text-4xl font-bold text-green-600">{stats.implemented}</h3>
                                <span className="text-muted-foreground font-medium font-mono text-sm">/ {stats.total}</span>
                            </div>
                            <div className="mt-4">
                                <p className="text-xs text-muted-foreground flex justify-between mb-1 text-center">
                                    <span>{Math.round((stats.implemented / (stats.total || 1)) * 100)}% Complete</span>
                                </p>
                                <span className="h-1.5 block w-full bg-muted rounded-full overflow-hidden">
                                    <span
                                        className="h-full bg-green-500 transition-all duration-1000"
                                        style={{ width: `${(stats.implemented / (stats.total || 1)) * 100}%` }}
                                    />
                                </span>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border text-foreground shadow-sm border-border">
                        <CardContent className="p-6">
                            <p className="text-muted-foreground text-sm font-medium mb-1 uppercase tracking-wider">Action Needed</p>
                            <div className="flex items-baseline justify-between">
                                <h3 className="text-4xl font-bold text-amber-600">{stats.inProgress + stats.notImplemented}</h3>
                                <div className="flex flex-col items-end">
                                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">PENDING REVIEW</span>
                                </div>
                            </div>
                            <p className="mt-4 text-xs text-muted-foreground">
                                {stats.inProgress} in progress, {stats.notImplemented} not started
                            </p>
                        </CardContent>
                    </Card>

                    <Card className="bg-card border text-foreground shadow-sm border-border">
                        <CardContent className="p-6">
                            <p className="text-muted-foreground text-sm font-medium mb-1 uppercase tracking-wider">Evidence Gaps</p>
                            <div className="flex items-baseline justify-between">
                                <h3 className={`text-4xl font-bold ${stats.missingEvidence > 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                                    {stats.missingEvidence}
                                </h3>
                                {stats.missingEvidence > 0 && (
                                    <AlertCircle className="h-5 w-5 text-red-500 animate-pulse" />
                                )}
                            </div>
                            <p className="mt-4 text-xs text-muted-foreground">
                                Implemented or in-progress controls without any evidence on file
                            </p>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-4 border-b border-slate-200 pb-5">
                    {/* Section header: title, live count, contextual help */}
                    <div className="flex items-center gap-3">
                        <h2 className="text-lg font-semibold text-slate-900">Assigned Controls</h2>
                        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                            {filteredClientControls.length}
                        </span>
                        <div className="ml-auto">
                            <PageGuide
                                title="Client Control Implementation"
                                description="Manage and validate the implementation of security controls for this client."
                                rationale="Controls are the operational reality of compliance. This dashboard allows you to move beyond 'check-box compliance' by documenting implementation, assigning accountability, and syncing evidence across frameworks."
                                howToUse={[
                                    { step: "1. Build Your Baseline", description: "Import controls from the Global Library or use the 'Select Baseline' wizard to bulk-add industry standards like NIST or SOC 2." },
                                    { step: "2. Determine Applicability", description: "Mark controls as 'Applicable' or 'Not Applicable'. If excluded, you MUST provide a professional justification for auditors." },
                                    { step: "3. Document Implementation", description: "Click the 'Edit' icon to describe the operational reality of the control and set its Monitoring Frequency (e.g., Monthly/Continuous)." },
                                    { step: "4. Assign Accountability (RACI)", description: "Use the RACI Grid to assign specific team members as Responsible or Accountable, ensuring clear ownership." },
                                    { step: "5. Gather Evidence", description: "Upload proof (PDFs, Screenshots) or use 'Evidence Requests' to task teammates for information without them needing deep platform access." },
                                    { step: "6. Cross-Framework Sync", description: "Implement once, comply twice. Use the sync feature to propagate status and evidence to related controls in other frameworks." }
                                ]}
                                integrations={[
                                    { name: "Audit Trail", description: "Every implementation note and status change is logged for professional audit review." },
                                    { name: "Evidence Repository", description: "Uploaded files are automatically linked to the client's central evidence library for future reuse." },
                                    { name: "Situation Awareness", description: "The top metrics bar reflects your real-time compliance health and readiness score." }
                                ]}
                            />
                        </div>
                    </div>

                    {/* Toolbar: filters on the left, actions on the right */}
                    <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
                            <Button
                                variant={viewMode === 'card' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('card')}
                                className="h-8 px-2.5"
                                title="Card View"
                            >
                                <LayoutGrid className="h-4 w-4" />
                            </Button>
                            <Button
                                variant={viewMode === 'table' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setViewMode('table')}
                                className="h-8 px-2.5"
                                title="Statement of Applicability (Table)"
                            >
                                <List className="h-4 w-4" />
                            </Button>
                        </div>

                        <Button
                            variant={isBulkMode ? "default" : "outline"}
                            size="sm"
                            className="h-9"
                            onClick={() => { setIsBulkMode(!isBulkMode); setBulkSelectedIds(new Set()); setBulkStatus(''); }}
                        >
                            {isBulkMode ? 'Exit Bulk Edit' : 'Bulk Edit'}
                        </Button>

                        <Select
                            value={frameworkFilter}
                            onValueChange={(val) => {
                                setFrameworkFilter(val);
                                const params = new URLSearchParams(window.location.search);
                                if (val === 'all') params.delete('framework');
                                else params.set('framework', val);
                                const search = params.toString();
                                setLocation(`${location}${search ? '?' + search : ''}`);
                            }}
                        >
                            <SelectTrigger className="h-9 w-[190px] bg-white">
                                <SelectValue placeholder="Filter Framework" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Frameworks</SelectItem>
                                {uniqueFrameworks.map(fw => (
                                    <SelectItem key={fw} value={fw}>{fw}</SelectItem>
                                ))}
                                {availableFrameworks.filter(f => !uniqueFrameworks.includes(f)).map(fw => (
                                    <SelectItem key={fw} value={fw} disabled className="opacity-50">{fw} (Not Assigned)</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <div className="ml-auto flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-9 border-slate-300 text-slate-700 hover:bg-slate-50"
                                onClick={() => setIsBaselineWizardOpen(true)}
                            >
                                <Shield className="mr-2 h-4 w-4" />
                                Select Baseline
                            </Button>
                            <Button size="sm" className="h-9" onClick={() => setIsAddControlOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Assign Control
                            </Button>
                        </div>
                    </div>

                    {/* Quick-filter work queues */}
                    <div className="flex flex-wrap items-center gap-1.5">
                        {[
                            { key: 'all', label: 'All' },
                            { key: 'overdue', label: 'Overdue' },
                            { key: 'reviews_due', label: 'Review due' },
                            { key: 'no_evidence', label: 'No evidence' },
                            { key: 'no_owner', label: 'No owner' },
                            { key: 'not_started', label: 'Not started' },
                            { key: 'na_justification', label: 'N/A without justification' },
                        ].map(chip => {
                            const count = quickFilterCounts[chip.key] ?? 0;
                            const active = quickFilter === chip.key;
                            return (
                                <button
                                    key={chip.key}
                                    onClick={() => { setQuickFilter(chip.key); setCurrentPage(1); }}
                                    disabled={chip.key !== 'all' && count === 0}
                                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                                        active
                                            ? 'border-slate-900 bg-slate-900 text-white'
                                            : chip.key !== 'all' && count === 0
                                                ? 'border-slate-200 bg-white text-slate-300 cursor-default'
                                                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                                    }`}
                                >
                                    {chip.label}
                                    <span className={`rounded-full px-1.5 text-[10px] font-semibold ${
                                        active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                                    }`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <NISTBaselineWizard
                    open={isBaselineWizardOpen}
                    onOpenChange={setIsBaselineWizardOpen}
                    clientId={clientId}
                    onSuccess={() => refetchControls()}
                />

                {/* Assign Control Dialog */}
                <EnhancedDialog
                    open={isAddControlOpen}
                    onOpenChange={setIsAddControlOpen}
                    title="Assign Controls"
                    description="Tick frameworks and/or individual controls from the catalog, then assign them in one action."
                    size="xl"
                    footer={
                        <div className="flex justify-end gap-2 w-full">
                            <Button type="button" variant="outline" onClick={() => setIsAddControlOpen(false)}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleAssignFromDialog}
                                disabled={isAssigning}
                            >
                                {isAssigning ? "Assigning..." : "Assign Selected"}
                            </Button>
                        </div>
                    }
                >
                    <div className="grid gap-6 py-4">
                        {/* Bulk Assignment Section */}
                        <div className="bg-muted/30 p-4 rounded-lg border">
                            <Label className="text-base font-semibold mb-2 block">Bulk Assignment</Label>
                            <p className="text-sm text-muted-foreground mb-4">
                                Tick the frameworks whose full standard control set you want to add — controls already
                                assigned are skipped. Then press "Assign Selected" below.
                            </p>
                            <div className="flex flex-wrap gap-4 mb-2">
                                {availableFrameworks.map(fw => {
                                    const stat = catalogStats[fw] || { total: 0, assigned: 0 };
                                    return (
                                        <div key={fw} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`bulk-${fw}`}
                                                checked={bulkFrameworks.includes(fw)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) setBulkFrameworks([...bulkFrameworks, fw]);
                                                    else setBulkFrameworks(bulkFrameworks.filter(f => f !== fw));
                                                }}
                                            />
                                            <label
                                                htmlFor={`bulk-${fw}`}
                                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                            >
                                                {fw}{" "}
                                                <span className="text-xs font-normal text-muted-foreground">
                                                    ({stat.total}, {stat.assigned} assigned)
                                                </span>
                                            </label>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">Or select individually</span>
                            </div>
                        </div>

                        {/* Individual Selection (Original Form) */}
                        <div className="grid gap-2">
                            <Label htmlFor="controlSearch">Search Controls</Label>
                            <Input id="controlSearch" value={controlSearch} onChange={(e) => setControlSearch(e.target.value)} placeholder="Type to filter controls..." />
                            <div className="mt-2 max-h-[40vh] overflow-auto rounded border">
                                {/* ... Control List ... */}
                                {Object.entries((masterControls || [])
                                    .filter((c) => (c.controlId + " " + c.name + " " + (c.description || ""))
                                        .toLowerCase().includes(controlSearch.toLowerCase()))
                                    .reduce((acc, control) => {
                                        const fw = control.framework || 'Uncategorized';
                                        const cat = control.category || 'General';
                                        if (!acc[fw]) acc[fw] = {};
                                        if (!acc[fw][cat]) acc[fw][cat] = [];
                                        acc[fw][cat].push(control);
                                        return acc;
                                    }, {} as Record<string, Record<string, typeof masterControls>>))
                                    .map(([framework, categories]) => (
                                        <div key={framework} className="border-b last:border-b-0">
                                            <div className="bg-muted/50 px-3 py-2 font-semibold text-sm sticky top-0 z-10">
                                                {framework}
                                            </div>
                                            {Object.entries(categories).map(([category, controls]) => (
                                                <div key={`${framework}-${category}`}>
                                                    <div className="bg-muted/20 px-3 py-1.5 text-xs font-medium text-muted-foreground sticky top-9 z-10 backdrop-blur-sm">
                                                        {category}
                                                    </div>
                                                    {controls.map((control) => {
                                                        const idStr = control.id.toString();
                                                        const checked = selectedControlIds.includes(idStr);
                                                        const isAssigned = assignedCatalogIds.has(control.id);
                                                        return (
                                                            <label key={control.id} className={`flex items-start gap-2 px-3 py-2 hover:bg-muted/30 cursor-pointer ${isAssigned ? "opacity-60 cursor-default" : ""}`}>
                                                                <Checkbox
                                                                    checked={isAssigned || checked}
                                                                    disabled={isAssigned}
                                                                    onCheckedChange={(val) => {
                                                                        if (isAssigned) return;
                                                                        const isChecked = !!val;
                                                                        setSelectedControlIds((prev) => isChecked ? [...prev, idStr] : prev.filter((x) => x !== idStr));
                                                                    }}
                                                                />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className={`font-medium text-sm ${isAssigned ? "text-muted-foreground" : "text-foreground"}`}>{control.controlId} - {control.name}</div>
                                                                </div>
                                                                {isAssigned && (
                                                                    <Badge variant="outline" className="shrink-0 text-[10px] border-emerald-300 bg-emerald-50 text-emerald-700">Assigned</Badge>
                                                                )}
                                                            </label>
                                                        );
                                                    })}
                                                </div>
                                            ))}
                                        </div>
                                    ))}
                            </div>
                            <div className="flex gap-2 mt-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => {
                                    const filtered = (masterControls || [])
                                        .filter((c) => (c.controlId + " " + c.name + " " + (c.description || ""))
                                            .toLowerCase().includes(controlSearch.toLowerCase()))
                                        .filter((c) => !assignedCatalogIds.has(c.id))
                                        .map((c) => c.id.toString());
                                    setSelectedControlIds(filtered);
                                }}>Select All Filtered</Button>
                                <Button type="button" variant="outline" size="sm" onClick={() => setSelectedControlIds([])}>Clear Selection</Button>
                            </div>
                        </div>
                    </div>
                </EnhancedDialog>

                {/* Control Details Dialog */}
                {selectedControl && (
                    <ControlDetailsDialog
                        open={!!selectedControl}
                        onOpenChange={(open) => !open && setSelectedControl(null)}
                        clientControl={selectedControl.clientControl}
                        control={selectedControl.control}
                        clientId={clientId}
                        onUpdate={() => refetchControls()}
                    />
                )}

                {/* Delete Control Confirmation */}
                <AlertDialog open={!!deleteControlId} onOpenChange={() => setDeleteControlId(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Remove Control?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will remove the control assignment from this client. Any associated evidence or justifications will also be removed.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                onClick={() => deleteControlId && deleteControlMutation.mutate({ id: deleteControlId })}
                            >
                                Remove
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {/* Exclude Control Dialog */}
                <EnhancedDialog
                    open={!!excludeControl}
                    onOpenChange={(open) => !open && setExcludeControl(null)}
                    title="Exclude Control"
                    description="Please provide a justification for marking this control as Not Applicable."
                    footer={
                        <div className="flex justify-end gap-2 w-full">
                            <Button variant="outline" onClick={() => setExcludeControl(null)}>Cancel</Button>
                            <Button
                                onClick={() => {
                                    if (excludeControl) {
                                        updateControlMutation.mutate({
                                            id: excludeControl.id,
                                            applicability: 'not_applicable',
                                            justification: excludeControl.justification,
                                            status: 'not_applicable'
                                        });
                                        setExcludeControl(null);
                                    }
                                }}
                                disabled={!excludeControl?.justification || excludeControl.justification.length < 5}
                            >
                                Confirm Exclusion
                            </Button>
                        </div>
                    }
                >
                    <div className="py-4">
                        <Label htmlFor="exclusionJustification">Justification</Label>
                        <Input
                            id="exclusionJustification"
                            value={excludeControl?.justification || ''}
                            onChange={(e) => setExcludeControl(prev => prev ? { ...prev, justification: e.target.value } : null)}
                            placeholder="e.g., Use of cloud provider handles this control..."
                            className="mt-2"
                        />
                    </div>
                </EnhancedDialog>

                {/* Bulk Status Update Toolbar */}
                {bulkSelectedIds.size > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg mb-4 border border-blue-200 dark:border-blue-800">
                        <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                            {bulkSelectedIds.size} control{bulkSelectedIds.size !== 1 ? 's' : ''} selected
                        </span>
                        <Select
                            value={bulkStatus}
                            onValueChange={(val) => setBulkStatus(val)}
                        >
                            <SelectTrigger className="w-48">
                                <SelectValue placeholder="Set status..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="not_implemented">Not Implemented</SelectItem>
                                <SelectItem value="in_progress">In Progress</SelectItem>
                                <SelectItem value="implemented">Implemented</SelectItem>
                                <SelectItem value="not_applicable">Not Applicable</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            size="sm"
                            onClick={() => {
                                if (!bulkStatus) { toast.error('Please select a status'); return; }
                                batchUpdateMutation.mutate({
                                    clientId,
                                    ids: Array.from(bulkSelectedIds),
                                    status: bulkStatus as any,
                                });
                            }}
                            disabled={!bulkStatus || batchUpdateMutation.isLoading}
                        >
                            {batchUpdateMutation.isLoading ? 'Updating...' : 'Apply'}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setBulkSelectedIds(new Set()); setBulkStatus(''); }}
                        >
                            Cancel
                        </Button>
                    </div>
                )}

                {/* Controls List */}
                {controlsError ? (
                    <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded-md">
                        <h3 className="font-bold">Error Loading Controls</h3>
                        <p>{controlsError.message}</p>
                        <Button variant="outline" className="mt-2" onClick={() => refetchControls()}>Retry</Button>
                    </div>
                ) : controlsLoading ? (
                    <div className="space-y-3">
                        <Skeleton className="h-16 w-full" />
                        <Skeleton className="h-16 w-full" />
                    </div>
                ) : clientControls && clientControls.length > 0 ? (
                    viewMode === 'card' ? (
                        <div className="space-y-6">
                            {groupedControls.map(([framework, categories]) => {
                                const prog = frameworkProgress[framework];
                                const pct = prog && prog.total > 0 ? Math.round((prog.implemented / prog.total) * 100) : 0;
                                return (
                                <div key={framework} className="space-y-3">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <h3 className="text-lg font-bold flex items-center gap-2">
                                            <Shield className="h-5 w-5 text-primary" />
                                            {framework}
                                        </h3>
                                        {prog && (
                                            <div className="flex items-center gap-2 min-w-[220px] flex-1 max-w-md">
                                                <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all"
                                                        style={{ width: `${pct}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
                                                    {prog.implemented}/{prog.total} implemented
                                                    {prog.inProgress > 0 ? ` · ${prog.inProgress} in progress` : ''}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    {Object.entries(categories).map(([category, items]) => (
                                        <div key={`${framework}-${category}`} className="pl-2 border-l-2 border-muted">
                                            <h4 className="text-sm font-semibold text-muted-foreground mb-3 pl-2">{category}</h4>
                                            <div className="space-y-3">
                                                {items.map((item) => (
                                                    <Card key={`${clientId}-${item.clientControl.id}`} className="cursor-pointer relative" onDoubleClick={() => setSelectedControl(item)}>
                                                        <CardContent className="p-4">
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex-1">
                                                                    <div className="absolute top-2 right-2 z-10">
                                                                        <Checkbox
                                                                            checked={bulkSelectedIds.has(item.clientControl.id)}
                                                                            onCheckedChange={(checked) => {
                                                                                const next = new Set(bulkSelectedIds);
                                                                                if (checked) next.add(item.clientControl.id);
                                                                                else next.delete(item.clientControl.id);
                                                                                setBulkSelectedIds(next);
                                                                            }}
                                                                        />
                                                                    </div>
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <span className="font-mono text-sm text-muted-foreground">
                                                                            {item.clientControl.clientControlId}
                                                                        </span>
                                                                        <span className="font-medium">{item.control?.name}</span>
                                                                        {item.clientControl.applicability === 'not_applicable' && (
                                                                            <Badge variant="outline" className="text-muted-foreground border-dashed">N/A</Badge>
                                                                        )}
                                                                    </div>
                                                                    <p className="text-sm text-muted-foreground mb-2">
                                                                        {item.clientControl.customDescription || item.control?.description}
                                                                    </p>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {item.clientControl.owner && (
                                                                            <span className="text-xs px-2 py-1 bg-muted rounded">
                                                                                Owner: {item.clientControl.owner}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-1">
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        onClick={() => setSelectedControl(item)}
                                                                        title="View details & add evidence"
                                                                    >
                                                                        <ClipboardList className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="text-destructive hover:text-destructive"
                                                                        onClick={() => setDeleteControlId(item.clientControl.id)}
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="rounded-xl border border-border shadow-xl overflow-hidden bg-card">
                            <div className="overflow-x-auto">
                                <Table className="table-fancy w-full">
                                    <TableHeader>
                                        <TableRow className="border-none hover:bg-transparent bg-muted">
                                            <TableHead className="w-10 py-3">
                                                <Checkbox
                                                    checked={isBulkMode && paginatedControls.length > 0 && bulkSelectedIds.size === paginatedControls.length}
                                                    onCheckedChange={(checked) => {
                                                        if (!isBulkMode) return;
                                                        if (checked) {
                                                            setBulkSelectedIds(new Set(paginatedControls.map((c: any) => c.clientControl.id)));
                                                        } else {
                                                            setBulkSelectedIds(new Set());
                                                        }
                                                    }}
                                                />
                                            </TableHead>
                                            <TableHead className="w-[100px] py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Control ID</TableHead>
                                            <TableHead className="w-[200px] py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Name</TableHead>
                                            <TableHead className="w-[120px] py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Framework</TableHead>
                                            <TableHead className="w-[130px] py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</TableHead>
                                            <TableHead className="w-[130px] py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Applicability</TableHead>
                                            <TableHead className="w-[130px] py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Implementation Date</TableHead>
                                            <TableHead className="w-[140px] py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Owner (RACI)</TableHead>
                                            <TableHead className="w-[130px] py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Last Updated</TableHead>
                                            <TableHead className="w-[90px] py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider sticky right-0 bg-muted/95 backdrop-blur z-20 text-right pr-4">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {paginatedControls.map((item: any) => (
                                            <TableRow key={item.clientControl.id} className="bg-card border-b border-border transition-all duration-200 hover:bg-muted hover:shadow-sm group cursor-pointer" onDoubleClick={() => setSelectedControl(item)}>
                                                <TableCell className="w-10 py-3">
                                                    <Checkbox
                                                        checked={bulkSelectedIds.has(item.clientControl.id)}
                                                        onCheckedChange={(checked) => {
                                                            const next = new Set(bulkSelectedIds);
                                                            if (checked) next.add(item.clientControl.id);
                                                            else next.delete(item.clientControl.id);
                                                            setBulkSelectedIds(next);
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell className="font-mono text-xs font-medium text-foreground py-3">
                                                    {item.clientControl.clientControlId}
                                                </TableCell>
                                                <TableCell className="font-medium text-sm text-foreground py-3">
                                                    <EvidenceSuggestionsPopover
                                                        controlId={item.clientControl.clientControlId}
                                                        controlName={item.control?.name || ''}
                                                        framework={item.control?.framework}
                                                        category={item.control?.category}
                                                    >
                                                        <span className="hover:text-blue-600 hover:underline">{item.control?.name}</span>
                                                    </EvidenceSuggestionsPopover>
                                                    <div className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5" title={item.control?.description || ""}>
                                                        {item.control?.description}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground py-3">
                                                    <Badge variant="outline" className="text-xs font-medium bg-muted border-border">
                                                        {item.control?.framework}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="py-3">
                                                    <div className="flex items-center">
                                                        <Badge
                                                            variant={
                                                                item.clientControl.status === 'implemented' ? 'success' :
                                                                    item.clientControl.status === 'in_progress' ? 'info' :
                                                                        item.clientControl.status === 'not_applicable' ? 'secondary' :
                                                                            'warning'
                                                            }
                                                            className="uppercase text-[10px] px-2 py-0.5 font-medium"
                                                        >
                                                            {item.clientControl.status?.replace('_', ' ')}
                                                        </Badge>
                                                        {item.clientControl.status !== 'not_implemented' && item.clientControl.status !== 'not_applicable' && (!item.evidenceCount || item.evidenceCount === 0) && (
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <AlertCircle className="h-4 w-4 text-red-500 animate-pulse cursor-help ml-1" />
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Missing Evidence!</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="py-3">
                                                    <Select
                                                        value={item.clientControl.applicability || 'applicable'}
                                                        onValueChange={(val) => {
                                                            if (val === 'not_applicable' && !item.clientControl.justification) {
                                                                setExcludeControl({ id: item.clientControl.id, justification: '' });
                                                                return;
                                                            }
                                                            updateControlMutation.mutate({
                                                                id: item.clientControl.id,
                                                                applicability: val
                                                            });
                                                        }}
                                                    >
                                                        <SelectTrigger className={`h-8 w-[120px] text-xs bg-card ${item.clientControl.applicability === 'not_applicable' ? 'text-muted-foreground' : 'text-foreground font-medium'}`}>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="applicable">Applicable</SelectItem>
                                                            <SelectItem value="not_applicable">Not Applicable</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground py-3">
                                                    {item.clientControl.implementationDate
                                                        ? new Date(item.clientControl.implementationDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                                                        : <span className="text-muted-foreground italic">Not set</span>
                                                    }
                                                </TableCell>
                                                <TableCell className="py-3">
                                                    {item.clientControl.owner ? (
                                                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-xs">
                                                            {item.clientControl.owner}
                                                        </Badge>
                                                    ) : (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 text-xs text-muted-foreground hover:text-muted-foreground"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedControl(item);
                                                            }}
                                                        >
                                                            <Plus className="h-3 w-3 mr-1" />
                                                            Assign
                                                        </Button>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground py-3">
                                                    {item.clientControl.updatedAt
                                                        ? new Date(item.clientControl.updatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                                                        : <span className="text-muted-foreground italic">Unknown</span>
                                                    }
                                                </TableCell>
                                                <TableCell className="py-3 sticky right-0 bg-card/95 backdrop-blur z-10 text-right pr-4" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7"
                                                            onClick={() => setSelectedControl(item)}
                                                            title="View details & add evidence"
                                                        >
                                                            <ClipboardList className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-7 w-7 text-destructive hover:text-destructive"
                                                            onClick={() => setDeleteControlId(item.clientControl.id)}
                                                            title="Delete control"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination Controls */}
                            {viewMode === 'table' && totalPages > 1 && (
                                <div className="flex items-center justify-between px-4 py-3 bg-card border-t border-border">
                                    <div className="text-sm text-muted-foreground">
                                        Showing {(currentPage - 1) * PAGE_SIZE + 1} to {Math.min(currentPage * PAGE_SIZE, filteredClientControls.length)} of {filteredClientControls.length} controls
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                        >
                                            Previous
                                        </Button>
                                        <div className="flex items-center gap-1">
                                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                let pageNum: number;
                                                if (totalPages <= 5) {
                                                    pageNum = i + 1;
                                                } else if (currentPage <= 3) {
                                                    pageNum = i + 1;
                                                } else if (currentPage >= totalPages - 2) {
                                                    pageNum = totalPages - 4 + i;
                                                } else {
                                                    pageNum = currentPage - 2 + i;
                                                }
                                                return (
                                                    <Button
                                                        key={pageNum}
                                                        variant={currentPage === pageNum ? "default" : "ghost"}
                                                        size="sm"
                                                        className="w-8 h-8 p-0"
                                                        onClick={() => setCurrentPage(pageNum)}
                                                    >
                                                        {pageNum}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                ) : (
                    <div className="py-12 px-6 border-2 border-dashed border-border rounded-3xl bg-muted/50">
                        <div className="max-w-2xl mx-auto text-center">
                            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#0B1120] text-white shadow-xl mb-8 transform -rotate-3 hover:rotate-0 transition-transform duration-300">
                                <Shield className="h-10 w-10 text-blue-400" />
                            </div>
                            <h2 className="text-3xl font-extrabold text-foreground tracking-tight mb-4 text-center">Your Compliance Command Center is Empty</h2>
                            <p className="text-lg text-muted-foreground mb-12">
                                You haven't assigned any security controls to this client yet. Security controls are the building blocks of your compliance posture—track implementation, collect evidence, and prove readiness.
                            </p>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left mb-12">
                                <div className="bg-card p-6 rounded-2xl shadow-sm border border-border hover:shadow-md transition-shadow">
                                    <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center mb-4">
                                        <Plus className="h-5 w-5" />
                                    </div>
                                    <h4 className="font-bold text-foreground mb-2">Assign Controls</h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">Choose specific controls from our master library to match your requirements.</p>
                                </div>
                                <div className="bg-card p-6 rounded-2xl shadow-sm border border-border hover:shadow-md transition-shadow">
                                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
                                        <Shield className="h-5 w-5" />
                                    </div>
                                    <h4 className="font-bold text-foreground mb-2">Use Baseline Wizard</h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">Quickly setup standard frameworks like NIST or SOC 2 using our guided wizard.</p>
                                </div>
                                <div className="bg-card p-6 rounded-2xl shadow-sm border border-border hover:shadow-md transition-shadow">
                                    <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
                                        <Download className="h-5 w-5" />
                                    </div>
                                    <h4 className="font-bold text-foreground mb-2">Import from SoA</h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">Bring in your existing Statement of Applicability for instant tracking.</p>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Button
                                    size="lg"
                                    className="h-12 px-8 text-lg font-semibold bg-[#0B1120] hover:bg-foreground/90"
                                    onClick={() => setIsBaselineWizardOpen(true)}
                                >
                                    <Shield className="mr-2 h-5 w-5" />
                                    Start Setup Wizard
                                </Button>
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="h-12 px-8 text-lg font-semibold border-2"
                                    onClick={() => setIsAddControlOpen(true)}
                                >
                                    Browse Library
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
